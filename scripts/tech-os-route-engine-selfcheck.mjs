import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTechOsLearningEngine } from '../src/services/techOsLearningEngine.ts';
import { buildRouteCandidateGroups, createRouteCandidateDraft, getDefaultRouteCandidateValues } from '../src/services/techOsRouteCandidate.ts';
import { createCandidateDecisionDraft } from '../src/services/techOsCandidateDecision.ts';
import { buildRouteCompletionReview, createRouteReviewDraft, getDefaultRouteReviewValues } from '../src/services/techOsRouteCompletion.ts';
import { buildNextRouteRecommendations, createRecommendedRouteDraft, getDefaultRecommendedRouteValues } from '../src/services/techOsNextRoute.ts';
import { buildManualRouteSuggestion, createManualRouteDraft, getDefaultManualRouteValues } from '../src/services/techOsManualRoute.ts';
import { validateTechOsDraftFiles } from '../src/services/techOsDraftValidation.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = JSON.parse(fs.readFileSync(path.join(root, 'src/generated/tech-os-index.json'), 'utf8'));
const originalIndex = structuredClone(index);
const learning = buildTechOsLearningEngine(index, []);
const groups = buildRouteCandidateGroups(index, learning.routeSeedSignals);
const candidateGroup = groups[0];
const candidateFile = createRouteCandidateDraft(candidateGroup, getDefaultRouteCandidateValues(candidateGroup), '2026-08-24').file;
const candidateEntity = {
  id: candidateGroup.candidateId,
  kind: 'route-seed',
  title: candidateGroup.suggestedTitle,
  status: 'candidate',
  created: '2026-08-24',
  tags: candidateGroup.sharedTags,
  sourcePath: candidateFile.path,
  fields: { source: candidateGroup.source, origin_id: candidateGroup.originId, reason: candidateGroup.defaultReason, related_question_ids: candidateGroup.relatedQuestionIds },
  body: candidateFile.content.split('\n---\n')[1],
};

const saveLater = createCandidateDecisionDraft(candidateEntity, candidateFile.content, 'save_for_later', '保留到当前路线 Review 之后再判断。', '2026-08-24');
assert.match(saveLater.file.content, /status: candidate/);
assert.match(saveLater.file.content, /decision: save_for_later/);
assert.equal(validateTechOsDraftFiles([...index.files, saveLater.file]).valid, true);
const archived = createCandidateDecisionDraft(candidateEntity, candidateFile.content, 'archive', '证据不足，先归档。', '2026-08-24');
assert.match(archived.file.content, /status: archived/);
assert.equal(validateTechOsDraftFiles([...index.files, archived.file]).valid, true);
const notInterested = createCandidateDecisionDraft(candidateEntity, candidateFile.content, 'not_interested', '当前不想沿这个方向继续。', '2026-08-24');
assert.match(notInterested.file.content, /decision: not_interested/);
assert.throws(() => createCandidateDecisionDraft({ ...candidateEntity, status: 'seed' }, candidateFile.content, 'archive', 'x', '2026-08-24'), /Only saved Candidate/);

const currentReview = buildRouteCompletionReview(index);
assert.equal(currentReview.progress, 0);
assert.equal(currentReview.eligible, false);
assert.throws(() => createRouteReviewDraft(currentReview, getDefaultRouteReviewValues(currentReview), '2026-08-24'), /locked/);

const nearCompleteIndex = structuredClone(index);
nearCompleteIndex.entities.filter(entity => entity.kind === 'quest' && entity.id !== nearCompleteIndex.state.currentQuestId).forEach(entity => { entity.status = 'completed'; });
const readyReview = buildRouteCompletionReview(nearCompleteIndex);
assert.equal(readyReview.progress, 88);
assert.equal(readyReview.eligible, true);
assert.equal(readyReview.reviewId, 'REVIEW-001');
const reviewDraft = createRouteReviewDraft(readyReview, getDefaultRouteReviewValues(readyReview), '2026-08-24');
assert.equal(reviewDraft.file.path, 'tech-os/reviews/REVIEW-001.md');
const reviewValidation = validateTechOsDraftFiles([...index.files, reviewDraft.file]);
assert.equal(reviewValidation.valid, true, reviewValidation.errors.join('\n'));
assert.match(reviewDraft.file.content, /status: draft/);
assert.match(reviewDraft.file.content, /不会修改 Route status/);

const recommendations = buildNextRouteRecommendations(nearCompleteIndex, groups, readyReview);
assert.equal(recommendations.length, 2);
assert.deepEqual(recommendations.map(item => item.routeId), ['ROUTE-002', 'ROUTE-003']);
assert.ok(recommendations.every(item => item.why && item.sourceLabel && item.expectedOutcome && item.outline.length >= 2));
assert.ok(recommendations.some(item => item.routeSeedIds.includes('RS-001')));
const recommendedDraft = createRecommendedRouteDraft(index, recommendations[0], getDefaultRecommendedRouteValues(recommendations[0]), '2026-08-24');
const recommendedValidation = validateTechOsDraftFiles([...index.files, recommendedDraft.file]);
assert.equal(recommendedValidation.valid, true, recommendedValidation.errors.join('\n'));
assert.match(recommendedDraft.file.content, /main: false/);
assert.equal(buildNextRouteRecommendations(index, groups, currentReview).length, 0, 'Review 未就绪时不得推荐 Next Route');

const manual = buildManualRouteSuggestion(index, {
  topic: '集成电路',
  reason: '希望理解数字芯片如何从晶体管发展到 CPU。',
  expectedOutcome: '能够设计并验证一个小型 RTL 模块。',
}, recommendations.map(item => item.routeId));
assert.equal(manual.routeId, 'ROUTE-004');
assert.deepEqual(manual.outline.slice(0, 3), ['MOSFET', 'CMOS', 'Logic Gate']);
const manualDraft = createManualRouteDraft(manual, getDefaultManualRouteValues(manual), '2026-08-24');
const manualValidation = validateTechOsDraftFiles([...index.files, manualDraft.file]);
assert.equal(manualValidation.valid, true, manualValidation.errors.join('\n'));
assert.match(manualDraft.file.content, /source: manual/);
assert.match(manualDraft.file.content, /status: backlog/);
assert.match(manualDraft.file.content, /main: false/);

assert.deepEqual(index, originalIndex, 'T4.3–T4.6 services must not mutate Tech OS input');
assert.deepEqual(buildNextRouteRecommendations(nearCompleteIndex, groups, readyReview), recommendations, 'Next Route ranking must be deterministic');

console.log('Tech OS route lifecycle self-check passed');
