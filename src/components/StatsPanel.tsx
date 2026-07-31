import { useMemo, useState } from 'react';
import { BarChart3, CalendarDays, MousePointerClick, Trash2, Trophy } from 'lucide-react';
import { getTodayClicks, recentDateKeys, type ClickStatsStore } from '../lib/activityStats';
import type { NavigationData, Site } from '../types/navigation';

interface StatsPanelProps {
  data: NavigationData;
  stats: ClickStatsStore;
  onClear: () => void;
}

export function StatsPanel({ data, stats, onClear }: StatsPanelProps) {
  const [period, setPeriod] = useState<7 | 30>(7);
  const summary = useMemo(() => {
    const dateKeys = recentDateKeys(period);
    const siteTotals = new Map<string, number>();
    const daily = dateKeys.map(date => {
      const clicks = stats.days[date]?.clicks || {};
      const total = Object.entries(clicks).reduce((sum, [siteId, value]) => {
        siteTotals.set(siteId, (siteTotals.get(siteId) || 0) + value.count);
        return sum + value.count;
      }, 0);
      return { date, total };
    });
    const siteById = new Map(data.sites.map(site => [site.id, site]));
    const categoryById = new Map(data.categories.map(category => [category.id, category.name]));
    const rankedSites = [...siteTotals.entries()]
      .map(([siteId, count]) => ({ site: siteById.get(siteId), count }))
      .filter((item): item is { site: Site; count: number } => Boolean(item.site))
      .sort((a, b) => b.count - a.count);
    const categoryTotals = new Map<string, number>();
    rankedSites.forEach(({ site, count }) => categoryTotals.set(site.categoryId, (categoryTotals.get(site.categoryId) || 0) + count));
    const rankedCategories = [...categoryTotals.entries()]
      .map(([categoryId, count]) => ({ name: categoryById.get(categoryId) || '未分类', count }))
      .sort((a, b) => b.count - a.count);
    return {
      daily,
      total: daily.reduce((sum, item) => sum + item.total, 0),
      today: Object.values(getTodayClicks(stats)).reduce((sum, item) => sum + item.count, 0),
      activeSites: rankedSites.length,
      rankedSites,
      rankedCategories,
      maxDaily: Math.max(1, ...daily.map(item => item.total)),
      maxSite: Math.max(1, ...rankedSites.map(item => item.count)),
      maxCategory: Math.max(1, ...rankedCategories.map(item => item.count)),
    };
  }, [data.categories, data.sites, period, stats]);

  return (
    <section className="baize-panel rounded-2xl p-4 sm:p-5" aria-labelledby="stats-title">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="stats-title" className="flex items-center gap-2 text-lg font-bold text-[#234b4e] dark:text-[#f4f1e8]"><BarChart3 size={20} className="text-[#4f8179] dark:text-[#c9a96b]" />访问统计</h2>
          <p className="mt-1 text-xs text-[#718986]">仅统计本设备点击，保留最近 90 天，并随完整备份迁移。</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-[#5f8f84]/20 bg-white/25 p-1 dark:border-[#c9a96b]/15 dark:bg-[#07191d]/20">
            {([7, 30] as const).map(value => <button key={value} type="button" onClick={() => setPeriod(value)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${period === value ? 'bg-[#356b66] text-white dark:bg-[#c9a96b] dark:text-[#102c33]' : 'text-[#64807c] hover:bg-[#5f8f84]/10 dark:text-[#aab9b5]'}`}>{value} 天</button>)}
          </div>
          <button type="button" className="baize-icon-button text-[#985247]" title="清空统计" aria-label="清空访问统计" onClick={() => { if (confirm('确定清空本设备全部访问统计吗？')) onClear(); }}><Trash2 size={17} /></button>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          { label: '今日点击', value: summary.today, icon: MousePointerClick },
          { label: `${period} 天点击`, value: summary.total, icon: CalendarDays },
          { label: '访问过的网站', value: summary.activeSites, icon: BarChart3 },
          { label: '最常访问', value: summary.rankedSites[0]?.site.name || '暂无', icon: Trophy },
        ].map(metric => {
          const Icon = metric.icon;
          return <div key={metric.label} className="rounded-xl border border-[#5f8f84]/15 bg-white/30 p-3 dark:border-[#c9a96b]/10 dark:bg-[#07191d]/25"><span className="flex items-center gap-1.5 text-xs text-[#718986]"><Icon size={14} />{metric.label}</span><strong className="mt-1 block truncate text-lg text-[#173b41] dark:text-[#f4f1e8]" title={String(metric.value)}>{metric.value}</strong></div>;
        })}
      </div>

      <div className="mt-5 rounded-xl border border-[#5f8f84]/15 bg-white/20 p-3 dark:border-[#c9a96b]/10 dark:bg-[#07191d]/20">
        <div className="mb-3 flex items-center justify-between text-xs text-[#718986]"><span>每日趋势</span><span>共 {summary.total} 次</span></div>
        <div className="flex h-32 items-end gap-1">
          {summary.daily.map((item, index) => <div key={item.date} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${item.date}：${item.total} 次`}><span className="hidden text-[9px] text-[#64807c] group-hover:block">{item.total}</span><div className="w-full min-w-1 rounded-t bg-[#5f8f84]/65 transition hover:bg-[#356b66] dark:bg-[#c9a96b]/55 dark:hover:bg-[#c9a96b]" style={{ height: `${Math.max(item.total ? 8 : 2, item.total / summary.maxDaily * 100)}%` }} /><span className={`text-[9px] text-[#829793] ${period === 30 && index % 5 !== 0 && index !== summary.daily.length - 1 ? 'invisible' : ''}`}>{item.date.slice(5)}</span></div>)}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-[#456b68] dark:text-[#d9ddd6]">网站排行</h3>
          <div className="space-y-2">{summary.rankedSites.slice(0, 8).map(({ site, count }, index) => <div key={site.id}><div className="mb-1 flex justify-between gap-2 text-xs"><span className="truncate text-[#456b68] dark:text-[#d9ddd6]">{index + 1}. {site.name}</span><span className="text-[#718986]">{count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#5f8f84]/10"><div className="h-full rounded-full bg-[#5f8f84] dark:bg-[#c9a96b]" style={{ width: `${count / summary.maxSite * 100}%` }} /></div></div>)}</div>
          {!summary.rankedSites.length && <p className="py-6 text-center text-xs text-[#829793]">点击网站后会开始记录。</p>}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-[#456b68] dark:text-[#d9ddd6]">分类分布</h3>
          <div className="space-y-2">{summary.rankedCategories.slice(0, 8).map(({ name, count }) => <div key={name}><div className="mb-1 flex justify-between gap-2 text-xs"><span className="truncate text-[#456b68] dark:text-[#d9ddd6]">{name}</span><span className="text-[#718986]">{count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#c9a96b]/10"><div className="h-full rounded-full bg-[#9b8060] dark:bg-[#d3b976]" style={{ width: `${count / summary.maxCategory * 100}%` }} /></div></div>)}</div>
          {!summary.rankedCategories.length && <p className="py-6 text-center text-xs text-[#829793]">暂无分类统计。</p>}
        </div>
      </div>
    </section>
  );
}
