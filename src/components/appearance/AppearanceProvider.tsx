import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, Palette, RotateCcw, X } from 'lucide-react';
import { APPEARANCE_THEMES, readAppearancePreference, resolveAppearanceTheme, resolveDailyTheme, saveAppearancePreference, type AppearanceMode, type AppearancePreference, type AppearanceThemeId } from '../../lib/appearance';

interface AppearanceContextValue {
  preference: AppearancePreference;
  resolvedId: AppearanceThemeId;
  openSettings: () => void;
}
const AppearanceContext = createContext<AppearanceContextValue | null>(null);
const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error('useAppearance must be used within AppearanceProvider');
  return context;
}

export function AppearanceButton({ compact = false }: { compact?: boolean }) {
  const { openSettings } = useAppearance();
  return <button type="button" className={compact ? 'baize-icon-button appearance-button' : 'baize-button-secondary appearance-button'} aria-label="打开外观设置" title="外观设置" onClick={openSettings}>
    <Palette size={18} aria-hidden="true" />{!compact && <span>外观</span>}
  </button>;
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  // Resolve once per app entry. Route changes, midnight, and visibility events do not alter it.
  const [state, setState] = useState(() => {
    const initial = readAppearancePreference();
    return {
      preference: initial.preference,
      resolvedId: resolveAppearanceTheme(initial.preference),
      storageWarning: initial.status === 'unavailable' ? '当前无法读取本地存储，外观仅在本次打开中生效。' : '',
      invalidRecord: initial.status === 'invalid',
    };
  });
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const panelRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const modeName = useId();
  const themeName = useId();
  const schemeName = useId();
  const openSettings = useCallback(() => setOpen(true), []);

  useLayoutEffect(() => {
    document.documentElement.dataset.appearance = state.resolvedId;
  }, [state.resolvedId]);

  useEffect(() => {
    const root = document.documentElement;
    const syncColorScheme = () => setIsDark(root.classList.contains('dark'));
    syncColorScheme();
    const observer = new MutationObserver(syncColorScheme);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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
    // Only the app is inert; the settings panel is portalled directly under body.
    appRoot?.setAttribute('inert', '');
    appRoot?.setAttribute('aria-hidden', 'true');
    panel.focus({ preventScroll: true });
    const focusable = () => {
      const visible = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
      return visible.filter(element => {
        if (!(element instanceof HTMLInputElement) || element.type !== 'radio' || !element.name) return true;
        const group = visible.filter((candidate): candidate is HTMLInputElement => candidate instanceof HTMLInputElement && candidate.type === 'radio' && candidate.name === element.name);
        return element === (group.find(candidate => candidate.checked) || group[0]);
      });
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
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

  const choose = (preference: AppearancePreference, resolvedId: AppearanceThemeId) => {
    const saved = saveAppearancePreference(preference);
    setState({ preference, resolvedId, storageWarning: saved.ok ? '' : saved.message, invalidRecord: false });
  };
  const chooseTheme = (themeId: AppearanceThemeId) => choose({ version: 1, mode: 'fixed', themeId }, themeId);
  const chooseMode = (mode: AppearanceMode) => {
    const themeId = mode === 'daily' ? resolveDailyTheme() : state.resolvedId;
    choose({ version: 1, mode, themeId }, themeId);
  };
  const retry = () => {
    const saved = saveAppearancePreference(state.preference);
    setState(current => ({ ...current, storageWarning: saved.ok ? '' : saved.message, invalidRecord: saved.ok ? false : current.invalidRecord }));
  };
  const value = useMemo(() => ({ preference: state.preference, resolvedId: state.resolvedId, openSettings }), [state.preference, state.resolvedId, openSettings]);
  const currentTheme = APPEARANCE_THEMES.find(theme => theme.id === state.resolvedId)!;

  return <AppearanceContext.Provider value={value}>
    {children}
    {open && typeof document !== 'undefined' && createPortal(<div className="appearance-overlay fixed inset-0 z-[240] flex items-center justify-center p-3 sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1} className="baize-panel appearance-dialog flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden outline-none">
        <header className="appearance-dialog-header flex shrink-0 items-start justify-between gap-4 px-4 py-4 sm:px-6">
          <div><h2 id={titleId} className="flex items-center gap-2 text-lg font-bold"><Palette size={21} aria-hidden="true" />外观设置</h2><p id={descriptionId} className="appearance-note mt-1 text-sm">四套全站风格，每套均支持明亮与深色模式。</p></div>
          <button type="button" className="baize-icon-button shrink-0" aria-label="关闭外观设置" onClick={() => setOpen(false)}><X size={20} aria-hidden="true" /></button>
        </header>
        <div className="appearance-dialog-body min-h-0 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <fieldset className="min-w-0"><legend className="mb-2 text-sm font-semibold">明暗外观</legend>
            <div className="appearance-mode-options grid grid-cols-2 gap-2">
              {([{ id: 'light', label: '明亮模式' }, { id: 'dark', label: '深色模式' }] as const).map(scheme => <label key={scheme.id} className="appearance-mode-option flex cursor-pointer items-center gap-2 rounded-xl p-3 text-sm" data-selected={isDark === (scheme.id === 'dark')}>
                <input type="radio" name={schemeName} value={scheme.id} checked={isDark === (scheme.id === 'dark')} aria-label={scheme.label} onChange={() => window.dispatchEvent(new CustomEvent('baize:appearance-color-scheme', { detail: scheme.id }))} />
                <span>{scheme.label}</span>
              </label>)}
            </div>
          </fieldset>
          <fieldset className="min-w-0"><legend className="mb-2 text-sm font-semibold">切换方式</legend>
            <div className="appearance-mode-options grid grid-cols-2 gap-2">
              {([{ id: 'fixed', label: '固定主题' }, { id: 'daily', label: '每日换一套' }] as const).map(mode => <label key={mode.id} className="appearance-mode-option flex cursor-pointer items-center gap-2 rounded-xl p-3 text-sm" data-selected={state.preference.mode === mode.id}>
                <input type="radio" name={modeName} value={mode.id} checked={state.preference.mode === mode.id} aria-label={mode.label} onChange={() => chooseMode(mode.id)} />
                <span>{mode.label}</span>
              </label>)}
            </div>
            <p className="appearance-note mt-2 text-xs leading-5">每日模式按本机日期轮换，仅在下次重新打开或刷新时更新；不会在午夜、切换页面或回到窗口时打断正在编辑的内容。现在开启会立即使用今天的主题。</p>
          </fieldset>
          <fieldset className="min-w-0"><legend className="mb-2 text-sm font-semibold">选择主题</legend>
            <div className="appearance-grid grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
              {APPEARANCE_THEMES.map(theme => <label key={theme.id} className="appearance-card relative min-w-0 cursor-pointer overflow-hidden rounded-2xl" data-selected={state.resolvedId === theme.id}>
                <input type="radio" className="appearance-theme-radio absolute left-3 top-3 z-10" name={themeName} value={theme.id} checked={state.resolvedId === theme.id} aria-label={theme.name} onChange={() => chooseTheme(theme.id)} onClick={() => { if (state.resolvedId === theme.id) chooseTheme(theme.id); }} />
                <span className={`appearance-preview appearance-preview-${theme.id}`} aria-hidden="true"><span className="appearance-preview-sidebar" /><span className="appearance-preview-lines"><span /><span /><span /></span><span className="appearance-preview-accent" /></span>
                <span className="appearance-card-copy block p-3"><span className="appearance-card-title flex items-center justify-between gap-2 text-sm font-semibold">{theme.name}{state.resolvedId === theme.id && <Check size={16} aria-hidden="true" />}</span><span className="appearance-card-description mt-1 block text-xs leading-5">{theme.description}</span></span>
              </label>)}
            </div>
            <p className="appearance-note mt-2 text-xs leading-5">点选任一主题会切换为固定主题。当前：{currentTheme.name} · {state.preference.mode === 'daily' ? '每日换一套' : '固定主题'}。</p>
          </fieldset>
          <p className="appearance-note text-xs leading-5">主题配色仅保存在此浏览器，不进入加密同步或备份。明暗外观与主题配色分别保存。外观不会修改导航、便签、文章或游戏数据。</p>
          {state.invalidRecord && <p className="appearance-note text-xs leading-5" role="status">原有外观记录无法识别，已临时使用山水清境；记录没有被覆盖，重新选择后才会保存。</p>}
          {state.storageWarning && <div className="appearance-storage-warning space-y-2 rounded-xl p-3" role="alert"><p className="text-sm leading-5">{state.storageWarning}当前选择已保留，可稍后重试保存。</p><button type="button" className="baize-button-secondary" onClick={retry}><RotateCcw size={15} aria-hidden="true" />重试保存</button></div>}
        </div>
      </section>
    </div>, document.body)}
  </AppearanceContext.Provider>;
}
