import assert from 'node:assert/strict';
import { emptyWorkSession, startWork, pauseWork, resumeWork, reconcileWork, finishWork, remainingWorkMs, parseWorkSession, commitWorkSession, readWorkSession, sameWorkSession, WORK_SESSION_KEY, setWorkPreset, workPhaseMinutes, startBreak, startNextPhase, skipBreak, acknowledgeWorkNotice } from '../src/lib/workSession.ts';
const base = { ...emptyWorkSession(), task: '修复导航', siteIds: ['github'] };
assert.throws(() => startWork(emptyWorkSession(), 0, 'a'), /任务/);
let store = startWork(base, 1000, 'one');
assert.equal(remainingWorkMs(store.current, 61_000), 24 * 60_000);
store = pauseWork(store, 61_000);
assert.equal(remainingWorkMs(store.current, 999_999), 24 * 60_000);
store = resumeWork(store, 86_400_000);
store = reconcileWork(JSON.parse(JSON.stringify(store)), 86_400_000 + 24 * 60_000 + 1000);
assert.equal(store.current, null);
assert.equal(store.history[0].focusedMs, 25 * 60_000);
assert.equal(store.history[0].completed, true);
assert.equal(reconcileWork(store).history.length, 1);
let early = startWork(base, 1000, 'two');
early = pauseWork(early, 16_000);
assert.equal(finishWork(early, 200_000).history[0].focusedMs, 15_000);
assert.throws(() => parseWorkSession({ ...base, current: { ...startWork(base, 0, 'bad').current, remainingMs: -1 } }), /无效/);
let raw = null, writes = 0, rejectWrites = false;
const storage = {
  getItem: key => key === WORK_SESSION_KEY ? raw : null,
  setItem: (key, value) => { assert.equal(key, WORK_SESSION_KEY); if (rejectWrites) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); raw = value; writes += 1; },
  removeItem: () => { raw = null; },
};
assert.equal(commitWorkSession(emptyWorkSession(), base, storage).status, 'saved');
const sharedRun = startWork(base, 1000, 'shared');
assert.equal(commitWorkSession(base, sharedRun, storage).status, 'saved');
const pausedByTabA = pauseWork(sharedRun, 61_000);
assert.equal(commitWorkSession(sharedRun, pausedByTabA, storage).status, 'saved');
const staleCompletion = reconcileWork(sharedRun, 26 * 60_000);
const staleResult = commitWorkSession(sharedRun, staleCompletion, storage);
assert.equal(staleResult.status, 'conflict');
assert.equal(staleResult.store.current.deadline, null, 'the old running tab must adopt the pause');
assert.equal(readWorkSession(storage).current.deadline, null, 'stale timer cannot erase a pause');
const resumedByTabB = resumeWork(pausedByTabA, 100_000);
assert.equal(commitWorkSession(pausedByTabA, resumedByTabB, storage).status, 'saved');
assert.equal(commitWorkSession(pausedByTabA, finishWork(pausedByTabA, 110_000), storage).status, 'conflict', 'stale end button cannot overwrite a newer resume');
const endedByTabB = finishWork(resumedByTabB, 120_000);
assert.equal(commitWorkSession(resumedByTabB, endedByTabB, storage).status, 'saved');
const newTask = startWork({ ...endedByTabB, task: 'New task' }, 130_000, 'new-task');
assert.equal(commitWorkSession(endedByTabB, newTask, storage).status, 'saved');
assert.equal(commitWorkSession(sharedRun, staleCompletion, storage).status, 'conflict');
assert.equal(readWorkSession(storage).current.id, 'new-task', 'late expiry of the previous run must not remove a new run');
assert.deepEqual(readWorkSession(storage).history, newTask.history);
const beforeRetryWrites = writes;
assert.equal(commitWorkSession(sharedRun, newTask, storage).status, 'saved', 'saving identical current state is idempotent even with an old baseline');
assert.equal(writes, beforeRetryWrites);

rejectWrites = true;
const failedPause = pauseWork(newTask, 140_000);
const failedResult = commitWorkSession(newTask, failedPause, storage);
assert.equal(failedResult.status, 'error');
assert.equal(failedPause.current.deadline, null, 'caller retains its failed in-memory change');
assert.equal(readWorkSession(storage).current.deadline, newTask.current.deadline);
rejectWrites = false;
const newerPause = pauseWork(newTask, 150_000);
assert.equal(commitWorkSession(newTask, newerPause, storage).status, 'saved');
assert.equal(commitWorkSession(newTask, failedPause, storage).status, 'conflict', 'retry after a save failure must compare the original baseline again');
assert.equal(readWorkSession(storage).current.remainingMs, newerPause.current.remainingMs);
assert.equal(sameWorkSession(newTask, { history: newTask.history, current: newTask.current, siteIds: newTask.siteIds, minutes: newTask.minutes, task: newTask.task, version: 1 }), true);
const validRaw = raw;
raw = '{invalid';
assert.equal(commitWorkSession(emptyWorkSession(), base, storage).status, 'error', 'invalid remote data must not be overwritten');
assert.equal(raw, '{invalid');
raw = validRaw;

// Version 1 migration must preserve an in-flight deadline and a paused remainder.
{
  const legacyHistory = [
    { id: 'old-completed', task: '旧任务', endedAt: 500, focusedMs: 25 * 60_000, completed: true },
    { id: 'old-early', task: '提前结束', endedAt: 300, focusedMs: 5000, completed: false },
  ];
  const legacyRun = {
    id: 'legacy-running', task: '旧运行任务', minutes: 25, siteIds: ['github', 'github'],
    startedAt: 1000, remainingMs: 25 * 60_000, deadline: 1000 + 25 * 60_000,
  };
  const legacyRunning = {
    version: 1, task: '旧运行任务', minutes: 25, siteIds: ['github', 'github'],
    current: legacyRun, history: legacyHistory,
  };
  const migrated = parseWorkSession(legacyRunning);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.current.phase, 'focus');
  assert.equal(migrated.current.deadline, legacyRun.deadline);
  assert.equal(migrated.current.remainingMs, legacyRun.remainingMs);
  assert.equal(remainingWorkMs(migrated.current, 61_000), 24 * 60_000);
  assert.deepEqual(migrated.siteIds, ['github']);
  assert.deepEqual(migrated.current.siteIds, ['github']);
  assert.deepEqual(migrated.history, legacyHistory);
  assert.equal(migrated.completedCount, 1);
  assert.equal(migrated.preset, '25/5');
  assert.equal(migrated.shortBreakMinutes, 5);
  assert.equal(migrated.longBreakMinutes, 15);
  assert.equal(migrated.background, 'paper');
  assert.equal(migrated.sound, false);
  assert.equal(migrated.nextPhase, 'focus');
  assert.equal(migrated.notice, null);
  assert.equal(legacyRunning.version, 1, 'migration must not mutate the original import');
  assert.equal(Object.hasOwn(legacyRun, 'phase'), false);

  const legacyPaused = {
    ...legacyRunning, minutes: 50,
    current: { ...legacyRun, id: 'legacy-paused', minutes: 50, remainingMs: 42 * 60_000, deadline: null },
  };
  const paused = parseWorkSession(legacyPaused);
  assert.equal(paused.preset, '50/10');
  assert.equal(paused.shortBreakMinutes, 10);
  assert.equal(paused.longBreakMinutes, 20);
  assert.equal(paused.current.deadline, null);
  assert.equal(remainingWorkMs(paused.current, 365 * 86_400_000), 42 * 60_000);
  assert.strictEqual(reconcileWork(paused, 365 * 86_400_000), paused);
  const resumed = resumeWork(paused, 800_000);
  assert.equal(resumed.current.deadline, 800_000 + 42 * 60_000);
  assert.equal(resumed.current.phase, 'focus');

  // Reading a legacy persisted value and saving v2 use the same CAS baseline.
  let legacyRaw = JSON.stringify(legacyRunning);
  const legacyStorage = {
    getItem: () => legacyRaw,
    setItem: (_key, value) => { legacyRaw = value; },
    removeItem: () => { legacyRaw = null; },
  };
  const baseline = readWorkSession(legacyStorage);
  assert.equal(commitWorkSession(baseline, pauseWork(baseline, 61_000), legacyStorage).status, 'saved');
  assert.equal(JSON.parse(legacyRaw).version, 2);
  assert.equal(readWorkSession(legacyStorage).current.deadline, null);
}

// Presets affect subsequent phases; arbitrary valid custom values survive reload.
{
  const standard = setWorkPreset(base, '25/5');
  assert.deepEqual([standard.minutes, standard.shortBreakMinutes, standard.longBreakMinutes], [25, 5, 15]);
  const extended = setWorkPreset(standard, '50/10');
  assert.deepEqual([extended.minutes, extended.shortBreakMinutes, extended.longBreakMinutes], [50, 10, 20]);
  const started = startNextPhase(extended, 1000, 'fifty');
  assert.equal(started.current.phase, 'focus');
  assert.equal(started.current.deadline, 1000 + 50 * 60_000);
  const settingsChanged = setWorkPreset(started, '25/5');
  assert.equal(settingsChanged.current.minutes, 50, 'changing a preset must not alter the active timer');
  assert.equal(settingsChanged.current.deadline, started.current.deadline);
  const complete = reconcileWork(started, started.current.deadline);
  const breakRun = startNextPhase(complete, 4_000_000, 'ten-minute-break');
  assert.equal(breakRun.current.phase, 'short-break');
  assert.equal(breakRun.current.minutes, 10);
  assert.equal(breakRun.current.deadline, 4_000_000 + 10 * 60_000);

  const custom = parseWorkSession({
    ...setWorkPreset(extended, 'custom'), minutes: 37, shortBreakMinutes: 7, longBreakMinutes: 23,
    background: 'landscape', sound: true,
  });
  assert.equal(custom.preset, 'custom');
  assert.deepEqual([workPhaseMinutes(custom, 'focus'), workPhaseMinutes(custom, 'short-break'), workPhaseMinutes(custom, 'long-break')], [37, 7, 23]);
  assert.equal(startWork(custom, 500, 'custom-focus').current.deadline, 500 + 37 * 60_000);
  assert.equal(startBreak({ ...custom, nextPhase: 'short-break' }, 500, 'custom-short').current.minutes, 7);
  assert.equal(startBreak({ ...custom, nextPhase: 'long-break' }, 500, 'custom-long').current.minutes, 23);
  assert.deepEqual(parseWorkSession(JSON.parse(JSON.stringify(custom))), custom);
  const unchangedCustom = setWorkPreset(custom, 'custom');
  assert.deepEqual([unchangedCustom.minutes, unchangedCustom.shortBreakMinutes, unchangedCustom.longBreakMinutes], [37, 7, 23]);
  assert.strictEqual(startBreak(custom, 500, 'not-due'), custom, 'a break cannot start before it is due');

  for (const patch of [
    { minutes: 0 }, { minutes: 181 }, { minutes: 1.5 },
    { shortBreakMinutes: 0 }, { shortBreakMinutes: 61 },
    { longBreakMinutes: 0 }, { longBreakMinutes: 121 },
    { completedCount: -1 }, { completedCount: 1.5 },
    { preset: 'invalid' }, { background: 'invalid' }, { sound: 'true' }, { nextPhase: 'invalid' },
  ]) assert.throws(() => parseWorkSession({ ...custom, ...patch }), /无效/);
  assert.equal(parseWorkSession({ ...custom, minutes: 180, shortBreakMinutes: 60, longBreakMinutes: 120 }).minutes, 180);
}

// Four completed focus phases lead to a long break. Breaks never add summaries.
{
  let cycle = base, clock = 1000;
  for (let number = 1; number <= 8; number += 1) {
    cycle = startNextPhase(cycle, clock, 'cycle-focus-' + number);
    assert.equal(cycle.current.phase, 'focus');
    const deadline = cycle.current.deadline;
    cycle = reconcileWork(cycle, deadline + 20_000);
    assert.equal(cycle.current, null, 'completing focus must wait for an explicit next-phase start');
    assert.equal(cycle.completedCount, number);
    assert.equal(cycle.history.length, number);
    assert.equal(cycle.history[0].endedAt, deadline, 'late ticks record the true deadline, not the refresh time');
    assert.equal(cycle.history[0].focusedMs, 25 * 60_000);
    assert.equal(cycle.nextPhase, number % 4 === 0 ? 'long-break' : 'short-break');
    assert.equal(cycle.notice.phase, 'focus');
    const beforeBreakHistory = cycle.history;
    cycle = startNextPhase(cycle, deadline + 20_001, 'cycle-break-' + number);
    assert.equal(cycle.current.phase, number % 4 === 0 ? 'long-break' : 'short-break');
    assert.equal(cycle.current.minutes, number % 4 === 0 ? 15 : 5);
    assert.equal(cycle.notice, null);
    const breakDeadline = cycle.current.deadline;
    cycle = reconcileWork(cycle, breakDeadline + 5000);
    assert.equal(cycle.current, null, 'a completed break must not automatically begin focus');
    assert.equal(cycle.nextPhase, 'focus');
    assert.equal(cycle.completedCount, number);
    assert.deepEqual(cycle.history, beforeBreakHistory);
    assert.equal(cycle.notice.phase, number % 4 === 0 ? 'long-break' : 'short-break');
    assert.equal(cycle.notice.endedAt, breakDeadline);
    clock = breakDeadline + 5001;
  }
}

// Early finish and skipping a break must not award a completed tomato.
{
  const active = startWork({ ...base, completedCount: 3 }, 1000, 'early-v2');
  const stopped = finishWork(pauseWork(active, 61_000), 9_000_000);
  assert.equal(stopped.completedCount, 3);
  assert.equal(stopped.nextPhase, 'focus');
  assert.equal(stopped.notice, null);
  assert.equal(stopped.history[0].completed, false);
  assert.equal(stopped.history[0].focusedMs, 60_000);
  assert.strictEqual(skipBreak(active), active, 'skip-break cannot discard active focus');
  const due = reconcileWork(active, active.current.deadline);
  assert.equal(due.nextPhase, 'long-break');
  const skipped = skipBreak(due);
  assert.equal(skipped.current, null);
  assert.equal(skipped.nextPhase, 'focus');
  assert.equal(skipped.notice, null);
  assert.equal(skipped.completedCount, 4);
  assert.deepEqual(skipped.history, due.history);
  for (const phase of ['short-break', 'long-break']) {
    const resting = startBreak({ ...due, nextPhase: phase }, 3_000_000, 'early-' + phase);
    const paused = pauseWork(resting, 3_060_000);
    assert.equal(paused.current.deadline, null);
    const finished = finishWork(paused, 4_000_000);
    assert.equal(finished.current, null);
    assert.equal(finished.notice, null);
    assert.equal(finished.nextPhase, 'focus');
    assert.equal(finished.completedCount, 4);
    assert.deepEqual(finished.history, due.history);
    assert.deepEqual(skipBreak(resting).history, due.history);
    assert.equal(skipBreak(resting).completedCount, 4);
  }
}

// Refreshing long after expiry settles once, persists the notice and waits.
{
  const running = startWork(base, 1000, 'expired-offline');
  const deadline = running.current.deadline;
  const reloaded = parseWorkSession(JSON.parse(JSON.stringify(running)));
  const settled = reconcileWork(reloaded, deadline + 90 * 86_400_000);
  assert.equal(settled.current, null);
  assert.equal(settled.completedCount, 1);
  assert.equal(settled.history.length, 1);
  assert.equal(settled.nextPhase, 'short-break');
  assert.deepEqual(settled.notice, { id: 'expired-offline:completed', runId: 'expired-offline', phase: 'focus', endedAt: deadline });
  const anotherReload = parseWorkSession(JSON.parse(JSON.stringify(settled)));
  const later = reconcileWork(anotherReload, deadline + 180 * 86_400_000);
  assert.strictEqual(later, anotherReload);
  assert.deepEqual(later.notice, settled.notice);
  assert.equal(later.completedCount, 1);
  assert.strictEqual(finishWork(later, deadline + 181 * 86_400_000), later);
  assert.strictEqual(acknowledgeWorkNotice(later, 'other:completed'), later);
  const acknowledged = acknowledgeWorkNotice(later, later.notice.id);
  assert.equal(acknowledged.notice, null);
  assert.deepEqual(acknowledged.history, later.history);
  assert.equal(acknowledged.nextPhase, 'short-break');
  assert.equal(parseWorkSession(JSON.parse(JSON.stringify(acknowledged))).notice, null);
  assert.throws(() => parseWorkSession({ ...settled, notice: { ...settled.notice, id: 'wrong-id' } }), /提示数据无效/);
  assert.throws(() => parseWorkSession({ ...settled, notice: { ...settled.notice, phase: 'invalid' } }), /提示数据无效/);
}

// Lifetime counts are independent from the 30-item visible history limit.
{
  let many = { ...base, preset: 'custom', minutes: 1 }, clock = 1000;
  for (let index = 1; index <= 37; index += 1) {
    many = startWork(many, clock, 'history-' + index);
    clock = many.current.deadline;
    many = reconcileWork(many, clock);
    assert.equal(many.completedCount, index);
    assert.equal(many.nextPhase, index % 4 === 0 ? 'long-break' : 'short-break');
    many = skipBreak(parseWorkSession(JSON.parse(JSON.stringify(many))));
    clock += 1;
  }
  assert.equal(many.history.length, 30);
  assert.equal(many.history[0].id, 'history-37');
  assert.equal(many.history[29].id, 'history-8');
  assert.equal(many.completedCount, 37);
  const reloaded = parseWorkSession(JSON.parse(JSON.stringify(many)));
  assert.equal(reloaded.completedCount, 37);
  assert.equal(reloaded.history.length, 30);
  const retainedLegacyHistory = Array.from({ length: 35 }, (_, index) => ({
    id: 'legacy-' + index, task: '旧记录', endedAt: index, focusedMs: 25 * 60_000, completed: index !== 0,
  }));
  const migrated = parseWorkSession({ version: 1, task: '旧任务', minutes: 25, siteIds: [], current: null, history: retainedLegacyHistory });
  assert.equal(migrated.history.length, 30);
  assert.equal(migrated.completedCount, 34, 'migration counts all provided completed records before trimming history');
}

// Two tabs settling the same deadline are idempotent; late notice writes lose CAS.
{
  let concurrentRaw = null, concurrentWrites = 0;
  const concurrentStorage = {
    getItem: key => key === WORK_SESSION_KEY ? concurrentRaw : null,
    setItem: (key, value) => { assert.equal(key, WORK_SESSION_KEY); concurrentRaw = value; concurrentWrites += 1; },
    removeItem: () => { concurrentRaw = null; },
  };
  const running = startWork(base, 1000, 'two-tabs-expiry');
  assert.equal(commitWorkSession(emptyWorkSession(), running, concurrentStorage).status, 'saved');
  const tabA = readWorkSession(concurrentStorage), tabB = readWorkSession(concurrentStorage);
  const completedA = reconcileWork(tabA, tabA.current.deadline + 100);
  const completedB = reconcileWork(tabB, tabB.current.deadline + 500_000);
  assert.equal(commitWorkSession(tabA, completedA, concurrentStorage).status, 'saved');
  const writesAfterA = concurrentWrites;
  assert.equal(commitWorkSession(tabB, completedB, concurrentStorage).status, 'saved');
  assert.equal(concurrentWrites, writesAfterA, 'same deadline settlement must not write a second summary or count');
  assert.equal(readWorkSession(concurrentStorage).completedCount, 1);
  const acknowledged = acknowledgeWorkNotice(completedA, completedA.notice.id);
  assert.equal(commitWorkSession(completedA, acknowledged, concurrentStorage).status, 'saved');
  assert.equal(commitWorkSession(tabB, completedB, concurrentStorage).status, 'conflict');
  assert.equal(readWorkSession(concurrentStorage).notice, null, 'a delayed expiry cannot resurrect an acknowledged notice');

  const startedBreak = startNextPhase(acknowledged, 2_000_000, 'shared-break');
  assert.equal(commitWorkSession(acknowledged, startedBreak, concurrentStorage).status, 'saved');
  const tabBreakA = readWorkSession(concurrentStorage), tabBreakB = readWorkSession(concurrentStorage);
  const skippedBreak = skipBreak(tabBreakA);
  assert.equal(commitWorkSession(tabBreakA, skippedBreak, concurrentStorage).status, 'saved');
  const nextRun = startNextPhase(skippedBreak, 2_030_000, 'shared-next-focus');
  assert.equal(commitWorkSession(skippedBreak, nextRun, concurrentStorage).status, 'saved');
  const staleBreakFinish = reconcileWork(tabBreakB, tabBreakB.current.deadline + 1);
  assert.equal(commitWorkSession(tabBreakB, staleBreakFinish, concurrentStorage).status, 'conflict');
  const latest = readWorkSession(concurrentStorage);
  assert.equal(latest.current.id, 'shared-next-focus');
  assert.equal(latest.current.phase, 'focus');
  assert.equal(latest.completedCount, 1);
  assert.equal(latest.history.length, 1);
}

console.log('Work session v1/v2: migration, presets, custom timers, four-tomato cycles, breaks, notices, bounded history, offline recovery and multi-tab CAS passed.');
