import { parseTechOsMarkdown, techOsMarkdownPlainText } from './techOsMarkdown.ts';

export const TECH_OS_STUDY_PROGRESS_KEY = 'baize_tech_os_study_progress_v1';
export const TECH_OS_STUDY_PROGRESS_UPDATED_EVENT = 'baize-tech-os-study-progress-updated';
const LEGACY_PROGRESS_TIMESTAMP = '1970-01-01T00:00:00.000Z';

export interface QuestStudyTask {
  id: string;
  title: string;
}

export interface StudyProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface StudyTaskProgress {
  completed: boolean;
  updatedAt: string;
}

export interface StudyProgressStore {
  version: 2;
  quests: Record<string, Record<string, StudyTaskProgress>>;
}

export interface StudyProgressWriteResult {
  saved: boolean;
  error?: string;
  store?: StudyProgressStore;
  completedTaskIds: string[];
}

interface LegacyStudyProgressStore {
  version: 1;
  quests: Record<string, string[]>;
}

export function extractQuestStudyTasks(body: string): QuestStudyTask[] {
  const tasks: QuestStudyTask[] = [];
  const seen = new Set<string>();
  // Use the same parser as the reading view, so every step has a real heading anchor.
  for (const block of parseTechOsMarkdown(body, 'study')) {
    if (block.type !== 'heading' || !block.stepId) continue;
    const id = block.stepId;
    const title = techOsMarkdownPlainText(block.text.replace(/^S\d+\s*[·:：.\-—]\s*/i, '')).trim();
    if (!title || seen.has(id)) continue;
    seen.add(id);
    tasks.push({ id, title });
  }
  return tasks;
}

export function emptyStudyProgressStore(): StudyProgressStore {
  return { version: 2, quests: {} };
}

export function parseStudyProgressStore(value: unknown): StudyProgressStore | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as { version?: unknown; quests?: unknown };
  if (!candidate.quests || typeof candidate.quests !== 'object' || Array.isArray(candidate.quests)) return null;
  if (candidate.version === 1) return migrateLegacyStore(candidate as LegacyStudyProgressStore);
  if (candidate.version !== 2) return null;

  const quests: StudyProgressStore['quests'] = {};
  for (const [questId, taskValues] of Object.entries(candidate.quests as Record<string, unknown>)) {
    if (!isQuestId(questId) || !taskValues || typeof taskValues !== 'object' || Array.isArray(taskValues)) return null;
    const tasks: Record<string, StudyTaskProgress> = {};
    for (const [taskId, taskValue] of Object.entries(taskValues as Record<string, unknown>)) {
      if (!isTaskId(taskId) || !taskValue || typeof taskValue !== 'object' || Array.isArray(taskValue)) return null;
      const task = taskValue as Record<string, unknown>;
      if (Object.keys(task).some(key => key !== 'completed' && key !== 'updatedAt')) return null;
      if (typeof task.completed !== 'boolean' || !isValidTimestamp(task.updatedAt)) return null;
      tasks[taskId] = { completed: task.completed, updatedAt: task.updatedAt };
    }
    quests[questId] = tasks;
  }
  return { version: 2, quests };
}

/** Strict reads never silently replace an unreadable or corrupt archive with an empty one. */
export function readStudyProgressStore(storage?: StudyProgressStorage): StudyProgressStore {
  return readProgressSnapshot(resolveStorage(storage)).store;
}

export function loadStudyProgressStore(storage?: StudyProgressStorage): StudyProgressStore {
  try {
    return readStudyProgressStore(storage);
  } catch {
    return emptyStudyProgressStore();
  }
}

export function saveStudyProgressStore(store: StudyProgressStore, storage?: StudyProgressStorage): boolean {
  const parsed = parseStudyProgressStore(store);
  if (!parsed) return false;
  try {
    // A sync result may have been prepared before another tab changed a task.
    persistProgress(resolveStorage(storage), current => mergeStudyProgressStores(current, parsed));
    return true;
  } catch {
    return false;
  }
}

export function mergeStudyProgressStores(local: StudyProgressStore, remote: StudyProgressStore): StudyProgressStore {
  const merged = emptyStudyProgressStore();
  for (const store of [local, remote]) {
    for (const [questId, tasks] of Object.entries(store.quests)) {
      const mergedTasks = merged.quests[questId] || {};
      for (const [taskId, progress] of Object.entries(tasks)) {
        const existing = mergedTasks[taskId];
        mergedTasks[taskId] = existing ? selectNewestTaskProgress(existing, progress) : { ...progress };
      }
      merged.quests[questId] = mergedTasks;
    }
  }
  return merged;
}

export function loadQuestStudyProgress(questId: string, storage?: StudyProgressStorage): string[] {
  return completedIds(loadStudyProgressStore(storage), questId);
}

function completedIds(store: StudyProgressStore, questId: string): string[] {
  const tasks = store.quests[questId] || {};
  return Object.entries(tasks)
    .filter(([, progress]) => progress.completed)
    .map(([taskId]) => taskId)
    .sort(compareTaskIds);
}

export function saveQuestStudyProgress(
  questId: string,
  completedTaskIds: string[],
  storage?: StudyProgressStorage,
  now = new Date(),
): boolean {
  if (!isQuestId(questId)) return false;
  try {
    const desired = new Set(completedTaskIds.map(value => value.toUpperCase()).filter(isTaskId));
    persistProgress(resolveStorage(storage), store => {
      const existing = store.quests[questId] || {};
      const nextTasks = { ...existing };
      for (const taskId of new Set([...Object.keys(existing), ...desired])) {
        const completed = desired.has(taskId);
        if (existing[taskId]?.completed === completed) continue;
        nextTasks[taskId] = { completed, updatedAt: nextTaskTimestamp(now, existing[taskId]) };
      }
      return { version: 2, quests: { ...store.quests, [questId]: nextTasks } };
    });
    return true;
  } catch {
    return false;
  }
}

export function toggleQuestStudyTask(
  questId: string,
  taskId: string,
  storage?: StudyProgressStorage,
  now = new Date(),
): string[] {
  const normalizedTaskId = taskId.toUpperCase();
  if (!isQuestId(questId) || !isTaskId(normalizedTaskId)) return loadQuestStudyProgress(questId, storage);
  try {
    const latest = readStudyProgressStore(storage);
    const completed = !latest.quests[questId]?.[normalizedTaskId]?.completed;
    return completedIds(persistProgress(resolveStorage(storage), current => setTask(current, questId, normalizedTaskId, completed, now)), questId);
  } catch {
    return loadQuestStudyProgress(questId, storage);
  }
}

/** Explicit intent is retry-safe: retrying "complete S1" never toggles it back. */
export async function setQuestStudyTaskCompleted(
  questId: string,
  taskId: string,
  completed: boolean,
  storage?: StudyProgressStorage,
  now = new Date(),
): Promise<StudyProgressWriteResult> {
  const normalizedTaskId = taskId.toUpperCase();
  if (!isQuestId(questId) || !isTaskId(normalizedTaskId) || typeof completed !== 'boolean') {
    return { saved: false, error: '学习任务编号或打卡状态无效，未写入。', completedTaskIds: [] };
  }
  try {
    const resolved = resolveStorage(storage);
    const write = () => persistProgress(resolved, current => setTask(current, questId, normalizedTaskId, completed, now));
    // The callback re-reads inside the lock, merging only this task into the newest archive.
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    const store = locks ? await locks.request(TECH_OS_STUDY_PROGRESS_KEY, write) : write();
    return { saved: true, store, completedTaskIds: completedIds(store, questId) };
  } catch (error) {
    let store: StudyProgressStore | undefined;
    try { store = readStudyProgressStore(storage); } catch { /* Keep the original unreadable archive untouched. */ }
    return { saved: false, error: progressError(error), store, completedTaskIds: store ? completedIds(store, questId) : [] };
  }
}

function setTask(store: StudyProgressStore, questId: string, taskId: string, completed: boolean, now: Date): StudyProgressStore {
  const tasks = store.quests[questId] || {};
  if (tasks[taskId]?.completed === completed) return store;
  return {
    version: 2,
    quests: { ...store.quests, [questId]: { ...tasks, [taskId]: { completed, updatedAt: nextTaskTimestamp(now, tasks[taskId]) } } },
  };
}

function nextTaskTimestamp(now: Date, previous?: StudyTaskProgress): string {
  const time = now.getTime();
  if (!Number.isFinite(time)) throw new Error('打卡时间无效，未写入。');
  return new Date(Math.max(time, previous ? Date.parse(previous.updatedAt) + 1 : time)).toISOString();
}

function resolveStorage(storage?: StudyProgressStorage): StudyProgressStorage {
  try {
    return storage || localStorage;
  } catch {
    throw new Error('无法访问本机学习进度，请检查浏览器的存储权限后重试。');
  }
}

function readProgressSnapshot(storage: StudyProgressStorage): { raw: string | null; store: StudyProgressStore } {
  let raw: string | null;
  try { raw = storage.getItem(TECH_OS_STUDY_PROGRESS_KEY); }
  catch { throw new Error('读取本机学习进度失败，请检查浏览器的存储权限后重试。'); }
  if (raw === null) return { raw, store: emptyStudyProgressStore() };
  try {
    const store = parseStudyProgressStore(JSON.parse(raw));
    if (store) return { raw, store };
  } catch { /* Preserve the exact original bytes; no automatic reset or recovery write. */ }
  throw new Error('本机学习进度存档已损坏，原始内容已保留，未覆盖。请先恢复存档，再重新读取。');
}

function persistProgress(storage: StudyProgressStorage, update: (store: StudyProgressStore) => StudyProgressStore): StudyProgressStore {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const baseline = readProgressSnapshot(storage);
    const next = parseStudyProgressStore(update(baseline.store));
    if (!next) throw new Error('学习进度格式无效，未写入。');
    const serialized = JSON.stringify(next);
    // Re-read before writing, including when Web Locks is unavailable or a sync caller writes.
    if (readProgressSnapshot(storage).raw !== baseline.raw) continue;
    if (serialized === baseline.raw) return next;
    try { storage.setItem(TECH_OS_STUDY_PROGRESS_KEY, serialized); }
    catch (error) { throw new Error(progressError(error)); }
    const verified = readProgressSnapshot(storage);
    if (verified.raw !== serialized) throw new Error('其他页面同时修改了学习进度，未能确认本次保存，请重试。');
    notifyStudyProgressUpdated();
    return verified.store;
  }
  throw new Error('其他页面正在修改学习进度，本次尚未保存，请稍后重试。');
}

function progressError(error: unknown): string {
  if (error instanceof Error && error.name === 'QuotaExceededError') return '浏览器存储空间不足，打卡尚未保存。请释放空间后重试。';
  if (error instanceof Error && (error.name === 'SecurityError' || error.name === 'NotAllowedError')) return '浏览器禁止保存学习进度，请检查存储权限后重试。';
  return error instanceof Error && error.message ? error.message : '保存学习进度失败，请重试；原有进度未主动清空。';
}

function migrateLegacyStore(store: LegacyStudyProgressStore): StudyProgressStore | null {
  const migrated = emptyStudyProgressStore();
  for (const [questId, taskIds] of Object.entries(store.quests)) {
    if (!isQuestId(questId) || !Array.isArray(taskIds) || taskIds.some(taskId => !isTaskId(taskId))) return null;
    migrated.quests[questId] = Object.fromEntries(
      [...new Set(taskIds.filter(isTaskId))]
        .sort(compareTaskIds)
        .map(taskId => [taskId, { completed: true, updatedAt: LEGACY_PROGRESS_TIMESTAMP }]),
    );
  }
  return migrated;
}

function selectNewestTaskProgress(left: StudyTaskProgress, right: StudyTaskProgress): StudyTaskProgress {
  const leftTime = Date.parse(left.updatedAt);
  const rightTime = Date.parse(right.updatedAt);
  if (leftTime !== rightTime) return { ...(leftTime > rightTime ? left : right) };
  if (left.completed !== right.completed) return { ...(left.completed ? right : left) };
  return { ...left };
}

function notifyStudyProgressUpdated(): void {
  try { if (typeof window !== 'undefined') window.dispatchEvent(new Event(TECH_OS_STUDY_PROGRESS_UPDATED_EVENT)); }
  catch { /* A UI observer must not turn a durable write into a reported failure. */ }
}

function isQuestId(value: unknown): value is string {
  return typeof value === 'string' && /^QUEST-\d+$/.test(value);
}

function isTaskId(value: unknown): value is string {
  return typeof value === 'string' && /^S\d+$/.test(value);
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function compareTaskIds(left: string, right: string): number {
  return Number(left.slice(1)) - Number(right.slice(1));
}
