import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronUp, ExternalLink, Flame, Github, RefreshCw, Star } from 'lucide-react';
import {
  cacheHotFeedReport,
  HOT_FEED_REFRESH_EVENT,
  loadCachedHotFeedReport,
  loadHotFeedReport,
  selectIntelligenceItems,
  type GithubTrendingItem,
  type HotFeedReport,
  type IntelligenceCategory,
  type IntelligenceFilter,
  type IntelligenceItem,
} from '../lib/hotFeed';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../lib/safeStorage';

const COLLAPSED_KEY = 'nav_hot_feed_collapsed';
const CATEGORY_KEY = 'nav_hot_feed_category_v1';

const FILTERS: ReadonlyArray<{ id: IntelligenceFilter; label: string }> = [
  { id: 'all', label: '综合' },
  { id: 'cn', label: '国内' },
  { id: 'security', label: '安全' },
  { id: 'ai', label: 'AI' },
  { id: 'dev', label: '开发' },
];

const CATEGORY_LABELS: Record<IntelligenceCategory, string> = {
  cn: '国内',
  ai: 'AI',
  security: '安全',
  dev: '开发',
};

const CATEGORY_TONES: Record<IntelligenceCategory, string> = {
  cn: 'bg-[#6686a3]/12 text-[#4f6f8b] dark:bg-[#8faec8]/10 dark:text-[#b6cede]',
  ai: 'bg-[#5f8f84]/11 text-[#356b66] dark:bg-[#8fb8ad]/10 dark:text-[#acd0c7]',
  security: 'bg-[#a85d50]/12 text-[#985247] dark:bg-[#d58a78]/12 dark:text-[#e4a696]',
  dev: 'bg-[#c9a96b]/15 text-[#886d32] dark:bg-[#c9a96b]/10 dark:text-[#dfc68e]',
};

export interface HotFeedPanelProps {
  reportUrl: string;
  compact?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function readStoredFilter(): IntelligenceFilter {
  const value = safeGetLocalStorageItem(CATEGORY_KEY, { label: '热榜分类偏好', important: false });
  return FILTERS.some(filter => filter.id === value) ? value as IntelligenceFilter : 'all';
}

function readStoredCollapsed(): boolean {
  return safeGetLocalStorageItem(COLLAPSED_KEY, { label: '热榜折叠偏好', important: false }) === 'true';
}

function writeStoredValue(key: string, value: string): void {
  safeSetLocalStorageItem(key, value, { label: key === COLLAPSED_KEY ? '热榜折叠偏好' : '热榜分类偏好', important: false });
}

function formatGeneratedAt(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPublishedAt(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('zh-CN', { notation: value >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

function IntelligenceList({ items, limit, compact }: { items: IntelligenceItem[]; limit: number; compact: boolean }) {
  const visible = items.slice(0, limit);
  return visible.length > 0 ? (
    <ol id="intelligence-feed-list" className="trending-feed-list mt-3 space-y-1" aria-label="技术情报列表">
      {visible.map(item => (
        <li key={`${item.id}-${item.url}`}>
          <a href={item.url} target="_blank" rel="noreferrer" className="group flex min-w-0 items-start gap-2 rounded-xl px-2 py-2 transition hover:bg-[var(--app-soft)]">
            <span className={`mt-0.5 flex h-6 min-w-9 shrink-0 items-center justify-center rounded-lg px-1.5 text-[10px] font-bold ${CATEGORY_TONES[item.category]}`}>{CATEGORY_LABELS[item.category]}</span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-semibold appearance-heading group-hover:text-[var(--app-accent)]">{item.title}</strong>
              {!compact && item.summary && <span className="mt-0.5 block truncate text-[11px] appearance-muted">{item.summary}</span>}
              <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10px] appearance-muted">
                <span className="max-w-32 truncate">{item.source}</span>
                {item.publishedAt && <time dateTime={item.publishedAt}>{formatPublishedAt(item.publishedAt)}</time>}
                {item.badge && <span className="rounded-md appearance-soft px-1.5 py-0.5 appearance-accent">{item.badge}</span>}
                {item.signal && <span className="font-medium text-[#9b7048] dark:text-[#d0b06f]">{item.signal}</span>}
              </span>
            </span>
            <ExternalLink size={12} className="mt-1 shrink-0 appearance-muted opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ol>
  ) : (
    <p id="intelligence-feed-list" className="mt-3 rounded-xl appearance-soft px-3 py-8 text-center text-xs appearance-muted">这个分类暂时没有可展示的情报。</p>
  );
}

function GithubList({ items, limit, compact }: { items: GithubTrendingItem[]; limit: number; compact: boolean }) {
  const visible = items.slice(0, limit);
  return visible.length > 0 ? (
    <ol className="trending-feed-list mt-3 space-y-1" aria-label="GitHub 今日热门仓库">
      {visible.map(item => (
        <li key={item.id}>
          <a href={item.url} target="_blank" rel="noreferrer" className="group flex min-w-0 items-start gap-2 rounded-xl px-2 py-2 transition hover:bg-[var(--app-soft)]">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${item.rank <= 3 ? 'bg-[#c9a96b]/16 text-[#886d32] dark:text-[#e0c477]' : 'appearance-soft appearance-accent'}`}>{item.rank}</span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-semibold appearance-heading group-hover:text-[var(--app-accent)]">{item.name}</strong>
              {!compact && item.description && <span className="github-trending-description mt-0.5 block truncate text-[11px] appearance-muted">{item.description}</span>}
              <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[10px] appearance-muted">
                {item.language && <span className="truncate">{item.language}</span>}
                {item.stars !== undefined && <span className="inline-flex shrink-0 items-center gap-1"><Star size={10} />{formatCount(item.stars)}</span>}
                {item.starsToday !== undefined && <span className="shrink-0 font-medium text-[#9b7048] dark:text-[#d0b06f]">今日 +{formatCount(item.starsToday)}</span>}
              </span>
            </span>
            <ExternalLink size={12} className="mt-1 shrink-0 appearance-muted opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ol>
  ) : (
    <p className="mt-3 rounded-xl appearance-soft px-3 py-8 text-center text-xs appearance-muted">GitHub 今日榜单正在生成，可先打开 Trending 查看。</p>
  );
}

export function HotFeedPanel({ reportUrl, compact = false, open, onOpenChange }: HotFeedPanelProps) {
  const [report, setReport] = useState<HotFeedReport | null>(loadCachedHotFeedReport);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [localCollapsed, setCollapsed] = useState(readStoredCollapsed);
  const collapsed = open === undefined ? localCollapsed : !open;
  const [filter, setFilter] = useState<IntelligenceFilter>(readStoredFilter);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const next = await loadHotFeedReport(reportUrl, { signal });
      setReport(next);
      cacheHotFeedReport(next);
    } catch (loadError) {
      if (signal?.aborted) return;
      setError(loadError instanceof Error ? loadError.message : '暂时无法刷新情报数据');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [reportUrl]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    const refreshAfterDeployment = () => { void refresh(); };
    window.addEventListener(HOT_FEED_REFRESH_EVENT, refreshAfterDeployment);
    return () => window.removeEventListener(HOT_FEED_REFRESH_EVENT, refreshAfterDeployment);
  }, [refresh]);

  const staleChannels = useMemo(() => {
    if (!report) return [];
    const staleAfter = 6 * 60 * 60 * 1000;
    return [
      Date.now() - new Date(report.intelligence.updatedAt).getTime() > staleAfter ? '技术情报' : '',
      Date.now() - new Date(report.github.updatedAt).getTime() > staleAfter ? 'GitHub' : '',
    ].filter(Boolean);
  }, [report]);
  const intelligenceItems = useMemo(
    () => report ? selectIntelligenceItems(report.intelligence.items, filter) : [],
    [filter, report],
  );
  const sourceCount = useMemo(() => new Set(intelligenceItems.map(item => item.source)).size, [intelligenceItems]);
  const categoryCounts = useMemo(() => {
    const items = report?.intelligence.items ?? [];
    return {
      all: items.length,
      cn: items.filter(item => item.category === 'cn').length,
      ai: items.filter(item => item.category === 'ai').length,
      security: items.filter(item => item.category === 'security').length,
      dev: items.filter(item => item.category === 'dev').length,
    } satisfies Record<IntelligenceFilter, number>;
  }, [report]);
  const limit = compact ? 5 : 8;

  const toggle = () => {
    if (onOpenChange) { writeStoredValue(COLLAPSED_KEY, String(!collapsed)); onOpenChange(collapsed); return; }
    setCollapsed(current => {
    writeStoredValue(COLLAPSED_KEY, String(!current));
    return !current;
    });
  };
  const chooseFilter = (next: IntelligenceFilter) => {
    setFilter(next);
    writeStoredValue(CATEGORY_KEY, next);
  };

  if (collapsed) {
    if (open !== undefined) return null;
    return (
      <button type="button" className="baize-button-secondary utility-launcher-button" onClick={toggle} aria-controls="hot-feed" aria-expanded="false">
        <Flame size={17} />情报
        {report && <span className="utility-launcher-badge">{report.intelligence.items.length + report.github.items.length}</span>}
      </button>
    );
  }

  return (
    <section id="hot-feed" className="trending-feed-panel baize-panel min-w-0 max-w-full basis-full rounded-2xl p-4 sm:p-5" aria-labelledby="hot-feed-title">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="hot-feed-title" className="flex items-center gap-2 text-sm font-semibold appearance-heading"><Flame size={17} />技术情报</h2>
          <p className="trending-feed-description mt-1 truncate text-xs appearance-muted" aria-live="polite">
            {report ? `情报 ${formatGeneratedAt(report.intelligence.updatedAt)} · GitHub ${formatGeneratedAt(report.github.updatedAt)}` : '国内、AI、安全、开发情报与 GitHub 今日热门仓库'}
            {staleChannels.length > 0 ? ` · ${staleChannels.join('、')}数据可能已过期` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" className="baize-icon-button" onClick={() => { void refresh(); }} disabled={loading} title="重新读取已生成的情报" aria-label="刷新技术情报与 GitHub 热榜">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
          <button type="button" className="baize-icon-button flex items-center gap-1 text-xs" aria-controls="hot-feed" aria-expanded="true" onClick={toggle}>
            <ChevronUp size={16} aria-hidden="true" />收起
          </button>
        </div>
      </header>

      {error && <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-xs ${report ? 'bg-[#c9a96b]/10 text-[#7e6c42] dark:text-[#d9c386]' : 'bg-[#a85d50]/10 text-[#985247] dark:text-[#e1a294]'}`}>{report ? `${error}，当前显示上次缓存。` : error}</p>}
      {report ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <article className="min-w-0 rounded-2xl border appearance-border appearance-soft p-3" aria-labelledby="intelligence-feed-title">
            <div className="flex items-center justify-between gap-3 px-2">
              <h3 id="intelligence-feed-title" className="flex items-center gap-2 text-sm font-semibold appearance-heading"><Flame size={15} />技术情报</h3>
              <span className="text-[11px] appearance-muted">{intelligenceItems.length} 条 · {sourceCount} 个来源</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 px-2" role="group" aria-label="筛选技术情报分类">
              {FILTERS.map(option => {
                const selected = filter === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-controls="intelligence-feed-list"
                    aria-pressed={selected}
                    onClick={() => chooseFilter(option.id)}
                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${selected ? 'appearance-nav-active shadow-sm' : 'appearance-soft appearance-nav-idle'}`}
                  >
                    {option.label}<span className="ml-1 opacity-70" aria-hidden="true">{categoryCounts[option.id]}</span>
                  </button>
                );
              })}
            </div>
            <IntelligenceList items={intelligenceItems} limit={limit} compact={compact} />
          </article>
          <article className="min-w-0 rounded-2xl border appearance-border appearance-soft p-3" aria-labelledby="github-feed-title">
            <div className="flex items-center justify-between gap-3 px-2">
              <h3 id="github-feed-title" className="flex items-center gap-2 text-sm font-semibold appearance-heading"><Github size={15} />GitHub 热榜</h3>
              <a href={report.github.source.url} target="_blank" rel="noreferrer" className="text-[11px] appearance-muted transition hover:text-[var(--app-accent)]">今日趋势 <ExternalLink className="inline" size={11} /></a>
            </div>
            <GithubList items={report.github.items} limit={limit} compact={compact} />
          </article>
        </div>
      ) : !loading && <div className="mt-4 rounded-xl appearance-soft px-3 py-8 text-center text-xs appearance-muted">首次部署后，定时任务会生成技术情报与 GitHub 热门仓库。</div>}
      {!report && loading && <div className="mt-4 grid gap-3 lg:grid-cols-2" aria-label="正在加载情报数据">
        {[0, 1].map(column => <div key={column} className="h-64 animate-pulse rounded-2xl appearance-soft" />)}
      </div>}
    </section>
  );
}
