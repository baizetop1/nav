import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.BAIZE_PLAYWRIGHT_PATH || 'playwright');
const baseUrl = process.env.BAIZE_APP_URL || 'http://127.0.0.1:5189/nav/';
const origin = new URL(baseUrl).origin, prefix = 'baize_blog_draft_v1:';
const sha = text => createHash('sha1').update('blob ' + Buffer.byteLength(text) + '\0').update(text).digest('hex');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
await mkdir(new URL('../artifacts/blog-workbench/', import.meta.url), { recursive: true });
const legacyPath = '_posts/2025-06-16-Windows 特殊符号.md';
const legacy = '---\nlayout: post\ntitle: 旧文标题\ndate: 2025-06-16\nstatus: review\ncustom:\n  nested: true\n---\n旧文正文\n';
const draftPath = '_drafts/remote-draft.md';
const remoteDraft = '---\nlayout: post\ntitle: 远端草稿\nslug: remote-draft\npermalink: /p/remote-draft/\ndate: 2026-01-01\ncategory: 开发\nformat: 笔记\ntags: [测试]\nstatus: draft\n---\n远端草稿正文\n';
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block', acceptDownloads: true });
    const files = new Map([[legacyPath, legacy], [draftPath, remoteDraft]]);
    let head = 'a'.repeat(40), tree = 'b'.repeat(40), pendingEntries = [], commitCount = 0;
    const writes = [], errors = [];
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url()), path = decodeURIComponent(url.pathname);
      if (url.origin === origin) return route.continue();
      if (url.hostname !== 'api.github.com') return route.abort();
      const reply = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      if (!path.startsWith('/repos/baizetop1/baizetop1.github.io/')) return route.abort();
      if (request.method() !== 'GET') {
        const data = request.postDataJSON(); writes.push({ path, data });
        assert.equal(request.headers().authorization, 'Bearer mock-blog-token');
        if (path.endsWith('/git/trees')) { pendingEntries = data.tree; return reply({ sha: 'c'.repeat(40) }); }
        if (path.endsWith('/git/commits')) { commitCount++; return reply({ sha: String(commitCount).padStart(40, 'd') }); }
        if (path.includes('/git/refs/')) {
          assert.equal(data.force, false); head = data.sha; tree = 'e'.repeat(40);
          for (const entry of pendingEntries) { if (entry.sha === null) files.delete(entry.path); else files.set(entry.path, entry.content); }
          return reply({ object: { sha: head } });
        }
        throw new Error('Unexpected mocked write ' + path);
      }
      if (path.includes('/git/ref/')) return reply({ object: { sha: head } });
      if (path.includes('/git/commits/')) return reply({ tree: { sha: tree } });
      if (path.includes('/git/trees/')) return reply({ truncated: false, tree: [...files].map(([path, text]) => ({ path, sha: sha(text), type: 'blob', mode: '100644' })) });
      if (path.includes('/git/blobs/')) {
        const text = [...files.values()].find(value => sha(value) === path.split('/').pop());
        if (text === undefined) return route.fulfill({ status: 404, body: '{}' });
        return reply({ encoding: 'base64', size: Buffer.byteLength(text), content: Buffer.from(text).toString('base64') });
      }
      if (path.endsWith('/deployments')) return reply([{ id: 1, sha: head, environment: 'github-pages' }]);
      if (path.endsWith('/statuses')) return reply([{ state: 'success', log_url: 'https://github.com/baizetop1/baizetop1.github.io/actions/runs/1' }]);
      throw new Error('Unexpected mocked read ' + path);
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseUrl + '#/admin');
    await page.getByRole('link', { name: '前往博客工作台', exact: true }).click();
    await page.getByRole('button', { name: '新建文章', exact: true }).click();
    const editor = page.getByRole('region', { name: '博客编辑器' });
    const title = editor.getByRole('textbox', { name: '文章标题', exact: true });
    await title.pressSequentially('Browser draft test', { delay: 5 });
    assert.equal(await title.inputValue(), 'Browser draft test');
    assert.equal(await title.evaluate(element => document.activeElement === element), true);
    const body = '## 新正文\n\n自动保存的内容。\n\n[安全链接](https://example.com)\n\n[危险链接](javascript:alert)\n<script>window.blogAttack = true</script>';
    await editor.getByLabel('文章正文', { exact: true }).fill(body);
    await page.waitForFunction(prefix => Object.keys(localStorage).filter(key => key.startsWith(prefix)).some(key => JSON.parse(localStorage.getItem(key)).markdown.includes('自动保存的内容。')), prefix);
    await editor.getByRole('button', { name: '预览', exact: true }).click();
    assert.equal(await editor.getByRole('link', { name: '安全链接' }).getAttribute('href'), 'https://example.com/');
    assert.equal(await editor.locator('a[href^="javascript:"]').count(), 0);
    assert.equal(await page.evaluate(() => window.blogAttack), undefined);
    await page.reload();
    await page.getByRole('heading', { name: '博客工作台', exact: true }).waitFor();
    // Reload automatically resumes the most recently edited local article.
    assert.equal(await editor.getByLabel('文章正文', { exact: true }).inputValue(), body);
    await context.setOffline(true);
    await editor.getByLabel('文章正文', { exact: true }).fill('离线写作保留');
    await page.waitForFunction(prefix => Object.keys(localStorage).filter(key => key.startsWith(prefix)).some(key => JSON.parse(localStorage.getItem(key)).markdown.includes('离线写作保留')), prefix);
    await context.setOffline(false);
    await page.getByRole('button', { name: '连接博客仓库', exact: true }).click();
    await page.getByLabel('GitHub Token', { exact: true }).fill('mock-blog-token');
    await page.getByRole('button', { name: '读取文章列表', exact: true }).click();
    const list = page.getByRole('complementary', { name: '博客文章列表' });
    await list.getByRole('button', { name: /Windows 特殊符号/ }).click();
    await editor.getByLabel('文章正文', { exact: true }).fill('更新旧文正文');
    await editor.getByRole('button', { name: '预览文章更新', exact: true }).click();
    const preview = page.getByRole('region', { name: '博客提交预览' });
    await preview.waitFor(); assert.equal(writes.length, 0, 'preview must be read-only');
    await preview.getByRole('checkbox').check();
    await preview.getByRole('button', { name: '确认提交更新', exact: true }).click();
    await page.waitForFunction(prefix => Object.keys(localStorage).filter(key => key.startsWith(prefix)).some(key => JSON.parse(localStorage.getItem(key)).lastCommit), prefix);
    assert.match(files.get(legacyPath), /更新旧文正文/);
    assert.match(files.get(legacyPath), /custom:\n  nested: true/);
    assert.match(files.get(legacyPath), /date: 2025-06-16/);
    assert.ok(!files.get(legacyPath).includes('permalink:'));
    await editor.getByText('GitHub Pages 已完成此提交的部署。', { exact: true }).waitFor();
    // A concurrent remote edit must not be overwritten.
    files.set(legacyPath, files.get(legacyPath).replace('更新旧文正文', '其他设备改动'));
    await editor.getByLabel('文章正文', { exact: true }).fill('我的第二次更新');
    const beforeConflict = writes.length;
    await editor.getByRole('button', { name: '预览文章更新', exact: true }).click();
    await editor.getByText(/这篇文章已在远端被修改或删除/).waitFor();
    assert.equal(writes.length, beforeConflict);
    await editor.getByRole('button', { name: '读取远端并比较', exact: true }).click();
    await page.getByRole('region', { name: '博客远端比较' }).waitFor();
    assert.match(await page.getByRole('region', { name: '博客远端比较' }).textContent(), /其他设备改动/);
    await editor.getByRole('button', { name: '关闭比较', exact: true }).click();
    // Promote a remote draft atomically; remove the stale list entry afterwards.
    await list.getByRole('button', { name: /remote-draft/ }).click();
    await editor.getByLabel('文章正文', { exact: true }).fill('已编辑的草稿正文');
    await editor.getByRole('button', { name: '预览并发表', exact: true }).click();
    await preview.getByRole('checkbox').check();
    await preview.getByRole('button', { name: '确认提交发表', exact: true }).click();
    await editor.getByRole('button', { name: '预览文章更新', exact: true }).waitFor();
    assert.equal(files.has(draftPath), false);
    assert.ok([...files].some(([path, text]) => path.startsWith('_posts/') && path.endsWith('-remote-draft.md') && text.includes('已编辑的草稿正文')));
    assert.equal(await list.getByRole('button', { name: /remote-draft.*仓库草稿/ }).count(), 0);
    const saved = await page.evaluate(() => JSON.stringify(localStorage));
    assert.ok(!saved.includes('mock-blog-token'), 'credentials must remain in memory');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'mobile must not overflow');
    await page.screenshot({ path: new URL(`../artifacts/blog-workbench/editor-${width}.png`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: typing, autosave/reload/offline, safe preview, list, old-post update, conflict guard, draft promotion and no credential storage. All remote writes mocked.`);
    await context.close();
  }
} finally { await browser.close(); }
