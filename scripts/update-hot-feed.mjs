import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BAIDU_BOARD_URL = 'https://top.baidu.com/board?tab=realtime';
const TOUTIAO_HOT_URL = 'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc';
const GITHUB_TRENDING_URL = 'https://github.com/trending?since=daily';
const HACKER_NEWS_TOP_URL = 'https://hacker-news.firebaseio.com/v0/topstories.json';
const ITEM_LIMIT = 10;
const REQUEST_TIMEOUT_MS = 20_000;
const OUTPUT_PATH = fileURLToPath(new URL('../public/hot-feed.json', import.meta.url));
const USER_AGENT = 'baize-nav-hot-feed/2.0 (+https://github.com/baizetop1/nav)';

function stableId(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

function isWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizeUrl(value, fallback) {
  return isWebUrl(value) ? value : fallback;
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
  return decodeHtml(String(value ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function numericText(value) {
  const parsed = Number.parseInt(textContent(value).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function fetchOptions(extraHeaders = {}) {
  return {
    headers: {
      accept: 'application/json, text/html;q=0.9, */*;q=0.8',
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

export function parseBaiduHotPage(html, limit = ITEM_LIMIT) {
  if (typeof html !== 'string') throw new TypeError('Baidu response must be HTML text.');
  const marker = '<!--s-data:';
  const start = html.indexOf(marker);
  const end = start >= 0 ? html.indexOf('-->', start + marker.length) : -1;
  if (start < 0 || end < 0) throw new Error('Baidu embedded hot-list data was not found.');

  const payload = JSON.parse(html.slice(start + marker.length, end));
  const cards = Array.isArray(payload?.data?.cards) ? payload.data.cards : [];
  const hotCard = cards.find((card) => card?.component === 'hotList' && Array.isArray(card?.content));
  const seen = new Set();
  const items = [];
  for (const entry of hotCard?.content ?? []) {
    const title = String(entry?.word ?? entry?.query ?? '').trim();
    if (!title || seen.has(title)) continue;
    const hotScore = Number.parseInt(String(entry?.hotScore ?? ''), 10);
    seen.add(title);
    items.push({
      id: `baidu-${stableId(title)}`,
      title,
      url: normalizeUrl(entry?.url ?? entry?.rawUrl ?? entry?.appUrl, `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`),
      rank: items.length + 1,
      ...(Number.isFinite(hotScore) ? { hot: hotScore } : {}),
    });
    if (items.length >= limit) break;
  }
  if (items.length === 0) throw new Error('Baidu hot-list data contained no usable topics.');
  return items;
}

export function parseToutiaoHotBoard(payload, limit = ITEM_LIMIT) {
  const content = Array.isArray(payload?.data) ? payload.data : [];
  const seen = new Set();
  const items = [];
  for (const entry of content) {
    const title = String(entry?.Title ?? entry?.QueryWord ?? '').trim();
    if (!title || seen.has(title)) continue;
    const clusterId = String(entry?.ClusterIdStr ?? '').trim();
    const fallbackUrl = clusterId
      ? `https://www.toutiao.com/trending/${encodeURIComponent(clusterId)}/`
      : `https://so.toutiao.com/search?keyword=${encodeURIComponent(title)}`;
    const hotScore = Number.parseInt(String(entry?.HotValue ?? ''), 10);
    seen.add(title);
    items.push({
      id: `toutiao-${clusterId || stableId(title)}`,
      title,
      url: normalizeUrl(entry?.Url, fallbackUrl),
      rank: items.length + 1,
      ...(Number.isFinite(hotScore) ? { hot: hotScore } : {}),
    });
    if (items.length >= limit) break;
  }
  if (items.length === 0) throw new Error('Toutiao hot board contained no usable topics.');
  return items;
}

export function parseGithubTrendingPage(html, limit = ITEM_LIMIT) {
  if (typeof html !== 'string') throw new TypeError('GitHub Trending response must be HTML text.');
  const articles = [...html.matchAll(/<article\b[^>]*class=["'][^"']*\bBox-row\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi)];
  const seen = new Set();
  const items = [];

  for (const [, article] of articles) {
    const repoMatch = article.match(/<h2\b[\s\S]*?<a\b[^>]*href=["']\/([^"'?#\s]+\/[^"'?#\s]+)["'][^>]*>/i);
    const name = repoMatch ? decodeHtml(repoMatch[1]).replace(/\s+/g, '') : '';
    if (!/^[^/]+\/[^/]+$/.test(name) || seen.has(name.toLowerCase())) continue;
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      ...(description ? { description } : {}),
      ...(language ? { language } : {}),
      ...(stars !== undefined ? { stars } : {}),
      ...(starsToday !== undefined ? { starsToday } : {}),
    });
    if (items.length >= limit) break;
  }
  if (items.length === 0) throw new Error('GitHub Trending page contained no usable repositories.');
  return items;
}

async function fetchToutiaoHotTopics() {
  const payload = await fetchJson(TOUTIAO_HOT_URL, { referer: 'https://www.toutiao.com/' });
  return { source: { name: '今日头条热榜', url: 'https://www.toutiao.com/trending/' }, items: parseToutiaoHotBoard(payload) };
}

async function fetchBaiduHotTopics() {
  const html = await fetchText(BAIDU_BOARD_URL, {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    referer: 'https://www.baidu.com/',
  });
  return { source: { name: '百度热搜', url: BAIDU_BOARD_URL }, items: parseBaiduHotPage(html) };
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

async function fetchHackerNewsFallback() {
  const ids = await fetchJson(HACKER_NEWS_TOP_URL);
  if (!Array.isArray(ids) || ids.length === 0) throw new Error('Hacker News returned no top stories.');
  const stories = await Promise.all(ids.slice(0, ITEM_LIMIT + 6).map((id) =>
    fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).catch(() => null),
  ));
  const items = stories
    .filter((story) => story && story.type === 'story' && typeof story.title === 'string')
    .slice(0, ITEM_LIMIT)
    .map((story, index) => ({
      id: `hn-${story.id}`,
      title: story.title.trim(),
      url: normalizeUrl(story.url, `https://news.ycombinator.com/item?id=${story.id}`),
      rank: index + 1,
      ...(Number.isFinite(story.score) ? { hot: story.score } : {}),
    }));
  if (items.length === 0) throw new Error('Hacker News fallback contained no usable stories.');
  return { source: { name: 'Hacker News 热门（备用）', url: 'https://news.ycombinator.com/' }, items };
}

async function readExistingFeed() {
  try {
    const parsed = JSON.parse(await readFile(OUTPUT_PATH, 'utf8'));
    return parsed?.version === 1 || parsed?.version === 2 ? parsed : null;
  } catch {
    return null;
  }
}

function hasSocialItems(value) {
  return Boolean(value?.source?.name && value?.source?.url && value?.items?.length);
}

function hasGithubTrendingItems(value) {
  return Boolean(value?.source?.name && value?.source?.url && value?.items?.length && value.items[0]?.name);
}

async function loadSocial(existing) {
  try {
    return await fetchToutiaoHotTopics();
  } catch (error) {
    console.warn(`Toutiao hot board unavailable: ${error.message}`);
  }
  try {
    return await fetchBaiduHotTopics();
  } catch (error) {
    console.warn(`Baidu hot list unavailable: ${error.message}`);
  }
  if (hasSocialItems(existing?.social)) {
    console.warn('Keeping the previously generated social hot list.');
    return existing.social;
  }
  try {
    console.warn('Using Hacker News as the first-run social-feed fallback.');
    return await fetchHackerNewsFallback();
  } catch (error) {
    console.warn(`Social fallback unavailable: ${error.message}`);
    return { source: { name: '百度热搜', url: BAIDU_BOARD_URL }, items: [] };
  }
}

async function loadGithubTrending(existing) {
  try {
    return await fetchGithubTrending();
  } catch (error) {
    console.warn(`GitHub Trending unavailable: ${error.message}`);
    if (hasGithubTrendingItems(existing?.github)) {
      console.warn('Keeping the previously generated GitHub Trending list.');
      return existing.github;
    }
    return { source: { name: 'GitHub Trending', url: GITHUB_TRENDING_URL }, items: [] };
  }
}

async function runSelfTest() {
  const baiduFixture = { data: { cards: [{ component: 'hotList', content: [
    { word: '示例热搜一', url: 'https://www.baidu.com/s?wd=one', hotScore: '12345' },
    { query: '示例热搜二', rawUrl: 'https://www.baidu.com/s?wd=two', hotScore: '9876' },
  ] }] } };
  const social = parseBaiduHotPage(`<!doctype html><!--s-data:${JSON.stringify(baiduFixture)}-->`);
  assert.equal(social.length, 2);
  assert.equal(social[0].hot, 12345);

  const toutiao = parseToutiaoHotBoard({ data: [
    { ClusterIdStr: '42', Title: '示例头条热榜', Url: 'https://www.toutiao.com/trending/42/', HotValue: '54321' },
  ] });
  assert.equal(toutiao[0].hot, 54321);

  const githubHtml = `
    <article class="Box-row">
      <h2 class="h3 lh-condensed"><a href="/openai/example">openai / example</a></h2>
      <p class="col-9 color-fg-muted my-1 pr-4">A useful &amp; safe example.</p>
      <span itemprop="programmingLanguage">TypeScript</span>
      <a href="/openai/example/stargazers">12,345</a>
      <span>678 stars today</span>
    </article>`;
  const github = parseGithubTrendingPage(githubHtml);
  assert.equal(github.length, 1);
  assert.equal(github[0].name, 'openai/example');
  assert.equal(github[0].description, 'A useful & safe example.');
  assert.equal(github[0].stars, 12345);
  assert.equal(github[0].starsToday, 678);
  console.log('Hot-feed parser self-check passed.');
}

async function main() {
  if (process.argv.includes('--self-test')) {
    await runSelfTest();
    return;
  }
  const existing = await readExistingFeed();
  const [social, github] = await Promise.all([loadSocial(existing), loadGithubTrending(existing)]);
  const output = { version: 2, generatedAt: new Date().toISOString(), social, github };
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Updated ${OUTPUT_PATH}: ${social.items.length} social topics, ${github.items.length} GitHub Trending repositories.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
