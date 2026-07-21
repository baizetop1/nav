import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Fuse from 'fuse.js';
import { Menu, Search } from 'lucide-react';
import { AdminPanel } from './components/AdminPanel';
import { Card } from './components/Card';
import { Sidebar } from './components/Sidebar';
import { defaultNavigationData, searchEngines, siteConfig } from './data';
import type { NavigationData } from './types/navigation';

const DRAFT_KEY = 'nav_cms_draft';
const CLICK_STATS_KEY = 'nav_daily_click_stats';

interface DailyClickStats {
  date: string;
  clicks: Record<string, { count: number; lastClicked: number }>;
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
  const [clickStats, setClickStats] = useState<DailyClickStats>(loadDailyClickStats);

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
        isAutoGradient={isAutoGradient}
        toggleAutoGradient={() => setIsAutoGradient(value => !value)}
        customGradient={isWorkMode ? 'bg-[#f8f9f7] dark:bg-[#111c1f]' : sidebarGradient}
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
                  return <div key={site.id} className="grid-site min-w-0" data-positioned={positioned} style={style}><Card site={site} onVisit={recordVisit} dailyVisits={category.id === commonCategoryId ? clickStats.clicks[site.id]?.count || 0 : 0} /></div>;
                })}</div>
              </section>
            );
          })}
          {search.trim() && !activeEngine && visibleSiteIds.size === 0 && <div className="baize-panel rounded-2xl py-20 text-center text-[#64807c]"><p className="text-lg">云海茫茫，未找到相关网站</p><button onClick={() => setSearch('')} className="mt-4 font-medium text-[#356b66] hover:underline dark:text-[#d2b775]">清除搜索</button></div>}
          {activeEngine && <div className="baize-panel rounded-2xl p-6 text-center font-medium text-[#356b66] dark:text-[#d9c386]">按 Enter 使用 {activeEngine.name} 搜索</div>}
        </div>
      </main>

      {isAdminOpen && <AdminPanel data={data} defaultRepository={siteConfig.repository} onChange={setData} onReset={() => { localStorage.removeItem(DRAFT_KEY); setData(defaultNavigationData); }} onClose={closeAdmin} />}
    </div>
  );
}

export default App;
