import assert from 'node:assert/strict';
import { publishRssConfiguration } from '../src/services/rssPublish.ts';
const target = { owner: 'owner', repo: 'nav', branch: 'main' }, token = 'github_pat_test_token_123456';
const source = { id: 'rss-example', title: '中文订阅', url: 'https://example.com/feed.xml' };
const file = sources => new Response(JSON.stringify({ sha: 'sha', encoding: 'base64', content: Buffer.from(JSON.stringify({ version: 1, sources })).toString('base64') }));
let writes = 0;
await publishRssConfiguration(target, token, [source], [], async (_url, options) => {
  if (options.method !== 'PUT') return file([]);
  writes++; const body = JSON.parse(options.body);
  assert.equal(body.sha, 'sha'); assert.equal(body.branch, 'main');
  assert.deepEqual(JSON.parse(Buffer.from(body.content, 'base64').toString('utf8')).sources, [source]);
  return new Response(JSON.stringify({ commit: { html_url: 'https://github.com/owner/nav/commit/new' } }));
});
assert.equal(writes, 1);
await assert.rejects(() => publishRssConfiguration(target, token, [], [], async (_url, options) => { assert.notEqual(options.method, 'PUT'); return file([source]); }), /其他设备/);
await assert.rejects(() => publishRssConfiguration(target, token, [source], [], async (_url, options) => options.method === 'PUT' ? new Response('', { status: 409 }) : file([])), /发生变化/);
console.log('RSS publishing: UTF-8, baseline conflict and conditional-write checks passed.');
