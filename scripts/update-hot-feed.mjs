import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BAIDU_BOARD_URL = 'https://top.baidu.com/board?tab=realtime';
const TOUTIAO_HOT_URL = 'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc';
const HACKER_NEWS_TOP_URL = 'https://hacker-news.firebaseio.com/v0/topstories.json';
const DEFAULT_GITHUB_USERNAME = 'baizetop1';
const ITEM_LIMIT = 10;
const REQUEST_TIMEOUT_MS = 20_000;
const OUTPUT_PATH = fileURLToPath(new URL('../public/hot-feed.json', import.meta.url));
const USER_AGENT = 'baize-nav-hot-feed/1.0 (+https://github.com/baizetop1/nav)';

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
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return response.text();
}

async function fetchJson(url, extraHeaders) {
  const response = await fetch(url, fetchOptions(extraHeaders));
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return response.json();
}

export function parseBaiduHotPage(html, limit = ITEM_LIMIT) {
  if (typeof html !== 'string') {
    throw new TypeError('Baidu response must be HTML text.');
  }

  const marker = '<!--s-data:';
  const start = html.indexOf(marker);
  const end = start >= 0 ? html.indexOf('-->', start + marker.length) : -1;
  if (start < 0 || end < 0) {
    throw new Error('Baidu embedded hot-list data was not found.');
  }

  const payload = JSON.parse(html.slice(start + marker.length, end));
  const cards = Array.isArray(payload?.data?.cards) ? payload.data.cards : [];
  const hotCard = cards.find(
    (card) => card?.component === 'hotList' && Array.isArray(card?.content),
  );
  const content = hotCard?.content ?? [];
  const seen = new Set();
  const items = [];

  for (const entry of content) {
    const title = String(entry?.word ?? entry?.query ?? '').trim();
    if (!title || seen.has(title)) continue;

    const url = normalizeUrl(
      entry?.url ?? entry?.rawUrl ?? entry?.appUrl,
      `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`,
    );
    const hotScore = Number.parseInt(String(entry?.hotScore ?? ''), 10);
    seen.add(title);
    items.push({
      id: `baidu-${stableId(title)}`,
      title,
      url,
      rank: items.length + 1,
      ...(Number.isFinite(hotScore) ? { hot: hotScore } : {}),
    });

    if (items.length >= limit) break;
  }

  if (items.length === 0) {
    throw new Error('Baidu hot-list data contained no usable topics.');
  }
  return items;
}

async function fetchBaiduHotTopics() {
  const html = await fetchText(BAIDU_BOARD_URL, {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    referer: 'https://www.baidu.com/',
  });
  return {
    source: { name: '百度热搜', url: BAIDU_BOARD_URL },
    items: parseBaiduHotPage(html),
  };
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

async function fetchToutiaoHotTopics() {
  const payload = await fetchJson(TOUTIAO_HOT_URL, {
    referer: 'https://www.toutiao.com/',
  });
  return {
    source: { name: '今日头条热榜', url: 'https://www.toutiao.com/trending/' },
    items: parseToutiaoHotBoard(payload),
  };
}

async function fetchHackerNewsFallback() {
  const ids = await fetchJson(HACKER_NEWS_TOP_URL);
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('Hacker News returned no top stories.');
  }

  const stories = await Promise.all(
    ids.slice(0, ITEM_LIMIT + 6).map((id) =>
      fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).catch(() => null),
    ),
  );
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

  if (items.length === 0) {
    throw new Error('Hacker News fallback contained no usable stories.');
  }
  return {
    source: { name: 'Hacker News 热门（备用）', url: 'https://news.ycombinator.com/' },
    items,
  };
}

function repoUrl(repo) {
  return `https://github.com/${repo}`;
}

function firstLine(value) {
  return String(value ?? '').split(/\r?\n/, 1)[0].trim();
}

function mapGithubEvent(event) {
  const type = String(event?.type ?? 'Event');
  const repo = typeof event?.repo?.name === 'string' ? event.repo.name : undefined;
  const baseUrl = repo ? repoUrl(repo) : 'https://github.com/';
  const payload = event?.payload ?? {};
  let kind = type.replace(/Event$/, '').toLowerCase() || 'activity';
  let title = type.replace(/Event$/, '');
  let url = baseUrl;

  switch (type) {
    case 'PushEvent': {
      const commits = Array.isArray(payload.commits) ? payload.commits : [];
      const message = firstLine(commits.at(-1)?.message);
      title = message || `推送 ${commits.length || payload.size || 1} 个提交`;
      const sha = commits.at(-1)?.sha ?? payload.head;
      if (repo && sha) url = `${baseUrl}/commit/${sha}`;
      break;
    }
    case 'CreateEvent':
      kind = 'create';
      title = payload.ref
        ? `创建 ${payload.ref_type ?? '引用'} ${payload.ref}`
        : `创建 ${payload.ref_type ?? '仓库'}`;
      if (repo && payload.ref && payload.ref_type === 'branch') {
        url = `${baseUrl}/tree/${encodeURIComponent(payload.ref)}`;
      }
      break;
    case 'WatchEvent':
      kind = 'star';
      title = '收藏了这个仓库';
      break;
    case 'ForkEvent':
      kind = 'fork';
      title = 'Fork 了这个仓库';
      url = normalizeUrl(payload.forkee?.html_url, baseUrl);
      break;
    case 'IssuesEvent':
      kind = 'issue';
      title = `${payload.action === 'opened' ? '创建' : '更新'} Issue #${payload.issue?.number ?? ''}`.trim();
      url = normalizeUrl(payload.issue?.html_url, baseUrl);
      break;
    case 'IssueCommentEvent':
      kind = 'comment';
      title = `评论了 Issue #${payload.issue?.number ?? ''}`.trim();
      url = normalizeUrl(payload.comment?.html_url, payload.issue?.html_url ?? baseUrl);
      break;
    case 'PullRequestEvent':
      kind = 'pull-request';
      title = `${payload.action === 'opened' ? '创建' : '更新'} PR #${payload.pull_request?.number ?? ''}`.trim();
      url = normalizeUrl(payload.pull_request?.html_url, baseUrl);
      break;
    case 'PullRequestReviewEvent':
      kind = 'review';
      title = `评审了 PR #${payload.pull_request?.number ?? ''}`.trim();
      url = normalizeUrl(payload.review?.html_url, payload.pull_request?.html_url ?? baseUrl);
      break;
    case 'ReleaseEvent':
      kind = 'release';
      title = `发布 ${payload.release?.name ?? payload.release?.tag_name ?? '新版本'}`;
      url = normalizeUrl(payload.release?.html_url, baseUrl);
      break;
    case 'PublicEvent':
      kind = 'public';
      title = '将仓库设为公开';
      break;
    case 'MemberEvent':
      kind = 'member';
      title = `${payload.action === 'added' ? '添加' : '更新'}协作者 ${payload.member?.login ?? ''}`.trim();
      break;
    case 'DeleteEvent':
      kind = 'delete';
      title = `删除 ${payload.ref_type ?? '引用'} ${payload.ref ?? ''}`.trim();
      break;
  }

  const createdAt = new Date(event?.created_at ?? 0);
  return {
    id: String(event?.id ?? `github-${stableId(`${type}-${repo}-${title}-${createdAt}`)}`),
    type: kind,
    title,
    ...(repo ? { repo } : {}),
    url: normalizeUrl(url, baseUrl),
    createdAt: Number.isNaN(createdAt.getTime()) ? new Date(0).toISOString() : createdAt.toISOString(),
  };
}

export function parseGithubEvents(events, limit = ITEM_LIMIT) {
  if (!Array.isArray(events)) {
    throw new TypeError('GitHub events response must be an array.');
  }
  return events
    .filter((event) => event && typeof event.type === 'string')
    .map(mapGithubEvent)
    .filter((event) => event.title)
    .slice(0, limit);
}

async function fetchGithubActivity(username) {
  const token = process.env.GITHUB_TOKEN?.trim();
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
  const encodedUsername = encodeURIComponent(username);
  const events = await fetchJson(
    `https://api.github.com/users/${encodedUsername}/events/public?per_page=30`,
    headers,
  );
  return {
    username,
    profileUrl: `https://github.com/${encodedUsername}`,
    items: parseGithubEvents(events),
  };
}

async function readExistingFeed() {
  try {
    const parsed = JSON.parse(await readFile(OUTPUT_PATH, 'utf8'));
    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function hasSocialItems(value) {
  return Boolean(value?.source?.name && value?.source?.url && value?.items?.length);
}

function hasGithubItems(value, username) {
  return Boolean(value?.username === username && value?.profileUrl && value?.items?.length);
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
    return {
      source: { name: '百度热搜', url: BAIDU_BOARD_URL },
      items: [],
    };
  }
}

async function loadGithub(username, existing) {
  try {
    return await fetchGithubActivity(username);
  } catch (error) {
    console.warn(`GitHub activity unavailable: ${error.message}`);
    if (hasGithubItems(existing?.github, username)) {
      console.warn('Keeping the previously generated GitHub activity.');
      return existing.github;
    }
    return {
      username,
      profileUrl: `https://github.com/${encodeURIComponent(username)}`,
      items: [],
    };
  }
}

async function runSelfTest() {
  const fixture = {
    data: {
      cards: [
        {
          component: 'hotList',
          content: [
            { word: '示例热搜一', url: 'https://www.baidu.com/s?wd=one', hotScore: '12345' },
            { query: '示例热搜二', rawUrl: 'https://www.baidu.com/s?wd=two', hotScore: '9876' },
          ],
        },
      ],
    },
  };
  const social = parseBaiduHotPage(`<!doctype html><!--s-data:${JSON.stringify(fixture)}-->`);
  assert.equal(social.length, 2);
  assert.equal(social[0].rank, 1);
  assert.equal(social[0].hot, 12345);

  const toutiao = parseToutiaoHotBoard({
    data: [{ ClusterIdStr: '42', Title: '示例头条热榜', Url: 'https://www.toutiao.com/trending/42/', HotValue: '54321' }],
  });
  assert.equal(toutiao.length, 1);
  assert.equal(toutiao[0].hot, 54321);

  const github = parseGithubEvents([
    {
      id: '1',
      type: 'PushEvent',
      repo: { name: 'baizetop1/nav' },
      payload: { commits: [{ sha: 'abc123', message: '更新首页\n更多说明' }] },
      created_at: '2026-01-01T00:00:00Z',
    },
  ]);
  assert.equal(github.length, 1);
  assert.equal(github[0].type, 'push');
  assert.equal(github[0].title, '更新首页');
  assert.equal(github[0].url, 'https://github.com/baizetop1/nav/commit/abc123');
  console.log('Hot-feed parser self-check passed.');
}

async function main() {
  if (process.argv.includes('--self-test')) {
    await runSelfTest();
    return;
  }

  const username = process.env.HOT_FEED_GITHUB_USER?.trim() || DEFAULT_GITHUB_USERNAME;
  const existing = await readExistingFeed();
  const [social, github] = await Promise.all([
    loadSocial(existing),
    loadGithub(username, existing),
  ]);
  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    social,
    github,
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(
    `Updated ${OUTPUT_PATH}: ${social.items.length} social topics, ${github.items.length} GitHub events.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
