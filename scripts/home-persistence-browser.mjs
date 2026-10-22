import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.BAIZE_PLAYWRIGHT_PATH || 'playwright');
const base = new URL(process.env.BAIZE_APP_URL || 'http://127.0.0.1:5189/nav/');
base.hash = ''; base.search = '';
const output = new URL('../artifacts/home-persistence/', import.meta.url);
await mkdir(output, { recursive: true });
const sourceJson = async path => JSON.parse(await readFile(new URL('../' + path, import.meta.url), 'utf8'));
const navigation = { sites: await sourceJson('src/data/sites.json'), categories: await sourceJson('src/data/categories.json'), layout: await sourceJson('src/data/layout.json') };
const commonId = navigation.categories.find(item => item.id === 'common' || item.name === '常用网站').id;
while (navigation.sites.filter(site => site.categoryId === commonId).length < 10) {
  const id = 'home-fixture-common-' + navigation.sites.length;
  navigation.sites.push({ id, name: '本机常用保留样例 ' + id, url: 'https://example.com/' + id, description: '隔离验收样例', categoryId: commonId, tags: [] });
  navigation.layout.push({ siteId: id, order: navigation.layout.length, size: 'normal' });
}
const commonSites = navigation.sites.filter(site => site.categoryId === commonId);
const monthlyLeader = commonSites[0];
const dailyLeader = navigation.sites.find(site => site.categoryId !== commonId);
assert.ok(dailyLeader && commonSites.length > 8);
const timestamp = Date.parse('2026-10-22T04:00:00.000Z');
const today = '2026-10-22';
const todayClicks = Object.fromEntries(commonSites.slice(0, 10).map((site, index) => [site.id, { count: index + 1, lastClicked: timestamp - index * 1000 }]));
todayClicks[dailyLeader.id] = { count: 40, lastClicked: timestamp };
todayClicks['deleted-site-fixture'] = { count: 9999, lastClicked: timestamp };
const clickStats = { version: 2, days: {
  [today]: { clicks: todayClicks },
  '2026-10-01': { clicks: { [monthlyLeader.id]: { count: 70, lastClicked: Date.parse('2026-10-01T04:00:00Z') }, [dailyLeader.id]: { count: 3, lastClicked: Date.parse('2026-10-01T04:00:00Z') } } },
  '2026-09-30': { clicks: { [dailyLeader.id]: { count: 1000, lastClicked: Date.parse('2026-09-30T04:00:00Z') } } },
  '2026-10-23': { clicks: { [dailyLeader.id]: { count: 900, lastClicked: Date.parse('2026-10-23T04:00:00Z') } } },
} };
const workState = {
  version: 2, task: '保留的工作任务与短休息', minutes: 50, siteIds: [], current: null,
  history: [{ id: 'completed-fixture', task: '已经完成的工作', endedAt: timestamp - 600_000, focusedMs: 50 * 60_000, completed: true }],
  shortBreakMinutes: 10, longBreakMinutes: 20, preset: '50/10', background: 'paper', sound: false, completedCount: 2,
  ambientTrack: 'stream', ambientVolume: 30, nextPhase: 'short-break',
  notice: { id: 'completed-fixture:completed', runId: 'completed-fixture', phase: 'focus', endedAt: timestamp - 600_000 },
};
const workKey = 'baize_work_session_v1', workExpandedKey = 'nav_work_session_expanded_v1';
const buildA = 'build-' + 'a'.repeat(20), buildB = 'build-' + 'b'.repeat(20), reportOnlyBuild = 'build-' + 'd'.repeat(20);
const activeApp = 'app-' + 'c'.repeat(20);
const browser = await chromium.launch({ channel: 'msedge', headless: true });

async function fixtureContext(width, pwa = false) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block', reducedMotion: 'reduce', timezoneId: 'Asia/Shanghai' });
  const writes = [];
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(request.method() + ' ' + request.url());
    return url.origin === base.origin ? route.continue() : route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
  });
  await context.addInitScript(({ navigation, clickStats, workState, pwa, buildA }) => {
    if (!localStorage.getItem('home-persistence-fixture-seeded')) {
      localStorage.setItem('home-persistence-fixture-seeded', 'yes');
      localStorage.setItem('nav_cms_draft', JSON.stringify(navigation));
      localStorage.setItem('nav_click_stats_v2', JSON.stringify(clickStats));
      localStorage.setItem('baize_work_session_v1', JSON.stringify(workState));
      if (pwa) localStorage.setItem('nav_work_session_expanded_v1', 'false');
      localStorage.setItem('nav_translator_collapsed', 'true');
      localStorage.setItem('nav_hot_feed_collapsed', 'true');
      localStorage.setItem('nav_temporary_visits_collapsed', 'true');
    }
    if (!pwa) return;
    if (sessionStorage.getItem('home-pwa-waiting') === null) sessionStorage.setItem('home-pwa-waiting', buildA);
    const container = new EventTarget();
    const registration = new EventTarget();
    const fixture = { queryCount: 0, registered: false, activations: 0 };
    const makeWorker = (buildId, state = 'installed', appVersion = 'app-' + buildId.replace(/^build-/, '')) => {
      const worker = new EventTarget();
      worker.state = state;
      worker.scriptURL = location.origin + '/nav/sw.js';
      worker.postMessage = (message, ports = []) => {
        if (message?.type === 'GET_BUILD_ID') {
          fixture.queryCount += 1;
          queueMicrotask(() => ports[0]?.postMessage({ type: 'BUILD_ID', buildId, appVersion }));
        } else if (message?.type === 'ACTIVATE_UPDATE') {
          fixture.activations += 1;
          sessionStorage.setItem('home-pwa-active', buildId);
          sessionStorage.setItem('home-pwa-active-app', appVersion);
          sessionStorage.setItem('home-pwa-waiting', '');
          registration.waiting = null;
          worker.state = 'activated';
          container.controller = worker;
          queueMicrotask(() => container.dispatchEvent(new Event('controllerchange')));
        }
      };
      return worker;
    };
    const currentBuild = sessionStorage.getItem('home-pwa-active') || 'build-' + 'c'.repeat(20);
    container.controller = makeWorker(currentBuild, 'activated', sessionStorage.getItem('home-pwa-active-app') || 'app-' + currentBuild.replace(/^build-/, ''));
    const initialWaiting = sessionStorage.getItem('home-pwa-waiting');
    registration.waiting = initialWaiting ? makeWorker(initialWaiting, 'installed', sessionStorage.getItem('home-pwa-waiting-app') || 'app-' + initialWaiting.replace(/^build-/, '')) : null;
    registration.installing = null;
    registration.active = container.controller;
    registration.scope = location.origin + '/nav/';
    registration.update = async () => {};
    container.register = async () => { fixture.registered = true; return registration; };
    container.getRegistration = async () => registration;
    container.getRegistrations = async () => [registration];
    container.ready = Promise.resolve(registration);
    fixture.publish = (buildId, appVersion = 'app-' + buildId.replace(/^build-/, '')) => {
      sessionStorage.setItem('home-pwa-waiting', buildId);
      sessionStorage.setItem('home-pwa-waiting-app', appVersion);
      const worker = makeWorker(buildId, 'installing', appVersion);
      registration.waiting = worker;
      registration.installing = worker;
      registration.dispatchEvent(new Event('updatefound'));
      worker.state = 'installed';
      worker.dispatchEvent(new Event('statechange'));
    };
    fixture.clearWaiting = () => {
      sessionStorage.setItem('home-pwa-waiting', '');
      registration.waiting = null;
      container.dispatchEvent(new Event('controllerchange'));
    };
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: container });
    window.__homePwaFixture = fixture;
  }, { navigation, clickStats, workState, pwa, buildA });
  return { context, writes };
}
async function assertFits(page, message) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(dimensions.scroll <= dimensions.width + 1, message + ': horizontal overflow');
}
const navigationSnapshot = page => page.evaluate(() => JSON.parse(localStorage.getItem('nav_cms_draft')));
const workSnapshot = page => page.evaluate(() => JSON.parse(localStorage.getItem('baize_work_session_v1')));

try {
  for (const width of [1440, 390]) {
    const { context, writes } = await fixtureContext(width);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date(timestamp) });
    try {
      await page.goto(base.href);
      const beforeNavigation = await navigationSnapshot(page);
      const ranking = page.getByRole('region', { name: '访问排行', exact: true });
      await ranking.waitFor();
      assert.equal(await page.locator('#' + commonId + ' .site-card').count(), commonSites.length, 'all original common websites remain, not just top eight');
      for (const site of commonSites) await page.locator('#' + commonId).getByRole('link', { name: '打开 ' + site.name, exact: true }).waitFor();
      assert.equal(await ranking.locator('[data-ranking-site]').count(), 8, 'ranking is its own top-eight view');
      assert.equal(await ranking.locator('[data-ranking-site]').first().getAttribute('data-ranking-site'), dailyLeader.id);
      assert.equal(await ranking.locator('[data-ranking-site="deleted-site-fixture"]').count(), 0, 'removed websites are not ranked');
      const leader = ranking.locator('[data-ranking-site=' + JSON.stringify(dailyLeader.id) + ']');
      assert.equal(await leader.locator('[data-ranking-count="day"]').textContent(), '本日 40 次');
      assert.equal(await leader.locator('[data-ranking-count="month"]').textContent(), '本月 43 次', 'natural month excludes prior month and future dates');
      await ranking.getByRole('tab', { name: '本月', exact: true }).click();
      assert.equal(await ranking.locator('[data-ranking-site]').first().getAttribute('data-ranking-site'), monthlyLeader.id);
      assert.equal(await ranking.locator('[data-ranking-site=' + JSON.stringify(monthlyLeader.id) + '] [data-ranking-count="month"]').textContent(), '本月 71 次');
      await ranking.getByRole('tab', { name: '本日', exact: true }).click();
      const [popup] = await Promise.all([page.waitForEvent('popup'), leader.getByRole('link', { name: '从访问排行打开 ' + dailyLeader.name, exact: true }).click()]);
      await popup.close();
      await page.waitForFunction(({ key, id, today }) => JSON.parse(localStorage.getItem(key)).days[today].clicks[id].count === 41, { key: 'nav_click_stats_v2', id: dailyLeader.id, today });
      assert.equal(await leader.locator('[data-ranking-count="day"]').textContent(), '本日 41 次', 'one ranking click records once');
      assert.deepEqual(await navigationSnapshot(page), beforeNavigation, 'ranking does not edit published navigation or local draft');
      assert.equal(await page.locator('#' + commonId + ' .site-card').count(), commonSites.length);
      await assertFits(page, 'ranking ' + width);
      await ranking.screenshot({ path: fileURLToPath(new URL('ranking-' + width + '.png', output)) });

      const work = page.getByRole('region', { name: '工作会话', exact: true });
      assert.equal(await work.count(), 0, 'a completion notice and next break alone do not automatically expand the work panel');
      await page.locator('[data-home-tool="work-session"]').click();
      await work.waitFor();
      assert.equal(await work.getByLabel('当前工作任务').inputValue(), workState.task);
      if (width === 390) {
        const taskBounds = await work.getByLabel('当前工作任务').boundingBox();
        assert.ok(taskBounds && taskBounds.width >= 250, 'mobile work task input has a usable full-row width');
      }
      await work.getByRole('button', { name: '开始休息', exact: true }).waitFor();
      const savedWork = await workSnapshot(page);
      await work.getByRole('button', { name: '收起工作会话', exact: true }).click();
      await work.waitFor({ state: 'detached' });
      assert.equal(await page.evaluate(key => localStorage.getItem(key), workExpandedKey), 'false');
      await page.reload();
      await ranking.waitFor();
      assert.equal(await work.count(), 0, 'closed work session stays closed even with short-break nextPhase and completion notice');
      const retained = await workSnapshot(page);
      for (const field of ['task', 'current', 'completedCount', 'history', 'notice', 'nextPhase', 'ambientTrack', 'ambientVolume']) assert.deepEqual(retained[field], savedWork[field], 'closing does not erase ' + field);
      await page.locator('[data-home-tool="work-session"]').click();
      await work.waitFor();
      assert.equal(await work.getByLabel('当前工作任务').inputValue(), workState.task);
      await work.getByRole('button', { name: '开始休息', exact: true }).waitFor();
      await work.screenshot({ path: fileURLToPath(new URL('work-reopened-' + width + '.png', output)) });
      await work.getByRole('button', { name: '收起工作会话', exact: true }).click();
      await page.reload();
      await ranking.waitFor();
      assert.equal(await work.count(), 0, 'closing remains sticky over repeated refreshes');

      // A still-running timer is recoverable when there is no explicit collapsed preference.
      await page.evaluate(({ state, key, expandedKey, timestamp }) => {
        const next = { ...state, nextPhase: 'focus', notice: null, current: { id: 'active-fixture', task: '正在进行的工作可恢复', phase: 'focus', minutes: 25, siteIds: [], startedAt: timestamp - 60_000, remainingMs: 24 * 60_000, deadline: timestamp + 24 * 60_000 } };
        localStorage.setItem(key, JSON.stringify(next));
        localStorage.removeItem(expandedKey);
      }, { state: workState, key: workKey, expandedKey: workExpandedKey, timestamp });
      await page.reload();
      await work.getByRole('button', { name: '暂停', exact: true }).waitFor();
      await work.getByRole('button', { name: '暂停', exact: true }).click();
      await work.getByRole('button', { name: '继续', exact: true }).waitFor();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('baize_work_session_v1')).current?.deadline === null);
      const paused = await workSnapshot(page);
      await page.reload();
      await work.getByRole('button', { name: '继续', exact: true }).waitFor();
      assert.equal((await workSnapshot(page)).current.remainingMs, paused.current.remainingMs, 'collapse fix preserves timer recovery');
      await work.getByRole('button', { name: '结束并记录', exact: true }).click();
      await work.getByRole('button', { name: '收起工作会话', exact: true }).click();
      await page.reload();
      await page.getByRole('button', { name: '整理入口', exact: true }).waitFor();
      assert.equal(await work.count(), 0);
      assert.deepEqual(errors, [], 'no page errors');
      assert.deepEqual(writes, [], 'no real API or server writes');
      console.log('PASS ' + width + 'px: independent day/month visit ranking, original common sites retained, exactly-one visit, collapsed work persistence and active timer recovery.');
    } finally { await context.close(); }

    const pwaFixture = await fixtureContext(width, true);
    const pwaPage = await pwaFixture.context.newPage(), pwaErrors = [];
    pwaPage.on('pageerror', error => pwaErrors.push(error.message));
    try {
      await pwaPage.goto(base.href);
      const notice = pwaPage.getByRole('status').filter({ hasText: '新版本已准备好' });
      await notice.waitFor();
      const pwaNavigationBefore = await navigationSnapshot(pwaPage);
      await notice.getByRole('button', { name: '稍后刷新', exact: true }).click();
      await notice.waitFor({ state: 'detached' });
      assert.ok(await pwaPage.evaluate(() => localStorage.getItem('baize_app_update_dismissed_v1')), 'dismissal is versioned and saved');
      await pwaPage.reload();
      await pwaPage.waitForFunction(() => window.__homePwaFixture?.queryCount > 0);
      await pwaPage.waitForTimeout(100);
      assert.equal(await notice.count(), 0, 'same waiting build does not pop up again on refresh');

      const anotherTab = await pwaFixture.context.newPage();
      await anotherTab.goto(base.href);
      await anotherTab.waitForFunction(() => window.__homePwaFixture?.queryCount > 0);
      await anotherTab.waitForTimeout(100);
      assert.equal(await anotherTab.getByRole('status').filter({ hasText: '新版本已准备好' }).count(), 0, 'same dismissed build stays dismissed in another tab');
      await anotherTab.close();

      const beforeReportQuery = await pwaPage.evaluate(() => window.__homePwaFixture.queryCount);
      await pwaPage.evaluate(({ buildId, appVersion }) => window.__homePwaFixture.publish(buildId, appVersion), { buildId: reportOnlyBuild, appVersion: activeApp });
      await pwaPage.waitForFunction(count => window.__homePwaFixture.queryCount > count, beforeReportQuery);
      await pwaPage.waitForTimeout(100);
      assert.equal(await notice.count(), 0, 'data-only cache build does not prompt a page update when app UI is unchanged');

      await pwaPage.evaluate(buildId => window.__homePwaFixture.publish(buildId), buildB);
      await notice.waitFor();
      await assertFits(pwaPage, 'PWA notice ' + width);
      await pwaPage.screenshot({ path: fileURLToPath(new URL('update-new-build-' + width + '.png', output)) });
      await Promise.all([pwaPage.waitForEvent('load'), notice.getByRole('button', { name: '保存后更新', exact: true }).click()]);
      await pwaPage.getByRole('button', { name: '整理入口', exact: true }).waitFor();
      await pwaPage.waitForFunction(() => window.__homePwaFixture?.registered);
      assert.equal(await pwaPage.evaluate(() => sessionStorage.getItem('home-pwa-active')), buildB);
      assert.equal(await pwaPage.evaluate(() => sessionStorage.getItem('baize_app_update_ready')), null, 'legacy ready flag is cleared after activation');
      assert.equal(await notice.count(), 0, 'activation and reload do not show the old update notice');
      await pwaPage.evaluate(() => sessionStorage.setItem('baize_app_update_ready', 'true'));
      await pwaPage.reload();
      await pwaPage.getByRole('button', { name: '整理入口', exact: true }).waitFor();
      await pwaPage.waitForFunction(() => window.__homePwaFixture?.registered);
      assert.equal(await notice.count(), 0);
      assert.equal(await pwaPage.evaluate(() => sessionStorage.getItem('baize_app_update_ready')), null, 'a historical legacy flag cannot revive a cleared notice');
      assert.deepEqual(await navigationSnapshot(pwaPage), pwaNavigationBefore, 'updating does not alter navigation');
      assert.deepEqual(pwaErrors, []);
      assert.deepEqual(pwaFixture.writes, []);
      console.log('PASS ' + width + 'px: same-build dismissal survives refresh/tabs, a genuinely new build notifies, explicit activation clears stale update state without editing data.');
    } finally { await pwaFixture.context.close(); }
  }
} finally { await browser.close(); }
