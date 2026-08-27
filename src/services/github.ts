import type { NavigationData } from '../types/navigation';
import type { EncryptedNavigationBackup } from './encryptedBackup';
import type { EncryptedInbox } from './inboxSync';
import type { EncryptedNote } from './encryptedNote';

export interface RepositoryTarget {
  owner: string;
  repo: string;
  branch: string;
}

interface GitHubUser {
  login: string;
  avatar_url: string;
}

export interface PublishResult {
  commitUrl: string;
  sha: string;
}

interface RepositoryTreeEntry {
  path: string;
  type: 'blob' | 'tree' | 'commit';
}

export interface WorkflowRun {
  id: number;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting' | 'requested' | 'pending';
  conclusion: string | null;
  head_sha: string;
  html_url: string;
  updated_at: string;
  created_at?: string;
}

const API_ROOT = 'https://api.github.com';
const ENCRYPTED_BACKUP_PATH = 'data/navigation-backup.enc.json';
const ENCRYPTED_INBOX_PATH = 'data/inbox.enc.json';
const ENCRYPTED_NOTE_PATH = 'data/temp-note.enc.json';

export function normalizeGithubToken(value: string): string {
  return value
    .trim()
    .replace(/^(?:token|bearer)\s+/i, '')
    .replace(/^['"]|['"]$/g, '')
    .replace(/\s+/g, '');
}

function requireGithubToken(value: string): string {
  const normalizedToken = normalizeGithubToken(value);
  if (!normalizedToken || normalizedToken.includes('•') || normalizedToken.length < 20) {
    throw new Error('Token 格式无效。请粘贴 GitHub 生成的完整 Token，而不是页面中显示的圆点掩码。');
  }
  return normalizedToken;
}

async function githubRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const normalizedToken = requireGithubToken(token);
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${normalizedToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    const acceptedPermissions = response.headers.get('X-Accepted-GitHub-Permissions');
    if (response.status === 401) {
      throw new Error('GitHub 拒绝了这个 Token：Token 不完整、已过期、已撤销，或者粘贴了掩码而不是真实值。请重新生成后完整粘贴。');
    }
    if (response.status === 403) {
      throw new Error(`Token 已识别，但权限不足或尚未获组织批准。${acceptedPermissions ? `接口要求：${acceptedPermissions}` : '请检查 Contents 写入和 Actions 读取权限。'}`);
    }
    if (response.status === 404) {
      throw new Error('未找到目标仓库、分支或文件。请确认 Token 已授权此仓库，并检查 Owner、Repository 和 Branch。');
    }
    if (response.status === 409) {
      throw new Error('远端数据在操作期间发生变化，请重新读取后再试。');
    }
    if (response.status === 422) {
      throw new Error('远端分支在提交期间发生变化，或目标文件已存在。请重新读取后再试。');
    }
    throw new Error(payload?.message || `GitHub API 请求失败 (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export function getAuthenticatedUser(token: string): Promise<GitHubUser> {
  return githubRequest<GitHubUser>('/user', token);
}

function utf8ToBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export async function getEncryptedNote(target: RepositoryTarget, token: string): Promise<{ payload: EncryptedNote; sha: string } | null> {
  const normalizedToken = normalizeGithubToken(token);
  const url = `${API_ROOT}/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/contents/${ENCRYPTED_NOTE_PATH}?ref=${encodeURIComponent(target.branch)}`;
  const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${normalizedToken}`, 'X-GitHub-Api-Version': '2022-11-28' } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(response.status === 401 ? 'GitHub Token 无效或已过期。' : `读取加密文本失败 (${response.status})。`);
  const file = await response.json() as { content: string; sha: string };
  const json = new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g, '')), character => character.charCodeAt(0)));
  return { payload: JSON.parse(json) as EncryptedNote, sha: file.sha };
}

export async function saveEncryptedNote(target: RepositoryTarget, token: string, payload: EncryptedNote): Promise<string> {
  const existing = await getEncryptedNote(target, token);
  const result = await githubRequest<{ commit: { html_url: string } }>(
    `/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/contents/${ENCRYPTED_NOTE_PATH}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        message: 'Update encrypted temporary note',
        content: utf8ToBase64(`${JSON.stringify(payload, null, 2)}\n`),
        branch: target.branch,
        ...(existing ? { sha: existing.sha } : {}),
      }),
    },
  );
  return result.commit.html_url;
}

export async function getEncryptedInbox(target: RepositoryTarget, token: string): Promise<{ payload: EncryptedInbox; sha: string } | null> {
  const normalizedToken = normalizeGithubToken(token);
  const url = `${API_ROOT}/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/contents/${ENCRYPTED_INBOX_PATH}?ref=${encodeURIComponent(target.branch)}`;
  const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${normalizedToken}`, 'X-GitHub-Api-Version': '2022-11-28' } });
  if (response.status === 404) return null;
  if (!response.ok) {
    if (response.status === 401) throw new Error('GitHub Token 无效或已过期。');
    if (response.status === 403) throw new Error('Token 没有读取加密 Inbox 的权限。');
    throw new Error(`读取加密 Inbox 失败 (${response.status})。`);
  }
  const file = await response.json() as { content: string; sha: string };
  try {
    const json = new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g, '')), character => character.charCodeAt(0)));
    return { payload: JSON.parse(json) as EncryptedInbox, sha: file.sha };
  } catch {
    throw new Error('远端 Inbox 密文文件格式已损坏。');
  }
}

export async function saveEncryptedInbox(
  target: RepositoryTarget,
  token: string,
  payload: EncryptedInbox,
  sha?: string,
): Promise<string> {
  const result = await githubRequest<{ commit: { html_url: string } }>(
    `/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/contents/${ENCRYPTED_INBOX_PATH}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        message: 'Sync encrypted Inbox',
        content: utf8ToBase64(`${JSON.stringify(payload, null, 2)}\n`),
        branch: target.branch,
        ...(sha ? { sha } : {}),
      }),
    },
  );
  return result.commit.html_url;
}

export async function getEncryptedBackup(target: RepositoryTarget, token: string): Promise<{ payload: EncryptedNavigationBackup; sha: string } | null> {
  const normalizedToken = normalizeGithubToken(token);
  const url = `${API_ROOT}/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/contents/${ENCRYPTED_BACKUP_PATH}?ref=${encodeURIComponent(target.branch)}`;
  const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${normalizedToken}`, 'X-GitHub-Api-Version': '2022-11-28' } });
  if (response.status === 404) return null;
  if (!response.ok) {
    if (response.status === 401) throw new Error('GitHub Token 无效或已过期。');
    if (response.status === 403) throw new Error('Token 没有读取加密备份的权限。');
    throw new Error(`读取加密云备份失败 (${response.status})。`);
  }
  const file = await response.json() as { content: string; sha: string };
  try {
    const json = new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g, '')), character => character.charCodeAt(0)));
    return { payload: JSON.parse(json) as EncryptedNavigationBackup, sha: file.sha };
  } catch {
    throw new Error('远端加密备份文件格式已损坏。');
  }
}

export async function saveEncryptedBackup(target: RepositoryTarget, token: string, payload: EncryptedNavigationBackup): Promise<string> {
  const existing = await getEncryptedBackup(target, token);
  const result = await githubRequest<{ commit: { html_url: string } }>(
    `/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/contents/${ENCRYPTED_BACKUP_PATH}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        message: 'Update encrypted navigation backup',
        content: utf8ToBase64(`${JSON.stringify(payload, null, 2)}\n`),
        branch: target.branch,
        ...(existing ? { sha: existing.sha } : {}),
      }),
    },
  );
  return result.commit.html_url;
}

export async function getRemoteNavigationData(target: RepositoryTarget, token: string): Promise<NavigationData> {
  const query = `?ref=${encodeURIComponent(target.branch)}`;
  const read = <T,>(path: string) => githubRequest<T>(
    `/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/contents/${path}${query}`,
    token,
    { headers: { Accept: 'application/vnd.github.raw+json' } },
  );
  const [sites, categories, layout] = await Promise.all([
    read<NavigationData['sites']>('src/data/sites.json'),
    read<NavigationData['categories']>('src/data/categories.json'),
    read<NavigationData['layout']>('src/data/layout.json'),
  ]);
  return { sites, categories, layout };
}

export async function getWorkflowRun(
  target: RepositoryTarget,
  token: string,
  sha: string,
): Promise<WorkflowRun | null> {
  const response = await githubRequest<{ workflow_runs: WorkflowRun[] }>(
    `/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/actions/runs?branch=${encodeURIComponent(target.branch)}&per_page=20`,
    token,
  );
  return response.workflow_runs.find(run => run.head_sha === sha) || null;
}

/**
 * Starts the server-side link checker. A browser cannot reliably inspect
 * cross-origin HTTP responses, so the actual probes run in GitHub Actions.
 */
export async function dispatchLinkHealthCheck(target: RepositoryTarget, token: string): Promise<void> {
  const normalizedToken = requireGithubToken(token);
  const response = await fetch(
    `${API_ROOT}/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/actions/workflows/link-health.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${normalizedToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: target.branch }),
    },
  );

  if (response.ok) return;
  const payload = await response.json().catch(() => null) as { message?: string } | null;
  if (response.status === 401) throw new Error('GitHub Token 无效或已过期。');
  if (response.status === 403) throw new Error('Token 没有触发 GitHub Actions 的权限，请在 fine-grained Token 中开启 Actions 读写权限。');
  if (response.status === 404) throw new Error('未找到 link-health.yml 工作流，请确认仓库和分支填写正确。');
  throw new Error(payload?.message || `触发链接检测失败 (${response.status})。`);
}

/** Returns the newest manually-triggered link-health workflow run. */
export async function getLatestLinkHealthRun(target: RepositoryTarget, token: string): Promise<WorkflowRun | null> {
  const response = await githubRequest<{ workflow_runs: WorkflowRun[] }>(
    `/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/actions/workflows/link-health.yml/runs?branch=${encodeURIComponent(target.branch)}&event=workflow_dispatch&per_page=5`,
    token,
  );
  return response.workflow_runs[0] || null;
}

export async function publishNavigationData(
  target: RepositoryTarget,
  data: NavigationData,
  token: string,
  message = 'Update navigation data from CMS',
): Promise<PublishResult> {
  const { owner, repo, branch } = target;
  const refPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(branch)}`;
  const ref = await githubRequest<{ object: { sha: string } }>(refPath, token);
  const parentSha = ref.object.sha;
  const parent = await githubRequest<{ tree: { sha: string } }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits/${parentSha}`,
    token,
  );

  const files = [
    { path: 'src/data/sites.json', value: data.sites },
    { path: 'src/data/categories.json', value: data.categories },
    { path: 'src/data/layout.json', value: data.layout },
  ];

  const tree = await githubRequest<{ sha: string }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        base_tree: parent.tree.sha,
        tree: files.map(file => ({
          path: file.path,
          mode: '100644',
          type: 'blob',
          content: `${JSON.stringify(file.value, null, 2)}\n`,
        })),
      }),
    },
  );

  const commit = await githubRequest<{ sha: string; html_url: string }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ message, tree: tree.sha, parents: [parentSha] }),
    },
  );

  await githubRequest(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/${encodeURIComponent(branch)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ sha: commit.sha, force: false }),
    },
  );

  return { commitUrl: commit.html_url, sha: commit.sha };
}

/** Creates one new UTF-8 text file without replacing an existing draft or published slug. */
export async function createRepositoryTextFile(
  target: RepositoryTarget,
  token: string,
  file: {
    path: string;
    content: string;
    message: string;
    conflictsWith?: (path: string) => boolean;
  },
): Promise<PublishResult> {
  if (!file.message.trim()) throw new Error('提交信息不能为空。');
  const normalizedPath = file.path.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalizedPath || normalizedPath.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('目标文件路径无效。');
  }

  const { owner, repo, branch } = target;
  const ref = await githubRequest<{ object: { sha: string } }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(branch)}`,
    token,
  );
  const parentSha = ref.object.sha;
  const parent = await githubRequest<{ tree: { sha: string } }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits/${parentSha}`,
    token,
  );
  const remoteTree = await githubRequest<{ tree: RepositoryTreeEntry[]; truncated: boolean }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${parent.tree.sha}?recursive=1`,
    token,
  );
  if (remoteTree.truncated) throw new Error('远端文件列表过大，无法安全确认 slug 是否重复。');

  const conflict = remoteTree.tree.find(entry => entry.type === 'blob' && (
    entry.path === normalizedPath || file.conflictsWith?.(entry.path)
  ));
  if (conflict) throw new Error(`这个 slug 已被博客文件使用：${conflict.path}。请更换 slug 后重试。`);

  const tree = await githubRequest<{ sha: string }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        base_tree: parent.tree.sha,
        tree: [{ path: normalizedPath, mode: '100644', type: 'blob', content: file.content }],
      }),
    },
  );
  const commit = await githubRequest<{ sha: string; html_url: string }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ message: file.message, tree: tree.sha, parents: [parentSha] }),
    },
  );
  await githubRequest(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/${encodeURIComponent(branch)}`,
    token,
    { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) },
  );
  return { commitUrl: commit.html_url, sha: commit.sha };
}
