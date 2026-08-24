import { TEXT_INDEX_URL } from '../data/config.ts';
import type { TextEdge, TextIndex, TextNode, TextNodeType } from '../types/text-network.ts';

export const TEXT_INDEX_CACHE_KEY = 'baize_text_index_v1';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface LoadTextIndexOptions {
  url?: string;
  storage?: StorageLike;
  fetcher?: typeof fetch;
}

const nodeTypes = new Set<TextNodeType>(['post', 'note', 'topic', 'project', 'site']);
const optionalStringFields = ['slug', 'summary', 'category', 'format', 'createdAt', 'updatedAt'] as const;

export function parseTextIndex(value: unknown): TextIndex | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<TextIndex>;
  if ((candidate.version !== 1 && candidate.version !== 2) || typeof candidate.generatedAt !== 'string' || Number.isNaN(Date.parse(candidate.generatedAt)) || !Array.isArray(candidate.nodes)) return null;
  if (candidate.version === 2 && !Array.isArray(candidate.edges)) return null;

  const seenIds = new Set<string>();
  for (const node of candidate.nodes) {
    if (!isTextNode(node) || seenIds.has(node.id)) return null;
    seenIds.add(node.id);
  }
  const seenEdges = new Set<string>();
  for (const edge of candidate.edges || []) {
    if (!isTextEdge(edge) || !seenIds.has(edge.from) || !seenIds.has(edge.to) || edge.from === edge.to) return null;
    const key = `${edge.type}:${edge.from}:${edge.to}`;
    if (seenEdges.has(key)) return null;
    seenEdges.add(key);
  }
  return candidate as TextIndex;
}

export function loadCachedTextIndex(storage: StorageLike = localStorage): TextIndex | null {
  try {
    const saved = storage.getItem(TEXT_INDEX_CACHE_KEY);
    if (!saved) return null;
    return parseTextIndex(JSON.parse(saved));
  } catch {
    return null;
  }
}

export async function loadTextIndex({
  url = TEXT_INDEX_URL,
  storage = localStorage,
  fetcher = fetch,
}: LoadTextIndexOptions = {}): Promise<TextIndex | null> {
  const cached = loadCachedTextIndex(storage);
  try {
    const response = await fetcher(url, { cache: 'no-cache', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Text index request failed (${response.status})`);
    const remote = parseTextIndex(await response.json());
    if (!remote) throw new Error('Text index schema is invalid');
    try {
      storage.setItem(TEXT_INDEX_CACHE_KEY, JSON.stringify(remote));
    } catch (error) {
      console.warn('公开文本索引已加载，但无法写入本地缓存。', error);
    }
    return remote;
  } catch (error) {
    console.warn('无法刷新公开文本索引，继续使用本地缓存。', error);
    return cached;
  }
}

function isTextNode(value: unknown): value is TextNode {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const node = value as Partial<TextNode>;
  if (
    typeof node.id !== 'string' || !node.id ||
    typeof node.type !== 'string' || !nodeTypes.has(node.type as TextNodeType) ||
    typeof node.title !== 'string' || !node.title ||
    typeof node.url !== 'string' || !isHttpUrl(node.url) ||
    !Array.isArray(node.tags) || !node.tags.every(item => typeof item === 'string') ||
    !Array.isArray(node.related) || !node.related.every(item => typeof item === 'string')
  ) return false;
  return optionalStringFields.every(field => node[field] === undefined || typeof node[field] === 'string');
}

function isTextEdge(value: unknown): value is TextEdge {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const edge = value as Partial<TextEdge>;
  return (edge.type === 'related' || edge.type === 'wiki') && typeof edge.from === 'string' && typeof edge.to === 'string';
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
