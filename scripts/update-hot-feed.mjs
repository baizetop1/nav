import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const CISA_KEV_URL = 'https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json';
const CISA_KEV_CATALOG_URL = 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog';
const GITHUB_ADVISORIES_URL = 'https://api.github.com/advisories?per_page=20&sort=published&direction=desc&type=reviewed';
const TOUTIAO_HOT_URL = 'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc';
const BAIDU_HOT_URL = 'https://top.baidu.com/api/board?platform=pc&tab=realtime';
const GITHUB_TRENDING_URL = 'https://github.com/trending?since=daily';
const HACKER_NEWS_TOP_URL = 'https://hacker-news.firebaseio.com/v0/topstories.json';
const V2EX_TECH_URL = 'https://www.v2ex.com/api/topics/show.json?node_name=programmer';
const RAW_GH_PAGES_FEED_URL = process.env.HOT_FEED_FALLBACK_URL || 'https://raw.githubusercontent.com/baizetop1/nav/gh-pages/hot-feed.json';
const OUTPUT_PATH = fileURLToPath(new URL('../public/hot-feed.json', import.meta.url));

const AI_FEEDS = Object.freeze([
  { source: 'OpenAI', url: 'https://openai.com/news/rss.xml' },
  { source: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml' },
  { source: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml' },
]);

const DOMESTIC_FEEDS = Object.freeze([
  { source: '中新网要闻', url: 'https://www.chinanews.com.cn/rss/importnews.xml' },
  { source: 'IT之家', url: 'https://www.ithome.com/rss/' },
]);

const CATEGORY_ORDER = Object.freeze(['cn', 'security', 'ai', 'dev']);
const CATEGORY_LIMIT = 12;
const SOURCE_ITEM_LIMIT = 18;
const HACKER_NEWS_LOOKAHEAD = 24;
const GITHUB_ITEM_LIMIT = 10;
const REQUEST_TIMEOUT_MS = 20_000;
const USER_AGENT = 'baize-nav-hot-feed/3.0 (+https://github.com/baizetop1/nav)';

function stableId(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
}

function isWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizeUrl(value, fallback = '') {
  const decoded = decodeHtml(String(value ?? '').trim());
  return isWebUrl(decoded) ? decoded : fallback;
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function textContent(value) {
  return decodeHtml(String(value ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'))
    .replace(/\s+/g, ' ')
    .trim();
}

function summaryContent(value) {
  const decoded = decodeHtml(String(value ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1'));
  return decodeHtml(decoded
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'))
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(value, limit = 240) {
  const characters = [...summaryContent(value)];
  return characters.length <= limit ? characters.join('') : `${characters.slice(0, limit - 1).join('')}…`;
}

function numericText(value) {
  const parsed = Number.parseInt(textContent(value).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toIsoDate(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const timestamp = typeof value === 'number' ? value : Date.parse(String(value));
  if (!Number.isFinite(timestamp)) return undefined;
  return new Date(timestamp).toISOString();
}

function fetchOptions(extraHeaders = {}) {
  return {
    headers: {
      accept: 'application/json, application/rss+xml;q=0.9, text/html;q=0.8, */*;q=0.7',
      'user-agent': USER_AGENT,
      ...extraHeaders,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  };
}

async function fetchText(url, extraHeaders) {
  const response = await fetch(url, fetchOptions(extraHeaders));
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.text();
}

async function fetchJson(url, extraHeaders) {
  const response = await fetch(url, fetchOptions(extraHeaders));
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

function optionalFields(values) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined && value !== ''));
}

function intelligenceItem({ id, category, title, url, source, publishedAt, summary, badge, signal }) {
  return {
    id,
    category,
    title: textContent(title),
    url,
    source,
    ...optionalFields({ publishedAt, summary: truncateText(summary), badge: textContent(badge), signal: textContent(signal) }),
  };
}

function isIntelligenceItem(value) {
  return Boolean(
    value
    && typeof value.id === 'string'
    && CATEGORY_ORDER.includes(value.category)
    && typeof value.title === 'string'
    && value.title.trim()
    && isWebUrl(value.url)
    && typeof value.source === 'string'
    && value.source.trim(),
  );
}

function normalizeExistingItem(value) {
  if (!isIntelligenceItem(value)) return null;
  return intelligenceItem({
    id: value.id,
    category: value.category,
    title: value.title,
    url: value.url,
    source: value.source,
    publishedAt: toIsoDate(value.publishedAt),
    summary: value.summary,
    badge: value.badge,
    signal: value.signal,
  });
}

function normalizedTitle(value) {
  return textContent(value).toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function itemKeys(item) {
  const keys = [];
  const badge = String(item?.badge ?? '').toUpperCase();
  if (/^CVE-\d{4}-\d{4,}$/.test(badge)) keys.push(`cve:${badge}`);
  try {
    const url = new URL(item.url);
    url.hash = '';
    keys.push(`url:${url.toString().replace(/\/$/, '').toLowerCase()}`);
  } catch {
    // Invalid URLs are removed before merging.
  }
  const title = normalizedTitle(item.title);
  if (title) keys.push(`title:${title}`);
  return keys;
}

export function roundRobinMerge(groups, limit = Number.POSITIVE_INFINITY) {
  const queues = groups.map((group) => Array.isArray(group) ? group.filter(isIntelligenceItem) : []);
  const offsets = queues.map(() => 0);
  const seen = new Set();
  const output = [];
  let advanced = true;

  while (advanced && output.length < limit) {
    advanced = false;
    for (let groupIndex = 0; groupIndex < queues.length && output.length < limit; groupIndex += 1) {
      const queue = queues[groupIndex];
      while (offsets[groupIndex] < queue.length) {
        const item = queue[offsets[groupIndex]];
        offsets[groupIndex] += 1;
        advanced = true;
        const keys = itemKeys(item);
        if (keys.some((key) => seen.has(key))) continue;
        keys.forEach((key) => seen.add(key));
        output.push(item);
        break;
      }
    }
  }
  return output;
}

export function parseCisaKev(payload, limit = SOURCE_ITEM_LIMIT) {
  const vulnerabilities = Array.isArray(payload?.vulnerabilities) ? [...payload.vulnerabilities] : [];
  vulnerabilities.sort((left, right) => String(right?.dateAdded ?? '').localeCompare(String(left?.dateAdded ?? '')));
  const seen = new Set();
  const items = [];

  for (const entry of vulnerabilities) {
    const cve = String(entry?.cveID ?? '').trim().toUpperCase();
    const vulnerabilityName = textContent(entry?.vulnerabilityName);
    if (!/^CVE-\d{4}-\d{4,}$/.test(cve) || !vulnerabilityName || seen.has(cve)) continue;
    const product = [textContent(entry?.vendorProject), textContent(entry?.product)].filter(Boolean).join(' ');
    const dueDate = String(entry?.dueDate ?? '').trim();
    const ransomware = String(entry?.knownRansomwareCampaignUse ?? '').toLowerCase() === 'known';
    seen.add(cve);
    items.push(intelligenceItem({
      id: `cisa-kev-${cve.toLowerCase()}`,
      category: 'security',
      title: `${product ? `${product}：` : ''}${vulnerabilityName}`,
      url: `${CISA_KEV_CATALOG_URL}?search_api_fulltext=${encodeURIComponent(cve)}`,
      source: 'CISA KEV',
      publishedAt: toIsoDate(entry?.dateAdded),
      summary: entry?.shortDescription,
      badge: cve,
      signal: `${ransomware ? '已知勒索利用' : '已遭利用'}${dueDate ? ` · 整改期限 ${dueDate}` : ''}`,
    }));
    if (items.length >= limit) break;
  }
  if (items.length === 0) throw new Error('CISA KEV data contained no usable vulnerabilities.');
  return items;
}

export function parseGithubAdvisories(payload, limit = SOURCE_ITEM_LIMIT) {
  if (!Array.isArray(payload)) throw new TypeError('GitHub advisories response must be an array.');
  const seen = new Set();
  const items = [];
  for (const entry of payload) {
    if (entry?.withdrawn_at) continue;
    const ghsa = String(entry?.ghsa_id ?? '').trim().toUpperCase();
    const cve = String(entry?.cve_id ?? '').trim().toUpperCase();
    const title = textContent(entry?.summary);
    const url = normalizeUrl(entry?.html_url, ghsa ? `https://github.com/advisories/${encodeURIComponent(ghsa)}` : '');
    const identity = ghsa || cve || url;
    if (!identity || !title || !url || seen.has(identity)) continue;
    const severity = String(entry?.severity ?? '').trim().toUpperCase();
    if (!['HIGH', 'CRITICAL'].includes(severity)) continue;
    const cvssScore = Number(entry?.cvss?.score);
    seen.add(identity);
    items.push(intelligenceItem({
      id: `github-advisory-${slug(ghsa || cve || stableId(url))}`,
      category: 'security',
      title,
      url,
      source: 'GitHub Advisory',
      publishedAt: toIsoDate(entry?.published_at ?? entry?.updated_at),
      summary: entry?.description,
      badge: cve || ghsa,
      signal: [severity, Number.isFinite(cvssScore) ? `CVSS ${cvssScore.toFixed(1)}` : ''].filter(Boolean).join(' · '),
    }));
    if (items.length >= limit) break;
  }
  if (items.length === 0) throw new Error('GitHub advisories response contained no usable advisories.');
  return items;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function xmlElement(block, names) {
  for (const name of names) {
    const escaped = escapeRegExp(name);
    const match = block.match(new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}\\s*>`, 'i'));
    if (match) return match[1];
  }
  return '';
}

function xmlLink(block) {
  const textLink = normalizeUrl(textContent(xmlElement(block, ['link'])));
  if (textLink) return textLink;
  const attributeMatch = block.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\/?\s*>/i);
  return normalizeUrl(attributeMatch?.[1]);
}

export function parseRssFeed(xml, { source, category = 'ai' }, limit = SOURCE_ITEM_LIMIT) {
  if (typeof xml !== 'string') throw new TypeError(`${source} feed response must be XML text.`);
  if (!CATEGORY_ORDER.includes(category)) throw new TypeError(`${source} feed category is not supported.`);
  const rssItems = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item\s*>/gi)].map((match) => match[1]);
  const atomEntries = [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry\s*>/gi)].map((match) => match[1]);
  const blocks = rssItems.length > 0 ? rssItems : atomEntries;
  const seen = new Set();
  const items = [];

  for (const block of blocks) {
    const title = textContent(xmlElement(block, ['title']));
    const guid = textContent(xmlElement(block, ['guid', 'id']));
    const url = xmlLink(block) || normalizeUrl(guid);
    if (!title || !url || seen.has(url)) continue;
    const publishedAt = toIsoDate(textContent(xmlElement(block, ['pubDate', 'published', 'updated', 'dc:date'])));
    const summary = truncateText(xmlElement(block, ['description', 'summary', 'content:encoded', 'content']));
    seen.add(url);
    items.push(intelligenceItem({
      id: `${category}-${slug(source)}-${stableId(guid || url || title)}`,
      category,
      title,
      url,
      source,
      publishedAt,
      summary: summary === title ? '' : summary,
      badge: source,
    }));
  }
  items.sort((left, right) => (Date.parse(right.publishedAt ?? '') || 0) - (Date.parse(left.publishedAt ?? '') || 0));
  if (items.length === 0) throw new Error(`${source} feed contained no usable posts.`);
  return items.slice(0, limit);
}

export function parseBaiduHotBoard(payload, limit = SOURCE_ITEM_LIMIT) {
  const cards = Array.isArray(payload?.data?.cards) ? payload.data.cards : [];
  const hotCard = cards.find((card) => card?.component === 'hotList' && Array.isArray(card?.content));
  const seen = new Set();
  const items = [];
  for (const entry of hotCard?.content ?? []) {
    const title = textContent(entry?.word ?? entry?.query);
    if (!title || seen.has(title)) continue;
    const hotScore = Number.parseInt(String(entry?.hotScore ?? ''), 10);
    seen.add(title);
    items.push(intelligenceItem({
      id: `cn-baidu-${stableId(title)}`,
      category: 'cn',
      title,
      url: normalizeUrl(entry?.url ?? entry?.rawUrl ?? entry?.appUrl, `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`),
      source: '百度热搜',
      summary: entry?.desc,
      badge: '热搜',
      signal: Number.isFinite(hotScore) ? `${hotScore.toLocaleString('zh-CN')} 热度` : '',
    }));
    if (items.length >= limit) break;
  }
  if (items.length === 0) throw new Error('Baidu hot-list data contained no usable topics.');
  return items;
}

export function parseToutiaoHotBoard(payload, limit = SOURCE_ITEM_LIMIT) {
  const content = Array.isArray(payload?.data) ? payload.data : [];
  const seen = new Set();
  const items = [];
  for (const entry of content) {
    const title = textContent(entry?.Title ?? entry?.QueryWord);
    if (!title || seen.has(title)) continue;
    const clusterId = String(entry?.ClusterIdStr ?? entry?.ClusterId ?? '').trim();
    const fallbackUrl = clusterId
      ? `https://www.toutiao.com/trending/${encodeURIComponent(clusterId)}/`
      : `https://so.toutiao.com/search?keyword=${encodeURIComponent(title)}`;
    const hotScore = Number.parseInt(String(entry?.HotValue ?? ''), 10);
    seen.add(title);
    items.push(intelligenceItem({
      id: `cn-toutiao-${clusterId || stableId(title)}`,
      category: 'cn',
      title,
      url: normalizeUrl(entry?.Url, fallbackUrl),
      source: '今日头条',
      badge: '热榜',
      signal: Number.isFinite(hotScore) ? `${hotScore.toLocaleString('zh-CN')} 热度` : '',
    }));
    if (items.length >= limit) break;
  }
  if (items.length === 0) throw new Error('Toutiao hot board contained no usable topics.');
  return items;
}

export function parseHackerNewsStories(payload, limit = SOURCE_ITEM_LIMIT) {
  if (!Array.isArray(payload)) throw new TypeError('Hacker News stories must be an array.');
  const seen = new Set();
  const items = [];
  for (const story of payload) {
    const id = Number(story?.id);
    const title = textContent(story?.title);
    if (!Number.isFinite(id) || story?.type !== 'story' || story?.deleted || story?.dead || !title || seen.has(id)) continue;
    const score = Number(story?.score);
    const comments = Number(story?.descendants);
    const signals = [];
    if (Number.isFinite(score)) signals.push(`${score} 分`);
    if (Number.isFinite(comments)) signals.push(`${comments} 评论`);
    seen.add(id);
    items.push(intelligenceItem({
      id: `hn-${id}`,
      category: 'dev',
      title,
      url: normalizeUrl(story?.url, `https://news.ycombinator.com/item?id=${id}`),
      source: 'Hacker News',
      publishedAt: Number.isFinite(Number(story?.time)) ? toIsoDate(Number(story.time) * 1_000) : undefined,
      badge: 'HN',
      signal: signals.join(' · '),
    }));
    if (items.length >= limit) break;
  }
  if (items.length === 0) throw new Error('Hacker News contained no usable stories.');
  return items;
}

export function parseV2exTopics(payload, limit = SOURCE_ITEM_LIMIT) {
  if (!Array.isArray(payload)) throw new TypeError('V2EX topics response must be an array.');
  const seen = new Set();
  const items = [];
  for (const topic of payload) {
    const id = Number(topic?.id);
    const title = textContent(topic?.title);
    const url = normalizeUrl(topic?.url, Number.isFinite(id) ? `https://www.v2ex.com/t/${id}` : '');
    if (!Number.isFinite(id) || !title || !url || seen.has(id)) continue;
    const replies = Number(topic?.replies);
    seen.add(id);
    items.push(intelligenceItem({
      id: `v2ex-${id}`,
      category: 'dev',
      title,
      url,
      source: 'V2EX 技术',
      publishedAt: Number.isFinite(Number(topic?.created)) ? toIsoDate(Number(topic.created) * 1_000) : undefined,
      summary: topic?.content_rendered ?? topic?.content,
      badge: textContent(topic?.node?.title) || 'V2EX',
      signal: Number.isFinite(replies) ? `${replies} 回复` : '',
    }));
    if (items.length >= limit) break;
  }
  if (items.length === 0) throw new Error('V2EX response contained no usable technical topics.');
  return items;
}

export function parseGithubTrendingPage(html, limit = GITHUB_ITEM_LIMIT) {
  if (typeof html !== 'string') throw new TypeError('GitHub Trending response must be HTML text.');
  const articles = [...html.matchAll(/<article\b[^>]*class=["'][^"']*\bBox-row\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi)];
  const seen = new Set();
  const items = [];

  for (const [, article] of articles) {
    const repoMatch = article.match(/<h2\b[\s\S]*?<a\b[^>]*href=["']\/([^"'?#\s]+\/[^"'?#\s]+)["'][^>]*>/i);
    const name = repoMatch ? decodeHtml(repoMatch[1]).replace(/\s+/g, '') : '';
    if (!/^[^/]+\/[^/]+$/.test(name) || seen.has(name.toLowerCase())) continue;
    const escapedName = escapeRegExp(name);
    const descriptionMatch = article.match(/<p\b[^>]*class=["'][^"']*\bcol-9\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
    const languageMatch = article.match(/<span\b[^>]*itemprop=["']programmingLanguage["'][^>]*>([\s\S]*?)<\/span>/i);
    const starsMatch = article.match(new RegExp(`<a\\b[^>]*href=["']\\/${escapedName}\\/stargazers["'][^>]*>([\\s\\S]*?)<\\/a>`, 'i'));
    const todayMatch = article.match(/([\d][\d,\s]*)\s+stars?\s+(?:today|this week|this month)/i);
    const description = textContent(descriptionMatch?.[1]);
    const language = textContent(languageMatch?.[1]);
    const stars = numericText(starsMatch?.[1]);
    const starsToday = numericText(todayMatch?.[1]);
    seen.add(name.toLowerCase());
    items.push({
      id: `github-${stableId(name.toLowerCase())}`,
      rank: items.length + 1,
      name,
      url: `https://github.com/${name}`,
      ...optionalFields({ description, language, stars, starsToday }),
    });
    if (items.length >= limit) break;
  }
  if (items.length === 0) throw new Error('GitHub Trending page contained no usable repositories.');
  return items;
}

async function fetchCisaKev() {
  return parseCisaKev(await fetchJson(CISA_KEV_URL));
}

async function fetchGithubAdvisories() {
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return parseGithubAdvisories(await fetchJson(GITHUB_ADVISORIES_URL, headers));
}

async function fetchRssFeed(config) {
  const xml = await fetchText(config.url, { accept: 'application/rss+xml, application/atom+xml;q=0.9, application/xml;q=0.8, text/xml;q=0.7' });
  return parseRssFeed(xml, config);
}

async function fetchToutiaoHotTopics() {
  return parseToutiaoHotBoard(await fetchJson(TOUTIAO_HOT_URL, { referer: 'https://www.toutiao.com/' }));
}

async function fetchBaiduHotTopics() {
  return parseBaiduHotBoard(await fetchJson(BAIDU_HOT_URL, { referer: 'https://top.baidu.com/' }));
}

async function fetchDomesticHotTopics() {
  try {
    return await fetchBaiduHotTopics();
  } catch (error) {
    console.warn(`Baidu hot list unavailable, trying Toutiao: ${error.message}`);
    return fetchToutiaoHotTopics();
  }
}

async function fetchHackerNews() {
  const ids = await fetchJson(HACKER_NEWS_TOP_URL);
  if (!Array.isArray(ids) || ids.length === 0) throw new Error('Hacker News returned no top-story IDs.');
  const stories = await Promise.all(ids.slice(0, HACKER_NEWS_LOOKAHEAD).map((id) =>
    fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).catch(() => null),
  ));
  return parseHackerNewsStories(stories);
}

async function fetchV2exTopics() {
  return parseV2exTopics(await fetchJson(V2EX_TECH_URL));
}

async function fetchGithubTrending() {
  const html = await fetchText(GITHUB_TRENDING_URL, {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    referer: 'https://github.com/explore',
  });
  const items = parseGithubTrendingPage(html);
  if (items.length < 3 || items.filter((item) => item.starsToday !== undefined).length < Math.ceil(items.length / 2)) {
    throw new Error('GitHub Trending page structure appears to have changed.');
  }
  return {
    source: { name: 'GitHub Trending', url: GITHUB_TRENDING_URL },
    items,
  };
}

const CATEGORY_LOADERS = Object.freeze({
  cn: Object.freeze([
    ...DOMESTIC_FEEDS.map((config) => ({ source: config.source, load: () => fetchRssFeed({ ...config, category: 'cn' }) })),
    { source: '国内热榜', acceptedSources: ['百度热搜', '今日头条'], load: fetchDomesticHotTopics },
  ]),
  security: Object.freeze([
    { source: 'CISA KEV', load: fetchCisaKev },
    { source: 'GitHub Advisory', load: fetchGithubAdvisories },
  ]),
  ai: Object.freeze(AI_FEEDS.map((config) => ({ source: config.source, load: () => fetchRssFeed(config) }))),
  dev: Object.freeze([
    { source: 'Hacker News', load: fetchHackerNews },
    { source: 'V2EX 技术', load: fetchV2exTopics },
  ]),
});

function isSupportedExistingFeed(value) {
  return Boolean(value && [1, 2, 3].includes(value.version) && typeof value.generatedAt === 'string');
}

function isV3Feed(value) {
  return Boolean(value?.version === 3 && Array.isArray(value?.intelligence?.items));
}

function acceptedSourceNames(source) {
  return Array.isArray(source) ? source : source ? [source] : [];
}

function fallbackIntelligenceItems(feed, category, source) {
  if (!isV3Feed(feed)) return [];
  const sources = acceptedSourceNames(source);
  return feed.intelligence.items
    .map(normalizeExistingItem)
    .filter((item) => item && item.category === category && (sources.length === 0 || sources.includes(item.source)));
}

function hasGithubTrendingItems(value) {
  return Boolean(value?.source?.name && value?.source?.url && value?.items?.length && value.items[0]?.name);
}

async function readLocalFeed() {
  try {
    const parsed = JSON.parse(await readFile(OUTPUT_PATH, 'utf8'));
    return isSupportedExistingFeed(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchRawGhPagesV3Feed() {
  try {
    const parsed = await fetchJson(RAW_GH_PAGES_FEED_URL, { accept: 'application/json' });
    if (!isV3Feed(parsed)) throw new Error('raw gh-pages feed is not hot-feed v3');
    return parsed;
  } catch (error) {
    console.warn(`Raw gh-pages v3 fallback unavailable: ${error.message}`);
    return null;
  }
}

async function readExistingFeed() {
  const [local, rawGhPages] = await Promise.all([readLocalFeed(), fetchRawGhPagesV3Feed()]);
  return [local, rawGhPages]
    .filter(Boolean)
    .sort((left, right) => (Date.parse(right.generatedAt) || 0) - (Date.parse(left.generatedAt) || 0))[0] ?? null;
}

function validLiveItems(items, category, source) {
  if (!Array.isArray(items)) return [];
  const sources = acceptedSourceNames(source);
  return items
    .map(normalizeExistingItem)
    .filter((item) => item && item.category === category && sources.includes(item.source));
}

async function loadCategory(category, existing) {
  const loaders = CATEGORY_LOADERS[category];
  const results = await Promise.allSettled(loaders.map(({ load }) => load()));
  const groups = [];
  let refreshed = false;

  for (let index = 0; index < loaders.length; index += 1) {
    const loader = loaders[index];
    const result = results[index];
    const sources = loader.acceptedSources ?? loader.source;
    let items = result.status === 'fulfilled' ? validLiveItems(result.value, category, sources) : [];
    if (items.length > 0) refreshed = true;
    if (items.length === 0) {
      const reason = result.status === 'rejected' ? result.reason?.message ?? String(result.reason) : 'source returned no valid items';
      console.warn(`${loader.source} unavailable: ${reason}`);
      items = fallbackIntelligenceItems(existing, category, sources);
      if (items.length > 0) {
        console.warn(`Keeping previous ${loader.source} items from the selected existing v3 feed.`);
      }
    }
    if (items.length > 0) groups.push(items);
  }

  if (groups.length === 0) {
    const previousItems = fallbackIntelligenceItems(existing, category);
    if (previousItems.length > 0) return { items: previousItems.slice(0, CATEGORY_LIMIT), refreshed: false };
  }
  return { items: roundRobinMerge(groups, CATEGORY_LIMIT), refreshed };
}

async function loadIntelligence(existing) {
  const categoryResults = await Promise.all(CATEGORY_ORDER.map((category) => loadCategory(category, existing)));
  return {
    items: roundRobinMerge(categoryResults.map((result) => result.items), CATEGORY_LIMIT * CATEGORY_ORDER.length),
    refreshed: categoryResults.some((result) => result.refreshed),
  };
}

async function loadGithubTrending(existing) {
  try {
    return { data: await fetchGithubTrending(), refreshed: true };
  } catch (error) {
    console.warn(`GitHub Trending unavailable: ${error.message}`);
    if (hasGithubTrendingItems(existing?.github)) {
      console.warn('Keeping the previously generated local GitHub Trending list.');
      return { data: existing.github, refreshed: false };
    }
    return { data: { source: { name: 'GitHub Trending', url: GITHUB_TRENDING_URL }, items: [] }, refreshed: false };
  }
}

function assertV3Output(output) {
  assert.equal(output.version, 3);
  assert.ok(toIsoDate(output.generatedAt));
  assert.ok(toIsoDate(output.intelligence.updatedAt));
  assert.ok(toIsoDate(output.github.updatedAt));
  assert.ok(Array.isArray(output.intelligence.items));
  output.intelligence.items.forEach((item) => assert.ok(isIntelligenceItem(item)));
  assert.ok(hasGithubTrendingItems(output.github));
}

async function runSelfTest() {
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async () => {
    networkCalls += 1;
    throw new Error('Network access is forbidden during --self-test.');
  };

  try {
    const cisa = parseCisaKev({ vulnerabilities: [
      {
        cveID: 'CVE-2026-10001',
        vendorProject: 'Example',
        product: 'Gateway',
        vulnerabilityName: 'Remote Code Execution',
        dateAdded: '2026-08-30',
        shortDescription: 'An actively exploited example vulnerability.',
        requiredAction: 'Apply mitigations.',
        dueDate: '2026-09-02',
        knownRansomwareCampaignUse: 'Known',
      },
      {
        cveID: 'CVE-2026-10000',
        vendorProject: 'Example',
        product: 'Server',
        vulnerabilityName: 'Authentication Bypass',
        dateAdded: '2026-08-29',
        dueDate: '2026-09-05',
        knownRansomwareCampaignUse: 'Unknown',
      },
    ] });
    assert.equal(cisa.length, 2);
    assert.equal(cisa[0].badge, 'CVE-2026-10001');
    assert.match(cisa[0].signal, /已知勒索利用/);

    const advisories = parseGithubAdvisories([
      {
        ghsa_id: 'GHSA-AAAA-BBBB-CCCC',
        cve_id: 'CVE-2026-20001',
        summary: 'Example package allows arbitrary file writes',
        description: '<p>Upgrade to the patched release.</p>',
        severity: 'high',
        cvss: { score: 8.1 },
        published_at: '2026-08-31T01:00:00Z',
        html_url: 'https://github.com/advisories/GHSA-AAAA-BBBB-CCCC',
      },
      {
        ghsa_id: 'GHSA-DDDD-EEEE-FFFF',
        summary: 'Example denial of service',
        severity: 'critical',
        published_at: '2026-08-30T01:00:00Z',
        html_url: 'https://github.com/advisories/GHSA-DDDD-EEEE-FFFF',
      },
    ]);
    assert.equal(advisories[0].signal, 'HIGH · CVSS 8.1');

    const domesticRss = parseRssFeed(`<?xml version="1.0"?><rss><channel>
      <item><title>国内政策动态</title><link>https://www.chinanews.com.cn/gn/example.shtml</link><pubDate>Mon, 31 Aug 2026 09:27:20 +0800</pubDate><description>权威来源摘要 &lt;img src=&quot;https://example.com/image.jpg&quot;&gt;</description></item>
    </channel></rss>`, { source: '中新网要闻', category: 'cn' });
    assert.equal(domesticRss[0].category, 'cn');
    assert.match(domesticRss[0].id, /^cn-/);
    assert.equal(domesticRss[0].summary, '权威来源摘要');

    const toutiao = parseToutiaoHotBoard({ data: [
      { ClusterIdStr: '42', Title: '示例国内热榜', Url: 'https://www.toutiao.com/trending/42/', HotValue: '54321' },
    ] });
    assert.equal(toutiao[0].category, 'cn');
    assert.equal(toutiao[0].signal, '54,321 热度');

    const baiduFixture = { data: { cards: [{ component: 'hotList', content: [
      { word: '示例百度热搜', url: 'https://www.baidu.com/s?wd=example', hotScore: '12345' },
    ] }] } };
    const baidu = parseBaiduHotBoard(baiduFixture);
    assert.equal(baidu[0].category, 'cn');
    assert.equal(baidu[0].signal, '12,345 热度');

    const rss = parseRssFeed(`<?xml version="1.0"?><rss><channel>
      <item><title><![CDATA[New &amp; useful model]]></title><link>https://example.com/model</link><pubDate>Sun, 30 Aug 2026 10:00:00 GMT</pubDate><description><![CDATA[<p>Release details.</p>]]></description></item>
      <item><title>Research update</title><link>https://example.com/research</link><pubDate>Sat, 29 Aug 2026 10:00:00 GMT</pubDate></item>
    </channel></rss>`, { source: 'OpenAI' });
    assert.equal(rss.length, 2);
    assert.equal(rss[0].title, 'New & useful model');
    assert.equal(rss[0].summary, 'Release details.');

    const atom = parseRssFeed(`<?xml version="1.0"?><feed>
      <entry><title>DeepMind post</title><link rel="alternate" href="https://example.com/deepmind"/><id>tag:example,2026:1</id><updated>2026-08-31T05:00:00Z</updated><summary>Summary</summary></entry>
    </feed>`, { source: 'Google DeepMind' });
    assert.equal(atom[0].url, 'https://example.com/deepmind');

    const hn = parseHackerNewsStories([
      { id: 101, type: 'story', title: 'Runtime engineering notes', url: 'https://example.com/runtime', score: 120, descendants: 30, time: 1788144000 },
      { id: 102, type: 'story', title: 'Show HN: Example', score: 80, descendants: 10, time: 1788140000 },
    ]);
    assert.equal(hn[1].url, 'https://news.ycombinator.com/item?id=102');

    const v2ex = parseV2exTopics([
      { id: 301, title: '一个 Node.js 性能问题', url: 'https://www.v2ex.com/t/301', content: '如何分析事件循环延迟？', replies: 16, created: 1788144000, node: { title: '程序员' } },
    ]);
    assert.equal(v2ex[0].badge, '程序员');

    const merged = roundRobinMerge([cisa, advisories], 4);
    assert.deepEqual(merged.map((item) => item.source), ['CISA KEV', 'GitHub Advisory', 'CISA KEV', 'GitHub Advisory']);

    const githubHtml = `
      <article class="Box-row">
        <h2 class="h3 lh-condensed"><a href="/openai/example">openai / example</a></h2>
        <p class="col-9 color-fg-muted my-1 pr-4">A useful &amp; safe example.</p>
        <span itemprop="programmingLanguage">TypeScript</span>
        <a href="/openai/example/stargazers">12,345</a>
        <span>678 stars today</span>
      </article>`;
    const githubItems = parseGithubTrendingPage(githubHtml);
    assert.equal(githubItems[0].name, 'openai/example');
    assert.equal(githubItems[0].stars, 12345);
    assert.equal(githubItems[0].starsToday, 678);

    const fixtureOutput = {
      version: 3,
      generatedAt: '2026-08-31T08:00:00.000Z',
      intelligence: { updatedAt: '2026-08-31T08:00:00.000Z', items: roundRobinMerge([domesticRss, cisa, rss, hn], 8) },
      github: { updatedAt: '2026-08-31T08:00:00.000Z', source: { name: 'GitHub Trending', url: GITHUB_TRENDING_URL }, items: githubItems },
    };
    assertV3Output(fixtureOutput);
    assert.ok(isSupportedExistingFeed({ version: 1, generatedAt: fixtureOutput.generatedAt }));
    assert.ok(isSupportedExistingFeed({ version: 2, generatedAt: fixtureOutput.generatedAt }));
    assert.ok(isSupportedExistingFeed(fixtureOutput));
    assert.equal(networkCalls, 0);
    console.log('Hot-feed v3 parser and schema self-check passed (0 network calls).');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function main() {
  if (process.argv.includes('--self-test')) {
    await runSelfTest();
    return;
  }

  const existing = await readExistingFeed();
  const [intelligenceResult, githubResult] = await Promise.all([
    loadIntelligence(existing),
    loadGithubTrending(existing),
  ]);
  const generatedAt = new Date().toISOString();
  const intelligence = {
    updatedAt: intelligenceResult.refreshed ? generatedAt : toIsoDate(existing?.intelligence?.updatedAt ?? existing?.generatedAt) ?? generatedAt,
    items: intelligenceResult.items,
  };
  const github = {
    ...githubResult.data,
    updatedAt: githubResult.refreshed ? generatedAt : toIsoDate(existing?.github?.updatedAt ?? existing?.generatedAt) ?? generatedAt,
  };
  const output = { version: 3, generatedAt, intelligence, github };
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  const categoryCounts = Object.fromEntries(CATEGORY_ORDER.map((category) => [
    category,
    intelligence.items.filter((item) => item.category === category).length,
  ]));
  console.log(`Updated ${OUTPUT_PATH}: ${categoryCounts.cn} domestic, ${categoryCounts.security} security, ${categoryCounts.ai} AI, ${categoryCounts.dev} dev items, ${github.items.length} GitHub Trending repositories.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
