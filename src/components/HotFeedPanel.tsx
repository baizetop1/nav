import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronUp, ExternalLink, Flame, Github, RefreshCw, Star } from 'lucide-react';
import {
  cacheHotFeedReport,
  loadCachedHotFeedReport,
  loadHotFeedReport,
  selectIntelligenceItems,
  type GithubTrendingItem,
  type HotFeedReport,
  type IntelligenceCategory,
  type IntelligenceFilter,
  type IntelligenceItem,
} from '../lib/hotFeed';

const COLLAPSED_KEY = 'nav_hot_feed_collapsed';
const CATEGORY_KEY = 'nav_hot_feed_category_v1';

const FILTERS: ReadonlyArray<{ id: IntelligenceFilter; label: string }> = [
  { id: 'all', label: '综合' },
  { id: 'ai', label: 'AI' },
  { id: 'security', label: '安全' },
  { id: 'dev', label: '开发' },
];

const CATEGORY_LABELS: Record<IntelligenceCategory, string> = {
  ai: 'AI',
  security: '安全',
  dev: '开发',
};

const CATEGORY_TONES: Record<IntelligenceCategory, string> = {
  ai: 'bg-[#5f8f84]/11 text-[#356b66] dark:bg-[#8fb8ad]/10 dark:text-[#acd0c7]',
  security: 'bg-[#a85d50]/12 text-[#985247] dark:bg-[#d58a78]/12 dark:text-[#e4a696]',
  dev: 'bg-[#c9a96b]/15 text-[#886d32] dark:bg-[#c9a96b]/10 dark:text-[#dfc68e]',
};

export interface HotFeedPanelProps {
  reportUrl: string;
  compact?: boolean;
}

function readStoredFilter(): IntelligenceFilter {
  try {
    const value = localStorage.getItem(CATEGORY_KEY);
    return FILTERS.some(filter => filter.id === value) ? value as IntelligenceFilter : 'all';
  } catch {
    return 'all';
  }
}

function readStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeStoredValue(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage is an enhancement; the in-memory interaction remains usable.
  }
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
          <a href={item.url} target="_blank" rel="noreferrer" className="group flex min-w-0 items-start gap-2 rounded-xl px-2 py-2 transition hover:bg-[#5f8f84]/8 dark:hover:bg-[#c9a96b]/8">
            <span className={`mt-0.5 flex h-6 min-w-9 shrink-0 items-center justify-center rounded-lg px-1.5 text-[10px] font-bold ${CATEGORY_TONES[item.category]}`}>{CATEGORY_LABELS[item.category]}</span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-semibold text-[#234b4e] group-hover:text-[#285954] dark:text-[#e8e8e0] dark:group-hover:text-[#dfc68e]">{item.title}</strong>
              {!compact && item.summary && <span className="mt-0.5 block truncate text-[11px] text-[#718986]">{item.summary}</span>}
              <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[#7a918d]">
                <span className="max-w-32 truncate">{item.source}</span>
                {item.publishedAt && <time dateTime={item.publishedAt}>{formatPublishedAt(item.publishedAt)}</time>}
                {item.badge && <span className="rounded-md bg-[#5f8f84]/8 px-1.5 py-0.5 text-[#567771] dark:bg-[#c9a96b]/8 dark:text-[#c9b581]">{item.badge}</span>}
                {item.signal && <span className="font-medium text-[#9b7048] dark:text-[#d0b06f]">{item.signal}</span>}
              </span>
            </span>
            <ExternalLink size={12} className="mt-1 shrink-0 text-[#91a39f] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ol>
  ) : (
    <p id="intelligence-feed-list" className="mt-3 rounded-xl bg-[#5f8f84]/7 px-3 py-8 text-center text-xs text-[#718986]">这个分类暂时没有可展示的情报。</p>
  );
}

function GithubList({ items, limit, compact }: { items: GithubTrendingItem[]; limit: number; compact: boolean }) {
  const visible = items.slice(0, limit);
  return visible.length > 0 ? (
    <ol className="trending-feed-list mt-3 space-y-1" aria-label="GitHub 今日热门仓库">
      {visible.map(item => (
        <li key={item.id}>
          <a href={item.url} target="_blank" rel="noreferrer" className="group flex min-w-0 items-start gap-2 rounded-xl px-2 py-2 transition hover:bg-[#5f8f84]/8 dark:hover:bg-[#c9a96b]/8">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${item.rank <= 3 ? 'bg-[#c9a96b]/16 text-[#886d32] dark:text-[#e0c477]' : 'bg-[#5f8f84]/9 text-[#567771] dark:bg-[#c9a96b]/9 dark:text-[#c9b581]'}`}>{item.rank}</span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-semibold text-[#234b4e] group-hover:text-[#285954] dark:text-[#e8e8e0] dark:group-hover:text-[#dfc68e]">{item.name}</strong>
              {!compact && item.description && <span className="github-trending-description mt-0.5 block truncate text-[11px] text-[#718986]">{item.description}</span>}
              <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#7a918d]">
                {item.language && <span className="truncate">{item.language}</span>}
                {item.stars !== undefined && <span className="inline-flex shrink-0 items-center gap-1"><Star size={10} />{formatCount(item.stars)}</span>}
                {item.starsToday !== undefined && <span className="shrink-0 font-medium text-[#9b7048] dark:text-[#d0b06f]">今日 +{formatCount(item.starsToday)}</span>}
              </span>
            </span>
            <ExternalLink size={12} className="mt-1 shrink-0 text-[#91a39f] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ol>
  ) : (
    <p className="mt-3 rounded-xl bg-[#5f8f84]/7 px-3 py-8 text-center text-xs text-[#718986]">GitHub 今日榜单正在生成，可先打开 Trending 查看。</p>
  );
}

export function HotFeedPanel({ reportUrl, compact = false }: HotFeedPanelProps) {
  const [report, setReport] = useState<HotFeedReport | null>(loadCachedHotFeedReport);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(readStoredCollapsed);
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
      ai: items.filter(item => item.category === 'ai').length,
      security: items.filter(item => item.category === 'security').length,
      dev: items.filter(item => item.category === 'dev').length,
    } satisfies Record<IntelligenceFilter, number>;
  }, [report]);
  const limit = compact ? 5 : 8;

  const toggle = () => setCollapsed(current => {
    writeStoredValue(COLLAPSED_KEY, String(!current));
    return !current;
  });
  const chooseFilter = (next: IntelligenceFilter) => {
    setFilter(next);
    writeStoredValue(CATEGORY_KEY, next);
  };

  if (collapsed) {
    return (
      <button type="button" className="baize-button-secondary utility-launcher-button" onClick={toggle} aria-controls="hot-feed" aria-expanded="false">
        <Flame size={17} />情报
        {report && <span className="utility-launcher-badge">{report.intelligence.items.length + report.github.items.length}</span>}
      </button>
    );
  }

  return (
    <section id="hot-feed" className="trending-feed-panel baize-panel basis-full rounded-2xl p-4 sm:p-5" aria-labelledby="hot-feed-title">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="hot-feed-title" className="flex items-center gap-2 text-sm font-semibold text-[#456b68] dark:text-[#d9ddd6]"><Flame size={17} />技术情报</h2>
          <p className="trending-feed-description mt-1 truncate text-xs text-[#718986]" aria-live="polite">
            {report ? `情报 ${formatGeneratedAt(report.intelligence.updatedAt)} · GitHub ${formatGeneratedAt(report.github.updatedAt)}` : 'AI、安全、开发情报与 GitHub 今日热门仓库'}
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
          <article className="min-w-0 rounded-2xl border border-[#5f8f84]/14 bg-white/25 p-3 dark:border-[#c9a96b]/10 dark:bg-[#07191d]/20" aria-labelledby="intelligence-feed-title">
            <div className="flex items-center justify-between gap-3 px-2">
              <h3 id="intelligence-feed-title" className="flex items-center gap-2 text-sm font-semibold text-[#315e5b] dark:text-[#e2dfd5]"><Flame size={15} />技术情报</h3>
              <span className="text-[11px] text-[#718986]">{intelligenceItems.length} 条 · {sourceCount} 个来源</span>
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
                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5f8f84]/45 ${selected ? 'bg-[#356b66] text-white shadow-sm dark:bg-[#c9a96b] dark:text-[#102c33]' : 'bg-[#5f8f84]/7 text-[#567771] hover:bg-[#5f8f84]/13 dark:bg-[#c9a96b]/7 dark:text-[#c9b581] dark:hover:bg-[#c9a96b]/12'}`}
                  >
                    {option.label}<span className="ml-1 opacity-70" aria-hidden="true">{categoryCounts[option.id]}</span>
                  </button>
                );
              })}
            </div>
            <IntelligenceList items={intelligenceItems} limit={limit} compact={compact} />
          </article>
          <article className="min-w-0 rounded-2xl border border-[#5f8f84]/14 bg-white/25 p-3 dark:border-[#c9a96b]/10 dark:bg-[#07191d]/20" aria-labelledby="github-feed-title">
            <div className="flex items-center justify-between gap-3 px-2">
              <h3 id="github-feed-title" className="flex items-center gap-2 text-sm font-semibold text-[#315e5b] dark:text-[#e2dfd5]"><Github size={15} />GitHub 热榜</h3>
              <a href={report.github.source.url} target="_blank" rel="noreferrer" className="text-[11px] text-[#718986] transition hover:text-[#356b66] dark:hover:text-[#d2b775]">今日趋势 <ExternalLink className="inline" size={11} /></a>
            </div>
            <GithubList items={report.github.items} limit={limit} compact={compact} />
          </article>
        </div>
      ) : !loading && <div className="mt-4 rounded-xl bg-[#5f8f84]/7 px-3 py-8 text-center text-xs text-[#718986]">首次部署后，定时任务会生成技术情报与 GitHub 热门仓库。</div>}
      {!report && loading && <div className="mt-4 grid gap-3 lg:grid-cols-2" aria-label="正在加载情报数据">
        {[0, 1].map(column => <div key={column} className="h-64 animate-pulse rounded-2xl bg-[#5f8f84]/7 dark:bg-[#c9a96b]/6" />)}
      </div>}
    </section>
  );
}
