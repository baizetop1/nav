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
assert.equal(parseTextIndex({ ...index, version: 2 }), null);
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
