import assert from 'node:assert/strict';
import { loadAiHot, clearAiHotMemoryCache, AiHotRequestError } from '../src/services/aiHot.ts';
import { AI_HOT_READER_KEY, aiHotReadingKey, readAiHotReader, parseAiHotReader, toggleAiHotFavorite, markAiHotRead, removeAiHotFavorite } from '../src/lib/aiHotReader.ts';
import { BACKUP_STORAGE_KEYS } from '../src/lib/backup.ts';
import { captureSharedWorkspace } from '../src/services/workspaceSync.ts';

// Synthetic fixtures only: upstream news is not copied into this repository.
const entry = { id: 'synthetic-1', title: 'Synthetic AI article', summary: 'Only test data; never a real news body.', source: { name: 'Fixture source' }, links: { aihot: 'https://aihot.news/items/synthetic-1', original: 'https://example.com/fixture' }, publishedAt: '2026-10-12T01:00:00Z', category: 'ai-models', attribution: { name: 'AIHOT', url: 'https://aihot.news/' } };
const selected = { schemaVersion: 1, items: [entry] };
const hot = { schemaVersion: 1, items: [{ ...entry, id: 'synthetic-topic', rank: 1, sourceCount: 3, latestAt: entry.publishedAt, links: { ...entry.links, story: 'https://aihot.news/stories/synthetic' } }] };
const daily = { schemaVersion: 1, report: { date: '2026-10-12', generatedAt: '2026-10-12T02:00:00Z', windowStart: '2026-10-11T02:00:00Z', windowEnd: '2026-10-12T02:00:00Z', links: { aihot: 'https://aihot.news/dailies/2026-10-12' }, lead: { title: 'Synthetic daily', leadParagraph: 'A fixture introduction.' }, sections: [{ label: 'Models', items: [entry, { ...entry, links: { aihot: null, original: 'https://example.com/daily-fallback' } }] }], flashes: [{ ...entry, links: { aihot: null, original: 'https://example.com/flash' } }] } };
const jsonResponse = (value, headers = { 'Cache-Control': 'public, max-age=60' }) => new Response(JSON.stringify(value), { headers });
const realNow = Date.now; let now = Date.parse('2026-10-12T03:00:00Z'); Date.now = () => now;
const advance = () => { now += 61_000; clearAiHotMemoryCache(); };
try {
  let calls = 0;
  const fetcher = async (url, options) => {
    calls++; assert.equal(url, 'https://aihot.news/api/v1/items?mode=selected&limit=20');
    assert.equal(options.credentials, 'omit'); assert.equal(options.referrerPolicy, 'no-referrer'); assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'default');
    assert.deepEqual(options.headers, { Accept: 'application/json' }); assert.equal(options.method, 'GET'); return jsonResponse(selected);
  };
  const first = await loadAiHot('selected', { fetcher });
  assert.equal(first.entries[0].id, entry.id); assert.equal(first.entries[0].summary, entry.summary); assert.equal(first.expiresAt, now + 60_000);
  first.entries[0].title = 'caller mutation'; const cached = await loadAiHot('selected', { fetcher });
  assert.equal(calls, 1); assert.equal(cached.entries[0].title, entry.title, 'caller must not modify shared cache');
  clearAiHotMemoryCache(); await assert.rejects(loadAiHot('selected', { fetcher }), error => error instanceof AiHotRequestError && error.retryAt === now + 60_000);
  advance(); await loadAiHot('selected', { fetcher }); assert.equal(calls, 2);
  const topic = await loadAiHot('hot', { fetcher: async () => jsonResponse(hot) });
  assert.equal(topic.entries[0].rank, 1); assert.equal(topic.entries[0].sourceCount, 3); assert.equal(topic.entries[0].storyUrl, hot.items[0].links.story);
  const report = await loadAiHot('daily', { fetcher: async () => jsonResponse(daily) });
  assert.equal(report.daily.date, '2026-10-12'); assert.equal(report.entries.length, 3); assert.equal(report.entries[1].readingUrl, 'https://example.com/daily-fallback'); assert.equal(report.entries[2].section, '快讯');
  advance(); const noStore = await loadAiHot('selected', { fetcher: async () => jsonResponse(selected, { 'Cache-Control': 'private, no-store' }) });
  assert.equal(noStore.expiresAt, noStore.loadedAt); await assert.rejects(loadAiHot('selected', { fetcher }), /60 秒/);
  advance(); const aged = await loadAiHot('selected', { fetcher: async () => jsonResponse(selected, { 'Cache-Control': 'max-age=120', Age: '70' }) }); assert.equal(aged.expiresAt - aged.loadedAt, 50_000);
  advance(); const capped = await loadAiHot('selected', { fetcher: async () => jsonResponse(selected, { 'Cache-Control': 'max-age=3600', Age: '900' }) }); assert.equal(capped.expiresAt - capped.loadedAt, 300_000);
  advance(); await assert.rejects(loadAiHot('selected', { fetcher: async () => jsonResponse({ schemaVersion: 2, items: [] }) }), /版本/);
  for (const invalidUrl of ['javascript:alert(1)', 'https://user:pass@aihot.news/a', 'https://aihot.news.attacker.test/a', 'http://aihot.news/a', 'https://aihot.news:8443/a']) {
    advance();
    await assert.rejects(loadAiHot('selected', { fetcher: async () => jsonResponse({ ...selected, items: [{ ...entry, links: { ...entry.links, aihot: invalidUrl } }] }) }), /不安全/);
  }
  advance(); await assert.rejects(loadAiHot('selected', { fetcher: async () => jsonResponse({ ...selected, items: [{ ...entry, links: { ...entry.links, original: 'https://user@evil.test/a' } }] }) }), /不安全/);
  advance(); await assert.rejects(loadAiHot('selected', { fetcher: async () => jsonResponse({ ...selected, items: [entry, entry] }) }), /重复/);
  advance(); await assert.rejects(loadAiHot('selected', { fetcher: async () => new Response('x'.repeat(512 * 1024 + 1)) }), /512 KiB/);
  advance(); await assert.rejects(loadAiHot('selected', { fetcher: async () => new Response('{}', { headers: { 'Content-Length': String(512 * 1024 + 1) } }) }), /512 KiB/);
  advance(); await assert.rejects(loadAiHot('selected', { fetcher: async () => new Response('{broken') }), /JSON/);
  advance(); await assert.rejects(loadAiHot('selected', { fetcher: async () => { throw new TypeError('CORS blocked'); } }), error => /跨域/.test(error.message) && error.retryAt === now + 60_000);
  advance(); await assert.rejects(loadAiHot('selected', { fetcher: async () => new Response(null, { status: 429, headers: { 'Retry-After': '120' } }) }), error => error.retryAt === now + 120_000);
  let cooledCall = false; await assert.rejects(loadAiHot('hot', { fetcher: async () => { cooledCall = true; return jsonResponse(hot); } }), /冷却/); assert.equal(cooledCall, false);
  clearAiHotMemoryCache(); now += 121_000;
  const until = new Date(now + 90_000).toUTCString(); await assert.rejects(loadAiHot('daily', { fetcher: async () => new Response(null, { status: 503, headers: { 'Retry-After': until } }) }), error => error.retryAt === Date.parse(until));
  now += 91_000;
  const preAborted = new AbortController(); preAborted.abort(); let preCalls = 0;
  await assert.rejects(loadAiHot('selected', { signal: preAborted.signal, fetcher: async () => { preCalls++; return jsonResponse(selected); } }), error => error.name === 'AbortError'); assert.equal(preCalls, 0);
  const abort = new AbortController(); let networkAborted = false;
  const old = loadAiHot('selected', { signal: abort.signal, fetcher: async (_url, options) => new Promise((_resolve, reject) => { options.signal.addEventListener('abort', () => { networkAborted = true; reject(new DOMException('Aborted', 'AbortError')); }); }) });
  const oldRejected = assert.rejects(old, error => error.name === 'AbortError'); abort.abort();
  const immediate = await loadAiHot('selected', { fetcher: async () => jsonResponse(selected) }); await oldRejected;
  assert.equal(networkAborted, true); assert.equal(immediate.entries.length, 1, 'StrictMode canceled request must not poison immediate retry');
  advance(); let resolveShared, sharedCalls = 0; const one = new AbortController();
  const sharedFetch = async () => { sharedCalls++; return new Promise(resolve => { resolveShared = resolve; }); };
  const a = loadAiHot('selected', { signal: one.signal, fetcher: sharedFetch }), b = loadAiHot('selected', { fetcher: sharedFetch });
  const aRejected = assert.rejects(a, error => error.name === 'AbortError'); one.abort(); resolveShared(jsonResponse(selected));
  await aRejected; assert.equal((await b).entries.length, 1); assert.equal(sharedCalls, 1, 'one canceled subscriber must not cancel others');
  advance(); const realSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (callback, ms, ...args) => { if (ms === 15_000) { queueMicrotask(() => callback(...args)); return realSetTimeout(() => {}, 1); } return realSetTimeout(callback, ms, ...args); };
  try { await assert.rejects(loadAiHot('selected', { fetcher: async (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Timeout', 'AbortError')))) }), /15 秒/); }
  finally { globalThis.setTimeout = realSetTimeout; }

  const data = new Map(), storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const normalized = { ...immediate.entries[0], readingUrl: immediate.entries[0].readingUrl + '#fragment' };
  assert.equal(readAiHotReader(storage).error, '');
  let state = toggleAiHotFavorite(normalized, storage); assert.equal(state.favorites.length, 1); assert.equal(state.favorites[0].readingUrl, aiHotReadingKey(normalized.readingUrl));
  assert.equal(Object.hasOwn(state.favorites[0], 'summary'), false); assert.equal(Object.hasOwn(state.favorites[0], 'originalUrl'), false);
  markAiHotRead(state.favorites[0], storage); assert.equal(readAiHotReader(storage).state.read[aiHotReadingKey(normalized.readingUrl)], now);
  toggleAiHotFavorite({ ...normalized, readingUrl: normalized.readingUrl.replace('#fragment', '#other') }, storage); assert.equal(readAiHotReader(storage).state.favorites.length, 0);
  state = toggleAiHotFavorite(normalized, storage); removeAiHotFavorite(normalized.readingUrl, storage); assert.equal(readAiHotReader(storage).state.favorites.length, 0);
  for (let i = 0; i < 501; i++) { now++; markAiHotRead({ readingUrl: 'https://example.com/read/' + i }, storage); }
  state = readAiHotReader(storage).state; assert.equal(Object.keys(state.read).length, 500); assert.equal(state.read['https://example.com/read/0'], undefined);
  for (let i = 0; i < 100; i++) toggleAiHotFavorite({ ...normalized, readingUrl: 'https://aihot.news/items/favorite-' + i }, storage);
  assert.throws(() => toggleAiHotFavorite({ ...normalized, readingUrl: 'https://aihot.news/items/over-limit' }, storage), /100 条/);
  const stored = storage.getItem(AI_HOT_READER_KEY), extra = JSON.parse(stored); extra.token = 'must-not-retain'; extra.favorites[0].summary = 'body must not persist';
  assert.equal(Object.hasOwn(parseAiHotReader(extra), 'token'), false); assert.equal(Object.hasOwn(parseAiHotReader(extra).favorites[0], 'summary'), false);
  storage.setItem(AI_HOT_READER_KEY, '{broken'); assert.ok(readAiHotReader(storage).error); assert.throws(() => markAiHotRead(normalized, storage), /原记录未覆盖/); assert.equal(storage.getItem(AI_HOT_READER_KEY), '{broken');
  storage.setItem(AI_HOT_READER_KEY, stored);
  assert.throws(() => markAiHotRead(normalized, { getItem: storage.getItem, setItem: () => { throw new DOMException('quota', 'QuotaExceededError'); } }), /存储空间不足/); assert.equal(storage.getItem(AI_HOT_READER_KEY), stored);
  let reads = 0; const newer = JSON.stringify({ version: 1, read: {}, favorites: [] });
  assert.throws(() => markAiHotRead(normalized, { getItem: key => { reads++; if (reads === 2) storage.setItem(key, newer); return storage.getItem(key); }, setItem: storage.setItem }), /另一页面/); assert.equal(storage.getItem(AI_HOT_READER_KEY), newer);
  assert.throws(() => markAiHotRead({ readingUrl: 'javascript:alert(1)' }, storage), /链接不安全/);
  // Even a normal full backup/cloud capture must not redistribute provider data/reader metadata.
  assert.equal(BACKUP_STORAGE_KEYS.includes(AI_HOT_READER_KEY), false);
  toggleAiHotFavorite(normalized, storage); assert.equal(Object.hasOwn(captureSharedWorkspace(storage).entries, AI_HOT_READER_KEY), false);
  console.log('AIHOT anonymous requests, cache/rate limits, schema/link/body guards, abort/retry, local metadata/CAS and no-cloud boundary: PASS');
} finally { Date.now = realNow; clearAiHotMemoryCache(); }
