import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.BAIZE_PLAYWRIGHT_PATH || 'playwright');
const baseUrl = process.env.BAIZE_APP_URL || 'http://127.0.0.1:5189/nav/';
const origin = new URL(baseUrl).origin;
const output = new URL('../artifacts/tech-os-workspace/', import.meta.url);
const index = JSON.parse(await readFile(new URL('../src/generated/tech-os-index.json', import.meta.url), 'utf8'));
const questId = index.state.currentQuestId;
const key = 'baize_tech_os_study_progress_v1';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
async function contextFor(width = 1440, height = 1000) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copiedCode = text; } } });
  });
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  return context;
}
async function open(context) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}#/tech-os`);
  await page.getByRole('region', { name: '继续学习', exact: true }).waitFor();
  return page;
}
async function nav(page, name) {
  const menu = page.getByRole('button', { name: '打开 Tech OS 导航', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('navigation', { name: 'Tech OS 工作台', exact: true }).getByRole('button', { name, exact: true }).click();
}
function checklist(page) { return page.getByRole('region', { name: '学习打卡', exact: true }); }
async function checked(page, task, value) {
  await checklist(page).locator(`[data-study-task="${task}"][aria-pressed="${value}"]`).waitFor();
}
async function focusedStep(page, step) {
  await page.waitForFunction(id => document.activeElement?.id === id, `${questId}-step-${step}`);
  assert.equal(new URL(page.url()).hash, '#/tech-os', 'reading must not leave the workspace hash route');
}
async function saved(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), key); }
try {
  for (const width of [1440, 390]) {
    const context = await contextFor(width, width === 390 ? 844 : 1000);
    const page = await open(context);
    const resume = page.getByRole('region', { name: '继续学习', exact: true });
    assert.equal(await resume.getByRole('progressbar').getAttribute('value'), '0');
    await page.screenshot({ path: fileURLToPath(new URL(`dashboard-${width}.png`, output)) });
    await resume.getByRole('button', { name: '继续学习 S1', exact: true }).click();
    await focusedStep(page, 'S1');
    await checklist(page).getByRole('button', { name: '完成 S1', exact: true }).click();
    await checked(page, 'S1', true);
    assert.equal((await saved(page)).quests[questId].S1.completed, true);
    await checklist(page).getByRole('button', { name: '阅读 S1', exact: true }).click();
    await focusedStep(page, 'S1');
    await checked(page, 'S1', true);
    await nav(page, '总览');
    assert.equal(await resume.getByRole('progressbar').getAttribute('value'), '1');
    await page.reload();
    await resume.getByRole('button', { name: '继续学习 S2', exact: true }).click();
    await focusedStep(page, 'S2');
    const details = page.getByRole('article', { name: '对象详情', exact: true });
    await details.getByRole('button', { name: '完整正文', exact: true }).click();
    const directory = details.locator('summary').filter({ hasText: '正文目录' });
    await directory.click();
    await details.getByRole('navigation', { name: '正文目录' }).getByRole('button', { name: /^S1/ }).click();
    await focusedStep(page, 'S1');
    const copy = details.getByRole('button', { name: '复制代码', exact: true }).first();
    if (await copy.count()) {
      await copy.click();
      await page.waitForFunction(() => typeof window.copiedCode === 'string' && window.copiedCode.length > 0);
    }
    await checklist(page).scrollIntoViewIfNeeded();
    await page.screenshot({ path: fileURLToPath(new URL(`quest-${width}.png`, output)) });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no page-level horizontal overflow');
    for (const [name, kind] of [['知识库', 'knowledge'], ['实验', 'lab'], ['项目', 'project']]) {
      await nav(page, name);
      const expected = index.entities.find(entity => entity.kind === kind);
      assert.equal(await details.getAttribute('data-entity-id'), expected.id, 'classification cannot keep the previous Quest detail');
      const search = page.getByRole('textbox', { name: '搜索当前对象', exact: true });
      await search.fill(expected.id.toLowerCase());
      await details.waitFor();
      assert.equal(await details.getAttribute('data-entity-id'), expected.id);
      await search.fill('no-such-tech-os-object-2931');
      await page.getByText('没有匹配的对象', { exact: true }).waitFor();
      assert.equal(await details.count(), 0, 'filtered-out objects must not remain visible');
      await page.getByRole('button', { name: '清除筛选', exact: true }).click();
      await details.waitFor();
    }
    await nav(page, '核心问题');
    await page.getByLabel('筛选对象状态', { exact: true }).selectOption('backlog');
    const shownId = await details.getAttribute('data-entity-id');
    assert.equal(index.entities.find(entity => entity.id === shownId).status, 'backlog');
    const objects = page.getByRole('region', { name: '核心任务与开放问题列表', exact: true });
    await objects.getByRole('button').filter({ hasText: 'QUEST-003' }).click();
    await details.getByRole('button', { name: 'QUESTION-001', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-entity-id]')?.getAttribute('data-entity-id') === 'QUESTION-001');
    assert.equal(await page.getByLabel('筛选对象状态', { exact: true }).inputValue(), 'all', 'related navigation clears a filter excluding its destination');
    await page.getByLabel('筛选对象状态', { exact: true }).selectOption('backlog');
    await page.getByRole('button', { name: '清除筛选', exact: true }).click();
    const question = index.entities.find(entity => entity.kind === 'question');
    await page.getByRole('textbox', { name: '搜索当前对象', exact: true }).fill(question.id);
    await page.waitForFunction(id => document.querySelector('[data-entity-id]')?.getAttribute('data-entity-id') === id, question.id);
    await nav(page, '总览');
    if (width === 390) {
      await page.setViewportSize({ width: 390, height: 520 });
      const menu = page.getByRole('button', { name: '打开 Tech OS 导航', exact: true });
      const sidebar = page.getByRole('complementary', { name: 'Tech OS 侧栏', exact: true });
      assert.equal(await sidebar.isVisible(), false, 'closed mobile menu is not keyboard-focusable');
      await menu.click();
      const back = sidebar.getByRole('button', { name: '返回导航', exact: true });
      await back.scrollIntoViewIfNeeded();
      const box = await back.boundingBox();
      assert.ok(box.y >= 0 && box.y + box.height <= 520, 'short phones can reach the bottom sidebar action');
      await page.screenshot({ path: fileURLToPath(new URL('sidebar-short-phone.png', output)) });
      await page.keyboard.press('Escape');
      assert.equal(await sidebar.isVisible(), false);
      await page.setViewportSize({ width: 390, height: 844 });
    }
    await page.getByRole('button', { name: '切换到深色主题', exact: true }).click();
    await page.screenshot({ path: fileURLToPath(new URL(`dashboard-dark-${width}.png`, output)) });
    await context.close();
    console.log(`Tech OS reading/navigation/progress passed at ${width}px`);
  }

  const failureContext = await contextFor();
  await failureContext.addInitScript(key => {
    window.failStudyWrite = true;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key && window.failStudyWrite) throw new DOMException('test quota', 'QuotaExceededError');
      return setItem.call(this, name, value);
    };
  }, key);
  const failedPage = await open(failureContext);
  await failedPage.getByRole('button', { name: '继续学习 S1', exact: true }).click();
  await checklist(failedPage).getByRole('button', { name: '完成 S1', exact: true }).click();
  await checklist(failedPage).getByRole('alert').waitFor();
  await checked(failedPage, 'S1', false);
  assert.equal(await saved(failedPage), null, 'failed save must not invent persisted progress');
  await failedPage.evaluate(() => { window.failStudyWrite = false; });
  await checklist(failedPage).getByRole('button', { name: '重试保存打卡', exact: true }).click();
  await checked(failedPage, 'S1', true);
  await failureContext.close();

  const corruptContext = await contextFor();
  await corruptContext.addInitScript(({ key, origin }) => {
    if (location.origin === origin) localStorage.setItem(key, '{broken');
  }, { key, origin });
  const corruptPage = await open(corruptContext);
  await corruptPage.getByRole('region', { name: '继续学习', exact: true }).getByRole('alert').waitFor();
  await corruptPage.getByRole('button', { name: '打开当前任务', exact: true }).click();
  await checklist(corruptPage).getByRole('alert').waitFor();
  assert.equal(await checklist(corruptPage).getByRole('button', { name: '完成 S1', exact: true }).isDisabled(), true);
  await checklist(corruptPage).getByRole('button', { name: '阅读 S1', exact: true }).click();
  await focusedStep(corruptPage, 'S1');
  assert.equal(await corruptPage.evaluate(key => localStorage.getItem(key), key), '{broken');
  await corruptPage.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 2, quests: {} })), key);
  await checklist(corruptPage).getByRole('button', { name: '重试读取打卡', exact: true }).click();
  assert.equal(await checklist(corruptPage).getByRole('button', { name: '完成 S1', exact: true }).isEnabled(), true);
  await corruptContext.close();

  const tabsContext = await contextFor();
  const first = await open(tabsContext), second = await open(tabsContext);
  await first.getByRole('button', { name: '继续学习 S1', exact: true }).click();
  await second.getByRole('button', { name: '继续学习 S1', exact: true }).click();
  await Promise.all([
    checklist(first).getByRole('button', { name: '完成 S1', exact: true }).click(),
    checklist(second).getByRole('button', { name: '完成 S2', exact: true }).click(),
  ]);
  for (const page of [first, second]) { await checked(page, 'S1', true); await checked(page, 'S2', true); }
  assert.equal(Object.keys((await saved(first)).quests[questId]).length, 2);
  await nav(second, '总览');
  await second.getByRole('button', { name: '继续学习 S3', exact: true }).waitFor();
  await checklist(first).getByRole('button', { name: '完成 S3', exact: true }).click();
  await second.getByRole('button', { name: '继续学习 S4', exact: true }).waitFor();
  await tabsContext.close();
  assert.deepEqual(errors, [], 'no browser runtime errors');
  console.log('Tech OS workspace browser checks passed: desktop/mobile, safe reading, persistence, retry, corrupt storage, cross-tab updates.');
} finally { await browser.close(); }
