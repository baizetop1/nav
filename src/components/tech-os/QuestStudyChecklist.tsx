import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Check, Circle, RefreshCw, ShieldCheck } from 'lucide-react';
import type { TechOsEntity } from '../../types/tech-os';
import { extractQuestStudyTasks, readStudyProgressStore, setQuestStudyTaskCompleted, TECH_OS_STUDY_PROGRESS_KEY, TECH_OS_STUDY_PROGRESS_UPDATED_EVENT } from '../../services/techOsStudyProgress';

interface ChecklistState { questId: string; completedTaskIds: string[]; error: string }
interface PendingStudyChange { taskId: string; completed: boolean }

function readChecklist(questId: string): ChecklistState {
  try {
    const tasks = readStudyProgressStore().quests[questId] || {};
    return { questId, completedTaskIds: Object.keys(tasks).filter(id => tasks[id].completed), error: '' };
  } catch (error) {
    return { questId, completedTaskIds: [], error: error instanceof Error ? error.message : '读取本机学习进度失败，请重试。' };
  }
}

export function QuestStudyChecklist({ quest, onReadStep }: { quest: TechOsEntity; onReadStep?: (taskId: string) => void }) {
  const tasks = useMemo(() => extractQuestStudyTasks(quest.body), [quest.body]);
  const [state, setState] = useState(() => readChecklist(quest.id));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [pending, setPending] = useState<PendingStudyChange | null>(null);
  const savingRef = useRef(false);
  const operationRef = useRef(0);
  const availableTaskIds = useMemo(() => new Set(tasks.map(task => task.id)), [tasks]);
  const currentState = state.questId === quest.id ? state : { questId: quest.id, completedTaskIds: [], error: '' };
  const completed = currentState.completedTaskIds.filter(id => availableTaskIds.has(id));
  const completedSet = new Set(completed);
  const nextTask = tasks.find(task => !completedSet.has(task.id));
  const allChecked = tasks.length > 0 && completed.length === tasks.length;
  const progress = tasks.length ? Math.round(completed.length / tasks.length * 100) : 0;

  const refresh = () => {
    const next = readChecklist(quest.id);
    // A transient read failure must not visually erase the last confirmed progress.
    setState(previous => next.error && previous.questId === quest.id ? { ...previous, error: next.error } : next);
  };

  useEffect(() => {
    operationRef.current += 1;
    savingRef.current = false;
    setSaving(false);
    setSaveError('');
    setPending(null);
    const read = () => {
      const next = readChecklist(quest.id);
      setState(previous => next.error && previous.questId === quest.id ? { ...previous, error: next.error } : next);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === TECH_OS_STUDY_PROGRESS_KEY) read();
    };
    read();
    window.addEventListener(TECH_OS_STUDY_PROGRESS_UPDATED_EVENT, read);
    window.addEventListener('storage', onStorage);
    return () => {
      operationRef.current += 1;
      window.removeEventListener(TECH_OS_STUDY_PROGRESS_UPDATED_EVENT, read);
      window.removeEventListener('storage', onStorage);
    };
  }, [quest.id]);

  const save = async (change: PendingStudyChange) => {
    if (savingRef.current) return;
    savingRef.current = true;
    const operation = ++operationRef.current;
    setSaving(true);
    setSaveError('');
    setPending(change);
    const result = await setQuestStudyTaskCompleted(quest.id, change.taskId, change.completed);
    if (operation !== operationRef.current) return;
    savingRef.current = false;
    setSaving(false);
    if (result.store) setState({ questId: quest.id, completedTaskIds: result.completedTaskIds, error: '' });
    if (result.saved) {
      setPending(null);
      setSaveError('');
    } else {
      setSaveError(result.error || '打卡尚未保存，请重试。');
      if (!result.store) refresh();
    }
  };

  if (!tasks.length) return null;

  return <section aria-label="学习打卡" className="mb-6 rounded-2xl border border-[#5f8f84]/15 bg-[#5f8f84]/5 p-4 dark:border-[#c9a96b]/15 dark:bg-[#c9a96b]/5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64807c]">学习打卡 · 本机保存 · 可加密同步</p>
        <h3 className="mt-1 font-bold">{currentState.error ? '学习进度暂不可确认' : `${completed.length}/${tasks.length} 个步骤已完成`}</h3>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${allChecked && !currentState.error ? 'bg-[#356b66] text-white dark:bg-[#c9a96b] dark:text-[#102c33]' : 'bg-[#5f8f84]/10 text-[#356b66] dark:bg-[#c9a96b]/10 dark:text-[#e1ca91]'}`}>{saving ? '正在保存…' : currentState.error ? '读取失败' : allChecked ? '已达到打卡条件' : `${progress}%`}</span>
    </div>
    {currentState.error && <div role="alert" className="mt-3 rounded-xl border border-[#985247]/25 bg-[#985247]/5 p-3 text-sm"><p>{currentState.error}</p><button type="button" className="baize-button-secondary mt-2" disabled={saving} onClick={refresh}><RefreshCw size={14} />重试读取打卡</button></div>}
    {saveError && pending && <div role="alert" className="mt-3 rounded-xl border border-[#985247]/25 bg-[#985247]/5 p-3 text-sm"><p>{pending.taskId} {pending.completed ? '打卡' : '取消打卡'}未确认保存：{saveError}</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" className="baize-button-secondary" disabled={saving} onClick={() => void save(pending)}><RefreshCw size={14} />重试保存打卡</button><button type="button" className="baize-button-secondary" disabled={saving} onClick={() => { setPending(null); setSaveError(''); }}>放弃此次操作</button></div></div>}
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#5f8f84]/10 dark:bg-[#c9a96b]/10"><div className="h-full rounded-full bg-[#356b66] transition-all dark:bg-[#c9a96b]" style={{ width: `${progress}%` }} /></div>
    {onReadStep && nextTask && !currentState.error && <button type="button" className="baize-button-secondary mt-3" onClick={() => onReadStep(nextTask.id)}><BookOpen size={15} />继续学习 {nextTask.id}</button>}
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {tasks.map(task => {
        const isChecked = completedSet.has(task.id);
        const Icon = isChecked ? Check : Circle;
        return <div key={task.id} className={`flex items-stretch gap-2 rounded-xl border p-2 transition ${isChecked ? 'border-[#356b66]/30 bg-[#356b66]/8 dark:border-[#c9a96b]/30 dark:bg-[#c9a96b]/8' : 'border-[#5f8f84]/10 bg-white/35 dark:border-[#c9a96b]/10 dark:bg-black/5'}`}>
          <button type="button" data-study-task={task.id} aria-pressed={isChecked} aria-label={`完成 ${task.id}`} disabled={saving || !!currentState.error || !!saveError} onClick={() => void save({ taskId: task.id, completed: !isChecked })} className="flex min-w-0 flex-1 items-start gap-3 rounded-lg p-1 text-left transition hover:bg-[#5f8f84]/5 disabled:cursor-not-allowed disabled:opacity-60"><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isChecked ? 'bg-[#356b66] text-white dark:bg-[#c9a96b] dark:text-[#102c33]' : 'text-[#8aa09c]'}`}><Icon size={14} /></span><span className="min-w-0"><strong className="block text-xs">{task.id} · {isChecked ? '已打卡' : '打卡完成'}</strong><span className={`mt-0.5 block text-sm leading-5 ${isChecked ? 'text-[#64807c] line-through dark:text-[#9dafaa]' : ''}`}>{task.title}</span></span></button>
          {onReadStep && <button type="button" className="shrink-0 self-center rounded-lg px-2 py-2 text-xs font-semibold text-[#356b66] hover:bg-[#5f8f84]/10 dark:text-[#e1ca91]" onClick={() => onReadStep(task.id)} aria-label={`阅读 ${task.id}`}>阅读 {task.id}</button>}
        </div>;
      })}
    </div>
    <div className={`mt-4 flex items-start gap-2 rounded-xl p-3 text-xs leading-5 ${allChecked && !currentState.error ? 'bg-[#356b66]/10 text-[#315e5b] dark:bg-[#c9a96b]/10 dark:text-[#d9ccb0]' : 'bg-white/45 text-[#64807c] dark:bg-black/10 dark:text-[#b8c6c1]'}`}><ShieldCheck size={16} className="mt-0.5 shrink-0" /><p>{currentState.error ? '无法读取存档时不会重置或覆盖已有进度；仍可通过“阅读”查看步骤。' : quest.status === 'completed' ? '仓库中的 Quest 已正式标记为完成。' : allChecked ? '本地步骤已全部打卡。在本页下方“完成任务 / 启用下一路线”填写结论与证据，再确认提交正式完成；打卡本身不会更改正式进度。' : `下一步：完成 ${nextTask?.id}。阅读不会自动打卡，每一步的“完成标志”写在下方正文中。`}</p></div>
  </section>;
}
