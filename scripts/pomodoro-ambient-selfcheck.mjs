import assert from 'node:assert/strict';
import { createPomodoroAmbient } from '../src/lib/pomodoroAmbient.ts';

const original = {
  AudioContext: Object.getOwnPropertyDescriptor(globalThis, 'AudioContext'),
  BroadcastChannel: Object.getOwnPropertyDescriptor(globalThis, 'BroadcastChannel'),
  setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, now: Date.now,
};
let clock = 1000, nextTimer = 0;
const timers = new Map();
globalThis.setTimeout = (callback, delay = 0) => { const id = ++nextTimer; timers.set(id, { at: clock + Math.max(0, delay), callback }); return id; };
globalThis.clearTimeout = id => timers.delete(id);
Date.now = () => clock;
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
async function advance(ms) {
  const end = clock + ms;
  for (;;) {
    const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
    if (!next) break;
    clock = next[1].at; timers.delete(next[0]); next[1].callback(); await flush();
  }
  clock = end; await flush();
}
const plans = [], contexts = [], channels = [], engines = [];
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
class Param {
  value = 1;
  events = [];
  setValueAtTime(value, at) { this.value = value; this.events.push(['set', value, at]); }
  cancelAndHoldAtTime(at) { this.events.push(['hold', at]); }
  cancelScheduledValues(at) { this.events.push(['cancel', at]); }
  linearRampToValueAtTime(value, at) { this.value = value; this.events.push(['ramp', value, at]); }
}
class Node {
  connections = [];
  disconnected = false;
  constructor(context, kind) { this.context = context; this.kind = kind; context.nodes.push(this); }
  connect(target) { this.connections.push(target); return target; }
  disconnect() { this.disconnected = true; this.connections = []; }
}
class Gain extends Node { gain = new Param(); }
class Filter extends Node { frequency = new Param(); Q = new Param(); type = ''; }
class Source extends Node {
  frequency = new Param(); buffer = null; loop = false; starts = []; stops = []; onended = null;
  start(at = 0) { this.starts.push(at); }
  stop(at) { this.stops.push(at ?? this.context.currentTime); }
}
class FakeAudioContext {
  nodes = []; buffers = []; resumeCalls = 0; closeCalls = 0; onstatechange = null; filterCalls = 0;
  sampleRate = 8000;
  constructor() {
    this.plan = plans.shift() || {};
    if (this.plan.constructError) throw this.plan.constructError;
    this.state = this.plan.state || 'running';
    contexts.push(this);
    this.destination = { kind: 'destination' };
  }
  get currentTime() { return clock / 1000; }
  transition(state) { this.state = state; this.onstatechange?.(); }
  resume() {
    this.resumeCalls++;
    if (this.plan.resumeError) return Promise.reject(this.plan.resumeError);
    if (this.plan.deferred) return this.plan.deferred.promise.then(() => { this.transition('running'); });
    this.transition('running'); return Promise.resolve();
  }
  close() { this.closeCalls++; this.transition('closed'); return Promise.resolve(); }
  createGain() { return new Gain(this, 'gain'); }
  createBufferSource() { return new Source(this, 'buffer'); }
  createOscillator() { return new Source(this, 'oscillator'); }
  createBiquadFilter() {
    this.filterCalls++;
    if (this.plan.failFilterAt === this.filterCalls) throw new Error('driver graph failure');
    return new Filter(this, 'filter');
  }
  createBuffer(count, length, sampleRate) {
    const data = Array.from({ length: count }, () => new Float32Array(length));
    const buffer = { numberOfChannels: count, length, sampleRate, duration: length / sampleRate, getChannelData: index => data[index] };
    this.buffers.push(buffer); return buffer;
  }
}
class FakeBroadcastChannel {
  closed = false; onmessage = null;
  constructor(name) { this.name = name; channels.push(this); }
  postMessage(data) {
    for (const other of channels) if (other !== this && !other.closed && other.name === this.name) queueMicrotask(() => { if (!other.closed) other.onmessage?.({ data }); });
  }
  close() { this.closed = true; }
}
Object.defineProperty(globalThis, 'AudioContext', { configurable: true, writable: true, value: FakeAudioContext });
Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, writable: true, value: FakeBroadcastChannel });
function engine() { const states = []; const player = createPomodoroAmbient(state => states.push(state)); engines.push(player); return { player, states, status: () => states.at(-1)?.status }; }
const buffersOf = context => context.nodes.filter(node => node.kind === 'buffer');
const voicesOf = context => context.nodes.filter(node => node instanceof Source);
const assertReleased = context => {
  assert.ok(context.nodes.every(node => node.disconnected), 'every owned audio node is disconnected');
  assert.ok(voicesOf(context).every(source => source.stops.length > 0), 'every source is stopped');
};

try {
  // Construction and volume preferences never create a context or start sound.
  {
    const before = contexts.length, beforeChannels = channels.length;
    const { player, states } = engine();
    player.setVolume(60);
    assert.equal(contexts.length, before); assert.equal(channels.length, beforeChannels);
    assert.deepEqual(states, []);
    player.stop(); player.dispose();
    await player.play('rain', 60);
    assert.equal(contexts.length, before, 'a disposed engine cannot resurrect playback');
  }

  // All three tracks are stereo, bounded loops with distinct filtering/movement.
  {
    const { player, status } = engine();
    await player.play('rain', 35);
    const context = contexts.at(-1), rain = buffersOf(context).at(-1);
    assert.equal(status(), 'playing');
    assert.equal(rain.loop, true);
    assert.equal(rain.buffer.numberOfChannels, 2);
    assert.equal(rain.buffer.duration, 6);
    assert.equal(rain.buffer.sampleRate, context.sampleRate);
    const left = rain.buffer.getChannelData(0), right = rain.buffer.getChannelData(1);
    assert.notDeepEqual(left, right);
    for (const samples of [left, right]) {
      const energy = samples.reduce((sum, value) => sum + value * value, 0) / samples.length;
      assert.ok(energy > 0.01 && energy < 0.25, 'synthesized loops have gentle non-silent energy');
      assert.ok(samples.every(value => Number.isFinite(value) && Math.abs(value) <= 0.96));
      assert.ok(samples.slice(0, 100).some(value => Math.abs(value) > 0.05), 'the loop crossfade does not introduce a silent gap');
    }
    const rainOutput = context.nodes[0];
    assert.equal(rainOutput.gain.events[0][0], 'set');
    assert.equal(rainOutput.gain.events[0][1], 0, 'playback starts at zero gain');
    assert.equal(rainOutput.gain.events.at(-1)[0], 'ramp');
    assert.ok(rainOutput.gain.events.at(-1)[2] > context.currentTime);
    assert.equal(context.nodes.filter(node => node.kind === 'filter')[0].frequency.value, 380);
    assert.equal(context.nodes.filter(node => node.kind === 'oscillator').length, 1);
    await player.play('stream', 35);
    assert.equal(contexts.at(-1), context, 'tracks share only their ambient context');
    const stream = buffersOf(context).at(-1);
    assert.notEqual(stream.buffer, rain.buffer);
    assert.equal(context.nodes.filter(node => node.kind === 'oscillator').length, 3);
    assert.equal(context.nodes.filter(node => node.kind === 'filter').at(-2).frequency.value, 90);
    assert.ok(rain.stops.some(time => time > context.currentTime), 'track switching fades the old graph before stopping');
    await advance(300);
    assert.equal(rain.disconnected, true);
    assert.equal(stream.disconnected, false);
    const oscillators = context.nodes.filter(node => node.kind === 'oscillator').length;
    await player.play('white-noise', 35);
    assert.equal(context.nodes.filter(node => node.kind === 'oscillator').length, oscillators, 'white noise has no unnecessary modulation');
    const white = buffersOf(context).at(-1);
    assert.notEqual(white.buffer, rain.buffer);
    await player.play('rain', 35);
    assert.equal(buffersOf(context).at(-1).buffer, rain.buffer, 'switching back reuses the immutable loop buffer');
    assert.equal(context.buffers.length, 3);
    player.dispose(); assertReleased(context);
    assert.equal(context.closeCalls, 1); assert.equal(context.onstatechange, null);
  }

  // Volume is clamped and smoothed, including zero and invalid numeric input.
  {
    const { player } = engine();
    await player.play('white-noise', 999);
    const context = contexts.at(-1), output = context.nodes[0];
    assert.equal(output.gain.value, 0.24);
    player.setVolume(-5); assert.equal(output.gain.value, 0);
    player.setVolume(50);
    assert.ok(output.gain.value > 0 && output.gain.value < 0.24);
    assert.equal(output.gain.events.at(-1)[2], context.currentTime + 0.08);
    player.setVolume(Number.NaN); assert.equal(output.gain.value, 0);
    output.gain.cancelAndHoldAtTime = undefined;
    player.setVolume(20);
    assert.ok(output.gain.events.some(event => event[0] === 'cancel'), 'older AudioParam implementations use cancel/set/ramp fallback');
    player.stop(); assert.equal(output.gain.value, 0);
    await advance(300); assertReleased(context);
    player.dispose();
  }

  // Stop/dispose and a newer play cancel pending resume, including late rejection.
  {
    const ready = deferred();
    plans.push({ state: 'suspended', deferred: ready });
    const { player, status, states } = engine();
    const pendingPlay = player.play('rain', 40);
    const context = contexts.at(-1);
    assert.equal(status(), 'starting'); assert.equal(context.resumeCalls, 1);
    assert.equal(context.nodes.length, 0);
    player.stop();
    await pendingPlay;
    ready.resolve(); await flush();
    assert.equal(status(), 'stopped'); assert.equal(context.nodes.length, 0);
    assert.equal(states.filter(state => state.status === 'playing').length, 0);
    player.dispose(); assert.equal(context.closeCalls, 1);

    const delayed = deferred();
    plans.push({ state: 'suspended', deferred: delayed });
    const next = engine();
    const oldPlay = next.player.play('rain', 20);
    const nextContext = contexts.at(-1);
    const newPlay = next.player.play('stream', 60);
    delayed.resolve(); await Promise.all([oldPlay, newPlay]);
    assert.equal(next.status(), 'playing');
    assert.equal(buffersOf(nextContext).length, 1, 'only the newest request creates a graph');
    assert.equal(nextContext.nodes.filter(node => node.kind === 'filter')[0].frequency.value, 90);
    next.player.dispose();

    const never = deferred();
    plans.push({ state: 'suspended', deferred: never });
    const destroyed = engine();
    const inFlight = destroyed.player.play('rain', 30);
    const destroyedContext = contexts.at(-1);
    const stateCount = destroyed.states.length;
    destroyed.player.dispose();
    await inFlight;
    never.reject(new Error('late denied')); await flush();
    assert.equal(destroyedContext.closeCalls, 1);
    assert.equal(destroyedContext.nodes.length, 0);
    assert.equal(destroyed.states.length, stateCount, 'disposed engines never send stale callbacks');
  }

  // A preview lasts five seconds and its old timeout cannot stop newer playback.
  {
    const { player, status } = engine();
    await player.play('rain', 35, true);
    const context = contexts.at(-1);
    assert.equal(status(), 'preview');
    await advance(4999); assert.equal(status(), 'preview');
    await advance(1); assert.equal(status(), 'stopped');
    await advance(300); assertReleased(context);
    await player.play('stream', 35, true);
    await advance(2000);
    await player.play('white-noise', 35);
    await advance(3500);
    assert.equal(status(), 'playing', 'an earlier preview timeout cannot stop a newer play');
    assert.equal(buffersOf(context).at(-1).disconnected, false);
    player.dispose(); assertReleased(context);
  }

  // Audio-time preview deadlines remain safe even if JS timers are frozen.
  {
    const { player, status } = engine();
    await player.play('stream', 35, true);
    const context = contexts.at(-1), output = context.nodes[0], end = context.currentTime + 5;
    const previewVoices = voicesOf(context);
    assert.ok(previewVoices.every(voice => voice.stops.includes(end)), 'every preview source has an audio-time stop independent of JS timers');
    assert.deepEqual(output.gain.events.at(-1), ['ramp', 0, end], 'preview fades to silence on the audio timeline');
    player.setVolume(70);
    assert.deepEqual(output.gain.events.at(-1), ['ramp', 0, end], 'volume changes preserve the preview deadline and final fade');
    // Dispatch audio ended events before allowing the five-second JS timeout.
    const endedCallbacks = previewVoices.map(voice => voice.onended);
    for (const callback of endedCallbacks) callback?.();
    assert.equal(status(), 'stopped');
    assertReleased(context);
    await player.play('rain', 35, true);
    const staleEnded = voicesOf(context).filter(voice => !voice.disconnected).map(voice => voice.onended);
    await player.play('white-noise', 35);
    for (const callback of staleEnded) callback?.();
    assert.equal(status(), 'playing', 'queued ended events from an old preview cannot stop the newer loop');
    assert.equal(buffersOf(context).at(-1).disconnected, false);
    player.dispose();
  }

  // System interruption stops sources. Browser auto-resume must not auto-play.
  {
    const { player, status, states } = engine();
    await player.play('stream', 30);
    const context = contexts.at(-1);
    context.transition('interrupted');
    assert.equal(status(), 'interrupted'); assert.match(states.at(-1).error, /重新点击/);
    assertReleased(context);
    const voices = voicesOf(context).length;
    context.transition('running');
    assert.equal(status(), 'interrupted'); assert.equal(voicesOf(context).length, voices);
    await player.play('stream', 30);
    assert.equal(status(), 'playing'); assert.ok(voicesOf(context).length > voices);
    context.transition('closed');
    assert.equal(status(), 'interrupted');
    await player.play('rain', 30);
    assert.notEqual(contexts.at(-1), context, 'a browser-closed context is replaced only after explicit play');
    player.dispose();
  }

  // Permission/unsupported/timeout/node failures are local, recoverable statuses.
  {
    const denied = Object.assign(new Error('denied'), { name: 'NotAllowedError' });
    plans.push({ state: 'suspended', resumeError: denied });
    const refused = engine();
    await refused.player.play('rain', 30);
    assert.equal(refused.status(), 'interrupted'); assert.match(refused.states.at(-1).error, /浏览器阻止/);
    assert.equal(contexts.at(-1).nodes.length, 0);
    refused.player.dispose();

    Object.defineProperty(globalThis, 'AudioContext', { configurable: true, writable: true, value: undefined });
    const unsupported = engine();
    await unsupported.player.play('rain', 30);
    assert.equal(unsupported.status(), 'error'); assert.match(unsupported.states.at(-1).error, /不支持/);
    unsupported.player.dispose();
    globalThis.AudioContext = FakeAudioContext;

    const never = deferred();
    plans.push({ state: 'suspended', deferred: never });
    const timeout = engine(), start = timeout.player.play('rain', 30);
    await advance(5000); await start;
    assert.equal(timeout.status(), 'error'); assert.match(timeout.states.at(-1).error, /再次点击/);
    never.resolve(); await flush();
    assert.equal(contexts.at(-1).nodes.length, 0);
    timeout.player.dispose();

    plans.push({ failFilterAt: 2 });
    const broken = engine();
    await broken.player.play('stream', 30);
    const brokenContext = contexts.at(-1);
    assert.equal(broken.status(), 'error'); assert.match(broken.states.at(-1).error, /计时与到时提醒不受影响/);
    assertReleased(brokenContext);
    await broken.player.play('white-noise', 30);
    assert.equal(broken.status(), 'playing');
    broken.player.dispose();
  }

  // A later explicit play takes over across tabs; messages never start audio.
  {
    const first = engine(), second = engine();
    await first.player.play('rain', 35);
    const firstContext = contexts.at(-1), before = contexts.length;
    await advance(1);
    await second.player.play('stream', 35); await flush();
    assert.equal(contexts.length, before + 1);
    assert.equal(first.status(), 'interrupted');
    assert.match(first.states.at(-1).error, /另一个标签页/);
    assert.equal(second.status(), 'playing');
    await advance(300); assertReleased(firstContext);
    const waiting = engine(), count = contexts.length;
    await advance(1); await second.player.play('rain', 35); await flush();
    assert.equal(contexts.length, count, 'inactive engines do not create contexts on another tab message');
    assert.equal(waiting.states.length, 0);
    first.player.dispose(); second.player.dispose(); waiting.player.dispose();

    // Earlier user gesture with a slow resume cannot override the later tab.
    const delayed = deferred();
    plans.push({ state: 'suspended', deferred: delayed });
    const older = engine(), newer = engine();
    const pendingPlay = older.player.play('rain', 30);
    const oldContext = contexts.at(-1);
    await advance(1);
    await newer.player.play('stream', 30); await flush();
    delayed.resolve(); await pendingPlay; await flush();
    assert.equal(older.status(), 'interrupted');
    assert.equal(oldContext.nodes.length, 0);
    assert.equal(newer.status(), 'playing');
    older.player.dispose(); newer.player.dispose();
  }

  // Broken optional coordination and UI callbacks must not break audio cleanup.
  {
    globalThis.BroadcastChannel = class { constructor() { throw new Error('blocked'); } };
    const stable = engine();
    await stable.player.play('rain', 30);
    assert.equal(stable.status(), 'playing');
    stable.player.dispose();
    const badUi = createPomodoroAmbient(() => { throw new Error('subscriber failed'); });
    engines.push(badUi);
    await badUi.play('white-noise', 20);
    const context = contexts.at(-1);
    badUi.dispose(); assertReleased(context);
  }

  for (const player of engines) player.dispose();
  await advance(10_000);
  assert.equal(timers.size, 0, 'all preview/resume/fade timers are cleared on dispose');
  assert.ok(contexts.every(context => context.state === 'closed'));
  assert.ok(channels.every(channel => channel.closed));
  console.log('Pomodoro ambient: local stereo synthesis, fades, volume, lazy context, async races, preview expiry, interruption, failures, cross-tab takeover and disposal passed.');
} finally {
  for (const player of engines) player.dispose();
  globalThis.setTimeout = original.setTimeout; globalThis.clearTimeout = original.clearTimeout; Date.now = original.now;
  for (const key of ['AudioContext', 'BroadcastChannel']) {
    if (original[key]) Object.defineProperty(globalThis, key, original[key]);
    else delete globalThis[key];
  }
}
