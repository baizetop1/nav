import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const MAX_SOURCE_COUNT = 24;
const MAX_FEED_BYTES = 1024 * 1024;
const MAX_ITEMS_PER_SOURCE = 30;
const TIMEOUT_MS = 12_000;
const SOURCE_PATH = new URL('../data/rss-sources.json', import.meta.url);
const OUTPUT_PATH = new URL('../public/rss-feed.json', import.meta.url);

export function isPublicAddress(address) {
  const family = isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)) || (a === 192 && b === 0 && (c === 0 || c === 2)) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113));
  }
  if (family === 6) {
    const lower = address.toLowerCase();
    return /^[23][\da-f]{3}:/.test(lower) && !/^2001:(?:db8|0):/.test(lower) && !lower.startsWith('2002:');
  }
  return false;
}

export function assertPublicFeedUrl(value) {
  if (typeof value !== 'string' || value.length > 4096 || /[\s\u0000-\u001f\u007f\\]/.test(value)) throw new Error('订阅网址无效。');
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) throw new Error('订阅协议、凭据或端口不受支持。');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.includes(':') || (!isIP(host) && !host.includes('.')) || (isIP(host) && !isPublicAddress(host))) throw new Error('不允许抓取本地、保留网络或 IPv6 字面地址。');
  url.hash = '';
  return url;
}

export function validateRssSources(value) {
  if (value?.version !== 1 || !Array.isArray(value.sources) || value.sources.length > MAX_SOURCE_COUNT) throw new Error('RSS 订阅配置无效。');
  const ids = new Set(), urls = new Set();
  return value.sources.map(source => {
    if (!source || typeof source.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(source.id) || typeof source.title !== 'string' || source.title.length > 120 || typeof source.url !== 'string') throw new Error('RSS 订阅字段无效。');
    const url = assertPublicFeedUrl(source.url).toString();
    if (ids.has(source.id) || urls.has(url)) throw new Error('RSS 订阅重复。');
    ids.add(source.id); urls.add(url);
    return { id: source.id, title: source.title.trim() || new URL(url).hostname, url };
  });
}

function decodeXml(value) {
  return String(value).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_, hex, decimal) => {
    const point = Number.parseInt(hex || decimal || '0', hex ? 16 : 10);
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : '';
  }).replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}
function plainText(value, limit) {
  return decodeXml(value).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}
function element(block, names) {
  for (const name of names) { const match = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}\\s*>`, 'i')); if (match) return match[1]; }
  return '';
}
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)].map(match => [match[1].toLowerCase(), decodeXml(match[3])]));
}
function articleUrl(input, base) {
  try { return assertPublicFeedUrl(new URL(decodeXml(input).trim(), base).toString()).toString(); } catch { return null; }
}

export function parseRssXml(xml, source) {
  if (typeof xml !== 'string' || Buffer.byteLength(xml) > MAX_FEED_BYTES || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('RSS XML 过大或包含不支持的外部实体。');
  if (!/<(?:rss|feed|rdf:RDF)\b/i.test(xml)) throw new Error('响应不是 RSS 或 Atom 订阅。');
  const blocks = [...xml.matchAll(/<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)\s*>/gi)];
  const seen = new Set(), items = [];
  for (const match of blocks) {
    const block = match[1];
    const title = plainText(element(block, ['title']), 500);
    let link = element(block, ['link']).trim();
    if (!link) {
      const candidates = [...block.matchAll(/<link\b([^>]*?)\/?\s*>/gi)].map(item => attributes(item[1]));
      link = candidates.find(item => (!item.rel || item.rel === 'alternate') && item.href)?.href || '';
    }
    if (!link) link = element(block, ['guid', 'id']).trim();
    const url = link ? articleUrl(link, source.url) : null;
    if (!title || !url || seen.has(url)) continue;
    const date = plainText(element(block, ['pubDate', 'published', 'updated', 'dc:date']), 100);
    const stamp = Date.parse(date);
    const summary = plainText(element(block, ['description', 'summary', 'content:encoded', 'content']), 1000);
    items.push({ id: `${source.id}-${createHash('sha256').update(url).digest('hex').slice(0, 24)}`, sourceId: source.id, title, url, summary, ...(Number.isFinite(stamp) ? { publishedAt: new Date(stamp).toISOString() } : {}) });
    seen.add(url);
  }
  if (!items.length) throw new Error('订阅中没有可用文章。');
  return items.sort((a, b) => (Date.parse(b.publishedAt || '') || 0) - (Date.parse(a.publishedAt || '') || 0)).slice(0, MAX_ITEMS_PER_SOURCE);
}

async function resolvePublicAddresses(hostname) {
  let timeout;
  try {
    const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await Promise.race([
      dnsLookup(hostname, { all: true, verbatim: true }),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('DNS 解析超时。')), TIMEOUT_MS); }),
    ]);
    if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) throw new Error('订阅域名指向本地或保留网络，已停止抓取。');
    return addresses;
  } finally { clearTimeout(timeout); }
}

export function decodeRssBuffer(buffer, contentType = '') {
  const declaration = buffer.subarray(0, 300).toString('ascii').match(/<\?xml\b[^>]*\bencoding\s*=\s*["']([^"']+)["']/i)?.[1];
  const header = String(contentType).match(/charset\s*=\s*["']?([^\s;"']+)/i)?.[1];
  const bom = buffer[0] === 0xff && buffer[1] === 0xfe ? 'utf-16le' : buffer[0] === 0xfe && buffer[1] === 0xff ? 'utf-16be' : '';
  try { return new TextDecoder(bom || header || declaration || 'utf-8').decode(buffer); }
  catch { throw new Error('RSS 字符编码不受支持。'); }
}

export async function fetchRssXml(value, redirects = 0) {
  const url = assertPublicFeedUrl(value);
  const addresses = await resolvePublicAddresses(url.hostname.replace(/^\[|\]$/g, ''));
  const result = await new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.get(url, {
      headers: { 'User-Agent': 'baize-nav-rss/1.0', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9' },
      // Pin the validated DNS answer to this connection, preventing a second DNS
      // lookup from redirecting the request to a private address.
      lookup: (_hostname, options, callback) => options.all ? callback(null, addresses) : callback(null, addresses[0].address, addresses[0].family),
      timeout: TIMEOUT_MS,
    }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        try { resolve({ redirect: new URL(response.headers.location, url).toString() }); }
        catch { reject(new Error('RSS 重定向地址无效。')); }
        return;
      }
      if (response.statusCode !== 200) { response.resume(); reject(new Error(`HTTP ${response.statusCode}`)); return; }
      if (Number(response.headers['content-length']) > MAX_FEED_BYTES) { response.destroy(); reject(new Error('RSS 文件超过 1 MB。')); return; }
      let size = 0; const chunks = [];
      response.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_FEED_BYTES) { request.destroy(new Error('RSS 文件超过 1 MB。')); return; }
        chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => {
        try { resolve({ text: decodeRssBuffer(Buffer.concat(chunks), response.headers['content-type']) }); }
        catch (error) { reject(error); }
      });
    });
    const deadline = setTimeout(() => request.destroy(new Error('RSS 请求超时。')), TIMEOUT_MS);
    request.on('close', () => clearTimeout(deadline));
    request.on('timeout', () => request.destroy(new Error('RSS 请求超时。')));
    request.on('error', reject);
  });
  if (result.redirect) {
    if (redirects >= 3) throw new Error('RSS 重定向次数过多。');
    return fetchRssXml(result.redirect, redirects + 1);
  }
  return result.text;
}

function safePreviousItems(previous, source) {
  if (previous?.version !== 1 || !Array.isArray(previous.sources) || !Array.isArray(previous.items) || !previous.sources.some(item => item.id === source.id && item.url === source.url)) return [];
  return previous.items.filter(item => item?.sourceId === source.id && typeof item.id === 'string' && item.id.length <= 160 && typeof item.title === 'string' && item.title.trim() && item.title.length <= 500 && typeof item.summary === 'string' && item.summary.length <= 2000 && typeof item.url === 'string' && articleUrl(item.url, source.url) && (!item.publishedAt || Number.isFinite(Date.parse(item.publishedAt)))).slice(0, MAX_ITEMS_PER_SOURCE).map(item => ({ id: item.id, sourceId: source.id, title: item.title, url: articleUrl(item.url, source.url), summary: item.summary, ...(item.publishedAt ? { publishedAt: item.publishedAt } : {}) }));
}

export async function buildRssReport(sources, previous, { fetcher = fetchRssXml, now = new Date() } = {}) {
  const report = { version: 1, generatedAt: sources.length ? now.toISOString() : null, sources: [], items: [] };
  // Bounded parallelism avoids opening a connection for every subscription at once.
  for (let offset = 0; offset < sources.length; offset += 3) {
    const batch = await Promise.all(sources.slice(offset, offset + 3).map(async source => {
      const oldItems = safePreviousItems(previous, source);
      try {
        const items = parseRssXml(await fetcher(source.url), source);
        const merged = [...items, ...oldItems.filter(item => !items.some(fresh => fresh.id === item.id))].slice(0, MAX_ITEMS_PER_SOURCE);
        return { source: { ...source, fetchedAt: now.toISOString() }, items: merged };
      } catch (error) {
        const oldSource = previous?.sources?.find?.(item => item.id === source.id && item.url === source.url);
        const fetchedAt = oldSource?.fetchedAt && Number.isFinite(Date.parse(oldSource.fetchedAt)) ? oldSource.fetchedAt : null;
        const errorMessage = error instanceof Error ? error.message : '抓取失败。';
        return { source: { ...source, fetchedAt, error: errorMessage.replace(/https?:\/\/\S+/g, '[订阅地址]').slice(0, 500) }, items: oldItems };
      }
    }));
    for (const result of batch) { report.sources.push(result.source); report.items.push(...result.items); }
  }
  return report;
}

async function main() {
  const sources = validateRssSources(JSON.parse(await readFile(SOURCE_PATH, 'utf8')));
  let previous = null;
  try { previous = JSON.parse(await readFile(OUTPUT_PATH, 'utf8')); } catch { /* first run */ }
  const report = await buildRssReport(sources, previous);
  await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  const failures = report.sources.filter(source => source.error).length;
  console.log(`RSS: ${report.sources.length} sources, ${report.items.length} articles, ${failures} sources kept cached content after fetch errors.`);
  for (const source of report.sources.filter(item => item.error)) console.warn(`${source.title}: ${source.error}`);
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main().catch(error => { console.error(error); process.exitCode = 1; });
