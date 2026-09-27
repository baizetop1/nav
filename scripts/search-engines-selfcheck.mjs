import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { searchEngines } from '../src/data/config.ts';

const expected = [
  ['google', 'g', 'www.google.com'],
  ['baidu', 'bd', 'www.baidu.com'],
  ['bing', 'bi', 'cn.bing.com'],
  ['github', 'gh', 'github.com'],
  ['bilibili', 'bl', 'search.bilibili.com'],
];

assert.deepEqual(searchEngines.map(({ id, prefix, url }) => [id, prefix, new URL(url).hostname]), expected);
assert.equal(new Set(searchEngines.map(engine => engine.id)).size, searchEngines.length);
assert.equal(new Set(searchEngines.map(engine => engine.prefix)).size, searchEngines.length);
assert.equal(new Set(searchEngines.map(engine => engine.url)).size, searchEngines.length);

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const iconSource = await readFile(new URL('../src/components/SearchEngineIcon.tsx', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8');
for (const [id] of expected) {
  assert.match(iconSource, new RegExp(`data-engine-icon=["']${id}["']`));
}
assert.match(appSource, /type="button" data-search-engine=\{engine\.id\}/);
assert.match(appSource, /<SearchEngineIcon engineId=\{activeEngine\.id\}/);
assert.match(mainSource, /controllerchange/);
assert.match(mainSource, /baize:app-update-ready/);
console.log('Search engines: unique ids, prefixes, URLs, SVG icons and mobile PWA update signal passed.');
