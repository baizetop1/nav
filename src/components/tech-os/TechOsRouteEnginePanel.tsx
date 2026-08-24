import { useMemo, useState } from 'react';
import { Archive, ArrowRight, CircleSlash2, ClipboardCheck, GitCompareArrows, GitFork, LockKeyhole, Save } from 'lucide-react';
import { createCandidateDecisionDraft } from '../../services/techOsCandidateDecision';
import { createRouteReviewDraft, getDefaultRouteReviewValues } from '../../services/techOsRouteCompletion';
import { createRecommendedRouteDraft, getDefaultRecommendedRouteValues } from '../../services/techOsNextRoute';
import { getBundledTechOsFiles } from '../../services/techOsRepository';
import { validateTechOsDraftFiles } from '../../services/techOsDraftValidation';
import { techOsIndex } from '../../services/techOs';
import type { TechOsSourceFile } from '../../types/tech-os';
import type { CandidateDecision, NextRouteRecommendation, RouteCompletionReviewModel, RouteDraftValues, RouteReviewDraftValues } from '../../types/tech-os-route-engine';

export interface RouteEngineStageDraft {
  key: string;
  file: TechOsSourceFile;
}

interface TechOsRouteEnginePanelProps {
  review: RouteCompletionReviewModel;
  recommendations: NextRouteRecommendation[];
  stagedPaths: Set<string>;
  created: string;
  onOpenSource: (id: string) => void;
  onOpenRepository: () => void;
  onStage: (draft: RouteEngineStageDraft) => void;
}

const DECISIONS: Array<{ id: CandidateDecision; label: string; detail: string; icon: typeof Save }> = [
  { id: 'save_for_later', label: 'Save for Later', detail: '保留 Candidate，稍后再判断。', icon: Save },
  { id: 'archive', label: 'Archive', detail: '停止展示为活跃 Candidate，但保留原因。', icon: Archive },
  { id: 'not_interested', label: 'Not Interested', detail: '记录当前没有兴趣，不删除来源。', icon: CircleSlash2 },
];

export function TechOsRouteEnginePanel({ review, recommendations, stagedPaths, created, onOpenSource, onOpenRepository, onStage }: TechOsRouteEnginePanelProps) {
  return <div className="space-y-6">
    <section className="overflow-hidden rounded-3xl bg-[#173b41] p-6 text-[#f4f1e8] shadow-2xl dark:bg-[#102c33] sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-start"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#e1ca91]"><GitFork size={28} /></span><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#99b7b0]">T4.3–T4.6 Route Lifecycle</p><h2 className="mt-2 text-3xl font-bold">Route Engine</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-[#c4d5d0]">管理 Candidate 决定、Completion Review 与下一路线建议。所有动作只产生可编辑内存草稿；系统不会设置 Main Route、修改 state.yml、升级 Knowledge 或宣称实验完成。</p></div></div></section>
    <CandidateDecisionSection stagedPaths={stagedPaths} created={created} onOpenRepository={onOpenRepository} onStage={onStage} />
    <CompletionReviewSection model={review} stagedPaths={stagedPaths} created={created} onOpenSource={onOpenSource} onOpenRepository={onOpenRepository} onStage={onStage} />
    <NextRouteSection recommendations={recommendations} review={review} stagedPaths={stagedPaths} created={created} onOpenSource={onOpenSource} onOpenRepository={onOpenRepository} onStage={onStage} />
  </div>;
}

function CandidateDecisionSection({ stagedPaths, created, onOpenRepository, onStage }: Pick<TechOsRouteEnginePanelProps, 'stagedPaths' | 'created' | 'onOpenRepository' | 'onStage'>) {
  const candidates = techOsIndex.entities.filter(entity => entity.kind === 'route-seed' && entity.status === 'candidate');
  const archivedCount = techOsIndex.entities.filter(entity => entity.kind === 'route-seed' && entity.status === 'archived').length;
  const [selectedId, setSelectedId] = useState(candidates[0]?.id || '');
  const [decision, setDecision] = useState<CandidateDecision>('save_for_later');
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const selected = candidates.find(candidate => candidate.id === selectedId) || candidates[0];
  const source = selected ? techOsIndex.files.find(file => file.path === selected.sourcePath)?.content || '' : '';
  const phrase = selected ? `DECIDE ${selected.id}` : '';
  const result = useMemo(() => {
    if (!selected || !source || !reason.trim()) return { draft: null, error: '' };
    try { return { draft: createCandidateDecisionDraft(selected, source, decision, reason, created), error: '' }; }
    catch (error) { return { draft: null, error: errorMessage(error) }; }
  }, [created, decision, reason, selected, source]);
  const valid = result.draft ? validateDraft(result.draft.file) : null;
  const staged = selected ? stagedPaths.has(selected.sourcePath) : false;

  return <section className="baize-panel rounded-3xl p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#718986]">T4.3 Candidate Decisions</p><h2 className="mt-2 text-2xl font-bold">Save / Archive / Not Interested</h2><p className="mt-2 text-sm leading-6 text-[#718986]">原路径更新，不删除文件、不切换路线；每个决定必须保留原因。</p></div><div className="flex gap-3"><Stat value={candidates.length} label="Candidates" /><Stat value={archivedCount} label="Archived" /></div></div>
    {!candidates.length ? <EmptyLocked icon={<ClipboardCheck size={25} />} title="还没有已保存 Candidate" detail="先在 T4.2 生成并通过 Repository 保存 Candidate；内存预览不会被 T4.3 当作已保存对象。" /> : <div className="mt-6 grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]"><div className="space-y-2">{candidates.map(candidate => <button key={candidate.id} type="button" onClick={() => { setSelectedId(candidate.id); setConfirmation(''); }} className={`w-full rounded-2xl border p-4 text-left ${selected?.id === candidate.id ? 'border-[#5f8f84]/40 bg-[#5f8f84]/10 dark:border-[#c9a96b]/35 dark:bg-[#c9a96b]/8' : 'border-[#5f8f84]/12 dark:border-[#c9a96b]/10'}`}><span className="text-[10px] font-semibold uppercase text-[#718986]">{candidate.id}</span><strong className="mt-1 block text-sm">{candidate.title}</strong></button>)}</div>{selected && <div className="min-w-0"><div className="grid gap-3 md:grid-cols-3">{DECISIONS.map(item => { const Icon = item.icon; return <button key={item.id} type="button" disabled={staged} onClick={() => { setDecision(item.id); setConfirmation(''); }} className={`rounded-2xl border p-4 text-left ${decision === item.id ? 'border-[#5f8f84]/40 bg-[#5f8f84]/10 dark:border-[#c9a96b]/35 dark:bg-[#c9a96b]/8' : 'border-[#5f8f84]/12 dark:border-[#c9a96b]/10'}`}><Icon size={18} /><strong className="mt-3 block text-sm">{item.label}</strong><span className="mt-1 block text-xs leading-5 text-[#718986]">{item.detail}</span></button>; })}</div><label className="mt-4 block"><span className="mb-2 block text-xs font-semibold text-[#64807c]">Decision Reason</span><textarea className="baize-input min-h-24 resize-y" value={reason} disabled={staged} onChange={event => setReason(event.target.value)} placeholder="为什么做这个决定？" /></label>{staged ? <button type="button" className="baize-button-primary mt-4" onClick={onOpenRepository}><GitCompareArrows size={16} />打开 Repository 草稿</button> : <ConfirmRow phrase={phrase} confirmation={confirmation} setConfirmation={setConfirmation} disabled={!valid?.valid} label="加入决定草稿" onConfirm={() => result.draft && onStage(result.draft)} />}{result.error && <ErrorText text={result.error} />}{valid && !valid.valid && <ErrorText text={valid.errors[0]} />}</div>}</div>}
  </section>;
}

function CompletionReviewSection({ model, stagedPaths, created, onOpenSource, onOpenRepository, onStage }: { model: RouteCompletionReviewModel } & Pick<TechOsRouteEnginePanelProps, 'stagedPaths' | 'created' | 'onOpenSource' | 'onOpenRepository' | 'onStage'>) {
  const [values, setValues] = useState<RouteReviewDraftValues>(() => getDefaultRouteReviewValues(model));
  const [confirmation, setConfirmation] = useState('');
  const phrase = `STAGE ${model.reviewId}`;
  const staged = stagedPaths.has(model.filePath);
  const result = useMemo(() => {
    if (!model.eligible) return { draft: null, error: '' };
    try { return { draft: createRouteReviewDraft(model, values, created), error: '' }; }
    catch (error) { return { draft: null, error: errorMessage(error) }; }
  }, [created, model, values]);
  const valid = result.draft ? validateDraft(result.draft.file) : null;
  return <section className="baize-panel rounded-3xl p-5 sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#718986]">T4.4 Route Completion Review</p><h2 className="mt-2 text-2xl font-bold">{model.routeId} · {model.progress}%</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#718986]">{model.eligibilityReason}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${model.eligible ? 'bg-[#5f8f84]/10 text-[#356b66] dark:bg-[#c9a96b]/10 dark:text-[#d8bd7e]' : 'bg-[#a85d50]/10 text-[#985247] dark:text-[#e1a294]'}`}>{model.eligible ? 'Review Ready' : 'Locked < 80%'}</span></div>
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat value={model.knowledgeIds.length} label="Knowledge" /><Stat value={model.labIds.length} label="Completed Labs" /><Stat value={model.projectIds.length} label="Projects" /><Stat value={model.questionIds.length} label="Open Questions" /></div>
    {!model.eligible ? <EmptyLocked icon={<LockKeyhole size={25} />} title="Review 尚未开放" detail="继续当前 Quest。系统不会因为存在下一路线想法而提前宣布当前 Route 完成。" /> : <div className="mt-6 space-y-4"><label className="block"><span className="mb-2 block text-xs font-semibold text-[#64807c]">我学到了什么？</span><textarea className="baize-input min-h-28 resize-y" disabled={staged} value={values.learnedSummary} onChange={event => setValues(current => ({ ...current, learnedSummary: event.target.value }))} /></label><SelectionList title="哪些 Open Questions 值得继续？" ids={model.questionIds} selected={values.continueQuestionIds} disabled={staged} onToggle={id => setValues(current => ({ ...current, continueQuestionIds: toggleId(current.continueQuestionIds, id) }))} onOpen={onOpenSource} /><SelectionList title="保留哪些 Route Seeds？" ids={model.routeSeedIds} selected={values.routeSeedIds} disabled={staged} onToggle={id => setValues(current => ({ ...current, routeSeedIds: toggleId(current.routeSeedIds, id) }))} onOpen={onOpenSource} /><label className="block"><span className="mb-2 block text-xs font-semibold text-[#64807c]">哪些方向暂时不感兴趣？</span><textarea className="baize-input min-h-20 resize-y" disabled={staged} value={values.notInterested} onChange={event => setValues(current => ({ ...current, notInterested: event.target.value }))} /></label>{staged ? <button type="button" className="baize-button-primary" onClick={onOpenRepository}><GitCompareArrows size={16} />打开 Repository 草稿</button> : <ConfirmRow phrase={phrase} confirmation={confirmation} setConfirmation={setConfirmation} disabled={!valid?.valid} label="加入 Review 草稿" onConfirm={() => result.draft && onStage(result.draft)} />}{result.error && <ErrorText text={result.error} />}{valid && !valid.valid && <ErrorText text={valid.errors[0]} />}</div>}
  </section>;
}

function NextRouteSection({ recommendations, review, stagedPaths, created, onOpenSource, onOpenRepository, onStage }: { recommendations: NextRouteRecommendation[]; review: RouteCompletionReviewModel } & Pick<TechOsRouteEnginePanelProps, 'stagedPaths' | 'created' | 'onOpenSource' | 'onOpenRepository' | 'onStage'>) {
  const [selectedId, setSelectedId] = useState(recommendations[0]?.id || '');
  const [edits, setEdits] = useState<Record<string, RouteDraftValues>>({});
  const [confirmation, setConfirmation] = useState('');
  const selected = recommendations.find(item => item.id === selectedId) || recommendations[0];
  const values = selected ? (edits[selected.id] || getDefaultRecommendedRouteValues(selected)) : null;
  const staged = selected ? stagedPaths.has(selected.filePath) : false;
  const phrase = selected ? `STAGE ${selected.routeId}` : '';
  const result = useMemo(() => {
    if (!selected || !values) return { draft: null, error: '' };
    try { return { draft: createRecommendedRouteDraft(techOsIndex, selected, values, created), error: '' }; }
    catch (error) { return { draft: null, error: errorMessage(error) }; }
  }, [created, selected, values]);
  const valid = result.draft ? validateDraft(result.draft.file) : null;
  const update = (patch: Partial<RouteDraftValues>) => selected && values && !staged && setEdits(current => ({ ...current, [selected.id]: { ...values, ...patch } }));
  return <section className="baize-panel rounded-3xl p-5 sm:p-7"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#718986]">T4.5 Next Route Engine</p><h2 className="mt-2 text-2xl font-bold">2–4 条有证据的下一路线建议</h2><p className="mt-2 text-sm leading-6 text-[#718986]">只有 Review 就绪后才排序；“准备路线”仅生成 `main: false` Backlog 草稿，不会开始路线。</p></div>
    {!review.eligible ? <EmptyLocked icon={<LockKeyhole size={25} />} title="Next Route 推荐已锁定" detail="先推进当前路线到 Review 门槛；系统不会用新鲜想法打断 0% 的 Main Route。" /> : !recommendations.length ? <EmptyLocked icon={<GitFork size={25} />} title="没有足够证据" detail="Review 已就绪，但还没有可以解释来源的 Route Seed 或 Candidate。" /> : <div className="mt-6 grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]"><div className="space-y-2">{recommendations.map(item => <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setConfirmation(''); }} className={`w-full rounded-2xl border p-4 text-left ${selected?.id === item.id ? 'border-[#5f8f84]/40 bg-[#5f8f84]/10 dark:border-[#c9a96b]/35 dark:bg-[#c9a96b]/8' : 'border-[#5f8f84]/12 dark:border-[#c9a96b]/10'}`}><span className="text-[10px] font-semibold uppercase text-[#718986]">{item.routeId} · score {item.score}</span><strong className="mt-1 block text-sm">{item.title}</strong><span className="mt-2 block text-xs text-[#718986]">{item.sourceLabel}</span></button>)}</div>{selected && values && <div className="min-w-0 space-y-4"><label className="block"><span className="mb-2 block text-xs font-semibold text-[#64807c]">Route Name</span><input className="baize-input" disabled={staged} value={values.title} onChange={event => update({ title: event.target.value })} /></label><label className="block"><span className="mb-2 block text-xs font-semibold text-[#64807c]">Why</span><textarea className="baize-input min-h-24 resize-y" disabled={staged} value={values.reason} onChange={event => update({ reason: event.target.value })} /></label><div className="grid gap-4 md:grid-cols-2"><label><span className="mb-2 block text-xs font-semibold text-[#64807c]">Expected Outcome</span><textarea className="baize-input min-h-32 resize-y" disabled={staged} value={values.expectedOutcome} onChange={event => update({ expectedOutcome: event.target.value })} /></label><label><span className="mb-2 block text-xs font-semibold text-[#64807c]">Route Outline</span><textarea className="baize-input min-h-32 resize-y" disabled={staged} value={values.outline.join('\n')} onChange={event => update({ outline: event.target.value.split(/\r?\n/) })} /></label></div><SourceSummary recommendation={selected} onOpen={onOpenSource} />{staged ? <button type="button" className="baize-button-primary" onClick={onOpenRepository}><GitCompareArrows size={16} />打开 Repository 草稿</button> : <ConfirmRow phrase={phrase} confirmation={confirmation} setConfirmation={setConfirmation} disabled={!valid?.valid} label="准备 Backlog Route" onConfirm={() => result.draft && onStage(result.draft)} />}{result.error && <ErrorText text={result.error} />}{valid && !valid.valid && <ErrorText text={valid.errors[0]} />}</div>}</div>}
  </section>;
}

function SourceSummary({ recommendation, onOpen }: { recommendation: NextRouteRecommendation; onOpen: (id: string) => void }) {
  return <div className="rounded-2xl bg-[#5f8f84]/5 p-4 text-xs leading-5 dark:bg-[#c9a96b]/5"><strong>Source：</strong>{recommendation.sourceLabel}<div className="mt-3 flex flex-wrap gap-2">{recommendation.sourceIds.map(id => <button key={id} type="button" className="baize-chip font-mono text-[10px]" onClick={() => onOpen(id)}>{id}</button>)}</div><p className="mt-3">Related Questions：{recommendation.relatedQuestionIds.length} · Existing Knowledge：{recommendation.knowledgeIds.length}</p></div>;
}

function SelectionList({ title, ids, selected, disabled, onToggle, onOpen }: { title: string; ids: string[]; selected: string[]; disabled: boolean; onToggle: (id: string) => void; onOpen: (id: string) => void }) {
  return <div><span className="mb-2 block text-xs font-semibold text-[#64807c]">{title}</span><div className="flex flex-wrap gap-2">{ids.length ? ids.map(id => <span key={id} className={`inline-flex items-center rounded-xl border ${selected.includes(id) ? 'border-[#5f8f84]/35 bg-[#5f8f84]/10 dark:border-[#c9a96b]/30' : 'border-[#5f8f84]/12 opacity-60 dark:border-[#c9a96b]/10'}`}><button type="button" disabled={disabled} className="px-3 py-2 text-xs" onClick={() => onToggle(id)}>{selected.includes(id) ? '✓ ' : ''}{id}</button><button type="button" className="border-l border-current/10 px-2 py-2 text-xs" onClick={() => onOpen(id)}>↗</button></span>) : <span className="text-xs text-[#718986]">暂无。</span>}</div></div>;
}

function ConfirmRow({ phrase, confirmation, setConfirmation, disabled, label, onConfirm }: { phrase: string; confirmation: string; setConfirmation: (value: string) => void; disabled: boolean; label: string; onConfirm: () => void }) {
  return <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"><input className="baize-input font-mono" value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder={`输入 ${phrase} 确认`} /><button type="button" className="baize-button-primary" disabled={disabled || confirmation !== phrase} onClick={onConfirm}>{label}<ArrowRight size={16} /></button></div>;
}

function EmptyLocked({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <div className="mt-6 rounded-2xl border border-dashed border-[#5f8f84]/25 px-6 py-10 text-center dark:border-[#c9a96b]/15"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5f8f84]/8 text-[#64807c] dark:bg-[#c9a96b]/8">{icon}</span><h3 className="mt-3 font-bold">{title}</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#718986]">{detail}</p></div>;
}

function Stat({ value, label }: { value: number; label: string }) {
  return <div className="min-w-20 rounded-2xl bg-[#5f8f84]/6 p-3 text-center dark:bg-[#c9a96b]/6"><strong className="block text-xl">{value}</strong><span className="text-[10px] text-[#718986]">{label}</span></div>;
}

function ErrorText({ text }: { text: string }) {
  return <p className="mt-3 text-xs text-[#985247] dark:text-[#e1a294]">{text}</p>;
}

function validateDraft(file: TechOsSourceFile) {
  const files = getBundledTechOsFiles(techOsIndex).filter(item => item.path !== file.path);
  return validateTechOsDraftFiles([...files, file]);
}

function toggleId(values: string[], id: string): string[] {
  return values.includes(id) ? values.filter(value => value !== id) : [...values, id];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
