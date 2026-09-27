import { motion } from 'framer-motion';
import { AlertTriangle, Clock3, ExternalLink, QrCode, Tag } from 'lucide-react';
import { getLinkHealthState, type LinkHealthEntry } from '../lib/linkHealth';
import { safeHostname, safeHttpUrl } from '../lib/navigationData.ts';
import type { Site } from '../types/navigation';

export function Card({ site, onVisit, onShowQr, dailyVisits = 0, health }: { site: Site; onVisit?: (siteId: string) => void; onShowQr?: (site: Site) => void; dailyVisits?: number; health?: LinkHealthEntry }) {
  const healthState = getLinkHealthState(health);
  const healthTitle = health?.error || (health?.status ? `HTTP ${health.status}` : undefined);

  const safeUrl = safeHttpUrl(site.url);
  const hostname = safeHostname(site.url);
  return (
    <motion.div
      className="site-card group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/70 bg-[#f7f6f0]/90 p-4 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-[#5f8f84]/60 hover:shadow-md dark:border-[#5f8f84]/20 dark:bg-[#102c33]/88 dark:hover:border-[#c9a96b]/50"
      whileHover={{ y: -2 }}
    >
      <a href={safeUrl || undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!safeUrl} onClick={event => { if (!safeUrl) { event.preventDefault(); return; } onVisit?.(site.id); }} className="flex h-full flex-col" aria-label={safeUrl ? '打开 ' + site.name : site.name + ' 的网址无效'}>
      <div className="site-card-header mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c9a96b]/25 bg-[#5f8f84]/12 text-lg font-bold text-[#356b66] dark:bg-[#c9a96b]/10 dark:text-[#dec58b]">
                {site.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
                <h3 className="truncate font-bold text-[#173b41] transition-colors group-hover:text-[#3f746e] dark:text-[#f4f1e8] dark:group-hover:text-[#dfc68e]">
                    {site.name}
                </h3>
                <p className="truncate text-xs text-[#78918c] dark:text-[#8fa39d]">
                    {hostname}
                </p>
            </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pr-7">
          {healthState === 'warning' && <span title={healthTitle} className="inline-flex items-center gap-1 rounded-md bg-[#c9a96b]/12 px-1.5 py-0.5 text-[10px] font-medium text-[#8a713d] dark:text-[#d9c386]"><Clock3 size={11} />待复查</span>}
          {healthState === 'unhealthy' && <span title={healthTitle} className="inline-flex items-center gap-1 rounded-md bg-[#a85d50]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#985247] dark:text-[#e1a294]"><AlertTriangle size={11} />异常</span>}
          {dailyVisits > 0 && <span className="rounded-md bg-[#5f8f84]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#52736f] dark:bg-[#c9a96b]/10 dark:text-[#d2b775]">今日 {dailyVisits}</span>}
          <ExternalLink className="h-4 w-4 text-[#91a6a1] opacity-0 transition-colors group-hover:text-[#356b66] group-hover:opacity-100 dark:group-hover:text-[#d2b775]" />
        </div>
      </div>

      <p className="site-description mb-4 line-clamp-2 flex-1 text-sm leading-6 text-[#526f6c] dark:text-[#bac7c3]">
        {site.description}
      </p>

      <div className="site-tags mt-auto flex flex-wrap gap-2">
        {site.tags?.map(tag => (
          <span key={tag} className="inline-flex items-center rounded-md border border-[#5f8f84]/15 bg-[#5f8f84]/8 px-2 py-0.5 text-xs font-medium text-[#4a706c] dark:border-[#c9a96b]/10 dark:bg-[#c9a96b]/8 dark:text-[#c9cbbf]">
            <Tag className="w-3 h-3 mr-1 opacity-50" />
            {tag}
          </span>
        ))}
      </div>
      </a>
      <button type="button" disabled={!safeUrl} className="baize-icon-button absolute right-2 top-2 z-10 p-1.5 opacity-65 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30" title={safeUrl ? '生成二维码' : '网址无效，无法生成二维码'} aria-label={'生成 ' + site.name + ' 的二维码'} onClick={() => safeUrl && onShowQr?.(site)}><QrCode size={15} /></button>
    </motion.div>
  );
}
