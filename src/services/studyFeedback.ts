export const STUDY_FEEDBACK_KEY = 'baize_study_feedback_v1';
export const STUDY_FEEDBACK_EVENT = 'baize:study-feedback-updated';
export interface StudyFeedbackContent { answer: string; observations: string; stuck: string; confidence: 1 | 2 | 3 }
export interface StudyFeedbackEntry extends StudyFeedbackContent { updatedAt: string; revision: number; reviewStage: number; nextReviewAt: string | null; alternatives: StudyFeedbackContent[] }
export interface StudyFeedbackStore { version: 1; entries: Record<string, StudyFeedbackEntry> }
type FeedbackStorage = Pick<Storage, 'getItem' | 'setItem'>;
const MAX_BYTES = 512 * 1024, MAX_ENTRIES = 1000;
const validId = (id: string) => /^QUEST-\d{3,}\/S\d{1,4}$/.test(id);
const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)])) : value;
const same = (a: unknown, b: unknown) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
export const emptyStudyFeedback = (): StudyFeedbackStore => ({ version: 1, entries: {} });
export const emptyFeedbackContent = (): StudyFeedbackContent => ({ answer: '', observations: '', stuck: '', confidence: 1 });
export function feedbackId(questId: string, stepId: string): string { const id = questId + '/' + stepId; if (!validId(id)) throw new Error('学习步骤编号无效。'); return id; }
function content(value: unknown): StudyFeedbackContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('学习反馈内容无效。');
  const item = value as Record<string, unknown>;
  for (const key of ['answer', 'observations', 'stuck']) if (typeof item[key] !== 'string' || (item[key] as string).length > 8000) throw new Error('学习反馈单项最多 8000 字。');
  if (![1, 2, 3].includes(item.confidence as number)) throw new Error('学习自评无效。');
  return { answer: item.answer as string, observations: item.observations as string, stuck: item.stuck as string, confidence: item.confidence as 1 | 2 | 3 };
}
export function feedbackContent(entry: StudyFeedbackContent): StudyFeedbackContent { return content(entry); }
export function parseStudyFeedback(value: unknown): StudyFeedbackStore {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('学习反馈存档无效。');
  const raw = value as { version?: unknown; entries?: unknown };
  if (raw.version !== 1 || !raw.entries || typeof raw.entries !== 'object' || Array.isArray(raw.entries) || Object.keys(raw.entries).length > MAX_ENTRIES) throw new Error('学习反馈存档格式不受支持。');
  const entries: Record<string, StudyFeedbackEntry> = {};
  for (const [id, value] of Object.entries(raw.entries)) {
    if (!validId(id) || !value || typeof value !== 'object') throw new Error('学习反馈步骤无效。');
    const item = value as StudyFeedbackEntry;
    if (typeof item.updatedAt !== 'string' || !Number.isFinite(Date.parse(item.updatedAt)) || !Number.isSafeInteger(item.revision) || item.revision < 1 || !Number.isInteger(item.reviewStage) || item.reviewStage < 0 || item.reviewStage > 4 || (item.nextReviewAt !== null && (typeof item.nextReviewAt !== 'string' || !Number.isFinite(Date.parse(item.nextReviewAt))))) throw new Error('学习反馈时间或版本无效。');
    const alternatives = item.alternatives === undefined ? [] : item.alternatives;
    if (!Array.isArray(alternatives) || alternatives.length > 5) throw new Error('学习反馈冲突副本过多，请先处理冲突。');
    entries[id] = { ...content(item), updatedAt: new Date(item.updatedAt).toISOString(), revision: item.revision, reviewStage: item.reviewStage, nextReviewAt: item.nextReviewAt === null ? null : new Date(item.nextReviewAt).toISOString(), alternatives: alternatives.map(content) };
  }
  const result: StudyFeedbackStore = { version: 1, entries };
  if (new TextEncoder().encode(JSON.stringify(result)).length > MAX_BYTES) throw new Error('学习反馈超过 512 KB，请先备份并精简记录。');
  return result;
}
export function readStudyFeedback(storage: FeedbackStorage = localStorage): StudyFeedbackStore {
  const raw = storage.getItem(STUDY_FEEDBACK_KEY);
  if (raw === null) return emptyStudyFeedback();
  try { return parseStudyFeedback(JSON.parse(raw)); } catch (cause) { throw new Error('学习反馈存档无法读取，原文未覆盖：' + (cause as Error).message); }
}
const DAYS = [1, 3, 7, 14, 30];
export function reviewIntervalDays(confidence: 1 | 2 | 3, stage: number): number { return DAYS[Math.min(4, Math.max(0, stage + confidence - 1))]; }
export async function saveStudyFeedback(id: string, value: StudyFeedbackContent, expected: StudyFeedbackEntry | null, action: 'save' | 'schedule' | 'review' | 'resolve' = 'save', storage: FeedbackStorage = localStorage, now = new Date()): Promise<StudyFeedbackEntry> {
  if (!validId(id) || !Number.isFinite(now.getTime())) throw new Error('学习步骤或时间无效。');
  const input = content(value);
  const write = () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const raw = storage.getItem(STUDY_FEEDBACK_KEY), store = raw === null ? emptyStudyFeedback() : parseStudyFeedback(JSON.parse(raw)), current = store.entries[id] || null;
      if (!same(current, expected)) throw new Error('另一页面或云同步已修改本步骤。你的输入未覆盖，请导出或复制后重新读取。');
      if (current?.alternatives.length && action !== 'resolve') throw new Error('本步骤有同步冲突副本，请先核对并处理。');
      const updatedAt = new Date(Math.max(now.getTime(), current ? Date.parse(current.updatedAt) + 1 : 0)).toISOString();
      const stage = action === 'review' ? input.confidence === 1 ? 0 : Math.min(4, (current?.reviewStage || 0) + 1) : current?.reviewStage || 0;
      const scheduled = action === 'schedule' || action === 'review';
      const next: StudyFeedbackEntry = { ...input, revision: (current?.revision || 0) + 1, updatedAt, reviewStage: stage, nextReviewAt: scheduled ? new Date(now.getTime() + reviewIntervalDays(input.confidence, stage) * 86_400_000).toISOString() : current?.nextReviewAt || null, alternatives: action === 'resolve' ? [] : current?.alternatives || [] };
      const serialized = JSON.stringify(parseStudyFeedback({ version: 1, entries: { ...store.entries, [id]: next } }));
      if (storage.getItem(STUDY_FEEDBACK_KEY) !== raw) continue;
      storage.setItem(STUDY_FEEDBACK_KEY, serialized);
      if (storage.getItem(STUDY_FEEDBACK_KEY) !== serialized) throw new Error('其他页面同时保存了反馈，本次结果未确认，请重新读取。');
      if (typeof window !== 'undefined') window.dispatchEvent(new Event(STUDY_FEEDBACK_EVENT));
      return next;
    }
    throw new Error('其他页面正在修改学习记录，请稍后再试。');
  };
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  // Resolve the lock callback on both paths, then surface errors outside the lock.
  const attempt = () => { try { return { entry: write() }; } catch (error) { return { error }; } };
  const result = locks ? await locks.request(STUDY_FEEDBACK_KEY, attempt) : attempt();
  if ('error' in result) throw result.error;
  return result.entry;
}
/** Merge per step; preserve differing concurrent notes as visible alternatives. */
export function mergeStudyFeedback(left: StudyFeedbackStore, right: StudyFeedbackStore, base?: StudyFeedbackStore | null): StudyFeedbackStore {
  const entries: Record<string, StudyFeedbackEntry> = {};
  for (const id of new Set([...Object.keys(left.entries), ...Object.keys(right.entries)])) {
    const a = left.entries[id], b = right.entries[id], old = base?.entries[id];
    if (!a || !b || same(a, b)) { entries[id] = a || b; continue; }
    if (same(a, old)) { entries[id] = b; continue; } if (same(b, old)) { entries[id] = a; continue; }
    const newest = Date.parse(a.updatedAt) > Date.parse(b.updatedAt) || (a.updatedAt === b.updatedAt && JSON.stringify(a) > JSON.stringify(b)) ? a : b, other = newest === a ? b : a;
    const alternatives = new Map<string, StudyFeedbackContent>();
    for (const candidate of [...newest.alternatives, ...other.alternatives, feedbackContent(other)]) if (!same(candidate, feedbackContent(newest))) alternatives.set(JSON.stringify(candidate), candidate);
    if (alternatives.size > 5) throw new Error('学习反馈冲突副本超过 5 份，请先在设备上处理后再同步。');
    entries[id] = { ...newest, alternatives: [...alternatives.values()].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y))) };
  }
  return parseStudyFeedback({ version: 1, entries });
}
