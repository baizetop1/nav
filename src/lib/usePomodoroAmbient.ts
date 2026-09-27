import { useEffect, useRef, useState } from 'react';
import { createPomodoroAmbient, type AmbientSnapshot, type AmbientTrack } from './pomodoroAmbient';

/** One controller belongs to the work card, shared by both presentation modes. */
export function usePomodoroAmbient(track: AmbientTrack, volume: number, onPreferencesChange: (track: AmbientTrack, volume: number) => void) {
  const [snapshot, setSnapshot] = useState<AmbientSnapshot>({ status: 'stopped' });
  const snapshotRef = useRef(snapshot);
  const player = useRef<ReturnType<typeof createPomodoroAmbient> | null>(null);
  const intendedTrack = useRef(track);
  const previewRequested = useRef(false);
  useEffect(() => {
    let mounted = true;
    const controller = createPomodoroAmbient(next => {
      if (mounted) { snapshotRef.current = next; setSnapshot(next); }
    });
    player.current = controller;
    return () => { mounted = false; player.current = null; controller.dispose(); };
  }, []);
  useEffect(() => {
    // A remote preference update must not start a new track without a gesture.
    if (intendedTrack.current !== track) { previewRequested.current = false; player.current?.stop(); }
    intendedTrack.current = track;
    player.current?.setVolume(volume);
  }, [track, volume]);
  return {
    track, volume, ...snapshot,
    onTrackChange: (next: AmbientTrack) => {
      intendedTrack.current = next;
      onPreferencesChange(next, volume);
      const status = snapshotRef.current.status;
      if (status === 'playing' || status === 'starting' || status === 'preview') void player.current?.play(next, volume, status === 'preview' || (status === 'starting' && previewRequested.current));
    },
    onVolumeChange: (next: number) => {
      const bounded = Math.round(Math.max(0, Math.min(100, Number.isFinite(next) ? next : volume)));
      player.current?.setVolume(bounded);
      onPreferencesChange(track, bounded);
    },
    onPlay: () => { previewRequested.current = false; void player.current?.play(track, volume); },
    onPreview: () => { previewRequested.current = true; void player.current?.play(track, volume, true); },
    onStop: () => { previewRequested.current = false; player.current?.stop(); },
  };
}
