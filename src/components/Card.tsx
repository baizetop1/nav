import { motion } from 'framer-motion';
import { ExternalLink, Tag } from 'lucide-react';
import { Site } from '../data';

export function Card({ site }: { site: Site }) {
  return (
    <motion.a
      href={site.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-all duration-300 overflow-hidden h-full"
      whileHover={{ y: -2 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 font-bold text-lg shrink-0">
                {site.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {site.name}
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {new URL(site.url).hostname.replace('www.', '')}
                </p>
            </div>
        </div>
        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0" />
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 flex-1">
        {site.description}
      </p>

      <div className="mt-auto flex flex-wrap gap-2">
        {site.tags?.map(tag => (
          <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            <Tag className="w-3 h-3 mr-1 opacity-50" />
            {tag}
          </span>
        ))}
      </div>
    </motion.a>
  );
}
