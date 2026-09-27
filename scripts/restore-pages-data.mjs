import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRssReport } from '../src/lib/rss.ts';

const MAX_BYTES = 5 * 1024 * 1024;
const TARGETS = Object.freeze({
  'link-health.json': new URL('../public/link-health.json', import.meta.url),
  'rss-feed.json': new URL('../public/rss-feed.json', import.meta.url),
});

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isValidLinkHealthReport(value) {
  if (!Array.isArray(value) || value.length > 10_000) return false;
  return value.every((entry) => {
    if (!isRecord(entry)
      || typeof entry.siteId !== 'string'
      || typeof entry.url !== 'string'
      || typeof entry.ok !== 'boolean'
      || typeof entry.checkedAt !== 'string'
      || (entry.status !== null && (!Number.isInteger(entry.status) || entry.status < 100 || entry.status > 599))
      || (entry.error !== null && typeof entry.error !== 'string')) return false;

    try {
      const url = new URL(entry.url);
      return (url.protocol === 'http:' || url.protocol === 'https:')
        && Number.isFinite(Date.parse(entry.checkedAt));
    } catch {
      return false;
    }
  });
}

function readRepository(value) {
  const repository = String(value || '').trim();
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) ? repository : null;
}

export async function restorePublishedFile(name, options = {}) {
  const target = TARGETS[name];
  if (!target) throw new Error(`Unsupported Pages data file: ${name}`);

  const repository = readRepository(options.repository ?? process.env.GITHUB_REPOSITORY);
  const token = String(options.token ?? process.env.GITHUB_TOKEN ?? '').trim();
  if (!repository || !token) {
    if (options.required ?? process.env.CI === 'true') {
      throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required to restore published Pages data.');
    }
    return { status: 'skipped', reason: 'missing GitHub context' };
  }

  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`https://api.github.com/repos/${repository}/contents/${name}?ref=gh-pages`, {
    headers: {
      Accept: 'application/vnd.github.raw+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'baize-nav-pages-data',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (response.status === 404) {
    return { status: 'missing', reason: 'gh-pages file does not exist yet' };
  }
  if (!response.ok) {
    throw new Error(`GitHub API returned HTTP ${response.status} while restoring ${name}.`);
  }

  const declaredSize = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_BYTES) {
    throw new Error(`${name} exceeds the ${MAX_BYTES}-byte safety limit.`);
  }
  const text = await response.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_BYTES) {
    throw new Error(`${name} exceeds the ${MAX_BYTES}-byte safety limit.`);
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Published ${name} is not valid JSON.`);
  }
  if (name === 'link-health.json' && !isValidLinkHealthReport(parsed)) {
    throw new Error(`Published ${name} does not match the expected report schema.`);
  }
  if (name === 'rss-feed.json') parsed = parseRssReport(parsed);

  const writer = options.writer ?? ((value) => writeFile(target, value, 'utf8'));
  await writer(`${JSON.stringify(parsed, null, 2)}\n`);
  return { status: 'restored', entries: Array.isArray(parsed) ? parsed.length : parsed.items.length };
}

async function runSelfTest() {
  const fixture = [{ siteId: 'example', url: 'https://example.com', status: 200, ok: true, checkedAt: '2026-09-27T00:00:00.000Z', error: null }];
  assert.equal(isValidLinkHealthReport(fixture), true);
  assert.equal(isValidLinkHealthReport([{ ...fixture[0], url: 'javascript:alert(1)' }]), false);
  assert.equal(isValidLinkHealthReport([{ ...fixture[0], checkedAt: 'not-a-date' }]), false);

  let written = '';
  const result = await restorePublishedFile('link-health.json', {
    repository: 'baizetop1/nav',
    token: 'test-token',
    fetcher: async (url, init) => {
      assert.equal(url, 'https://api.github.com/repos/baizetop1/nav/contents/link-health.json?ref=gh-pages');
      assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer test-token');
      return new Response(JSON.stringify(fixture), { status: 200, headers: { 'content-type': 'application/json' } });
    },
    writer: async (value) => { written = value; },
  });
  assert.deepEqual(result, { status: 'restored', entries: 1 });
  assert.deepEqual(JSON.parse(written), fixture);

  const missing = await restorePublishedFile('link-health.json', {
    repository: 'baizetop1/nav',
    token: 'test-token',
    fetcher: async () => new Response('', { status: 404 }),
    writer: async () => assert.fail('404 must not overwrite the repository fallback'),
  });
  assert.equal(missing.status, 'missing');

  const workflowFiles = ['deploy.yml', 'hot-feed.yml', 'link-health.yml'];
  const workflowSources = await Promise.all(workflowFiles.map((file) => readFile(new URL(`../.github/workflows/${file}`, import.meta.url), 'utf8')));
  workflowSources.forEach((source) => assert.match(source, /restore-pages-data\.mjs link-health\.json/));
  workflowSources.forEach((source) => assert.match(source, /group:\s*pages-deploy/));
  assert.ok(
    workflowSources[2].indexOf('restore-pages-data.mjs link-health.json') < workflowSources[2].indexOf('node scripts/check-links.mjs'),
    'link-health workflow must restore the published baseline before checking links',
  );
  console.log('Pages data restore: authenticated fetch, schema guard and first-deploy fallback passed.');
}

async function main() {
  if (process.argv.includes('--self-test')) return runSelfTest();
  const names = process.argv.slice(2);
  if (names.length === 0) throw new Error('Pass at least one Pages data filename to restore.');
  for (const name of names) {
    const result = await restorePublishedFile(name);
    console.log(`${name}: ${result.status}${result.entries === undefined ? '' : ` (${result.entries} entries)`}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
