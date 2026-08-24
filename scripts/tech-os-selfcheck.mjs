import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findTechOsProjectRoot, inspectTechOs, validateTechOs } from './check-tech-os.mjs';

const projectRoot = findTechOsProjectRoot();
const report = validateTechOs(projectRoot);
assert.equal(report.counts.vision, 1);
assert.equal(report.counts.route, 1);
assert.equal(report.counts.quest, 8);
assert.equal(report.counts.question, 2);
assert.equal(report.counts['route-seed'], 1);
assert.equal(report.counts['route-review'] || 0, 0);
assert.equal(report.counts.knowledge, 1);
assert.equal(report.counts.lab, 1);
assert.equal(report.counts.project, 1);
assert.equal(report.counts['tech-map'], 1);

withFixture((root) => {
  fs.copyFileSync(path.join(root, 'tech-os', 'questions', 'QUESTION-001.md'), path.join(root, 'tech-os', 'questions', 'DUPLICATE.md'));
  assert.match(inspectTechOs(root).errors.join('\n'), /ID 重复：QUESTION-001/);
});

withFixture((root) => {
  const source = read(root, 'tech-os/routes/active/ROUTE-001.md').replace('id: ROUTE-001', 'id: ROUTE-999').replace('title: 从输入网址到网页显示', 'title: 第二条错误主路线');
  write(root, 'tech-os/routes/active/ROUTE-999.md', source);
  assert.match(inspectTechOs(root).errors.join('\n'), /恰好有一条 Active Main Route/);
});

withFixture((root) => {
  const target = 'tech-os/routes/seeds/RS-001.md';
  write(root, target, read(root, target).replace('  - QUESTION-002', '  - QUESTION-999'));
  assert.match(inspectTechOs(root).errors.join('\n'), /引用了不存在的 ID：QUESTION-999/);
});

withFixture((root) => {
  const target = 'tech-os/knowledge/internet/KNOWLEDGE-001.md';
  write(root, target, read(root, target).replace('level: L0', 'level: L2'));
  assert.match(inspectTechOs(root).errors.join('\n'), /L2 必须提供 evidence_ids/);
});

withFixture((root) => {
  const target = 'tech-os/quests/active/QUEST-001.md';
  write(root, target, read(root, target).replace('title: 浏览器如何把一次导航拆成网络请求？', 'title: 浏览器导航章节'));
  assert.match(inspectTechOs(root).errors.join('\n'), /Quest 标题必须是问题/);
});

withFixture((root) => {
  const target = 'tech-os/state.yml';
  write(root, target, read(root, target).replace('current_quest_id: QUEST-001', 'current_quest_id: QUEST-003'));
  assert.match(inspectTechOs(root).errors.join('\n'), /current_quest_id 必须指向 Active Quest/);
});

console.log('Tech OS self-check passed');

function withFixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'baize-tech-os-'));
  try {
    fs.cpSync(path.join(projectRoot, 'tech-os'), path.join(root, 'tech-os'), { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), '{}\n');
    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function read(root, relative) {
  return fs.readFileSync(path.join(root, ...relative.split('/')), 'utf8');
}

function write(root, relative, value) {
  fs.writeFileSync(path.join(root, ...relative.split('/')), value, 'utf8');
}
