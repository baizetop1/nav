import { useEffect, useRef, useState } from 'react';
import { Download, FileUp, X } from 'lucide-react';
import { FULL_BACKUP_MAX_BYTES, parseBackup } from '../lib/backup';
import { captureWorkingDrafts, draftRestoreDescription, parseWorkingDraftBackup, planDraftRestore, restoreWorkingDrafts, type DraftRestorePlan, type WorkingDraftBackup } from '../lib/workingDrafts';

export function WorkingDraftBackupTools() {
  const input = useRef<HTMLInputElement>(null), request = useRef(0);
  const [preview, setPreview] = useState<{ backup: WorkingDraftBackup; plan: DraftRestorePlan } | null>(null);
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false);
  useEffect(() => () => { request.current++; }, []);
  const fail = (cause: unknown) => { setFailed(true); setMessage(cause instanceof Error ? cause.message : '草稿备份操作失败。'); };
  const download = () => {
    try {
      const backup = captureWorkingDrafts();
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `baize-working-drafts-${new Date().toISOString().slice(0, 10)}.json`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFailed(false); setMessage(`已导出 ${backup.blogs.reduce((total, group) => total + group.drafts.length, 0)} 篇博客副本和 ${backup.techOs.length} 份 Tech OS 工作副本。`);
    } catch (cause) { fail(cause); }
  };
  const readFile = async (file: File) => {
    const currentRequest = ++request.current; setBusy(true); setMessage(''); setPreview(null);
    try {
      if (file.size > FULL_BACKUP_MAX_BYTES) throw new Error('请选择不超过 16 MiB 的备份文件。');
      const text = await file.text(); if (request.current !== currentRequest) return;
      const raw = JSON.parse(text.replace(/^\uFEFF/, ''));
      const source = raw?.format === 'baize-working-drafts' ? raw : parseBackup(raw).workingDrafts;
      if (!source) throw new Error('这份旧备份不包含博客或 Tech OS 草稿。');
      const backup = parseWorkingDraftBackup(source), plan = planDraftRestore(backup);
      setPreview({ backup, plan }); setFailed(false);
    } catch (cause) { if (request.current === currentRequest) fail(cause); }
    finally { if (request.current === currentRequest) setBusy(false); }
  };
  const restore = () => {
    if (!preview) return;
    try {
      const latest = planDraftRestore(preview.backup);
      if (draftRestoreDescription(latest) !== draftRestoreDescription(preview.plan)) {
        setPreview({ ...preview, plan: latest }); setMessage('本机草稿发生了变化，已更新预览，请重新确认。'); setFailed(false); return;
      }
      const result = restoreWorkingDrafts(preview.backup);
      setFailed(false); setMessage(`恢复完成：${draftRestoreDescription(result)}。${result.skipped.length ? '未恢复的 Tech OS 内容仍保留在备份文件中。' : ''}`); setPreview(null);
    } catch (cause) { fail(cause); }
  };
  return <div className="space-y-3" aria-label="工作草稿备份与恢复">
    <div className="flex flex-wrap gap-2">
      <button type="button" className="baize-button-secondary text-xs" disabled={busy} onClick={download}><Download size={15} />批量备份工作草稿</button>
      <button type="button" className="baize-button-secondary text-xs" disabled={busy} onClick={() => input.current?.click()}><FileUp size={15} />恢复工作草稿</button>
      <input ref={input} hidden type="file" accept=".json,application/json" aria-label="选择工作草稿备份" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void readFile(file); }} />
    </div>
    <p className="text-xs leading-5 appearance-muted">只备份已保存到本机的博客与 Tech OS 工作副本，并保留远端基线。JSON 含正文，请妥善保存；不包含 Token、密码或尚未暂存的 AI 向导内容。也可从新版完整备份中单独恢复草稿。</p>
    {preview && <section className="space-y-3 rounded-xl border appearance-border p-3" aria-label="工作草稿恢复预览">
      <div className="flex items-center gap-2"><h4 className="flex-1 font-semibold">草稿恢复预览</h4><button type="button" className="baize-icon-button" aria-label="取消草稿恢复" onClick={() => { request.current++; setPreview(null); }}><X size={17} /></button></div>
      <p className="text-xs">{draftRestoreDescription(preview.plan)}</p>
      <p className="text-xs leading-5 appearance-muted">博客同编号的不同内容会另存副本；相同内容不重复导入。已有不同的 Tech OS 工作副本会保留本机，不覆盖。</p>
      {preview.plan.skipped.length > 0 && <ul className="space-y-1 text-xs" role="status">{preview.plan.skipped.map(text => <li key={text}>{text}</li>)}</ul>}
      <button type="button" className="baize-button-primary text-xs" disabled={!preview.plan.writes.length} onClick={restore}>确认恢复到本机</button>
    </section>}
    {(busy || message) && <p className={`text-xs leading-5 ${failed ? 'text-red-700 dark:text-red-300' : 'appearance-muted'}`} role={failed ? 'alert' : 'status'}>{busy ? '正在读取备份并比较本机草稿…' : message}</p>}
  </div>;
}
