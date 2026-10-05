import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.BAIZE_PLAYWRIGHT_PATH || 'playwright');
const app = new URL(process.env.BAIZE_APP_URL || 'http://127.0.0.1:5189/nav/'); app.hash = '';
const blogTarget = { owner: 'baizetop1', repo: 'baizetop1.github.io', branch: 'master' };
const navTarget = { owner: 'baizetop1', repo: 'nav', branch: 'main' };
const id = '00000000-0000-4000-8000-000000000001';
const blogScope = `baize_blog_draft_v1:baizetop1:baizetop1.github.io:master:`;
const blogKey = blogScope + id, techKey = 'baize_tech_os_drafts_v1:' + encodeURIComponent('baizetop1/nav:main');
const markdown = '---\nlayout: post\ntitle: 草稿备份浏览器测试\ndate: 2026-10-05\nslug: backup-browser-test\npermalink: /p/backup-browser-test/\n---\n本机文章内容';
const draft = { version: 1, id, revision: 1, createdAt: 10, updatedAt: 20, markdown, source: null };
const index = JSON.parse(await readFile(new URL('../src/generated/tech-os-index.json', import.meta.url), 'utf8'));
const copy = { version: 1, base: index.files, files: index.files.map((file, i) => i === 0 ? { ...file, content: file.content + '\n\n备份验收草稿\n' } : file), conflicts: [] };
const archive = { format: 'baize-working-drafts', version: 1, exportedAt: '2026-10-05T00:00:00Z', blogs: [{ target: blogTarget, drafts: [draft] }], techOs: [{ target: navTarget, copy }] };
const output = new URL('../artifacts/working-drafts/', import.meta.url); await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BAIZE_BROWSER_CHANNEL || 'msedge', headless: true });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
    const page = await context.newPage(), errors = [], writes = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const request = route.request();
      if (!['GET', 'HEAD'].includes(request.method())) { writes.push(request.url()); return route.abort(); }
      if (new URL(request.url()).origin !== app.origin) return route.fulfill({ status: 503, body: '' });
      return route.continue();
    });
    await page.goto(app.href);
    await page.evaluate(({ blogKey, techKey, draft, copy }) => { localStorage.setItem(blogKey, JSON.stringify(draft)); localStorage.setItem(techKey, JSON.stringify(copy)); window.dispatchEvent(new Event('storage')); }, { blogKey, techKey, draft, copy });
    await page.getByRole('button', { name: /^待同步/ }).click();
    const panel = page.locator('[aria-label="工作草稿待提交清单"]');
    await panel.getByText('仅存本机，待提交').waitFor();
    await panel.getByText('已存本机，待提交').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'no horizontal overflow');
    const downloadWait = page.waitForEvent('download'); await panel.getByRole('button', { name: '批量备份工作草稿' }).click();
    const download = await downloadWait;
    const downloaded = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert.equal(downloaded.blogs[0].drafts[0].markdown, markdown); assert.deepEqual(downloaded.techOs[0].copy.base, copy.base);
    const input = panel.locator('input[type=file]');
    const upload = () => input.setInputFiles({ name: 'drafts.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(archive)) });
    await upload(); await panel.getByRole('button', { name: '确认恢复到本机' }).waitFor();
    assert.equal(await panel.getByRole('button', { name: '确认恢复到本机' }).isDisabled(), true, 'same content must not reimport');
    await panel.getByRole('button', { name: '取消草稿恢复' }).click();
    await page.evaluate(({ blogKey, techKey }) => { localStorage.removeItem(blogKey); localStorage.removeItem(techKey); window.dispatchEvent(new Event('storage')); }, { blogKey, techKey });
    await upload(); await panel.getByRole('button', { name: '确认恢复到本机' }).click();
    await panel.getByText(/^恢复完成：/).waitFor();
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).base, techKey), copy.base);
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).markdown, blogKey), markdown);

    // Restore into a device with divergent content: keep both blog variants and preserve Tech OS.
    const divergent = { ...copy, files: copy.files.map((file, i) => i === 0 ? { ...file, content: '本机不同内容' } : file) };
    await page.evaluate(({ blogKey, techKey, draft, divergent }) => { localStorage.setItem(blogKey, JSON.stringify({ ...draft, markdown: '本机文章新修改' })); localStorage.setItem(techKey, JSON.stringify(divergent)); window.dispatchEvent(new Event('storage')); }, { blogKey, techKey, draft, divergent });
    await upload(); await panel.locator('li').filter({ hasText: /已有不同的 Tech OS/ }).waitFor(); await panel.getByRole('button', { name: '确认恢复到本机' }).click();
    const variants = await page.evaluate(scope => Object.keys(localStorage).filter(key => key.startsWith(scope)).map(key => JSON.parse(localStorage.getItem(key)).markdown), blogScope);
    assert.equal(variants.length, 2); assert.ok(variants.includes('本机文章新修改') && variants.includes(markdown));
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), techKey), divergent);
    await page.locator('[aria-label="离线待同步中心"]').screenshot({ path: fileURLToPath(new URL(`pending-region-${width}.png`, output)) });
    await page.screenshot({ path: fileURLToPath(new URL(`pending-${width}.png`, output)), fullPage: true });

    // Quota failure stays visible and does not erase earlier drafts.
    await page.evaluate(key => { localStorage.removeItem(key); const original = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key.startsWith('baize_blog_draft_v1:')) throw new DOMException('Storage full', 'QuotaExceededError'); return original.call(this, key, value); }; }, blogKey);
    const modifiedArchive = structuredClone(archive); modifiedArchive.blogs[0].drafts[0].markdown = '尚未导入的新内容';
    await input.setInputFiles({ name: 'quota.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(modifiedArchive)) });
    await panel.getByRole('button', { name: '确认恢复到本机' }).click();
    await panel.getByRole('alert').filter({ hasText: '本次恢复已撤回' }).waitFor();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), blogKey), null);
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), techKey), divergent);
    // The management UI must include working drafts in its ordinary complete backup too.
    await page.goto(app.href + '#/admin');
    await page.reload(); // Reset the deliberate quota mock before testing full restore.
    const fullDownloadWait = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出完整备份', exact: true }).click();
    const fullDownload = await fullDownloadWait;
    const fullBackup = JSON.parse(await readFile(await fullDownload.path(), 'utf8'));
    assert.ok(fullBackup.workingDrafts.blogs[0].drafts.length > 0);
    assert.deepEqual(fullBackup.workingDrafts.techOs[0].copy, divergent);
    await page.evaluate(({ scope, key }) => { for (const item of Object.keys(localStorage)) if (item.startsWith(scope)) localStorage.removeItem(item); localStorage.removeItem(key); }, { scope: blogScope, key: techKey });
    page.on('dialog', dialog => dialog.accept());
    await page.locator('label').filter({ hasText: /^恢复完整备份/ }).locator('input[type=file]').setInputFiles({ name: 'full.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fullBackup)) });
    await page.waitForFunction(key => localStorage.getItem(key) !== null, techKey);
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), techKey), divergent);
    assert.deepEqual(errors, []); assert.deepEqual(writes, []);
    console.log(`PASS ${width}px: pending list, draft/full-backup export and restore, preview, duplicates, divergence, quota preservation and no remote writes.`);
    await context.close();
  }
  await writeFile(new URL('report.json', output), JSON.stringify({ widths: [1440, 390], remoteWrites: 0, pageErrors: 0, passed: true }, null, 2));
} finally { await browser.close(); }
