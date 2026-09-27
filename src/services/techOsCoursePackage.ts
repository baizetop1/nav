import type { CourseAssessment, CoursePackage, CoursePackageDraft } from '../types/tech-os-course.ts';
import type { TechOsIndex, TechOsSourceFile } from '../types/tech-os.ts';
import { assessQuestCoaching } from './techOsCoaching.ts';
import { parseFlatYaml, parseFrontMatter, validateTechOsDraftFiles } from './techOsDraftValidation.ts';

const MAX_PACKAGE_BYTES = 512 * 1024;
const MAX_BODY_CHARS = 60000;
const encoder = new TextEncoder();

/** Only content is importable. Paths, IDs, lifecycle state and credentials are never package fields. */
export function parseCoursePackage(text: string): CoursePackage {
  const { source, value } = decodeCourseText(text);
  const course = validateCourseValue(value);
  rejectDuplicateJsonKeys(source);
  return course;
}

/** Display-only editing shape. Never use this as authorization to export, stage, or send to AI.
 * Deliberately allows empty/duplicate names, credentials and Front Matter while being edited.
 * Every action must independently pass parseCoursePackage on the latest full text. */
export function readCourseEditingValue(text: string): CoursePackage | null {
  try {
    const { source, value } = decodeCourseText(text);
    if (!hasExactKeys(value, ['version', 'title', 'summary', 'lessons']) || value.version !== 1
      || typeof value.title !== 'string' || value.title.length > 160
      || typeof value.summary !== 'string' || value.summary.length > 4000
      || !Array.isArray(value.lessons) || value.lessons.length < 2 || value.lessons.length > 12) return null;
    const lessons: CoursePackage['lessons'] = [];
    for (const lesson of value.lessons) {
      if (!hasExactKeys(lesson, ['title', 'body']) || typeof lesson.title !== 'string' || lesson.title.length > 160
        || typeof lesson.body !== 'string' || lesson.body.length > MAX_BODY_CHARS) return null;
      lessons.push({ title: lesson.title, body: lesson.body });
    }
    rejectDuplicateJsonKeys(source);
    return { version: 1, title: value.title, summary: value.summary, lessons };
  } catch { return null; }
}

function decodeCourseText(text: string): { source: string; value: unknown } {
  if (typeof text !== 'string') throw new Error('课程包必须是 JSON 文本。');
  assertPackageSize(text);
  let source = text.trim();
  if (source.startsWith('```')) {
    const fence = source.match(/^```json[ \t]*\r?\n([\s\S]*?)\r?\n```$/);
    if (!fence) throw new Error('仅接受纯 JSON 或一个完整的 ```json 代码围栏，请移除包前后的说明。');
    source = fence[1];
  }
  let value: unknown;
  try { value = JSON.parse(source); }
  catch { throw new Error('课程包不是合法 JSON，请检查引号、逗号及内容是否完整。'); }
  return { source, value };
}

export function assessCoursePackage(course: CoursePackage): CourseAssessment {
  const checked = validateCourseValue(course);
  const lessons = checked.lessons.map(lesson => assessQuestCoaching(lesson.body));
  const status = checked.lessons.every(lesson => !lesson.body.trim()) ? 'outline'
    : lessons.every(lesson => lesson.status === 'ready') ? 'ready' : 'incomplete';
  const issues = lessons.flatMap((lesson, index) => lesson.issues.map(issue => `第 ${index + 1} 课：${issue}`));
  return { status, lessons, issues };
}

/** Creates only new backlog files; does not stage, persist, publish, or alter the current route/state. */
export function createCoursePackageDraft(
  index: TechOsIndex,
  course: CoursePackage,
  created: string,
  reservedFiles: TechOsSourceFile[] = [],
): CoursePackageDraft {
  const checked = validateCourseValue(course);
  assertDate(created);
  const merged = mergeReservedFiles(index.files, reservedFiles);
  assertValidFiles([...merged.values()], '现有内容或暂存草稿');
  const stateFile = merged.get('tech-os/state.yml')!;
  const state = parseFlatYaml(stateFile.content, stateFile.path);
  const visionId = state.vision_id;
  if (typeof visionId !== 'string' || !/^VISION-\d{3,}$/.test(visionId)) throw new Error('当前 Vision 无效，不能创建课程路线。');

  // Reserve both metadata and filenames, including superseded versions and stale index entities.
  const usedIds = new Set(index.entities.map(entity => entity.id));
  for (const file of [...index.files, ...reservedFiles]) {
    const filenameId = file.path.match(/\/(ROUTE-\d+|QUEST-\d+)\.md$/)?.[1];
    if (filenameId) usedIds.add(filenameId);
    if (file.path.endsWith('.md')) {
      const { data } = parseFrontMatter(file.content, file.path);
      if (typeof data.id === 'string') usedIds.add(data.id);
    }
  }
  const routeId = allocateId('ROUTE', usedIds);
  const questIds = checked.lessons.map(() => allocateId('QUEST', usedIds));
  const assessment = assessCoursePackage(checked);
  const readiness = assessment.status === 'ready' ? '教学结构完整，事实与安全性仍需人工核查'
    : assessment.status === 'outline' ? '仅有大纲，尚无可跟做教案' : '教案不完整，需继续补充';
  const routeContent = [
    '---', 'schema: tech-os/v1', 'kind: route', `id: ${routeId}`, `title: ${JSON.stringify(checked.title)}`,
    `vision_id: ${visionId}`, 'status: backlog', 'main: false', 'source: manual', `origin_id: ${visionId}`,
    'reason: "用户提供的课程内容草稿；需人工核查并显式启用，不代表学习完成。"', `created: ${created}`,
    'quest_ids:', ...questIds.map(id => `  - ${id}`), 'route_seed_ids: []', 'tags:', '  - course-package', '---', '',
    '## 课程简介', '', checked.summary || '课程简介尚未填写。', '',
    '## 教案准备情况', '', readiness, '',
    '内容完整度仅检查教学结构，不证明知识正确、命令安全或学习者已经完成。', '',
    '## 路线链', '', ...checked.lessons.map((lesson, lessonIndex) => `${lessonIndex + 1}. ${questIds[lessonIndex]} · ${lesson.title}`), '',
    '## 启用前检查', '', '- 人工核对目标、工具、操作风险和参考来源。',
    '- 补齐缺失的教案后，通过路线生命周期操作决定是否启用。',
    '- 导入只新增 Backlog；现有主路线、任务状态和学习打卡保持不变。', '',
    '## 完成证据', '', '尚未形成。本课程包没有创建个人学习成果或实验记录。', '',
  ].join('\n');
  const files: TechOsSourceFile[] = [{ path: `tech-os/routes/backlog/${routeId}.md`, content: routeContent }];
  checked.lessons.forEach((lesson, lessonIndex) => {
    const id = questIds[lessonIndex];
    const title = /[?？]$/.test(lesson.title) ? lesson.title : `${lesson.title}？`;
    const lessonBody = lesson.body.trim() ? lesson.body
      : '## 教案待编写\n\n当前仅有课程大纲，尚无可跟做教案。请补充工具、操作、观察、排障、自测与参考答案后再开始辅导；不要把占位内容当作已完成的教学或学习证据。';
    files.push({
      path: `tech-os/quests/backlog/${id}.md`,
      content: [
        '---', 'schema: tech-os/v1', 'kind: quest', `id: ${id}`, `title: ${JSON.stringify(title)}`,
        `route_id: ${routeId}`, 'status: backlog', `order: ${lessonIndex + 1}`, `created: ${created}`,
        'question_ids: []', 'knowledge_ids: []', 'lab_ids: []', 'project_ids: []', 'tags:', '  - course-package', '---', '',
        '## 课程草稿说明', '',
        '以下是导入的教学材料，不是本人完成记录。示例结论、参考答案与实验结果均需独立核查；导入不表示任务已经开始或完成。', '',
        lessonBody, '',
        '## 导入备注', '', '个人学习证据尚未随导入形成；请学习后另行记录真实操作、观察与疑问。', '',
      ].join('\n'),
    });
  });
  for (const file of files) {
    if (merged.has(file.path)) throw new Error('新课程路径与现有文件冲突，已停止生成。');
  }
  assertValidFiles([...merged.values(), ...files], '新课程合并后的完整内容');
  return { key: `course-package:${routeId}`, routeId, questIds, files };
}

function validateCourseValue(value: unknown): CoursePackage {
  if (!hasExactKeys(value, ['version', 'title', 'summary', 'lessons'])) {
    throw new Error('课程包仅允许 version、title、summary、lessons；不接受路径、ID、状态或凭据字段。');
  }
  if (value.version !== 1) throw new Error('课程包 version 必须是数字 1。');
  const title = readText(value.title, '课程名称', 160, true, true);
  const summary = readText(value.summary, '课程简介', 4000);
  if (!Array.isArray(value.lessons) || value.lessons.length < 2 || value.lessons.length > 12) throw new Error('课程必须包含 2–12 节课。');
  const names = new Set<string>();
  const lessons = value.lessons.map((lesson: unknown, index) => {
    if (!hasExactKeys(lesson, ['title', 'body'])) throw new Error(`第 ${index + 1} 课仅允许 title、body；不接受路径、ID、状态或凭据字段。`);
    const lessonTitle = readText(lesson.title, `第 ${index + 1} 课名称`, 160, true, true);
    const canonicalName = lessonTitle.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').replace(/[?？。.!！]+$/, '').trim();
    if (!canonicalName || names.has(canonicalName)) throw new Error('课名不能为空或重复；请为每节课使用可区分的名称。');
    names.add(canonicalName);
    const body = readText(lesson.body, `第 ${index + 1} 课正文`, MAX_BODY_CHARS);
    rejectFrontMatter(body, index + 1);
    return { title: lessonTitle, body };
  });
  const result: CoursePackage = { version: 1, title, summary, lessons };
  assertPackageSize(JSON.stringify(result));
  return result;
}

function hasExactKeys(value: unknown, keys: string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const ownKeys = Object.keys(value);
  return ownKeys.length === keys.length && ownKeys.every(key => keys.includes(key));
}

function readText(value: unknown, label: string, max: number, required = false, singleLine = false): string {
  if (typeof value !== 'string') throw new Error(`${label}必须是字符串。`);
  if (value.length > max) throw new Error(`${label}超过 ${max} 字符限制。`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) || (singleLine && /[\r\n\u2028\u2029]/.test(value))) {
    throw new Error(`${label}包含不允许的控制字符或换行。`);
  }
  const normalized = value.replace(/\r\n?/g, '\n');
  // Preserve Markdown indentation and a user's in-progress trailing newline/space.
  const text = singleLine ? normalized.trim() : normalized;
  if (required && !text.trim()) throw new Error(`${label}不能为空。`);
  if (containsCredentials(text)) throw new Error(`${label}包含疑似真实凭据、私钥或带密码的 URL，请删除秘密后再导入。`);
  return text;
}

function containsCredentials(text: string): boolean {
  const distinctive = /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}|(?:AKIA|ASIA)[A-Z0-9]{16})\b/g;
  if ([...text.matchAll(distinctive)].some(match => !isPlaceholder(match[0]))) return true;
  if (/-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/.test(text)) return true;
  if (/https?:\/\/[^\s/?#@]+:[^\s/?#@]+@/i.test(text)) return true;
  const assigned = /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password|authorization)\b["']?\s*[:=]\s*["']?(?:Bearer\s+)?([A-Za-z0-9._~+/-]{24,}={0,2})/gi;
  const bearer = /\bBearer\s+([A-Za-z0-9._~+/-]{24,}={0,2})/g;
  return [...text.matchAll(assigned), ...text.matchAll(bearer)].some(match => !isPlaceholder(match[1]));
}

function isPlaceholder(value: string): boolean {
  const content = value.replace(/^(?:sk-(?:proj-|svcacct-)?|gh[pousr]_|github_pat_)/, '');
  return /^(?:your[_-]|replace[_-]|example(?:[_-]|$)|placeholder(?:[_-]|$)|dummy(?:[_-]|$)|changeme$|test[_-]key(?:[_-]|$)|x{5,}$|\.+$)/i.test(content);
}

function rejectFrontMatter(body: string, lesson: number): void {
  const content = body.trimStart();
  if (!/^---[ \t]*\n/.test(content)) return;
  const end = content.indexOf('\n---', 4);
  const header = end >= 0 ? content.slice(4, end) : content.slice(4);
  if (/^[ \t]*(?:[A-Za-z_][\w-]*|"[^"\n]+"|'[^'\n]+')\s*:/m.test(header)) {
    throw new Error(`第 ${lesson} 课正文包含篇首 Front Matter，请只保留 Markdown 教案正文；ID、状态与路径由系统分配。`);
  }
}

function assertPackageSize(text: string): void {
  if (encoder.encode(text).byteLength > MAX_PACKAGE_BYTES) throw new Error('课程包 UTF-8 总大小超过 512 KiB，请拆分课程。');
}

function assertDate(created: string): void {
  if (typeof created !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(created)) throw new Error('创建日期必须是有效的 YYYY-MM-DD。');
  const time = Date.parse(`${created}T00:00:00.000Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== created) throw new Error('创建日期必须是有效的 YYYY-MM-DD。');
}

function mergeReservedFiles(baseline: TechOsSourceFile[], reserved: TechOsSourceFile[]): Map<string, TechOsSourceFile> {
  const files = new Map<string, TechOsSourceFile>();
  for (const file of baseline) {
    if (files.has(file.path)) throw new Error('现有索引含重复路径，请先修复索引。');
    files.set(file.path, file);
  }
  const pending = new Map<string, string>();
  for (const file of reserved) {
    if (pending.has(file.path) && pending.get(file.path) !== file.content) throw new Error('暂存草稿同一路径有不同内容，请先解决冲突。');
    pending.set(file.path, file.content);
    files.set(file.path, file);
  }
  return files;
}

function allocateId(prefix: 'ROUTE' | 'QUEST', usedIds: Set<string>): string {
  let largest = '0';
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  for (const id of usedIds) {
    const match = id.match(pattern);
    if (!match) continue;
    const digits = match[1].replace(/^0+(?=\d)/, '');
    if (digits.length > largest.length || (digits.length === largest.length && digits > largest)) largest = digits;
  }
  // Decimal string arithmetic avoids both Number precision loss and BigInt browser/build requirements.
  const digits = largest.split('');
  let offset = digits.length - 1;
  while (offset >= 0 && digits[offset] === '9') { digits[offset] = '0'; offset -= 1; }
  if (offset < 0) digits.unshift('1');
  else digits[offset] = String(Number(digits[offset]) + 1);
  const id = `${prefix}-${digits.join('').padStart(3, '0')}`;
  usedIds.add(id);
  return id;
}

function assertValidFiles(files: TechOsSourceFile[], label: string): void {
  const validation = validateTechOsDraftFiles(files);
  if (!validation.valid) throw new Error(`${label}未通过结构校验：${validation.errors.slice(0, 4).join('；')}`);
}

/** JSON.parse accepts duplicate keys; reject them explicitly, including escaped-key aliases. */
function rejectDuplicateJsonKeys(source: string): void {
  let offset = 0;
  const whitespace = () => { while (/\s/.test(source[offset] || '') && offset < source.length) offset += 1; };
  const string = (): string => {
    const start = offset++;
    while (offset < source.length) {
      if (source[offset] === '\\') { offset += 2; continue; }
      if (source[offset++] === '"') break;
    }
    return JSON.parse(source.slice(start, offset)) as string;
  };
  const value = (depth: number): void => {
    if (depth > 32) throw new Error('课程包 JSON 嵌套过深。');
    whitespace();
    if (source[offset] === '{') {
      offset += 1; whitespace();
      const keys = new Set<string>();
      if (source[offset] === '}') { offset += 1; return; }
      for (;;) {
        whitespace();
        const key = string();
        if (keys.has(key)) throw new Error('课程包 JSON 包含重复字段，请保留每个字段唯一的值。');
        keys.add(key); whitespace(); offset += 1; value(depth + 1); whitespace();
        if (source[offset++] === '}') return;
      }
    }
    if (source[offset] === '[') {
      offset += 1; whitespace();
      if (source[offset] === ']') { offset += 1; return; }
      for (;;) { value(depth + 1); whitespace(); if (source[offset++] === ']') return; }
    }
    if (source[offset] === '"') { string(); return; }
    while (offset < source.length && !/[\s,}\]]/.test(source[offset])) offset += 1;
  };
  value(0);
}
