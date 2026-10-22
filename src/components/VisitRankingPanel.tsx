import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { BarChart3, ExternalLink } from 'lucide-react';
import { getVisitRanking, localDateKey, type ClickStatsStore, type VisitRankingPeriod } from '../lib/activityStats';
import { safeHostname, safeHttpUrl } from '../lib/navigationData';
import type { Site } from '../types/navigation';

export interface VisitRankingPanelProps {
  sites: Site[];
  stats: ClickStatsStore;
  now?: Date;
  onVisit: (siteId: string) => void;
}

export function VisitRankingPanel({ sites, stats, now = new Date(), onVisit }: VisitRankingPanelProps) {
  const [period, setPeriod] = useState<VisitRankingPeriod>('day');
  const tabs = useRef<Partial<Record<VisitRankingPeriod, HTMLButtonElement | null>>>({});
  const groupId = useId();
  const dateKey = localDateKey(now);
  const rows = useMemo(() => getVisitRanking(stats, sites, period, now).slice(0, 8), [stats, sites, period, dateKey]);
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'day' : event.key === 'End' ? 'month' : period === 'day' ? 'month' : 'day';
    setPeriod(next);
    tabs.current[next]?.focus();
  };
  return <section id="visit-ranking" aria-label="访问排行" className="baize-panel min-w-0 max-w-full rounded-2xl p-4 sm:p-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="flex items-center gap-2 text-base font-semibold appearance-heading"><BarChart3 size={19} className="shrink-0" aria-hidden="true" />访问排行</h2>
        <p className="mt-1 text-xs leading-5 appearance-muted">本日 / 本月访问前 8 名；独立展示，不改变下方原有导航。</p>
      </div>
      <div role="tablist" aria-label="排行周期" className="flex shrink-0 gap-1 rounded-xl appearance-soft p-1">
        {(['day', 'month'] as const).map(value => <button key={value} id={`${groupId}-${value}`} ref={node => { tabs.current[value] = node; }} role="tab" type="button" aria-selected={period === value} aria-controls={`${groupId}-content`} tabIndex={period === value ? 0 : -1} onKeyDown={onTabKey} onClick={() => setPeriod(value)} className={`${period === value ? 'baize-button-primary' : 'baize-button-secondary'} min-h-9 px-3 py-1.5 text-xs`}>{value === 'day' ? '本日' : '本月'}</button>)}
      </div>
    </header>
    <div id={`${groupId}-content`} role="tabpanel" aria-label={period === 'day' ? '本日访问排行' : '本月访问排行'} className="mt-4 min-w-0">
      {rows.length > 0 ? <ol className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">{rows.map((row, index) => {
        const url = safeHttpUrl(row.site.url);
        return <li key={row.site.id} data-ranking-site={row.site.id} className="min-w-0">
          <a href={url ?? undefined} aria-disabled={!url} aria-label={`从访问排行打开 ${row.site.name}`} target="_blank" rel="noopener noreferrer" onClick={event => { if (!url) { event.preventDefault(); return; } onVisit(row.site.id); }} className="group flex h-full min-w-0 items-start gap-2 rounded-xl border appearance-border appearance-soft p-3 transition hover:bg-[var(--app-input)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
            <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold appearance-accent">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm appearance-heading">{row.site.name}</strong>
              <span className="mt-0.5 block truncate text-[11px] appearance-muted">{safeHostname(row.site.url)}</span>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                <span data-ranking-count="day" className={period === 'day' ? 'font-semibold appearance-accent' : 'appearance-muted'}>本日 {row.todayCount.toLocaleString('zh-CN')} 次</span>
                <span data-ranking-count="month" className={period === 'month' ? 'font-semibold appearance-accent' : 'appearance-muted'}>本月 {row.monthCount.toLocaleString('zh-CN')} 次</span>
              </div>
            </div>
            <ExternalLink size={12} className="mt-1 shrink-0 appearance-muted opacity-60" aria-hidden="true" />
          </a>
        </li>;
      })}</ol> : <p className="rounded-xl appearance-soft px-4 py-6 text-center text-sm leading-6 appearance-muted">{period === 'day' ? '今天还没有访问记录。' : '本月还没有访问记录。'}从下方导航打开网站后会出现在这里；原有网站始终保留。</p>}
    </div>
    <p className="mt-3 text-[11px] leading-5 appearance-muted">按本机日期统计：{period === 'day' ? dateKey : `${dateKey.slice(0, 7)} 自然月，截至今天`}。仅记录从本站打开的正式网站，不读取浏览器历史；本机记录最多保留 90 天，不是全站访客排行榜。</p>
  </section>;
}
