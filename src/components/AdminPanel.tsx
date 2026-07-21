import { useMemo, useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Download, ExternalLink, Github, GripVertical, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { getAuthenticatedUser, publishNavigationData } from '../services/github';
import type { NavigationData, Site } from '../types/navigation';

interface AdminPanelProps {
  data: NavigationData;
  defaultRepository: { owner: string; repo: string; branch: string };
  onChange: (data: NavigationData) => void;
  onReset: () => void;
  onClose: () => void;
}

type SiteDraft = Omit<Site, 'id' | 'tags'> & { id?: string; tags: string };

const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white';

function createSiteDraft(categoryId: string): SiteDraft {
  return { name: '', url: '', description: '', categoryId, tags: '', favorite: false, icon: '' };
}

function slugify(value: string): string {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '');
  return slug || `item-${Date.now().toString(36)}`;
}

function SortableSiteRow({ site, onEdit, onDelete }: { site: Site; onEdit: (site: Site) => void; onDelete: (siteId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: site.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-center gap-2 rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 ${isDragging ? 'z-10 shadow-lg' : ''}`}>
      <button type="button" {...attributes} {...listeners} className="cursor-grab touch-none rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 active:cursor-grabbing dark:hover:bg-gray-800" aria-label={`拖动 ${site.name}`}><GripVertical size={17} /></button>
      <div className="min-w-0 flex-1"><p className="truncate font-medium dark:text-white">{site.name}</p><p className="truncate text-xs text-gray-500">{site.url}</p></div>
      <button onClick={() => onEdit(site)} className="rounded-lg px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950">编辑</button>
      <button onClick={() => onDelete(site.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950" aria-label={`删除 ${site.name}`}><Trash2 size={16} /></button>
    </div>
  );
}

export function AdminPanel({ data, defaultRepository, onChange, onReset, onClose }: AdminPanelProps) {
  const firstCategoryId = data.categories[0]?.id || '';
  const [draft, setDraft] = useState<SiteDraft>(() => createSiteDraft(firstCategoryId));
  const [newCategoryName, setNewCategoryName] = useState('');
  const [token, setToken] = useState('');
  const [repository, setRepository] = useState(defaultRepository);
  const [commitMessage, setCommitMessage] = useState('Update navigation data from CMS');
  const [publishState, setPublishState] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string; url?: string }>({ type: 'idle' });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortedSites = useMemo(() => {
    const order = new Map(data.layout.map(item => [item.siteId, item.order]));
    return [...data.sites].sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
  }, [data]);

  const resetForm = (categoryId = firstCategoryId) => setDraft(createSiteDraft(categoryId));

  const editSite = (site: Site) => {
    setDraft({ ...site, tags: site.tags.join(', ') });
  };

  const saveSite = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const parsedUrl = new URL(draft.url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error();
    } catch {
      alert('请输入有效的 http 或 https 地址。');
      return;
    }

    const baseId = draft.id || slugify(draft.name);
    let id = baseId;
    let suffix = 2;
    while (!draft.id && data.sites.some(site => site.id === id)) id = `${baseId}-${suffix++}`;

    const site: Site = {
      id,
      name: draft.name.trim(),
      url: draft.url.trim(),
      description: draft.description.trim(),
      categoryId: draft.categoryId,
      tags: draft.tags.split(/[,，]/).map(tag => tag.trim()).filter(Boolean),
      favorite: Boolean(draft.favorite),
      ...(draft.icon?.trim() ? { icon: draft.icon.trim() } : {}),
    };

    const exists = data.sites.some(item => item.id === site.id);
    const sites = exists ? data.sites.map(item => item.id === site.id ? site : item) : [...data.sites, site];
    const layout = exists ? data.layout : [...data.layout, { siteId: site.id, order: data.layout.length + 1, size: 'normal' as const }];
    onChange({ ...data, sites, layout });
    resetForm(site.categoryId);
  };

  const deleteSite = (siteId: string) => {
    if (!confirm('确定删除这个网站吗？此操作会保留在本地草稿中，发布后才写入仓库。')) return;
    onChange({
      ...data,
      sites: data.sites.filter(site => site.id !== siteId),
      layout: data.layout.filter(item => item.siteId !== siteId),
    });
    if (draft.id === siteId) resetForm();
  };

  const reorderSites = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedSites.findIndex(site => site.id === active.id);
    const newIndex = sortedSites.findIndex(site => site.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(sortedSites, oldIndex, newIndex);
    const existingSizes = new Map(data.layout.map(item => [item.siteId, item.size]));
    onChange({
      ...data,
      layout: reordered.map((site, index) => ({ siteId: site.id, order: index + 1, size: existingSizes.get(site.id) || 'normal' })),
    });
  };

  const addCategory = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    const baseId = slugify(name);
    let id = baseId;
    let suffix = 2;
    while (data.categories.some(category => category.id === id)) id = `${baseId}-${suffix++}`;
    onChange({ ...data, categories: [...data.categories, { id, name, order: data.categories.length + 1 }] });
    setNewCategoryName('');
    if (!draft.categoryId) setDraft(current => ({ ...current, categoryId: id }));
  };

  const renameCategory = (categoryId: string, name: string) => {
    if (!name.trim()) return;
    onChange({ ...data, categories: data.categories.map(category => category.id === categoryId ? { ...category, name: name.trim() } : category) });
  };

  const deleteCategory = (categoryId: string) => {
    if (data.sites.some(site => site.categoryId === categoryId)) {
      alert('该分类中仍有网站，请先移动或删除这些网站。');
      return;
    }
    if (!confirm('确定删除这个空分类吗？')) return;
    onChange({ ...data, categories: data.categories.filter(category => category.id !== categoryId) });
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'baize-navigation.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token.trim()) {
      setPublishState({ type: 'error', message: '请输入 fine-grained Personal Access Token。' });
      return;
    }
    setPublishState({ type: 'loading', message: '正在验证账号并创建提交…' });
    try {
      const user = await getAuthenticatedUser(token.trim());
      const result = await publishNavigationData(repository, data, token.trim(), commitMessage.trim() || undefined);
      setPublishState({ type: 'success', message: `已由 @${user.login} 提交，GitHub Actions 将开始部署。`, url: result.commitUrl });
      localStorage.removeItem('nav_cms_draft');
    } catch (error) {
      setPublishState({ type: 'error', message: error instanceof Error ? error.message : '发布失败，请检查 Token 和仓库设置。' });
    }
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-gray-100/95 p-4 backdrop-blur-xl dark:bg-gray-950/95 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">白泽导航 CMS</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">管理导航内容</h1>
            <p className="mt-1 text-sm text-gray-500">修改会自动保存为本地草稿，点击发布后才写入 GitHub。</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-3 text-gray-500 hover:bg-white dark:hover:bg-gray-800" aria-label="关闭管理面板"><X /></button>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-lg font-bold dark:text-white">{draft.id ? '编辑网站' : '添加网站'}</h2>
              <form onSubmit={saveSite} className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-gray-600 dark:text-gray-300">名称<input required className={`${inputClass} mt-1`} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
                <label className="text-sm text-gray-600 dark:text-gray-300">地址<input required type="url" className={`${inputClass} mt-1`} value={draft.url} onChange={event => setDraft({ ...draft, url: event.target.value })} /></label>
                <label className="text-sm text-gray-600 dark:text-gray-300">分类<select required className={`${inputClass} mt-1`} value={draft.categoryId} onChange={event => setDraft({ ...draft, categoryId: event.target.value })}>{data.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label className="text-sm text-gray-600 dark:text-gray-300">标签<input className={`${inputClass} mt-1`} value={draft.tags} onChange={event => setDraft({ ...draft, tags: event.target.value })} placeholder="工具, 常用" /></label>
                <label className="text-sm text-gray-600 dark:text-gray-300 md:col-span-2">描述<input className={`${inputClass} mt-1`} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} /></label>
                <label className="text-sm text-gray-600 dark:text-gray-300">图标名称或 URL<input className={`${inputClass} mt-1`} value={draft.icon || ''} onChange={event => setDraft({ ...draft, icon: event.target.value })} /></label>
                <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={Boolean(draft.favorite)} onChange={event => setDraft({ ...draft, favorite: event.target.checked })} />加入收藏</label>
                <div className="flex gap-2 md:col-span-2">
                  <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Save size={16} />保存到草稿</button>
                  {draft.id && <button type="button" onClick={() => resetForm(draft.categoryId)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-gray-700">取消编辑</button>}
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold dark:text-white">网站列表</h2><span className="text-sm text-gray-500">{data.sites.length} 个网站</span></div>
              <p className="mb-3 text-xs text-gray-500">拖动左侧手柄调整全局展示顺序，也可以用键盘完成排序。</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderSites}>
                <SortableContext items={sortedSites.map(site => site.id)} strategy={verticalListSortingStrategy}>
                  <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">{sortedSites.map(site => <SortableSiteRow key={site.id} site={site} onEdit={editSite} onDelete={deleteSite} />)}</div>
                </SortableContext>
              </DndContext>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-lg font-bold dark:text-white">分类管理</h2>
              <div className="space-y-2">
                {[...data.categories].sort((a, b) => a.order - b.order).map(category => (
                  <div key={category.id} className="flex gap-2">
                    <input className={inputClass} defaultValue={category.name} onBlur={event => renameCategory(category.id, event.target.value)} />
                    <button onClick={() => deleteCategory(category.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950" aria-label={`删除 ${category.name}`}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              <form onSubmit={addCategory} className="mt-3 flex gap-2"><input className={inputClass} value={newCategoryName} onChange={event => setNewCategoryName(event.target.value)} placeholder="新分类名称" /><button className="rounded-lg bg-gray-900 p-2 text-white dark:bg-white dark:text-gray-900" aria-label="添加分类"><Plus size={18} /></button></form>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-bold dark:text-white"><Github size={20} />发布到 GitHub</h2>
              <p className="mb-4 text-xs leading-5 text-amber-700 dark:text-amber-300">Token 只保存在当前页面内存中。请使用仅允许此仓库 Contents 读写的 fine-grained Token。</p>
              <form onSubmit={publish} className="space-y-3">
                <label className="block text-sm text-gray-600 dark:text-gray-300">Personal Access Token<input type="password" autoComplete="off" className={`${inputClass} mt-1`} value={token} onChange={event => setToken(event.target.value)} /></label>
                <div className="grid grid-cols-2 gap-2"><label className="text-sm text-gray-600 dark:text-gray-300">Owner<input className={`${inputClass} mt-1`} value={repository.owner} onChange={event => setRepository({ ...repository, owner: event.target.value })} /></label><label className="text-sm text-gray-600 dark:text-gray-300">Repository<input className={`${inputClass} mt-1`} value={repository.repo} onChange={event => setRepository({ ...repository, repo: event.target.value })} /></label></div>
                <label className="block text-sm text-gray-600 dark:text-gray-300">Branch<input className={`${inputClass} mt-1`} value={repository.branch} onChange={event => setRepository({ ...repository, branch: event.target.value })} /></label>
                <label className="block text-sm text-gray-600 dark:text-gray-300">提交说明<input className={`${inputClass} mt-1`} value={commitMessage} onChange={event => setCommitMessage(event.target.value)} /></label>
                <button disabled={publishState.type === 'loading'} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"><Github size={17} />{publishState.type === 'loading' ? '发布中…' : '提交并部署'}</button>
              </form>
              {publishState.message && <div className={`mt-3 rounded-lg p-3 text-sm ${publishState.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'}`}>{publishState.message}{publishState.url && <a className="ml-2 inline-flex items-center gap-1 underline" href={publishState.url} target="_blank" rel="noreferrer">查看 commit <ExternalLink size={13} /></a>}</div>}
            </section>

            <section className="flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <button onClick={exportData} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"><Download size={16} />导出备份</button>
              <button onClick={() => { if (confirm('确定丢弃所有本地修改并恢复仓库内置数据吗？')) onReset(); }} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 dark:border-red-900"><RotateCcw size={16} />恢复默认</button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
