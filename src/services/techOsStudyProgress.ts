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

interface LegacyStudyProgressStore {
  version: 1;
  quests: Record<string, string[]>;
}

export function extractQuestStudyTasks(body: string): QuestStudyTask[] {
  const tasks: QuestStudyTask[] = [];
  const seen = new Set<string>();
  const pattern = /^###\s+(S\d+)\s*(?:[·:：.\-—])\s*(.+?)\s*$/gim;
  for (const match of body.matchAll(pattern)) {
    const id = match[1].toUpperCase();
    const title = match[2].trim();
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

export function loadStudyProgressStore(storage: StudyProgressStorage = localStorage): StudyProgressStore {
  try {
    const saved = storage.getItem(TECH_OS_STUDY_PROGRESS_KEY);
    return saved ? parseStudyProgressStore(JSON.parse(saved)) || emptyStudyProgressStore() : emptyStudyProgressStore();
  } catch {
    return emptyStudyProgressStore();
  }
}

export function saveStudyProgressStore(store: StudyProgressStore, storage: StudyProgressStorage = localStorage): boolean {
  const parsed = parseStudyProgressStore(store);
  if (!parsed) return false;
  try {
    storage.setItem(TECH_OS_STUDY_PROGRESS_KEY, JSON.stringify(parsed));
    notifyStudyProgressUpdated();
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

export function loadQuestStudyProgress(questId: string, storage: StudyProgressStorage = localStorage): string[] {
  const tasks = loadStudyProgressStore(storage).quests[questId] || {};
  return Object.entries(tasks)
    .filter(([, progress]) => progress.completed)
    .map(([taskId]) => taskId)
    .sort(compareTaskIds);
}

export function saveQuestStudyProgress(
  questId: string,
  completedTaskIds: string[],
  storage: StudyProgressStorage = localStorage,
  now = new Date(),
): boolean {
  if (!isQuestId(questId)) return false;
  const store = loadStudyProgressStore(storage);
  const existing = store.quests[questId] || {};
  const desired = new Set(completedTaskIds.map(value => value.toUpperCase()).filter(isTaskId));
  const updatedAt = now.toISOString();
  const taskIds = new Set([...Object.keys(existing), ...desired]);
  const nextTasks: Record<string, StudyTaskProgress> = { ...existing };
  for (const taskId of taskIds) {
    const completed = desired.has(taskId);
    if (existing[taskId]?.completed === completed) continue;
    nextTasks[taskId] = { completed, updatedAt };
  }
  store.quests[questId] = nextTasks;
  return saveStudyProgressStore(store, storage);
}

export function toggleQuestStudyTask(
  questId: string,
  taskId: string,
  storage: StudyProgressStorage = localStorage,
  now = new Date(),
): string[] {
  const normalizedTaskId = taskId.toUpperCase();
  if (!isQuestId(questId) || !isTaskId(normalizedTaskId)) return loadQuestStudyProgress(questId, storage);
  const store = loadStudyProgressStore(storage);
  const tasks = store.quests[questId] || {};
  tasks[normalizedTaskId] = {
    completed: !tasks[normalizedTaskId]?.completed,
    updatedAt: now.toISOString(),
  };
  store.quests[questId] = tasks;
  if (!saveStudyProgressStore(store, storage)) return loadQuestStudyProgress(questId, storage);
  return loadQuestStudyProgress(questId, storage);
}

function migrateLegacyStore(store: LegacyStudyProgressStore): StudyProgressStore {
  const migrated = emptyStudyProgressStore();
  for (const [questId, taskIds] of Object.entries(store.quests)) {
    if (!isQuestId(questId) || !Array.isArray(taskIds)) continue;
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
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(TECH_OS_STUDY_PROGRESS_UPDATED_EVENT));
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
