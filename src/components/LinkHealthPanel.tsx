import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, ExternalLink, HelpCircle, RefreshCw } from 'lucide-react';
import type { LinkHealthEntry } from '../lib/linkHealth';
import type { Site } from '../types/navigation';

export interface LinkHealthPanelProps {
  sites: Site[];
  entries: LinkHealthEntry[];
  loading: boolean;
  onRefresh: () => void | Promise<void>;
  onRunCheck?: () => void | Promise<void>;
  checkState?: 'idle' | 'starting' | 'running' | 'success' | 'error';
  checkMessage?: string;
}

type HealthFilter = 'all' | 'unhealthy';

interface SiteHealthRow {
  site: Site;
  entry?: LinkHealthEntry;
}

function formatCheckedAt(value?: string): string {
  if (!value) return '尚未检查';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未知';

  try {
    return new Intl.DateTimeFormat('zh-CN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function statusLabel(entry?: LinkHealthEntry): string {
  if (!entry) return '未检查';
  if (entry.source === 'browser' && entry.status === null) return entry.ok ? '可连接' : '无法连接';
  if (entry.status !== null) return `HTTP ${entry.status}`;
  return entry.error || '连接失败';
}

export function LinkHealthPanel({ sites, entries, loading, onRefresh, onRunCheck, checkState = 'idle', checkMessage }: LinkHealthPanelProps) {
  const [filter, setFilter] = useState<HealthFilter>('all');
  const rows = useMemo<SiteHealthRow[]>(() => {
    const entryBySite = new Map(entries.map(entry => [entry.siteId, entry]));
    return sites.map(site => {
      const entry = entryBySite.get(site.id);
      return { site, entry: entry?.url === site.url ? entry : undefined };
    });
  }, [entries, sites]);

  const summary = useMemo(() => {
    const healthy = rows.filter(row => row.entry?.ok).length;
    const unhealthy = rows.filter(row => row.entry && !row.entry.ok).length;
    const unchecked = rows.length - healthy - unhealthy;
    const latestTimestamp = rows.reduce((latest, row) => {
      const timestamp = row.entry ? Date.parse(row.entry.checkedAt) : Number.NaN;
      return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
    }, 0);

    return {
      total: rows.length,
      healthy,
      unhealthy,
      unchecked,
      latestCheckedAt: latestTimestamp ? new Date(latestTimestamp).toISOString() : undefined,
    };
  }, [rows]);

  const visibleRows = filter === 'unhealthy'
    ? rows.filter(row => row.entry && !row.entry.ok)
    : rows;
  const browserOnly = entries.length > 0 && entries.every(entry => entry.source === 'browser');

  const metrics = [
    { label: '网站总数', value: summary.total, icon: Activity, tone: 'text-[#456b68] dark:text-[#d9ddd6]' },
    { label: '正常', value: summary.healthy, icon: CheckCircle2, tone: 'text-[#397066] dark:text-[#9bc9b9]' },
    { label: '异常', value: summary.unhealthy, icon: AlertTriangle, tone: 'text-[#985247] dark:text-[#e1a294]' },
    { label: '未检查', value: summary.unchecked, icon: HelpCircle, tone: 'text-[#718986] dark:text-[#aab9b5]' },
  ] as const;

  return (
    <section className="baize-panel rounded-2xl p-4 sm:p-5" aria-labelledby="link-health-title">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="link-health-title" className="flex items-center gap-2 text-lg font-bold text-[#234b4e] dark:text-[#f4f1e8]">
            <Activity size={20} className="text-[#4f8179] dark:text-[#c9a96b]" />
            链接健康
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[#718986] dark:text-[#9fb2ad]">
            <Clock3 size={13} />
            最后检查：{formatCheckedAt(summary.latestCheckedAt)}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            className="baize-button-primary w-full sm:w-auto"
            disabled={loading || checkState === 'starting' || checkState === 'running' || !onRunCheck}
            onClick={() => { void onRunCheck?.(); }}
            title={onRunCheck ? '让 GitHub Actions 在服务器端检查所有链接' : '请在发布区域配置 GitHub Token 后检测'}
          >
            <Activity size={16} className={checkState === 'starting' || checkState === 'running' ? 'animate-pulse' : ''} />
            {checkState === 'starting' ? '启动检测…' : checkState === 'running' ? '检测中…' : '立即检测'}
          </button>
          <button
            type="button"
            className="baize-button-secondary w-full sm:w-auto"
            disabled={loading || checkState === 'starting' || checkState === 'running'}
            onClick={() => { void onRefresh(); }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? '读取中…' : '读取报告'}
          </button>
        </div>
      </header>

      {checkMessage && (
        <div className={`mt-3 rounded-xl border p-3 text-xs leading-5 ${checkState === 'error' ? 'border-[#a85d50]/25 bg-[#a85d50]/8 text-[#8f4b42] dark:text-[#e3a69a]' : 'border-[#5f8f84]/25 bg-[#5f8f84]/8 text-[#315e5b] dark:text-[#b8cec7]'}`}>
          {checkMessage}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map(metric => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-xl border border-[#5f8f84]/15 bg-white/30 p-3 dark:border-[#c9a96b]/10 dark:bg-[#07191d]/25">
              <div className={`flex items-center gap-1.5 text-xs font-medium ${metric.tone}`}><Icon size={14} />{metric.label}</div>
              <strong className="mt-1 block text-xl text-[#173b41] dark:text-[#f4f1e8]">{metric.value}</strong>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-b border-[#5f8f84]/15 pb-3 dark:border-[#c9a96b]/10">
        <div className="flex rounded-xl border border-[#5f8f84]/20 bg-white/25 p-1 dark:border-[#c9a96b]/15 dark:bg-[#07191d]/20" role="group" aria-label="筛选链接状态">
          <button
            type="button"
            aria-pressed={filter === 'unhealthy'}
            onClick={() => setFilter('unhealthy')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter === 'unhealthy' ? 'bg-[#985247] text-white shadow-sm dark:bg-[#c97765]' : 'text-[#64807c] hover:bg-[#5f8f84]/10 dark:text-[#aab9b5]'}`}
          >
            异常 {summary.unhealthy}
          </button>
          <button
            type="button"
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter === 'all' ? 'bg-[#356b66] text-white shadow-sm dark:bg-[#c9a96b] dark:text-[#102c33]' : 'text-[#64807c] hover:bg-[#5f8f84]/10 dark:text-[#aab9b5]'}`}
          >
            全部 {summary.total}
          </button>
        </div>
        <span className="hidden text-xs text-[#718986] sm:block">{browserOnly ? '浏览器即时可达性检查' : '服务器检测由 GitHub Actions 执行'}</span>
      </div>

      {visibleRows.length ? (
        <ul className="max-h-[28rem] divide-y divide-[#5f8f84]/15 overflow-y-auto dark:divide-[#c9a96b]/10">
          {visibleRows.map(({ site, entry }) => {
            const unhealthy = Boolean(entry && !entry.ok);
            const healthy = Boolean(entry?.ok);
            return (
              <li key={site.id} className="flex min-w-0 items-start gap-3 py-3">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${unhealthy ? 'bg-[#a85d50]/10 text-[#985247] dark:text-[#e1a294]' : healthy ? 'bg-[#5f8f84]/10 text-[#397066] dark:text-[#9bc9b9]' : 'bg-[#718986]/10 text-[#718986] dark:text-[#aab9b5]'}`}>
                  {unhealthy ? <AlertTriangle size={16} /> : healthy ? <CheckCircle2 size={16} /> : <HelpCircle size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <strong className="min-w-0 truncate text-sm text-[#234b4e] dark:text-[#f4f1e8]">{site.name}</strong>
                    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${unhealthy ? 'bg-[#a85d50]/10 text-[#985247] dark:text-[#e1a294]' : healthy ? 'bg-[#5f8f84]/10 text-[#397066] dark:text-[#9bc9b9]' : 'bg-[#718986]/10 text-[#718986] dark:text-[#aab9b5]'}`}>
                      {statusLabel(entry)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[#718986] dark:text-[#9fb2ad]" title={site.url}>{site.url}</p>
                  {unhealthy && entry?.error && <p className="mt-1 break-words text-xs text-[#985247] dark:text-[#e1a294]">{entry.error}</p>}
                  {entry && <p className="mt-1 text-[11px] text-[#829793] dark:text-[#879d98]">检查于 {formatCheckedAt(entry.checkedAt)}</p>}
                </div>
                <a
                  className="baize-icon-button shrink-0"
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`打开 ${site.name}`}
                  title="在新窗口打开"
                >
                  <ExternalLink size={16} />
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="py-8 text-center text-sm text-[#64807c] dark:text-[#9fb2ad]">
          {loading ? '正在读取健康报告…' : filter === 'unhealthy' ? summary.unchecked ? `当前没有异常记录，另有 ${summary.unchecked} 个网站尚未检查。` : '当前没有检测到异常链接。' : '还没有可显示的网站。'}
        </div>
      )}

      <p className="mt-3 rounded-lg bg-[#5f8f84]/8 px-3 py-2 text-[11px] leading-5 text-[#718986] dark:bg-[#c9a96b]/5 dark:text-[#9fb2ad]">
        {browserOnly ? '当前是浏览器即时结果：“可连接”不代表 HTTP 200；填写 Token 后点击“立即检测”，可由 GitHub Actions 返回准确 HTTP 状态。' : '“立即检测”会在 GitHub Actions 中访问所有网址，完成后自动更新报告；“读取报告”只读取最近一次结果。'}
      </p>
    </section>
  );
}
