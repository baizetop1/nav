import assert from 'node:assert/strict';
import { verifyRepositoryAccess } from '../src/services/github.ts';

const target = { owner: 'baizetop1', repo: 'nav', branch: 'main' };
const token = 'github_pat_123456789012345678901234567890';
const calls = [];
globalThis.fetch = async (input, init) => {
  const url = String(input);
  calls.push({ url, authorization: new Headers(init?.headers).get('Authorization') });
  if (url.endsWith('/repos/baizetop1/nav')) {
    return Response.json({ full_name: 'baizetop1/nav', permissions: { push: true } });
  }
  if (url.endsWith('/repos/baizetop1/nav/branches/main')) {
    return Response.json({ name: 'main' });
  }
  return Response.json({ message: 'not found' }, { status: 404 });
};

assert.deepEqual(await verifyRepositoryAccess(target, token), {
  fullName: 'baizetop1/nav',
  branch: 'main',
  canPush: true,
});
assert.equal(calls.length, 2);
assert.equal(calls[0].authorization, `Bearer ${token}`);

globalThis.fetch = async () => Response.json({
  full_name: 'baizetop1/nav',
  permissions: { push: false },
});
await assert.rejects(
  () => verifyRepositoryAccess(target, token),
  /Contents: Read and write/,
);
await assert.rejects(
  () => verifyRepositoryAccess({ ...target, branch: '' }, token),
  /完整填写/,
);

console.log('GitHub access: repository, branch, authorization header and write permission checks passed.');
