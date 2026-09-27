import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import Fuse from 'fuse.js';
import { AlertTriangle, ArrowLeftRight, BrainCircuit, Check, ChevronUp, Coffee, Command, Copy, Download, ExternalLink, FileText, Inbox as InboxIcon, Languages, Lock, Menu, Network, Plus, QrCode, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react';
import type { AdminSection } from './components/AdminPanel';
import { Card } from './components/Card';
import { SearchEngineIcon } from './components/SearchEngineIcon';
import type { CommandPaletteAction } from './components/CommandPalette';
import { HotFeedPanel } from './components/HotFeedPanel';
import { RestOverlay } from './components/rest/RestOverlay';
import type { TextIndex } from './types/text-network';
const TextGraphPanel = lazy(() => import('./components/TextGraphPanel').then(module => ({ default: module.TextGraphPanel })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(module => ({ default: module.AdminPanel })));
import { Sidebar } from './components/Sidebar';
import { AppearanceButton, useAppearance } from './components/appearance/AppearanceProvider';
const CommandPalette = lazy(() => import('./components/CommandPalette').then(module => ({ default: module.CommandPalette })));
const ReadingPanel = lazy(() => import('./components/ReadingPanel').then(module => ({ default: module.ReadingPanel })));
const InboxPanel = lazy(() => import('./components/inbox/InboxPanel').then(module => ({ default: module.InboxPanel })));
const QrCodeModal = lazy(() => import('./components/QrCodeModal').then(module => ({ default: module.QrCodeModal })));
const TempTextQrModal = lazy(() => import('./components/TempTextTransferModals').then(module => ({ default: module.TempTextQrModal })));
const TextTransferReceiveModal = lazy(() => import('./components/TempTextTransferModals').then(module => ({ default: module.TextTransferReceiveModal })));
import { TemporaryVisitsPanel } from './components/TemporaryVisitsPanel';
import { TranslationHistoryPanel } from './components/TranslationHistoryPanel';
import { defaultNavigationData, searchEngines, siteConfig } from './data';
import { CLICK_STATS_KEY, getTodayClicks, loadClickStats, localDateKey, recordSiteVisit, type ClickStatsStore } from './lib/activityStats';
import { checkLinksFromBrowser, loadLinkHealthReport, type LinkHealthEntry } from './lib/linkHealth';
import { parseNavigationData } from './lib/navigationData.ts';
import { getTemporaryVisitSummaries, loadTemporaryVisits, normalizeTemporaryUrl, pruneTemporaryVisits, recordTemporaryVisit, removeTemporaryVisit, TEMPORARY_VISITS_KEY, temporaryUrlKey, type TemporaryVisitsStore } from './lib/temporaryVisits';
import { addTranslationHistory, loadTranslationHistory, TRANSLATION_HISTORY_KEY, type TranslationHistoryItem } from './lib/translationHistory';
import { parseTextTransferHash } from './lib/textTransfer';
import { createInboxBlogDraft, type BlogDraftInput } from './services/blogDraft';
import { decryptNote, encryptNote } from './services/encryptedNote';
import { getEncryptedNote, saveEncryptedNote } from './services/github';
import { getStoragePersistenceSnapshot, NAVIGATION_DRAFT_RECOVERY_KEY, retryPendingLocalStorageWrites, safeGetLocalStorageItem, safeRemoveLocalStorageItem, safeSetLocalStorageItem, SHARED_SYNC_ENTRY_MAX_BYTES, STORAGE_PERSISTENCE_EVENT } from './lib/safeStorage';
import { createInboxItem, loadInbox, normalizeInboxDraft, saveInbox, setInboxItemStatus, softDeleteInboxItem, updateInboxItem } from './services/inbox';
import { createInboxSyncMeta, loadInboxSyncMeta, mergeInboxItems, restoreInboxFromCloud, saveInboxSyncMeta, synchronizeInbox } from './services/inboxSync';
import { loadStudyProgressStore, mergeStudyProgressStores, saveStudyProgressStore } from './services/techOsStudyProgress';
import { loadCachedTextIndex, loadTextIndex } from './services/textNetwork';
import type { InboxDraft, InboxItem, InboxItemStatus } from './types/inbox';
import type { InboxSyncUiState } from './types/inbox-sync';
import type { NavigationData, Site } from './types/navigation';
import { loadSceneMode, SCENE_MODE_KEY, type SceneMode } from './types/scene';
import type { TextNode } from './types/text-network';
import { applySharedWorkspace, captureSharedWorkspace, configureSharedDefaults, mergeSharedWorkspace, WORKSPACE_EVENT } from './services/workspaceSync';
import { parseIncomingShare } from './lib/shareCapture';
import { loadWorkSession, type WorkPhase } from './lib/workSession';
import { markNavigationPublished } from './lib/pendingSync';
import { activateAppUpdate } from './services/pwaUpdate';
import { publishRssConfiguration } from './services/rssPublish';
const RssPanel = lazy(() => import('./components/RssPanel').then(module => ({ default: module.RssPanel })));
const ShareCapturePanel = lazy(() => import('./components/ShareCapturePanel').then(module => ({ default: module.ShareCapturePanel })));
const WorkSessionPanel = lazy(() => import('./components/WorkSessionPanel').then(module => ({ default: module.WorkSessionPanel })));
const PendingSyncPanel = lazy(() => import('./components/PendingSyncPanel').then(module => ({ default: module.PendingSyncPanel })));
const BlogWorkbench = lazy(() => import('./components/blog/BlogWorkbench').then(module => ({ default: module.BlogWorkbench })));

const DRAFT_KEY = 'nav_cms_draft';
const TEMP_TEXT_KEY = 'nav_temp_text';
const TRANSLATOR_COLLAPSED_KEY = 'nav_translator_collapsed';
let navigationDraftWriteBlocked = false;
let navigationDraftRecoveryAvailable = false;
configureSharedDefaults({ nav_cms_draft: JSON.stringify(defaultNavigationData), scene_mode: 'default', work_mode: 'false', theme: 'light', nav_temp_text: '', nav_translator_collapsed: 'false', nav_translation_history: '[]', nav_click_stats_v2: JSON.stringify({ version: 2, days: {} }), nav_temporary_url_visits_v1: JSON.stringify({ version: 1, records: [] }) });
const sharedStorageOptions = (label: string, important = true) => ({
  label,
  important,
  maxBytes: SHARED_SYNC_ENTRY_MAX_BYTES,
});
const TRANSLATION_LANGUAGES = [
  ['zh-CN', '简体中文'], ['en', '英语'], ['ja', '日语'], ['ko', '韩语'],
  ['fr', '法语'], ['de', '德语'], ['es', '西班牙语'], ['ru', '俄语'],
] as const;

const TechOsWorkspace = lazy(() => import('./components/tech-os/TechOsWorkspace').then(module => ({ default: module.TechOsWorkspace })));

function translationLanguageName(code: string): string {
  return TRANSLATION_LANGUAGES.find(([value]) => value === code)?.[1] || code;
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function loadInitialData(): NavigationData {
  const savedDraft = safeGetLocalStorageItem(DRAFT_KEY, { label: '导航草稿' });
  if (!savedDraft) {
    navigationDraftWriteBlocked = false;
    navigationDraftRecoveryAvailable = false;
    return defaultNavigationData;
  }
  try {
    const parsed = parseNavigationData(JSON.parse(savedDraft) as unknown);
    navigationDraftWriteBlocked = false;
    navigationDraftRecoveryAvailable = false;
    return parsed;
  } catch (error) {
    const recovery = safeSetLocalStorageItem(NAVIGATION_DRAFT_RECOVERY_KEY, savedDraft, { label: '损坏导航草稿的恢复副本' });
    navigationDraftWriteBlocked = !recovery.ok;
    navigationDraftRecoveryAvailable = recovery.ok;
    console.error(recovery.ok ? '本地导航草稿无效，原文已复制到恢复副本并回退到仓库数据。' : '本地导航草稿无效，但恢复副本写入失败；已禁止默认数据覆盖原草稿。', error);
    return defaultNavigationData;
  }
}

function App() {
  const { openSettings: openAppearance } = useAppearance();
  const [incomingShare, setIncomingShare] = useState(() => parseIncomingShare(window.location));
  const [captureOpen, setCaptureOpen] = useState(() => Boolean(incomingShare));
  const [captureMounted, setCaptureMounted] = useState(() => Boolean(incomingShare));
  const [initialWork] = useState(loadWorkSession);
  const [workOpen, setWorkOpen] = useState(() => Boolean(initialWork.current || initialWork.notice || initialWork.nextPhase !== 'focus'));
  const [workActive, setWorkActive] = useState(() => Boolean(initialWork.current));
  const [workPhase, setWorkPhase] = useState<WorkPhase>(() => initialWork.current?.phase || initialWork.nextPhase);
  const [workSiteIds, setWorkSiteIds] = useState<string[]>(() => initialWork.current?.siteIds || []);
  const [rssOpen, setRssOpen] = useState(false);
  const [focusedInboxId, setFocusedInboxId] = useState<string | undefined>();
  const [focusedTechOsId, setFocusedTechOsId] = useState<string | undefined>();
  useEffect(() => {
    const receive = () => {
      const incoming = parseIncomingShare(window.location);
      if (!incoming) return;
      setIncomingShare(incoming); setCaptureMounted(true); setCaptureOpen(true);
      history.replaceState(history.state, '', incoming.cleanUrl);
    };
    if (incomingShare) history.replaceState(history.state, '', incomingShare.cleanUrl);
    window.addEventListener('hashchange', receive);
    return () => window.removeEventListener('hashchange', receive);
  }, []);
  const openWebCapture = () => { setCaptureMounted(true); setCaptureOpen(true); };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [restOpen, setRestOpen] = useState(false);
  const openRest = useCallback(() => { setIsSidebarOpen(false); setIsCommandPaletteOpen(false); setRestOpen(true); }, []);
  const closeRest = useCallback(() => setRestOpen(false), []);
  const [readingOpen, setReadingOpen] = useState(() => new URLSearchParams(window.location.search).get('reading') === '1');
  const [graphOpen, setGraphOpen] = useState(false);
  const [graphIndex, setGraphIndex] = useState<TextIndex>(() => loadCachedTextIndex() || { version: 2, generatedAt: new Date().toISOString(), nodes: [], edges: [] });
  const [data, setData] = useState<NavigationData>(loadInitialData);
  const [textNodes, setTextNodes] = useState<TextNode[]>(() => loadCachedTextIndex()?.nodes || []);
  const [activeCategory, setActiveCategory] = useState(defaultNavigationData.categories[0]?.id || '');
  const [search, setSearch] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [sceneMode, setSceneMode] = useState<SceneMode>(loadSceneMode);
  const [isAdminOpen, setIsAdminOpen] = useState(window.location.hash === '#/admin');
  const [isTechOsOpen, setIsTechOsOpen] = useState(window.location.hash === '#/tech-os');
  const [isBlogOpen, setIsBlogOpen] = useState(window.location.hash === '#/blog');
  const [blogUnsaved, setBlogUnsaved] = useState(false);
  const [adminSection, setAdminSection] = useState<AdminSection>('content');
  const [isTempTextOpen, setIsTempTextOpen] = useState(false);
  const [isTempTextQrOpen, setIsTempTextQrOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [captureRequest, setCaptureRequest] = useState(0);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>(loadInbox);
  const [inboxSyncMeta, setInboxSyncMeta] = useState(loadInboxSyncMeta);
  const [inboxSyncState, setInboxSyncState] = useState<InboxSyncUiState>({ phase: 'idle' });
  const [incomingTempText, setIncomingTempText] = useState<string | null>(null);
  const [tempText, setTempText] = useState(() => safeGetLocalStorageItem(TEMP_TEXT_KEY, { label: '临时文本' }) || '');
  const [isCopied, setIsCopied] = useState(false);
  const [noteGithubToken, setNoteGithubToken] = useState('');
  const [notePassword, setNotePassword] = useState('');
  const [notePasswordConfirm, setNotePasswordConfirm] = useState('');
  const [noteSyncState, setNoteSyncState] = useState<{ busy: boolean; message: string; error: boolean }>({ busy: false, message: '', error: false });
  const [translationText, setTranslationText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('zh-CN');
  const [translationState, setTranslationState] = useState<{ loading: boolean; error: string }>({ loading: false, error: '' });
  const [translationHistory, setTranslationHistory] = useState<TranslationHistoryItem[]>(loadTranslationHistory);
  const [isTranslatorOpen, setIsTranslatorOpen] = useState(() => safeGetLocalStorageItem(TRANSLATOR_COLLAPSED_KEY, { label: '翻译面板偏好', important: false }) !== 'true');
  const [linkHealthEntries, setLinkHealthEntries] = useState<LinkHealthEntry[]>([]);
  const [isLinkHealthLoading, setIsLinkHealthLoading] = useState(false);
  const [clickStats, setClickStats] = useState<ClickStatsStore>(loadClickStats);
  const [temporaryVisits, setTemporaryVisits] = useState<TemporaryVisitsStore>(loadTemporaryVisits);
  const [currentDate, setCurrentDate] = useState(localDateKey);
  const [qrSite, setQrSite] = useState<Site | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [appUpdateReady, setAppUpdateReady] = useState(() => {
    try { return sessionStorage.getItem('baize_app_update_ready') === 'true'; } catch { return false; }
  });
  const isWorkMode = sceneMode === 'work' || workActive;
  const [storagePersistence, setStoragePersistence] = useState(getStoragePersistenceSnapshot);
  const [draftRecoveryNotice, setDraftRecoveryNotice] = useState(() => navigationDraftRecoveryAvailable);
  const inboxSyncBusy = inboxSyncState.phase === 'syncing' || inboxSyncState.phase === 'restoring';

  useEffect(() => {
    const refreshStorageState = () => setStoragePersistence(getStoragePersistenceSnapshot());
    refreshStorageState();
    window.addEventListener(STORAGE_PERSISTENCE_EVENT, refreshStorageState);
    return () => window.removeEventListener(STORAGE_PERSISTENCE_EVENT, refreshStorageState);
  }, []);

  useEffect(() => {
    const collect = () => { try { captureSharedWorkspace(); } catch { /* Sync reports storage failures explicitly. */ } };
    const refresh = () => {
      setData(loadInitialData()); setTempText(safeGetLocalStorageItem(TEMP_TEXT_KEY, { label: '临时文本' }) || '');
      setClickStats(loadClickStats()); setTemporaryVisits(loadTemporaryVisits()); setTranslationHistory(loadTranslationHistory()); setSceneMode(loadSceneMode());
      const dark = safeGetLocalStorageItem('theme', { label: '主题偏好', important: false }) === 'dark'; setIsDark(dark); document.documentElement.classList.toggle('dark', dark);
      setIsTranslatorOpen(safeGetLocalStorageItem(TRANSLATOR_COLLAPSED_KEY, { label: '翻译面板偏好', important: false }) !== 'true');
    };
    collect(); const initialCapture = window.setTimeout(collect, 0); const timer = window.setInterval(() => { if (document.visibilityState === 'visible') collect(); }, 30_000);
    window.addEventListener(WORKSPACE_EVENT, refresh);
    return () => { clearTimeout(initialCapture); clearInterval(timer); window.removeEventListener(WORKSPACE_EVENT, refresh); };
  }, []);

  useEffect(() => {
    const savedTheme = safeGetLocalStorageItem('theme', { label: '主题偏好', important: false });
    const dark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);

  }, []);

  useEffect(() => {
    if (!navigationDraftWriteBlocked) safeSetLocalStorageItem(DRAFT_KEY, JSON.stringify(data), sharedStorageOptions('导航草稿'));
  }, [data]);

  useEffect(() => {
    safeSetLocalStorageItem(CLICK_STATS_KEY, JSON.stringify(clickStats), sharedStorageOptions('访问统计'));
  }, [clickStats]);

  useEffect(() => {
    safeSetLocalStorageItem(TEMPORARY_VISITS_KEY, JSON.stringify(temporaryVisits), sharedStorageOptions('临时访问记录'));
  }, [temporaryVisits]);

  useEffect(() => {
    safeSetLocalStorageItem(TRANSLATION_HISTORY_KEY, JSON.stringify(translationHistory), sharedStorageOptions('翻译历史'));
  }, [translationHistory]);

  useEffect(() => {
    safeSetLocalStorageItem(TEMP_TEXT_KEY, tempText, sharedStorageOptions('临时文本'));
  }, [tempText]);

  useEffect(() => {
    let cancelled = false;
    void loadTextIndex().then(index => {
      if (!cancelled && index) { setTextNodes(index.nodes); setGraphIndex(index); }
    });
    return () => { cancelled = true; };
  }, []);

  const refreshLinkHealth = useCallback(async () => {
    setIsLinkHealthLoading(true);
    try {
      const entries = await loadLinkHealthReport(`${import.meta.env.BASE_URL}link-health.json?t=${Date.now()}`);
      setLinkHealthEntries(entries);
    } finally {
      setIsLinkHealthLoading(false);
    }
  }, []);

  const runBrowserLinkHealthCheck = useCallback(async () => {
    setIsLinkHealthLoading(true);
    try {
      const entries = await checkLinksFromBrowser(data.sites.map(site => ({ id: site.id, url: site.url })));
      setLinkHealthEntries(entries);
    } finally {
      setIsLinkHealthLoading(false);
    }
  }, [data.sites]);

  useEffect(() => { void refreshLinkHealth(); }, [refreshLinkHealth]);

  useEffect(() => {
    const checkDate = () => {
      setCurrentDate(current => {
        const today = localDateKey();
        return current === today ? current : today;
      });
    };
    const interval = window.setInterval(checkDate, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setTemporaryVisits(current => pruneTemporaryVisits(current, new Date(), data.sites.map(site => site.url)));
  }, [currentDate, data.sites]);

  useEffect(() => {
    const handleHash = () => {
      if (isBlogOpen && blogUnsaved && window.location.hash !== '#/blog') {
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/blog`);
        return;
      }
      setIsAdminOpen(window.location.hash === '#/admin');
      setIsTechOsOpen(window.location.hash === '#/tech-os');
      setIsBlogOpen(window.location.hash === '#/blog');
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [isBlogOpen, blogUnsaved]);

  useEffect(() => {
    if (!isAdminOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isAdminOpen]);

  useEffect(() => {
    const readTransferHash = () => {
      try {
        const received = parseTextTransferHash(window.location.hash);
        setIncomingTempText(received);
      } catch (error) {
        if (window.location.hash.startsWith('#/transfer?')) {
          setIncomingTempText(null);
          alert(error instanceof Error ? error.message : '无法读取临时文本二维码。');
          history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        }
      }
    };
    readTransferHash();
    window.addEventListener('hashchange', readTransferHash);
    return () => window.removeEventListener('hashchange', readTransferHash);
  }, []);

  useEffect(() => {
    const handleAppUpdate = () => setAppUpdateReady(true);
    window.addEventListener('baize:app-update-ready', handleAppUpdate);
    return () => window.removeEventListener('baize:app-update-ready', handleAppUpdate);
  }, []);

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => setInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  useEffect(() => {
    // Scene controls the amount of decoration, independently from the chosen palette.
    document.documentElement.dataset.appearanceScene = isWorkMode ? 'work' : sceneMode;
    return () => { delete document.documentElement.dataset.appearanceScene; };
  }, [isWorkMode, sceneMode]);

  useEffect(() => {
    const handleScroll = () => {
      const position = window.scrollY + 120;
      for (const category of data.categories) {
        const section = document.getElementById(category.id);
        if (section && section.offsetTop <= position && section.offsetTop + section.offsetHeight > position) {
          setActiveCategory(category.id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [data.categories]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector('dialog[data-rest-state][open]')) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen(current => !current);
        return;
      }
      const target = event.target as HTMLElement | null;
      const editable = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
      if (event.key === '/' && !editable) {
        event.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categories = useMemo(() => [...data.categories].sort((a, b) => a.order - b.order), [data.categories]);
  const linkHealth = useMemo(() => Object.fromEntries(linkHealthEntries.map(entry => [entry.siteId, entry])), [linkHealthEntries]);
  const todayClicks = useMemo(() => clickStats.days[currentDate]?.clicks || getTodayClicks(clickStats), [clickStats, currentDate]);
  const layoutOrder = useMemo(() => new Map(data.layout.map(item => [item.siteId, item.order])), [data.layout]);
  const commonCategoryId = useMemo(() => categories.find(category => category.id === 'common' || category.name === '常用网站')?.id, [categories]);
  const popularSites = useMemo(() => {
    const ranked = [...data.sites].sort((a, b) => {
      const aStats = todayClicks[a.id];
      const bStats = todayClicks[b.id];
      return (bStats?.count || 0) - (aStats?.count || 0) || (bStats?.lastClicked || 0) - (aStats?.lastClicked || 0);
    }).filter(site => (todayClicks[site.id]?.count || 0) > 0);
    const fallback = data.sites
      .filter(site => site.favorite || site.categoryId === commonCategoryId)
      .sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || (layoutOrder.get(a.id) ?? 9999) - (layoutOrder.get(b.id) ?? 9999));
    const result = new Map<string, (typeof data.sites)[number]>();
    [...ranked, ...fallback, ...data.sites].forEach(site => { if (result.size < 8) result.set(site.id, site); });
    return [...result.values()];
  }, [commonCategoryId, data.sites, layoutOrder, todayClicks]);
  const temporaryVisitSummaries = useMemo(
    () => getTemporaryVisitSummaries(temporaryVisits, data.sites.map(site => site.url), new Date()),
    [currentDate, data.sites, temporaryVisits],
  );
  const activeEngine = useMemo(() => searchEngines.find(engine => search.startsWith(`${engine.prefix} `)), [search]);
  const searchUrl = useMemo(() => activeEngine ? null : normalizeTemporaryUrl(search), [activeEngine, search]);
  const fuse = useMemo(() => {
    const categoryNames = new Map(data.categories.map(category => [category.id, category.name]));
    return new Fuse(data.sites.map(site => ({ ...site, categoryName: categoryNames.get(site.categoryId) || '' })), {
      threshold: 0.35,
      ignoreLocation: true,
      keys: [
        { name: 'name', weight: 0.45 },
        { name: 'tags', weight: 0.25 },
        { name: 'categoryName', weight: 0.2 },
        { name: 'description', weight: 0.1 },
      ],
    });
  }, [data.categories, data.sites]);
  const textFuse = useMemo(() => new Fuse(textNodes, {
    threshold: 0.35,
    ignoreLocation: true,
    keys: [
      { name: 'title', weight: 0.5 },
      { name: 'tags', weight: 0.25 },
      { name: 'category', weight: 0.15 },
      { name: 'summary', weight: 0.1 },
    ],
  }), [textNodes]);

  const visibleSiteIds = useMemo(() => {
    const allowed = workActive && workSiteIds.length ? new Set(workSiteIds) : null;
    const matches = !search.trim() || activeEngine ? data.sites : fuse.search(search.trim()).map(result => result.item);
    return new Set(matches.filter(site => !allowed || allowed.has(site.id)).map(site => site.id));
  }, [activeEngine, data.sites, fuse, search, workActive, workSiteIds]);
  const visibleTextNodes = useMemo(() => {
    if (!search.trim() || activeEngine || searchUrl) return [];
    return textFuse.search(search.trim(), { limit: 8 }).map(result => result.item);
  }, [activeEngine, search, searchUrl, textFuse]);
  const visibleTopicNodes = visibleTextNodes.filter(node => node.type === 'topic');
  const visiblePostNodes = visibleTextNodes.filter(node => node.type !== 'topic');

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    safeSetLocalStorageItem('theme', next ? 'dark' : 'light', sharedStorageOptions('主题偏好', false));
  };

  useEffect(() => {
    const setScheme = (event: Event) => {
      const scheme = (event as CustomEvent<unknown>).detail;
      if (scheme !== 'light' && scheme !== 'dark') return;
      const dark = scheme === 'dark';
      setIsDark(dark);
      document.documentElement.classList.toggle('dark', dark);
      safeSetLocalStorageItem('theme', scheme, sharedStorageOptions('主题偏好', false));
    };
    window.addEventListener('baize:appearance-color-scheme', setScheme);
    return () => window.removeEventListener('baize:appearance-color-scheme', setScheme);
  }, []);

  const recordVisit = (siteId: string) => {
    const now = new Date();
    setCurrentDate(localDateKey(now));
    setClickStats(current => recordSiteVisit(current, siteId, now));
  };

  const visitTemporaryUrl = (value: string): string | null => {
    const url = normalizeTemporaryUrl(value);
    const key = url ? temporaryUrlKey(url) : null;
    if (!url || !key) return '请输入有效的 HTTP/HTTPS 网址，也可以直接输入 example.com。';

    const navigationSite = data.sites.find(site => temporaryUrlKey(site.url) === key);
    if (navigationSite) recordVisit(navigationSite.id);
    else setTemporaryVisits(current => recordTemporaryVisit(current, url));
    window.open(url, '_blank', 'noopener,noreferrer');
    return null;
  };

  const changeSceneMode = (mode: SceneMode) => {
    setSceneMode(mode);
    safeSetLocalStorageItem(SCENE_MODE_KEY, mode, sharedStorageOptions('场景模式', false));
    safeSetLocalStorageItem('work_mode', String(mode === 'work'), sharedStorageOptions('工作模式偏好', false));
    if (mode === 'relax') openRest();
  };

  const openAdmin = (section: AdminSection = 'content') => {
    setAdminSection(section);
    window.location.hash = '/admin';
    setIsAdminOpen(true);
  };

  const closeAdmin = () => {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setIsAdminOpen(false);
  };

  const openTechOs = () => {
    window.location.hash = '/tech-os';
    setIsTechOsOpen(true);
  };

  const closeTechOs = () => {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setIsTechOsOpen(false);
  };

  const openBlog = () => {
    setIsAdminOpen(false); setIsCommandPaletteOpen(false); setIsBlogOpen(true);
    window.location.hash = '/blog';
  };
  const closeBlog = () => {
    if (blogUnsaved) return;
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setIsBlogOpen(false);
  };

  const closeIncomingTransfer = () => {
    setIncomingTempText(null);
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  };

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const uploadEncryptedNote = async () => {
    if (notePassword !== notePasswordConfirm) {
      setNoteSyncState({ busy: false, message: '两次输入的加密密码不一致。', error: true });
      return;
    }
    setNoteSyncState({ busy: true, message: '正在本地加密并提交…', error: false });
    try {
      const payload = await encryptNote(tempText, notePassword);
      const commitUrl = await saveEncryptedNote(siteConfig.repository, noteGithubToken, payload);
      setNoteSyncState({ busy: false, message: `加密文本已提交：${commitUrl}`, error: false });
      setNotePasswordConfirm('');
    } catch (error) {
      setNoteSyncState({ busy: false, message: error instanceof Error ? error.message : '加密提交失败。', error: true });
    }
  };

  const downloadEncryptedNote = async () => {
    setNoteSyncState({ busy: true, message: '正在读取并本地解密…', error: false });
    try {
      const remote = await getEncryptedNote(siteConfig.repository, noteGithubToken);
      if (!remote) throw new Error('GitHub 中还没有加密临时文本。');
      const plaintext = await decryptNote(remote.payload, notePassword);
      if (tempText && tempText !== plaintext && !confirm('远端文本将覆盖当前临时文本，是否继续？')) {
        setNoteSyncState({ busy: false, message: '已取消覆盖。', error: false });
        return;
      }
      setTempText(plaintext);
      setNoteSyncState({ busy: false, message: `已解密远端文本，更新时间：${new Date(remote.payload.updatedAt).toLocaleString()}`, error: false });
    } catch (error) {
      setNoteSyncState({ busy: false, message: error instanceof Error ? error.message : '读取解密失败。', error: true });
    }
  };

  const translateInline = async (event: React.FormEvent) => {
    event.preventDefault();
    if (new TextEncoder().encode(translationText).length > 500) {
      setTranslationState({ loading: false, error: '免费接口单次最多支持 500 字节，请缩短文本。' });
      return;
    }
    setTranslationState({ loading: true, error: '' });
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    try {
      const params = new URLSearchParams({ q: translationText, langpair: `${sourceLanguage}|${targetLanguage}` });
      const response = await fetch(`https://api.mymemory.translated.net/get?${params}`, { signal: controller.signal });
      const payload = await response.json() as { responseStatus: number; responseData?: { translatedText?: string } };
      if (!response.ok || payload.responseStatus >= 400 || !payload.responseData?.translatedText) throw new Error('免费翻译接口暂时不可用。');
      const result = new DOMParser().parseFromString(payload.responseData.translatedText, 'text/html').documentElement.textContent || payload.responseData.translatedText;
      setTranslatedText(result);
      setTranslationHistory(current => addTranslationHistory(current, {
        sourceText: translationText.trim(),
        translatedText: result,
        sourceLanguage,
        targetLanguage,
      }));
      setTranslationState({ loading: false, error: '' });
    } catch (error) {
      const message = error instanceof Error && error.name === 'AbortError'
        ? '翻译请求超过 12 秒，请稍后重试或使用 Google 回退。'
        : error instanceof Error ? error.message : '翻译失败，请稍后再试。';
      setTranslationState({ loading: false, error: message });
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const focusAfterRender = (id: string) => window.setTimeout(() => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element?.focus();
  }, 80);
  const openInbox = () => {
    setIsTempTextOpen(false);
    setIsInboxOpen(true);
  };
  const openQuickCapture = () => {
    setIsTempTextOpen(false);
    setIsInboxOpen(true);
    setCaptureRequest(current => current + 1);
  };
  const replaceInboxItems = (nextItems: InboxItem[]): boolean => {
    if (!saveInbox(nextItems)) return false;
    setInboxItems(nextItems);
    setInboxSyncState({ phase: 'idle', message: '本机内容已更新，等待主动同步。' });
    return true;
  };
  const createLocalInboxItem = (draft: InboxDraft): string | null => {
    if (inboxSyncBusy) return '正在同步或恢复，请等待完成后再保存。';
    try {
      const item = createInboxItem(draft);
      return replaceInboxItems([item, ...inboxItems]) ? null : '浏览器无法写入本地存储，请检查隐私或空间设置。';
    } catch (error) {
      return error instanceof Error ? error.message : '无法保存这条记录。';
    }
  };
  const updateLocalInboxItem = (id: string, draft: InboxDraft): string | null => {
    if (inboxSyncBusy) return '正在同步或恢复，请等待完成后再编辑。';
    try {
      const normalized = normalizeInboxDraft(draft);
      return replaceInboxItems(updateInboxItem(inboxItems, id, normalized)) ? null : '浏览器无法写入本地存储，请检查隐私或空间设置。';
    } catch (error) {
      return error instanceof Error ? error.message : '无法更新这条记录。';
    }
  };
  const changeInboxItemStatus = (id: string, status: InboxItemStatus) => {
    if (inboxSyncBusy) {
      alert('正在同步或恢复，请等待完成后再修改状态。');
      return;
    }
    if (!replaceInboxItems(setInboxItemStatus(inboxItems, id, status))) alert('无法保存 Inbox 状态，请检查浏览器本地存储。');
  };
  const archiveInboxItems = (ids: string[]) => {
    if (!ids.length) return;
    if (inboxSyncBusy) {
      alert('Tech OS 已提交，但 Inbox 正在同步或恢复；请稍后手动归档来源记录。');
      return;
    }
    const now = new Date();
    const nextItems = ids.reduce((current, id) => setInboxItemStatus(current, id, 'archived', now), inboxItems);
    if (!replaceInboxItems(nextItems)) alert('Tech OS 已提交，但无法保存 Inbox 归档状态；请检查浏览器本地存储。');
  };
  const deleteInboxItem = (id: string) => {
    if (inboxSyncBusy) {
      alert('正在同步或恢复，请等待完成后再删除。');
      return;
    }
    if (!replaceInboxItems(softDeleteInboxItem(inboxItems, id))) alert('无法保存删除标记，请检查浏览器本地存储。');
  };
  const restorePrivateSharedData = async (token: string, password: string): Promise<void> => {
    setInboxSyncState({ phase: 'restoring', message: '正在只读下载、解密并与本机数据合并…' });
    try {
      const result = await restoreInboxFromCloud(
        inboxItems,
        siteConfig.repository,
        token,
        password,
        loadStudyProgressStore(),
        captureSharedWorkspace(),
      );
      const persistedItems = mergeInboxItems(result.items, loadInbox());
      const persistedStudyProgress = mergeStudyProgressStores(result.studyProgress, loadStudyProgressStore());
      const inboxSaved = saveInbox(persistedItems);
      const studySaved = saveStudyProgressStore(persistedStudyProgress);
      applySharedWorkspace(mergeSharedWorkspace(result.workspace, captureSharedWorkspace()));
      if (inboxSaved) setInboxItems(persistedItems);
      if (!inboxSaved || !studySaved) {
        setInboxSyncState({
          phase: 'error',
          message: `远端数据已经成功解密，但本机${!inboxSaved && !studySaved ? ' Inbox 与学习进度' : !inboxSaved ? ' Inbox' : '学习进度'}无法持久化；云端没有被修改。`,
        });
        return;
      }
      const meta = createInboxSyncMeta(result.remoteItems, result.restoredAt, result.remoteStudyProgress, result.remoteWorkspace);
      if (!saveInboxSyncMeta(meta)) {
        setInboxSyncState({ phase: 'error', message: '数据已恢复到本机，但无法保存同步标记；内容没有丢失，云端也没有被修改。' });
        return;
      }
      setInboxSyncMeta(meta);
      setInboxSyncState({
        phase: 'synced',
        message: `从云端恢复完成：${persistedItems.filter(item => !item.deletedAt).length} 条可见记录、学习打卡、设置与阅读数据已合并；未产生 GitHub 提交。`,
      });
    } catch (error) {
      setInboxSyncState({ phase: 'error', message: error instanceof Error ? error.message : '云端恢复失败；本机内容已保留。' });
    }
  };
  const syncInboxWithCloud = async (token: string, password: string): Promise<void> => {
    setInboxSyncState({ phase: 'syncing', message: '正在读取远端密文，合并 Inbox 与学习进度…' });
    try {
      const result = await synchronizeInbox(
        inboxItems,
        siteConfig.repository,
        token,
        password,
        loadStudyProgressStore(),
        captureSharedWorkspace(),
      );
      const persistedItems = mergeInboxItems(result.items, loadInbox());
      const persistedStudyProgress = mergeStudyProgressStores(result.studyProgress, loadStudyProgressStore());
      const inboxSaved = saveInbox(persistedItems);
      const studySaved = saveStudyProgressStore(persistedStudyProgress);
      applySharedWorkspace(mergeSharedWorkspace(result.workspace, captureSharedWorkspace()));
      if (inboxSaved) setInboxItems(persistedItems);
      if (!inboxSaved || !studySaved) {
        setInboxSyncState({
          phase: 'error',
          message: `云端已同步，但浏览器无法持久化${!inboxSaved && !studySaved ? ' Inbox 与学习进度' : !inboxSaved ? ' Inbox' : '学习进度'}；请不要刷新并检查本地存储设置。`,
          commitUrl: result.commitUrl,
        });
        return;
      }
      const meta = createInboxSyncMeta(result.items, result.syncedAt, result.studyProgress, result.workspace);
      if (!saveInboxSyncMeta(meta)) {
        setInboxSyncState({ phase: 'error', message: '共享数据已同步，但本机无法保存同步标记；内容没有丢失。', commitUrl: result.commitUrl });
        return;
      }
      setInboxSyncMeta(meta);
      setInboxSyncState({ phase: 'synced', message: `合并同步完成：云端已写入 ${result.items.filter(item => !item.deletedAt).length} 条可见记录，以及学习打卡、设置和阅读数据；如请求期间又有本机改动，会继续显示为未同步。`, commitUrl: result.commitUrl });
    } catch (error) {
      setInboxSyncState({ phase: 'error', message: error instanceof Error ? error.message : '共享数据同步失败；本机内容已保留。' });
    }
  };
  const createBlogDraftFromInbox = async (item: InboxItem, input: BlogDraftInput, token: string) => {
    if (inboxSyncBusy) throw new Error('正在同步或恢复 Inbox，请等待完成后再创建博客草稿。');
    const result = await createInboxBlogDraft(item, input, token, siteConfig.blogRepository);
    const sourceArchived = item.status === 'archived'
      || replaceInboxItems(setInboxItemStatus(inboxItems, item.id, 'archived'));
    return { ...result, sourceArchived };
  };
  const retryStoragePersistence = () => {
    let snapshot = retryPendingLocalStorageWrites();
    const wasRecoveryBlocked = navigationDraftWriteBlocked;
    if (!snapshot.issues.some(issue => issue.key === NAVIGATION_DRAFT_RECOVERY_KEY)) {
      navigationDraftWriteBlocked = false;
      if (wasRecoveryBlocked) setDraftRecoveryNotice(true);
      safeSetLocalStorageItem(DRAFT_KEY, JSON.stringify(data), sharedStorageOptions('导航草稿'));
    }
    safeSetLocalStorageItem(CLICK_STATS_KEY, JSON.stringify(clickStats), sharedStorageOptions('访问统计'));
    safeSetLocalStorageItem(TEMPORARY_VISITS_KEY, JSON.stringify(temporaryVisits), sharedStorageOptions('临时访问记录'));
    safeSetLocalStorageItem(TRANSLATION_HISTORY_KEY, JSON.stringify(translationHistory), sharedStorageOptions('翻译历史'));
    safeSetLocalStorageItem(TEMP_TEXT_KEY, tempText, sharedStorageOptions('临时文本'));
    safeSetLocalStorageItem('theme', isDark ? 'dark' : 'light', sharedStorageOptions('主题偏好', false));
    safeSetLocalStorageItem(SCENE_MODE_KEY, sceneMode, sharedStorageOptions('场景模式', false));
    safeSetLocalStorageItem('work_mode', String(sceneMode === 'work'), sharedStorageOptions('工作模式偏好', false));
    safeSetLocalStorageItem(TRANSLATOR_COLLAPSED_KEY, String(!isTranslatorOpen), sharedStorageOptions('翻译面板偏好', false));
    snapshot = getStoragePersistenceSnapshot();
    setStoragePersistence(snapshot);
  };

  const exportUnsavedBackup = () => {
    const exportedAt = new Date().toISOString();
    const payload = {
      version: 1,
      exportedAt,
      navigation: data,
      storage: {
        nav_cms_draft: JSON.stringify(data),
        nav_daily_click_stats: null,
        nav_click_stats_v2: JSON.stringify(clickStats),
        nav_temporary_url_visits_v1: JSON.stringify(temporaryVisits),
        nav_translation_history: JSON.stringify(translationHistory),
        nav_temp_text: tempText,
        work_mode: String(sceneMode === 'work'),
        scene_mode: sceneMode,
        theme: isDark ? 'dark' : 'light',
        nav_translator_collapsed: String(!isTranslatorOpen),
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `baize-unsaved-backup-${exportedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const downloadRecoveredNavigationDraft = () => {
    const raw = safeGetLocalStorageItem(NAVIGATION_DRAFT_RECOVERY_KEY, { label: '损坏导航草稿的恢复副本' });
    if (!raw) return;
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `baize-invalid-navigation-draft-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setDraftRecoveryNotice(false);
  };


  const importantStorageIssue = storagePersistence.issues.find(issue => issue.important);
  const storageIssue = importantStorageIssue || storagePersistence.issues[0];
  const storageWarningText = importantStorageIssue
    ? `当前修改未持久化，请勿刷新。 ${storageIssue?.message || ''}`
    : `部分界面偏好未保存。 ${storageIssue?.message || ''}`;

  const inboxCount = inboxItems.filter(item => !item.deletedAt && item.status === 'inbox').length;
  const showInboxLauncher = !isAdminOpen
    && !isInboxOpen
    && !isTempTextOpen
    && !isTempTextQrOpen
    && incomingTempText === null
    && !qrSite
    && !isCommandPaletteOpen
    && !captureOpen
    && !restOpen;
  const commandActions: CommandPaletteAction[] = [
    { id: 'blog', title: '打开博客工作台', description: '写文章、管理草稿、预览与发布更新', keywords: ['blog', '博客', '文章', '写作', '发布'], icon: 'note', run: openBlog },
    { id: 'rss', title: 'RSS 阅读中心', description: '订阅、OPML、未读、收藏与稍后阅读', keywords: ['rss', '订阅', '阅读', 'opml'], icon: 'study', run: () => setRssOpen(true) },
    { id: 'organize', title: '智能整理中心', description: '查重复、补全资料、批量调整分类与标签', keywords: ['整理', '去重', 'organize'], icon: 'settings', run: () => openAdmin('organize') },
    { id: 'web-capture', title: '收集网页', description: '保存网址、备注或安装一键收集书签', keywords: ['收集', '分享', 'capture'], icon: 'add', run: openWebCapture },
    { id: 'work-session', title: '工作会话', description: '专注计时、工作网站组合与小结', keywords: ['工作', '专注', '番茄', 'focus'], icon: 'work', run: () => setWorkOpen(true) },
    { id: 'shuihu', title: '打开白泽水浒', description: '两卷江湖 · 梁山存档匣 0.3 · 20个本机位置', keywords: ['game', '游戏', '水浒', '梁山', '寨主', '林冲', '鲁智深'], icon: 'study', run: () => { window.open(`${import.meta.env.BASE_URL}game/`, '_blank', 'noopener,noreferrer'); } },
    { id: 'rest', title: '休息一下', description: '在多幅动态风景间轮播，回来继续学习', keywords: ['rest', 'break', '休息', '放松', '动画', '泛舟', '轮播', '鹈鹕', '骑行'], icon: 'relax', run: openRest },
    { id: 'focus-search', title: '聚焦站内搜索', description: '搜索网站或使用外部搜索前缀', keywords: ['search', '搜索', '/'], icon: 'search', run: () => focusAfterRender('search-input') },
    { id: 'quick-capture', title: '快速记录', description: '立即写入本机 Inbox', keywords: ['capture', '记录', '收件箱', '+'], icon: 'add', run: openQuickCapture },
    { id: 'inbox', title: `打开 Inbox (${inboxCount})`, description: '查看、编辑、复制、归档本地记录', keywords: ['inbox', '收件箱', '稍后处理'], icon: 'inbox', run: openInbox },
    { id: 'translator', title: '打开快捷翻译', description: '输入文本并查看翻译历史', keywords: ['translate', '翻译', 'language'], icon: 'translate', run: () => { setIsTranslatorOpen(true); focusAfterRender('translation-input'); } },
    { id: 'temp-note', title: '打开临时文本', description: '编辑、复制或加密同步临时内容', keywords: ['note', '文本', '便签'], icon: 'note', run: () => { setIsTempTextOpen(true); focusAfterRender('temp-text-editor'); } },
    ...(tempText ? [{ id: 'temp-qr', title: '临时文本二维码传输', description: '生成接收链接或纯文本二维码', keywords: ['qr', '二维码', '传输'], icon: 'qr' as const, run: () => setIsTempTextQrOpen(true) }] : []),
    { id: 'hot-feed', title: '查看技术情报', description: '国内、AI、安全、开发动态和 GitHub 今日热门仓库', keywords: ['hot', '热榜', '情报', '国内', '新闻', 'AI', '安全', '开发', 'github', 'trending'], icon: 'stats', run: () => focusAfterRender('hot-feed') },
    { id: 'tech-os', title: '打开 Tech OS', description: '查看当前路线、Quest、Knowledge、Labs 与 Tech Map', keywords: ['tech os', '学习', '路线', 'quest', 'knowledge'], icon: 'study', run: openTechOs },
    { id: 'admin', title: '打开导航管理', description: '编辑网站、布局、备份与发布', keywords: ['admin', 'cms', '管理', '设置'], icon: 'settings', run: () => openAdmin('content') },
    { id: 'layout', title: '打开布局排序', description: '拖拽网站、分类和调整卡片尺寸', keywords: ['layout', '布局', '拖拽', '排序'], icon: 'settings', run: () => openAdmin('layout') },
    { id: 'stats', title: '查看访问统计', description: '查看 7/30 天趋势和网站排行', keywords: ['stats', '统计', '数据'], icon: 'stats', run: () => { openAdmin('insights'); focusAfterRender('stats-title'); } },
    { id: 'appearance', title: '打开外观设置', description: '全站四套配色、固定主题或每日轮换', keywords: ['appearance', '外观', '壁纸', '背景', '皮肤', '配色'], icon: 'default', run: openAppearance },
    { id: 'theme', title: isDark ? '切换到浅色主题' : '切换到深色主题', description: '立即切换页面明暗外观', keywords: ['theme', '主题', 'dark', 'light'], icon: isDark ? 'sun' : 'moon', run: toggleTheme },
    { id: 'scene-default', title: '切换到日常场景', description: sceneMode === 'default' ? '当前正在使用' : '恢复完整背景与标准布局', keywords: ['scene', '场景', '日常'], icon: 'default', run: () => changeSceneMode('default') },
    { id: 'scene-work', title: '切换到工作场景', description: sceneMode === 'work' ? '当前正在使用' : '隐藏装饰并压缩卡片布局', keywords: ['scene', '场景', '工作'], icon: 'work', run: () => changeSceneMode('work') },
    { id: 'scene-study', title: '切换到学习场景', description: sceneMode === 'study' ? '当前正在使用' : '降低背景干扰并保持阅读感', keywords: ['scene', '场景', '学习'], icon: 'study', run: () => changeSceneMode('study') },
    { id: 'scene-relax', title: '切换到休闲场景', description: '打开休息动画与定时轮播', keywords: ['scene', '场景', '休闲'], icon: 'relax', run: () => changeSceneMode('relax') },
    { id: 'github', title: '打开个人 GitHub', description: siteConfig.github, keywords: ['github', '代码'], icon: 'github', run: () => { window.open(siteConfig.github, '_blank', 'noopener,noreferrer'); } },
    ...(installPrompt ? [{ id: 'install', title: '安装白泽导航', description: '将当前站点安装到设备', keywords: ['pwa', '安装', 'install'], icon: 'install' as const, run: () => { void installApp(); } }] : []),
  ];

  if (isBlogOpen) {
    return <Suspense fallback={<div className="appearance-surface flex min-h-screen items-center justify-center">正在载入博客工作台…</div>}><BlogWorkbench onClose={closeBlog} onDirtyChange={setBlogUnsaved} /></Suspense>;
  }

  if (isTechOsOpen) {
    return <><Suspense fallback={<div className="appearance-surface flex min-h-screen items-center justify-center text-sm font-medium">正在载入 Tech OS…</div>}>
      <TechOsWorkspace
        initialFocusedId={focusedTechOsId}
        isDark={isDark}
        inboxCount={inboxCount}
        inboxItems={inboxItems}
        onToggleTheme={toggleTheme}
        onOpenInbox={() => { closeTechOs(); openInbox(); }}
        onArchiveInboxItems={archiveInboxItems}
        onClose={closeTechOs}
        onRest={openRest}
        repository={siteConfig.repository}
      />
    </Suspense><RestOverlay open={restOpen} onClose={closeRest} /></>;
  }

  return (
    <div className={`appearance-surface scene-${sceneMode} ${isWorkMode ? 'work-mode' : ''} ${isAdminOpen ? 'admin-open' : ''} min-h-screen font-sans transition-colors duration-300`}>
      <Sidebar
        activeCategory={activeCategory}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isDark={isDark}
        toggleTheme={toggleTheme}
        categories={workActive && workSiteIds.length ? categories.filter(category => data.sites.some(site => site.categoryId === category.id && workSiteIds.includes(site.id))) : categories}
        onAdminClick={() => openAdmin('content')}
        sceneMode={sceneMode}
        onSceneModeChange={changeSceneMode}
        onTempTextClick={() => setIsTempTextOpen(true)}
        tempText={tempText}
        onTempTextChange={value => { setTempText(value); setIsCopied(false); }}
        canInstall={Boolean(installPrompt)}
        onInstall={() => { void installApp(); }}
      />

      <main className="relative z-10 min-h-screen bg-transparent p-4 lg:ml-64 lg:p-8">
        <div className="baize-toolbar sticky top-0 z-30 -mx-4 mb-8 px-4 py-4 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="baize-icon-button -ml-2 lg:hidden"><Menu size={24} /></button>
            <div className="group relative max-w-2xl flex-1">
              <div className="absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[#6f8984] group-focus-within:text-[#356b66] dark:group-focus-within:text-[#d2b775]">{activeEngine ? <SearchEngineIcon engineId={activeEngine.id} className="h-5 w-5" /> : <Search size={20} />}</div>
              <input
                id="search-input"
                value={search}
                onChange={event => setSearch(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && activeEngine) {
                    const query = search.slice(activeEngine.prefix.length + 1).trim();
                    if (query) window.open(activeEngine.url + encodeURIComponent(query), '_blank', 'noopener,noreferrer');
                  } else if (event.key === 'Enter' && searchUrl) {
                    visitTemporaryUrl(searchUrl);
                    setSearch('');
                  }
                }}
                placeholder={activeEngine ? activeEngine.placeholder : "搜索网站、文章和 Topic，或输入 'g ' 使用 Google"}
                className="baize-input py-3 pl-10 pr-16 shadow-[0_10px_30px_-20px_rgba(16,44,51,0.6)]"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-[#5f8f84]/20 bg-[#5f8f84]/8 px-2 py-0.5 text-xs text-[#6f8984] dark:border-[#c9a96b]/15 dark:bg-[#c9a96b]/8 dark:text-[#baa978] sm:block">/</kbd>
              <div className="pointer-events-none absolute left-0 top-full mt-2 flex w-full flex-wrap gap-2 px-1 opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                {searchEngines.map(engine => <button key={engine.id} type="button" data-search-engine={engine.id} onClick={() => { const query = activeEngine ? search.slice(activeEngine.prefix.length + 1) : search; setSearch(`${engine.prefix} ${query}`); document.getElementById('search-input')?.focus(); }} className="baize-chip inline-flex items-center gap-1.5"><SearchEngineIcon engineId={engine.id} /><span>{engine.name}</span></button>)}
              </div>
            </div>
            <AppearanceButton compact />
            <button type="button" onClick={() => setIsCommandPaletteOpen(true)} className="baize-button-secondary shrink-0 px-3" aria-label="打开全局命令面板"><Command size={18} /><span className="hidden md:inline">命令</span><kbd className="hidden rounded border border-[#5f8f84]/20 px-1.5 py-0.5 text-[10px] text-[#718986] lg:inline">Ctrl K</kbd></button>
          </div>
        </div>

        <div className="navigation-content mx-auto max-w-7xl space-y-12 pb-24 lg:pb-12">
          {visibleTopicNodes.length > 0 && <section aria-labelledby="topic-search-heading" className="scroll-mt-28">
            <div className="category-heading baize-panel mb-4 inline-flex items-center gap-2 rounded-xl px-4 py-2">
              <Network size={17} className="text-[#4f8179] dark:text-[#c9a96b]" />
              <h2 id="topic-search-heading" className="text-lg font-bold tracking-wide text-[#173b41] dark:text-[#f4f1e8]">知识节点</h2>
              <span className="ml-1 text-sm font-medium text-[#64807c] dark:text-[#9fb2ad]">({visibleTopicNodes.length})</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">{visibleTopicNodes.map(node => <a key={node.id} href={node.url} className="baize-panel group flex min-w-0 items-center gap-3 rounded-xl p-4 transition hover:-translate-y-0.5 hover:border-[#5f8f84]/40 dark:hover:border-[#c9a96b]/30"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5f8f84]/10 text-[#456b68] dark:bg-[#c9a96b]/8 dark:text-[#d9ddd6]"><Network size={18} /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#234b4e] dark:text-[#f4f1e8]">{node.title}</strong><span className="mt-0.5 block truncate text-xs text-[#718986]">{node.summary || '正式知识节点'}</span></span><ExternalLink size={15} className="shrink-0 text-[#829793] transition group-hover:text-[#356b66] dark:group-hover:text-[#d2b775]" /></a>)}</div>
          </section>}
          {visiblePostNodes.length > 0 && <section aria-labelledby="text-search-heading" className="scroll-mt-28">
            <div className="category-heading baize-panel mb-4 inline-flex items-center gap-2 rounded-xl px-4 py-2">
              <FileText size={17} className="text-[#4f8179] dark:text-[#c9a96b]" />
              <h2 id="text-search-heading" className="text-lg font-bold tracking-wide text-[#173b41] dark:text-[#f4f1e8]">文章</h2>
              <span className="ml-1 text-sm font-medium text-[#64807c] dark:text-[#9fb2ad]">({visiblePostNodes.length})</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">{visiblePostNodes.map(node => <a key={node.id} href={node.url} className="baize-panel group flex min-w-0 items-center gap-3 rounded-xl p-4 transition hover:-translate-y-0.5 hover:border-[#5f8f84]/40 dark:hover:border-[#c9a96b]/30"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5f8f84]/10 text-[#456b68] dark:bg-[#c9a96b]/8 dark:text-[#d9ddd6]"><FileText size={18} /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#234b4e] dark:text-[#f4f1e8]">{node.title}</strong><span className="mt-0.5 block truncate text-xs text-[#718986]">{[node.category, node.format, node.summary].filter(Boolean).join(' · ') || '公开文章'}</span></span><ExternalLink size={15} className="shrink-0 text-[#829793] transition group-hover:text-[#356b66] dark:group-hover:text-[#d2b775]" /></a>)}</div>
          </section>}
          <div className="utility-launcher-row flex flex-wrap items-start gap-2 sm:gap-3">
            <button type="button" className="baize-button-secondary utility-launcher-button" onClick={openTechOs}><BrainCircuit size={17} />Tech OS</button>
            <button type="button" className="baize-button-secondary utility-launcher-button" onClick={openBlog}><FileText size={17} />博客工作台</button>
            <button type="button" className="baize-button-secondary utility-launcher-button" data-rest-launcher onClick={openRest}><Coffee size={17} />休息一下</button>
            <a className="baize-button-secondary utility-launcher-button" href={`${import.meta.env.BASE_URL}game/`} target="_blank" rel="noopener noreferrer">白泽水浒</a>
            <button type="button" className="baize-button-secondary utility-launcher-button" aria-expanded={readingOpen} onClick={() => setReadingOpen(value => !value)}><FileText size={17} />阅读中心</button>
            <button type="button" className="baize-button-secondary utility-launcher-button" aria-expanded={graphOpen} onClick={() => setGraphOpen(value => !value)}><Network size={17} />知识图谱</button>
            <button type="button" className="baize-button-secondary utility-launcher-button" onClick={openWebCapture}><Plus size={17} />收集网页</button>
            <button type="button" className="baize-button-secondary utility-launcher-button" aria-expanded={rssOpen} onClick={() => setRssOpen(value => !value)}><FileText size={17} />RSS 订阅</button>
            {rssOpen && <Suspense fallback={<p>正在载入 RSS…</p>}><RssPanel onClose={() => setRssOpen(false)} onCapture={createLocalInboxItem} repositoryLabel={`${siteConfig.repository.owner}/${siteConfig.repository.repo}`} onPublishSources={(sources, token, baseline) => publishRssConfiguration(siteConfig.repository, token, sources, baseline)} /></Suspense>}
            <button type="button" className="baize-button-secondary utility-launcher-button" aria-expanded={workOpen} onClick={() => setWorkOpen(value => workActive || !value)}><Check size={17} />{workActive ? workPhase === 'focus' ? '正在专注' : '正在休息' : '工作会话'}</button>
            <Suspense fallback={null}><PendingSyncPanel data={data} bundled={defaultNavigationData} items={inboxItems} syncMeta={inboxSyncMeta} onPublish={() => openAdmin('content')} onPrivateSync={openInbox} /></Suspense>
            {workOpen && <div className="basis-full"><Suspense fallback={<p>正在加载工作会话…</p>}><WorkSessionPanel sites={data.sites} onActiveChange={setWorkActive} onPhaseChange={setWorkPhase} onSelectionChange={setWorkSiteIds} onSiteVisit={recordVisit} onClose={() => setWorkOpen(false)} /></Suspense></div>}
            {readingOpen && <Suspense fallback={null}><ReadingPanel nodes={textNodes} onClose={() => setReadingOpen(false)} onSync={() => setIsInboxOpen(true)} /></Suspense>}
            {graphOpen && <Suspense fallback={<p>正在加载图谱…</p>}><TextGraphPanel index={graphIndex} onClose={() => setGraphOpen(false)} /></Suspense>}
            {!workActive && <HotFeedPanel reportUrl={`${import.meta.env.BASE_URL}hot-feed.json`} compact={isWorkMode} />}
            <TemporaryVisitsPanel
              visits={temporaryVisitSummaries}
              onVisit={visitTemporaryUrl}
              onDelete={key => setTemporaryVisits(current => removeTemporaryVisit(current, key))}
              onClear={() => setTemporaryVisits(current => ({ ...current, records: [] }))}
            />
            {!isTranslatorOpen && <button type="button" className="baize-button-secondary utility-launcher-button" aria-controls="quick-translator" aria-expanded="false" onClick={() => { safeSetLocalStorageItem(TRANSLATOR_COLLAPSED_KEY, 'false', sharedStorageOptions('翻译面板偏好', false)); setIsTranslatorOpen(true); }}><Languages size={17} />翻译{translationHistory.length > 0 && <span className="utility-launcher-badge">{translationHistory.length}</span>}</button>}
            {isTranslatorOpen && <section id="quick-translator" className="baize-panel basis-full rounded-2xl p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-[#456b68] dark:text-[#d9ddd6]"><Languages size={17} />快捷翻译</span>
              <button type="button" className="baize-icon-button flex items-center gap-1 text-xs" aria-expanded="true" onClick={() => { safeSetLocalStorageItem(TRANSLATOR_COLLAPSED_KEY, 'true', sharedStorageOptions('翻译面板偏好', false)); setIsTranslatorOpen(false); }}><ChevronUp size={16} />收起</button>
            </div>
            <form onSubmit={translateInline}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="mr-auto text-xs text-[#718986]">选择翻译语言</span>
                <select value={sourceLanguage} onChange={event => setSourceLanguage(event.target.value)} className="baize-input w-auto py-1.5">{TRANSLATION_LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>
                <button type="button" className="baize-icon-button" aria-label="互换翻译语言" onClick={() => { setSourceLanguage(targetLanguage); setTargetLanguage(sourceLanguage); if (translatedText) { setTranslationText(translatedText); setTranslatedText(''); } }}><ArrowLeftRight size={17} /></button>
                <select value={targetLanguage} onChange={event => setTargetLanguage(event.target.value)} className="baize-input w-auto py-1.5">{TRANSLATION_LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <textarea id="translation-input" required value={translationText} onChange={event => { setTranslationText(event.target.value); setTranslationState({ loading: false, error: '' }); }} rows={5} className="baize-input resize-y" placeholder="输入要翻译的单句或短段落…" />
                <div className="baize-input relative min-h-32 whitespace-pre-wrap"><span className={translatedText ? '' : 'text-[#8aa39d]'}>{translatedText || '翻译结果会显示在这里'}</span>{translatedText && <button type="button" className="baize-icon-button absolute right-2 top-2" aria-label="复制翻译结果" onClick={() => navigator.clipboard.writeText(translatedText)}><Copy size={15} /></button>}</div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className={`text-xs ${translationState.error ? 'text-[#985247] dark:text-[#e1a294]' : 'text-[#718986]'}`}>{translationState.error || '直接调用 MyMemory 免费接口；请勿翻译敏感文本，单次最多 500 字节。'}</p>
                <div className="flex gap-2"><a className="baize-button-secondary" target="_blank" rel="noreferrer" href={`https://translate.google.com/?sl=${encodeURIComponent(sourceLanguage)}&tl=${encodeURIComponent(targetLanguage)}&text=${encodeURIComponent(translationText)}&op=translate`}>Google 回退</a><button disabled={translationState.loading || !translationText.trim()} className="baize-button-primary" type="submit"><Languages size={17} />{translationState.loading ? '翻译中…' : '立即翻译'}</button></div>
              </div>
            </form>
            <TranslationHistoryPanel
              history={translationHistory}
              languageName={translationLanguageName}
              onUse={item => {
                setTranslationText(item.sourceText);
                setTranslatedText(item.translatedText);
                setSourceLanguage(item.sourceLanguage);
                setTargetLanguage(item.targetLanguage);
                setTranslationState({ loading: false, error: '' });
              }}
              onDelete={id => setTranslationHistory(current => current.filter(item => item.id !== id))}
              onClear={() => setTranslationHistory([])}
            />
          </section>}
          </div>
          {categories.map(category => {
            const categorySites = data.sites
              .filter(site => site.categoryId === category.id && visibleSiteIds.has(site.id))
              .sort((a, b) => (layoutOrder.get(a.id) ?? 9999) - (layoutOrder.get(b.id) ?? 9999));
            const sites = category.id === commonCategoryId && !search.trim()
              ? popularSites.filter(site => visibleSiteIds.has(site.id))
              : categorySites;
            const occupiedCells = new Set<string>();
            const safePositionedSites = new Set<string>();
            for (const site of sites) {
              const item = data.layout.find(layout => layout.siteId === site.id);
              if (item?.x === undefined || item?.y === undefined) continue;
              const width = item.width || (item.size === 'wide' ? 2 : 1);
              const height = item.height || 1;
              const cells: string[] = [];
              for (let x = item.x; x < item.x + width; x += 1) {
                for (let y = item.y; y < item.y + height; y += 1) cells.push(`${x}:${y}`);
              }
              if (cells.some(cell => occupiedCells.has(cell))) continue;
              cells.forEach(cell => occupiedCells.add(cell));
              safePositionedSites.add(site.id);
            }
            if (!sites.length && (search.trim() || workActive)) return null;
            return (
              <section key={category.id} id={category.id} className="scroll-mt-28">
                <div className="category-heading baize-panel mb-6 inline-flex items-center gap-2 rounded-xl px-4 py-2">
                  <span className="h-6 w-1 rounded-full bg-[#4f8179] dark:bg-[#c9a96b]" />
                  <h2 className="text-xl font-bold tracking-wide text-[#173b41] dark:text-[#f4f1e8]">{category.name}</h2>
                  <span className="ml-1 text-sm font-medium text-[#64807c] dark:text-[#9fb2ad]">({sites.length})</span>
                </div>
                <div className="free-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{sites.map(site => {
                  const layout = data.layout.find(item => item.siteId === site.id);
                  const positioned = safePositionedSites.has(site.id);
                  const style = {
                    '--grid-x': layout?.x ?? 0,
                    '--grid-y': layout?.y ?? 0,
                    '--grid-w': layout?.width || (layout?.size === 'wide' ? 2 : 1),
                    '--grid-h': layout?.height || 1,
                  } as CSSProperties;
                  const health = linkHealth[site.id]?.url === site.url ? linkHealth[site.id] : undefined;
                  return <div key={site.id} className="grid-site min-w-0" data-positioned={positioned} style={style}><Card site={site} onVisit={recordVisit} onShowQr={setQrSite} dailyVisits={category.id === commonCategoryId ? todayClicks[site.id]?.count || 0 : 0} health={health} /></div>;
                })}</div>
              </section>
            );
          })}
          {search.trim() && !activeEngine && visibleSiteIds.size === 0 && visibleTextNodes.length === 0 && <div className="baize-panel rounded-2xl py-12 text-center text-[#64807c]"><p className="text-lg">{searchUrl ? '这是一个可访问的网址' : '云海茫茫，未找到相关网站、文章或知识节点'}</p><div className="mt-4 flex flex-wrap justify-center gap-3">{searchUrl && <button type="button" onClick={() => { visitTemporaryUrl(searchUrl); setSearch(''); }} className="baize-button-primary"><ExternalLink size={16} />访问并记录</button>}<button onClick={() => setSearch('')} className="font-medium text-[#356b66] hover:underline dark:text-[#d2b775]">清除搜索</button></div></div>}
          {activeEngine && <div className="baize-panel rounded-2xl p-6 text-center font-medium text-[#356b66] dark:text-[#d9c386]">按 Enter 使用 {activeEngine.name} 搜索</div>}
        </div>
      </main>

      {showInboxLauncher && <nav className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/70 bg-[#f4f1e8]/90 p-2 shadow-xl backdrop-blur-xl lg:left-auto lg:right-6 lg:translate-x-0 dark:border-[#c9a96b]/15 dark:bg-[#102c33]/92" aria-label="Inbox 快捷入口">
        <button type="button" className="baize-button-primary h-11 px-4" onClick={openQuickCapture} aria-label="快速记录"><Plus size={20} /><span className="hidden sm:inline">快速记录</span></button>
        <button type="button" className="baize-button-secondary h-11 px-4" onClick={openInbox} aria-label={`打开 Inbox，${inboxCount} 条`}><InboxIcon size={19} /><span>Inbox</span>{inboxCount > 0 && <span className="rounded-full bg-[#356b66] px-2 py-0.5 text-[11px] text-white dark:bg-[#c9a96b] dark:text-[#102c33]">{inboxCount}</span>}</button>
      </nav>}

      {isAdminOpen && <Suspense fallback={<div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#dce6e1]/96 text-sm font-medium text-[#456b68] dark:bg-[#07191d]/97 dark:text-[#d9ddd6]">正在载入管理后台…</div>}>
        <AdminPanel data={data} initialSection={adminSection} defaultRepository={siteConfig.repository} linkHealthEntries={linkHealthEntries} isLinkHealthLoading={isLinkHealthLoading} onRefreshLinkHealth={refreshLinkHealth} onRunBrowserLinkHealthCheck={runBrowserLinkHealthCheck} clickStats={clickStats} onClearClickStats={() => setClickStats({ version: 2, days: {} })} onChange={setData} onPublished={(published, sha, target) => { if (target.owner === siteConfig.repository.owner && target.repo === siteConfig.repository.repo && target.branch === siteConfig.repository.branch) markNavigationPublished(published, sha, defaultNavigationData); }} onReset={() => { safeRemoveLocalStorageItem(DRAFT_KEY, { label: '导航草稿' }); setData(defaultNavigationData); }} onClose={closeAdmin} />
      </Suspense>}
      {isInboxOpen && <Suspense fallback={null}><InboxPanel open focusItemId={focusedInboxId} captureRequest={captureRequest} items={inboxItems} repositoryLabel={`${siteConfig.repository.owner}/${siteConfig.repository.repo} · ${siteConfig.repository.branch}`} blogRepositoryLabel={`${siteConfig.blogRepository.owner}/${siteConfig.blogRepository.repo} · ${siteConfig.blogRepository.branch}`} syncMeta={inboxSyncMeta} syncState={inboxSyncState} onCreate={createLocalInboxItem} onUpdate={updateLocalInboxItem} onStatusChange={changeInboxItemStatus} onDelete={deleteInboxItem} onRestore={restorePrivateSharedData} onSync={syncInboxWithCloud} onCreateBlogDraft={createBlogDraftFromInbox} onClose={() => setIsInboxOpen(false)} /></Suspense>}
      {isTempTextOpen && <div className="fixed inset-0 z-[65] bg-[#07191d]/35 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setIsTempTextOpen(false); }}>
        <aside className="baize-panel ml-auto flex h-full w-full max-w-lg flex-col border-y-0 border-r-0 p-5">
          <header className="mb-4 flex items-center justify-between">
            <div><h2 className="text-xl font-bold text-[#173b41] dark:text-[#f4f1e8]">临时文本</h2><p className="mt-1 text-xs text-[#718986]">本机自动保存；同步到 GitHub 时只上传密文。</p></div>
            <button className="baize-icon-button" onClick={() => setIsTempTextOpen(false)} aria-label="关闭临时文本"><X size={20} /></button>
          </header>
          <textarea id="temp-text-editor" autoFocus value={tempText} onChange={event => { setTempText(event.target.value); setIsCopied(false); }} placeholder="粘贴或输入临时内容…" className="baize-input min-h-0 flex-1 resize-none font-mono leading-6" />
          <details className="mt-4 rounded-xl border border-[#5f8f84]/15 bg-white/20 p-3 dark:border-[#c9a96b]/10 dark:bg-[#07191d]/20">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-[#456b68] dark:text-[#d9ddd6]"><Lock size={16} />GitHub 加密同步</summary>
            <div className="mt-3 space-y-2">
              <p className="text-xs text-[#718986]">目标：{siteConfig.repository.owner}/{siteConfig.repository.repo} · {siteConfig.repository.branch}。密码不会保存；本机 LocalStorage 仍保留明文。</p>
              <input type="password" autoComplete="new-password" spellCheck={false} className="baize-input font-mono" value={noteGithubToken} onChange={event => setNoteGithubToken(event.target.value)} placeholder="GitHub Token" />
              <input type="password" autoComplete="new-password" className="baize-input" value={notePassword} onChange={event => setNotePassword(event.target.value)} placeholder="加密密码（至少 12 字符）" />
              <input type="password" autoComplete="new-password" className="baize-input" value={notePasswordConfirm} onChange={event => setNotePasswordConfirm(event.target.value)} placeholder="再次输入密码（仅上传时需要）" />
              <div className="grid grid-cols-2 gap-2">
                <button disabled={noteSyncState.busy || !noteGithubToken || !notePassword} className="baize-button-secondary" onClick={downloadEncryptedNote}><Download size={16} />读取并解密</button>
                <button disabled={noteSyncState.busy || !noteGithubToken || !notePassword || !tempText} className="baize-button-primary" onClick={uploadEncryptedNote}><Upload size={16} />加密并提交</button>
              </div>
              {noteSyncState.message && <p className={`break-all rounded-lg p-2 text-xs ${noteSyncState.error ? 'bg-[#a85d50]/10 text-[#985247] dark:text-[#e1a294]' : 'bg-[#5f8f84]/10 text-[#315e5b] dark:text-[#b8cec7]'}`}>{noteSyncState.message}</p>}
            </div>
          </details>
          <footer className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-[#718986]">{tempText.length} 字符</span>
            <div className="flex flex-wrap justify-end gap-2">
              <button className="baize-danger-button" disabled={!tempText} onClick={() => { if (confirm('确定清空临时文本吗？')) setTempText(''); }}><Trash2 size={16} />清空</button>
              <button className="baize-button-secondary" disabled={!tempText} onClick={() => setIsTempTextQrOpen(true)}><QrCode size={16} />二维码传输</button>
              <button className="baize-button-primary" disabled={!tempText} onClick={async () => { await navigator.clipboard.writeText(tempText); setIsCopied(true); window.setTimeout(() => setIsCopied(false), 1500); }}>{isCopied ? <Check size={16} /> : <Copy size={16} />}{isCopied ? '已复制' : '复制'}</button>
            </div>
          </footer>
        </aside>
      </div>}
      {qrSite && <Suspense fallback={null}><QrCodeModal site={qrSite} onClose={() => setQrSite(null)} /></Suspense>}
      {isTempTextQrOpen && <Suspense fallback={null}><TempTextQrModal text={tempText} onClose={() => setIsTempTextQrOpen(false)} /></Suspense>}
      {incomingTempText !== null && <Suspense fallback={null}><TextTransferReceiveModal text={incomingTempText} currentText={tempText} onClose={closeIncomingTransfer} onAccept={() => { setTempText(incomingTempText); setIsTempTextOpen(true); closeIncomingTransfer(); }} /></Suspense>}
      {captureMounted && <Suspense fallback={null}><ShareCapturePanel open={captureOpen} incoming={incomingShare} onCapture={createLocalInboxItem} onClose={() => setCaptureOpen(false)} /></Suspense>}
      {isCommandPaletteOpen && <Suspense fallback={null}><CommandPalette open sites={data.sites} categories={categories} textNodes={textNodes} actions={commandActions} inboxItems={inboxItems} temporaryVisits={temporaryVisitSummaries} translationHistory={translationHistory} onOpenInboxItem={id => { setFocusedInboxId(id); openInbox(); }} onUseTranslation={item => { setTranslationText(item.sourceText); setTranslatedText(item.translatedText); setSourceLanguage(item.sourceLanguage); setTargetLanguage(item.targetLanguage); setTranslationState({ loading: false, error: '' }); setIsTranslatorOpen(true); focusAfterRender('translation-input'); }} onTemporaryVisit={visitTemporaryUrl} onOpenTechOs={id => { setFocusedTechOsId(id); openTechOs(); }} onVisit={recordVisit} onClose={() => setIsCommandPaletteOpen(false)} /></Suspense>}
      {storagePersistence.issues.length > 0 && <aside
        className="fixed inset-x-4 z-[110] mx-auto flex max-w-2xl flex-wrap items-center gap-2 rounded-2xl border border-[#a85d50]/30 bg-[#fff7ee]/96 p-3 shadow-2xl backdrop-blur-xl dark:border-[#d58a78]/25 dark:bg-[#2a1c1a]/96"
        style={{ bottom: appUpdateReady ? '10.5rem' : '5rem' }}
        role="alert"
        aria-live="assertive"
      >
        <AlertTriangle size={18} className="shrink-0 text-[#a85d50] dark:text-[#e1a294]" />
        <p className="min-w-48 flex-1 text-xs leading-5 text-[#74473f] dark:text-[#f0c0b4]">{storageWarningText}{storagePersistence.issues.length > 1 ? `（另有 ${storagePersistence.issues.length - 1} 项）` : ''}</p>
        <button type="button" className="baize-button-secondary shrink-0 px-3 py-1.5 text-xs" onClick={retryStoragePersistence}><RefreshCw size={14} />重试保存</button>
        {importantStorageIssue && <button type="button" className="baize-button-primary shrink-0 px-3 py-1.5 text-xs" onClick={exportUnsavedBackup}><Download size={14} />导出备份</button>}
      </aside>}
      {draftRecoveryNotice && <aside
        className="fixed inset-x-4 z-[109] mx-auto flex max-w-2xl flex-wrap items-center gap-2 rounded-2xl border border-[#c9a96b]/35 bg-[#f8f2df]/96 p-3 shadow-2xl backdrop-blur-xl dark:border-[#c9a96b]/25 dark:bg-[#292719]/96"
        style={{ bottom: storagePersistence.issues.length > 0 ? (appUpdateReady ? '17rem' : '11.5rem') : (appUpdateReady ? '10.5rem' : '5rem') }}
        role="status" aria-live="polite"
      >
        <FileText size={18} className="shrink-0 text-[#886d32] dark:text-[#dfc68e]" />
        <p className="min-w-48 flex-1 text-xs leading-5 text-[#6f5b31] dark:text-[#ead9aa]">检测到无效导航草稿，页面已回退到仓库数据；原文保存在 <code>{NAVIGATION_DRAFT_RECOVERY_KEY}</code>，未被静默丢弃。</p>
        <button type="button" className="baize-button-primary shrink-0 px-3 py-1.5 text-xs" onClick={downloadRecoveredNavigationDraft}><Download size={14} />下载原草稿</button>
        <button type="button" className="baize-icon-button shrink-0 p-1.5" aria-label="关闭草稿恢复提示" onClick={() => setDraftRecoveryNotice(false)}><X size={15} /></button>
      </aside>}
      {appUpdateReady && <aside className="fixed inset-x-4 bottom-20 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#5f8f84]/25 bg-[#f4f1e8]/96 p-3 shadow-2xl backdrop-blur-xl dark:border-[#c9a96b]/20 dark:bg-[#102c33]/96" role="status" aria-live="polite"><RefreshCw size={18} className="shrink-0 text-[#356b66] dark:text-[#d2b775]" /><p className="min-w-0 flex-1 text-xs leading-5 text-[#456b68] dark:text-[#d9ddd6]">新版本已准备好。请先保存正在编辑的表单，再更新页面。</p><button type="button" className="baize-button-primary shrink-0 px-3 py-1.5 text-xs" disabled={Boolean(importantStorageIssue)} onClick={() => { try { sessionStorage.removeItem('baize_app_update_ready'); } catch { /* Update can proceed without session storage. */ } void activateAppUpdate(); }}>保存后更新</button><button type="button" className="baize-icon-button shrink-0 p-1.5" aria-label="稍后刷新" onClick={() => { try { sessionStorage.removeItem('baize_app_update_ready'); } catch { /* Dismiss in memory. */ } setAppUpdateReady(false); }}><X size={16} /></button></aside>}
      <RestOverlay open={restOpen} onClose={closeRest} />
    </div>
  );
}

export default App;
