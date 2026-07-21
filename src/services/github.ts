import type { NavigationData } from '../types/navigation';

export interface RepositoryTarget {
  owner: string;
  repo: string;
  branch: string;
}

interface GitHubUser {
  login: string;
  avatar_url: string;
}

interface PublishResult {
  commitUrl: string;
  sha: string;
}

export interface WorkflowRun {
  id: number;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting' | 'requested' | 'pending';
  conclusion: string | null;
  head_sha: string;
  html_url: string;
  updated_at: string;
}

const API_ROOT = 'https://api.github.com';

export function normalizeGithubToken(value: string): string {
  return value
    .trim()
    .replace(/^(?:token|bearer)\s+/i, '')
    .replace(/^['"]|['"]$/g, '')
    .replace(/\s+/g, '');
}

async function githubRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const normalizedToken = normalizeGithubToken(token);
  if (!normalizedToken || normalizedToken.includes('•') || normalizedToken.length < 20) {
    throw new Error('Token 格式无效。请粘贴 GitHub 生成的完整 Token，而不是页面中显示的圆点掩码。');
  }
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
    throw new Error(payload?.message || `GitHub API 请求失败 (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export function getAuthenticatedUser(token: string): Promise<GitHubUser> {
  return githubRequest<GitHubUser>('/user', token);
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
