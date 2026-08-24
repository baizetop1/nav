import type { InboxItem } from '../types/inbox.ts';
import type { TechOsEntity, TechOsIndex } from '../types/tech-os.ts';
import type {
  KnowledgeConnection, LearningAction, LearningEngineResult, LearningEntityReference,
  QuestSuggestion, RouteSeedSignal, RouteSeedSignalSource,
} from '../types/tech-os-learning.ts';
import { getTechOsCaptureKind, getVisibleInboxTags } from './techOsCapture.ts';

export function buildTechOsLearningEngine(index: TechOsIndex, inboxItems: InboxItem[]): LearningEngineResult {
  const entities = index.entities;
  const byId = new Map(entities.map(entity => [entity.id, entity]));
  const currentQuest = byId.get(index.state.currentQuestId);
  const mainRoute = byId.get(index.state.mainRouteId);
  const routeQuestIds = new Set(fieldIds(mainRoute, 'quest_ids'));
  const visibleInbox = inboxItems.filter(item => !item.deletedAt && item.status === 'inbox');
  const openQuestionEntities = entities.filter(entity => entity.kind === 'question' && ['open', 'deferred'].includes(entity.status));
  const actions = collectActions(index, visibleInbox, byId, currentQuest, routeQuestIds, openQuestionEntities);
  const eligibleActions = index.state.mode === 'keep-alive' ? actions.filter(action => action.effort === 'small') : actions;
  const sortedActions = [...eligibleActions].sort(compareActions);
  return {
    mode: index.state.mode,
    nextAction: sortedActions[0] || null,
    alternatives: sortedActions.slice(1, 5),
    openQuestions: openQuestionEntities.map(entityReference).sort((left, right) => left.id.localeCompare(right.id)),
    questSuggestions: collectQuestSuggestions(entities, routeQuestIds),
    knowledgeConnections: collectKnowledgeConnections(entities),
    routeSeedSignals: collectRouteSeedSignals(entities, visibleInbox, byId),
    existingRouteSeedCount: entities.filter(entity => entity.kind === 'route-seed').length,
  };
}

function collectActions(
  index: TechOsIndex,
  inboxItems: InboxItem[],
  byId: Map<string, TechOsEntity>,
  currentQuest: TechOsEntity | undefined,
  routeQuestIds: Set<string>,
  openQuestions: TechOsEntity[],
): LearningAction[] {
  const mode = index.state.mode;
  const actions: LearningAction[] = [];
  if (currentQuest) {
    const nextStep = extractSectionText(currentQuest.body, '下一步') || '打开当前 Quest，明确一个可以验证的下一步。';
    actions.push({
      id: `action:quest:${currentQuest.id}`,
      kind: 'continue-quest',
      title: `继续 ${currentQuest.id}：${currentQuest.title}`,
      detail: nextStep,
      reason: `${currentQuest.id} 是 state.yml 指向的 Active Quest；Explore 模式优先延续当前上下文。`,
      sourceIds: [currentQuest.id],
      targetEntityId: currentQuest.id,
      effort: 'focused',
      priority: mode === 'explore' ? 100 : mode === 'lab' ? 70 : 30,
    });
  }

  for (const lab of byKind(byId, 'lab').filter(entity => ['planned', 'running'].includes(entity.status))) {
    const linkedQuestIds = fieldIds(lab, 'quest_ids').filter(id => routeQuestIds.has(id));
    if (!linkedQuestIds.length) continue;
    actions.push({
      id: `action:lab:${lab.id}`,
      kind: 'run-lab',
      title: `${lab.status === 'running' ? '继续' : '运行'}实验：${lab.title}`,
      detail: extractSectionText(lab.body, '目标') || '打开实验记录并执行一个可验证步骤。',
      reason: `${lab.id} 状态为 ${lab.status}，并显式关联当前 Main Route 的 ${linkedQuestIds.join('、')}。`,
      sourceIds: [lab.id, ...linkedQuestIds],
      targetEntityId: lab.id,
      effort: 'focused',
      priority: mode === 'lab' ? 110 : mode === 'explore' ? 75 : 20,
    });
  }

  inboxItems.slice(0, 5).forEach((item, indexValue) => {
    const kind = getTechOsCaptureKind(item);
    actions.push({
      id: `action:inbox:${item.id}`,
      kind: 'process-inbox',
      title: `处理 ${kindLabel(kind)}：${inboxTitle(item)}`,
      detail: item.content || item.url || '打开 Inbox 决定保留、归档或转入 Tech OS。',
      reason: `这是仍未归档的 Phase C/D Capture；Keep Alive 模式优先清理一个真实输入。`,
      sourceIds: [item.id],
      targetView: 'inbox',
      effort: 'small',
      priority: (mode === 'keep-alive' ? 120 : mode === 'explore' ? 50 : 40) - indexValue,
    });
  });

  for (const question of openQuestions) {
    const origin = byId.get(fieldString(question, 'origin_id'));
    const belongsToRoute = origin?.kind === 'quest' && routeQuestIds.has(origin.id);
    actions.push({
      id: `action:question:${question.id}`,
      kind: 'answer-question',
      title: `推进问题：${question.title}`,
      detail: extractSectionText(question.body, '如何回答') || '补充一个可验证的回答步骤。',
      reason: `${question.id} 仍是 ${question.status} 状态${belongsToRoute ? '，并来自当前 Main Route' : ''}。`,
      sourceIds: [question.id, ...(origin ? [origin.id] : [])],
      targetEntityId: question.id,
      effort: 'small',
      priority: mode === 'keep-alive' ? 100 : belongsToRoute ? 65 : 45,
    });
  }

  for (const knowledge of byKind(byId, 'knowledge').filter(entity => entity.status === 'learning' && ['L0', 'L1'].includes(fieldString(entity, 'level')))) {
    const relatedQuestIds = fieldIds(knowledge, 'quest_ids').filter(id => routeQuestIds.has(id));
    if (!relatedQuestIds.length) continue;
    actions.push({
      id: `action:knowledge:${knowledge.id}`,
      kind: 'review-knowledge',
      title: `补充理解：${knowledge.title}`,
      detail: firstBullet(extractSection(knowledge.body, '还有什么不知道？')) || '补充一个仍不理解的点，不自动提升等级。',
      reason: `${knowledge.id} 仍为 ${fieldString(knowledge, 'level')}，且显式关联当前路线 Quest。`,
      sourceIds: [knowledge.id, ...relatedQuestIds],
      targetEntityId: knowledge.id,
      effort: 'small',
      priority: mode === 'keep-alive' ? 90 : mode === 'explore' ? 55 : 35,
    });
  }

  for (const seed of byKind(byId, 'route-seed').filter(entity => ['seed', 'candidate'].includes(entity.status))) {
    actions.push({
      id: `action:seed:${seed.id}`,
      kind: 'review-route-seed',
      title: `整理 Route Seed：${seed.title}`,
      detail: fieldString(seed, 'reason') || '确认这条可能性是否仍值得保留。',
      reason: `${seed.id} 已被保存但尚未由用户选择为 Main Route。`,
      sourceIds: [seed.id],
      targetEntityId: seed.id,
      targetView: 'backlog',
      effort: 'small',
      priority: mode === 'keep-alive' ? 80 : 30,
    });
  }
  return actions;
}

function collectQuestSuggestions(entities: TechOsEntity[], routeQuestIds: Set<string>): QuestSuggestion[] {
  return entities
    .filter(entity => entity.kind === 'quest' && entity.status === 'backlog' && routeQuestIds.has(entity.id))
    .map(entity => ({ ...entityReference(entity), kind: 'quest' as const, order: fieldNumber(entity, 'order'), reason: '来自 Main Route 的显式 quest_ids，并按 order 排序；这里只建议查看，不改变 Current Quest。' }))
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

function collectKnowledgeConnections(entities: TechOsEntity[]): KnowledgeConnection[] {
  const byId = new Set(entities.map(entity => entity.id));
  return entities.filter(entity => entity.kind === 'knowledge').map(entity => {
    const relatedIds = ['quest_ids', 'question_ids', 'lab_ids', 'project_ids', 'related_knowledge_ids']
      .flatMap(field => fieldIds(entity, field)).filter(id => byId.has(id));
    return { knowledgeId: entity.id, title: entity.title, relatedIds: [...new Set(relatedIds)], reason: '连接只来自 Markdown 中已经存在的显式 ID，不根据相似标题臆测关系。' };
  }).filter(connection => connection.relatedIds.length > 0).sort((left, right) => left.knowledgeId.localeCompare(right.knowledgeId));
}

function collectRouteSeedSignals(entities: TechOsEntity[], inboxItems: InboxItem[], byId: Map<string, TechOsEntity>): RouteSeedSignal[] {
  const signals: RouteSeedSignal[] = [];
  const seededQuestionIds = new Set(entities.filter(entity => entity.kind === 'route-seed').flatMap(entity => [fieldString(entity, 'origin_id'), ...fieldIds(entity, 'related_question_ids')]).filter(Boolean));
  const questions = entities.filter(entity => entity.kind === 'question' && ['open', 'deferred'].includes(entity.status));
  for (const question of questions) {
    const existingSeedId = fieldString(question, 'route_seed_id');
    if (existingSeedId || seededQuestionIds.has(question.id)) continue;
    signals.push(seedSignal('open-question', question.title, `${question.id} 仍未回答且没有关联 Route Seed。`, [question.id], question.tags));
  }

  for (const item of inboxItems) {
    const kind = getTechOsCaptureKind(item);
    if (kind !== 'question' && kind !== 'idea') continue;
    const sourceType: RouteSeedSignalSource = kind === 'question' ? 'inbox-question' : 'inbox-idea';
    signals.push(seedSignal(sourceType, inboxTitle(item), `未归档的 ${kindLabel(kind)} 可能值得在处理时保存为 Route Seed；必须由用户确认。`, [item.id], getVisibleInboxTags(item.tags)));
  }

  for (const knowledge of entities.filter(entity => entity.kind === 'knowledge' && entity.status === 'learning')) {
    bulletItems(extractSection(knowledge.body, '还有什么不知道？')).forEach((title, indexValue) => {
      signals.push(seedSignal('knowledge-gap', title, `${knowledge.id} 的“还有什么不知道？”显式记录了这项缺口。`, [knowledge.id], knowledge.tags, indexValue));
    });
  }

  collectBodyQuestionSignals(signals, entities.filter(entity => entity.kind === 'lab'), 'lab-question', '新问题');
  collectBodyQuestionSignals(signals, entities.filter(entity => entity.kind === 'project'), 'project-question', '新问题');
  collectBodyQuestionSignals(signals, entities.filter(entity => entity.kind === 'quest' && entity.status === 'completed'), 'completed-quest', 'Open Questions');
  return dedupeSignals(signals, byId);
}

function collectBodyQuestionSignals(signals: RouteSeedSignal[], entities: TechOsEntity[], sourceType: RouteSeedSignalSource, heading: string): void {
  for (const entity of entities) {
    bulletItems(extractSection(entity.body, heading)).forEach((title, indexValue) => {
      signals.push(seedSignal(sourceType, title, `${entity.id} 的“${heading}”章节显式记录了这个问题。`, [entity.id], entity.tags, indexValue));
    });
  }
}

function dedupeSignals(signals: RouteSeedSignal[], byId: Map<string, TechOsEntity>): RouteSeedSignal[] {
  const deduped = new Map<string, RouteSeedSignal>();
  for (const signal of signals) {
    if (signal.sourceIds.some(id => byId.get(id)?.kind === 'route-seed')) continue;
    const key = normalizeSignalTitle(signal.title);
    const existing = deduped.get(key);
    if (!existing) deduped.set(key, signal);
    else deduped.set(key, { ...existing, sourceIds: [...new Set([...existing.sourceIds, ...signal.sourceIds])], tags: [...new Set([...existing.tags, ...signal.tags])] });
  }
  return [...deduped.values()].sort((left, right) => sourceRank(left.sourceType) - sourceRank(right.sourceType) || left.title.localeCompare(right.title, 'zh-CN'));
}

function seedSignal(sourceType: RouteSeedSignalSource, title: string, reason: string, sourceIds: string[], tags: string[], indexValue = 0): RouteSeedSignal {
  return { id: `signal:${sourceType}:${sourceIds[0]}:${indexValue}`, sourceType, title: cleanLine(title), reason, sourceIds, tags: [...new Set(tags)] };
}

function byKind(byId: Map<string, TechOsEntity>, kind: TechOsEntity['kind']): TechOsEntity[] {
  return [...byId.values()].filter(entity => entity.kind === kind);
}

function entityReference(entity: TechOsEntity): LearningEntityReference {
  return { id: entity.id, kind: entity.kind, title: entity.title, status: entity.status };
}

function fieldString(entity: TechOsEntity | undefined, field: string): string {
  const value = entity?.fields[field];
  return typeof value === 'string' ? value : '';
}

function fieldNumber(entity: TechOsEntity, field: string): number {
  const value = entity.fields[field];
  return typeof value === 'number' ? value : Number.MAX_SAFE_INTEGER;
}

function fieldIds(entity: TechOsEntity | undefined, field: string): string[] {
  const value = entity?.fields[field];
  return Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : [];
}

function extractSection(body: string, heading: string): string {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex(line => line.trim() === `## ${heading}`);
  if (start < 0) return '';
  const content: string[] = [];
  for (let indexValue = start + 1; indexValue < lines.length; indexValue += 1) {
    if (/^##\s+/.test(lines[indexValue].trim())) break;
    content.push(lines[indexValue]);
  }
  return content.join('\n').trim();
}

function extractSectionText(body: string, heading: string): string {
  return extractSection(body, heading).split('\n').map(line => cleanLine(line)).filter(Boolean).join(' ').slice(0, 260);
}

function bulletItems(section: string): string[] {
  return section.split('\n').map(line => line.match(/^\s*[-*]\s+(.+)$/)?.[1]).filter((value): value is string => Boolean(value)).map(cleanLine).filter(value => value && !/^(暂无|待补充|执行后)/.test(value));
}

function firstBullet(section: string): string {
  return bulletItems(section)[0] || '';
}

function inboxTitle(item: InboxItem): string {
  if (item.title?.trim()) return item.title.trim().slice(0, 120);
  if (item.type === 'link' && item.url) return new URL(item.url).hostname;
  return item.content?.split(/\r?\n/).map(line => line.trim()).find(Boolean)?.slice(0, 120) || '无标题 Capture';
}

function kindLabel(kind: ReturnType<typeof getTechOsCaptureKind>): string {
  return kind[0].toUpperCase() + kind.slice(1);
}

function cleanLine(value: string): string {
  return value.replace(/`/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeSignalTitle(value: string): string {
  return cleanLine(value).toLocaleLowerCase('zh-CN').replace(/[\s，。！？?：:；;、“”"'（）()\[\]]/g, '');
}

function sourceRank(value: RouteSeedSignalSource): number {
  return ['open-question', 'inbox-question', 'knowledge-gap', 'inbox-idea', 'lab-question', 'project-question', 'completed-quest'].indexOf(value);
}

function compareActions(left: LearningAction, right: LearningAction): number {
  return right.priority - left.priority || left.id.localeCompare(right.id);
}
