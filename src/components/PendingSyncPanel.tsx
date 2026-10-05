import { useEffect, useMemo, useState } from 'react';
import { Cloud, CloudOff, X } from 'lucide-react';
import type { NavigationData } from '../types/navigation';
import type { InboxItem } from '../types/inbox';
import type { InboxSyncMeta } from '../types/inbox-sync';
import { countUnsyncedInboxItems, countUnsyncedStudyProgress } from '../services/inboxSync';
import { captureSharedWorkspace, workspaceFingerprint, WORKSPACE_EVENT } from '../services/workspaceSync';
import { loadStudyProgressStore } from '../services/techOsStudyProgress';
import { READING_EVENT } from '../services/readingHistory';
import { loadPublishBaseline, navigationChanges, PUBLISH_BASELINE_EVENT } from '../lib/pendingSync';
import { STORAGE_PERSISTENCE_EVENT } from '../lib/safeStorage';
import { readWorkingDraftSummary } from '../lib/workingDrafts';
import { BLOG_WORKSPACE_EVENT } from '../lib/blogWorkspace';
import { TECH_OS_DRAFT_EVENT } from '../services/techOsDraftStore';
import { DRAFT_DEPLOYMENT_EVENT } from '../lib/draftDeployment';
import { WorkingDraftBackupTools } from './WorkingDraftBackupTools';

interface Props {
  data: NavigationData; bundled: NavigationData; items: InboxItem[]; syncMeta: InboxSyncMeta | null;
  onPublish: () => void; onPrivateSync: () => void; onOpenBlog: () => void; onOpenTechOs: () => void;
}
const fieldNames: Record<string, string> = { name: '名称', url: '网址', description: '简介', tags: '标签', categoryId: '分类', icon: '图标', favorite: '收藏', order: '排序', x: '横坐标', y: '纵坐标', width: '宽度', height: '高度', size: '尺寸' };
export function PendingSyncPanel({ data, bundled, items, syncMeta, onPublish, onPrivateSync, onOpenBlog, onOpenTechOs }: Props) {
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [baseline, setBaseline] = useState(() => loadPublishBaseline(bundled));
  const [sharedChanged, setSharedChanged] = useState(false);
  const [studyCount, setStudyCount] = useState(0);
  const [error, setError] = useState('');
  const readDrafts = () => {
    try { return readWorkingDraftSummary(); }
    catch { return { items: [], issues: ['工作草稿存储无法读取，请在工作台检查。'] }; }
  };
  const [drafts, setDrafts] = useState(readDrafts);
  const pendingDrafts = drafts.items.filter(item => item.pending).length;
  useEffect(() => {
    const refresh = () => setDrafts(readDrafts());
    refresh();
    const events = ['storage', BLOG_WORKSPACE_EVENT, TECH_OS_DRAFT_EVENT, DRAFT_DEPLOYMENT_EVENT];
    events.forEach(event => window.addEventListener(event, refresh));
    return () => events.forEach(event => window.removeEventListener(event, refresh));
  }, [open]);
  const changes = useMemo(() => navigationChanges(baseline, data), [baseline, data]);
  const inboxPending = countUnsyncedInboxItems(items, syncMeta);
  const refreshShared = () => {
    try {
      setSharedChanged(workspaceFingerprint(captureSharedWorkspace()) !== syncMeta?.workspaceFingerprint);
      setStudyCount(countUnsyncedStudyProgress(loadStudyProgressStore(), syncMeta));
      setError('');
    } catch (reason) { setError((reason as Error).message); }
  };
  useEffect(() => {
    const network = () => setOnline(navigator.onLine);
    const baselineChanged = () => setBaseline(loadPublishBaseline(bundled));
    window.addEventListener('online', network); window.addEventListener('offline', network);
    window.addEventListener(PUBLISH_BASELINE_EVENT, baselineChanged);
    return () => { window.removeEventListener('online', network); window.removeEventListener('offline', network); window.removeEventListener(PUBLISH_BASELINE_EVENT, baselineChanged); };
  }, [bundled]);
  useEffect(() => {
    refreshShared();
    window.addEventListener(WORKSPACE_EVENT, refreshShared); window.addEventListener(READING_EVENT, refreshShared); window.addEventListener('storage', refreshShared); window.addEventListener(STORAGE_PERSISTENCE_EVENT, refreshShared);
    return () => { window.removeEventListener(WORKSPACE_EVENT, refreshShared); window.removeEventListener(READING_EVENT, refreshShared); window.removeEventListener('storage', refreshShared); window.removeEventListener(STORAGE_PERSISTENCE_EVENT, refreshShared); };
  }, [open, syncMeta, data, items]);
  return <>
    <button type="button" className="baize-button-secondary utility-launcher-button" aria-expanded={open} onClick={() => setOpen(value => !value)}>{online ? <Cloud size={17} /> : <CloudOff size={17} />}{online ? '待同步' : '离线草稿'}{(changes.length > 0 || inboxPending > 0 || sharedChanged || studyCount > 0 || pendingDrafts > 0 || drafts.issues.length > 0) && <span className="utility-launcher-badge">{changes.length + inboxPending + studyCount + Number(sharedChanged) + pendingDrafts + drafts.issues.length}</span>}</button>
    {open && <section className="baize-panel basis-full space-y-4 rounded-2xl p-4 sm:p-5" aria-label="离线待同步中心">
      <div className="flex items-center gap-2"><h2 className="flex-1 font-bold">离线与待同步</h2><span className="text-xs">{online ? '网络已连接' : '当前离线'}</span><button type="button" className="baize-icon-button" onClick={() => setOpen(false)} aria-label="收起待同步"><X size={18} /></button></div>
      <p className="text-xs leading-5">修改先保存在本机。联网后，公开导航通过管理页比较并发布，私人记录通过 Inbox 加密合并；输入凭据后才会提交。离线不影响本机编辑，首次使用需先在线加载新版页面。</p>
      <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-[#5f8f84]/20 p-3"><h3 className="font-semibold">导航 · {changes.length} 项待发布</h3><p className="my-2 text-xs">与本站构建版本或本机最近一次成功提交比较。</p><button type="button" className="baize-button-secondary" onClick={onPublish}>{online ? '比较远端并发布' : '继续编辑草稿'}</button><ul className="mt-3 max-h-64 space-y-2 overflow-auto text-xs">{changes.slice(0, 200).map(change => <li key={change.key}><span>{change.kind === 'added' ? '新增' : change.kind === 'removed' ? '删除' : '修改'} · {change.collection === 'layout' ? '布局 ' : change.collection === 'categories' ? '分类 ' : ''}{change.label}</span>{change.kind === 'modified' && <span className="text-[#718986]">：{change.fields.map(field => fieldNames[field] || field).join('、')}</span>}</li>)}</ul>{changes.length > 200 && <p className="text-xs">另有 {changes.length - 200} 项，完整内容见管理页。</p>}</div>
      <div className="rounded-xl border border-[#5f8f84]/20 p-3"><h3 className="font-semibold">私人数据</h3><ul className="my-3 space-y-2 text-sm"><li>Inbox：{inboxPending} 条未同步（包括删除记录）</li><li>学习打卡：{studyCount} 项未同步</li><li>设置、历史与阅读：{sharedChanged ? '有待同步变化' : '与上次同步一致'}</li></ul><p className="mb-3 text-xs">最后同步：{syncMeta?.lastSyncedAt ? new Date(syncMeta.lastSyncedAt).toLocaleString('zh-CN') : '尚未同步'}</p><button type="button" className="baize-button-secondary" onClick={onPrivateSync}>{online ? '打开加密同步' : '打开 Inbox'}</button></div></div>
      <section className="space-y-3 rounded-xl border appearance-border p-3" aria-label="工作草稿待提交清单">
        <div className="flex flex-wrap items-center gap-2"><h3 className="mr-auto font-semibold">博客与 Tech OS · {pendingDrafts} 项待提交</h3><button type="button" className="baize-button-secondary text-xs" onClick={onOpenBlog}>打开博客工作台</button><button type="button" className="baize-button-secondary text-xs" onClick={onOpenTechOs}>打开 Tech OS</button></div>
        <p className="text-xs leading-5 appearance-muted">自动保存到本机、提交到仓库、确认上线是三个不同状态。这里只显示已保存的副本；提交和部署仍在对应工作台确认。</p>
        {drafts.items.length ? <ul className="max-h-64 space-y-2 overflow-y-auto text-xs">{drafts.items.slice(0, 200).map(item => <li key={`${item.kind}:${item.id}`} className="flex flex-col gap-1 rounded-lg bg-[var(--app-soft)] p-2 sm:flex-row sm:items-center"><span className="min-w-0 flex-1 break-all">{item.kind === 'blog' ? '博客' : 'Tech OS'} · {item.label}</span><span className="shrink-0 appearance-muted">{item.state}</span></li>)}</ul> : <p className="text-xs appearance-muted">暂时没有已保存的工作草稿。</p>}
        {drafts.items.length > 200 && <p className="text-xs appearance-muted">其余 {drafts.items.length - 200} 项可在对应工作台查看。</p>}
        {drafts.issues.map((issue, index) => <p key={index} className="text-xs text-red-700 dark:text-red-300" role="alert">{issue}</p>)}
        <WorkingDraftBackupTools />
      </section>
      {error && <p role="alert" className="text-xs text-[#985247]">{error}</p>}
    </section>}
  </>;
}
