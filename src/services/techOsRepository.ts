import type { RepositoryTarget } from './github';
import type { TechOsSourceFile } from '../types/tech-os';
import type { TechOsCommitResult, TechOsFileDiff, TechOsRemoteFile, TechOsRepositorySnapshot } from '../types/tech-os-repository';

const API_ROOT = 'https://api.github.com';
const MAX_FILE_BYTES = 256 * 1024;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;
const MAX_FILES = 500;

interface GitRefResponse { object: { sha: string } }
interface GitCommitResponse { sha: string; tree: { sha: string }; html_url?: string }
interface GitTreeResponse { truncated: boolean; tree: Array<{ path: string; mode: string; type: string; sha: string; size?: number }> }
interface GitBlobResponse { sha: string; content: string; encoding: string; size: number }

export function getBundledTechOsFiles(index: { files: TechOsSourceFile[] }): TechOsSourceFile[] {
  return index.files.map(file => ({ path: file.path, content: normalizeContent(file.content) }));
}

export function diffTechOsFiles(localFiles: TechOsSourceFile[], remoteFiles: TechOsSourceFile[]): TechOsFileDiff[] {
  const local = new Map(localFiles.map(file => [file.path, normalizeContent(file.content)]));
  const remote = new Map(remoteFiles.map(file => [file.path, normalizeContent(file.content)]));
  return [...new Set([...local.keys(), ...remote.keys()])].sort().map(path => {
    const localContent = local.get(path) ?? null;
    const remoteContent = remote.get(path) ?? null;
    const status = localContent === null ? 'remote-only' : remoteContent === null ? 'local-only' : localContent === remoteContent ? 'same' : 'modified';
    return { path, status, localContent, remoteContent };
  });
}

export async function readTechOsRepository(
  target: RepositoryTarget,
  token: string,
  request: typeof fetch = fetch,
): Promise<TechOsRepositorySnapshot> {
  const normalizedTarget = normalizeTarget(target);
  const ref = await githubRequest<GitRefResponse>(normalizedTarget, token, request, `/git/ref/heads/${encodeURIComponent(normalizedTarget.branch)}`);
  const commit = await githubRequest<GitCommitResponse>(normalizedTarget, token, request, `/git/commits/${ref.object.sha}`);
  const tree = await githubRequest<GitTreeResponse>(normalizedTarget, token, request, `/git/trees/${commit.tree.sha}?recursive=1`);
  if (tree.truncated) throw new Error('远端仓库目录过大，GitHub 返回了截断的文件树；为避免遗漏，已停止读取。');

  const entries = tree.tree.filter(entry => entry.type === 'blob' && isManagedTechOsPath(entry.path));
  if (entries.length > MAX_FILES) throw new Error(`Tech OS 文件超过 ${MAX_FILES} 个，已停止读取。`);
  if (entries.some(entry => (entry.size || 0) > MAX_FILE_BYTES)) throw new Error('远端存在超过 256 KiB 的 Tech OS 文件，已停止读取。');
  if (entries.reduce((sum, entry) => sum + (entry.size || 0), 0) > MAX_TOTAL_BYTES) throw new Error('远端 Tech OS 文件总量超过 2 MiB，已停止读取。');

  const files = await Promise.all(entries.map(async entry => {
    const blob = await githubRequest<GitBlobResponse>(normalizedTarget, token, request, `/git/blobs/${entry.sha}`);
    if (blob.encoding !== 'base64') throw new Error(`GitHub 返回了不支持的 blob 编码：${entry.path}`);
    const content = decodeBase64Utf8(blob.content);
    assertFileSize(entry.path, content);
    return { path: entry.path, content: normalizeContent(content), blobSha: blob.sha } satisfies TechOsRemoteFile;
  }));

  return { target: normalizedTarget, headSha: ref.object.sha, treeSha: commit.tree.sha, files: files.sort((a, b) => a.path.localeCompare(b.path)) };
}

export async function commitTechOsFiles(
  target: RepositoryTarget,
  token: string,
  expectedHeadSha: string,
  updates: TechOsSourceFile[],
  message: string,
  request: typeof fetch = fetch,
): Promise<TechOsCommitResult> {
  const normalizedTarget = normalizeTarget(target);
  const normalizedUpdates = normalizeUpdates(updates);
  const commitMessage = message.trim();
  if (!/^[0-9a-f]{40}$/i.test(expectedHeadSha)) throw new Error('缺少有效的远端基线 SHA，请重新读取远端。');
  if (!commitMessage || commitMessage.length > 120) throw new Error('Commit message 必须为 1–120 个字符。');

  const refPath = `/git/ref/heads/${encodeURIComponent(normalizedTarget.branch)}`;
  const currentRef = await githubRequest<GitRefResponse>(normalizedTarget, token, request, refPath);
  if (currentRef.object.sha !== expectedHeadSha) throw new Error('TECH_OS_CONFLICT：远端分支已变化，未提交任何 Tech OS 文件。请重新读取并检查差异。');
  const parent = await githubRequest<GitCommitResponse>(normalizedTarget, token, request, `/git/commits/${expectedHeadSha}`);

  const blobs = await Promise.all(normalizedUpdates.map(async file => {
    const blob = await githubRequest<{ sha: string }>(normalizedTarget, token, request, '/git/blobs', {
      method: 'POST',
      body: JSON.stringify({ content: file.content, encoding: 'utf-8' }),
    });
    return { ...file, sha: blob.sha };
  }));

  const tree = await githubRequest<{ sha: string }>(normalizedTarget, token, request, '/git/trees', {
    method: 'POST',
    body: JSON.stringify({
      base_tree: parent.tree.sha,
      tree: blobs.map(file => ({ path: file.path, mode: '100644', type: 'blob', sha: file.sha })),
    }),
  });
  const commit = await githubRequest<GitCommitResponse>(normalizedTarget, token, request, '/git/commits', {
    method: 'POST',
    body: JSON.stringify({ message: commitMessage, tree: tree.sha, parents: [expectedHeadSha] }),
  });
  await githubRequest<GitRefResponse>(normalizedTarget, token, request, `/git/refs/heads/${encodeURIComponent(normalizedTarget.branch)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  return {
    sha: commit.sha,
    commitUrl: commit.html_url || `https://github.com/${encodeURIComponent(normalizedTarget.owner)}/${encodeURIComponent(normalizedTarget.repo)}/commit/${commit.sha}`,
    changedPaths: normalizedUpdates.map(file => file.path),
  };
}

export function isManagedTechOsPath(value: string): boolean {
  if (!value.startsWith('tech-os/') || value.includes('\\') || value.includes('//')) return false;
  const segments = value.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..')) return false;
  if (value === 'tech-os/state.yml') return true;
  if (!value.endsWith('.md')) return false;
  if (segments.includes('templates') || segments[segments.length - 1]?.toLowerCase() === 'readme.md') return false;
  return true;
}

function normalizeUpdates(updates: TechOsSourceFile[]): TechOsSourceFile[] {
  if (!updates.length) throw new Error('没有需要提交的 Tech OS 变更。');
  if (updates.length > MAX_FILES) throw new Error(`单次提交最多包含 ${MAX_FILES} 个文件。`);
  const seen = new Set<string>();
  const normalized = updates.map(file => {
    if (!isManagedTechOsPath(file.path)) throw new Error(`不允许写入 Tech OS 管理范围之外的路径：${file.path}`);
    if (seen.has(file.path)) throw new Error(`提交中包含重复路径：${file.path}`);
    seen.add(file.path);
    const content = normalizeContent(file.content);
    assertFileSize(file.path, content);
    if (!content.trim()) throw new Error(`不允许提交空文件：${file.path}`);
    return { path: file.path, content };
  });
  if (normalized.reduce((sum, file) => sum + new TextEncoder().encode(file.content).length, 0) > MAX_TOTAL_BYTES) {
    throw new Error('单次提交的 Tech OS 文件总量不能超过 2 MiB。');
  }
  return normalized.sort((a, b) => a.path.localeCompare(b.path));
}

function normalizeTarget(target: RepositoryTarget): RepositoryTarget {
  const owner = target.owner.trim();
  const repo = target.repo.trim();
  const branch = target.branch.trim();
  const validBranch = /^[A-Za-z0-9._/-]+$/.test(branch)
    && !branch.startsWith('/') && !branch.endsWith('/') && !branch.includes('//') && !branch.includes('..')
    && !branch.endsWith('.') && !branch.endsWith('.lock') && branch !== '@';
  if (!owner || !repo || !branch || !/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo) || !validBranch) {
    throw new Error('Repository target 无效，请检查 Owner、Repository 和 Branch。');
  }
  return { owner, repo, branch };
}

async function githubRequest<T>(target: RepositoryTarget, token: string, request: typeof fetch, path: string, init?: RequestInit): Promise<T> {
  const normalizedToken = normalizeToken(token);
  const response = await request(`${API_ROOT}/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${normalizedToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (response.ok) return response.json() as Promise<T>;
  const payload = await response.json().catch(() => null) as { message?: string } | null;
  if (response.status === 401) throw new Error('GitHub Token 无效、已过期或不完整。');
  if (response.status === 403) throw new Error('Token 权限不足；读取需要 Contents read，提交需要 Contents read/write。');
  if (response.status === 404) throw new Error('未找到目标仓库、分支或 Tech OS Git 对象。');
  if (response.status === 409 || response.status === 422) throw new Error('TECH_OS_CONFLICT：远端分支在提交期间发生变化，请重新读取后再试。');
  throw new Error(payload?.message || `GitHub API 请求失败 (${response.status})。`);
}

function normalizeToken(value: string): string {
  const token = value.trim().replace(/^(?:token|bearer)\s+/i, '').replace(/^['"]|['"]$/g, '').replace(/\s+/g, '');
  if (!token || token.includes('•') || token.length < 20) throw new Error('Token 格式无效；请粘贴完整 Token，不要粘贴圆点掩码。');
  return token;
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function normalizeContent(value: string): string {
  return value.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\n*$/, '\n');
}

function assertFileSize(path: string, content: string): void {
  if (new TextEncoder().encode(content).length > MAX_FILE_BYTES) throw new Error(`${path} 超过 256 KiB 限制。`);
}
