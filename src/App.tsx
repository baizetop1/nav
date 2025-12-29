import { useState, useEffect, useMemo } from 'react';
import { Search, Menu } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Card } from './components/Card';
import { categories as defaultCategories, searchEngines, Site, Category } from './data';
import { LoginModal } from './components/LoginModal';
import { AddSiteModal } from './components/AddSiteModal';

const AUTH_TOKEN = import.meta.env.VITE_AUTH_TOKEN; // Strictly use environment variable

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [activeCategory, setActiveCategory] = useState(defaultCategories[0].name);
  const [search, setSearch] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [isAutoGradient, setIsAutoGradient] = useState(true);
  const [gradientClass, setGradientClass] = useState('');

  // Auto gradient logic
  useEffect(() => {
    if (!isAutoGradient) {
      setGradientClass('');
      return;
    }

    const updateGradient = () => {
      const hour = new Date().getHours();
      // Morning/Day: 6:00 - 18:00
      if (hour >= 6 && hour < 18) {
        setGradientClass('bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800');
      } else {
        // Evening/Night: 18:00 - 6:00
        setGradientClass('bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-slate-900');
      }
    };

    updateGradient();
    const interval = setInterval(updateGradient, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isAutoGradient]);

  // Auth & Management States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Detect active search engine
  const activeEngine = useMemo(() => {
    return searchEngines.find(e => search.startsWith(e.prefix + ' '));
  }, [search]);

  // Initialize theme & data
  useEffect(() => {
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }

    // Load custom data
    const savedData = localStorage.getItem('nav_data');
    if (savedData) {
        try {
            setCategories(JSON.parse(savedData));
        } catch (e) {
            console.error('Failed to parse saved data');
        }
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Auth Handlers
  const handleLogin = (password: string) => {
    try {
        if (btoa(password) === AUTH_TOKEN) {
            setIsAuthenticated(true);
            return true;
        }
    } catch (e) {
        console.error(e);
    }
    return false;
  };

  const handleAddSite = (categoryName: string, site: Site) => {
    const newData = categories.map(cat => {
        if (cat.name === categoryName) {
            return { ...cat, sites: [...cat.sites, site] };
        }
        return cat;
    });
    setCategories(newData);
    localStorage.setItem('nav_data', JSON.stringify(newData));
    alert('添加成功！数据已保存到本地存储。');
  };

  const handleReset = () => {
    if (confirm('确定要重置所有数据吗？这将清除所有自定义添加的网站。')) {
        setCategories(defaultCategories);
        localStorage.removeItem('nav_data');
    }
  };

  const handleExport = () => {
      const dataStr = JSON.stringify(categories, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = "nav-data.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // Scroll spy
  useEffect(() => {
    const handleScroll = () => {
      const sections = categories.map(c => document.getElementById(c.name));
      // Offset for sticky header
      const scrollPosition = window.scrollY + 120;

      for (const section of sections) {
        if (section && section.offsetTop <= scrollPosition && (section.offsetTop + section.offsetHeight) > scrollPosition) {
          setActiveCategory(section.id);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories]); // Added dependency on categories

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredCategories = useMemo(() => {
    if (!search) return categories;
    const lowerSearch = search.toLowerCase();
    return categories.map(cat => ({
      ...cat,
      sites: cat.sites.filter(site => {
        const nameMatch = (site.name || '').toLowerCase().indexOf(lowerSearch) !== -1;
        const descMatch = (site.description || '').toLowerCase().indexOf(lowerSearch) !== -1;
        const tagsMatch = (site.tags || []).some(tag => (tag || '').toLowerCase().indexOf(lowerSearch) !== -1);
        return nameMatch || descMatch || tagsMatch;
      })
    })).filter(cat => cat.sites.length > 0);
  }, [search, categories]);

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans ${gradientClass || 'bg-gray-50 dark:bg-gray-950'}`}>
      <Sidebar
        activeCategory={activeCategory}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        isDark={isDark}
        toggleTheme={toggleTheme}
        categories={categories}
        isAuthenticated={isAuthenticated}
        onLoginClick={() => setIsLoginOpen(true)}
        onAddClick={() => setIsAddOpen(true)}
        onResetClick={handleReset}
        onExportClick={handleExport}
        isAutoGradient={isAutoGradient}
        toggleAutoGradient={() => setIsAutoGradient(!isAutoGradient)}
      />

      <main className="lg:ml-64 min-h-screen p-4 lg:p-8 bg-transparent">
        {/* Header / Search */}
        <div className="sticky top-0 z-30 -mx-4 px-4 lg:-mx-8 lg:px-8 py-4 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 mb-8 transition-colors duration-300">
            <div className="max-w-7xl mx-auto flex items-center gap-4">
                <button
                    onClick={() => setIsOpen(true)}
                    className="lg:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <Menu size={24} />
                </button>

                <div className="relative flex-1 group max-w-2xl">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors flex items-center justify-center w-5 h-5">
                      {activeEngine ? (
                        <span className="font-bold text-lg">{activeEngine.icon}</span>
                      ) : (
                        <Search size={20} />
                      )}
                    </div>
                    <input
                        id="search-input"
                        type="text"
                        placeholder={activeEngine ? activeEngine.placeholder : "搜索... (试着输入 'g ' 搜索 Google)"}
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && activeEngine) {
                            const query = search.slice(activeEngine.prefix.length + 1);
                            if (query.trim()) {
                              window.open(activeEngine.url + encodeURIComponent(query), '_blank');
                            }
                          }
                        }}
                        className="w-full pl-10 pr-4 py-3 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm text-gray-900 dark:text-gray-100"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none">
                        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">⌘</kbd>
                        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">K</kbd>
                    </div>

                    {/* Engine Quick Select */}
                    <div className="absolute top-full left-0 mt-2 w-full flex flex-wrap gap-2 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none group-focus-within:pointer-events-auto px-1">
                      {searchEngines.map(engine => (
                        <button
                          key={engine.prefix}
                          onClick={() => {
                            const currentPrefix = activeEngine ? activeEngine.prefix : '';
                            const query = currentPrefix ? search.slice(currentPrefix.length + 1) : search;
                            setSearch(engine.prefix + ' ' + query);
                            document.getElementById('search-input')?.focus();
                          }}
                          className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-colors ${
                            activeEngine?.prefix === engine.prefix
                              ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
                          }`}
                        >
                          <span>{engine.icon}</span>
                          <span>{engine.name}</span>
                        </button>
                      ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto space-y-12 pb-12">
            {filteredCategories.length > 0 ? (
                filteredCategories.map(cat => (
                    <section key={cat.name} id={cat.name} className="scroll-mt-28">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800 dark:text-gray-100">
                            <span className="w-1 h-8 bg-blue-500 rounded-full mr-2"></span>
                            {cat.name}
                            <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-2">
                                ({cat.sites.length})
                            </span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {cat.sites.map(site => (
                                <Card key={site.url} site={site} />
                            ))}
                        </div>
                    </section>
                ))
            ) : (
                <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                    {activeEngine ? (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-3xl mb-2">
                                {activeEngine.icon}
                            </div>
                            <p className="text-xl font-medium text-gray-800 dark:text-gray-200">
                                正在使用 {activeEngine.name} 搜索
                            </p>
                            <p className="text-sm text-gray-400">
                                按 <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 mx-1 font-sans">Enter</kbd> 键跳转
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-lg">未找到相关结果</p>
                            <button onClick={() => setSearch('')} className="mt-4 text-blue-500 hover:underline">
                                清除搜索
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
      </main>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLogin={handleLogin}
      />

      <AddSiteModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAddSite}
        categories={categories}
      />
    </div>
  );
}

export default App;
