import type { RepositoryTarget } from '../services/github';

export const PENDING_DEPLOYMENT_KEY = 'nav_pending_deployment_v1';
const MAX_PENDING_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface PendingDeployment {
  repository: RepositoryTarget;
  sha: string;
  commitUrl: string;
  createdAt: string;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function parsePendingDeployment(value: unknown, now = Date.now()): PendingDeployment | null {
  if (!value || typeof value !== 'object') return null;
  const pending = value as Partial<PendingDeployment>;
  const repository = pending.repository;
  if (
    !repository
    || typeof repository.owner !== 'string'
    || typeof repository.repo !== 'string'
    || typeof repository.branch !== 'string'
    || !repository.owner.trim()
    || !repository.repo.trim()
    || !repository.branch.trim()
    || typeof pending.sha !== 'string'
    || !/^[a-f0-9]{40}$/i.test(pending.sha)
    || typeof pending.commitUrl !== 'string'
    || !/^https:\/\/github\.com\//i.test(pending.commitUrl)
    || typeof pending.createdAt !== 'string'
  ) return null;
  const createdAt = Date.parse(pending.createdAt);
  if (!Number.isFinite(createdAt) || createdAt > now + 60_000 || now - createdAt > MAX_PENDING_AGE_MS) return null;
  return {
    repository: {
      owner: repository.owner.trim(),
      repo: repository.repo.trim(),
      branch: repository.branch.trim(),
    },
    sha: pending.sha,
    commitUrl: pending.commitUrl,
    createdAt: pending.createdAt,
  };
}

export function loadPendingDeployment(storage: StorageLike = localStorage, now = Date.now()): PendingDeployment | null {
  try {
    const raw = storage.getItem(PENDING_DEPLOYMENT_KEY);
    if (!raw) return null;
    const pending = parsePendingDeployment(JSON.parse(raw) as unknown, now);
    if (!pending) storage.removeItem(PENDING_DEPLOYMENT_KEY);
    return pending;
  } catch {
    return null;
  }
}

export function savePendingDeployment(pending: PendingDeployment, storage: StorageLike = localStorage): void {
  const parsed = parsePendingDeployment(pending);
  if (!parsed) throw new Error('待确认部署信息无效。');
  storage.setItem(PENDING_DEPLOYMENT_KEY, JSON.stringify(parsed));
}

export function clearPendingDeployment(storage: StorageLike = localStorage): void {
  storage.removeItem(PENDING_DEPLOYMENT_KEY);
}
