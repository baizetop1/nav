import assert from 'node:assert/strict';
import {
  BLOG_DRAFT_KEY_PREFIX, BLOG_MARKDOWN_MAX_BYTES, BLOG_WORKSPACE_EVENT,
  blogDraftScope, blogDraftStorageKey, createBlogDraft, parseBlogDraft,
  listBlogDrafts, loadBlogDraft, commitBlogDraft, commitBlogDraftRemoval,
  saveBlogDraft, removeBlogDraft,
} from '../src/lib/blogWorkspace.ts';

const target = { owner: 'baize', repo: 'blog', branch: 'main' };
const id1 = '00000000-0000-4000-8000-000000000001';
const id2 = '00000000-0000-4000-8000-000000000002';
const sha = 'a'.repeat(40);
function memoryStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
    values,
  };
}
const storage = memoryStorage();
const initial = createBlogDraft(target, '', null, 100, id1);
assert.equal(initial.revision, 0);
assert.equal(initial.markdown, '', 'a draft may have an empty title/body');
assert.equal(storage.length, 0, 'construction does not write or upload anything');
assert.equal(blogDraftScope(target), blogDraftScope({ owner: 'BAIZE', repo: 'BLOG', branch: 'main' }));
assert.notEqual(blogDraftScope(target), blogDraftScope({ ...target, branch: 'Main' }));
assert.notEqual(blogDraftScope(target), blogDraftScope({ ...target, repo: 'other' }));
assert.notEqual(blogDraftScope({ ...target, branch: 'feature/a' }), blogDraftScope({ ...target, branch: 'feature%2Fa' }));
assert.throws(() => blogDraftScope({ ...target, branch: 'x:bad' }), /无效/);
assert.throws(() => blogDraftStorageKey(target, '../all'), /无效/);
assert.ok(blogDraftStorageKey(target, id1).startsWith(BLOG_DRAFT_KEY_PREFIX));

let result = commitBlogDraft(target, null, { ...initial, token: 'never-store-this', uiOpen: true }, storage, 101);
assert.equal(result.status, 'saved');
const first = result.draft;
assert.equal(first.revision, 1);
assert.equal(first.updatedAt, 101);
assert.equal(first.createdAt, 100);
assert.equal(storage.values.get(blogDraftStorageKey(target, id1)).includes('never-store-this'), false);
assert.equal(commitBlogDraft(target, null, initial, storage).status, 'conflict', 'first-save collision never replaces existing data');
assert.deepEqual(loadBlogDraft(target, id1, storage), { status: 'loaded', draft: first });
assert.deepEqual(loadBlogDraft({ ...target, repo: 'other' }, id1, storage), { status: 'missing' });

const other = createBlogDraft(target, 'Second article', null, 200, id2);
assert.equal(commitBlogDraft(target, null, other, storage, 201).status, 'saved');
result = commitBlogDraft(target, first.revision, { ...first, markdown: 'Saved by tab A' }, storage, 300);
assert.equal(result.status, 'saved');
const second = result.draft;
assert.equal(second.revision, 2);
const stale = commitBlogDraft(target, first.revision, { ...first, markdown: 'Old tab B' }, storage, 301);
assert.equal(stale.status, 'conflict');
assert.equal(stale.current.markdown, 'Saved by tab A');
assert.equal(loadBlogDraft(target, id1, storage).draft.markdown, 'Saved by tab A');
assert.equal(loadBlogDraft(target, id2, storage).draft.markdown, 'Second article', 'different articles cannot overwrite each other');
assert.equal(commitBlogDraftRemoval(target, id1, first.revision, storage).status, 'conflict');
assert.deepEqual(listBlogDrafts(target, storage).drafts.map(draft => draft.id), [id1, id2]);

const source = { path: '_posts/2026-09-28-post.md', sha, markdown: '# Original' };
const published = { ...second, source, lastCommit: { sha, path: source.path, url: `https://github.com/baize/blog/commit/${sha}`, at: 400 } };
assert.deepEqual(parseBlogDraft(published).source, source);
assert.throws(() => parseBlogDraft({ ...published, source: { ...source, path: '../secrets.md' } }), /基线/);
assert.throws(() => parseBlogDraft({ ...published, source: { ...source, sha: 'bad' } }), /基线/);
assert.throws(() => parseBlogDraft({ ...published, lastCommit: { ...published.lastCommit, url: `https://github.com.evil.test/baize/blog/commit/${sha}` } }), /链接/);
assert.throws(() => parseBlogDraft({ ...published, lastCommit: { ...published.lastCommit, sha: 'b'.repeat(40) } }), /一致/);
assert.throws(() => parseBlogDraft({ ...initial, updatedAt: 99 }), /格式/);
assert.throws(() => parseBlogDraft({ ...initial, revision: NaN }), /格式/);
assert.throws(() => parseBlogDraft(initial, id2), /格式/);
assert.throws(() => parseBlogDraft({ ...initial, source: undefined }), /基线/);
assert.doesNotThrow(() => createBlogDraft(target, 'a'.repeat(BLOG_MARKDOWN_MAX_BYTES), null, 1, id1));
assert.throws(() => createBlogDraft(target, 'a'.repeat(BLOG_MARKDOWN_MAX_BYTES + 1), null, 1, id1), /256/);
assert.throws(() => createBlogDraft(target, '文'.repeat(Math.floor(BLOG_MARKDOWN_MAX_BYTES / 3) + 1), null, 1, id1), /256/, 'size limit counts UTF-8 bytes, not JS characters');
assert.throws(() => createBlogDraft(target, '', { ...source, markdown: 'a'.repeat(BLOG_MARKDOWN_MAX_BYTES + 1) }, 1, id1), /256/);
assert.equal(commitBlogDraft(target, 2, first, storage).status, 'error', 'incorrect caller baseline cannot silently increase revision');

const originalRaw = storage.getItem(blogDraftStorageKey(target, id1));
storage.setItem(blogDraftStorageKey(target, id1), '{broken');
assert.equal(loadBlogDraft(target, id1, storage).status, 'error');
const brokenList = listBlogDrafts(target, storage);
assert.equal(brokenList.drafts.length, 1);
assert.equal(brokenList.issues.length, 1);
assert.equal(brokenList.issues[0].id, id1);
assert.equal(commitBlogDraft(target, second.revision, second, storage).status, 'error');
assert.equal(commitBlogDraftRemoval(target, id1, second.revision, storage).status, 'error');
assert.equal(storage.getItem(blogDraftStorageKey(target, id1)), '{broken', 'damaged records remain available for recovery');
storage.setItem(blogDraftStorageKey(target, id1), originalRaw);

const failedChange = { ...second, markdown: 'Keep in memory when full' };
const quotaStorage = { ...storage, setItem: () => { throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' }); } };
const failure = commitBlogDraft(target, second.revision, failedChange, quotaStorage);
assert.equal(failure.status, 'error');
assert.match(failure.message, /空间不足/);
assert.equal(failedChange.markdown, 'Keep in memory when full');
assert.equal(failedChange.revision, 2, 'failed persistence does not mutate editor state');
assert.equal(storage.getItem(blogDraftStorageKey(target, id1)), originalRaw);
const retryBlocker = commitBlogDraft(target, second.revision, { ...second, markdown: 'New tab update while quota was full' }, storage, 500);
assert.equal(retryBlocker.status, 'saved');
assert.equal(commitBlogDraft(target, second.revision, failedChange, storage).status, 'conflict', 'retry must not bypass revision protection');
assert.equal(commitBlogDraftRemoval(target, id1, retryBlocker.draft.revision, storage).status, 'removed');
assert.equal(commitBlogDraft(target, retryBlocker.draft.revision, retryBlocker.draft, storage).status, 'conflict', 'old tab cannot recreate deleted article');
assert.equal(commitBlogDraftRemoval(target, id1, retryBlocker.draft.revision, storage).status, 'conflict');
const noRead = { ...storage, getItem: () => { throw Object.assign(new Error('blocked'), { name: 'SecurityError' }); } };
assert.equal(loadBlogDraft(target, id2, noRead).status, 'error');
assert.match(loadBlogDraft(target, id2, noRead).message, /禁止/);

// Two simultaneous callers must serialize under the same per-article Web Lock.
const savedNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const savedStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const savedWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const savedCustomEvent = Object.getOwnPropertyDescriptor(globalThis, 'CustomEvent');
try {
  const queues = new Map(), names = [], events = [];
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: (name, task) => {
    names.push(name);
    const promise = (queues.get(name) || Promise.resolve()).then(task);
    queues.set(name, promise.catch(() => {}));
    return promise;
  } } } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent: event => events.push(event) } });
  Object.defineProperty(globalThis, 'CustomEvent', { configurable: true, value: class { constructor(type, init) { this.type = type; this.detail = init.detail; } } });
  const shared = loadBlogDraft(target, id2, storage).draft;
  const simultaneous = await Promise.all([
    saveBlogDraft(target, shared.revision, { ...shared, markdown: 'Simultaneous A' }),
    saveBlogDraft(target, shared.revision, { ...shared, markdown: 'Simultaneous B' }),
  ]);
  assert.deepEqual(simultaneous.map(item => item.status), ['saved', 'conflict']);
  assert.equal(names[0], names[1]);
  assert.equal(events.length, 1, 'only successful writes emit workspace events');
  assert.equal(events[0].type, BLOG_WORKSPACE_EVENT);
  assert.equal(events[0].detail.scope, blogDraftScope(target));
  assert.equal(events[0].detail.id, id2);
  assert.equal((await removeBlogDraft(target, id2, shared.revision)).status, 'conflict');
  assert.equal((await removeBlogDraft(target, id2, simultaneous[0].draft.revision)).status, 'removed');
  assert.equal(events.at(-1).detail.action, 'removed');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
  assert.equal((await saveBlogDraft(target, null, initial)).status, 'error', 'unsupported browsers must not use non-atomic localStorage fallback');
  assert.equal(loadBlogDraft(target, id1, storage).status, 'missing');
} finally {
  for (const [key, descriptor] of [['navigator', savedNavigator], ['localStorage', savedStorage], ['window', savedWindow], ['CustomEvent', savedCustomEvent]]) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
}
console.log('Blog workspace: isolated drafts, schema/UTF-8 limits, lossless corrupt records, CAS conflicts, quota retries and serialized multi-tab writes passed.');
