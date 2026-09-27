import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Briefcase, Maximize2, Pause, Play, Square, X } from 'lucide-react';
import type { Site } from '../types/navigation';
import { safeHttpUrl } from '../lib/navigationData';
import { acknowledgeWorkNotice, finishWork, loadWorkSession, pauseWork, readWorkSession, reconcileWork, remainingWorkMs, resumeWork, sameWorkSession, saveWorkSession, setWorkPreset, skipBreak, startNextPhase, workPhaseMinutes, WORK_SESSION_KEY, type WorkPhase, type WorkPreset, type WorkSessionStore } from '../lib/workSession';
import { armPomodoroSound, playPomodoroNotice } from '../lib/pomodoroSound';
import { usePomodoroAmbient } from '../lib/usePomodoroAmbient';
import { PomodoroAmbientControls } from './PomodoroAmbientControls';

const PomodoroImmersive = lazy(() => import('./PomodoroImmersive'));
const phaseNames: Record<WorkPhase, string> = { focus: '专注', 'short-break': '短休息', 'long-break': '长休息' };

interface Props {
  sites: Site[];
  onActiveChange: (active: boolean) => void;
  onPhaseChange?: (phase: WorkPhase) => void;
  onSelectionChange: (ids: string[]) => void;
  onSiteVisit: (id: string) => void;
  onClose: () => void;
}

export function WorkSessionPanel({ sites, onActiveChange, onPhaseChange, onSelectionChange, onSiteVisit, onClose }: Props) {
  const [store, setStore] = useState(loadWorkSession);
  const [now, setNow] = useState(Date.now);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recovery, setRecovery] = useState<WorkSessionStore | null>(null);
  const [immersive, setImmersive] = useState(false);
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
        if (result.store.notice && result.store.notice.id !== expected.notice?.id) void playPomodoroNotice(result.store.notice);
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
  const ambient = usePomodoroAmbient(store.ambientTrack, store.ambientVolume, (ambientTrack, ambientVolume) => change(latest => ({ ...latest, ambientTrack, ambientVolume })));
  useEffect(() => {
    const externalChange = (event: StorageEvent) => { if (event.key === WORK_SESSION_KEY || event.key === null) refreshFromStorage(); };
    window.addEventListener('storage', externalChange);
    return () => window.removeEventListener('storage', externalChange);
  }, [refreshFromStorage]);
  useEffect(() => { onActiveChange(Boolean(current)); onPhaseChange?.(current?.phase || store.nextPhase); onSelectionChange(current?.siteIds || []); }, [current, store.nextPhase, onActiveChange, onPhaseChange, onSelectionChange]);
  useEffect(() => {
    if (!current || current.deadline === null) return;
    const tick = () => {
      const time = Date.now(); setNow(time);
      const previous = storeRef.current;
      const next = reconcileWork(previous, time);
      if (next !== previous) change(() => next);
    };
    tick(); const timer = window.setInterval(tick, 1000);
    window.addEventListener('focus', tick); document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick); };
  }, [current?.id, current?.deadline, change]);
  const phase = current?.phase || store.nextPhase;
  const remaining = current ? Math.ceil(remainingWorkMs(current, now) / 1000) : workPhaseMinutes(store) * 60;
  const timeText = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  const primaryLabel = current ? (current.deadline === null ? '继续' : '暂停') : phase === 'focus' ? '开始专注' : '开始休息';
  const roundLabel = `已完成 ${store.completedCount} 轮 · ${phase === 'focus' ? `第 ${store.completedCount % 4 + 1}/4 轮` : '休息后继续'}`;
  const notice = store.notice ? (store.notice.phase === 'focus' ? `本轮专注完成，已记录。可以开始${phaseNames[store.nextPhase]}，也可以稍后再开始。` : '休息结束了。准备好后，再开始下一轮专注。') : undefined;
  const armSound = () => {
    if (storeRef.current.sound) void armPomodoroSound().then(ok => { if (!ok) setMessage('浏览器暂时无法播放提示音，到时仍会显示文字提示。'); });
  };
  const primary = () => {
    setMessage(''); armSound();
    change(latest => !latest.current ? startNextPhase(latest) : latest.current.deadline === null ? resumeWork(latest) : pauseWork(latest));
  };
  const setSound = (sound: boolean) => {
    change(latest => ({ ...latest, sound }));
    if (sound) armSound();
  };
  const finish = () => change(latest => finishWork(latest));
  return <section className="baize-panel space-y-4 rounded-2xl p-4 sm:p-5" aria-label="工作会话">
    <div className="flex items-center gap-2"><Briefcase size={18} /><h2 className="flex-1 font-bold">工作会话 · 番茄钟</h2><button type="button" className="baize-button-secondary text-xs" onClick={() => { armSound(); setImmersive(true); }}><Maximize2 size={15} />沉浸专注</button>{!current && <button type="button" className="baize-icon-button" disabled={!saved || saving} onClick={onClose} aria-label="收起工作会话"><X size={18} /></button>}</div>
    <div className="flex flex-wrap items-center gap-3">
      <label className="min-w-0 flex-1"><span className="sr-only">当前工作任务</span><input className="baize-input" maxLength={200} placeholder="这次要完成什么？" value={current?.task || store.task} disabled={Boolean(current)} onChange={event => { const task = event.target.value; change(latest => ({ ...latest, task })); }} /></label>
      <label><span className="sr-only">专注时长</span><select className="baize-input" disabled={Boolean(current)} value={store.preset} onChange={event => { const preset = event.target.value as WorkPreset; change(latest => setWorkPreset(latest, preset)); }}><option value="25/5">专注 25 / 休息 5 分钟</option><option value="50/10">专注 50 / 休息 10 分钟</option><option value="custom">自定义时长</option></select></label>
      <div className="text-center"><p className="text-xs">{phaseNames[phase]}{current?.deadline === null ? ' · 已暂停' : !current ? ' · 待开始' : ''}</p><output className="min-w-24 font-mono text-2xl tabular-nums" aria-label="剩余专注时间">{timeText}</output></div>
    </div>
    {store.preset === 'custom' && <fieldset className="flex flex-wrap gap-3" disabled={Boolean(current)}><legend className="sr-only">自定义番茄钟时长</legend>{([{ key: 'minutes', label: '专注分钟', max: 180 }, { key: 'shortBreakMinutes', label: '短休息分钟', max: 60 }, { key: 'longBreakMinutes', label: '长休息分钟', max: 120 }] as const).map(item => <label key={item.key} className="text-xs">{item.label}<input type="number" className="baize-input mt-1 w-24" min={1} max={item.max} value={store[item.key]} onChange={event => { const value = Number(event.target.value); if (Number.isInteger(value) && value >= 1 && value <= item.max) change(latest => ({ ...latest, [item.key]: value })); }} /></label>)}</fieldset>}
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span>{roundLabel} · 每 4 轮长休息 {store.longBreakMinutes} 分钟</span><label className="flex items-center gap-2"><input type="checkbox" checked={store.sound} onChange={event => setSound(event.target.checked)} />到时提示音</label></div>
    {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-[#b4c9bb] bg-[#e2ece2] p-3 text-sm text-[#345b51]"><span className="flex-1">{notice}</span><button type="button" aria-label="关闭到时提示" onClick={() => { const id = store.notice!.id; change(latest => acknowledgeWorkNotice(latest, id)); }}><X size={16} /></button></div>}
    {!current && <details><summary className="cursor-pointer text-sm">工作网站组合 · 已选 {chosenSites.length} 个</summary><div className="mt-3 grid max-h-52 gap-2 overflow-auto sm:grid-cols-2 lg:grid-cols-3">{sites.map(site => <label key={site.id} className="flex min-w-0 items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(site.id)} onChange={event => { const checked = event.target.checked; change(latest => ({ ...latest, siteIds: checked ? [...latest.siteIds, site.id] : latest.siteIds.filter(id => id !== site.id) })); }} /><span className="truncate">{site.name}</span></label>)}</div></details>}
    <div className="flex flex-wrap gap-2">
      <button type="button" className="baize-button-primary" onClick={primary}>{current && current.deadline !== null ? <Pause size={15} /> : <Play size={15} />}{primaryLabel}</button>
      {current && <button type="button" className="baize-button-secondary" onClick={finish}><Square size={14} />{phase === 'focus' ? '结束并记录' : '结束休息'}</button>}
      {!current && phase !== 'focus' && <button type="button" className="baize-button-secondary" onClick={() => change(skipBreak)}>跳过休息</button>}
      {chosenSites.length > 0 && <button type="button" className="baize-button-secondary" onClick={() => {
        chosenSites.forEach(site => { const url = safeHttpUrl(site.url); if (url) { const tab = window.open('about:blank', '_blank'); if (tab) { tab.opener = null; tab.location.href = url; onSiteVisit(site.id); } } });
        setMessage('已请求打开网站。浏览器可能拦截多个窗口，可使用下面的链接逐个打开。');
      }}>打开网站组合</button>}
    </div>
    {chosenSites.length > 0 && <div className="flex flex-wrap gap-2">{chosenSites.map(site => <a key={site.id} className="baize-chip" href={safeHttpUrl(site.url) || undefined} target="_blank" rel="noopener noreferrer" onClick={() => onSiteVisit(site.id)}>{site.name}</a>)}</div>}
    <PomodoroAmbientControls {...ambient} />
    <p className="text-xs text-[#718986]">背景声音与计时独立；暂停计时或退出沉浸不会停播，收起工作会话或离开此页面后停止。刷新只恢复音色和音量，不会自动播放。</p>
    <p className="text-xs text-[#718986]">会话期间隐藏热榜，首页只显示所选工作网站。退出沉浸不停止计时；刷新可恢复。每个阶段手动开始，关闭网页后不会响铃。</p>
    {!saved && <p role="alert" className="text-sm text-[#985247]">工作会话未能保存，本页内容已保留，请保持此页打开并重试。<button type="button" className="underline" disabled={saving} onClick={() => change(latest => latest)}>重试保存</button></p>}
    {recovery && <details><summary className="cursor-pointer text-xs">查看本页冲突前副本</summary><textarea readOnly aria-label="工作会话冲突前副本" className="baize-input mt-2 font-mono text-xs" rows={5} value={JSON.stringify(recovery, null, 2)} /></details>}
    {message && <p role="status" className="text-xs">{message}</p>}
    {store.history.length > 0 && <details><summary className="cursor-pointer text-sm">最近工作小结</summary><ul className="mt-2 space-y-2 text-xs">{store.history.slice(0, 10).map(item => <li key={item.id} className="flex flex-wrap justify-between gap-2"><span>{item.task}</span><span>{new Date(item.endedAt).toLocaleString('zh-CN')} · 专注 {Math.floor(item.focusedMs / 60_000)} 分 {Math.floor(item.focusedMs / 1000) % 60} 秒 · {item.completed ? '计时完成' : '提前结束'}</span></li>)}</ul></details>}
    {immersive && <Suspense fallback={<p role="status">正在打开沉浸画面…</p>}><PomodoroImmersive
      open task={current?.task || store.task} timeText={timeText}
      progress={current ? 1 - remainingWorkMs(current, now) / (current.minutes * 60_000) : 0}
      phaseLabel={phaseNames[phase]} roundLabel={roundLabel}
      active={Boolean(current)} running={Boolean(current && current.deadline !== null)}
      primaryLabel={primaryLabel} background={store.background} sound={store.sound} ambient={ambient}
      notice={[notice, !saved ? '本次更改尚未保存，请保持此页打开并返回卡片重试。' : '', message].filter(Boolean).join(' ') || undefined}
      sites={chosenSites} onClose={() => setImmersive(false)} onPrimary={primary} onFinish={finish}
      onSkipBreak={phase !== 'focus' ? () => change(skipBreak) : undefined}
      onBackgroundChange={background => change(latest => ({ ...latest, background }))}
      onSoundChange={setSound} onSiteVisit={onSiteVisit}
    /></Suspense>}
  </section>;
}
