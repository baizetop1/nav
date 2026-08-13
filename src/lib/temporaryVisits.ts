import { localDateKey } from './activityStats.ts';

export const TEMPORARY_VISITS_KEY = 'nav_temporary_url_visits_v1';
export const TEMPORARY_VISITS_VERSION = 1 as const;
export const TEMPORARY_VISITS_RETENTION_DAYS = 30;
export const TEMPORARY_VISITS_MAX_ENTRIES = 100;

export interface TemporaryVisitDay {
  count: number;
  lastVisitedAt: number;
}

export interface TemporaryVisitRecord {
  url: string;
  days: Record<string, TemporaryVisitDay>;
}

export interface TemporaryVisitsStore {
  version: typeof TEMPORARY_VISITS_VERSION;
  records: TemporaryVisitRecord[];
}

export interface TemporaryVisitSummary {
  key: string;
  url: string;
  hostname: string;
  count: number;
  lastVisitedAt: number;
}

type StorageLike = Pick<Storage, 'getItem'>;

function emptyStore(): TemporaryVisitsStore {
  return { version: TEMPORARY_VISITS_VERSION, records: [] };
}

function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

function minimumDateKey(now: Date): string {
  const threshold = new Date(now);
  threshold.setHours(0, 0, 0, 0);
  threshold.setDate(threshold.getDate() - (TEMPORARY_VISITS_RETENTION_DAYS - 1));
  return localDateKey(threshold);
}

function looksLikeBareHost(value: string): boolean {
  const head = value.split(/[/?#]/, 1)[0];
  const hostname = head.replace(/:\d+$/, '');
  return hostname === 'localhost'
    || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)
    || /^(?:[a-z0-9-]+\.)+[a-z]{2,63}$/i.test(hostname);
}

/** Accepts http(s) URLs and convenient bare domains such as example.com. */
export function normalizeTemporaryUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : looksLikeBareHost(trimmed) ? `https://${trimmed}` : '';
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    url.hostname = url.hostname.toLocaleLowerCase();
    if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = '';
    return url.toString();
  } catch {
    return null;
  }
}

/** Key used to match the same page despite fragments and a trailing slash. */
export function temporaryUrlKey(value: string): string | null {
  const normalized = normalizeTemporaryUrl(value);
  if (!normalized) return null;
  const url = new URL(normalized);
  url.hash = '';
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

function parseDay(value: unknown): TemporaryVisitDay | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const day = value as Partial<TemporaryVisitDay>;
  if (!Number.isSafeInteger(day.count) || Number(day.count) <= 0) return null;
  if (typeof day.lastVisitedAt !== 'number' || !Number.isFinite(day.lastVisitedAt) || day.lastVisitedAt <= 0) return null;
  return { count: Number(day.count), lastVisitedAt: day.lastVisitedAt };
}

function parseRecord(value: unknown): TemporaryVisitRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as { url?: unknown; days?: unknown };
  if (typeof record.url !== 'string' || !record.days || typeof record.days !== 'object' || Array.isArray(record.days)) return null;
  const url = normalizeTemporaryUrl(record.url);
  if (!url) return null;
  const days: Record<string, TemporaryVisitDay> = {};
  for (const [date, rawDay] of Object.entries(record.days)) {
    const day = parseDay(rawDay);
    if (isDateKey(date) && day) days[date] = day;
  }
  return { url, days };
}

export function pruneTemporaryVisits(
  store: TemporaryVisitsStore,
  now = new Date(),
  excludedUrls: readonly string[] = [],
): TemporaryVisitsStore {
  const minimumKey = minimumDateKey(now);
  const excludedKeys = new Set(excludedUrls.map(temporaryUrlKey).filter((key): key is string => Boolean(key)));
  const merged = new Map<string, TemporaryVisitRecord>();

  for (const record of store.records) {
    const key = temporaryUrlKey(record.url);
    if (!key || excludedKeys.has(key)) continue;
    const days = Object.fromEntries(Object.entries(record.days).filter(([date, day]) => isDateKey(date) && date >= minimumKey && Boolean(parseDay(day))));
    if (!Object.keys(days).length) continue;
    const previous = merged.get(key);
    if (!previous) {
      merged.set(key, { url: record.url, days });
      continue;
    }
    const combined = { ...previous.days };
    for (const [date, day] of Object.entries(days)) {
      const old = combined[date];
      combined[date] = old
        ? { count: old.count + day.count, lastVisitedAt: Math.max(old.lastVisitedAt, day.lastVisitedAt) }
        : day;
    }
    const latestPrevious = Math.max(...Object.values(previous.days).map(day => day.lastVisitedAt));
    const latestCurrent = Math.max(...Object.values(days).map(day => day.lastVisitedAt));
    merged.set(key, { url: latestCurrent >= latestPrevious ? record.url : previous.url, days: combined });
  }

  const records = [...merged.values()]
    .sort((a, b) => Math.max(...Object.values(b.days).map(day => day.lastVisitedAt)) - Math.max(...Object.values(a.days).map(day => day.lastVisitedAt)))
    .slice(0, TEMPORARY_VISITS_MAX_ENTRIES);
  return { version: TEMPORARY_VISITS_VERSION, records };
}

export function parseTemporaryVisits(value: unknown, now = new Date()): TemporaryVisitsStore {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyStore();
  const raw = value as { version?: unknown; records?: unknown };
  if (raw.version !== TEMPORARY_VISITS_VERSION || !Array.isArray(raw.records)) return emptyStore();
  const records = raw.records.map(parseRecord).filter((record): record is TemporaryVisitRecord => Boolean(record));
  return pruneTemporaryVisits({ version: TEMPORARY_VISITS_VERSION, records }, now);
}

export function loadTemporaryVisits(storage?: StorageLike, now = new Date()): TemporaryVisitsStore {
  const source = storage || localStorage;
  try {
    const saved = source.getItem(TEMPORARY_VISITS_KEY);
    return saved ? parseTemporaryVisits(JSON.parse(saved) as unknown, now) : emptyStore();
  } catch {
    return emptyStore();
  }
}

export function recordTemporaryVisit(store: TemporaryVisitsStore, value: string, now = new Date()): TemporaryVisitsStore {
  const url = normalizeTemporaryUrl(value);
  const key = url ? temporaryUrlKey(url) : null;
  if (!url || !key) return pruneTemporaryVisits(store, now);
  const date = localDateKey(now);
  const records = [...store.records];
  const index = records.findIndex(record => temporaryUrlKey(record.url) === key);
  const record = index >= 0 ? records[index] : { url, days: {} };
  const previous = record.days[date];
  const updated: TemporaryVisitRecord = {
    url,
    days: {
      ...record.days,
      [date]: { count: (previous?.count || 0) + 1, lastVisitedAt: now.getTime() },
    },
  };
  if (index >= 0) records[index] = updated;
  else records.push(updated);
  return pruneTemporaryVisits({ version: TEMPORARY_VISITS_VERSION, records }, now);
}

export function removeTemporaryVisit(store: TemporaryVisitsStore, key: string, now = new Date()): TemporaryVisitsStore {
  return pruneTemporaryVisits({
    version: TEMPORARY_VISITS_VERSION,
    records: store.records.filter(record => temporaryUrlKey(record.url) !== key),
  }, now);
}

export function getTemporaryVisitSummaries(
  store: TemporaryVisitsStore,
  excludedUrls: readonly string[] = [],
  now = new Date(),
): TemporaryVisitSummary[] {
  return pruneTemporaryVisits(store, now, excludedUrls).records.map(record => {
    const days = Object.values(record.days);
    const url = new URL(record.url);
    return {
      key: temporaryUrlKey(record.url) || record.url,
      url: record.url,
      hostname: url.hostname.replace(/^www\./, ''),
      count: days.reduce((total, day) => total + day.count, 0),
      lastVisitedAt: Math.max(...days.map(day => day.lastVisitedAt)),
    };
  });
}
