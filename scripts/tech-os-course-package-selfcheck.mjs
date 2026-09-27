import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCoursePackage, readCourseEditingValue, assessCoursePackage, createCoursePackageDraft } from '../src/services/techOsCoursePackage.ts';
import { parseFrontMatter, validateTechOsDraftFiles } from '../src/services/techOsDraftValidation.ts';
import { parseTechOsMarkdownInline } from '../src/services/techOsMarkdown.ts';

const index = JSON.parse(fs.readFileSync(new URL('../src/generated/tech-os-index.json', import.meta.url), 'utf8'));
const originalIndex = structuredClone(index);
const outline = { version: 1, title: '理解一个新方向', summary: '学习目标和范围由本人核查。', lessons: [{ title: '第一课学什么', body: '' }, { title: '第二课如何验证？', body: '' }] };
const encode = value => JSON.stringify(value);
const parse = value => parseCoursePackage(encode(value));
const setLesson = changes => ({ ...outline, lessons: [{ ...outline.lessons[0], ...changes }, outline.lessons[1]] });
const date = '2026-09-27';

assert.deepEqual(parse(outline), outline);
// Editing is display-only: deleting a title or typing a newline must not remove the editor.
const editing = { ...outline, title: '  ', summary: '\n写到这里 ', lessons: [{ title: '', body: '    code\n' }, { title: '', body: '\n' }] };
assert.deepEqual(readCourseEditingValue(encode(editing)), editing);
assert.deepEqual(readCourseEditingValue('```json\n' + encode(editing) + '\n```'), editing);
assert.throws(() => parse(editing), /不能为空/);
assert.equal(readCourseEditingValue(encode({ ...editing, id: 'ROUTE-001' })), null);
assert.equal(readCourseEditingValue(encode({ ...editing, lessons: [{ ...editing.lessons[0], status: 'completed' }, editing.lessons[1]] })), null);
assert.equal(readCourseEditingValue(encode({ ...editing, title: 'x'.repeat(161) })), null);
assert.equal(readCourseEditingValue(encode({ ...editing, summary: 'x'.repeat(4001) })), null);
assert.equal(readCourseEditingValue(encode(setLesson({ body: 'x'.repeat(60001) }))), null);
assert.equal(readCourseEditingValue(encode({ ...editing, version: 2 })), null);
assert.equal(readCourseEditingValue(encode({ ...editing, lessons: [] })), null);
assert.equal(readCourseEditingValue(encode({ ...editing, title: null })), null);
assert.equal(readCourseEditingValue('{bad'), null);
assert.equal(readCourseEditingValue(' '.repeat(512 * 1024) + encode(editing)), null);
assert.equal(readCourseEditingValue(encode(outline).replace('"version":1', '"version":2,"version":1')), null);
const unsafeEdit = setLesson({ body: '---\nstatus: completed\n---\napi_key="A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6"' });
assert.deepEqual(readCourseEditingValue(encode(unsafeEdit)), unsafeEdit, 'editing is not a content-safety approval');
assert.throws(() => parse(unsafeEdit), /凭据|Front Matter/);
assert.equal(parse(setLesson({ body: '    indented code\n\nnext line  \n' })).lessons[0].body, '    indented code\n\nnext line  \n');
assert.equal(parse({ ...outline, summary: '第一行\n ' }).summary, '第一行\n ');
assert.deepEqual(parseCoursePackage(' \n```json\n' + encode(outline) + '\n```\n '), outline);
assert.deepEqual(parseCoursePackage('\uFEFF' + encode(outline)), outline);
assert.throws(() => parseCoursePackage('介绍\n' + encode(outline)), /合法 JSON/);
assert.throws(() => parseCoursePackage('```json\n' + encode(outline) + '\n```\n附言'), /完整/);
assert.throws(() => parseCoursePackage('```\n' + encode(outline) + '\n```'), /完整/);
assert.throws(() => parseCoursePackage(encode(outline) + encode(outline)), /合法 JSON/);
assert.throws(() => parseCoursePackage('{"version":1,}'), /合法 JSON/);
assert.throws(() => parseCoursePackage('null'), /仅允许/);
assert.throws(() => parseCoursePackage('[]'), /仅允许/);
assert.throws(() => parseCoursePackage(123), /JSON 文本/);

// Packages contain no repository authority, lifecycle state, or AI/provider configuration.
for (const [key, value] of Object.entries({ path: '../../src/App.tsx', id: 'ROUTE-001', routeId: 'ROUTE-001', files: [], status: 'completed', main: true, state: {}, credentials: {}, apiKey: 'placeholder', endpoint: 'https://example.com' })) {
  assert.throws(() => parse({ ...outline, [key]: value }), /仅允许/);
  assert.throws(() => parse(setLesson({ [key]: value })), /仅允许/);
}
assert.throws(() => parse({ ...outline, version: '1' }), /数字 1/);
assert.throws(() => parse({ ...outline, summary: null }), /字符串/);
assert.throws(() => parse(setLesson({ body: {} })), /字符串/);
assert.throws(() => parse({ ...outline, title: '' }), /不能为空/);
assert.throws(() => parse(setLesson({ title: ' \n ' })), /换行/);
assert.throws(() => parse({ ...outline, lessons: [outline.lessons[0]] }), /2–12/);
assert.throws(() => parse({ ...outline, lessons: Array.from({ length: 13 }, (_, i) => ({ title: '课程' + i, body: '' })) }), /2–12/);
assert.throws(() => parse({ ...outline, lessons: [{ title: '基础', body: '' }, { title: ' 基础？ ', body: '' }] }), /重复/);
assert.throws(() => parse({ ...outline, lessons: [{ title: 'ＡＢＣ', body: '' }, { title: 'abc?', body: '' }] }), /重复/);
assert.throws(() => parse(setLesson({ title: '?' })), /课名/);
assert.throws(() => parseCoursePackage(encode(outline).replace('"version":1', '"version":2,"version":1')), /重复字段/);
assert.throws(() => parseCoursePackage(encode(outline).replace('"version":1', '"version":2,"ver\\u0073ion":1')), /重复字段/);
assert.throws(() => parseCoursePackage(encode(outline).replace('"body":""', '"body":"old","body":""')), /重复字段/);

// Size is UTF-8 based for the envelope, character based for individual fields.
assert.equal(parse({ ...outline, title: '字'.repeat(160) }).title.length, 160);
assert.throws(() => parse({ ...outline, title: '字'.repeat(161) }), /160/);
assert.throws(() => parse(setLesson({ title: 'a'.repeat(161) })), /160/);
assert.equal(parse({ ...outline, summary: 'a'.repeat(4000) }).summary.length, 4000);
assert.throws(() => parse({ ...outline, summary: 'a'.repeat(4001) }), /4000/);
assert.equal(parse(setLesson({ body: 'a'.repeat(60000) })).lessons[0].body.length, 60000);
assert.throws(() => parse(setLesson({ body: 'a'.repeat(60001) })), /60000/);
assert.throws(() => parse({ ...outline, lessons: Array.from({ length: 3 }, (_, i) => ({ title: '课' + i, body: '字'.repeat(59000) })) }), /512 KiB/);
assert.throws(() => parseCoursePackage(' '.repeat(512 * 1024) + encode(outline)), /512 KiB/);
assert.throws(() => parse(setLesson({ body: 'abc\u0000def' })), /控制字符/);

// Front Matter cannot smuggle lifecycle state; ordinary code examples remain literal.
assert.throws(() => parse(setLesson({ body: '---\nstatus: completed\nid: QUEST-001\n---\n正文' })), /Front Matter/);
assert.throws(() => parse(setLesson({ body: '---\n"status": completed\n---\n正文' })), /Front Matter/);
assert.throws(() => parse(setLesson({ body: '\uFEFF \n---\nmain: true\n---\n正文' })), /Front Matter/);
assert.throws(() => parse(setLesson({ body: '---\nschema: tech-os/v1\nstatus: active' })), /Front Matter/);
const codeExample = '## 示例\n\n```yaml\n---\nstatus: completed\nid: QUEST-001\n---\n```\n\n路径 `/var/log/app`，HTTP status: 200。';
assert.equal(parse(setLesson({ body: codeExample })).lessons[0].body, codeExample);
assert.equal(parse(setLesson({ body: '---\n普通文字\n---\n正文' })).lessons[0].body.includes('普通文字'), true);

for (const secret of [
  'ghp_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6',
  'github_pat_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6',
  'sk-proj-' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6',
  '-----BEGIN PRIVATE KEY-----\nabc',
  'https://reader:password@service.invalid/',
  'api_key="A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6"',
  'Authorization: Bearer A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6',
  'sk-proj-A1b2C3d4exampleE5f6G7h8I9j0K1l2M3n4O5p6',
]) {
  assert.throws(() => parse(setLesson({ body: secret })), error => /疑似真实凭据/.test(error.message) && !error.message.includes(secret));
  assert.throws(() => parse({ ...outline, summary: secret }), /凭据/);
}
for (const placeholder of ['API_KEY=...', 'API_KEY=<YOUR_API_KEY>', 'api_key=YOUR_API_KEY_REPLACE_BEFORE_USE', 'const apiKey = process.env.API_KEY', 'sk-proj-YOUR_API_KEY_GOES_HERE']) {
  assert.equal(parse(setLesson({ body: placeholder })).lessons[0].body, placeholder);
}

const headings = ['为什么这样做', '工具与操作', '观察与预期', '常见误区', '卡住时怎么办', '检查理解', '参考答案', '完成标志'];
const fullBody = ['## 开始前', '使用桌面浏览器完成安全的本地观察。', '## 学习思路', '先预测，再执行一个操作并用记录解释差异。', '## 工具准备', '打开项目提供的公开实验页面与开发者工具，不访问个人账户。', '### S1 · 观察一次页面加载', ...headings.flatMap(heading => ['#### ' + heading, '打开实验页面的网络面板，记录文档请求实际状态和可见现象，并说明证据限制。'])].join('\n\n');
const fullCourse = { ...outline, lessons: outline.lessons.map(lesson => ({ ...lesson, body: fullBody })) };
assert.equal(assessCoursePackage(outline).status, 'outline');
assert.equal(assessCoursePackage(fullCourse).status, 'ready');
const mixed = { ...outline, lessons: [fullCourse.lessons[0], outline.lessons[1]] };
assert.equal(assessCoursePackage(mixed).status, 'incomplete');
assert.equal(assessCoursePackage({ ...outline, lessons: outline.lessons.map(lesson => ({ ...lesson, body: '这节课只有方向说明。' })) }).status, 'incomplete');
const unfinished = { ...fullCourse, lessons: [fullCourse.lessons[0], { ...fullCourse.lessons[1], body: fullBody.replace('#### 工具与操作', '#### 工具与操作\n\n待编写') }] };
assert.equal(assessCoursePackage(unfinished).status, 'incomplete');
assert.ok(assessCoursePackage(unfinished).issues.some(issue => issue.startsWith('第 2 课：')));

// Builders validate their direct object input too; bypassing parse is not an authority bypass.
assert.throws(() => createCoursePackageDraft(index, { ...outline, path: 'tech-os/state.yml' }, date), /仅允许/);
assert.throws(() => createCoursePackageDraft(index, setLesson({ body: '---\nstatus: completed\n---' }), date), /Front Matter/);
for (const invalidDate of ['2026-02-30', '2026-13-01', '2026-9-27', '2026-09-27\nstatus: active']) {
  assert.throws(() => createCoursePackageDraft(index, outline, invalidDate), /日期/);
}

const first = createCoursePackageDraft(index, outline, date);
assert.equal(first.files.length, 3);
assert.equal(new Set(first.files.map(file => file.path)).size, 3);
assert.match(first.key, /^course-package:ROUTE-\d{3,}$/);
assert.equal(validateTechOsDraftFiles([...index.files, ...first.files]).valid, true);
const route = parseFrontMatter(first.files[0].content, first.files[0].path);
assert.equal(route.data.status, 'backlog');
assert.equal(route.data.main, false);
assert.equal(route.data.source, 'manual');
assert.equal(route.data.origin_id, index.state.visionId);
assert.equal(route.data.vision_id, index.state.visionId);
assert.deepEqual(route.data.quest_ids, first.questIds);
first.files.slice(1).forEach((file, i) => {
  const parsed = parseFrontMatter(file.content, file.path);
  assert.match(file.path, /^tech-os\/quests\/backlog\/QUEST-\d{3,}\.md$/);
  assert.equal(parsed.data.id, first.questIds[i]);
  assert.equal(parsed.data.route_id, first.routeId);
  assert.equal(parsed.data.status, 'backlog');
  assert.equal(parsed.data.order, i + 1);
  assert.match(parsed.data.title, /[?？]$/);
  assert.match(parsed.body, /仅有课程大纲，尚无可跟做教案/);
  assert.doesNotMatch(parsed.body, /^### S\d+/m, 'empty body must not be padded into a fake full lesson');
});
assert.ok(first.files.every(file => !index.files.some(existing => existing.path === file.path)));
assert.ok(first.files.every(file => !file.path.endsWith('state.yml')));
assert.deepEqual(index, originalIndex);

// Incomplete content can become backlog drafts without being reported as ready.
const mixedDraft = createCoursePackageDraft(index, mixed, date, first.files);
assert.equal(validateTechOsDraftFiles([...index.files, ...first.files, ...mixedDraft.files]).valid, true);
assert.equal(mixedDraft.files[1].content.includes(fullBody), true);
assert.match(mixedDraft.files[2].content, /教案待编写/);
assert.ok(!first.questIds.some(id => mixedDraft.questIds.includes(id)));
assert.notEqual(first.routeId, mixedDraft.routeId);
assert.deepEqual(createCoursePackageDraft(index, outline, date), first, 'same snapshot builds a stable plan');

const specialTitle = { ...outline, title: '课程 "quoted" # literal', lessons: [{ title: '学习 "name" # example', body: codeExample }, { title: '第二课？', body: '<script>alert(1)</script>\n[bad](javascript:alert(1))' }] };
const specialDraft = createCoursePackageDraft(index, specialTitle, date);
assert.equal(parseFrontMatter(specialDraft.files[0].content, '').data.title, specialTitle.title);
assert.equal(parseFrontMatter(specialDraft.files[1].content, '').data.title, specialTitle.lessons[0].title + '？');
assert.ok(specialDraft.files[2].content.includes(specialTitle.lessons[1].body));
assert.ok(parseTechOsMarkdownInline(specialTitle.lessons[1].body).every(part => part.type !== 'link'));

// Reserve metadata IDs, filenames and index-only entities; never overwrite staged material.
const reservedRoute = {
  path: 'tech-os/routes/backlog/ROUTE-900.md',
  content: first.files[0].content.replace(`id: ${first.routeId}\n`, 'id: ROUTE-800\n').replace(/quest_ids:\n(?:  - QUEST-\d+\n)+/, 'quest_ids: []\n'),
};
const staleEntityIndex = structuredClone(index);
staleEntityIndex.entities.push({ ...staleEntityIndex.entities.find(entity => entity.kind === 'quest'), id: 'QUEST-9999' });
const reservedSnapshot = structuredClone([reservedRoute]);
const reservedDraft = createCoursePackageDraft(staleEntityIndex, outline, date, [reservedRoute, reservedRoute]);
assert.equal(reservedDraft.routeId, 'ROUTE-901');
assert.equal(reservedDraft.questIds[0], 'QUEST-10000');
assert.deepEqual([reservedRoute], reservedSnapshot);
const longIdIndex = structuredClone(index);
longIdIndex.entities.push({ ...index.entities.find(entity => entity.kind === 'route'), id: 'ROUTE-' + '9'.repeat(80) });
longIdIndex.entities.push({ ...index.entities.find(entity => entity.kind === 'quest'), id: 'QUEST-000' + '9'.repeat(80) });
const longIdDraft = createCoursePackageDraft(longIdIndex, outline, date);
assert.equal(longIdDraft.routeId, 'ROUTE-1' + '0'.repeat(80));
assert.deepEqual(longIdDraft.questIds, ['QUEST-1' + '0'.repeat(80), 'QUEST-1' + '0'.repeat(79) + '1']);
assert.equal(validateTechOsDraftFiles([...index.files, ...longIdDraft.files]).valid, true);

// An ID in a superseded source version also remains reserved for this build.
const oldRoute = { ...reservedRoute, content: reservedRoute.content.replace('id: ROUTE-800', 'id: ROUTE-950') };
const withOldSource = { ...index, files: [...index.files, oldRoute] };
assert.equal(createCoursePackageDraft(withOldSource, outline, date, [reservedRoute]).routeId, 'ROUTE-951');
assert.throws(() => createCoursePackageDraft(index, outline, date, [reservedRoute, oldRoute]), /同一路径/);
assert.throws(() => createCoursePackageDraft(index, outline, date, [{ path: '../state.yml', content: 'bad' }]), /结构校验/);
assert.throws(() => createCoursePackageDraft(index, outline, date, [{ path: 'tech-os/state.yml', content: 'schema: bad' }]), /结构校验/);
assert.throws(() => createCoursePackageDraft({ ...index, files: index.files.filter(file => file.path !== 'tech-os/state.yml') }, outline, date), /结构校验/);
assert.throws(() => createCoursePackageDraft({ ...index, files: [...index.files, index.files[0]] }, outline, date), /重复路径/);
assert.deepEqual(index, originalIndex, 'no source or state mutation after any build');

console.log('Tech OS course packages: strict content-only JSON, duplicate keys, bounds, credential/frontmatter guards, readiness, reserved IDs and immutable backlog creation passed.');
