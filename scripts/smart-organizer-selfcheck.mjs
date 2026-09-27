import assert from 'node:assert/strict';
import {
  analyzeNavigation, applyOrganizerChanges, organizerUrlKey, previewOrganizerBatch,
  removeDuplicateSites, suggestImportMetadata, suggestSiteCategory,
} from '../src/lib/smartOrganizer.ts';

const makeSite = (id, url, extra = {}) => ({ id, url, name: id, categoryId: 'tools', description: '', tags: [], ...extra });
const data = {
  categories: [{ id: 'tools', name: '工具', order: 1 }, { id: 'ai', name: 'AI', order: 2 }],
  sites: [
    makeSite('one', 'https://EXAMPLE.com:443', { description: 'Original', tags: ['old'] }),
    makeSite('two', 'https://example.com/'),
    makeSite('query', 'https://example.com/?q=one'),
    makeSite('query2', 'https://example.com/?q=two'),
    makeSite('hash', 'https://example.com/#one'),
    makeSite('hash2', 'https://example.com/#two'),
    makeSite('old', 'https://old.example/'),
    makeSite('unknown', 'https://unknown.example/'),
  ],
  layout: [],
};
data.layout = data.sites.map((site, index) => ({ siteId: site.id, order: index + 1, size: 'normal', x: index % 4, y: Math.floor(index / 4) }));
const now = Date.parse('2026-09-27T12:00:00Z');
const stats = { version: 2, days: { '2026-08-01': { clicks: { old: { count: 1, lastClicked: Date.parse('2026-08-01T12:00:00Z') } } }, '2026-09-26': { clicks: { one: { count: 3, lastClicked: now - 86400_000 } } } } };
const failure = { siteId: 'one', url: 'https://example.com/', status: 404, ok: false, error: 'HTTP 404', checkedAt: new Date(now).toISOString(), source: 'github-actions', consecutiveFailures: 2 };
const analysis = analyzeNavigation(data, [failure, { ...failure, siteId: 'old', url: 'https://old.example/outdated-url' }, { ...failure, siteId: 'hash', url: 'https://example.com/#one', source: 'browser' }], stats, now);
assert.equal(analysis.duplicateGroups.length, 1);
assert.deepEqual(analysis.duplicateGroups[0].sites.map(site => site.id), ['one', 'two']);
assert.equal(analysis.rows.find(row => row.site.id === 'one').issues.includes('unhealthy'), true);
assert.equal(analysis.rows.find(row => row.site.id === 'old').issues.includes('unhealthy'), false, 'report for previous URL must not be reused');
assert.equal(analysis.rows.find(row => row.site.id === 'hash').issues.includes('unhealthy'), false, 'browser check alone never confirms failure');
assert.equal(analysis.rows.find(row => row.site.id === 'old').issues.includes('inactive'), true);
assert.equal(analysis.rows.find(row => row.site.id === 'unknown').issues.includes('inactive'), false);
assert.equal(analysis.rows.find(row => row.site.id === 'unknown').issues.includes('unrecorded'), true);
assert.notEqual(organizerUrlKey('https://example.com/docs'), organizerUrlKey('https://example.com/docs/'));
assert.notEqual(organizerUrlKey('http://example.com'), organizerUrlKey('https://example.com'));
assert.notEqual(organizerUrlKey('https://example.com/?a=1&b=2'), organizerUrlKey('https://example.com/?b=2&a=1'));
assert.equal(organizerUrlKey('javascript:alert(1)'), null);

const original = JSON.stringify(data);
const changes = previewOrganizerBatch(data, ['one', 'two'], { categoryId: 'ai', tagsMode: 'append', tags: ['old', 'new', ' new '], descriptionMode: 'missing', description: 'Updated' });
assert.equal(changes.length, 2);
assert.equal(changes[0].after.description, 'Original');
assert.equal(changes[1].after.description, 'Updated');
assert.deepEqual(changes[0].after.tags, ['old', 'new']);
assert.equal(JSON.stringify(data), original, 'preview must not mutate the draft');
const applied = applyOrganizerChanges(data, changes);
assert.equal(applied.sites.find(site => site.id === 'one').categoryId, 'ai');
assert.equal(applied.sites.find(site => site.id === 'query').categoryId, 'tools');
assert.equal(applied.layout, data.layout);
assert.throws(() => applyOrganizerChanges({ ...data, sites: data.sites.map(site => site.id === 'one' ? { ...site, name: 'changed elsewhere' } : site) }, changes), /预览后已变化/);
assert.throws(() => previewOrganizerBatch(data, ['one'], { categoryId: 'deleted' }), /不存在/);
assert.deepEqual(previewOrganizerBatch(data, ['one'], { tagsMode: 'replace', tags: [] })[0].after.tags, []);
assert.equal(previewOrganizerBatch(data, ['one'], {}).length, 0);

const deduplicated = removeDuplicateSites(data, ['one', 'two'], 'two');
assert.equal(deduplicated.sites.some(site => site.id === 'one'), false);
assert.equal(deduplicated.layout.some(item => item.siteId === 'one'), false);
assert.equal(deduplicated.sites.find(site => site.id === 'two'), data.sites[1], 'retain the chosen site exactly');
assert.throws(() => removeDuplicateSites(data, ['query', 'query2'], 'query'), /重复组已变化/);
assert.throws(() => removeDuplicateSites(data, ['one', 'two'], 'unknown'), /重复组已变化/);
assert.equal(JSON.stringify(data), original, 'deduplication must not mutate the original draft');

assert.equal(suggestSiteCategory(makeSite('new', 'https://example.com/new'), data).categoryId, 'tools');
assert.equal(suggestSiteCategory(makeSite('new', 'https://new.test', { name: 'AI assistant' }), data).categoryId, 'ai');
assert.equal(suggestSiteCategory(makeSite('new', 'https://new.test', { name: 'email' }), data), null, 'short Latin category names must match full words');
const suggestion = suggestImportMetadata({ name: 'Original site', url: 'https://example.com/' }, data);
assert.equal(suggestion.description, 'Original');
assert.equal(suggestion.tags, 'old');
assert.equal(suggestion.category, '工具');
console.log('smart organizer self-check passed');
