export const HOME_TOOLS_KEY = 'baize_home_tools_v1';
export const HOME_TOOLS_EVENT = 'baize:home-tools-updated';
export const HOME_TOOL_IDS = ['tech-os', 'blog', 'rest', 'game', 'reading', 'graph', 'capture', 'rss', 'work-session', 'hot-feed', 'temporary-visits', 'translate'] as const;
export type HomeToolId = typeof HOME_TOOL_IDS[number];
export interface HomeToolPreference { id: HomeToolId; visible: boolean; pinned: boolean }
export interface HomeToolPreferences { version: 1; tools: HomeToolPreference[] }
export const defaultHomeTools = (): HomeToolPreferences => ({ version: 1, tools: HOME_TOOL_IDS.map(id => ({ id, visible: true, pinned: ['tech-os', 'capture', 'work-session'].includes(id) })) });
export function parseHomeTools(value: unknown): HomeToolPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('首页入口配置无效，原记录未覆盖。');
  const input = value as { version?: unknown; tools?: unknown };
  if (input.version !== 1 || !Array.isArray(input.tools) || input.tools.length > HOME_TOOL_IDS.length) throw new Error('首页入口配置格式不受支持。');
  const seen = new Set<string>(), tools: HomeToolPreference[] = [];
  for (const item of input.tools) {
    if (!item || typeof item !== 'object' || !HOME_TOOL_IDS.includes(item.id) || seen.has(item.id) || typeof item.visible !== 'boolean' || typeof item.pinned !== 'boolean') throw new Error('首页入口配置包含无效或重复项目。');
    seen.add(item.id); tools.push({ id: item.id, visible: item.visible, pinned: item.pinned });
  }
  tools.push(...defaultHomeTools().tools.filter(item => !seen.has(item.id)));
  return { version: 1, tools };
}
export function groupHomeTools(config: HomeToolPreferences, compact: boolean): { primary: HomeToolId[]; more: HomeToolId[] } {
  const enabled = config.tools.filter(item => item.visible), pinned = enabled.filter(item => item.pinned), others = enabled.filter(item => !item.pinned);
  const primary = compact ? pinned : [...pinned, ...others.slice(0, Math.max(0, 6 - pinned.length))];
  const ids = new Set(primary.map(item => item.id));
  return { primary: primary.map(item => item.id), more: enabled.filter(item => !ids.has(item.id)).map(item => item.id) };
}
export function readHomeTools(storage: Pick<Storage, 'getItem'> = localStorage): { config: HomeToolPreferences; raw: string | null; error: string } {
  let raw: string | null = null;
  try { raw = storage.getItem(HOME_TOOLS_KEY); return { config: raw === null ? defaultHomeTools() : parseHomeTools(JSON.parse(raw)), raw, error: '' }; }
  catch (cause) { return { config: defaultHomeTools(), raw, error: (cause as Error).message }; }
}
export function saveHomeTools(config: HomeToolPreferences, expected: string | null, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): string {
  const value = JSON.stringify(parseHomeTools(config));
  if (storage.getItem(HOME_TOOLS_KEY) !== expected) throw new Error('另一页面已修改入口配置。请关闭整理面板后重新打开，再调整。');
  storage.setItem(HOME_TOOLS_KEY, value);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(HOME_TOOLS_EVENT));
  return value;
}
