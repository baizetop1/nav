import type { AiHotEntry } from '../services/aiHot.ts';

export const AI_HOT_READER_KEY = 'baize_aihot_reader_v1';
export const AI_HOT_READER_EVENT = 'baize:aihot-reader-updated';
export interface AiHotBookmark {
  readingUrl: string; title: string; sourceName: string; kind: AiHotEntry['kind']; savedAt: number; publishedAt: string | null;
}
export interface AiHotReaderState { version: 1; read: Record<string, number>; favorites: AiHotBookmark[] }
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
const MAX_BYTES = 512 * 1024;
const empty = (): AiHotReaderState => ({ version: 1, read: {}, favorites: [] });
const corrupt = () => new Error('AI 资讯本地记录损坏或格式不受支持，原记录未覆盖。');
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw corrupt();
  return value as Record<string, unknown>;
}
/** Reader identity ignores fragments, so the same article has one read/favorite record. */
export function aiHotReadingKey(value: string): string {
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\u007f]/.test(value)) throw new Error('AI 资讯链接不安全，未保存。');
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error('unsafe');
    url.hash = ''; return url.toString();
  } catch { throw new Error('AI 资讯链接不安全，未保存。'); }
}
function text(value: unknown, maximum: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) throw corrupt();
  return value;
}
function timestamp(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) throw corrupt();
  return Number(value);
}
function publication(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || value.length > 80 || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) throw corrupt();
  return value;
}
function bookmark(value: unknown): AiHotBookmark {
  const raw = object(value);
  if (!['item', 'topic', 'daily'].includes(String(raw.kind))) throw corrupt();
  return {
    readingUrl: aiHotReadingKey(text(raw.readingUrl, 2048)), title: text(raw.title, 600), sourceName: text(raw.sourceName, 120),
    kind: raw.kind as AiHotEntry['kind'], savedAt: timestamp(raw.savedAt), publishedAt: publication(raw.publishedAt),
  };
}
/** Cleans extra fields; a corrupt record is never silently replaced with an empty one. */
export function parseAiHotReader(value: unknown): AiHotReaderState {
  const raw = object(value);
  if (raw.version !== 1 || !Array.isArray(raw.favorites) || raw.favorites.length > 100) throw corrupt();
  const reads = object(raw.read), read: Record<string, number> = Object.create(null);
  if (Object.keys(reads).length > 500) throw corrupt();
  for (const [key, value] of Object.entries(reads)) {
    const url = aiHotReadingKey(key); read[url] = Math.max(read[url] || 0, timestamp(value));
  }
  const favorites = raw.favorites.map(bookmark), seen = new Set<string>();
  for (const item of favorites) { if (seen.has(item.readingUrl)) throw corrupt(); seen.add(item.readingUrl); }
  return { version: 1, read, favorites };
}
function parseRaw(raw: string | null): AiHotReaderState {
  if (raw === null) return empty();
  if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) throw corrupt();
  try { return parseAiHotReader(JSON.parse(raw) as unknown); }
  catch (cause) { throw cause instanceof Error && /链接不安全/.test(cause.message) ? cause : corrupt(); }
}
export function readAiHotReader(storage?: Pick<Storage, 'getItem'>): { state: AiHotReaderState; error: string } {
  try { return { state: parseRaw((storage ?? localStorage).getItem(AI_HOT_READER_KEY)), error: '' }; }
  catch (cause) { return { state: empty(), error: cause instanceof Error && /(?:记录损坏|链接不安全)/.test(cause.message) ? cause.message : '无法读取 AI 资讯本地记录，请检查浏览器存储权限。' }; }
}
function mutate(change: (state: AiHotReaderState) => void, storage?: StorageLike): AiHotReaderState {
  let source: StorageLike, raw: string | null;
  try { source = storage ?? localStorage; raw = source.getItem(AI_HOT_READER_KEY); }
  catch { throw new Error('无法读取 AI 资讯本地记录，请检查浏览器存储权限。'); }
  const state = parseRaw(raw); change(state);
  const value = JSON.stringify(state);
  if (new TextEncoder().encode(value).byteLength > MAX_BYTES) throw new Error('AI 资讯本地记录过大，未保存；请移除部分收藏。');
  // Read the latest store for every operation and check again immediately before writing.
  // localStorage has no cross-tab transaction primitive; detected races are surfaced, not rolled back over newer data.
  try {
    if (source.getItem(AI_HOT_READER_KEY) !== raw) throw new Error('另一页面修改了 AI 资讯记录，请刷新列表后再试。');
    source.setItem(AI_HOT_READER_KEY, value);
    if (source.getItem(AI_HOT_READER_KEY) !== value) throw new Error('另一页面修改了 AI 资讯记录，请刷新列表后再试。');
  } catch (cause) {
    if (cause instanceof Error && /另一页面/.test(cause.message)) throw cause;
    throw new Error('无法保存 AI 资讯本地记录，可能是存储空间不足或权限受限；当前操作未确认保存。');
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AI_HOT_READER_EVENT));
  return state;
}
export function toggleAiHotFavorite(entry: Pick<AiHotEntry, 'readingUrl' | 'title' | 'sourceName' | 'kind' | 'publishedAt'>, storage?: StorageLike): AiHotReaderState {
  const item = bookmark({ ...entry, savedAt: Date.now() });
  return mutate(state => {
    const index = state.favorites.findIndex(value => value.readingUrl === item.readingUrl);
    if (index >= 0) state.favorites.splice(index, 1);
    else {
      if (state.favorites.length >= 100) throw new Error('最多收藏 100 条 AI 资讯，请先移除部分收藏。');
      state.favorites.unshift(item);
    }
  }, storage);
}
export function markAiHotRead(entry: Pick<AiHotEntry, 'readingUrl'>, storage?: StorageLike): AiHotReaderState {
  const key = aiHotReadingKey(entry.readingUrl);
  return mutate(state => {
    state.read[key] = Date.now();
    state.read = Object.fromEntries(Object.entries(state.read).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 500));
  }, storage);
}
export function removeAiHotFavorite(url: string, storage?: StorageLike): AiHotReaderState {
  const key = aiHotReadingKey(url);
  return mutate(state => { state.favorites = state.favorites.filter(item => item.readingUrl !== key); }, storage);
}
