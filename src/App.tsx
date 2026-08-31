import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import Fuse from 'fuse.js';
import { ArrowLeftRight, BrainCircuit, Check, ChevronUp, Command, Copy, Download, ExternalLink, FileText, Inbox as InboxIcon, Languages, Lock, Menu, Network, Plus, QrCode, Search, Trash2, Upload, X } from 'lucide-react';
import { AdminPanel, type AdminSection } from './components/AdminPanel';
import { Card } from './components/Card';
import { CommandPalette, type CommandPaletteAction } from './components/CommandPalette';
import { HotFeedPanel } from './components/HotFeedPanel';
import { InboxPanel } from './components/inbox/InboxPanel';
import { QrCodeModal } from './components/QrCodeModal';
import { Sidebar } from './components/Sidebar';
import { TempTextQrModal, TextTransferReceiveModal } from './components/TempTextTransferModals';
import { TemporaryVisitsPanel } from './components/TemporaryVisitsPanel';
import { TranslationHistoryPanel } from './components/TranslationHistoryPanel';
import { defaultNavigationData, searchEngines, siteConfig } from './data';
import { CLICK_STATS_KEY, getTodayClicks, loadClickStats, localDateKey, recordSiteVisit, type ClickStatsStore } from './lib/activityStats';
import { checkLinksFromBrowser, loadLinkHealthReport, type LinkHealthEntry } from './lib/linkHealth';
import { getTemporaryVisitSummaries, loadTemporaryVisits, normalizeTemporaryUrl, pruneTemporaryVisits, recordTemporaryVisit, removeTemporaryVisit, TEMPORARY_VISITS_KEY, temporaryUrlKey, type TemporaryVisitsStore } from './lib/temporaryVisits';
import { addTranslationHistory, loadTranslationHistory, TRANSLATION_HISTORY_KEY, type TranslationHistoryItem } from './lib/translationHistory';
import { parseTextTransferHash } from './lib/textTransfer';
import { createInboxBlogDraft, type BlogDraftInput } from './services/blogDraft';
import { decryptNote, encryptNote } from './services/encryptedNote';
import { getEncryptedNote, saveEncryptedNote } from './services/github';
import { createInboxItem, loadInbox, normalizeInboxDraft, saveInbox, setInboxItemStatus, softDeleteInboxItem, updateInboxItem } from './services/inbox';
import { createInboxSyncMeta, loadInboxSyncMeta, saveInboxSyncMeta, synchronizeInbox } from './services/inboxSync';
import { loadCachedTextIndex, loadTextIndex } from './services/textNetwork';
import type { InboxDraft, InboxItem, InboxItemStatus } from './types/inbox';
import type { InboxSyncUiState } from './types/inbox-sync';
import type { NavigationData, Site } from './types/navigation';
import { loadSceneMode, SCENE_MODE_KEY, type SceneMode } from './types/scene';
import type { TextNode } from './types/text-network';

const DRAFT_KEY = 'nav_cms_draft';
const TEMP_TEXT_KEY = 'nav_temp_text';
const TRANSLATOR_COLLAPSED_KEY = 'nav_translator_collapsed';
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

function isNavigationData(value: unknown): value is NavigationData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<NavigationData>;
  return Array.isArray(data.sites) && Array.isArray(data.categories) && Array.isArray(data.layout);
}

function loadInitialData(): NavigationData {
  const savedDraft = localStorage.getItem(DRAFT_KEY);
  if (!savedDraft) return defaultNavigationData;
  try {
    const parsed: unknown = JSON.parse(savedDraft);
    return isNavigationData(parsed) ? parsed : defaultNavigationData;
  } catch {
    console.error('无法读取本地导航草稿。');
    return defaultNavigationData;
  }
}

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [data, setData] = useState<NavigationData>(loadInitialData);
  const [textNodes, setTextNodes] = useState<TextNode[]>(() => loadCachedTextIndex()?.nodes || []);
  const [activeCategory, setActiveCategory] = useState(defaultNavigationData.categories[0]?.id || '');
  const [search, setSearch] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [isAutoGradient, setIsAutoGradient] = useState(true);
  const [sceneMode, setSceneMode] = useState<SceneMode>(loadSceneMode);
  const [mainGradient, setMainGradient] = useState('');
  const [sidebarGradient, setSidebarGradient] = useState('');
  const [isAdminOpen, setIsAdminOpen] = useState(window.location.hash === '#/admin');
  const [isTechOsOpen, setIsTechOsOpen] = useState(window.location.hash === '#/tech-os');
  const [adminSection, setAdminSection] = useState<AdminSection>('content');
  const [isTempTextOpen, setIsTempTextOpen] = useState(false);
  const [isTempTextQrOpen, setIsTempTextQrOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [captureRequest, setCaptureRequest] = useState(0);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>(loadInbox);
  const [inboxSyncMeta, setInboxSyncMeta] = useState(loadInboxSyncMeta);
  const [inboxSyncState, setInboxSyncState] = useState<InboxSyncUiState>({ phase: 'idle' });
  const [incomingTempText, setIncomingTempText] = useState<string | null>(null);
  const [tempText, setTempText] = useState(() => localStorage.getItem(TEMP_TEXT_KEY) || '');
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
  const [isTranslatorOpen, setIsTranslatorOpen] = useState(() => localStorage.getItem(TRANSLATOR_COLLAPSED_KEY) !== 'true');
  const [linkHealthEntries, setLinkHealthEntries] = useState<LinkHealthEntry[]>([]);
  const [isLinkHealthLoading, setIsLinkHealthLoading] = useState(false);
  const [clickStats, setClickStats] = useState<ClickStatsStore>(loadClickStats);
  const [temporaryVisits, setTemporaryVisits] = useState<TemporaryVisitsStore>(loadTemporaryVisits);
  const [currentDate, setCurrentDate] = useState(localDateKey);
  const [qrSite, setQrSite] = useState<Site | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const isWorkMode = sceneMode === 'work';

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const dark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);

  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    localStorage.setItem(CLICK_STATS_KEY, JSON.stringify(clickStats));
  }, [clickStats]);

  useEffect(() => {
    localStorage.setItem(TEMPORARY_VISITS_KEY, JSON.stringify(temporaryVisits));
  }, [temporaryVisits]);

  useEffect(() => {
    localStorage.setItem(TRANSLATION_HISTORY_KEY, JSON.stringify(translationHistory));
  }, [translationHistory]);

  useEffect(() => {
    localStorage.setItem(TEMP_TEXT_KEY, tempText);
  }, [tempText]);

  useEffect(() => {
    let cancelled = false;
    void loadTextIndex().then(index => {
      if (!cancelled && index) setTextNodes(index.nodes);
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
      setIsAdminOpen(window.location.hash === '#/admin');
      setIsTechOsOpen(window.location.hash === '#/tech-os');
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

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
    if (!isAutoGradient) {
      setMainGradient('');
      setSidebarGradient('');
      return;
    }
    const updateGradient = () => {
      const isDay = new Date().getHours() >= 6 && new Date().getHours() < 18;
      setMainGradient(isDay
        ? 'bg-[#eef3ed]/35 dark:bg-[#07191d]/55'
        : 'bg-[#0b242a]/55 dark:bg-[#061418]/70');
      setSidebarGradient(isDay
        ? 'bg-[#f4f1e8]/82 dark:bg-[#102c33]/88'
        : 'bg-[#e8eee9]/78 dark:bg-[#091f25]/92');
    };
    updateGradient();
    const interval = window.setInterval(updateGradient, 60_000);
    return () => window.clearInterval(interval);
  }, [isAutoGradient]);

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
    if (!search.trim() || activeEngine) return new Set(data.sites.map(site => site.id));
    return new Set(fuse.search(search.trim()).map(result => result.item.id));
  }, [activeEngine, data.sites, fuse, search]);
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
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

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
    localStorage.setItem(SCENE_MODE_KEY, mode);
    localStorage.setItem('work_mode', String(mode === 'work'));
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
    try {
      const params = new URLSearchParams({ q: translationText, langpair: `${sourceLanguage}|${targetLanguage}` });
      const response = await fetch(`https://api.mymemory.translated.net/get?${params}`);
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
      setTranslationState({ loading: false, error: error instanceof Error ? error.message : '翻译失败，请稍后再试。' });
    }
  };

  const backgroundOpacity = sceneMode === 'work' ? 'opacity-0' : sceneMode === 'study' ? 'opacity-55' : sceneMode === 'relax' ? 'opacity-80' : 'opacity-100';
  const sceneOverlay = sceneMode === 'work'
    ? 'bg-[#f1f3f0] dark:bg-[#0c1618]'
    : sceneMode === 'study'
      ? 'bg-[#eef2e6]/55 dark:bg-[#0a1c21]/65'
      : sceneMode === 'relax'
        ? 'bg-[#efe2cb]/35 dark:bg-[#1b1714]/55'
        : mainGradient;
  const sceneSidebar = sceneMode === 'work'
    ? 'bg-[#f8f9f7] dark:bg-[#111c1f]'
    : sceneMode === 'study'
      ? 'bg-[#f3f3e7]/88 dark:bg-[#102b2c]/92'
      : sceneMode === 'relax'
        ? 'bg-[#f3e8d7]/88 dark:bg-[#211d19]/92'
        : sidebarGradient;
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
    if (inboxSyncState.phase === 'syncing') return '正在同步，请等待完成后再保存。';
    try {
      const item = createInboxItem(draft);
      return replaceInboxItems([item, ...inboxItems]) ? null : '浏览器无法写入本地存储，请检查隐私或空间设置。';
    } catch (error) {
      return error instanceof Error ? error.message : '无法保存这条记录。';
    }
  };
  const updateLocalInboxItem = (id: string, draft: InboxDraft): string | null => {
    if (inboxSyncState.phase === 'syncing') return '正在同步，请等待完成后再编辑。';
    try {
      const normalized = normalizeInboxDraft(draft);
      return replaceInboxItems(updateInboxItem(inboxItems, id, normalized)) ? null : '浏览器无法写入本地存储，请检查隐私或空间设置。';
    } catch (error) {
      return error instanceof Error ? error.message : '无法更新这条记录。';
    }
  };
  const changeInboxItemStatus = (id: string, status: InboxItemStatus) => {
    if (inboxSyncState.phase === 'syncing') {
      alert('正在同步，请等待完成后再修改状态。');
      return;
    }
    if (!replaceInboxItems(setInboxItemStatus(inboxItems, id, status))) alert('无法保存 Inbox 状态，请检查浏览器本地存储。');
  };
  const archiveInboxItems = (ids: string[]) => {
    if (!ids.length) return;
    if (inboxSyncState.phase === 'syncing') {
      alert('Tech OS 已提交，但 Inbox 正在同步；请稍后手动归档来源记录。');
      return;
    }
    const now = new Date();
    const nextItems = ids.reduce((current, id) => setInboxItemStatus(current, id, 'archived', now), inboxItems);
    if (!replaceInboxItems(nextItems)) alert('Tech OS 已提交，但无法保存 Inbox 归档状态；请检查浏览器本地存储。');
  };
  const deleteInboxItem = (id: string) => {
    if (inboxSyncState.phase === 'syncing') {
      alert('正在同步，请等待完成后再删除。');
      return;
    }
    if (!replaceInboxItems(softDeleteInboxItem(inboxItems, id))) alert('无法保存删除标记，请检查浏览器本地存储。');
  };
  const syncInboxWithCloud = async (token: string, password: string): Promise<void> => {
    setInboxSyncState({ phase: 'syncing', message: '正在读取远端密文并合并…' });
    try {
      const result = await synchronizeInbox(inboxItems, siteConfig.repository, token, password);
      setInboxItems(result.items);
      if (!saveInbox(result.items)) {
        setInboxSyncState({ phase: 'error', message: '云端已同步，但浏览器无法持久化合并结果；请不要刷新并检查本地存储设置。', commitUrl: result.commitUrl });
        return;
      }
      const meta = createInboxSyncMeta(result.items, result.syncedAt);
      setInboxSyncMeta(meta);
      if (!saveInboxSyncMeta(meta)) {
        setInboxSyncState({ phase: 'error', message: 'Inbox 已同步，但本机无法保存同步标记；内容没有丢失。', commitUrl: result.commitUrl });
        return;
      }
      setInboxSyncState({ phase: 'synced', message: `合并同步完成：${result.items.filter(item => !item.deletedAt).length} 条可见记录。`, commitUrl: result.commitUrl });
    } catch (error) {
      setInboxSyncState({ phase: 'error', message: error instanceof Error ? error.message : 'Inbox 同步失败；本机内容已保留。' });
    }
  };
  const createBlogDraftFromInbox = async (item: InboxItem, input: BlogDraftInput, token: string) => {
    if (inboxSyncState.phase === 'syncing') throw new Error('正在同步 Inbox，请等待完成后再创建博客草稿。');
    const result = await createInboxBlogDraft(item, input, token, siteConfig.blogRepository);
    const sourceArchived = item.status === 'archived'
      || replaceInboxItems(setInboxItemStatus(inboxItems, item.id, 'archived'));
    return { ...result, sourceArchived };
  };
  const inboxCount = inboxItems.filter(item => !item.deletedAt && item.status === 'inbox').length;
  const showInboxLauncher = !isAdminOpen
    && !isInboxOpen
    && !isTempTextOpen
    && !isTempTextQrOpen
    && incomingTempText === null
    && !qrSite
    && !isCommandPaletteOpen;
  const commandActions: CommandPaletteAction[] = [
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
    { id: 'theme', title: isDark ? '切换到浅色主题' : '切换到深色主题', description: '立即切换页面明暗外观', keywords: ['theme', '主题', 'dark', 'light'], icon: isDark ? 'sun' : 'moon', run: toggleTheme },
    { id: 'scene-default', title: '切换到日常场景', description: sceneMode === 'default' ? '当前正在使用' : '恢复完整背景与标准布局', keywords: ['scene', '场景', '日常'], icon: 'default', run: () => changeSceneMode('default') },
    { id: 'scene-work', title: '切换到工作场景', description: sceneMode === 'work' ? '当前正在使用' : '隐藏装饰并压缩卡片布局', keywords: ['scene', '场景', '工作'], icon: 'work', run: () => changeSceneMode('work') },
    { id: 'scene-study', title: '切换到学习场景', description: sceneMode === 'study' ? '当前正在使用' : '降低背景干扰并保持阅读感', keywords: ['scene', '场景', '学习'], icon: 'study', run: () => changeSceneMode('study') },
    { id: 'scene-relax', title: '切换到休闲场景', description: sceneMode === 'relax' ? '当前正在使用' : '使用更温暖柔和的页面氛围', keywords: ['scene', '场景', '休闲'], icon: 'relax', run: () => changeSceneMode('relax') },
    { id: 'github', title: '打开个人 GitHub', description: siteConfig.github, keywords: ['github', '代码'], icon: 'github', run: () => { window.open(siteConfig.github, '_blank', 'noopener,noreferrer'); } },
    ...(installPrompt ? [{ id: 'install', title: '安装白泽导航', description: '将当前站点安装到设备', keywords: ['pwa', '安装', 'install'], icon: 'install' as const, run: () => { void installApp(); } }] : []),
  ];

  if (isTechOsOpen) {
    return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#dce6e1] text-sm font-medium text-[#456b68] dark:bg-[#07191d] dark:text-[#d9ddd6]">正在载入 Tech OS…</div>}>
      <TechOsWorkspace
        isDark={isDark}
        inboxCount={inboxCount}
        inboxItems={inboxItems}
        onToggleTheme={toggleTheme}
        onOpenInbox={() => { closeTechOs(); openInbox(); }}
        onArchiveInboxItems={archiveInboxItems}
        onClose={closeTechOs}
        repository={siteConfig.repository}
      />
    </Suspense>;
  }

  return (
    <div className={`scene-${sceneMode} ${isWorkMode ? 'work-mode' : ''} ${isAdminOpen ? 'admin-open' : ''} min-h-screen bg-[#dce6e1] font-sans transition-colors duration-300 dark:bg-[#07191d]`}>
      <div className={`site-background fixed inset-0 z-0 transition-opacity duration-300 ${backgroundOpacity}`} style={{ backgroundImage: `url(${import.meta.env.BASE_URL}baize-background.webp)` }} aria-hidden="true" />
      <div className={`scene-overlay fixed inset-0 z-0 transition-colors duration-500 ${sceneOverlay}`} aria-hidden="true" />
      <Sidebar
        activeCategory={activeCategory}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isDark={isDark}
        toggleTheme={toggleTheme}
        categories={categories}
        onAdminClick={() => openAdmin('content')}
        sceneMode={sceneMode}
        onSceneModeChange={changeSceneMode}
        onTempTextClick={() => setIsTempTextOpen(true)}
        tempText={tempText}
        onTempTextChange={value => { setTempText(value); setIsCopied(false); }}
        isAutoGradient={isAutoGradient}
        toggleAutoGradient={() => setIsAutoGradient(value => !value)}
        customGradient={sceneSidebar}
        canInstall={Boolean(installPrompt)}
        onInstall={() => { void installApp(); }}
      />

      <main className="relative z-10 min-h-screen bg-transparent p-4 lg:ml-64 lg:p-8">
        <div className="baize-toolbar sticky top-0 z-30 -mx-4 mb-8 px-4 py-4 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="baize-icon-button -ml-2 lg:hidden"><Menu size={24} /></button>
            <div className="group relative max-w-2xl flex-1">
              <div className="absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[#6f8984] group-focus-within:text-[#356b66] dark:group-focus-within:text-[#d2b775]">{activeEngine ? <span className="text-lg font-bold">{activeEngine.icon}</span> : <Search size={20} />}</div>
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
                {searchEngines.map(engine => <button key={engine.prefix} onClick={() => { const query = activeEngine ? search.slice(activeEngine.prefix.length + 1) : search; setSearch(`${engine.prefix} ${query}`); document.getElementById('search-input')?.focus(); }} className="baize-chip">{engine.icon} {engine.name}</button>)}
              </div>
            </div>
            <button type="button" onClick={() => setIsCommandPaletteOpen(true)} className="baize-button-secondary shrink-0 px-3" aria-label="打开全局命令面板"><Command size={18} /><span className="hidden md:inline">命令</span><kbd className="hidden rounded border border-[#5f8f84]/20 px-1.5 py-0.5 text-[10px] text-[#718986] lg:inline">Ctrl K</kbd></button>
          </div>
        </div>

        <div className="navigation-content mx-auto max-w-7xl space-y-12 pb-12">
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
            <HotFeedPanel reportUrl={`${import.meta.env.BASE_URL}hot-feed.json`} compact={isWorkMode} />
            <TemporaryVisitsPanel
              visits={temporaryVisitSummaries}
              onVisit={visitTemporaryUrl}
              onDelete={key => setTemporaryVisits(current => removeTemporaryVisit(current, key))}
              onClear={() => setTemporaryVisits(current => ({ ...current, records: [] }))}
            />
            {!isTranslatorOpen && <button type="button" className="baize-button-secondary utility-launcher-button" aria-controls="quick-translator" aria-expanded="false" onClick={() => { localStorage.setItem(TRANSLATOR_COLLAPSED_KEY, 'false'); setIsTranslatorOpen(true); }}><Languages size={17} />翻译{translationHistory.length > 0 && <span className="utility-launcher-badge">{translationHistory.length}</span>}</button>}
            {isTranslatorOpen && <section id="quick-translator" className="baize-panel basis-full rounded-2xl p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-[#456b68] dark:text-[#d9ddd6]"><Languages size={17} />快捷翻译</span>
              <button type="button" className="baize-icon-button flex items-center gap-1 text-xs" aria-expanded="true" onClick={() => { localStorage.setItem(TRANSLATOR_COLLAPSED_KEY, 'true'); setIsTranslatorOpen(false); }}><ChevronUp size={16} />收起</button>
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
            if (!sites.length && search.trim()) return null;
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

      {isAdminOpen && <AdminPanel data={data} initialSection={adminSection} defaultRepository={siteConfig.repository} linkHealthEntries={linkHealthEntries} isLinkHealthLoading={isLinkHealthLoading} onRefreshLinkHealth={refreshLinkHealth} onRunBrowserLinkHealthCheck={runBrowserLinkHealthCheck} clickStats={clickStats} onClearClickStats={() => setClickStats({ version: 2, days: {} })} onChange={setData} onReset={() => { localStorage.removeItem(DRAFT_KEY); setData(defaultNavigationData); }} onClose={closeAdmin} />}
      <InboxPanel open={isInboxOpen} captureRequest={captureRequest} items={inboxItems} repositoryLabel={`${siteConfig.repository.owner}/${siteConfig.repository.repo} · ${siteConfig.repository.branch}`} blogRepositoryLabel={`${siteConfig.blogRepository.owner}/${siteConfig.blogRepository.repo} · ${siteConfig.blogRepository.branch}`} syncMeta={inboxSyncMeta} syncState={inboxSyncState} onCreate={createLocalInboxItem} onUpdate={updateLocalInboxItem} onStatusChange={changeInboxItemStatus} onDelete={deleteInboxItem} onSync={syncInboxWithCloud} onCreateBlogDraft={createBlogDraftFromInbox} onClose={() => setIsInboxOpen(false)} />
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
      <QrCodeModal site={qrSite} onClose={() => setQrSite(null)} />
      {isTempTextQrOpen && <TempTextQrModal text={tempText} onClose={() => setIsTempTextQrOpen(false)} />}
      {incomingTempText !== null && <TextTransferReceiveModal text={incomingTempText} currentText={tempText} onClose={closeIncomingTransfer} onAccept={() => { setTempText(incomingTempText); setIsTempTextOpen(true); closeIncomingTransfer(); }} />}
      <CommandPalette open={isCommandPaletteOpen} sites={data.sites} categories={categories} textNodes={textNodes} actions={commandActions} onVisit={recordVisit} onClose={() => setIsCommandPaletteOpen(false)} />
    </div>
  );
}

export default App;
