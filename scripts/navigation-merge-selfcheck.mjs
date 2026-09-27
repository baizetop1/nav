import assert from 'node:assert/strict';
import { mergeNavigationData } from '../src/lib/navigationMerge.ts';

const category = { id: 'tools', name: '工具', order: 1 };
const a = { id: 'a', name: 'A', description: '', url: 'https://a.example', categoryId: 'tools', tags: [] };
const b = { id: 'b', name: 'B', description: '', url: 'https://b.example', categoryId: 'tools', tags: [] };
const layoutA = { siteId: 'a', order: 1, size: 'normal', width: 1, height: 1 };
const baseline = { sites: [a], categories: [category], layout: [layoutA] };

const localDeletion = mergeNavigationData(baseline, { ...baseline, sites: [], layout: [] }, baseline);
assert.deepEqual(localDeletion.data.sites, [], 'a local deletion must not be resurrected by unchanged remote data');
assert.deepEqual(localDeletion.data.layout, []);

const remoteDeletion = mergeNavigationData(baseline, baseline, { ...baseline, sites: [], layout: [] });
assert.deepEqual(remoteDeletion.data.sites, [], 'a remote deletion must apply when local data is unchanged');

const remoteAddition = mergeNavigationData(baseline, baseline, {
  ...baseline,
  sites: [a, b],
  layout: [layoutA, { ...layoutA, siteId: 'b', order: 2 }],
});
assert.deepEqual(remoteAddition.data.sites.map(site => site.id), ['a', 'b']);

const conflict = mergeNavigationData(
  baseline,
  { ...baseline, sites: [{ ...a, name: '本地 A' }] },
  { ...baseline, sites: [{ ...a, name: '远端 A' }] },
);
assert.equal(conflict.data.sites[0].name, '本地 A');
assert.equal(conflict.conflicts, 1);

const noDanglingLayout = mergeNavigationData(
  baseline,
  { ...baseline, layout: [...baseline.layout, { ...layoutA, siteId: 'missing', order: 2 }] },
  baseline,
);
assert.deepEqual(noDanglingLayout.data.layout.map(item => item.siteId), ['a']);

console.log('Navigation merge: additions, edits, deletions, conflicts and dangling layouts passed.');
