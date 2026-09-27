import type { InboxItem } from '../types/inbox';
import type { TemporaryVisitSummary } from './temporaryVisits';
import type { TranslationHistoryItem } from './translationHistory';
import type { ReadingItem } from '../services/readingHistory';
import type { TechOsEntity } from '../types/tech-os';
import type { SearchEngine } from '../types/navigation';

export const SEARCH_ALIASES_KEY = 'nav_search_aliases_v1';
export interface SearchAlias { prefix: string; name: string; template: string }

export function validateSearchAlias(alias: SearchAlias, reservedPrefixes: string[] = []): string | null {
  if (!/^[a-z][a-z0-9-]{0,15}$/.test(alias.prefix)) return '别名请使用 1–16 位小写字母、数字或短横线，以字母开头。';
  if (reservedPrefixes.includes(alias.prefix)) return '这个前缀已被内置搜索引擎使用。';
  if (!alias.name.trim() || alias.name.length > 60) return '请填写不超过 60 个字符的名称。';
  if (alias.template.length > 2000 || alias.template.split('{query}').length !== 2) return '地址模板必须且只能包含一个 {query}。';
  try {
    const marker = '__baize_search_query__';
    const url = new URL(alias.template.replace('{query}', marker));
    if (url.protocol !== 'https:' || url.username || url.password || url.hostname.includes(marker)) return '模板必须是无账号密码的 HTTPS 地址，{query} 只能放在路径、参数或锚点中。';
  } catch { return '请输入有效的 HTTPS 地址模板。'; }
  return null;
}

export function parseSearchAliases(value: unknown, reservedPrefixes: string[] = []): SearchAlias[] {
  if (!Array.isArray(value)) return [];
  const aliases: SearchAlias[] = [];
  for (const raw of value.slice(0, 30)) {
    if (!raw || typeof raw !== 'object' || typeof raw.prefix !== 'string' || typeof raw.name !== 'string' || typeof raw.template !== 'string') continue;
    const alias = { prefix: raw.prefix.trim().toLowerCase(), name: raw.name.trim(), template: raw.template.trim() };
    if (!validateSearchAlias(alias, reservedPrefixes) && !aliases.some(item => item.prefix === alias.prefix)) aliases.push(alias);
  }
  return aliases;
}

export function resolveSearchAlias(query: string, aliases: SearchAlias[], engines: SearchEngine[]) {
  const match = query.trim().match(/^([a-z][a-z0-9-]{0,15})\s+([\s\S]+)$/i);
  if (!match) return null;
  const prefix = match[1].toLowerCase();
  const term = match[2].trim();
  if (!term) return null;
  const builtin = engines.find(engine => engine.prefix === prefix);
  const alias = builtin ? { name: builtin.name, prefix, template: `${builtin.url}{query}` } : aliases.find(item => item.prefix === prefix);
  if (!alias || validateSearchAlias(alias)) return null;
  return { title: `在 ${alias.name} 搜索“${term}”`, url: alias.template.replace('{query}', encodeURIComponent(term)), term, name: alias.name };
}

/** Small bounded arithmetic grammar. Never executes JavaScript. */
export function calculateExpression(input: string): number | null {
  const expression = input.trim().replace(/^=\s*/, '');
  if (!expression || expression.length > 256 || !/^[\d\s.eE+*/%^()\-]+$/.test(expression)) return null;
  const tokens: string[] = [];
  let offset = 0;
  while (offset < expression.length) {
    const match = expression.slice(offset).match(/^(?:\s+|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[+*/%^()\-])/i);
    if (!match) return null;
    offset += match[0].length;
    if (match[0].trim()) tokens.push(match[0]);
  }
  if (tokens.length > 128) return null;
  let position = 0;
  function primary(): number {
    const token = tokens[position++];
    if (token === '(') { const value = sum(); if (tokens[position++] !== ')') throw new Error('parentheses'); return value; }
    if (!token || !/^(?:\d|\.)/.test(token)) throw new Error('number');
    return Number(token);
  }
  function power(): number { const value = primary(); if (tokens[position] === '^') { position += 1; return value ** unary(); } return value; }
  function unary(): number { if (tokens[position] === '+') { position += 1; return unary(); } if (tokens[position] === '-') { position += 1; return -unary(); } return power(); }
  function product(): number {
    let value = unary();
    while (['*', '/', '%'].includes(tokens[position])) {
      const operator = tokens[position++]; const right = unary();
      if ((operator === '/' || operator === '%') && right === 0) throw new Error('zero');
      value = operator === '*' ? value * right : operator === '/' ? value / right : value % right;
    }
    return value;
  }
  function sum(): number { let value = product(); while (['+', '-'].includes(tokens[position])) { const operator = tokens[position++]; const right = product(); value = operator === '+' ? value + right : value - right; } return value; }
  try { const value = sum(); return position === tokens.length && Number.isFinite(value) ? value : null; } catch { return null; }
}

const units: Record<string, [string, number]> = {
  mm: ['length', .001], cm: ['length', .01], m: ['length', 1], km: ['length', 1000], in: ['length', .0254], ft: ['length', .3048], mi: ['length', 1609.344],
  mg: ['weight', .000001], g: ['weight', .001], kg: ['weight', 1], lb: ['weight', .45359237], oz: ['weight', .028349523125],
  ms: ['time', .001], s: ['time', 1], min: ['time', 60], h: ['time', 3600], d: ['time', 86400],
  b: ['bytes', 1], kb: ['bytes', 1000], mb: ['bytes', 1000 ** 2], gb: ['bytes', 1000 ** 3], tb: ['bytes', 1000 ** 4], kib: ['bytes', 1024], mib: ['bytes', 1024 ** 2], gib: ['bytes', 1024 ** 3],
};
const formatNumber = (value: number) => Number(value.toPrecision(12)).toString();
export function convertUnits(input: string): { text: string; value: number } | null {
  const match = input.trim().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*([a-z°]+)\s+(?:to|in|转|到)\s*([a-z°]+)$/i);
  if (!match) return null;
  const value = Number(match[1]); const from = match[2].toLowerCase().replace('°', ''); const to = match[3].toLowerCase().replace('°', '');
  let result: number;
  if (['c', 'f', 'k'].includes(from) && ['c', 'f', 'k'].includes(to)) {
    const celsius = from === 'c' ? value : from === 'f' ? (value - 32) * 5 / 9 : value - 273.15;
    if (celsius < -273.150000001) return null;
    result = to === 'c' ? celsius : to === 'f' ? celsius * 9 / 5 + 32 : celsius + 273.15;
  } else {
    const source = units[from]; const target = units[to];
    if (!source || !target || source[0] !== target[0]) return null;
    result = value * source[1] / target[1];
  }
  return Number.isFinite(result) ? { value: result, text: `${formatNumber(result)} ${match[3]}` } : null;
}

export function quickSearchAnswer(query: string, now = new Date()): { title: string; value: string; description: string } | null {
  const unit = convertUnits(query);
  if (unit) return { title: unit.text, value: unit.text, description: '单位换算 · 点击复制（B / KB / MB 为字节，KiB 为二进制单位）' };
  if (/^(?:now|time|时间|当前时间)$/i.test(query.trim())) return { title: now.toLocaleString(), value: now.toISOString(), description: '当前本地时间 · 点击复制 ISO 时间' };
  const stamp = query.trim().match(/^(?:timestamp|时间戳)\s+(\d{10}|\d{13})$/i);
  if (stamp) { const date = new Date(Number(stamp[1]) * (stamp[1].length === 10 ? 1000 : 1)); if (Number.isFinite(date.getTime())) return { title: date.toLocaleString(), value: date.toISOString(), description: '时间戳转换 · 点击复制 ISO 时间' }; }
  if (/^\s*=/.test(query) || /[+*/^()%]/.test(query) || /\d\s*-\s*\d/.test(query)) {
    const result = calculateExpression(query);
    if (result !== null) return { title: `= ${formatNumber(result)}`, value: formatNumber(result), description: '本地计算 · 点击复制（% 为取余，^ 为乘方）' };
  }
  return null;
}

export type GlobalSearchGroup = 'inbox' | 'temporary' | 'translation' | 'reading' | 'tech-os';
export interface GlobalSearchDocument {
  id: string;
  group: GlobalSearchGroup;
  title: string;
  content: string;
  description: string;
  tags: string[];
  sourceId: string;
  url?: string;
}
export function buildGlobalSearchDocuments(input: {
  inboxItems?: InboxItem[];
  temporaryVisits?: TemporaryVisitSummary[];
  translationHistory?: TranslationHistoryItem[];
  readingItems?: ReadingItem[];
  techOsEntities?: TechOsEntity[];
}): GlobalSearchDocument[] {
  return [
    ...(input.inboxItems || []).filter(item => !item.deletedAt).map(item => ({ id: `inbox:${item.id}`, sourceId: item.id, group: 'inbox' as const, title: item.title || item.content?.slice(0, 70) || item.url || '未命名收集', content: item.content || item.url || '', description: item.status === 'archived' ? 'Inbox · 已归档' : 'Inbox · 待整理', tags: item.tags, url: item.url })),
    ...(input.temporaryVisits || []).map(item => ({ id: `temporary:${item.key}`, sourceId: item.key, group: 'temporary' as const, title: item.hostname, content: item.url, description: `30 天内访问 ${item.count} 次`, tags: [], url: item.url })),
    ...(input.translationHistory || []).map(item => ({ id: `translation:${item.id}`, sourceId: item.id, group: 'translation' as const, title: item.sourceText.slice(0, 90), content: `${item.sourceText}\n\n${item.translatedText}`, description: `${item.sourceLanguage} → ${item.targetLanguage}`, tags: [] })),
    ...(input.readingItems || []).filter(item => !item.deletedAt && item.readLater).map(item => ({ id: `reading:${item.url}`, sourceId: item.url, group: 'reading' as const, title: item.title || item.url, content: item.url, description: `稍后阅读 · 进度 ${Math.round(item.position)}%`, tags: [], url: item.url })),
    ...(input.techOsEntities || []).map(item => ({ id: `tech-os:${item.id}`, sourceId: item.id, group: 'tech-os' as const, title: item.title, content: item.body, description: `Tech OS · ${item.kind} · ${item.status}`, tags: item.tags })),
  ];
}
