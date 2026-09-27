import { classifyStorageError, utf8ByteLength } from './safeStorage.ts';

export const BLOG_DRAFT_KEY_PREFIX = 'baize_blog_draft_v1:';
export const BLOG_WORKSPACE_EVENT = 'baize:blog-workspace-updated';
export const BLOG_MARKDOWN_MAX_BYTES = 256 * 1024;

export interface BlogRepositoryTarget { owner: string; repo: string; branch: string }
export interface BlogDraftSource { path: string; sha: string; markdown: string }
export interface BlogDraftCommit { sha: string; url: string; at: number; path: string }
export interface BlogLocalDraft {
  version: 1;
  id: string;
  revision: number;
  createdAt: number;
  updatedAt: number;
  markdown: string;
  source: BlogDraftSource | null;
  lastCommit?: BlogDraftCommit;
}
export interface BlogDraftIssue { key: string; id?: string; message: string }
export type BlogDraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'length' | 'key'>;
export type BlogDraftLoadResult = { status: 'loaded'; draft: BlogLocalDraft } | { status: 'missing' } | { status: 'error'; message: string };
export type BlogDraftSaveResult = { status: 'saved'; draft: BlogLocalDraft } | { status: 'conflict'; current: BlogLocalDraft | null } | { status: 'error'; message: string };
export type BlogDraftRemoveResult = { status: 'removed' } | { status: 'conflict'; current: BlogLocalDraft | null } | { status: 'error'; message: string };

const validId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const validSha = (value: unknown): value is string => typeof value === 'string' && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(value);
const validTime = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

function assertMarkdown(value: unknown): asserts value is string {
  if (typeof value !== 'string') throw new Error('博客正文格式无效，原记录未改动。');
  if (utf8ByteLength(value) > BLOG_MARKDOWN_MAX_BYTES) throw new Error('单篇博客正文不能超过 256 KiB，请先导出并拆分文章。');
}

function validPath(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 600
    && !/[\\\u0000-\u001f\u007f]/.test(value) && !value.startsWith('/')
    && !value.split('/').some(part => !part || part === '.' || part === '..')
    && /\.md$/i.test(value);
}

function parseCommit(value: unknown): BlogDraftCommit {
  if (!record(value) || !validSha(value.sha) || !validTime(value.at) || !validPath(value.path) || typeof value.url !== 'string') throw new Error('博客提交记录无效，原记录未改动。');
  let url: URL;
  try { url = new URL(value.url); } catch { throw new Error('博客提交链接无效。'); }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || !/^\/[^/]+\/[^/]+\/commit\/(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(url.pathname) || url.hash || url.search) throw new Error('博客提交链接无效。');
  if (!url.pathname.endsWith(`/${value.sha}`)) throw new Error('博客提交链接与 SHA 不一致。');
  return { sha: value.sha, url: value.url, at: value.at, path: value.path };
}

/** Strip unknown properties so incidental credentials or UI state never persist. */
export function parseBlogDraft(value: unknown, expectedId?: string): BlogLocalDraft {
  if (!record(value) || value.version !== 1 || !validId(value.id) || (expectedId !== undefined && value.id !== expectedId)
    || typeof value.revision !== 'number' || !Number.isSafeInteger(value.revision) || value.revision < 0
    || !validTime(value.createdAt) || !validTime(value.updatedAt) || value.updatedAt < value.createdAt) throw new Error('博客本地草稿格式损坏，原记录未改动。');
  assertMarkdown(value.markdown);
  let source: BlogDraftSource | null = null;
  if (value.source !== null) {
    if (!record(value.source) || !validPath(value.source.path) || !validSha(value.source.sha)) throw new Error('博客远端基线损坏，原记录未改动。');
    assertMarkdown(value.source.markdown);
    source = { path: value.source.path, sha: value.source.sha, markdown: value.source.markdown };
  }
  return {
    version: 1, id: value.id, revision: value.revision, createdAt: value.createdAt, updatedAt: value.updatedAt,
    markdown: value.markdown, source,
    ...(value.lastCommit === undefined ? {} : { lastCommit: parseCommit(value.lastCommit) }),
  };
}

/** Owner/repository names are case-insensitive; branch names are not. */
export function blogDraftScope(target: BlogRepositoryTarget): string {
  if (!target || typeof target.owner !== 'string' || typeof target.repo !== 'string' || typeof target.branch !== 'string') throw new Error('博客仓库配置无效。');
  const owner = target.owner.trim().toLowerCase(), repo = target.repo.trim().toLowerCase(), branch = target.branch.trim();
  if (!/^[a-z0-9_.-]{1,100}$/.test(owner) || !/^[a-z0-9_.-]{1,100}$/.test(repo) || ['.', '..'].includes(owner) || ['.', '..'].includes(repo)
    || !branch || branch.length > 300 || /[\u0000-\u0020\u007f~^:?*\[\\]/.test(branch) || branch.includes('..') || branch.includes('@{') || branch.startsWith('/') || branch.endsWith('/') || branch.endsWith('.')) throw new Error('博客仓库配置无效。');
  return `${BLOG_DRAFT_KEY_PREFIX}${[owner, repo, branch].map(encodeURIComponent).join(':')}:`;
}

export function blogDraftStorageKey(target: BlogRepositoryTarget, id: string): string {
  if (!validId(id)) throw new Error('博客草稿编号无效。');
  return `${blogDraftScope(target)}${id}`;
}

function resolveStorage(storage?: BlogDraftStorage): BlogDraftStorage {
  if (storage) return storage;
  if (typeof localStorage === 'undefined') throw new Error('当前环境不能保存博客草稿，请导出 Markdown 后再关闭。');
  return localStorage;
}

function storageMessage(error: unknown): string {
  const kind = classifyStorageError(error);
  if (kind === 'quota') return '浏览器存储空间不足，博客草稿未保存；请先导出 Markdown，当前编辑内容仍保留在页面中。';
  if (kind === 'permission') return '浏览器禁止本地存储，博客草稿未保存；请先导出 Markdown。';
  return error instanceof Error ? error.message : '无法保存博客草稿，请先导出 Markdown。';
}

export function createBlogDraft(target: BlogRepositoryTarget, markdown = '', source: BlogDraftSource | null = null, now = Date.now(), id = crypto.randomUUID()): BlogLocalDraft {
  blogDraftScope(target);
  return parseBlogDraft({ version: 1, id, revision: 0, createdAt: now, updatedAt: now, markdown, source });
}

export function loadBlogDraft(target: BlogRepositoryTarget, id: string, storage?: BlogDraftStorage): BlogDraftLoadResult {
  try {
    const raw = resolveStorage(storage).getItem(blogDraftStorageKey(target, id));
    if (raw === null) return { status: 'missing' };
    const draft = parseBlogDraft(JSON.parse(raw), id);
    if (draft.revision === 0) throw new Error('博客持久草稿缺少有效版本号，原记录未改动。');
    return { status: 'loaded', draft };
  } catch (error) { return { status: 'error', message: storageMessage(error) }; }
}

export function listBlogDrafts(target: BlogRepositoryTarget, storage?: BlogDraftStorage): { drafts: BlogLocalDraft[]; issues: BlogDraftIssue[] } {
  const drafts: BlogLocalDraft[] = [], issues: BlogDraftIssue[] = [];
  try {
    const prefix = blogDraftScope(target), resolved = resolveStorage(storage);
    // Snapshot the keys first; an unrelated tab can add or remove other drafts.
    const keys: string[] = [];
    for (let index = 0; index < resolved.length; index += 1) {
      const key = resolved.key(index);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    for (const key of keys) {
      const id = key.slice(prefix.length), result = loadBlogDraft(target, id, resolved);
      if (result.status === 'loaded') drafts.push(result.draft);
      if (result.status === 'error') issues.push({ key, id, message: result.message });
    }
  } catch (error) { issues.push({ key: BLOG_DRAFT_KEY_PREFIX, message: storageMessage(error) }); }
  drafts.sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
  return { drafts, issues };
}

function notify(target: BlogRepositoryTarget, id: string, action: 'saved' | 'removed', revision?: number): void {
  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') window.dispatchEvent(new CustomEvent(BLOG_WORKSPACE_EVENT, { detail: { scope: blogDraftScope(target), id, action, revision } }));
}

/** Caller must hold the document's Web Lock. Exposed for deterministic tests. */
export function commitBlogDraft(target: BlogRepositoryTarget, expectedRevision: number | null, next: BlogLocalDraft, storage: BlogDraftStorage, now = Date.now()): BlogDraftSaveResult {
  try {
    const normalized = parseBlogDraft(next), key = blogDraftStorageKey(target, normalized.id);
    if (expectedRevision !== null && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)) throw new Error('博客草稿基线版本无效。');
    if (normalized.revision !== (expectedRevision ?? 0)) throw new Error('博客编辑版本与保存基线不一致，请重新打开草稿。');
    const loaded = loadBlogDraft(target, normalized.id, storage);
    if (loaded.status === 'error') return loaded;
    const current = loaded.status === 'loaded' ? loaded.draft : null;
    if ((current?.revision ?? null) !== expectedRevision) return { status: 'conflict', current };
    const draft = parseBlogDraft({ ...normalized, revision: (expectedRevision ?? 0) + 1, createdAt: current?.createdAt ?? normalized.createdAt, updatedAt: Math.max(now, current?.updatedAt ?? 0, normalized.createdAt) });
    // No global retry queue: every retry must recheck the expected revision.
    storage.setItem(key, JSON.stringify(draft));
    notify(target, draft.id, 'saved', draft.revision);
    return { status: 'saved', draft };
  } catch (error) { return { status: 'error', message: storageMessage(error) }; }
}

export function commitBlogDraftRemoval(target: BlogRepositoryTarget, id: string, expectedRevision: number, storage: BlogDraftStorage): BlogDraftRemoveResult {
  try {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw new Error('博客草稿基线版本无效。');
    const key = blogDraftStorageKey(target, id), loaded = loadBlogDraft(target, id, storage);
    if (loaded.status === 'error') return loaded;
    const current = loaded.status === 'loaded' ? loaded.draft : null;
    if (current?.revision !== expectedRevision) return { status: 'conflict', current };
    storage.removeItem(key);
    notify(target, id, 'removed');
    return { status: 'removed' };
  } catch (error) { return { status: 'error', message: storageMessage(error) }; }
}

async function locked<T>(target: BlogRepositoryTarget, id: string, action: () => T): Promise<T | { status: 'error'; message: string }> {
  try {
    const key = blogDraftStorageKey(target, id);
    // localStorage has no atomic compare-and-swap. Refusing an unsafe fallback
    // is preferable to silently losing work when two tabs save at once.
    if (typeof navigator === 'undefined' || !navigator.locks?.request) throw new Error('此浏览器不支持安全的多标签页保存，请使用最新版浏览器的 HTTPS 或 localhost 页面；当前内容可导出 Markdown。');
    return await navigator.locks.request(key, action);
  } catch (error) { return { status: 'error', message: storageMessage(error) }; }
}

export async function saveBlogDraft(target: BlogRepositoryTarget, expectedRevision: number | null, next: BlogLocalDraft): Promise<BlogDraftSaveResult> {
  return locked(target, next.id, () => commitBlogDraft(target, expectedRevision, next, resolveStorage()));
}

export async function removeBlogDraft(target: BlogRepositoryTarget, id: string, expectedRevision: number): Promise<BlogDraftRemoveResult> {
  return locked(target, id, () => commitBlogDraftRemoval(target, id, expectedRevision, resolveStorage()));
}
