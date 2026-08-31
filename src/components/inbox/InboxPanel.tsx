import { useEffect, useMemo, useState } from 'react';
import { Archive, Check, Cloud, Copy, Download, ExternalLink, FileText, Github, HelpCircle, Inbox as InboxIcon, Lightbulb, Link as LinkIcon, Lock, Pencil, Plus, RefreshCw, RotateCcw, StickyNote, Trash2, X } from 'lucide-react';
import { createBlogDraftDefaults, slugifyBlogDraft, type BlogDraftInput, type BlogDraftResult } from '../../services/blogDraft';
import { inboxItemToMarkdown, parseInboxTags } from '../../services/inbox';
import { countUnsyncedInboxItems, countUnsyncedStudyProgress, isInboxItemSynced } from '../../services/inboxSync';
import { loadStudyProgressStore } from '../../services/techOsStudyProgress';
import { applyTechOsCaptureKind, getTechOsCaptureKind, getVisibleInboxTags, TECH_OS_CAPTURE_LABELS } from '../../services/techOsCapture';
import { getWebCryptoUnavailableReason } from '../../services/webCrypto';
import type { InboxDraft, InboxItem, InboxItemStatus } from '../../types/inbox';
import type { InboxSyncMeta, InboxSyncUiState } from '../../types/inbox-sync';
import type { TechOsCaptureKind } from '../../types/tech-os-capture';

interface InboxPanelProps {
  open: boolean;
  captureRequest: number;
  items: InboxItem[];
  repositoryLabel: string;
  blogRepositoryLabel: string;
  syncMeta: InboxSyncMeta | null;
  syncState: InboxSyncUiState;
  onCreate: (draft: InboxDraft) => string | null;
  onUpdate: (id: string, draft: InboxDraft) => string | null;
  onStatusChange: (id: string, status: InboxItemStatus) => void;
  onDelete: (id: string) => void;
  onRestore: (token: string, password: string) => Promise<void>;
  onSync: (token: string, password: string) => Promise<void>;
  onCreateBlogDraft: (item: InboxItem, input: BlogDraftInput, token: string) => Promise<BlogDraftResult & { sourceArchived: boolean }>;
  onClose: () => void;
}

interface InboxEditorProps {
  initial?: InboxItem;
  autoFocus?: boolean;
  submitLabel: string;
  onSubmit: (draft: InboxDraft) => string | null;
  onCancel?: () => void;
}

export function InboxPanel({ open, captureRequest, items, repositoryLabel, blogRepositoryLabel, syncMeta, syncState, onCreate, onUpdate, onStatusChange, onDelete, onRestore, onSync, onCreateBlogDraft, onClose }: InboxPanelProps) {
  const [view, setView] = useState<InboxItemStatus>('inbox');
  const [captureOpen, setCaptureOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [blogDraftItemId, setBlogDraftItemId] = useState<string | null>(null);
  const [githubToken, setGithubToken] = useState('');
  const [syncPassword, setSyncPassword] = useState('');
  const [syncPasswordConfirm, setSyncPasswordConfirm] = useState('');
  const [syncValidationMessage, setSyncValidationMessage] = useState('');
  const [syncOpen, setSyncOpen] = useState(() => !syncMeta);
  const visibleItems = useMemo(() => items
    .filter(item => !item.deletedAt && item.status === view)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)), [items, view]);
  const groups = useMemo(() => groupInboxItems(visibleItems), [visibleItems]);
  const inboxCount = items.filter(item => !item.deletedAt && item.status === 'inbox').length;
  const archivedCount = items.filter(item => !item.deletedAt && item.status === 'archived').length;
  const unsyncedCount = countUnsyncedInboxItems(items, syncMeta);
  const unsyncedStudyCount = countUnsyncedStudyProgress(loadStudyProgressStore(), syncMeta);
  const pendingSyncCount = unsyncedCount + unsyncedStudyCount;
  const syncBusy = syncState.phase === 'syncing' || syncState.phase === 'restoring';
  const encryptionUnavailableReason = useMemo(() => getWebCryptoUnavailableReason(), []);
  const blogDraftItem = blogDraftItemId ? items.find(item => item.id === blogDraftItemId && !item.deletedAt) : undefined;
  const syncLabel = syncState.phase === 'restoring'
    ? '恢复中…'
    : syncState.phase === 'syncing'
      ? '同步中…'
    : syncState.phase === 'error'
      ? '! 同步失败'
      : pendingSyncCount > 0
        ? `○ ${pendingSyncCount} 项未同步`
        : syncMeta
          ? '● 已同步'
          : '○ 尚未同步';

  useEffect(() => {
    if (!open) return;
    setEditingId(null);
    setBlogDraftItemId(null);
    if (captureRequest > 0) {
      setView('inbox');
      setCaptureOpen(true);
    }
  }, [captureRequest, open]);

  useEffect(() => {
    if (open) return;
    setGithubToken('');
    setSyncPassword('');
    setSyncPasswordConfirm('');
    setSyncValidationMessage('');
  }, [open]);

  useEffect(() => {
    if (open && (syncBusy || syncState.phase === 'error')) setSyncOpen(true);
  }, [open, syncBusy, syncState.phase]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  if (!open) return null;

  const copyItem = async (item: InboxItem) => {
    await navigator.clipboard.writeText(inboxItemToMarkdown(item));
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId(current => current === item.id ? null : current), 1500);
  };

  const runSync = async () => {
    if (syncPassword !== syncPasswordConfirm) {
      setSyncValidationMessage('两次输入的加密密码不一致。');
      return;
    }
    setSyncValidationMessage('');
    await onSync(githubToken, syncPassword);
  };

  const runRestore = async () => {
    setSyncValidationMessage('');
    await onRestore(githubToken, syncPassword);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#07191d]/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Inbox" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="baize-panel ml-auto flex h-full w-full max-w-2xl flex-col border-y-0 border-r-0">
        <header className="flex items-center justify-between border-b border-[#5f8f84]/15 px-4 py-4 sm:px-6 dark:border-[#c9a96b]/10">
          <div><h2 className="flex items-center gap-2 text-xl font-bold text-[#173b41] dark:text-[#f4f1e8]"><InboxIcon size={21} />Inbox <span className="text-sm font-medium text-[#718986]">({inboxCount})</span></h2><p className="mt-1 text-xs text-[#718986]">本地优先保存 · {syncLabel}</p></div>
          <button type="button" className="baize-icon-button" onClick={onClose} aria-label="关闭 Inbox"><X size={20} /></button>
        </header>

        <div className="flex items-center gap-2 border-b border-[#5f8f84]/15 px-4 py-3 sm:px-6 dark:border-[#c9a96b]/10">
          <button type="button" className={view === 'inbox' ? 'baize-button-primary' : 'baize-button-secondary'} onClick={() => { setView('inbox'); setEditingId(null); }}><InboxIcon size={16} />收件箱 {inboxCount}</button>
          <button type="button" className={view === 'archived' ? 'baize-button-primary' : 'baize-button-secondary'} onClick={() => { setView('archived'); setEditingId(null); }}><Archive size={16} />归档 {archivedCount}</button>
          <button type="button" className="baize-button-secondary ml-auto" aria-expanded={captureOpen} onClick={() => setCaptureOpen(current => !current)}><Plus size={17} />快速记录</button>
        </div>

        <details open={syncOpen} onToggle={event => setSyncOpen(event.currentTarget.open)} className="border-b border-[#5f8f84]/15 px-4 py-3 sm:px-6 dark:border-[#c9a96b]/10">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-[#456b68] dark:text-[#d9ddd6]"><Cloud size={16} />多端加密同步<span className={`ml-auto text-xs ${syncState.phase === 'error' ? 'text-[#985247] dark:text-[#e1a294]' : 'text-[#718986]'}`}>{syncLabel}</span></summary>
          <div className="mt-3 space-y-3 rounded-xl border border-[#5f8f84]/15 bg-white/20 p-3 dark:border-[#c9a96b]/10 dark:bg-[#07191d]/20">
            <p className="text-xs leading-5 text-[#718986]">目标：{repositoryLabel} · <code>data/inbox.enc.json</code>。密文同时携带 Inbox 与 Tech OS 学习打卡；密码和 Token 不会保存。</p>
            <div className="grid gap-2 text-xs leading-5 sm:grid-cols-2">
              <p className="rounded-lg bg-[#5f8f84]/8 p-2 text-[#55706d] dark:bg-[#c9a96b]/8 dark:text-[#b8c6c1]"><strong className="block text-[#315e5b] dark:text-[#d9ccb0]">新手机 / 新电脑</strong>输入同一 Token 和加密密码，点“从云端恢复”。它只读取并与本机合并，不产生 GitHub 提交。</p>
              <p className="rounded-lg bg-[#5f8f84]/8 p-2 text-[#55706d] dark:bg-[#c9a96b]/8 dark:text-[#b8c6c1]"><strong className="block text-[#315e5b] dark:text-[#d9ccb0]">日常双向同步</strong>点“合并并同步”，先读取两端、保留较新版本，再把合并后的密文提交回 GitHub。</p>
            </div>
            {encryptionUnavailableReason && <p role="alert" className="rounded-lg border border-[#a85d50]/20 bg-[#a85d50]/8 p-2 text-xs leading-5 text-[#985247] dark:text-[#e1a294]">{encryptionUnavailableReason}</p>}
            <input type="password" autoComplete="new-password" spellCheck={false} className="baize-input font-mono" value={githubToken} onChange={event => setGithubToken(event.target.value)} placeholder="GitHub Token" />
            <div className="grid gap-2 sm:grid-cols-2">
              <input type="password" autoComplete="new-password" className="baize-input" value={syncPassword} onChange={event => setSyncPassword(event.target.value)} placeholder="加密密码（至少 12 字符）" />
              <input type="password" autoComplete="new-password" className="baize-input" value={syncPasswordConfirm} onChange={event => setSyncPasswordConfirm(event.target.value)} placeholder="再次输入（仅合并同步需要）" />
            </div>
            {(unsyncedCount > 0 || unsyncedStudyCount > 0) && <p className="text-[11px] text-[#718986]">待同步：Inbox {unsyncedCount} 项 · 学习打卡 {unsyncedStudyCount} 项</p>}
            <div className="flex flex-wrap items-center gap-2">
              <p className={`min-w-0 flex-1 break-words text-xs ${syncValidationMessage || syncState.phase === 'error' ? 'text-[#985247] dark:text-[#e1a294]' : 'text-[#315e5b] dark:text-[#b8cec7]'}`}>{syncValidationMessage || syncState.message}</p>
              {syncState.commitUrl && <a className="text-xs text-[#356b66] hover:underline dark:text-[#d2b775]" href={syncState.commitUrl} target="_blank" rel="noreferrer">查看加密提交</a>}
              <button type="button" className="baize-button-secondary" disabled={Boolean(encryptionUnavailableReason) || syncBusy || !githubToken || !syncPassword} onClick={() => { void runRestore(); }}><Download size={16} className={syncState.phase === 'restoring' ? 'animate-pulse' : ''} />{syncState.phase === 'restoring' ? '正在恢复' : '从云端恢复'}</button>
              <button type="button" className="baize-button-primary" disabled={Boolean(encryptionUnavailableReason) || syncBusy || !githubToken || !syncPassword || !syncPasswordConfirm} onClick={() => { void runSync(); }}><RefreshCw size={16} className={syncState.phase === 'syncing' ? 'animate-spin' : ''} />{syncState.phase === 'syncing' ? '正在合并' : '合并并同步'}</button>
            </div>
            <p className="flex items-center gap-1 text-[11px] text-[#829793]"><Lock size={12} />任何读取、解密或提交失败都不会清空本机数据。{syncMeta ? `上次同步：${new Date(syncMeta.lastSyncedAt).toLocaleString('zh-CN')}` : ''}</p>
          </div>
        </details>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {blogDraftItem && <BlogDraftEditor key={blogDraftItem.id} item={blogDraftItem} token={githubToken} repositoryLabel={blogRepositoryLabel} onTokenChange={setGithubToken} onSubmit={onCreateBlogDraft} onClose={() => setBlogDraftItemId(null)} />}

          {captureOpen && <section className="mb-5 rounded-2xl border border-[#5f8f84]/20 bg-white/25 p-4 dark:border-[#c9a96b]/15 dark:bg-[#07191d]/25" aria-label="快速记录">
            <div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold text-[#234b4e] dark:text-[#f4f1e8]">快速记录</h3><p className="mt-1 text-xs text-[#718986]">Question / Idea / Note / Link 共用现有加密 Inbox</p></div><span className="text-xs text-[#718986]">保存后立即写入本机</span></div>
            <InboxEditor autoFocus submitLabel="保存" onSubmit={draft => {
              const error = onCreate(draft);
              if (!error) setView('inbox');
              return error;
            }} onCancel={() => setCaptureOpen(false)} />
          </section>}

          {!visibleItems.length && <div className="py-16 text-center text-[#718986]"><InboxIcon size={30} className="mx-auto mb-3 opacity-50" /><p>{view === 'inbox' ? 'Inbox 还是空的，从快速记录开始。' : '还没有归档内容。'}</p></div>}

          {groups.map(group => <section key={group.label} className="mb-6" aria-label={group.label}>
            <h3 className="mb-2 text-xs font-semibold tracking-[0.15em] text-[#718986]">{group.label}</h3>
            <div className="space-y-3">{group.items.map(item => <article key={item.id} className="rounded-2xl border border-[#5f8f84]/15 bg-white/20 p-4 dark:border-[#c9a96b]/10 dark:bg-[#07191d]/20">
              {editingId === item.id ? <InboxEditor initial={item} submitLabel="保存修改" onSubmit={draft => {
                const error = onUpdate(item.id, draft);
                if (!error) setEditingId(null);
                return error;
              }} onCancel={() => setEditingId(null)} /> : <>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5f8f84]/10 text-[#456b68] dark:bg-[#c9a96b]/8 dark:text-[#d9ddd6]">{item.type === 'link' ? <LinkIcon size={17} /> : <InboxIcon size={17} />}</span>
                  <div className="min-w-0 flex-1"><h4 className="break-words font-semibold text-[#234b4e] dark:text-[#f4f1e8]">{itemTitle(item)}</h4>{item.content && <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#55706d] dark:text-[#afc0bb]">{item.content}</p>}{item.type === 'link' && item.url && <a className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-xs text-[#356b66] hover:underline dark:text-[#d2b775]" href={item.url} target="_blank" rel="noreferrer"><ExternalLink size={13} />{item.url}</a>}</div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#5f8f84]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#356b66] dark:bg-[#c9a96b]/10 dark:text-[#e1ca91]">{TECH_OS_CAPTURE_LABELS[getTechOsCaptureKind(item)]}</span>{getVisibleInboxTags(item.tags).map(tag => <span key={tag} className="baize-chip">#{tag}</span>)}<span className="ml-auto text-[11px] text-[#829793]">{isInboxItemSynced(item, syncMeta) ? '● 已同步' : '○ 未同步'} · {formatInboxTime(item.updatedAt)}</span></div>
                <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-[#5f8f84]/10 pt-3 dark:border-[#c9a96b]/10">
                  <button type="button" className="baize-button-secondary" onClick={() => setEditingId(item.id)}><Pencil size={15} />编辑</button>
                  <button type="button" className="baize-button-secondary" onClick={() => { void copyItem(item); }}>{copiedId === item.id ? <Check size={15} /> : <Copy size={15} />}{copiedId === item.id ? '已复制' : '复制 Markdown'}</button>
                  <button type="button" className="baize-button-primary" onClick={() => { setBlogDraftItemId(item.id); setCaptureOpen(false); setEditingId(null); window.setTimeout(() => document.getElementById('inbox-blog-draft-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0); }}><FileText size={15} />转为博客草稿</button>
                  <button type="button" className="baize-button-secondary" onClick={() => onStatusChange(item.id, view === 'inbox' ? 'archived' : 'inbox')}>{view === 'inbox' ? <Archive size={15} /> : <RotateCcw size={15} />}{view === 'inbox' ? '归档' : '恢复'}</button>
                  <button type="button" className="baize-danger-button" onClick={() => { if (confirm('确定删除这条记录吗？内容会保留软删除标记。')) onDelete(item.id); }}><Trash2 size={15} />删除</button>
                </div>
              </>}
            </article>)}</div>
          </section>)}
        </div>
      </aside>
    </div>
  );
}

function BlogDraftEditor({ item, token, repositoryLabel, onTokenChange, onSubmit, onClose }: {
  item: InboxItem;
  token: string;
  repositoryLabel: string;
  onTokenChange: (token: string) => void;
  onSubmit: (item: InboxItem, input: BlogDraftInput, token: string) => Promise<BlogDraftResult & { sourceArchived: boolean }>;
  onClose: () => void;
}) {
  const defaults = useMemo(() => createBlogDraftDefaults(item), [item]);
  const [title, setTitle] = useState(defaults.title);
  const [slug, setSlug] = useState(defaults.slug);
  const [slugEdited, setSlugEdited] = useState(false);
  const [category, setCategory] = useState(defaults.category);
  const [format, setFormat] = useState(defaults.format);
  const [tags, setTags] = useState(defaults.tags.join(', '));
  const [related, setRelated] = useState('');
  const [phase, setPhase] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<BlogDraftResult | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPhase('creating');
    setMessage('');
    setResult(null);
    try {
      const created = await onSubmit(item, {
        title,
        slug,
        category,
        format,
        tags: splitList(tags),
        related: splitList(related),
      }, token);
      setResult(created);
      setPhase('success');
      setMessage(created.sourceArchived
        ? '博客草稿已创建，来源记录已归档。归档状态需要下次 Inbox 同步才会进入密文备份。'
        : '博客草稿已创建，但浏览器未能保存来源归档状态。');
    } catch (error) {
      setPhase('error');
      setMessage(error instanceof Error ? error.message : '创建博客草稿失败。');
    }
  };

  return <section id="inbox-blog-draft-editor" className="mb-5 border-y border-[#5f8f84]/20 py-5 dark:border-[#c9a96b]/15" aria-label="转为博客草稿">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div><h3 className="flex items-center gap-2 font-semibold text-[#234b4e] dark:text-[#f4f1e8]"><FileText size={18} />转为博客草稿</h3><p className="mt-1 text-xs leading-5 text-[#718986]">目标：{repositoryLabel} · <code>_drafts/{slug || 'slug'}.md</code>。草稿不会进入公开文章索引。</p></div>
      <button type="button" className="baize-icon-button" onClick={onClose} aria-label="关闭博客草稿表单"><X size={18} /></button>
    </div>
    <form className="space-y-3" onSubmit={submit}>
      <label className="block text-xs font-semibold text-[#64807c]">标题<input className="baize-input mt-1" value={title} onChange={event => { const nextTitle = event.target.value; setTitle(nextTitle); if (!slugEdited) setSlug(slugifyBlogDraft(nextTitle)); }} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-[#64807c]">Slug<input className="baize-input mt-1 font-mono" value={slug} onChange={event => { setSlug(event.target.value); setSlugEdited(true); }} placeholder="browser-navigation" /></label>
        <label className="block text-xs font-semibold text-[#64807c]">分类<input className="baize-input mt-1" value={category} onChange={event => setCategory(event.target.value)} /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-[#64807c]">形式<select className="baize-input mt-1" value={format} onChange={event => setFormat(event.target.value)}><option>笔记</option><option>教程</option><option>记录</option><option>复盘</option><option>观点</option><option>清单</option><option>排障记录</option><option>实验复盘</option></select></label>
        <label className="block text-xs font-semibold text-[#64807c]">标签<input className="baize-input mt-1" value={tags} onChange={event => setTags(event.target.value)} placeholder="逗号分隔" /></label>
      </div>
      <label className="block text-xs font-semibold text-[#64807c]">相关文章 Slug（可选）<input className="baize-input mt-1 font-mono" value={related} onChange={event => setRelated(event.target.value)} placeholder="dns-basics, http-request" /></label>
      <label className="block text-xs font-semibold text-[#64807c]">GitHub Token<input type="password" autoComplete="new-password" spellCheck={false} className="baize-input mt-1 font-mono" value={token} onChange={event => onTokenChange(event.target.value)} placeholder="github_pat_… 或 ghp_…" /></label>
      <p className="flex items-center gap-1 text-[11px] leading-5 text-[#829793]"><Lock size={12} />Token 只保留在当前页面内存；需授权博客仓库 Contents 读写。</p>
      <div className="flex flex-wrap items-center gap-3">
        <p role={phase === 'error' ? 'alert' : undefined} className={`min-w-0 flex-1 break-words text-xs leading-5 ${phase === 'error' ? 'text-[#985247] dark:text-[#e1a294]' : 'text-[#315e5b] dark:text-[#b8cec7]'}`}>{message}</p>
        {result && <a className="text-xs text-[#356b66] hover:underline dark:text-[#d2b775]" href={result.commitUrl} target="_blank" rel="noreferrer">查看草稿提交</a>}
        <button type="submit" className="baize-button-primary" disabled={phase === 'creating' || phase === 'success' || !token || !title || !slug}><Github size={16} />{phase === 'creating' ? '创建中…' : phase === 'success' ? '已创建' : '创建博客草稿'}</button>
      </div>
    </form>
  </section>;
}

function splitList(value: string): string[] {
  return value.split(/[,，\n]/).map(item => item.trim()).filter(Boolean);
}

function InboxEditor({ initial, autoFocus, submitLabel, onSubmit, onCancel }: InboxEditorProps) {
  const [captureKind, setCaptureKind] = useState<TechOsCaptureKind>(initial ? getTechOsCaptureKind(initial) : 'note');
  const [title, setTitle] = useState(initial?.title || '');
  const [content, setContent] = useState(initial?.content || '');
  const [url, setUrl] = useState(initial?.url || '');
  const [tags, setTags] = useState(getVisibleInboxTags(initial?.tags || []).join(', '));
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const error = onSubmit(applyTechOsCaptureKind({ type: captureKind === 'link' ? 'link' : 'text', title, content, url, tags: parseInboxTags(tags) }, captureKind));
    if (error) {
      setMessage(error);
      setSaved(false);
      return;
    }
    setMessage('已保存在本机 · ○ 未同步');
    setSaved(true);
    if (!initial) {
      setTitle('');
      setContent('');
      setUrl('');
      setTags('');
    }
  };

  return <form onSubmit={submit} className="space-y-3">
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <CaptureKindButton kind="question" active={captureKind === 'question'} icon={<HelpCircle size={15} />} onClick={() => { setCaptureKind('question'); setMessage(''); }} />
      <CaptureKindButton kind="idea" active={captureKind === 'idea'} icon={<Lightbulb size={15} />} onClick={() => { setCaptureKind('idea'); setMessage(''); }} />
      <CaptureKindButton kind="note" active={captureKind === 'note'} icon={<StickyNote size={15} />} onClick={() => { setCaptureKind('note'); setMessage(''); }} />
      <CaptureKindButton kind="link" active={captureKind === 'link'} icon={<LinkIcon size={15} />} onClick={() => { setCaptureKind('link'); setMessage(''); }} />
    </div>
    <input className="baize-input" value={title} onChange={event => setTitle(event.target.value)} placeholder="标题（可选）" />
    {captureKind === 'link' && <input className="baize-input" value={url} onChange={event => setUrl(event.target.value)} placeholder="链接，例如 example.com/article" autoFocus={autoFocus} />}
    <textarea id={autoFocus ? 'quick-capture-content' : undefined} className="baize-input min-h-28 resize-y" value={content} onChange={event => setContent(event.target.value)} placeholder={captureKind === 'link' ? '备注（可选）' : captureKind === 'question' ? '记录想弄清楚的问题……' : captureKind === 'idea' ? '记录刚出现的想法……' : '记录内容……'} autoFocus={autoFocus && captureKind !== 'link'} />
    <input className="baize-input" value={tags} onChange={event => setTags(event.target.value)} placeholder="标签（可选，逗号分隔）" />
    <div className="flex flex-wrap items-center justify-between gap-2"><p className={`text-xs ${saved ? 'text-[#315e5b] dark:text-[#b8cec7]' : 'text-[#985247] dark:text-[#e1a294]'}`}>{message}</p><div className="ml-auto flex gap-2">{onCancel && <button type="button" className="baize-button-secondary" onClick={onCancel}>取消</button>}<button type="submit" className="baize-button-primary"><Plus size={16} />{submitLabel}</button></div></div>
  </form>;
}

function CaptureKindButton({ kind, active, icon, onClick }: { kind: TechOsCaptureKind; active: boolean; icon: React.ReactNode; onClick: () => void }) {
  return <button type="button" className={active ? 'baize-button-primary' : 'baize-button-secondary'} onClick={onClick}>{icon}{TECH_OS_CAPTURE_LABELS[kind]}</button>;
}

function groupInboxItems(items: InboxItem[]): Array<{ label: string; items: InboxItem[] }> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const groups = new Map<string, InboxItem[]>();
  for (const item of items) {
    const date = new Date(item.updatedAt);
    const label = sameLocalDay(date, today) ? '今天' : sameLocalDay(date, yesterday) ? '昨天' : date.toLocaleDateString('zh-CN');
    groups.set(label, [...(groups.get(label) || []), item]);
  }
  return [...groups].map(([label, groupItems]) => ({ label, items: groupItems }));
}

function sameLocalDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function itemTitle(item: InboxItem): string {
  if (item.title) return item.title;
  if (item.type === 'link' && item.url) return new URL(item.url).hostname;
  return item.content?.split(/\r?\n/)[0].slice(0, 80) || '无标题记录';
}

function formatInboxTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
