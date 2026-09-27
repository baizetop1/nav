import type { Category, LayoutItem, NavigationData, Site } from '../types/navigation';

const MAX_GRID_COLUMNS = 4;

export class NavigationDataValidationError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super('导航数据无效：' + path + ' ' + message);
    this.name = 'NavigationDataValidationError';
    this.path = path;
  }
}

function fail(path: string, message: string): never {
  throw new NavigationDataValidationError(path, message);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, '必须是对象。');
  return value as Record<string, unknown>;
}

function normalizedString(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== 'string') fail(path, '必须是字符串。');
  const normalized = value.trim();
  if (!allowEmpty && !normalized) fail(path, '不能为空。');
  return normalized;
}

function safeInteger(value: unknown, path: string, minimum = 0, maximum?: number): number {
  if (!Number.isSafeInteger(value)) fail(path, '必须是安全整数。');
  const number = value as number;
  if (number < minimum) fail(path, '不能小于 ' + minimum + '。');
  if (maximum !== undefined && number > maximum) fail(path, '不能大于 ' + maximum + '。');
  return number;
}

function optionalInteger(value: unknown, path: string, minimum = 0, maximum?: number): number | undefined {
  return value === undefined ? undefined : safeInteger(value, path, minimum, maximum);
}

function httpUrl(value: unknown, path: string): string {
  const normalized = normalizedString(value, path);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    fail(path, '必须是完整的网址。');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') fail(path, '只允许 http:// 或 https:// 地址。');
  if (!parsed.hostname) fail(path, '必须包含有效域名或主机名。');
  return normalized;
}

function parseSite(value: unknown, index: number): Site {
  const path = 'sites[' + index + ']';
  const item = record(value, path);
  if (!Array.isArray(item.tags)) fail(path + '.tags', '必须是数组。');
  if (item.icon !== undefined && typeof item.icon !== 'string') fail(path + '.icon', '必须是字符串。');
  if (item.favorite !== undefined && typeof item.favorite !== 'boolean') fail(path + '.favorite', '必须是布尔值。');

  const tags = item.tags
    .map((tag, tagIndex) => normalizedString(tag, path + '.tags[' + tagIndex + ']', true))
    .filter(Boolean);
  const icon = item.icon === undefined ? undefined : item.icon.trim();

  return {
    id: normalizedString(item.id, path + '.id'),
    name: normalizedString(item.name, path + '.name'),
    description: normalizedString(item.description, path + '.description', true),
    url: httpUrl(item.url, path + '.url'),
    categoryId: normalizedString(item.categoryId, path + '.categoryId'),
    tags: [...new Set(tags)],
    ...(icon ? { icon } : {}),
    ...(item.favorite === undefined ? {} : { favorite: item.favorite }),
  };
}

function parseCategory(value: unknown, index: number): Category {
  const path = 'categories[' + index + ']';
  const item = record(value, path);
  return {
    id: normalizedString(item.id, path + '.id'),
    name: normalizedString(item.name, path + '.name'),
    order: safeInteger(item.order, path + '.order'),
  };
}

function parseLayoutItem(value: unknown, index: number): LayoutItem {
  const path = 'layout[' + index + ']';
  const item = record(value, path);
  if (item.size !== 'normal' && item.size !== 'wide') fail(path + '.size', '必须是 normal 或 wide。');
  if (item.width !== undefined && item.width !== 1 && item.width !== 2) fail(path + '.width', '必须是 1 或 2。');
  if (item.height !== undefined && item.height !== 1 && item.height !== 2) fail(path + '.height', '必须是 1 或 2。');

  const x = optionalInteger(item.x, path + '.x', 0, MAX_GRID_COLUMNS - 1);
  const y = optionalInteger(item.y, path + '.y');
  if ((x === undefined) !== (y === undefined)) fail(path, '自由网格坐标 x 和 y 必须同时填写或同时省略。');

  const width = item.width as 1 | 2 | undefined;
  const height = item.height as 1 | 2 | undefined;
  const resolvedWidth = width ?? (item.size === 'wide' ? 2 : 1);
  if (width !== undefined && (item.size === 'wide') !== (width === 2)) fail(path, 'size 必须与 width 保持一致。');
  if (x !== undefined && x + resolvedWidth > MAX_GRID_COLUMNS) fail(path, '横向位置和宽度不能超出 ' + MAX_GRID_COLUMNS + ' 列网格。');

  return {
    siteId: normalizedString(item.siteId, path + '.siteId'),
    order: safeInteger(item.order, path + '.order'),
    size: item.size,
    ...(x === undefined ? {} : { x }),
    ...(y === undefined ? {} : { y }),
    ...(width === undefined ? {} : { width }),
    ...(height === undefined ? {} : { height }),
  };
}

function ensureUnique(values: string[], path: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) fail(path, '包含重复 ID“' + value + '”。');
    seen.add(value);
  }
}

/** Validate untrusted navigation JSON and return a normalized, detached copy. */
export function parseNavigationData(value: unknown): NavigationData {
  const data = record(value, 'navigation');
  if (!Array.isArray(data.sites)) fail('sites', '必须是数组。');
  if (!Array.isArray(data.categories)) fail('categories', '必须是数组。');
  if (!Array.isArray(data.layout)) fail('layout', '必须是数组。');

  const sites = data.sites.map(parseSite);
  const categories = data.categories.map(parseCategory);
  const layout = data.layout.map(parseLayoutItem);
  ensureUnique(sites.map(site => site.id), 'sites');
  ensureUnique(categories.map(category => category.id), 'categories');
  ensureUnique(layout.map(item => item.siteId), 'layout');

  const categoryIds = new Set(categories.map(category => category.id));
  const siteIds = new Set(sites.map(site => site.id));
  const unknownCategorySite = sites.find(site => !categoryIds.has(site.categoryId));
  if (unknownCategorySite) fail('sites.' + unknownCategorySite.id + '.categoryId', '引用了不存在的分类“' + unknownCategorySite.categoryId + '”。');
  const danglingLayout = layout.find(item => !siteIds.has(item.siteId));
  if (danglingLayout) fail('layout.' + danglingLayout.siteId + '.siteId', '引用了不存在的网站“' + danglingLayout.siteId + '”。');

  return { sites, categories, layout };
}

export function tryParseNavigationData(value: unknown):
  | { ok: true; data: NavigationData }
  | { ok: false; error: NavigationDataValidationError } {
  try {
    return { ok: true, data: parseNavigationData(value) };
  } catch (error) {
    if (error instanceof NavigationDataValidationError) return { ok: false, error };
    return { ok: false, error: new NavigationDataValidationError('navigation', error instanceof Error ? error.message : '无法解析。') };
  }
}

export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  try {
    const parsed = new URL(normalized);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname ? normalized : null;
  } catch {
    return null;
  }
}

export function safeHostname(value: unknown, fallback = '地址无效'): string {
  const safeUrl = safeHttpUrl(value);
  if (!safeUrl) return fallback;
  return new URL(safeUrl).hostname.replace(/^www\./i, '') || fallback;
}
