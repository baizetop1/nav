import { ArrowRight, BookOpen, BrainCircuit, HelpCircle, ListChecks, Network, ShieldCheck } from 'lucide-react';
import type { LearningAction, LearningEngineResult, RouteSeedSignal } from '../../types/tech-os-learning';

interface TechOsLearningPanelProps {
  engine: LearningEngineResult;
  onOpenAction: (action: LearningAction) => void;
  onOpenSource: (id: string) => void;
}

const SIGNAL_LABELS: Record<RouteSeedSignal['sourceType'], string> = {
  'open-question': 'Open Question',
  'inbox-question': 'Inbox Question',
  'inbox-idea': 'Inbox Idea',
  'knowledge-gap': 'Knowledge Gap',
  'lab-question': 'Lab Question',
  'project-question': 'Project Question',
  'completed-quest': 'Completed Quest',
};

export function TechOsLearningPanel({ engine, onOpenAction, onOpenSource }: TechOsLearningPanelProps) {
  return <div className="space-y-6">
    <section className="overflow-hidden rounded-3xl bg-[#173b41] p-6 text-[#f4f1e8] shadow-2xl dark:bg-[#102c33] sm:p-8"><div className="flex flex-col gap-6 lg:flex-row lg:items-start"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#e1ca91]"><BrainCircuit size={28} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#99b7b0]">T4.1 Rules First</p><span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">{engine.mode}</span><span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">Read Only</span></div><h2 className="mt-3 text-3xl font-bold">Learning Engine</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-[#c4d5d0]">只读取显式状态、关系与 Markdown 章节，给出下一动作和收集信号。规则会说明原因，但不会写仓库、创建 Route Seed、切换 Main Route 或升级 Knowledge。</p></div></div></section>

    <section className="baize-panel rounded-2xl p-5 sm:p-7"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#c9a96b]/15 text-[#80672e] dark:text-[#e1ca91]"><ListChecks size={21} /></span><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#718986]">Next Action</p><h2 className="text-xl font-bold">{engine.nextAction?.title || '当前没有可解释建议'}</h2></div></div>{engine.nextAction && <><p className="mt-4 text-sm leading-7 text-[#55706d] dark:text-[#b8c6c1]">{engine.nextAction.detail}</p><div className="mt-4 rounded-xl border border-[#5f8f84]/15 bg-[#5f8f84]/5 p-3 text-xs leading-6 text-[#64807c] dark:border-[#c9a96b]/12 dark:bg-[#c9a96b]/5 dark:text-[#b8c6c1]"><strong>为什么：</strong>{engine.nextAction.reason}</div><div className="mt-4 flex flex-wrap items-center gap-2">{engine.nextAction.sourceIds.map(id => <SourceButton key={id} id={id} onOpen={onOpenSource} />)}<button type="button" className="baize-button-primary ml-auto" onClick={() => onOpenAction(engine.nextAction as LearningAction)}>查看来源<ArrowRight size={16} /></button></div></>}</section>

    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="baize-panel rounded-2xl p-5"><div className="flex items-center justify-between"><h2 className="font-bold">Alternative Actions</h2><span className="text-xs text-[#718986]">最多 4 条</span></div><div className="mt-4 space-y-3">{engine.alternatives.map(action => <button key={action.id} type="button" onClick={() => onOpenAction(action)} className="w-full rounded-xl border border-[#5f8f84]/12 p-4 text-left transition hover:border-[#5f8f84]/35 hover:bg-[#5f8f84]/5 dark:border-[#c9a96b]/10 dark:hover:border-[#c9a96b]/30"><div className="flex items-center gap-2"><strong className="text-sm">{action.title}</strong><span className="ml-auto rounded-full bg-[#5f8f84]/10 px-2 py-0.5 text-[10px] uppercase text-[#64807c] dark:bg-[#c9a96b]/10 dark:text-[#d8bd7e]">{action.effort}</span></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-[#718986]">{action.reason}</p></button>)}{!engine.alternatives.length && <p className="py-8 text-center text-sm text-[#718986]">没有其他满足当前模式的动作。</p>}</div></section>
      <section className="baize-panel rounded-2xl p-5"><div className="flex items-center gap-3"><Network size={19} className="text-[#356b66] dark:text-[#d8bd7e]" /><div><h2 className="font-bold">Route Seed Collector</h2><p className="text-xs text-[#718986]">{engine.routeSeedSignals.length} 个未保存信号 · {engine.existingRouteSeedCount} 个已有 Seed</p></div></div><div className="mt-4 max-h-[34rem] space-y-3 overflow-y-auto pr-1">{engine.routeSeedSignals.map(signal => <article key={signal.id} className="rounded-xl border border-[#5f8f84]/12 p-4 dark:border-[#c9a96b]/10"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#5f8f84]/10 px-2 py-0.5 text-[10px] font-semibold text-[#356b66] dark:bg-[#c9a96b]/10 dark:text-[#e1ca91]">{SIGNAL_LABELS[signal.sourceType]}</span><strong className="text-sm">{signal.title}</strong></div><p className="mt-2 text-xs leading-5 text-[#718986]">{signal.reason}</p><div className="mt-3 flex flex-wrap gap-2">{signal.sourceIds.map(id => <SourceButton key={id} id={id} onOpen={onOpenSource} />)}</div></article>)}{!engine.routeSeedSignals.length && <p className="py-8 text-center text-sm text-[#718986]">没有新的显式信号。</p>}</div><p className="mt-4 flex items-start gap-2 rounded-xl bg-[#5f8f84]/5 p-3 text-[11px] leading-5 text-[#718986] dark:bg-[#c9a96b]/5"><ShieldCheck size={14} className="mt-0.5 shrink-0" />T4.1 仍只收集信号；下方 T4.2 可以按显式共同标签形成可编辑 Candidate 草稿，但保存仍需用户确认。</p></section>
    </div>

    <section className="grid gap-4 md:grid-cols-3">
      <ContextCard icon={<HelpCircle size={19} />} title="Open Questions" value={engine.openQuestions.length}>{engine.openQuestions.map(question => <button key={question.id} type="button" onClick={() => onOpenSource(question.id)} className="block w-full truncate py-1 text-left text-xs text-[#55706d] hover:text-[#356b66] dark:text-[#b8c6c1] dark:hover:text-[#e1ca91]">{question.id} · {question.title}</button>)}</ContextCard>
      <ContextCard icon={<ListChecks size={19} />} title="Quest Suggestions" value={engine.questSuggestions.length}>{engine.questSuggestions.slice(0, 5).map(quest => <button key={quest.id} type="button" onClick={() => onOpenSource(quest.id)} className="block w-full truncate py-1 text-left text-xs text-[#55706d] hover:text-[#356b66] dark:text-[#b8c6c1] dark:hover:text-[#e1ca91]">{quest.order}. {quest.title}</button>)}</ContextCard>
      <ContextCard icon={<BookOpen size={19} />} title="Knowledge Connections" value={engine.knowledgeConnections.length}>{engine.knowledgeConnections.map(connection => <button key={connection.knowledgeId} type="button" onClick={() => onOpenSource(connection.knowledgeId)} className="block w-full truncate py-1 text-left text-xs text-[#55706d] hover:text-[#356b66] dark:text-[#b8c6c1] dark:hover:text-[#e1ca91]">{connection.knowledgeId} · {connection.relatedIds.length} explicit links</button>)}</ContextCard>
    </section>
  </div>;
}

function ContextCard({ icon, title, value, children }: { icon: React.ReactNode; title: string; value: number; children: React.ReactNode }) {
  return <article className="baize-panel min-w-0 rounded-2xl p-5"><div className="flex items-center gap-2 text-[#356b66] dark:text-[#d8bd7e]">{icon}<h3 className="font-bold text-[#173b41] dark:text-[#ecebe4]">{title}</h3><strong className="ml-auto text-xl text-[#173b41] dark:text-[#ecebe4]">{value}</strong></div><div className="mt-3 min-w-0">{children}</div></article>;
}

function SourceButton({ id, onOpen }: { id: string; onOpen: (id: string) => void }) {
  return <button type="button" className="baize-chip font-mono text-[10px]" onClick={() => onOpen(id)}>{id}</button>;
}
