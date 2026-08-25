export const TECH_OS_STUDY_PROGRESS_KEY = 'baize_tech_os_study_progress_v1';

export interface QuestStudyTask {
  id: string;
  title: string;
}

export interface StudyProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface StudyProgressStore {
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

export function loadQuestStudyProgress(questId: string, storage: StudyProgressStorage = localStorage): string[] {
  const store = loadStore(storage);
  return store.quests[questId] ? [...store.quests[questId]] : [];
}

export function saveQuestStudyProgress(questId: string, completedTaskIds: string[], storage: StudyProgressStorage = localStorage): boolean {
  try {
    const store = loadStore(storage);
    store.quests[questId] = [...new Set(completedTaskIds.filter(isTaskId))].sort(compareTaskIds);
    storage.setItem(TECH_OS_STUDY_PROGRESS_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function toggleQuestStudyTask(questId: string, taskId: string, storage: StudyProgressStorage = localStorage): string[] {
  const normalizedTaskId = taskId.toUpperCase();
  if (!isTaskId(normalizedTaskId)) return loadQuestStudyProgress(questId, storage);
  const completed = new Set(loadQuestStudyProgress(questId, storage));
  if (completed.has(normalizedTaskId)) completed.delete(normalizedTaskId);
  else completed.add(normalizedTaskId);
  const result = [...completed].sort(compareTaskIds);
  saveQuestStudyProgress(questId, result, storage);
  return result;
}

function loadStore(storage: StudyProgressStorage): StudyProgressStore {
  try {
    const value: unknown = JSON.parse(storage.getItem(TECH_OS_STUDY_PROGRESS_KEY) || 'null');
    if (!value || typeof value !== 'object') return emptyStore();
    const candidate = value as { version?: unknown; quests?: unknown };
    if (candidate.version !== 1 || !candidate.quests || typeof candidate.quests !== 'object' || Array.isArray(candidate.quests)) return emptyStore();
    const quests: Record<string, string[]> = {};
    Object.entries(candidate.quests as Record<string, unknown>).forEach(([questId, taskIds]) => {
      if (!/^QUEST-\d+$/.test(questId) || !Array.isArray(taskIds)) return;
      quests[questId] = [...new Set(taskIds.filter(isTaskId))].sort(compareTaskIds);
    });
    return { version: 1, quests };
  } catch {
    return emptyStore();
  }
}

function emptyStore(): StudyProgressStore {
  return { version: 1, quests: {} };
}

function isTaskId(value: unknown): value is string {
  return typeof value === 'string' && /^S\d+$/.test(value);
}

function compareTaskIds(left: string, right: string): number {
  return Number(left.slice(1)) - Number(right.slice(1));
}
