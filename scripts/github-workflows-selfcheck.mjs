import assert from 'node:assert/strict';
import {
  dispatchHotFeedRefresh,
  getLatestHotFeedRun,
  getRemoteNavigationSnapshot,
  getWorkflowRun,
  publishNavigationData,
} from '../src/services/github.ts';

const target = { owner: 'baizetop1', repo: 'nav', branch: 'main' };
const token = 'github_pat_123456789012345678901234567890';
const headSha = 'a'.repeat(40);
const calls = [];

globalThis.fetch = async (input, init) => {
  const url = String(input);
  calls.push({ url, method: init?.method || 'GET', authorization: new Headers(init?.headers).get('Authorization') });
  if (url.endsWith('/actions/workflows/hot-feed.yml/dispatches')) return new Response(null, { status: 204 });
  if (url.includes('/actions/workflows/hot-feed.yml/runs?')) return Response.json({ workflow_runs: [{ id: 7, status: 'completed', conclusion: 'success', head_sha: headSha, html_url: 'https://github.com/baizetop1/nav/actions/runs/7', updated_at: new Date().toISOString(), created_at: new Date().toISOString() }] });
  if (url.includes('/actions/workflows/deploy.yml/runs?')) return Response.json({ workflow_runs: [{ id: 8, status: 'completed', conclusion: 'success', head_sha: headSha, html_url: 'https://github.com/baizetop1/nav/actions/runs/8', updated_at: new Date().toISOString(), created_at: new Date().toISOString() }] });
  if (url.includes('/actions/runs?')) return Response.json({ workflow_runs: [{ id: 99, status: 'completed', conclusion: 'success', head_sha: headSha, html_url: 'https://github.com/baizetop1/nav/actions/runs/99', updated_at: new Date().toISOString(), created_at: new Date().toISOString() }] });
  if (url.endsWith('/git/ref/heads/main')) return Response.json({ object: { sha: headSha } });
  if (url.includes('/contents/src/data/sites.json')) return Response.json([]);
  if (url.includes('/contents/src/data/categories.json')) return Response.json([]);
  if (url.includes('/contents/src/data/layout.json')) return Response.json([]);
  return Response.json({ message: 'not found' }, { status: 404 });
};

await dispatchHotFeedRefresh(target, token);
assert.equal(calls[0].method, 'POST');
assert.equal(calls[0].authorization, `Bearer ${token}`);
assert.equal((await getLatestHotFeedRun(target, token))?.id, 7);
assert.equal((await getWorkflowRun(target, token, headSha))?.id, 8);
const deployRunCall = calls.find(call => call.url.includes('/actions/workflows/deploy.yml/runs?'));
assert.ok(deployRunCall, 'deployment polling must query deploy.yml runs');
assert.match(deployRunCall.url, new RegExp(`(?:\\?|&)head_sha=${headSha}(?:&|$)`));
assert.equal(calls.some(call => call.url.includes('/actions/runs?')), false, 'deployment polling must not query repository-wide workflow runs');
assert.deepEqual(await getRemoteNavigationSnapshot(target, token), {
  data: { sites: [], categories: [], layout: [] },
  headSha,
});
await assert.rejects(
  () => publishNavigationData(target, { sites: [], categories: [], layout: [] }, token, 'test', 'b'.repeat(40)),
  /远端分支在你读取后又发生了变化/,
);
console.log('GitHub workflows: dispatch, deploy-only polling, snapshot SHA and conflict guard passed.');
