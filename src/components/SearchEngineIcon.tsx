import { Github, Tv2 } from 'lucide-react';
import type { SearchEngineId } from '../types/navigation';

interface SearchEngineIconProps {
  engineId: SearchEngineId;
  className?: string;
}

export function SearchEngineIcon({ engineId, className = 'h-4 w-4' }: SearchEngineIconProps) {
  if (engineId === 'github') return <Github className={className} aria-hidden="true" data-engine-icon="github" />;
  if (engineId === 'bilibili') return <Tv2 className={className} aria-hidden="true" data-engine-icon="bilibili" />;

  if (engineId === 'google') {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-engine-icon="google">
        <path d="M20.4 12.2c0-.7-.1-1.4-.2-2H12v3.7h4.7a4 4 0 0 1-1.7 2.6v2.4h2.8c1.7-1.5 2.6-3.8 2.6-6.7Z" fill="#4285F4" />
        <path d="M12 20.7c2.3 0 4.3-.8 5.8-2.1L15 16.3c-.8.5-1.8.8-3 .8-2.3 0-4.3-1.6-5-3.7H4.1v2.4A8.8 8.8 0 0 0 12 20.7Z" fill="#34A853" />
        <path d="M7 13.4a5.3 5.3 0 0 1 0-3.4V7.6H4.1a8.8 8.8 0 0 0 0 8.2L7 13.4Z" fill="#FBBC05" />
        <path d="M12 6.3c1.3 0 2.4.4 3.3 1.3l2.5-2.4A8.3 8.3 0 0 0 4.1 7.6L7 10c.7-2.1 2.7-3.7 5-3.7Z" fill="#EA4335" />
      </svg>
    );
  }

  if (engineId === 'baidu') {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-engine-icon="baidu">
        <g fill="#2878ff">
          <ellipse cx="6.1" cy="8" rx="2.1" ry="2.8" transform="rotate(-24 6.1 8)" />
          <ellipse cx="10" cy="5.4" rx="2" ry="2.7" transform="rotate(-7 10 5.4)" />
          <ellipse cx="17.9" cy="8" rx="2.1" ry="2.8" transform="rotate(24 17.9 8)" />
          <ellipse cx="14" cy="5.4" rx="2" ry="2.7" transform="rotate(7 14 5.4)" />
          <path d="M12 10.1c-2.5 0-6.2 3.5-6.2 6.7 0 2 1.5 3.1 3.3 3.1 1.1 0 2-.7 2.9-.7s1.8.7 2.9.7c1.8 0 3.3-1.1 3.3-3.1 0-3.2-3.7-6.7-6.2-6.7Z" />
        </g>
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-engine-icon="bing">
      <path fill="#008373" d="M5 3.2 10.2 5v10.1l4.3-2.5-2.7-1.5V6.2L20 9.1v7.1L10.2 21 5 18V3.2Zm5.2 12v3.1l5.8-2.9v-1.7l-1.5-.8-4.3 2.3Z" />
    </svg>
  );
}
