import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, GitCompareArrows, GitMerge, ShieldCheck } from 'lucide-react';
import { getBundledTechOsFiles } from '../../services/techOsRepository';
import { createRouteCandidateDraft, getDefaultRouteCandidateValues } from '../../services/techOsRouteCandidate';
import { validateTechOsDraftFiles } from '../../services/techOsDraftValidation';
import { techOsIndex } from '../../services/techOs';
import type { RouteCandidateDraft, RouteCandidateDraftValues, RouteCandidateGroup } from '../../types/tech-os-candidate';

interface TechOsCandidatePanelProps {
  groups: RouteCandidateGroup[];
  stagedPaths: Set<string>;
  created: string;
  onOpenSource: (id: string) => void;
  onOpenRepository: () => void;
  onStage: (draft: RouteCandidateDraft) => void;
}

export function TechOsCandidatePanel({ groups, stagedPaths, created, onOpenSource, onOpenRepository, onStage }: TechOsCandidatePanelProps) {
  const [selectedId, setSelectedId] = useState(groups[0]?.id || '');
  const [edits, setEdits] = useState<Record<string, RouteCandidateDraftValues>>({});
  const [confirmation, setConfirmation] = useState('');
  const selected = groups.find(group => group.id === selectedId) || groups[0];
  const values = selected ? (edits[selected.id] || getDefaultRouteCandidateValues(selected)) : null;
  const phrase = selected ? `STAGE ${selected.candidateId}` : '';
  const staged = selected ? stagedPaths.has(selected.filePath) : false;
  const containsInboxInput = selected?.inputs.some(input => input.sourceType === 'inbox-question' || input.sourceType === 'inbox-idea') || false;
  const draftResult = useMemo(() => {
    if (!selected || !values) return { draft: null, error: '' };
    try { return { draft: createRouteCandidateDraft(selected, values, created), error: '' }; }
    catch (error) { return { draft: null, error: errorMessage(error) }; }
  }, [created, selected, values]);
  const validation = useMemo(() => draftResult.draft
    ? validateTechOsDraftFiles([...getBundledTechOsFiles(techOsIndex), draftResult.draft.file])
    : { valid: false, errors: draftResult.error ? [draftResult.error] : [], entityCount: techOsIndex.entities.length }, [draftResult]);

  const update = (patch: Partial<RouteCandidateDraftValues>) => {
    if (!selected || !values || staged) return;
    setEdits(current => ({ ...current, [selected.id]: { ...values, ...patch } }));
  };

  return <section id="route-candidate-generator" className="baize-panel min-w-0 rounded-3xl p-5 sm:p-7">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="flex min-w-0 items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#5f8f84]/10 text-[#356b66] dark:bg-[#c9a96b]/10 dark:text-[#d8bd7e]"><GitMerge size={23} /></span><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#718986]">T4.2 Route Candidate Generator</p><span className="rounded-full border border-[#5f8f84]/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#64807c] dark:border-[#c9a96b]/15 dark:text-[#d8bd7e]">Draft Only</span></div><h2 className="mt-2 text-2xl font-bold">相关信号聚合为可编辑候选</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#64807c] dark:text-[#b8c6c1]">只按显式共同标签聚合至少两条 Seed/Signal。系统提供草稿和解释，用户编辑并输入确认短语后才会加入 Repository 内存草稿；仍不会切换 Main Route。</p></div></div><div className="rounded-2xl bg-[#5f8f84]/6 px-4 py-3 text-center dark:bg-[#c9a96b]/6"><strong className="block text-2xl">{groups.length}</strong><span className="text-[11px] text-[#718986]">Candidate Groups</span></div></div>

    {!groups.length ? <div className="mt-6 rounded-2xl border border-dashed border-[#5f8f84]/25 px-6 py-12 text-center"><GitMerge size={26} className="mx-auto text-[#8aa09c]" /><h3 className="mt-3 font-bold">还没有足够相关的信号</h3><p className="mt-2 text-sm text-[#718986]">至少两条信号需要共享一个具体标签；宽泛领域标签不会单独触发聚合。</p></div> : <div className="mt-7 grid min-w-0 gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
      <div className="min-w-0 space-y-2">{groups.map(group => <button key={group.id} type="button" onClick={() => { setSelectedId(group.id); setConfirmation(''); }} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === group.id ? 'border-[#5f8f84]/40 bg-[#5f8f84]/10 dark:border-[#c9a96b]/35 dark:bg-[#c9a96b]/8' : 'border-[#5f8f84]/12 hover:border-[#5f8f84]/30 dark:border-[#c9a96b]/10'}`}><span className="text-[10px] font-semibold uppercase tracking-wider text-[#718986]">{group.candidateId} · {group.inputs.length} inputs</span><strong className="mt-1 block text-sm leading-5">{group.suggestedTitle}</strong><div className="mt-3 flex flex-wrap gap-1.5">{group.sharedTags.map(tag => <span key={tag} className="baize-chip">#{tag}</span>)}</div>{stagedPaths.has(group.filePath) && <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#356b66] dark:text-[#d8bd7e]"><CheckCircle2 size={13} />已加入内存草稿</span>}</button>)}</div>

      {selected && values && <div className="min-w-0 space-y-5"><div className="grid min-w-0 gap-4 md:grid-cols-2"><label className="min-w-0 md:col-span-2"><span className="mb-2 block text-xs font-semibold text-[#64807c]">Route Name</span><input className="baize-input" value={values.title} disabled={staged} maxLength={120} onChange={event => update({ title: event.target.value })} /></label><label className="min-w-0 md:col-span-2"><span className="mb-2 block text-xs font-semibold text-[#64807c]">Why</span><textarea className="baize-input min-h-24 resize-y" value={values.reason} disabled={staged} maxLength={500} onChange={event => update({ reason: event.target.value })} /></label><label className="min-w-0"><span className="mb-2 block text-xs font-semibold text-[#64807c]">Expected Outcome</span><textarea className="baize-input min-h-36 resize-y" value={values.expectedOutcome} disabled={staged} maxLength={800} onChange={event => update({ expectedOutcome: event.target.value })} /></label><label className="min-w-0"><span className="mb-2 block text-xs font-semibold text-[#64807c]">Route Outline · 每行一步</span><textarea className="baize-input min-h-36 resize-y" value={values.outline.join('\n')} disabled={staged} onChange={event => update({ outline: event.target.value.split(/\r?\n/) })} /></label></div>

        <div className="rounded-2xl border border-[#5f8f84]/12 p-4 dark:border-[#c9a96b]/10"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">聚合依据</h3><span className="font-mono text-[10px] text-[#718986]">{selected.filePath}</span></div>{containsInboxInput && <div className="mt-3 rounded-xl border border-[#a85d50]/20 bg-[#a85d50]/7 p-3 text-xs leading-5 text-[#7d4b43] dark:text-[#e1a294]"><strong>公开边界：</strong>这个候选包含私有 Inbox 输入。加入 Repository 后，标题会进入明文 Markdown，并可能出现在公开 Pages 投影；请先编辑或删除敏感内容。</div>}<div className="mt-3 space-y-2">{selected.inputs.map(input => <div key={input.id} className="rounded-xl bg-[#5f8f84]/5 p-3 dark:bg-[#c9a96b]/5"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#5f8f84]/15 px-2 py-0.5 text-[10px] uppercase text-[#718986]">{input.kind}</span><strong className="text-xs">{input.title}</strong></div><div className="mt-2 flex flex-wrap gap-2">{input.sourceIds.filter(id => selected.sourceEntityIds.includes(id)).map(id => <button key={id} type="button" className="baize-chip font-mono text-[10px]" onClick={() => onOpenSource(id)}>{id}</button>)}</div></div>)}</div></div>

        <div className={`rounded-2xl border p-4 ${validation.valid ? 'border-[#5f8f84]/20 bg-[#5f8f84]/6 dark:border-[#c9a96b]/15 dark:bg-[#c9a96b]/5' : 'border-[#a85d50]/25 bg-[#a85d50]/7'}`}><div className="flex items-start gap-3">{validation.valid ? <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#356b66] dark:text-[#d8bd7e]" /> : <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#a85d50]" />}<div className="min-w-0 flex-1"><strong className="text-sm">{validation.valid ? 'Candidate 草稿通过完整 Tech OS 校验' : '草稿尚不能进入 Repository'}</strong>{!validation.valid && <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[#985247] dark:text-[#e1a294]">{validation.errors.slice(0, 4).map(error => <li key={error}>{error}</li>)}</ul>}<p className="mt-2 text-xs leading-5 text-[#718986]">这一步只加入当前页面内存。真正保存仍需 Repository Token、远端比较、提交短语和浏览器二次确认。</p></div></div>
          {staged ? <button type="button" className="baize-button-primary mt-4" onClick={onOpenRepository}><GitCompareArrows size={16} />打开 Repository 草稿</button> : <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"><input className="baize-input font-mono" value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder={`输入 ${phrase} 确认`} /><button type="button" className="baize-button-primary" disabled={!draftResult.draft || !validation.valid || confirmation !== phrase} onClick={() => draftResult.draft && onStage(draftResult.draft)}>加入内存草稿<ArrowRight size={16} /></button></div>}
        </div>
      </div>}
    </div>}
  </section>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
