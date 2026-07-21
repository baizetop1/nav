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

const API_ROOT = 'https://api.github.com';

async function githubRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(payload?.message || `GitHub API 请求失败 (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export function getAuthenticatedUser(token: string): Promise<GitHubUser> {
  return githubRequest<GitHubUser>('/user', token);
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
