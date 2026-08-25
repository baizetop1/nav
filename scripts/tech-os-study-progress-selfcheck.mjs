import assert from 'node:assert/strict';
import {
  TECH_OS_STUDY_PROGRESS_KEY,
  extractQuestStudyTasks,
  loadQuestStudyProgress,
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

const storage = new MemoryStorage();
assert.deepEqual(loadQuestStudyProgress('QUEST-001', storage), []);
assert.deepEqual(toggleQuestStudyTask('QUEST-001', 'S2', storage), ['S2']);
assert.deepEqual(toggleQuestStudyTask('QUEST-001', 'S1', storage), ['S1', 'S2']);
assert.deepEqual(toggleQuestStudyTask('QUEST-001', 'S2', storage), ['S1']);
assert.deepEqual(loadQuestStudyProgress('QUEST-001', storage), ['S1']);

assert.equal(saveQuestStudyProgress('QUEST-001', ['S3', 'S1', 'S1', 'bad'], storage), true);
assert.deepEqual(loadQuestStudyProgress('QUEST-001', storage), ['S1', 'S3']);

storage.setItem(TECH_OS_STUDY_PROGRESS_KEY, '{broken');
assert.deepEqual(loadQuestStudyProgress('QUEST-001', storage), []);

console.log('Tech OS study progress self-check passed.');
