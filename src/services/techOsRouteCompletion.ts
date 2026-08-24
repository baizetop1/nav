import type { TechOsEntity, TechOsIndex } from '../types/tech-os';
import type { RouteCompletionReviewModel, RouteReviewDraft, RouteReviewDraftValues } from '../types/tech-os-route-engine';

export function buildRouteCompletionReview(index: TechOsIndex): RouteCompletionReviewModel {
  const byId = new Map(index.entities.map(entity => [entity.id, entity]));
  const route = byId.get(index.state.mainRouteId);
  if (!route || route.kind !== 'route') throw new Error('Main Route is missing.');
  const questIds = fieldIds(route, 'quest_ids');
  const quests = questIds.map(id => byId.get(id)).filter((entity): entity is TechOsEntity => entity?.kind === 'quest');
  const completedQuestIds = quests.filter(quest => quest.status === 'completed').map(quest => quest.id);
  const unfinishedQuestIds = quests.filter(quest => quest.status !== 'completed' && quest.status !== 'skipped').map(quest => quest.id);
  const progress = quests.length ? Math.round(completedQuestIds.length / quests.length * 100) : 0;
  const questSet = new Set(questIds);
  const related = (kind: TechOsEntity['kind']) => index.entities.filter(entity => entity.kind === kind && fieldIds(entity, 'quest_ids').some(id => questSet.has(id)));
  const knowledgeIds = related('knowledge').map(entity => entity.id);
  const labIds = related('lab').filter(entity => entity.status === 'completed').map(entity => entity.id);
  const projectIds = index.entities.filter(entity => entity.kind === 'project'
    && (fieldIds(entity, 'route_ids').includes(route.id) || fieldIds(entity, 'quest_ids').some(id => questSet.has(id)))
    && entity.status === 'completed').map(entity => entity.id);
  const questQuestionIds = new Set(quests.flatMap(quest => fieldIds(quest, 'question_ids')));
  const questionIds = index.entities.filter(entity => entity.kind === 'question' && ['open', 'deferred'].includes(entity.status)
    && (questQuestionIds.has(entity.id) || questSet.has(fieldString(entity, 'origin_id')))).map(entity => entity.id);
  const questionSet = new Set(questionIds);
  const routeSeedIds = index.entities.filter(entity => entity.kind === 'route-seed'
    && (questionSet.has(fieldString(entity, 'origin_id')) || fieldIds(entity, 'related_question_ids').some(id => questionSet.has(id)))).map(entity => entity.id);
  const eligible = route.status === 'completed' || progress >= 80;
  const reviewNumber = nextNumber(index.entities, 'route-review', /^REVIEW-(\d+)$/);
  return {
    reviewId: `REVIEW-${String(reviewNumber).padStart(3, '0')}`,
    filePath: `tech-os/reviews/REVIEW-${String(reviewNumber).padStart(3, '0')}.md`,
    routeId: route.id,
    routeTitle: route.title,
    progress,
    eligible,
    eligibilityReason: eligible
      ? `${route.id} 已完成或 Quest 进度达到 ${progress}%，可以准备 Review 草稿；草稿本身不声明 Route completed。`
      : `${route.id} 当前 Quest 进度为 ${progress}%；达到 80% 或明确完成后才开放 Review 草稿。`,
    completedQuestIds,
    unfinishedQuestIds,
    knowledgeIds,
    labIds,
    projectIds,
    questionIds,
    routeSeedIds,
    tags: [...route.tags],
    suggestedLearnedSummary: `当前路线关联 ${knowledgeIds.length} 个 Knowledge；已记录 ${completedQuestIds.length} 个 completed Quest、${labIds.length} 个 completed Lab 和 ${projectIds.length} 个 completed Project。请由用户补充实际学到的内容。`,
  };
}

export function getDefaultRouteReviewValues(model: RouteCompletionReviewModel): RouteReviewDraftValues {
  return {
    learnedSummary: model.suggestedLearnedSummary,
    continueQuestionIds: [...model.questionIds],
    routeSeedIds: [...model.routeSeedIds],
    notInterested: '暂无；由用户补充。',
  };
}

export function createRouteReviewDraft(model: RouteCompletionReviewModel, values: RouteReviewDraftValues, created: string): RouteReviewDraft {
  if (!model.eligible) throw new Error('Route Review is locked until the route is completed or reaches 80%.');
  const learned = values.learnedSummary.trim();
  if (!learned) throw new Error('Route Review learned summary is required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(created)) throw new Error('Route Review date must use YYYY-MM-DD.');
  const questionIds = subset(values.continueQuestionIds, model.questionIds, 'question');
  const routeSeedIds = subset(values.routeSeedIds, model.routeSeedIds, 'route seed');
  const content = [
    '---', 'schema: tech-os/v1', 'kind: route-review', `id: ${model.reviewId}`,
    `title: ${JSON.stringify(`${model.routeId} Completion Review`)}`, 'status: draft', `route_id: ${model.routeId}`, `created: ${created}`,
    ...yamlList('knowledge_ids', model.knowledgeIds), ...yamlList('lab_ids', model.labIds), ...yamlList('project_ids', model.projectIds),
    ...yamlList('question_ids', questionIds), ...yamlList('route_seed_ids', routeSeedIds), ...yamlList('tags', model.tags), '---', '',
    '## 我学到了什么？', '', learned, '',
    '## 新增了哪些 Knowledge？', '', ...idLines(model.knowledgeIds), '',
    '## 做了哪些 Labs？', '', ...idLines(model.labIds), '',
    '## 完成了哪些 Projects？', '', ...idLines(model.projectIds), '',
    '## 还剩哪些 Open Questions？', '', ...idLines(questionIds), '',
    '## 哪些问题值得继续？', '', ...idLines(questionIds), '',
    '## 哪些方向暂时不感兴趣？', '', values.notInterested.trim() || '暂无；由用户补充。', '',
    '## Route Seeds', '', ...idLines(routeSeedIds), '',
    '## 未完成节点', '', ...idLines(model.unfinishedQuestIds), '',
    '## Review 边界', '', '这是 Review 草稿，不会修改 Route status、Main Route、Current Quest 或 Knowledge level。', '',
  ].join('\n');
  return { key: `route-review:${model.routeId}`, reviewId: model.reviewId, file: { path: model.filePath, content } };
}

function fieldIds(entity: TechOsEntity, field: string): string[] {
  const value = entity.fields[field];
  return Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : [];
}

function fieldString(entity: TechOsEntity, field: string): string {
  const value = entity.fields[field];
  return typeof value === 'string' ? value : '';
}

function nextNumber(entities: TechOsEntity[], kind: TechOsEntity['kind'], pattern: RegExp): number {
  return entities.filter(entity => entity.kind === kind).reduce((max, entity) => {
    const match = entity.id.match(pattern);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0) + 1;
}

function subset(values: string[], allowed: string[], label: string): string[] {
  const allowedSet = new Set(allowed);
  const result = [...new Set(values.filter(Boolean))];
  if (result.some(id => !allowedSet.has(id))) throw new Error(`Route Review contains an unrelated ${label} ID.`);
  return result;
}

function yamlList(field: string, values: string[]): string[] {
  return values.length ? [`${field}:`, ...values.map(value => `  - ${JSON.stringify(value)}`)] : [`${field}: []`];
}

function idLines(values: string[]): string[] {
  return values.length ? values.map(value => `- \`${value}\``) : ['- 暂无。'];
}
