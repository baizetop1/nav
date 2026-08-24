import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInboxItem } from '../src/services/inbox.ts';
import { applyTechOsCaptureKind } from '../src/services/techOsCapture.ts';
import { buildTechOsLearningEngine } from '../src/services/techOsLearningEngine.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = JSON.parse(fs.readFileSync(path.join(root, 'src/generated/tech-os-index.json'), 'utf8'));
const now = new Date('2026-08-24T08:00:00.000Z');
const inbox = [
  createInboxItem(applyTechOsCaptureKind({ type: 'text', title: '路由器为什么需要 BGP？', content: '来自网络学习时的新问题。', tags: ['network'] }, 'question'), { id: 'inbox-question', now }),
  createInboxItem(applyTechOsCaptureKind({ type: 'text', title: '做一个协议可视化工具', content: '先保存想法，不自动创建项目。', tags: ['tool'] }, 'idea'), { id: 'inbox-idea', now }),
  createInboxItem(applyTechOsCaptureKind({ type: 'text', content: '普通阅读笔记', tags: [] }, 'note'), { id: 'inbox-note', now }),
  createInboxItem(applyTechOsCaptureKind({ type: 'link', url: 'https://example.com/', tags: [] }, 'link'), { id: 'inbox-link', now }),
];

const originalIndex = structuredClone(index);
const originalInbox = structuredClone(inbox);
const explore = buildTechOsLearningEngine(index, inbox);

assert.equal(explore.mode, 'explore');
assert.equal(explore.nextAction?.kind, 'continue-quest');
assert.equal(explore.nextAction?.targetEntityId, 'QUEST-001');
assert.match(explore.nextAction?.detail || '', /浏览器开发者工具/);
assert.match(explore.nextAction?.reason || '', /Active Quest/);
assert.ok(explore.alternatives.some(action => action.kind === 'run-lab'));
assert.ok(explore.alternatives.some(action => action.kind === 'answer-question'));
assert.equal(explore.openQuestions.length, 2);
assert.deepEqual(explore.openQuestions.map(question => question.id), ['QUESTION-001', 'QUESTION-002']);
assert.equal(explore.questSuggestions.length, 7);
assert.deepEqual(explore.questSuggestions.map(quest => quest.id), ['QUEST-002', 'QUEST-003', 'QUEST-004', 'QUEST-005', 'QUEST-006', 'QUEST-007', 'QUEST-008']);
assert.equal(explore.knowledgeConnections.length, 1);
assert.deepEqual(explore.knowledgeConnections[0].relatedIds, ['QUEST-003', 'QUESTION-001', 'LAB-001']);
assert.equal(explore.existingRouteSeedCount, 1);

assert.ok(explore.routeSeedSignals.some(signal => signal.sourceIds.includes('QUESTION-001')));
assert.ok(!explore.routeSeedSignals.some(signal => signal.sourceIds.includes('QUESTION-002')), '已有 RS-001 的 Question 不应重复收集');
assert.equal(explore.routeSeedSignals.filter(signal => signal.sourceType === 'knowledge-gap').length, 3);
assert.ok(explore.routeSeedSignals.some(signal => signal.sourceIds.includes('inbox-question')));
assert.ok(explore.routeSeedSignals.some(signal => signal.sourceIds.includes('inbox-idea')));
assert.ok(!explore.routeSeedSignals.some(signal => signal.sourceIds.includes('inbox-note')));
assert.ok(!explore.routeSeedSignals.some(signal => signal.sourceIds.includes('inbox-link')));

const labMode = buildTechOsLearningEngine({ ...index, state: { ...index.state, mode: 'lab' } }, inbox);
assert.equal(labMode.nextAction?.kind, 'run-lab');
assert.equal(labMode.nextAction?.targetEntityId, 'LAB-001');

const keepAlive = buildTechOsLearningEngine({ ...index, state: { ...index.state, mode: 'keep-alive' } }, inbox);
assert.equal(keepAlive.nextAction?.kind, 'process-inbox');
assert.equal(keepAlive.nextAction?.effort, 'small');
assert.ok([keepAlive.nextAction, ...keepAlive.alternatives].every(action => action?.effort === 'small'));
const keepAliveWithoutInbox = buildTechOsLearningEngine({ ...index, state: { ...index.state, mode: 'keep-alive' } }, []);
assert.equal(keepAliveWithoutInbox.nextAction?.kind, 'answer-question');

const completedQuestIndex = structuredClone(index);
const completedQuest = completedQuestIndex.entities.find(entity => entity.id === 'QUEST-002');
completedQuest.status = 'completed';
completedQuest.body += '\n\n## Open Questions\n\n- URL 编码与 Unicode 正规化如何交互？\n';
const completedResult = buildTechOsLearningEngine(completedQuestIndex, []);
assert.ok(completedResult.routeSeedSignals.some(signal => signal.sourceType === 'completed-quest' && /Unicode/.test(signal.title)));

assert.deepEqual(buildTechOsLearningEngine(index, inbox), explore, '同一输入必须产生确定性结果');
assert.deepEqual(index, originalIndex, 'Learning Engine 不得修改 Tech OS 输入');
assert.deepEqual(inbox, originalInbox, 'Learning Engine 不得修改 Inbox 输入');
assert.ok([explore.nextAction, ...explore.alternatives].filter(Boolean).every(action => action.reason && action.sourceIds.length > 0));
assert.ok(explore.routeSeedSignals.every(signal => signal.reason && signal.sourceIds.length > 0));

console.log('Tech OS learning engine self-check passed');
