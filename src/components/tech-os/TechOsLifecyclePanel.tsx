import { useEffect, useMemo, useState } from 'react';
import type { RepositoryTarget } from '../../services/github';
import type { TechOsSourceFile } from '../../types/tech-os';
import type { TechOsRepositorySnapshot } from '../../types/tech-os-repository';
import { activateRoute, completeQuest, indexFromTechOsFiles } from '../../services/techOsLifecycle';
import { commitTechOsFiles, readTechOsRepository } from '../../services/techOsRepository';

export function TechOsLifecyclePanel({ target, onUpdated }: { target: RepositoryTarget; onUpdated: (files: TechOsSourceFile[]) => void }) {
  const draftKey = `baize_lifecycle_form_v1:${target.owner}/${target.repo}:${target.branch}`;
  const [savedForm] = useState<Record<string, string>>(() => { try { const value = JSON.parse(localStorage.getItem(draftKey) || '{}'); return value && typeof value === 'object' && Object.values(value).every(field => typeof field === 'string') ? value : {}; } catch { return {}; } });
  const [draftSaved, setDraftSaved] = useState(true);
  const [token, setToken] = useState('');
  const [snapshot, setSnapshot] = useState<TechOsRepositorySnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('读取最新仓库后，填写证据并预览变更。不会自动认定你完成实验。');
  const [operation, setOperation] = useState<'quest' | 'route'>('quest');
  const [conclusion, setConclusion] = useState(savedForm.conclusion || '');
  const [evidence, setEvidence] = useState(savedForm.evidence || '');
  const [routeId, setRouteId] = useState('');
  const [questions, setQuestions] = useState(savedForm.questions || '');
  const [confirmed, setConfirmed] = useState(false);
  const [failure, setFailure] = useState(false);
  useEffect(() => { try { localStorage.setItem(draftKey, JSON.stringify({ conclusion, evidence, questions })); setDraftSaved(true); } catch { setDraftSaved(false); } }, [draftKey, conclusion, evidence, questions]);
  const index = useMemo(() => snapshot ? indexFromTechOsFiles(snapshot.files) : null, [snapshot]);
  const current = index?.entities.find(item => item.id === index.state.currentQuestId);
  const routes = index?.entities.filter(item => item.kind === 'route' && item.status === 'backlog') || [];
  const preview = useMemo(() => {
    if (!snapshot || !index) return { plan: null, error: '' };
    try { return { plan: operation === 'quest' ? completeQuest(snapshot.files, index.state.currentQuestId, conclusion, evidence) : activateRoute(snapshot.files, routeId, questions.split('\n')), error: '' }; }
    catch (error) { return { plan: null, error: String((error as Error).message) }; }
  }, [snapshot, index, operation, conclusion, evidence, routeId, questions]);
  const read = async () => {
    setBusy(true); setConfirmed(false); setFailure(false);
    try { const value = await readTechOsRepository(target, token); indexFromTechOsFiles(value.files); setSnapshot(value); onUpdated(value.files); setMessage('已读取最新状态。请检查下方具体变更。'); }
    catch (error) { setFailure(true); setMessage((error as Error).message); }
    finally { setBusy(false); }
  };
  const commit = async () => {
    const plan = preview.plan;
    if (!snapshot || !plan || !confirmed || !window.confirm(`${plan.summary}\n\n结论和证据将写入仓库，可能随网站公开。确认提交吗？`)) return;
    setBusy(true); setFailure(false);
    try {
      const result = await commitTechOsFiles(target, token, snapshot.headSha, plan.updates, plan.summary, fetch, plan.movedPaths);
      setSnapshot(null); setConfirmed(false); setConclusion(''); setEvidence('');
      onUpdated(plan.files);
      setMessage(`提交成功：${plan.summary}。工作台已更新；网站发布仍需等待部署。${result.commitUrl}`);
    } catch (error) { setFailure(true); setMessage((error as Error).message); }
    finally { setBusy(false); }
  };
  return <section className="baize-panel space-y-4 rounded-2xl p-5" aria-label="学习完成与路线切换">
    <h2 className="text-xl font-bold">完成任务 / 启用下一路线</h2>
    <p role="status" className="text-xs">{draftSaved ? '结论、证据和核心问题已自动存为本机草稿。' : '本机保存失败，请复制结论与证据备份，暂勿刷新。'}</p>
    <p className="text-sm text-[#64807c]">一次提交同步修改状态、移动文件、更新下一任务；Token 只留在本次页面内存。记录证据仍由你本人确认。</p>
    <fieldset disabled={busy} className="space-y-4">
      <div className="flex flex-wrap gap-2"><input className="baize-input min-w-0 flex-1" type="password" autoComplete="off" aria-label="学习状态 GitHub Token" value={token} onChange={event => setToken(event.target.value)} placeholder="GitHub Token（Contents 读写）" /><button type="button" className="baize-button-secondary" disabled={!token.trim()} onClick={() => void read()}>读取最新学习状态</button></div>
      {index && <><label className="block">操作<select className="baize-input" value={operation} onChange={event => { setOperation(event.target.value as 'quest' | 'route'); setConfirmed(false); }}><option value="quest">正式完成当前任务</option><option value="route">确认启用储备路线</option></select></label>
        {operation === 'quest' ? <><p>当前：{current?.title || '所有任务已结束，请到路线引擎复盘。'}</p><label className="block">我的结论<textarea className="baize-input min-h-24" value={conclusion} onChange={event => { setConclusion(event.target.value); setConfirmed(false); }} /></label><label className="block">真实证据：实验步骤、结果、记录或产物地址<textarea className="baize-input min-h-24" value={evidence} onChange={event => { setEvidence(event.target.value); setConfirmed(false); }} /></label></> : <><label className="block">选择已保存的路线<select className="baize-input" value={routeId} onChange={event => { setRouteId(event.target.value); setConfirmed(false); }}><option value="">请选择</option>{routes.map(route => <option key={route.id} value={route.id}>{route.id} · {route.title}</option>)}</select></label><p className="text-sm">没有储备路线？先在路线引擎生成并通过仓库提交。旧路线未完成时会暂停保留，不会被删除。</p><label className="block">新路线没有任务时：填写核心问题，每行一个问句<textarea className="baize-input min-h-32" value={questions} onChange={event => { setQuestions(event.target.value); setConfirmed(false); }} placeholder="这个系统的输入和输出是什么？&#10;如何用实验验证它的工作过程？" /></label></>}
        {preview.plan ? <div className="rounded-xl border border-[#5f8f84]/20 p-3"><strong>{preview.plan.summary}</strong><ul className="mt-2 break-all text-xs">{preview.plan.updates.map(file => <li key={file.path}>写入：{file.path}</li>)}{preview.plan.movedPaths.map(path => <li key={path}>移动后移除旧路径：{path}</li>)}</ul><label className="mt-4 flex items-start gap-2"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />我确认内容真实，已检查这些变更及公开范围</label></div> : <p className="text-sm text-[#985247]">{preview.error}</p>}
        <button type="button" className="baize-button-primary" disabled={!confirmed || !preview.plan} onClick={() => void commit()}>确认并提交学习状态</button></>}
    </fieldset>
    <p role="status" className={`break-all text-sm ${failure ? 'text-[#985247]' : 'text-[#64807c]'}`}>{busy ? '正在处理，请勿重复提交…' : message}</p>
  </section>;
}
