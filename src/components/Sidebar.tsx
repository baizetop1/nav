import { siteConfig } from '../data';
import type { Category } from '../types/navigation';
import { cn } from '../lib/utils';
import type { SceneMode } from '../types/scene';
import { X, Github, Moon, Sun, Settings, Palette, Briefcase, StickyNote, Download, BookOpen, Coffee, Sparkles } from 'lucide-react';

interface SidebarProps {
  activeCategory: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isDark: boolean;
  toggleTheme: () => void;
  categories: Category[];
  onAdminClick: () => void;
  sceneMode: SceneMode;
  onSceneModeChange: (mode: SceneMode) => void;
  onTempTextClick: () => void;
  tempText: string;
  onTempTextChange: (value: string) => void;
  isAutoGradient: boolean;
  toggleAutoGradient: () => void;
  customGradient?: string;
  canInstall: boolean;
  onInstall: () => void;
}

export function Sidebar({
    activeCategory,
    isOpen,
    setIsOpen,
    isDark,
    toggleTheme,
    categories,
    onAdminClick,
    sceneMode,
    onSceneModeChange,
    onTempTextClick,
    tempText,
    onTempTextChange,
    isAutoGradient,
    toggleAutoGradient,
    customGradient,
    canInstall,
    onInstall
}: SidebarProps) {
    const isWorkMode = sceneMode === 'work';
    const sceneOptions = [
        { id: 'default' as const, name: '日常', icon: Sparkles },
        { id: 'work' as const, name: '工作', icon: Briefcase },
        { id: 'study' as const, name: '学习', icon: BookOpen },
        { id: 'relax' as const, name: '休闲', icon: Coffee },
    ];
    const scrollToCategory = (id: string) => {
        const el = document.getElementById(id);
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
                    "sidebar-shell fixed top-0 left-0 h-full w-64 backdrop-blur-2xl border-r border-white/60 dark:border-[#c9a96b]/12 z-50 transform transition-transform duration-300 lg:translate-x-0 transition-colors shadow-[16px_0_60px_-42px_rgba(16,44,51,0.7)]",
                isOpen ? "translate-x-0" : "-translate-x-full",
                customGradient ? customGradient : "bg-[#f4f1e8]/82 dark:bg-[#102c33]/88"
            )}>
                <div className="p-6 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3 font-bold text-xl text-[#173b41] dark:text-[#f4f1e8]">
                            <img src={`${import.meta.env.BASE_URL}baize-logo.webp`} alt="白泽标识" className="sidebar-brand-logo h-10 w-10 rounded-xl border border-[#c9a96b]/40 object-cover shadow-sm" />
                            <div>
                                <div>{siteConfig.title}</div>
                                <div className="brand-subtitle text-[10px] font-medium tracking-[0.24em] text-[#5f8f84] dark:text-[#c9a96b]">知万物 · 辨吉凶</div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="baize-icon-button p-1 lg:hidden">
                            <X size={20} className="text-[#52736f] dark:text-[#c9a96b]" />
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => scrollToCategory(cat.id)}
                                className={cn(
                                    "w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200",
                                    activeCategory === cat.id
                                        ? "bg-[#5f8f84]/15 text-[#285f5c] dark:bg-[#c9a96b]/10 dark:text-[#dfc68e]"
                                        : "text-[#58726f] hover:bg-[#5f8f84]/8 dark:text-[#afbeb9] dark:hover:bg-[#c9a96b]/8"
                                )}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </nav>

                    <section className="my-4 rounded-xl border border-[#5f8f84]/15 bg-white/25 p-3 dark:border-[#c9a96b]/10 dark:bg-[#07191d]/20">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#456b68] dark:text-[#d9ddd6]"><StickyNote size={14} />临时文本</span>
                            <button onClick={onTempTextClick} className="text-[10px] text-[#5f8f84] hover:underline dark:text-[#c9a96b]">展开</button>
                        </div>
                        <textarea value={tempText} onChange={event => onTempTextChange(event.target.value)} placeholder="临时记录…" className="baize-input h-24 resize-none p-2 text-xs leading-5" />
                    </section>

                    <section className="mb-4 rounded-xl border border-[#5f8f84]/15 bg-white/25 p-3 dark:border-[#c9a96b]/10 dark:bg-[#07191d]/20">
                        <p className="mb-2 text-xs font-semibold text-[#456b68] dark:text-[#d9ddd6]">场景模式</p>
                        <div className="grid grid-cols-2 gap-1.5">
                            {sceneOptions.map(option => {
                                const Icon = option.icon;
                                const active = sceneMode === option.id;
                                return <button key={option.id} type="button" onClick={() => onSceneModeChange(option.id)} className={cn('flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition', active ? 'bg-[#356b66] text-white dark:bg-[#c9a96b] dark:text-[#102c33]' : 'text-[#58726f] hover:bg-[#5f8f84]/10 dark:text-[#afbeb9] dark:hover:bg-[#c9a96b]/10')}><Icon size={14} />{option.name}</button>;
                            })}
                        </div>
                    </section>

                    <div className="mt-auto space-y-3 border-t border-[#5f8f84]/15 pt-4 dark:border-[#c9a96b]/12">
                        {canInstall && <button onClick={onInstall} className="flex w-full items-center gap-2 rounded-lg bg-[#5f8f84]/10 px-3 py-2 text-sm font-medium text-[#356b66] transition-colors hover:bg-[#5f8f84]/15 dark:bg-[#c9a96b]/10 dark:text-[#dfc68e] dark:hover:bg-[#c9a96b]/15">
                            <Download size={18} />安装到设备
                        </button>}
                        <button onClick={onAdminClick} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#456b68] transition-colors hover:bg-[#5f8f84]/10 dark:text-[#d9ddd6] dark:hover:bg-[#c9a96b]/10">
                            <Settings size={18} />管理导航
                        </button>
                        <div className="flex items-center justify-between px-2">
                             <button
                                onClick={toggleTheme}
                                className="baize-icon-button"
                                title="Toggle Theme"
                            >
                                {isDark ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                             {!isWorkMode && <button
                                onClick={toggleAutoGradient}
                                className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    isAutoGradient
                                        ? "text-[#4d8179] hover:bg-[#5f8f84]/10 dark:text-[#d3b976] dark:hover:bg-[#c9a96b]/10"
                                        : "text-[#66807c] hover:bg-[#5f8f84]/10 dark:text-[#aebdb8] dark:hover:bg-[#c9a96b]/10"
                                )}
                                title={isAutoGradient ? "关闭自动渐变" : "开启自动渐变"}
                            >
                                <Palette size={20} />
                            </button>}
                            <a
                                href={siteConfig.github}
                                target="_blank"
                                rel="noreferrer"
                                className="baize-icon-button"
                            >
                                <Github size={20} />
                            </a>
                        </div>
                        <div className="text-center text-xs text-[#78918c] dark:text-[#869b95]">
                            {siteConfig.footer}
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
