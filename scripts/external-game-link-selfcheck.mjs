import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { collectNavigationPublicAssets, navigationPublicAssets, LEGACY_GAME_ENTRY_FILES } from './navigation-public-assets.mjs';

const repo = path.resolve('.');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sourceHash = hash(path.join(repo, 'public/game/js/game.js'));
const tempParent = fs.realpathSync(os.tmpdir());
const fixture = fs.mkdtempSync(path.join(tempParent, 'baize-navigation-release-'));
const publicRoot = path.join(fixture, 'public');
const legacyRoot = path.join(fixture, 'server/shuihu-web/legacy-entry');
const write = (name, text) => { const file = path.join(fixture, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
let emitted;
try {
  write('public/.nojekyll', '');
  write('public/baize-logo.webp', 'navigation logo');
  write('public/learning-lab/index.html', '<title>learning experiment</title>');
  write('public/game/index.html', 'GAME BODY MUST NOT BE PUBLISHED');
  write('public/game/js/game.js', 'GAME CODE MUST NOT BE PUBLISHED');
  write('public/game/data/heroes.json', 'GAME DATA MUST NOT BE PUBLISHED');
  write('public/game/assets/art/sprite.png', 'GAME ART MUST NOT BE PUBLISHED');
  for (const file of LEGACY_GAME_ENTRY_FILES) write('server/shuihu-web/legacy-entry/' + file, 'legacy handoff ' + file);
  const collected = collectNavigationPublicAssets({ publicRoot, legacyRoot });
  assert.deepEqual(collected.map(item => item.name).sort(), ['.nojekyll', 'baize-logo.webp', 'learning-lab/index.html', 'game/index.html', 'game/migration.js', 'game/migration.css'].sort());
  assert(collected.filter(item => item.name.startsWith('game/')).every(item => item.source.startsWith(legacyRoot + path.sep)), 'game output must originate only from the save handoff');
  assert.equal(fs.readFileSync(path.join(publicRoot, 'game/js/game.js'), 'utf8'), 'GAME CODE MUST NOT BE PUBLISHED', 'source remains available for local development');
  const plugin = navigationPublicAssets();
  assert.equal(plugin.apply, 'build');
  plugin.configResolved({ root: fixture });
  emitted = [];
  plugin.generateBundle.call({ emitFile(asset) { emitted.push(asset); } });
  assert.equal(emitted.length, collected.length);
  assert(emitted.every(item => item.type === 'asset' && Buffer.isBuffer(item.source)));
  assert(!emitted.some(item => item.source.toString().includes('MUST NOT BE PUBLISHED')));
  write('server/shuihu-web/legacy-entry/secret.env', 'MUST NOT BE PUBLISHED');
  assert.throws(() => collectNavigationPublicAssets({ publicRoot, legacyRoot }), /legacy game entry/);
  fs.unlinkSync(path.join(legacyRoot, 'secret.env'));
  fs.renameSync(path.join(legacyRoot, 'migration.js'), path.join(legacyRoot, 'missing.js'));
  assert.throws(() => collectNavigationPublicAssets({ publicRoot, legacyRoot }), /legacy game entry/);
} finally {
  const absolute = path.resolve(fixture);
  assert(path.dirname(absolute) === tempParent && path.basename(absolute).startsWith('baize-navigation-release-'), 'remove only this verified test fixture');
  fs.rmSync(absolute, { recursive: true, force: true });
}

const linkSource = fs.readFileSync('src/lib/externalApplications.ts', 'utf8');
assert(linkSource.includes("export const SHUIHU_GAME_URL = 'https://game.baizeone.site/';"));
const app = fs.readFileSync('src/App.tsx', 'utf8');
assert(app.includes("window.open(SHUIHU_GAME_URL, '_blank', 'noopener,noreferrer')"));
assert(app.includes("{ id: 'game', label: '白泽水浒', href: SHUIHU_GAME_URL }"));
assert(!/BASE_URL[^\n]*game\//.test(app), 'navigation no longer links to bundled game');
assert(!app.includes('梁山存档匣 0.3'));
const config = fs.readFileSync('vite.config.ts', 'utf8');
assert(config.includes("publicDir: command === 'build' ? false : 'public'"), 'only production disables direct game copying');
assert(config.includes('navigationPublicAssets()'));

// Execute the actual service-worker request guard. A migration page, with or
// without its old trailing slash, must never overwrite the navigation shell.
const listeners = new Map(), pending = [], puts = [], fetches = [];
const origin = 'https://baizeone.top';
const context = vm.createContext({
  Response, Request, Headers, URL, TextEncoder, TextDecoder, console, setTimeout, clearTimeout,
  self: { location: { origin }, addEventListener: (name, fn) => listeners.set(name, fn), clients: { claim: async () => {} }, skipWaiting: async () => {} },
  caches: { open: async () => ({ put: async (key) => puts.push(String(key)), match: async () => undefined }), match: async () => undefined, keys: async () => [], delete: async () => true },
  fetch: async request => { fetches.push(request.url || String(request)); return new Response('<title>Navigation fixture</title>', { headers: { 'Content-Type': 'text/html' } }); },
});
vm.runInContext(fs.readFileSync('public/sw.js', 'utf8'), context, { filename: 'public/sw.js' });
const handle = listeners.get('fetch');
assert.equal(typeof handle, 'function');
for (const url of [origin + '/nav/game', origin + '/nav/game/', origin + '/nav/game/index.html', origin + '/nav/game/migration.js', 'https://game.baizeone.site/']) {
  let responses = 0;
  handle({ request: { url, method: 'GET', mode: 'navigate' }, respondWith(promise) { responses++; pending.push(promise); }, waitUntil(promise) { pending.push(promise); } });
  assert.equal(responses, 0, 'worker must ignore game request ' + url);
}
assert.equal(fetches.length, 0);assert.equal(puts.length, 0);
let normalResponses = 0;
handle({ request: { url: origin + '/nav/', method: 'GET', mode: 'navigate' }, respondWith(promise) { normalResponses++; pending.push(promise); }, waitUntil(promise) { pending.push(promise); } });
await Promise.all(pending);
assert.equal(normalResponses, 1, 'navigation still receives its normal offline handling');
assert(puts.some(key => key.includes('/nav/index.html')));
assert.equal(hash(path.join(repo, 'public/game/js/game.js')), sourceHash, 'test does not alter the game source');

if (process.argv.includes('--dist')) {
  const root = path.resolve('dist');
  const all = [];
  function files(dir, relative = '') { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const name = path.posix.join(relative, entry.name); if (entry.isDirectory()) files(path.join(dir, entry.name), name); else all.push(name); } }
  files(root);
  assert.deepEqual(all.filter(name => name.startsWith('game/')).sort(), LEGACY_GAME_ENTRY_FILES.map(file => 'game/' + file).sort(), 'release includes the legacy handoff only');
  assert(fs.existsSync(path.join(root, '.nojekyll')));
  const publicAssets = collectNavigationPublicAssets({ publicRoot: path.resolve('public'), legacyRoot: path.resolve('server/shuihu-web/legacy-entry') });
  for (const asset of publicAssets) {
    assert(fs.existsSync(path.join(root, asset.name)), 'retained public asset ' + asset.name);
    if (asset.name !== 'sw.js') assert.equal(hash(path.join(root, asset.name)), hash(asset.source), 'public asset bytes ' + asset.name);
  }
  assert(fs.existsSync(path.join(root, 'baize-logo.webp')));
  const js = all.filter(name => /^assets\/.*\.js$/.test(name)).map(name => fs.readFileSync(path.join(root, name), 'utf8')).join('\n');
  assert(js.includes('https://game.baizeone.site/'), 'built navigation contains the external destination');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'offline-assets.json'), 'utf8'));
  assert(manifest.assets.every(url => url.startsWith('/nav/assets/') && !url.includes('/game/')));
  const publicOriginGame = fs.readFileSync(path.join(root, 'game/index.html'), 'utf8');
  assert(publicOriginGame.includes('game.baizeone.site'));
  assert(!/<script[^>]+(?:game\.js|type=["']module)/i.test(publicOriginGame), 'handoff never loads a game bundle');
  console.log(JSON.stringify({ status: 'PASS', checked: 'navigation release', legacyFiles: LEGACY_GAME_ENTRY_FILES.length, releaseFiles: all.length }));
}
console.log('External game link: isolated public assets, unchanged game sources, shared external entry and service-worker boundaries passed.');
