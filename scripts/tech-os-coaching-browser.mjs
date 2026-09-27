import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.BAIZE_PLAYWRIGHT_PATH || 'playwright');
const baseUrl = process.env.BAIZE_APP_URL || 'http://127.0.0.1:5189/nav/';
const origin = new URL(baseUrl).origin;
const index = JSON.parse(await readFile(new URL('../src/generated/tech-os-index.json', import.meta.url), 'utf8'));
const questId = index.state.currentQuestId;
const output = new URL('../artifacts/tech-os-coaching/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const key = 'baize_tech_os_study_progress_v1';
const errors = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await context.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copiedText = text; } } }));
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    const page = await context.newPage();
    await page.goto(`${baseUrl}#/tech-os`);
    await page.getByRole('button', { name: '继续学习 S1', exact: true }).click();
    const guide = page.getByRole('region', { name: '任务学习辅导', exact: true });
    const step = guide.getByRole('article', { name: '当前步骤辅导', exact: true });
    const select = guide.getByRole('combobox', { name: '当前辅导步骤', exact: true });
    await step.getByRole('region', { name: '工具与操作', exact: true }).waitFor();
    for (const title of ['为什么这样做', '观察与预期', '检查理解', '完成标志']) assert.equal(await step.getByRole('region', { name: title, exact: true }).isVisible(), true);
    const answer = step.locator('details').filter({ has: page.locator('summary', { hasText: '参考答案' }) });
    assert.equal(await answer.getAttribute('open'), null, 'answers are not revealed before the learner tries');
    await answer.locator('summary').click();
    assert.notEqual(await answer.getAttribute('open'), null);
    await select.selectOption('S2');
    await page.waitForFunction(id => document.activeElement?.id === id, `${questId}-step-S2`);
    await guide.getByRole('button', { name: '下一步辅导', exact: true }).click();
    assert.equal(await select.inputValue(), 'S3');
    await guide.getByRole('button', { name: '上一步辅导', exact: true }).click();
    assert.equal(await select.inputValue(), 'S2');
    await guide.getByRole('button', { name: '阅读 S7', exact: true }).click();
    await page.waitForFunction(id => document.activeElement?.id === id, `${questId}-step-S7`);
    assert.equal(await select.inputValue(), 'S7');
    await guide.getByRole('button', { name: '完整正文', exact: true }).click();
    await page.locator(`#${questId}-step-S1`).waitFor();
    await guide.getByRole('button', { name: '阅读 S1', exact: true }).click();
    await page.waitForFunction(id => document.activeElement?.id === id, `${questId}-step-S1`);
    await guide.getByRole('button', { name: '逐步辅导', exact: true }).click();
    await select.selectOption('S1');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null, 'reading, switching, and revealing answers do not complete steps');
    assert.equal(new URL(page.url()).hash, '#/tech-os');
    await step.scrollIntoViewIfNeeded();
    await page.screenshot({ path: fileURLToPath(new URL(`coaching-${width}.png`, output)) });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

    const link = guide.getByRole('link', { name: '打开导航实验页', exact: true });
    assert.match(await link.getAttribute('rel'), /noopener/);
    const popup = page.waitForEvent('popup');
    await link.click();
    const lab = await popup;
    await lab.waitForLoadState('load');
    const documentRequests = [];
    lab.on('request', request => { if (request.resourceType() === 'document') documentRequests.push(request.url()); });
    await lab.getByRole('link', { name: '只改变 fragment：#section-two', exact: true }).click();
    await lab.waitForURL(url => url.hash === '#section-two');
    assert.equal(documentRequests.length, 0, 'simple fragment link preserves this document');
    assert.match(await lab.locator('#url-fields').textContent(), /#section-two/);
    await lab.getByRole('link', { name: '改变查询参数：?topic=network&sample=1', exact: true }).click();
    await lab.waitForURL(url => url.search === '?topic=network&sample=1');
    assert.ok(documentRequests.length > 0);
    await lab.getByLabel('GET 表单关键词（只填测试文字）').fill('test <b>plain</b>');
    await lab.getByRole('button', { name: '提交 GET 表单', exact: true }).click();
    await lab.waitForURL(url => url.searchParams.get('keyword') === 'test <b>plain</b>');
    assert.equal(await lab.locator('#url-fields b').count(), 0, 'URL content is text, not injected HTML');
    assert.ok(documentRequests.every(url => !url.includes('#section-two')));
    await lab.getByRole('button', { name: '复制空白观察表', exact: true }).click();
    await lab.waitForFunction(() => window.copiedText?.includes('操作前预测'));
    assert.equal(await lab.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await lab.screenshot({ path: fileURLToPath(new URL(`lab-${width}.png`, output)) });
    await lab.close();

    if (width === 1440) {
      for (const quest of index.entities.filter(entity => entity.kind === 'quest')) {
        const search = page.getByRole('textbox', { name: '搜索当前对象', exact: true });
        await search.fill(quest.id);
        const list = page.getByRole('region', { name: '核心任务与开放问题列表', exact: true });
        await list.getByRole('button').filter({ hasText: quest.id }).click();
        await guide.getByRole('combobox', { name: '当前辅导步骤', exact: true }).waitFor();
        assert.ok(await guide.getByRole('combobox', { name: '当前辅导步骤' }).locator('option').count() >= 2, `${quest.id} must have actionable lessons`);
        assert.equal(await guide.getByRole('region', { name: '工具准备', exact: true }).count(), 1);
      }
    }
    await context.close();
    console.log(`Tech OS coaching and navigation lab passed at ${width}px`);
  }
  // Exercise the production worker too: the lab must not poison offline navigation.
  const offlineContext = await browser.newContext({ serviceWorkers: 'allow' });
  const offlinePage = await offlineContext.newPage();
  await offlinePage.goto(baseUrl);
  await offlinePage.evaluate(async base => {
    await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });
    await navigator.serviceWorker.ready;
  }, new URL(baseUrl).pathname);
  await offlinePage.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const cachedShell = () => offlinePage.evaluate(async base => (await caches.match(`${base}index.html`))?.text(), baseUrl);
  const before = await cachedShell();
  assert.match(before, /id="root"/);
  await offlinePage.goto(`${baseUrl}learning-lab/navigation.html`);
  await offlinePage.getByRole('heading', { name: '导航实验页', exact: true }).waitFor();
  assert.equal(await cachedShell(), before, 'visiting the lab leaves the cached application shell untouched');
  await offlineContext.setOffline(true);
  await offlinePage.goto(`${baseUrl}#/tech-os`);
  await offlinePage.getByRole('region', { name: '继续学习', exact: true }).waitFor();
  await offlineContext.close();
  console.log('Tech OS lab preserves the application shell under an active Service Worker; offline Tech OS still opens.');
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
