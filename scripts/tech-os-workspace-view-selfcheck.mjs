import assert from 'node:assert/strict';
import { filterTechOsEntities, selectTechOsCollectionEntity } from '../src/services/techOsWorkspaceView.ts';
const items = [
  { id: 'KNOWLEDGE-001', title: 'HTTP 缓存', kind: 'knowledge', status: 'learning', tags: ['network'], body: 'ETag 与缓存验证' },
  { id: 'KNOWLEDGE-002', title: 'TCP 连接', kind: 'knowledge', status: 'stable', tags: ['network'], body: '可靠传输' },
];
assert.equal(selectTechOsCollectionEntity(items, 'QUEST-001'), items[0]);
assert.equal(selectTechOsCollectionEntity(items, 'KNOWLEDGE-002'), items[1]);
assert.equal(selectTechOsCollectionEntity([], 'KNOWLEDGE-002'), undefined);
assert.deepEqual(filterTechOsEntities(items, 'http NETWORK').map(x => x.id), ['KNOWLEDGE-001']);
assert.equal(filterTechOsEntities(items, 'etag')[0], items[0]);
assert.equal(filterTechOsEntities(items, '', 'stable')[0], items[1]);
assert.deepEqual(filterTechOsEntities(items, 'http', 'stable'), []);
assert.deepEqual(filterTechOsEntities(items, 'not found'), []);
assert.equal(items.length, 2);
console.log('Tech OS workspace: scoped selection, ID/title/body/tag search, status filters and empty results passed.');
