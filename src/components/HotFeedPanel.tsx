import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronUp, ExternalLink, Flame, Github, RefreshCw, Star } from 'lucide-react';
import { cacheHotFeedReport, loadCachedHotFeedReport, loadHotFeedReport, type GithubTrendingItem, type HotFeedReport } from '../lib/hotFeed';

const COLLAPSED_KEY = 'nav_hot_feed_collapsed';

export interface HotFeedPanelProps {
  reportUrl: string;
  compact?: boolean;
}

function formatGeneratedAt(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatHeat(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1_000) return value;
  return new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(numeric);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('zh-CN', { notation: value >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

function SocialList({ report, limit }: { report: HotFeedReport; limit: number }) {
  const items = report.social.items.slice(0, limit);
  return items.length > 0 ? (
    <ol className="trending-feed-list mt-3 space-y-1" aria-label={`${report.social.source.name}热榜`}>
      {items.map(item => (
        <li key={item.id}>
          <a href={item.url} target="_blank" rel="noreferrer" className="group flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 transition hover:bg-[#5f8f84]/8 dark:hover:bg-[#c9a96b]/8">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${item.rank <= 3 ? 'bg-[#a85d50]/12 text-[#a45547] dark:bg-[#d58a78]/12 dark:text-[#e4a696]' : 'bg-[#5f8f84]/9 text-[#567771] dark:bg-[#c9a96b]/9 dark:text-[#c9b581]'}`}>{item.rank}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#234b4e] group-hover:text-[#285954] dark:text-[#e8e8e0] dark:group-hover:text-[#dfc68e]">{item.title}</span>
            {item.hot && <span className="shrink-0 text-[10px] text-[#8a7167] dark:text-[#b89c79]">{formatHeat(item.hot)} 热度</span>}
            <ExternalLink size={12} className="shrink-0 text-[#91a39f] opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ol>
  ) : (
    <p className="mt-3 rounded-xl bg-[#5f8f84]/7 px-3 py-8 text-center text-xs text-[#718986]">榜单正在生成，可先打开来源网站查看。</p>
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
            <ExternalLink size={12} className="mt-1 shrink-0 text-[#91a39f] opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
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
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === 'true');

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const separator = reportUrl.includes('?') ? '&' : '?';
      const next = await loadHotFeedReport(`${reportUrl}${separator}t=${Date.now()}`, { signal });
      setReport(next);
      cacheHotFeedReport(next);
    } catch (loadError) {
      if (signal?.aborted) return;
      setError(loadError instanceof Error ? loadError.message : '暂时无法刷新热榜数据');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [reportUrl]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const isStale = useMemo(() => report ? Date.now() - new Date(report.generatedAt).getTime() > 6 * 60 * 60 * 1000 : false, [report]);
  const limit = compact ? 5 : 8;
  const toggle = () => setCollapsed(current => {
    localStorage.setItem(COLLAPSED_KEY, String(!current));
    return !current;
  });

  if (collapsed) {
    return (
      <button type="button" className="baize-button-secondary utility-launcher-button" onClick={toggle} aria-controls="hot-feed" aria-expanded="false">
        <Flame size={17} />热榜
        {report && <span className="utility-launcher-badge">{report.social.items.length + report.github.items.length}</span>}
      </button>
    );
  }

  return (
    <section id="hot-feed" className="trending-feed-panel baize-panel basis-full rounded-2xl p-4 sm:p-5" aria-labelledby="hot-feed-title">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="hot-feed-title" className="flex items-center gap-2 text-sm font-semibold text-[#456b68] dark:text-[#d9ddd6]"><Flame size={17} />热榜聚合</h2>
          <p className="trending-feed-description mt-1 truncate text-xs text-[#718986]">
            {report ? `${report.social.source.name} · ${report.github.source.name} · 更新于 ${formatGeneratedAt(report.generatedAt)}` : '社会热点与 GitHub 今日热门仓库'}
            {isStale ? ' · 数据可能已过期' : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" className="baize-icon-button" onClick={() => { void refresh(); }} disabled={loading} title="重新读取已生成的榜单" aria-label="刷新热榜与动态">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button type="button" className="baize-icon-button flex items-center gap-1 text-xs" aria-expanded="true" onClick={toggle}>
            <ChevronUp size={16} />收起
          </button>
        </div>
      </header>

      <>
        {error && <p className={`mt-3 rounded-lg px-3 py-2 text-xs ${report ? 'bg-[#c9a96b]/10 text-[#7e6c42] dark:text-[#d9c386]' : 'bg-[#a85d50]/10 text-[#985247] dark:text-[#e1a294]'}`}>{report ? `${error}，当前显示上次缓存。` : error}</p>}
        {report ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <article className="min-w-0 rounded-2xl border border-[#5f8f84]/14 bg-white/25 p-3 dark:border-[#c9a96b]/10 dark:bg-[#07191d]/20">
              <div className="flex items-center justify-between gap-3 px-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[#315e5b] dark:text-[#e2dfd5]"><Flame size={15} />社会热榜</h3>
                <a href={report.social.source.url} target="_blank" rel="noreferrer" className="text-[11px] text-[#718986] transition hover:text-[#356b66] dark:hover:text-[#d2b775]">{report.social.source.name} <ExternalLink className="inline" size={11} /></a>
              </div>
              <SocialList report={report} limit={limit} />
            </article>
            <article className="min-w-0 rounded-2xl border border-[#5f8f84]/14 bg-white/25 p-3 dark:border-[#c9a96b]/10 dark:bg-[#07191d]/20">
              <div className="flex items-center justify-between gap-3 px-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[#315e5b] dark:text-[#e2dfd5]"><Github size={15} />GitHub 热榜</h3>
                <a href={report.github.source.url} target="_blank" rel="noreferrer" className="text-[11px] text-[#718986] transition hover:text-[#356b66] dark:hover:text-[#d2b775]">今日趋势 <ExternalLink className="inline" size={11} /></a>
              </div>
              <GithubList items={report.github.items} limit={limit} compact={compact} />
            </article>
          </div>
        ) : !loading && <div className="mt-4 rounded-xl bg-[#5f8f84]/7 px-3 py-8 text-center text-xs text-[#718986]">首次部署后，定时任务会生成社会热榜与 GitHub 热门仓库。</div>}
        {!report && loading && <div className="mt-4 grid gap-3 lg:grid-cols-2" aria-label="正在加载热榜数据">
          {[0, 1].map(column => <div key={column} className="h-64 animate-pulse rounded-2xl bg-[#5f8f84]/7 dark:bg-[#c9a96b]/6" />)}
        </div>}
      </>
    </section>
  );
}
