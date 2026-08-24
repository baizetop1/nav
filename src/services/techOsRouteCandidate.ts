import type { TechOsEntity, TechOsIndex } from '../types/tech-os';
import type {
  RouteCandidateDraft, RouteCandidateDraftValues, RouteCandidateGroup, RouteCandidateInput, RouteCandidateSource,
} from '../types/tech-os-candidate';
import type { RouteSeedSignal, RouteSeedSignalSource } from '../types/tech-os-learning';

const BROAD_TAGS = new Set(['internet', 'programming', 'system', 'architecture', 'electronics', 'ic', 'ai']);
const SOURCE_PRIORITY: RouteCandidateSource[] = ['project_need', 'knowledge_gap', 'open_question', 'inbox', 'previous_route', 'system_suggestion'];
const TOPIC_LABELS: Record<string, string> = {
  dns: 'DNS', cache: '缓存机制', cpu: 'CPU Architecture', 'digital-logic': '数字逻辑', transistor: '晶体管',
  linux: 'Linux 系统', server: 'Server Engineering', networking: 'Networking', security: 'Web Security', tls: 'TLS 与 PKI',
};

export function buildRouteCandidateGroups(index: TechOsIndex, signals: RouteSeedSignal[]): RouteCandidateGroup[] {
  const byId = new Map(index.entities.map(entity => [entity.id, entity]));
  const inputs = collectInputs(index.entities, signals);
  const components = connectedComponents(inputs);
  const nextNumber = nextRouteSeedNumber(index.entities);
  return components
    .filter(component => component.length >= 2)
    .map(component => buildGroup(component, byId))
    .filter((group): group is Omit<RouteCandidateGroup, 'candidateId' | 'filePath'> => Boolean(group))
    .sort((left, right) => right.inputs.length - left.inputs.length || left.id.localeCompare(right.id))
    .map((group, indexValue) => {
      const candidateId = `RS-${String(nextNumber + indexValue).padStart(3, '0')}`;
      return { ...group, candidateId, filePath: `tech-os/routes/candidates/${candidateId}.md` };
    });
}

export function getDefaultRouteCandidateValues(group: RouteCandidateGroup): RouteCandidateDraftValues {
  return {
    title: group.suggestedTitle,
    reason: group.defaultReason,
    expectedOutcome: group.defaultOutcome,
    outline: [...group.defaultOutline],
  };
}

export function createRouteCandidateDraft(group: RouteCandidateGroup, values: RouteCandidateDraftValues, created: string): RouteCandidateDraft {
  const title = singleLine(values.title);
  const reason = singleLine(values.reason);
  const expectedOutcome = values.expectedOutcome.trim();
  const outline = values.outline.map(singleLine).filter(Boolean);
  if (!title) throw new Error('Candidate title is required.');
  if (!reason) throw new Error('Candidate reason is required.');
  if (!expectedOutcome) throw new Error('Expected outcome is required.');
  if (outline.length < 2) throw new Error('Candidate outline requires at least two steps.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(created)) throw new Error('Candidate created date must use YYYY-MM-DD.');

  const content = [
    '---',
    'schema: tech-os/v1',
    'kind: route-seed',
    `id: ${group.candidateId}`,
    `title: ${yamlString(title)}`,
    'status: candidate',
    `source: ${group.source}`,
    `origin_id: ${group.originId}`,
    `reason: ${yamlString(reason)}`,
    `created: ${created}`,
    ...yamlList('related_question_ids', group.relatedQuestionIds),
    ...yamlList('tags', group.sharedTags),
    '---',
    '',
    '## 聚合依据',
    '',
    ...group.inputs.map(input => `- ${input.title}（${input.sourceIds.map(id => `\`${id}\``).join('、')}）`),
    '',
    '## 候选路线',
    '',
    ...outline.map((step, indexValue) => `${indexValue + 1}. ${step}`),
    '',
    '## Existing Knowledge',
    '',
    ...(group.knowledgeIds.length ? group.knowledgeIds.map(id => `- \`${id}\``) : ['- 暂无已保存 Knowledge。']),
    '',
    '## Expected Outcome',
    '',
    expectedOutcome,
    '',
    '## 当前决定',
    '',
    '只保存为 Route Candidate；不切换 Main Route，等待用户后续处理。',
    '',
  ].join('\n');

  return {
    groupId: group.id,
    candidateId: group.candidateId,
    file: { path: group.filePath, content },
    sourceInputIds: group.inputs.map(input => input.id),
  };
}

function collectInputs(entities: TechOsEntity[], signals: RouteSeedSignal[]): RouteCandidateInput[] {
  const signalInputs: RouteCandidateInput[] = signals.map(signal => ({
    id: signal.id,
    kind: 'signal',
    title: signal.title,
    sourceType: signal.sourceType,
    sourceIds: [...signal.sourceIds],
    tags: normalizeTags(signal.tags),
  }));
  const seedInputs: RouteCandidateInput[] = entities
    .filter(entity => entity.kind === 'route-seed' && entity.status === 'seed')
    .map(entity => ({
      id: `saved-seed:${entity.id}`,
      kind: 'saved-seed',
      title: entity.title,
      sourceType: 'saved-seed',
      sourceIds: [entity.id, fieldString(entity, 'origin_id'), ...fieldIds(entity, 'related_question_ids')].filter(Boolean),
      tags: normalizeTags(entity.tags),
    }));
  return [...signalInputs, ...seedInputs].sort((left, right) => left.id.localeCompare(right.id));
}

function connectedComponents(inputs: RouteCandidateInput[]): RouteCandidateInput[][] {
  const visited = new Set<string>();
  const result: RouteCandidateInput[][] = [];
  for (const input of inputs) {
    if (visited.has(input.id)) continue;
    const component: RouteCandidateInput[] = [];
    const queue = [input];
    visited.add(input.id);
    while (queue.length) {
      const current = queue.shift() as RouteCandidateInput;
      component.push(current);
      for (const candidate of inputs) {
        if (visited.has(candidate.id) || !shareSpecificTag(current, candidate)) continue;
        visited.add(candidate.id);
        queue.push(candidate);
      }
    }
    result.push(component.sort((left, right) => left.id.localeCompare(right.id)));
  }
  return result;
}

function buildGroup(inputs: RouteCandidateInput[], byId: Map<string, TechOsEntity>): Omit<RouteCandidateGroup, 'candidateId' | 'filePath'> | null {
  const tagCounts = new Map<string, { count: number; first: number }>();
  inputs.forEach((input, inputIndex) => input.tags.filter(tag => !BROAD_TAGS.has(tag)).forEach(tag => {
    const current = tagCounts.get(tag);
    tagCounts.set(tag, { count: (current?.count || 0) + 1, first: current?.first ?? inputIndex });
  }));
  const sharedTags = [...tagCounts.entries()].filter(([, value]) => value.count >= 2)
    .sort((left, right) => right[1].count - left[1].count || left[1].first - right[1].first || left[0].localeCompare(right[0]))
    .map(([tag]) => tag);
  if (!sharedTags.length) return null;

  const sourceEntityIds = [...new Set(inputs.flatMap(input => input.sourceIds).filter(id => byId.has(id)))];
  const relatedQuestionIds = sourceEntityIds.filter(id => byId.get(id)?.kind === 'question');
  const knowledgeIds = sourceEntityIds.filter(id => byId.get(id)?.kind === 'knowledge');
  const originId = relatedQuestionIds[0] || sourceEntityIds[0];
  if (!originId) return null;
  const source = dominantSource(inputs);
  const topic = TOPIC_LABELS[sharedTags[0]] || humanizeTag(sharedTags[0]);
  const inputKinds = new Set(inputs.map(input => input.kind));
  const kindDetail = inputKinds.size > 1 ? '已保存 Seed 与未保存 Signal' : inputKinds.has('saved-seed') ? '已保存 Seed' : '显式 Signal';
  return {
    id: `candidate-group:${sharedTags[0]}:${inputs.map(input => input.id).join('|')}`,
    suggestedTitle: `${topic} 深入路线`,
    source,
    originId,
    relatedQuestionIds,
    knowledgeIds,
    sourceEntityIds,
    sharedTags,
    inputs,
    defaultReason: `${inputs.length} 个${kindDetail} 通过共同标签 #${sharedTags[0]} 聚合；候选只整理已有证据，不代表系统已经选择这条路线。`,
    defaultOutcome: `能够解释并通过实验验证 ${topic} 中的关键机制，留下可复用的 Knowledge 与 Lab 证据。`,
    defaultOutline: [...new Set(inputs.map(input => singleLine(input.title)).filter(Boolean))].slice(0, 6),
  };
}

function dominantSource(inputs: RouteCandidateInput[]): RouteCandidateSource {
  const counts = new Map<RouteCandidateSource, number>();
  inputs.forEach(input => {
    const source = candidateSource(input.sourceType);
    counts.set(source, (counts.get(source) || 0) + 1);
  });
  return SOURCE_PRIORITY.map((source, order) => ({ source, order, count: counts.get(source) || 0 }))
    .sort((left, right) => right.count - left.count || left.order - right.order)[0].source;
}

function candidateSource(sourceType: RouteCandidateInput['sourceType']): RouteCandidateSource {
  const mapping: Record<RouteSeedSignalSource | 'saved-seed', RouteCandidateSource> = {
    'open-question': 'open_question', 'inbox-question': 'inbox', 'inbox-idea': 'inbox', 'knowledge-gap': 'knowledge_gap',
    'lab-question': 'system_suggestion', 'project-question': 'project_need', 'completed-quest': 'previous_route', 'saved-seed': 'previous_route',
  };
  return mapping[sourceType];
}

function shareSpecificTag(left: RouteCandidateInput, right: RouteCandidateInput): boolean {
  const rightTags = new Set(right.tags.filter(tag => !BROAD_TAGS.has(tag)));
  return left.tags.some(tag => !BROAD_TAGS.has(tag) && rightTags.has(tag));
}

function nextRouteSeedNumber(entities: TechOsEntity[]): number {
  const max = entities.filter(entity => entity.kind === 'route-seed').reduce((current, entity) => {
    const match = entity.id.match(/^RS-(\d+)$/);
    return Math.max(current, match ? Number(match[1]) : 0);
  }, 0);
  return max + 1;
}

function fieldString(entity: TechOsEntity, field: string): string {
  const value = entity.fields[field];
  return typeof value === 'string' ? value : '';
}

function fieldIds(entity: TechOsEntity, field: string): string[] {
  const value = entity.fields[field];
  return Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : [];
}

function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map(tag => tag.trim().toLocaleLowerCase('en-US')).filter(Boolean))];
}

function humanizeTag(tag: string): string {
  return tag.split(/[-_]/).filter(Boolean).map(part => part.length <= 4 ? part.toUpperCase() : `${part[0].toUpperCase()}${part.slice(1)}`).join(' ');
}

function singleLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function yamlList(field: string, values: string[]): string[] {
  return values.length ? [`${field}:`, ...values.map(value => `  - ${yamlString(value)}`)] : [`${field}: []`];
}
