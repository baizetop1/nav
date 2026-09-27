import type { Category, LayoutItem, NavigationData, Site } from '../types/navigation';

export interface NavigationMergeResult {
  data: NavigationData;
  conflicts: number;
  localChanges: number;
  remoteChanges: number;
}

type KeyedItem = Site | Category | LayoutItem;

function sameValue(left: KeyedItem | undefined, right: KeyedItem | undefined): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function mergeCollection<T extends KeyedItem>(
  base: T[],
  local: T[],
  remote: T[],
  keyOf: (item: T) => string,
): { items: T[]; conflicts: number; localChanges: number; remoteChanges: number } {
  const baseById = new Map(base.map(item => [keyOf(item), item]));
  const localById = new Map(local.map(item => [keyOf(item), item]));
  const remoteById = new Map(remote.map(item => [keyOf(item), item]));
  const order = [...new Set([...local.map(keyOf), ...remote.map(keyOf), ...base.map(keyOf)])];
  const items: T[] = [];
  let conflicts = 0;
  let localChanges = 0;
  let remoteChanges = 0;

  for (const id of order) {
    const baseline = baseById.get(id);
    const localItem = localById.get(id);
    const remoteItem = remoteById.get(id);
    const localChanged = !sameValue(localItem, baseline);
    const remoteChanged = !sameValue(remoteItem, baseline);
    if (localChanged) localChanges += 1;
    if (remoteChanged) remoteChanges += 1;

    let selected: T | undefined;
    if (!localChanged) selected = remoteItem;
    else if (!remoteChanged || sameValue(localItem, remoteItem)) selected = localItem;
    else {
      selected = localItem;
      conflicts += 1;
    }
    if (selected) items.push(selected);
  }

  return { items, conflicts, localChanges, remoteChanges };
}

export function mergeNavigationData(
  baseline: NavigationData,
  local: NavigationData,
  remote: NavigationData,
): NavigationMergeResult {
  const sites = mergeCollection(baseline.sites, local.sites, remote.sites, item => item.id);
  const categories = mergeCollection(baseline.categories, local.categories, remote.categories, item => item.id);
  const layout = mergeCollection(baseline.layout, local.layout, remote.layout, item => item.siteId);
  const selectedSiteIds = new Set(sites.items.map(site => site.id));
  const selectedCategoryIds = new Set(categories.items.map(category => category.id));
  const categoryFallback = new Map(
    [...baseline.categories, ...remote.categories, ...local.categories].map(category => [category.id, category]),
  );
  const mergedCategories = [...categories.items];
  for (const categoryId of new Set(sites.items.map(site => site.categoryId))) {
    if (selectedCategoryIds.has(categoryId)) continue;
    const category = categoryFallback.get(categoryId);
    if (category) {
      mergedCategories.push(category);
      selectedCategoryIds.add(categoryId);
    }
  }

  return {
    data: {
      sites: sites.items,
      categories: mergedCategories,
      layout: layout.items.filter(item => selectedSiteIds.has(item.siteId)),
    },
    conflicts: sites.conflicts + categories.conflicts + layout.conflicts,
    localChanges: sites.localChanges + categories.localChanges + layout.localChanges,
    remoteChanges: sites.remoteChanges + categories.remoteChanges + layout.remoteChanges,
  };
}
