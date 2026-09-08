import { useCallback, useEffect, useRef, useState } from 'react';
import { advanceRestRotation, DEFAULT_REST_INTERVAL, REST_ROTATION_INTERVALS, REST_SCENES, type RestPlayhead } from '../../services/restPlaylist';

export function useRestPlaylist(running: boolean) {
  const [index, setIndex] = useState(0);
  const [interval, setIntervalSeconds] = useState<number>(DEFAULT_REST_INTERVAL);
  const [remaining, setRemaining] = useState<number>(DEFAULT_REST_INTERVAL);
  const [readyId, setReadyId] = useState<string | null>(null);
  const playhead = useRef<RestPlayhead>({ index: 0, elapsedMs: 0 });
  const scene = REST_SCENES[index];
  const ready = readyId === scene.id;
  const onReady = useCallback(() => setReadyId(scene.id), [scene.id]);
  const choose = (nextIndex: number) => {
    if (!Number.isInteger(nextIndex) || !REST_SCENES[nextIndex]) return;
    playhead.current = { index: nextIndex, elapsedMs: 0 };
    setRemaining(interval);
    if (nextIndex !== index) setReadyId(null);
    setIndex(nextIndex);
  };
  const changeInterval = (seconds: number) => {
    if (!REST_ROTATION_INTERVALS.some(value => value === seconds)) return;
    playhead.current = { index, elapsedMs: 0 };
    setIntervalSeconds(seconds);
    setRemaining(seconds);
  };
  useEffect(() => {
    if (!running || !ready) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now(), delta = now - last;
      last = now;
      if (document.hidden) return;
      const next = advanceRestRotation(playhead.current, delta, interval);
      playhead.current = next;
      setRemaining(Math.ceil(interval - next.elapsedMs / 1000));
      if (next.index !== index) { setReadyId(null); setIndex(next.index); }
    }, 250);
    return () => window.clearInterval(timer);
  }, [running, ready, interval, index]);
  return { index, scene, interval, remaining, ready, onReady, choose, changeInterval };
}
