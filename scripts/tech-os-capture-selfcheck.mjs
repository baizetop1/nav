import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTechOs } from './check-tech-os.mjs';
import { createInboxItem, inboxItemToMarkdown, parseInboxStore } from '../src/services/inbox.ts';
import { applyTechOsCaptureKind, createTechOsCaptureDraft, getTechOsCaptureKind, getVisibleInboxTags, inboxItemIdToTechOsId } from '../src/services/techOsCapture.ts';
import { validateTechOsDraftFiles } from '../src/services/techOsDraftValidation.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = JSON.parse(fs.readFileSync(path.join(root, 'src/generated/tech-os-index.json'), 'utf8'));
const now = new Date('2026-08-24T03:04:05.000Z');
const sourceId = '123e4567-e89b-12d3-a456-426614174000';

const questionDraft = applyTechOsCaptureKind({ type: 'text', title: 'DNS 为什么需要递归查询？', content: '想弄清递归与迭代查询的边界。', tags: ['dns'] }, 'question');
assert.equal(questionDraft.type, 'text');
assert.deepEqual(questionDraft.tags, ['dns', 'tech-os/question']);
const questionItem = createInboxItem(questionDraft, { id: sourceId, now });
assert.equal(getTechOsCaptureKind(questionItem), 'question');
assert.deepEqual(getVisibleInboxTags(questionItem.tags), ['dns']);
assert.equal(parseInboxStore({ version: 1, updatedAt: now.toISOString(), items: [questionItem] })?.version, 1, 'T3 不升级 Inbox schema');

const capture = createTechOsCaptureDraft(questionItem);
assert.equal(capture.inboxItemId, sourceId);
assert.equal(capture.techOsId, inboxItemIdToTechOsId(sourceId));
assert.match(capture.techOsId, /^INBOX-\d{20}$/);
assert.equal(capture.file.path, `tech-os/inbox/${capture.techOsId}.md`);
assert.match(capture.file.content, new RegExp(`source_inbox_id: "${sourceId}"`));
assert.match(capture.file.content, /capture_type: question/);
assert.match(capture.file.content, /## 处理决定/);
assert.equal(createTechOsCaptureDraft(questionItem).file.content, capture.file.content, '同一 Inbox ID 必须生成稳定草稿');

const validation = validateTechOsDraftFiles([...index.files, capture.file]);
assert.equal(validation.valid, true, validation.errors.join('\n'));
assert.equal(validation.entityCount, index.entities.length + 1);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tech-os-capture-'));
try {
  fs.cpSync(path.join(root, 'tech-os'), path.join(tempRoot, 'tech-os'), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, capture.file.path), capture.file.content);
  assert.equal(validateTechOs(tempRoot).counts['inbox-item'], 1, 'Node 校验器必须接受 Adapter 草稿');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

const invalidCapture = { ...capture.file, content: capture.file.content.replace('capture_type: question', 'capture_type: auto-route') };
assert.equal(validateTechOsDraftFiles([...index.files, invalidCapture]).valid, false, '未知 Capture 类型必须被拒绝');

const linkDraft = applyTechOsCaptureKind({ type: 'text', content: '稍后验证', url: 'https://example.com/', tags: ['web', 'tech-os/note'] }, 'link');
assert.equal(linkDraft.type, 'link');
assert.deepEqual(linkDraft.tags, ['web', 'tech-os/link']);
const linkItem = createInboxItem(linkDraft, { id: '223e4567-e89b-12d3-a456-426614174001', now });
assert.equal(getTechOsCaptureKind(linkItem), 'link');
assert.match(createTechOsCaptureDraft(linkItem).file.content, /https:\/\/example\.com\//);

const legacyItem = createInboxItem({ type: 'text', content: '旧记录', tags: [] }, { id: 'legacy-item', now });
assert.equal(getTechOsCaptureKind(legacyItem), 'note', '旧文本默认按 Note 展示但不迁移 schema');
const copied = inboxItemToMarkdown(questionItem);
assert.match(copied, /#dns/);
assert.doesNotMatch(copied, /tech-os\/question/, '内部类型标签不进入复制 Markdown');

assert.throws(() => createTechOsCaptureDraft({ ...questionItem, status: 'archived' }), /只能处理/);
assert.throws(() => createTechOsCaptureDraft({ ...questionItem, deletedAt: now.toISOString() }), /只能处理/);

console.log('Tech OS capture adapter self-check passed');
