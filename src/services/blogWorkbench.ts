import type { RepositoryTarget } from './github';
import type { BlogDeployment, BlogDocument, BlogEntry, BlogSaveAction, BlogSnapshot, BlogSource, BlogWritePlan, BlogWriteResult } from '../types/blog';

export const BLOG_MARKDOWN_MAX_BYTES = 256 * 1024;
const SHA = /^[a-f0-9]{40}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;
const TIMEOUT_MS = 20_000;
const stringFields = ['title', 'slug', 'category', 'format', 'date', 'permalink', 'status'] as const;
type Field = { key: string; start: number; end: number; value: string };
type Front = { lines: string[]; fields: Map<string, Field>; body: string; eol: string; bom: string; rawOpening: string; rawFront: string; rawClosing: string; rawBody: string };

function splitMarkdown(markdown: string): Front {
  if (typeof markdown !== 'string' || new TextEncoder().encode(markdown).length > BLOG_MARKDOWN_MAX_BYTES) throw new Error('文章超过 256 KB，暂不支持编辑。');
  const bom = markdown.startsWith('\uFEFF') ? '\uFEFF' : '';
  const text = markdown.slice(bom.length);
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const normalized = text.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) throw new Error('文章缺少 YAML Front Matter，不能安全编辑。');
  const match = /\n---(?:\n|$)/.exec(normalized.slice(4));
  if (!match) throw new Error('文章 Front Matter 没有结束标记。');
  const end = 4 + match.index;
  const rawOpening = /^---\r?\n/.exec(text)![0];
  const rawMatch = /\r?\n---(?:\r?\n|$)/.exec(text.slice(rawOpening.length))!;
  const rawEnd = rawOpening.length + rawMatch.index;
  const lines = normalized.slice(4, end).split('\n');
  const fields = new Map<string, Field>();
  let last: Field | null = null;
  for (let i = 0; i < lines.length; i += 1) {
    const field = /^([A-Za-z_][\w-]*):(?:[ \t]*(.*))?$/.exec(lines[i]);
    if (!field) continue;
    if (fields.has(field[1])) throw new Error('文章包含重复的 Front Matter 字段：' + field[1]);
    if (last) last.end = i;
    last = { key: field[1], start: i, end: lines.length, value: field[2] || '' };
    fields.set(last.key, last);
  }
  return { lines, fields, body: normalized.slice(end + match[0].length), eol, bom, rawOpening, rawFront: text.slice(rawOpening.length, rawEnd), rawClosing: rawMatch[0], rawBody: text.slice(rawEnd + rawMatch[0].length) };
}

function stripComment(raw: string): string {
  let quote = '';
  let escaped = false;
  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    if (quote === '"') {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quote = '';
    } else if (quote === "'") {
      if (char === "'" && raw[i + 1] === "'") i += 1;
      else if (char === "'") quote = '';
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '#' && (i === 0 || /\s/.test(raw[i - 1]))) return raw.slice(0, i).trim();
  }
  return raw.trim();
}
function scalar(raw: string, field: string): string {
  const value = stripComment(raw);
  if (!value || value === 'null' || value === '~') return '';
  if (value.startsWith('"')) {
    try { const parsed: unknown = JSON.parse(value); if (typeof parsed === 'string') return parsed; } catch { /* reject, do not flatten YAML */ }
    throw new Error(field + ' 使用了暂不支持的 YAML 引号格式。');
  }
  if (value.startsWith("'")) {
    if (!value.endsWith("'")) throw new Error(field + ' 的 YAML 引号未闭合。');
    return value.slice(1, -1).replace(/''/g, "'");
  }
  if (/^[\[{}*&!]|:\s/.test(value)) throw new Error(field + ' 使用了暂不支持的复杂 YAML，请在源文件中检查。');
  return value;
}
function readScalar(front: Front, key: string): string {
  const field = front.fields.get(key);
  if (!field) return '';
  const value = stripComment(field.value);
  if (/^[|>][+-]?$/.test(value)) {
    const lines = front.lines.slice(field.start + 1, field.end);
    const meaningful = lines.filter(line => line.trim() && !line.trimStart().startsWith('#'));
    const indent = Math.min(...meaningful.map(line => line.match(/^\s*/)?.[0].length ?? 0));
    if (!Number.isFinite(indent) || indent === 0) return '';
    const body = lines.map(line => line.slice(indent)).join(value.startsWith('>') ? ' ' : '\n');
    return body.trimEnd();
  }
  const continuation = front.lines.slice(field.start + 1, field.end).filter(line => line.trim() && !line.trimStart().startsWith('#'));
  if (continuation.length) throw new Error(key + ' 包含复杂 YAML，不能安全读取为文本字段。');
  return scalar(value, key);
}
function inlineList(value: string, key: string): string[] {
  if (!value.endsWith(']')) throw new Error(key + ' 的 YAML 列表未闭合。');
  const items: string[] = [];
  let start = 1, quote = '', escaped = false;
  for (let i = 1; i < value.length - 1; i += 1) {
    const char = value[i];
    if (quote === '"') {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quote = '';
    } else if (quote === "'") {
      if (char === "'" && value[i + 1] === "'") i += 1;
      else if (char === "'") quote = '';
    } else if (char === '"' || char === "'") quote = char;
    else if (char === ',') { items.push(scalar(value.slice(start, i), key)); start = i + 1; }
  }
  if (quote) throw new Error(key + ' 的 YAML 列表引号未闭合。');
  if (value.slice(start, -1).trim()) items.push(scalar(value.slice(start, -1), key));
  return items.filter(Boolean);
}
function readList(front: Front, key: string): string[] {
  const field = front.fields.get(key);
  if (!field) return [];
  const value = stripComment(field.value);
  if (value.startsWith('[')) return inlineList(value, key);
  if (value && value !== 'null' && value !== '~') return [scalar(value, key)].filter(Boolean);
  const list: string[] = [];
  for (const line of front.lines.slice(field.start + 1, field.end)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const item = /^\s*-\s+(.+)$/.exec(line);
    if (!item) throw new Error(key + ' 包含暂不支持的嵌套列表。');
    list.push(scalar(item[1], key));
  }
  return list.filter(Boolean);
}
export function readBlogDocument(markdown: string): BlogDocument {
  const front = splitMarkdown(markdown);
  return {
    title: readScalar(front, 'title'), slug: readScalar(front, 'slug'),
    category: readScalar(front, 'category'), format: readScalar(front, 'format'),
    date: readScalar(front, 'date'), permalink: readScalar(front, 'permalink'),
    status: readScalar(front, 'status'), tags: readList(front, 'tags'),
    related: readList(front, 'related'), body: front.body,
  };
}

/** Patch only explicitly changed fields. Unknown mappings, comments and field order stay intact. */
export function editBlogDocument(markdown: string, changes: Partial<BlogDocument>): string {
  const front = splitMarkdown(markdown), previous = readBlogDocument(markdown);
  const replacements = new Map<number, string[]>();
  const removed = new Set<number>();
  const added: string[] = [];
  for (const key of [...stringFields, 'tags', 'related'] as const) {
    const changed = changes[key];
    if (changed === undefined || JSON.stringify(previous[key]) === JSON.stringify(changed)) continue;
    const values = Array.isArray(changed) ? [...new Set(changed.map(value => value.trim()).filter(Boolean))] : changed;
    if (typeof values !== 'string' && (!Array.isArray(values) || values.some(value => typeof value !== 'string'))) throw new Error('文章元数据格式无效。');
    const replacement = Array.isArray(values)
      ? values.length ? [key + ':', ...values.map(value => '    - ' + JSON.stringify(value))] : [key + ': []']
      : [key + ': ' + JSON.stringify(values)];
    const existing = front.fields.get(key);
    if (!existing) added.push(...replacement);
    else {
      replacements.set(existing.start, replacement);
      for (let i = existing.start + 1; i < existing.end; i += 1) {
        if (front.lines[i].trim() && !front.lines[i].trimStart().startsWith('#')) removed.add(i);
      }
    }
  }
  const bodyChanged = changes.body !== undefined && changes.body.replace(/\r\n/g, '\n') !== front.body;
  if (!replacements.size && !added.length && !bodyChanged) return markdown;
  const rawLines = front.rawFront.match(/[^\n]*\n|[^\n]+$/g) || [];
  let metadata = rawLines.map((rawLine, index) => {
    if (removed.has(index)) return '';
    const replacement = replacements.get(index);
    if (!replacement) return rawLine;
    const ending = rawLine.endsWith('\r\n') ? '\r\n' : rawLine.endsWith('\n') ? '\n' : '';
    return replacement.join(front.eol) + ending;
  }).join('');
  if (added.length) metadata += (metadata && !metadata.endsWith('\n') ? front.eol : '') + added.join(front.eol);
  const body = bodyChanged ? changes.body!.replace(/\r?\n/g, front.eol) : front.rawBody;
  return front.bom + front.rawOpening + metadata + front.rawClosing + body;
}
function localDate(now: Date): string { return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-'); }
export function createBlogMarkdown(input: Partial<BlogDocument> = {}, now = new Date()): string {
  const slug = input.slug || 'note-' + localDate(now).replace(/-/g, '') + '-' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + String(now.getSeconds()).padStart(2, '0');
  const base = '---\nlayout: post\ntitle: "未命名文章"\nsubtitle: ""\ndate: "' + localDate(now) + '"\nauthor: 白泽\ncatalog: true\ncategory: "随笔"\nformat: "笔记"\nstatus: draft\nslug: ' + JSON.stringify(slug) + '\npermalink: ' + JSON.stringify('/p/' + slug + '/') + '\ntags:\n    - "记录"\nrelated: []\n---\n\n';
  return editBlogDocument(base, { ...input, slug, permalink: input.permalink ?? '/p/' + slug + '/' });
}

export function isBlogPath(path: string): boolean {
  return !/[\u0000-\u001f\\]/.test(path) && !path.split('/').some(part => part === '.' || part === '..' || !part)
    && (/^_drafts\/[^/]+\.md$/i.test(path) || /^_posts\/.+\.md$/i.test(path));
}
function kindOf(path: string): BlogEntry['kind'] { return path.startsWith('_drafts/') ? 'draft' : 'published'; }
function root(target: RepositoryTarget): string {
  if (!/^[\w.-]+$/.test(target.owner) || !/^[\w.-]+$/.test(target.repo) || !target.branch.trim() || /[\u0000-\u0020~^:?*[\]\\]/.test(target.branch) || target.branch.includes('..')) throw new Error('博客仓库配置无效。');
  return 'https://api.github.com/repos/' + encodeURIComponent(target.owner) + '/' + encodeURIComponent(target.repo);
}
function requireToken(token: string): void { if (!token.trim()) throw new Error('请输入博客仓库的 GitHub Token。Token 仅在当前页面内存中使用。'); }
async function json<T>(url: string, token: string, request: typeof fetch, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await request(url, { ...init, signal: controller.signal, headers: { Accept: 'application/vnd.github+json', ...(token.trim() ? { Authorization: 'Bearer ' + token.trim() } : {}), 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' } });
    if (!response.ok) {
      if (response.status === 401) throw new Error('GitHub Token 无效或已过期，请重新输入。');
      if (response.status === 403 || response.status === 429) throw new Error('GitHub 权限不足或请求额度耗尽。请确认博客仓库 Contents 读写权限；部署状态还需要 Deployments 读取权限。');
      if (response.status === 404) throw new Error('未找到博客仓库、分支或文件，请检查配置和 Token 的仓库访问权限。');
      if ([409, 422].includes(response.status)) throw new Error('远端在提交期间发生变化，未强制覆盖。请重新读取并预览。');
      throw new Error('GitHub 请求失败（' + response.status + '）。请稍后重试。');
    }
    const length = Number(response.headers.get('Content-Length'));
    if (length > 20 * 1024 * 1024) throw new Error('GitHub 响应过大，已停止读取。');
    return await response.json() as T;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('GitHub 请求超时，请检查网络后重试；提交结果不明确时请先重新读取仓库。');
    if (error instanceof TypeError) throw new Error('无法连接 GitHub，请检查网络；本地文章不会被删除。');
    throw error;
  } finally { clearTimeout(timer); }
}
function checkedSha(value: unknown): string {
  if (typeof value !== 'string' || !SHA.test(value)) throw new Error('GitHub 返回了无效的文件或提交 SHA。');
  return value;
}
async function snapshot(token: string, target: RepositoryTarget, request: typeof fetch): Promise<BlogSnapshot> {
  const base = root(target);
  const ref = await json<{ object: { sha: string } }>(base + '/git/ref/heads/' + encodeURIComponent(target.branch), token, request);
  const headSha = checkedSha(ref.object?.sha);
  const head = await json<{ tree: { sha: string } }>(base + '/git/commits/' + headSha, token, request);
  const treeSha = checkedSha(head.tree?.sha);
  const tree = await json<{ truncated: boolean; tree: Array<{ path: string; sha: string; type: string; mode: string }> }>(base + '/git/trees/' + treeSha + '?recursive=1', token, request);
  if (tree.truncated !== false || !Array.isArray(tree.tree)) throw new Error('博客目录清单被截断或不完整，已停止，避免遗漏文章或冲突。');
  const seen = new Set<string>();
  const entries: BlogEntry[] = [];
  for (const entry of tree.tree) {
    if (typeof entry.path !== 'string' || !isBlogPath(entry.path)) continue;
    if (entry.type !== 'blob' || !['100644', '100755'].includes(entry.mode)) throw new Error('博客文章不是普通 Markdown 文件：' + entry.path);
    if (seen.has(entry.path)) throw new Error('GitHub 目录包含重复路径，已停止。');
    seen.add(entry.path);
    entries.push({ path: entry.path, sha: checkedSha(entry.sha), kind: kindOf(entry.path), title: entry.path.substring(entry.path.lastIndexOf('/') + 1).replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/i, '') });
  }
  return { headSha, treeSha, entries: entries.sort((a, b) => b.path.localeCompare(a.path)) };
}
export async function listBlogEntries(token: string, target: RepositoryTarget, request: typeof fetch = fetch): Promise<BlogSnapshot> { return snapshot(token, target, request); }
async function readBlob(sha: string, token: string, target: RepositoryTarget, request: typeof fetch): Promise<string> {
  checkedSha(sha);
  const blob = await json<{ content: string; encoding: string; size: number }>(root(target) + '/git/blobs/' + sha, token, request);
  if (blob.encoding !== 'base64' || !Number.isSafeInteger(blob.size) || blob.size < 0 || blob.size > BLOG_MARKDOWN_MAX_BYTES || typeof blob.content !== 'string' || blob.content.length > BLOG_MARKDOWN_MAX_BYTES * 1.5) throw new Error('文章编码或大小不受支持（上限 256 KB）。');
  let markdown: string;
  try {
    const bytes = Uint8Array.from(atob(blob.content.replace(/\s/g, '')), char => char.charCodeAt(0));
    if (bytes.length !== blob.size || bytes.length > BLOG_MARKDOWN_MAX_BYTES) throw new Error('size');
    markdown = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch { throw new Error('文章不是有效的 UTF-8 Markdown，已停止读取。'); }
  return markdown;
}
export async function loadBlogSource(entry: Pick<BlogEntry, 'path' | 'sha'>, token: string, target: RepositoryTarget, request: typeof fetch = fetch): Promise<BlogSource> {
  if (!isBlogPath(entry.path)) throw new Error('不允许读取此博客路径。');
  const sha = checkedSha(entry.sha);
  const markdown = await readBlob(sha, token, target, request);
  readBlogDocument(markdown);
  return { path: entry.path, sha, markdown };
}
function slugCollision(path: string, slug: string): boolean {
  const basename = path.substring(path.lastIndexOf('/') + 1).replace(/\.md$/i, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
  return basename.toLowerCase() === slug.toLowerCase();
}
function assertSource(source: BlogSource | null, entries: BlogEntry[]): void {
  if (!source) return;
  if (!isBlogPath(source.path) || !SHA.test(source.sha)) throw new Error('原始文章信息无效，请重新读取。');
  const current = entries.find(entry => entry.path === source.path);
  if (!current || current.sha !== source.sha) throw new Error('这篇文章已在远端被修改或删除。请先读取远端并比较，不会覆盖你的本地版本。');
}
function assertIdentity(original: string, edited: string): void {
  const before = readBlogDocument(original), after = readBlogDocument(edited);
  for (const key of ['slug', 'permalink', 'date', 'status'] as const) {
    if (before[key] !== after[key]) throw new Error('现有文章的 ' + key + ' 不能修改，以保持文章日期、状态与原链接。');
  }
}
function validateDocument(markdown: string, published: boolean, existingPublished: boolean): BlogDocument {
  const doc = readBlogDocument(markdown);
  if (!doc.title.trim()) throw new Error('请输入文章标题。');
  if (published && !doc.body.trim()) throw new Error('正文为空，不能公开发布。');
  if (!existingPublished) {
    if (!SLUG.test(doc.slug)) throw new Error('slug 须为 1–120 位小写英文、数字和连字号。');
    if (doc.permalink !== '/p/' + doc.slug + '/') throw new Error('新文章的 permalink 必须与 slug 对应。');
    if (!doc.category.trim() || !doc.format.trim() || !doc.tags.length) throw new Error('请填写分类、文章形式和至少一个标签。');
  }
  if (doc.related.some(item => !SLUG.test(item))) throw new Error('相关文章须填写有效的文章 slug。');
  return doc;
}
function assertDestination(path: string, source: BlogSource | null, doc: BlogDocument, entries: BlogEntry[], checkSlug: boolean): void {
  if (!isBlogPath(path)) throw new Error('发布目标路径无效。');
  if (entries.some(entry => entry.path === path && entry.path !== source?.path)) throw new Error('目标文章路径已存在，不会覆盖，请更换 slug 或打开现有文章。');
  if (checkSlug && entries.some(entry => entry.path !== source?.path && slugCollision(entry.path, doc.slug))) throw new Error('相同 slug 的文章或草稿已存在，请更换 slug 或打开现有文章。');
}
// Immutable blob SHA keys keep repeated previews fast, without caching credentials.
const identityCache = new Map<string, { slug: string; permalink: string }>();
async function assertUniquePermalink(source: BlogSource | null, doc: BlogDocument, entries: BlogEntry[], token: string, target: RepositoryTarget, request: typeof fetch): Promise<void> {
  const others = entries.filter(entry => entry.path !== source?.path);
  if (others.length > 1000) throw new Error('博客超过 1000 篇，无法在浏览器中完整检查重复链接。请先通过 GitHub 管理新文章。');
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(6, others.length) }, async () => {
    while (next < others.length) {
      const entry = others[next++];
      const cacheKey = root(target) + '/' + entry.sha;
      let identity = identityCache.get(cacheKey);
      if (!identity) {
        try {
          const front = splitMarkdown(await readBlob(entry.sha, token, target, request));
          identity = { slug: readScalar(front, 'slug'), permalink: readScalar(front, 'permalink') };
          if (identityCache.size >= 2000) identityCache.delete(identityCache.keys().next().value as string);
          identityCache.set(cacheKey, identity);
        } catch (error) {
          throw new Error('无法完整检查文章链接（' + entry.path + '）：' + (error instanceof Error ? error.message : '读取失败'));
        }
      }
      if ((identity.slug && identity.slug.toLowerCase() === doc.slug.toLowerCase()) || identity.permalink.replace(/\/+$/, '') === doc.permalink.replace(/\/+$/, '')) throw new Error('相同 slug 或永久链接已被文章使用：' + entry.path);
    }
  }));
}
export async function prepareBlogWrite(input: { source: BlogSource | null; markdown: string; action: BlogSaveAction }, token: string, target: RepositoryTarget, now = new Date(), request: typeof fetch = fetch): Promise<BlogWritePlan> {
  requireToken(token);
  const { source, action } = input;
  if (action !== 'publish' && action !== 'save-draft') throw new Error('不支持的博客操作。');
  const published = !!source && kindOf(source.path) === 'published';
  if (published && action !== 'publish') throw new Error('已发表文章不能转换为草稿；请使用更新文章。');
  if (source) assertIdentity(source.markdown, input.markdown);
  if (source && input.markdown === source.markdown && (published || action === 'save-draft')) throw new Error('文章内容没有变化，无需再次提交。');
  let markdown = input.markdown;
  const initial = validateDocument(markdown, action === 'publish', published);
  const date = localDate(now);
  let path = source?.path || '_drafts/' + initial.slug + '.md';
  let deletePath: string | null = null;
  if (action === 'publish' && !published) {
    path = '_posts/' + date + '-' + initial.slug + '.md';
    deletePath = source?.path || null;
    markdown = editBlogDocument(markdown, { date, status: 'published' });
  } else if (!published && !source) markdown = editBlogDocument(markdown, { status: 'draft' });
  const current = await snapshot(token, target, request);
  assertSource(source, current.entries);
  assertDestination(path, source, initial, current.entries, !published);
  if (!published) await assertUniquePermalink(source, initial, current.entries, token, target, request);
  return Object.freeze({ headSha: current.headSha, treeSha: current.treeSha, path, deletePath, markdown, action, title: initial.title, slug: initial.slug, source: source ? Object.freeze({ ...source }) : null, target: Object.freeze({ ...target }) });
}
function validatePlan(plan: BlogWritePlan, target: RepositoryTarget): BlogDocument {
  if (!plan || !SHA.test(plan.headSha) || !SHA.test(plan.treeSha) || plan.target.owner !== target.owner || plan.target.repo !== target.repo || plan.target.branch !== target.branch) throw new Error('发布计划不属于此仓库，请重新预览。');
  if (plan.action !== 'publish' && plan.action !== 'save-draft') throw new Error('发布计划操作无效。');
  const existingPublished = !!plan.source && kindOf(plan.source.path) === 'published';
  const doc = validateDocument(plan.markdown, plan.action === 'publish', existingPublished);
  if (existingPublished) {
    if (plan.path !== plan.source!.path || plan.deletePath || plan.action !== 'publish') throw new Error('已发表文章必须保持原路径。');
    assertIdentity(plan.source!.markdown, plan.markdown);
  } else if (plan.action === 'save-draft') {
    if (plan.path !== (plan.source?.path || '_drafts/' + doc.slug + '.md') || plan.deletePath || (!plan.source && doc.status !== 'draft')) throw new Error('草稿计划与预览不一致。');
    if (plan.source) assertIdentity(plan.source.markdown, plan.markdown);
  } else {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.date) || plan.path !== '_posts/' + doc.date + '-' + doc.slug + '.md' || plan.deletePath !== (plan.source?.path || null) || doc.status !== 'published') throw new Error('发表路径与预览不一致。');
    if (plan.source) {
      const before = readBlogDocument(plan.source.markdown);
      if (before.slug !== doc.slug || before.permalink !== doc.permalink) throw new Error('草稿 slug 或链接在预览后改变，请重新预览。');
    }
  }
  if (plan.slug !== doc.slug || plan.title !== doc.title) throw new Error('文章内容在预览后改变，请重新预览。');
  return doc;
}
async function blobSha(markdown: string): Promise<string> {
  const content = new TextEncoder().encode(markdown), header = new TextEncoder().encode('blob ' + content.length + '\0');
  const bytes = new Uint8Array(header.length + content.length); bytes.set(header); bytes.set(content, header.length);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function commitBlogWrite(plan: BlogWritePlan, token: string, target: RepositoryTarget, request: typeof fetch = fetch): Promise<BlogWriteResult> {
  requireToken(token);
  const doc = validatePlan(plan, target), base = root(target);
  // Rebase only unchanged target blobs onto the latest repository tree.
  const current = await snapshot(token, target, request);
  assertSource(plan.source, current.entries);
  assertDestination(plan.path, plan.source, doc, current.entries, !plan.source || kindOf(plan.source.path) !== 'published');
  if (!plan.source || kindOf(plan.source.path) !== 'published') await assertUniquePermalink(plan.source, doc, current.entries, token, target, request);
  const contentSha = await blobSha(plan.markdown);
  const entries: Array<Record<string, unknown>> = [{ path: plan.path, mode: '100644', type: 'blob', content: plan.markdown }];
  if (plan.deletePath) entries.push({ path: plan.deletePath, mode: '100644', type: 'blob', sha: null });
  const tree = await json<{ sha: string }>(base + '/git/trees', token, request, { method: 'POST', body: JSON.stringify({ base_tree: current.treeSha, tree: entries }) });
  const commit = await json<{ sha: string }>(base + '/git/commits', token, request, { method: 'POST', body: JSON.stringify({ message: (plan.action === 'save-draft' ? 'Draft: ' : plan.source && !plan.deletePath ? 'Update: ' : 'Publish: ') + plan.title.slice(0, 120), tree: checkedSha(tree.sha), parents: [current.headSha] }) });
  const sha = checkedSha(commit.sha);
  await json(base + '/git/refs/heads/' + encodeURIComponent(target.branch), token, request, { method: 'PATCH', body: JSON.stringify({ sha, force: false }) });
  return { sha, commitUrl: 'https://github.com/' + target.owner + '/' + target.repo + '/commit/' + sha, path: plan.path, slug: plan.slug, markdown: plan.markdown, source: { path: plan.path, sha: contentSha, markdown: plan.markdown } };
}
export async function getBlogDeployment(target: RepositoryTarget, token: string, sha: string, request: typeof fetch = fetch): Promise<BlogDeployment> {
  try {
    checkedSha(sha);
    const base = root(target);
    const deployments = await json<Array<{ id: number; environment: string; sha: string }>>(base + '/deployments?sha=' + sha + '&environment=github-pages&per_page=100', token, request);
    if (!Array.isArray(deployments)) throw new Error('部署列表格式无效。');
    const deployment = deployments.filter(item => item.sha === sha && item.environment === 'github-pages' && Number.isSafeInteger(item.id)).sort((a, b) => b.id - a.id)[0];
    const actionsUrl = 'https://github.com/' + target.owner + '/' + target.repo + '/actions';
    if (!deployment) return { state: 'waiting', message: '提交已保存，等待 GitHub Pages 创建部署。', url: actionsUrl };
    const statuses = await json<Array<{ state: string; log_url?: string; environment_url?: string }>>(base + '/deployments/' + deployment.id + '/statuses?per_page=1', token, request);
    const state = statuses[0]?.state;
    const url = statuses[0]?.log_url;
    const safeUrl = url && /^https:\/\/github\.com\//i.test(url) ? url : actionsUrl;
    if (state === 'success') return { state: 'success', message: 'GitHub Pages 已完成此提交的部署。', url: safeUrl };
    if (state === 'failure' || state === 'error') return { state: 'failure', message: 'GitHub Pages 部署失败；文章已提交，请查看部署日志。', url: safeUrl };
    if (state === 'in_progress' || state === 'queued' || state === 'pending') return { state: state === 'in_progress' ? 'running' : 'waiting', message: state === 'in_progress' ? 'GitHub Pages 正在部署此提交。' : 'GitHub Pages 部署已排队。', url: safeUrl };
    return { state: 'unknown', message: state === 'inactive' ? '此提交的部署已被后续部署替代。' : '提交已保存，暂未获取到明确的 Pages 部署结果。', url: safeUrl };
  } catch (error) { return { state: 'unknown', message: '无法确认部署状态：' + (error instanceof Error ? error.message : '请查看 GitHub Actions。') }; }
}
