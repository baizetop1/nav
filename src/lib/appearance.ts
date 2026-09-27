export const APPEARANCE_STORAGE_KEY = 'baize_appearance_v1';

export const APPEARANCE_THEMES = [
  { id: 'landscape', name: '山水清境', description: '青绿山水，延续熟悉的清静留白。' },
  { id: 'mist', name: '雾蓝晨光', description: '柔和雾蓝，让阅读与整理更轻盈。' },
  { id: 'paper', name: '暖纸书房', description: '温润纸色，适合长时间书写与思考。' },
  { id: 'graphite', name: '石墨极简', description: '克制石墨，专注内容本身。' },
] as const;

export type AppearanceThemeId = typeof APPEARANCE_THEMES[number]['id'];
export type AppearanceMode = 'fixed' | 'daily';
export interface AppearancePreference {
  version: 1;
  mode: AppearanceMode;
  themeId: AppearanceThemeId;
}
export const DEFAULT_APPEARANCE_PREFERENCE: Readonly<AppearancePreference> = Object.freeze({
  version: 1, mode: 'fixed', themeId: 'landscape',
});

type AppearanceReadStorage = Pick<Storage, 'getItem'>;
type AppearanceWriteStorage = Pick<Storage, 'setItem'>;
export interface AppearanceReadResult {
  preference: AppearancePreference;
  status: 'valid' | 'missing' | 'invalid' | 'unavailable';
}
export type AppearanceSaveResult = { ok: true } | { ok: false; message: string };

export function isAppearanceThemeId(value: unknown): value is AppearanceThemeId {
  return APPEARANCE_THEMES.some(theme => theme.id === value);
}

/** Unknown versions and malformed records stay untouched until an explicit user choice. */
export function parseAppearancePreference(raw: string | null | undefined): AppearancePreference | null {
  if (!raw || raw.length > 4096) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (record.version !== 1 || (record.mode !== 'fixed' && record.mode !== 'daily') || !isAppearanceThemeId(record.themeId)) return null;
    return { version: 1, mode: record.mode, themeId: record.themeId };
  } catch { return null; }
}

function browserStorage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; }
  catch { return null; }
}

/** Reading never writes, repairs, migrates, or queues a shared-sync entry. */
export function readAppearancePreference(storage: AppearanceReadStorage | null = browserStorage()): AppearanceReadResult {
  const fallback = () => ({ ...DEFAULT_APPEARANCE_PREFERENCE });
  if (!storage) return { preference: fallback(), status: 'unavailable' };
  try {
    const raw = storage.getItem(APPEARANCE_STORAGE_KEY);
    if (raw === null) return { preference: fallback(), status: 'missing' };
    const preference = parseAppearancePreference(raw);
    return preference ? { preference, status: 'valid' } : { preference: fallback(), status: 'invalid' };
  } catch { return { preference: fallback(), status: 'unavailable' }; }
}

/** An explicit, isolated local write; callers retain their current session state on failure. */
export function saveAppearancePreference(preference: AppearancePreference, storage: AppearanceWriteStorage | null = browserStorage()): AppearanceSaveResult {
  if (!storage) return { ok: false, message: '当前无法使用本地存储，外观仅在本次打开中生效。' };
  try {
    storage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ version: 1, mode: preference.mode, themeId: preference.themeId }));
    return { ok: true };
  } catch (error) {
    const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
    const reason = name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED'
      ? '浏览器存储空间不足'
      : name === 'SecurityError' || name === 'NotAllowedError' ? '浏览器禁止使用本地存储' : '本地存储写入失败';
    return { ok: false, message: `${reason}，外观仅在本次打开中生效。` };
  }
}

export function localAppearanceDateKey(date: Date): string {
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Use local calendar fields, not UTC dates or elapsed 24-hour blocks (DST-safe). */
export function resolveDailyTheme(date: Date = new Date()): AppearanceThemeId {
  if (!Number.isFinite(date.getTime())) return DEFAULT_APPEARANCE_PREFERENCE.themeId;
  const calendarDay = new Date(0);
  calendarDay.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
  const ordinal = Math.floor(calendarDay.getTime() / 86_400_000);
  const index = ((ordinal % APPEARANCE_THEMES.length) + APPEARANCE_THEMES.length) % APPEARANCE_THEMES.length;
  return APPEARANCE_THEMES[index].id;
}

export function resolveAppearanceTheme(preference: AppearancePreference, date: Date = new Date()): AppearanceThemeId {
  return preference.mode === 'daily' ? resolveDailyTheme(date) : preference.themeId;
}
