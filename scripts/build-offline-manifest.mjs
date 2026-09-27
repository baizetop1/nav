import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const versionPattern = /^const CACHE_VERSION = ['"][^'"\r\n]+['"];?\s*$/m;
function workerTemplate(source) {
  if (!versionPattern.test(source)) throw new Error('Service worker CACHE_VERSION marker is missing.');
  return source.replace(versionPattern, "const CACHE_VERSION = '__BUILD_ID__'");
}
function buildVersion(files, workerSource) {
  const hash = createHash('sha256');
  for (const [name, content] of [...files, ['sw.js', workerTemplate(workerSource)]].sort(([a], [b]) => a.localeCompare(b))) {
    const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
    hash.update(`${name}\0${bytes.length}\0`); hash.update(bytes);
  }
  return `build-${hash.digest('hex').slice(0, 20)}`;
}
function stampWorker(source, version) {
  return workerTemplate(source).replace("'__BUILD_ID__'", `'${version}'`);
}
function selfTest() {
  const worker = "const CACHE_VERSION = 'v11-personal-workflows'\nconst enabled = true\n";
  const files = [['index.html', 'index'], ['assets/app.js', 'code'], ['assets/app.css', 'css'], ['rss-feed.json', 'rss'], ['link-health.json', 'health'], ['hot-feed.json', 'hot'], ['manifest.webmanifest', 'manifest']];
  const version = buildVersion(files, worker);
  assert.equal(buildVersion([...files].reverse(), worker), version, 'file traversal order must not affect version');
  for (const [name] of files) assert.notEqual(buildVersion(files.map(([key, value]) => [key, key === name ? value + 'changed' : value]), worker), version, `${name} changes must create a new worker`);
  assert.notEqual(buildVersion([...files, ['assets/lazy.js', 'new lazy chunk']], worker), version);
  assert.notEqual(buildVersion(files, worker.replace('true', 'false')), version, 'worker behavior changes must update the cache version');
  const stamped = stampWorker(worker, version);
  assert.ok(stamped.includes(`const CACHE_VERSION = '${version}'`));
  assert.equal(buildVersion(files, stamped), version, 'rebuilding the manifest is idempotent');
  assert.equal(stampWorker(stamped, version), stamped);
  assert.throws(() => stampWorker('no version marker', version), /marker/);
  console.log('Offline manifest: build content, data-only updates and repeat-build versions passed.');
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
  await writeFile(resolve(root, 'offline-assets.json'), JSON.stringify({ version: 1, buildId: version, assets: assets.map(name => `/nav/${name}`) }, null, 2) + '\n');
  await writeFile(resolve(root, 'sw.js'), stampWorker(workerSource, version));
  console.log(`Offline manifest: ${assets.length} application assets, ${version}.`);
}
