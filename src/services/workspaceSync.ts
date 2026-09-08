import { BACKUP_STORAGE_KEYS, parseBackup } from '../lib/backup.ts';
import { loadReading, READING_EVENT, READING_KEY, validReadingItem, type ReadingItem } from './readingHistory.ts';

export const WORKSPACE_KEY = 'baize_shared_workspace_v1';
export const WORKSPACE_EVENT = 'baize-shared-workspace-updated';
export interface SharedValue { value: string | null; updatedAt: string; baseline?: boolean }
export interface SharedWorkspace { version: 1; entries: Record<string, SharedValue>; history: Record<string, SharedValue[]> }
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const SETTING_KEYS = new Set<string>(BACKUP_STORAGE_KEYS);
let defaultValues: Record<string, string | null> = {};
export function configureSharedDefaults(values: Record<string, string | null>) { defaultValues = values; }
const empty = (): SharedWorkspace => ({ version: 1, entries: {}, history: {} });
const validKey = (key: string) => SETTING_KEYS.has(key) || key.startsWith('reading:http://') || key.startsWith('reading:https://');
const signature = (entry: SharedValue) => `${entry.baseline ? '0' : '1'}|${entry.updatedAt}|${JSON.stringify(entry.value)}`;
const deletedReading = (key: string, entry: SharedValue) => key.startsWith('reading:') && Boolean(JSON.parse(entry.value || '{}').deletedAt);

function validValue(key: string, entry: unknown): entry is SharedValue {
  if (!entry || typeof entry !== 'object') return false;
  const data = entry as SharedValue;
  if (!validKey(key) || typeof data.updatedAt !== 'string' || !Number.isFinite(Date.parse(data.updatedAt)) || (data.baseline !== undefined && typeof data.baseline !== 'boolean') || (data.value !== null && typeof data.value !== 'string') || (data.value?.length || 0) > 512 * 1024) return false;
  if (key.startsWith('reading:')) {
    if (data.value === null) return false;
    try { const item = JSON.parse(data.value); return validReadingItem(item) && `reading:${item.url}` === key; } catch { return false; }
  }
  if (data.value === null) return true;
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
    const ordered = [...new Map(candidates.map(item => [signature(item), item])).values()].sort((left, right) => Number(Boolean(left.baseline)) - Number(Boolean(right.baseline)) || Date.parse(right.updatedAt) - Date.parse(left.updatedAt) || Number(deletedReading(key, right)) - Number(deletedReading(key, left)) || signature(right).localeCompare(signature(left)));
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
  const next = mergeSharedWorkspace(current, { version: 1, entries: { [key]: replacement }, history: {} });
  applySharedWorkspace(next, storage);
}
