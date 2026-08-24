import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const TECH_OS_SCHEMA = 'tech-os/v1';
const STATE_SCHEMA = 'tech-os-state/v1';

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
};

const REQUIRED_DIRECTORIES = [
  'inbox', 'vision', 'routes/active', 'routes/backlog', 'routes/completed', 'routes/archived', 'routes/seeds', 'routes/candidates', 'reviews',
  'quests/active', 'quests/backlog', 'quests/completed', 'questions', 'knowledge/internet', 'knowledge/programming', 'knowledge/system',
  'knowledge/architecture', 'knowledge/electronics', 'knowledge/ic', 'knowledge/ai', 'labs', 'projects', 'map', 'graveyard', 'logs', 'templates',
];

const REQUIRED_TEMPLATES = [
  'vision.md', 'route.md', 'route-seed.md', 'quest.md', 'question.md', 'knowledge.md', 'lab.md', 'project.md',
  'tech-map.md', 'graveyard.md', 'route-review.md', 'inbox-item.md',
];

const ROUTE_SOURCES = new Set(['manual', 'open_question', 'knowledge_gap', 'project_need', 'inbox', 'previous_route', 'system_suggestion']);
const QUESTION_ORIGINS = new Set(['quest', 'knowledge', 'lab', 'project', 'inbox']);
const KNOWLEDGE_DOMAINS = new Set(['internet', 'programming', 'system', 'architecture', 'electronics', 'ic', 'ai']);
const MODES = new Set(['explore', 'lab', 'keep-alive']);

export function findTechOsProjectRoot(start = process.cwd()) {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, 'package.json')) && fs.existsSync(path.join(current, 'tech-os', 'state.yml'))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error('没有找到同时包含 package.json 和 tech-os/state.yml 的项目根目录。');
    current = parent;
  }
}

export function inspectTechOs(root = findTechOsProjectRoot()) {
  const techRoot = path.join(root, 'tech-os');
  const errors = [];
  for (const directory of REQUIRED_DIRECTORIES) {
    if (!fs.existsSync(path.join(techRoot, directory))) errors.push(`缺少目录：tech-os/${directory}`);
  }
  for (const template of REQUIRED_TEMPLATES) {
    if (!fs.existsSync(path.join(techRoot, 'templates', template))) errors.push(`缺少模板：tech-os/templates/${template}`);
  }

  const entities = [];
  for (const file of walkMarkdownFiles(techRoot)) {
    const relative = relativePath(root, file);
    if (relative.includes('/templates/') || path.basename(file).toLowerCase() === 'readme.md') continue;
    try {
      const parsed = parseFrontMatter(fs.readFileSync(file, 'utf8'), relative);
      entities.push({ ...parsed, file, relative });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${relative} 无法解析。`);
    }
  }

  const byId = new Map();
  for (const entity of entities) {
    validateEntityShape(entity, errors);
    const id = asString(entity.data.id);
    if (!id) continue;
    if (byId.has(id)) errors.push(`ID 重复：${id}（${byId.get(id).relative} 与 ${entity.relative}）`);
    else byId.set(id, entity);
  }

  for (const entity of entities) validateEntityRelations(entity, byId, errors);
  validatePathStatus(entities, errors);
  validateState(root, entities, byId, errors);

  const counts = Object.fromEntries(Object.keys(KIND_RULES).map(kind => [kind, entities.filter(entity => entity.data.kind === kind).length]));
  return { root, techRoot, entities, counts, errors };
}

export function validateTechOs(root = findTechOsProjectRoot()) {
  const report = inspectTechOs(root);
  if (report.errors.length) throw new Error(`Tech OS 校验失败：\n- ${report.errors.join('\n- ')}`);
  return report;
}

function validateEntityShape(entity, errors) {
  const { data, body, relative } = entity;
  if (data.schema !== TECH_OS_SCHEMA) errors.push(`${relative} 的 schema 必须是 ${TECH_OS_SCHEMA}。`);
  const kind = asString(data.kind);
  const rule = KIND_RULES[kind];
  if (!rule) {
    errors.push(`${relative} 的 kind 无效：${kind || '空'}。`);
    return;
  }
  const id = asString(data.id);
  if (!rule.id.test(id)) errors.push(`${relative} 的 ID 格式与 kind 不匹配：${id || '空'}。`);
  if (!asString(data.title)) errors.push(`${relative} 缺少 title。`);
  if (!rule.statuses.includes(data.status)) errors.push(`${relative} 的 status 无效：${String(data.status)}。`);
  if (!isDate(data.created)) errors.push(`${relative} 的 created 必须是 YYYY-MM-DD。`);
  if (!Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== 'string')) errors.push(`${relative} 的 tags 必须是字符串数组。`);
  for (const field of rule.required) {
    if (!(field in data)) errors.push(`${relative} 缺少字段 ${field}。`);
  }
  if (!body.trim()) errors.push(`${relative} 缺少 Markdown 正文。`);

  if (kind === 'route') {
    if (typeof data.main !== 'boolean') errors.push(`${relative} 的 main 必须是 boolean。`);
    if (!ROUTE_SOURCES.has(data.source)) errors.push(`${relative} 的 source 无效。`);
    if (!Array.isArray(data.quest_ids) || !Array.isArray(data.route_seed_ids)) errors.push(`${relative} 的关联 ID 必须使用数组。`);
  }
  if (kind === 'route-seed' && !ROUTE_SOURCES.has(data.source)) errors.push(`${relative} 的 source 无效。`);
  if (kind === 'quest') {
    if (!Number.isSafeInteger(data.order) || data.order < 1) errors.push(`${relative} 的 order 必须是正整数。`);
    if (!/[?？]$/.test(asString(data.title))) errors.push(`${relative} 的 Quest 标题必须是问题并以问号结尾。`);
  }
  if (kind === 'question' && !QUESTION_ORIGINS.has(data.origin_type)) errors.push(`${relative} 的 origin_type 无效。`);
  if (kind === 'knowledge') {
    if (!KNOWLEDGE_DOMAINS.has(data.domain)) errors.push(`${relative} 的 domain 无效。`);
    if (!['L0', 'L1', 'L2', 'L3'].includes(data.level)) errors.push(`${relative} 的 level 必须是 L0–L3。`);
    if (['L2', 'L3'].includes(data.level) && (!Array.isArray(data.evidence_ids) || data.evidence_ids.length === 0)) {
      errors.push(`${relative} 的 ${data.level} 必须提供 evidence_ids，且只能由用户确认。`);
    }
    for (const heading of ['是什么？', '为什么遇到？', '目前理解到什么程度？', '亲手做过什么？', '与哪些知识连接？', '还有什么不知道？']) {
      if (!body.includes(`## ${heading}`)) errors.push(`${relative} 缺少 Knowledge 章节“${heading}”。`);
    }
  }
  if (kind === 'inbox-item' && !['question', 'idea', 'note', 'link'].includes(data.capture_type)) {
    errors.push(`${relative} 的 capture_type 无效。`);
  }
}

function validateEntityRelations(entity, byId, errors) {
  const { data, relative } = entity;
  const relations = [
    ['vision_id', ['vision']], ['route_id', ['route']], ['route_ids', ['route']], ['quest_ids', ['quest']],
    ['question_ids', ['question']], ['knowledge_ids', ['knowledge']], ['lab_ids', ['lab']], ['project_ids', ['project']],
    ['route_seed_id', ['route-seed']], ['route_seed_ids', ['route-seed']], ['related_question_ids', ['question']],
    ['related_knowledge_ids', ['knowledge']], ['evidence_ids', ['lab', 'project']],
  ];
  for (const [field, expectedKinds] of relations) {
    if (!(field in data)) continue;
    const values = Array.isArray(data[field]) ? data[field] : [data[field]];
    for (const value of values) {
      if (value === '') continue;
      if (typeof value !== 'string') {
        errors.push(`${relative} 的 ${field} 必须是 ID 或 ID 数组。`);
        continue;
      }
      const target = byId.get(value);
      if (!target) errors.push(`${relative} 的 ${field} 引用了不存在的 ID：${value}。`);
      else if (!expectedKinds.includes(target.data.kind)) errors.push(`${relative} 的 ${field} 引用了错误 kind：${value}。`);
    }
  }

  if (data.kind === 'route-seed' || (data.kind === 'route' && data.source !== 'manual')) validateAnyOrigin(entity, byId, errors);
  if (data.kind === 'question' && data.origin_type !== 'inbox') {
    const target = byId.get(data.origin_id);
    if (!target) errors.push(`${relative} 的 origin_id 不存在：${String(data.origin_id)}。`);
    else if (target.data.kind !== data.origin_type) errors.push(`${relative} 的 origin_type 与 origin_id kind 不一致。`);
  }
  if (data.kind === 'route' && data.source === 'manual') validateAnyOrigin(entity, byId, errors);
}

function validateAnyOrigin(entity, byId, errors) {
  const origin = entity.data.origin_id;
  if (typeof origin !== 'string' || !origin || !byId.has(origin)) errors.push(`${entity.relative} 的 origin_id 不存在：${String(origin)}。`);
}

function validatePathStatus(entities, errors) {
  const rules = [
    ['/routes/active/', 'route', ['active']], ['/routes/backlog/', 'route', ['backlog']], ['/routes/completed/', 'route', ['completed']],
    ['/routes/archived/', 'route', ['archived']], ['/routes/seeds/', 'route-seed', ['seed']], ['/routes/candidates/', 'route-seed', ['candidate', 'archived']],
    ['/reviews/', 'route-review', ['draft', 'completed']],
    ['/quests/active/', 'quest', ['active']], ['/quests/backlog/', 'quest', ['backlog']], ['/quests/completed/', 'quest', ['completed']],
    ['/graveyard/', 'route', ['paused']],
  ];
  for (const entity of entities) {
    const normalized = `/${entity.relative.replace(/\\/g, '/')}`;
    const rule = rules.find(([segment]) => normalized.includes(segment));
    if (!rule) continue;
    const [, expectedKind, expectedStatuses] = rule;
    if (entity.data.kind !== expectedKind || !expectedStatuses.includes(entity.data.status)) {
      errors.push(`${entity.relative} 所在目录要求 kind=${expectedKind}、status=${expectedStatuses.join('/')}。`);
    }
  }
}

function validateState(root, entities, byId, errors) {
  const statePath = path.join(root, 'tech-os', 'state.yml');
  let state;
  try {
    state = parseFlatYaml(fs.readFileSync(statePath, 'utf8'), relativePath(root, statePath));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'tech-os/state.yml 无法解析。');
    return;
  }
  if (state.schema !== STATE_SCHEMA) errors.push(`tech-os/state.yml 的 schema 必须是 ${STATE_SCHEMA}。`);
  if (!isDate(state.updated)) errors.push('tech-os/state.yml 的 updated 必须是 YYYY-MM-DD。');
  if (!MODES.has(state.mode)) errors.push('tech-os/state.yml 的 mode 必须是 explore、lab 或 keep-alive。');

  const activeMainRoutes = entities.filter(entity => entity.data.kind === 'route' && entity.data.status === 'active' && entity.data.main === true);
  if (activeMainRoutes.length !== 1) errors.push(`必须恰好有一条 Active Main Route，当前为 ${activeMainRoutes.length} 条。`);
  const mainRoute = byId.get(state.main_route_id);
  if (!mainRoute || mainRoute.data.kind !== 'route' || mainRoute.data.status !== 'active' || mainRoute.data.main !== true) {
    errors.push('state.yml 的 main_route_id 必须指向 Active Main Route。');
  } else if (activeMainRoutes[0] && activeMainRoutes[0].data.id !== state.main_route_id) {
    errors.push('state.yml 的 main_route_id 与唯一 Active Main Route 不一致。');
  }

  const vision = byId.get(state.vision_id);
  if (!vision || vision.data.kind !== 'vision') errors.push('state.yml 的 vision_id 必须指向 Vision。');
  const currentQuest = byId.get(state.current_quest_id);
  if (!currentQuest || currentQuest.data.kind !== 'quest' || currentQuest.data.status !== 'active') {
    errors.push('state.yml 的 current_quest_id 必须指向 Active Quest。');
  } else if (currentQuest.data.route_id !== state.main_route_id) {
    errors.push('Current Quest 必须属于 Main Route。');
  }
}

function parseFrontMatter(source, label) {
  const normalized = String(source).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) throw new Error(`${label} 缺少开头 Front Matter。`);
  const end = normalized.indexOf('\n---\n', 4);
  if (end < 0) throw new Error(`${label} 缺少结尾 Front Matter。`);
  return { data: parseFlatYaml(normalized.slice(4, end), label), body: normalized.slice(end + 5) };
}

function parseFlatYaml(source, label) {
  const data = {};
  let listKey = null;
  for (const line of String(source).replace(/\r\n/g, '\n').split('\n')) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const listMatch = line.match(/^\s+-\s+(.+)$/);
    if (listMatch) {
      if (!listKey || !Array.isArray(data[listKey])) throw new Error(`${label} 包含没有字段的列表项。`);
      data[listKey].push(parseScalar(listMatch[1]));
      continue;
    }
    const fieldMatch = line.match(/^([a-z][a-z0-9_-]*):(?:\s*(.*))?$/i);
    if (!fieldMatch) throw new Error(`${label} 包含不支持的 YAML：${line.trim()}`);
    const [, key, raw = ''] = fieldMatch;
    if (Object.prototype.hasOwnProperty.call(data, key)) throw new Error(`${label} 包含重复字段：${key}`);
    if (!raw.trim()) {
      data[key] = [];
      listKey = key;
    } else {
      data[key] = parseScalar(raw);
      listKey = null;
    }
  }
  return data;
}

function parseScalar(raw) {
  const value = String(raw).trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (value === '[]') return [];
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    try { return value.startsWith('"') ? JSON.parse(value) : value.slice(1, -1).replace(/''/g, "'"); }
    catch { return value.slice(1, -1); }
  }
  return value.replace(/\s+#.*$/, '').trim();
}

function walkMarkdownFiles(folder) {
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(folder, entry.name);
    return entry.isDirectory() ? walkMarkdownFiles(target) : /\.md$/i.test(entry.name) ? [target] : [];
  });
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function relativePath(root, target) {
  return path.relative(root, target).split(path.sep).join('/');
}

async function main() {
  try {
    const report = validateTechOs();
    const summary = Object.entries(report.counts).filter(([, count]) => count > 0).map(([kind, count]) => `${kind}=${count}`).join('，');
    console.log(`Tech OS 校验通过：${report.entities.length} 个对象（${summary}）。`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const isEntryPoint = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isEntryPoint) await main();
