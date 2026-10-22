import assert from 'node:assert/strict';
import { APP_UPDATE_DISMISSED_KEY, dismissAppUpdate, getAppUpdateSnapshot, watchAppUpdates } from '../src/services/pwaUpdateNotice.ts';
import { activateAppUpdate } from '../src/services/pwaUpdate.ts';

class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}
class FakeWorker extends EventTarget {
  state = 'installed';
  calls = [];
  scriptURL = 'https://example.com/nav/sw.js';
  constructor(buildId, appVersion, responds = true) { super(); this.buildId = buildId; this.appVersion = appVersion; this.responds = responds; }
  postMessage(message, ports) {
    this.calls.push(message.type);
    if (message.type === 'GET_BUILD_ID' && this.responds) ports[0].postMessage({ type: 'BUILD_ID', buildId: this.buildId, appVersion: this.appVersion });
    if (message.type === 'ACTIVATE_UPDATE') this.onActivate?.();
  }
}
class FakeRegistration extends EventTarget {
  installing = null;
  constructor(waiting) { super(); this.waiting = waiting; }
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const originalGlobals = Object.fromEntries(['window', 'localStorage', 'sessionStorage', 'navigator'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const local = new MemoryStorage(), session = new MemoryStorage(), win = new EventTarget();
let reloads = 0;
win.location = { reload: () => { reloads += 1; } };
for (const [key, value] of Object.entries({ window: win, localStorage: local, sessionStorage: session })) Object.defineProperty(globalThis, key, { value, configurable: true });
const container = new EventTarget();
container.controller = new FakeWorker('build-old', 'app-old');
Object.defineProperty(globalThis, 'navigator', { value: { serviceWorker: container }, configurable: true });
const ready = () => getAppUpdateSnapshot().ready;
let stop = () => {};
try {
  // A stale pre-fix session flag cannot itself cause a banner.
  session.setItem('baize_app_update_ready', 'true');
  assert.equal(ready(), false);
  const empty = new FakeRegistration(null);
  stop = watchAppUpdates(empty, container);
  assert.equal(ready(), false); assert.equal(session.getItem('baize_app_update_ready'), null);
  container.dispatchEvent(new Event('controllerchange'));
  assert.equal(ready(), false, 'controllerchange must not manufacture a pending update'); stop();

  const worker = new FakeWorker('build-first', 'app-first'), registration = new FakeRegistration(worker);
  stop = watchAppUpdates(registration, container); await wait(20);
  assert.deepEqual(getAppUpdateSnapshot(), { ready: true, buildId: 'build-first', appVersion: 'app-first' });
  assert.equal(reloads, 0); assert.equal(worker.calls.includes('ACTIVATE_UPDATE'), false, 'watching never activates an update');
  dismissAppUpdate(); assert.equal(ready(), false);
  assert.deepEqual(JSON.parse(local.getItem(APP_UPDATE_DISMISSED_KEY)), ['app-first']); stop();

  // A fresh module models a page reload: this must use persisted preference,
  // rather than accidentally passing because the previous module remembers it.
  const reloaded = await import('../src/services/pwaUpdateNotice.ts?reload-selfcheck');
  stop = reloaded.watchAppUpdates(registration, container); await wait(20);
  assert.equal(reloaded.getAppUpdateSnapshot().ready, false, 'the same dismissed UI build stays dismissed after reload'); stop();

  const next = new FakeWorker('build-next', 'app-next'); registration.waiting = next;
  stop = watchAppUpdates(registration, container); await wait(20);
  assert.equal(ready(), true, 'a genuinely newer UI version is not suppressed');
  assert.equal(getAppUpdateSnapshot().appVersion, 'app-next');
  // The worker may activate in another tab. Clear the old banner and old flag,
  // but never reload this editing page just because the controller changed.
  session.setItem('baize_app_update_ready', 'true'); registration.waiting = null;
  container.controller = next; container.dispatchEvent(new Event('controllerchange'));
  assert.equal(ready(), false); assert.equal(reloads, 0); assert.equal(session.getItem('baize_app_update_ready'), null); stop();

  const reports = new FakeWorker('build-reports-only', 'app-next'); registration.waiting = reports;
  stop = watchAppUpdates(registration, container); await wait(20);
  assert.equal(ready(), false, 'data-only cache builds do not interrupt the same application version'); stop();

  // An older active worker has no ID protocol. Its bounded timeout must not
  // prevent a protocol-aware waiting version from being offered.
  container.controller = new FakeWorker('old-unresponsive', null, false);
  registration.waiting = new FakeWorker('build-after-legacy', 'app-after-legacy');
  stop = watchAppUpdates(registration, container); await wait(850);
  assert.equal(ready(), true); stop();

  registration.waiting = new FakeWorker(null, null, false); container.controller = null;
  stop = watchAppUpdates(registration, container); await wait(850);
  assert.equal(ready(), true); dismissAppUpdate(); stop();
  stop = watchAppUpdates(registration, container); await wait(850);
  assert.equal(ready(), false, 'an unidentified old waiting worker is dismissed for the tab session'); stop();

  // Storage failures degrade to another store/in-memory, never another popup
  // during the same page session and never a write to unrelated draft keys.
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('blocked'); } });
  registration.waiting = new FakeWorker('build-permission', 'app-permission');
  stop = watchAppUpdates(registration, container); await wait(20); dismissAppUpdate();
  assert.equal(ready(), false); assert.ok(session.getItem(APP_UPDATE_DISMISSED_KEY).includes('app-permission')); stop();
  Object.defineProperty(globalThis, 'localStorage', { value: local, configurable: true });
  assert.equal(local.getItem('nav_cms_draft'), null);

  // Activation reloads only after an explicit caller requests it and receives
  // controllerchange; rejection and timeout leave the current page in place.
  const activateWorker = new FakeWorker('build-activate', 'app-activate');
  registration.waiting = activateWorker;
  container.getRegistration = async scope => { assert.equal(scope, '/nav/'); return registration; };
  activateWorker.onActivate = () => queueMicrotask(() => { registration.waiting = null; container.dispatchEvent(new Event('controllerchange')); });
  await activateAppUpdate(); assert.equal(reloads, 1); assert.ok(activateWorker.calls.includes('ACTIVATE_UPDATE'));
  await activateAppUpdate(); assert.equal(reloads, 2, 'an explicit click without a pending worker may safely reload');
  registration.waiting = new FakeWorker('build-fail', 'app-fail');
  registration.waiting.postMessage = () => { throw new Error('postMessage unavailable'); };
  await assert.rejects(activateAppUpdate(), /无法启用/); assert.equal(reloads, 2);
  const realSetTimeout = globalThis.setTimeout;
  registration.waiting = new FakeWorker('build-stuck', 'app-stuck');
  globalThis.setTimeout = (callback, ms, ...args) => { if (ms === 12_000) { queueMicrotask(() => callback(...args)); return realSetTimeout(() => {}, 1); } return realSetTimeout(callback, ms, ...args); };
  try { await assert.rejects(activateAppUpdate(), /等待超时/); assert.equal(reloads, 2); }
  finally { globalThis.setTimeout = realSetTimeout; }
  container.dispatchEvent(new Event('controllerchange')); assert.equal(reloads, 2, 'failed activation removes its reload listener');
  assert.equal([...local.data.keys()].every(key => key === APP_UPDATE_DISMISSED_KEY), true);
  console.log('PWA notices: real UI versions, report-only builds, persistent dismissal, legacy recovery, bounded protocol and explicit activation passed.');
} finally {
  stop();
  for (const [key, descriptor] of Object.entries(originalGlobals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
}
