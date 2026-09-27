import assert from 'node:assert/strict';
import {
  PENDING_DEPLOYMENT_KEY,
  clearPendingDeployment,
  loadPendingDeployment,
  parsePendingDeployment,
  savePendingDeployment,
} from '../src/lib/deploymentState.ts';

const now = Date.now();
const pending = {
  repository: { owner: 'baizetop1', repo: 'nav', branch: 'main' },
  sha: 'a'.repeat(40),
  commitUrl: 'https://github.com/baizetop1/nav/commit/' + 'a'.repeat(40),
  createdAt: new Date(now).toISOString(),
};
assert.deepEqual(parsePendingDeployment(pending, now), pending);
assert.equal(parsePendingDeployment({ ...pending, sha: 'bad' }, now), null);
assert.equal(parsePendingDeployment({ ...pending, createdAt: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString() }, now), null);

const values = new Map();
const storage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
};
savePendingDeployment(pending, storage);
assert.deepEqual(loadPendingDeployment(storage, now), pending);
clearPendingDeployment(storage);
assert.equal(values.has(PENDING_DEPLOYMENT_KEY), false);

values.set(PENDING_DEPLOYMENT_KEY, '{broken');
assert.equal(loadPendingDeployment(storage, now), null);
console.log('Deployment state: validation, persistence, expiry and cleanup passed.');
