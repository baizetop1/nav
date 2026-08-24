import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileDiff, GitCommitHorizontal, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react';
import { validateTechOsDraftFiles } from '../../services/techOsDraftValidation';
import { commitTechOsFiles, diffTechOsFiles, getBundledTechOsFiles, readTechOsRepository } from '../../services/techOsRepository';
import { techOsIndex } from '../../services/techOs';
import type { RepositoryTarget } from '../../services/github';
import type { TechOsSourceFile } from '../../types/tech-os';
import type { TechOsFileDiff, TechOsRepositorySnapshot } from '../../types/tech-os-repository';

interface TechOsRepositoryPanelProps {
  target: RepositoryTarget;
  seedDrafts?: TechOsSourceFile[];
  onCommittedPaths?: (paths: string[]) => void;
}

type PanelPhase = 'idle' | 'loading' | 'ready' | 'committing' | 'success' | 'error';

const CONFIRMATION = 'COMMIT TECH-OS';

export function TechOsRepositoryPanel({ target, seedDrafts = [], onCommittedPaths }: TechOsRepositoryPanelProps) {
  const bundledFiles = useMemo(() => getBundledTechOsFiles(techOsIndex), []);
  const bundledByPath = useMemo(() => new Map(bundledFiles.map(file => [file.path, file.content])), [bundledFiles]);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(bundledFiles.map(file => [file.path, file.content])));
  const [token, setToken] = useState('');
  const [snapshot, setSnapshot] = useState<TechOsRepositorySnapshot | null>(null);
  const [selectedPath, setSelectedPath] = useState('tech-os/state.yml');
  const [phase, setPhase] = useState<PanelPhase>('idle');
  const [message, setMessage] = useState('先读取远端，再检查每一个文件的差异。');
  const [commitMessage, setCommitMessage] = useState('Update Tech OS from workstation');
  const [confirmation, setConfirmation] = useState('');

  const draftFiles = useMemo<TechOsSourceFile[]>(() => Object.entries(drafts).map(([path, content]) => ({ path, content })).sort((a, b) => a.path.localeCompare(b.path)), [drafts]);
  const diffs = useMemo(() => snapshot ? diffTechOsFiles(draftFiles, snapshot.files) : diffTechOsFiles(draftFiles, []), [draftFiles, snapshot]);
  const validation = useMemo(() => validateTechOsDraftFiles(draftFiles), [draftFiles]);
  const changedFiles = diffs.filter(diff => diff.localContent !== null && (diff.status === 'modified' || diff.status === 'local-only'));
  const selected = diffs.find(diff => diff.path === selectedPath) || diffs[0];
  const counts = countStatuses(diffs);

  useEffect(() => {
    if (!seedDrafts.length) return;
    setDrafts(current => {
      const next = { ...current };
      let changed = false;
      seedDrafts.forEach(file => {
        if (next[file.path] === undefined) {
          next[file.path] = file.content;
          changed = true;
        }
      });
      return changed ? next : current;
    });
    setSelectedPath(seedDrafts[seedDrafts.length - 1].path);
  }, [seedDrafts]);

  const loadRemote = async () => {
    setPhase('loading');
    setMessage('正在读取 branch head、Git tree 与 Tech OS blobs…');
    try {
      const remote = await readTechOsRepository(target, token);
      setSnapshot(remote);
      const nextDiffs = diffTechOsFiles(draftFiles, remote.files);
      setSelectedPath(nextDiffs.find(diff => diff.status !== 'same')?.path || nextDiffs[0]?.path || 'tech-os/state.yml');
      setPhase('ready');
      setMessage(`远端读取完成：${remote.files.length} 个受管文件，基线 ${remote.headSha.slice(0, 8)}。`);
    } catch (error) {
      setPhase('error');
      setMessage(errorMessage(error));
    }
  };

  const publishChanges = async () => {
    if (!snapshot || !validation.valid || !changedFiles.length || confirmation !== CONFIRMATION) return;
    if (!window.confirm(`将向 ${target.owner}/${target.repo}:${target.branch} 原子提交 ${changedFiles.length} 个 Tech OS 文件。确定继续吗？`)) return;
    setPhase('committing');
    setMessage('正在重新检查 branch head 并创建原子 commit…');
    try {
      const result = await commitTechOsFiles(
        target,
        token,
        snapshot.headSha,
        changedFiles.map(diff => ({ path: diff.path, content: diff.localContent || '' })),
        commitMessage,
      );
      const remote = await readTechOsRepository(target, token);
      setSnapshot(remote);
      setConfirmation('');
      setPhase('success');
      setMessage(`提交成功：${result.sha.slice(0, 8)} · ${result.changedPaths.length} 个文件。${result.commitUrl}`);
      onCommittedPaths?.(result.changedPaths);
    } catch (error) {
      setPhase('error');
      setMessage(errorMessage(error));
    }
  };

  const setDraft = (path: string, content: string) => setDrafts(current => ({ ...current, [path]: content }));
  const removeDraft = (path: string) => setDrafts(current => {
    const next = { ...current };
    delete next[path];
    return next;
  });

  return <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
    <section className="baize-panel rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
        <div className="flex-1"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5f8f84]/10 text-[#356b66] dark:bg-[#c9a96b]/10 dark:text-[#d8bd7e]"><ShieldCheck size={22} /></span><div><h2 className="text-xl font-bold">Repository Adapter</h2><p className="text-xs text-[#718986]">{target.owner}/{target.repo} · {target.branch} · 仅管理 tech-os/</p></div></div><p className="mt-4 max-w-3xl text-sm leading-6 text-[#64807c] dark:text-[#b8c6c1]">Token 只保存在当前 React 内存。读取不会修改远端；提交前会验证完整草稿、显示差异、重新检查 branch head，并使用单个非 force commit 更新分支。</p></div>
        <div className="w-full space-y-2 lg:w-[26rem]"><label className="text-xs font-semibold text-[#64807c]" htmlFor="tech-os-token">GitHub fine-grained PAT</label><div className="flex gap-2"><input id="tech-os-token" type="password" autoComplete="off" spellCheck={false} className="baize-input min-w-0 flex-1 font-mono" value={token} onChange={event => setToken(event.target.value)} placeholder="github_pat_…" /><button type="button" className="baize-button-primary shrink-0" disabled={phase === 'loading' || phase === 'committing' || token.length < 20} onClick={() => void loadRemote()}><RefreshCw size={16} className={phase === 'loading' ? 'animate-spin' : ''} />读取并比较</button></div></div>
      </div>
      <div className={`mt-5 rounded-xl border p-3 text-xs leading-5 ${phase === 'error' ? 'border-[#a85d50]/25 bg-[#a85d50]/8 text-[#985247] dark:text-[#e1a294]' : phase === 'success' ? 'border-[#5f8f84]/25 bg-[#5f8f84]/8 text-[#315e5b] dark:text-[#c9d8d3]' : 'border-[#5f8f84]/15 bg-[#5f8f84]/5 text-[#64807c] dark:border-[#c9a96b]/12 dark:bg-[#c9a96b]/5 dark:text-[#b8c6c1]'}`}>{message}</div>
    </section>

    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatusCard label="相同" value={counts.same} tone="same" />
      <StatusCard label="已修改" value={counts.modified} tone="modified" />
      <StatusCard label="仅草稿" value={counts['local-only']} tone="local-only" />
      <StatusCard label="仅远端" value={counts['remote-only']} tone="remote-only" />
    </section>

    <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <section className="baize-panel self-start rounded-2xl p-4 xl:sticky xl:top-24"><div className="flex items-center justify-between px-2"><h3 className="font-bold">逐文件差异</h3><span className="text-xs text-[#718986]">{diffs.length}</span></div><div className="mt-4 max-h-[68vh] space-y-2 overflow-y-auto pr-1">{diffs.map(diff => <button key={diff.path} type="button" onClick={() => setSelectedPath(diff.path)} className={`w-full rounded-xl border p-3 text-left transition ${selected?.path === diff.path ? 'border-[#5f8f84]/40 bg-[#5f8f84]/10 dark:border-[#c9a96b]/35 dark:bg-[#c9a96b]/8' : 'border-[#5f8f84]/10 hover:border-[#5f8f84]/30 dark:border-[#c9a96b]/10'}`}><span className="block truncate font-mono text-[11px]">{diff.path}</span><StatusBadge status={diff.status} /></button>)}</div></section>

      <section className="min-w-0 space-y-5">
        {selected ? <div className="baize-panel rounded-2xl p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="break-all font-mono text-xs text-[#718986]">{selected.path}</p><div className="mt-2"><StatusBadge status={selected.status} /></div></div><div className="flex flex-wrap gap-2">{bundledByPath.has(selected.path) && <button type="button" className="baize-button-secondary" onClick={() => setDraft(selected.path, bundledByPath.get(selected.path) || '')}><RotateCcw size={15} />恢复构建版本</button>}{selected.remoteContent !== null && <button type="button" className="baize-button-secondary" onClick={() => setDraft(selected.path, selected.remoteContent || '')}>采用远端</button>}{selected.status === 'remote-only' && drafts[selected.path] !== undefined && <button type="button" className="baize-danger-button" onClick={() => removeDraft(selected.path)}>移出草稿</button>}</div></div><div className="mt-5 grid gap-4 lg:grid-cols-2"><label className="min-w-0"><span className="mb-2 block text-xs font-semibold text-[#64807c]">内存草稿</span><textarea className="baize-input min-h-[30rem] resize-y font-mono text-xs leading-5" value={drafts[selected.path] ?? ''} readOnly={drafts[selected.path] === undefined} onChange={event => setDraft(selected.path, event.target.value)} placeholder="先采用远端，才会加入可编辑草稿。" /></label><label className="min-w-0"><span className="mb-2 block text-xs font-semibold text-[#64807c]">远端基线 {snapshot ? snapshot.headSha.slice(0, 8) : '未读取'}</span><textarea className="baize-input min-h-[30rem] resize-y font-mono text-xs leading-5 opacity-80" value={selected.remoteContent ?? ''} readOnly placeholder="读取远端后显示。" /></label></div></div> : <EmptyRepository />}

        <div className="baize-panel rounded-2xl p-5"><div className="flex items-center gap-2"><FileDiff size={18} className={validation.valid ? 'text-[#356b66] dark:text-[#d8bd7e]' : 'text-[#a85d50]'} /><h3 className="font-bold">提交前校验</h3><span className="ml-auto text-xs text-[#718986]">{validation.entityCount} entities</span></div>{validation.valid ? <p className="mt-3 flex items-center gap-2 text-sm text-[#315e5b] dark:text-[#c9d8d3]"><CheckCircle2 size={16} />完整草稿通过浏览器端 schema、关系和 Main Route 校验。</p> : <div className="mt-3"><p className="flex items-center gap-2 text-sm text-[#985247] dark:text-[#e1a294]"><AlertTriangle size={16} />草稿无效，禁止提交。</p><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[#985247] dark:text-[#e1a294]">{validation.errors.slice(0, 8).map(error => <li key={error}>{error}</li>)}</ul>{validation.errors.length > 8 && <p className="mt-2 text-xs text-[#718986]">另有 {validation.errors.length - 8} 个错误。</p>}</div>}
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]"><input className="baize-input" value={commitMessage} maxLength={120} onChange={event => setCommitMessage(event.target.value)} placeholder="Commit message" /><span className="self-center text-xs text-[#718986]">{commitMessage.length}/120</span></div><div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]"><input className="baize-input font-mono" value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder={`输入 ${CONFIRMATION} 确认`} /><button type="button" className="baize-button-primary" disabled={!snapshot || !validation.valid || !changedFiles.length || confirmation !== CONFIRMATION || phase === 'committing'} onClick={() => void publishChanges()}><GitCommitHorizontal size={17} />{phase === 'committing' ? '提交中…' : `原子提交 ${changedFiles.length} 个文件`}</button></div><p className="mt-3 text-[11px] leading-5 text-[#718986]">不支持删除文件、force push 或管理 `tech-os/templates/`。远端冲突时必须重新读取；本机草稿保留在当前页面内存中。</p></div>
      </section>
    </div>
  </div>;
}

function countStatuses(diffs: TechOsFileDiff[]): Record<TechOsFileDiff['status'], number> {
  const counts: Record<TechOsFileDiff['status'], number> = { same: 0, modified: 0, 'local-only': 0, 'remote-only': 0 };
  diffs.forEach(diff => { counts[diff.status] += 1; });
  return counts;
}

function StatusCard({ label, value, tone }: { label: string; value: number; tone: TechOsFileDiff['status'] }) {
  return <div className="baize-panel rounded-2xl p-4"><StatusBadge status={tone} /><strong className="mt-3 block text-3xl">{value}</strong><span className="text-xs text-[#718986]">{label}</span></div>;
}

function StatusBadge({ status }: { status: TechOsFileDiff['status'] }) {
  const labels = { same: '相同', modified: '已修改', 'local-only': '仅草稿', 'remote-only': '仅远端' };
  const classes = status === 'same' ? 'bg-[#5f8f84]/10 text-[#456b68] dark:text-[#c9d8d3]' : status === 'modified' ? 'bg-[#c9a96b]/15 text-[#80672e] dark:text-[#e1ca91]' : status === 'local-only' ? 'bg-[#5b7fa3]/12 text-[#426582] dark:text-[#a9c5dc]' : 'bg-[#a85d50]/10 text-[#985247] dark:text-[#e1a294]';
  return <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${classes}`}>{labels[status]}</span>;
}

function EmptyRepository() {
  return <div className="baize-panel rounded-2xl p-12 text-center text-sm text-[#718986]">没有可比较的 Tech OS 文件。</div>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
