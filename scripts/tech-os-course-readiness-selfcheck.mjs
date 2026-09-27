import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assessQuestCoaching,
  parseQuestCoaching,
  QUEST_COACHING_PREPARATION_TITLES,
  QUEST_COACHING_SECTION_TITLES,
} from '../src/services/techOsCoaching.ts';

const preparation = {
  开始前: '本课约十分钟，会打开浏览器即可；先使用不含个人数据的测试地址。',
  学习思路: '先预测，再只改变一个变量，最后用实际观察解释差异。',
  工具准备: '打开浏览器开发者工具的 Network 面板，确认录制已开启。',
};
const teaching = {
  为什么这样做: '区分浏览器地址变化与文档请求，让判断有实际证据。',
  工具与操作: '在实验页点击片段链接，然后查看 Network 的 Doc 列表。',
  观察与预期: '同文档片段导航通常不产生新文档请求；记录实际出现的项目。',
  常见误区: '不能用地址栏出现片段来证明服务器收到了片段。',
  卡住时怎么办: '检查录制状态与过滤器；没有工具时先保留问题，不把推测当实测。',
  检查理解: '为什么地址可以变化，但服务器未收到新文档请求？',
  参考答案: '同文档片段由浏览器处理，URL 的片段不属于 HTTP 请求目标。',
  完成标志: '保留一次真实观察，并独立解释地址变化与请求的区别。',
};
function prep(overrides = {}) {
  const values = { ...preparation, ...overrides };
  return QUEST_COACHING_PREPARATION_TITLES.filter(title => values[title] !== null).map(title => `## ${title}\n${values[title]}`).join('\n\n');
}
function step(id = 'S1', overrides = {}) {
  const values = { ...teaching, ...overrides };
  return `### ${id} · 观察与验证\n\n` + QUEST_COACHING_SECTION_TITLES.filter(title => values[title] !== null).map(title => `#### ${title}\n${values[title]}`).join('\n\n');
}
const full = prep() + '\n\n' + step();
function check(body, status, issuePattern) {
  const assessed = assessQuestCoaching(body);
  assert.equal(assessed.status, status, JSON.stringify(assessed));
  assert.equal(parseQuestCoaching(body).available, status === 'ready', 'guided mode must share the exact readiness gate');
  if (issuePattern) assert.ok(assessed.issues.some(issue => issuePattern.test(issue)), JSON.stringify(assessed));
  assert.equal(assessed.issues.length === 0, status === 'ready');
  return assessed;
}

check('', 'outline');
check(' \r\n\t', 'outline');
check('未来想探索 CPU 与内存。', 'outline');
check('## 学习步骤\n```markdown\n### S1 · 仅代码示例\n```', 'outline');
check(prep() + '\n### S1 · 只有目标\n理解请求流程。', 'incomplete', /工具与操作/);
check(full, 'ready');
check(full.replaceAll('\n', '\r\n').replace('#### 参考答案', '#### **参考答案：** ####'), 'ready');
check(full.replace('## 工具准备', '## 课前工具准备：浏览器'), 'ready');
check(full + '\n\n' + step('S2'), 'ready');

for (const title of QUEST_COACHING_PREPARATION_TITLES) {
  check(prep({ [title]: null }) + '\n' + step(), 'incomplete', new RegExp(title));
  check(prep({ [title]: ' \n' }) + '\n' + step(), 'incomplete', /缺少教学内容/);
  check(prep({ [title]: '待编写：这里填写课程设计。' }) + '\n' + step(), 'incomplete', /占位内容/);
}
for (const title of QUEST_COACHING_SECTION_TITLES) {
  check(prep() + '\n' + step('S1', { [title]: null }), 'incomplete', new RegExp(title));
  check(prep() + '\n' + step('S1', { [title]: '\n' }), 'incomplete', /缺少教学内容/);
  for (const placeholder of ['待编写', '待补充', '待填写', 'TODO', 'TBD', '占位模板', '**待编写：**具体工具名称和操作。', '1. 待编写：按钮名称。\n2. 待编写：结果字段。']) {
    check(prep() + '\n' + step('S1', { [title]: placeholder }), 'incomplete', /占位内容/);
  }
}
check(full + '\n\n' + step('S2', { 参考答案: '' }), 'incomplete', /步骤 S2 的「参考答案」/);
check(full + '\n\n### S2 · 只有标题', 'incomplete', /步骤 S2/);
check(full + '\n\n' + step('s1'), 'incomplete', /编号 S1 重复/);
assert.equal(parseQuestCoaching(full + '\n\n' + step()).steps.length, 1, 'render first duplicate only, but never label the lesson ready');
check(full + '\n#### 参考答案：\n不同的另一份答案。', 'incomplete', /参考答案.*重复/);
check(full + '\n\n## 开始前\n后置重复不作为课前准备', 'ready');
check(step() + '\n\n' + prep(), 'incomplete', /缺少课前/);

const observationTable = '| 操作/条件 | 我的预测 | 实际观察 | 证据位置 |\n| --- | --- | --- | --- |\n| 待填写 | 待填写 | 待填写 | 待填写 |';
check(prep() + '\n' + step('S1', { 观察与预期: teaching.观察与预期 + '\n\n' + observationTable }), 'ready');
check(prep() + '\n' + step('S1', { 观察与预期: observationTable }), 'incomplete', /占位内容/);
check(prep() + '\n' + step('S1', { 观察与预期: '| 条件 | 预期 |\n| --- | --- |\n| 只修改片段 | 通常不产生文档请求 |' }), 'ready');
check(prep() + '\n' + step('S1', { 工具与操作: 'TODO 是常见的待办注释标记，不代表这次操作缺失。打开编辑器搜索注释并记录它所在行。' }), 'ready');
check(prep() + '\n' + step('S1', { 工具与操作: '在编辑器打开示例，观察注释和输出。\n```js\n// TODO: 演示任务标记\nconsole.log(42);\n```' }), 'ready');
check(prep() + '\n' + step('S1', { 参考答案: '注释中的 TBD 表示后续决定；本次应输出 42。' }), 'ready');
check(prep() + '\n' + step('S1', { 参考答案: teaching.参考答案 + '\nTODO: 后续增加另一份规范链接。' }), 'ready');
check(prep() + '\n' + step('S1', { 工具与操作: '简要说明。\n待编写：还没有实际工具步骤，需要补齐从哪里打开工具、具体按钮与输入，以及操作产生什么影响。\n待补充：还需要补上恢复步骤。' }), 'incomplete', /占位内容/);
check(prep() + '\n' + step('S1', { 工具与操作: '<!-- 还未写好 -->\n```text\n```' }), 'incomplete', /缺少教学内容/);
check(full + '\n\n## 当前结论\n待填写\n\n## 下一步\nTODO\n\n## 完成证据\n尚未形成，待真实操作后补充。', 'ready');
check(full + '\n\n```markdown\n### S1 · 围栏伪重复\n#### 参考答案\n待编写\n```', 'ready');

const template = readFileSync(new URL('../tech-os/templates/quest.md', import.meta.url), 'utf8');
check(template, 'incomplete', /占位内容/);
for (let index = 1; index <= 8; index += 1) {
  const id = `QUEST-${String(index).padStart(3, '0')}`;
  const folder = index === 1 ? 'active' : 'backlog';
  const source = readFileSync(new URL(`../tech-os/quests/${folder}/${id}.md`, import.meta.url), 'utf8');
  assert.deepEqual(assessQuestCoaching(source), { status: 'ready', issues: [] }, `${id} must retain its complete teaching structure`);
  assert.equal(parseQuestCoaching(source).available, true, id);
}

console.log('Tech OS course readiness: all 8 authored courses ready; template, empty/missing sections, duplicates and instructional placeholders gated; learner evidence/TODO examples preserved.');
