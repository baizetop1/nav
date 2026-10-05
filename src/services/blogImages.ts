import type { RepositoryTarget } from './github';
export const BLOG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export function inspectBlogImage(bytes: Uint8Array): { extension: string; mime: string } {
  if (!bytes.length || bytes.length > BLOG_IMAGE_MAX_BYTES) throw new Error('图片为空或超过 5 MB，请先压缩图片。');
  const starts = (values: number[]) => values.every((value, i) => bytes[i] === value);
  if (starts([137, 80, 78, 71, 13, 10, 26, 10])) return { extension: 'png', mime: 'image/png' };
  if (starts([255, 216, 255])) return { extension: 'jpg', mime: 'image/jpeg' };
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (['GIF87a', 'GIF89a'].includes(ascii(0, 6))) return { extension: 'gif', mime: 'image/gif' };
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { extension: 'webp', mime: 'image/webp' };
  throw new Error('仅支持 PNG、JPEG、GIF、WebP 图片；SVG、HTML 和其他文件不会上传。');
}
export interface BlogImageUpload { path: string; markdownUrl: string; previewUrl: string; commitUrl: string }
export async function uploadBlogImage(bytes: Uint8Array, slug: string, token: string, target: RepositoryTarget, request: typeof fetch = fetch): Promise<BlogImageUpload> {
  const kind = inspectBlogImage(bytes);
  if (!token.trim() || /[\r\n]/.test(token)) throw new Error('请先连接博客仓库 Token。');
  if (!/^[\w.-]+$/.test(target.owner) || !/^[\w.-]+$/.test(target.repo) || !target.branch || /[\x00-\x1f]/.test(target.branch)) throw new Error('博客仓库配置无效。');
  const folder = /^[a-z0-9][a-z0-9-]{0,119}$/.test(slug) ? slug : 'notes';
  const path = `assets/images/posts/${folder}/${crypto.randomUUID()}.${kind.extension}`;
  let binary = ''; for (let i = 0; i < bytes.length; i += 16_384) binary += String.fromCharCode(...bytes.slice(i, i + 16_384));
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const root = `https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}`;
    const response = await request(`${root}/contents/${path}`, { method: 'PUT', headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token.trim()}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' }, body: JSON.stringify({ message: `Add blog image for ${folder}`, branch: target.branch, content: btoa(binary) }), signal: controller.signal });
    if (!response.ok) throw new Error(response.status === 401 ? '博客 Token 无效或已过期。' : response.status === 403 ? '没有图片上传权限，请检查博客仓库 Contents 写入权限。' : [409, 422].includes(response.status) ? '上传发生冲突，未覆盖任何已有文件。请重试。' : `图片上传失败（HTTP ${response.status}）。`);
    const result = await response.json() as { content?: { path?: string }; commit?: { sha?: string } };
    const sha = result.commit?.sha;
    if (result.content?.path !== path || !sha || !/^[a-f0-9]{40,64}$/.test(sha)) throw new Error('GitHub 响应不完整，请到仓库检查图片是否已上传，再决定是否重试。');
    const repo = `${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}`;
    return { path, markdownUrl: `/${path}`, previewUrl: `https://raw.githubusercontent.com/${repo}/${sha}/${path}`, commitUrl: `https://github.com/${repo}/commit/${sha}` };
  } catch (error) { if (controller.signal.aborted) throw new Error('上传超时，结果尚未确认。请先查看仓库图片目录，避免重复上传。'); throw error; }
  finally { clearTimeout(timer); }
}
