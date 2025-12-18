import { categories, siteConfig } from '../data';
import { cn } from '../lib/utils';
import { X, Github, Moon, Sun } from 'lucide-react';

interface SidebarProps {
  activeCategory: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

export function Sidebar({ activeCategory, isOpen, setIsOpen, isDark, toggleTheme }: SidebarProps) {
    const scrollToCategory = (name: string) => {
        const el = document.getElementById(name);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setIsOpen(false);
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            <div 
                className={cn(
                    "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setIsOpen(false)}
            />

            {/* Sidebar */}
            <aside className={cn(
                "fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 transform transition-transform duration-300 lg:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-6 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2 font-bold text-xl text-gray-800 dark:text-white">
                            <span className="text-2xl">🦄</span>
                            {siteConfig.title}
                        </div>
                        <button onClick={() => setIsOpen(false)} className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                            <X size={20} />
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat.name}
                                onClick={() => scrollToCategory(cat.name)}
                                className={cn(
                                    "w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200",
                                    activeCategory === cat.name
                                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                )}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </nav>

                    <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
                        <div className="flex items-center justify-between px-2">
                             <button
                                onClick={toggleTheme}
                                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                                title="Toggle Theme"
                            >
                                {isDark ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                            <a
                                href={siteConfig.github}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                            >
                                <Github size={20} />
                            </a>
                        </div>
                        <div className="text-xs text-center text-gray-400">
                            {siteConfig.footer}
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
