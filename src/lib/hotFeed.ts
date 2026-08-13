export interface SocialHotItem {
  id: string;
  rank: number;
  title: string;
  url: string;
  hot?: string;
}

export interface GithubTrendingItem {
  id: string;
  rank: number;
  name: string;
  description?: string;
  language?: string;
  stars?: number;
  starsToday?: number;
  url: string;
}

export interface HotFeedReport {
  version: 2;
  generatedAt: string;
  social: {
    source: {
      name: string;
      url: string;
    };
    items: SocialHotItem[];
  };
  github: {
    source: {
      name: string;
      url: string;
    };
    items: GithubTrendingItem[];
  };
}

export interface HotFeedLoadOptions {
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}

const CACHE_KEY = 'nav_hot_feed_cache_v2';

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

function optionalCount(value: unknown): number | undefined {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : undefined;
}

function parseGithubItem(value: unknown, index: number): GithubTrendingItem | null {
  if (!isObject(value)) return null;
  const url = safeHttpUrl(value.url);
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const numericRank = typeof value.rank === 'number' ? value.rank : Number(value.rank);
  const stars = optionalCount(value.stars);
  const starsToday = optionalCount(value.starsToday);
  if (!url || !/^[^/\s]+\/[^/\s]+$/.test(name)) return null;
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `github-${name}`,
    rank: Number.isInteger(numericRank) && numericRank > 0 ? numericRank : index + 1,
    name: name.slice(0, 160),
    ...(typeof value.description === 'string' && value.description.trim() ? { description: value.description.trim().slice(0, 360) } : {}),
    ...(typeof value.language === 'string' && value.language.trim() ? { language: value.language.trim().slice(0, 48) } : {}),
    ...(stars !== undefined ? { stars } : {}),
    ...(starsToday !== undefined ? { starsToday } : {}),
    url,
  };
}

export function parseHotFeedReport(value: unknown): HotFeedReport | null {
  if (!isObject(value) || value.version !== 2 || !isObject(value.social) || !isObject(value.github)) return null;
  const generatedAt = safeDate(value.generatedAt);
  const social = value.social;
  const github = value.github;
  const socialSource = isObject(social.source) ? social.source : null;
  const githubSource = isObject(github.source) ? github.source : null;
  const socialSourceUrl = safeHttpUrl(socialSource?.url);
  const githubSourceUrl = safeHttpUrl(githubSource?.url);
  const socialSourceName = typeof socialSource?.name === 'string' ? socialSource.name.trim() : '';
  const githubSourceName = typeof githubSource?.name === 'string' ? githubSource.name.trim() : '';
  if (!generatedAt || !socialSourceUrl || !githubSourceUrl || !socialSourceName || !githubSourceName) return null;

  const socialItems = Array.isArray(social.items)
    ? social.items.map(parseSocialItem).filter((item): item is SocialHotItem => Boolean(item)).slice(0, 20)
    : [];
  const githubItems = Array.isArray(github.items)
    ? github.items.map(parseGithubItem).filter((item): item is GithubTrendingItem => Boolean(item)).slice(0, 20)
    : [];

  return {
    version: 2,
    generatedAt,
    social: { source: { name: socialSourceName.slice(0, 48), url: socialSourceUrl }, items: socialItems },
    github: { source: { name: githubSourceName.slice(0, 48), url: githubSourceUrl }, items: githubItems },
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
