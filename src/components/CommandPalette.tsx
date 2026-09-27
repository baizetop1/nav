import { useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import {
  BarChart3, BookOpen, Briefcase, Calculator, Clock, Coffee, Command, Copy, Download,
  ExternalLink, FileText, Github, Inbox as InboxIcon, Languages, Moon, Network,
  QrCode, Search, Settings, Sparkles, StickyNote, Sun, Plus, Trash2, X, type LucideIcon,
} from 'lucide-react';
import { searchEngines } from '../data/config';
import { safeHostname, safeHttpUrl } from '../lib/navigationData.ts';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../lib/safeStorage';
import {
  buildGlobalSearchDocuments, parseSearchAliases, quickSearchAnswer, resolveSearchAlias,
  SEARCH_ALIASES_KEY, validateSearchAlias, type GlobalSearchDocument, type SearchAlias,
} from '../lib/globalSearch';
import { loadReading, READING_EVENT, type ReadingItem } from '../services/readingHistory';
import type { Category, Site } from '../types/navigation';
import type { TextNode } from '../types/text-network';
import type { InboxItem } from '../types/inbox';
import type { TemporaryVisitSummary } from '../lib/temporaryVisits';
import type { TranslationHistoryItem } from '../lib/translationHistory';
import type { TechOsEntity } from '../types/tech-os';

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
  inboxItems?: InboxItem[];
  temporaryVisits?: TemporaryVisitSummary[];
  translationHistory?: TranslationHistoryItem[];
  onOpenInboxItem?: (id: string) => void;
  onUseTranslation?: (item: TranslationHistoryItem) => void;
  onTemporaryVisit?: (url: string) => void;
  onOpenTechOs?: (id: string) => void;
}
const iconMap: Record<CommandPaletteIcon, LucideIcon> = {
  search: Search, settings: Settings, note: StickyNote, inbox: InboxIcon, add: Plus,
  translate: Languages, sun: Sun, moon: Moon, default: Sparkles, work: Briefcase,
  study: BookOpen, relax: Coffee, install: Download, qr: QrCode, stats: BarChart3, github: Github,
};
const groupNames = { inbox: 'Inbox', temporary: '临时访问', translation: '翻译历史', reading: '稍后阅读', 'tech-os': 'Tech OS' };
const groupIcons = { inbox: InboxIcon, temporary: Clock, translation: Languages, reading: BookOpen, 'tech-os': Network };
const emptyInbox: InboxItem[] = [];
const emptyVisits: TemporaryVisitSummary[] = [];
const emptyTranslations: TranslationHistoryItem[] = [];
const reservedPrefixes = searchEngines.map(engine => engine.prefix);
const readAliases = () => {
  try { return parseSearchAliases(JSON.parse(safeGetLocalStorageItem(SEARCH_ALIASES_KEY, { label: '搜索别名', important: false }) || '[]'), reservedPrefixes); } catch { return []; }
};
interface PaletteResult {
  id: string;
  group: string;
  title: string;
  description: string;
  icon: LucideIcon;
  run: () => void;
}

export function CommandPalette({
  open, sites, categories, textNodes, actions, onVisit, onClose,
  inboxItems = emptyInbox, temporaryVisits = emptyVisits, translationHistory = emptyTranslations,
  onOpenInboxItem, onUseTranslation, onTemporaryVisit, onOpenTechOs,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [readingItems, setReadingItems] = useState<ReadingItem[]>([]);
  const [techOsEntities, setTechOsEntities] = useState<TechOsEntity[]>([]);
  const [techOsFailed, setTechOsFailed] = useState(false);
  const [preview, setPreview] = useState<GlobalSearchDocument | null>(null);
  const [aliases, setAliases] = useState<SearchAlias[]>(readAliases);
  const [showAliases, setShowAliases] = useState(false);
  const [aliasDraft, setAliasDraft] = useState<SearchAlias>({ prefix: '', name: '', template: '' });
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const categoryNames = useMemo(() => new Map(categories.map(category => [category.id, category.name])), [categories]);
  const siteSearch = useMemo(() => new Fuse(sites.map(site => ({ ...site, categoryName: categoryNames.get(site.categoryId) || '' })), {
    threshold: .34, ignoreLocation: true, keys: ['name', 'url', 'tags', 'categoryName', 'description'],
  }), [categoryNames, sites]);
  const textSearch = useMemo(() => new Fuse(textNodes, {
    threshold: .34, ignoreLocation: true, keys: ['title', 'tags', 'category', 'summary'],
  }), [textNodes]);
  const documents = useMemo(() => buildGlobalSearchDocuments({ inboxItems, temporaryVisits, translationHistory, readingItems, techOsEntities }), [inboxItems, temporaryVisits, translationHistory, readingItems, techOsEntities]);
  const localSearch = useMemo(() => new Fuse(documents, {
    threshold: .34, ignoreLocation: true, keys: [{ name: 'title', weight: .45 }, { name: 'content', weight: .3 }, { name: 'tags', weight: .15 }, { name: 'url', weight: .1 }],
  }), [documents]);
  useEffect(() => setPreview(current => current ? documents.find(document => document.id === current.id) || null : null), [documents]);
  const keyword = query.trim();
  const filteredSites = useMemo(() => keyword ? siteSearch.search(keyword, { limit: 8 }).map(result => result.item) : [...sites].sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || a.name.localeCompare(b.name, 'zh-CN')).slice(0, 8), [keyword, siteSearch, sites]);
  const filteredNodes = useMemo(() => keyword ? textSearch.search(keyword, { limit: 8 }).map(result => result.item) : [], [keyword, textSearch]);
  const filteredDocuments = useMemo(() => {
    if (!keyword) return [];
    const counts = new Map<string, number>();
    return localSearch.search(keyword).map(result => result.item).filter(item => {
      const count = counts.get(item.group) || 0; counts.set(item.group, count + 1); return count < 6;
    });
  }, [keyword, localSearch]);
  const answer = quickSearchAnswer(query);
  const externalSearch = resolveSearchAlias(query, aliases, searchEngines);
  const copyText = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setMessage('已复制。'); }
    catch { setMessage('无法自动复制，请在预览中选择文字复制。'); }
  };
  const visitUrl = (value: string) => {
    const url = safeHttpUrl(value);
    if (!url) { setMessage('该条目的网址无效。'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };
  const results: PaletteResult[] = [
    ...(answer ? [{ id: 'quick-answer', group: '即时工具', title: answer.title, description: answer.description, icon: Calculator, run: () => { void copyText(answer.value); } }] : []),
    ...(externalSearch ? [{ id: 'external-search', group: '外部搜索', title: externalSearch.title, description: '按 Enter 后才将此搜索词发送到所选网站', icon: Search, run: () => visitUrl(externalSearch.url) }] : []),
    ...actions.filter(action => !keyword || `${action.title} ${action.description} ${(action.keywords || []).join(' ')}`.toLocaleLowerCase().includes(keyword.toLocaleLowerCase())).map(action => ({
      id: `action:${action.id}`, group: '命令', title: action.title, description: action.description, icon: iconMap[action.icon], run: () => { onClose(); action.run(); },
    })),
    ...filteredSites.map(site => ({
      id: `site:${site.id}`, group: '网站', title: site.name, description: `${categoryNames.get(site.categoryId) || '未分类'} · ${safeHostname(site.url)}`, icon: ExternalLink,
      run: () => { if (safeHttpUrl(site.url)) { onVisit(site.id); visitUrl(site.url); } },
    })),
    ...filteredNodes.filter(node => node.type !== 'topic').concat(filteredNodes.filter(node => node.type === 'topic')).map(node => ({
      id: `node:${node.id}`, group: node.type === 'topic' ? '知识节点' : '文章', title: node.title, description: node.summary || node.category || '公开内容', icon: node.type === 'topic' ? Network : FileText,
      run: () => visitUrl(node.url),
    })),
    ...Object.keys(groupNames).flatMap(group => filteredDocuments.filter(document => document.group === group).map(document => ({
      id: document.id, group: groupNames[document.group], title: document.title, description: document.description, icon: groupIcons[document.group],
      run: () => { setPreview(document); setShowAliases(false); setMessage(''); },
    }))),
  ];

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    setQuery(''); setSelectedIndex(0); setPreview(null); setShowAliases(false); setMessage(''); setTechOsFailed(false);
    const refreshReading = () => setReadingItems(Object.values(loadReading().items));
    const refreshStorage = () => { refreshReading(); setAliases(readAliases()); };
    refreshStorage();
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    let disposed = false;
    void import('../services/techOs').then(module => { if (!disposed) setTechOsEntities(module.techOsIndex.entities); }).catch(() => { if (!disposed) setTechOsFailed(true); });
    window.addEventListener(READING_EVENT, refreshReading);
    window.addEventListener('storage', refreshStorage);
    return () => {
      disposed = true; window.clearTimeout(timer); window.removeEventListener(READING_EVENT, refreshReading); window.removeEventListener('storage', refreshStorage);
      previousFocus?.focus();
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);
  useEffect(() => { setSelectedIndex(0); setPreview(null); }, [query]);
  useEffect(() => { setSelectedIndex(current => Math.max(0, Math.min(current, results.length - 1))); }, [results.length]);
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (preview || showAliases) { setPreview(null); setShowAliases(false); inputRef.current?.focus(); } else onClose();
      } else if (event.key === 'Tab') {
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('input:not([disabled]), button:not([disabled]), a[href], textarea, select') || []);
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      } else if (event.target === inputRef.current && !showAliases && !preview) {
        if (event.key === 'ArrowDown') { event.preventDefault(); setSelectedIndex(current => results.length ? (current + 1) % results.length : 0); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); setSelectedIndex(current => results.length ? (current - 1 + results.length) % results.length : 0); }
        else if (event.key === 'Enter') { event.preventDefault(); results[selectedIndex]?.run(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });
  useEffect(() => {
    if (open && results.length) resultsRef.current?.querySelector<HTMLElement>(`[data-command-index="${selectedIndex}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [open, query, results.length, selectedIndex]);

  const saveAliases = (next: SearchAlias[]) => {
    setAliases(next);
    const result = safeSetLocalStorageItem(SEARCH_ALIASES_KEY, JSON.stringify(next), { label: '搜索别名', maxBytes: 64 * 1024 });
    setMessage(result.ok ? '搜索别名已保存。' : result.issue.message);
  };
  const submitAlias = (event: React.FormEvent) => {
    event.preventDefault();
    const alias = { prefix: aliasDraft.prefix.trim().toLowerCase(), name: aliasDraft.name.trim(), template: aliasDraft.template.trim() };
    const error = validateSearchAlias(alias, reservedPrefixes);
    if (error) { setMessage(error); return; }
    if (aliases.some(item => item.prefix === alias.prefix)) { setMessage('该别名已存在，请先移除旧别名或使用新前缀。'); return; }
    if (aliases.length >= 30) { setMessage('最多保存 30 个自定义别名。'); return; }
    saveAliases([...aliases, alias]); setAliasDraft({ prefix: '', name: '', template: '' });
  };
  const openPreviewSource = () => {
    if (!preview) return;
    if (preview.group === 'inbox' && onOpenInboxItem) { onClose(); onOpenInboxItem(preview.sourceId); }
    else if (preview.group === 'translation' && onUseTranslation) {
      const item = translationHistory.find(entry => entry.id === preview.sourceId);
      if (item) { onClose(); onUseTranslation(item); }
    } else if (preview.group === 'tech-os') { onClose(); if (onOpenTechOs) onOpenTechOs(preview.sourceId); else window.location.hash = '/tech-os'; }
    else if (preview.url) {
      if (preview.group === 'temporary' && onTemporaryVisit && safeHttpUrl(preview.url)) { onTemporaryVisit(preview.url); onClose(); }
      else visitUrl(preview.url);
    }
  };
  if (!open) return null;
  const canOpenPreview = Boolean(preview && (preview.url || preview.group === 'tech-os' || (preview.group === 'inbox' && onOpenInboxItem) || (preview.group === 'translation' && onUseTranslation)));
  return <div className="fixed inset-0 z-[100] flex items-start justify-center bg-[#07191d]/45 p-3 pt-[6vh] backdrop-blur-sm sm:p-6 sm:pt-[10vh]" role="dialog" aria-modal="true" aria-label="全局命令面板" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="baize-panel flex max-h-[84vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-2xl">
      <div className="flex items-center gap-3 border-b border-[#5f8f84]/15 px-4 dark:border-[#c9a96b]/10">
        <Command size={20} className="shrink-0 text-[#4f8179] dark:text-[#c9a96b]" />
        <input ref={inputRef} aria-label="搜索所有内容和命令" aria-activedescendant={!preview && !showAliases && results.length ? `palette-result-${selectedIndex}` : undefined} value={query} onChange={event => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent py-4 text-base text-[#173b41] outline-none placeholder:text-[#829793] dark:text-[#f4f1e8]" placeholder="搜索所有内容，或输入 =2*(3+4)" />
        <button type="button" aria-label="搜索别名设置" aria-pressed={showAliases} className="baize-icon-button p-1.5" onClick={() => { setShowAliases(value => !value); setPreview(null); setMessage(''); }}><Settings size={17} /></button>
        <button type="button" aria-label="关闭命令面板" className="baize-icon-button p-1.5" onClick={onClose}><X size={17} /></button>
      </div>
      <div ref={resultsRef} className="overscroll-contain overflow-y-auto p-2">
        {showAliases ? <section className="space-y-3 p-3">
          <h2 className="font-semibold text-[#234b4e] dark:text-[#f4f1e8]">搜索别名</h2>
          <p className="text-xs leading-5 text-[#718986]">输入“前缀 搜索词”后按 Enter。内置：{searchEngines.map(engine => `${engine.prefix} · ${engine.name}`).join('，')}。本地内容检索不会发送到搜索引擎。</p>
          {aliases.map(alias => <div key={alias.prefix} className="flex items-center gap-2 rounded-lg bg-[#5f8f84]/8 p-2 text-xs text-[#526f6c] dark:text-[#b8c4c0]"><span className="min-w-0 flex-1 break-all"><strong>{alias.prefix}</strong> · {alias.name}<br />{alias.template}</span><button type="button" className="baize-icon-button p-2" aria-label={`移除别名 ${alias.prefix}`} onClick={() => saveAliases(aliases.filter(item => item.prefix !== alias.prefix))}><Trash2 size={14} /></button></div>)}
          <form className="grid gap-2 sm:grid-cols-2" onSubmit={submitAlias}>
            <input className="baize-input" aria-label="别名前缀" placeholder="前缀，例如 mdn" value={aliasDraft.prefix} onChange={event => setAliasDraft(current => ({ ...current, prefix: event.target.value }))} required />
            <input className="baize-input" aria-label="搜索名称" placeholder="名称，例如 MDN" value={aliasDraft.name} onChange={event => setAliasDraft(current => ({ ...current, name: event.target.value }))} required />
            <input className="baize-input sm:col-span-2" aria-label="搜索地址模板" placeholder="https://developer.mozilla.org/search?q={query}" value={aliasDraft.template} onChange={event => setAliasDraft(current => ({ ...current, template: event.target.value }))} required />
            <button className="baize-button-primary"><Plus size={15} />保存别名</button>
          </form>
          <p className="text-xs leading-5 text-[#718986]">工具示例：=2*(3+4)、10 km to mi、32 F to C、1 GiB to MB、时间、时间戳 1700000000。</p>
        </section> : preview ? <section className="p-3">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-[#718986]">{groupNames[preview.group]} · {preview.description}</p><h2 className="mt-1 break-words font-semibold text-[#234b4e] dark:text-[#f4f1e8]">{preview.title}</h2></div><button type="button" className="baize-button-secondary shrink-0 px-2 py-1 text-xs" onClick={() => { setPreview(null); inputRef.current?.focus(); }}>返回结果</button></div>
          <p className="my-4 select-text whitespace-pre-wrap break-words text-sm leading-6 text-[#526f6c] dark:text-[#b8c4c0]">{preview.content || '此条目没有正文。'}</p>
          <div className="flex flex-wrap gap-2"><button type="button" className="baize-button-secondary" onClick={() => { void copyText(preview.content); }}><Copy size={15} />复制全文</button>{canOpenPreview && <button type="button" className="baize-button-primary" onClick={openPreviewSource}><ExternalLink size={15} />{preview.group === 'inbox' ? '打开 Inbox 条目' : preview.group === 'translation' ? '载入翻译器' : preview.group === 'tech-os' ? '打开 Tech OS' : '再次访问'}</button>}</div>
        </section> : <>
          {results.map((result, index) => {
            const Icon = result.icon;
            const selected = index === selectedIndex;
            return <div key={result.id}>{(index === 0 || result.group !== results[index - 1].group) && <p className="px-2 pb-1 pt-3 text-[11px] font-semibold tracking-[0.12em] text-[#829793]">{result.group}</p>}<button id={`palette-result-${index}`} data-command-index={index} aria-current={selected ? 'true' : undefined} type="button" onMouseEnter={() => setSelectedIndex(index)} onClick={result.run} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${selected ? 'bg-[#5f8f84]/12 dark:bg-[#c9a96b]/10' : 'hover:bg-[#5f8f84]/8 dark:hover:bg-[#c9a96b]/8'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-[#356b66] text-white dark:bg-[#c9a96b] dark:text-[#102c33]' : 'bg-[#5f8f84]/10 text-[#456b68] dark:bg-[#c9a96b]/8 dark:text-[#d9ddd6]'}`}><Icon size={17} /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#234b4e] dark:text-[#f4f1e8]">{result.title}</strong><span className="block truncate text-xs text-[#718986]">{result.description}</span></span></button></div>;
          })}
          {!results.length && <p className="py-12 text-center text-sm text-[#718986]">没有找到相关内容，试试名称、标签或正文关键词。</p>}
          {techOsFailed && <p className="px-3 py-2 text-xs text-[#985247]">Tech OS 索引暂时无法加载，其他本地内容仍可搜索。</p>}
        </>}
      </div>
      {message && <p role="status" className="px-4 py-2 text-xs text-[#456b68] dark:text-[#c9a96b]">{message}</p>}
      <footer className="flex items-center justify-between border-t border-[#5f8f84]/15 px-4 py-2 text-[11px] text-[#829793] dark:border-[#c9a96b]/10"><span>↑↓ 选择 · Enter 执行 · Esc 返回</span><span>Ctrl/Cmd K</span></footer>
    </section>
  </div>;
}
