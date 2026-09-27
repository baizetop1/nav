import assert from 'node:assert/strict';
import { getTechOsHeadingStepId, parseTechOsMarkdown, parseTechOsMarkdownInline, safeTechOsMarkdownUrl, techOsMarkdownPlainText } from '../src/services/techOsMarkdown.ts';

const source = [
  '## 学习目标', '', '普通说明，带 **重点** 和 `代码`。', '',
  '### S1 · 看文档', '', '[文档](https://example.com/docs)', '',
  '### S1 · 重复的第一步', '', '### s2：做实验', '',
  '## 学习目标', '',
  '````javascript', '### S99 · 代码内的假步骤', '```', '## 仍在代码中', '````', '',
  '~~~text', '### S98 · 波浪线围栏也不算步骤', '~~~', '',
  '  ```', '### S97 · 缩进围栏', '  ```', '',
  '### S3 - 写结论', '',
  '- 一项', '- 第二项', '', '1. 第一步', '2. 第二步', '',
  '| 项目 | 说明 |', '| --- | :---: |', '| 链接 | [打开](http://example.com) |',
].join('\n');
const blocks = parseTechOsMarkdown(source, 'QUEST-001');
const headings = blocks.filter(block => block.type === 'heading');
assert.deepEqual(headings.map(heading => heading.stepId).filter(Boolean), ['S1', 'S1', 'S2', 'S3']);
assert.equal(headings.find(heading => heading.stepId === 'S1').id, 'QUEST-001-step-S1');
assert.equal(headings.filter(heading => heading.stepId === 'S1')[1].id, 'QUEST-001-step-S1-2');
assert.equal(new Set(headings.map(heading => heading.id)).size, headings.length, 'duplicate titles/steps must not share anchors');
assert.deepEqual(blocks, parseTechOsMarkdown(source, 'QUEST-001'), 'same document has deterministic IDs');
const prepended = parseTechOsMarkdown('A new introductory paragraph.\n\n' + source, 'QUEST-001').filter(block => block.type === 'heading');
assert.deepEqual(prepended.map(heading => heading.id), headings.map(heading => heading.id), 'non-heading edits do not change anchors');
assert.equal(blocks.filter(block => block.type === 'code').length, 3);
assert.match(blocks.find(block => block.type === 'code').text, /```\n## 仍在代码中/);
assert.ok(blocks.some(block => block.type === 'unordered-list' && block.items.length === 2));
assert.ok(blocks.some(block => block.type === 'ordered-list' && block.items.length === 2));
assert.ok(blocks.some(block => block.type === 'table' && block.rows.length === 2));
assert.deepEqual(parseTechOsMarkdown('```\n### S1 · 未闭合围栏\n## 不是标题', 'A').map(block => block.type), ['code']);
assert.equal(getTechOsHeadingStepId(3, 'S1 · 一'), 'S1');
assert.equal(getTechOsHeadingStepId(3, 'S12：内容'), 'S12');
assert.equal(getTechOsHeadingStepId(3, 'S1 ·   '), undefined);
assert.equal(getTechOsHeadingStepId(2, 'S1 · 内容'), undefined);
assert.equal(getTechOsHeadingStepId(3, '不是一个步骤'), undefined);

assert.equal(safeTechOsMarkdownUrl('https://example.com/path?q=a#b'), 'https://example.com/path?q=a#b');
assert.equal(safeTechOsMarkdownUrl('HTTP://EXAMPLE.COM'), 'http://example.com/');
for (const value of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,hello', 'vbscript:msgbox(1)', '//example.com', '/relative', '#/admin', 'file:///tmp/a', 'https:example.com', 'https://user:pass@example.com', 'https://example.com\\@evil.test', 'https://example.com/a\nb', 'https://example.com/a b', 'https://']) {
  assert.equal(safeTechOsMarkdownUrl(value), null, `unsafe URL: ${JSON.stringify(value)}`);
}
const links = parseTechOsMarkdownInline('[正常](https://example.com) [括号](https://example.com/a_(b)) [标题](https://example.com/x "阅读资料") [尖括号](<https://example.com/y>)').filter(part => part.type === 'link');
assert.equal(links.length, 4);
assert.equal(links[1].href, 'https://example.com/a_(b)');
assert.equal(links[2].href, 'https://example.com/x');
assert.equal(links[3].href, 'https://example.com/y');
for (const input of ['[恶意](javascript:alert(1))', '[数据](data:text/html,boom)', '[相对](//example.com)', '[站内](#/admin)', '![图片](https://example.com/image.png)', '`[代码内](https://example.com)`', '\\[转义](https://example.com)']) {
  assert.equal(parseTechOsMarkdownInline(input).some(part => part.type === 'link'), false, input);
}
assert.deepEqual(parseTechOsMarkdownInline('前文 **重点** 与 `x < y`'), [{ type: 'text', text: '前文 ' }, { type: 'strong', text: '重点' }, { type: 'text', text: ' 与 ' }, { type: 'code', text: 'x < y' }]);
assert.equal(techOsMarkdownPlainText('S1 · **阅读** [`文档`](https://example.com)'), 'S1 · 阅读 文档');
assert.equal(parseTechOsMarkdownInline('<script>alert(1)</script>').map(part => part.text).join(''), '<script>alert(1)</script>', 'raw HTML remains literal text for React escaping');
assert.equal(parseTechOsMarkdownInline('[不完整](https://example.com').some(part => part.type === 'link'), false);
assert.equal(parseTechOsMarkdownInline('[a](https://example.com)', false).some(part => part.type === 'link'), false, 'link labels cannot create nested links');

console.log('Tech OS Markdown: safe links, literal unsafe markup, inline styles, deterministic unique anchors, fenced-code exclusions, study steps, lists and tables passed.');
