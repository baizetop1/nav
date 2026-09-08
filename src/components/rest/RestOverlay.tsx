import { Component, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Leaf, Pause, Play, Waves, X } from 'lucide-react';
import { REST_SPEEDS } from '../../services/restAnimation';
import './rest.css';

const RestScene = lazy(() => import('./RestScene'));

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="rest-loading" role="status">动画暂时没能加载。可以先返回，联网刷新后再试；学习记录不会因此修改。</div> : this.props.children;
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
  const playing = !paused && visible;
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
    const motionChanged = () => { setReduced(preference.matches); if (preference.matches) setPaused(true); };
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
  return createPortal(<dialog ref={dialog} className="rest-dialog" aria-labelledby="rest-title" aria-describedby="rest-intro" data-rest-state={playing ? 'playing' : paused ? 'paused' : 'background'} onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => {
    event.stopPropagation();
    if (event.key !== 'Tab') return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}>
    <div className="rest-page">
      <header className="rest-header">
        <div className="rest-brand"><span className="rest-brand-mark"><Leaf size={24} strokeWidth={1.4} /></span><span><strong>白泽 · 片刻留白</strong><small>把忙碌，暂时放在岸边</small></span></div>
        <button ref={returnButton} type="button" className="rest-return" onClick={onClose} aria-label="结束休息，返回刚才的页面"><span>返回刚才的页面</span><X size={19} /></button>
      </header>
      <section className="rest-scene" aria-label="月光泛舟休息动画">
        <SceneBoundary><Suspense fallback={<div className="rest-loading" role="status">正在铺开一片小小的风景…</div>}><RestScene playing={playing} speed={REST_SPEEDS[speedIndex]} compact={compact} /></Suspense></SceneBoundary>
        <div className="rest-copy"><p className="rest-eyebrow"><span />给自己的小小假期</p><h1 id="rest-title">让思绪，<br />漂一会儿。</h1><p id="rest-intro">今晚的任务，是看一会儿月亮。</p></div>
        <div className="rest-stamp" aria-hidden="true"><Waves size={17} strokeWidth={1.3} /><span>慢一点，也很好</span></div>
        <div className="rest-scene-footer"><span>风景 01 · 月光泛舟</span><span>前方没有待办，只有晚风。</span></div>
      </section>
      <div className="rest-toolbar">
        <div className="rest-about"><Waves size={27} strokeWidth={1.3} /><div><h2>小狐狸的月光泛舟</h2><p>进度留在原处。准备好了，再继续。</p></div></div>
        <div className="rest-controls">
          <span className="rest-status" aria-live="polite"><i data-paused={!playing} />{paused ? '停一停，看看风景' : visible ? '慢慢划行中' : '后台已暂停'}</span>
          <div className="rest-playback">
            <button type="button" className="rest-speed" onClick={() => setSpeedIndex(index => (index + 1) % REST_SPEEDS.length)} aria-label={'切换动画速度，当前 ' + REST_SPEEDS[speedIndex] + ' 倍速'}>速度 <span>{REST_SPEEDS[speedIndex]}×</span></button>
            <button type="button" className="rest-play" onClick={() => setPaused(value => !value)} aria-label={paused ? '播放休息动画' : '暂停休息动画'} aria-pressed={paused}>{paused ? <Play size={17} fill="currentColor" /> : <Pause size={17} fill="currentColor" />}</button>
          </div>
          <button type="button" className="rest-back" onClick={onClose}><ArrowLeft size={16} />休息好了</button>
        </div>
      </div>
      <footer className="rest-footer"><span>{reduced ? '已尊重系统减少动态效果设置，可手动播放。' : '不计时，也不催你。'}</span><span>无声音 · 无需联网播放已加载的风景</span></footer>
    </div>
  </dialog>, document.body);
}
