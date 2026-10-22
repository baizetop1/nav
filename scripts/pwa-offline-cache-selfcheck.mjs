import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the actual worker, not a second copy of its validation logic. Every
// fetch/cache operation is in-memory; this script never registers a real worker.
const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const origin = 'https://offline-fixture.example';
const appVersion = 'app-fixture';
const appJs = '/nav/assets/app.js', appCss = '/nav/assets/theme.css';
const html = '<!doctype html><html><head><link rel="stylesheet" href="' + appCss + '"></head><body><script type="module" src="' + appJs + '"></script></body></html>';
const validManifest = () => ({ version: 1, buildId: 'build-fixture-a', appVersion, assets: [appJs, appCss] });

async function install({ manifest = validManifest(), index = html, buildId = 'build-fixture-a', appId = appVersion, manifestStatus = 200 } = {}) {
  const listeners = new Map(), opened = [], puts = [], requests = [];
  const cacheData = new Map();
  const context = vm.createContext({
    Response, Request, Headers, URL, TextEncoder, TextDecoder, console,
    setTimeout, clearTimeout,
    self: {
      location: { origin },
      clients: { claim: async () => {} },
      skipWaiting: async () => {},
      addEventListener: (name, listener) => listeners.set(name, [...(listeners.get(name) || []), listener]),
    },
    caches: {
      open: async name => {
        opened.push(name);
        if (!cacheData.has(name)) cacheData.set(name, new Map());
        return { put: async (key, response) => {
          const path = new URL(typeof key === 'string' ? key : key.url, origin).pathname;
          puts.push({ name, path });
          cacheData.get(name).set(path, await response.text());
        } };
      },
      keys: async () => [...cacheData.keys()],
      delete: async name => cacheData.delete(name),
      match: async () => undefined,
    },
    fetch: async input => {
      const url = new URL(typeof input === 'string' ? input : input.url, origin);
      requests.push(url.href);
      assert.equal(url.origin, origin, 'worker installation must not fetch another origin');
      if (url.pathname === '/nav/index.html' || url.pathname === '/nav/') return new Response(index, { headers: { 'Content-Type': 'text/html' } });
      if (url.pathname === '/nav/offline-assets.json') return new Response(JSON.stringify(manifest), { status: manifestStatus, headers: { 'Content-Type': 'application/json' } });
      if (url.pathname === '/nav/manifest.webmanifest') return new Response('{"name":"fixture"}', { headers: { 'Content-Type': 'application/manifest+json' } });
      if (url.pathname.startsWith('/nav/assets/')) return new Response(url.pathname.endsWith('.css') ? 'body{color:black}' : '/* synthetic module */', { headers: { 'Content-Type': url.pathname.endsWith('.css') ? 'text/css' : 'application/javascript' } });
      return new Response('fixture route not found', { status: 404 });
    },
  });
  const stamped = source.replace(/^const CACHE_VERSION = ['"][^'"\r\n]+['"];?\s*$/m, "const CACHE_VERSION = '" + buildId + "'")
    .replace(/^const APP_VERSION = ['"][^'"\r\n]+['"];?\s*$/m, "const APP_VERSION = '" + appId + "'");
  vm.runInContext(stamped, context, { filename: 'public/sw.js', timeout: 1500 });
  const identities = vm.runInContext('({shell:SHELL_CACHE,runtime:RUNTIME_CACHE,build:CACHE_VERSION,app:APP_VERSION})', context);
  const pending = [];
  assert.equal((listeners.get('install') || []).length, 1, 'worker has one install handler');
  for (const handler of listeners.get('install')) handler({ waitUntil: promise => pending.push(promise) });
  assert.equal(pending.length, 1, 'installation is kept alive for its validation/caching promise');
  let failure;
  try { await Promise.all(pending); } catch (error) { failure = error; }
  return { failure, puts, requests, opened, cacheData, identities };
}

async function rejectedWithoutWrites(label, options) {
  const result = await install(options);
  assert.ok(result.failure, label + ': invalid input must reject installation');
  assert.equal(result.puts.length, 0, label + ': shared active cache must not be changed before complete validation');
  assert.equal(result.requests.some(value => value.includes('/outside') || value.startsWith('https://malicious.example')), false, label + ': invalid cache entries must not be fetched');
}

const installed = await install();
assert.equal(installed.failure, undefined, 'matching UI manifest/index installs normally');
assert.equal(installed.identities.build, 'build-fixture-a');
assert.equal(installed.identities.app, appVersion);
assert.equal(installed.identities.shell, 'baize-nav-shell-' + appVersion);
assert.equal(installed.identities.runtime, 'baize-nav-runtime-' + appVersion);
assert.ok(installed.puts.some(item => item.path === '/nav/index.html'));
assert.ok(installed.puts.some(item => item.path === '/nav/'));
assert.ok(installed.puts.some(item => item.path === appJs));
assert.ok(installed.puts.some(item => item.path === appCss));
assert.equal(installed.cacheData.get(installed.identities.shell).get('/nav/index.html'), html);

const nextDataBuild = await install({ buildId: 'build-fixture-b', manifest: { ...validManifest(), buildId: 'build-fixture-newest-data' } });
assert.equal(nextDataBuild.failure, undefined, 'same-UI data-only manifests can have a newer cache build ID');
assert.equal(nextDataBuild.identities.shell, installed.identities.shell, 'hourly reports reuse the same UI shell cache');
assert.equal(nextDataBuild.identities.runtime, installed.identities.runtime);
assert.notEqual(nextDataBuild.identities.build, installed.identities.build);
const differentUi = await install({ appId: 'app-next-ui', manifest: { ...validManifest(), appVersion: 'app-next-ui' } });
assert.equal(differentUi.failure, undefined);
assert.notEqual(differentUi.identities.shell, installed.identities.shell, 'actual UI changes use a different shell cache');

await rejectedWithoutWrites('wrong UI version', { manifest: { ...validManifest(), appVersion: 'app-another-ui' } });
const missingUi = validManifest(); delete missingUi.appVersion;
await rejectedWithoutWrites('missing UI version', { manifest: missingUi });
await rejectedWithoutWrites('unsupported schema', { manifest: { ...validManifest(), version: 2 } });
await rejectedWithoutWrites('null manifest', { manifest: null });
await rejectedWithoutWrites('assets must be array', { manifest: { ...validManifest(), assets: appJs } });
await rejectedWithoutWrites('failed manifest request', { manifestStatus: 503 });
await rejectedWithoutWrites('wrong index JavaScript', { index: html.replace(appJs, '/nav/assets/new-ui.js') });
await rejectedWithoutWrites('wrong index stylesheet', { index: html.replace(appCss, '/nav/assets/new-ui.css') });
await rejectedWithoutWrites('missing referenced JavaScript', { manifest: { ...validManifest(), assets: [appCss] } });
await rejectedWithoutWrites('missing referenced CSS', { manifest: { ...validManifest(), assets: [appJs] } });

// Deliberately place an invalid value after valid assets. Validating each entry
// only immediately before its own put would already have poisoned the shared
// cache by the time the final bad entry was discovered.
for (const invalidAsset of [
  7, null, '/outside.js', 'https://malicious.example/nav/assets/code.js',
  '/nav/assets/../outside.js', '/nav/assets/%2e%2e/outside.js',
  '/nav/assets/app.js?different-ui=1', '/nav/assets/app.js#different-ui', '/nav/assets/notes.txt',
]) await rejectedWithoutWrites('late invalid asset ' + JSON.stringify(invalidAsset), { manifest: { ...validManifest(), assets: [appJs, appCss, invalidAsset] } });

console.log('PWA offline cache: UI identity, matching index/manifest, preflight-all asset paths, zero writes on invalid input and data-only cache reuse passed.');
