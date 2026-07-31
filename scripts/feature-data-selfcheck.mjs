import assert from 'node:assert/strict';
import { CLICK_STATS_KEY, LEGACY_CLICK_STATS_KEY, loadClickStats, recordSiteVisit } from '../src/lib/activityStats.ts';
import { addTranslationHistory, loadTranslationHistory, TRANSLATION_HISTORY_KEY } from '../src/lib/translationHistory.ts';

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

console.log('feature data self-check passed');
