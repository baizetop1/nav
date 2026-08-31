import { useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Coffee,
  Command,
  Download,
  ExternalLink,
  FileText,
  Github,
  Inbox as InboxIcon,
  Languages,
  Moon,
  Network,
  QrCode,
  Search,
  Settings,
  Sparkles,
  StickyNote,
  Sun,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import type { Category, Site } from '../types/navigation';
import type { TextNode } from '../types/text-network';

export type CommandPaletteIcon = 'search' | 'settings' | 'note' | 'inbox' | 'add' | 'translate' | 'sun' | 'moon' | 'default' | 'work' | 'study' | 'relax' | 'install' | 'qr' | 'stats' | 'github';

export interface CommandPaletteAction {
  id: string;
  title: string;
  description: string;
  keywords?: string[];
  icon: CommandPaletteIcon;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  sites: Site[];
  categories: Category[];
  textNodes: TextNode[];
  actions: CommandPaletteAction[];
  onVisit: (siteId: string) => void;
  onClose: () => void;
}

const iconMap: Record<CommandPaletteIcon, LucideIcon> = {
  search: Search,
  settings: Settings,
  note: StickyNote,
  inbox: InboxIcon,
  add: Plus,
  translate: Languages,
  sun: Sun,
  moon: Moon,
  default: Sparkles,
  work: Briefcase,
  study: BookOpen,
  relax: Coffee,
  install: Download,
  qr: QrCode,
  stats: BarChart3,
  github: Github,
};

export function CommandPalette({ open, sites, categories, textNodes, actions, onVisit, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const categoryNames = useMemo(() => new Map(categories.map(category => [category.id, category.name])), [categories]);
  const siteSearch = useMemo(() => new Fuse(sites.map(site => ({ ...site, categoryName: categoryNames.get(site.categoryId) || '' })), {
    threshold: 0.34,
    ignoreLocation: true,
    keys: [
      { name: 'name', weight: 0.45 },
      { name: 'url', weight: 0.2 },
      { name: 'tags', weight: 0.15 },
      { name: 'categoryName', weight: 0.12 },
      { name: 'description', weight: 0.08 },
    ],
  }), [categoryNames, sites]);
  const textSearch = useMemo(() => new Fuse(textNodes, {
    threshold: 0.34,
    ignoreLocation: true,
    keys: [
      { name: 'title', weight: 0.5 },
      { name: 'tags', weight: 0.25 },
      { name: 'category', weight: 0.15 },
      { name: 'summary', weight: 0.1 },
    ],
  }), [textNodes]);

  const filteredActions = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    if (!keyword) return actions;
    return actions.filter(action => `${action.title} ${action.description} ${(action.keywords || []).join(' ')}`.toLocaleLowerCase().includes(keyword));
  }, [actions, query]);

  const filteredSites = useMemo(() => {
    const keyword = query.trim();
    if (keyword) return siteSearch.search(keyword, { limit: 10 }).map(result => result.item);
    return [...sites]
      .sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || a.name.localeCompare(b.name, 'zh-CN'))
      .slice(0, 8);
  }, [query, siteSearch, sites]);

  const filteredTextNodes = useMemo(() => {
    const keyword = query.trim();
    return keyword ? textSearch.search(keyword, { limit: 8 }).map(result => result.item) : [];
  }, [query, textSearch]);
  const filteredPostNodes = useMemo(() => filteredTextNodes.filter(node => node.type !== 'topic'), [filteredTextNodes]);
  const filteredTopicNodes = useMemo(() => filteredTextNodes.filter(node => node.type === 'topic'), [filteredTextNodes]);
  const orderedTextNodes = useMemo(() => [...filteredPostNodes, ...filteredTopicNodes], [filteredPostNodes, filteredTopicNodes]);

  const resultCount = filteredActions.length + filteredSites.length + orderedTextNodes.length;
  const runAction = (action: CommandPaletteAction) => {
    onClose();
    action.run();
  };
  const openSite = (site: Site) => {
    onVisit(site.id);
    window.open(site.url, '_blank', 'noopener,noreferrer');
    onClose();
  };
  const openTextNode = (node: TextNode) => {
    onClose();
    window.location.href = node.url;
  };

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelectedIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex(current => resultCount ? (current + 1) % resultCount : 0);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex(current => resultCount ? (current - 1 + resultCount) % resultCount : 0);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (selectedIndex < filteredActions.length) {
          const action = filteredActions[selectedIndex];
          if (action) runAction(action);
        } else if (selectedIndex < filteredActions.length + filteredSites.length) {
          const site = filteredSites[selectedIndex - filteredActions.length];
          if (site) openSite(site);
        } else {
          const node = orderedTextNodes[selectedIndex - filteredActions.length - filteredSites.length];
          if (node) openTextNode(node);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredActions, filteredSites, onClose, open, orderedTextNodes, resultCount, selectedIndex]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  useEffect(() => {
    if (!open || !resultCount) return;
    resultsRef.current
      ?.querySelector<HTMLElement>(`[data-command-index="${selectedIndex}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [open, query, resultCount, selectedIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-[#07191d]/45 p-3 pt-[10vh] backdrop-blur-sm sm:p-6 sm:pt-[12vh]" role="dialog" aria-modal="true" aria-label="全局命令面板" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="baize-panel flex max-h-[72vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-2xl">
        <label className="flex items-center gap-3 border-b border-[#5f8f84]/15 px-4 dark:border-[#c9a96b]/10">
          <Command size={20} className="shrink-0 text-[#4f8179] dark:text-[#c9a96b]" />
          <input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent py-4 text-base text-[#173b41] outline-none placeholder:text-[#829793] dark:text-[#f4f1e8]" placeholder="搜索网站、文章、Topic 或输入命令…" />
          <kbd className="rounded-md border border-[#5f8f84]/20 bg-[#5f8f84]/8 px-2 py-1 text-[11px] text-[#718986]">Esc</kbd>
        </label>

        <div ref={resultsRef} className="overscroll-contain overflow-y-auto p-2">
          {filteredActions.length > 0 && <div><p className="px-2 pb-1 pt-2 text-[11px] font-semibold tracking-[0.16em] text-[#829793]">命令</p>{filteredActions.map((action, index) => {
            const Icon = iconMap[action.icon];
            const selected = selectedIndex === index;
            return <button key={action.id} data-command-index={index} type="button" onMouseEnter={() => setSelectedIndex(index)} onClick={() => runAction(action)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${selected ? 'bg-[#5f8f84]/12 dark:bg-[#c9a96b]/10' : 'hover:bg-[#5f8f84]/8 dark:hover:bg-[#c9a96b]/8'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-[#356b66] text-white dark:bg-[#c9a96b] dark:text-[#102c33]' : 'bg-[#5f8f84]/10 text-[#456b68] dark:bg-[#c9a96b]/8 dark:text-[#d9ddd6]'}`}><Icon size={17} /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#234b4e] dark:text-[#f4f1e8]">{action.title}</strong><span className="block truncate text-xs text-[#718986]">{action.description}</span></span></button>;
          })}</div>}

          {filteredSites.length > 0 && <div><p className="px-2 pb-1 pt-3 text-[11px] font-semibold tracking-[0.16em] text-[#829793]">网站</p>{filteredSites.map((site, siteIndex) => {
            const index = filteredActions.length + siteIndex;
            const selected = selectedIndex === index;
            return <button key={site.id} data-command-index={index} type="button" onMouseEnter={() => setSelectedIndex(index)} onClick={() => openSite(site)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${selected ? 'bg-[#5f8f84]/12 dark:bg-[#c9a96b]/10' : 'hover:bg-[#5f8f84]/8 dark:hover:bg-[#c9a96b]/8'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${selected ? 'bg-[#356b66] text-white dark:bg-[#c9a96b] dark:text-[#102c33]' : 'bg-[#5f8f84]/10 text-[#456b68] dark:bg-[#c9a96b]/8 dark:text-[#d9ddd6]'}`}>{site.name.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#234b4e] dark:text-[#f4f1e8]">{site.name}</strong><span className="block truncate text-xs text-[#718986]">{categoryNames.get(site.categoryId) || '未分类'} · {new URL(site.url).hostname.replace('www.', '')}</span></span><ExternalLink size={15} className="shrink-0 text-[#829793]" /></button>;
          })}</div>}

          {filteredPostNodes.length > 0 && <div><p className="px-2 pb-1 pt-3 text-[11px] font-semibold tracking-[0.16em] text-[#829793]">文章</p>{filteredPostNodes.map((node, nodeIndex) => {
            const index = filteredActions.length + filteredSites.length + nodeIndex;
            const selected = selectedIndex === index;
            return <button key={node.id} data-command-index={index} type="button" onMouseEnter={() => setSelectedIndex(index)} onClick={() => openTextNode(node)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${selected ? 'bg-[#5f8f84]/12 dark:bg-[#c9a96b]/10' : 'hover:bg-[#5f8f84]/8 dark:hover:bg-[#c9a96b]/8'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-[#356b66] text-white dark:bg-[#c9a96b] dark:text-[#102c33]' : 'bg-[#5f8f84]/10 text-[#456b68] dark:bg-[#c9a96b]/8 dark:text-[#d9ddd6]'}`}><FileText size={17} /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#234b4e] dark:text-[#f4f1e8]">{node.title}</strong><span className="block truncate text-xs text-[#718986]">{[node.category, node.format, node.summary].filter(Boolean).join(' · ') || '公开文章'}</span></span><ExternalLink size={15} className="shrink-0 text-[#829793]" /></button>;
          })}</div>}

          {filteredTopicNodes.length > 0 && <div><p className="px-2 pb-1 pt-3 text-[11px] font-semibold tracking-[0.16em] text-[#829793]">知识节点</p>{filteredTopicNodes.map((node, nodeIndex) => {
            const index = filteredActions.length + filteredSites.length + filteredPostNodes.length + nodeIndex;
            const selected = selectedIndex === index;
            return <button key={node.id} data-command-index={index} type="button" onMouseEnter={() => setSelectedIndex(index)} onClick={() => openTextNode(node)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${selected ? 'bg-[#5f8f84]/12 dark:bg-[#c9a96b]/10' : 'hover:bg-[#5f8f84]/8 dark:hover:bg-[#c9a96b]/8'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-[#356b66] text-white dark:bg-[#c9a96b] dark:text-[#102c33]' : 'bg-[#5f8f84]/10 text-[#456b68] dark:bg-[#c9a96b]/8 dark:text-[#d9ddd6]'}`}><Network size={17} /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#234b4e] dark:text-[#f4f1e8]">{node.title}</strong><span className="block truncate text-xs text-[#718986]">{node.summary || '正式知识节点'}</span></span><ExternalLink size={15} className="shrink-0 text-[#829793]" /></button>;
          })}</div>}

          {!resultCount && <div className="py-12 text-center text-sm text-[#718986]">没有找到相关网站、文章、Topic 或命令。</div>}
        </div>

        <footer className="flex items-center justify-between border-t border-[#5f8f84]/15 px-4 py-2 text-[11px] text-[#829793] dark:border-[#c9a96b]/10"><span>↑↓ 选择 · Enter 执行</span><span>Ctrl/Cmd K 打开</span></footer>
      </section>
    </div>
  );
}
