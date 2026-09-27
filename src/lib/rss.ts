import { safeGetLocalStorageItem, safeSetLocalStorageItem } from './safeStorage.ts';

export const RSS_SOURCE_LIMIT = 24;
export const RSS_SOURCES_KEY = 'baize_rss_sources_v1';
export const RSS_READER_KEY = 'baize_rss_reader_v1';
export const RSS_CACHE_KEY = 'baize_rss_cache_v1';
export interface RssSource { id: string; title: string; url: string }
export interface RssItem { id: string; sourceId: string; title: string; url: string; summary: string; publishedAt?: string }
export interface RssReport { version: 1; generatedAt: string | null; sources: (RssSource & { fetchedAt: string | null; error?: string })[]; items: RssItem[] }
export interface RssReaderState { version: 1; items: Record<string, { read: boolean; favorite: boolean; updatedAt: string }> }

export function safeRssUrl(value: string): string | null {
  if (value.length > 4096 || /[\s\u0000-\u001f\u007f\\]/.test(value.trim())) return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !host || (url.port && !['80', '443'].includes(url.port))) return null;
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || !host.includes('.') || host.includes(':')) return null;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const [a, b] = host.split('.').map(Number);
      if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19))) return null;
    }
    url.hash = '';
    return url.toString();
  } catch { return null; }
}

function sourceId(url: string): string {
  let hash = 2166136261;
  for (let index = 0; index < url.length; index++) hash = Math.imul(hash ^ url.charCodeAt(index), 16777619);
  return `rss-${(hash >>> 0).toString(16)}`;
}
export function createRssSource(title: string, input: string): RssSource {
  const url = safeRssUrl(input);
  if (!url) throw new Error('请输入公开的 HTTP/HTTPS RSS 地址，不支持本地网络、账号密码或特殊端口。');
  return { id: sourceId(url), title: title.trim().slice(0, 120) || new URL(url).hostname, url };
}
export function parseRssSources(value: unknown): RssSource[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('订阅配置格式无效。');
  const config = value as { version?: unknown; sources?: unknown };
  if (config.version !== 1 || !Array.isArray(config.sources) || config.sources.length > RSS_SOURCE_LIMIT) throw new Error(`订阅配置无效，最多 ${RSS_SOURCE_LIMIT} 个源。`);
  const seen = new Set<string>();
  const ids = new Set<string>();
  return config.sources.map((candidate: unknown) => {
    if (!candidate || typeof candidate !== 'object') throw new Error('订阅数据无效。');
    const source = candidate as RssSource;
    if (typeof source.title !== 'string' || typeof source.url !== 'string' || typeof source.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(source.id)) throw new Error('订阅字段无效。');
    const parsed = createRssSource(source.title, source.url);
    if (seen.has(parsed.url) || ids.has(source.id)) throw new Error('订阅地址或编号重复。');
    seen.add(parsed.url); ids.add(source.id);
    return { ...parsed, id: source.id };
  });
}

function decodeXml(value: string): string {
  return value.replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_, hex: string | undefined, decimal: string | undefined) => {
    const point = Number.parseInt(hex || decimal || '0', hex ? 16 : 10);
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : '';
  }).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
function escapeXml(value: string): string { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }

export function parseOpml(text: string): { sources: RssSource[]; skipped: number } {
  if (new TextEncoder().encode(text).length > 512 * 1024) throw new Error('OPML 文件不能超过 512 KB。');
  if (/<!DOCTYPE|<!ENTITY/i.test(text) || !/<opml\b/i.test(text) || !/<\/opml\s*>/i.test(text)) throw new Error('请选择标准 OPML 订阅文件（不支持外部实体）。');
  const sources: RssSource[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const match of text.matchAll(/<outline\b([^>]*?)\/?\s*>/gi)) {
    const attributes: Record<string, string> = {};
    for (const attribute of match[1].matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)) attributes[attribute[1].toLowerCase()] = decodeXml(attribute[3]);
    if (!attributes.xmlurl) continue;
    try {
      const source = createRssSource(attributes.title || attributes.text || '', attributes.xmlurl);
      if (seen.has(source.url)) { skipped++; continue; }
      seen.add(source.url); sources.push(source);
    } catch { skipped++; }
    if (sources.length > RSS_SOURCE_LIMIT) throw new Error(`最多导入 ${RSS_SOURCE_LIMIT} 个 RSS 源，请拆分 OPML。`);
  }
  if (!sources.length) throw new Error('OPML 中没有可用的公开 RSS 地址。');
  return { sources, skipped };
}
export function exportOpml(sources: RssSource[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0"><head><title>白泽 RSS 订阅</title></head><body>\n${sources.map(source => `  <outline type="rss" text="${escapeXml(source.title)}" title="${escapeXml(source.title)}" xmlUrl="${escapeXml(source.url)}"/>`).join('\n')}\n</body></opml>\n`;
}

export function parseRssReport(value: unknown): RssReport {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('RSS 报告格式无效。');
  const report = value as RssReport;
  if (report.version !== 1 || (report.generatedAt !== null && (typeof report.generatedAt !== 'string' || !Number.isFinite(Date.parse(report.generatedAt)))) || !Array.isArray(report.items) || report.items.length > 720) throw new Error('RSS 报告结构无效。');
  const sources = parseRssSources(report);
  const ids = new Set(sources.map(source => source.id));
  const seen = new Set<string>();
  const items = report.items.map(item => {
    if (!item || typeof item.id !== 'string' || item.id.length > 160 || seen.has(item.id) || !ids.has(item.sourceId) || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 500 || typeof item.summary !== 'string' || item.summary.length > 2000 || typeof item.url !== 'string' || !safeRssUrl(item.url) || (item.publishedAt !== undefined && (typeof item.publishedAt !== 'string' || !Number.isFinite(Date.parse(item.publishedAt))))) throw new Error('RSS 条目无效。');
    seen.add(item.id);
    return { id: item.id, sourceId: item.sourceId, title: item.title, url: safeRssUrl(item.url)!, summary: item.summary, ...(item.publishedAt ? { publishedAt: item.publishedAt } : {}) };
  });
  return { version: 1, generatedAt: report.generatedAt, sources: sources.map((source, index) => {
    const status = report.sources[index];
    if (status.fetchedAt !== null && (typeof status.fetchedAt !== 'string' || !Number.isFinite(Date.parse(status.fetchedAt)))) throw new Error('RSS 更新时间无效。');
    return { ...source, fetchedAt: status.fetchedAt, ...(typeof status.error === 'string' ? { error: status.error.slice(0, 500) } : {}) };
  }), items };
}
export function loadRssSources(fallback: RssSource[] = []): RssSource[] {
  try { const raw = safeGetLocalStorageItem(RSS_SOURCES_KEY); return raw ? parseRssSources(JSON.parse(raw)) : fallback; } catch { return fallback; }
}
export function saveRssSources(sources: RssSource[]): boolean {
  const parsed = parseRssSources({ version: 1, sources });
  return safeSetLocalStorageItem(RSS_SOURCES_KEY, JSON.stringify({ version: 1, sources: parsed }), { label: 'RSS 订阅', maxBytes: 512 * 1024 }).ok;
}
export function loadRssCache(): RssReport | null {
  try { const raw = safeGetLocalStorageItem(RSS_CACHE_KEY); return raw ? parseRssReport(JSON.parse(raw)) : null; } catch { return null; }
}
export function parseRssReader(value: unknown): RssReaderState {
  const parsed = value as RssReaderState | null;
  if (parsed?.version !== 1 || !parsed.items || typeof parsed.items !== 'object' || Array.isArray(parsed.items)) return { version: 1, items: {} };
  const entries = Object.entries(parsed.items).filter(([id, state]) => id.length <= 160 && state && typeof state.read === 'boolean' && typeof state.favorite === 'boolean' && typeof state.updatedAt === 'string' && Number.isFinite(Date.parse(state.updatedAt))).sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt)).slice(0, 2000);
  return { version: 1, items: Object.fromEntries(entries) };
}
export function loadRssReader(): RssReaderState {
  try { return parseRssReader(JSON.parse(safeGetLocalStorageItem(RSS_READER_KEY) || 'null')); }
  catch { return { version: 1, items: {} }; }
}
export function mergeRssReaderStates(...states: RssReaderState[]): RssReaderState {
  const items: RssReaderState['items'] = {};
  for (const state of states) for (const [id, item] of Object.entries(state.items)) {
    const current = items[id];
    if (!current || item.updatedAt > current.updatedAt || (item.updatedAt === current.updatedAt && JSON.stringify(item) > JSON.stringify(current))) items[id] = item;
  }
  return parseRssReader({ version: 1, items });
}
export function saveRssReader(state: RssReaderState): boolean {
  const entries = Object.entries(state.items).sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt)).slice(0, 2000);
  return safeSetLocalStorageItem(RSS_READER_KEY, JSON.stringify({ version: 1, items: Object.fromEntries(entries) }), { label: 'RSS 阅读状态', maxBytes: 512 * 1024 }).ok;
}
export async function loadPublishedRss(url: string, signal?: AbortSignal): Promise<{ report: RssReport; cached: boolean }> {
  const response = await fetch(url, { cache: 'no-store', signal });
  if (!response.ok) throw new Error(`读取 RSS 报告失败（HTTP ${response.status}）。`);
  if (Number(response.headers.get('content-length')) > 3 * 1024 * 1024) throw new Error('RSS 报告过大。');
  const text = await response.text();
  if (text.length > 3 * 1024 * 1024) throw new Error('RSS 报告过大。');
  const report = parseRssReport(JSON.parse(text));
  const cached = safeSetLocalStorageItem(RSS_CACHE_KEY, JSON.stringify(report), { label: 'RSS 离线摘要', important: false, maxBytes: 3 * 1024 * 1024 }).ok;
  return { report, cached };
}
