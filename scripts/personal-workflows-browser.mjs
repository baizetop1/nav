import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.BAIZE_PLAYWRIGHT_PATH || 'playwright');
const baseUrl = process.env.BAIZE_APP_URL || 'http://127.0.0.1:5189/nav/';
const origin = new URL(baseUrl).origin;
const navigation = {
  categories: [{ id: 'dev', name: '开发', order: 0 }, { id: 'study', name: '学习', order: 1 }],
  sites: [
    { id: 'alpha', name: 'Work Alpha', url: 'https://alpha.example/', description: '', categoryId: 'dev', tags: [] },
    { id: 'duplicate', name: 'Alpha Duplicate', url: 'https://alpha.example/', description: '重复', categoryId: 'dev', tags: [] },
    { id: 'beta', name: 'Study Beta', url: 'https://beta.example/', description: '读文档', categoryId: 'study', tags: ['学习'] },
  ],
  layout: ['alpha', 'duplicate', 'beta'].map((siteId, order) => ({ siteId, order, size: 'normal' })),
};
const stamp = new Date().toISOString();
const browser = await chromium.launch({ channel: 'msedge', headless: true });
await mkdir(new URL('../artifacts/personal-workflows/', import.meta.url), { recursive: true });
async function contextFor(width, serviceWorkers = 'block') {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await context.addInitScript(({ navigation, stamp }) => {
    if (localStorage.getItem('workflow-test-seeded')) return;
    localStorage.setItem('workflow-test-seeded', 'yes');
    localStorage.setItem('nav_cms_draft', JSON.stringify(navigation));
    localStorage.setItem('nav_translator_collapsed', 'true');
    localStorage.setItem('baize_inbox_v1', JSON.stringify({ version: 1, updatedAt: stamp, items: [{ id: 'private-search', type: 'text', title: 'Inbox 独特样本', content: 'nebula-private-needle', tags: [], createdAt: stamp, updatedAt: stamp, status: 'archived' }] }));
    localStorage.setItem('nav_translation_history', JSON.stringify([{ id: 'tr', sourceText: 'Translation needle', translatedText: '翻译样本', sourceLanguage: 'en', targetLanguage: 'zh-CN', createdAt: stamp }]));
  }, { navigation, stamp });
  return context;
}
async function palette(page, query) {
  await page.getByRole('button', { name: '打开全局命令面板' }).click();
  await page.getByRole('textbox', { name: '搜索所有内容和命令' }).fill(query);
}
try {
  for (const width of process.env.BAIZE_OFFLINE_ONLY ? [] : [1440, 390]) {
    const context = await contextFor(width);
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseUrl + '#/admin');
    await page.getByRole('button', { name: /^智能整理/ }).click();
    const organizer = page.locator('section[aria-labelledby="smart-organizer-title"]');
    await organizer.getByLabel('选择 Work Alpha', { exact: true }).check();
    await organizer.getByLabel(/标签操作/).selectOption('append');
    await organizer.getByLabel('标签（逗号分隔）').fill('专注,工作');
    await organizer.getByRole('button', { name: '预览修改', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('nav_cms_draft')).sites[0].tags), []);
    await organizer.getByRole('button', { name: '确认应用到草稿' }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('nav_cms_draft')).sites[0].tags.includes('专注'));
    page.once('dialog', dialog => dialog.accept());
    await organizer.getByRole('button', { name: /保留所选并移除其余/ }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('nav_cms_draft')).sites.length === 2);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('nav_cms_draft')).layout.some(item => item.siteId === 'duplicate')), false);
    await page.getByRole('button', { name: '关闭管理面板' }).click();
    await palette(page, 'nebula-private-needle');
    await page.getByRole('button', { name: /Inbox 独特样本/ }).click();
    await page.getByRole('button', { name: '打开 Inbox 条目' }).click();
    await page.locator('#inbox-item-private-search').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: '关闭 Inbox', exact: true }).click();
    await palette(page, 'Translation needle');
    await page.getByRole('button', { name: /Translation needle/ }).click();
    await page.getByRole('button', { name: '载入翻译器' }).click();
    assert.equal(await page.locator('#translation-input').inputValue(), 'Translation needle');
    await palette(page, '=2*(3+4)');
    await page.getByRole('button', { name: /14/ }).waitFor();
    await page.getByRole('button', { name: '关闭命令面板' }).click();
    await page.getByRole('button', { name: '工作会话', exact: true }).click();
    const work = page.getByRole('region', { name: '工作会话' });
    await work.getByLabel('当前工作任务').fill('完成一轮功能验收');
    await work.locator('summary').filter({ hasText: '工作网站组合' }).click();
    await work.getByLabel('Work Alpha', { exact: true }).check();
    await work.getByRole('button', { name: '开始专注' }).click();
    await work.getByRole('button', { name: '暂停', exact: true }).waitFor();
    assert.equal(await page.locator('#study').count(), 0, 'unselected site categories hide during work');
    assert.equal(await page.getByRole('button', { name: /技术情报/ }).count(), 0);
    await page.reload();
    await work.getByRole('button', { name: '暂停', exact: true }).click();
    const paused = await page.evaluate(() => JSON.parse(localStorage.getItem('baize_work_session_v1')).current);
    assert.equal(paused.deadline, null);
    await page.reload();
    await work.getByRole('button', { name: '继续', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('baize_work_session_v1')).current.remainingMs), paused.remainingMs);
    await work.getByRole('button', { name: '结束并记录' }).click();
    const final = await page.evaluate(() => JSON.parse(localStorage.getItem('baize_work_session_v1')));
    assert.equal(final.current, null); assert.equal(final.history.length, 1);
    await page.getByRole('button', { name: /^待同步/ }).click();
    await page.getByRole('region', { name: '离线待同步中心' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'page fits viewport');
    await page.screenshot({ path: new URL(`../artifacts/personal-workflows/main-${width}.png`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: preview/apply, dedupe, Inbox/translation search, calculator, persisted work session and pending center.`);
    await context.close();
  }
  const offlineContext = await contextFor(390, 'allow');
  const page = await offlineContext.newPage();
  page.on('pageerror', error => console.error('Offline page error:', error.message));
  page.on('requestfailed', request => { if (request.url().startsWith(origin)) console.error('Offline failed request:', new URL(request.url()).pathname, request.failure()?.errorText); });
  await page.goto(baseUrl);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await offlineContext.setOffline(true);
  await page.reload();
  console.log('Offline caches:', await page.evaluate(async () => { const names = await caches.keys(); return Promise.all(names.map(async name => ({ name, count: (await (await caches.open(name)).keys()).length }))); }));
  await page.getByRole('button', { name: /^离线草稿/ }).waitFor();
  await palette(page, '智能整理中心');
  await page.getByRole('button', { name: /智能整理中心/ }).click();
  await page.getByRole('heading', { name: '智能整理中心', exact: true }).waitFor();
  await page.getByRole('button', { name: '编辑 Work Alpha', exact: true }).click();
  await page.getByLabel('描述', { exact: true }).fill('离线更新成功');
  await page.getByRole('button', { name: '保存到草稿', exact: true }).click();
  await page.reload();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('nav_cms_draft')).sites.find(site => site.id === 'alpha').description), '离线更新成功');
  console.log('PASS offline: reload, never-opened lazy admin, editing and persistent draft.');
  await offlineContext.close();
} finally { await browser.close(); }
