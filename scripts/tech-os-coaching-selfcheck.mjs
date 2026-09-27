import assert from 'node:assert/strict';
import { parseQuestCoaching, assessQuestCoaching } from '../src/services/techOsCoaching.ts';
import { extractQuestStudyTasks } from '../src/services/techOsStudyProgress.ts';

const otherSections = [
  '#### 为什么这样做', '用单一变量区分地址变化和请求变化。',
  '#### 常见误区', '片段变化不代表服务器收到片段。',
  '#### 卡住时怎么办', '没有文档请求时检查录制和 Doc 过滤器。',
  '#### 检查理解', '为什么片段不属于请求目标？',
  '#### 参考答案', '片段由浏览器处理，发送请求前已与资源地址分离。',
  '#### 完成标志', '保存实际观察，并能解释与预测的差异。',
];
const lesson = [
  '# 中文教案', '', '## 开始前', '', '先写下自己的预测。', '',
  '## 学习思路', '观察 → 解释 → 验证。', '',
  '## **工具准备** ##', '', '- 浏览器', '- DevTools', '',
  '### S1 · **观察导航** ###', '', '这段是步骤的引言。', '',
  '#### **工具与操作** ####', '', '打开 Network，访问 `https://example.com`。', '',
  '```text', '## 当前结论', '### S88 · 围栏伪步骤', '#### 观察与预期', '这不是子节。', '```', '',
  '#### 观察与预期：', '', '应当看到 Document 请求。', '',
  '##### 补充说明', '保留更深层标题。', '',
  ...otherSections, '',
  '### s2 : 拆开 URL', '', '#### 工具与操作', '    const url = new URL(location.href);', '',
  '#### 观察与预期', 'fragment 不进入请求。', '',
  ...otherSections, '',
  '## 当前结论', '此处是总结，不属于 S2。', '',
  '## 下一步', '下次继续，不属于 S2。', '',
  '## 完成证据', '截图路径，不属于 S2。',
].join('\r\n');
const parsed = parseQuestCoaching(lesson);
assert.equal(parsed.available, true);
assert.deepEqual(parsed.preparation.map(section => section.title), ['开始前', '学习思路', '工具准备']);
assert.deepEqual(parsed.steps.map(({ id, title }) => ({ id, title })), extractQuestStudyTasks(lesson), 'coaching and checklist steps share IDs and plain titles');
assert.deepEqual(parsed.steps.map(step => step.id), ['S1', 'S2']);
assert.equal(parsed.steps[0].title, '观察导航');
assert.deepEqual(parsed.steps[0].sections.map(section => section.title), ['工具与操作', '观察与预期', '为什么这样做', '常见误区', '卡住时怎么办', '检查理解', '参考答案', '完成标志']);
assert.equal(parsed.steps[0].intro, '这段是步骤的引言。', 'the text before the first H4 must be available to guided rendering');
assert.equal(parsed.steps[1].intro, '', 'a step starting directly with an H4 has no intro');
assert.ok(parsed.steps[0].sections[0].body.includes('### S88 · 围栏伪步骤'), 'fenced content remains raw text');
assert.ok(parsed.steps[0].body.includes('#### **工具与操作** ####'), 'step body retains its full raw Markdown source');
assert.ok(parsed.steps[0].sections[1].body.includes('##### 补充说明'));
assert.equal(parsed.steps[1].sections[0].body, '    const url = new URL(location.href);', 'do not strip indentation from raw bodies');
assert.equal(parsed.steps[1].body.includes('此处是总结'), false);
assert.equal(parsed.steps[1].body.includes('下次继续'), false);
assert.equal(parsed.steps[1].body.includes('截图路径'), false);
assert.equal(parsed.steps[0].body.includes('\r'), false);

const beforeTools = '## 开始前\n会使用浏览器即可，先用十分钟体验。\n## 学习思路\n先预测再观察，最后检查差异。\n';
const prefix = beforeTools + '## 工具准备\n浏览器和纸笔。\n';
const fullStep = '### S1 · 完整\n#### 工具与操作\n打开工具。\n#### 观察与预期\n记录结果。\n' + otherSections.join('\n');
assert.deepEqual(parseQuestCoaching(''), { preparation: [], steps: [], available: false });
assert.deepEqual(parseQuestCoaching('只有普通中文说明。'), { preparation: [], steps: [], available: false });
assert.equal(parseQuestCoaching(fullStep).available, false, 'steps alone do not replace preparation tools');
assert.equal(parseQuestCoaching(prefix + '### S1 · 旧步骤\n**学什么：**知识\n**动手做：**打开工具').available, false, 'legacy bold labels are not a full coaching lesson');
assert.equal(parseQuestCoaching(prefix + '### S1 · 缺少操作\n#### 工具与操作\n\n#### 观察与预期\n有预期').available, false);
assert.equal(parseQuestCoaching(prefix + '### S1 · 操作\n#### 工具与操作\n打开工具\n### S2 · 观察\n#### 观察与预期\n记录').available, false, 'required sections must belong to the same step');
assert.equal(parseQuestCoaching('## 工具准备\n\n' + fullStep).available, false, 'empty preparation must not swallow the first step body');
assert.equal(parseQuestCoaching(fullStep + '\n## 工具准备\n这不是课前准备').available, false, 'late tools section cannot be mistaken for preparation');
assert.equal(parseQuestCoaching(prefix + fullStep).available, true);
assert.equal(parseQuestCoaching(beforeTools + '## 课前工具准备：浏览器\nDevTools\n' + fullStep).available, true);
assert.equal(assessQuestCoaching(prefix + fullStep).status, 'ready');

const duplicates = parseQuestCoaching(prefix + '### s1 — 第一次\n第一次正文。\n' + fullStep + '\n### S2 . 下一步\n第二步正文。');
assert.deepEqual(duplicates.steps.map(step => step.id), ['S1', 'S2']);
assert.equal(duplicates.steps[0].title, '第一次');
assert.equal(duplicates.steps[0].body, '第一次正文。');
assert.equal(duplicates.steps[0].intro, '', 'without H4s the body fallback owns the whole text, preventing double rendering');
assert.equal(duplicates.available, false, 'a duplicate later complete step must not replace the first occurrence');
for (const delimiter of ['·', ':', '：', '-', '—', '.']) {
  const source = `   ### s12 ${delimiter} **中文标题** ###\n内容`;
  assert.deepEqual(parseQuestCoaching(source).steps.map(({ id, title }) => ({ id, title })), [{ id: 'S12', title: '中文标题' }]);
  assert.deepEqual(parseQuestCoaching(source).steps.map(({ id, title }) => ({ id, title })), extractQuestStudyTasks(source));
}
const fences = prefix + [
  '~~~~markdown', '### S99 · 假步骤', '```', '## 假的父级章节', '~~~', '#### 工具与操作', '~~~~',
  fullStep,
].join('\n');
assert.deepEqual(parseQuestCoaching(fences).steps.map(step => step.id), ['S1'], 'different or shorter fences do not close the active fence');
assert.equal(parseQuestCoaching(fences).available, true);
assert.equal(parseQuestCoaching('```markdown\n' + prefix + fullStep).available, false, 'an unclosed fence consumes headings through EOF');
assert.deepEqual(parseQuestCoaching('    ### S1 · 四空格不是标题\n##工具准备\n####工具与操作').steps, []);
const boundaries = parseQuestCoaching(prefix + fullStep + '\n### 普通同级节\n不属于S1\n#### 额外内容\n也不属于S1');
assert.equal(boundaries.steps[0].body.includes('不属于S1'), false, 'non-step H3 headings close the preceding step too');
const titled = parseQuestCoaching(prefix + fullStep + '\n#### **参考答案：**\n答案内容\n#### 卡住时怎么办:\n提示内容\n#### 常见误区：\n误区内容');
assert.deepEqual(titled.steps[0].sections.slice(-3).map(section => section.title), ['参考答案', '卡住时怎么办', '常见误区'], 'normalize title punctuation for disclosure matching');
assert.ok(titled.steps[0].body.includes('#### **参考答案：**'), 'full step Markdown remains untouched by title normalization');
console.log('Tech OS coaching: raw Markdown sections, completeness gate, fences, duplicate IDs and heading boundaries passed.');
