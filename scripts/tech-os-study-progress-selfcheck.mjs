import assert from 'node:assert/strict';
import {
  TECH_OS_STUDY_PROGRESS_KEY,
  emptyStudyProgressStore,
  extractQuestStudyTasks,
  loadQuestStudyProgress,
  loadStudyProgressStore,
  mergeStudyProgressStores,
  parseStudyProgressStore,
  saveQuestStudyProgress,
  toggleQuestStudyTask,
} from '../src/services/techOsStudyProgress.ts';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

const body = `
## 学习目标

### S1 · 地址栏输入

说明。

### S2：URL 解析

说明。

### S2 · 重复步骤不会重复

### S3 - 缓存判断
`;

assert.deepEqual(extractQuestStudyTasks(body), [
  { id: 'S1', title: '地址栏输入' },
  { id: 'S2', title: 'URL 解析' },
  { id: 'S3', title: '缓存判断' },
]);

const firstTime = new Date('2026-08-31T01:00:00.000Z');
const secondTime = new Date('2026-08-31T02:00:00.000Z');
const thirdTime = new Date('2026-08-31T03:00:00.000Z');
const storage = new MemoryStorage();
assert.deepEqual(loadQuestStudyProgress('QUEST-001', storage), []);
assert.deepEqual(toggleQuestStudyTask('QUEST-001', 'S2', storage, firstTime), ['S2']);
assert.deepEqual(toggleQuestStudyTask('QUEST-001', 'S1', storage, secondTime), ['S1', 'S2']);
assert.deepEqual(toggleQuestStudyTask('QUEST-001', 'S2', storage, thirdTime), ['S1']);
assert.deepEqual(loadQuestStudyProgress('QUEST-001', storage), ['S1']);
assert.equal(loadStudyProgressStore(storage).version, 2);
assert.deepEqual(loadStudyProgressStore(storage).quests['QUEST-001'].S2, {
  completed: false,
  updatedAt: thirdTime.toISOString(),
});

assert.equal(saveQuestStudyProgress('QUEST-001', ['S3', 'S1', 'S1', 'bad'], storage, thirdTime), true);
assert.deepEqual(loadQuestStudyProgress('QUEST-001', storage), ['S1', 'S3']);

const legacyStorage = new MemoryStorage();
legacyStorage.setItem(TECH_OS_STUDY_PROGRESS_KEY, JSON.stringify({ version: 1, quests: { 'QUEST-001': ['S2', 'S1', 'S2'] } }));
assert.deepEqual(loadQuestStudyProgress('QUEST-001', legacyStorage), ['S1', 'S2']);
assert.equal(loadStudyProgressStore(legacyStorage).version, 2);

const local = {
  version: 2,
  quests: {
    'QUEST-001': {
      S1: { completed: true, updatedAt: secondTime.toISOString() },
      S2: { completed: true, updatedAt: firstTime.toISOString() },
    },
  },
};
const remote = {
  version: 2,
  quests: {
    'QUEST-001': {
      S1: { completed: false, updatedAt: thirdTime.toISOString() },
      S3: { completed: true, updatedAt: firstTime.toISOString() },
    },
  },
};
const merged = mergeStudyProgressStores(local, remote);
assert.equal(merged.quests['QUEST-001'].S1.completed, false);
assert.equal(merged.quests['QUEST-001'].S2.completed, true);
assert.equal(merged.quests['QUEST-001'].S3.completed, true);

const sameTimeChecked = { version: 2, quests: { 'QUEST-001': { S1: { completed: true, updatedAt: thirdTime.toISOString() } } } };
const sameTimeUnchecked = { version: 2, quests: { 'QUEST-001': { S1: { completed: false, updatedAt: thirdTime.toISOString() } } } };
assert.equal(mergeStudyProgressStores(sameTimeChecked, sameTimeUnchecked).quests['QUEST-001'].S1.completed, false);
assert.deepEqual(mergeStudyProgressStores(sameTimeChecked, sameTimeUnchecked), mergeStudyProgressStores(sameTimeUnchecked, sameTimeChecked));

assert.deepEqual(parseStudyProgressStore(emptyStudyProgressStore()), emptyStudyProgressStore());
assert.equal(parseStudyProgressStore({ version: 2, quests: { 'QUEST-001': { S1: { completed: true, updatedAt: 'bad' } } } }), null);
storage.setItem(TECH_OS_STUDY_PROGRESS_KEY, '{broken');
assert.deepEqual(loadQuestStudyProgress('QUEST-001', storage), []);

console.log('Tech OS study progress self-check passed.');
