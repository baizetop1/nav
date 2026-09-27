import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.BAIZE_PLAYWRIGHT_PATH || 'playwright');
const app = process.env.BAIZE_BLOG_DEV_URL || 'http://127.0.0.1:5192/nav/';
const base = new URL(app), origin = base.origin;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ serviceWorkers: 'block' });
const errors = [];
const target = { owner: 'autosave-test', repo: 'isolated', branch: 'main' };
const uuid = '00000000-0000-4000-8000-000000000099';
try {
  // Reuse Vite's exact optimized React module URLs to avoid duplicate React.
  const hookSource = await (await context.request.get(`${app}src/components/blog/useBlogAutosave.ts`)).text();
  const mainSource = await (await context.request.get(`${app}src/main.tsx`)).text();
  const react = hookSource.match(/(?:from\s+|import\s+)["']([^"']*\/react\.js[^"']*)["']/)?.[1];
  const reactDom = mainSource.match(/(?:from\s+|import\s+)["']([^"']*\/react-dom_client\.js[^"']*)["']/)?.[1];
  assert.ok(react && reactDom, 'run against a Vite dev server, not a dist preview');
  const harness = `<!doctype html><html><body><div id="root"></div><script type="module">
    import React from ${JSON.stringify(react)};
    import ReactDOM from ${JSON.stringify(reactDom)};
    import { useBlogAutosave } from ${JSON.stringify(`${base.pathname}src/components/blog/useBlogAutosave.ts`)};
    import * as model from ${JSON.stringify(`${base.pathname}src/lib/blogWorkspace.ts`)};
    const { createRoot } = ReactDOM;
    window.model = model;
    window.target = ${JSON.stringify(target)};
    let root = null;
    window.mount = initial => {
      root?.unmount();
      root = createRoot(document.getElementById('root'));
      window.dirtyLog = [];
      function Harness() {
        const auto = useBlogAutosave(initial, window.target, () => {}, value => window.dirtyLog.push(value));
        window.auto = auto;
        return React.createElement('output', { id: 'state' }, JSON.stringify({ draft: auto.draft, saving: auto.saving, dirty: auto.dirty, error: auto.error, conflict: auto.conflict }));
      }
      root.render(React.createElement(Harness));
    };
    window.ready = true;
  </script></body></html>`;
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === `${base.pathname}__blog-autosave-check`) return route.fulfill({ contentType: 'text/html', body: harness });
    return route.continue();
  });
  const page = await context.newPage(), other = await context.newPage();
  for (const tab of [page, other]) {
    tab.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    await tab.goto(`${app}__blog-autosave-check`);
    await tab.waitForFunction(() => window.ready);
  }
  await page.evaluate(() => localStorage.clear());

  // Initial failure must never advertise the unsaved document as safe to close.
  await page.evaluate(id => {
    window.originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith(window.model.BLOG_DRAFT_KEY_PREFIX)) throw new DOMException('full', 'QuotaExceededError');
      return window.originalSet.call(this, key, value);
    };
    window.mount(window.model.createBlogDraft(window.target, 'Initial draft', null, 100, id));
  }, uuid);
  await page.waitForFunction(() => window.auto?.error && !window.auto.saving);
  assert.equal(await page.evaluate(() => window.auto.dirty), true);
  assert.equal(await page.evaluate(() => window.auto.draft.revision), 0);
  assert.equal(await page.evaluate(() => window.dirtyLog.includes(false)), false);
  await page.evaluate(() => { Storage.prototype.setItem = window.originalSet; window.auto.retry(); });
  await page.waitForFunction(() => window.auto.draft.revision > 0 && !window.auto.dirty);

  // Hold the real Web Lock to guarantee inputs arrive while a save is in flight.
  await other.evaluate(id => {
    window.lockReady = false;
    void navigator.locks.request(window.model.blogDraftStorageKey(window.target, id), async () => {
      window.lockReady = true;
      await new Promise(resolve => { window.releaseLock = resolve; });
    });
  }, uuid);
  await other.waitForFunction(() => window.lockReady);
  await page.evaluate(() => {
    const rendered = window.auto.draft;
    window.auto.change({ ...rendered, markdown: 'First keystrokes' });
    window.auto.change({ ...rendered, markdown: 'Final keystrokes' });
  });
  await page.waitForFunction(() => window.auto.saving && window.auto.dirty);
  await other.evaluate(() => window.releaseLock());
  await page.waitForFunction(() => !window.auto.dirty && window.auto.draft.markdown === 'Final keystrokes');
  assert.equal(await page.evaluate(id => window.model.loadBlogDraft(window.target, id).draft.markdown, uuid), 'Final keystrokes');

  // Storage events during a save are deferred, not dropped or auto-overwritten.
  await other.evaluate(id => {
    window.lockReady = false;
    void navigator.locks.request(window.model.blogDraftStorageKey(window.target, id), async () => {
      window.lockReady = true;
      await new Promise(resolve => { window.releaseLock = resolve; });
    });
  }, uuid);
  await other.waitForFunction(() => window.lockReady);
  await page.evaluate(() => window.auto.change({ ...window.auto.draft, markdown: 'Unsaved competing page' }));
  await page.waitForFunction(() => window.auto.saving);
  await other.evaluate(id => {
    const loaded = window.model.loadBlogDraft(window.target, id).draft;
    window.model.commitBlogDraft(window.target, loaded.revision, { ...loaded, markdown: 'Committed competing page' }, localStorage);
    window.releaseLock();
  }, uuid);
  await page.waitForFunction(() => !!window.auto.conflict && !window.auto.saving);
  assert.equal(await page.evaluate(() => window.auto.draft.markdown), 'Unsaved competing page');
  assert.equal(await page.evaluate(() => window.auto.conflict.current.markdown), 'Committed competing page');
  assert.equal(await page.evaluate(() => window.auto.dirty), true);
  await page.evaluate(() => window.auto.adopt(window.auto.conflict.current));
  await page.waitForFunction(() => !window.auto.dirty && window.auto.draft.markdown === 'Committed competing page');

  // A clean editor can follow another tab, but damaged/deleted data blocks exit.
  await other.evaluate(async id => {
    const current = window.model.loadBlogDraft(window.target, id).draft;
    await window.model.saveBlogDraft(window.target, current.revision, { ...current, markdown: 'Clean external update' });
  }, uuid);
  await page.waitForFunction(() => window.auto.draft.markdown === 'Clean external update' && !window.auto.dirty);
  const raw = await page.evaluate(id => localStorage.getItem(window.model.blogDraftStorageKey(window.target, id)), uuid);
  await other.evaluate(id => localStorage.setItem(window.model.blogDraftStorageKey(window.target, id), '{invalid'), uuid);
  await page.waitForFunction(() => window.auto.error && window.auto.dirty);
  assert.equal(await page.evaluate(() => window.auto.draft.markdown), 'Clean external update');
  await other.evaluate(({ id, raw }) => localStorage.setItem(window.model.blogDraftStorageKey(window.target, id), raw), { id: uuid, raw });
  await page.evaluate(() => window.auto.retry());
  await page.waitForFunction(() => !window.auto.dirty);
  await other.evaluate(id => localStorage.removeItem(window.model.blogDraftStorageKey(window.target, id)), uuid);
  await page.waitForFunction(() => window.auto.conflict && window.auto.conflict.current === null && window.auto.dirty);
  await page.evaluate(() => window.auto.retry());
  await page.waitForFunction(() => window.auto.conflict && window.auto.conflict.current === null && !window.auto.saving);
  assert.equal(await page.evaluate(id => window.model.loadBlogDraft(window.target, id).status, uuid), 'missing', 'retry must not recreate a deleted document');
  assert.deepEqual(errors, []);
  console.log('Blog autosave browser: initial quota failure, queued typing, cross-tab save conflict, external adoption, corrupt data and deletion protection passed.');
} finally {
  await context.close();
  await browser.close();
}
