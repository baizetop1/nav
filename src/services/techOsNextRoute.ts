import type { TechOsEntity, TechOsIndex } from '../types/tech-os';
import type { RouteCandidateGroup } from '../types/tech-os-candidate';
import type { GeneratedRouteDraft, NextRouteRecommendation, RouteCompletionReviewModel, RouteDraftValues } from '../types/tech-os-route-engine';
import { createBacklogRouteDraft } from './techOsBacklogRouteDraft.ts';

export function buildNextRouteRecommendations(
  index: TechOsIndex,
  groups: RouteCandidateGroup[],
  review: RouteCompletionReviewModel,
): NextRouteRecommendation[] {
  if (!review.eligible) return [];
  const byId = new Map(index.entities.map(entity => [entity.id, entity]));
  const coveredSeedIds = new Set(groups.flatMap(group => group.inputs.flatMap(input => input.sourceIds)).filter(id => byId.get(id)?.kind === 'route-seed'));
  const raw: Omit<NextRouteRecommendation, 'routeId' | 'filePath'>[] = groups.map(group => ({
    id: `next:${group.id}`,
    title: group.suggestedTitle,
    why: `${group.defaultReason} Route Review 已进入可准备阶段。`,
    sourceLabel: `${group.inputs.length} related Seed/Signal`,
    originId: group.originId,
    sourceIds: [...group.sourceEntityIds],
    relatedQuestionIds: [...group.relatedQuestionIds],
    knowledgeIds: [...group.knowledgeIds],
    routeSeedIds: group.sourceEntityIds.filter(id => byId.get(id)?.kind === 'route-seed'),
    tags: [...group.sharedTags],
    expectedOutcome: group.defaultOutcome,
    outline: [...group.defaultOutline],
    score: group.inputs.length * 10 + group.relatedQuestionIds.length * 5 + group.knowledgeIds.length * 3,
  }));
  for (const seed of index.entities.filter(entity => entity.kind === 'route-seed' && ['seed', 'candidate'].includes(entity.status) && !coveredSeedIds.has(entity.id))) {
    const relatedQuestionIds = fieldIds(seed, 'related_question_ids');
    const knowledgeIds = index.entities.filter(entity => entity.kind === 'knowledge' && sharesTag(entity, seed)).map(entity => entity.id);
    raw.push({
      id: `next:seed:${seed.id}`,
      title: `${seed.title.replace(/[?？]$/, '')}路线`,
      why: `${fieldString(seed, 'reason') || '这是已保存的 Route Seed。'} Route Review 就绪后可由用户评估是否继续。`,
      sourceLabel: `${seed.id} · saved ${seed.status}`,
      originId: seed.id,
      sourceIds: [seed.id, ...relatedQuestionIds],
      relatedQuestionIds,
      knowledgeIds,
      routeSeedIds: [seed.id],
      tags: [...seed.tags],
      expectedOutcome: `围绕“${seed.title.replace(/[?？]$/, '')}”建立可解释、可实验并可形成 Project 的阶段性能力。`,
      outline: extractOutline(seed.body),
      score: 12 + relatedQuestionIds.length * 5 + knowledgeIds.length * 3 + (seed.status === 'candidate' ? 8 : 0),
    });
  }
  const nextRouteNumber = nextNumber(index.entities, 'route', /^ROUTE-(\d+)$/);
  return raw.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id)).slice(0, 4).map((recommendation, indexValue) => {
    const routeId = `ROUTE-${String(nextRouteNumber + indexValue).padStart(3, '0')}`;
    return { ...recommendation, routeId, filePath: `tech-os/routes/backlog/${routeId}.md` };
  });
}

export function getDefaultRecommendedRouteValues(recommendation: NextRouteRecommendation): RouteDraftValues {
  return { title: recommendation.title, reason: recommendation.why, expectedOutcome: recommendation.expectedOutcome, outline: [...recommendation.outline] };
}

export function createRecommendedRouteDraft(index: TechOsIndex, recommendation: NextRouteRecommendation, values: RouteDraftValues, created: string): GeneratedRouteDraft {
  return createBacklogRouteDraft({
    key: `next-route:${recommendation.id}`,
    routeId: recommendation.routeId,
    filePath: recommendation.filePath,
    visionId: index.state.visionId,
    source: 'system_suggestion',
    originId: recommendation.originId,
    routeSeedIds: recommendation.routeSeedIds,
    tags: recommendation.tags,
    existingKnowledgeIds: recommendation.knowledgeIds,
  }, values, created);
}

function fieldIds(entity: TechOsEntity, field: string): string[] {
  const value = entity.fields[field];
  return Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : [];
}

function fieldString(entity: TechOsEntity, field: string): string {
  const value = entity.fields[field];
  return typeof value === 'string' ? value : '';
}

function sharesTag(left: TechOsEntity, right: TechOsEntity): boolean {
  const rightTags = new Set(right.tags);
  return left.tags.some(tag => rightTags.has(tag));
}

function extractOutline(body: string): string[] {
  const marker = '## 可能的路线';
  const start = body.indexOf(marker);
  const section = start < 0 ? '' : body.slice(start + marker.length).split(/\n##\s+/)[0];
  const lines = section.split('\n').map(line => line.replace(/^\s*[-*\d.]+\s*/, '').replace(/`/g, '').trim())
    .filter(line => line && !/^```/.test(line) && !/^[↓→]+$/.test(line));
  return [...new Set(lines)].slice(0, 8).length >= 2 ? [...new Set(lines)].slice(0, 8) : ['明确核心问题与已有理解', '完成一个最小实验', '形成可复用 Knowledge 与 Project'];
}

function nextNumber(entities: TechOsEntity[], kind: TechOsEntity['kind'], pattern: RegExp): number {
  return entities.filter(entity => entity.kind === kind).reduce((max, entity) => {
    const match = entity.id.match(pattern);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0) + 1;
}
