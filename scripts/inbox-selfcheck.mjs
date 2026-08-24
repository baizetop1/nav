import assert from 'node:assert/strict';
import {
  createInboxItem,
  INBOX_LEGACY_MIGRATION_KEY,
  INBOX_STORAGE_KEY,
  inboxItemToMarkdown,
  loadInbox,
  parseInboxStore,
  saveInbox,
  setInboxItemStatus,
  softDeleteInboxItem,
  updateInboxItem,
} from '../src/services/inbox.ts';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

const createdAt = new Date('2026-08-24T01:00:00.000Z');
const editedAt = new Date('2026-08-24T02:00:00.000Z');
const text = createInboxItem({ type: 'text', content: '研究 backlink', tags: ['知识', '知识'] }, { id: 'text-1', now: createdAt });
const link = createInboxItem({ type: 'link', title: '示例', url: 'example.com', content: '稍后阅读' }, { id: 'link-1', now: createdAt });
assert.equal(link.url, 'https://example.com/');
assert.deepEqual(text.tags, ['知识']);

let items = updateInboxItem([text, link], 'text-1', { type: 'text', content: '研究自动 backlink', tags: ['知识'] }, editedAt);
assert.equal(items[0].content, '研究自动 backlink');
assert.equal(items[0].updatedAt, editedAt.toISOString());
items = setInboxItemStatus(items, 'text-1', 'archived', editedAt);
assert.equal(items[0].status, 'archived');
items = softDeleteInboxItem(items, 'link-1', editedAt);
assert.equal(items[1].deletedAt, editedAt.toISOString());

const storage = new MemoryStorage();
assert.equal(saveInbox(items, storage, editedAt), true);
assert.deepEqual(loadInbox({ storage, now: editedAt }), items);
assert.equal(parseInboxStore({ version: 1, updatedAt: editedAt.toISOString(), items: [text, text] }), null);

const tenItems = Array.from({ length: 10 }, (_, index) => createInboxItem(
  { type: 'text', content: `快速记录 ${index + 1}` },
  { id: `item-${index + 1}`, now: new Date(createdAt.getTime() + index * 1_000) },
));
const tenItemStorage = new MemoryStorage();
assert.equal(saveInbox(tenItems, tenItemStorage, editedAt), true);
assert.equal(loadInbox({ storage: tenItemStorage, now: editedAt }).length, 10);

const legacyStorage = new MemoryStorage();
legacyStorage.setItem('nav_temp_text', '旧便笺内容');
const migrated = loadInbox({ storage: legacyStorage, id: 'legacy-1', now: createdAt });
assert.equal(migrated.length, 1);
assert.equal(migrated[0].content, '旧便笺内容');
assert.equal(legacyStorage.getItem('nav_temp_text'), '旧便笺内容');
assert.equal(legacyStorage.getItem(INBOX_LEGACY_MIGRATION_KEY), '1');
assert.equal(loadInbox({ storage: legacyStorage, id: 'legacy-2', now: editedAt }).length, 1);
assert.ok(legacyStorage.getItem(INBOX_STORAGE_KEY));

assert.equal(inboxItemToMarkdown(link), '## 示例\n\n[示例](https://example.com/)\n\n稍后阅读\n');
assert.throws(() => createInboxItem({ type: 'text', content: '   ' }), /请输入记录内容/);
assert.throws(() => createInboxItem({ type: 'link', url: 'javascript:alert(1)' }), /有效的 HTTP\/HTTPS/);

console.log('inbox self-check passed');
