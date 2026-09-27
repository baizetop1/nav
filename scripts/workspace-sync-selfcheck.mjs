import assert from 'node:assert/strict';
import { captureSharedWorkspace, mergeSharedWorkspace, applySharedWorkspace, parseSharedWorkspace, workspaceFingerprint, configureSharedDefaults, restoreSharedVersion } from '../src/services/workspaceSync.ts';
import { updateReading, loadReading } from '../src/services/readingHistory.ts';
import { encryptInbox, decryptInbox } from '../src/services/inboxSync.ts';
import { emptyStudyProgressStore } from '../src/services/techOsStudyProgress.ts';
import { localDateKey } from '../src/lib/activityStats.ts';
const memory = () => { const data = new Map(); return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }; };
const a = memory(), b = memory();
configureSharedDefaults({ theme: 'light', nav_temp_text: '' });
a.setItem('theme', 'dark'); a.setItem('nav_temp_text', '电脑上的旧笔记'); b.setItem('theme', 'light'); b.setItem('nav_temp_text', '');
let A = captureSharedWorkspace(a), B = captureSharedWorkspace(b);
let merged = mergeSharedWorkspace(A, B);
assert.equal(merged.entries.theme.value, 'dark', 'fresh default must not override established settings');
applySharedWorkspace(merged, a); applySharedWorkspace(merged, b);
a.setItem('nav_temp_text', '电脑端新的笔记'); b.setItem('scene_mode', 'study');
updateReading('https://baizeone.top/p/a/', '文章 A', { position: 42, readLater: true }, a, new Date('2026-09-08T01:00:00Z'));
updateReading('https://baizeone.top/p/b/', '文章 B', { readLater: true }, b, new Date('2026-09-08T01:00:00Z'));
A = captureSharedWorkspace(a, new Date('2026-09-08T02:00:00Z')); B = captureSharedWorkspace(b, new Date('2026-09-08T02:00:00Z'));
merged = mergeSharedWorkspace(A, B);
assert.deepEqual(merged, mergeSharedWorkspace(B, A));
assert.equal(merged.entries.nav_temp_text.value, '电脑端新的笔记');
applySharedWorkspace(merged, b);
assert.equal(b.getItem('scene_mode'), 'study');
assert.equal(loadReading(b).items['https://baizeone.top/p/a/'].position, 42);
assert.equal(Object.keys(loadReading(b).items).length, 2);
assert.equal(workspaceFingerprint(captureSharedWorkspace(b)), workspaceFingerprint(merged));
updateReading('https://baizeone.top/p/a/', '文章 A', { deletedAt: '2026-09-08T03:00:00Z' }, b, new Date('2026-09-08T03:00:00Z'));
const tombstone = mergeSharedWorkspace(A, captureSharedWorkspace(b));
applySharedWorkspace(tombstone, a);
assert.ok(loadReading(a).items['https://baizeone.top/p/a/'].deletedAt);
const readingKey = 'reading:https://baizeone.top/p/a/';
const deleted = tombstone.entries[readingKey];
const concurrentRead = { ...deleted, value: JSON.stringify({ ...JSON.parse(deleted.value), deletedAt: undefined, position: 80 }) };
assert.equal(mergeSharedWorkspace(tombstone, { version: 1, entries: { [readingKey]: concurrentRead }, history: {} }).entries[readingKey].value, deleted.value, 'a concurrent read must not resurrect a deleted record at the same timestamp');
const oldTimestamp = loadReading(a).items['https://baizeone.top/p/a/'].updatedAt;
const deliberateRestore = updateReading('https://baizeone.top/p/a/', '文章 A', { readLater: true }, a, new Date('2020-01-01'));
assert.ok(deliberateRestore.updatedAt > oldTimestamp && !deliberateRestore.deletedAt, 'intentional edits advance the timestamp even if the device clock is behind');
const sharedEntry = (value, updatedAt) => ({ value: JSON.stringify(value), updatedAt });
const concurrentStores = (key, baseline, left, right) => {
  const baseEntry = sharedEntry(baseline, '2026-09-08T04:00:00.000Z');
  return [
    { version: 1, entries: { [key]: sharedEntry(left, '2026-09-08T05:00:00.000Z') }, history: { [key]: [baseEntry] } },
    { version: 1, entries: { [key]: sharedEntry(right, '2026-09-08T06:00:00.000Z') }, history: { [key]: [baseEntry] } },
  ];
};

const category = { id: 'tools', name: '工具', order: 0 };
const baseNavigation = {
  sites: [{ id: 'base', name: 'Base', description: '', url: 'https://base.example/', categoryId: 'tools', tags: [] }],
  categories: [category],
  layout: [],
};
const leftNavigation = {
  ...baseNavigation,
  sites: [...baseNavigation.sites, { id: 'left', name: 'Left', description: '', url: 'https://left.example/', categoryId: 'tools', tags: [] }],
};
const rightNavigation = {
  ...baseNavigation,
  sites: [...baseNavigation.sites, { id: 'right', name: 'Right', description: '', url: 'https://right.example/', categoryId: 'tools', tags: [] }],
};
const [navLeft, navRight] = concurrentStores('nav_cms_draft', baseNavigation, leftNavigation, rightNavigation);
const mergedNavigationWorkspace = mergeSharedWorkspace(navLeft, navRight);
assert.deepEqual(mergedNavigationWorkspace, mergeSharedWorkspace(navRight, navLeft), 'navigation merge must be commutative');
assert.deepEqual(JSON.parse(mergedNavigationWorkspace.entries.nav_cms_draft.value).sites.map(site => site.id).sort(), ['base', 'left', 'right']);
assert.ok(mergedNavigationWorkspace.history.nav_cms_draft.some(version => version.value === navLeft.entries.nav_cms_draft.value), 'navigation alternatives remain recoverable');

const today = localDateKey(new Date());
const clickStore = count => ({ version: 2, days: { [today]: { clicks: { github: { count, lastClicked: 1_000 + count } } } } });
const [clickLeft, clickRight] = concurrentStores('nav_click_stats_v2', clickStore(10), clickStore(12), clickStore(13));
const mergedClicksWorkspace = mergeSharedWorkspace(clickLeft, clickRight);
assert.deepEqual(mergedClicksWorkspace, mergeSharedWorkspace(clickRight, clickLeft), 'click merge must be commutative');
assert.equal(JSON.parse(mergedClicksWorkspace.entries.nav_click_stats_v2.value).days[today].clicks.github.count, 15, 'counter merge adds only each device delta from the common count');
const repeatedClickMerge = mergeSharedWorkspace(mergedClicksWorkspace, clickLeft);
assert.equal(JSON.parse(repeatedClickMerge.entries.nav_click_stats_v2.value).days[today].clicks.github.count, 15, 're-merging an already included counter must not amplify it');
const noBaseClicks = mergeSharedWorkspace(
  { version: 1, entries: { nav_click_stats_v2: sharedEntry(clickStore(5), '2026-09-08T05:00:00.000Z') }, history: {} },
  { version: 1, entries: { nav_click_stats_v2: sharedEntry(clickStore(7), '2026-09-08T06:00:00.000Z') }, history: {} },
);
assert.equal(JSON.parse(noBaseClicks.entries.nav_click_stats_v2.value).days[today].clicks.github.count, 7, 'without a common snapshot counters use max instead of unsafe addition');

const baseTranslation = {
  id: 'base-translation',
  sourceText: 'hello',
  translatedText: '你好',
  sourceLanguage: 'en',
  targetLanguage: 'zh',
  createdAt: '2026-09-08T04:00:00.000Z',
};
const leftTranslation = { ...baseTranslation, id: 'left-translation', sourceText: 'left', translatedText: '左', createdAt: '2026-09-08T05:00:00.000Z' };
const rightTranslation = { ...baseTranslation, id: 'right-translation', sourceText: 'right', translatedText: '右', createdAt: '2026-09-08T06:00:00.000Z' };
const [translationLeft, translationRight] = concurrentStores(
  'nav_translation_history',
  [baseTranslation],
  [baseTranslation, leftTranslation],
  [baseTranslation, rightTranslation],
);
const mergedTranslationWorkspace = mergeSharedWorkspace(translationLeft, translationRight);
assert.deepEqual(mergedTranslationWorkspace, mergeSharedWorkspace(translationRight, translationLeft), 'translation merge must be commutative');
assert.deepEqual(JSON.parse(mergedTranslationWorkspace.entries.nav_translation_history.value).map(item => item.id).sort(), ['base-translation', 'left-translation', 'right-translation']);

const visitStore = count => ({
  version: 1,
  records: [{ url: 'https://example.com/path', days: { [today]: { count, lastVisitedAt: 2_000 + count } } }],
});
const [visitLeft, visitRight] = concurrentStores('nav_temporary_url_visits_v1', visitStore(4), visitStore(5), visitStore(6));
const mergedVisitsWorkspace = mergeSharedWorkspace(visitLeft, visitRight);
assert.deepEqual(mergedVisitsWorkspace, mergeSharedWorkspace(visitRight, visitLeft), 'temporary-visit merge must be commutative');
assert.equal(JSON.parse(mergedVisitsWorkspace.entries.nav_temporary_url_visits_v1.value).records[0].days[today].count, 7, 'temporary visits add only deltas from the common count');
assert.equal(JSON.parse(mergeSharedWorkspace(mergedVisitsWorkspace, visitLeft).entries.nav_temporary_url_visits_v1.value).records[0].days[today].count, 7, 'temporary-visit re-merge must not amplify counts');

const validTranslationWorkspace = { version: 1, entries: { nav_translation_history: sharedEntry([leftTranslation], '2026-09-08T05:00:00.000Z') }, history: {} };
const malformedTranslationWorkspace = { version: 1, entries: { nav_translation_history: { value: '{}', updatedAt: '2026-09-08T07:00:00.000Z' } }, history: {} };
assert.deepEqual(
  JSON.parse(mergeSharedWorkspace(validTranslationWorkspace, malformedTranslationWorkspace).entries.nav_translation_history.value),
  [leftTranslation],
  'malformed structured data must not replace the valid side',
);
const oversizedUtf8Storage = memory();
oversizedUtf8Storage.setItem('nav_temp_text', '中'.repeat(200_000));
assert.throws(
  () => captureSharedWorkspace(oversizedUtf8Storage),
  /UTF-8 字节/,
  'shared entry limits must count UTF-8 bytes and surface oversized capture',
);
const payload = await encryptInbox([], 'test-password-123456', new Date(), emptyStudyProgressStore(), merged);
assert.deepEqual((await decryptInbox(payload, 'test-password-123456')).workspace, merged);
await assert.rejects(() => decryptInbox(payload, 'wrong-password-1234'));
assert.equal(parseSharedWorkspace({ version: 1, entries: { github_token: { value: 'secret', updatedAt: new Date().toISOString() } }, history: {} }), null);
restoreSharedVersion('nav_temp_text', merged.history.nav_temp_text.find(entry => entry.value === '电脑上的旧笔记'), b);
assert.equal(b.getItem('nav_temp_text'), '电脑上的旧笔记');
console.log('Unified sync: two devices, fresh defaults, settings/history, per-article reading, tombstones, encryption and recovery passed.');
const rssLeft = { version: 1, entries: { baize_rss_reader_v1: sharedEntry({ version: 1, items: { first: { read: true, favorite: false, updatedAt: '2026-09-27T01:00:00.000Z' } } }, '2026-09-27T02:00:00.000Z') }, history: {} };
const rssRight = { version: 1, entries: { baize_rss_reader_v1: sharedEntry({ version: 1, items: { second: { read: false, favorite: true, updatedAt: '2026-09-27T01:00:00.000Z' }, first: { read: true, favorite: true, updatedAt: '2026-09-27T02:00:00.000Z' } } }, '2026-09-27T03:00:00.000Z') }, history: {} };
const rssMerged = mergeSharedWorkspace(rssLeft, rssRight);
assert.deepEqual(rssMerged, mergeSharedWorkspace(rssRight, rssLeft));
const rssItems = JSON.parse(rssMerged.entries.baize_rss_reader_v1.value).items;
assert.equal(Object.keys(rssItems).length, 2);
assert.equal(rssItems.first.favorite, true);
assert.equal(rssItems.second.favorite, true);
const workDevice = memory(); workDevice.setItem('baize_work_session_v1', JSON.stringify({ current: { task: 'device-only timer' } }));
assert.equal(captureSharedWorkspace(workDevice).entries.baize_work_session_v1, undefined, 'active work timers must not start on other devices through sync');
console.log('New workspace data: RSS per-article merge and device-only work timers passed.');
