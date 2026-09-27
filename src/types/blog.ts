import type { RepositoryTarget } from '../services/github';

export interface BlogDocument {
  title: string;
  slug: string;
  category: string;
  format: string;
  tags: string[];
  related: string[];
  date: string;
  body: string;
  permalink: string;
  status: string;
}

export interface BlogSource { path: string; sha: string; markdown: string }
export interface BlogEntry { path: string; sha: string; kind: 'draft' | 'published'; title: string }
export interface BlogSnapshot { headSha: string; treeSha: string; entries: BlogEntry[] }
export type BlogSaveAction = 'save-draft' | 'publish';
export interface BlogWritePlan {
  headSha: string;
  treeSha: string;
  path: string;
  deletePath: string | null;
  markdown: string;
  action: BlogSaveAction;
  title: string;
  slug: string;
  source: BlogSource | null;
  target: RepositoryTarget;
}
export interface BlogWriteResult {
  sha: string;
  commitUrl: string;
  path: string;
  slug: string;
  markdown: string;
  source: BlogSource;
}
export interface BlogDeployment {
  state: 'waiting' | 'running' | 'success' | 'failure' | 'unknown';
  message: string;
  url?: string;
}
