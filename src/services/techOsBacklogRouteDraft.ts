import type { GeneratedRouteDraft, RouteDraftValues } from '../types/tech-os-route-engine';

interface BacklogRouteDraftInput {
  key: string;
  routeId: string;
  filePath: string;
  visionId: string;
  source: 'manual' | 'open_question' | 'knowledge_gap' | 'project_need' | 'inbox' | 'previous_route' | 'system_suggestion';
  originId: string;
  routeSeedIds: string[];
  tags: string[];
  existingKnowledgeIds: string[];
}

export function createBacklogRouteDraft(input: BacklogRouteDraftInput, values: RouteDraftValues, created: string): GeneratedRouteDraft {
  const title = singleLine(values.title);
  const reason = singleLine(values.reason);
  const outcome = values.expectedOutcome.trim();
  const outline = values.outline.map(singleLine).filter(Boolean);
  if (!title || !reason || !outcome) throw new Error('Route name, reason and expected outcome are required.');
  if (outline.length < 2) throw new Error('Route outline requires at least two steps.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(created)) throw new Error('Route created date must use YYYY-MM-DD.');
  const content = [
    '---', 'schema: tech-os/v1', 'kind: route', `id: ${input.routeId}`, `title: ${JSON.stringify(title)}`,
    `vision_id: ${input.visionId}`, 'status: backlog', 'main: false', `source: ${input.source}`, `origin_id: ${input.originId}`,
    `reason: ${JSON.stringify(reason)}`, `created: ${created}`, 'quest_ids: []', ...yamlList('route_seed_ids', input.routeSeedIds),
    ...yamlList('tags', input.tags), '---', '',
    '## 路线链', '', ...outline.map((step, indexValue) => `${indexValue + 1}. ${step}`), '',
    '## 路线目标', '', outcome, '',
    '## Existing Knowledge', '', ...idLines(input.existingKnowledgeIds), '',
    '## 完成条件', '', '- 能解释路线中的关键机制。', '- 至少完成一个可重复 Lab 或一个真实 Project。', '- 由用户确认完成证据。', '',
    '## 调整规则', '', '允许跳过、重排或分支；保存为 Backlog 不会设置 Main Route。', '',
  ].join('\n');
  return { key: input.key, routeId: input.routeId, file: { path: input.filePath, content } };
}

function yamlList(field: string, values: string[]): string[] {
  const unique = [...new Set(values.filter(Boolean))];
  return unique.length ? [`${field}:`, ...unique.map(value => `  - ${JSON.stringify(value)}`)] : [`${field}: []`];
}

function idLines(values: string[]): string[] {
  return values.length ? [...new Set(values)].map(value => `- \`${value}\``) : ['- 暂无已保存 Knowledge。'];
}

function singleLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
