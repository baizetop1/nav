import { useEffect, useState } from 'react';
import { Activity, BookmarkPlus, Download, ExternalLink, FileUp, GitMerge, Github, Lock, Plus, RefreshCw, RotateCcw, Save, Upload, X } from 'lucide-react';
import { createBackup, restoreBackup } from '../lib/backup';
import type { ClickStatsStore } from '../lib/activityStats';
import { normalizeBookmarkUrl, parseHtmlImport, type BookmarkImportRecord } from '../lib/bookmarks';
import type { LinkHealthEntry } from '../lib/linkHealth';
import { decryptBackup, encryptBackup } from '../services/encryptedBackup';
import { dispatchLinkHealthCheck, getAuthenticatedUser, getEncryptedBackup, getLatestLinkHealthRun, getRemoteNavigationData, getWorkflowRun, normalizeGithubToken, publishNavigationData, saveEncryptedBackup, type WorkflowRun } from '../services/github';
import { NavigationOrganizer } from './NavigationOrganizer';
import { LinkHealthPanel } from './LinkHealthPanel';
import { StatsPanel } from './StatsPanel';
import type { NavigationData, Site } from '../types/navigation';

interface AdminPanelProps {
  data: NavigationData;
  initialSection: AdminSection;
  defaultRepository: { owner: string; repo: string; branch: string };
  linkHealthEntries: LinkHealthEntry[];
  isLinkHealthLoading: boolean;
  onRefreshLinkHealth: () => void | Promise<void>;
  onRunBrowserLinkHealthCheck: () => void | Promise<void>;
  clickStats: ClickStatsStore;
  onClearClickStats: () => void;
  onChange: (data: NavigationData) => void;
  onReset: () => void;
  onClose: () => void;
}

type SiteDraft = Omit<Site, 'id' | 'tags'> & { id?: string; tags: string };
export type AdminSection = 'content' | 'layout' | 'insights';

interface HtmlImportDraft extends BookmarkImportRecord {
  category: string;
  description: string;
  tags: string;
  duplicate: boolean;
  include: boolean;
}

interface HtmlImportPreview {
  mode: 'bookmark-export' | 'saved-page';
  records: HtmlImportDraft[];
  duplicateCount: number;
}

const inputClass = 'baize-input';
const panelClass = 'baize-panel rounded-2xl p-5';
const labelClass = 'text-sm font-medium text-[#526f6c] dark:text-[#b8c4c0]';

function createSiteDraft(categoryId: string): SiteDraft {
  return { name: '', url: '', description: '', categoryId, tags: '', favorite: false, icon: '' };
}

function slugify(value: string): string {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '');
  return slug || `item-${Date.now().toString(36)}`;
}

function validateSiteDraft(draft: SiteDraft): string | null {
  if (!draft.name.trim()) return '请填写网站名称。';
  if (!draft.categoryId.trim()) return '请选择网站分类。';
  try {
    const parsedUrl = new URL(draft.url.trim());
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error();
  } catch {
    return '请输入有效的 http 或 https 地址。';
  }
  return null;
}

function siteFromDraft(draft: SiteDraft, id: string): Site {
  return {
    id,
    name: draft.name.trim(),
    url: draft.url.trim(),
    description: draft.description.trim(),
    categoryId: draft.categoryId,
    tags: draft.tags.split(/[,，]/).map(tag => tag.trim()).filter(Boolean),
    favorite: Boolean(draft.favorite),
    ...(draft.icon?.trim() ? { icon: draft.icon.trim() } : {}),
  };
}

export function AdminPanel({ data, initialSection, defaultRepository, linkHealthEntries, isLinkHealthLoading, onRefreshLinkHealth, onRunBrowserLinkHealthCheck, clickStats, onClearClickStats, onChange, onReset, onClose }: AdminPanelProps) {
  const firstCategoryId = data.categories[0]?.id || '';
  const [draft, setDraft] = useState<SiteDraft>(() => createSiteDraft(firstCategoryId));
  const [newCategoryName, setNewCategoryName] = useState('');
  const [token, setToken] = useState('');
  const [verifiedUser, setVerifiedUser] = useState('');
  const [repository, setRepository] = useState(defaultRepository);
  const [commitMessage, setCommitMessage] = useState('Update navigation data from CMS');
  const [publishState, setPublishState] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string; url?: string }>({ type: 'idle' });
  const [remoteData, setRemoteData] = useState<NavigationData | null>(null);
  const [remoteState, setRemoteState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [publishedSha, setPublishedSha] = useState('');
  const [workflowRun, setWorkflowRun] = useState<WorkflowRun | null>(null);
  const [dataToolState, setDataToolState] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({ type: 'idle' });
  const [cloudBackupPassword, setCloudBackupPassword] = useState('');
  const [cloudBackupPasswordConfirm, setCloudBackupPasswordConfirm] = useState('');
  const [cloudBackupState, setCloudBackupState] = useState<{ busy: boolean; type: 'idle' | 'success' | 'error'; message?: string; url?: string }>({ busy: false, type: 'idle' });
  const [activeSection, setActiveSection] = useState<AdminSection>(initialSection);
  const [htmlImportPreview, setHtmlImportPreview] = useState<HtmlImportPreview | null>(null);
  const [linkCheckState, setLinkCheckState] = useState<'idle' | 'starting' | 'running' | 'success' | 'error'>('idle');
  const [linkCheckMessage, setLinkCheckMessage] = useState('');

  useEffect(() => setActiveSection(initialSection), [initialSection]);

  useEffect(() => {
    if (!publishedSha || !token.trim()) return;
    let disposed = false;
    let timer = 0;
    const poll = async () => {
      try {
        const run = await getWorkflowRun(repository, token.trim(), publishedSha);
        if (!disposed && run) {
          setWorkflowRun(run);
          if (run.status === 'completed') return;
        }
      } catch {
        // Publishing already succeeded; polling failures remain non-blocking.
      }
      if (!disposed) timer = window.setTimeout(poll, 5000);
    };
    void poll();
    return () => { disposed = true; window.clearTimeout(timer); };
  }, [publishedSha, repository, token]);

  const resetForm = (categoryId = firstCategoryId) => setDraft(createSiteDraft(categoryId));

  const editSite = (site: Site) => {
    setDraft({ ...site, tags: site.tags.join(', ') });
  };

  const saveSite = (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateSiteDraft(draft);
    if (validationError) {
      alert(validationError);
      return;
    }

    const baseId = draft.id || slugify(draft.name);
    let id = baseId;
    let suffix = 2;
    while (!draft.id && data.sites.some(site => site.id === id)) id = `${baseId}-${suffix++}`;

    const site = siteFromDraft(draft, id);

    const exists = data.sites.some(item => item.id === site.id);
    const sites = exists ? data.sites.map(item => item.id === site.id ? site : item) : [...data.sites, site];
    const layout = exists ? data.layout : [...data.layout, { siteId: site.id, order: data.layout.length + 1, size: 'normal' as const, width: 1 as const, height: 1 as const }];
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
    try {
      const backup = createBackup(data);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `baize-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setDataToolState({ type: 'success', message: '完整备份已导出，包含导航、90 天点击统计、翻译历史、临时文本与场景偏好。' });
    } catch (error) {
      setDataToolState({ type: 'error', message: error instanceof Error ? error.message : '备份导出失败。' });
    }
  };

  const importHtml = async (file: File) => {
    try {
      const result = parseHtmlImport(await file.text());
      if (!result.records.length) {
        if (result.mode === 'saved-page') throw new Error('这个 HTML 没有保留 canonical、og:url 等原网页地址信息。文件本身无法告诉浏览器它来自哪个网址，请在上方“添加网站”中粘贴该页面 URL。');
        throw new Error('书签导出文件中没有找到可导入的 HTTP/HTTPS 地址。');
      }

      const knownUrls = new Set(data.sites.map(site => normalizeBookmarkUrl(site.url)).filter((url): url is string => Boolean(url)));
      const seenUrls = new Set<string>();
      let duplicateCount = 0;
      const records = result.records.map(record => {
        const duplicate = knownUrls.has(record.url) || seenUrls.has(record.url);
        if (duplicate) duplicateCount += 1;
        seenUrls.add(record.url);
        return {
          ...record,
          category: record.category?.trim() || '导入书签',
          description: record.description?.trim() || (result.mode === 'bookmark-export' ? '从浏览器书签导入' : '从保存的 HTML 页面导入'),
          tags: '书签',
          duplicate,
          include: !duplicate,
        } satisfies HtmlImportDraft;
      });
      setHtmlImportPreview({ mode: result.mode, records, duplicateCount });
      setDataToolState({ type: 'success', message: `已读取 ${records.length} 个链接，请在下方确认名称、介绍和标签后再导入。` });
    } catch (error) {
      setDataToolState({ type: 'error', message: error instanceof Error ? error.message : '书签导入失败。' });
    }
  };

  const confirmHtmlImport = () => {
    if (!htmlImportPreview) return;
    const selected = htmlImportPreview.records.filter(record => record.include && !record.duplicate);
    if (!selected.length) {
      setDataToolState({ type: 'error', message: '请至少勾选一个要导入的链接。' });
      return;
    }

    const sites = [...data.sites];
    const categories = [...data.categories];
    const layout = [...data.layout];
    const knownUrls = new Set(sites.map(site => normalizeBookmarkUrl(site.url)).filter((url): url is string => Boolean(url)));
    const categoryByName = new Map(categories.map(category => [category.name.trim().toLocaleLowerCase(), category.id]));
    const usedCategoryIds = new Set(categories.map(category => category.id));
    const usedSiteIds = new Set(sites.map(site => site.id));
    let nextCategoryOrder = Math.max(0, ...categories.map(category => category.order));
    let nextOrder = Math.max(0, ...layout.map(item => item.order));
    let imported = 0;
    let skipped = 0;
    let createdCategories = 0;

    const uniqueId = (base: string, used: Set<string>) => {
      let id = base || `item-${Date.now().toString(36)}`;
      let suffix = 2;
      while (used.has(id)) id = `${base}-${suffix++}`;
      used.add(id);
      return id;
    };

    for (const record of selected) {
      const normalizedUrl = normalizeBookmarkUrl(record.url);
      if (!normalizedUrl || knownUrls.has(normalizedUrl)) {
        skipped += 1;
        continue;
      }
      const categoryName = record.category.trim() || '导入书签';
      const categoryKey = categoryName.toLocaleLowerCase();
      let categoryId = categoryByName.get(categoryKey);
      if (!categoryId) {
        categoryId = uniqueId(slugify(categoryName), usedCategoryIds);
        categories.push({ id: categoryId, name: categoryName, order: ++nextCategoryOrder });
        categoryByName.set(categoryKey, categoryId);
        createdCategories += 1;
      }
      const siteId = uniqueId(slugify(record.name), usedSiteIds);
      sites.push({
        id: siteId,
        name: record.name.trim() || new URL(normalizedUrl).hostname,
        url: normalizedUrl,
        description: record.description.trim(),
        categoryId,
        tags: record.tags.split(/[,，]/).map(tag => tag.trim()).filter(Boolean),
      });
      layout.push({ siteId, order: ++nextOrder, size: 'normal', width: 1, height: 1 });
      knownUrls.add(normalizedUrl);
      imported += 1;
    }

    onChange({ sites, categories, layout });
    setHtmlImportPreview(null);
    setDataToolState({
      type: 'success',
      message: `${htmlImportPreview.mode === 'bookmark-export' ? '浏览器书签文件' : 'HTML 页面'}：已导入 ${imported} 个链接${createdCategories ? `，新建 ${createdCategories} 个分类` : ''}${skipped ? `，跳过 ${skipped} 个重复地址` : ''}。`,
    });
  };

  const importBackup = async (file: File) => {
    if (!confirm('恢复完整备份会覆盖当前导航草稿、点击统计、翻译历史、临时文本和场景偏好，是否继续？')) return;
    try {
      const restored = restoreBackup(await file.text());
      localStorage.setItem('nav_cms_draft', JSON.stringify(restored));
      onChange(restored);
      setDataToolState({ type: 'success', message: '备份恢复成功，正在重新载入界面设置…' });
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setDataToolState({ type: 'error', message: error instanceof Error ? error.message : '备份恢复失败。' });
    }
  };

  const uploadEncryptedBackup = async () => {
    if (!token.trim()) {
      setCloudBackupState({ busy: false, type: 'error', message: '请先在“发布到 GitHub”区域输入 Token。' });
      return;
    }
    if (cloudBackupPassword !== cloudBackupPasswordConfirm) {
      setCloudBackupState({ busy: false, type: 'error', message: '两次输入的加密密码不一致。' });
      return;
    }
    setCloudBackupState({ busy: true, type: 'idle', message: '正在本地生成完整备份并加密…' });
    try {
      const encrypted = await encryptBackup(createBackup(data), cloudBackupPassword);
      const commitUrl = await saveEncryptedBackup(repository, token.trim(), encrypted);
      setCloudBackupPasswordConfirm('');
      setCloudBackupState({ busy: false, type: 'success', message: `加密云备份已更新：${new Date(encrypted.encryptedAt).toLocaleString()}`, url: commitUrl });
    } catch (error) {
      setCloudBackupState({ busy: false, type: 'error', message: error instanceof Error ? error.message : '加密云备份上传失败。' });
    }
  };

  const restoreEncryptedBackup = async () => {
    if (!token.trim()) {
      setCloudBackupState({ busy: false, type: 'error', message: '请先在“发布到 GitHub”区域输入 Token。' });
      return;
    }
    setCloudBackupState({ busy: true, type: 'idle', message: '正在读取远端密文并在本机解密…' });
    try {
      const remote = await getEncryptedBackup(repository, token.trim());
      if (!remote) throw new Error('GitHub 中还没有加密导航备份。');
      const backup = await decryptBackup(remote.payload, cloudBackupPassword);
      if (!confirm('已成功解密。继续会覆盖当前导航草稿、点击统计、翻译历史、临时文本和场景偏好，是否恢复？')) {
        setCloudBackupState({ busy: false, type: 'idle', message: '已取消恢复，当前数据没有变化。' });
        return;
      }
      const restored = restoreBackup(backup);
      localStorage.setItem('nav_cms_draft', JSON.stringify(restored));
      onChange(restored);
      setCloudBackupState({ busy: false, type: 'success', message: '加密云备份恢复成功，正在重新载入…' });
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setCloudBackupState({ busy: false, type: 'error', message: error instanceof Error ? error.message : '加密云备份恢复失败。' });
    }
  };

  const verifyToken = async () => {
    setPublishState({ type: 'loading', message: '正在验证 Token…' });
    try {
      const user = await getAuthenticatedUser(token);
      setVerifiedUser(user.login);
      setToken(normalizeGithubToken(token));
      setPublishState({ type: 'success', message: `Token 有效，当前账号：@${user.login}` });
    } catch (error) {
      setVerifiedUser('');
      setPublishState({ type: 'error', message: error instanceof Error ? error.message : 'Token 验证失败。' });
    }
  };

  const loadRemote = async () => {
    if (!token.trim()) {
      setPublishState({ type: 'error', message: '请先输入 GitHub Token。' });
      return;
    }
    setRemoteState('loading');
    try {
      setRemoteData(await getRemoteNavigationData(repository, token.trim()));
      setRemoteState('ready');
    } catch (error) {
      setRemoteState('error');
      setPublishState({ type: 'error', message: error instanceof Error ? error.message : '读取远端数据失败。' });
    }
  };

  const runLinkHealthCheck = async () => {
    if (!token.trim()) {
      setLinkCheckState('starting');
      setLinkCheckMessage('未填写 Token，先在当前浏览器逐个尝试访问网站…跨域站点只能确认是否可连接，无法读取 HTTP 状态。');
      try {
        await onRunBrowserLinkHealthCheck();
        setLinkCheckState('success');
        setLinkCheckMessage('浏览器检测完成。若要获得精确 HTTP 状态，请填写 Token 后再次点击“立即检测”，改由 GitHub Actions 在服务器端检查。');
      } catch (error) {
        setLinkCheckState('error');
        setLinkCheckMessage(error instanceof Error ? error.message : '浏览器链接检测失败。');
      }
      return;
    }

    const startedAt = Date.now();
    setLinkCheckState('starting');
    setLinkCheckMessage('正在请求 GitHub Actions 启动服务器端链接检测…');
    try {
      await dispatchLinkHealthCheck(repository, token.trim());
      setLinkCheckState('running');
      setLinkCheckMessage('检测任务已启动，正在等待 GitHub Actions 逐个访问网站（通常需要几十秒）。');

      let run: WorkflowRun | null = null;
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await new Promise<void>(resolve => window.setTimeout(resolve, attempt === 0 ? 2500 : 5000));
        run = await getLatestLinkHealthRun(repository, token.trim());
        const createdAt = run?.created_at ? Date.parse(run.created_at) : Number.NaN;
        if (run && (!Number.isFinite(createdAt) || createdAt >= startedAt - 10_000)) {
          break;
        }
        run = null;
      }

      if (!run) throw new Error('已启动检测，但暂时没有读到 Actions 任务。请稍后点击“读取报告”查看结果。');
      let latestRun: WorkflowRun = run;
      setWorkflowRun(latestRun);
      if (latestRun.status !== 'completed') {
        for (let attempt = 0; attempt < 36 && latestRun.status !== 'completed'; attempt += 1) {
          await new Promise<void>(resolve => window.setTimeout(resolve, 5000));
          const nextRun = await getLatestLinkHealthRun(repository, token.trim());
          if (!nextRun) continue;
          latestRun = nextRun;
          setWorkflowRun(latestRun);
        }
      }

      if (latestRun.status === 'completed') {
        await onRefreshLinkHealth();
        if (latestRun.conclusion === 'success') {
          setLinkCheckState('success');
          setLinkCheckMessage('检测完成，报告已刷新。请在下方“全部”中查看每个网站的 HTTP 状态。');
        } else {
          setLinkCheckState('error');
          setLinkCheckMessage(`检测任务已结束，但结果为 ${latestRun.conclusion || 'unknown'}。请打开 Actions 查看日志。`);
        }
      } else {
        setLinkCheckState('running');
        setLinkCheckMessage('检测仍在 GitHub Actions 中运行。稍后点击“读取报告”即可查看已生成结果。');
      }
    } catch (error) {
      setLinkCheckState('error');
      setLinkCheckMessage(error instanceof Error ? error.message : '启动链接检测失败。');
    }
  };

  const mergeRemote = () => {
    if (!remoteData) return;
    const mergeById = <T extends { id: string }>(remote: T[], local: T[]) => {
      const result = new Map(remote.map(item => [item.id, item]));
      local.forEach(item => result.set(item.id, item));
      return [...result.values()];
    };
    const layout = new Map(remoteData.layout.map(item => [item.siteId, item]));
    data.layout.forEach(item => layout.set(item.siteId, item));
    onChange({ sites: mergeById(remoteData.sites, data.sites), categories: mergeById(remoteData.categories, data.categories), layout: [...layout.values()] });
    setRemoteData(null);
    setRemoteState('idle');
  };

  const dataForPublish = (): NavigationData | null => {
    // The form is intentionally a separate draft. Flush an existing edit before
    // publishing so changing the URL and pressing “提交并部署” cannot publish stale data.
    const hasUnsubmittedInput = [draft.name, draft.url, draft.description, draft.tags, draft.icon || ''].some(value => value.trim());
    if (!draft.id && !hasUnsubmittedInput) {
      return data;
    }

    const validationError = validateSiteDraft(draft);
    if (validationError) {
      setPublishState({ type: 'error', message: `当前编辑尚未保存：${validationError}` });
      setActiveSection('content');
      return null;
    }

    const baseId = draft.id || slugify(draft.name);
    let id = baseId;
    let suffix = 2;
    while (!draft.id && data.sites.some(site => site.id === id)) id = `${baseId}-${suffix++}`;
    const site = siteFromDraft(draft, id);
    const exists = data.sites.some(item => item.id === site.id);
    return {
      ...data,
      sites: exists ? data.sites.map(item => item.id === site.id ? site : item) : [...data.sites, site],
      layout: exists ? data.layout : [...data.layout, { siteId: site.id, order: data.layout.length + 1, size: 'normal' as const, width: 1 as const, height: 1 as const }],
    };
  };

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token.trim()) {
      setPublishState({ type: 'error', message: '请输入 fine-grained Personal Access Token。' });
      return;
    }
    const publishData = dataForPublish();
    if (!publishData) return;
    const hasDraftEdit = Boolean(draft.id) || [draft.name, draft.url, draft.description, draft.tags, draft.icon || ''].some(value => value.trim());
    // Flush an unsaved form edit before the network request. This keeps the
    // visible state and local draft aligned even if the request takes a while,
    // and lets the success path safely clear the draft afterward.
    if (publishData !== data) onChange(publishData);
    setPublishState({ type: 'loading', message: '正在验证账号并创建提交…' });
    try {
      const user = await getAuthenticatedUser(token.trim());
      const result = await publishNavigationData(repository, publishData, token.trim(), commitMessage.trim() || undefined);
      setPublishState({ type: 'success', message: `已由 @${user.login} 提交，GitHub Actions 将开始部署。`, url: result.commitUrl });
      setPublishedSha(result.sha);
      setWorkflowRun(null);
      localStorage.removeItem('nav_cms_draft');
      if (hasDraftEdit) resetForm();
    } catch (error) {
      setPublishState({ type: 'error', message: error instanceof Error ? error.message : '发布失败，请检查 Token 和仓库设置。' });
    }
  };

  return (
    <div className="admin-shell fixed inset-0 z-[70] overflow-y-auto bg-[#dce6e1]/96 p-4 dark:bg-[#07191d]/97 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-[#4f8179] dark:text-[#c9a96b]">白泽导航 CMS</p>
            <h1 className="text-2xl font-bold text-[#173b41] dark:text-[#f4f1e8]">管理导航内容</h1>
            <p className="mt-1 text-sm text-[#64807c] dark:text-[#9fb2ad]">修改会自动保存为本地草稿，点击发布后才写入 GitHub。</p>
          </div>
          <button onClick={onClose} className="baize-icon-button p-3" aria-label="关闭管理面板"><X /></button>
        </header>

        <nav className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-white/70 bg-[#f4f1e8]/90 p-1.5 shadow-sm dark:border-[#c9a96b]/15 dark:bg-[#102c33]/92" aria-label="管理功能分区">
          {([
            ['content', '内容编辑', '网站表单和分类'],
            ['layout', '布局排序', '拖拽与网格尺寸'],
            ['insights', '统计与健康', '访问趋势和失效链接'],
          ] as const).map(([id, label, description]) => <button key={id} type="button" aria-current={activeSection === id ? 'page' : undefined} onClick={() => setActiveSection(id)} className={`min-w-fit flex-1 rounded-xl px-4 py-2 text-left transition ${activeSection === id ? 'bg-[#356b66] text-white shadow-sm dark:bg-[#c9a96b] dark:text-[#102c33]' : 'text-[#526f6c] hover:bg-[#5f8f84]/10 dark:text-[#b8c4c0] dark:hover:bg-[#c9a96b]/8'}`}><strong className="block text-sm">{label}</strong><span className="hidden text-[10px] opacity-75 sm:block">{description}</span></button>)}
        </nav>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
          <div className="space-y-6">
            {activeSection === 'content' && <section className={panelClass}>
              <h2 className="mb-4 text-lg font-bold text-[#234b4e] dark:text-[#f4f1e8]">{draft.id ? '编辑网站' : '添加网站'}</h2>
              <form onSubmit={saveSite} className="grid gap-4 md:grid-cols-2">
                <label className={labelClass}>名称<input required className={`${inputClass} mt-1`} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
                <label className={labelClass}>地址<input required type="url" className={`${inputClass} mt-1`} value={draft.url} onChange={event => setDraft({ ...draft, url: event.target.value })} /></label>
                <label className={labelClass}>分类<select required className={`${inputClass} mt-1`} value={draft.categoryId} onChange={event => setDraft({ ...draft, categoryId: event.target.value })}>{data.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label className={labelClass}>标签<input className={`${inputClass} mt-1`} value={draft.tags} onChange={event => setDraft({ ...draft, tags: event.target.value })} placeholder="工具, 常用" /></label>
                <label className={`${labelClass} md:col-span-2`}>描述<input className={`${inputClass} mt-1`} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} /></label>
                <label className={labelClass}>图标名称或 URL<input className={`${inputClass} mt-1`} value={draft.icon || ''} onChange={event => setDraft({ ...draft, icon: event.target.value })} /></label>
                <label className={`${labelClass} flex items-center gap-2 self-end pb-2`}><input type="checkbox" className="accent-[#4f8179]" checked={Boolean(draft.favorite)} onChange={event => setDraft({ ...draft, favorite: event.target.checked })} />加入收藏</label>
                <div className="flex gap-2 md:col-span-2">
                  <button className="baize-button-primary"><Save size={16} />保存到草稿</button>
                  {draft.id && <button type="button" onClick={() => resetForm(draft.categoryId)} className="baize-button-secondary">取消编辑</button>}
                </div>
              </form>
            </section>}

            {activeSection === 'layout' && <NavigationOrganizer data={data} onChange={onChange} onEdit={editSite} onDeleteSite={deleteSite} onRenameCategory={renameCategory} onDeleteCategory={deleteCategory} />}
            {activeSection === 'insights' && <><StatsPanel data={data} stats={clickStats} onClear={onClearClickStats} /><LinkHealthPanel sites={data.sites} entries={linkHealthEntries} loading={isLinkHealthLoading} onRefresh={onRefreshLinkHealth} onRunCheck={runLinkHealthCheck} checkState={linkCheckState} checkMessage={linkCheckMessage} /></>}
          </div>

          <div className="space-y-6">
            <section className={panelClass}>
              <h2 className="mb-4 text-lg font-bold text-[#234b4e] dark:text-[#f4f1e8]">新建分类</h2>
              <form onSubmit={addCategory} className="mt-3 flex gap-2"><input className={inputClass} value={newCategoryName} onChange={event => setNewCategoryName(event.target.value)} placeholder="新分类名称" /><button className="baize-button-primary px-3" aria-label="添加分类"><Plus size={18} /></button></form>
            </section>

            <section className={panelClass}>
              <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-[#234b4e] dark:text-[#f4f1e8]"><Github size={20} className="text-[#4f8179] dark:text-[#c9a96b]" />发布到 GitHub</h2>
              <p className="mb-4 rounded-xl border border-[#c9a96b]/25 bg-[#c9a96b]/8 p-3 text-xs leading-5 text-[#735f31] dark:text-[#dac58f]">Token 只保存在当前页面内存中。请使用仅允许此仓库 Contents 读写的 fine-grained Token。</p>
              <form onSubmit={publish} className="space-y-3">
                <label className={`${labelClass} block`}>Personal Access Token<input type="password" autoComplete="new-password" spellCheck={false} className={`${inputClass} mt-1 font-mono`} value={token} onChange={event => { setToken(event.target.value); setVerifiedUser(''); }} placeholder="github_pat_… 或 ghp_…" /></label>
                <button type="button" onClick={verifyToken} disabled={!token.trim() || publishState.type === 'loading'} className="baize-button-secondary w-full"><Github size={16} />{verifiedUser ? `已验证 @${verifiedUser}` : '先验证 Token'}</button>
                <div className="grid grid-cols-2 gap-2"><label className={labelClass}>Owner<input className={`${inputClass} mt-1`} value={repository.owner} onChange={event => setRepository({ ...repository, owner: event.target.value })} /></label><label className={labelClass}>Repository<input className={`${inputClass} mt-1`} value={repository.repo} onChange={event => setRepository({ ...repository, repo: event.target.value })} /></label></div>
                <label className={`${labelClass} block`}>Branch<input className={`${inputClass} mt-1`} value={repository.branch} onChange={event => setRepository({ ...repository, branch: event.target.value })} /></label>
                <label className={`${labelClass} block`}>提交说明<input className={`${inputClass} mt-1`} value={commitMessage} onChange={event => setCommitMessage(event.target.value)} /></label>
                <button disabled={publishState.type === 'loading'} className="baize-button-primary w-full py-2.5"><Github size={17} />{publishState.type === 'loading' ? '发布中…' : '提交并部署'}</button>
              </form>
              <button type="button" onClick={loadRemote} disabled={remoteState === 'loading'} className="baize-button-secondary mt-3 w-full"><RefreshCw size={16} className={remoteState === 'loading' ? 'animate-spin' : ''} />读取远端内容并比较</button>
              {remoteData && <div className="mt-3 rounded-xl border border-[#5f8f84]/20 bg-[#5f8f84]/8 p-3 text-sm text-[#315e5b] dark:text-[#c7d1cd]"><div className="flex items-center gap-2 font-semibold"><GitMerge size={16} />发现远端数据</div><p className="mt-1 text-xs">远端 {remoteData.categories.length} 个分类、{remoteData.sites.length} 个网站；本地 {data.categories.length} 个分类、{data.sites.length} 个网站。</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={mergeRemote} className="baize-button-primary px-3 py-1.5">合并，本地优先</button><button type="button" onClick={() => { onChange(remoteData); setRemoteData(null); setRemoteState('idle'); }} className="baize-button-secondary px-3 py-1.5">使用远端覆盖</button><button type="button" onClick={() => { setRemoteData(null); setRemoteState('idle'); }} className="baize-button-secondary px-3 py-1.5">取消</button></div></div>}
              {publishState.message && <div className={`mt-3 rounded-xl border p-3 text-sm ${publishState.type === 'error' ? 'border-[#a85d50]/25 bg-[#a85d50]/8 text-[#8f4b42] dark:text-[#e3a69a]' : 'border-[#5f8f84]/25 bg-[#5f8f84]/10 text-[#315e5b] dark:text-[#b8cec7]'}`}>{publishState.message}{publishState.url && <a className="ml-2 inline-flex items-center gap-1 underline" href={publishState.url} target="_blank" rel="noreferrer">查看 commit <ExternalLink size={13} /></a>}</div>}
              {publishedSha && <div className="mt-3 rounded-xl border border-[#c9a96b]/20 bg-[#c9a96b]/8 p-3 text-sm"><div className="flex items-center gap-2 font-semibold text-[#5d552f] dark:text-[#dccb9d]"><Activity size={16} className={workflowRun?.status !== 'completed' ? 'animate-pulse' : ''} />部署状态</div><p className="mt-1 text-xs text-[#718986]">{!workflowRun ? '等待 GitHub Actions 创建任务…' : workflowRun.status === 'completed' ? `已完成：${workflowRun.conclusion || 'unknown'}` : workflowRun.status === 'in_progress' ? '正在构建和部署…' : `状态：${workflowRun.status}`}</p>{workflowRun && <a href={workflowRun.html_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs underline">查看 Actions <ExternalLink size={12} /></a>}</div>}
            </section>

            <section className={panelClass}>
              <h2 className="text-lg font-bold text-[#234b4e] dark:text-[#f4f1e8]">导入、备份与恢复</h2>
              <p className="mb-2 mt-1 text-xs leading-5 text-[#718986]">自动识别 HTML 类型：Chrome、Edge 等浏览器导出的书签文件会批量导入；普通保存网页只读取页面自身保留的原地址，不会导入页面里的其他链接。</p>
              <p className="mb-4 text-xs leading-5 text-[#718986]">完整备份不会包含 GitHub Token 或加密密码；临时文本和翻译历史会按本机明文导出，请妥善保管备份文件。</p>
              <div className="flex flex-wrap gap-2">
                <label className="baize-button-secondary cursor-pointer">
                  <BookmarkPlus size={16} />导入 HTML
                  <input
                    type="file"
                    accept=".html,.htm,text/html"
                    className="hidden"
                    onChange={event => {
                      const file = event.target.files?.[0];
                      if (file) void importHtml(file);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
                <button type="button" onClick={exportData} className="baize-button-secondary"><Download size={16} />导出完整备份</button>
                <label className="baize-button-secondary cursor-pointer">
                  <FileUp size={16} />恢复完整备份
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={event => {
                      const file = event.target.files?.[0];
                      if (file) void importBackup(file);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
                <button type="button" onClick={() => { if (confirm('确定丢弃所有本地修改并恢复仓库内置数据吗？')) onReset(); }} className="baize-danger-button"><RotateCcw size={16} />恢复默认</button>
              </div>
              {dataToolState.message && <p className={`mt-3 rounded-xl border p-3 text-sm ${dataToolState.type === 'error' ? 'border-[#a85d50]/25 bg-[#a85d50]/8 text-[#8f4b42] dark:text-[#e3a69a]' : 'border-[#5f8f84]/25 bg-[#5f8f84]/10 text-[#315e5b] dark:text-[#b8cec7]'}`}>{dataToolState.message}</p>}
              {htmlImportPreview && <div className="mt-4 rounded-2xl border border-[#5f8f84]/20 bg-[#f4f1e8]/55 p-3 dark:border-[#c9a96b]/15 dark:bg-[#07191d]/35">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#315e5b] dark:text-[#d9ddd6]">导入前确认</h3>
                    <p className="mt-1 text-xs text-[#718986]">可逐条修改名称、介绍、标签和分类；重复地址默认不会导入。</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="baize-button-secondary px-2.5 py-1 text-xs" onClick={() => setHtmlImportPreview(current => current ? { ...current, records: current.records.map(record => ({ ...record, include: !record.duplicate })) } : current)}>全选非重复</button>
                    <button type="button" className="baize-icon-button p-1.5" aria-label="取消 HTML 导入" onClick={() => setHtmlImportPreview(null)}><X size={16} /></button>
                  </div>
                </div>
                <div className="mt-3 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
                  {htmlImportPreview.records.map((record, index) => <div key={`${record.url}-${index}`} className={`rounded-xl border p-3 ${record.duplicate ? 'border-[#a85d50]/20 bg-[#a85d50]/5' : 'border-[#5f8f84]/15 bg-white/35 dark:border-[#c9a96b]/10 dark:bg-[#07191d]/20'}`}>
                    <div className="mb-2 flex items-center gap-2">
                      <input type="checkbox" className="accent-[#4f8179]" checked={record.include} disabled={record.duplicate} onChange={event => setHtmlImportPreview(current => current ? { ...current, records: current.records.map((item, itemIndex) => itemIndex === index ? { ...item, include: event.target.checked } : item) } : current)} aria-label={`选择 ${record.name}`} />
                      <span className="min-w-0 flex-1 truncate text-xs text-[#718986]" title={record.url}>{record.url}</span>
                      {record.duplicate && <span className="shrink-0 text-[11px] text-[#985247]">重复地址</span>}
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <label className={labelClass}>名称<input className={`${inputClass} mt-1`} value={record.name} onChange={event => setHtmlImportPreview(current => current ? { ...current, records: current.records.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) } : current)} /></label>
                      <label className={labelClass}>分类<input className={`${inputClass} mt-1`} value={record.category} onChange={event => setHtmlImportPreview(current => current ? { ...current, records: current.records.map((item, itemIndex) => itemIndex === index ? { ...item, category: event.target.value } : item) } : current)} /></label>
                      <label className={`${labelClass} md:col-span-2`}>介绍<input className={`${inputClass} mt-1`} value={record.description} onChange={event => setHtmlImportPreview(current => current ? { ...current, records: current.records.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item) } : current)} placeholder="例如：前端文档、在线工具" /></label>
                      <label className={`${labelClass} md:col-span-2`}>标签<input className={`${inputClass} mt-1`} value={record.tags} onChange={event => setHtmlImportPreview(current => current ? { ...current, records: current.records.map((item, itemIndex) => itemIndex === index ? { ...item, tags: event.target.value } : item) } : current)} placeholder="书签, 常用" /></label>
                    </div>
                  </div>)}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-[#718986]">已选择 {htmlImportPreview.records.filter(record => record.include && !record.duplicate).length} / {htmlImportPreview.records.length} 条</span>
                  <button type="button" className="baize-button-primary" onClick={confirmHtmlImport}><BookmarkPlus size={16} />确认导入</button>
                </div>
              </div>}
              <div className="mt-4 rounded-xl border border-[#5f8f84]/15 bg-white/20 p-3 dark:border-[#c9a96b]/10 dark:bg-[#07191d]/20">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[#456b68] dark:text-[#d9ddd6]"><Lock size={16} />GitHub 加密云备份</h3>
                <p className="mb-3 mt-1 text-xs leading-5 text-[#718986]">使用上方仓库和 Token。完整备份只在本机加密，GitHub 中仅保存密文；密码无法找回，也不会保存在浏览器中。</p>
                <div className="space-y-2">
                  <input type="password" autoComplete="new-password" className={inputClass} value={cloudBackupPassword} onChange={event => setCloudBackupPassword(event.target.value)} placeholder="加密密码（至少 12 个字符）" />
                  <input type="password" autoComplete="new-password" className={inputClass} value={cloudBackupPasswordConfirm} onChange={event => setCloudBackupPasswordConfirm(event.target.value)} placeholder="再次输入密码（仅上传时需要）" />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button type="button" disabled={cloudBackupState.busy || !cloudBackupPassword} onClick={() => { void restoreEncryptedBackup(); }} className="baize-button-secondary"><Download size={16} />读取、解密并恢复</button>
                    <button type="button" disabled={cloudBackupState.busy || !cloudBackupPassword || !cloudBackupPasswordConfirm} onClick={() => { void uploadEncryptedBackup(); }} className="baize-button-primary"><Upload size={16} />加密并上传</button>
                  </div>
                </div>
                {cloudBackupState.message && <p className={`mt-3 break-all rounded-lg p-2 text-xs ${cloudBackupState.type === 'error' ? 'bg-[#a85d50]/10 text-[#985247] dark:text-[#e1a294]' : 'bg-[#5f8f84]/10 text-[#315e5b] dark:text-[#b8cec7]'}`}>{cloudBackupState.message}{cloudBackupState.url && <a href={cloudBackupState.url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 underline">查看 commit <ExternalLink size={12} /></a>}</p>}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
