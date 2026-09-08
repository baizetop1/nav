import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { advanceRestTime } from '../../services/restAnimation';

export interface RestSceneryProps { playing: boolean; speed: number; compact: boolean }
export type SceneryParts = Map<string | undefined, SVGElement>;
type Parts = SceneryParts;
export const movePart = (parts: Parts, name: string, value: string) => parts.get(name)?.setAttribute('transform', value);
export const fadePart = (parts: Parts, name: string, value: number) => parts.get(name)?.setAttribute('opacity', String(value));
export function useRestMotion(playing: boolean, speed: number, draw: (parts: Parts, time: number) => void) {
  const ref = useRef<SVGSVGElement>(null), elapsed = useRef(0);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const parts = new Map(Array.from(svg.querySelectorAll<SVGElement>('[data-part]')).map(node => [node.dataset.part, node]));
    const paint = () => { svg.dataset.sceneTime = elapsed.current.toFixed(3); draw(parts, elapsed.current); };
    paint();
    if (!playing) return;
    let frame = 0, last: number | null = null;
    const tick = (time: number) => {
      if (last === null) last = time;
      if (time - last >= 1000 / 30) { elapsed.current = advanceRestTime(elapsed.current, time - last, speed); last = time; paint(); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, draw]);
  return ref;
}
export function useSceneryId() { const uid = 'scenery-' + useId().replace(/:/g, ''); return (name: string) => uid + '-' + name; }
export function SceneryFrame({ svgRef, id, compact, title, description, children }: { svgRef: RefObject<SVGSVGElement>; id: (name: string) => string; compact: boolean; title: string; description: string; children: ReactNode }) {
  return <svg ref={svgRef} className="rest-art" viewBox={compact ? '0 0 1440 900' : '0 0 1440 820'} preserveAspectRatio="xMidYMid slice" role="img" aria-labelledby={id('title') + ' ' + id('description')}>
    <title id={id('title')}>{title}</title><desc id={id('description')}>{description}</desc>
    <defs>
      <pattern id={id('grain')} width="43" height="37" patternUnits="userSpaceOnUse"><circle cx="6" cy="9" r=".7" fill="#384f4a" opacity=".075" /><circle cx="31" cy="23" r=".6" fill="#fffbe8" opacity=".3" /><circle cx="19" cy="34" r=".6" fill="#456b60" opacity=".08" /></pattern>
      <radialGradient id={id('glow')}><stop stopColor="#ffe8b2" stopOpacity=".6" /><stop offset="1" stopColor="#ffe8b2" stopOpacity="0" /></radialGradient>
      <g id={id('cloud')} fill="#faf1da"><path d="M-140 12c-33-28 1-61 30-51 5-48 74-70 101-26 44-49 114-11 105 29 56-4 79 41 44 48Z" /><path d="M-165 30h332" stroke="#faf1da" strokeWidth="5" strokeLinecap="round" opacity=".35" /></g>
      <g id={id('pine')}><path d="m0-100-30 52h13L-43-5h20L-58 45h116L23-5h20L17-48h13Z" /><path d="M0 31v50" fill="none" stroke="currentColor" strokeWidth="6" /></g>
      <g id={id('star')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M0-6V6M-6 0H6" /></g>
    </defs>
    {children}
    <path d="M0 0h1440v900H0Z" fill={'url(#' + id('grain') + ')'} pointerEvents="none" />
  </svg>;
}
