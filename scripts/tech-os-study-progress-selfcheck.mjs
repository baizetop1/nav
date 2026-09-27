import assert from 'node:assert/strict';
import {
  TECH_OS_STUDY_PROGRESS_KEY,
  TECH_OS_STUDY_PROGRESS_UPDATED_EVENT,
  emptyStudyProgressStore,
  extractQuestStudyTasks,
  loadQuestStudyProgress,
  loadStudyProgressStore,
  mergeStudyProgressStores,
  parseStudyProgressStore,
  readStudyProgressStore,
  saveQuestStudyProgress,
  saveStudyProgressStore,
  setQuestStudyTaskCompleted,
  toggleQuestStudyTask,
} from '../src/services/techOsStudyProgress.ts';

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });

class MemoryStorage {
  values = new Map();
  writes = 0;
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.writes += 1; this.values.set(key, value); }
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

// Fences may use either marker, longer closing runs, indentation, or be unclosed.
const fencedBody = [
  '### S1 · 真实步骤 ###',
  '```md', '### S8 · 假步骤', '~~~', '### S9 · 仍在代码中', '```',
  '  ~~~~text', '### S10 · 假步骤', '~~~', '### S11 · 短围栏不能关闭', '  ~~~~~',
  '   ### s2：第二步',
  '    ### S12 · 缩进代码',
  '### S2 · 重复步骤',
  '````', '```', '### S13 · 未结束围栏',
].join('\n');
assert.deepEqual(extractQuestStudyTasks(fencedBody), [{ id: 'S1', title: '真实步骤' }, { id: 'S2', title: '第二步' }]);
assert.deepEqual(extractQuestStudyTasks('### S1 · ###'), []);

// Strict reads preserve all invalid inputs, including an invalid legacy archive.
for (const raw of ['{broken', '', 'null', '{"version":3,"quests":{}}', '{"version":1,"quests":{"QUEST-001":["S1","bad"]}}', '{"version":2,"quests":{"QUEST-001":{"S1":{"completed":true,"updatedAt":"invalid"}}}}']) {
  const broken = new MemoryStorage();
  broken.values.set(TECH_OS_STUDY_PROGRESS_KEY, raw);
  assert.throws(() => readStudyProgressStore(broken), /损坏.*保留/);
  assert.deepEqual(loadStudyProgressStore(broken), emptyStudyProgressStore());
  assert.equal(saveStudyProgressStore(local, broken), false);
  assert.equal(saveQuestStudyProgress('QUEST-001', ['S1'], broken, firstTime), false);
  assert.deepEqual(toggleQuestStudyTask('QUEST-001', 'S1', broken, firstTime), []);
  const result = await setQuestStudyTaskCompleted('QUEST-001', 'S1', true, broken, firstTime);
  assert.equal(result.saved, false);
  assert.equal(result.store, undefined);
  assert.match(result.error, /损坏/);
  assert.equal(broken.getItem(TECH_OS_STUDY_PROGRESS_KEY), raw);
  assert.equal(broken.writes, 0, 'no path may overwrite, quarantine, or clear corrupt data');
}

// Reads do not rewrite or migrate durable bytes until an actual change is saved.
const legacyRaw = legacyStorage.getItem(TECH_OS_STUDY_PROGRESS_KEY);
const legacyWrites = legacyStorage.writes;
const migrated = readStudyProgressStore(legacyStorage);
assert.equal(migrated.quests['QUEST-001'].S1.updatedAt, '1970-01-01T00:00:00.000Z');
assert.equal(legacyStorage.getItem(TECH_OS_STUDY_PROGRESS_KEY), legacyRaw);
assert.equal(legacyStorage.writes, legacyWrites);
assert.equal((await setQuestStudyTaskCompleted('QUEST-001', 'S3', true, legacyStorage, firstTime)).saved, true);
assert.deepEqual(loadQuestStudyProgress('QUEST-001', legacyStorage), ['S1', 'S2', 'S3']);

const deniedRead = { getItem() { throw new DOMException('denied', 'SecurityError'); }, setItem() { assert.fail('read error must forbid all writes'); } };
assert.throws(() => readStudyProgressStore(deniedRead), /读取.*失败/);
assert.equal(saveStudyProgressStore(local, deniedRead), false);
assert.equal(saveQuestStudyProgress('QUEST-001', ['S1'], deniedRead), false);
assert.deepEqual(toggleQuestStudyTask('QUEST-001', 'S1', deniedRead), []);
const deniedResult = await setQuestStudyTaskCompleted('QUEST-001', 'S1', true, deniedRead);
assert.equal(deniedResult.saved, false);
assert.match(deniedResult.error, /读取.*失败/);

// A failed write is explicit, keeps the old state, and supports retrying the same intent.
const quota = new MemoryStorage();
quota.values.set(TECH_OS_STUDY_PROGRESS_KEY, JSON.stringify(local));
let quotaFull = true;
const quotaStorage = {
  getItem: key => quota.getItem(key),
  setItem: (key, value) => { if (quotaFull) throw new DOMException('full', 'QuotaExceededError'); quota.setItem(key, value); },
};
const beforeQuota = quota.getItem(TECH_OS_STUDY_PROGRESS_KEY);
const quotaResult = await setQuestStudyTaskCompleted('QUEST-001', 'S3', true, quotaStorage, thirdTime);
assert.equal(quotaResult.saved, false);
assert.match(quotaResult.error, /空间不足/);
assert.deepEqual(quotaResult.completedTaskIds, ['S1', 'S2']);
assert.equal(quota.getItem(TECH_OS_STUDY_PROGRESS_KEY), beforeQuota);
assert.equal(saveStudyProgressStore(remote, quotaStorage), false);
quotaFull = false;
assert.equal((await setQuestStudyTaskCompleted('QUEST-001', 'S3', true, quotaStorage, thirdTime)).saved, true);
assert.deepEqual(loadQuestStudyProgress('QUEST-001', quota), ['S1', 'S2', 'S3']);
const noPermission = { getItem: () => null, setItem() { throw new DOMException('denied', 'SecurityError'); } };
assert.match((await setQuestStudyTaskCompleted('QUEST-001', 'S1', true, noPermission)).error, /存储权限/);

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
try {
  // No Web Locks: every explicit action still reads the newest store and retains other tasks.
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
  const shared = new MemoryStorage();
  const tabA = { getItem: key => shared.getItem(key), setItem: (key, value) => shared.setItem(key, value) };
  const tabB = { getItem: key => shared.getItem(key), setItem: (key, value) => shared.setItem(key, value) };
  const a = await setQuestStudyTaskCompleted('QUEST-001', 'S1', true, tabA, firstTime);
  const b = await setQuestStudyTaskCompleted('QUEST-001', 'S2', true, tabB, secondTime);
  assert.equal(a.saved && b.saved, true);
  assert.deepEqual(b.completedTaskIds, ['S1', 'S2']);
  assert.equal((await setQuestStudyTaskCompleted('QUEST-002', 'S1', true, tabA, secondTime)).saved, true);
  assert.deepEqual(loadQuestStudyProgress('QUEST-001', shared), ['S1', 'S2']);
  const stableRaw = shared.getItem(TECH_OS_STUDY_PROGRESS_KEY);
  const stableWrites = shared.writes;
  assert.equal((await setQuestStudyTaskCompleted('QUEST-001', 'S1', true, tabB, thirdTime)).saved, true);
  assert.equal(shared.getItem(TECH_OS_STUDY_PROGRESS_KEY), stableRaw, 'repeat explicit completion is idempotent');
  assert.equal(shared.writes, stableWrites);
  assert.equal((await setQuestStudyTaskCompleted('QUEST-001', 'S1', false, tabA, thirdTime)).saved, true);
  assert.equal(readStudyProgressStore(shared).quests['QUEST-001'].S1.completed, false);
  assert.deepEqual(loadQuestStudyProgress('QUEST-002', shared), ['S1']);
  // A same-millisecond re-check must be newer than its tombstone.
  await setQuestStudyTaskCompleted('QUEST-001', 'S1', true, tabB, thirdTime);
  assert.equal(readStudyProgressStore(shared).quests['QUEST-001'].S1.updatedAt, new Date(thirdTime.getTime() + 1).toISOString());
  // A stale sync snapshot may not erase a newer task/tombstone from another tab.
  const stale = structuredClone(local);
  await setQuestStudyTaskCompleted('QUEST-001', 'S1', false, shared, new Date(thirdTime.getTime() + 2));
  assert.equal(saveStudyProgressStore(stale, shared), true);
  assert.equal(readStudyProgressStore(shared).quests['QUEST-001'].S1.completed, false);
  assert.equal(readStudyProgressStore(shared).quests['QUEST-002'].S1.completed, true);

  // Interleave a different tab's write between our first and pre-write reads.
  const interleaved = new MemoryStorage();
  let reads = 0;
  const raceStorage = {
    getItem(key) {
      reads += 1;
      if (reads === 2) interleaved.values.set(key, JSON.stringify(remote));
      return interleaved.getItem(key);
    },
    setItem: (key, value) => interleaved.setItem(key, value),
  };
  assert.equal((await setQuestStudyTaskCompleted('QUEST-001', 'S2', true, raceStorage, thirdTime)).saved, true);
  assert.deepEqual(loadQuestStudyProgress('QUEST-001', interleaved), ['S2', 'S3']);
  assert.equal(readStudyProgressStore(interleaved).quests['QUEST-001'].S1.completed, false);
  assert.equal(interleaved.writes, 1);

  // Corruption appearing during pre-write validation still results in zero writes.
  const corruptedMidRead = new MemoryStorage();
  let corruptReads = 0;
  const newlyCorrupt = {
    getItem(key) { if (++corruptReads === 2) corruptedMidRead.values.set(key, '{broken during read'); return corruptedMidRead.getItem(key); },
    setItem: (key, value) => corruptedMidRead.setItem(key, value),
  };
  assert.equal((await setQuestStudyTaskCompleted('QUEST-001', 'S1', true, newlyCorrupt)).saved, false);
  assert.equal(corruptedMidRead.writes, 0);

  // Silent failure or an immediate competing write must never be reported as saved.
  const ignoredWrite = { getItem: () => null, setItem() {} };
  assert.match((await setQuestStudyTaskCompleted('QUEST-001', 'S1', true, ignoredWrite)).error, /未能确认/);
  const contended = new MemoryStorage();
  let contentionReads = 0;
  const busy = {
    getItem(key) {
      const newer = { version: 2, quests: { 'QUEST-002': { S1: { completed: true, updatedAt: new Date(firstTime.getTime() + contentionReads++).toISOString() } } } };
      contended.values.set(key, JSON.stringify(newer));
      return contended.getItem(key);
    },
    setItem: (key, value) => contended.setItem(key, value),
  };
  const busyResult = await setQuestStudyTaskCompleted('QUEST-001', 'S1', true, busy);
  assert.equal(busyResult.saved, false);
  assert.match(busyResult.error, /稍后重试/);
  assert.equal(contended.writes, 0);

  // Web Locks serializes calls; reads happen after acquisition, not when the click occurs.
  let queue = Promise.resolve();
  const lockNames = [];
  const waiting = [];
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request(name, callback) {
    lockNames.push(name);
    const start = new Promise(resolve => waiting.push(resolve));
    const result = queue.then(() => start).then(callback);
    queue = result.catch(() => {});
    return result;
  } } } });
  const locked = new MemoryStorage();
  const first = setQuestStudyTaskCompleted('QUEST-001', 'S1', true, locked, firstTime);
  const second = setQuestStudyTaskCompleted('QUEST-001', 'S2', true, locked, secondTime);
  locked.values.set(TECH_OS_STUDY_PROGRESS_KEY, JSON.stringify(remote));
  assert.equal(locked.writes, 0);
  waiting.forEach(resolve => resolve());
  assert.deepEqual((await first).completedTaskIds, ['S1', 'S3']);
  assert.deepEqual((await second).completedTaskIds, ['S1', 'S2', 'S3']);
  assert.deepEqual(lockNames, [TECH_OS_STUDY_PROGRESS_KEY, TECH_OS_STUDY_PROGRESS_KEY]);
  assert.equal(readStudyProgressStore(locked).quests['QUEST-001'].S1.updatedAt, new Date(thirdTime.getTime() + 1).toISOString());

  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request() { return Promise.reject(new DOMException('denied', 'SecurityError')); } } } });
  const rejectedLock = new MemoryStorage();
  assert.equal((await setQuestStudyTaskCompleted('QUEST-001', 'S1', true, rejectedLock)).saved, false);
  assert.equal(rejectedLock.writes, 0);

  // Notifications are emitted only for confirmed writes and cannot compromise a saved result.
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
  const events = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent(event) { events.push(event.type); } } });
  const eventStorage = new MemoryStorage();
  assert.equal((await setQuestStudyTaskCompleted('QUEST-001', 'S1', true, eventStorage, firstTime)).saved, true);
  assert.deepEqual(events, [TECH_OS_STUDY_PROGRESS_UPDATED_EVENT]);
  await setQuestStudyTaskCompleted('QUEST-001', 'S1', true, eventStorage, secondTime);
  assert.equal(events.length, 1);
  await setQuestStudyTaskCompleted('QUEST-001', 'S1', true, noPermission);
  assert.equal(events.length, 1);
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent() { throw new Error('observer error'); } } });
  assert.equal((await setQuestStudyTaskCompleted('QUEST-001', 'S2', true, eventStorage, secondTime)).saved, true);

  const invalid = new MemoryStorage();
  assert.equal((await setQuestStudyTaskCompleted('bad', 'S1', true, invalid)).saved, false);
  assert.equal((await setQuestStudyTaskCompleted('QUEST-001', 'bad', true, invalid)).saved, false);
  assert.equal((await setQuestStudyTaskCompleted('QUEST-001', 'S1', true, invalid, new Date('invalid'))).saved, false);
  assert.equal(invalid.writes, 0);
} finally {
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator); else delete globalThis.navigator;
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else delete globalThis.window;
}

console.log('Tech OS study progress self-check passed: legacy migration, fenced steps, strict reads, corrupt zero-write, quota/retry, timestamps, cross-tab merge, locks and notifications.');
