import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTechOsLearningEngine } from '../src/services/techOsLearningEngine.ts';
import { buildRouteCandidateGroups, createRouteCandidateDraft, getDefaultRouteCandidateValues } from '../src/services/techOsRouteCandidate.ts';
import { validateTechOsDraftFiles } from '../src/services/techOsDraftValidation.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = JSON.parse(fs.readFileSync(path.join(root, 'src/generated/tech-os-index.json'), 'utf8'));
const originalIndex = structuredClone(index);
const learning = buildTechOsLearningEngine(index, []);
const originalSignals = structuredClone(learning.routeSeedSignals);
const groups = buildRouteCandidateGroups(index, learning.routeSeedSignals);

assert.equal(groups.length, 1, '当前示例应只形成一个有多个证据的候选组');
const group = groups[0];
assert.equal(group.candidateId, 'RS-002');
assert.equal(group.filePath, 'tech-os/routes/candidates/RS-002.md');
assert.equal(group.sharedTags[0], 'dns');
assert.equal(group.inputs.length, 4);
assert.ok(group.sourceEntityIds.includes('QUESTION-001'));
assert.ok(group.sourceEntityIds.includes('KNOWLEDGE-001'));
assert.deepEqual(group.relatedQuestionIds, ['QUESTION-001']);
assert.deepEqual(group.knowledgeIds, ['KNOWLEDGE-001']);
assert.ok(!group.inputs.some(input => input.sourceIds.includes('RS-001')), '无相关共同标签的单个 Seed 不应被强行聚合');

const defaults = getDefaultRouteCandidateValues(group);
const draft = createRouteCandidateDraft(group, {
  ...defaults,
  title: 'DNS: “缓存与递归”深入路线',
  reason: '四项显式证据共同指向 DNS 缓存与查询链。',
  expectedOutcome: '能解释各缓存层，并设计可重复实验。',
  outline: ['区分缓存边界', '记录递归查询顺序', '验证 TTL 与 DNSSEC'],
}, '2026-08-24');

assert.equal(draft.candidateId, 'RS-002');
assert.match(draft.file.content, /status: candidate/);
assert.match(draft.file.content, /title: "DNS: “缓存与递归”深入路线"/);
assert.match(draft.file.content, /1\. 区分缓存边界/);
assert.match(draft.file.content, /## Existing Knowledge\n\n- `KNOWLEDGE-001`/);
assert.doesNotMatch(draft.file.content, /## Existing Knowledge\n\n[^#]*QUESTION-001/);
const validation = validateTechOsDraftFiles([...index.files, draft.file]);
assert.equal(validation.valid, true, validation.errors.join('\n'));
assert.throws(() => createRouteCandidateDraft(group, { ...defaults, outline: ['只有一步'] }, '2026-08-24'), /at least two steps/);

const unrelatedSignals = learning.routeSeedSignals.map((signal, signalIndex) => ({ ...signal, tags: [`unique-${signalIndex}`] }));
assert.deepEqual(buildRouteCandidateGroups(index, unrelatedSignals), [], '没有共享的具体标签时不得生成候选');
const broadOnly = learning.routeSeedSignals.slice(0, 2).map(signal => ({ ...signal, tags: ['internet'] }));
assert.deepEqual(buildRouteCandidateGroups(index, broadOnly), [], '宽泛领域标签不得单独触发聚合');
const hybrid = buildRouteCandidateGroups(index, [{ ...learning.routeSeedSignals[0], tags: ['digital-logic'] }]);
assert.equal(hybrid.length, 1, '已保存 Seed 可以和具有明确共同标签的新 Signal 聚合');
assert.ok(hybrid[0].inputs.some(input => input.kind === 'saved-seed' && input.sourceIds.includes('RS-001')));
assert.deepEqual(buildRouteCandidateGroups(index, learning.routeSeedSignals), groups, '相同输入必须产生确定性候选');
assert.deepEqual(index, originalIndex, 'Candidate Generator 不得修改 Tech OS 输入');
assert.deepEqual(learning.routeSeedSignals, originalSignals, 'Candidate Generator 不得修改 Signal 输入');

console.log('Tech OS route candidate self-check passed');
