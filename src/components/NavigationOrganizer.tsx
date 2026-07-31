import { useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, type DragEndEvent, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, GripVertical, Trash2 } from 'lucide-react';
import type { Category, LayoutItem, NavigationData, Site } from '../types/navigation';

interface NavigationOrganizerProps {
  data: NavigationData;
  onChange: (data: NavigationData) => void;
  onEdit: (site: Site) => void;
  onDeleteSite: (siteId: string) => void;
  onRenameCategory: (categoryId: string, name: string) => void;
  onDeleteCategory: (categoryId: string) => void;
}

const fieldClass = 'rounded-lg border border-[#5f8f84]/20 bg-white/55 px-1.5 py-1 text-xs text-[#315e5b] outline-none dark:border-[#c9a96b]/15 dark:bg-[#07191d]/45 dark:text-[#d9ddd6]';

function layoutFor(data: NavigationData, siteId: string): LayoutItem {
  return data.layout.find(item => item.siteId === siteId) || { siteId, order: data.layout.length + 1, size: 'normal' };
}

function SortableSiteRow({ site, layout, onEdit, onDelete, onLayoutChange }: {
  site: Site;
  layout: LayoutItem;
  onEdit: (site: Site) => void;
  onDelete: (siteId: string) => void;
  onLayoutChange: (siteId: string, patch: Partial<LayoutItem>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: site.id, data: { type: 'site', categoryId: site.categoryId } });
  const size = `${layout.width || (layout.size === 'wide' ? 2 : 1)}x${layout.height || 1}`;
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`rounded-xl border border-[#5f8f84]/15 bg-[#fbfaf5]/58 p-3 dark:border-[#c9a96b]/10 dark:bg-[#07191d]/38 ${isDragging ? 'z-20 shadow-xl ring-1 ring-[#c9a96b]/40' : ''}`}>
      <div className="flex items-center gap-2">
        <button type="button" {...attributes} {...listeners} className="cursor-grab touch-none rounded-lg p-1.5 text-[#78918c] hover:bg-[#5f8f84]/10 active:cursor-grabbing" aria-label={`拖动 ${site.name}`}><GripVertical size={17} /></button>
        <div className="min-w-0 flex-1"><p className="truncate font-medium text-[#234b4e] dark:text-[#f4f1e8]">{site.name}</p><p className="truncate text-xs text-[#718986] dark:text-[#93a6a1]">{site.url}</p></div>
        <button onClick={() => onEdit(site)} className="rounded-lg px-2 py-1 text-xs font-medium text-[#356b66] hover:bg-[#5f8f84]/10 dark:text-[#d2b775]">编辑</button>
        <button onClick={() => onDelete(site.id)} className="baize-danger-button border-0 p-1.5" aria-label={`删除 ${site.name}`}><Trash2 size={15} /></button>
      </div>
      <div className="mt-2 grid grid-cols-[repeat(2,3.5rem)_1fr] items-end gap-2 border-t border-[#5f8f84]/10 pt-2 dark:border-[#c9a96b]/10">
        <label className="text-[10px] text-[#718986]">X<input type="number" min="0" max="3" placeholder="自动" className={`${fieldClass} mt-0.5 w-full`} value={layout.x ?? ''} onChange={event => onLayoutChange(site.id, { x: event.target.value === '' ? undefined : Number(event.target.value) })} /></label>
        <label className="text-[10px] text-[#718986]">Y<input type="number" min="0" placeholder="自动" className={`${fieldClass} mt-0.5 w-full`} value={layout.y ?? ''} onChange={event => onLayoutChange(site.id, { y: event.target.value === '' ? undefined : Number(event.target.value) })} /></label>
        <label className="text-[10px] text-[#718986]">卡片尺寸<select className={`${fieldClass} mt-0.5 w-full`} value={size} onChange={event => { const [width, height] = event.target.value.split('x').map(Number) as [1 | 2, 1 | 2]; onLayoutChange(site.id, { width, height, size: width === 2 ? 'wide' : 'normal' }); }}><option value="1x1">标准 1×1</option><option value="2x1">横向 2×1</option><option value="1x2">纵向 1×2</option><option value="2x2">大型 2×2</option></select></label>
      </div>
    </div>
  );
}

function CategoryDropZone({ category, sites, data, ...actions }: {
  category: Category;
  sites: Site[];
  data: NavigationData;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (site: Site) => void;
  onDelete: (siteId: string) => void;
  onLayoutChange: (siteId: string, patch: Partial<LayoutItem>) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `category:${category.id}`, data: { type: 'category', categoryId: category.id } });
  return (
    <div ref={setNodeRef} className={`rounded-xl border p-3 transition ${isOver ? 'border-[#c9a96b] bg-[#c9a96b]/10' : 'border-[#5f8f84]/15 bg-white/25 dark:border-[#c9a96b]/10 dark:bg-[#07191d]/20'}`}>
      <button type="button" onClick={actions.onToggle} className="mb-2 flex w-full items-center justify-between rounded-lg px-1 py-1 text-left hover:bg-[#5f8f84]/8"><span className="flex items-center gap-1.5 font-semibold text-[#315e5b] dark:text-[#d9c386]">{actions.expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}{category.name}</span><span className="text-xs text-[#718986]">{sites.length}</span></button>
      {actions.expanded ? <SortableContext items={sites.map(site => site.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-14 space-y-2">{sites.map(site => <SortableSiteRow key={site.id} site={site} layout={layoutFor(data, site.id)} onEdit={actions.onEdit} onDelete={actions.onDelete} onLayoutChange={actions.onLayoutChange} />)}{sites.length === 0 && <div className="rounded-lg border border-dashed border-[#5f8f84]/20 p-4 text-center text-xs text-[#718986]">拖动网站到这里</div>}</div>
      </SortableContext> : <div className="rounded-lg border border-dashed border-[#5f8f84]/15 px-3 py-2 text-center text-[11px] text-[#829793]">已折叠；仍可拖动网站到此分类</div>}
    </div>
  );
}

function SortableCategoryRow({ category, onRename, onDelete }: { category: Category; onRename: (id: string, name: string) => void; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: category.id });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex gap-2"><button {...attributes} {...listeners} className="cursor-grab touch-none text-[#78918c]"><GripVertical size={17} /></button><input className="baize-input" defaultValue={category.name} onBlur={event => onRename(category.id, event.target.value)} /><button onClick={() => onDelete(category.id)} className="baize-danger-button border-0 p-2"><Trash2 size={16} /></button></div>;
}

export function NavigationOrganizer({ data, onChange, onEdit, onDeleteSite, onRenameCategory, onDeleteCategory }: NavigationOrganizerProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const categories = [...data.categories].sort((a, b) => a.order - b.order);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(() => new Set(categories.slice(0, 1).map(category => category.id)));
  const order = new Map(data.layout.map(item => [item.siteId, item.order]));
  const sitesByCategory = (categoryId: string) => data.sites.filter(site => site.categoryId === categoryId).sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
  const allExpanded = categories.length > 0 && categories.every(category => expandedCategoryIds.has(category.id));
  const toggleCategory = (categoryId: string) => setExpandedCategoryIds(current => {
    const next = new Set(current);
    if (next.has(categoryId)) next.delete(categoryId);
    else next.add(categoryId);
    return next;
  });

  const updateLayout = (siteId: string, patch: Partial<LayoutItem>) => {
    const current = layoutFor(data, siteId);
    onChange({ ...data, layout: data.layout.some(item => item.siteId === siteId) ? data.layout.map(item => item.siteId === siteId ? { ...item, ...patch } : item) : [...data.layout, { ...current, ...patch }] });
  };

  const moveSite = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const activeSite = data.sites.find(site => site.id === active.id);
    if (!activeSite) return;
    const overId = String(over.id);
    const overSite = data.sites.find(site => site.id === overId);
    const targetCategoryId = overId.startsWith('category:') ? overId.slice(9) : overSite?.categoryId;
    if (!targetCategoryId) return;
    const updatedSites = data.sites.map(site => site.id === activeSite.id ? { ...site, categoryId: targetCategoryId } : site);
    const ordered = [...updatedSites].sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999)).filter(site => site.id !== activeSite.id);
    const targetIndex = overSite ? ordered.findIndex(site => site.id === overSite.id) : ordered.reduce((last, site, index) => site.categoryId === targetCategoryId ? index + 1 : last, 0);
    ordered.splice(Math.max(0, targetIndex), 0, { ...activeSite, categoryId: targetCategoryId });
    const existing = new Map(data.layout.map(item => [item.siteId, item]));
    onChange({ ...data, sites: updatedSites, layout: ordered.map((site, index) => ({ ...(existing.get(site.id) || { siteId: site.id, size: 'normal' as const }), order: index + 1 })) });
  };

  const reorderCategories = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex(category => category.id === active.id);
    const newIndex = categories.findIndex(category => category.id === over.id);
    onChange({ ...data, categories: arrayMove(categories, oldIndex, newIndex).map((category, index) => ({ ...category, order: index + 1 })) });
  };

  const resetCoordinates = () => {
    onChange({
      ...data,
      layout: data.layout.map(({ x: _x, y: _y, ...item }) => item),
    });
  };

  return (
    <div className="space-y-6">
      <section className="baize-panel rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-[#234b4e] dark:text-[#f4f1e8]">网站与网格布局</h2><p className="mt-1 text-xs text-[#718986]">分类默认折叠以减少渲染；跨分类拖动仍可投放到折叠分类。</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setExpandedCategoryIds(allExpanded ? new Set() : new Set(categories.map(category => category.id)))} className="baize-button-secondary px-3 py-1.5 text-xs">{allExpanded ? '全部收起' : '全部展开'}</button><button type="button" onClick={resetCoordinates} className="baize-button-secondary px-3 py-1.5 text-xs">清除坐标，自动排列</button></div></div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={moveSite}>
          <div className="grid max-h-[760px] gap-3 overflow-y-auto pr-1 lg:grid-cols-2">{categories.map(category => <CategoryDropZone key={category.id} category={category} sites={sitesByCategory(category.id)} data={data} expanded={expandedCategoryIds.has(category.id)} onToggle={() => toggleCategory(category.id)} onEdit={onEdit} onDelete={onDeleteSite} onLayoutChange={updateLayout} />)}</div>
        </DndContext>
      </section>
      <section className="baize-panel rounded-2xl p-5">
        <h2 className="mb-4 text-lg font-bold text-[#234b4e] dark:text-[#f4f1e8]">分类拖拽排序</h2>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderCategories}><SortableContext items={categories.map(category => category.id)} strategy={verticalListSortingStrategy}><div className="space-y-2">{categories.map(category => <SortableCategoryRow key={category.id} category={category} onRename={onRenameCategory} onDelete={onDeleteCategory} />)}</div></SortableContext></DndContext>
      </section>
    </div>
  );
}
