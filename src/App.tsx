import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import Fuse from 'fuse.js';
import { ArrowLeftRight, Check, ChevronDown, ChevronUp, Copy, Download, Languages, Lock, Menu, Search, Trash2, Upload, X } from 'lucide-react';
import { AdminPanel } from './components/AdminPanel';
import { Card } from './components/Card';
import { Sidebar } from './components/Sidebar';
import { defaultNavigationData, searchEngines, siteConfig } from './data';
import { loadLinkHealthReport, type LinkHealthEntry } from './lib/linkHealth';
import { decryptNote, encryptNote } from './services/encryptedNote';
import { getEncryptedNote, saveEncryptedNote } from './services/github';
import type { NavigationData } from './types/navigation';

const DRAFT_KEY = 'nav_cms_draft';
const CLICK_STATS_KEY = 'nav_daily_click_stats';
const TEMP_TEXT_KEY = 'nav_temp_text';
const TRANSLATOR_COLLAPSED_KEY = 'nav_translator_collapsed';
const TRANSLATION_LANGUAGES = [
  ['zh-CN', '简体中文'], ['en', '英语'], ['ja', '日语'], ['ko', '韩语'],
  ['fr', '法语'], ['de', '德语'], ['es', '西班牙语'], ['ru', '俄语'],
] as const;

interface DailyClickStats {
  date: string;
  clicks: Record<string, { count: number; lastClicked: number }>;
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadDailyClickStats(): DailyClickStats {
  const today = localDateKey();
  try {
    const saved = localStorage.getItem(CLICK_STATS_KEY);
    if (!saved) return { date: today, clicks: {} };
    const parsed = JSON.parse(saved) as Partial<DailyClickStats>;
    if (parsed.date !== today || !parsed.clicks || typeof parsed.clicks !== 'object') return { date: today, clicks: {} };
    return { date: today, clicks: parsed.clicks };
  } catch {
    return { date: today, clicks: {} };
  }
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
  const [data, setData] = useState<NavigationData>(loadInitialData);
  const [activeCategory, setActiveCategory] = useState(defaultNavigationData.categories[0]?.id || '');
  const [search, setSearch] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [isAutoGradient, setIsAutoGradient] = useState(true);
  const [isWorkMode, setIsWorkMode] = useState(() => localStorage.getItem('work_mode') === 'true');
  const [mainGradient, setMainGradient] = useState('');
  const [sidebarGradient, setSidebarGradient] = useState('');
  const [isAdminOpen, setIsAdminOpen] = useState(window.location.hash === '#/admin');
  const [isTempTextOpen, setIsTempTextOpen] = useState(false);
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
  const [isTranslatorOpen, setIsTranslatorOpen] = useState(() => localStorage.getItem(TRANSLATOR_COLLAPSED_KEY) !== 'true');
  const [linkHealthEntries, setLinkHealthEntries] = useState<LinkHealthEntry[]>([]);
  const [isLinkHealthLoading, setIsLinkHealthLoading] = useState(false);
  const [clickStats, setClickStats] = useState<DailyClickStats>(loadDailyClickStats);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

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
    localStorage.setItem(TEMP_TEXT_KEY, tempText);
  }, [tempText]);

  const refreshLinkHealth = useCallback(async () => {
    setIsLinkHealthLoading(true);
    const entries = await loadLinkHealthReport(`${import.meta.env.BASE_URL}link-health.json`);
    setLinkHealthEntries(entries);
    setIsLinkHealthLoading(false);
  }, []);

  useEffect(() => { void refreshLinkHealth(); }, [refreshLinkHealth]);

  useEffect(() => {
    const checkDate = () => {
      const today = localDateKey();
      setClickStats(current => current.date === today ? current : { date: today, clicks: {} });
    };
    const interval = window.setInterval(checkDate, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleHash = () => setIsAdminOpen(window.location.hash === '#/admin');
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
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
        document.getElementById('search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categories = useMemo(() => [...data.categories].sort((a, b) => a.order - b.order), [data.categories]);
  const linkHealth = useMemo(() => Object.fromEntries(linkHealthEntries.map(entry => [entry.siteId, entry])), [linkHealthEntries]);
  const layoutOrder = useMemo(() => new Map(data.layout.map(item => [item.siteId, item.order])), [data.layout]);
  const commonCategoryId = useMemo(() => categories.find(category => category.id === 'common' || category.name === '常用网站')?.id, [categories]);
  const popularSites = useMemo(() => {
    const ranked = [...data.sites].sort((a, b) => {
      const aStats = clickStats.clicks[a.id];
      const bStats = clickStats.clicks[b.id];
      return (bStats?.count || 0) - (aStats?.count || 0) || (bStats?.lastClicked || 0) - (aStats?.lastClicked || 0);
    }).filter(site => (clickStats.clicks[site.id]?.count || 0) > 0);
    const fallback = data.sites
      .filter(site => site.favorite || site.categoryId === commonCategoryId)
      .sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || (layoutOrder.get(a.id) ?? 9999) - (layoutOrder.get(b.id) ?? 9999));
    const result = new Map<string, (typeof data.sites)[number]>();
    [...ranked, ...fallback, ...data.sites].forEach(site => { if (result.size < 8) result.set(site.id, site); });
    return [...result.values()];
  }, [clickStats.clicks, commonCategoryId, data.sites, layoutOrder]);
  const activeEngine = useMemo(() => searchEngines.find(engine => search.startsWith(`${engine.prefix} `)), [search]);
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

  const visibleSiteIds = useMemo(() => {
    if (!search.trim() || activeEngine) return new Set(data.sites.map(site => site.id));
    return new Set(fuse.search(search.trim()).map(result => result.item.id));
  }, [activeEngine, data.sites, fuse, search]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const recordVisit = (siteId: string) => {
    const today = localDateKey();
    setClickStats(current => {
      const base = current.date === today ? current : { date: today, clicks: {} };
      const previous = base.clicks[siteId];
      return {
        date: today,
        clicks: {
          ...base.clicks,
          [siteId]: { count: (previous?.count || 0) + 1, lastClicked: Date.now() },
        },
      };
    });
  };

  const toggleWorkMode = () => {
    setIsWorkMode(current => {
      const next = !current;
      localStorage.setItem('work_mode', String(next));
      return next;
    });
  };

  const openAdmin = () => {
    window.location.hash = '/admin';
    setIsAdminOpen(true);
  };

  const closeAdmin = () => {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setIsAdminOpen(false);
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
      setTranslationState({ loading: false, error: '' });
    } catch (error) {
      setTranslationState({ loading: false, error: error instanceof Error ? error.message : '翻译失败，请稍后再试。' });
    }
  };

  return (
    <div className={`${isWorkMode ? 'work-mode' : ''} min-h-screen bg-[#dce6e1] font-sans transition-colors duration-300 dark:bg-[#07191d]`}>
      <div className={`site-background fixed inset-0 z-0 transition-opacity duration-300 ${isWorkMode ? 'opacity-0' : 'opacity-100'}`} style={{ backgroundImage: `url(${import.meta.env.BASE_URL}baize-background.webp)` }} aria-hidden="true" />
      <div className={`fixed inset-0 z-0 transition-colors duration-500 ${isWorkMode ? 'bg-[#f1f3f0] dark:bg-[#0c1618]' : mainGradient}`} aria-hidden="true" />
      <Sidebar
        activeCategory={activeCategory}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isDark={isDark}
        toggleTheme={toggleTheme}
        categories={categories}
        onAdminClick={openAdmin}
        isWorkMode={isWorkMode}
        toggleWorkMode={toggleWorkMode}
        onTempTextClick={() => setIsTempTextOpen(true)}
        tempText={tempText}
        onTempTextChange={value => { setTempText(value); setIsCopied(false); }}
        isAutoGradient={isAutoGradient}
        toggleAutoGradient={() => setIsAutoGradient(value => !value)}
        customGradient={isWorkMode ? 'bg-[#f8f9f7] dark:bg-[#111c1f]' : sidebarGradient}
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
                  }
                }}
                placeholder={activeEngine ? activeEngine.placeholder : "搜索网站，或输入 'g ' 使用 Google"}
                className="baize-input py-3 pl-10 pr-16 shadow-[0_10px_30px_-20px_rgba(16,44,51,0.6)]"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-[#5f8f84]/20 bg-[#5f8f84]/8 px-2 py-0.5 text-xs text-[#6f8984] dark:border-[#c9a96b]/15 dark:bg-[#c9a96b]/8 dark:text-[#baa978] sm:block">Ctrl K</kbd>
              <div className="pointer-events-none absolute left-0 top-full mt-2 flex w-full flex-wrap gap-2 px-1 opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                {searchEngines.map(engine => <button key={engine.prefix} onClick={() => { const query = activeEngine ? search.slice(activeEngine.prefix.length + 1) : search; setSearch(`${engine.prefix} ${query}`); document.getElementById('search-input')?.focus(); }} className="baize-chip">{engine.icon} {engine.name}</button>)}
              </div>
            </div>
          </div>
        </div>

        <div className="navigation-content mx-auto max-w-7xl space-y-12 pb-12">
          <section className="baize-panel rounded-2xl p-4 sm:p-5">
            <div className={isTranslatorOpen ? 'mb-3 flex items-center justify-between' : 'flex items-center justify-between'}>
              <span className="flex items-center gap-2 text-sm font-semibold text-[#456b68] dark:text-[#d9ddd6]"><Languages size={17} />快捷翻译</span>
              <button type="button" className="baize-icon-button flex items-center gap-1 text-xs" aria-expanded={isTranslatorOpen} onClick={() => setIsTranslatorOpen(current => { localStorage.setItem(TRANSLATOR_COLLAPSED_KEY, String(current)); return !current; })}>{isTranslatorOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}{isTranslatorOpen ? '收起' : '展开'}</button>
            </div>
            <form onSubmit={translateInline} className={isTranslatorOpen ? '' : 'hidden'}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="mr-auto text-xs text-[#718986]">选择翻译语言</span>
                <select value={sourceLanguage} onChange={event => setSourceLanguage(event.target.value)} className="baize-input w-auto py-1.5">{TRANSLATION_LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>
                <button type="button" className="baize-icon-button" aria-label="互换翻译语言" onClick={() => { setSourceLanguage(targetLanguage); setTargetLanguage(sourceLanguage); if (translatedText) { setTranslationText(translatedText); setTranslatedText(''); } }}><ArrowLeftRight size={17} /></button>
                <select value={targetLanguage} onChange={event => setTargetLanguage(event.target.value)} className="baize-input w-auto py-1.5">{TRANSLATION_LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <textarea required value={translationText} onChange={event => { setTranslationText(event.target.value); setTranslationState({ loading: false, error: '' }); }} rows={5} className="baize-input resize-y" placeholder="输入要翻译的单句或短段落…" />
                <div className="baize-input relative min-h-32 whitespace-pre-wrap"><span className={translatedText ? '' : 'text-[#8aa39d]'}>{translatedText || '翻译结果会显示在这里'}</span>{translatedText && <button type="button" className="baize-icon-button absolute right-2 top-2" aria-label="复制翻译结果" onClick={() => navigator.clipboard.writeText(translatedText)}><Copy size={15} /></button>}</div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className={`text-xs ${translationState.error ? 'text-[#985247] dark:text-[#e1a294]' : 'text-[#718986]'}`}>{translationState.error || '直接调用 MyMemory 免费接口；请勿翻译敏感文本，单次最多 500 字节。'}</p>
                <div className="flex gap-2"><a className="baize-button-secondary" target="_blank" rel="noreferrer" href={`https://translate.google.com/?sl=${encodeURIComponent(sourceLanguage)}&tl=${encodeURIComponent(targetLanguage)}&text=${encodeURIComponent(translationText)}&op=translate`}>Google 回退</a><button disabled={translationState.loading || !translationText.trim()} className="baize-button-primary" type="submit"><Languages size={17} />{translationState.loading ? '翻译中…' : '立即翻译'}</button></div>
              </div>
            </form>
          </section>
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
                  return <div key={site.id} className="grid-site min-w-0" data-positioned={positioned} style={style}><Card site={site} onVisit={recordVisit} dailyVisits={category.id === commonCategoryId ? clickStats.clicks[site.id]?.count || 0 : 0} health={health} /></div>;
                })}</div>
              </section>
            );
          })}
          {search.trim() && !activeEngine && visibleSiteIds.size === 0 && <div className="baize-panel rounded-2xl py-20 text-center text-[#64807c]"><p className="text-lg">云海茫茫，未找到相关网站</p><button onClick={() => setSearch('')} className="mt-4 font-medium text-[#356b66] hover:underline dark:text-[#d2b775]">清除搜索</button></div>}
          {activeEngine && <div className="baize-panel rounded-2xl p-6 text-center font-medium text-[#356b66] dark:text-[#d9c386]">按 Enter 使用 {activeEngine.name} 搜索</div>}
        </div>
      </main>

      {isAdminOpen && <AdminPanel data={data} defaultRepository={siteConfig.repository} linkHealthEntries={linkHealthEntries} isLinkHealthLoading={isLinkHealthLoading} onRefreshLinkHealth={refreshLinkHealth} onChange={setData} onReset={() => { localStorage.removeItem(DRAFT_KEY); setData(defaultNavigationData); }} onClose={closeAdmin} />}
      {isTempTextOpen && <div className="fixed inset-0 z-[65] bg-[#07191d]/35 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setIsTempTextOpen(false); }}>
        <aside className="baize-panel ml-auto flex h-full w-full max-w-lg flex-col border-y-0 border-r-0 p-5">
          <header className="mb-4 flex items-center justify-between">
            <div><h2 className="text-xl font-bold text-[#173b41] dark:text-[#f4f1e8]">临时文本</h2><p className="mt-1 text-xs text-[#718986]">本机自动保存；同步到 GitHub 时只上传密文。</p></div>
            <button className="baize-icon-button" onClick={() => setIsTempTextOpen(false)} aria-label="关闭临时文本"><X size={20} /></button>
          </header>
          <textarea autoFocus value={tempText} onChange={event => { setTempText(event.target.value); setIsCopied(false); }} placeholder="粘贴或输入临时内容…" className="baize-input min-h-0 flex-1 resize-none font-mono leading-6" />
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
            <div className="flex gap-2">
              <button className="baize-danger-button" disabled={!tempText} onClick={() => { if (confirm('确定清空临时文本吗？')) setTempText(''); }}><Trash2 size={16} />清空</button>
              <button className="baize-button-primary" disabled={!tempText} onClick={async () => { await navigator.clipboard.writeText(tempText); setIsCopied(true); window.setTimeout(() => setIsCopied(false), 1500); }}>{isCopied ? <Check size={16} /> : <Copy size={16} />}{isCopied ? '已复制' : '复制'}</button>
            </div>
          </footer>
        </aside>
      </div>}
    </div>
  );
}

export default App;
