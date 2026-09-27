import assert from 'node:assert/strict';
import {
  buildGlobalSearchDocuments, calculateExpression, convertUnits, parseSearchAliases,
  quickSearchAnswer, resolveSearchAlias, validateSearchAlias,
} from '../src/lib/globalSearch.ts';

assert.equal(calculateExpression('=2*(3+4)'), 14);
assert.equal(calculateExpression('-2^2'), -4);
assert.equal(calculateExpression('2^-3'), .125);
assert.equal(calculateExpression('2^3^2'), 512);
assert.equal(calculateExpression('1e3 + .5'), 1000.5);
assert.equal(calculateExpression('10 % 3'), 1);
for (const input of ['globalThis.process.exit()', 'alert(1)', '1/0', '0/0', '(2+3', '2(3)', '2 ** 3', '1;2', '1e999', '2+']) assert.equal(calculateExpression(input), null, input);
assert.equal(calculateExpression('('.repeat(300) + '1' + ')'.repeat(300)), null);
assert.equal(convertUnits('32 F to C').value, 0);
assert.equal(convertUnits('1 GiB to MB').value, 1073.741824);
assert.equal(convertUnits('60 min to h').value, 1);
assert.equal(convertUnits('1 kg to g').value, 1000);
assert.equal(convertUnits('1 m to kg'), null);
assert.equal(convertUnits('-274 C to K'), null);
assert.equal(quickSearchAnswer('normal search text'), null);
assert.equal(quickSearchAnswer('=1/0'), null);
assert.equal(quickSearchAnswer('时间', new Date('2026-09-27T12:00:00Z')).value, '2026-09-27T12:00:00.000Z');
assert.equal(quickSearchAnswer('timestamp 1700000000').value, '2023-11-14T22:13:20.000Z');

const alias = { prefix: 'docs', name: 'Docs', template: 'https://example.com/search?q={query}' };
assert.equal(validateSearchAlias(alias), null);
for (const template of ['javascript:{query}', 'http://example.com/?q={query}', 'https://user:pass@example.com/?q={query}', 'https://{query}.example.com/', 'https://example.com/no-placeholder', 'https://example.com/{query}?q={query}']) assert.ok(validateSearchAlias({ ...alias, template }), template);
assert.ok(validateSearchAlias({ ...alias, prefix: 'g' }, ['g']));
const aliases = parseSearchAliases([alias, alias, { ...alias, prefix: 'G' }, null], ['g']);
assert.equal(aliases.length, 1);
const engines = [{ id: 'google', name: 'Google', prefix: 'g', url: 'https://www.google.com/search?q=', placeholder: '' }];
const result = resolveSearchAlias('docs a&b/#中文', aliases, engines);
assert.equal(result.url, 'https://example.com/search?q=a%26b%2F%23%E4%B8%AD%E6%96%87');
assert.equal(resolveSearchAlias('g test', aliases, engines).url, 'https://www.google.com/search?q=test');
assert.equal(resolveSearchAlias('unknown test', aliases, engines), null);
assert.equal(resolveSearchAlias('docs   ', aliases, engines), null);

const inbox = { id: 'inbox-one', type: 'text', content: 'A private project note', title: 'A note', tags: ['private'], createdAt: '2026-09-27', updatedAt: '2026-09-27', status: 'inbox' };
const reading = { title: 'Read this', url: 'https://read.example/', position: 40, readLater: true, visitedAt: '2026-09-27', updatedAt: '2026-09-27' };
const input = {
  inboxItems: [inbox, { ...inbox, id: 'deleted', deletedAt: '2026-09-27' }],
  readingItems: [reading, { ...reading, url: 'https://deleted.example/', deletedAt: '2026-09-27' }, { ...reading, url: 'https://finished.example/', readLater: false }],
  temporaryVisits: [{ key: 'temp', url: 'https://temporary.example/', hostname: 'temporary.example', count: 3, lastVisitedAt: 1 }],
  translationHistory: [{ id: 'translation', sourceText: 'hello', translatedText: '你好', sourceLanguage: 'en', targetLanguage: 'zh', createdAt: '2026-09-27' }],
  techOsEntities: [{ id: 'tech', title: 'Knowledge', body: 'Body keyword', tags: ['demo'], kind: 'knowledge', status: 'active' }],
};
const snapshot = JSON.stringify(input);
const documents = buildGlobalSearchDocuments(input);
assert.equal(documents.length, 5);
assert.equal(documents.some(item => item.sourceId === 'deleted'), false);
assert.equal(documents.some(item => item.url === 'https://deleted.example/'), false);
assert.equal(documents.find(item => item.group === 'translation').content, 'hello\n\n你好');
assert.equal(documents.find(item => item.group === 'tech-os').content, 'Body keyword');
assert.equal(JSON.stringify(input), snapshot);
assert.deepEqual(buildGlobalSearchDocuments({}), []);
console.log('global search self-check passed');
