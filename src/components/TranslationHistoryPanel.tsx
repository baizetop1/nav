import { useMemo, useState } from 'react';
import { Copy, History, RotateCcw, Search, Trash2 } from 'lucide-react';
import type { TranslationHistoryItem } from '../lib/translationHistory';

interface TranslationHistoryPanelProps {
  history: TranslationHistoryItem[];
  languageName: (code: string) => string;
  onUse: (item: TranslationHistoryItem) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

export function TranslationHistoryPanel({ history, languageName, onUse, onDelete, onClear }: TranslationHistoryPanelProps) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    if (!keyword) return history;
    return history.filter(item => `${item.sourceText}\n${item.translatedText}`.toLocaleLowerCase().includes(keyword));
  }, [history, query]);

  return (
    <details className="mt-4 rounded-xl border border-[#5f8f84]/15 bg-white/20 p-3 dark:border-[#c9a96b]/10 dark:bg-[#07191d]/20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#456b68] dark:text-[#d9ddd6]"><span className="flex items-center gap-2"><History size={16} />翻译历史</span><span className="text-xs font-normal text-[#718986]">{history.length} 条</span></summary>
      <div className="mt-3">
        <div className="flex gap-2">
          <label className="relative flex-1"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#829793]" /><input className="baize-input py-1.5 pl-9" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索原文或译文" /></label>
          <button type="button" disabled={!history.length} className="baize-danger-button px-3" onClick={() => { if (confirm('确定清空全部翻译历史吗？')) onClear(); }}><Trash2 size={15} />清空</button>
        </div>
        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
          {visible.map(item => <article key={item.id} className="rounded-xl border border-[#5f8f84]/12 bg-white/25 p-3 dark:border-[#c9a96b]/10 dark:bg-[#102c33]/35">
            <div className="flex items-center justify-between gap-2 text-[11px] text-[#829793]"><span>{languageName(item.sourceLanguage)} → {languageName(item.targetLanguage)}</span><time>{new Date(item.createdAt).toLocaleString()}</time></div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#526f6c] dark:text-[#b8c4c0]">{item.sourceText}</p>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#234b4e] dark:text-[#f4f1e8]">{item.translatedText}</p>
            <div className="mt-2 flex justify-end gap-1">
              <button type="button" className="baize-icon-button p-1.5" title="重新使用" onClick={() => onUse(item)}><RotateCcw size={14} /></button>
              <button type="button" className="baize-icon-button p-1.5" title="复制译文" onClick={() => { void navigator.clipboard.writeText(item.translatedText); }}><Copy size={14} /></button>
              <button type="button" className="baize-icon-button p-1.5 text-[#985247]" title="删除记录" onClick={() => onDelete(item.id)}><Trash2 size={14} /></button>
            </div>
          </article>)}
          {!visible.length && <p className="py-6 text-center text-xs text-[#829793]">{history.length ? '没有匹配记录。' : '成功翻译后会自动保存到本机。'}</p>}
        </div>
      </div>
    </details>
  );
}
