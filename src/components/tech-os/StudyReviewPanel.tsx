import { useEffect, useMemo, useState } from 'react';
import type { TechOsEntity } from '../../types/tech-os';
import { parseQuestCoaching } from '../../services/techOsCoaching';
import { emptyStudyFeedback, feedbackContent, readStudyFeedback, saveStudyFeedback, STUDY_FEEDBACK_EVENT, STUDY_FEEDBACK_KEY, type StudyFeedbackStore } from '../../services/studyFeedback';
export function StudyReviewPanel({ quests, onOpenStep }: { quests: TechOsEntity[]; onOpenStep: (questId: string, stepId: string) => void }) {
  const [store, setStore] = useState<StudyFeedbackStore>(emptyStudyFeedback), [error, setError] = useState(''), [message, setMessage] = useState(''), [now, setNow] = useState(Date.now), [all, setAll] = useState(false), [busy, setBusy] = useState(''), [ratings, setRatings] = useState<Record<string, 1 | 2 | 3>>({});
  useEffect(() => {
    const refresh = () => { try { setStore(readStudyFeedback()); setError(''); } catch (cause) { setError((cause as Error).message); } };
    const storage = (event: StorageEvent) => { if (!event.key || event.key === STUDY_FEEDBACK_KEY) refresh(); };
    refresh(); const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    window.addEventListener('storage', storage); window.addEventListener(STUDY_FEEDBACK_EVENT, refresh); window.addEventListener('baize-shared-workspace-updated', refresh);
    return () => { clearInterval(timer); window.removeEventListener('storage', storage); window.removeEventListener(STUDY_FEEDBACK_EVENT, refresh); window.removeEventListener('baize-shared-workspace-updated', refresh); };
  }, []);
  const byId = useMemo(() => new Map(quests.map(quest => [quest.id, { quest, guide: parseQuestCoaching(quest.body) }])), [quests]);
  const records = Object.entries(store.entries).sort(([, a], [, b]) => (a.nextReviewAt ? Date.parse(a.nextReviewAt) : Infinity) - (b.nextReviewAt ? Date.parse(b.nextReviewAt) : Infinity));
  const due = records.filter(([, entry]) => entry.nextReviewAt && Date.parse(entry.nextReviewAt) <= now), visible = all ? records : due;
  const review = async (id: string) => {
    const current = store.entries[id]; if (!current) return; setBusy(id); setMessage('');
    try { const entry = await saveStudyFeedback(id, { ...feedbackContent(current), confidence: ratings[id] || current.confidence }, current, 'review'); setMessage('复习已记录，下次安排在 ' + new Date(entry.nextReviewAt!).toLocaleString('zh-CN') + '。不会自动完成任务。'); }
    catch (cause) { setMessage('记录失败：' + (cause as Error).message); } finally { setBusy(''); }
  };
  return <section aria-label="学习复习清单" className="min-w-0 space-y-4"><div className="baize-panel space-y-3 rounded-2xl p-5"><h2 className="text-xl font-bold">复习，把“做过”变成“能解释”</h2><p className="text-sm leading-6 appearance-muted">先不看答案，回想自己的解释和实验观察，再打开原步骤核对。根据新的自评记录一次复习；不会自动判定掌握。</p><div className="flex flex-wrap gap-2"><button type="button" className="baize-button-secondary" aria-pressed={!all} onClick={() => setAll(false)}>到期 {due.length}</button><button type="button" className="baize-button-secondary" aria-pressed={all} onClick={() => setAll(true)}>全部记录 {records.length}</button></div></div>
    {error && <p role="alert">{error}</p>}{message && <p role="status" className="text-sm">{message}</p>}
    {!visible.length && !error && <p className="baize-panel rounded-2xl p-5 text-sm">{all ? '还没有学习反馈。在任务逐步辅导中记录一次自己的回答，再安排复习。' : '当前没有到期复习。可查看全部记录，或在任务中安排第一次复习。'}</p>}
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">{visible.map(([id, entry]) => {
      const [questId, stepId] = id.split('/'), context = byId.get(questId), step = context?.guide.steps.find(item => item.id === stepId);
      return <article key={id} className="baize-panel min-w-0 space-y-3 rounded-2xl p-4"><h3 className="font-bold">{context?.quest.title || questId} · {stepId}{step ? ' ' + step.title : ''}</h3><p className="text-xs appearance-muted">{entry.nextReviewAt ? (Date.parse(entry.nextReviewAt) <= now ? '已到期 · ' : '下次 · ') + new Date(entry.nextReviewAt).toLocaleString('zh-CN') : '未安排复习'} · 第 {entry.reviewStage} 阶段</p><details><summary className="cursor-pointer text-xs">展开我的笔记（先尝试回想）</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{'回答：' + entry.answer + '\n\n观察：' + entry.observations + '\n\n卡点：' + entry.stuck}</pre></details>
        {entry.alternatives.length > 0 && <p className="text-xs text-[#985247]">有 {entry.alternatives.length} 份不同笔记，先打开步骤核对。</p>}
        <div className="flex flex-wrap gap-2"><button type="button" className="baize-button-secondary text-xs" disabled={!context || !step} onClick={() => onOpenStep(questId, stepId)}>返回原步骤</button><select className="baize-input w-auto text-xs" aria-label={id + '复习自评'} value={ratings[id] || entry.confidence} onChange={event => setRatings({ ...ratings, [id]: Number(event.target.value) as 1 | 2 | 3 })}><option value={1}>仍不清楚</option><option value={2}>能照着做</option><option value={3}>能独立解释</option></select><button type="button" className="baize-button-primary text-xs" disabled={Boolean(busy) || Boolean(entry.alternatives.length)} onClick={() => void review(id)}>{busy === id ? '保存中…' : '记录本次复习'}</button></div>
        {(!context || !step) && <p className="text-xs appearance-muted">教案当前不存在或已移除该步骤；笔记仍保留。</p>}
      </article>;
    })}</div>
  </section>;
}
