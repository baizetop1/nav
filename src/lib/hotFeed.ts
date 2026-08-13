export interface SocialHotItem {
  id: string;
  rank: number;
  title: string;
  url: string;
  hot?: string;
}

export interface GithubActivityItem {
  id: string;
  type: string;
  title: string;
  repository?: string;
  url: string;
  createdAt: string;
}

export interface HotFeedReport {
  version: 1;
  generatedAt: string;
  social: {
    source: {
      name: string;
      url: string;
    };
    items: SocialHotItem[];
  };
  github: {
    username: string;
    profileUrl: string;
    items: GithubActivityItem[];
  };
}

export interface HotFeedLoadOptions {
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}

const CACHE_KEY = 'nav_hot_feed_cache_v1';

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

function safeDate(value: unknown): string | null {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function parseSocialItem(value: unknown, index: number): SocialHotItem | null {
  if (!isObject(value)) return null;
  const url = safeHttpUrl(value.url);
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  if (!url || !title) return null;
  const numericRank = typeof value.rank === 'number' ? value.rank : Number(value.rank);
  const hotValue = value.hot ?? value.heat;
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `${index + 1}-${title}`,
    rank: Number.isInteger(numericRank) && numericRank > 0 ? numericRank : index + 1,
    title: title.slice(0, 160),
    url,
    ...(typeof hotValue === 'string' || typeof hotValue === 'number' ? { hot: String(hotValue).slice(0, 32) } : {}),
  };
}

function parseGithubItem(value: unknown): GithubActivityItem | null {
  if (!isObject(value)) return null;
  const url = safeHttpUrl(value.url);
  const createdAt = safeDate(value.createdAt);
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  if (!url || !createdAt || !title) return null;
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `${createdAt}-${title}`,
    type: typeof value.type === 'string' && value.type ? value.type.slice(0, 48) : 'Activity',
    title: title.slice(0, 200),
    ...(typeof value.repository === 'string' && value.repository.trim()
      ? { repository: value.repository.trim().slice(0, 160) }
      : typeof value.repo === 'string' && value.repo.trim()
        ? { repository: value.repo.trim().slice(0, 160) }
        : {}),
    url,
    createdAt,
  };
}

export function parseHotFeedReport(value: unknown): HotFeedReport | null {
  if (!isObject(value) || value.version !== 1 || !isObject(value.social) || !isObject(value.github)) return null;
  const generatedAt = safeDate(value.generatedAt);
  const social = value.social;
  const github = value.github;
  const rawSource = social.source;
  const source = isObject(rawSource)
    ? { name: rawSource.name, url: rawSource.url }
    : { name: rawSource, url: social.sourceUrl };
  const sourceUrl = safeHttpUrl(source.url);
  const profileUrl = safeHttpUrl(github.profileUrl);
  const sourceName = typeof source.name === 'string' ? source.name.trim() : '';
  const username = typeof github.username === 'string' ? github.username.trim() : '';
  if (!generatedAt || !sourceUrl || !profileUrl || !sourceName || !username) return null;

  const socialItems = Array.isArray(social.items)
    ? social.items.map(parseSocialItem).filter((item): item is SocialHotItem => Boolean(item)).slice(0, 20)
    : [];
  const githubItems = Array.isArray(github.items)
    ? github.items.map(parseGithubItem).filter((item): item is GithubActivityItem => Boolean(item)).slice(0, 20)
    : [];

  return {
    version: 1,
    generatedAt,
    social: { source: { name: sourceName.slice(0, 48), url: sourceUrl }, items: socialItems },
    github: { username: username.slice(0, 64), profileUrl, items: githubItems },
  };
}

export async function loadHotFeedReport(url: string, options: HotFeedLoadOptions = {}): Promise<HotFeedReport> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(url, { cache: 'no-store', signal: options.signal });
  if (!response.ok) throw new Error(`热榜数据读取失败（HTTP ${response.status}）`);
  const report = parseHotFeedReport(await response.json());
  if (!report) throw new Error('热榜数据格式无效');
  return report;
}

export function loadCachedHotFeedReport(): HotFeedReport | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? parseHotFeedReport(JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function cacheHotFeedReport(report: HotFeedReport): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(report));
  } catch {
    // The live report still works when browser storage is unavailable or full.
  }
}
