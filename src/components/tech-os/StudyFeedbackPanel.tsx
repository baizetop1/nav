import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { STUDY_LEAVE_EVENT } from '../../lib/studyEditingGuard';
import { emptyFeedbackContent, feedbackContent, feedbackId, readStudyFeedback, reviewIntervalDays, saveStudyFeedback, STUDY_FEEDBACK_EVENT, STUDY_FEEDBACK_KEY, type StudyFeedbackContent, type StudyFeedbackEntry } from '../../services/studyFeedback';
const labels = { answer: '我的回答', observations: '实际观察 / 证据', stuck: '卡住的地方 / 待验证问题' } as const;
const confidenceLabels = { 1: '还不清楚', 2: '能照着做', 3: '能独立解释' } as const;
export function StudyFeedbackPanel({ questId, stepId }: { questId: string; stepId: string }) {
  const id = feedbackId(questId, stepId);
  const [loaded, setLoaded] = useState<{ entry: StudyFeedbackEntry | null; error: string }>(() => { try { return { entry: readStudyFeedback().entries[id] || null, error: '' }; } catch (cause) { return { entry: null, error: (cause as Error).message }; } });
  const [form, setForm] = useState<StudyFeedbackContent>(() => loaded.entry ? feedbackContent(loaded.entry) : emptyFeedbackContent());
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const dirty = JSON.stringify(form) !== JSON.stringify(loaded.entry ? feedbackContent(loaded.entry) : emptyFeedbackContent());
  const dirtyRef = useRef(dirty), busyRef = useRef(busy); dirtyRef.current = dirty; busyRef.current = busy;
  const refresh = () => { try { const entry = readStudyFeedback().entries[id] || null; setLoaded({ entry, error: '' }); setForm(entry ? feedbackContent(entry) : emptyFeedbackContent()); setMessage('已重新读取本机记录。'); } catch (cause) { setMessage((cause as Error).message); } };
  useEffect(() => {
    const leave = (event: Event) => { if (!dirtyRef.current && !busyRef.current) return; event.preventDefault(); setMessage('本步骤的输入尚未保存。请先保存、导出，或重新读取以明确放弃修改。'); document.getElementById('study-feedback-' + id)?.scrollIntoView({ block: 'center' }); };
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirtyRef.current || busyRef.current) { event.preventDefault(); event.returnValue = ''; } };
    const changed = () => {
      if (busyRef.current) return;
      if (dirtyRef.current) { setMessage('学习记录有更新。本页输入仍保留，保存前会检查版本。'); return; }
      try { const entry = readStudyFeedback().entries[id] || null; setLoaded({ entry, error: '' }); setForm(entry ? feedbackContent(entry) : emptyFeedbackContent()); } catch (cause) { setLoaded(previous => ({ ...previous, error: (cause as Error).message })); }
    };
    const storage = (event: StorageEvent) => { if (!event.key || event.key === STUDY_FEEDBACK_KEY) changed(); };
    window.addEventListener(STUDY_LEAVE_EVENT, leave); window.addEventListener('beforeunload', beforeUnload); window.addEventListener('storage', storage); window.addEventListener(STUDY_FEEDBACK_EVENT, changed); window.addEventListener('baize-shared-workspace-updated', changed);
    return () => { window.removeEventListener(STUDY_LEAVE_EVENT, leave); window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('storage', storage); window.removeEventListener(STUDY_FEEDBACK_EVENT, changed); window.removeEventListener('baize-shared-workspace-updated', changed); };
  }, [id]);
  const save = async (action: 'save' | 'schedule' | 'resolve') => {
    busyRef.current = true; setBusy(true); setMessage('');
    try { const entry = await saveStudyFeedback(id, form, loaded.entry, action); setLoaded({ entry, error: '' }); setForm(feedbackContent(entry)); setMessage(action === 'schedule' ? '反馈已保存，已安排下次复习。' : '反馈已保存到本机，未修改打卡或正式任务状态。'); }
    catch (cause) { setMessage('保存失败，输入仍在本页：' + (cause as Error).message); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const download = () => { const url = URL.createObjectURL(new Blob([JSON.stringify({ questId, stepId, feedback: form, source: loaded.entry }, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = questId + '-' + stepId + '-feedback.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  return <section id={'study-feedback-' + id} aria-label="步骤学习反馈" className="min-w-0 space-y-3 rounded-2xl border appearance-border appearance-soft p-4">
    <h3 className="font-bold">把这一步讲给自己听</h3><p className="text-xs leading-5 appearance-muted">先自己回答“检查理解”，再核对参考答案。记录不会自动判分或打卡。输入需点击保存；记录纳入完整备份，也可随 Inbox 加密同步，不会写入公开教案。</p>
    {loaded.error && <p role="alert" className="text-xs text-[#985247]">{loaded.error} 可导出本页输入后恢复存档。</p>}
    <fieldset disabled={busy} className="min-w-0 space-y-3">{(['answer', 'observations', 'stuck'] as const).map(key => <label key={key} className="block text-xs font-semibold">{labels[key]}<textarea aria-label={labels[key]} rows={key === 'answer' ? 4 : 3} maxLength={8000} className="baize-input mt-1 resize-y text-sm font-normal" value={form[key]} placeholder={key === 'answer' ? '不照抄答案，用自己的话解释…' : key === 'observations' ? '做了什么、看到了什么；可附证据链接…' : '预期与实际有什么不同，下次要试什么…'} onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>)}<label className="block text-xs font-semibold">我的自评<select aria-label="学习掌握自评" className="baize-input mt-1" value={form.confidence} onChange={event => setForm({ ...form, confidence: Number(event.target.value) as 1 | 2 | 3 })}>{([1, 2, 3] as const).map(value => <option key={value} value={value}>{confidenceLabels[value]}</option>)}</select></label></fieldset>
    <p className="text-xs appearance-muted">{loaded.entry?.nextReviewAt ? '已安排：' + new Date(loaded.entry.nextReviewAt).toLocaleString('zh-CN') : '尚未安排复习'} · 首次按自评间隔 1 / 3 / 7 天；复习后逐步延长，最长 30 天。</p>
    {Boolean(loaded.entry?.alternatives.length) && <div role="alert" className="space-y-3 rounded-xl border border-[#b77960]/50 p-3"><p className="text-sm font-semibold">同步保留了不同的笔记副本，请核对</p>{loaded.entry!.alternatives.map((item, index) => <details key={index}><summary className="cursor-pointer text-xs">冲突副本 {index + 1}</summary><pre className="my-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{'回答：' + item.answer + '\n观察：' + item.observations + '\n卡点：' + item.stuck + '\n自评：' + confidenceLabels[item.confidence]}</pre><button type="button" className="baize-button-secondary text-xs" disabled={busy} onClick={() => setForm(item)}>填入此副本（尚未保存）</button></details>)}<button type="button" className="baize-button-secondary text-xs" disabled={busy} onClick={() => { if (window.confirm('确认已经导出需要保留的冲突副本？保存当前输入后会清除本步骤的冲突副本。')) void save('resolve'); }}>已核对，保存当前反馈并清除冲突副本</button></div>}
    <div className="flex flex-wrap gap-2"><button type="button" className="baize-button-primary" disabled={busy || Boolean(loaded.error) || Boolean(loaded.entry?.alternatives.length)} onClick={() => void save('save')}>保存学习反馈</button><button type="button" className="baize-button-secondary" disabled={busy || Boolean(loaded.error) || Boolean(loaded.entry?.alternatives.length)} onClick={() => void save('schedule')}>保存并安排 {reviewIntervalDays(form.confidence, loaded.entry?.reviewStage || 0)} 天后复习</button><button type="button" className="baize-button-secondary" onClick={download}><Download size={14} />导出反馈</button><button type="button" className="baize-button-secondary" disabled={busy} onClick={() => { if (!dirty || window.confirm('重新读取会放弃本页尚未保存的反馈。确认？')) refresh(); }}>重新读取</button></div>
    <p role="status" className="break-words text-xs">{busy ? '正在保存…' : message || (dirty ? '有未保存输入' : '本页与已保存记录一致')}</p>
  </section>;
}
