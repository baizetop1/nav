import type { InboxItem } from '../types/inbox';
import type { RepositoryTarget } from './github';
import { buildBlogDraftMarkdown, isBlogSlugPathConflict, normalizeBlogDraftInput, type BlogDraftInput } from './blogDraft.ts';
import { parseFrontMatter } from './techOsDraftValidation.ts';

export interface BlogPublicationPlan {
  headSha: string; treeSha: string; filePath: string; draftPath: string | null; markdown: string; slug: string; title: string;
}
const headers = (token: string) => ({ Accept: 'application/vnd.github+json', Authorization: `Bearer ${token.trim()}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' });
function root(target: RepositoryTarget) {
  if (!/^[\w.-]+$/.test(target.owner) || !/^[\w.-]+$/.test(target.repo) || !target.branch.trim()) throw new Error('博客仓库配置无效。');
  return `https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}`;
}
async function json<T>(url: string, token: string, request: typeof fetch, init: RequestInit = {}): Promise<T> {
  const response = await request(url, { ...init, headers: headers(token) });
  if (!response.ok) throw new Error(response.status === 401 ? 'GitHub Token 无效或已过期。' : response.status === 403 ? '请授权博客仓库 Contents 读写权限。' : [409, 422].includes(response.status) ? '博客远端已变化，请重新预览后发布；不会强制覆盖。' : `GitHub 请求失败 (${response.status})`);
  return response.json() as Promise<T>;
}

export async function prepareBlogPublication(item: InboxItem, input: BlogDraftInput, token: string, target: RepositoryTarget, now = new Date(), request: typeof fetch = fetch): Promise<BlogPublicationPlan> {
  const normalized = normalizeBlogDraftInput(input), base = root(target);
  if (!token.trim()) throw new Error('请输入博客 Token。');
  if (!item.content?.trim() && !item.url) throw new Error('正文为空，不能公开发布。');
  const ref = await json<{ object: { sha: string } }>(`${base}/git/ref/heads/${encodeURIComponent(target.branch)}`, token, request);
  const head = await json<{ tree: { sha: string } }>(`${base}/git/commits/${ref.object.sha}`, token, request);
  const tree = await json<{ truncated: boolean; tree: Array<{ path: string; sha: string; type: string; mode: string }> }>(`${base}/git/trees/${head.tree.sha}?recursive=1`, token, request);
  if (tree.truncated) throw new Error('博客目录被截断，已停止以避免漏检文章冲突。');
  const matches = tree.tree.filter(entry => isBlogSlugPathConflict(entry.path, normalized.slug));
  if (matches.some(entry => entry.path.startsWith('_posts/'))) throw new Error(`这篇文章已经发布：/p/${normalized.slug}/。不会创建重复文章。`);
  const draft = matches.find(entry => entry.path === `_drafts/${normalized.slug}.md`);
  let markdown = buildBlogDraftMarkdown(item, normalized, now);
  if (draft) {
    if (draft.type !== 'blob' || draft.mode !== '100644') throw new Error('草稿不是普通 Markdown 文件，已停止。');
    const blob = await json<{ content: string; encoding: string; size: number }>(`${base}/git/blobs/${draft.sha}`, token, request);
    if (blob.encoding !== 'base64' || blob.size > 256 * 1024) throw new Error('草稿编码或大小不受支持。');
    markdown = new TextDecoder().decode(Uint8Array.from(atob(blob.content.replace(/\s/g, '')), char => char.charCodeAt(0)));
  }
  markdown = markdown.replace(/\r\n/g, '\n');
  const { data, body } = parseFrontMatter(markdown, '博客草稿');
  if (data.slug !== normalized.slug || data.permalink !== `/p/${normalized.slug}/`) throw new Error('远端草稿的 slug/permalink 与目标不一致，请先修正草稿。');
  if (!data.title || !data.category || !Array.isArray(data.tags) || !data.tags.length || !body.trim()) throw new Error('缺少标题、分类、标签或正文，无法发布。');
  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  const end = markdown.indexOf('\n---\n', 4);
  let frontMatter = markdown.slice(0, end);
  for (const [key, value] of Object.entries({ date, status: 'published' })) {
    frontMatter = new RegExp(`^${key}:.*$`, 'm').test(frontMatter) ? frontMatter.replace(new RegExp(`^${key}:.*$`, 'm'), `${key}: ${value}`) : `${frontMatter}\n${key}: ${value}`;
  }
  return { headSha: ref.object.sha, treeSha: head.tree.sha, filePath: `_posts/${date}-${normalized.slug}.md`, draftPath: draft?.path || null, markdown: frontMatter + markdown.slice(end), slug: normalized.slug, title: String(data.title) };
}

export async function publishBlogPlan(plan: BlogPublicationPlan, token: string, target: RepositoryTarget, request: typeof fetch = fetch) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(plan.slug) || !new RegExp(`^_posts/\\d{4}-\\d{2}-\\d{2}-${plan.slug}\\.md$`).test(plan.filePath) || (plan.draftPath !== null && plan.draftPath !== `_drafts/${plan.slug}.md`) || !/^[a-f0-9]{40}$/.test(plan.headSha) || !/^[a-f0-9]{40}$/.test(plan.treeSha)) throw new Error('发布计划无效，请重新预览。');
  const base = root(target);
  const ref = await json<{ object: { sha: string } }>(`${base}/git/ref/heads/${encodeURIComponent(target.branch)}`, token, request);
  if (ref.object.sha !== plan.headSha) throw new Error('博客远端已变化，请重新预览。尚未发布任何内容。');
  const entries: Array<Record<string, unknown>> = [{ path: plan.filePath, mode: '100644', type: 'blob', content: plan.markdown }];
  if (plan.draftPath) entries.push({ path: plan.draftPath, mode: '100644', type: 'blob', sha: null });
  const tree = await json<{ sha: string }>(`${base}/git/trees`, token, request, { method: 'POST', body: JSON.stringify({ base_tree: plan.treeSha, tree: entries }) });
  const commit = await json<{ sha: string; html_url: string }>(`${base}/git/commits`, token, request, { method: 'POST', body: JSON.stringify({ message: `Publish: ${plan.title}`.slice(0, 120), tree: tree.sha, parents: [plan.headSha] }) });
  await json(`${base}/git/refs/heads/${encodeURIComponent(target.branch)}`, token, request, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });
  return { sha: commit.sha, commitUrl: commit.html_url || `https://github.com/${target.owner}/${target.repo}/commit/${commit.sha}`, filePath: plan.filePath, slug: plan.slug };
}
