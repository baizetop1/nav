import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.BAIZE_PLAYWRIGHT_PATH || 'playwright');
const base = new URL(process.env.BAIZE_APP_URL || 'http://127.0.0.1:5189/nav/');
base.hash = ''; base.search = '';
const output = new URL('../artifacts/aihot/', import.meta.url);
await mkdir(output, { recursive: true });
const readerKey = 'baize_aihot_reader_v1';
const stamp = '2026-10-12T01:00:00.000Z';
const selectedPath = '/api/v1/items?mode=selected&limit=20';
const hotPath = '/api/v1/hot-topics';
const dailyPath = '/api/v1/dailies/latest';
const summary = 'ONLY_IN_MEMORY_FIXTURE_SUMMARY：这是隔离回归数据，不是真实新闻，也不应写入本机存储或仓库。';
const article = {
  id: 'baize-fixture-one', title: '隔离测试：开源模型阅读条目', summary,
  source: { name: '测试来源 Alpha' }, category: 'ai-models', selected: true,
  publishedAt: stamp, discoveredAt: stamp,
  links: { aihot: 'https://aihot.news/items/baize-fixture-one', original: 'https://example.com/baize-fixture-one' },
  attribution: { name: 'AIHOT', url: 'https://aihot.news/items/baize-fixture-one' },
};
const selected = { schemaVersion: 1, items: [article, {
  ...article, id: 'baize-fixture-two', title: '隔离测试：特别长的第二条标题用于验证手机屏幕上的文字换行与阅读卡片不会横向溢出',
  summary: '第二条隔离测试摘要。', source: { name: '测试来源 Beta' },
  links: { aihot: 'https://aihot.news/items/baize-fixture-two', original: 'https://example.com/baize-fixture-two' },
}] };
const hot = { schemaVersion: 1, items: [{
  id: 'baize-fixture-hot', rank: 1, title: '隔离测试：多来源 AI 热点',
  source: { name: '测试来源 Hot' }, sourceCount: 3, sourceNames: ['Alpha', 'Beta', 'Gamma'], latestAt: stamp,
  links: { aihot: 'https://aihot.news/items/baize-fixture-hot', original: 'https://example.com/baize-fixture-hot' },
}] };
const daily = { schemaVersion: 1, report: {
  date: '2026-10-12', generatedAt: stamp, windowStart: '2026-10-11T01:00:00.000Z', windowEnd: stamp,
  links: { aihot: 'https://aihot.news/daily/2026-10-12' },
  attribution: { name: 'AIHOT', url: 'https://aihot.news/daily/2026-10-12' },
  lead: { title: '隔离测试 AI 日报', leadParagraph: '这段日报导语只存在于浏览器测试响应。' },
  sections: [{ label: '模型动态', items: [{
    title: '隔离测试：日报中的条目', summary: '日报条目的测试摘要。', source: { name: '测试日报来源' },
    links: { aihot: 'https://aihot.news/items/baize-fixture-daily', original: 'https://example.com/baize-fixture-daily' },
    attribution: { name: 'AIHOT', url: 'https://aihot.news/items/baize-fixture-daily' },
  }] }], flashes: [],
} };
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const noOverflow = async (page, label) => {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(dimensions.scroll <= dimensions.width + 1, label + ': horizontal overflow ' + dimensions.scroll + ' > ' + dimensions.width);
};
const visibleReaderHeading = async page => {
  await page.evaluate(() => { delete window.__aihotHeadingSample; });
  try { await page.waitForFunction(() => {
    const heading = document.querySelector('#ai-news h2'), toolbar = document.querySelector('.baize-toolbar');
    if (!heading || !toolbar) return false;
    const rect = heading.getBoundingClientRect(), toolbarBottom = toolbar.getBoundingClientRect().bottom;
    const previous = window.__aihotHeadingSample;
    const stable = previous && Math.abs(previous.top - rect.top) < 0.5 ? previous.stable + 1 : 0;
    window.__aihotHeadingSample = { top: rect.top, stable };
    return stable >= 4 && rect.top >= toolbarBottom + 4 && rect.bottom <= innerHeight - 8;
  }, undefined, { timeout: 5000 }); }
  catch (error) {
    const geometry = await page.evaluate(() => ({ heading: document.querySelector('#ai-news h2')?.getBoundingClientRect().toJSON(), toolbar: document.querySelector('.baize-toolbar')?.getBoundingClientRect().toJSON(), panel: document.querySelector('#ai-news')?.getBoundingClientRect().toJSON(), scrollY, sample: window.__aihotHeadingSample }));
    console.error('AIHOT heading diagnostics: ' + JSON.stringify(geometry));
    await page.screenshot({ path: fileURLToPath(new URL('heading-failure-' + page.viewportSize().width + '.png', output)) });
    throw error;
  }
  const geometry = await page.evaluate(() => ({ headingTop: document.querySelector('#ai-news h2').getBoundingClientRect().top, toolbarBottom: document.querySelector('.baize-toolbar').getBoundingClientRect().bottom }));
  assert.ok(geometry.headingTop >= geometry.toolbarBottom + 4, 'reader heading is below the sticky toolbar after opening, not merely in the DOM');
};
const visibleStar = async button => {
  const bounds = await button.locator('svg').boundingBox();
  assert.ok(bounds && bounds.width >= 15 && bounds.height >= 15, 'favorite icon must retain its 16px visual size instead of being compressed to a dot');
};
const openReader = async page => {
  const entry = page.locator('[data-home-tool="ai-news"]');
  if (!await entry.isVisible()) await page.getByRole('button', { name: /^更多工具/ }).click();
  await entry.click();
  const panel = page.getByRole('region', { name: 'AI 资讯阅读器', exact: true });
  await panel.waitFor();
  await visibleReaderHeading(page);
  return panel;
};
const fixtureRoutes = async context => {
  const calls = [], writes = [], aborted = [];
  let selectedMode = 'success', releaseSelected, deferredBody = selected;
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(request.method() + ' ' + url.origin + url.pathname);
    if (url.origin === base.origin) return route.continue();
    if (url.origin !== 'https://aihot.news') return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
    const path = url.pathname + url.search;
    calls.push(path);
    assert.equal(request.method(), 'GET', 'AIHOT is read only');
    assert.equal(request.headers().authorization, undefined, 'no API credentials sent to AIHOT');
    assert.equal(request.headers().cookie, undefined, 'AIHOT requests omit cookies');
    assert.ok([selectedPath, hotPath, dailyPath].includes(path), 'only the agreed bounded public API endpoints: ' + path);
    if (path === selectedPath && selectedMode === 'fail') {
      selectedMode = 'success';
      return route.fulfill({ status: 503, headers: { 'Retry-After': '1', 'Cache-Control': 'no-store', 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'fixture upstream unavailable' }) });
    }
    let value = path === hotPath ? hot : path === dailyPath ? daily : selected;
    if (path === selectedPath && selectedMode === 'defer') {
      await new Promise(resolve => { releaseSelected = resolve; });
      value = deferredBody;
      selectedMode = 'success';
    }
    return route.fulfill({ status: 200, headers: { 'Cache-Control': 'must-revalidate, max-age=60', 'Content-Type': 'application/json' }, body: JSON.stringify(value) }).catch(() => {});
  });
  return {
    calls, writes, aborted,
    failNextSelected() { selectedMode = 'fail'; },
    deferNextSelected(body = selected) { selectedMode = 'defer'; deferredBody = body; releaseSelected = undefined; },
    release() { releaseSelected?.(); },
  };
};

try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    const mock = await fixtureRoutes(context);
    await context.addInitScript(() => {
      localStorage.setItem('nav_translator_collapsed', 'true');
      localStorage.setItem('nav_hot_feed_collapsed', 'true');
      localStorage.setItem('nav_temporary_visits_collapsed', 'true');
    });
    const page = await context.newPage(), errors = [];
    await page.clock.install({ time: new Date(stamp) });
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => { if (request.url().startsWith('https://aihot.news/')) mock.aborted.push(request.url()); });
    try {
      await page.goto(base.href);
      await page.getByRole('button', { name: '整理入口', exact: true }).waitFor();
      const navigationBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('nav_cms_draft') || 'null'));
      assert.deepEqual(mock.calls, [], 'collapsed homepage must not fetch AIHOT');
      assert.equal(await page.getByRole('region', { name: 'AI 资讯阅读器', exact: true }).count(), 0, 'panel is not mounted by default');
      let panel = await openReader(page);
      const first = panel.locator('[data-aihot-id="' + article.id + '"]');
      await first.waitFor();
      await page.screenshot({ path: fileURLToPath(new URL('opening-' + width + '.png', output)) });
      assert.deepEqual(mock.calls, [selectedPath], 'opening fetches selected only');
      assert.equal(await panel.getByRole('tab', { name: '精选', exact: true }).getAttribute('aria-selected'), 'true');
      assert.equal(await first.getByRole('link', { name: '在 AIHOT 阅读', exact: true }).getAttribute('href'), article.links.aihot);
      const original = first.getByRole('link', { name: '阅读原文', exact: true });
      assert.equal(await original.getAttribute('href'), article.links.original);
      assert.equal(await original.getAttribute('target'), '_blank');
      assert.match(await original.getAttribute('rel') || '', /noopener/);
      const favoriteButton = first.getByRole('button', { name: '收藏：' + article.title, exact: true });
      await visibleStar(favoriteButton);
      await favoriteButton.click();
      await first.getByRole('button', { name: '标为已读：' + article.title, exact: true }).click();
      await first.getByRole('button', { name: '已读：' + article.title, exact: true }).waitFor();
      assert.equal(await first.getByRole('button', { name: '已读：' + article.title, exact: true }).isDisabled(), true);
      const persisted = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), readerKey);
      assert.equal(persisted.version, 1);
      assert.equal(persisted.favorites.length, 1);
      assert.equal(persisted.favorites[0].readingUrl, article.links.aihot);
      assert.ok(persisted.read[article.links.aihot]);
      assert.equal(JSON.stringify(persisted).includes(summary), false, 'summary is not persisted');
      assert.equal(Object.hasOwn(persisted.favorites[0], 'summary'), false, 'favorites are metadata only');
      await noOverflow(page, 'selected ' + width);
      await page.screenshot({ path: fileURLToPath(new URL('selected-' + width + '.png', output)) });

      await panel.getByRole('tab', { name: '热点', exact: true }).click();
      await panel.locator('[data-aihot-id="baize-fixture-hot"]').waitFor();
      assert.deepEqual(mock.calls, [selectedPath, hotPath], 'hot topics load only when selected');
      await noOverflow(page, 'hot ' + width);
      await panel.getByRole('tab', { name: '日报', exact: true }).click();
      await panel.getByText('隔离测试 AI 日报', { exact: true }).waitFor();
      await panel.getByText('隔离测试：日报中的条目', { exact: true }).waitFor();
      assert.deepEqual(mock.calls, [selectedPath, hotPath, dailyPath], 'daily report loads only when selected');
      await noOverflow(page, 'daily ' + width);
      await page.screenshot({ path: fileURLToPath(new URL('daily-' + width + '.png', output)) });
      const beforeFavorites = mock.calls.length;
      await panel.getByRole('tab', { name: '收藏', exact: true }).click();
      await panel.getByText(article.title, { exact: true }).waitFor();
      assert.equal(mock.calls.length, beforeFavorites, 'favorites do not fetch articles');
      await panel.getByRole('button', { name: '收起 AI 资讯', exact: true }).click();
      assert.equal(await page.getByRole('region', { name: 'AI 资讯阅读器', exact: true }).count(), 0);
      const closedRequests = mock.calls.length;
      await page.reload();
      await page.getByRole('button', { name: '整理入口', exact: true }).waitFor();
      assert.equal(mock.calls.length, closedRequests, 'reload keeps the tool collapsed without background fetch');
      panel = await openReader(page);
      await panel.locator('[data-aihot-id="' + article.id + '"]').waitFor();
      await panel.getByRole('button', { name: '已读：' + article.title, exact: true }).waitFor();
      assert.equal(await panel.getByRole('button', { name: '已读：' + article.title, exact: true }).isDisabled(), true, 'read status survives reload');
      await panel.getByRole('tab', { name: '收藏', exact: true }).click();
      await panel.getByRole('button', { name: '移除收藏：' + article.title, exact: true }).waitFor();
      await visibleStar(panel.getByRole('button', { name: '移除收藏：' + article.title, exact: true }));
      await noOverflow(page, 'favorites ' + width);
      await page.screenshot({ path: fileURLToPath(new URL('favorites-' + width + '.png', output)) });

      // Respect the reader's one-minute cooldown, without making the test sleep for a minute.
      await panel.getByRole('tab', { name: '精选', exact: true }).click();
      await panel.locator('[data-aihot-id="' + article.id + '"]').waitFor();
      const callsBeforeExpiry = mock.calls.length;
      await page.clock.fastForward(65_000);
      await panel.locator('[data-aihot-id="' + article.id + '"]').waitFor({ state: 'hidden' });
      await panel.getByRole('status').filter({ hasText: /本次资讯已过期，请重新读取/ }).waitFor();
      assert.equal(mock.calls.length, callsBeforeExpiry, 'expiry hides old news but does not perform a background refresh');
      const oldTitle = '这条延迟的精选结果不应覆盖热点栏目';
      mock.deferNextSelected({ schemaVersion: 1, items: [{ ...article, title: oldTitle }] });
      await Promise.all([
        page.waitForRequest(request => request.url() === 'https://aihot.news' + selectedPath),
        panel.getByRole('button', { name: '重新读取', exact: true }).click(),
      ]);
      await panel.getByRole('tab', { name: '热点', exact: true }).click();
      await panel.locator('[data-aihot-id="baize-fixture-hot"]').waitFor();
      mock.release();
      await page.waitForTimeout(150);
      assert.equal(await panel.getByRole('tab', { name: '热点', exact: true }).getAttribute('aria-selected'), 'true');
      assert.equal(await panel.getByText(oldTitle, { exact: true }).count(), 0, 'a late selected response cannot replace hot topics');

      // Collapsing while a request is in flight aborts it and does not schedule more work.
      await page.clock.fastForward(65_000);
      mock.deferNextSelected();
      await Promise.all([
        page.waitForRequest(request => request.url() === 'https://aihot.news' + selectedPath),
        panel.getByRole('tab', { name: '精选', exact: true }).click(),
      ]);
      const abortedBefore = mock.aborted.length;
      await panel.getByRole('button', { name: '收起 AI 资讯', exact: true }).click();
      mock.release();
      await page.waitForTimeout(150);
      assert.equal(await page.getByRole('region', { name: 'AI 资讯阅读器', exact: true }).count(), 0);
      assert.ok(mock.aborted.length > abortedBefore, 'closing the panel aborts its pending request');
      const afterClose = mock.calls.length;
      await page.waitForTimeout(150);
      assert.equal(mock.calls.length, afterClose, 'no background refresh after collapse');
      assert.deepEqual(mock.writes, [], 'no external or local server writes');
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('nav_cms_draft') || 'null')), navigationBefore, 'AI reading does not alter site data');
      assert.equal(await page.evaluate(() => JSON.stringify(localStorage).includes('ONLY_IN_MEMORY_FIXTURE_SUMMARY')), false);

      // The new entry participates in the existing home organizer and command panel.
      await page.getByRole('button', { name: '整理入口', exact: true }).click();
      const organizer = page.getByRole('region', { name: '首页入口整理', exact: true });
      const aiRow = organizer.locator('li').filter({ has: page.locator('span', { hasText: /^AI 资讯$/ }) });
      await aiRow.getByRole('checkbox', { name: /固定/ }).check();
      await organizer.getByRole('button', { name: '保存入口设置', exact: true }).click();
      const visibleEntry = page.locator('[data-home-tool="ai-news"]');
      await visibleEntry.waitFor();
      assert.equal(await visibleEntry.evaluate(element => !element.closest('#home-more-tools')), true, 'pinning makes AI news a primary home entry');
      await page.keyboard.press('Control+k');
      const palette = page.getByRole('dialog', { name: '全局命令面板', exact: true });
      await palette.getByRole('textbox', { name: '搜索所有内容和命令', exact: true }).fill('AIHOT');
      await palette.getByRole('button', { name: /^AI 资讯与日报/ }).click();
      panel = page.getByRole('region', { name: 'AI 资讯阅读器', exact: true });
      await panel.locator('[data-aihot-id="' + article.id + '"]').waitFor();
      await visibleReaderHeading(page);
      await noOverflow(page, 'command entry ' + width);

      // A quota failure must not delete the existing favorite/read archive.
      const beforeQuota = await page.evaluate(key => localStorage.getItem(key), readerKey);
      await page.evaluate(key => {
        window.__aihotOriginalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function (name, value) {
          if (name === key) throw new DOMException('Fixture storage full', 'QuotaExceededError');
          return window.__aihotOriginalSetItem.call(this, name, value);
        };
      }, readerKey);
      await panel.getByRole('button', { name: '取消收藏：' + article.title, exact: true }).click();
      await panel.getByRole('alert').filter({ hasText: /无法保存 AI 资讯本地记录/ }).waitFor();
      assert.equal(await page.evaluate(key => localStorage.getItem(key), readerKey), beforeQuota, 'failed favorite update preserves original local records');
      await page.evaluate(() => { Storage.prototype.setItem = window.__aihotOriginalSetItem; });
      await panel.getByRole('button', { name: '收起 AI 资讯', exact: true }).click();

      // Starting focus mode removes news and disables its entry to reduce distraction.
      panel = await openReader(page);
      await panel.locator('[data-aihot-id="' + article.id + '"]').waitFor();
      await page.locator('[data-home-tool="work-session"]').click();
      const work = page.getByRole('region', { name: '工作会话', exact: true });
      await work.getByRole('textbox', { name: '当前工作任务', exact: true }).fill('隔离测试：阅读完成后进入专注');
      const beforeFocus = mock.calls.length;
      await work.getByRole('button', { name: '开始专注', exact: true }).click();
      await panel.waitFor({ state: 'hidden' });
      await page.waitForFunction(() => document.querySelector('[data-home-tool="ai-news"]')?.disabled);
      assert.equal(mock.calls.length, beforeFocus, 'entering focus mode does not request AI news');
      await noOverflow(page, 'focus mode ' + width);
      assert.deepEqual(mock.writes, [], 'organizer and command launch still perform no server writes');
      assert.deepEqual(errors, [], 'no unhandled page errors');
      console.log('PASS ' + width + 'px: heading/icon visibility, lazy AIHOT reads, metadata-only favorites/read status, expiry, late-result isolation, collapse cancellation, home pin/command entry, quota preservation, focus mode and no writes.');
    } finally { mock.release(); await context.close(); }

    // Upstream failure is local to the reader, with a user-controlled successful retry.
    const failureContext = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    const failureMock = await fixtureRoutes(failureContext);
    failureMock.failNextSelected();
    const failurePage = await failureContext.newPage(), failureErrors = [];
    await failurePage.clock.install({ time: new Date(stamp) });
    failurePage.on('pageerror', error => failureErrors.push(error.message));
    try {
      await failurePage.goto(base.href);
      const panel = await openReader(failurePage);
      await panel.getByRole('alert').waitFor();
      await failurePage.getByRole('button', { name: '整理入口', exact: true }).waitFor();
      assert.deepEqual(failureMock.calls, [selectedPath], 'failure does not fan out to other endpoints');
      await noOverflow(failurePage, 'failure ' + width);
      await failurePage.screenshot({ path: fileURLToPath(new URL('failure-' + width + '.png', output)) });
      await failurePage.clock.fastForward(65_000);
      const retry = panel.getByRole('button', { name: '重试读取', exact: true });
      await retry.waitFor();
      await retry.click();
      await panel.locator('[data-aihot-id="' + article.id + '"]').waitFor();
      assert.equal(await panel.getByRole('alert').count(), 0, 'retry clears the failure state');
      assert.deepEqual(failureMock.calls, [selectedPath, selectedPath]);
      assert.deepEqual(failureMock.writes, []);
      assert.deepEqual(failureErrors, []);
      console.log('PASS ' + width + 'px: upstream failure remains readable and recovers by explicit retry; homepage intact.');
    } finally { failureMock.release(); await failureContext.close(); }
  }
} finally { await browser.close(); }
