import assert from 'node:assert/strict';
import { siteConfig } from '../src/data/config.ts';
import { blogDraftStorageKey, listBlogDrafts, parseBlogDraft } from '../src/lib/blogWorkspace.ts';
import { createBackup, parseBackup, restoreBackupWithReport } from '../src/lib/backup.ts';
import { captureWorkingDrafts, planDraftRestore, restoreWorkingDrafts, readWorkingDraftSummary, parseWorkingDraftBackup } from '../src/lib/workingDrafts.ts';
import { rememberDraftDeployment } from '../src/lib/draftDeployment.ts';
import { techOsDraftKey } from '../src/services/techOsDraftStore.ts';
import { encryptBackup, decryptBackup } from '../src/services/encryptedBackup.ts';
import { getEncryptedBackup } from '../src/services/github.ts';

class MemoryStorage {
  values = new Map();
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
const navigation = { sites: [], categories: [], layout: [] };
const target = siteConfig.blogRepository, techKey = techOsDraftKey(siteConfig.repository);
const draft = parseBlogDraft({ version: 1, id: '00000000-0000-4000-8000-000000000001', revision: 4, createdAt: 10, updatedAt: 20, markdown: '---\ntitle: 中文未发布文章\n---\n正文内容', source: { path: '_posts/2026-10-05-note.md', sha: 'a'.repeat(40), markdown: '原来的远端正文' }, token: 'do-not-export' });
const blogKey = blogDraftStorageKey(target, draft.id);
const copy = { version: 1, base: [{ path: 'tech-os/state.yml', content: '旧基线' }], files: [{ path: 'tech-os/state.yml', content: '未提交修改' }], conflicts: ['tech-os/state.yml'] };
const source = new MemoryStorage();
source.setItem(blogKey, JSON.stringify(draft)); source.setItem(techKey, JSON.stringify({ ...copy, token: 'do-not-export' }));
source.setItem('github_token', 'do-not-export');
source.setItem('theme', 'dark');
let summary = readWorkingDraftSummary(source);
assert.equal(summary.items.filter(item => item.pending).length, 2);
const archive = captureWorkingDrafts(source);
assert.equal(JSON.stringify(archive).includes('do-not-export'), false);
assert.deepEqual(archive.techOs[0].copy.base, copy.base);
assert.deepEqual(archive.techOs[0].copy.conflicts, copy.conflicts);
const fresh = new MemoryStorage(); fresh.setItem('unrelated', 'keep');
let result = restoreWorkingDrafts(archive, fresh);
assert.equal(result.blogs, 1); assert.equal(result.techOs, 1);
assert.equal(fresh.getItem('unrelated'), 'keep');
assert.deepEqual(JSON.parse(fresh.getItem(techKey)), copy);
assert.deepEqual(listBlogDrafts(target, fresh).drafts[0].source, draft.source);
assert.equal(listBlogDrafts(target, fresh).drafts[0].revision, 1);
result = restoreWorkingDrafts(archive, fresh);
assert.equal(result.writes.length, 0); assert.equal(result.unchanged, 2);

// A different local article survives; the restored variant uses a fresh ID.
const conflict = new MemoryStorage();
conflict.setItem(blogKey, JSON.stringify({ ...draft, markdown: '本机新文章' }));
conflict.setItem(techKey, JSON.stringify({ ...copy, files: [{ path: 'tech-os/state.yml', content: '本机新学习内容' }] }));
const before = conflict.getItem(techKey);
result = restoreWorkingDrafts(archive, conflict);
assert.equal(result.blogs, 1); assert.equal(result.techOs, 0); assert.equal(result.skipped.length, 1);
assert.equal(JSON.parse(conflict.getItem(blogKey)).markdown, '本机新文章');
assert.equal(conflict.getItem(techKey), before);
assert.equal(listBlogDrafts(target, conflict).drafts.length, 2);
assert.equal(restoreWorkingDrafts(archive, conflict).blogs, 0, 'importing a variant again must not create endless copies');

// No partial writes on quota failures, including the old complete-backup keys.
const atomic = new MemoryStorage(); atomic.setItem('theme', 'light');
let failOnce = true;
const originalSet = atomic.setItem.bind(atomic);
atomic.setItem = (key, value) => { if (key === techKey && failOnce) { failOnce = false; throw new Error('QuotaExceededError'); } originalSet(key, value); };
assert.throws(() => restoreBackupWithReport(createBackup(navigation, source), atomic), /QuotaExceededError/);
assert.equal(atomic.getItem('theme'), 'light');
assert.equal(atomic.getItem(blogKey), null); assert.equal(atomic.getItem(techKey), null);
assert.equal(atomic.values.size, 1);

const backup = createBackup(navigation, source);
assert.equal(backup.workingDrafts.blogs[0].drafts.length, 1);
const encrypted = await encryptBackup(backup, 'a-long-backup-password');
assert.equal(JSON.stringify(encrypted).includes('中文未发布文章'), false);
assert.deepEqual((await decryptBackup(encrypted, 'a-long-backup-password')).workingDrafts, backup.workingDrafts);
const legacy = structuredClone(backup); delete legacy.workingDrafts;
assert.equal(parseBackup(legacy).workingDrafts, undefined);
assert.equal(restoreBackupWithReport(legacy, conflict).drafts, null);
assert.equal(conflict.getItem(techKey), before, 'old backups must not clear independent draft stores');
assert.throws(() => parseWorkingDraftBackup({ ...archive, version: 99 }), /版本/);
const invalid = structuredClone(archive); invalid.techOs[0].copy.files[0].path = '../secret.env';
assert.throws(() => planDraftRestore(invalid, fresh), /损坏/);
const foreign = structuredClone(archive); foreign.blogs[0].target.repo = 'another-repo';
assert.equal(planDraftRestore(foreign, fresh).blogs, 0);
assert.ok(planDraftRestore(foreign, fresh).skipped.length);

const committed = parseBlogDraft({ ...draft, markdown: draft.source.markdown, lastCommit: { sha: 'b'.repeat(40), url: `https://github.com/${target.owner}/${target.repo}/commit/${'b'.repeat(40)}`, path: draft.source.path, at: 30 } });
source.setItem(blogKey, JSON.stringify(committed));
assert.match(readWorkingDraftSummary(source).items.find(item => item.kind === 'blog').state, /待核对/);
rememberDraftDeployment(target, committed.lastCommit.sha, 'success', source);
assert.match(readWorkingDraftSummary(source).items.find(item => item.kind === 'blog').state, /已确认上线/);
source.setItem(blogKey, JSON.stringify({ ...committed, markdown: '提交之后又修改' }));
assert.equal(readWorkingDraftSummary(source).items.find(item => item.kind === 'blog').pending, true);
assert.equal(rememberDraftDeployment(target, 'b'.repeat(41), 'success', source), false);

// Large encrypted backups must be read by their exact blob SHA, not a moving branch or untrusted download URL.
const encoded = Buffer.from(JSON.stringify(encrypted)).toString('base64');
const requests = [];
const fakeRequest = async (url, options) => {
  requests.push({ url: String(url), method: options?.method || 'GET' });
  if (String(url).includes('/contents/')) return Response.json({ sha: 'c'.repeat(40), content: '', encoding: 'none', size: 1_500_000, download_url: 'https://untrusted.invalid/' });
  assert.ok(String(url).endsWith('/git/blobs/' + 'c'.repeat(40)));
  return Response.json({ sha: 'c'.repeat(40), content: encoded, encoding: 'base64', size: encoded.length });
};
assert.deepEqual((await getEncryptedBackup(siteConfig.repository, 'ghp_' + 'x'.repeat(36), fakeRequest)).payload, encrypted);
assert.equal(requests.length, 2); assert.ok(requests.every(item => item.method === 'GET' && item.url.startsWith('https://api.github.com/')));
await assert.rejects(() => getEncryptedBackup(siteConfig.repository, 'ghp_' + 'x'.repeat(36), async (url) => String(url).includes('/contents/') ? Response.json({ sha: 'c'.repeat(40), encoding: 'none' }) : Response.json({ sha: 'd'.repeat(40), content: encoded, encoding: 'base64', size: 200 })), /基线不一致/);

console.log('Working drafts: full/encrypted round trips, baselines, conflicts, duplicate imports, quota rollback, legacy retention, publication states and pinned large-blob reads passed.');
