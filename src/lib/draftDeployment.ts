import { blogDraftScope, type BlogRepositoryTarget } from './blogWorkspace.ts';

export const DRAFT_DEPLOYMENT_KEY = 'baize_draft_deployments_v1';
export const DRAFT_DEPLOYMENT_EVENT = 'baize:draft-deployment-updated';
type DeploymentState = 'waiting' | 'running' | 'success' | 'failure' | 'unknown';
interface DeploymentRecord { state: DeploymentState; checkedAt: number }
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
function recordKey(target: BlogRepositoryTarget, sha: string) {
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(sha)) throw new Error('提交编号无效。');
  return `${blogDraftScope(target)}${sha}`;
}
function readRecords(storage: StorageLike): Record<string, DeploymentRecord> {
  try {
    const value = JSON.parse(storage.getItem(DRAFT_DEPLOYMENT_KEY) || 'null');
    if (value?.version !== 1 || !value.records || typeof value.records !== 'object' || Array.isArray(value.records)) return {};
    return Object.fromEntries(Object.entries(value.records).filter((entry): entry is [string, DeploymentRecord] => {
      const item = entry[1] as DeploymentRecord;
      return !!item && ['waiting', 'running', 'success', 'failure', 'unknown'].includes(item.state) && Number.isSafeInteger(item.checkedAt) && item.checkedAt >= 0;
    }));
  } catch { return {}; }
}
export function readDraftDeployment(target: BlogRepositoryTarget, sha: string, storage: StorageLike = localStorage): DeploymentRecord | null {
  try { return readRecords(storage)[recordKey(target, sha)] || null; } catch { return null; }
}
export function rememberDraftDeployment(target: BlogRepositoryTarget, sha: string, state: DeploymentState, storage: StorageLike = localStorage): boolean {
  try {
    const records = readRecords(storage), key = recordKey(target, sha);
    records[key] = { state, checkedAt: Date.now() };
    const bounded = Object.fromEntries(Object.entries(records).sort((a, b) => b[1].checkedAt - a[1].checkedAt).slice(0, 100));
    storage.setItem(DRAFT_DEPLOYMENT_KEY, JSON.stringify({ version: 1, records: bounded }));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(DRAFT_DEPLOYMENT_EVENT));
    return true;
  } catch { return false; }
}
