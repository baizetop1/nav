import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import type { TechOsEntity } from '../../types/tech-os';
import { extractQuestStudyTasks, readStudyProgressStore, TECH_OS_STUDY_PROGRESS_KEY, TECH_OS_STUDY_PROGRESS_UPDATED_EVENT, type StudyProgressStore } from '../../services/techOsStudyProgress';

function readProgress(): { store: StudyProgressStore | null; error: string } {
  try { return { store: readStudyProgressStore(), error: '' }; }
  catch { return { store: null, error: '暂时无法读取学习打卡，原有记录不会被覆盖。请检查浏览器存储后重试。' }; }
}

export function TechOsStudyResume({ quest, onResume }: { quest?: TechOsEntity; onResume: (questId: string, stepId?: string) => void }) {
  const [progress, setProgress] = useState(readProgress);
  const tasks = useMemo(() => extractQuestStudyTasks(quest?.body || ''), [quest?.body]);
  useEffect(() => {
    const refresh = () => setProgress(readProgress());
    const external = (event: StorageEvent) => { if (event.key === TECH_OS_STUDY_PROGRESS_KEY || event.key === null) refresh(); };
    window.addEventListener(TECH_OS_STUDY_PROGRESS_UPDATED_EVENT, refresh);
    window.addEventListener('storage', external);
    return () => { window.removeEventListener(TECH_OS_STUDY_PROGRESS_UPDATED_EVENT, refresh); window.removeEventListener('storage', external); };
  }, []);
  const savedTasks = quest ? progress.store?.quests[quest.id] || {} : {};
  const completed = tasks.filter(task => savedTasks[task.id]?.completed).length;
  const next = tasks.find(task => !savedTasks[task.id]?.completed);
  return <section className="baize-panel min-w-0 rounded-2xl p-5 sm:p-6" aria-label="继续学习">
    <p className="text-xs font-semibold tracking-[0.16em] text-[#64807c]">今天从这里继续</p>
    <h2 className="mt-2 text-xl font-bold">{quest?.title || '没有进行中的核心问题'}</h2>
    {quest && <>
      <p className="mt-2 text-xs text-[#718986]">{quest.id} · 个人打卡与仓库正式完成状态分开</p>
      {progress.error ? <div role="alert" className="mt-4 text-sm text-[#a85d50]"><p>{progress.error}</p><button type="button" className="baize-button-secondary mt-2" onClick={() => setProgress(readProgress())}><RefreshCw size={14} />重试读取打卡</button></div> : tasks.length > 0 ? <>
        <p className="mt-4 text-sm font-semibold">个人步骤 {completed}/{tasks.length}</p>
        <progress aria-label="个人学习步骤进度" className="mt-2 h-2 w-full accent-[#356b66]" value={completed} max={tasks.length} />
        <p className="mt-3 text-sm leading-6 text-[#64807c] dark:text-[#b8c6c1]">{next ? `接下来：${next.id} · ${next.title}` : '步骤已全部打卡，可以回看结论与证据；这不会自动宣布任务完成。'}</p>
      </> : <p className="mt-4 text-sm text-[#718986]">当前任务还没有分步清单，可打开正文继续学习。</p>}
      <button type="button" className="baize-button-primary mt-5" onClick={() => onResume(quest.id, progress.error ? undefined : next?.id)}>{progress.error || !tasks.length ? '打开当前任务' : next ? `继续学习 ${next.id}` : '回看当前任务'}<ArrowRight size={16} /></button>
    </>}
  </section>;
}
