import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import {
  BLOG_MARKDOWN_MAX_BYTES, createBlogMarkdown, readBlogDocument, editBlogDocument,
  listBlogEntries, loadBlogSource, prepareBlogWrite, commitBlogWrite, getBlogDeployment,
} from '../src/services/blogWorkbench.ts';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
const target = { owner: 'test', repo: 'blog', branch: 'master' };
const token = 'test-token-not-real';
const sha = value => value.repeat(40);
const now = new Date(2026, 8, 28, 12, 30, 5);
const markdown = createBlogMarkdown({ title: '测试文章', slug: 'test-post', body: '\n# 正文\n\n你好世界\n', tags: ['测试'] }, now);
const doc = readBlogDocument(markdown);
assert.equal(doc.title, '测试文章');
assert.equal(doc.slug, 'test-post');
assert.equal(doc.permalink, '/p/test-post/');
assert.deepEqual(doc.tags, ['测试']);
assert.equal(doc.body, '\n# 正文\n\n你好世界\n');
assert.equal(editBlogDocument(markdown, {}), markdown);
assert.equal(editBlogDocument(markdown, doc), markdown);

const rich = '---\r\n# 顶层备注\r\nlayout: post\r\ntitle: "旧标题" # 保留未编辑字段\r\nslug: old\r\ndate: 2025-06-16\r\npermalink: /custom/old/\r\ncategory: 系统\r\nformat: 笔记\r\ntags: [Windows, "a,b", \'it\'\'s\']\r\n# 用户批注\r\ncustom:\r\n  nested:\r\n    one: [1, 2]\r\n    two: "keep: me"\r\nheader-img: img/post-bg.jpg\r\n# 另一个注释\r\nrelated:\r\n  - another-post\r\n---\r\n\r\n旧文正文\r\n';
assert.deepEqual(readBlogDocument(rich).tags, ['Windows', 'a,b', "it's"]);
const edited = editBlogDocument(rich, { title: '新标题', tags: ['系统', '两个,词'], body: '\n新的 Markdown\n' });
assert.match(edited, /custom:\r\n  nested:\r\n    one: \[1, 2\]\r\n    two: "keep: me"\r\nheader-img: img\/post-bg\.jpg\r\n# 另一个注释/);
assert.match(edited, /# 用户批注/);
assert.equal(readBlogDocument(edited).title, '新标题');
assert.deepEqual(readBlogDocument(edited).tags, ['系统', '两个,词']);
assert.match(editBlogDocument(rich, { body: '仅正文' }), /title: "旧标题" # 保留未编辑字段/);
const mixed = '\uFEFF---\r\ntitle: "混合"\nslug: mixed\r\ndate: 2020-01-01\ncustom:\r\n  nested: true\n---\r\n旧文\n第二行\r\n';
assert.equal(editBlogDocument(mixed, {}), mixed);
assert.equal(editBlogDocument(mixed, readBlogDocument(mixed)), mixed);
const bodyOnly = editBlogDocument(mixed, { body: '修改正文' });
assert.equal(bodyOnly.slice(0, bodyOnly.indexOf('修改正文')), mixed.slice(0, mixed.indexOf('旧文')));
assert.match(editBlogDocument(mixed, { title: '改标题' }), /custom:\r\n  nested: true\n---\r\n旧文\n第二行\r\n$/);
assert.equal(readBlogDocument('---\ntitle: >-\n  一段\n  文字\ntags:\n- 开发\n---\n内容').title, '一段 文字');
assert.deepEqual(readBlogDocument('---\ntitle: t\ntags:\n- 开发\n---\n内容').tags, ['开发']);
assert.throws(() => readBlogDocument('无 Front Matter'), /缺少/);
assert.throws(() => readBlogDocument('---\ntitle: a\ntitle: b\n---\n'), /重复/);
assert.throws(() => readBlogDocument('---\ntitle: [complex]\n---\n'), /复杂/);
assert.throws(() => readBlogDocument('x'.repeat(BLOG_MARKDOWN_MAX_BYTES + 1)), /256 KB/);

const response = (data, status = 200) => new Response(JSON.stringify(data), { status });
const gitSha = content => createHash('sha1').update('blob ' + Buffer.byteLength(content) + '\0').update(content).digest('hex');
function harness(initialFiles = {}) {
  const state = {
    head: sha('a'), tree: sha('b'), files: { ...initialFiles }, writes: [], requests: [],
    truncated: false, status: 200, blobEncoding: 'base64', badBlobSize: false,
    invalidUtf8: false, patchConflict: false, deployments: [], statuses: [],
  };
  const request = async (url, init = {}) => {
    const parsed = new URL(url), path = parsed.pathname;
    state.requests.push({ path, url, init });
    assert.ok(path.startsWith('/repos/test/blog/'));
    if (state.status !== 200) return response({}, state.status);
    if (init.method && init.method !== 'GET') {
      const body = JSON.parse(init.body);
      state.writes.push({ path, method: init.method, body });
      assert.equal(init.headers.Authorization, 'Bearer ' + token);
      if (path.endsWith('/git/trees')) return response({ sha: sha('c') });
      if (path.endsWith('/git/commits')) return response({ sha: sha('d') });
      if (path.includes('/git/refs/')) return response({ ref: 'master' }, state.patchConflict ? 422 : 200);
      throw new Error('Unexpected write ' + path);
    }
    if (path.includes('/git/ref/')) return response({ object: { sha: state.head } });
    if (path.includes('/git/commits/')) return response({ tree: { sha: state.tree } });
    if (path.includes('/git/trees/')) return response({
      truncated: state.truncated,
      tree: Object.entries(state.files).map(([path, file]) => ({ path, sha: file.sha || gitSha(file.markdown), type: file.type || 'blob', mode: file.mode || '100644' })),
    });
    if (path.includes('/git/blobs/')) {
      const file = Object.values(state.files).find(file => (file.sha || gitSha(file.markdown)) === path.split('/').pop());
      if (!file) return response({}, 404);
      const bytes = state.invalidUtf8 ? Buffer.from([0xff, 0xff]) : Buffer.from(file.markdown);
      return response({ content: bytes.toString('base64'), size: state.badBlobSize ? bytes.length + 1 : bytes.length, encoding: state.blobEncoding });
    }
    if (path.endsWith('/deployments')) return response(state.deployments);
    if (path.endsWith('/statuses')) return response(state.statuses);
    throw new Error('Unexpected request ' + path);
  };
  return { state, request };
}

{
  const { state, request } = harness({
    '_drafts/test-post.md': { markdown },
    '_posts/nested/2025-01-01-历史文章.md': { markdown: rich },
    'README.md': { markdown: '# readme' },
    '_drafts/nested/ignore.md': { markdown },
  });
  const list = await listBlogEntries('', target, request);
  assert.equal(list.entries.length, 2);
  assert.equal(list.entries.find(entry => entry.kind === 'published').title, '历史文章');
  const entry = list.entries.find(entry => entry.kind === 'draft');
  const source = await loadBlogSource(entry, token, target, request);
  assert.equal(source.markdown, markdown);
  assert.equal(state.writes.length, 0);
  state.truncated = true;
  await assert.rejects(() => listBlogEntries(token, target, request), /截断/);
  state.truncated = false;
  state.files['_drafts/test-post.md'].mode = '120000';
  await assert.rejects(() => listBlogEntries(token, target, request), /普通 Markdown/);
  state.files['_drafts/test-post.md'].mode = '100644';
  state.badBlobSize = true;
  await assert.rejects(() => loadBlogSource(entry, token, target, request), /UTF-8/);
  state.badBlobSize = false;
  state.invalidUtf8 = true;
  await assert.rejects(() => loadBlogSource(entry, token, target, request), /UTF-8/);
  state.invalidUtf8 = false;
  state.blobEncoding = 'utf8';
  await assert.rejects(() => loadBlogSource(entry, token, target, request), /编码/);
}

{
  const { state, request } = harness();
  const plan = await prepareBlogWrite({ source: null, markdown, action: 'save-draft' }, token, target, now, request);
  assert.equal(plan.path, '_drafts/test-post.md');
  assert.equal(plan.deletePath, null);
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(state.writes.length, 0);
  state.head = sha('e'); state.tree = sha('f');
  state.files['README.md'] = { markdown: '# unrelated new content' };
  const result = await commitBlogWrite(plan, token, target, request);
  assert.equal(result.source.sha, gitSha(result.markdown));
  assert.equal(state.writes[0].body.base_tree, sha('f'));
  assert.deepEqual(state.writes[1].body.parents, [sha('e')]);
  assert.equal(state.writes.at(-1).body.force, false);
  assert.equal(state.writes[0].body.tree.length, 1);
  state.files[result.path] = { markdown: result.markdown };
  const writeCount = state.writes.length;
  await assert.rejects(() => commitBlogWrite(plan, token, target, request), /目标文章路径已存在/);
  assert.equal(state.writes.length, writeCount);
}
{
  const other = createBlogMarkdown({ title: '异名链接', slug: 'test-post', body: '存在内容' }, now);
  const { state, request } = harness({ '_posts/2026-01-01-another-name.md': { markdown: other } });
  await assert.rejects(() => prepareBlogWrite({ source: null, markdown, action: 'publish' }, token, target, now, request), /相同 slug 或永久链接/);
  assert.equal(state.writes.length, 0);
  state.files['_posts/2026-01-01-another-name.md'].markdown = editBlogDocument(other, { slug: 'another-slug', permalink: '/p/test-post/' });
  await assert.rejects(() => prepareBlogWrite({ source: null, markdown, action: 'save-draft' }, token, target, now, request), /相同 slug 或永久链接/);
}
{
  const { state, request } = harness();
  const plan = await prepareBlogWrite({ source: null, markdown, action: 'publish' }, token, target, now, request);
  assert.equal(plan.path, '_posts/2026-09-28-test-post.md');
  assert.equal(readBlogDocument(plan.markdown).status, 'published');
  assert.equal(state.writes.length, 0);
  state.files['_posts/another-dir/2024-01-01-test-post.md'] = { markdown };
  await assert.rejects(() => commitBlogWrite(plan, token, target, request), /相同 slug/);
  assert.equal(state.writes.length, 0);
}
{
  const { state, request } = harness({ '_drafts/test-post.md': { markdown } });
  const source = { path: '_drafts/test-post.md', sha: gitSha(markdown), markdown };
  const updated = editBlogDocument(markdown, { body: '编辑后正文' });
  const plan = await prepareBlogWrite({ source, markdown: updated, action: 'publish' }, token, target, now, request);
  assert.equal(plan.deletePath, source.path);
  await commitBlogWrite(plan, token, target, request);
  assert.equal(state.writes[0].body.tree[1].sha, null);
  assert.equal(state.writes[0].body.tree[1].path, source.path);
  assert.equal(readBlogDocument(state.writes[0].body.tree[0].content).body, '编辑后正文');
  state.writes = []; state.files[source.path].markdown = editBlogDocument(markdown, { body: '其他设备修改' });
  await assert.rejects(() => commitBlogWrite(plan, token, target, request), /远端被修改或删除/);
  assert.equal(state.writes.length, 0);
  await assert.rejects(() => prepareBlogWrite({ source, markdown: updated, action: 'save-draft' }, token, target, now, request), /远端被修改或删除/);
}
{
  const legacy = '---\nlayout: post\ntitle: 旧文\ndate: 2025-06-16\nstatus: review\ncustom:\n  nested: true\n---\n旧正文\n';
  const path = '_posts/deeper/2025-06-16-Windows 特殊符号.md';
  const { state, request } = harness({ [path]: { markdown: legacy } });
  const source = { path, markdown: legacy, sha: gitSha(legacy) };
  const edited = editBlogDocument(legacy, { title: '更新旧文', body: '新正文' });
  const plan = await prepareBlogWrite({ source, markdown: edited, action: 'publish' }, token, target, now, request);
  assert.equal(plan.path, path); assert.equal(plan.deletePath, null); assert.equal(plan.slug, '');
  assert.equal(readBlogDocument(plan.markdown).date, '2025-06-16');
  assert.equal(readBlogDocument(plan.markdown).status, 'review');
  assert.match(plan.markdown, /custom:\n  nested: true/);
  await commitBlogWrite(plan, token, target, request);
  assert.equal(state.writes[0].body.tree[0].path, path);
  await assert.rejects(() => prepareBlogWrite({ source, markdown: editBlogDocument(legacy, { date: '2026-09-28' }), action: 'publish' }, token, target, now, request), /date 不能修改/);
  await assert.rejects(() => prepareBlogWrite({ source, markdown: legacy, action: 'publish' }, token, target, now, request), /没有变化/);
  await assert.rejects(() => prepareBlogWrite({ source, markdown: editBlogDocument(legacy, { status: 'published' }), action: 'publish' }, token, target, now, request), /status 不能修改/);
  await assert.rejects(() => prepareBlogWrite({ source, markdown: edited, action: 'save-draft' }, token, target, now, request), /不能转换/);
}
{
  const { state, request } = harness();
  const plan = await prepareBlogWrite({ source: null, markdown, action: 'publish' }, token, target, now, request);
  await assert.rejects(() => commitBlogWrite({ ...plan, path: '_posts/hijack.md' }, token, target, request), /预览/);
  await assert.rejects(() => commitBlogWrite(plan, token, { ...target, repo: 'other' }, request), /此仓库/);
  assert.equal(state.writes.length, 0);
  state.patchConflict = true;
  await assert.rejects(() => commitBlogWrite(plan, token, target, request), /未强制覆盖/);
  assert.equal(state.writes.at(-1).body.force, false);
  for (const [status, pattern] of [[401, /Token 无效/], [403, /权限不足/], [404, /未找到/], [500, /请求失败/]]) {
    state.status = status;
    await assert.rejects(() => listBlogEntries(token, target, request), pattern);
  }
  await assert.rejects(() => prepareBlogWrite({ source: null, markdown, action: 'publish' }, '', target, now, request), /Token/);
  await assert.rejects(() => prepareBlogWrite({ source: null, markdown: editBlogDocument(markdown, { body: ' ' }), action: 'publish' }, token, target, now, request), /正文为空/);
}
{
  const { state, request } = harness();
  assert.equal((await getBlogDeployment(target, token, sha('d'), request)).state, 'waiting');
  state.deployments = [{ id: 20, sha: sha('d'), environment: 'preview' }, { id: 10, sha: sha('d'), environment: 'github-pages' }];
  state.statuses = [{ state: 'in_progress', log_url: 'https://github.com/test/blog/actions/runs/1' }];
  assert.equal((await getBlogDeployment(target, token, sha('d'), request)).state, 'running');
  state.statuses = [{ state: 'success', log_url: 'javascript:alert(1)' }];
  const success = await getBlogDeployment(target, token, sha('d'), request);
  assert.equal(success.state, 'success'); assert.equal(success.url, 'https://github.com/test/blog/actions');
  state.statuses = [{ state: 'failure' }];
  assert.equal((await getBlogDeployment(target, token, sha('d'), request)).state, 'failure');
  state.statuses = [{ state: 'inactive' }];
  assert.equal((await getBlogDeployment(target, token, sha('d'), request)).state, 'unknown');
  state.status = 403;
  assert.equal((await getBlogDeployment(target, token, sha('d'), request)).state, 'unknown');
}
console.log('Blog workbench: metadata preservation, UTF-8 limits, consistent listing, drafts, promotion, legacy updates, atomic commits, conflicts and Pages status passed.');
