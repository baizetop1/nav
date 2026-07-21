import { motion } from 'framer-motion';
import { ExternalLink, Tag } from 'lucide-react';
import type { Site } from '../types/navigation';

export function Card({ site }: { site: Site }) {
  return (
    <motion.a
      href={site.url}
      target="_blank"
      rel="noopener noreferrer"
      className="site-card group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/70 bg-[#f7f6f0]/90 p-4 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-[#5f8f84]/60 hover:shadow-md dark:border-[#5f8f84]/20 dark:bg-[#102c33]/88 dark:hover:border-[#c9a96b]/50"
      whileHover={{ y: -2 }}
    >
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
                    {new URL(site.url).hostname.replace('www.', '')}
                </p>
            </div>
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-[#91a6a1] opacity-0 transition-colors group-hover:text-[#356b66] group-hover:opacity-100 dark:group-hover:text-[#d2b775]" />
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
    </motion.a>
  );
}
