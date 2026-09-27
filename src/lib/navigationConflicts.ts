import type { NavigationData, Site, Category, LayoutItem } from '../types/navigation.ts';
import { mergeNavigationData } from './navigationMerge.ts';
import { parseNavigationData } from './navigationData.ts';
type Item = Site | Category | LayoutItem;
type Collection = 'sites' | 'categories' | 'layout';
export interface NavigationConflict { key: string; collection: Collection; id: string; label: string; local?: Item; remote?: Item; baseline?: Item }
export type NavigationChoices = Record<string, 'local' | 'remote'>;
const keyOf = (item: Item): string => 'siteId' in item ? item.siteId : item.id;
const same = (a: Item | undefined, b: Item | undefined) => JSON.stringify(a) === JSON.stringify(b);
export function getNavigationConflicts(baseline: NavigationData, local: NavigationData, remote: NavigationData): NavigationConflict[] {
  const conflicts: NavigationConflict[] = [];
  for (const collection of ['sites', 'categories', 'layout'] as const) {
    const base = new Map(baseline[collection].map(item => [keyOf(item), item]));
    const left = new Map(local[collection].map(item => [keyOf(item), item]));
    const right = new Map(remote[collection].map(item => [keyOf(item), item]));
    for (const id of new Set([...base.keys(), ...left.keys(), ...right.keys()])) {
      const a = base.get(id), b = left.get(id), c = right.get(id);
      if (same(a, b) || same(a, c) || same(b, c)) continue;
      const item = b || c || a;
      conflicts.push({ key: `${collection}:${id}`, collection, id, label: item && 'name' in item ? item.name : local.sites.find(site => site.id === id)?.name || id, local: b, remote: c, baseline: a });
    }
  }
  return conflicts;
}
export function resolveNavigationConflicts(baseline: NavigationData, local: NavigationData, remote: NavigationData, choices: NavigationChoices): NavigationData {
  const conflicts = getNavigationConflicts(baseline, local, remote);
  if (conflicts.some(item => choices[item.key] !== 'local' && choices[item.key] !== 'remote')) throw new Error('请为每一项冲突选择保留本机或远端。');
  const result = structuredClone(mergeNavigationData(baseline, local, remote).data);
  for (const conflict of conflicts) {
    const selected = choices[conflict.key] === 'local' ? conflict.local : conflict.remote;
    const items = result[conflict.collection] as Item[];
    const index = items.findIndex(item => keyOf(item) === conflict.id);
    if (index >= 0) { if (selected) items[index] = selected; else items.splice(index, 1); }
    else if (selected) items.push(selected);
  }
  // The default merge may have pruned dependencies for a locally deleted site.
  // Restoring the other side's site must also restore its unopposed references.
  const explicitlyDeleted = new Set(conflicts.filter(conflict => !(choices[conflict.key] === 'local' ? conflict.local : conflict.remote)).map(conflict => conflict.key));
  for (const conflict of conflicts.filter(item => item.collection === 'sites')) {
    const source = choices[conflict.key] === 'local' ? local : remote;
    const site = source.sites.find(item => item.id === conflict.id);
    if (!site) continue;
    if (!result.categories.some(category => category.id === site.categoryId) && !explicitlyDeleted.has(`categories:${site.categoryId}`)) {
      const category = source.categories.find(item => item.id === site.categoryId);
      if (category) result.categories.push(category);
    }
    if (!result.layout.some(item => item.siteId === site.id) && !explicitlyDeleted.has(`layout:${site.id}`)) {
      const layout = source.layout.find(item => item.siteId === site.id);
      if (layout) result.layout.push(layout);
    }
  }
  const siteIds = new Set(result.sites.map(site => site.id));
  result.layout = result.layout.filter(item => siteIds.has(item.siteId));
  const categoryIds = new Set(result.categories.map(category => category.id));
  const dangling = result.sites.filter(site => !categoryIds.has(site.categoryId));
  if (dangling.length) throw new Error(`所选方案删除了仍被网站使用的分类：${dangling.slice(0, 3).map(site => site.name).join('、')}。请调整分类或网站的冲突选择。`);
  return parseNavigationData(result);
}
