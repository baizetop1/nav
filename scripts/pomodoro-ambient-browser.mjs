import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.BAIZE_PLAYWRIGHT_PATH || 'playwright');
const baseUrl = process.env.BAIZE_APP_URL || 'http://127.0.0.1:5189/nav/';
const origin = new URL(baseUrl).origin;
const output = new URL('../artifacts/pomodoro-ambient/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const status = (player, value) => player.locator(`xpath=self::*[@data-ambient-status="${value}"]`).waitFor();
const setVolume = (player, value) => player.getByLabel('背景声音音量', { exact: true }).fill(String(value));
const assertSignal = async (page, audible) => {
  await page.waitForFunction(audible => {
    const powers = window.audioProbe.outputs.filter(analyser => analyser.context.state === 'running').map(analyser => {
      const data = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(data);
      return Math.sqrt(data.reduce((sum, sample) => sum + sample * sample, 0) / data.length);
    });
    const rms = Math.max(0, ...powers);
    return audible ? rms > 0.00001 : rms < 0.000001;
  }, audible, { timeout: 10_000 });
};
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, serviceWorkers: 'block' });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    // Keep native Web Audio: inspect actual PCM output, not just mocked play calls.
    await context.addInitScript(() => {
      const NativeContext = window.AudioContext;
      window.audioProbe = { contexts: [], outputs: [], starts: 0 };
      window.AudioContext = class extends NativeContext {
        constructor(...args) { super(...args); window.audioProbe.contexts.push(this); }
        createBufferSource() {
          const source = super.createBufferSource(), start = source.start;
          source.start = function (...args) { window.audioProbe.starts++; return start.apply(this, args); };
          return source;
        }
      };
      const connect = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function (...args) {
        if (args[0] === this.context.destination) {
          const analyser = this.context.createAnalyser();
          analyser.fftSize = 2048; connect.call(this, analyser);
          window.audioProbe.outputs.push(analyser);
        }
        return connect.apply(this, args);
      };
    });
    const page = await context.newPage(), errors = [], mediaRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.resourceType() === 'media' || /\.(mp3|ogg|wav)(\?|$)/i.test(request.url())) mediaRequests.push(request.url()); });
    await page.goto(baseUrl);
    await page.getByRole('button', { name: '工作会话', exact: true }).click();
    const work = page.getByRole('region', { name: '工作会话', exact: true });
    const player = work.getByRole('region', { name: '背景声音播放器', exact: true });
    await status(player, 'stopped');
    assert.equal(await page.evaluate(() => window.audioProbe.contexts.length), 0, 'no audio resources on initial render');
    await player.getByLabel('背景声音类型', { exact: true }).selectOption('stream');
    await setVolume(player, 45);
    assert.equal(await page.evaluate(() => window.audioProbe.contexts.length), 0, 'preferences alone never autoplay');
    await player.getByRole('button', { name: '试听5秒', exact: true }).click();
    await status(player, 'preview'); await assertSignal(page, true);
    await status(player, 'stopped'); await assertSignal(page, false);
    await player.getByRole('button', { name: '播放背景音', exact: true }).click();
    await status(player, 'playing'); await assertSignal(page, true);
    if (width === 1440) {
      await page.waitForTimeout(6300); // Cross the six-second buffer seam.
      await status(player, 'playing'); await assertSignal(page, true);
    }
    for (const track of ['rain', 'white-noise', 'stream']) {
      await player.getByLabel('背景声音类型', { exact: true }).selectOption(track);
      await status(player, 'playing'); await assertSignal(page, true);
    }
    await setVolume(player, 0); await assertSignal(page, false);
    assert.match(await player.textContent(), /静音/);
    await setVolume(player, 55); await assertSignal(page, true);
    assert.equal(await work.getByLabel('到时提示音', { exact: true }).isChecked(), false, 'ambient never enables alerts');
    const contextsBeforeImmersive = await page.evaluate(() => window.audioProbe.contexts.length);
    const sourcesBeforeImmersive = await page.evaluate(() => window.audioProbe.starts);
    await work.getByLabel('当前工作任务').fill('在背景声音中保持专注');
    await work.getByRole('button', { name: '开始专注', exact: true }).click();
    await work.getByRole('button', { name: '暂停', exact: true }).click();
    await status(player, 'playing');
    await work.getByRole('button', { name: '沉浸专注', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: '背景声音', exact: true }).click();
    const immersivePlayer = dialog.getByRole('region', { name: '背景声音播放器', exact: true });
    await status(immersivePlayer, 'playing');
    assert.equal(await page.evaluate(() => window.audioProbe.contexts.length), contextsBeforeImmersive);
    assert.equal(await page.evaluate(() => window.audioProbe.starts), sourcesBeforeImmersive, 'opening immersive does not duplicate sources');
    await dialog.getByRole('button', { name: '切换林间背景', exact: true }).click();
    await page.screenshot({ path: fileURLToPath(new URL(`immersive-${width}.png`, output)) });
    assert.equal(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth), true);
    await immersivePlayer.getByRole('button', { name: '暂停背景音', exact: true }).click();
    await status(immersivePlayer, 'stopped'); await assertSignal(page, false);
    await immersivePlayer.getByRole('button', { name: '播放背景音', exact: true }).click();
    await status(immersivePlayer, 'playing');
    await page.keyboard.press('Escape');
    await status(player, 'playing'); await assertSignal(page, true);
    await work.getByRole('button', { name: '结束并记录', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('baize_work_session_v1')).current === null);
    await work.getByRole('button', { name: '收起工作会话', exact: true }).click();
    await page.waitForFunction(() => window.audioProbe.contexts.every(context => context.state === 'closed'));
    await page.getByRole('button', { name: '工作会话', exact: true }).click();
    await status(player, 'stopped');
    assert.equal(await player.getByLabel('背景声音类型').inputValue(), 'stream');
    assert.equal(await player.getByLabel('背景声音音量').inputValue(), '55');
    await player.getByRole('button', { name: '播放背景音', exact: true }).click();
    await status(player, 'playing');
    if (width === 1440) {
      const other = await context.newPage();
      await other.goto(baseUrl);
      await other.getByRole('button', { name: '工作会话', exact: true }).click();
      const otherPlayer = other.getByRole('region', { name: '背景声音播放器', exact: true });
      await status(otherPlayer, 'stopped');
      assert.equal(await other.evaluate(() => window.audioProbe.contexts.length), 0, 'another tab never autoplays');
      await otherPlayer.getByRole('button', { name: '播放背景音', exact: true }).click();
      await status(otherPlayer, 'playing');
      await page.waitForFunction(() => ['stopped', 'interrupted'].includes(document.querySelector('[data-ambient-status]')?.dataset.ambientStatus));
      await assertSignal(page, false);
      await other.close();
    }
    await page.reload();
    await page.getByRole('button', { name: '工作会话', exact: true }).click();
    await status(player, 'stopped');
    assert.equal(await page.evaluate(() => window.audioProbe.contexts.length), 0, 'reload restores preferences but never playback');
    assert.equal(await player.getByLabel('背景声音类型').inputValue(), 'stream');
    assert.equal(await player.getByLabel('背景声音音量').inputValue(), '55');
    await page.screenshot({ path: fileURLToPath(new URL(`compact-${width}.png`, output)), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.deepEqual(mediaRequests, [], 'ambient works entirely locally without media downloads');
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: native audio signal, preview, three tracks, mute/volume, independent alerts, shared immersive player, cleanup and silent reload.`);
    await context.close();
  }
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await context.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(baseUrl);
  await page.getByRole('button', { name: '工作会话', exact: true }).click();
  const player = page.getByRole('region', { name: '背景声音播放器', exact: true });
  await player.getByRole('button', { name: '播放背景音', exact: true }).click();
  await status(player, 'error'); await player.getByRole('alert').waitFor();
  await player.getByRole('button', { name: '播放背景音', exact: true }).click();
  await status(player, 'error');
  const work = page.getByRole('region', { name: '工作会话', exact: true });
  await work.getByLabel('当前工作任务').fill('无音频支持也能计时');
  await work.getByRole('button', { name: '开始专注', exact: true }).click();
  await work.getByRole('button', { name: '暂停', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
  console.log('PASS unavailable audio: visible retryable error without breaking the timer.');
} finally { await browser.close(); }
