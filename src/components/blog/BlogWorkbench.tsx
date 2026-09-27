import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, Eye, FileText, Github, ImagePlus, Link, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { siteConfig } from '../../data/config';
import { BLOG_WORKSPACE_EVENT, createBlogDraft, listBlogDrafts, loadBlogDraft, removeBlogDraft, saveBlogDraft, type BlogLocalDraft } from '../../lib/blogWorkspace';
import { commitBlogWrite, createBlogMarkdown, editBlogDocument, getBlogDeployment, listBlogEntries, loadBlogSource, prepareBlogWrite, readBlogDocument } from '../../services/blogWorkbench';
import type { BlogDocument, BlogEntry, BlogSaveAction, BlogSource, BlogWritePlan } from '../../types/blog';
import { BlogPreview } from './BlogPreview';
import { useBlogAutosave } from './useBlogAutosave';

const target = siteConfig.blogRepository;
const repositoryUrl = `https://github.com/${target.owner}/${target.repo}`;
function titleOf(draft: BlogLocalDraft): string { try { return readBlogDocument(draft.markdown).title || '未命名文章'; } catch { return draft.source?.path || 'Markdown 草稿'; } }
function exportMarkdown(markdown: string, name = 'article') {
  const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `${name.replace(/[\\/:*?"<>|]/g, '-').slice(0, 100) || 'article'}.md`; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function BlogWorkbench({ onClose, onDirtyChange }: { onClose: () => void; onDirtyChange: (dirty: boolean) => void }) {
  const [local, setLocal] = useState(() => listBlogDrafts(target));
  const [selected, setSelected] = useState<BlogLocalDraft | null>(() => local.drafts[0] || null);
  const [entries, setEntries] = useState<BlogEntry[]>([]);
  const [token, setToken] = useState(''), [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [connectionOpen, setConnectionOpen] = useState(false);
  const dirty = useRef(false), importRef = useRef<HTMLInputElement>(null);
  const refresh = useCallback(() => setLocal(listBlogDrafts(target)), []);
  const setDirty = useCallback((value: boolean) => { dirty.current = value; onDirtyChange(value); }, [onDirtyChange]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload); window.addEventListener('storage', refresh); window.addEventListener(BLOG_WORKSPACE_EVENT, refresh);
    return () => { window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('storage', refresh); window.removeEventListener(BLOG_WORKSPACE_EVENT, refresh); };
  }, [refresh]);
  const canSwitch = () => {
    if (dirty.current || busy) { setMessage('当前文章还有未保存内容或正在处理，请先等待保存完成；如保存失败，可导出 Markdown 或另存副本。'); return false; }
    setMessage(''); return true;
  };
  const openLocal = (draft: BlogLocalDraft) => {
    if (!canSwitch() || selected?.id === draft.id) return;
    const latest = loadBlogDraft(target, draft.id);
    if (latest.status !== 'loaded') { setMessage(latest.status === 'error' ? latest.message : '这份本地草稿已在另一页移除。'); refresh(); return; }
    setSelected(latest.draft);
  };
  const addLocal = async (markdown = createBlogMarkdown({ title: '', slug: `note-${Date.now().toString(36)}` })) => {
    if (!canSwitch()) return;
    const draft = createBlogDraft(target, markdown);
    const result = await saveBlogDraft(target, null, draft);
    setSelected(result.status === 'saved' ? result.draft : draft); refresh();
    if (result.status !== 'saved') { setDirty(true); setMessage(result.status === 'error' ? result.message : '新草稿保存冲突。'); }
  };
  const connect = async () => {
    setBusy(true); setMessage('');
    try { const snapshot = await listBlogEntries(token, target); setEntries(snapshot.entries); setMessage(`已读取 ${snapshot.entries.length} 篇远端文章；本地修改不会被刷新列表覆盖。`); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  };
  const openRemote = async (entry: BlogEntry) => {
    if (!canSwitch()) return;
    const existing = local.drafts.find(draft => draft.source?.path === entry.path);
    if (existing) { openLocal(existing); return; }
    setBusy(true); setMessage('');
    try {
      const source = await loadBlogSource(entry, token, target);
      const draft = createBlogDraft(target, source.markdown, source), result = await saveBlogDraft(target, null, draft);
      if (result.status !== 'saved') throw new Error(result.status === 'error' ? result.message : '本地保存发生冲突。');
      setSelected(result.draft); refresh();
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  };
  const removeLocal = async () => {
    if (!selected || !canSwitch() || !window.confirm('移除这份本地编辑副本？本地尚未提交的修改会被删除，GitHub 上的文章不会删除。建议先导出 Markdown。')) return;
    const latest = loadBlogDraft(target, selected.id);
    if (latest.status !== 'loaded') { setMessage('无法读取当前副本，请刷新列表。'); return; }
    const result = await removeBlogDraft(target, selected.id, latest.draft.revision);
    if (result.status === 'removed') { setSelected(null); refresh(); }
    else setMessage(result.status === 'error' ? result.message : '另一页刚修改了此副本，已停止移除。');
  };
  const copyLocal = async (markdown: string) => {
    try {
      const copy = createBlogDraft(target, markdown), result = await saveBlogDraft(target, null, copy);
      if (result.status === 'saved') { setDirty(false); setSelected(result.draft); refresh(); }
      else setMessage(result.status === 'error' ? result.message : '副本保存冲突，请导出 Markdown。');
    } catch (error) { setMessage((error as Error).message); }
  };
  const rows = useMemo(() => {
    const drafts = local.drafts.map(draft => ({ key: draft.id, title: titleOf(draft), kind: draft.source ? draft.source.path.startsWith('_posts/') ? 'published' : 'draft' : 'local', path: draft.source?.path || '', draft, entry: null as BlogEntry | null }));
    const known = new Set(drafts.map(row => row.path).filter(Boolean));
    return [...drafts, ...entries.filter(entry => !known.has(entry.path)).map(entry => ({ key: entry.path, title: entry.title, kind: entry.kind, path: entry.path, draft: null, entry }))]
      .filter(row => (filter === 'all' || filter === row.kind) && `${row.title} ${row.path}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  }, [local, entries, filter, query]);
  return <main className="min-h-screen bg-[#e4ebe5] p-3 text-[#234b4e] dark:bg-[#07191d] dark:text-[#d9e3de] sm:p-6">
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <button type="button" className="baize-button-secondary" onClick={() => { if (canSwitch()) onClose(); }}><ArrowLeft size={16} />返回导航</button>
        <div className="mr-auto"><h1 className="text-2xl font-bold">博客工作台</h1><p className="mt-1 text-xs text-[#718986]">从一份想法，到一篇文章。先在本机写好，再决定公开。</p></div>
        <button type="button" className="baize-button-secondary" aria-expanded={connectionOpen} onClick={() => setConnectionOpen(value => !value)}><Github size={16} />连接博客仓库</button>
        <button type="button" className="baize-button-primary" disabled={busy} onClick={() => void addLocal()}><Plus size={16} />新建文章</button>
      </header>
      {connectionOpen && <section className="baize-panel space-y-3 rounded-2xl p-4" aria-label="博客仓库连接">
        <p className="break-all text-sm">{target.owner}/{target.repo} · {target.branch}</p>
        <div className="flex flex-wrap items-end gap-3"><label className="w-full min-w-0 text-sm sm:flex-1">GitHub Token<input type="password" autoComplete="new-password" spellCheck={false} className="baize-input mt-1" value={token} onChange={event => setToken(event.target.value)} placeholder="仅保存在本次工作台内存中" /></label><button type="button" className="baize-button-secondary" disabled={busy} onClick={() => void connect()}><RefreshCw size={15} />{busy ? '正在读取…' : '读取文章列表'}</button><button type="button" className="baize-button-secondary" onClick={() => setToken('')}>清除凭据</button></div>
        <p className="text-xs leading-5 text-[#718986]">本地写作不需要 Token。读取公开仓库可不填；提交需 Contents 读写，查看部署需相应读取权限。Token 不写入本地存储。仓库草稿不是私密存储：公开仓库中的 Markdown 任何人都能看到。</p>
      </section>}
      {message && <p role="status" className="baize-panel break-words rounded-xl p-3 text-sm">{message}</p>}
      {local.issues.length > 0 && <div role="alert" className="rounded-xl border border-red-300 p-3 text-sm">部分本地草稿无法读取，原始记录未覆盖。{local.issues.map((issue, i) => <p key={i}>{typeof issue === 'string' ? issue : issue.message}</p>)}</div>}
      <div className="grid items-start gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="baize-panel min-w-0 space-y-3 rounded-2xl p-4" aria-label="博客文章列表">
          <div className="flex items-center gap-2"><FileText size={17} /><h2 className="flex-1 font-semibold">文章列表</h2><span className="text-xs">{rows.length}</span></div>
          <label className="relative block"><Search size={14} className="absolute left-3 top-3" /><input className="baize-input pl-9" aria-label="搜索博客文章" placeholder="搜索标题、文件名" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <select className="baize-input text-sm" aria-label="文章状态筛选" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">全部文章</option><option value="local">仅本地草稿</option><option value="draft">仓库草稿</option><option value="published">已发布</option></select>
          <div className="max-h-64 space-y-2 overflow-y-auto lg:max-h-[60vh]">{rows.map(row => <button key={row.key} type="button" className={`w-full rounded-xl border p-3 text-left text-sm ${row.draft?.id === selected?.id ? 'border-[#5f8f84] bg-[#5f8f84]/10' : 'border-[#5f8f84]/15 hover:bg-[#5f8f84]/5'}`} onClick={() => { if (row.draft) openLocal(row.draft); else if (row.entry) void openRemote(row.entry); }}><span className="block break-words font-semibold">{row.title}</span><span className="mt-1 block text-xs text-[#718986]">{row.kind === 'local' ? '本地草稿' : row.kind === 'draft' ? '仓库草稿' : '已发布'}{row.draft && row.draft.source && row.draft.markdown !== row.draft.source.markdown ? ' · 有本地修改' : ''}{row.draft && !row.draft.source ? ' · 未提交' : ''}</span></button>)}</div>
          {!rows.length && <p className="py-5 text-sm leading-6 text-[#718986]">还没有文章。可以直接新建，或连接仓库读取已有文章。</p>}
          <button type="button" className="baize-button-secondary w-full text-xs" onClick={() => { if (canSwitch()) importRef.current?.click(); }}>导入 Markdown 为本地草稿</button>
          <input ref={importRef} hidden type="file" accept=".md,.markdown,text/markdown" onChange={async event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (file.size > 256 * 1024) { setMessage('Markdown 文件不能超过 256 KB。'); return; } try { const raw = await file.text(); const text = raw.replace(/^\uFEFF/, ''); await addLocal(text.startsWith('---\n') || text.startsWith('---\r\n') ? text : createBlogMarkdown({ title: file.name.replace(/\.md(?:own)?$/i, ''), body: text, slug: `note-${Date.now().toString(36)}` })); } catch (error) { setMessage((error as Error).message); } }} />
          <p className="text-[11px] leading-5 text-[#718986]">本地副本只在此浏览器，不随导航备份或 Inbox 同步；重要文章请导出 Markdown，或主动提交仓库草稿。</p>
        </aside>
        {selected ? <BlogEditor key={selected.id} initial={selected} token={token} onSaved={refresh} onDirty={setDirty} onConnect={() => setConnectionOpen(true)} onRemove={() => void removeLocal()} onCommitted={(source, previousPath) => setEntries(current => [{ path: source.path, sha: source.sha, kind: source.path.startsWith('_posts/') ? 'published' : 'draft', title: readBlogDocument(source.markdown).title }, ...current.filter(entry => entry.path !== source.path && entry.path !== previousPath)])} onCopy={copyLocal} /> : <section className="baize-panel rounded-2xl px-6 py-16 text-center"><FileText size={38} className="mx-auto mb-4 opacity-50" /><h2 className="text-xl font-semibold">在这里安心写一篇文章</h2><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#718986]">新建文章不需要先写 Inbox。正文会自动保存到本机，预览后再确认提交；已发布文章也能直接打开修改。</p><button type="button" className="baize-button-primary mx-auto mt-6" onClick={() => void addLocal()}><Plus size={16} />开始写作</button></section>}
      </div>
    </div>
  </main>;
}

interface EditorProps { initial: BlogLocalDraft; token: string; onSaved: () => void; onDirty: (dirty: boolean) => void; onConnect: () => void; onRemove: () => void; onCopy: (markdown: string) => Promise<void>; onCommitted: (source: BlogSource, previousPath?: string) => void }
function BlogEditor({ initial, token, onSaved, onDirty, onConnect, onRemove, onCopy, onCommitted }: EditorProps) {
  const auto = useBlogAutosave(initial, target, onSaved, onDirty);
  const { draft } = auto;
  const [mode, setMode] = useState<'edit' | 'preview' | 'split' | 'source'>('edit');
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [confirmed, setConfirmed] = useState(false);
  const [plan, setPlan] = useState<BlogWritePlan | null>(null);
  const [deployment, setDeployment] = useState<{ state: string; message: string; url?: string } | null>(null), [pollRetry, setPollRetry] = useState(0);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const parsed = useMemo(() => { try { return { document: readBlogDocument(draft.markdown), error: '' }; } catch (error) { return { document: null, error: (error as Error).message }; } }, [draft.markdown]);
  const doc = parsed.document, published = draft.source?.path.startsWith('_posts/') || false;
  useEffect(() => { onDirty(auto.dirty || busy); }, [auto.dirty, busy, onDirty]);
  useEffect(() => { setPlan(null); setConfirmed(false); }, [draft.markdown, draft.source]);
  useEffect(() => {
    const commit = draft.lastCommit;
    if (!commit || !published) { setDeployment(null); return; }
    if (!token.trim()) { setDeployment({ state: 'unknown', message: '提交已保存。重新输入 Token 后可检查部署；提交成功不等于已上线。' }); return; }
    let cancelled = false, timer = 0, tries = 0;
    const poll = async () => {
      const result = await getBlogDeployment(target, token, commit.sha);
      if (cancelled) return;
      tries++; setDeployment(result);
      if (['waiting', 'running'].includes(result.state) && tries < 30) timer = window.setTimeout(poll, 12_000);
      else if (tries >= 30) setDeployment({ ...result, message: '暂未确认部署完成，已暂停检查。稍后可重试或打开 GitHub Actions。' });
    };
    void poll(); return () => { cancelled = true; clearTimeout(timer); };
  }, [draft.lastCommit?.sha, published, token, pollRetry]);
  const edit = (changes: Partial<BlogDocument>) => {
    try { auto.change({ ...auto.current.current, markdown: editBlogDocument(auto.current.current.markdown, changes) }); setMessage(''); }
    catch (error) { setMessage((error as Error).message); }
  };
  const insert = (prefix: string, suffix = '', fallback = '文字') => {
    if (!doc) return;
    const area = bodyRef.current, start = area?.selectionStart ?? doc.body.length, end = area?.selectionEnd ?? start;
    const selection = doc.body.slice(start, end) || fallback;
    edit({ body: doc.body.slice(0, start) + prefix + selection + suffix + doc.body.slice(end) });
    window.setTimeout(() => { area?.focus(); area?.setSelectionRange(start + prefix.length, start + prefix.length + selection.length); }, 0);
  };
  const insertLink = (image: boolean) => {
    const url = window.prompt(image ? '输入图片的 HTTPS 地址（暂不上传本地图片）' : '输入链接的 HTTPS 地址');
    if (!url) return;
    try { const parsedUrl = new URL(url); if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password) throw new Error(); insert(image ? '![' : '[', `](${parsedUrl.href.replace(/\(/g, '%28').replace(/\)/g, '%29')})`, image ? '图片说明' : '链接文字'); }
    catch { setMessage('请输入有效且不含账号密码的 HTTPS 地址。'); }
  };
  const prepare = async (action: BlogSaveAction) => {
    if (!token.trim()) { onConnect(); setMessage('本地内容已保留，请先输入博客仓库 Token。'); return; }
    if (auto.dirty) { setMessage('请先完成本地保存或处理保存冲突。'); return; }
    setBusy(true); setPlan(null); setConfirmed(false); setMessage('');
    try { setPlan(await prepareBlogWrite({ source: draft.source, markdown: draft.markdown, action }, token, target)); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  };
  const submit = async () => {
    if (!plan || !confirmed || auto.dirty) return;
    setBusy(true); setMessage('');
    try {
      const result = await commitBlogWrite(plan, token, target);
      auto.change({ ...auto.current.current, markdown: result.markdown, source: result.source, lastCommit: { sha: result.sha, url: result.commitUrl, path: result.path, at: Date.now() } });
      onCommitted(result.source, plan.source?.path);
      setPlan(null); setConfirmed(false); setMessage(plan.action === 'save-draft' ? '仓库草稿已提交。公开仓库中的草稿文件也可被他人读取。' : '文章已提交，正在等待博客部署。');
    } catch (error) { setMessage((error as Error).message); setPlan(null); setConfirmed(false); }
    finally { setBusy(false); }
  };
  const compareRemote = async () => {
    if (!draft.source) return;
    setBusy(true); setMessage('');
    try {
      const snapshot = await listBlogEntries(token, target), entry = snapshot.entries.find(item => item.path === draft.source?.path);
      if (!entry) throw new Error('远端文章已删除或移动。本地修改仍保留，可导出后核对。');
      const remote = await loadBlogSource(entry, token, target);
      setComparison(remote);
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  };
  const [comparison, setComparison] = useState<BlogLocalDraft['source']>(null);
  return <section className="baize-panel min-w-0 space-y-4 rounded-2xl p-4 sm:p-6" aria-label="博客编辑器">
    <div className="flex flex-wrap items-center gap-2"><span className="mr-auto text-xs" role="status">{auto.conflict ? '检测到另一页修改，请处理冲突' : auto.error ? '本地保存失败，请勿关闭' : auto.saving ? '正在保存到本机…' : draft.revision ? `已自动保存到本机 · ${new Date(draft.updatedAt).toLocaleTimeString('zh-CN')}` : '尚未保存到本机'}</span><button type="button" className="baize-button-secondary text-xs" onClick={() => exportMarkdown(draft.markdown, doc?.slug || doc?.title)}><Download size={14} />导出 Markdown</button><button type="button" className="baize-icon-button" aria-label="移除本地编辑副本" disabled={busy || auto.dirty} onClick={onRemove}><Trash2 size={16} /></button></div>
    {(auto.error || auto.conflict) && <div role="alert" className="space-y-2 rounded-xl border border-[#b77960]/50 p-3 text-sm"><p>{auto.error || '另一标签页已改动这篇文章，本页内容未被覆盖。可另存副本，再与最新内容比较。'}</p><div className="flex flex-wrap gap-2"><button type="button" className="baize-button-secondary" onClick={() => void onCopy(draft.markdown)}>另存为本地副本</button>{auto.error && <button type="button" className="baize-button-secondary" onClick={auto.retry}>重试本地保存</button>}{auto.conflict?.current && <button type="button" className="baize-button-secondary" onClick={() => { if (auto.conflict?.current && window.confirm('使用另一页版本会放弃本页未保存修改。确认已经导出或另存副本？')) auto.adopt(auto.conflict.current); }}>使用另一页版本</button>}</div></div>}
    {parsed.error && <p role="alert" className="text-sm text-[#985247]">{parsed.error} 请在“源码”中修正；原文不会被覆盖。</p>}
    <fieldset disabled={busy} className="min-w-0 space-y-4 disabled:opacity-70">
      <label className="block"><span className="text-xs font-semibold">文章标题</span><input className="baize-input mt-1 text-lg font-semibold" aria-label="文章标题" value={doc?.title || ''} disabled={!doc} placeholder="给这篇文章一个标题" onChange={event => edit({ title: event.target.value })} /></label>
      <details><summary className="cursor-pointer text-sm text-[#718986]">文章设置 · 分类、标签与网址</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs">分类<input className="baize-input mt-1" value={doc?.category || ''} disabled={!doc} onChange={event => edit({ category: event.target.value })} /></label>
        <label className="text-xs">形式<input className="baize-input mt-1" value={doc?.format || ''} disabled={!doc} onChange={event => edit({ format: event.target.value })} /></label>
        <label className="text-xs">标签（逗号分隔）<input className="baize-input mt-1" defaultValue={doc?.tags.join(', ') || ''} key={`tags-${draft.id}-${draft.source?.sha || ''}`} disabled={!doc} onBlur={event => { const tags = event.target.value.split(/[,，]/).map(value => value.trim()).filter(Boolean); if (JSON.stringify(tags) !== JSON.stringify(doc?.tags)) edit({ tags }); }} /></label>
        <label className="text-xs">Slug（网址标识）<input className="baize-input mt-1 font-mono" value={doc?.slug || ''} disabled={!doc || Boolean(draft.source)} onChange={event => edit({ slug: event.target.value, permalink: `/p/${event.target.value}/` })} /></label>
        <p className="text-xs leading-5 text-[#718986] sm:col-span-2">打开已有文章后保留原文件路径、日期和网址。标签离开输入框时保存。其他 Front Matter 字段会原样保留，可在源码中查看。</p>
      </div></details>
      <nav className="flex flex-wrap gap-2" aria-label="博客编辑视图">{([['edit', '写作'], ['preview', '预览'], ['split', '对照'], ['source', '源码']] as const).map(([value, label]) => <button key={value} type="button" className={mode === value ? 'baize-button-primary' : 'baize-button-secondary'} aria-pressed={mode === value} onClick={() => setMode(value)}>{value === 'preview' && <Eye size={14} />}{label}</button>)}</nav>
      <div className={mode === 'split' ? 'grid min-w-0 gap-5 xl:grid-cols-2' : 'min-w-0'}>
        {(mode === 'edit' || mode === 'split') && <div className="min-w-0"><div className="mb-2 flex flex-wrap gap-1" aria-label="Markdown 工具栏"><button type="button" className="baize-chip inline-flex items-center gap-1 whitespace-nowrap" onClick={() => insert('## ', '', '小标题')}>标题</button><button type="button" className="baize-chip inline-flex items-center gap-1 whitespace-nowrap" onClick={() => insert('**', '**')}>粗体</button><button type="button" className="baize-chip inline-flex items-center gap-1 whitespace-nowrap" onClick={() => insert('\n```\n', '\n```\n', '代码')}>代码块</button><button type="button" className="baize-chip inline-flex items-center gap-1 whitespace-nowrap" onClick={() => insertLink(false)}><Link size={13} />链接</button><button type="button" className="baize-chip inline-flex items-center gap-1 whitespace-nowrap" onClick={() => insertLink(true)}><ImagePlus size={13} />图片地址</button></div><textarea ref={bodyRef} aria-label="文章正文" className="baize-input min-h-[50vh] resize-y font-mono text-sm leading-7" value={doc?.body || ''} disabled={!doc} placeholder="从这里开始写。支持 Markdown，也可以直接输入普通文字…" onChange={event => edit({ body: event.target.value })} /></div>}
        {mode === 'source' && <label className="block text-xs">完整 Markdown（包含 Front Matter）<textarea aria-label="文章 Markdown 源码" spellCheck={false} className="baize-input mt-2 min-h-[55vh] resize-y font-mono text-sm leading-6" value={draft.markdown} onChange={event => auto.change({ ...auto.current.current, markdown: event.target.value })} /></label>}
        {(mode === 'preview' || mode === 'split') && <article className="min-w-0 rounded-xl border border-[#5f8f84]/15 bg-white/30 p-4 dark:bg-black/10"><h2 className="mb-5 break-words text-2xl font-bold">{doc?.title || '未命名文章'}</h2><BlogPreview body={doc?.body || ''} /><p className="mt-8 border-t border-[#5f8f84]/15 pt-3 text-xs text-[#718986]">安全预览不会执行 HTML、Liquid 或脚本；最终排版由博客主题决定。</p></article>}
      </div>
    </fieldset>
    <div className="flex flex-wrap items-center gap-2 border-t border-[#5f8f84]/15 pt-4">
      {!published && <button type="button" className="baize-button-secondary" disabled={busy || auto.dirty || !doc} onClick={() => void prepare('save-draft')}>保存为仓库草稿</button>}
      <button type="button" className="baize-button-primary" disabled={busy || auto.dirty || !doc} onClick={() => void prepare('publish')}><Github size={15} />{published ? '预览文章更新' : '预览并发表'}</button>
      {draft.source && <button type="button" className="baize-button-secondary" disabled={busy || auto.dirty} onClick={() => void compareRemote()}>读取远端并比较</button>}
      {busy && <span className="text-xs">正在处理，请稍候…</span>}
    </div>
    {message && <p role="status" className="break-words text-sm">{message}</p>}
    {comparison && <section className="space-y-3 rounded-xl border border-[#5f8f84]/30 p-4" aria-label="博客远端比较"><h3 className="font-semibold">远端与本机比较</h3><p className="text-xs">{comparison.sha === draft.source?.sha ? '远端仍与打开时一致。' : '远端在打开后发生了变化。先核对正文，再决定采用哪个版本。'}</p><div className="grid gap-3 md:grid-cols-2"><label className="text-xs">本机 Markdown<textarea readOnly rows={12} className="baize-input mt-1 font-mono text-xs" value={draft.markdown} /></label><label className="text-xs">远端 Markdown<textarea readOnly rows={12} className="baize-input mt-1 font-mono text-xs" value={comparison.markdown} /></label></div><div className="flex flex-wrap gap-2"><button type="button" className="baize-button-secondary" disabled={auto.dirty} onClick={() => { if (window.confirm('采用远端正文将替换本地编辑内容。确认已导出需要保留的修改？')) { auto.change({ ...draft, markdown: comparison.markdown, source: comparison }); setComparison(null); } }}>采用远端正文</button><button type="button" className="baize-button-secondary" disabled={auto.dirty} onClick={() => { if (window.confirm('保留本机正文，并以刚读取的远端版本作为更新基线？下次提交可能覆盖远端编辑的内容，请确认已比较。')) { auto.change({ ...draft, source: comparison }); setComparison(null); } }}>已核对，保留本机正文</button><button type="button" className="baize-button-secondary" onClick={() => setComparison(null)}>关闭比较</button></div></section>}
    {plan && <section className="space-y-3 rounded-xl border border-[#5f8f84]/40 p-4" aria-label="博客提交预览"><h3 className="font-semibold">{plan.action === 'save-draft' ? '确认提交仓库草稿' : published ? '确认更新已发布文章' : '确认公开发表'}</h3><p className="break-all text-xs">{plan.path}{plan.deletePath ? ` · 成功后移除原草稿 ${plan.deletePath}` : ''}</p><div className="max-h-80 overflow-y-auto rounded-xl bg-white/40 p-3 dark:bg-black/10"><BlogPreview body={readBlogDocument(plan.markdown).body} /></div><details><summary className="cursor-pointer text-xs">查看即将提交的完整 Markdown</summary><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{plan.markdown}</pre></details><label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />我已检查内容，确认允许上传至博客仓库（公开仓库中的草稿也公开可读）</label><button type="button" className="baize-button-primary" disabled={!confirmed || busy || auto.dirty} onClick={() => void submit()}>确认提交{plan.action === 'save-draft' ? '草稿' : published ? '更新' : '发表'}</button><button type="button" className="baize-button-secondary ml-2" disabled={busy} onClick={() => setPlan(null)}>取消</button></section>}
    {draft.lastCommit && <div className="space-y-2 rounded-xl bg-[#5f8f84]/8 p-3 text-xs"><p>{deployment?.message || '最近一次提交已保存，可打开 GitHub 查看。'}</p><div className="flex flex-wrap gap-4"><a className="underline" href={draft.lastCommit.url} target="_blank" rel="noreferrer">查看提交</a><a className="underline" href={`${repositoryUrl}/actions`} target="_blank" rel="noreferrer">查看 Actions</a>{deployment?.url && <a className="underline" href={deployment.url} target="_blank" rel="noreferrer">部署详情</a>}{published && doc?.permalink?.startsWith('/p/') && !doc.permalink.includes('..') && <a className="underline" href={`https://baizeone.top${doc.permalink}`} target="_blank" rel="noreferrer">打开文章（部署后更新）</a>}{published && <button type="button" className="underline" onClick={() => setPollRetry(value => value + 1)}>重新检查部署</button>}</div></div>}
    {draft.source && <p className="break-all text-[11px] text-[#718986]">原文件：{draft.source.path} · 更新会检查远端版本，不强制覆盖。</p>}
  </section>;
}
