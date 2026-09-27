/** Locally synthesized ambience, not field recordings. No media files or network. */
export type AmbientTrack = 'rain' | 'stream' | 'white-noise';
export type AmbientStatus = 'stopped' | 'starting' | 'playing' | 'preview' | 'interrupted' | 'error';
export interface AmbientSnapshot { status: AmbientStatus; error?: string }
export interface PomodoroAmbient {
  play(track: AmbientTrack, volume: number, preview?: boolean): Promise<void>;
  setVolume(volume: number): void;
  stop(): void;
  dispose(): void;
}

type Timer = ReturnType<typeof setTimeout>;
type Source = AudioBufferSourceNode | OscillatorNode;
interface Graph {
  context: AudioContext;
  output: GainNode;
  nodes: AudioNode[];
  sources: Source[];
  timer: Timer | null;
  previewEnd: number | null;
  released: boolean;
}
interface Claim { sender: string; at: number; sequence: number }
const CHANNEL = 'baize-pomodoro-ambient-v1';
const FADE_SECONDS = 0.22;
const TRACKS: AmbientTrack[] = ['rain', 'stream', 'white-noise'];
const volumeValue = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
const outputLevel = (volume: number) => Math.pow(volumeValue(volume) / 100, 1.65) * 0.24;

function ramp(param: AudioParam, target: number, now: number, duration = FADE_SECONDS): void {
  if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
  else { const previous = param.value; param.cancelScheduledValues(now); param.setValueAtTime(previous, now); }
  param.linearRampToValueAtTime(target, now + duration);
}

/** Six seconds per stereo track. A constant-power overlap joins the end to the
 * beginning without a gain dip or hard splice. All synthesis runs once on play;
 * subsequent samples, filtering and slow movement are handled by Web Audio. */
function synthesize(context: AudioContext, track: AmbientTrack): AudioBuffer {
  const rate = context.sampleRate;
  const length = Math.max(2, Math.round(rate * 6));
  const overlap = Math.max(2, Math.round(rate * 0.06));
  const buffer = context.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel += 1) {
    const raw = new Float32Array(length + overlap);
    let smooth = 0, envelope = 0, phase = 0;
    let rippleFrequency = 700;
    const decay = Math.exp(-1 / (rate * (track === 'rain' ? 0.025 : 0.075)));
    for (let index = 0; index < raw.length; index += 1) {
      const white = Math.random() * 2 - 1;
      smooth = smooth * 0.96 + white * 0.04;
      if (track === 'rain') {
        if (Math.random() < 11 / rate) envelope = 0.3 + Math.random() * 0.7;
        envelope *= decay;
        raw[index] = white * (0.62 + envelope * 0.45) + smooth * 0.35;
      } else if (track === 'stream') {
        if (Math.random() < 15 / rate) { envelope = 0.25 + Math.random() * 0.75; rippleFrequency = 450 + Math.random() * 1350; }
        envelope *= decay;
        phase += 2 * Math.PI * rippleFrequency * (0.7 + envelope * 0.3) / rate;
        raw[index] = smooth * 2.2 + white * 0.12 + Math.sin(phase) * envelope * 0.17;
      } else raw[index] = white;
    }
    const output = buffer.getChannelData(channel);
    let energy = 0;
    for (let index = 0; index < length; index += 1) {
      if (index < overlap) {
        const angle = index / (overlap - 1) * Math.PI / 2;
        output[index] = raw[length + index] * Math.cos(angle) + raw[index] * Math.sin(angle);
      } else output[index] = raw[index];
      energy += output[index] * output[index];
    }
    const normalization = Math.min(3, 0.3 / Math.sqrt(energy / length || 1));
    for (let index = 0; index < length; index += 1) output[index] = Math.max(-0.95, Math.min(0.95, output[index] * normalization));
  }
  return buffer;
}

export function createPomodoroAmbient(onChange: (state: AmbientSnapshot) => void): PomodoroAmbient {
  let context: AudioContext | null = null;
  let active: Graph | null = null;
  let disposed = false;
  let generation = 0;
  let volume = 35;
  let previewTimer: Timer | null = null;
  let channel: BroadcastChannel | null = null;
  let claim: Claim | null = null;
  const sender = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const graphs = new Set<Graph>();
  const buffers = new Map<AmbientTrack, AudioBuffer>();
  const pending = new Set<() => void>();
  const emit = (state: AmbientSnapshot) => { if (!disposed) { try { onChange(state); } catch { /* UI subscribers cannot break audio cleanup. */ } } };
  const clearPreview = () => { if (previewTimer !== null) clearTimeout(previewTimer); previewTimer = null; };

  function release(graph: Graph): void {
    if (graph.released) return;
    graph.released = true;
    if (graph.timer !== null) clearTimeout(graph.timer);
    graph.timer = null;
    for (const source of graph.sources) {
      source.onended = null;
      try { source.stop(); } catch { /* An already ended source needs no second stop. */ }
    }
    for (const node of graph.nodes) { try { node.disconnect(); } catch { /* Best-effort cleanup after browser interruption. */ } }
    graph.sources.length = 0;
    graph.nodes.length = 0;
    graphs.delete(graph);
  }

  function fadeOut(graph: Graph): void {
    if (graph.released || graph.timer !== null) return;
    const at = graph.context.currentTime;
    try {
      const stopAt = Math.min(graph.previewEnd ?? Infinity, at + FADE_SECONDS + 0.02);
      ramp(graph.output.gain, 0, at, Math.max(0, Math.min(FADE_SECONDS, stopAt - at)));
      let remaining = graph.sources.length;
      for (const source of graph.sources) {
        source.onended = () => { remaining -= 1; if (remaining <= 0) release(graph); };
        // Audio-time stop is reliable even when background JS timers are throttled.
        source.stop(stopAt);
      }
      graph.timer = setTimeout(() => release(graph), (FADE_SECONDS + 0.06) * 1000);
    } catch { release(graph); }
  }

  function updateOutput(graph: Graph, duration = FADE_SECONDS): void {
    const at = graph.context.currentTime, end = graph.previewEnd;
    if (end !== null && at >= end - FADE_SECONDS) {
      ramp(graph.output.gain, 0, at, Math.max(0, end - at));
      return;
    }
    const level = outputLevel(volume);
    ramp(graph.output.gain, level, at, end === null ? duration : Math.min(duration, end - FADE_SECONDS - at));
    if (end !== null) {
      graph.output.gain.setValueAtTime(level, end - FADE_SECONDS);
      graph.output.gain.linearRampToValueAtTime(0, end);
    }
  }

  function cancelPending(): void {
    for (const cancel of [...pending]) cancel();
    pending.clear();
  }

  function stopWith(snapshot: AmbientSnapshot, immediate = false): void {
    generation += 1;
    claim = null;
    cancelPending();
    clearPreview();
    active = null;
    for (const graph of [...graphs]) immediate ? release(graph) : fadeOut(graph);
    emit(snapshot);
  }

  function ensureChannel(): void {
    if (channel || typeof BroadcastChannel === 'undefined') return;
    try {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = event => {
        const incoming = event.data as Partial<Claim> & { type?: string };
        if (incoming?.type !== 'play' || incoming.sender === sender || typeof incoming.sender !== 'string'
          || typeof incoming.at !== 'number' || !Number.isFinite(incoming.at) || incoming.at > Date.now() + 5000
          || !Number.isSafeInteger(incoming.sequence) || !claim) return;
        // Compare request times, not asynchronous resume completion times.
        const newer = incoming.at > claim.at
          || (incoming.at === claim.at && incoming.sender > claim.sender);
        if (newer) stopWith({ status: 'interrupted', error: '另一个标签页已开始播放，本页环境音已停止。需要时请重新点击播放。' });
      };
    } catch { channel = null; /* Cross-tab coordination is optional. */ }
  }

  function ensureContext(): AudioContext {
    if (context && context.state !== 'closed') return context;
    if (context) context.onstatechange = null;
    const Audio = (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).AudioContext
      || (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (typeof Audio !== 'function') throw new Error('当前浏览器不支持背景音，请使用支持 Web Audio 的浏览器。');
    const next = new Audio();
    context = next;
    buffers.clear();
    next.onstatechange = () => {
      if (context !== next || disposed || !active) return;
      if (String(next.state) !== 'running') {
        stopWith({ status: 'interrupted', error: '背景音已被系统或浏览器中断，请重新点击播放；不会自动恢复声音。' }, true);
      }
    };
    return next;
  }

  function awaitResume(audio: AudioContext): Promise<boolean> {
    if (audio.state === 'running') return Promise.resolve(true);
    // Call resume synchronously inside play's user gesture, before any await.
    let resume: Promise<void>;
    try { resume = audio.resume(); } catch (error) { return Promise.reject(error); }
    return new Promise<boolean>((resolve, reject) => {
      let settled = false;
      let timer: Timer | null = null;
      const finish = (ready: boolean, error?: unknown) => {
        if (settled) return;
        settled = true;
        if (timer !== null) clearTimeout(timer);
        pending.delete(cancel);
        error ? reject(error) : resolve(ready);
      };
      const cancel = () => finish(false);
      pending.add(cancel);
      timer = setTimeout(() => finish(false, new Error('浏览器未允许播放背景音，请再次点击播放或检查网站声音权限。')), 5000);
      Promise.resolve(resume).then(() => finish(true), error => finish(false, error));
    });
  }

  function createGraph(audio: AudioContext, track: AmbientTrack, preview: boolean, request: number): Graph {
    const output = audio.createGain();
    const graph: Graph = { context: audio, output, nodes: [output], sources: [], timer: null, previewEnd: null, released: false };
    graphs.add(graph);
    const own = <T extends AudioNode>(node: T): T => { graph.nodes.push(node); return node; };
    const voice = <T extends Source>(node: T): T => { own(node); graph.sources.push(node); return node; };
    try {
      output.gain.setValueAtTime(0, audio.currentTime);
      output.connect(audio.destination);
      const source = voice(audio.createBufferSource());
      let buffer = buffers.get(track);
      if (!buffer) { buffer = synthesize(audio, track); buffers.set(track, buffer); }
      source.buffer = buffer;
      source.loop = true;
      const high = own(audio.createBiquadFilter()), low = own(audio.createBiquadFilter());
      high.type = 'highpass';
      high.frequency.value = track === 'rain' ? 380 : track === 'stream' ? 90 : 35;
      high.Q.value = 0.55;
      low.type = 'lowpass';
      low.frequency.value = Math.min(audio.sampleRate * 0.43, track === 'rain' ? 6800 : track === 'stream' ? 2100 : 14000);
      low.Q.value = track === 'stream' ? 0.8 : 0.55;
      source.connect(high); high.connect(low);
      if (track === 'white-noise') low.connect(output);
      else {
        const movement = own(audio.createGain()), lfo = voice(audio.createOscillator()), depth = own(audio.createGain());
        movement.gain.value = 0.9;
        lfo.type = 'sine'; lfo.frequency.value = track === 'rain' ? 0.073 : 0.23;
        depth.gain.value = track === 'rain' ? 0.06 : 0.1;
        lfo.connect(depth); depth.connect(movement.gain);
        low.connect(movement); movement.connect(output);
        if (track === 'stream') {
          const ripple = voice(audio.createOscillator()), rippleDepth = own(audio.createGain());
          ripple.type = 'sine'; ripple.frequency.value = 0.137;
          rippleDepth.gain.value = Math.min(380, low.frequency.value * 0.18);
          ripple.connect(rippleDepth); rippleDepth.connect(low.frequency);
        }
      }
      if (preview) graph.previewEnd = audio.currentTime + 5;
      for (const voice of graph.sources) voice.start();
      updateOutput(graph);
      if (graph.previewEnd !== null) {
        let remaining = graph.sources.length;
        for (const voice of graph.sources) {
          voice.onended = () => {
            remaining -= 1;
            if (remaining > 0) return;
            const wasActive = !disposed && generation === request && active === graph;
            release(graph);
            if (wasActive) {
              active = null; claim = null; clearPreview(); generation += 1;
              emit({ status: 'stopped' });
            }
          };
          // Unlike a JS timeout, this still ends the preview when a background
          // page is throttled/frozen. Gain automation fades before this stop.
          voice.stop(graph.previewEnd);
        }
      }
      return graph;
    } catch (error) { release(graph); throw error; }
  }

  async function play(track: AmbientTrack, requestedVolume: number, preview = false): Promise<void> {
    if (disposed) return;
    const request = ++generation;
    cancelPending(); clearPreview();
    if (active) fadeOut(active);
    active = null;
    volume = volumeValue(requestedVolume);
    claim = { sender, at: Date.now(), sequence: request };
    emit({ status: 'starting' });
    try {
      if (!TRACKS.includes(track)) throw new Error('无法识别此环境音，请重新选择雨声、溪流或白噪音。');
      ensureChannel();
      const audio = ensureContext();
      const ready = await awaitResume(audio);
      if (!ready || disposed || request !== generation) return;
      if (String(audio.state) !== 'running') {
        stopWith({ status: 'interrupted', error: '浏览器尚未允许背景音播放，请重新点击播放并检查网站声音权限。' }, true);
        return;
      }
      active = createGraph(audio, track, preview, request);
      emit({ status: preview ? 'preview' : 'playing' });
      if (disposed || request !== generation) return;
      try { channel?.postMessage({ ...claim, type: 'play' }); } catch { /* Local playback is independent from optional coordination. */ }
      if (preview) previewTimer = setTimeout(() => { previewTimer = null; if (!disposed && request === generation) stopWith({ status: 'stopped' }); }, 5000);
    } catch (error) {
      if (disposed || request !== generation) return;
      const denied = error instanceof Error && ['NotAllowedError', 'SecurityError'].includes(error.name);
      const message = denied ? '浏览器阻止了背景音，请再次点击播放或允许此网站播放声音。'
        : error instanceof Error && /浏览器|环境音|背景音/.test(error.message) ? error.message
          : '背景音暂时无法播放，请重新点击重试；专注计时与到时提醒不受影响。';
      stopWith({ status: denied ? 'interrupted' : 'error', error: message }, true);
    }
  }

  function setVolume(value: number): void {
    volume = volumeValue(value);
    if (!active || disposed) return;
    try { updateOutput(active, 0.08); }
    catch { stopWith({ status: 'error', error: '无法调整背景音音量，请重新点击播放。' }, true); }
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    stopWith({ status: 'stopped' }, true);
    if (channel) { channel.onmessage = null; try { channel.close(); } catch { /* A closed channel must not block audio disposal. */ } channel = null; }
    if (context) {
      const previous = context; context = null;
      previous.onstatechange = null;
      try { void Promise.resolve(previous.close()).catch(() => {}); } catch { /* Already closed by the browser. */ }
    }
    buffers.clear();
  }

  // No AudioContext, resume, media element or sound is created before play().
  return { play, setVolume, stop: () => { if (!disposed) stopWith({ status: 'stopped' }); }, dispose };
}
