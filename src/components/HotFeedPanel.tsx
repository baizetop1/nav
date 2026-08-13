import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Flame, Github, RefreshCw } from 'lucide-react';
import { cacheHotFeedReport, loadCachedHotFeedReport, loadHotFeedReport, type GithubActivityItem, type HotFeedReport } from '../lib/hotFeed';

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

function formatRelativeTime(value: string): string {
  const difference = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(difference / 60_000));
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days} 天前` : new Date(value).toLocaleDateString('zh-CN');
}

function activityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    PushEvent: '提交',
    push: '提交',
    CreateEvent: '创建',
    create: '创建',
    WatchEvent: 'Star',
    star: 'Star',
    ForkEvent: 'Fork',
    fork: 'Fork',
    IssuesEvent: 'Issue',
    issue: 'Issue',
    PullRequestEvent: 'PR',
    'pull-request': 'PR',
    ReleaseEvent: '发布',
    release: '发布',
    DeleteEvent: '删除',
    delete: '删除',
    IssueCommentEvent: '评论',
    comment: '评论',
    review: '评审',
    public: '公开',
    member: '协作',
  };
  return labels[type] || '动态';
}

function formatHeat(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1_000) return value;
  return new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(numeric);
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

function GithubList({ items, limit }: { items: GithubActivityItem[]; limit: number }) {
  const visible = items.slice(0, limit);
  return visible.length > 0 ? (
    <ol className="trending-feed-list mt-3 space-y-1" aria-label="GitHub 公开动态">
      {visible.map(item => (
        <li key={item.id}>
          <a href={item.url} target="_blank" rel="noreferrer" className="group flex min-w-0 items-start gap-2 rounded-xl px-2 py-2 transition hover:bg-[#5f8f84]/8 dark:hover:bg-[#c9a96b]/8">
            <span className="mt-0.5 shrink-0 rounded-md bg-[#5f8f84]/9 px-1.5 py-0.5 text-[10px] font-semibold text-[#456b68] dark:bg-[#c9a96b]/9 dark:text-[#d2b775]">{activityTypeLabel(item.type)}</span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-medium text-[#234b4e] group-hover:text-[#285954] dark:text-[#e8e8e0] dark:group-hover:text-[#dfc68e]">{item.title}</strong>
              <span className="mt-0.5 flex min-w-0 items-center gap-2 text-[10px] text-[#7a918d]">
                {item.repository && <span className="truncate">{item.repository}</span>}
                <span className="shrink-0">{formatRelativeTime(item.createdAt)}</span>
              </span>
            </span>
            <ExternalLink size={12} className="mt-1 shrink-0 text-[#91a39f] opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ol>
  ) : (
    <p className="mt-3 rounded-xl bg-[#5f8f84]/7 px-3 py-8 text-center text-xs text-[#718986]">最近没有可显示的公开动态。</p>
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

  return (
    <section id="hot-feed" className="trending-feed-panel baize-panel rounded-2xl p-4 sm:p-5" aria-labelledby="hot-feed-title">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="hot-feed-title" className="flex items-center gap-2 text-sm font-semibold text-[#456b68] dark:text-[#d9ddd6]"><Flame size={17} />热榜与动态</h2>
          <p className="trending-feed-description mt-1 truncate text-xs text-[#718986]">
            {report ? `${report.social.source.name} · @${report.github.username} · 更新于 ${formatGeneratedAt(report.generatedAt)}` : '社会热榜与 GitHub 公开动态'}
            {isStale ? ' · 数据可能已过期' : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" className="baize-icon-button" onClick={() => { void refresh(); }} disabled={loading} title="重新读取已生成的榜单" aria-label="刷新热榜与动态">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button type="button" className="baize-icon-button flex items-center gap-1 text-xs" aria-expanded={!collapsed} onClick={toggle}>
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}{collapsed ? '展开' : '收起'}
          </button>
        </div>
      </header>

      {!collapsed && <>
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
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[#315e5b] dark:text-[#e2dfd5]"><Github size={15} />GitHub 动态</h3>
                <a href={report.github.profileUrl} target="_blank" rel="noreferrer" className="text-[11px] text-[#718986] transition hover:text-[#356b66] dark:hover:text-[#d2b775]">@{report.github.username} <ExternalLink className="inline" size={11} /></a>
              </div>
              <GithubList items={report.github.items} limit={limit} />
            </article>
          </div>
        ) : !loading && <div className="mt-4 rounded-xl bg-[#5f8f84]/7 px-3 py-8 text-center text-xs text-[#718986]">首次部署后，定时任务会生成社会热榜与 GitHub 动态。</div>}
        {!report && loading && <div className="mt-4 grid gap-3 lg:grid-cols-2" aria-label="正在加载热榜数据">
          {[0, 1].map(column => <div key={column} className="h-64 animate-pulse rounded-2xl bg-[#5f8f84]/7 dark:bg-[#c9a96b]/6" />)}
        </div>}
      </>}
    </section>
  );
}
