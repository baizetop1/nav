export const READING_KEY = 'baize_reading_v1';
export const READING_EVENT = 'baize-reading-updated';
export interface ReadingItem { url: string; title: string; position: number; readLater: boolean; visitedAt: string; updatedAt: string; deletedAt?: string }
export interface ReadingStore { version: 1; items: Record<string, ReadingItem> }
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export function safeReadingUrl(value: string): string | null {
  try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null; url.hash = ''; url.searchParams.delete('resume'); return url.href; } catch { return null; }
}
export function validReadingItem(value: unknown): value is ReadingItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as ReadingItem;
  return typeof item.url === 'string' && safeReadingUrl(item.url) === item.url && typeof item.title === 'string' && item.title.length <= 500 && Number.isFinite(item.position) && item.position >= 0 && item.position <= 100 && typeof item.readLater === 'boolean' && typeof item.visitedAt === 'string' && Number.isFinite(Date.parse(item.visitedAt)) && typeof item.updatedAt === 'string' && Number.isFinite(Date.parse(item.updatedAt)) && (!item.deletedAt || Number.isFinite(Date.parse(item.deletedAt)));
}
export function loadReading(storage: StorageLike = localStorage): ReadingStore {
  try { const data = JSON.parse(storage.getItem(READING_KEY) || 'null'); if (data?.version === 1 && data.items && typeof data.items === 'object' && !Array.isArray(data.items) && Object.entries(data.items).every(([url, item]) => validReadingItem(item) && item.url === url)) return data; } catch { /* preserve the original */ }
  return { version: 1, items: {} };
}
export function updateReading(url: string, title: string, changes: Partial<Pick<ReadingItem, 'position' | 'readLater' | 'deletedAt'>>, storage: StorageLike = localStorage, now = new Date()): ReadingItem {
  const normalized = safeReadingUrl(url);
  if (!normalized) throw new Error('仅支持安全的 HTTP/HTTPS 阅读地址。');
  const store = loadReading(storage);
  const old: Partial<ReadingItem> = store.items[normalized] || {};
  const stamp = new Date(Math.max(now.getTime(), old.updatedAt ? Date.parse(old.updatedAt) + 1 : 0)).toISOString();
  const item: ReadingItem = { url: normalized, title: title.slice(0, 500), position: 0, readLater: false, visitedAt: stamp, ...old, ...changes, updatedAt: stamp };
  if (!changes.deletedAt) delete item.deletedAt;
  if (!validReadingItem(item)) throw new Error('阅读记录无效。');
  store.items[normalized] = item;
  storage.setItem(READING_KEY, JSON.stringify(store));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(READING_EVENT));
  return item;
}
