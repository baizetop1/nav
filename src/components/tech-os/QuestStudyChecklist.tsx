import { useEffect, useMemo, useState } from 'react';
import { Check, Circle, ShieldCheck } from 'lucide-react';
import type { TechOsEntity } from '../../types/tech-os';
import { extractQuestStudyTasks, loadQuestStudyProgress, TECH_OS_STUDY_PROGRESS_UPDATED_EVENT, toggleQuestStudyTask } from '../../services/techOsStudyProgress';

export function QuestStudyChecklist({ quest }: { quest: TechOsEntity }) {
  const tasks = useMemo(() => extractQuestStudyTasks(quest.body), [quest.body]);
  const [completedTaskIds, setCompletedTaskIds] = useState(() => loadQuestStudyProgress(quest.id));
  const availableTaskIds = useMemo(() => new Set(tasks.map(task => task.id)), [tasks]);
  const completed = completedTaskIds.filter(id => availableTaskIds.has(id));
  const completedSet = new Set(completed);
  const allChecked = tasks.length > 0 && completed.length === tasks.length;
  const progress = tasks.length ? Math.round(completed.length / tasks.length * 100) : 0;

  useEffect(() => {
    const refresh = () => setCompletedTaskIds(loadQuestStudyProgress(quest.id));
    refresh();
    window.addEventListener(TECH_OS_STUDY_PROGRESS_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(TECH_OS_STUDY_PROGRESS_UPDATED_EVENT, refresh);
  }, [quest.id]);

  if (!tasks.length) return null;

  const toggle = (taskId: string) => {
    setCompletedTaskIds(toggleQuestStudyTask(quest.id, taskId));
  };

  return <section className="mb-6 rounded-2xl border border-[#5f8f84]/15 bg-[#5f8f84]/5 p-4 dark:border-[#c9a96b]/15 dark:bg-[#c9a96b]/5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64807c]">学习打卡 · 本机立即保存 · 可加密同步</p>
        <h3 className="mt-1 font-bold">{completed.length}/{tasks.length} 个步骤已完成</h3>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${allChecked ? 'bg-[#356b66] text-white dark:bg-[#c9a96b] dark:text-[#102c33]' : 'bg-[#5f8f84]/10 text-[#356b66] dark:bg-[#c9a96b]/10 dark:text-[#e1ca91]'}`}>{allChecked ? '已达到打卡条件' : `${progress}%`}</span>
    </div>
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#5f8f84]/10 dark:bg-[#c9a96b]/10"><div className="h-full rounded-full bg-[#356b66] transition-all dark:bg-[#c9a96b]" style={{ width: `${progress}%` }} /></div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {tasks.map(task => {
        const isChecked = completedSet.has(task.id);
        const Icon = isChecked ? Check : Circle;
        return <button key={task.id} type="button" aria-pressed={isChecked} onClick={() => toggle(task.id)} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${isChecked ? 'border-[#356b66]/30 bg-[#356b66]/8 dark:border-[#c9a96b]/30 dark:bg-[#c9a96b]/8' : 'border-[#5f8f84]/10 bg-white/35 hover:border-[#5f8f84]/35 dark:border-[#c9a96b]/10 dark:bg-black/5 dark:hover:border-[#c9a96b]/30'}`}><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isChecked ? 'bg-[#356b66] text-white dark:bg-[#c9a96b] dark:text-[#102c33]' : 'text-[#8aa09c]'}`}><Icon size={14} /></span><span><strong className="block text-xs">{task.id}</strong><span className={`mt-0.5 block text-sm leading-5 ${isChecked ? 'text-[#64807c] line-through dark:text-[#9dafaa]' : ''}`}>{task.title}</span></span></button>;
      })}
    </div>
    <div className={`mt-4 flex items-start gap-2 rounded-xl p-3 text-xs leading-5 ${allChecked ? 'bg-[#356b66]/10 text-[#315e5b] dark:bg-[#c9a96b]/10 dark:text-[#d9ccb0]' : 'bg-white/45 text-[#64807c] dark:bg-black/10 dark:text-[#b8c6c1]'}`}><ShieldCheck size={16} className="mt-0.5 shrink-0" /><p>{quest.status === 'completed' ? '仓库中的 Quest 已正式标记为完成。' : allChecked ? '本地步骤已全部打卡。补齐流程图、实验记录和“当前结论”后，再把 Quest 的 status 改为 completed；打卡本身不会伪造正式进度。' : `下一步：完成 ${tasks.find(task => !completedSet.has(task.id))?.id}。每一步的“完成标志”写在下方正文中。`}</p></div>
  </section>;
}
