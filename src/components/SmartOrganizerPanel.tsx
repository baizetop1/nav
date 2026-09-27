import { useEffect, useMemo, useState } from 'react';
import { Check, Edit3, Layers, Search, Sparkles, Trash2 } from 'lucide-react';
import type { ClickStatsStore } from '../lib/activityStats';
import type { LinkHealthEntry } from '../lib/linkHealth';
import {
  analyzeNavigation, applyOrganizerChanges, ORGANIZER_ISSUE_LABELS, previewOrganizerBatch,
  removeDuplicateSites, type OrganizerBatch, type OrganizerChange, type OrganizerIssue,
} from '../lib/smartOrganizer';
import type { NavigationData, Site } from '../types/navigation';

interface SmartOrganizerPanelProps {
  data: NavigationData;
  linkHealthEntries: LinkHealthEntry[];
  clickStats: ClickStatsStore;
  onChange: (data: NavigationData) => void;
  onEdit: (site: Site) => void;
}

const labelClass = 'block text-xs font-medium text-[#526f6c] dark:text-[#b8c4c0]';
const issueNames = Object.keys(ORGANIZER_ISSUE_LABELS) as OrganizerIssue[];

export function SmartOrganizerPanel({ data, linkHealthEntries, clickStats, onChange, onEdit }: SmartOrganizerPanelProps) {
  const analysis = useMemo(() => analyzeNavigation(data, linkHealthEntries, clickStats), [data, linkHealthEntries, clickStats]);
  const [filter, setFilter] = useState<OrganizerIssue | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [batch, setBatch] = useState<OrganizerBatch>({});
  const [preview, setPreview] = useState<OrganizerChange[] | null>(null);
  const [keepIds, setKeepIds] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const categoryNames = useMemo(() => new Map(data.categories.map(category => [category.id, category.name])), [data.categories]);
  const visibleRows = analysis.rows.filter(row => (filter === 'all' || row.issues.includes(filter))
    && `${row.site.name} ${row.site.url} ${row.site.tags.join(' ')}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));
  const selectedIds = selected.filter(id => data.sites.some(site => site.id === id));
  const allSelected = visibleRows.length > 0 && visibleRows.every(row => selectedIds.includes(row.site.id));

  useEffect(() => setPreview(null), [data, batch, selected]);

  const showPreview = () => {
    try {
      const changes = previewOrganizerBatch(data, selectedIds, batch);
      setPreview(changes);
      setMessage(changes.length ? '' : '当前选择和设置不会改变任何网站，请调整后重试。');
    } catch (error) { setMessage(error instanceof Error ? error.message : '无法生成预览。'); }
  };

  const applyPreview = () => {
    if (!preview?.length) return;
    try {
      onChange(applyOrganizerChanges(data, preview));
      setMessage(`已将 ${preview.length} 个网站的修改保存到草稿，发布后会更新 GitHub。`);
      setPreview(null);
      setSelected([]);
    } catch (error) { setMessage(error instanceof Error ? error.message : '应用失败，请重新预览。'); }
  };

  const deduplicate = (url: string, ids: string[]) => {
    const keepId = keepIds[url] || ids[0];
    const keep = data.sites.find(site => site.id === keepId);
    const removed = data.sites.filter(site => ids.includes(site.id) && site.id !== keepId);
    if (!keep || !window.confirm(`保留“${keep.name}”，删除 ${removed.map(site => `“${site.name}”`).join('、')}？\n保留项的介绍、标签和布局不变；其他项的独立资料和布局将从草稿移除，历史访问统计不合并。`)) return;
    try {
      onChange(removeDuplicateSites(data, ids, keepId));
      setSelected(current => current.filter(id => !removed.some(site => site.id === id)));
      setMessage(`已保留“${keep.name}”，移除 ${removed.length} 个重复网站及对应布局。修改尚未发布。`);
    } catch (error) { setMessage(error instanceof Error ? error.message : '去重失败，请重试。'); }
  };

  return <section className="baize-panel rounded-2xl p-5" aria-labelledby="smart-organizer-title">
    <h2 id="smart-organizer-title" className="flex items-center gap-2 text-lg font-bold text-[#234b4e] dark:text-[#f4f1e8]"><Sparkles size={20} />智能整理中心</h2>
    <p className="mt-2 text-xs leading-5 text-[#718986]">检查重复、异常和待完善资料，选中网站后可预览并批量修改。分类建议根据已有分类和同主机网站生成。</p>
    <div className="mt-4 flex flex-wrap gap-2" aria-label="整理问题筛选">
      {(['all', ...issueNames] as const).map(issue => <button type="button" key={issue} aria-pressed={filter === issue}
        onClick={() => { setFilter(issue); setSelected([]); }}
        className={`rounded-xl border px-3 py-2 text-xs ${filter === issue ? 'border-[#356b66] bg-[#356b66] text-white dark:border-[#c9a96b] dark:bg-[#c9a96b] dark:text-[#102c33]' : 'border-[#5f8f84]/20 text-[#526f6c] dark:border-[#c9a96b]/20 dark:text-[#b8c4c0]'}`}>
        {issue === 'all' ? '全部' : ORGANIZER_ISSUE_LABELS[issue]} {issue === 'all' ? analysis.rows.length : analysis.rows.filter(row => row.issues.includes(issue)).length}
      </button>)}
    </div>
    <p className="mt-3 text-xs leading-5 text-[#718986]">访问统计仅反映本机及已同步的记录，保留 90 天；无记录不等于从未使用。未设图标的网站仍可使用自动图标。异常来源于已有健康报告，修改过的网址需重新检查。</p>
    <label className="relative mt-4 block"><Search size={15} className="absolute left-3 top-3 text-[#718986]" /><input aria-label="搜索待整理网站" className="baize-input pl-9" value={query} onChange={event => { setQuery(event.target.value); setSelected([]); }} placeholder="搜索名称、地址或标签" /></label>
    <div className="my-3 flex items-center justify-between gap-2 text-xs text-[#526f6c] dark:text-[#b8c4c0]">
      <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#356b66]" checked={allSelected} onChange={event => setSelected(event.target.checked ? visibleRows.map(row => row.site.id) : [])} />选择筛选结果（{visibleRows.length}）</label>
      <span>已选 {selectedIds.length}</span>
    </div>
    <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
      {visibleRows.map(row => <article key={row.site.id} className="rounded-xl border border-[#5f8f84]/15 bg-white/25 p-3 dark:border-[#c9a96b]/15 dark:bg-[#07191d]/20">
        <div className="flex items-start gap-2">
          <input type="checkbox" className="mt-1 accent-[#356b66]" aria-label={`选择 ${row.site.name}`} checked={selectedIds.includes(row.site.id)} onChange={event => setSelected(current => event.target.checked ? [...current, row.site.id] : current.filter(id => id !== row.site.id))} />
          <div className="min-w-0 flex-1"><strong className="text-sm text-[#234b4e] dark:text-[#f4f1e8]">{row.site.name}</strong><span className="ml-2 text-xs text-[#718986]">{categoryNames.get(row.site.categoryId)}</span><p className="break-all text-xs text-[#718986]">{row.site.url}</p></div>
          <button type="button" onClick={() => onEdit(row.site)} className="baize-button-secondary shrink-0 px-2 py-1.5 text-xs" aria-label={`编辑 ${row.site.name}`}><Edit3 size={13} />编辑</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">{row.issues.map(issue => <span key={issue} className={`rounded px-1.5 py-0.5 text-[11px] ${issue === 'unhealthy' ? 'bg-[#a85d50]/10 text-[#985247] dark:text-[#e1a294]' : 'bg-[#5f8f84]/10 text-[#526f6c] dark:text-[#b8c4c0]'}`}>{ORGANIZER_ISSUE_LABELS[issue]}</span>)}</div>
        {row.lastVisitedAt && <p className="mt-1 text-[11px] text-[#718986]">最近记录：{new Date(row.lastVisitedAt).toLocaleDateString()}</p>}
        {row.suggestion && row.suggestion.categoryId !== row.site.categoryId && <p className="mt-1 text-xs text-[#4f8179] dark:text-[#c9a96b]">建议分类：{categoryNames.get(row.suggestion.categoryId)} · {row.suggestion.reason}</p>}
      </article>)}
      {!visibleRows.length && <p className="py-6 text-center text-sm text-[#718986]">当前筛选没有网站。</p>}
    </div>

    <div className="mt-5 rounded-xl border border-[#5f8f84]/20 p-3 dark:border-[#c9a96b]/20">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#315e5b] dark:text-[#d9ddd6]"><Layers size={16} />批量修改 · {selectedIds.length} 项</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>分类<select className="baize-input mt-1" value={batch.useSuggestedCategories ? '__suggested__' : batch.categoryId || ''} onChange={event => setBatch(current => ({ ...current, categoryId: event.target.value === '__suggested__' ? undefined : event.target.value || undefined, useSuggestedCategories: event.target.value === '__suggested__' }))}><option value="">保持不变</option><option value="__suggested__">分别使用规则建议（有建议的项）</option>{data.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className={labelClass}>标签操作<select className="baize-input mt-1" value={batch.tagsMode || ''} onChange={event => setBatch(current => ({ ...current, tagsMode: event.target.value as OrganizerBatch['tagsMode'] || undefined }))}><option value="">保持不变</option><option value="append">追加标签</option><option value="replace">替换标签（留空即清空）</option></select></label>
        {batch.tagsMode && <label className={`${labelClass} sm:col-span-2`}>标签（逗号分隔）<input className="baize-input mt-1" value={batch.tags?.join(',') || ''} onChange={event => setBatch(current => ({ ...current, tags: event.target.value.split(/[,，]/) }))} placeholder="工作, 文档" /></label>}
        <label className={labelClass}>介绍操作<select className="baize-input mt-1" value={batch.descriptionMode || ''} onChange={event => setBatch(current => ({ ...current, descriptionMode: event.target.value as OrganizerBatch['descriptionMode'] || undefined }))}><option value="">保持不变</option><option value="missing">仅补充空介绍</option><option value="replace">替换所有选中项介绍</option></select></label>
        {batch.descriptionMode && <label className={labelClass}>统一介绍<input className="baize-input mt-1" value={batch.description || ''} onChange={event => setBatch(current => ({ ...current, description: event.target.value }))} placeholder="输入要保存的介绍，留空即清空" /></label>}
      </div>
      <button type="button" className="baize-button-secondary mt-3" disabled={!selectedIds.length} onClick={showPreview}><Search size={15} />预览修改</button>
      {preview && preview.length > 0 && <div className="mt-3 rounded-xl bg-[#5f8f84]/8 p-3">
        <h4 className="text-sm font-semibold text-[#315e5b] dark:text-[#d9ddd6]">将修改 {preview.length} 项</h4>
        <div className="mt-2 max-h-64 space-y-3 overflow-y-auto text-xs text-[#526f6c] dark:text-[#b8c4c0]">{preview.map(({ before, after }) => <div key={before.id} className="break-words"><strong>{before.name}</strong>
          {before.categoryId !== after.categoryId && <p>分类：{categoryNames.get(before.categoryId)} → {categoryNames.get(after.categoryId)}</p>}
          {JSON.stringify(before.tags) !== JSON.stringify(after.tags) && <p>标签：{before.tags.join('、') || '空'} → {after.tags.join('、') || '空'}</p>}
          {before.description !== after.description && <p>介绍：{before.description || '空'} → {after.description || '空'}</p>}
        </div>)}</div>
        <button type="button" className="baize-button-primary mt-3" onClick={applyPreview}><Check size={15} />确认应用到草稿</button>
      </div>}
    </div>

    {analysis.duplicateGroups.length > 0 && <div className="mt-5">
      <h3 className="text-sm font-semibold text-[#315e5b] dark:text-[#d9ddd6]">重复网址 · {analysis.duplicateGroups.length} 组</h3>
      <p className="mt-1 text-xs leading-5 text-[#718986]">仅合并规范化后完全相同的地址，保留查询参数、页面锚点和路径末尾斜杠。请选择保留对象，其余资料不会自动合并。</p>
      <div className="mt-3 space-y-3">{analysis.duplicateGroups.map(group => <div key={group.url} className="rounded-xl border border-[#5f8f84]/20 p-3 dark:border-[#c9a96b]/20">
        <p className="mb-2 break-all text-xs text-[#718986]">{group.url}</p>
        {group.sites.map(site => <label key={site.id} className="mb-2 flex items-start gap-2 text-xs text-[#526f6c] dark:text-[#b8c4c0]"><input type="radio" className="mt-0.5 accent-[#356b66]" name={`keep-${group.sites[0].id}`} value={site.id} checked={(keepIds[group.url] || group.sites[0].id) === site.id} onChange={() => setKeepIds(current => ({ ...current, [group.url]: site.id }))} /><span><strong>{site.name}</strong> · {categoryNames.get(site.categoryId)}<br />{site.description || '无介绍'} · {site.tags.join('、') || '无标签'}</span></label>)}
        <button type="button" className="baize-danger-button mt-1 text-xs" onClick={() => deduplicate(group.url, group.sites.map(site => site.id))}><Trash2 size={14} />保留所选并移除其余 {group.sites.length - 1} 项</button>
      </div>)}</div>
    </div>}
    {message && <p role="status" className="mt-4 rounded-xl border border-[#5f8f84]/20 bg-[#5f8f84]/8 p-3 text-sm text-[#315e5b] dark:text-[#b8cec7]">{message}</p>}
  </section>;
}
