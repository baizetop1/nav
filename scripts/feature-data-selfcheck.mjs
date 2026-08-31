import assert from 'node:assert/strict';
import { CLICK_STATS_KEY, LEGACY_CLICK_STATS_KEY, loadClickStats, recordSiteVisit } from '../src/lib/activityStats.ts';
import { addTranslationHistory, loadTranslationHistory, TRANSLATION_HISTORY_KEY } from '../src/lib/translationHistory.ts';
import { parseHotFeedReport, selectIntelligenceItems } from '../src/lib/hotFeed.ts';
import { getTemporaryVisitSummaries, loadTemporaryVisits, normalizeTemporaryUrl, recordTemporaryVisit, TEMPORARY_VISITS_KEY } from '../src/lib/temporaryVisits.ts';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const storage = new MemoryStorage();
storage.setItem(LEGACY_CLICK_STATS_KEY, JSON.stringify({
  date: '2026-07-31',
  clicks: { github: { count: 3, lastClicked: 1_000 } },
}));
const migrated = loadClickStats(storage, new Date('2026-07-31T12:00:00+08:00'));
assert.equal(migrated.days['2026-07-31'].clicks.github.count, 3);
const updated = recordSiteVisit(migrated, 'github', new Date('2026-07-31T13:00:00+08:00'));
assert.equal(updated.days['2026-07-31'].clicks.github.count, 4);
storage.setItem(CLICK_STATS_KEY, JSON.stringify(updated));
assert.equal(loadClickStats(storage, new Date('2026-07-31T14:00:00+08:00')).days['2026-07-31'].clicks.github.count, 4);

let history = addTranslationHistory([], {
  sourceText: 'hello',
  translatedText: '你好',
  sourceLanguage: 'en',
  targetLanguage: 'zh-CN',
});
history = addTranslationHistory(history, {
  sourceText: 'hello',
  translatedText: '你好',
  sourceLanguage: 'en',
  targetLanguage: 'zh-CN',
});
assert.equal(history.length, 1);
storage.setItem(TRANSLATION_HISTORY_KEY, JSON.stringify(history));
assert.equal(loadTranslationHistory(storage)[0].translatedText, '你好');

assert.equal(normalizeTemporaryUrl('example.com:8080/path'), 'https://example.com:8080/path');
assert.equal(normalizeTemporaryUrl('javascript:alert(1)'), null);
let temporaryVisits = recordTemporaryVisit({ version: 1, records: [] }, 'example.com/path#first', new Date('2026-07-14T12:00:00+08:00'));
temporaryVisits = recordTemporaryVisit(temporaryVisits, 'https://example.com/path#second', new Date('2026-07-15T12:00:00+08:00'));
temporaryVisits = recordTemporaryVisit(temporaryVisits, 'https://example.com/path', new Date('2026-08-13T09:00:00+08:00'));
temporaryVisits = recordTemporaryVisit(temporaryVisits, 'https://example.com/path', new Date('2026-08-13T10:00:00+08:00'));
const temporarySummary = getTemporaryVisitSummaries(temporaryVisits, [], new Date('2026-08-13T12:00:00+08:00'));
assert.equal(temporarySummary.length, 1);
assert.equal(temporarySummary[0].count, 3);
assert.equal(getTemporaryVisitSummaries(temporaryVisits, ['https://example.com/path'], new Date('2026-08-13T12:00:00+08:00')).length, 0);
storage.setItem(TEMPORARY_VISITS_KEY, JSON.stringify(temporaryVisits));
assert.equal(loadTemporaryVisits(storage, new Date('2026-08-13T12:00:00+08:00')).records.length, 1);

const hotFeed = parseHotFeedReport({
  version: 3,
  generatedAt: '2026-08-31T03:00:00Z',
  intelligence: {
    updatedAt: '2026-08-31T02:00:00Z',
    items: [
      { id: 'ai-1', category: 'ai', title: 'AI 模型更新', url: 'https://example.com/ai', source: 'OpenAI' },
      { id: 'security-1', category: 'security', title: '在野利用漏洞', url: 'https://example.com/security', source: 'CISA KEV', badge: 'CVE-2026-10001' },
      { id: 'dev-1', category: 'dev', title: '开发者动态', url: 'https://example.com/dev', source: 'Hacker News', signal: 128 },
      { id: 'cn-1', category: 'cn', title: '国内要闻动态', url: 'https://example.com/cn/1', source: '中新网要闻' },
      { id: 'cn-2', category: '国内', title: '国内科技动态', url: 'https://example.com/cn/2', source: 'IT之家' },
    ],
  },
  github: {
    updatedAt: '2026-08-31T02:30:00Z',
    source: { name: 'GitHub Trending', url: 'https://github.com/trending?since=daily' },
    items: [{ id: 'repo-1', rank: 1, name: 'baizetop1/nav', description: '个人导航', language: 'TypeScript', stars: 1234, starsToday: 56, url: 'https://github.com/baizetop1/nav' }],
  },
});
assert.equal(hotFeed?.intelligence.items.find(item => item.id === 'cn-1')?.category, 'cn');
assert.equal(hotFeed?.intelligence.items.find(item => item.id === 'cn-2')?.category, 'cn');
assert.equal(hotFeed?.intelligence.items.find(item => item.id === 'security-1')?.badge, 'CVE-2026-10001');
assert.equal(hotFeed?.intelligence.items.find(item => item.id === 'dev-1')?.signal, '128');
assert.deepEqual(
  selectIntelligenceItems(hotFeed?.intelligence.items ?? [], 'all').map(item => item.id),
  ['cn-1', 'security-1', 'ai-1', 'dev-1', 'cn-2'],
);
assert.deepEqual(
  selectIntelligenceItems(hotFeed?.intelligence.items ?? [], 'cn').map(item => item.id),
  ['cn-1', 'cn-2'],
);
assert.equal(hotFeed?.github.items[0].name, 'baizetop1/nav');
assert.equal(hotFeed?.github.items[0].starsToday, 56);
assert.equal(parseHotFeedReport({ ...hotFeed, github: { source: { name: 'bad', url: 'javascript:alert(1)' }, items: [] } }), null);

const legacyHotFeed = parseHotFeedReport({
  version: 2,
  generatedAt: '2026-08-13T03:00:00Z',
  social: {
    source: { name: '示例热榜', url: 'https://example.com/hot' },
    items: [{ id: 'hot-1', rank: 1, title: '示例话题', url: 'https://example.com/topic', hot: 12345 }],
  },
  github: hotFeed?.github,
});
assert.equal(legacyHotFeed?.social?.items[0].hot, '12345');
assert.equal(legacyHotFeed?.intelligence.items.length, 0);

console.log('feature data self-check passed');
