import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, Check, Download, ExternalLink, Inbox, Plus, RefreshCw, Rss, Search, Star, Trash2, Upload, X } from 'lucide-react';
import bundledSources from '../../data/rss-sources.json';
import { createRssSource, exportOpml, loadPublishedRss, loadRssCache, loadRssReader, loadRssSources, mergeRssReaderStates, parseOpml, parseRssSources, RSS_SOURCE_LIMIT, saveRssReader, saveRssSources, type RssItem, type RssReaderState, type RssSource } from '../lib/rss';
import { updateReading } from '../services/readingHistory';
import { WORKSPACE_EVENT } from '../services/workspaceSync';
import type { InboxDraft } from '../types/inbox';

export interface RssPanelProps {
  onClose: () => void;
  onCapture: (draft: InboxDraft) => string | null | Promise<string | null>;
  onPublishSources: (sources: RssSource[], token: string, baselineSources: RssSource[]) => Promise<string>;
  repositoryLabel?: string;
  reportUrl?: string;
}
const shippedSources = parseRssSources(bundledSources);

export function RssPanel({ onClose, onCapture, onPublishSources, repositoryLabel = '当前 GitHub 仓库', reportUrl = `${import.meta.env.BASE_URL}rss-feed.json` }: RssPanelProps) {
  const [sources, setSources] = useState(() => loadRssSources(shippedSources));
  const [manageOpen, setManageOpen] = useState(() => !sources.length);
  const [baselineSources, setBaselineSources] = useState(shippedSources);
  const [report, setReport] = useState(loadRssCache);
  const [reader, setReader] = useState(loadRssReader);
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [view, setView] = useState<'all' | 'unread' | 'favorite'>('unread');
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [capturingId, setCapturingId] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [publicConsent, setPublicConsent] = useState(false);
  const [pageSize, setPageSize] = useState(30);
  const loadRef = useRef<AbortController | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const configuredIds = useMemo(() => new Set(sources.map(source => source.id)), [sources]);
  const sourcesChanged = JSON.stringify(sources) !== JSON.stringify(baselineSources);

  const refresh = useCallback(async () => {
    loadRef.current?.abort();
    const controller = new AbortController();
    loadRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    setLoading(true); setLoadError('');
    try {
      const loaded = await loadPublishedRss(reportUrl, controller.signal);
      if (controller.signal.aborted) return;
      setReport(loaded.report);
      if (!loaded.cached) setLoadError('报告已读取，但离线缓存未保存。');
    } catch (error) {
      if (loadRef.current !== controller) return;
      setLoadError(controller.signal.aborted ? '读取超时，继续展示本机缓存。' : `${error instanceof Error ? error.message : '报告读取失败。'} 已保留本机缓存。`);
    } finally {
      window.clearTimeout(timeout);
      if (loadRef.current === controller) setLoading(false);
    }
  }, [reportUrl]);
  useEffect(() => { void refresh(); return () => { loadRef.current?.abort(); loadRef.current = null; }; }, [refresh]);
  useEffect(() => { setPageSize(30); }, [query, sourceFilter, view]);
  useEffect(() => {
    const update = () => { setReader(loadRssReader()); setSources(loadRssSources(shippedSources)); setPublicConsent(false); };
    window.addEventListener('storage', update);
    window.addEventListener(WORKSPACE_EVENT, update);
    return () => { window.removeEventListener('storage', update); window.removeEventListener(WORKSPACE_EVENT, update); };
  }, []);
  useEffect(() => { if (sourceFilter !== 'all' && !configuredIds.has(sourceFilter)) setSourceFilter('all'); }, [sourceFilter, configuredIds]);

  const allItems = (report?.items || []).filter(item => configuredIds.has(item.sourceId));
  const items = allItems.filter(item => {
    const state = reader.items[item.id];
    return (view !== 'unread' || !state?.read) && (view !== 'favorite' || state?.favorite) && (sourceFilter === 'all' || item.sourceId === sourceFilter) && (!query.trim() || `${item.title} ${item.summary} ${item.url}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  }).sort((a, b) => (Date.parse(b.publishedAt || '') || 0) - (Date.parse(a.publishedAt || '') || 0));

  const changeSources = (next: RssSource[]) => {
    const ok = saveRssSources(next);
    setSources(next);
    setPublicConsent(false);
    setMessage(ok ? '订阅草稿已保存到本机，发布后才会在云端抓取。' : '订阅草稿仅保留在内存，浏览器存储失败，请先导出 OPML。');
  };
  const updateReader = (item: RssItem, changes: { read?: boolean; favorite?: boolean }) => {
    const base = mergeRssReaderStates(reader, loadRssReader());
    const old = base.items[item.id] || { read: false, favorite: false };
    const oldStamp = base.items[item.id]?.updatedAt ? Date.parse(base.items[item.id].updatedAt) : 0;
    const next: RssReaderState = { version: 1, items: { ...base.items, [item.id]: { ...old, ...changes, updatedAt: new Date(Math.max(Date.now(), oldStamp + 1)).toISOString() } } };
    setReader(next);
    if (!saveRssReader(next)) setMessage('阅读状态未写入本机，请勿刷新。');
  };
  const addSource = () => {
    try {
      if (sources.length >= RSS_SOURCE_LIMIT) throw new Error(`最多订阅 ${RSS_SOURCE_LIMIT} 个源。`);
      const source = createRssSource(sourceTitle, sourceUrl);
      if (sources.some(item => item.url === source.url)) throw new Error('这个订阅地址已存在。');
      changeSources([...sources, source]); setSourceTitle(''); setSourceUrl('');
    } catch (error) { setMessage((error as Error).message); }
  };
  const importSources = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 512 * 1024) throw new Error('OPML 文件不能超过 512 KB。');
      const imported = parseOpml(await file.text());
      const additions = imported.sources.filter(item => !sources.some(source => source.url === item.url));
      if (sources.length + additions.length > RSS_SOURCE_LIMIT) throw new Error(`合并后超过 ${RSS_SOURCE_LIMIT} 个源，请先删除部分订阅。`);
      changeSources([...sources, ...additions]);
      setMessage(`已导入 ${additions.length} 个本机订阅，跳过 ${imported.skipped + imported.sources.length - additions.length} 个重复或无效条目；发布后开始抓取。`);
    } catch (error) { setMessage((error as Error).message); }
    finally { if (importRef.current) importRef.current.value = ''; }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportOpml(sources)], { type: 'text/x-opml;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'baize-rss.opml'; document.body.append(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const publish = async () => {
    if (publishing || !token.trim() || !publicConsent) return;
    setPublishing(true); setMessage('正在发布订阅配置…');
    try {
      const result = await onPublishSources(sources, token.trim(), baselineSources);
      setBaselineSources(sources); setToken(''); setPublicConsent(false);
      setMessage(result || '订阅配置已提交。请等待 Actions 完成，再刷新报告。');
    } catch (error) { setMessage(error instanceof Error ? error.message : '发布失败，本机订阅已保留。'); }
    finally { setPublishing(false); }
  };
  const capture = async (item: RssItem) => {
    if (capturingId) return;
    setCapturingId(item.id);
    try { const error = await onCapture({ type: 'link', title: item.title, url: item.url, content: item.summary || undefined, tags: ['RSS'] }); setMessage(error || '已收集到 Inbox。'); }
    catch (error) { setMessage(error instanceof Error ? error.message : '收集失败，请重试。'); }
    finally { setCapturingId(null); }
  };

  return <section className="baize-panel min-w-0 max-w-full basis-full space-y-4 rounded-2xl p-4 sm:p-5" aria-label="RSS 阅读中心">
    <header className="flex items-center gap-2"><Rss size={19} /><h2 className="flex-1 font-bold">RSS 阅读</h2><button type="button" className="baize-button-secondary" disabled={loading} onClick={() => { void refresh(); }}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />刷新报告</button><button type="button" className="baize-icon-button" onClick={onClose} disabled={publishing} aria-label="关闭 RSS 阅读"><X size={18} /></button></header>
    <p className="text-xs leading-5 text-[#718986]">{report?.generatedAt ? `上次聚合：${new Date(report.generatedAt).toLocaleString('zh-CN')}` : '尚未生成订阅内容'} · 刷新只读取已发布摘要，GitHub Actions 定时抓取订阅源。已载入的摘要支持离线阅读，原文需要网络。</p>
    {loadError && <p role="status" className="text-xs text-[#985247] dark:text-[#e1a294]">{loadError}</p>}
    <details className="rounded-xl border border-[#5f8f84]/20 p-3" open={manageOpen} onToggle={event => setManageOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer font-semibold">管理订阅（{sources.length}/{RSS_SOURCE_LIMIT}）{sourcesChanged ? ' · 有未发布修改' : ''}</summary>
      <div className="mt-3 space-y-3">
        <form className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]" onSubmit={event => { event.preventDefault(); addSource(); }}><input className="baize-input" aria-label="订阅名称" placeholder="名称（可选）" maxLength={120} value={sourceTitle} disabled={publishing} onChange={event => setSourceTitle(event.target.value)} /><input className="baize-input" aria-label="RSS 订阅地址" type="url" required placeholder="https://example.com/feed.xml" maxLength={4096} value={sourceUrl} disabled={publishing} onChange={event => setSourceUrl(event.target.value)} /><button type="submit" className="baize-button-secondary" disabled={publishing}><Plus size={16} />添加</button></form>
        <div className="flex flex-wrap gap-2"><input ref={importRef} type="file" accept=".opml,.xml,text/xml,application/xml" className="hidden" onChange={event => { void importSources(event.target.files?.[0]); }} /><button type="button" className="baize-button-secondary" disabled={publishing} onClick={() => importRef.current?.click()}><Upload size={15} />导入 OPML</button><button type="button" className="baize-button-secondary" disabled={!sources.length} onClick={download}><Download size={15} />导出 OPML</button></div>
        <ul className="max-h-60 space-y-2 overflow-y-auto">{sources.map(source => {
          const status = report?.sources.find(item => item.id === source.id && item.url === source.url);
          return <li key={source.id} className="flex items-start gap-2 rounded-lg bg-[#5f8f84]/5 p-2"><div className="min-w-0 flex-1"><p className="text-sm font-medium">{source.title}</p><p className="break-all text-xs text-[#718986]">{source.url}</p><p className={`mt-1 text-xs ${status?.error ? 'text-[#985247] dark:text-[#e1a294]' : 'text-[#718986]'}`}>{status?.error ? `抓取失败：${status.error}${status.fetchedAt ? `；保留 ${new Date(status.fetchedAt).toLocaleString('zh-CN')} 的内容` : ''}` : status?.fetchedAt ? `更新于 ${new Date(status.fetchedAt).toLocaleString('zh-CN')}` : '尚未抓取；请发布订阅并等待 Actions'}</p></div><button type="button" className="baize-icon-button" disabled={publishing} aria-label={`移除订阅 ${source.title}`} onClick={() => changeSources(sources.filter(item => item.id !== source.id))}><Trash2 size={15} /></button></li>;
        })}</ul>
        <div className="space-y-2 border-t border-[#5f8f84]/15 pt-3">
          <p className="text-xs leading-5 text-[#718986]">发布目标：{repositoryLabel}。本机添加与导入不会自动上传。发布后，订阅地址和抓取摘要会成为公开页面数据，请勿发布含私人令牌的订阅链接。</p>
          <label className="flex items-start gap-2 text-xs leading-5"><input type="checkbox" className="mt-1" checked={publicConsent} disabled={publishing} onChange={event => setPublicConsent(event.target.checked)} />我确认这些订阅地址和内容摘要可以公开发布。</label>
          <div className="flex flex-wrap gap-2"><input type="password" autoComplete="new-password" aria-label="发布 RSS 的 GitHub Token" className="baize-input min-w-0 flex-1" placeholder="GitHub Token（仅本次使用）" value={token} disabled={publishing} onChange={event => setToken(event.target.value)} /><button type="button" className="baize-button-primary" disabled={publishing || !publicConsent || !token.trim()} onClick={() => { void publish(); }}><Upload size={15} />{publishing ? '正在提交…' : '发布订阅配置'}</button></div>
        </div>
      </div>
    </details>
    {message && <p role="status" className="text-sm text-[#456b68] dark:text-[#b8c6c1]">{message}</p>}
    <div className="flex flex-wrap gap-2">{([['unread', '未读'], ['all', '全部'], ['favorite', '收藏']] as const).map(([value, label]) => <button type="button" className={view === value ? 'baize-button-primary' : 'baize-button-secondary'} onClick={() => setView(value)} key={value}>{label}</button>)}<label className="relative min-w-40 flex-1"><Search size={15} className="absolute left-3 top-3" /><input className="baize-input pl-9" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索标题、摘要" aria-label="搜索 RSS 文章" /></label><select className="baize-input w-auto max-w-full" aria-label="按 RSS 来源筛选" value={sourceFilter} onChange={event => setSourceFilter(event.target.value)}><option value="all">全部来源</option>{sources.map(source => <option key={source.id} value={source.id}>{source.title}</option>)}</select></div>
    <div className="grid gap-3 md:grid-cols-2">{items.slice(0, pageSize).map(item => {
      const state = reader.items[item.id];
      return <article key={item.id} className="min-w-0 rounded-xl border border-[#5f8f84]/20 p-3"><div className="mb-2 flex items-center gap-2 text-xs text-[#718986]"><span className="truncate">{sources.find(source => source.id === item.sourceId)?.title}</span>{item.publishedAt && <time className="ml-auto shrink-0" dateTime={item.publishedAt}>{new Date(item.publishedAt).toLocaleDateString('zh-CN')}</time>}{!state?.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#5f8f84]" aria-label="未读" />}</div><a href={item.url} target="_blank" rel="noopener noreferrer" className="break-words font-semibold hover:underline" onClick={() => updateReader(item, { read: true })}>{item.title} <ExternalLink size={13} className="inline" /></a>{item.summary && <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-[#718986]">{item.summary}</p>}<div className="mt-3 flex flex-wrap gap-2"><button type="button" className="baize-button-secondary text-xs" aria-pressed={Boolean(state?.favorite)} onClick={() => updateReader(item, { favorite: !state?.favorite })}><Star size={14} fill={state?.favorite ? 'currentColor' : 'none'} />{state?.favorite ? '已收藏' : '收藏'}</button><button type="button" className="baize-button-secondary text-xs" onClick={() => updateReader(item, { read: !state?.read })}><Check size={14} />{state?.read ? '标为未读' : '标为已读'}</button><button type="button" className="baize-button-secondary text-xs" onClick={() => { try { updateReading(item.url, item.title, { readLater: true }); setMessage('已加入阅读中心的稍后阅读。'); } catch (error) { setMessage((error as Error).message); } }}><Bookmark size={14} />稍后阅读</button><button type="button" className="baize-button-secondary text-xs" disabled={capturingId !== null} onClick={() => { void capture(item); }}><Inbox size={14} />{capturingId === item.id ? '正在收集' : '收集'}</button></div></article>;
    })}</div>
    {!items.length && <p className="py-6 text-center text-sm text-[#718986]">{!sources.length ? '添加 RSS 地址或导入 OPML，发布订阅后即可阅读。' : !allItems.length ? '尚无已发布内容，请等待抓取完成后刷新报告。' : '当前条件下没有文章。'}</p>}
    {items.length > pageSize && <button type="button" className="baize-button-secondary w-full justify-center" onClick={() => setPageSize(size => size + 30)}>显示更多（{pageSize}/{items.length}）</button>}
  </section>;
}
