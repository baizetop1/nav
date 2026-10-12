import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { BookOpen, Check, ChevronUp, ExternalLink, Newspaper, RefreshCw, Star } from 'lucide-react';
import { AiHotRequestError, loadAiHot, type AiHotEntry, type AiHotResult, type AiHotTab } from '../services/aiHot';
import {
  AI_HOT_READER_EVENT,
  AI_HOT_READER_KEY,
  aiHotReadingKey,
  markAiHotRead,
  readAiHotReader,
  removeAiHotFavorite,
  toggleAiHotFavorite,
  type AiHotBookmark,
  type AiHotReaderState,
} from '../lib/aiHotReader';

type ReaderTab = AiHotTab | 'favorites';
const TABS: ReadonlyArray<{ id: ReaderTab; label: string }> = [
  { id: 'selected', label: '精选' },
  { id: 'hot', label: '热点' },
  { id: 'daily', label: '日报' },
  { id: 'favorites', label: '收藏' },
];
const FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'model', label: '模型' },
  { id: 'product', label: '产品' },
  { id: 'industry', label: '行业' },
  { id: 'paper', label: '论文' },
  { id: 'tutorial', label: '教程' },
  { id: 'opinion', label: '观点' },
] as const;
type CategoryFilter = typeof FILTERS[number]['id'];
const AIHOT_HOME = 'https://aihot.news/';
const CATEGORY_IDS: Readonly<Record<string, CategoryFilter>> = { 'ai-models': 'model', 'ai-products': 'product', tip: 'tutorial' };

function beijingTime(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '时间未提供';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '时间未提供';
  return date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

function categoryLabel(category: string | null): string {
  if (!category) return '';
  const normalized = CATEGORY_IDS[category.toLowerCase()] ?? category.toLowerCase();
  return FILTERS.find(item => item.id === normalized)?.label ?? category;
}

function matchesCategory(category: string | null, filter: CategoryFilter): boolean {
  return filter === 'all' || categoryLabel(category) === FILTERS.find(item => item.id === filter)?.label;
}

function safeLink(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function readingLinkLabel(value: string): string {
  const url = safeLink(value);
  return url && ['aihot.news', 'aihot.virxact.com'].includes(new URL(url).hostname) ? '在 AIHOT 阅读' : '打开阅读入口';
}

function initialReader(): { state: AiHotReaderState; error: string } {
  try {
    return readAiHotReader();
  } catch (error) {
    return { state: { version: 1, read: {}, favorites: [] }, error: error instanceof Error ? error.message : '无法读取本机阅读记录。' };
  }
}

function ExternalReadingLink({ href, children, onRead }: { href: string | null | undefined; children: string; onRead?: () => void }) {
  const url = safeLink(href);
  if (!url) return null;
  return <a href={url} target="_blank" rel="noopener noreferrer" onClick={onRead} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 py-1 text-xs appearance-accent hover:appearance-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{children}<ExternalLink size={12} aria-hidden="true" /></a>;
}

export function AiHotPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<ReaderTab>('selected');
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [results, setResults] = useState<Partial<Record<AiHotTab, AiHotResult>>>({});
  const [retryTimes, setRetryTimes] = useState<Partial<Record<AiHotTab, number>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reader, setReader] = useState(initialReader);
  const [now, setNow] = useState(Date.now);
  const controller = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  const lastRequests = useRef<Partial<Record<AiHotTab, number>>>({});
  const panel = useRef<HTMLElement>(null);
  const tabButtons = useRef<Partial<Record<ReaderTab, HTMLButtonElement | null>>>({});

  const load = useCallback(async (requestedTab: AiHotTab) => {
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    lastRequests.current[requestedTab] = Date.now();
    setNow(Date.now());
    try {
      const result = await loadAiHot(requestedTab, { signal: nextController.signal });
      if (nextController.signal.aborted || id !== requestId.current) return;
      setResults(previous => ({ ...previous, [requestedTab]: result }));
      setRetryTimes(previous => ({ ...previous, [requestedTab]: 0 }));
    } catch (loadError) {
      if (nextController.signal.aborted || id !== requestId.current) return;
      setError(loadError instanceof Error ? loadError.message : 'AI 资讯暂时无法读取，请到 AIHOT 查看。');
      const nextRetry = loadError instanceof AiHotRequestError ? loadError.retryAt : Date.now() + 60_000;
      setRetryTimes(previous => ({ ...previous, [requestedTab]: nextRetry }));
    } finally {
      if (!nextController.signal.aborted && id === requestId.current) {
        setLoading(false);
        setNow(Date.now());
      }
    }
  }, []);

  useEffect(() => {
    if (tab === 'favorites') {
      controller.current?.abort();
      requestId.current += 1;
      setLoading(false);
      setError('');
      return;
    }
    void load(tab);
    return () => controller.current?.abort();
  }, [tab, load]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      panel.current?.focus({ preventScroll: true });
      panel.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    const refreshReader = () => setReader(initialReader());
    const refreshStorage = (event: StorageEvent) => {
      if (event.key === AI_HOT_READER_KEY || event.key === null) refreshReader();
    };
    window.addEventListener('storage', refreshStorage);
    window.addEventListener(AI_HOT_READER_EVENT, refreshReader);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('storage', refreshStorage);
      window.removeEventListener(AI_HOT_READER_EVENT, refreshReader);
      controller.current?.abort();
      requestId.current += 1;
    };
  }, []);

  const storedResult = tab === 'favorites' ? undefined : results[tab];
  const expired = Boolean(storedResult && storedResult.expiresAt <= now);
  const result = expired ? undefined : storedResult;
  const nextReadAt = tab === 'favorites' ? 0 : Math.max(
    storedResult?.expiresAt ?? 0,
    retryTimes[tab] ?? 0,
    (lastRequests.current[tab] ?? -60_000) + 60_000,
  );
  const coolingDown = nextReadAt > now;
  useEffect(() => {
    setNow(Date.now());
    const remaining = nextReadAt - Date.now();
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(remaining + 50, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [nextReadAt]);

  useEffect(() => {
    if (!storedResult) return;
    setNow(Date.now());
    const remaining = storedResult.expiresAt - Date.now();
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(remaining + 50, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [storedResult]);

  const favoriteUrls = useMemo(() => new Set(reader.state.favorites.map(item => item.readingUrl)), [reader.state]);
  const entries = useMemo(() => (result?.entries ?? []).slice(0, tab === 'selected' ? 20 : tab === 'hot' ? 10 : 200).filter(entry => tab !== 'selected' || matchesCategory(entry.category, filter)), [result, tab, filter]);
  const dailySections = useMemo(() => {
    const sections = new Map<string, AiHotEntry[]>();
    for (const entry of entries) {
      const section = entry.section || '日报条目';
      sections.set(section, [...(sections.get(section) ?? []), entry]);
    }
    return [...sections.entries()];
  }, [entries]);

  const saveReader = (operation: () => AiHotReaderState) => {
    try {
      setReader({ state: operation(), error: '' });
    } catch (saveError) {
      setReader(previous => ({ ...previous, error: saveError instanceof Error ? saveError.message : '本机记录保存失败，请检查浏览器存储权限。' }));
    }
  };
  const markRead = (entry: Pick<AiHotEntry, 'readingUrl'>) => saveReader(() => markAiHotRead(entry));
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, current: ReaderTab) => {
    const index = TABS.findIndex(item => item.id === current);
    const nextIndex = event.key === 'ArrowRight' ? (index + 1) % TABS.length : event.key === 'ArrowLeft' ? (index + TABS.length - 1) % TABS.length : event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : null;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = TABS[nextIndex].id;
    setTab(next);
    tabButtons.current[next]?.focus();
  };
  const renderEntry = (entry: AiHotEntry) => {
    const readingKey = aiHotReadingKey(entry.readingUrl);
    const read = Boolean(reader.state.read[readingKey]);
    const favorite = favoriteUrls.has(readingKey);
    return (
      <article key={entry.id} aria-label={entry.title} data-aihot-id={entry.id} className="min-w-0 rounded-2xl border appearance-border appearance-soft p-4">
        <div className="flex items-start gap-2">
          {entry.rank !== undefined && <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-semibold appearance-accent">{entry.rank}</span>}
          <h3 className="min-w-0 flex-1 break-words text-sm font-semibold leading-6 appearance-heading">{entry.title}</h3>
          <button type="button" aria-label={`${favorite ? '取消收藏' : '收藏'}：${entry.title}`} aria-pressed={favorite} onClick={() => saveReader(() => toggleAiHotFavorite(entry))} className="baize-button-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-2"><Star size={16} className="shrink-0" fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" /></button>
        </div>
        {entry.summary && <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 appearance-muted">{entry.summary}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] appearance-muted">
          <span className="break-words">{entry.sourceName || '来源未提供'}</span>
          <a href={safeLink(entry.attribution.url) ?? AIHOT_HOME} target="_blank" rel="noopener noreferrer" className="appearance-accent underline-offset-2 hover:underline">{entry.attribution.name} 聚合</a>
          {entry.category && <span>{categoryLabel(entry.category)}</span>}
          {entry.sourceCount !== undefined && <span>{entry.sourceCount} 个来源</span>}
          {entry.publishedAt && <time dateTime={entry.publishedAt}>{beijingTime(entry.publishedAt)} · 北京时间</time>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <ExternalReadingLink href={entry.readingUrl} onRead={() => markRead(entry)}>{readingLinkLabel(entry.readingUrl)}</ExternalReadingLink>
          {entry.originalUrl !== entry.readingUrl && <ExternalReadingLink href={entry.originalUrl} onRead={() => markRead(entry)}>阅读原文</ExternalReadingLink>}
          <ExternalReadingLink href={entry.storyUrl} onRead={() => markRead(entry)}>事件线索</ExternalReadingLink>
          <button type="button" aria-label={`${read ? '已读' : '标为已读'}：${entry.title}`} disabled={read} onClick={() => markRead(entry)} className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 py-1 text-xs appearance-muted disabled:opacity-70">{read ? <Check size={13} aria-hidden="true" /> : <BookOpen size={13} aria-hidden="true" />}{read ? '已读' : '标为已读'}</button>
        </div>
      </article>
    );
  };
  const renderBookmark = (bookmark: AiHotBookmark) => (
    <article key={bookmark.readingUrl} aria-label={bookmark.title} data-aihot-id={bookmark.readingUrl} className="min-w-0 rounded-2xl border appearance-border appearance-soft p-4">
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 break-words text-sm font-semibold leading-6 appearance-heading">{bookmark.title}</h3>
        <button type="button" aria-label={`移除收藏：${bookmark.title}`} onClick={() => saveReader(() => removeAiHotFavorite(bookmark.readingUrl))} className="baize-button-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-2"><Star size={16} className="shrink-0" fill="currentColor" aria-hidden="true" /></button>
      </div>
      <p className="mt-2 break-words text-xs appearance-muted">{bookmark.sourceName} · 收藏于 {beijingTime(bookmark.savedAt)}（北京时间）</p>
      <ExternalReadingLink href={bookmark.readingUrl} onRead={() => markRead(bookmark)}>{readingLinkLabel(bookmark.readingUrl)}</ExternalReadingLink>
    </article>
  );

  return (
    <section id="ai-news" ref={panel} tabIndex={-1} aria-label="AI 资讯阅读器" className="baize-panel mt-6 min-w-0 max-w-full basis-full scroll-mt-24 rounded-3xl p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-lg font-bold appearance-heading"><Newspaper size={20} aria-hidden="true" />AI 资讯</h2>
          <p className="mt-1 text-xs leading-5 appearance-muted">按需阅读 AIHOT 最新内容；收藏与已读仅保存在本机，不上传 GitHub。</p>
        </div>
        <button type="button" aria-label="收起 AI 资讯" onClick={onClose} className="baize-button-secondary inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs"><ChevronUp size={15} aria-hidden="true" />收起</button>
      </header>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="AI 资讯栏目" className="flex max-w-full flex-wrap gap-1 rounded-xl appearance-soft p-1">
          {TABS.map(item => <button key={item.id} ref={node => { tabButtons.current[item.id] = node; }} id={`aihot-tab-${item.id}`} type="button" role="tab" tabIndex={tab === item.id ? 0 : -1} aria-selected={tab === item.id} aria-controls="aihot-content" onClick={() => setTab(item.id)} onKeyDown={event => onTabKeyDown(event, item.id)} className={`${tab === item.id ? 'baize-button-primary' : 'baize-button-secondary'} min-h-9 rounded-lg px-3 text-sm`}>{item.label}{item.id === 'favorites' && reader.state.favorites.length > 0 && <span aria-hidden="true" className="ml-1 text-[10px]">{reader.state.favorites.length}</span>}</button>)}
        </div>
        {tab !== 'favorites' && <button type="button" disabled={loading || coolingDown} onClick={() => void load(tab)} className="baize-button-secondary inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs disabled:opacity-55"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />重新读取</button>}
      </div>
      {tab === 'selected' && <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="精选分类">{FILTERS.map(item => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={`${filter === item.id ? 'baize-button-primary' : 'baize-button-secondary'} min-h-9 rounded-lg px-2.5 text-xs`}>{item.label}</button>)}</div>}
      {tab !== 'favorites' && <p className="mt-3 text-[11px] leading-5 appearance-muted">{result ? `本次读取于 ${beijingTime(result.loadedAt)}（北京时间）。` : tab === 'selected' ? '只在打开栏目时读取，精选最多显示最新 20 条。' : tab === 'hot' ? '只在打开栏目时读取，热点展示上游最新榜单。' : '只在打开栏目时读取，日报按最新刊期展示。'}{coolingDown ? ` ${beijingTime(nextReadAt)} 后可重新读取，遵守上游缓存与限流，不在后台自动刷新。` : ' 手动重新读取间隔至少 60 秒；没有后台刷新。'}</p>}
      {reader.error && <div role="alert" className="mt-3 rounded-xl border appearance-border px-3 py-2 text-xs leading-5 appearance-heading">{reader.error} 当前列表仍可阅读；本机记录未确认保存。</div>}
      {error && <div role="alert" className="mt-3 rounded-xl border appearance-border p-3 text-sm leading-6 appearance-heading"><p>{error}</p><div className="mt-2 flex flex-wrap items-center gap-2">{tab !== 'favorites' && <button type="button" disabled={loading || coolingDown} onClick={() => void load(tab)} className="baize-button-secondary min-h-9 rounded-lg px-3 text-xs disabled:opacity-55">重试读取</button>}<ExternalReadingLink href={AIHOT_HOME}>直接打开 AIHOT</ExternalReadingLink></div>{result && <p className="mt-1 text-xs appearance-muted">下方保留上次读取内容，不代表已经更新。</p>}</div>}
      <div id="aihot-content" role="tabpanel" aria-labelledby={`aihot-tab-${tab}`} aria-busy={loading} className="mt-4 min-w-0">
        {loading && <p role="status" className="py-5 text-center text-sm appearance-muted">正在读取 AI 资讯…</p>}
        {expired && !loading && <p role="status" className="mb-3 rounded-xl appearance-soft p-3 text-sm leading-6 appearance-muted">本次资讯已过期，请重新读取。这里不会自动刷新，可随时打开 AIHOT 查看。</p>}
        {tab === 'hot' && <p className="mb-3 text-xs leading-5 appearance-muted">这是上游最新热点快照，不是实时热度；请在来源网站核对最新事件进展。</p>}
        {tab === 'daily' && <p className="mb-3 text-xs leading-5 appearance-muted">日报按刊期汇总，不代表实时资讯。</p>}
        {result?.notice && <p className="mb-3 rounded-xl appearance-soft p-3 text-xs leading-5 appearance-muted">{result.notice}</p>}
        {tab === 'daily' && result?.daily && <div className="mb-4 rounded-2xl border appearance-border p-4"><p className="text-xs appearance-accent">{result.daily.date} · AI 日报</p><h3 className="mt-2 break-words text-base font-semibold appearance-heading">{result.daily.title}</h3><p className="mt-2 whitespace-pre-line break-words text-sm leading-6 appearance-muted">{result.daily.lead}</p><p className="mt-3 text-[11px] leading-5 appearance-muted">生成于 {beijingTime(result.daily.generatedAt)}（北京时间） · <a href={safeLink(result.daily.attribution.url) ?? AIHOT_HOME} target="_blank" rel="noopener noreferrer" className="appearance-accent underline-offset-2 hover:underline">{result.daily.attribution.name} 聚合</a>{(result.daily.windowStart || result.daily.windowEnd) && <span className="block">覆盖时段：{beijingTime(result.daily.windowStart)} — {beijingTime(result.daily.windowEnd)}（北京时间）</span>}</p><ExternalReadingLink href={result.daily.readingUrl}>在 AIHOT 阅读完整日报</ExternalReadingLink></div>}
        {tab === 'favorites' ? (
          reader.state.favorites.length > 0 ? <div className="grid min-w-0 gap-3 lg:grid-cols-2">{reader.state.favorites.map(renderBookmark)}</div> : <p className="rounded-2xl appearance-soft px-4 py-10 text-center text-sm leading-6 appearance-muted">还没有本机收藏。点击文章旁的星标即可保存阅读入口；这里不会联网读取资讯。</p>
        ) : tab === 'daily' ? (
          dailySections.length > 0 ? <div className="space-y-5">{dailySections.map(([section, items]) => <section key={section} aria-label={section}><h3 className="mb-2 text-sm font-semibold appearance-heading">{section}</h3><div className="grid min-w-0 gap-3 lg:grid-cols-2">{items.map(renderEntry)}</div></section>)}</div> : !loading && !error && !expired && <p className="rounded-2xl appearance-soft px-4 py-10 text-center text-sm appearance-muted">暂时没有可展示的日报条目，可打开 AIHOT 查看完整内容。</p>
        ) : entries.length > 0 ? <div className="grid min-w-0 gap-3 lg:grid-cols-2">{entries.map(renderEntry)}</div> : !loading && !error && !expired && <p className="rounded-2xl appearance-soft px-4 py-10 text-center text-sm appearance-muted">{filter !== 'all' && tab === 'selected' ? '最新 20 条中暂时没有这个分类，可切换全部或到 AIHOT 查看。' : '暂时没有可展示的资讯，可到 AIHOT 查看。'}</p>}
      </div>
      <footer className="mt-5 border-t appearance-border pt-3 text-[11px] leading-5 appearance-muted">
        <p>摘要与聚合来自 AIHOT。AI 摘要可能遗漏或出错，重要信息请核对原文。仅供个人阅读，不批量采集、不提供公开镜像。</p>
        <div className="mt-1 flex flex-wrap gap-2"><ExternalReadingLink href={AIHOT_HOME}>AIHOT 主页</ExternalReadingLink><ExternalReadingLink href="https://aihot.news/terms">使用规则</ExternalReadingLink></div>
      </footer>
    </section>
  );
}
