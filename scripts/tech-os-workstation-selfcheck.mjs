import assert from 'node:assert/strict';
import { createTechOsIndex } from './build-tech-os-index.mjs';

const index = createTechOsIndex();
const byId = new Map(index.entities.map(entity => [entity.id, entity]));

assert.equal(index.schema, 'tech-os-index/v1');
assert.equal(index.sourceSchema, 'tech-os/v1');
assert.equal(index.entities.length, 17);
assert.equal(index.files.length, 18);
assert.equal(byId.get(index.state.visionId)?.kind, 'vision');
assert.equal(byId.get(index.state.mainRouteId)?.kind, 'route');
assert.equal(byId.get(index.state.currentQuestId)?.status, 'active');
assert.equal(byId.get('ROUTE-001')?.fields.main, true);
assert.deepEqual(byId.get('ROUTE-001')?.fields.quest_ids, [
  'QUEST-001', 'QUEST-002', 'QUEST-003', 'QUEST-004', 'QUEST-005', 'QUEST-006', 'QUEST-007', 'QUEST-008',
]);
assert.equal(index.entities.filter(entity => entity.kind === 'knowledge').length, 1);
assert.equal(index.entities.filter(entity => entity.kind === 'lab').length, 1);
assert.equal(index.entities.filter(entity => entity.kind === 'project').length, 1);
assert.ok(index.entities.every(entity => !pathLooksAbsolute(entity.sourcePath)));
assert.ok(index.entities.every(entity => !Object.hasOwn(entity.fields, 'schema')));
assert.ok(index.files.every(file => file.path.startsWith('tech-os/') && !pathLooksAbsolute(file.path)));
assert.ok(index.files.find(file => file.path === 'tech-os/state.yml')?.content.includes('tech-os-state/v1'));

console.log('Tech OS workstation projection self-check passed');

function pathLooksAbsolute(value) {
  return /^(?:[A-Za-z]:[\\/]|\/)/.test(value);
}
