import { useId } from 'react';
import { Headphones, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import './PomodoroAmbientControls.css';

export interface AmbientControlsProps {
  track: 'rain' | 'stream' | 'white-noise';
  volume: number;
  status: 'stopped' | 'starting' | 'playing' | 'preview' | 'interrupted' | 'error';
  error?: string;
  onTrackChange: (track: AmbientControlsProps['track']) => void;
  onVolumeChange: (volume: number) => void;
  onPlay: () => void;
  onPreview: () => void;
  onStop: () => void;
}

export const AMBIENT_TRACK_LABELS: Record<AmbientControlsProps['track'], string> = {
  rain: '雨声', stream: '溪流', 'white-noise': '白噪音',
};
export const AMBIENT_STATUS_LABELS: Record<AmbientControlsProps['status'], string> = {
  stopped: '未播放', starting: '正在启动', playing: '播放中', preview: '试听中', interrupted: '已中断', error: '播放失败',
};

/** Pure playback controls: the owning work session manages the single engine. */
export function PomodoroAmbientControls({ track, volume, status, error, onTrackChange, onVolumeChange, onPlay, onPreview, onStop, immersive = false }: AmbientControlsProps & { immersive?: boolean }) {
  const trackId = useId(), volumeId = useId(), helpId = useId();
  const safeVolume = Number.isFinite(volume) ? Math.max(0, Math.min(100, Math.round(volume))) : 0;
  const playing = status === 'playing' || status === 'preview';
  const canStop = playing || status === 'starting';
  const warning = status === 'interrupted'
    ? error || '背景音已被浏览器中断，点击“播放背景音”可重试。'
    : status === 'error' ? `背景音暂时无法播放，请点击“播放背景音”重试。${error ? ` ${error}` : ''}` : '';

  return <section className={`pomo-ambient-controls${immersive ? ' is-immersive' : ''}`} data-ambient-status={status} aria-label="背景声音播放器">
    <div className="pomo-ambient-heading"><h3><Headphones size={16} aria-hidden="true" />背景声音</h3><span className="pomo-ambient-status" role="status">{AMBIENT_STATUS_LABELS[status]}{status === 'preview' ? ' · 5 秒' : ''}{safeVolume === 0 ? ' · 已静音' : ''}</span></div>
    <div className="pomo-ambient-row">
      <label className="pomo-ambient-track" htmlFor={trackId}><span>声音类型</span><select id={trackId} aria-label="背景声音类型" value={track} onChange={event => onTrackChange(event.target.value as AmbientControlsProps['track'])}>{Object.entries(AMBIENT_TRACK_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="pomo-ambient-volume"><label htmlFor={volumeId}>{safeVolume === 0 ? <VolumeX size={14} aria-hidden="true" /> : <Volume2 size={14} aria-hidden="true" />}<span>音量</span><output htmlFor={volumeId}>{safeVolume}%{safeVolume === 0 ? ' · 静音' : ''}</output></label><input id={volumeId} type="range" min={0} max={100} step={1} aria-label="背景声音音量" aria-valuetext={`${safeVolume}%${safeVolume === 0 ? '，已静音' : ''}`} aria-describedby={helpId} value={safeVolume} onChange={event => onVolumeChange(Number(event.target.value))} /></div>
      <div className="pomo-ambient-actions"><button type="button" className="pomo-ambient-button pomo-ambient-primary" onClick={canStop ? onStop : onPlay}>{canStop ? <Pause size={14} /> : <Play size={14} />}{canStop ? '暂停背景音' : '播放背景音'}</button><button type="button" className="pomo-ambient-button" disabled={canStop} onClick={onPreview}>试听5秒</button></div>
    </div>
    {warning && <p className="pomo-ambient-warning" role="alert">{warning}</p>}
    <p id={helpId} className="pomo-ambient-help">本地合成环境音 · 与到时提示音独立</p>
  </section>;
}

export default PomodoroAmbientControls;
