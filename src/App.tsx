import { useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { Menu, Search } from 'lucide-react';
import { AdminPanel } from './components/AdminPanel';
import { Card } from './components/Card';
import { Sidebar } from './components/Sidebar';
import { defaultNavigationData, searchEngines, siteConfig } from './data';
import type { NavigationData } from './types/navigation';

const DRAFT_KEY = 'nav_cms_draft';

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
  const [mainGradient, setMainGradient] = useState('');
  const [sidebarGradient, setSidebarGradient] = useState('');
  const [isAdminOpen, setIsAdminOpen] = useState(window.location.hash === '#/admin');

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
        ? 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800'
        : 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 dark:from-gray-950 dark:via-slate-900 dark:to-black');
      setSidebarGradient(isDay
        ? 'bg-gradient-to-b from-white/80 to-blue-50/50 dark:from-gray-900/80 dark:to-slate-900/50'
        : 'bg-gradient-to-b from-white/80 to-indigo-50/50 dark:from-gray-900/80 dark:to-indigo-950/50');
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

  const openAdmin = () => {
    window.location.hash = '/admin';
    setIsAdminOpen(true);
  };

  const closeAdmin = () => {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setIsAdminOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans transition-colors duration-300 dark:bg-gray-950">
      <div className={`fixed inset-0 z-0 transition-opacity duration-1000 ${mainGradient}`} />
      <Sidebar
        activeCategory={activeCategory}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isDark={isDark}
        toggleTheme={toggleTheme}
        categories={categories}
        onAdminClick={openAdmin}
        isAutoGradient={isAutoGradient}
        toggleAutoGradient={() => setIsAutoGradient(value => !value)}
        customGradient={sidebarGradient}
      />

      <main className="relative z-10 min-h-screen bg-transparent p-4 lg:ml-64 lg:p-8">
        <div className="sticky top-0 z-30 -mx-4 mb-8 border-b border-white/20 bg-white/10 px-4 py-4 backdrop-blur-xl dark:border-gray-700/30 dark:bg-black/20 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="-ml-2 rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 lg:hidden"><Menu size={24} /></button>
            <div className="group relative max-w-2xl flex-1">
              <div className="absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-gray-400 group-focus-within:text-blue-500">{activeEngine ? <span className="text-lg font-bold">{activeEngine.icon}</span> : <Search size={20} />}</div>
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
                className="w-full rounded-xl border border-gray-200/50 bg-white/50 py-3 pl-10 pr-16 text-gray-900 shadow-sm outline-none backdrop-blur-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800/50 dark:bg-gray-900/50 dark:text-gray-100"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs text-gray-400 dark:border-gray-700 dark:bg-gray-800 sm:block">Ctrl K</kbd>
              <div className="pointer-events-none absolute left-0 top-full mt-2 flex w-full flex-wrap gap-2 px-1 opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                {searchEngines.map(engine => <button key={engine.prefix} onClick={() => { const query = activeEngine ? search.slice(activeEngine.prefix.length + 1) : search; setSearch(`${engine.prefix} ${query}`); document.getElementById('search-input')?.focus(); }} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">{engine.icon} {engine.name}</button>)}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl space-y-12 pb-12">
          {categories.map(category => {
            const sites = data.sites
              .filter(site => site.categoryId === category.id && visibleSiteIds.has(site.id))
              .sort((a, b) => (layoutOrder.get(a.id) ?? 9999) - (layoutOrder.get(b.id) ?? 9999));
            if (!sites.length && search.trim()) return null;
            return (
              <section key={category.id} id={category.id} className="scroll-mt-28">
                <div className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/50 px-4 py-2 shadow-sm backdrop-blur-sm dark:border-gray-700/30 dark:bg-gray-800/50">
                  <span className="h-6 w-1 rounded-full bg-blue-600 dark:bg-blue-500" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{category.name}</h2>
                  <span className="ml-1 text-sm font-medium text-gray-600 dark:text-gray-400">({sites.length})</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{sites.map(site => <Card key={site.id} site={site} />)}</div>
              </section>
            );
          })}
          {search.trim() && !activeEngine && visibleSiteIds.size === 0 && <div className="py-20 text-center text-gray-500"><p className="text-lg">未找到相关网站</p><button onClick={() => setSearch('')} className="mt-4 text-blue-500 hover:underline">清除搜索</button></div>}
          {activeEngine && <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-6 text-center text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">按 Enter 使用 {activeEngine.name} 搜索</div>}
        </div>
      </main>

      {isAdminOpen && <AdminPanel data={data} defaultRepository={siteConfig.repository} onChange={setData} onReset={() => { localStorage.removeItem(DRAFT_KEY); setData(defaultNavigationData); }} onClose={closeAdmin} />}
    </div>
  );
}

export default App;
