import type { Site } from '../types/navigation';

export const CLICK_STATS_KEY = 'nav_click_stats_v2';
export const LEGACY_CLICK_STATS_KEY = 'nav_daily_click_stats';
export const CLICK_STATS_VERSION = 2 as const;
export const CLICK_STATS_RETENTION_DAYS = 90;

export interface SiteClickStat {
  count: number;
  lastClicked: number;
}

export interface DailyClickStats {
  clicks: Record<string, SiteClickStat>;
}

export interface ClickStatsStore {
  version: typeof CLICK_STATS_VERSION;
  days: Record<string, DailyClickStats>;
}

type StorageLike = Pick<Storage, 'getItem'>;

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

function sanitizeClicks(value: unknown): Record<string, SiteClickStat> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, SiteClickStat> = {};
  for (const [siteId, raw] of Object.entries(value)) {
    if (!siteId || !raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const entry = raw as Partial<SiteClickStat>;
    if (!Number.isSafeInteger(entry.count) || Number(entry.count) <= 0 || typeof entry.lastClicked !== 'number' || !Number.isFinite(entry.lastClicked)) continue;
    result[siteId] = { count: Number(entry.count), lastClicked: entry.lastClicked };
  }
  return result;
}

export function pruneClickStats(store: ClickStatsStore, now = new Date()): ClickStatsStore {
  const threshold = new Date(now);
  threshold.setHours(0, 0, 0, 0);
  threshold.setDate(threshold.getDate() - (CLICK_STATS_RETENTION_DAYS - 1));
  const minimumKey = localDateKey(threshold);
  return {
    version: CLICK_STATS_VERSION,
    days: Object.fromEntries(Object.entries(store.days).filter(([date]) => isDateKey(date) && date >= minimumKey)),
  };
}

export function parseClickStats(value: unknown, now = new Date()): ClickStatsStore {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { version: CLICK_STATS_VERSION, days: {} };
  const raw = value as { version?: unknown; days?: unknown };
  if (raw.version !== CLICK_STATS_VERSION || !raw.days || typeof raw.days !== 'object' || Array.isArray(raw.days)) {
    return { version: CLICK_STATS_VERSION, days: {} };
  }
  const days: Record<string, DailyClickStats> = {};
  for (const [date, day] of Object.entries(raw.days)) {
    if (!isDateKey(date) || !day || typeof day !== 'object' || Array.isArray(day)) continue;
    days[date] = { clicks: sanitizeClicks((day as { clicks?: unknown }).clicks) };
  }
  return pruneClickStats({ version: CLICK_STATS_VERSION, days }, now);
}

export function loadClickStats(storage?: StorageLike, now = new Date()): ClickStatsStore {
  const source = storage || localStorage;
  try {
    const saved = source.getItem(CLICK_STATS_KEY);
    if (saved) return parseClickStats(JSON.parse(saved) as unknown, now);
  } catch {
    // Fall through to the legacy daily record.
  }

  try {
    const legacy = source.getItem(LEGACY_CLICK_STATS_KEY);
    if (!legacy) return { version: CLICK_STATS_VERSION, days: {} };
    const parsed = JSON.parse(legacy) as { date?: unknown; clicks?: unknown };
    if (typeof parsed.date !== 'string' || !isDateKey(parsed.date)) return { version: CLICK_STATS_VERSION, days: {} };
    return pruneClickStats({ version: CLICK_STATS_VERSION, days: { [parsed.date]: { clicks: sanitizeClicks(parsed.clicks) } } }, now);
  } catch {
    return { version: CLICK_STATS_VERSION, days: {} };
  }
}

export function recordSiteVisit(store: ClickStatsStore, siteId: string, now = new Date()): ClickStatsStore {
  const date = localDateKey(now);
  const day = store.days[date] || { clicks: {} };
  const previous = day.clicks[siteId];
  return pruneClickStats({
    version: CLICK_STATS_VERSION,
    days: {
      ...store.days,
      [date]: {
        clicks: {
          ...day.clicks,
          [siteId]: { count: (previous?.count || 0) + 1, lastClicked: now.getTime() },
        },
      },
    },
  }, now);
}

export function getTodayClicks(store: ClickStatsStore, now = new Date()): Record<string, SiteClickStat> {
  return store.days[localDateKey(now)]?.clicks || {};
}

export function recentDateKeys(days: number, now = new Date()): string[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - index - 1));
    return localDateKey(date);
  });
}

export type VisitRankingPeriod = 'day' | 'month';

export interface VisitRankingRow {
  site: Site;
  count: number;
  todayCount: number;
  monthCount: number;
  lastClicked: number;
}

/** A read-only view over this device's retained clicks, never a replacement for navigation. */
export function getVisitRanking(store: ClickStatsStore, sites: readonly Site[], period: VisitRankingPeriod, now = new Date()): VisitRankingRow[] {
  if (!Number.isFinite(now.getTime()) || (period !== 'day' && period !== 'month')) return [];
  const today = localDateKey(now), month = today.slice(0, 7);
  const totals = new Map<string, { todayCount: number; monthCount: number; todayLast: number; monthLast: number }>();
  const sum = (left: number, right: number) => Math.min(Number.MAX_SAFE_INTEGER, left + right);
  for (const [date, day] of Object.entries(pruneClickStats(store, now).days)) {
    // Monthly means the current local calendar month through today, not rolling 30 days.
    // Imported future days must not leak into today's/month's leaderboard.
    if (date > today || date.slice(0, 7) !== month) continue;
    for (const [siteId, stat] of Object.entries(sanitizeClicks(day.clicks))) {
      const previous = totals.get(siteId) ?? { todayCount: 0, monthCount: 0, todayLast: 0, monthLast: 0 };
      previous.monthCount = sum(previous.monthCount, stat.count);
      previous.monthLast = Math.max(previous.monthLast, stat.lastClicked);
      if (date === today) {
        previous.todayCount = sum(previous.todayCount, stat.count);
        previous.todayLast = Math.max(previous.todayLast, stat.lastClicked);
      }
      totals.set(siteId, previous);
    }
  }
  return sites.flatMap(site => {
    const total = totals.get(site.id);
    if (!total) return [];
    const count = period === 'day' ? total.todayCount : total.monthCount;
    if (count <= 0) return [];
    return [{ site, count, todayCount: total.todayCount, monthCount: total.monthCount, lastClicked: period === 'day' ? total.todayLast : total.monthLast }];
  }).sort((left, right) => right.count - left.count || right.lastClicked - left.lastClicked || (left.site.id < right.site.id ? -1 : left.site.id > right.site.id ? 1 : 0));
}
