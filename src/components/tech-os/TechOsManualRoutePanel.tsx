import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, GitCompareArrows, PencilRuler, ShieldCheck } from 'lucide-react';
import { buildManualRouteSuggestion, createManualRouteDraft, getDefaultManualRouteValues } from '../../services/techOsManualRoute';
import { getBundledTechOsFiles } from '../../services/techOsRepository';
import { validateTechOsDraftFiles } from '../../services/techOsDraftValidation';
import { techOsIndex } from '../../services/techOs';
import type { ManualRouteInput, ManualRouteSuggestion, RouteDraftValues } from '../../types/tech-os-route-engine';
import type { RouteEngineStageDraft } from './TechOsRouteEnginePanel';

interface TechOsManualRoutePanelProps {
  reservedRouteIds: string[];
  stagedPaths: Set<string>;
  created: string;
  onOpenRepository: () => void;
  onStage: (draft: RouteEngineStageDraft) => void;
}

const EMPTY_INPUT: ManualRouteInput = { topic: '', reason: '', expectedOutcome: '' };

export function TechOsManualRoutePanel({ reservedRouteIds, stagedPaths, created, onOpenRepository, onStage }: TechOsManualRoutePanelProps) {
  const [input, setInput] = useState<ManualRouteInput>(EMPTY_INPUT);
  const [suggestion, setSuggestion] = useState<ManualRouteSuggestion | null>(null);
  const [values, setValues] = useState<RouteDraftValues | null>(null);
  const [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const staged = suggestion ? stagedPaths.has(suggestion.filePath) : false;
  const phrase = suggestion ? `STAGE ${suggestion.routeId}` : '';
  const result = useMemo(() => {
    if (!suggestion || !values) return { draft: null, error: '' };
    try { return { draft: createManualRouteDraft(suggestion, values, created), error: '' }; }
    catch (error) { return { draft: null, error: errorMessage(error) }; }
  }, [created, suggestion, values]);
  const validation = useMemo(() => result.draft ? validateTechOsDraftFiles([...getBundledTechOsFiles(techOsIndex), result.draft.file]) : null, [result]);

  const generate = () => {
    try {
      const next = buildManualRouteSuggestion(techOsIndex, input, reservedRouteIds);
      setSuggestion(next);
      setValues(getDefaultManualRouteValues(next));
      setConfirmation('');
      setMessage('规则草稿已生成；请继续编辑，不会自动保存。');
    } catch (error) { setMessage(errorMessage(error)); }
  };
  const update = (patch: Partial<RouteDraftValues>) => values && !staged && setValues({ ...values, ...patch });

  return <section className="baize-panel rounded-3xl p-5 sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-start"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#5f8f84]/10 text-[#356b66] dark:bg-[#c9a96b]/10 dark:text-[#d8bd7e]"><PencilRuler size={23} /></span><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#718986]">T4.6 Manual Route Generator</p><h2 className="mt-2 text-2xl font-bold">我主动想学什么？</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#718986]">规则结合主题与已有 Tech Map 生成可编辑路线骨架。结果固定为 Backlog、`main: false`；系统不会创建 Active Quest 或修改 state.yml。</p></div></div>
    <div className="mt-6 grid gap-4 md:grid-cols-3"><label><span className="mb-2 block text-xs font-semibold text-[#64807c]">主题</span><input className="baize-input" value={input.topic} onChange={event => setInput(current => ({ ...current, topic: event.target.value }))} placeholder="例如：集成电路" /></label><label><span className="mb-2 block text-xs font-semibold text-[#64807c]">为什么？</span><textarea className="baize-input min-h-20 resize-y" value={input.reason} onChange={event => setInput(current => ({ ...current, reason: event.target.value }))} placeholder="为什么现在值得学？" /></label><label><span className="mb-2 block text-xs font-semibold text-[#64807c]">希望达到什么程度？</span><textarea className="baize-input min-h-20 resize-y" value={input.expectedOutcome} onChange={event => setInput(current => ({ ...current, expectedOutcome: event.target.value }))} placeholder="能够解释、实验或实现什么？" /></label></div><button type="button" className="baize-button-secondary mt-4" onClick={generate}><PencilRuler size={16} />生成可编辑规则草稿</button>{message && <p className="mt-3 text-xs text-[#718986]">{message}</p>}
    {suggestion && values && <div className="mt-7 rounded-3xl border border-[#5f8f84]/15 p-5 dark:border-[#c9a96b]/12"><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-[10px] font-semibold uppercase text-[#718986]">{suggestion.routeId} · Manual · Backlog</span><h3 className="mt-1 text-xl font-bold">可编辑 Route 草稿</h3></div><div className="flex flex-wrap gap-2">{suggestion.tags.map(tag => <span key={tag} className="baize-chip">#{tag}</span>)}</div></div><div className="mt-5 grid gap-4"><label><span className="mb-2 block text-xs font-semibold text-[#64807c]">Route Name</span><input className="baize-input" disabled={staged} value={values.title} onChange={event => update({ title: event.target.value })} /></label><label><span className="mb-2 block text-xs font-semibold text-[#64807c]">Why</span><textarea className="baize-input min-h-20 resize-y" disabled={staged} value={values.reason} onChange={event => update({ reason: event.target.value })} /></label><div className="grid gap-4 md:grid-cols-2"><label><span className="mb-2 block text-xs font-semibold text-[#64807c]">Expected Outcome</span><textarea className="baize-input min-h-36 resize-y" disabled={staged} value={values.expectedOutcome} onChange={event => update({ expectedOutcome: event.target.value })} /></label><label><span className="mb-2 block text-xs font-semibold text-[#64807c]">Route Outline · 每行一步</span><textarea className="baize-input min-h-36 resize-y" disabled={staged} value={values.outline.join('\n')} onChange={event => update({ outline: event.target.value.split(/\r?\n/) })} /></label></div></div><div className="mt-5 rounded-2xl bg-[#5f8f84]/5 p-4 text-xs leading-5 text-[#718986] dark:bg-[#c9a96b]/5"><div className="flex items-center gap-2">{validation?.valid ? <CheckCircle2 size={16} className="text-[#356b66] dark:text-[#d8bd7e]" /> : <ShieldCheck size={16} />}<strong>{validation?.valid ? '完整 Tech OS 草稿校验通过' : result.error || validation?.errors[0] || '等待有效输入'}</strong></div><p className="mt-2">Existing Knowledge：{suggestion.matchedKnowledgeIds.length} · Path：{suggestion.filePath}</p></div>{staged ? <button type="button" className="baize-button-primary mt-4" onClick={onOpenRepository}><GitCompareArrows size={16} />打开 Repository 草稿</button> : <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"><input className="baize-input font-mono" value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder={`输入 ${phrase} 确认`} /><button type="button" className="baize-button-primary" disabled={!validation?.valid || confirmation !== phrase} onClick={() => result.draft && onStage(result.draft)}>加入 Backlog 草稿<ArrowRight size={16} /></button></div>}</div>}
  </section>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
