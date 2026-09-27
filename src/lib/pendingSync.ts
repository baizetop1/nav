import type { NavigationData } from '../types/navigation.ts';
import { parseNavigationData } from './navigationData.ts';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from './safeStorage.ts';

export const PUBLISH_BASELINE_KEY = 'baize_publish_baseline_v1';
export const PUBLISH_BASELINE_EVENT = 'baize:publish-baseline';
export interface NavigationChange {
  key: string; kind: 'added' | 'modified' | 'removed';
  collection: 'sites' | 'categories' | 'layout'; label: string; fields: string[];
}
export function stableNavigationSignature(data: NavigationData): string {
  return JSON.stringify({
    sites: [...data.sites].sort((a, b) => a.id.localeCompare(b.id)),
    categories: [...data.categories].sort((a, b) => a.id.localeCompare(b.id)),
    layout: [...data.layout].sort((a, b) => a.siteId.localeCompare(b.siteId)),
  });
}
export function navigationChanges(baseline: NavigationData, local: NavigationData): NavigationChange[] {
  const changes: NavigationChange[] = [];
  for (const collection of ['sites', 'categories', 'layout'] as const) {
    const keyOf = (item: object) => 'id' in item ? String(item.id) : String((item as { siteId: string }).siteId);
    const before = new Map(baseline[collection].map(item => [keyOf(item), item]));
    const after = new Map(local[collection].map(item => [keyOf(item), item]));
    for (const id of new Set([...before.keys(), ...after.keys()])) {
      const a = before.get(id), b = after.get(id);
      const fields = [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])].filter(key => JSON.stringify((a as unknown as Record<string, unknown> | undefined)?.[key]) !== JSON.stringify((b as unknown as Record<string, unknown> | undefined)?.[key]));
      if (!fields.length) continue;
      const item = b || a;
      const label = item && 'name' in item ? String(item.name) : local.sites.find(site => site.id === id)?.name || baseline.sites.find(site => site.id === id)?.name || id;
      changes.push({ key: `${collection}:${id}`, kind: !a ? 'added' : !b ? 'removed' : 'modified', collection, label, fields });
    }
  }
  return changes;
}
export function loadPublishBaseline(bundled: NavigationData): NavigationData {
  try {
    const raw = safeGetLocalStorageItem(PUBLISH_BASELINE_KEY, { label: '最近发布版本' });
    if (!raw) return bundled;
    const stored = JSON.parse(raw);
    if (stored.version !== 1 || stored.buildSignature !== stableNavigationSignature(bundled)) return bundled;
    return parseNavigationData(stored.navigation);
  } catch { return bundled; }
}
export function markNavigationPublished(navigation: NavigationData, sha: string, bundled: NavigationData): boolean {
  const result = safeSetLocalStorageItem(PUBLISH_BASELINE_KEY, JSON.stringify({ version: 1, navigation: parseNavigationData(navigation), sha, buildSignature: stableNavigationSignature(bundled), publishedAt: new Date().toISOString() }), { label: '最近发布版本', maxBytes: 1024 * 1024 });
  if (result.ok && typeof window !== 'undefined') window.dispatchEvent(new Event(PUBLISH_BASELINE_EVENT));
  return result.ok;
}
