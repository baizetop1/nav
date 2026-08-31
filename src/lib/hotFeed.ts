export type IntelligenceCategory = 'cn' | 'ai' | 'security' | 'dev';

export type IntelligenceFilter = 'all' | IntelligenceCategory;

export interface IntelligenceItem {
  id: string;
  title: string;
  url: string;
  category: IntelligenceCategory;
  source: string;
  publishedAt?: string;
  summary?: string;
  badge?: string;
  signal?: string;
}

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

interface FeedSource {
  name: string;
  url: string;
}

export interface HotFeedReport {
  /** v2 reports are normalized in memory while retaining their original version. */
  version: 2 | 3;
  generatedAt: string;
  intelligence: {
    updatedAt: string;
    items: IntelligenceItem[];
  };
  github: {
    updatedAt: string;
    source: FeedSource;
    items: GithubTrendingItem[];
  };
  /** Present only when a legacy v2 report was parsed. */
  social?: {
    updatedAt: string;
    source: FeedSource;
    items: SocialHotItem[];
  };
}

export interface HotFeedLoadOptions {
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}

const CACHE_KEY = 'nav_hot_feed_cache_v3';
const LEGACY_CACHE_KEY = 'nav_hot_feed_cache_v2';
const MIXED_CATEGORY_ORDER: readonly IntelligenceCategory[] = ['cn', 'security', 'ai', 'dev'];

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

function safeText(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function safeSignal(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value).trim().slice(0, 96);
}

function parseSourceName(value: unknown): string {
  if (typeof value === 'string') return value.trim().slice(0, 64);
  if (!isObject(value)) return '';
  return safeText(value.name ?? value.label, 64);
}

function parseCategory(value: unknown): IntelligenceCategory | null {
  if (typeof value !== 'string') return null;
  switch (value.trim().toLowerCase()) {
    case 'cn':
    case 'china':
    case 'domestic':
    case '国内':
    case '中国':
      return 'cn';
    case 'ai':
    case 'artificial-intelligence':
    case '人工智能':
      return 'ai';
    case 'security':
    case 'cybersecurity':
    case '安全':
      return 'security';
    case 'dev':
    case 'development':
    case 'developer':
    case 'programming':
    case '开发':
      return 'dev';
    default:
      return null;
  }
}

function parseIntelligenceItem(value: unknown, index: number): IntelligenceItem | null {
  if (!isObject(value)) return null;
  const title = safeText(value.title, 160);
  const url = safeHttpUrl(value.url);
  const category = parseCategory(value.category);
  const source = parseSourceName(value.source);
  if (!title || !url || !category || !source) return null;

  const publishedAt = safeDate(value.publishedAt);
  const summary = safeText(value.summary, 360);
  const badge = safeText(value.badge, 48);
  const signal = safeSignal(value.signal);
  return {
    id: safeText(value.id, 160) || `intelligence-${category}-${index + 1}-${title}`,
    title,
    url,
    category,
    source,
    ...(publishedAt ? { publishedAt } : {}),
    ...(summary ? { summary } : {}),
    ...(badge ? { badge } : {}),
    ...(signal ? { signal } : {}),
  };
}

function parseSocialItem(value: unknown, index: number): SocialHotItem | null {
  if (!isObject(value)) return null;
  const url = safeHttpUrl(value.url);
  const title = safeText(value.title, 160);
  if (!url || !title) return null;
  const numericRank = typeof value.rank === 'number' ? value.rank : Number(value.rank);
  const hotValue = value.hot ?? value.heat;
  return {
    id: safeText(value.id, 160) || `${index + 1}-${title}`,
    rank: Number.isInteger(numericRank) && numericRank > 0 ? numericRank : index + 1,
    title,
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
  const name = safeText(value.name, 160);
  const numericRank = typeof value.rank === 'number' ? value.rank : Number(value.rank);
  const stars = optionalCount(value.stars);
  const starsToday = optionalCount(value.starsToday);
  if (!url || !/^[^/\s]+\/[^/\s]+$/.test(name)) return null;
  return {
    id: safeText(value.id, 160) || `github-${name}`,
    rank: Number.isInteger(numericRank) && numericRank > 0 ? numericRank : index + 1,
    name,
    ...(safeText(value.description, 360) ? { description: safeText(value.description, 360) } : {}),
    ...(safeText(value.language, 48) ? { language: safeText(value.language, 48) } : {}),
    ...(stars !== undefined ? { stars } : {}),
    ...(starsToday !== undefined ? { starsToday } : {}),
    url,
  };
}

function parseSource(value: unknown): FeedSource | null {
  if (!isObject(value)) return null;
  const name = safeText(value.name, 48);
  const url = safeHttpUrl(value.url);
  return name && url ? { name, url } : null;
}

function parseGithubFeed(value: unknown, fallbackUpdatedAt: string): HotFeedReport['github'] | null {
  if (!isObject(value)) return null;
  const source = parseSource(value.source);
  if (!source) return null;
  const updatedAt = safeDate(value.updatedAt) ?? fallbackUpdatedAt;
  const items = Array.isArray(value.items)
    ? value.items.map(parseGithubItem).filter((item): item is GithubTrendingItem => Boolean(item)).slice(0, 20)
    : [];
  return { updatedAt, source, items };
}

function parseV3Report(value: Record<string, unknown>, generatedAt: string): HotFeedReport | null {
  if (!isObject(value.intelligence)) return null;
  const github = parseGithubFeed(value.github, generatedAt);
  if (!github) return null;
  const updatedAt = safeDate(value.intelligence.updatedAt) ?? generatedAt;
  const items = Array.isArray(value.intelligence.items)
    ? value.intelligence.items.map(parseIntelligenceItem).filter((item): item is IntelligenceItem => Boolean(item)).slice(0, 60)
    : [];
  return { version: 3, generatedAt, intelligence: { updatedAt, items }, github };
}

function parseV2Report(value: Record<string, unknown>, generatedAt: string): HotFeedReport | null {
  if (!isObject(value.social)) return null;
  const socialSource = parseSource(value.social.source);
  const github = parseGithubFeed(value.github, generatedAt);
  if (!socialSource || !github) return null;
  const socialUpdatedAt = safeDate(value.social.updatedAt) ?? generatedAt;
  const socialItems = Array.isArray(value.social.items)
    ? value.social.items.map(parseSocialItem).filter((item): item is SocialHotItem => Boolean(item)).slice(0, 20)
    : [];
  return {
    version: 2,
    generatedAt,
    // Legacy social trends remain available only for schema migration. They
    // are intentionally not relabelled as development intelligence.
    intelligence: { updatedAt: socialUpdatedAt, items: [] },
    github,
    social: { updatedAt: socialUpdatedAt, source: socialSource, items: socialItems },
  };
}

export function parseHotFeedReport(value: unknown): HotFeedReport | null {
  if (!isObject(value)) return null;
  const generatedAt = safeDate(value.generatedAt);
  if (!generatedAt) return null;
  if (value.version === 3) return parseV3Report(value, generatedAt);
  if (value.version === 2) return parseV2Report(value, generatedAt);
  return null;
}

/**
 * Returns a stable category view. The combined view takes one item at a time
 * from domestic, security, AI, and development so one busy source cannot dominate it.
 */
export function selectIntelligenceItems(
  items: readonly IntelligenceItem[],
  filter: IntelligenceFilter,
): IntelligenceItem[] {
  if (filter !== 'all') return items.filter(item => item.category === filter);

  const buckets = new Map<IntelligenceCategory, IntelligenceItem[]>(
    MIXED_CATEGORY_ORDER.map(category => [category, items.filter(item => item.category === category)]),
  );
  const cursors = new Map<IntelligenceCategory, number>(MIXED_CATEGORY_ORDER.map(category => [category, 0]));
  const mixed: IntelligenceItem[] = [];
  while (mixed.length < items.length) {
    let added = false;
    for (const category of MIXED_CATEGORY_ORDER) {
      const bucket = buckets.get(category) ?? [];
      const cursor = cursors.get(category) ?? 0;
      const item = bucket[cursor];
      if (!item) continue;
      mixed.push(item);
      cursors.set(category, cursor + 1);
      added = true;
    }
    if (!added) break;
  }
  return mixed;
}

export async function loadHotFeedReport(url: string, options: HotFeedLoadOptions = {}): Promise<HotFeedReport> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(url, { cache: 'no-store', signal: options.signal });
  if (!response.ok) throw new Error(`情报数据读取失败（HTTP ${response.status}）`);
  const report = parseHotFeedReport(await response.json());
  if (!report) throw new Error('情报数据格式无效');
  return report;
}

export function loadCachedHotFeedReport(): HotFeedReport | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    for (const key of [CACHE_KEY, LEGACY_CACHE_KEY]) {
      const raw = localStorage.getItem(key);
      const report = raw ? parseHotFeedReport(JSON.parse(raw) as unknown) : null;
      if (report) return report;
    }
    return null;
  } catch {
    return null;
  }
}

export function cacheHotFeedReport(report: HotFeedReport): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(CACHE_KEY, JSON.stringify(report));
  } catch {
    // The live report still works when browser storage is unavailable or full.
  }
}
