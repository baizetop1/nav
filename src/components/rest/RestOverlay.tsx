import { Component, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronDown, Leaf, Pause, Play, Repeat, Waves, X } from 'lucide-react';
import { REST_SPEEDS } from '../../services/restAnimation';
import { REST_ROTATION_INTERVALS, REST_SCENES } from '../../services/restPlaylist';
import { useRestPlaylist } from './useRestPlaylist';
import './rest.css';

const RestScene = lazy(() => import('./RestScene'));
const BalloonScene = lazy(() => import('./BalloonScene'));
const RainScene = lazy(() => import('./RainScene'));
const CampScene = lazy(() => import('./CampScene'));
const PelicanScene = lazy(() => import('./PelicanScene'));
const ARTWORKS = { moonlight: RestScene, balloon: BalloonScene, rain: RainScene, camp: CampScene, pelican: PelicanScene };

function ReadyScene({ onReady, children }: { onReady: () => void; children: ReactNode }) {
  useEffect(onReady, [onReady]);
  return <>{children}</>;
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="rest-loading" role="status">这幅风景暂时没能加载，轮播已停下。可以选择其他风景，或联网刷新后再试；学习记录不会因此修改。</div> : this.props.children;
  }
}

export function RestOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <RestDialog onClose={onClose} /> : null;
}

function RestDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), returnButton = useRef<HTMLButtonElement>(null);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [paused, setPaused] = useState(reduced);
  const [visible, setVisible] = useState(!document.hidden);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [autoRotate, setAutoRotate] = useState(!reduced);
  const playing = !paused && visible;
  const playlist = useRestPlaylist(playing && autoRotate);
  const Artwork = ARTWORKS[playlist.scene.id];
  useLayoutEffect(() => {
    const element = dialog.current!;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    returnButton.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      const rect = previousFocus?.getBoundingClientRect();
      const canReturn = previousFocus?.isConnected && rect && rect.width > 0 && rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight;
      (canReturn ? previousFocus : document.querySelector<HTMLElement>('[data-rest-launcher]'))?.focus({ preventScroll: true });
    };
  }, []);
  // Passive cleanup of a closing command palette runs before this lock is acquired.
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  }, []);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const size = window.matchMedia('(max-width: 700px)');
    const motionChanged = () => { setReduced(preference.matches); if (preference.matches) { setPaused(true); setAutoRotate(false); } };
    const sizeChanged = () => setCompact(size.matches);
    const visibilityChanged = () => setVisible(!document.hidden);
    preference.addEventListener('change', motionChanged);
    size.addEventListener('change', sizeChanged);
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      preference.removeEventListener('change', motionChanged);
      size.removeEventListener('change', sizeChanged);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, []);
  return createPortal(<dialog ref={dialog} className="rest-dialog" aria-labelledby="rest-title" aria-describedby="rest-intro" data-rest-state={playing ? 'playing' : paused ? 'paused' : 'background'} data-rest-scene={playlist.scene.id} onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => {
    event.stopPropagation();
    if (event.key !== 'Tab') return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled)'));
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}>
    <div className="rest-page">
      <header className="rest-header">
        <div className="rest-brand"><span className="rest-brand-mark"><Leaf size={24} strokeWidth={1.4} /></span><span><strong>白泽 · 片刻留白</strong><small>把忙碌，暂时放在岸边</small></span></div>
        <button ref={returnButton} type="button" className="rest-return" onClick={onClose} aria-label="结束休息，返回刚才的页面"><span>返回刚才的页面</span><X size={19} /></button>
      </header>
      <section className="rest-scene" aria-label={playlist.scene.name + '休息动画'}>
        <SceneBoundary key={playlist.scene.id}><Suspense fallback={<div className="rest-loading" role="status">正在铺开一片小小的风景…</div>}><ReadyScene onReady={playlist.onReady}><Artwork playing={playing} speed={REST_SPEEDS[speedIndex]} compact={compact} /></ReadyScene></Suspense></SceneBoundary>
        <div className="rest-copy"><p className="rest-eyebrow"><span />给自己的小小假期</p><h1 id="rest-title">{playlist.scene.heading[0]}<br />{playlist.scene.heading[1]}</h1><p id="rest-intro">{playlist.scene.intro}</p></div>
        <div className="rest-stamp" aria-hidden="true"><Waves size={17} strokeWidth={1.3} /><span>{playlist.scene.stamp}</span></div>
        <div className="rest-scene-footer"><span>风景 0{playlist.index + 1} · {playlist.scene.name}</span><span>{playlist.scene.ending}</span></div>
      </section>
      <div className="rest-playlist-row">
        <nav className="rest-scene-choices" aria-label="选择休息风景">{REST_SCENES.map((scene, index) => <button key={scene.id} type="button" aria-label={'选择' + scene.name} aria-pressed={playlist.index === index} onClick={() => playlist.choose(index)}><span aria-hidden="true">0{index + 1}</span>{scene.name}</button>)}</nav>
        <div className="rest-rotation-controls">
          <button type="button" className="rest-rotation-toggle" aria-label={autoRotate ? '关闭自动轮播' : '开启自动轮播'} aria-pressed={autoRotate} onClick={() => setAutoRotate(value => !value)}><Repeat size={14} />轮播{autoRotate ? '开启' : '关闭'}</button>
          <label className="rest-interval"><select aria-label="轮播间隔" value={playlist.interval} onChange={event => playlist.changeInterval(Number(event.target.value))}>{REST_ROTATION_INTERVALS.map(seconds => <option key={seconds} value={seconds}>每{seconds < 60 ? seconds + '秒' : seconds / 60 + '分钟'}</option>)}</select><ChevronDown size={12} aria-hidden="true" /></label>
          <span className="rest-countdown" data-remaining={playlist.remaining}>{!autoRotate ? '停留此景' : !playlist.ready ? '等待画面' : !playing ? '计时暂停' : playlist.remaining + ' 秒后切换'}</span>
        </div>
      </div>
      <div className="rest-toolbar">
        <div className="rest-about"><Waves size={27} strokeWidth={1.3} /><div><h2 aria-live="polite">{playlist.scene.title}</h2><p>进度留在原处。准备好了，再继续。</p></div></div>
        <div className="rest-controls">
          <span className="rest-status" aria-live="polite"><i data-paused={!playing} />{paused ? '停一停，看看风景' : visible ? '风景缓缓流动' : '后台已暂停'}</span>
          <div className="rest-playback">
            <button type="button" className="rest-speed" onClick={() => setSpeedIndex(index => (index + 1) % REST_SPEEDS.length)} aria-label={'切换动画速度，当前 ' + REST_SPEEDS[speedIndex] + ' 倍速'}>速度 <span>{REST_SPEEDS[speedIndex]}×</span></button>
            <button type="button" className="rest-play" onClick={() => setPaused(value => !value)} aria-label={paused ? '播放休息动画' : '暂停休息动画'} aria-pressed={paused}>{paused ? <Play size={17} fill="currentColor" /> : <Pause size={17} fill="currentColor" />}</button>
          </div>
          <button type="button" className="rest-back" onClick={onClose}><ArrowLeft size={16} />休息好了</button>
        </div>
      </div>
      <footer className="rest-footer"><span>{reduced ? '已减少动态效果，可手动播放和开启轮播。' : '按自己的节奏，歇一会儿。'}</span><span>无声音 · 已加载的风景可离线播放</span></footer>
    </div>
  </dialog>, document.body);
}
