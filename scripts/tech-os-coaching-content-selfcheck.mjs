import assert from 'node:assert/strict';
import { createTechOsIndex } from './build-tech-os-index.mjs';
import { parseQuestCoaching } from '../src/services/techOsCoaching.ts';
import { extractQuestStudyTasks } from '../src/services/techOsStudyProgress.ts';

const index = createTechOsIndex();
const sections = ['为什么这样做', '工具与操作', '观察与预期', '常见误区', '卡住时怎么办', '检查理解', '参考答案', '完成标志'];
let totalSteps = 0;
for (let n = 1; n <= 8; n++) {
  const id = `QUEST-${String(n).padStart(3, '0')}`;
  const quest = index.entities.find(entity => entity.id === id);
  assert.ok(quest, `${id} exists`);
  const guide = parseQuestCoaching(quest.body);
  assert.ok(guide.available && guide.steps.length >= 2, `${id} has a structured lesson`);
  for (const title of ['开始前', '学习思路', '工具准备']) assert.ok(guide.preparation.some(section => section.title === title && section.body.trim()), `${id} ${title}`);
  assert.deepEqual(guide.steps.map(step => step.id), extractQuestStudyTasks(quest.body).map(step => step.id), `${id} reading anchors match study progress`);
  for (const step of guide.steps) for (const title of sections) assert.ok(step.sections.some(section => section.title === title && section.body.trim()), `${id} ${step.id} ${title} is missing`);
  assert.match(quest.body, /\]\(https:\/\//, `${id} links to source material`);
  totalSteps += guide.steps.length;
}
console.log(`Tech OS lessons: 8 quests / ${totalSteps} guided steps, preparation, tools, troubleshooting, self-checks and evidence criteria passed.`);
