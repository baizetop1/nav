import { useCallback, useEffect, useRef, useState } from 'react';
import { Briefcase, Pause, Play, Square, X } from 'lucide-react';
import type { Site } from '../types/navigation';
import { safeHttpUrl } from '../lib/navigationData';
import { finishWork, loadWorkSession, pauseWork, readWorkSession, reconcileWork, remainingWorkMs, resumeWork, sameWorkSession, saveWorkSession, startWork, WORK_SESSION_KEY, type WorkSessionStore } from '../lib/workSession';

interface Props {
  sites: Site[];
  onActiveChange: (active: boolean) => void;
  onSelectionChange: (ids: string[]) => void;
  onSiteVisit: (id: string) => void;
  onClose: () => void;
}

export function WorkSessionPanel({ sites, onActiveChange, onSelectionChange, onSiteVisit, onClose }: Props) {
  const [store, setStore] = useState(loadWorkSession);
  const [now, setNow] = useState(Date.now);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recovery, setRecovery] = useState<WorkSessionStore | null>(null);
  const storeRef = useRef(store);
  const baselineRef = useRef(store);
  const generationRef = useRef(0);
  const busyRef = useRef(false);
  const pendingRef = useRef(false);
  const externalUpdateRef = useRef(false);
  const current = store.current;
  const selected = current?.siteIds || store.siteIds;
  const chosenSites = sites.filter(site => selected.includes(site.id));
  const adoptLatest = useCallback((latest: WorkSessionStore) => {
    if (!sameWorkSession(storeRef.current, baselineRef.current) && !sameWorkSession(storeRef.current, latest)) setRecovery(storeRef.current);
    baselineRef.current = latest; storeRef.current = latest; generationRef.current += 1; pendingRef.current = false;
    setStore(latest); setSaved(true); setNow(Date.now());
    setMessage('另一标签页已更新工作会话，已采用最新状态。请检查后再继续操作。');
  }, []);
  const refreshFromStorage = useCallback(() => {
    if (busyRef.current) { externalUpdateRef.current = true; return; }
    try {
      const latest = readWorkSession();
      if (!sameWorkSession(latest, baselineRef.current)) adoptLatest(latest);
    } catch (error) { setMessage(`无法读取另一标签页的工作会话：${(error as Error).message}`); }
  }, [adoptLatest]);
  const flushChanges = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true; setSaving(true);
    try {
      while (pendingRef.current) {
        pendingRef.current = false;
        const next = storeRef.current, expected = baselineRef.current, generation = generationRef.current;
        const result = await saveWorkSession(expected, next);
        if (result.status === 'conflict') { adoptLatest(result.store); break; }
        if (result.status === 'error') {
          // The newest local edits remain in memory; retry still uses the last
          // persisted baseline and cannot overwrite changes from another tab.
          pendingRef.current = false; setSaved(false); setMessage(result.message); break;
        }
        baselineRef.current = result.store;
        if (generationRef.current === generation) { storeRef.current = result.store; setStore(result.store); }
        setSaved(true);
      }
    } finally {
      busyRef.current = false; setSaving(false);
      if (externalUpdateRef.current) { externalUpdateRef.current = false; refreshFromStorage(); }
    }
  }, [adoptLatest, refreshFromStorage]);
  const change = useCallback((update: (current: WorkSessionStore) => WorkSessionStore) => {
    try {
      const next = update(storeRef.current);
      storeRef.current = next; generationRef.current += 1; pendingRef.current = true;
      setStore(next); setNow(Date.now());
      void flushChanges();
    } catch (error) { setMessage((error as Error).message); }
  }, [flushChanges]);
  useEffect(() => {
    const externalChange = (event: StorageEvent) => { if (event.key === WORK_SESSION_KEY || event.key === null) refreshFromStorage(); };
    window.addEventListener('storage', externalChange);
    return () => window.removeEventListener('storage', externalChange);
  }, [refreshFromStorage]);
  useEffect(() => { onActiveChange(Boolean(current)); onSelectionChange(current?.siteIds || []); }, [current, onActiveChange, onSelectionChange]);
  useEffect(() => {
    if (!current || current.deadline === null) return;
    const tick = () => {
      const time = Date.now(); setNow(time);
      const previous = storeRef.current;
      const next = reconcileWork(previous, time);
      if (next !== previous) change(() => next);
    };
    tick(); const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [current?.id, current?.deadline, change]);
  const remaining = current ? Math.ceil(remainingWorkMs(current, now) / 1000) : store.minutes * 60;
  return <section className="baize-panel space-y-4 rounded-2xl p-4 sm:p-5" aria-label="工作会话">
    <div className="flex items-center gap-2"><Briefcase size={18} /><h2 className="flex-1 font-bold">工作会话</h2>{!current && <button type="button" className="baize-icon-button" disabled={!saved || saving} onClick={onClose} aria-label="收起工作会话"><X size={18} /></button>}</div>
    <div className="flex flex-wrap items-center gap-3">
      <label className="min-w-0 flex-1"><span className="sr-only">当前工作任务</span><input className="baize-input" maxLength={200} placeholder="这次要完成什么？" value={current?.task || store.task} disabled={Boolean(current)} onChange={event => { const task = event.target.value; change(latest => ({ ...latest, task })); }} /></label>
      <label><span className="sr-only">专注时长</span><select className="baize-input" disabled={Boolean(current)} value={store.minutes} onChange={event => { const minutes = Number(event.target.value) as 25 | 50; change(latest => ({ ...latest, minutes })); }}><option value={25}>25 分钟</option><option value={50}>50 分钟</option></select></label>
      <output className="min-w-24 text-center font-mono text-2xl tabular-nums" aria-label="剩余专注时间">{String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}</output>
    </div>
    {!current && <details><summary className="cursor-pointer text-sm">工作网站组合 · 已选 {chosenSites.length} 个</summary><div className="mt-3 grid max-h-52 gap-2 overflow-auto sm:grid-cols-2 lg:grid-cols-3">{sites.map(site => <label key={site.id} className="flex min-w-0 items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(site.id)} onChange={event => { const checked = event.target.checked; change(latest => ({ ...latest, siteIds: checked ? [...latest.siteIds, site.id] : latest.siteIds.filter(id => id !== site.id) })); }} /><span className="truncate">{site.name}</span></label>)}</div></details>}
    <div className="flex flex-wrap gap-2">
      {!current ? <button type="button" className="baize-button-primary" onClick={() => { setMessage(''); change(latest => startWork(latest)); }}><Play size={15} />开始专注</button> : <>
        <button type="button" className="baize-button-primary" onClick={() => change(latest => latest.current?.deadline === null ? resumeWork(latest) : pauseWork(latest))}>{current.deadline === null ? <Play size={15} /> : <Pause size={15} />}{current.deadline === null ? '继续' : '暂停'}</button>
        <button type="button" className="baize-button-secondary" onClick={() => change(latest => finishWork(latest))}><Square size={14} />结束并记录</button>
      </>}
      {chosenSites.length > 0 && <button type="button" className="baize-button-secondary" onClick={() => {
        chosenSites.forEach(site => { const url = safeHttpUrl(site.url); if (url) { const tab = window.open('about:blank', '_blank'); if (tab) { tab.opener = null; tab.location.href = url; onSiteVisit(site.id); } } });
        setMessage('已请求打开网站。浏览器可能拦截多个窗口，可使用下面的链接逐个打开。');
      }}>打开网站组合</button>}
    </div>
    {chosenSites.length > 0 && <div className="flex flex-wrap gap-2">{chosenSites.map(site => <a key={site.id} className="baize-chip" href={safeHttpUrl(site.url) || undefined} target="_blank" rel="noopener noreferrer" onClick={() => onSiteVisit(site.id)}>{site.name}</a>)}</div>}
    <p className="text-xs text-[#718986]">专注期间隐藏热榜；选择网站组合后，首页只显示所选网站。暂停时间不计入专注，刷新后可继续。</p>
    {!saved && <p role="alert" className="text-sm text-[#985247]">工作会话未能保存，本页内容已保留，请保持此页打开并重试。<button type="button" className="underline" disabled={saving} onClick={() => change(latest => latest)}>重试保存</button></p>}
    {recovery && <details><summary className="cursor-pointer text-xs">查看本页冲突前副本</summary><textarea readOnly aria-label="工作会话冲突前副本" className="baize-input mt-2 font-mono text-xs" rows={5} value={JSON.stringify(recovery, null, 2)} /></details>}
    {message && <p role="status" className="text-xs">{message}</p>}
    {store.history.length > 0 && <details><summary className="cursor-pointer text-sm">最近工作小结</summary><ul className="mt-2 space-y-2 text-xs">{store.history.slice(0, 10).map(item => <li key={item.id} className="flex flex-wrap justify-between gap-2"><span>{item.task}</span><span>{new Date(item.endedAt).toLocaleString('zh-CN')} · 专注 {Math.floor(item.focusedMs / 60_000)} 分 {Math.floor(item.focusedMs / 1000) % 60} 秒 · {item.completed ? '计时完成' : '提前结束'}</span></li>)}</ul></details>}
  </section>;
}
