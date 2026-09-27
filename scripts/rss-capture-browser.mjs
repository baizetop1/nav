import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createRssSource } from '../src/lib/rss.ts';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.BAIZE_PLAYWRIGHT_PATH || 'playwright');
const baseUrl = new URL(process.env.BAIZE_APP_URL || 'http://127.0.0.1:5189/nav/');
const alpha = createRssSource('测试订阅 Alpha', 'https://feeds.example.com/alpha.xml');
const beta = createRssSource('测试订阅 Beta', 'https://feeds.example.com/beta.xml');
const stamp = '2026-09-27T01:00:00.000Z';
const firstItem = { id: `${alpha.id}-one`, sourceId: alpha.id, title: 'RSS 回归测试文章 Alpha', url: 'https://articles.example.com/alpha', summary: '这段摘要来自隔离测试数据，不会向真实订阅或 GitHub 发起写入。', publishedAt: stamp };
const secondItem = { id: `${beta.id}-two`, sourceId: beta.id, title: 'RSS 回归测试文章 Beta', url: 'https://articles.example.com/beta', summary: '第二个订阅的文章。', publishedAt: stamp };
const fixture = { version: 1, generatedAt: stamp, sources: [alpha, beta].map(source => ({ ...source, fetchedAt: stamp })), items: [firstItem, secondItem] };
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true });
const page = await context.newPage();
const errors = [], attemptedRemoteWrites = [];
page.on('pageerror', error => errors.push(error.message));
await context.route('**/*', route => {
  const request = route.request(), url = new URL(request.url());
  if (url.origin !== baseUrl.origin) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) attemptedRemoteWrites.push(`${request.method()} ${url.origin}`);
    return route.abort();
  }
  if (url.pathname.endsWith('/rss-feed.json')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) });
  return route.continue();
});
const noOverflow = async label => {
  const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
  assert.ok(size.scroll <= size.width + 1, `${label}: page overflow ${size.scroll} > ${size.width}`);
};
const openRss = async () => {
  await page.getByRole('button', { name: 'RSS 订阅', exact: true }).click();
  const panel = page.getByRole('region', { name: 'RSS 阅读中心', exact: true });
  await panel.waitFor();
  return panel;
};

try {
  const incomingUrl = new URL(baseUrl);
  incomingUrl.searchParams.set('share_title', '分享回归测试');
  incomingUrl.searchParams.set('share_url', 'https://capture.example.com/page');
  incomingUrl.searchParams.set('share_text', '准备保存的备注');
  await page.goto(incomingUrl.toString());
  const capture = page.getByRole('dialog', { name: '一键收集', exact: true });
  await capture.waitFor();
  await page.waitForFunction(() => !location.search.includes('share_'));
  assert.equal(new URL(page.url()).search, '');
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('baize_inbox_v1') || '{"items":[]}').items);
  assert.ok(!before.some(item => item.url === 'https://capture.example.com/page'));
  assert.equal(await capture.getByLabel('标题（可选）').inputValue(), '分享回归测试');
  assert.equal(await capture.getByLabel('网址（可选）').inputValue(), 'https://capture.example.com/page');
  await noOverflow('share preview');
  await capture.getByRole('button', { name: '保存到 Inbox', exact: true }).click();
  await capture.getByText('已保存到 Inbox，可继续收集或关闭此窗口。', { exact: true }).waitFor();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('baize_inbox_v1') || '{"items":[]}').items.some(item => item.url === 'https://capture.example.com/page'));
  assert.equal(await capture.getByLabel('网址（可选）').inputValue(), '');
  await capture.getByRole('button', { name: '关闭一键收集', exact: true }).click();

  let panel = await openRss();
  await panel.getByLabel('订阅名称', { exact: true }).fill(alpha.title);
  await panel.getByLabel('RSS 订阅地址', { exact: true }).fill(alpha.url);
  await panel.getByRole('button', { name: '添加', exact: true }).click();
  await panel.getByRole('link', { name: firstItem.title, exact: false }).waitFor();
  const opml = `<opml version="2.0"><body><outline title="duplicate" xmlUrl="${alpha.url}"/><outline title="${beta.title}" xmlUrl="${beta.url}"/></body></opml>`;
  await panel.locator('input[type=file]').setInputFiles({ name: 'test.opml', mimeType: 'text/xml', buffer: Buffer.from(opml) });
  await panel.getByText(/已导入 1 个本机订阅，跳过 1 个/).waitFor();
  await panel.getByRole('link', { name: secondItem.title, exact: false }).waitFor();
  const manage = panel.locator('details').first();
  if (await manage.getAttribute('open') === null) await manage.locator('summary').first().click();
  const downloadEvent = page.waitForEvent('download');
  await panel.getByRole('button', { name: '导出 OPML', exact: true }).click();
  const download = await downloadEvent;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const exported = Buffer.concat(chunks).toString('utf8');
  assert.match(exported, /<opml/);
  assert.ok(exported.includes(alpha.url));
  assert.ok(exported.includes(beta.url));
  await noOverflow('RSS subscriptions and articles');

  const firstArticle = () => panel.locator('article').filter({ hasText: firstItem.title });
  await firstArticle().getByRole('button', { name: '收藏', exact: true }).click();
  assert.equal(await firstArticle().getByRole('button', { name: '已收藏', exact: true }).getAttribute('aria-pressed'), 'true');
  await firstArticle().getByRole('button', { name: '稍后阅读', exact: true }).click();
  await page.waitForFunction(url => JSON.parse(localStorage.getItem('baize_reading_v1') || '{"items":{}}').items[url]?.readLater === true, firstItem.url);
  await firstArticle().getByRole('button', { name: '收集', exact: true }).click();
  await page.waitForFunction(url => JSON.parse(localStorage.getItem('baize_inbox_v1') || '{"items":[]}').items.some(item => item.url === url), firstItem.url);
  await firstArticle().getByRole('button', { name: '标为已读', exact: true }).click();
  await panel.getByRole('link', { name: firstItem.title, exact: false }).waitFor({ state: 'hidden' });
  await panel.getByRole('button', { name: '全部', exact: true }).click();
  await firstArticle().getByRole('button', { name: '标为未读', exact: true }).waitFor();
  await panel.getByLabel('搜索 RSS 文章', { exact: true }).fill('Beta');
  assert.equal(await panel.locator('article').count(), 1);
  await panel.getByLabel('搜索 RSS 文章', { exact: true }).fill('');

  await page.reload();
  panel = await openRss();
  await panel.getByRole('link', { name: secondItem.title, exact: false }).waitFor();
  assert.equal(await panel.getByRole('link', { name: firstItem.title, exact: false }).count(), 0);
  await panel.getByRole('button', { name: '收藏', exact: true }).first().click();
  await firstArticle().getByRole('button', { name: '已收藏', exact: true }).waitFor();
  assert.equal(await panel.locator('article').count(), 1);
  const stored = await page.evaluate(() => ({ sources: JSON.parse(localStorage.getItem('baize_rss_sources_v1')), reader: JSON.parse(localStorage.getItem('baize_rss_reader_v1')), inbox: JSON.parse(localStorage.getItem('baize_inbox_v1')) }));
  assert.equal(stored.sources.sources.length, 2);
  assert.equal(stored.reader.items[firstItem.id].favorite, true);
  assert.equal(stored.reader.items[firstItem.id].read, true);
  assert.ok(stored.inbox.items.some(item => item.url === firstItem.url));
  assert.ok(stored.inbox.items.some(item => item.url === 'https://capture.example.com/page'));
  await noOverflow('RSS persisted mobile view');
  assert.deepEqual(attemptedRemoteWrites, []);
  assert.deepEqual(errors, []);
  console.log('PASS 390px share capture and RSS: query cleaned, explicit save, OPML import/export, unread/favorite/search, read later, Inbox, reload persistence, no overflow or remote writes.');
} finally { await context.close(); await browser.close(); }
