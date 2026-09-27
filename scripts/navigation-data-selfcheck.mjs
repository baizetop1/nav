import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  NavigationDataValidationError,
  parseNavigationData,
  safeHostname,
  safeHttpUrl,
  tryParseNavigationData,
} from '../src/lib/navigationData.ts';

const valid = {
  sites: [{
    id: ' site ',
    name: ' Example ',
    description: ' demo ',
    url: ' https://www.example.com/path ',
    categoryId: ' tools ',
    tags: [' docs ', '', 'docs'],
  }],
  categories: [{ id: ' tools ', name: ' Tools ', order: 1 }],
  layout: [{ siteId: ' site ', order: 1, size: 'wide', x: 1, y: 0, width: 2, height: 1 }],
};

const parsed = parseNavigationData(valid);
assert.equal(parsed.sites[0].id, 'site');
assert.equal(parsed.sites[0].url, 'https://www.example.com/path');
assert.deepEqual(parsed.sites[0].tags, ['docs']);
assert.equal(parsed.layout[0].x, 1);
assert.notEqual(parsed, valid);

function rejects(mutator, path) {
  const candidate = structuredClone(valid);
  mutator(candidate);
  assert.throws(
    () => parseNavigationData(candidate),
    error => error instanceof NavigationDataValidationError && error.message.includes(path),
  );
}

rejects(data => { data.sites[0].url = 'javascript:alert(1)'; }, 'sites[0].url');
rejects(data => { data.sites.push({ ...data.sites[0] }); }, '重复 ID');
rejects(data => { data.sites[0].categoryId = 'missing'; }, 'categoryId');
rejects(data => { data.layout[0].siteId = 'missing'; }, 'layout');
rejects(data => { data.layout[0].x = 3; }, '4 列网格');
rejects(data => { delete data.layout[0].y; }, '同时填写');
rejects(data => { data.layout[0].order = 1.5; }, '安全整数');

assert.equal(safeHostname('https://www.example.com/path'), 'example.com');
assert.equal(safeHostname('not a url'), '地址无效');
assert.equal(safeHttpUrl('javascript:alert(1)'), null);
assert.equal(tryParseNavigationData({ sites: [], categories: [], layout: [] }).ok, true);
assert.equal(tryParseNavigationData(null).ok, false);

const bundled = {
  sites: JSON.parse(readFileSync(new URL('../src/data/sites.json', import.meta.url), 'utf8')),
  categories: JSON.parse(readFileSync(new URL('../src/data/categories.json', import.meta.url), 'utf8')),
  layout: JSON.parse(readFileSync(new URL('../src/data/layout.json', import.meta.url), 'utf8')),
};
assert.equal(parseNavigationData(bundled).sites.length, bundled.sites.length);

console.log('navigation data self-check passed');
