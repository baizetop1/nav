import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronDown, ExternalLink, Globe2, Pause, Play, SkipForward, Square, Volume2, VolumeX } from 'lucide-react';
import type { Site } from '../types/navigation';
import { safeHostname, safeHttpUrl } from '../lib/navigationData';
import './PomodoroImmersive.css';

export type PomodoroBackground = 'paper' | 'forest' | 'night' | 'landscape';
export interface PomodoroImmersiveProps {
  open: boolean;
  task: string;
  timeText: string;
  progress: number;
  phaseLabel: string;
  roundLabel: string;
  active: boolean;
  running: boolean;
  primaryLabel: string;
  background: PomodoroBackground;
  sound: boolean;
  notice?: string;
  sites: Site[];
  onClose: () => void;
  onPrimary: () => void;
  onFinish: () => void;
  onSkipBreak?: () => void;
  onBackgroundChange: (value: PomodoroBackground) => void;
  onSoundChange: (value: boolean) => void;
  onSiteVisit: (id: string) => void;
}

const BACKGROUNDS: Array<{ value: PomodoroBackground; label: string }> = [
  { value: 'paper', label: '纸白' }, { value: 'forest', label: '林间' },
  { value: 'night', label: '夜色' }, { value: 'landscape', label: '山水' },
];
const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const RADIUS = 94;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function PomodoroImmersive({ open, task, timeText, progress, phaseLabel, roundLabel, active, running, primaryLabel, background, sound, notice, sites, onClose, onPrimary, onFinish, onSkipBreak, onBackgroundChange, onSoundChange, onSiteVisit }: PomodoroImmersiveProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toolsHidden, setToolsHidden] = useState(false);
  const [backgroundFailed, setBackgroundFailed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId(), hintId = useId(), drawerId = useId();
  const boundedProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const isBreak = phaseLabel.includes('休息');
  const clockState = isBreak
    ? active && running ? '暂时放下工作，休息一下' : '休息也值得被认真对待'
    : active ? running ? '专注于当下这一刻' : '已暂停，按自己的节奏继续' : '准备好了，就开始吧';
  const links = useMemo(() => sites.map(site => ({ site, href: safeHttpUrl(site.url) })), [sites]);

  useEffect(() => { if (background === 'landscape') setBackgroundFailed(false); }, [background]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const appRoot = document.getElementById('root');
    const previousInert = appRoot?.getAttribute('inert') ?? null;
    const previousAriaHidden = appRoot?.getAttribute('aria-hidden') ?? null;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbarWidth}px`;
    // The dialog is portalled outside #root; only the background becomes inert.
    appRoot?.setAttribute('inert', '');
    appRoot?.setAttribute('aria-hidden', 'true');
    panel.focus({ preventScroll: true });
    const focusable = () => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(); return; }
      if (event.key !== 'Tab') return;
      const elements = focusable(), first = elements[0], last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); panel.focus(); return; }
      const focused = document.activeElement;
      if (event.shiftKey && (focused === first || focused === panel || !panel.contains(focused))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (focused === last || focused === panel || !panel.contains(focused))) { event.preventDefault(); first.focus(); }
    };
    const focusin = (event: FocusEvent) => { if (event.target instanceof Node && !panel.contains(event.target)) panel.focus({ preventScroll: true }); };
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('focusin', focusin);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('focusin', focusin);
      if (previousInert === null) appRoot?.removeAttribute('inert'); else appRoot?.setAttribute('inert', previousInert);
      if (previousAriaHidden === null) appRoot?.removeAttribute('aria-hidden'); else appRoot?.setAttribute('aria-hidden', previousAriaHidden);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let timer = 0;
    const wake = () => {
      window.clearTimeout(timer); setToolsHidden(false);
      if (!running || drawerOpen) return;
      timer = window.setTimeout(() => {
        const panel = panelRef.current, focused = document.activeElement;
        // A keyboard user must not lose a focused control, and an open website
        // drawer always stays available. The central timer never fades out.
        if (panel && focused instanceof HTMLElement && panel.contains(focused) && focused.matches(FOCUSABLE)) return;
        setToolsHidden(true);
      }, 4000);
    };
    wake();
    const events = ['pointermove', 'pointerdown', 'touchstart', 'keydown', 'focusin', 'focusout'] as const;
    for (const event of events) document.addEventListener(event, wake, { passive: true });
    return () => { window.clearTimeout(timer); for (const event of events) document.removeEventListener(event, wake); };
  }, [open, running, drawerOpen]);

  useEffect(() => { if (!open) { setDrawerOpen(false); setToolsHidden(false); } }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(<div ref={panelRef} className={`pomo-immersive pomo-theme-${background}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={hintId} tabIndex={-1} data-tools-hidden={toolsHidden}>
    <div className="pomo-backdrop" aria-hidden="true">
      {background === 'landscape' && !backgroundFailed && <img className="pomo-landscape" src={`${import.meta.env.BASE_URL}baize-background.webp`} alt="" onError={() => setBackgroundFailed(true)} />}
      {background === 'landscape' && <div className="pomo-landscape-veil" />}
    </div>
    <div className="pomo-shell">
      <header className="pomo-header pomo-auxiliary" data-hidden={toolsHidden}>
        <button type="button" className="pomo-button pomo-button-quiet" onClick={onClose}><ArrowLeft size={17} />退出沉浸</button>
        <p id={hintId} className="pomo-exit-hint">退出不会停止计时 <span aria-hidden="true">·</span> Esc</p>
      </header>

      <main className="pomo-center">
        <div className="pomo-phase"><span>{phaseLabel}</span><span className="pomo-phase-dot" aria-hidden="true" /><span>{roundLabel}</span></div>
        <h2 id={titleId} className="pomo-task">{task.trim() || '给此刻一点专注'}</h2>
        <div className="pomo-clock" role="timer" aria-label={`${phaseLabel}，剩余 ${timeText}`} aria-live="off">
          <svg className="pomo-ring" viewBox="0 0 200 200" aria-hidden="true">
            <circle className="pomo-ring-track" cx="100" cy="100" r={RADIUS} />
            <circle className="pomo-ring-progress" cx="100" cy="100" r={RADIUS} strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - boundedProgress)} />
          </svg>
          <div className="pomo-clock-copy"><span className={`pomo-time${timeText.length > 5 ? ' pomo-time-long' : ''}`}>{timeText}</span><span className="pomo-clock-state">{clockState}</span></div>
        </div>
        <div className="pomo-main-actions">
          <button type="button" className="pomo-button pomo-button-primary" onClick={onPrimary}>{running ? <Pause size={18} /> : <Play size={18} />}{primaryLabel}</button>
          {active && <button type="button" className="pomo-button pomo-button-secondary" onClick={onFinish}><Square size={15} />结束本段</button>}
          {onSkipBreak && <button type="button" className="pomo-button pomo-button-quiet" onClick={onSkipBreak}><SkipForward size={17} />跳过休息</button>}
        </div>
        {notice && <p className="pomo-notice" role="status">{notice}</p>}
      </main>

      <footer className="pomo-footer pomo-auxiliary" data-hidden={toolsHidden}>
        <div className="pomo-footer-row">
          <fieldset className="pomo-backgrounds"><legend className="pomo-sr-only">沉浸背景</legend>{BACKGROUNDS.map(option => <button key={option.value} type="button" className={`pomo-background-option ${background === option.value ? 'is-selected' : ''}`} aria-pressed={background === option.value} aria-label={`切换${option.label}背景`} onClick={() => onBackgroundChange(option.value)}><span className={`pomo-background-dot pomo-dot-${option.value}`} aria-hidden="true" /><span>{option.label}</span></button>)}</fieldset>
          <div className="pomo-footer-actions">
            <button type="button" className="pomo-button pomo-button-quiet" aria-pressed={sound} aria-label={sound ? '关闭完成提醒声音' : '开启完成提醒声音'} onClick={() => onSoundChange(!sound)}>{sound ? <Volume2 size={17} /> : <VolumeX size={17} />}<span>声音{sound ? '开' : '关'}</span></button>
            <button type="button" className="pomo-button pomo-button-quiet" aria-expanded={drawerOpen} aria-controls={drawerId} onClick={() => setDrawerOpen(value => !value)}><Globe2 size={17} /><span>工作网站 {sites.length}</span><ChevronDown size={15} className={drawerOpen ? 'pomo-chevron-open' : ''} /></button>
          </div>
        </div>
        {backgroundFailed && background === 'landscape' && <p className="pomo-background-fallback">山水背景暂不可用，已使用纯色背景。</p>}
        {drawerOpen && <section id={drawerId} className="pomo-sites" aria-label="本次工作网站">
          <div className="pomo-sites-heading"><h3>本次工作网站</h3><p>按需打开，不会自动启动网站</p></div>
          {links.length ? <ul className="pomo-sites-list">{links.map(({ site, href }) => <li key={site.id}>{href ? <a className="pomo-site" href={href} target="_blank" rel="noopener noreferrer" onClick={() => onSiteVisit(site.id)} onAuxClick={event => { if (event.button === 1) onSiteVisit(site.id); }}><span className="pomo-site-avatar" aria-hidden="true">{site.name.slice(0, 1).toUpperCase() || '↗'}</span><span className="pomo-site-copy"><strong>{site.name}</strong><span>{safeHostname(href)}</span></span><ExternalLink size={14} aria-hidden="true" /></a> : <span className="pomo-site pomo-site-unavailable" aria-disabled="true"><span className="pomo-site-copy"><strong>{site.name}</strong><span>网址无效，无法打开</span></span></span>}</li>)}</ul> : <p className="pomo-sites-empty">还没有指定网站。可退出沉浸后，在工作会话中选择。</p>}
        </section>}
      </footer>
    </div>
  </div>, document.body);
}

export default PomodoroImmersive;
