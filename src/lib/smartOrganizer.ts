import type { ClickStatsStore } from './activityStats';
import { getLinkHealthState, type LinkHealthEntry } from './linkHealth.ts';
import type { NavigationData, Site } from '../types/navigation';

export type OrganizerIssue = 'duplicate' | 'unhealthy' | 'description' | 'tags' | 'icon' | 'inactive' | 'unrecorded';
export const ORGANIZER_ISSUE_LABELS: Record<OrganizerIssue, string> = {
  duplicate: '重复网址', unhealthy: '已确认异常', description: '缺少介绍', tags: '缺少标签',
  icon: '未设图标', inactive: '30 天未访问', unrecorded: '无访问记录',
};

/** Deliberately preserves query order, fragments and non-root trailing slashes. */
export function organizerUrlKey(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export interface CategorySuggestion { categoryId: string; reason: string }

function hostname(value: string): string {
  try { return new URL(value).hostname; } catch { return ''; }
}

export function suggestSiteCategory(
  site: Pick<Site, 'name' | 'url' | 'description' | 'tags'> & { id?: string },
  data: NavigationData,
): CategorySuggestion | null {
  const host = hostname(site.url);
  const peers = host ? data.sites.filter(item => item.id !== site.id && hostname(item.url) === host) : [];
  const counts = new Map<string, number>();
  for (const peer of peers) if (data.categories.some(category => category.id === peer.categoryId)) {
    counts.set(peer.categoryId, (counts.get(peer.categoryId) || 0) + 1);
  }
  const ranked = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (ranked.length && (ranked.length === 1 || ranked[0][1] > ranked[1][1])) {
    return { categoryId: ranked[0][0], reason: `同主机 ${host} 的 ${ranked[0][1]} 个已有网站属于此分类` };
  }
  const text = `${site.name} ${site.description} ${site.tags.join(' ')}`.toLocaleLowerCase();
  const matches = data.categories.filter(category => {
    const name = category.name.trim().toLocaleLowerCase();
    if (name.length < 2) return false;
    if (/^[a-z0-9 ]+$/.test(name)) return text.split(/[^a-z0-9]+/).includes(name);
    return text.includes(name);
  });
  return matches.length === 1 ? { categoryId: matches[0].id, reason: `名称、介绍或标签包含分类名“${matches[0].name}”` } : null;
}

export function suggestImportMetadata(record: { name: string; url: string; description?: string; tags?: string }, data: NavigationData) {
  const key = organizerUrlKey(record.url);
  const existing = key ? data.sites.find(site => organizerUrlKey(site.url) === key) : undefined;
  const suggestion = suggestSiteCategory({ ...record, description: record.description || '', tags: (record.tags || '').split(/[,，]/) }, data);
  const category = data.categories.find(item => item.id === (existing?.categoryId || suggestion?.categoryId));
  return {
    category: category?.name,
    description: existing?.description.trim() || `${record.name.trim() || hostname(record.url)}（${hostname(record.url)}）`,
    tags: existing?.tags.length ? existing.tags.join(', ') : category?.name || '',
    reason: existing ? '参考已有同址网站资料' : suggestion?.reason || '根据名称和主机生成简短介绍，可继续修改',
  };
}

export interface OrganizerRow {
  site: Site;
  issues: OrganizerIssue[];
  lastVisitedAt: number | null;
  suggestion: CategorySuggestion | null;
}

export function analyzeNavigation(data: NavigationData, health: LinkHealthEntry[], stats: ClickStatsStore, now = Date.now()) {
  const groups = new Map<string, Site[]>();
  for (const site of data.sites) {
    const key = organizerUrlKey(site.url);
    if (key) groups.set(key, [...(groups.get(key) || []), site]);
  }
  const duplicateGroups = [...groups].filter(([, sites]) => sites.length > 1).map(([url, sites]) => ({ url, sites }));
  const duplicateIds = new Set(duplicateGroups.flatMap(group => group.sites.map(site => site.id)));
  const lastVisits = new Map<string, number>();
  for (const day of Object.values(stats.days)) for (const [id, click] of Object.entries(day.clicks)) {
    if (click.count > 0 && Number.isFinite(click.lastClicked) && click.lastClicked > 0 && click.lastClicked <= now) {
      lastVisits.set(id, Math.max(lastVisits.get(id) || 0, click.lastClicked));
    }
  }
  const rows: OrganizerRow[] = data.sites.map(site => {
    const issues: OrganizerIssue[] = [];
    if (duplicateIds.has(site.id)) issues.push('duplicate');
    const key = organizerUrlKey(site.url);
    // An old report must not condemn a URL changed since that check.
    const entry = key ? health.filter(item => item.siteId === site.id && organizerUrlKey(item.url) === key)
      .sort((a, b) => Date.parse(b.checkedAt) - Date.parse(a.checkedAt))[0] : undefined;
    if (getLinkHealthState(entry) === 'unhealthy') issues.push('unhealthy');
    if (!site.description.trim()) issues.push('description');
    if (!site.tags.some(tag => tag.trim())) issues.push('tags');
    if (!site.icon?.trim()) issues.push('icon');
    const lastVisitedAt = lastVisits.get(site.id) || null;
    if (!lastVisitedAt) issues.push('unrecorded');
    else if (now - lastVisitedAt >= 30 * 86400_000) issues.push('inactive');
    return { site, issues, lastVisitedAt, suggestion: suggestSiteCategory(site, data) };
  });
  return { rows, duplicateGroups };
}

export interface OrganizerBatch {
  categoryId?: string;
  useSuggestedCategories?: boolean;
  tagsMode?: 'append' | 'replace';
  tags?: string[];
  descriptionMode?: 'missing' | 'replace';
  description?: string;
}
export interface OrganizerChange { before: Site; after: Site }

export function previewOrganizerBatch(data: NavigationData, selectedIds: string[], batch: OrganizerBatch): OrganizerChange[] {
  if (batch.categoryId && !data.categories.some(category => category.id === batch.categoryId)) throw new Error('目标分类已不存在，请重新选择。');
  const selected = new Set(selectedIds);
  return data.sites.flatMap(site => {
    if (!selected.has(site.id)) return [];
    const after = { ...site };
    if (batch.categoryId) after.categoryId = batch.categoryId;
    else if (batch.useSuggestedCategories) after.categoryId = suggestSiteCategory(site, data)?.categoryId || site.categoryId;
    if (batch.tagsMode) after.tags = [...new Set([
      ...(batch.tagsMode === 'append' ? site.tags : []), ...(batch.tags || []),
    ].map(tag => tag.trim()).filter(Boolean))];
    if (batch.descriptionMode === 'replace' || (batch.descriptionMode === 'missing' && !site.description.trim())) after.description = (batch.description || '').trim();
    return JSON.stringify(site) === JSON.stringify(after) ? [] : [{ before: site, after }];
  });
}

export function applyOrganizerChanges(data: NavigationData, changes: OrganizerChange[]): NavigationData {
  const updated = new Map(changes.map(change => [change.before.id, change]));
  for (const change of changes) {
    const current = data.sites.find(site => site.id === change.before.id);
    if (JSON.stringify(current) !== JSON.stringify(change.before)) throw new Error('网站资料在预览后已变化，请重新生成预览。');
    if (!data.categories.some(category => category.id === change.after.categoryId)) throw new Error('目标分类已变化，请重新生成预览。');
  }
  return { ...data, sites: data.sites.map(site => updated.get(site.id)?.after || site) };
}

export function removeDuplicateSites(data: NavigationData, ids: string[], keepId: string): NavigationData {
  const selected = new Set(ids);
  const sites = data.sites.filter(site => selected.has(site.id));
  const key = organizerUrlKey(sites[0]?.url || '');
  if (sites.length < 2 || sites.length !== selected.size || !selected.has(keepId) || !key || sites.some(site => organizerUrlKey(site.url) !== key)) {
    throw new Error('重复组已变化，请重新检查后操作。');
  }
  selected.delete(keepId);
  return { ...data, sites: data.sites.filter(site => !selected.has(site.id)), layout: data.layout.filter(item => !selected.has(item.siteId)) };
}
