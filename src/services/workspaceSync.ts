import { BACKUP_STORAGE_KEYS, parseBackup } from '../lib/backup.ts';
import { CLICK_STATS_VERSION, parseClickStats, type ClickStatsStore, type SiteClickStat } from '../lib/activityStats.ts';
import { mergeNavigationData } from '../lib/navigationMerge.ts';
import {
  TEMPORARY_VISITS_VERSION,
  parseTemporaryVisits,
  pruneTemporaryVisits,
  temporaryUrlKey,
  type TemporaryVisitDay,
  type TemporaryVisitRecord,
  type TemporaryVisitsStore,
} from '../lib/temporaryVisits.ts';
import { TRANSLATION_HISTORY_LIMIT, type TranslationHistoryItem } from '../lib/translationHistory.ts';
import type { NavigationData } from '../types/navigation.ts';
import { SHARED_SYNC_ENTRY_MAX_BYTES, utf8ByteLength } from '../lib/safeStorage.ts';
import { loadReading, READING_EVENT, READING_KEY, validReadingItem, type ReadingItem } from './readingHistory.ts';
import { mergeStudyFeedback, parseStudyFeedback, STUDY_FEEDBACK_KEY } from './studyFeedback.ts';
import { HOME_TOOLS_KEY, parseHomeTools } from '../lib/homeTools.ts';

export const WORKSPACE_KEY = 'baize_shared_workspace_v1';
export const WORKSPACE_EVENT = 'baize-shared-workspace-updated';
export interface SharedValue { value: string | null; updatedAt: string; baseline?: boolean }
export interface SharedWorkspace { version: 1; entries: Record<string, SharedValue>; history: Record<string, SharedValue[]> }
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
// Running timers belong to the current device; explicit backup restores may carry them.
const SETTING_KEYS = new Set<string>(BACKUP_STORAGE_KEYS.filter(key => key !== 'baize_work_session_v1' && key !== 'baize_tech_os_study_progress_v1'));
const STRUCTURED_MERGE_KEYS = new Set(['nav_cms_draft', 'nav_click_stats_v2', 'nav_translation_history', 'nav_temporary_url_visits_v1', 'baize_rss_reader_v1', STUDY_FEEDBACK_KEY]);
let defaultValues: Record<string, string | null> = {};
export function configureSharedDefaults(values: Record<string, string | null>) { defaultValues = values; }
const empty = (): SharedWorkspace => ({ version: 1, entries: {}, history: {} });
const validKey = (key: string) => SETTING_KEYS.has(key) || key.startsWith('reading:http://') || key.startsWith('reading:https://');
const signature = (entry: SharedValue) => `${entry.baseline ? '0' : '1'}|${entry.updatedAt}|${JSON.stringify(entry.value)}`;
const deletedReading = (key: string, entry: SharedValue) => key.startsWith('reading:') && Boolean(JSON.parse(entry.value || '{}').deletedAt);
function compareValues(key: string, left: SharedValue, right: SharedValue): number {
  return Number(Boolean(left.baseline)) - Number(Boolean(right.baseline))
    || Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
    || Number(deletedReading(key, right)) - Number(deletedReading(key, left))
    || signature(right).localeCompare(signature(left));
}

function uniqueVersions(key: string, ...groups: Array<SharedValue[] | undefined>): SharedValue[] {
  return [...new Map(groups.flatMap(group => group || []).map(item => [signature(item), item])).values()]
    .sort((left, right) => compareValues(key, left, right));
}

function commonAncestorValue(key: string, a: SharedWorkspace, b: SharedWorkspace): string | null | undefined {
  const left = [a.entries[key], ...(a.history[key] || [])].filter((item): item is SharedValue => Boolean(item));
  const right = [b.entries[key], ...(b.history[key] || [])].filter((item): item is SharedValue => Boolean(item));
  const rightIndexes = new Map<string | null, number>();
  right.forEach((entry, index) => { if (!rightIndexes.has(entry.value)) rightIndexes.set(entry.value, index); });
  const matches = left.flatMap((entry, leftIndex) => {
    const rightIndex = rightIndexes.get(entry.value);
    if (rightIndex === undefined) return [];
    const matchingRight = right[rightIndex];
    return [{ value: entry.value, distance: leftIndex + rightIndex, timestamp: Math.max(Date.parse(entry.updatedAt), Date.parse(matchingRight.updatedAt)) }];
  });
  matches.sort((first, second) => first.distance - second.distance || second.timestamp - first.timestamp || JSON.stringify(second.value).localeCompare(JSON.stringify(first.value)));
  return matches[0]?.value;
}

function parseJson(value: string): unknown | undefined {
  try { return JSON.parse(value) as unknown; } catch { return undefined; }
}

function parseNavigationValue(value: string): NavigationData | null {
  const navigation = parseJson(value);
  if (navigation === undefined) return null;
  try {
    return parseBackup({ version: 1, exportedAt: '2000-01-01T00:00:00.000Z', navigation, storage: {} }).navigation;
  } catch {
    return null;
  }
}

function parseClickValue(value: string): ClickStatsStore | null {
  const raw = parseJson(value);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const input = raw as { version?: unknown; days?: unknown };
  if (input.version !== CLICK_STATS_VERSION || !input.days || typeof input.days !== 'object' || Array.isArray(input.days)) return null;
  return parseClickStats(raw);
}

function validTranslationItem(value: unknown): value is TranslationHistoryItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Partial<TranslationHistoryItem>;
  return typeof item.id === 'string' && Boolean(item.id)
    && typeof item.sourceText === 'string'
    && typeof item.translatedText === 'string'
    && typeof item.sourceLanguage === 'string'
    && typeof item.targetLanguage === 'string'
    && typeof item.createdAt === 'string'
    && Number.isFinite(Date.parse(item.createdAt));
}

function parseTranslationValue(value: string): TranslationHistoryItem[] | null {
  const raw = parseJson(value);
  return Array.isArray(raw) && raw.every(validTranslationItem) ? raw.slice(0, TRANSLATION_HISTORY_LIMIT) : null;
}

function parseTemporaryValue(value: string): TemporaryVisitsStore | null {
  const raw = parseJson(value);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const input = raw as { version?: unknown; records?: unknown };
  if (input.version !== TEMPORARY_VISITS_VERSION || !Array.isArray(input.records)) return null;
  return parseTemporaryVisits(raw);
}

interface CounterSample { count: number; last: number }

function sameCounter(left: CounterSample | undefined, right: CounterSample | undefined): boolean {
  return left?.count === right?.count && left?.last === right?.last;
}

/**
 * Counters use three-way delta addition when a shared snapshot exists. Without a
 * snapshot, max(count) is deliberately conservative: it cannot double-count an
 * already shared total, while independent keys are still retained.
 */
function mergeCounter(
  baseline: CounterSample | undefined,
  left: CounterSample | undefined,
  right: CounterSample | undefined,
  hasBaseline: boolean,
  preferLeft: boolean,
): CounterSample | undefined {
  if (sameCounter(left, right)) return left;
  if (!hasBaseline) {
    if (!left || !right) return left || right;
    return { count: Math.max(left.count, right.count), last: Math.max(left.last, right.last) };
  }
  if (sameCounter(left, baseline)) return right;
  if (sameCounter(right, baseline)) return left;
  if (!baseline && left && right) return { count: left.count + right.count, last: Math.max(left.last, right.last) };
  if (baseline && left && right && left.count >= baseline.count && right.count >= baseline.count) {
    return {
      count: baseline.count + (left.count - baseline.count) + (right.count - baseline.count),
      last: Math.max(left.last, right.last),
    };
  }
  return preferLeft ? left : right;
}

function clickMap(store: ClickStatsStore): Map<string, SiteClickStat> {
  return new Map(Object.entries(store.days).flatMap(([date, day]) => Object.entries(day.clicks).map(([siteId, stat]) => [`${date}\u0000${siteId}`, stat])));
}

function mergeClickStats(baseline: ClickStatsStore | null, left: ClickStatsStore, right: ClickStatsStore, preferLeft: boolean): ClickStatsStore {
  const baseMap = baseline ? clickMap(baseline) : new Map<string, SiteClickStat>();
  const leftMap = clickMap(left), rightMap = clickMap(right);
  const days: ClickStatsStore['days'] = {};
  for (const key of [...new Set([...baseMap.keys(), ...leftMap.keys(), ...rightMap.keys()])].sort()) {
    const base = baseMap.get(key), leftStat = leftMap.get(key), rightStat = rightMap.get(key);
    const merged = mergeCounter(
      base && { count: base.count, last: base.lastClicked },
      leftStat && { count: leftStat.count, last: leftStat.lastClicked },
      rightStat && { count: rightStat.count, last: rightStat.lastClicked },
      Boolean(baseline),
      preferLeft,
    );
    if (!merged) continue;
    const [date, siteId] = key.split('\u0000');
    const day = days[date] || { clicks: {} };
    day.clicks[siteId] = { count: merged.count, lastClicked: merged.last };
    days[date] = day;
  }
  return parseClickStats({ version: CLICK_STATS_VERSION, days });
}

function sameItem(left: TranslationHistoryItem | undefined, right: TranslationHistoryItem | undefined): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function mergeTranslationHistory(
  baseline: TranslationHistoryItem[] | null,
  left: TranslationHistoryItem[],
  right: TranslationHistoryItem[],
  preferLeft: boolean,
): TranslationHistoryItem[] {
  const baseMap = new Map((baseline || []).map(item => [item.id, item]));
  const leftMap = new Map(left.map(item => [item.id, item]));
  const rightMap = new Map(right.map(item => [item.id, item]));
  const merged: TranslationHistoryItem[] = [];
  for (const id of [...new Set([...baseMap.keys(), ...leftMap.keys(), ...rightMap.keys()])].sort()) {
    const baseItem = baseMap.get(id), leftItem = leftMap.get(id), rightItem = rightMap.get(id);
    let selected: TranslationHistoryItem | undefined;
    if (!baseline) selected = !leftItem ? rightItem : !rightItem || sameItem(leftItem, rightItem) || preferLeft ? leftItem : rightItem;
    else if (sameItem(leftItem, baseItem)) selected = rightItem;
    else if (sameItem(rightItem, baseItem) || sameItem(leftItem, rightItem)) selected = leftItem;
    else selected = preferLeft ? leftItem : rightItem;
    if (selected) merged.push(selected);
  }
  return merged
    .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt) || first.id.localeCompare(second.id))
    .slice(0, TRANSLATION_HISTORY_LIMIT);
}

function temporaryMap(store: TemporaryVisitsStore): Map<string, TemporaryVisitRecord> {
  return new Map(store.records.flatMap(record => {
    const key = temporaryUrlKey(record.url);
    return key ? [[key, record] as const] : [];
  }));
}

function latestTemporaryVisit(record: TemporaryVisitRecord | undefined): number {
  return record ? Math.max(0, ...Object.values(record.days).map(day => day.lastVisitedAt)) : 0;
}

function mergeTemporaryVisits(
  baseline: TemporaryVisitsStore | null,
  left: TemporaryVisitsStore,
  right: TemporaryVisitsStore,
  preferLeft: boolean,
): TemporaryVisitsStore {
  const baseMap = temporaryMap(baseline || { version: TEMPORARY_VISITS_VERSION, records: [] });
  const leftMap = temporaryMap(left), rightMap = temporaryMap(right);
  const records: TemporaryVisitRecord[] = [];
  for (const key of [...new Set([...baseMap.keys(), ...leftMap.keys(), ...rightMap.keys()])].sort()) {
    const baseRecord = baseMap.get(key), leftRecord = leftMap.get(key), rightRecord = rightMap.get(key);
    const days: Record<string, TemporaryVisitDay> = {};
    for (const date of [...new Set([
      ...Object.keys(baseRecord?.days || {}),
      ...Object.keys(leftRecord?.days || {}),
      ...Object.keys(rightRecord?.days || {}),
    ])].sort()) {
      const baseDay = baseRecord?.days[date], leftDay = leftRecord?.days[date], rightDay = rightRecord?.days[date];
      const merged = mergeCounter(
        baseDay && { count: baseDay.count, last: baseDay.lastVisitedAt },
        leftDay && { count: leftDay.count, last: leftDay.lastVisitedAt },
        rightDay && { count: rightDay.count, last: rightDay.lastVisitedAt },
        Boolean(baseline),
        preferLeft,
      );
      if (merged) days[date] = { count: merged.count, lastVisitedAt: merged.last };
    }
    if (!Object.keys(days).length) continue;
    const preferredRecord = preferLeft ? leftRecord || rightRecord : rightRecord || leftRecord;
    const leftLatest = latestTemporaryVisit(leftRecord), rightLatest = latestTemporaryVisit(rightRecord);
    const latestRecord = leftLatest === rightLatest ? preferredRecord : leftLatest > rightLatest ? leftRecord : rightRecord;
    records.push({ url: latestRecord?.url || preferredRecord?.url || baseRecord!.url, days });
  }
  return pruneTemporaryVisits({ version: TEMPORARY_VISITS_VERSION, records });
}

function mergeStructuredValue(
  key: string,
  leftValue: string,
  rightValue: string,
  baselineValue: string | null | undefined,
  preferLeft: boolean,
): string | null {
  if (key === STUDY_FEEDBACK_KEY) {
    const left = parseStudyFeedback(JSON.parse(leftValue)), right = parseStudyFeedback(JSON.parse(rightValue));
    const base = typeof baselineValue === 'string' ? parseStudyFeedback(JSON.parse(baselineValue)) : null;
    return JSON.stringify(mergeStudyFeedback(left, right, base));
  }
  if (key === 'baize_rss_reader_v1') {
    type ReaderEntry = { read: boolean; favorite: boolean; updatedAt: string };
    const parse = (value: string): Record<string, ReaderEntry> | null => {
      const raw = parseJson(value) as { version?: unknown; items?: Record<string, ReaderEntry> } | undefined;
      if (!raw || raw.version !== 1 || !raw.items || typeof raw.items !== 'object' || Array.isArray(raw.items)) return null;
      if (Object.entries(raw.items).some(([id, item]) => id.length > 160 || !item || typeof item.read !== 'boolean' || typeof item.favorite !== 'boolean' || typeof item.updatedAt !== 'string' || !Number.isFinite(Date.parse(item.updatedAt)))) return null;
      return raw.items;
    };
    const left = parse(leftValue), right = parse(rightValue);
    if (!left && !right) return null;
    const entries = new Map<string, ReaderEntry>();
    for (const [id, value] of [...Object.entries(left || {}), ...Object.entries(right || {})]) {
      const previous = entries.get(id);
      if (!previous || value.updatedAt > previous.updatedAt || (value.updatedAt === previous.updatedAt && JSON.stringify(value) > JSON.stringify(previous))) entries.set(id, value);
    }
    return JSON.stringify({ version: 1, items: Object.fromEntries([...entries].sort(([a, x], [b, y]) => y.updatedAt.localeCompare(x.updatedAt) || a.localeCompare(b)).slice(0, 2000)) });
  }
  if (key === 'nav_cms_draft') {
    const left = parseNavigationValue(leftValue), right = parseNavigationValue(rightValue);
    if (!left && !right) return null;
    if (!left || !right) return JSON.stringify(left || right);
    const baseline = typeof baselineValue === 'string' ? parseNavigationValue(baselineValue) : null;
    const emptyNavigation: NavigationData = { sites: [], categories: [], layout: [] };
    return JSON.stringify(mergeNavigationData(baseline || emptyNavigation, preferLeft ? left : right, preferLeft ? right : left).data);
  }
  if (key === 'nav_click_stats_v2') {
    const left = parseClickValue(leftValue), right = parseClickValue(rightValue);
    if (!left && !right) return null;
    if (!left || !right) return JSON.stringify(left || right);
    const baseline = typeof baselineValue === 'string' ? parseClickValue(baselineValue) : null;
    return JSON.stringify(mergeClickStats(baseline, left, right, preferLeft));
  }
  if (key === 'nav_translation_history') {
    const left = parseTranslationValue(leftValue), right = parseTranslationValue(rightValue);
    if (!left && !right) return null;
    if (!left || !right) return JSON.stringify(left || right);
    const baseline = typeof baselineValue === 'string' ? parseTranslationValue(baselineValue) : null;
    return JSON.stringify(mergeTranslationHistory(baseline, left, right, preferLeft));
  }
  if (key === 'nav_temporary_url_visits_v1') {
    const left = parseTemporaryValue(leftValue), right = parseTemporaryValue(rightValue);
    if (!left && !right) return null;
    if (!left || !right) return JSON.stringify(left || right);
    const baseline = typeof baselineValue === 'string' ? parseTemporaryValue(baselineValue) : null;
    return JSON.stringify(mergeTemporaryVisits(baseline, left, right, preferLeft));
  }
  return null;
}

function validValue(key: string, entry: unknown): entry is SharedValue {
  if (!entry || typeof entry !== 'object') return false;
  const data = entry as SharedValue;
  if (!validKey(key) || typeof data.updatedAt !== 'string' || !Number.isFinite(Date.parse(data.updatedAt)) || (data.baseline !== undefined && typeof data.baseline !== 'boolean') || (data.value !== null && typeof data.value !== 'string') || (typeof data.value === 'string' && utf8ByteLength(data.value) > SHARED_SYNC_ENTRY_MAX_BYTES)) return false;
  if (key.startsWith('reading:')) {
    if (data.value === null) return false;
    try { const item = JSON.parse(data.value); return validReadingItem(item) && `reading:${item.url}` === key; } catch { return false; }
  }
  if (data.value === null) return true;
  if (key === STUDY_FEEDBACK_KEY) { try { parseStudyFeedback(JSON.parse(data.value)); return true; } catch { return false; } }
  if (key === HOME_TOOLS_KEY) { try { parseHomeTools(JSON.parse(data.value)); return true; } catch { return false; } }
  if (key === 'theme') return ['light', 'dark'].includes(data.value);
  if (key === 'scene_mode') return ['default', 'work', 'study', 'relax'].includes(data.value);
  if (['work_mode', 'nav_translator_collapsed'].includes(key)) return ['true', 'false'].includes(data.value);
  if (key === 'nav_cms_draft') {
    try { const nav = parseBackup({ version: 1, exportedAt: data.updatedAt, navigation: JSON.parse(data.value), storage: {} }).navigation; return nav.sites.every(site => /^https?:\/\//i.test(site.url)); } catch { return false; }
  }
  if (key !== 'nav_temp_text') { try { const value = JSON.parse(data.value); return value !== null && typeof value === 'object'; } catch { return false; } }
  return true;
}
export function parseSharedWorkspace(value: unknown): SharedWorkspace | null {
  if (!value || typeof value !== 'object') return null;
  const store = value as SharedWorkspace;
  if (store.version !== 1 || !store.entries || !store.history || Array.isArray(store.entries) || Array.isArray(store.history) || typeof store.entries !== 'object' || typeof store.history !== 'object' || Object.keys(store.entries).length > 3000) return null;
  if (Object.entries(store.entries).some(([key, entry]) => !validValue(key, entry)) || Object.entries(store.history).some(([key, entries]) => !Array.isArray(entries) || entries.length > 5 || entries.some(entry => !validValue(key, entry)))) return null;
  return store;
}
export function loadSharedWorkspace(storage: StorageLike = localStorage): SharedWorkspace {
  try { return parseSharedWorkspace(JSON.parse(storage.getItem(WORKSPACE_KEY) || 'null')) || empty(); } catch { return empty(); }
}
export function workspaceFingerprint(store: SharedWorkspace): string {
  const text = JSON.stringify({ entries: Object.entries(store.entries).sort(([a], [b]) => a.localeCompare(b)), history: Object.entries(store.history).sort(([a], [b]) => a.localeCompare(b)) });
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function mergeSharedWorkspace(a: SharedWorkspace, b: SharedWorkspace): SharedWorkspace {
  const result = empty();
  for (const key of new Set([...Object.keys(a.entries), ...Object.keys(b.entries)])) {
    const candidates = [a.entries[key], b.entries[key], ...(a.history[key] || []), ...(b.history[key] || [])].filter((item): item is SharedValue => Boolean(item));
    const ordered = uniqueVersions(key, candidates);
    const left = a.entries[key], right = b.entries[key];
    if (STRUCTURED_MERGE_KEYS.has(key) && left && right && left.value !== null && right.value !== null && left.value !== right.value) {
      const preferLeft = compareValues(key, left, right) <= 0;
      const mergedValue = mergeStructuredValue(key, left.value, right.value, commonAncestorValue(key, a, b), preferLeft);
      if (mergedValue !== null) {
        const matchingCurrent = [left, right].filter(entry => entry.value === mergedValue).sort((first, second) => compareValues(key, first, second))[0];
        const mergedEntry: SharedValue = matchingCurrent || {
          value: mergedValue,
          updatedAt: new Date(Math.max(Date.parse(left.updatedAt), Date.parse(right.updatedAt))).toISOString(),
        };
        if (validValue(key, mergedEntry)) {
          result.entries[key] = mergedEntry;
          const alternateVersions = ordered.filter((item, index, items) => item.value !== mergedValue && items.findIndex(candidate => candidate.value === item.value) === index);
          if (alternateVersions.length) result.history[key] = alternateVersions.slice(0, 5);
          continue;
        }
      }
    }
    result.entries[key] = ordered[0];
    // Settings retain alternate versions; reading progress uses per-URL last-write-wins, including deletion tombstones.
    if (!key.startsWith('reading:')) {
      const unique = ordered.slice(1).filter((item, i, items) => item.value !== ordered[0].value && items.findIndex(candidate => candidate.value === item.value) === i);
      if (unique.length) result.history[key] = unique.slice(0, 5);
    }
  }
  return result;
}

export function captureSharedWorkspace(storage: StorageLike = localStorage, now = new Date()): SharedWorkspace {
  const store = loadSharedWorkspace(storage), before = workspaceFingerprint(store);
  for (const key of SETTING_KEYS) {
    const value = storage.getItem(key), previous = store.entries[key];
    if (value !== null && utf8ByteLength(value) > SHARED_SYNC_ENTRY_MAX_BYTES) {
      throw new Error('本机 ' + key + ' 为 ' + utf8ByteLength(value) + ' UTF-8 字节，超过共享同步单项上限 ' + SHARED_SYNC_ENTRY_MAX_BYTES + ' 字节。');
    }
    if (!previous && value === null) continue;
    if (previous?.value === value) continue;
    // Unknown legacy timestamps are a baseline, never newer than an established cloud record.
    const entry: SharedValue = { value, updatedAt: previous ? new Date(Math.max(now.getTime(), Date.parse(previous.updatedAt) + 1)).toISOString() : '1970-01-01T00:00:00.000Z', ...(!previous && value === defaultValues[key] ? { baseline: true } : {}) };
    if (!validValue(key, entry)) continue;
    if (previous && previous.value !== value) store.history[key] = [previous, ...(store.history[key] || [])].slice(0, 5);
    store.entries[key] = entry;
  }
  for (const item of Object.values(loadReading(storage).items)) {
    const key = `reading:${item.url}`;
    store.entries[key] = { value: JSON.stringify(item), updatedAt: item.updatedAt };
  }
  if (before !== workspaceFingerprint(store)) storage.setItem(WORKSPACE_KEY, JSON.stringify(store));
  return store;
}

export function applySharedWorkspace(store: SharedWorkspace, storage: StorageLike = localStorage): void {
  if (!parseSharedWorkspace(store)) throw new Error('共享设置或阅读数据校验失败，本机内容未修改。');
  const entries: Array<[string, string | null]> = Object.entries(store.entries).filter(([key]) => SETTING_KEYS.has(key)).map(([key, entry]) => [key, entry.value]);
  const reading = Object.values(store.entries).flatMap(entry => { if (!entry.value) return []; try { const item = JSON.parse(entry.value); return validReadingItem(item) ? [item as ReadingItem] : []; } catch { return []; } });
  entries.push([READING_KEY, JSON.stringify({ version: 1, items: Object.fromEntries(reading.map(item => [item.url, item])) })]);
  entries.push([WORKSPACE_KEY, JSON.stringify(store)]);
  const previous = new Map(entries.map(([key]) => [key, storage.getItem(key)]));
  try { for (const [key, value] of entries) { if (value === null) storage.removeItem(key); else storage.setItem(key, value); } }
  catch (error) { for (const [key, value] of previous) { try { if (value === null) storage.removeItem(key); else storage.setItem(key, value); } catch { /* surfaced below */ } } throw new Error(`本机空间或存储权限不足，设置恢复未完成：${String(error)}`); }
  if (typeof window !== 'undefined') { window.dispatchEvent(new Event(WORKSPACE_EVENT)); window.dispatchEvent(new Event(READING_EVENT)); }
}
export function restoreSharedVersion(key: string, entry: SharedValue, storage: StorageLike = localStorage): void {
  if (!validValue(key, entry)) throw new Error('历史副本无效。');
  const current = captureSharedWorkspace(storage);
  const replacement = { value: entry.value, updatedAt: new Date(Math.max(Date.now(), Date.parse(current.entries[key]?.updatedAt || entry.updatedAt) + 1)).toISOString() };
  const previousVersions = uniqueVersions(key, [current.entries[key], ...(current.history[key] || [])].filter((item): item is SharedValue => Boolean(item)))
    .filter((item, index, items) => item.value !== replacement.value && items.findIndex(candidate => candidate.value === item.value) === index)
    .slice(0, 5);
  const next: SharedWorkspace = {
    version: 1,
    entries: { ...current.entries, [key]: replacement },
    history: { ...current.history, ...(previousVersions.length ? { [key]: previousVersions } : {}) },
  };
  applySharedWorkspace(next, storage);
}
