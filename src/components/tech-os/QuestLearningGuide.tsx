import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, Wrench } from 'lucide-react';
import type { TechOsEntity } from '../../types/tech-os';
import { assessQuestCoaching, parseQuestCoaching } from '../../services/techOsCoaching';
import { readStudyProgressStore } from '../../services/techOsStudyProgress';
import { focusTechOsStudyStep, TECH_OS_READ_STEP_EVENT } from '../../services/techOsWorkspaceView';
import { MarkdownView } from './MarkdownView';
import { QuestStudyChecklist } from './QuestStudyChecklist';
import { StudyFeedbackPanel } from './StudyFeedbackPanel';
import { canLeaveStudyFeedback } from '../../lib/studyEditingGuard';

export function QuestLearningGuide({ quest }: { quest: TechOsEntity }) {
  const guide = useMemo(() => parseQuestCoaching(quest.body), [quest.body]);
  const readiness = useMemo(() => assessQuestCoaching(quest.body), [quest.body]);
  const [mode, setMode] = useState<'guided' | 'full'>(() => guide.available ? 'guided' : 'full');
  const [stepId, setStepId] = useState(() => {
    try {
      const progress = readStudyProgressStore().quests[quest.id] || {};
      return guide.steps.find(step => !progress[step.id]?.completed)?.id || guide.steps[0]?.id || '';
    } catch { return guide.steps[0]?.id || ''; }
  });
  const [readingTarget, setReadingTarget] = useState<{ id: string } | null>(null);
  const selected = guide.steps.find(step => step.id === stepId) || guide.steps[0];
  const selectedIndex = guide.steps.indexOf(selected);
  const goToStep = (id: string) => { if (!canLeaveStudyFeedback()) return; setStepId(id); setReadingTarget({ id }); };

  useEffect(() => {
    const read = (event: Event) => {
      const { questId, stepId: requested } = (event as CustomEvent<{ questId: string; stepId: string }>).detail;
      if (questId !== quest.id || mode !== 'guided' || !guide.available || !guide.steps.some(step => step.id === requested)) return;
      event.preventDefault();
      if (!canLeaveStudyFeedback()) return;
      setStepId(requested);
      setReadingTarget({ id: requested });
    };
    window.addEventListener(TECH_OS_READ_STEP_EVENT, read);
    return () => window.removeEventListener(TECH_OS_READ_STEP_EVENT, read);
  }, [quest.id, guide, mode]);
  useEffect(() => {
    if (!readingTarget) return;
    const frame = requestAnimationFrame(() => {
      const heading = document.getElementById(`${quest.id}-step-${readingTarget.id}`);
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      setReadingTarget(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [readingTarget, quest.id, mode]);

  return <section aria-label="任务学习辅导" className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="flex items-center gap-2 font-bold"><BookOpen size={18} />跟着做，再解释给自己听</p><p className="mt-1 text-xs leading-5 text-[#64807c] dark:text-[#b8c6c1]">静态教案辅导 · 不会读取你的操作，也不会自动判定掌握程度</p></div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="学习阅读方式">
        <button type="button" className="baize-button-secondary" aria-pressed={mode === 'guided'} disabled={!guide.available} onClick={() => setMode('guided')}>逐步辅导</button>
        <button type="button" className="baize-button-secondary" aria-pressed={mode === 'full'} onClick={() => { if (canLeaveStudyFeedback()) setMode('full'); }}>完整正文</button>
      </div>
    </div>
    {!guide.available && <div role="status" className="rounded-xl bg-[#5f8f84]/8 p-3 text-sm"><p className="font-semibold">{readiness.status === 'outline' ? '只有大纲' : '教案待完善'}</p><p className="mt-1">本任务还没有完整辅导教案，先显示原始正文；不会自动编造工具、实验结果或答案。</p><ul className="mt-2 list-disc space-y-1 pl-5 text-xs">{readiness.issues.slice(0, 6).map((issue, i) => <li key={i}>{issue}</li>)}</ul></div>}
    {mode === 'guided' && guide.available && selected ? <>
      <details className="rounded-2xl border border-[#5f8f84]/20 bg-[#5f8f84]/5 p-4 dark:border-[#c9a96b]/20" open>
        <summary className="cursor-pointer font-semibold">课前准备：目标、思路与工具</summary>
        <div className="mt-4 space-y-5">{guide.preparation.map((section, i) => <section key={`${section.title}-${i}`} aria-label={section.title}><h3 className="mb-2 flex items-center gap-2 font-bold">{section.title === '工具准备' && <Wrench size={16} />}{section.title}</h3><MarkdownView body={section.body} anchorPrefix={`${quest.id}-preparation-${i}`} /></section>)}</div>
      </details>
      {['QUEST-001', 'QUEST-002'].includes(quest.id) && <div className="rounded-xl border border-[#5f8f84]/20 p-4"><a className="baize-button-secondary inline-flex" href={`${import.meta.env.BASE_URL}learning-lab/navigation.html`} target="_blank" rel="noopener noreferrer">打开导航实验页<ExternalLink size={15} /></a><p className="mt-2 text-xs leading-5 text-[#64807c] dark:text-[#b8c6c1]">内置练习：链接、URL、锚点与 GET 表单。无需安装；不提供 302/304、TLS 或离线命中的保证。完整 Network 观察请使用电脑浏览器。</p></div>}
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#5f8f84]/8 p-3">
        <label className="min-w-0 flex-1 text-xs font-semibold">当前辅导步骤<select className="baize-input mt-1 w-full" aria-label="当前辅导步骤" value={selected.id} onChange={event => goToStep(event.target.value)}>{guide.steps.map(step => <option key={step.id} value={step.id}>{step.id} · {step.title}</option>)}</select></label>
        <span className="text-xs text-[#64807c]">{selectedIndex + 1}/{guide.steps.length}</span>
      </div>
      <article key={selected.id} aria-label="当前步骤辅导" className="min-w-0 space-y-5">
        <h3 id={`${quest.id}-step-${selected.id}`} data-tech-os-heading data-tech-os-step={selected.id} tabIndex={-1} className="scroll-mt-24 text-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5f8f84]">{selected.id} · {selected.title}</h3>
        {selected.intro && <MarkdownView body={selected.intro} anchorPrefix={`${quest.id}-guide-${selected.id}-intro`} />}
        {selected.sections.length ? selected.sections.map((section, i) => {
          const content = <MarkdownView body={section.body} anchorPrefix={`${quest.id}-guide-${selected.id}-${i}`} />;
          if (['参考答案', '卡住时怎么办', '常见误区'].includes(section.title)) return <details key={`${section.title}-${i}`} className="rounded-xl border border-[#5f8f84]/20 p-4 dark:border-[#c9a96b]/20"><summary className="cursor-pointer font-semibold">{section.title === '参考答案' ? '参考答案（先自己回答，再展开核对）' : section.title}</summary><div className="mt-3">{content}</div></details>;
          return <section key={`${section.title}-${i}`} aria-label={section.title} className={`rounded-xl p-4 ${section.title === '工具与操作' ? 'border border-[#5f8f84]/20 bg-[#5f8f84]/5 dark:border-[#c9a96b]/20' : 'bg-white/25 dark:bg-black/10'}`}><h4 className="mb-3 font-bold">{section.title}</h4>{content}</section>;
        }) : <MarkdownView body={selected.body} anchorPrefix={`${quest.id}-guide-${selected.id}`} />}
      </article>
      <StudyFeedbackPanel key={quest.id + '/' + selected.id} questId={quest.id} stepId={selected.id} />
      <div className="flex flex-wrap justify-between gap-2 border-t border-[#5f8f84]/15 pt-4">
        <button type="button" className="baize-button-secondary" disabled={selectedIndex <= 0} onClick={() => goToStep(guide.steps[selectedIndex - 1].id)}><ArrowLeft size={16} />上一步辅导</button>
        <button type="button" className="baize-button-primary" disabled={selectedIndex >= guide.steps.length - 1} onClick={() => goToStep(guide.steps[selectedIndex + 1].id)}>下一步辅导<ArrowRight size={16} /></button>
      </div>
      <p className="text-xs leading-5 text-[#64807c] dark:text-[#b8c6c1]">翻页、看参考答案都不会自动打卡。请先亲自观察并对照“完成标志”，再在下方记录进度；正式结论和证据可在“完整正文”中查看。</p>
    </> : <MarkdownView body={quest.body} anchorPrefix={quest.id} />}
    <QuestStudyChecklist quest={quest} onReadStep={id => focusTechOsStudyStep(quest.id, id)} />
  </section>;
}
