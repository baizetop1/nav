import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.BAIZE_PLAYWRIGHT_PATH || 'playwright');
const baseUrl = process.env.BAIZE_APP_URL || 'http://127.0.0.1:5189/nav/';
const origin = new URL(baseUrl).origin;
const output = new URL('../artifacts/pomodoro/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const read = page => page.evaluate(() => JSON.parse(localStorage.getItem('baize_work_session_v1')));
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, serviceWorkers: 'block' });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseUrl);
    await page.getByRole('button', { name: '工作会话', exact: true }).click();
    const work = page.getByRole('region', { name: '工作会话' });
    await work.getByLabel('当前工作任务').fill('完成今天最重要的一件事');
    assert.equal(await work.getByLabel('到时提示音').isChecked(), false);
    await work.getByLabel('专注时长').selectOption('50/10');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('baize_work_session_v1')).minutes === 50);
    let state = await read(page);
    assert.equal(state.shortBreakMinutes, 10); assert.equal(state.longBreakMinutes, 20);
    await work.getByLabel('专注时长').selectOption('custom');
    await work.getByLabel('专注分钟', { exact: true }).fill('1');
    await work.getByLabel('短休息分钟', { exact: true }).fill('1');
    await work.getByLabel('长休息分钟', { exact: true }).fill('2');
    await work.getByRole('button', { name: '开始专注', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('baize_work_session_v1')).current?.minutes === 1);
    const originalId = (await read(page)).current.id;
    await work.getByRole('button', { name: '沉浸专注', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    assert.equal(await page.locator('#root').evaluate(element => element.inert), true);
    await dialog.getByRole('button', { name: '切换林间背景', exact: true }).click();
    await dialog.getByRole('button', { name: '暂停', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('baize_work_session_v1')).current.deadline === null);
    const paused = (await read(page)).current.remainingMs;
    await page.screenshot({ path: fileURLToPath(new URL(`forest-${width}.png`, output)) });
    assert.equal(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth), true, 'dialog fits the viewport');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await page.locator('#root').evaluate(element => element.inert), false);
    assert.equal(await work.getByRole('button', { name: '沉浸专注' }).evaluate(element => document.activeElement === element), true);
    assert.equal((await read(page)).current.id, originalId, 'leaving immersive does not end the run');
    await page.reload();
    await work.getByRole('button', { name: '继续', exact: true }).waitFor();
    state = await read(page);
    assert.equal(state.current.remainingMs, paused); assert.equal(state.background, 'forest');
    await work.getByRole('button', { name: '继续', exact: true }).click();
    await work.getByRole('button', { name: '沉浸专注' }).click();
    await dialog.getByRole('button', { name: '退出沉浸', exact: true }).click();
    assert.notEqual((await read(page)).current.deadline, null, 'exit keeps a running clock running');
    await work.getByRole('button', { name: '结束并记录' }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('baize_work_session_v1')).current === null);
    state = await read(page);
    assert.equal(state.completedCount, 0); assert.equal(state.history[0].completed, false);

    // A missed fourth completion is reconciled once, without auto-starting rest.
    await page.evaluate(() => {
      const key = 'baize_work_session_v1', state = JSON.parse(localStorage.getItem(key)), now = Date.now();
      Object.assign(state, { completedCount: 3, current: { id: 'fourth', task: state.task, phase: 'focus', minutes: 1, siteIds: [], startedAt: now - 61_000, remainingMs: 60_000, deadline: now - 1000 } });
      localStorage.setItem(key, JSON.stringify(state));
    });
    await page.reload();
    await work.getByRole('button', { name: '开始休息', exact: true }).waitFor();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('baize_work_session_v1')).completedCount === 4);
    state = await read(page);
    assert.equal(state.current, null); assert.equal(state.nextPhase, 'long-break');
    assert.equal(state.notice.id, 'fourth:completed'); assert.equal(state.history.length, 2);
    await page.reload();
    await work.getByRole('button', { name: '开始休息', exact: true }).waitFor();
    assert.equal((await read(page)).completedCount, 4, 'refresh cannot duplicate completion');
    await work.getByRole('button', { name: '开始休息' }).click();
    await page.getByRole('button', { name: '正在休息', exact: true }).waitFor();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('baize_work_session_v1')).current?.phase === 'long-break');
    state = await read(page);
    assert.equal(state.current.minutes, 2); assert.equal(state.notice, null);
    await work.getByRole('button', { name: '暂停', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('baize_work_session_v1')).current.deadline === null);
    await page.reload();
    await work.getByRole('button', { name: '继续', exact: true }).waitFor();
    await work.getByRole('button', { name: '结束休息', exact: true }).click();
    await work.getByRole('button', { name: '开始专注', exact: true }).waitFor();
    state = await read(page);
    assert.equal(state.history.length, 2); assert.equal(state.completedCount, 4);
    assert.equal(state.nextPhase, 'focus');

    // Refresh after a completed break offers the next focus, but never starts it.
    await page.evaluate(() => {
      const key = 'baize_work_session_v1', state = JSON.parse(localStorage.getItem(key)), now = Date.now();
      state.current = { id: 'rest-expired', task: state.task, phase: 'short-break', minutes: 1, siteIds: [], startedAt: now - 61_000, remainingMs: 60_000, deadline: now - 1000 };
      state.nextPhase = 'short-break'; localStorage.setItem(key, JSON.stringify(state));
    });
    await page.reload();
    await work.getByText('休息结束了。准备好后，再开始下一轮专注。', { exact: true }).waitFor();
    state = await read(page);
    assert.equal(state.current, null); assert.equal(state.history.length, 2); assert.equal(state.completedCount, 4);
    assert.equal(await page.evaluate(() => localStorage.getItem('baize_pomodoro_alert_v1')), null, 'default-off sound never claims an alarm');
    await page.screenshot({ path: fileURLToPath(new URL(`compact-${width}.png`, output)), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'compact card fits viewport');
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: presets/custom, immersive escape, persisted pause/background, fourth long break, manual transitions and once-only recovery.`);
    await context.close();
  }

  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await context.addInitScript(() => {
    window.pomodoroTones = 0;
    window.AudioContext = class {
      state = 'running'; currentTime = 0; destination = {};
      resume() { return Promise.resolve(); }
      createOscillator() { return { frequency: {}, connect() {}, disconnect() {}, start() { window.pomodoroTones++; }, stop() {} }; }
      createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
    };
  });
  const page = await context.newPage();
  await page.clock.install({ time: new Date() });
  await page.goto(baseUrl);
  await page.getByRole('button', { name: '工作会话', exact: true }).click();
  const work = page.getByRole('region', { name: '工作会话' });
  await work.getByLabel('当前工作任务').fill('声音去重测试');
  await work.getByLabel('专注时长').selectOption('custom');
  await work.getByLabel('专注分钟', { exact: true }).fill('1');
  await work.getByLabel('到时提示音').check();
  await work.getByRole('button', { name: '开始专注', exact: true }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('baize_work_session_v1')).current?.phase === 'focus');
  await page.clock.fastForward(60_100);
  await work.getByRole('button', { name: '开始休息', exact: true }).waitFor();
  await page.waitForFunction(() => window.pomodoroTones === 2);
  assert.equal(await page.evaluate(() => localStorage.getItem('baize_pomodoro_alert_v1')), (await read(page)).notice.id);
  await page.clock.fastForward(5000);
  assert.equal(await page.evaluate(() => window.pomodoroTones), 2);
  await page.reload();
  await work.getByRole('button', { name: '开始休息', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.pomodoroTones), 0, 'refresh never replays a completion sound');
  await context.close();
  console.log('PASS sound: explicit opt-in, two gentle tones once, no repeat after refresh.');
} finally { await browser.close(); }
