import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.BAIZE_PLAYWRIGHT_PATH || 'playwright');
const baseUrl = process.env.BAIZE_APP_URL || 'http://127.0.0.1:5189/nav/';
const origin = new URL(baseUrl).origin;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await context.addInitScript(() => {
    // Emulate a background tab whose storage events have not yet been delivered.
    window.addEventListener('storage', event => {
      if (window.holdWorkStorageEvents && event.key === 'baize_work_session_v1') event.stopImmediatePropagation();
    }, true);
  });
  const a = await context.newPage(), b = await context.newPage();
  const errors = [];
  for (const page of [a, b]) {
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseUrl);
    await page.getByRole('button', { name: '工作会话', exact: true }).click();
  }
  const workA = a.getByRole('region', { name: '工作会话' });
  const workB = b.getByRole('region', { name: '工作会话' });
  const input = workA.getByLabel('当前工作任务');
  await input.pressSequentially('Two tab focus test', { delay: 15 });
  assert.equal(await input.inputValue(), 'Two tab focus test');
  assert.equal(await input.evaluate(element => document.activeElement === element), true, 'saving must preserve typing focus');
  await b.waitForFunction(() => document.querySelector('[aria-label="工作会话"] input')?.value === 'Two tab focus test');
  await workA.getByRole('button', { name: '开始专注' }).click();
  await workB.getByRole('button', { name: '暂停', exact: true }).waitFor();

  await b.evaluate(() => { window.holdWorkStorageEvents = true; });
  await workA.getByRole('button', { name: '暂停', exact: true }).click();
  await a.waitForFunction(() => JSON.parse(localStorage.getItem('baize_work_session_v1')).current.deadline === null);
  await workB.getByRole('button', { name: '结束并记录' }).click();
  await workB.getByRole('button', { name: '继续', exact: true }).waitFor();
  let stored = await a.evaluate(() => JSON.parse(localStorage.getItem('baize_work_session_v1')));
  assert.equal(stored.current.deadline, null, 'stale finish must not replace the newer pause');
  assert.equal(stored.history.length, 0);
  assert.match(await workB.textContent(), /另一标签页已更新/);

  await b.evaluate(() => { window.holdWorkStorageEvents = false; });
  await workA.getByRole('button', { name: '继续', exact: true }).click();
  await workB.getByRole('button', { name: '暂停', exact: true }).waitFor();
  await b.evaluate(() => { window.holdWorkStorageEvents = true; });
  await workA.getByRole('button', { name: '结束并记录' }).click();
  await a.waitForFunction(() => JSON.parse(localStorage.getItem('baize_work_session_v1')).current === null);
  await workB.getByRole('button', { name: '结束并记录' }).click();
  await workB.getByRole('button', { name: '开始专注' }).waitFor();
  stored = await a.evaluate(() => JSON.parse(localStorage.getItem('baize_work_session_v1')));
  assert.equal(stored.current, null);
  assert.equal(stored.history.length, 1, 'finishing from both tabs must create only one summary');
  await b.reload();
  await b.getByRole('button', { name: '工作会话', exact: true }).click();
  assert.equal(await workB.getByLabel('当前工作任务').inputValue(), 'Two tab focus test');
  assert.deepEqual(errors, []);
  console.log('PASS work session: typing focus, cross-tab updates, delayed-event conflict guard, unique summary and reload.');
  await context.close();
} finally { await browser.close(); }
