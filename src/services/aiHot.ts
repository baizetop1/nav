/** Anonymous, on-demand AIHOT reader. News bodies are never persisted. */
export type AiHotTab = 'selected' | 'hot' | 'daily';
export interface AiHotEntry {
  id: string; kind: 'item' | 'topic' | 'daily'; title: string; summary: string; sourceName: string;
  readingUrl: string; originalUrl: string | null; storyUrl: string | null; publishedAt: string | null;
  category: string | null; rank?: number; sourceCount?: number;
  attribution: { name: string; url: string }; section?: string;
}
export interface AiHotResult {
  tab: AiHotTab; entries: AiHotEntry[];
  daily?: { date: string; generatedAt: string; windowStart: string | null; windowEnd: string | null;
    title: string; lead: string; readingUrl: string; attribution: { name: string; url: string } };
  notice: string; loadedAt: number; expiresAt: number;
}
export class AiHotRequestError extends Error {
  retryAt: number;
  constructor(message: string, retryAt = 0) { super(message); this.name = 'AiHotRequestError'; this.retryAt = retryAt; }
}
const ORIGIN = 'https://aihot.news';
const ATTRIBUTION = { name: 'AIHOT', url: ORIGIN + '/' };
const PATHS: Record<AiHotTab, string> = { selected: '/api/v1/items?mode=selected&limit=20', hot: '/api/v1/hot-topics', daily: '/api/v1/dailies/latest' };
const MAX_BODY_BYTES = 512 * 1024, MIN_REQUEST_INTERVAL = 60_000;
const cache = new Map<AiHotTab, AiHotResult>(), nextRequests = new Map<AiHotTab, number>();
let providerRetryAt = 0;
interface PendingRequest { controller: AbortController; promise: Promise<AiHotResult>; subscribers: number }
const pending = new Map<AiHotTab, PendingRequest>();
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AiHotRequestError('AIHOT 返回的数据格式不正确，请稍后再试。');
  return value as Record<string, unknown>;
}
function text(value: unknown, maximum = 600, nullable = false): string {
  if (nullable && (value === null || value === undefined)) return '';
  if (typeof value !== 'string' || value.length > maximum || (!nullable && !value.trim())) throw new AiHotRequestError('AIHOT 返回的文字字段不正确。');
  return value;
}
function array(value: unknown, maximum = 100): unknown[] {
  if (!Array.isArray(value) || value.length > maximum) throw new AiHotRequestError('AIHOT 返回的列表过大或格式不正确。');
  return value;
}
function link(value: unknown, siteOnly = false): string {
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\u007f]/.test(value)) throw new AiHotRequestError('AIHOT 返回了不安全的链接，已拒绝显示。');
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname
      || (siteOnly && (url.protocol !== 'https:' || !['aihot.news', 'aihot.virxact.com'].includes(url.hostname) || (url.port && url.port !== '443')))) throw new Error('unsafe');
    return url.toString();
  } catch { throw new AiHotRequestError('AIHOT 返回了不安全的链接，已拒绝显示。'); }
}
function dateTime(value: unknown, nullable = true): string | null {
  if (nullable && (value === null || value === undefined)) return null;
  if (typeof value !== 'string' || value.length > 80 || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) throw new AiHotRequestError('AIHOT 返回的时间字段不正确。');
  return value;
}
function attribution(value: unknown): { name: string; url: string } {
  if (value === undefined || value === null) return { ...ATTRIBUTION };
  const raw = record(value); return { name: text(raw.name, 120), url: link(raw.url, true) };
}
function count(value: unknown, minimum: number): number {
  if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > 1_000_000) throw new AiHotRequestError('AIHOT 返回的统计字段不正确。');
  return Number(value);
}
function item(value: unknown, kind: AiHotEntry['kind'], id?: string, section?: string): AiHotEntry {
  const raw = record(value), links = record(raw.links), source = record(raw.source);
  const originalUrl = links.original === null || links.original === undefined ? null : link(links.original);
  const readingUrl = links.aihot === null && kind === 'daily' ? originalUrl : link(links.aihot, true);
  if (!readingUrl) throw new AiHotRequestError('AIHOT 条目缺少可阅读的链接。');
  const entry: AiHotEntry = {
    id: id ?? text(raw.id, 160), kind, title: text(raw.title), summary: text(raw.summary, 8000, true),
    sourceName: text(source.name, 120), readingUrl, originalUrl,
    storyUrl: links.story === null || links.story === undefined ? null : link(links.story, true),
    publishedAt: dateTime(kind === 'topic' ? raw.latestAt : raw.publishedAt),
    category: raw.category === null || raw.category === undefined ? null : text(raw.category, 100), attribution: attribution(raw.attribution),
  };
  if (kind === 'topic') { entry.rank = count(raw.rank, 1); entry.sourceCount = count(raw.sourceCount, 0); }
  if (section !== undefined) entry.section = section;
  return entry;
}
function parse(tab: AiHotTab, value: unknown, loadedAt: number, expiresAt: number): AiHotResult {
  const raw = record(value);
  if (raw.schemaVersion !== 1) throw new AiHotRequestError('AIHOT 接口版本已变化，暂时无法读取；请打开来源网站。');
  let notice = '';
  if (raw.notice !== undefined && raw.notice !== null) {
    const note = record(raw.notice); notice = text(note.message, 1500); if (note.url !== undefined) link(note.url, true);
  }
  const result: AiHotResult = { tab, entries: [], notice, loadedAt, expiresAt };
  if (tab !== 'daily') result.entries = array(raw.items).map(value => item(value, tab === 'hot' ? 'topic' : 'item'));
  else {
    const report = record(raw.report), date = text(report.date, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date + 'T00:00:00Z')) || new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date) throw new AiHotRequestError('AIHOT 日报日期不正确。');
    const lead = report.lead === null || report.lead === undefined ? null : record(report.lead);
    result.daily = {
      date, generatedAt: dateTime(report.generatedAt, false)!, windowStart: dateTime(report.windowStart), windowEnd: dateTime(report.windowEnd),
      title: lead ? text(lead.title) : 'AI 日报', lead: lead ? text(lead.leadParagraph, 8000, true) : '',
      readingUrl: link(record(report.links).aihot, true), attribution: attribution(report.attribution),
    };
    array(report.sections, 30).forEach((value, sectionIndex) => {
      const section = record(value), label = text(section.label, 120);
      array(section.items).forEach((value, index) => result.entries.push(item(value, 'daily', 'daily:' + date + ':' + sectionIndex + ':' + index, label)));
    });
    array(report.flashes).forEach((value, index) => result.entries.push(item(value, 'daily', 'daily:' + date + ':flash:' + index, '快讯')));
    if (result.entries.length > 200) throw new AiHotRequestError('AIHOT 日报条目过多，已停止读取。');
  }
  if (new Set(result.entries.map(entry => entry.id)).size !== result.entries.length) throw new AiHotRequestError('AIHOT 返回了重复的条目标识。');
  return result;
}
function copy(result: AiHotResult): AiHotResult {
  return { ...result, entries: result.entries.map(entry => ({ ...entry, attribution: { ...entry.attribution } })),
    ...(result.daily ? { daily: { ...result.daily, attribution: { ...result.daily.attribution } } } : {}) };
}
function cacheDuration(response: Response): number {
  const control = response.headers.get('cache-control') ?? '';
  if (/(?:^|,)\s*(?:no-store|no-cache)(?:\s|,|$|=)/i.test(control)) return 0;
  const match = /(?:^|,)\s*max-age\s*=\s*"?(\d+)"?/i.exec(control);
  const lifetime = match ? Number(match[1]) * 1000 : 60_000, age = Number(response.headers.get('age') || '0');
  return Math.min(5 * 60_000, Math.max(0, lifetime - (Number.isFinite(age) && age > 0 ? age * 1000 : 0)));
}
function retryTime(response: Response): number {
  const value = response.headers.get('retry-after')?.trim(), now = Date.now();
  if (value && /^\d+$/.test(value) && Number.isSafeInteger(Number(value))) return now + Math.max(1, Number(value)) * 1000;
  const date = value ? Date.parse(value) : NaN;
  return Number.isFinite(date) ? Math.max(now + 1000, date) : now + (response.status === 429 ? 60_000 : 30_000);
}
async function readJson(response: Response): Promise<unknown> {
  const length = Number(response.headers.get('content-length') || '0');
  if (length > MAX_BODY_BYTES) { await response.body?.cancel(); throw new AiHotRequestError('AIHOT 返回的数据超过 512 KiB，已停止读取。'); }
  const decoder = new TextDecoder('utf-8', { fatal: true }); let body = '', size = 0;
  if (response.body) {
    const reader = response.body.getReader();
    try {
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength;
        if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new AiHotRequestError('AIHOT 返回的数据超过 512 KiB，已停止读取。'); }
        body += decoder.decode(chunk.value, { stream: true });
      }
      body += decoder.decode();
    } finally { reader.releaseLock(); }
  } else {
    body = await response.text(); if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) throw new AiHotRequestError('AIHOT 返回的数据超过 512 KiB，已停止读取。');
  }
  try { return JSON.parse(body) as unknown; } catch { throw new AiHotRequestError('AIHOT 返回的 JSON 无法解析，请稍后再试。'); }
}
const aborted = () => new DOMException('已取消 AIHOT 读取。', 'AbortError');
async function request(tab: AiHotTab, fetcher: typeof fetch, controller: AbortController): Promise<AiHotResult> {
  let timedOut = false; const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 15_000);
  try {
    const response = await fetcher(ORIGIN + PATHS[tab], {
      method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache: 'default',
      headers: { Accept: 'application/json' }, signal: controller.signal,
    });
    if (response.url) link(response.url, true);
    if (response.status === 429 || response.status === 503) {
      providerRetryAt = Math.max(providerRetryAt, retryTime(response)); await response.body?.cancel();
      throw new AiHotRequestError(response.status === 429 ? 'AIHOT 请求频率受限，请等待后再读取。' : 'AIHOT 正在维护或繁忙，请等待后再读取。', providerRetryAt);
    }
    if (!response.ok) { await response.body?.cancel(); throw new AiHotRequestError(response.status === 404 && tab === 'daily' ? 'AIHOT 暂无最新日报，请稍后再试。' : 'AIHOT 读取失败（HTTP ' + response.status + '），请稍后再试。'); }
    const raw = await readJson(response); if (controller.signal.aborted) throw aborted();
    const now = Date.now(), result = parse(tab, raw, now, now + cacheDuration(response));
    nextRequests.set(tab, now + MIN_REQUEST_INTERVAL);
    if (result.expiresAt > now) cache.set(tab, result); else cache.delete(tab);
    return result;
  } catch (cause) {
    if (!timedOut && controller.signal.aborted) throw aborted();
    const retryAt = Math.max(nextRequests.get(tab) || 0, Date.now() + MIN_REQUEST_INTERVAL);
    nextRequests.set(tab, retryAt);
    if (timedOut) throw new AiHotRequestError('AIHOT 读取超过 15 秒，请等待后重试。', retryAt);
    if (cause instanceof AiHotRequestError) { cause.retryAt = Math.max(cause.retryAt, retryAt); throw cause; }
    throw new AiHotRequestError('暂时无法连接 AIHOT，可能是网络或跨域限制；可打开来源网站阅读。', retryAt);
  } finally { clearTimeout(timeout); }
}
function subscribe(value: PendingRequest, signal?: AbortSignal): Promise<AiHotResult> {
  value.subscribers += 1;
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = () => { settled = true; value.subscribers -= 1; signal?.removeEventListener('abort', cancel); };
    const cancel = () => { if (settled) return; finish(); if (!value.subscribers) value.controller.abort(); reject(aborted()); };
    signal?.addEventListener('abort', cancel, { once: true });
    value.promise.then(result => { if (!settled) { finish(); resolve(copy(result)); } }, cause => { if (!settled) { finish(); reject(cause); } });
    if (signal?.aborted) cancel();
  });
}
export async function loadAiHot(tab: AiHotTab, options: { signal?: AbortSignal; fetcher?: typeof fetch } = {}): Promise<AiHotResult> {
  if (!Object.prototype.hasOwnProperty.call(PATHS, tab)) throw new AiHotRequestError('不支持的 AIHOT 阅读栏目。');
  if (options.signal?.aborted) throw aborted();
  const now = Date.now(), old = cache.get(tab); if (old && old.expiresAt > now) return copy(old);
  const waiting = pending.get(tab); if (waiting && !waiting.controller.signal.aborted) return subscribe(waiting, options.signal);
  const retryAt = Math.max(providerRetryAt, nextRequests.get(tab) || 0);
  if (retryAt > now) throw new AiHotRequestError(providerRetryAt > now ? 'AIHOT 请求仍在冷却中，请等待后再读取。' : '本栏刚刚读取过，请至少间隔 60 秒再次请求。', retryAt);
  const controller = new AbortController(), value: PendingRequest = { controller, subscribers: 0, promise: Promise.resolve(null as unknown as AiHotResult) };
  value.promise = request(tab, options.fetcher ?? fetch, controller).finally(() => { if (pending.get(tab) === value) pending.delete(tab); });
  pending.set(tab, value); return subscribe(value, options.signal);
}
/** Drops news bodies only. Provider/endpoint rate limits are deliberately retained. */
export function clearAiHotMemoryCache(): void { cache.clear(); }
