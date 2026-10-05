import { useState } from 'react';
import { ChevronUp, Clock3, ExternalLink, Globe2, Trash2, X } from 'lucide-react';
import type { TemporaryVisitSummary } from '../lib/temporaryVisits';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../lib/safeStorage';

const COLLAPSED_KEY = 'nav_temporary_visits_collapsed';

export interface TemporaryVisitsPanelProps {
  visits: TemporaryVisitSummary[];
  onVisit: (url: string) => string | null;
  onDelete: (key: string) => void;
  onClear: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function formatVisitedAt(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

export function TemporaryVisitsPanel({ visits, onVisit, onDelete, onClear, open, onOpenChange }: TemporaryVisitsPanelProps) {
  const [localCollapsed, setCollapsed] = useState(() => safeGetLocalStorageItem(COLLAPSED_KEY, { label: '临时访问折叠偏好', important: false }) === 'true');
  const collapsed = open === undefined ? localCollapsed : !open;
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const totalVisits = visits.reduce((total, visit) => total + visit.count, 0);

  const toggle = () => {
    if (onOpenChange) { safeSetLocalStorageItem(COLLAPSED_KEY, String(!collapsed), { label: '临时访问折叠偏好', important: false }); onOpenChange(collapsed); return; }
    setCollapsed(current => {
    safeSetLocalStorageItem(COLLAPSED_KEY, String(!current), { label: '临时访问折叠偏好', important: false });
    return !current;
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const message = onVisit(input);
    if (message) {
      setError(message);
      return;
    }
    setInput('');
    setError('');
  };

  if (collapsed) {
    if (open !== undefined) return null;
    return (
      <button type="button" className="baize-button-secondary utility-launcher-button" onClick={toggle} aria-controls="temporary-visits" aria-expanded="false">
        <Clock3 size={17} />临时访问
        {visits.length > 0 && <span className="utility-launcher-badge">{visits.length}</span>}
      </button>
    );
  }

  return (
    <section id="temporary-visits" className="baize-panel basis-full rounded-2xl p-4 sm:p-5" aria-labelledby="temporary-visits-title">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="temporary-visits-title" className="flex items-center gap-2 text-sm font-semibold appearance-heading">
            <Clock3 size={17} />临时访问
            {visits.length > 0 && <span className="rounded-full appearance-soft px-2 py-0.5 text-[11px] font-medium appearance-accent">30 天内 {totalVisits} 次</span>}
          </h2>
          <p className="mt-1 truncate text-xs appearance-muted">记录未加入正式导航的网址，30 天后自动清理</p>
        </div>
        <button type="button" className="baize-icon-button flex shrink-0 items-center gap-1 text-xs" aria-expanded="true" onClick={toggle}>
          <ChevronUp size={16} />收起
        </button>
      </header>

      <>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="temporary-url-input">输入临时访问网址</label>
          <div className="relative min-w-0 flex-1">
            <Globe2 size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 appearance-muted" />
            <input
              id="temporary-url-input"
              className="baize-input py-2.5 pl-10"
              value={input}
              onChange={event => { setInput(event.target.value); setError(''); }}
              placeholder="粘贴网址，例如 example.com/path"
              autoComplete="url"
              spellCheck={false}
            />
          </div>
          <button type="submit" className="baize-button-primary justify-center sm:min-w-28" disabled={!input.trim()}><ExternalLink size={16} />访问并记录</button>
        </form>
        {error && <p className="mt-2 text-xs text-[#985247] dark:text-[#e1a294]">{error}</p>}

        {visits.length > 0 ? <>
          <div className="mt-4 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
            {visits.map(visit => (
              <div key={visit.key} className="group flex min-w-0 items-center gap-2 rounded-xl border appearance-border appearance-soft p-2.5">
                <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setError(onVisit(visit.url) || '')} title={`再次访问 ${visit.url}`}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg appearance-soft font-bold appearance-accent">{visit.hostname.slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm appearance-heading">{visit.hostname}</strong>
                    <span className="block truncate text-[11px] appearance-muted" title={visit.url}>{visit.url}</span>
                  </span>
                  <span className="shrink-0 text-right text-[10px] leading-4 appearance-muted">
                    <strong className="block text-xs appearance-heading">{visit.count} 次</strong>
                    {formatVisitedAt(visit.lastVisitedAt)}
                  </span>
                </button>
                <button type="button" className="baize-icon-button shrink-0 p-1.5 opacity-60 hover:text-[#985247] hover:opacity-100" onClick={() => onDelete(visit.key)} title="删除这条记录" aria-label={`删除 ${visit.hostname} 的临时访问记录`}><X size={14} /></button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <button type="button" className="inline-flex items-center gap-1 text-xs appearance-muted transition hover:text-[#985247] dark:hover:text-[#e1a294]" onClick={() => { if (confirm('确定清空全部临时访问记录吗？')) onClear(); }}><Trash2 size={13} />清空记录</button>
          </div>
        </> : <p className="mt-4 rounded-xl appearance-soft px-3 py-4 text-center text-xs appearance-muted">还没有临时网址。输入网址访问后，会在这里保留 30 天。</p>}
      </>
    </section>
  );
}
