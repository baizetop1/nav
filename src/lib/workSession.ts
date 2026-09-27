import { safeGetLocalStorageItem, writeStorageItem } from './safeStorage.ts';

export const WORK_SESSION_KEY = 'baize_work_session_v1';
type WorkStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type WorkSessionSaveResult =
  | { status: 'saved' | 'conflict'; store: WorkSessionStore }
  | { status: 'error'; message: string };
export type WorkPhase = 'focus' | 'short-break' | 'long-break';
export type WorkPreset = '25/5' | '50/10' | 'custom';
export type WorkBackground = 'paper' | 'forest' | 'night' | 'landscape';
export interface WorkNotice { id: string; runId: string; phase: WorkPhase; endedAt: number }
export interface WorkRun {
  id: string; task: string; phase: WorkPhase; minutes: number; siteIds: string[];
  startedAt: number; remainingMs: number; deadline: number | null;
}
export interface WorkSummary { id: string; task: string; endedAt: number; focusedMs: number; completed: boolean }
export interface WorkSessionStore {
  version: 2; task: string; minutes: number; siteIds: string[];
  current: WorkRun | null; history: WorkSummary[];
  shortBreakMinutes: number; longBreakMinutes: number; preset: WorkPreset;
  background: WorkBackground; sound: boolean; completedCount: number;
  nextPhase: WorkPhase; notice: WorkNotice | null;
}
export const emptyWorkSession = (): WorkSessionStore => ({ version: 2, task: '', minutes: 25, siteIds: [], current: null, history: [], shortBreakMinutes: 5, longBreakMinutes: 15, preset: '25/5', background: 'paper', sound: false, completedCount: 0, nextPhase: 'focus', notice: null });
const validIds = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 1000 && value.every(id => typeof id === 'string' && id.length <= 300);
const timestamp = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const minutesValid = (value: unknown, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= max;
const phaseValid = (value: unknown): value is WorkPhase => ['focus', 'short-break', 'long-break'].includes(value as string);
const phaseMax = (phase: WorkPhase) => phase === 'focus' ? 180 : phase === 'short-break' ? 60 : 120;

export function parseWorkSession(raw: unknown): WorkSessionStore {
  const data = raw as (Omit<WorkSessionStore, 'version'> & { version: number }) | null;
  if (!data || ![1, 2].includes(data.version) || typeof data.task !== 'string' || data.task.length > 200 || !minutesValid(data.minutes, 180) || (data.version === 1 && ![25, 50].includes(data.minutes)) || !validIds(data.siteIds) || !Array.isArray(data.history)) throw new Error('工作会话数据无效。');
  const legacy = data.version === 1;
  if (data.current) {
    const run = data.current;
    const phase = legacy ? 'focus' : run.phase;
    if (typeof run.id !== 'string' || run.id.length > 200 || typeof run.task !== 'string' || run.task.length > 200 || !phaseValid(phase) || !minutesValid(run.minutes, phaseMax(phase)) || (legacy && ![25, 50].includes(run.minutes)) || !validIds(run.siteIds) || !timestamp(run.startedAt) || !timestamp(run.remainingMs) || run.remainingMs > run.minutes * 60_000 || (run.deadline !== null && !timestamp(run.deadline))) throw new Error('工作计时数据无效。');
  }
  if (data.history.some(item => !item || typeof item.id !== 'string' || item.id.length > 200 || typeof item.task !== 'string' || item.task.length > 200 || !timestamp(item.endedAt) || !timestamp(item.focusedMs) || item.focusedMs > 180 * 60_000 || typeof item.completed !== 'boolean')) throw new Error('工作小结数据无效。');
  if (!legacy && (!minutesValid(data.shortBreakMinutes, 60) || !minutesValid(data.longBreakMinutes, 120) || !['25/5', '50/10', 'custom'].includes(data.preset) || !['paper', 'forest', 'night', 'landscape'].includes(data.background) || typeof data.sound !== 'boolean' || !Number.isSafeInteger(data.completedCount) || data.completedCount < 0 || !phaseValid(data.nextPhase))) throw new Error('番茄钟设置无效。');
  const notice = legacy ? null : data.notice;
  if (notice != null && (typeof notice.runId !== 'string' || notice.runId.length > 200 || notice.id !== `${notice.runId}:completed` || !phaseValid(notice.phase) || !timestamp(notice.endedAt))) throw new Error('番茄钟提示数据无效。');
  return {
    version: 2, task: data.task, minutes: data.minutes, siteIds: [...new Set(data.siteIds)],
    current: data.current ? { id: data.current.id, task: data.current.task, phase: legacy ? 'focus' : data.current.phase, minutes: data.current.minutes, siteIds: [...new Set(data.current.siteIds)], startedAt: data.current.startedAt, remainingMs: data.current.remainingMs, deadline: data.current.deadline } : null,
    history: data.history.slice(0, 30).map(item => ({ id: item.id, task: item.task, endedAt: item.endedAt, focusedMs: item.focusedMs, completed: item.completed })),
    shortBreakMinutes: legacy ? (data.minutes === 50 ? 10 : 5) : data.shortBreakMinutes,
    longBreakMinutes: legacy ? (data.minutes === 50 ? 20 : 15) : data.longBreakMinutes,
    preset: legacy ? (data.minutes === 50 ? '50/10' : '25/5') : data.preset,
    background: legacy ? 'paper' : data.background, sound: legacy ? false : data.sound,
    completedCount: legacy ? data.history.filter(item => item.completed).length : data.completedCount,
    nextPhase: legacy ? 'focus' : data.nextPhase,
    notice: notice ? { id: notice.id, runId: notice.runId, phase: notice.phase, endedAt: notice.endedAt } : null,
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
  return { ...store, nextPhase: 'focus', notice: null, current: { id, task: store.task.trim(), phase: 'focus', minutes: store.minutes, siteIds: [...store.siteIds], startedAt: now, remainingMs: duration, deadline: now + duration } };
}
export function workPhaseMinutes(store: WorkSessionStore, phase = store.nextPhase): number {
  return phase === 'focus' ? store.minutes : phase === 'short-break' ? store.shortBreakMinutes : store.longBreakMinutes;
}
export function startBreak(store: WorkSessionStore, now = Date.now(), id = crypto.randomUUID()): WorkSessionStore {
  if (store.current || store.nextPhase === 'focus') return store;
  const minutes = workPhaseMinutes(store), duration = minutes * 60_000;
  return { ...store, notice: null, current: { id, task: store.task, phase: store.nextPhase, minutes, siteIds: [...store.siteIds], startedAt: now, remainingMs: duration, deadline: now + duration } };
}
export function startNextPhase(store: WorkSessionStore, now = Date.now(), id = crypto.randomUUID()): WorkSessionStore {
  return store.nextPhase === 'focus' ? startWork(store, now, id) : startBreak(store, now, id);
}
export function skipBreak(store: WorkSessionStore): WorkSessionStore {
  return store.current?.phase === 'focus' ? store : { ...store, current: null, nextPhase: 'focus', notice: null };
}
export function acknowledgeWorkNotice(store: WorkSessionStore, id: string): WorkSessionStore {
  return store.notice?.id === id ? { ...store, notice: null } : store;
}
export function setWorkPreset(store: WorkSessionStore, preset: WorkPreset): WorkSessionStore {
  return preset === 'custom' ? { ...store, preset } : { ...store, preset, minutes: preset === '25/5' ? 25 : 50, shortBreakMinutes: preset === '25/5' ? 5 : 10, longBreakMinutes: preset === '25/5' ? 15 : 20 };
}
export function finishWork(store: WorkSessionStore, now = Date.now()): WorkSessionStore {
  const run = store.current;
  if (!run) return store;
  const remaining = remainingWorkMs(run, now);
  const endedAt = remaining === 0 && run.deadline !== null ? run.deadline : now;
  const notice: WorkNotice | null = remaining === 0 ? { id: `${run.id}:completed`, runId: run.id, phase: run.phase, endedAt } : null;
  if (run.phase !== 'focus') return { ...store, current: null, nextPhase: 'focus', notice };
  const summary: WorkSummary = { id: run.id, task: run.task, endedAt: remaining === 0 && run.deadline !== null ? run.deadline : now, focusedMs: run.minutes * 60_000 - remaining, completed: remaining === 0 };
  const completedCount = store.completedCount + (summary.completed && !store.history.some(item => item.id === run.id) ? 1 : 0);
  return { ...store, current: null, completedCount, nextPhase: summary.completed ? (completedCount % 4 === 0 ? 'long-break' : 'short-break') : 'focus', notice, history: [summary, ...store.history.filter(item => item.id !== run.id)].slice(0, 30) };
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
