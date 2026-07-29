import type { Category, LayoutItem, NavigationData, Site } from '../types/navigation';

export const BACKUP_VERSION = 1 as const;
export const BACKUP_STORAGE_KEYS = [
  'nav_cms_draft',
  'nav_daily_click_stats',
  'nav_temp_text',
  'work_mode',
  'theme',
  'nav_translator_collapsed',
] as const;

export type BackupStorageKey = (typeof BACKUP_STORAGE_KEYS)[number];

export interface NavigationBackup {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  navigation: NavigationData;
  storage: Record<BackupStorageKey, string | null>;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function fail(message: string): never {
  throw new Error(`Invalid navigation backup: ${message}`);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${path} must be an object`);
  return value as Record<string, unknown>;
}

function string(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) fail(`${path} must be a non-empty string`);
  return value;
}

function integer(value: unknown, path: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) fail(`${path} must be an integer of at least ${minimum}`);
  return value as number;
}

function optionalInteger(value: unknown, path: string): number | undefined {
  return value === undefined ? undefined : integer(value, path);
}

function parseSite(value: unknown, index: number): Site {
  const item = record(value, `navigation.sites[${index}]`);
  const path = `navigation.sites[${index}]`;
  if (!Array.isArray(item.tags)) fail(`${path}.tags must be an array`);
  if (item.icon !== undefined && typeof item.icon !== 'string') fail(`${path}.icon must be a string`);
  if (item.favorite !== undefined && typeof item.favorite !== 'boolean') fail(`${path}.favorite must be a boolean`);

  return {
    id: string(item.id, `${path}.id`),
    name: string(item.name, `${path}.name`),
    description: string(item.description, `${path}.description`, true),
    url: string(item.url, `${path}.url`),
    categoryId: string(item.categoryId, `${path}.categoryId`),
    tags: item.tags.map((tag, tagIndex) => string(tag, `${path}.tags[${tagIndex}]`, true)),
    ...(item.icon === undefined ? {} : { icon: item.icon }),
    ...(item.favorite === undefined ? {} : { favorite: item.favorite }),
  };
}

function parseCategory(value: unknown, index: number): Category {
  const item = record(value, `navigation.categories[${index}]`);
  const path = `navigation.categories[${index}]`;
  return {
    id: string(item.id, `${path}.id`),
    name: string(item.name, `${path}.name`),
    order: integer(item.order, `${path}.order`),
  };
}

function parseLayoutItem(value: unknown, index: number): LayoutItem {
  const item = record(value, `navigation.layout[${index}]`);
  const path = `navigation.layout[${index}]`;
  if (item.size !== 'normal' && item.size !== 'wide') fail(`${path}.size must be "normal" or "wide"`);
  if (item.width !== undefined && item.width !== 1 && item.width !== 2) fail(`${path}.width must be 1 or 2`);
  if (item.height !== undefined && item.height !== 1 && item.height !== 2) fail(`${path}.height must be 1 or 2`);

  return {
    siteId: string(item.siteId, `${path}.siteId`),
    order: integer(item.order, `${path}.order`),
    size: item.size,
    ...(item.x === undefined ? {} : { x: optionalInteger(item.x, `${path}.x`) }),
    ...(item.y === undefined ? {} : { y: optionalInteger(item.y, `${path}.y`) }),
    ...(item.width === undefined ? {} : { width: item.width }),
    ...(item.height === undefined ? {} : { height: item.height }),
  };
}

function unique(values: string[], path: string): void {
  if (new Set(values).size !== values.length) fail(`${path} contains duplicate IDs`);
}

function parseNavigation(value: unknown): NavigationData {
  const data = record(value, 'navigation');
  if (!Array.isArray(data.sites) || !Array.isArray(data.categories) || !Array.isArray(data.layout)) {
    fail('navigation must contain sites, categories, and layout arrays');
  }

  const sites = data.sites.map(parseSite);
  const categories = data.categories.map(parseCategory);
  const layout = data.layout.map(parseLayoutItem);
  unique(sites.map(site => site.id), 'navigation.sites');
  unique(categories.map(category => category.id), 'navigation.categories');
  unique(layout.map(item => item.siteId), 'navigation.layout');

  const categoryIds = new Set(categories.map(category => category.id));
  const siteIds = new Set(sites.map(site => site.id));
  if (sites.some(site => !categoryIds.has(site.categoryId))) fail('a site references an unknown category');
  if (layout.some(item => !siteIds.has(item.siteId))) fail('layout references an unknown site');
  return { sites, categories, layout };
}

function storageOrBrowser(storage?: StorageLike): StorageLike {
  if (storage) return storage;
  if (typeof localStorage === 'undefined') throw new Error('Browser localStorage is unavailable');
  return localStorage;
}

export function createBackup(data: NavigationData, storage?: StorageLike): NavigationBackup {
  const source = storageOrBrowser(storage);
  const navigation = parseNavigation(data);
  const entries = BACKUP_STORAGE_KEYS.map(key => [
    key,
    key === 'nav_cms_draft' ? JSON.stringify(navigation) : source.getItem(key),
  ] as const);
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    navigation,
    storage: Object.fromEntries(entries) as Record<BackupStorageKey, string | null>,
  };
}

export function parseBackup(input: string | unknown): NavigationBackup {
  let value: unknown = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      fail('file is not valid JSON');
    }
  }

  const backup = record(value, 'backup');
  if (backup.version !== BACKUP_VERSION) fail(`unsupported version ${String(backup.version)}`);
  const exportedAt = string(backup.exportedAt, 'exportedAt');
  if (Number.isNaN(Date.parse(exportedAt))) fail('exportedAt must be a valid date');
  const savedStorage = record(backup.storage, 'storage');
  const allowedKeys = new Set<string>(BACKUP_STORAGE_KEYS);
  if (Object.keys(savedStorage).some(key => !allowedKeys.has(key))) fail('storage contains an unsupported key');

  const storageEntries = BACKUP_STORAGE_KEYS.map(key => {
    if (!Object.prototype.hasOwnProperty.call(savedStorage, key)) fail(`storage.${key} is missing`);
    const valueForKey = savedStorage[key];
    if (valueForKey !== null && typeof valueForKey !== 'string') fail(`storage.${key} must be a string or null`);
    return [key, valueForKey] as const;
  });

  return {
    version: BACKUP_VERSION,
    exportedAt,
    navigation: parseNavigation(backup.navigation),
    storage: Object.fromEntries(storageEntries) as Record<BackupStorageKey, string | null>,
  };
}

export function restoreBackup(input: string | unknown, storage?: StorageLike): NavigationData {
  const backup = parseBackup(input);
  const target = storageOrBrowser(storage);
  const previous = new Map(BACKUP_STORAGE_KEYS.map(key => [key, target.getItem(key)]));
  const changed: BackupStorageKey[] = [];

  try {
    for (const key of BACKUP_STORAGE_KEYS) {
      const value = backup.storage[key];
      if (value === null) target.removeItem(key);
      else target.setItem(key, value);
      changed.push(key);
    }
  } catch (error) {
    let rollbackFailed = false;
    for (const key of changed.reverse()) {
      try {
        const value = previous.get(key) ?? null;
        if (value === null) target.removeItem(key);
        else target.setItem(key, value);
      } catch {
        rollbackFailed = true;
      }
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not restore browser storage${rollbackFailed ? ' and rollback was incomplete' : ''}: ${reason}`);
  }

  return backup.navigation;
}
