import assert from 'node:assert/strict';
import { createInboxItem, softDeleteInboxItem, updateInboxItem } from '../src/services/inbox.ts';
import {
  countUnsyncedInboxItems,
  createInboxSyncMeta,
  decryptInbox,
  encryptInbox,
  INBOX_SYNC_META_KEY,
  isInboxItemSynced,
  loadInboxSyncMeta,
  mergeInboxItems,
  saveInboxSyncMeta,
} from '../src/services/inboxSync.ts';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

const firstTime = new Date('2026-08-24T01:00:00.000Z');
const secondTime = new Date('2026-08-24T02:00:00.000Z');
const thirdTime = new Date('2026-08-24T03:00:00.000Z');
const password = 'correct horse battery staple';

const itemA = createInboxItem({ type: 'text', content: 'PC 添加 A' }, { id: 'A', now: firstTime });
const itemB = createInboxItem({ type: 'text', content: '手机添加 B' }, { id: 'B', now: firstTime });
assert.deepEqual(mergeInboxItems([itemA], [itemB]).map(item => item.id).sort(), ['A', 'B']);

let cloudItems = mergeInboxItems([itemA], []);
let mobileItems = mergeInboxItems([itemB], cloudItems);
cloudItems = mobileItems;
const pcItems = mergeInboxItems([itemA], cloudItems);
assert.deepEqual(pcItems.map(item => item.id).sort(), ['A', 'B']);
assert.deepEqual(mobileItems.map(item => item.id).sort(), ['A', 'B']);

const phoneA = updateInboxItem([itemA], 'A', { type: 'text', content: '手机新版 A' }, secondTime)[0];
const pcA = updateInboxItem([itemA], 'A', { type: 'text', content: 'PC 旧版 A' }, new Date('2026-08-24T01:30:00.000Z'))[0];
assert.equal(mergeInboxItems([pcA], [phoneA])[0].content, '手机新版 A');

const deletedA = softDeleteInboxItem([phoneA], 'A', thirdTime)[0];
assert.equal(mergeInboxItems([phoneA], [deletedA])[0].deletedAt, thirdTime.toISOString());

const sameTimeLive = { ...phoneA, updatedAt: thirdTime.toISOString() };
const sameTimeDeleted = { ...sameTimeLive, deletedAt: thirdTime.toISOString() };
assert.equal(mergeInboxItems([sameTimeLive], [sameTimeDeleted])[0].deletedAt, thirdTime.toISOString());
assert.deepEqual(mergeInboxItems([sameTimeLive], [sameTimeDeleted]), mergeInboxItems([sameTimeDeleted], [sameTimeLive]));
const reorderedTags = { ...sameTimeLive, tags: ['二', '一'] };
const sortedTags = { ...sameTimeLive, tags: ['一', '二'] };
assert.deepEqual(mergeInboxItems([reorderedTags], [sortedTags]), mergeInboxItems([sortedTags], [reorderedTags]));

const encryptedItems = [deletedA, itemB];
const encrypted = await encryptInbox(encryptedItems, password, thirdTime);
const serialized = JSON.stringify(encrypted);
assert.equal(serialized.includes('手机新版 A'), false);
assert.equal(serialized.includes('手机添加 B'), false);
const decrypted = await decryptInbox(serialized, password);
assert.deepEqual(decrypted.items, encryptedItems);
await assert.rejects(() => decryptInbox(encrypted, 'a-valid-wrong-password'), /密码错误|已损坏/);

const tampered = structuredClone(encrypted);
const ciphertext = Buffer.from(tampered.ciphertext, 'base64');
ciphertext[0] ^= 1;
tampered.ciphertext = ciphertext.toString('base64');
await assert.rejects(() => decryptInbox(tampered, password), /密码错误|已损坏/);
await assert.rejects(() => decryptInbox({ ...encrypted, plaintext: [itemA] }, password), /不支持的字段/);

const storage = new MemoryStorage();
const meta = createInboxSyncMeta([phoneA, itemB], thirdTime.toISOString());
assert.equal(saveInboxSyncMeta(meta, storage), true);
assert.deepEqual(loadInboxSyncMeta(storage), meta);
assert.ok(storage.getItem(INBOX_SYNC_META_KEY));
assert.equal(isInboxItemSynced(phoneA, meta), true);
assert.equal(countUnsyncedInboxItems([phoneA, itemB], meta), 0);
assert.equal(countUnsyncedInboxItems([deletedA, itemB], meta), 1);

console.log('inbox sync self-check passed');
