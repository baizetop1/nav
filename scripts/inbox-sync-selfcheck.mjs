import assert from 'node:assert/strict';
import { createInboxItem, softDeleteInboxItem, updateInboxItem } from '../src/services/inbox.ts';
import { encryptTextPayload } from '../src/services/encryptedNote.ts';
import {
  countUnsyncedStudyProgress,
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
import { emptyStudyProgressStore, mergeStudyProgressStores } from '../src/services/techOsStudyProgress.ts';

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

const localStudyProgress = {
  version: 2,
  quests: {
    'QUEST-001': {
      S1: { completed: true, updatedAt: secondTime.toISOString() },
      S2: { completed: false, updatedAt: thirdTime.toISOString() },
    },
  },
};
const remoteStudyProgress = {
  version: 2,
  quests: {
    'QUEST-001': {
      S1: { completed: false, updatedAt: firstTime.toISOString() },
      S3: { completed: true, updatedAt: thirdTime.toISOString() },
    },
  },
};
const mergedStudyProgress = mergeStudyProgressStores(localStudyProgress, remoteStudyProgress);
assert.equal(mergedStudyProgress.quests['QUEST-001'].S1.completed, true);
assert.equal(mergedStudyProgress.quests['QUEST-001'].S2.completed, false);
assert.equal(mergedStudyProgress.quests['QUEST-001'].S3.completed, true);

const encryptedItems = [deletedA, itemB];
const encrypted = await encryptInbox(encryptedItems, password, thirdTime, mergedStudyProgress);
const serialized = JSON.stringify(encrypted);
assert.equal(serialized.includes('手机新版 A'), false);
assert.equal(serialized.includes('手机添加 B'), false);
assert.equal(serialized.includes('QUEST-001'), false);
const decrypted = await decryptInbox(serialized, password);
assert.deepEqual(decrypted.items, encryptedItems);
assert.deepEqual(decrypted.studyProgress, mergedStudyProgress);
assert.equal(decrypted.version, 2);
await assert.rejects(() => decryptInbox(encrypted, 'a-valid-wrong-password'), /密码错误|已损坏/);

const legacyStore = { version: 1, updatedAt: secondTime.toISOString(), items: [itemA] };
const legacyEncrypted = {
  format: 'baize-inbox',
  version: 1,
  ...await encryptTextPayload(JSON.stringify(legacyStore), password, 'baize-nav-inbox-v1'),
  encryptedAt: secondTime.toISOString(),
};
const migratedLegacy = await decryptInbox(legacyEncrypted, password);
assert.deepEqual(migratedLegacy.items, [itemA]);
assert.deepEqual(migratedLegacy.studyProgress, emptyStudyProgressStore());
assert.equal(migratedLegacy.version, 2);

const tampered = structuredClone(encrypted);
const ciphertext = Buffer.from(tampered.ciphertext, 'base64');
ciphertext[0] ^= 1;
tampered.ciphertext = ciphertext.toString('base64');
await assert.rejects(() => decryptInbox(tampered, password), /密码错误|已损坏/);
await assert.rejects(() => decryptInbox({ ...encrypted, plaintext: [itemA] }, password), /不支持的字段/);

const storage = new MemoryStorage();
const meta = createInboxSyncMeta([phoneA, itemB], thirdTime.toISOString(), mergedStudyProgress);
assert.equal(saveInboxSyncMeta(meta, storage), true);
assert.deepEqual(loadInboxSyncMeta(storage), meta);
assert.ok(storage.getItem(INBOX_SYNC_META_KEY));
assert.equal(isInboxItemSynced(phoneA, meta), true);
assert.equal(countUnsyncedInboxItems([phoneA, itemB], meta), 0);
assert.equal(countUnsyncedInboxItems([deletedA, itemB], meta), 1);
const sameTimestampDifferentContent = { ...phoneA, content: '同一时间戳但正文不同' };
assert.equal(isInboxItemSynced(sameTimestampDifferentContent, meta), false);
assert.equal(countUnsyncedInboxItems([sameTimestampDifferentContent, itemB], meta), 1);
assert.equal(countUnsyncedStudyProgress(mergedStudyProgress, meta), 0);
assert.equal(countUnsyncedStudyProgress(localStudyProgress, meta), 0);
const changedStudyProgress = structuredClone(mergedStudyProgress);
changedStudyProgress.quests['QUEST-001'].S1.updatedAt = thirdTime.toISOString();
assert.equal(countUnsyncedStudyProgress(changedStudyProgress, meta), 1);
const checkedAtSameTime = { version: 2, quests: { 'QUEST-002': { S1: { completed: true, updatedAt: thirdTime.toISOString() } } } };
const uncheckedAtSameTime = { version: 2, quests: { 'QUEST-002': { S1: { completed: false, updatedAt: thirdTime.toISOString() } } } };
const checkedMeta = createInboxSyncMeta([], thirdTime.toISOString(), checkedAtSameTime);
assert.equal(countUnsyncedStudyProgress(uncheckedAtSameTime, checkedMeta), 1);

const legacyMetaStorage = new MemoryStorage();
legacyMetaStorage.setItem(INBOX_SYNC_META_KEY, JSON.stringify({
  version: 1,
  lastSyncedAt: secondTime.toISOString(),
  itemVersions: { A: itemA.updatedAt },
}));
const migratedMeta = loadInboxSyncMeta(legacyMetaStorage);
assert.equal(migratedMeta.version, 2);
assert.deepEqual(migratedMeta.studyVersions, {});
assert.equal(isInboxItemSynced(itemA, migratedMeta), true);
assert.equal(countUnsyncedStudyProgress(localStudyProgress, migratedMeta), 2);

console.log('inbox sync self-check passed');
