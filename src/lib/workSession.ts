import { safeGetLocalStorageItem, writeStorageItem } from './safeStorage.ts';

export const WORK_SESSION_KEY = 'baize_work_session_v1';
type WorkStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type WorkSessionSaveResult =
  | { status: 'saved' | 'conflict'; store: WorkSessionStore }
  | { status: 'error'; message: string };
export interface WorkRun {
  id: string; task: string; minutes: 25 | 50; siteIds: string[];
  startedAt: number; remainingMs: number; deadline: number | null;
}
export interface WorkSummary { id: string; task: string; endedAt: number; focusedMs: number; completed: boolean }
export interface WorkSessionStore {
  version: 1; task: string; minutes: 25 | 50; siteIds: string[];
  current: WorkRun | null; history: WorkSummary[];
}
export const emptyWorkSession = (): WorkSessionStore => ({ version: 1, task: '', minutes: 25, siteIds: [], current: null, history: [] });
const validIds = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 1000 && value.every(id => typeof id === 'string' && id.length <= 300);
const timestamp = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export function parseWorkSession(raw: unknown): WorkSessionStore {
  const data = raw as WorkSessionStore | null;
  if (!data || data.version !== 1 || typeof data.task !== 'string' || data.task.length > 200 || ![25, 50].includes(data.minutes) || !validIds(data.siteIds) || !Array.isArray(data.history)) throw new Error('工作会话数据无效。');
  if (data.current) {
    const run = data.current;
    if (typeof run.id !== 'string' || typeof run.task !== 'string' || run.task.length > 200 || ![25, 50].includes(run.minutes) || !validIds(run.siteIds) || !timestamp(run.startedAt) || !timestamp(run.remainingMs) || run.remainingMs > run.minutes * 60_000 || (run.deadline !== null && !timestamp(run.deadline))) throw new Error('工作计时数据无效。');
  }
  if (data.history.some(item => !item || typeof item.id !== 'string' || typeof item.task !== 'string' || !timestamp(item.endedAt) || !timestamp(item.focusedMs) || item.focusedMs > 50 * 60_000 || typeof item.completed !== 'boolean')) throw new Error('工作小结数据无效。');
  return {
    version: 1, task: data.task, minutes: data.minutes, siteIds: [...new Set(data.siteIds)],
    current: data.current ? { id: data.current.id, task: data.current.task, minutes: data.current.minutes, siteIds: [...new Set(data.current.siteIds)], startedAt: data.current.startedAt, remainingMs: data.current.remainingMs, deadline: data.current.deadline } : null,
    history: data.history.slice(0, 30).map(item => ({ id: item.id, task: item.task, endedAt: item.endedAt, focusedMs: item.focusedMs, completed: item.completed })),
  };
}

export function loadWorkSession(): WorkSessionStore {
  try { const raw = safeGetLocalStorageItem(WORK_SESSION_KEY, { label: '工作会话' }); return raw ? parseWorkSession(JSON.parse(raw)) : emptyWorkSession(); } catch { return emptyWorkSession(); }
}
export function sameWorkSession(a: WorkSessionStore, b: WorkSessionStore): boolean {
  return JSON.stringify(parseWorkSession(a)) === JSON.stringify(parseWorkSession(b));
}
export function readWorkSession(storage: Pick<Storage, 'getItem'> = localStorage): WorkSessionStore {
  const raw = storage.getItem(WORK_SESSION_KEY);
  return raw === null ? emptyWorkSession() : parseWorkSession(JSON.parse(raw));
}
/** Compare the persisted baseline immediately before writing. A stale timer can
 * never overwrite a pause, a newly started run or another tab's history. */
export function commitWorkSession(expected: WorkSessionStore, next: WorkSessionStore, storage: WorkStorage): WorkSessionSaveResult {
  try {
    const latest = readWorkSession(storage);
    const normalized = parseWorkSession(next);
    if (sameWorkSession(latest, normalized)) return { status: 'saved', store: latest };
    if (!sameWorkSession(latest, expected)) return { status: 'conflict', store: latest };
    // This write intentionally stays out of the global unguarded retry queue.
    // Retrying a timer save must recheck its baseline as well.
    const result = writeStorageItem(storage, WORK_SESSION_KEY, JSON.stringify(normalized), { label: '工作会话', maxBytes: 512 * 1024 });
    return result.ok ? { status: 'saved', store: normalized } : { status: 'error', message: result.issue.message };
  } catch (error) { return { status: 'error', message: error instanceof Error ? error.message : '无法保存工作会话。' }; }
}
export async function saveWorkSession(expected: WorkSessionStore, next: WorkSessionStore): Promise<WorkSessionSaveResult> {
  try {
    const commit = () => commitWorkSession(expected, next, localStorage);
    // Web Locks serializes simultaneous writes across tabs on supporting browsers;
    // the baseline check also protects delayed events and older browsers.
    if (typeof navigator !== 'undefined' && navigator.locks?.request) return await navigator.locks.request(WORK_SESSION_KEY, commit);
    return commit();
  } catch (error) { return { status: 'error', message: error instanceof Error ? error.message : '无法访问工作会话存储。' }; }
}
export function remainingWorkMs(run: WorkRun, now = Date.now()): number {
  return Math.max(0, Math.min(run.remainingMs, run.deadline === null ? run.remainingMs : run.deadline - now));
}
export function startWork(store: WorkSessionStore, now = Date.now(), id = crypto.randomUUID()): WorkSessionStore {
  if (store.current) return store;
  if (!store.task.trim()) throw new Error('先写下这次要完成的任务。');
  const duration = store.minutes * 60_000;
  return { ...store, current: { id, task: store.task.trim(), minutes: store.minutes, siteIds: [...store.siteIds], startedAt: now, remainingMs: duration, deadline: now + duration } };
}
export function finishWork(store: WorkSessionStore, now = Date.now()): WorkSessionStore {
  const run = store.current;
  if (!run) return store;
  const remaining = remainingWorkMs(run, now);
  const summary: WorkSummary = { id: run.id, task: run.task, endedAt: remaining === 0 && run.deadline !== null ? run.deadline : now, focusedMs: run.minutes * 60_000 - remaining, completed: remaining === 0 };
  return { ...store, current: null, history: [summary, ...store.history.filter(item => item.id !== run.id)].slice(0, 30) };
}
export function reconcileWork(store: WorkSessionStore, now = Date.now()): WorkSessionStore {
  return store.current && remainingWorkMs(store.current, now) === 0 ? finishWork(store, now) : store;
}
export function pauseWork(store: WorkSessionStore, now = Date.now()): WorkSessionStore {
  const settled = reconcileWork(store, now);
  const run = settled.current;
  return !run || run.deadline === null ? settled : { ...settled, current: { ...run, remainingMs: remainingWorkMs(run, now), deadline: null } };
}
export function resumeWork(store: WorkSessionStore, now = Date.now()): WorkSessionStore {
  const run = store.current;
  return !run || run.deadline !== null ? store : { ...store, current: { ...run, deadline: now + run.remainingMs } };
}
