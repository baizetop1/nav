import assert from 'node:assert/strict';
import { loadCachedTextIndex, loadTextIndex, parseTextIndex, TEXT_INDEX_CACHE_KEY } from '../src/services/textNetwork.ts';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

const index = {
  version: 1,
  generatedAt: '2026-08-24T00:00:00.000Z',
  nodes: [{
    id: 'post:text-network',
    type: 'post',
    title: '文本互联机制',
    slug: 'text-network',
    url: 'https://baizeone.top/p/text-network/',
    summary: '统一发现公开内容',
    category: '项目',
    format: '笔记',
    tags: ['知识管理', 'Web'],
    related: [],
    createdAt: '2026-08-24',
    updatedAt: '2026-08-24',
  }],
};

assert.deepEqual(parseTextIndex(index), index);
const v2Index = {
  ...index,
  version: 2,
  nodes: [...index.nodes, { ...index.nodes[0], id: 'post:digital-garden', slug: 'digital-garden', title: '数字花园', url: 'https://baizeone.top/p/digital-garden/' }],
  edges: [
    { from: 'post:text-network', to: 'post:digital-garden', type: 'related' },
    { from: 'post:digital-garden', to: 'post:text-network', type: 'wiki' },
  ],
};
assert.deepEqual(parseTextIndex(v2Index), v2Index);
assert.equal(parseTextIndex({ ...index, version: 2 }), null);
assert.equal(parseTextIndex({ ...v2Index, version: 3 }), null);
assert.equal(parseTextIndex({ ...v2Index, edges: [{ from: 'post:text-network', to: 'post:missing', type: 'related' }] }), null);
assert.equal(parseTextIndex({ ...v2Index, edges: [{ from: 'post:text-network', to: 'post:text-network', type: 'related' }] }), null);
assert.equal(parseTextIndex({ ...v2Index, edges: [{ from: 'post:text-network', to: 'post:digital-garden', type: 'unknown' }] }), null);
assert.equal(parseTextIndex({ ...index, nodes: [...index.nodes, index.nodes[0]] }), null);
assert.equal(parseTextIndex({ ...index, nodes: [{ ...index.nodes[0], url: 'javascript:alert(1)' }] }), null);

const storage = new MemoryStorage();
const remote = await loadTextIndex({
  storage,
  fetcher: async () => new Response(JSON.stringify(index), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }),
});
assert.deepEqual(remote, index);
assert.deepEqual(loadCachedTextIndex(storage), index);

const v2Storage = new MemoryStorage();
const remoteV2 = await loadTextIndex({
  storage: v2Storage,
  fetcher: async () => new Response(JSON.stringify(v2Index), { status: 200 }),
});
assert.deepEqual(remoteV2, v2Index);
assert.deepEqual(loadCachedTextIndex(v2Storage), v2Index);

const originalWarn = console.warn;
console.warn = () => undefined;
try {
  const remoteWithoutStorage = await loadTextIndex({
    storage: {
      getItem: () => { throw new Error('storage unavailable'); },
      setItem: () => { throw new Error('storage unavailable'); },
    },
    fetcher: async () => new Response(JSON.stringify(index), { status: 200 }),
  });
  assert.deepEqual(remoteWithoutStorage, index);

  const cached = await loadTextIndex({
    storage,
    fetcher: async () => { throw new Error('offline'); },
  });
  assert.deepEqual(cached, index);

  const emptyStorage = new MemoryStorage();
  const empty = await loadTextIndex({
    storage: emptyStorage,
    fetcher: async () => new Response('bad gateway', { status: 502 }),
  });
  assert.equal(empty, null);
  assert.equal(emptyStorage.getItem(TEXT_INDEX_CACHE_KEY), null);
} finally {
  console.warn = originalWarn;
}

console.log('text network self-check passed');
