import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const versionPattern = /^const CACHE_VERSION = ['"][^'"\r\n]+['"];?\s*$/m;
const appVersionPattern = /^const APP_VERSION = ['"][^'"\r\n]+['"];?\s*$/m;
const DATA_REPORT_FILES = new Set(['hot-feed.json', 'rss-feed.json', 'link-health.json']);
function workerTemplate(source) {
  if (!versionPattern.test(source)) throw new Error('Service worker CACHE_VERSION marker is missing.');
  if (!appVersionPattern.test(source)) throw new Error('Service worker APP_VERSION marker is missing.');
  return source.replace(versionPattern, "const CACHE_VERSION = '__BUILD_ID__'")
    .replace(appVersionPattern, "const APP_VERSION = '__APP_ID__'");
}
function buildVersion(files, workerSource) {
  const hash = createHash('sha256');
  for (const [name, content] of [...files, ['sw.js', workerTemplate(workerSource)]].sort(([a], [b]) => a.localeCompare(b))) {
    const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
    hash.update(`${name}\0${bytes.length}\0`); hash.update(bytes);
  }
  return `build-${hash.digest('hex').slice(0, 20)}`;
}
function applicationVersion(files, workerSource) {
  // Reports still invalidate offline data caches, but do not require a UI refresh.
  return buildVersion(files.filter(([name]) => !DATA_REPORT_FILES.has(name)), workerSource).replace(/^build-/, 'app-');
}
function stampWorker(source, version, appVersion) {
  return workerTemplate(source).replace("'__BUILD_ID__'", `'${version}'`)
    .replace("'__APP_ID__'", `'${appVersion}'`);
}
function selfTest() {
  const worker = "const CACHE_VERSION = 'v11-personal-workflows'\nconst APP_VERSION = 'app-development'\nconst enabled = true\n";
  const files = [['index.html', 'index'], ['assets/app.js', 'code'], ['assets/app.css', 'css'], ['rss-feed.json', 'rss'], ['link-health.json', 'health'], ['hot-feed.json', 'hot'], ['manifest.webmanifest', 'manifest']];
  const version = buildVersion(files, worker);
  const appVersion = applicationVersion(files, worker);
  assert.equal(buildVersion([...files].reverse(), worker), version, 'file traversal order must not affect version');
  for (const [name] of files) assert.notEqual(buildVersion(files.map(([key, value]) => [key, key === name ? value + 'changed' : value]), worker), version, `${name} changes must create a new worker`);
  assert.notEqual(buildVersion([...files, ['assets/lazy.js', 'new lazy chunk']], worker), version);
  assert.notEqual(buildVersion(files, worker.replace('true', 'false')), version, 'worker behavior changes must update the cache version');
  for (const [name] of files) {
    const nextFiles = files.map(([key, value]) => [key, key === name ? value + 'changed' : value]);
    if (DATA_REPORT_FILES.has(name)) assert.equal(applicationVersion(nextFiles, worker), appVersion, `${name} alone must not prompt for a UI refresh`);
    else assert.notEqual(applicationVersion(nextFiles, worker), appVersion, `${name} UI changes must remain visible`);
  }
  assert.notEqual(applicationVersion([...files, ['assets/lazy.js', 'new code']], worker), appVersion);
  assert.notEqual(applicationVersion(files, worker.replace('true', 'false')), appVersion);
  const stamped = stampWorker(worker, version, appVersion);
  assert.ok(stamped.includes(`const CACHE_VERSION = '${version}'`));
  assert.ok(stamped.includes(`const APP_VERSION = '${appVersion}'`));
  assert.equal(buildVersion(files, stamped), version, 'rebuilding the manifest is idempotent');
  assert.equal(applicationVersion(files, stamped), appVersion);
  assert.equal(applicationVersion([...files].reverse(), worker), appVersion);
  assert.equal(stampWorker(stamped, version, appVersion), stamped);
  assert.throws(() => stampWorker('no version marker', version, appVersion), /marker/);
  assert.throws(() => stampWorker("const CACHE_VERSION = 'v1'\n", version, appVersion), /APP_VERSION/);
  console.log('Offline manifest: full cache version, separate UI version, data-only updates and repeat builds passed.');
}

if (process.argv.includes('--self-test')) selfTest();
else {
  const root = resolve('dist');
  const assetFiles = (await readdir(resolve(root, 'assets'), { withFileTypes: true })).filter(item => item.isFile()).map(item => `assets/${item.name}`).sort();
  const assets = assetFiles.filter(name => /\.(?:js|css|woff2?)$/.test(name));
  if (!assets.some(name => name.endsWith('.js'))) throw new Error('No application assets found for offline use.');
  // Include root reports/manifest/media as well as every emitted asset. Exclude
  // the generated manifest to avoid self-referential hashes; ignore the game tree.
  const rootFiles = (await readdir(root, { withFileTypes: true })).filter(item => item.isFile() && !['sw.js', 'offline-assets.json'].includes(item.name)).map(item => item.name);
  if (!rootFiles.includes('index.html')) throw new Error('Missing index.html for the offline shell.');
  const files = await Promise.all([...rootFiles, ...assetFiles].map(async name => [name, await readFile(resolve(root, name))]));
  const workerSource = await readFile(resolve(root, 'sw.js'), 'utf8');
  const version = buildVersion(files, workerSource);
  const appVersion = applicationVersion(files, workerSource);
  await writeFile(resolve(root, 'offline-assets.json'), JSON.stringify({ version: 1, buildId: version, appVersion, assets: assets.map(name => `/nav/${name}`) }, null, 2) + '\n');
  await writeFile(resolve(root, 'sw.js'), stampWorker(workerSource, version, appVersion));
  console.log(`Offline manifest: ${assets.length} application assets, ${version}, UI ${appVersion}.`);
}
