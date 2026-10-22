import assert from 'node:assert/strict';
import { getVisitRanking, recordSiteVisit } from '../src/lib/activityStats.ts';

const makeSite = (id, favorite = false) => ({ id, name: id, description: '', url: 'https://example.com/' + id, categoryId: 'common', tags: [], favorite });
const sites = [makeSite('alpha'), makeSite('beta'), makeSite('gamma'), makeSite('favorite-without-click', true)];
const now = new Date(2026, 9, 22, 12), beforeNow = new Date(2026, 9, 22, 10).getTime();
const store = { version: 2, days: {
  '2026-10-01': { clicks: { alpha: { count: 7, lastClicked: 100 }, gamma: { count: 10, lastClicked: 90 } } },
  '2026-10-21': { clicks: { beta: { count: 2, lastClicked: 500 } } },
  '2026-10-22': { clicks: { alpha: { count: 2, lastClicked: beforeNow - 1 }, beta: { count: 2, lastClicked: beforeNow }, removed: { count: 500, lastClicked: beforeNow }, broken: { count: Infinity, lastClicked: beforeNow } } },
  '2026-10-23': { clicks: { alpha: { count: 9999, lastClicked: beforeNow + 86_400_000 } } },
  '2026-11-01': { clicks: { alpha: { count: 9999, lastClicked: beforeNow + 30 * 86_400_000 } } },
  '2026-09-30': { clicks: { beta: { count: 9999, lastClicked: 50 } } },
  '2026-06-01': { clicks: { gamma: { count: 9999, lastClicked: 25 } } },
} };
const saved = JSON.stringify(store), siteOrder = sites.map(site => site.id);
const day = getVisitRanking(store, sites, 'day', now);
assert.deepEqual(day.map(row => row.site.id), ['beta', 'alpha'], 'daily count ties sort by latest click');
assert.deepEqual(day.map(row => [row.count, row.todayCount, row.monthCount]), [[2, 2, 4], [2, 2, 9]]);
const month = getVisitRanking(store, sites, 'month', now);
assert.deepEqual(month.map(row => row.site.id), ['gamma', 'alpha', 'beta']);
assert.deepEqual(month.map(row => [row.count, row.todayCount, row.monthCount]), [[10, 0, 10], [9, 2, 9], [4, 2, 4]]);
assert.equal(JSON.stringify(store), saved, 'ranking never mutates click history');
assert.deepEqual(sites.map(site => site.id), siteOrder, 'ranking never reorders or removes navigation sites');
assert.equal(sites.length, 4, 'the no-click favorite remains in navigation, but is not fabricated into ranking');
assert.deepEqual(getVisitRanking({ version: 2, days: {} }, sites, 'day', now), []);
assert.deepEqual(getVisitRanking({ version: 2, days: {} }, sites, 'month', now), []);
assert.deepEqual(getVisitRanking(store, [], 'month', now), []);
const firstOfMonth = getVisitRanking(store, sites, 'month', new Date(2026, 9, 1, 12));
assert.deepEqual(firstOfMonth.map(row => [row.site.id, row.monthCount]), [['gamma', 10], ['alpha', 7]], 'no future days included');
assert.deepEqual(getVisitRanking(store, sites, 'month', new Date(2026, 10, 1, 12)).map(row => [row.site.id, row.monthCount]), [['alpha', 9999]], 'calendar month resets instead of using rolling 30 days');
assert.deepEqual(getVisitRanking(store, sites, 'day', new Date(2026, 9, 23, 12)).map(row => row.site.id), ['alpha'], 'new local day uses only its own clicks');
const tieStore = { version: 2, days: { '2026-10-22': { clicks: { beta: { count: 2, lastClicked: 100 }, alpha: { count: 2, lastClicked: 100 } } } } };
assert.deepEqual(getVisitRanking(tieStore, [sites[1], sites[0]], 'day', now).map(row => row.site.id), ['alpha', 'beta'], 'final tie uses stable ID, independent of navigation order');
const enormous = { version: 2, days: { '2026-10-21': { clicks: { alpha: { count: Number.MAX_SAFE_INTEGER, lastClicked: 1 } } }, '2026-10-22': { clicks: { alpha: { count: 5, lastClicked: 2 } } } } };
assert.equal(getVisitRanking(enormous, sites, 'month', now)[0].count, Number.MAX_SAFE_INTEGER, 'aggregated counts remain safe integers');
const clicked = recordSiteVisit(store, 'alpha', new Date(2026, 9, 22, 13));
assert.equal(getVisitRanking(clicked, sites, 'day', new Date(2026, 9, 22, 14))[0].todayCount, 3, 'each visit adds one click');
assert.equal(getVisitRanking(clicked, sites, 'month', new Date(2026, 9, 22, 14)).find(row => row.site.id === 'alpha').monthCount, 10);
assert.equal(clicked.days['2026-06-01'], undefined, 'existing 90-day retention remains in effect');
assert.deepEqual(getVisitRanking(store, sites, 'day', new Date('invalid')), []);
console.log('Visit rankings: independent navigation, local day/calendar month, counts, stable ties, future/removed records and 90-day retention: PASS');
