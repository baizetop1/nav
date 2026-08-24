import type { TechOsSourceFile } from '../types/tech-os';
import { isManagedTechOsPath } from './techOsRepository.ts';

type FrontMatterValue = string | number | boolean | string[];
type FrontMatter = Record<string, FrontMatterValue>;

const KIND_RULES = {
  vision: { id: /^VISION-\d{3,}$/, statuses: ['active', 'archived'], required: [] },
  route: { id: /^ROUTE-\d{3,}$/, statuses: ['active', 'backlog', 'completed', 'archived', 'paused'], required: ['vision_id', 'main', 'source', 'origin_id', 'reason', 'quest_ids', 'route_seed_ids'] },
  'route-seed': { id: /^RS-\d{3,}$/, statuses: ['seed', 'candidate', 'selected', 'archived'], required: ['source', 'origin_id', 'reason', 'related_question_ids'] },
  'route-review': { id: /^REVIEW-\d{3,}$/, statuses: ['draft', 'completed'], required: ['route_id', 'knowledge_ids', 'lab_ids', 'project_ids', 'question_ids', 'route_seed_ids'] },
  quest: { id: /^QUEST-\d{3,}$/, statuses: ['active', 'backlog', 'completed', 'skipped'], required: ['route_id', 'order', 'question_ids', 'knowledge_ids', 'lab_ids', 'project_ids'] },
  question: { id: /^QUESTION-\d{3,}$/, statuses: ['open', 'answered', 'deferred', 'converted', 'archived'], required: ['origin_type', 'origin_id', 'route_seed_id'] },
  knowledge: { id: /^KNOWLEDGE-\d{3,}$/, statuses: ['learning', 'stable', 'archived'], required: ['domain', 'level', 'quest_ids', 'question_ids', 'lab_ids', 'project_ids', 'related_knowledge_ids', 'evidence_ids'] },
  lab: { id: /^LAB-\d{3,}$/, statuses: ['planned', 'running', 'completed', 'archived'], required: ['quest_ids', 'knowledge_ids', 'question_ids', 'project_ids'] },
  project: { id: /^PROJECT-\d{3,}$/, statuses: ['idea', 'planned', 'active', 'completed', 'paused', 'archived'], required: ['route_ids', 'quest_ids', 'knowledge_ids', 'lab_ids', 'question_ids'] },
  'tech-map': { id: /^MAP-\d{3,}$/, statuses: ['active', 'archived'], required: ['knowledge_ids'] },
  'inbox-item': { id: /^INBOX-\d{3,}$/, statuses: ['inbox', 'processed', 'archived'], required: ['source', 'origin_id', 'source_inbox_id', 'capture_type'] },
} as const;

const ROUTE_SOURCES = new Set(['manual', 'open_question', 'knowledge_gap', 'project_need', 'inbox', 'previous_route', 'system_suggestion']);
const KNOWLEDGE_DOMAINS = new Set(['internet', 'programming', 'system', 'architecture', 'electronics', 'ic', 'ai']);

interface ParsedDraftEntity {
  path: string;
  data: FrontMatter;
  body: string;
}

export interface TechOsDraftValidationResult {
  valid: boolean;
  errors: string[];
  entityCount: number;
}

export function validateTechOsDraftFiles(files: TechOsSourceFile[]): TechOsDraftValidationResult {
  const errors: string[] = [];
  const paths = new Set<string>();
  for (const file of files) {
    if (!isManagedTechOsPath(file.path)) errors.push(`不允许的文件路径：${file.path}`);
    if (paths.has(file.path)) errors.push(`重复文件路径：${file.path}`);
    paths.add(file.path);
  }

  const stateFile = files.find(file => file.path === 'tech-os/state.yml');
  if (!stateFile) errors.push('缺少 tech-os/state.yml。');
  let state: FrontMatter = {};
  try { if (stateFile) state = parseFlatYaml(stateFile.content, stateFile.path); }
  catch (error) { errors.push(errorMessage(error)); }

  const entities: ParsedDraftEntity[] = [];
  for (const file of files.filter(item => item.path.endsWith('.md'))) {
    try {
      const entity = parseFrontMatter(file.content, file.path);
      entities.push({ path: file.path, ...entity });
    } catch (error) { errors.push(errorMessage(error)); }
  }

  const byId = new Map<string, ParsedDraftEntity>();
  for (const entity of entities) {
    const kind = asString(entity.data.kind);
    const rule = KIND_RULES[kind as keyof typeof KIND_RULES];
    const id = asString(entity.data.id);
    if (entity.data.schema !== 'tech-os/v1') errors.push(`${entity.path} 的 schema 必须是 tech-os/v1。`);
    if (!rule) errors.push(`${entity.path} 的 kind 无效。`);
    else {
      if (!rule.id.test(id)) errors.push(`${entity.path} 的 ID 格式与 kind 不匹配。`);
      if (!(rule.statuses as readonly FrontMatterValue[]).includes(entity.data.status)) errors.push(`${entity.path} 的 status 无效。`);
      for (const field of rule.required) if (!(field in entity.data)) errors.push(`${entity.path} 缺少字段 ${field}。`);
    }
    if (!asString(entity.data.title)) errors.push(`${entity.path} 缺少 title。`);
    if (!isDate(entity.data.created)) errors.push(`${entity.path} 的 created 必须是有效 YYYY-MM-DD。`);
    if (!Array.isArray(entity.data.tags)) errors.push(`${entity.path} 的 tags 必须是数组。`);
    if (!entity.body.trim()) errors.push(`${entity.path} 缺少 Markdown 正文。`);
    if (byId.has(id)) errors.push(`ID 重复：${id}。`);
    else if (id) byId.set(id, entity);

    if (kind === 'route') {
      if (typeof entity.data.main !== 'boolean') errors.push(`${entity.path} 的 main 必须是 boolean。`);
      if (!ROUTE_SOURCES.has(asString(entity.data.source))) errors.push(`${entity.path} 的 source 无效。`);
    }
    if (kind === 'route-seed' && !ROUTE_SOURCES.has(asString(entity.data.source))) errors.push(`${entity.path} 的 source 无效。`);
    if (kind === 'quest') {
      if (!/[?？]$/.test(asString(entity.data.title))) errors.push(`${entity.path} 的 Quest 标题必须以问号结尾。`);
      if (!Number.isSafeInteger(entity.data.order) || Number(entity.data.order) < 1) errors.push(`${entity.path} 的 order 必须是正整数。`);
    }
    if (kind === 'knowledge') {
      const level = asString(entity.data.level);
      if (!KNOWLEDGE_DOMAINS.has(asString(entity.data.domain))) errors.push(`${entity.path} 的 domain 无效。`);
      if (!['L0', 'L1', 'L2', 'L3'].includes(level)) errors.push(`${entity.path} 的 level 必须是 L0–L3。`);
      if (['L2', 'L3'].includes(level) && (!Array.isArray(entity.data.evidence_ids) || entity.data.evidence_ids.length === 0)) {
        errors.push(`${entity.path} 的 ${level} 必须提供 evidence_ids。`);
      }
      for (const heading of ['是什么？', '为什么遇到？', '目前理解到什么程度？', '亲手做过什么？', '与哪些知识连接？', '还有什么不知道？']) {
        if (!entity.body.includes(`## ${heading}`)) errors.push(`${entity.path} 缺少 Knowledge 章节“${heading}”。`);
      }
    }
    if (kind === 'inbox-item' && !['question', 'idea', 'note', 'link'].includes(asString(entity.data.capture_type))) {
      errors.push(`${entity.path} 的 capture_type 无效。`);
    }
  }

  for (const entity of entities) validateRelations(entity, byId, errors);
  validatePathStatus(entities, errors);
  validateState(state, byId, entities, errors);
  return { valid: errors.length === 0, errors, entityCount: entities.length };
}

function validatePathStatus(entities: ParsedDraftEntity[], errors: string[]): void {
  const rules: Array<[string, string, string[]]> = [
    ['/routes/active/', 'route', ['active']], ['/routes/backlog/', 'route', ['backlog']], ['/routes/completed/', 'route', ['completed']],
    ['/routes/archived/', 'route', ['archived']], ['/routes/seeds/', 'route-seed', ['seed']], ['/routes/candidates/', 'route-seed', ['candidate', 'archived']],
    ['/reviews/', 'route-review', ['draft', 'completed']],
    ['/quests/active/', 'quest', ['active']], ['/quests/backlog/', 'quest', ['backlog']], ['/quests/completed/', 'quest', ['completed']],
    ['/graveyard/', 'route', ['paused']],
  ];
  for (const entity of entities) {
    const rule = rules.find(([segment]) => `/${entity.path}`.includes(segment));
    if (rule && (entity.data.kind !== rule[1] || !rule[2].includes(String(entity.data.status)))) {
      errors.push(`${entity.path} 所在目录要求 kind=${rule[1]}、status=${rule[2].join('/')}。`);
    }
  }
}

function validateRelations(entity: ParsedDraftEntity, byId: Map<string, ParsedDraftEntity>, errors: string[]): void {
  for (const [field, value] of Object.entries(entity.data)) {
    if (!field.endsWith('_id') && !field.endsWith('_ids')) continue;
    if (entity.data.kind === 'inbox-item' && (field === 'origin_id' || field === 'source_inbox_id')) continue;
    if (field === 'origin_id' && entity.data.origin_type === 'inbox') continue;
    const values = Array.isArray(value) ? value : [value];
    if (field.endsWith('_ids') && !Array.isArray(value)) errors.push(`${entity.path} 的 ${field} 必须是数组。`);
    for (const idValue of values) {
      if (idValue === '') continue;
      if (typeof idValue !== 'string') { errors.push(`${entity.path} 的 ${field} 必须只包含 ID。`); continue; }
      if (!byId.has(idValue)) errors.push(`${entity.path} 的 ${field} 引用了不存在的 ID：${idValue}。`);
    }
  }
}

function validateState(state: FrontMatter, byId: Map<string, ParsedDraftEntity>, entities: ParsedDraftEntity[], errors: string[]): void {
  if (state.schema !== 'tech-os-state/v1') errors.push('state.yml 的 schema 必须是 tech-os-state/v1。');
  if (!['explore', 'lab', 'keep-alive'].includes(asString(state.mode))) errors.push('state.yml 的 mode 无效。');
  if (!isDate(state.updated)) errors.push('state.yml 的 updated 必须是有效 YYYY-MM-DD。');
  const mainRoutes = entities.filter(entity => entity.data.kind === 'route' && entity.data.status === 'active' && entity.data.main === true);
  if (mainRoutes.length !== 1) errors.push(`必须恰好有一条 Active Main Route，当前为 ${mainRoutes.length} 条。`);
  const vision = byId.get(asString(state.vision_id));
  if (vision?.data.kind !== 'vision') errors.push('state.yml 的 vision_id 必须指向 Vision。');
  const route = byId.get(asString(state.main_route_id));
  if (route?.data.kind !== 'route' || route.data.status !== 'active' || route.data.main !== true) errors.push('state.yml 的 main_route_id 必须指向 Active Main Route。');
  const quest = byId.get(asString(state.current_quest_id));
  if (quest?.data.kind !== 'quest' || quest.data.status !== 'active') errors.push('state.yml 的 current_quest_id 必须指向 Active Quest。');
  else if (quest.data.route_id !== state.main_route_id) errors.push('Current Quest 必须属于 Main Route。');
}

function parseFrontMatter(source: string, label: string): { data: FrontMatter; body: string } {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) throw new Error(`${label} 缺少开头 Front Matter。`);
  const end = normalized.indexOf('\n---\n', 4);
  if (end < 0) throw new Error(`${label} 缺少结尾 Front Matter。`);
  return { data: parseFlatYaml(normalized.slice(4, end), label), body: normalized.slice(end + 5) };
}

function parseFlatYaml(source: string, label: string): FrontMatter {
  const data: FrontMatter = {};
  let listKey: string | null = null;
  for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const item = line.match(/^\s+-\s+(.+)$/);
    if (item) {
      if (!listKey || !Array.isArray(data[listKey])) throw new Error(`${label} 包含没有字段的列表项。`);
      (data[listKey] as string[]).push(asString(parseScalar(item[1])));
      continue;
    }
    const field = line.match(/^([a-z][a-z0-9_-]*):(?:\s*(.*))?$/i);
    if (!field) throw new Error(`${label} 包含不支持的 YAML：${line.trim()}`);
    if (Object.prototype.hasOwnProperty.call(data, field[1])) throw new Error(`${label} 包含重复字段：${field[1]}`);
    if (!field[2]?.trim()) { data[field[1]] = []; listKey = field[1]; }
    else { data[field[1]] = parseScalar(field[2]); listKey = null; }
  }
  return data;
}

function parseScalar(raw: string): FrontMatterValue {
  const value = raw.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (value === '[]') return [];
  if (value.startsWith('"') && value.endsWith('"')) {
    try { return JSON.parse(value) as string; } catch { return value.slice(1, -1); }
  }
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  return value.replace(/\s+#.*$/, '').trim();
}

function isDate(value: FrontMatterValue | undefined): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function asString(value: FrontMatterValue | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
