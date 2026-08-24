import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { commitTechOsFiles, diffTechOsFiles, isManagedTechOsPath, readTechOsRepository } from '../src/services/techOsRepository.ts';
import { validateTechOsDraftFiles } from '../src/services/techOsDraftValidation.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const token = 'github_pat_123456789012345678901234567890';
const target = { owner: 'baizetop1', repo: 'nav', branch: 'main' };
const headSha = 'a'.repeat(40);
const treeSha = 'b'.repeat(40);
const stateContent = fs.readFileSync(path.join(root, 'tech-os', 'state.yml'), 'utf8');
const visionContent = fs.readFileSync(path.join(root, 'tech-os', 'vision', 'VISION-001.md'), 'utf8');

assert.equal(isManagedTechOsPath('tech-os/state.yml'), true);
assert.equal(isManagedTechOsPath('tech-os/vision/VISION-001.md'), true);
assert.equal(isManagedTechOsPath('src/data/sites.json'), false);
assert.equal(isManagedTechOsPath('tech-os/../src/App.tsx'), false);
assert.equal(isManagedTechOsPath('tech-os/templates/vision.md'), false);

assert.deepEqual(diffTechOsFiles(
  [{ path: 'tech-os/a.md', content: 'same\n' }, { path: 'tech-os/b.md', content: 'local\n' }, { path: 'tech-os/c.md', content: 'only local\n' }],
  [{ path: 'tech-os/a.md', content: 'same\r\n' }, { path: 'tech-os/b.md', content: 'remote\n' }, { path: 'tech-os/d.md', content: 'only remote\n' }],
).map(item => [item.path, item.status]), [
  ['tech-os/a.md', 'same'], ['tech-os/b.md', 'modified'], ['tech-os/c.md', 'local-only'], ['tech-os/d.md', 'remote-only'],
]);

const readCalls = [];
const snapshot = await readTechOsRepository(target, token, async (url, init = {}) => {
  readCalls.push({ url: String(url), method: init.method || 'GET' });
  const pathname = new URL(String(url)).pathname;
  if (pathname.endsWith('/git/ref/heads/main')) return json({ object: { sha: headSha } });
  if (pathname.endsWith(`/git/commits/${headSha}`)) return json({ sha: headSha, tree: { sha: treeSha } });
  if (pathname.endsWith(`/git/trees/${treeSha}`)) return json({ truncated: false, tree: [
    { path: 'tech-os/state.yml', mode: '100644', type: 'blob', sha: 'c'.repeat(40), size: stateContent.length },
    { path: 'tech-os/vision/VISION-001.md', mode: '100644', type: 'blob', sha: 'd'.repeat(40), size: visionContent.length },
    { path: 'tech-os/templates/vision.md', mode: '100644', type: 'blob', sha: 'e'.repeat(40), size: 20 },
    { path: 'src/App.tsx', mode: '100644', type: 'blob', sha: 'f'.repeat(40), size: 20 },
  ] });
  if (pathname.endsWith(`/git/blobs/${'c'.repeat(40)}`)) return json(blob('c'.repeat(40), stateContent));
  if (pathname.endsWith(`/git/blobs/${'d'.repeat(40)}`)) return json(blob('d'.repeat(40), visionContent));
  return json({ message: 'unexpected' }, 500);
});
assert.equal(snapshot.headSha, headSha);
assert.deepEqual(snapshot.files.map(file => file.path), ['tech-os/state.yml', 'tech-os/vision/VISION-001.md']);
assert.equal(readCalls.filter(call => call.url.includes('/git/blobs/')).length, 2);

const commitCalls = [];
let blobIndex = 0;
const commitResult = await commitTechOsFiles(target, token, headSha, [
  { path: 'tech-os/state.yml', content: stateContent },
  { path: 'tech-os/vision/VISION-001.md', content: `${visionContent.trim()}\n` },
], 'Update Tech OS from workstation', async (url, init = {}) => {
  const call = { url: String(url), method: init.method || 'GET', body: init.body ? JSON.parse(String(init.body)) : null };
  commitCalls.push(call);
  const pathname = new URL(String(url)).pathname;
  if (call.method === 'GET' && pathname.endsWith('/git/ref/heads/main')) return json({ object: { sha: headSha } });
  if (call.method === 'GET' && pathname.endsWith(`/git/commits/${headSha}`)) return json({ sha: headSha, tree: { sha: treeSha } });
  if (call.method === 'POST' && pathname.endsWith('/git/blobs')) return json({ sha: (blobIndex++ ? '2' : '1').repeat(40) });
  if (call.method === 'POST' && pathname.endsWith('/git/trees')) return json({ sha: '3'.repeat(40) });
  if (call.method === 'POST' && pathname.endsWith('/git/commits')) return json({ sha: '4'.repeat(40), tree: { sha: '3'.repeat(40) }, html_url: 'https://github.com/baizetop1/nav/commit/test' });
  if (call.method === 'PATCH' && pathname.endsWith('/git/refs/heads/main')) return json({ object: { sha: '4'.repeat(40) } });
  return json({ message: 'unexpected' }, 500);
});
assert.equal(commitResult.changedPaths.length, 2);
assert.equal(commitCalls.filter(call => call.method === 'PATCH').length, 1);
assert.equal(commitCalls.find(call => call.method === 'PATCH').body.force, false);
assert.equal(commitCalls.find(call => call.method === 'POST' && call.url.endsWith('/git/trees')).body.base_tree, treeSha);

let writesAfterConflict = 0;
await assert.rejects(
  () => commitTechOsFiles(target, token, headSha, [{ path: 'tech-os/state.yml', content: stateContent }], 'Conflict test', async (_url, init = {}) => {
    if (init.method && init.method !== 'GET') writesAfterConflict += 1;
    return json({ object: { sha: '9'.repeat(40) } });
  }),
  /TECH_OS_CONFLICT/,
);
assert.equal(writesAfterConflict, 0);

await assert.rejects(
  () => commitTechOsFiles(target, token, headSha, [{ path: 'src/App.tsx', content: 'bad' }], 'Bad path', async () => json({})),
  /不允许写入/,
);

const bundledFiles = [
  { path: 'tech-os/state.yml', content: stateContent },
  ...findEntityFiles(path.join(root, 'tech-os')).map(file => ({ path: path.relative(root, file).split(path.sep).join('/'), content: fs.readFileSync(file, 'utf8') })),
];
assert.equal(validateTechOsDraftFiles(bundledFiles).valid, true);
const invalidQuest = bundledFiles.map(file => file.path.endsWith('QUEST-001.md') ? { ...file, content: file.content.replace('浏览器如何把一次导航拆成网络请求？', '浏览器导航章节') } : file);
assert.match(validateTechOsDraftFiles(invalidQuest).errors.join('\n'), /Quest 标题必须以问号结尾/);
const missingRouteField = bundledFiles.map(file => file.path.endsWith('ROUTE-001.md') ? { ...file, content: file.content.replace(/^reason:.*\r?\n/m, '') } : file);
assert.match(validateTechOsDraftFiles(missingRouteField).errors.join('\n'), /缺少字段 reason/);

console.log('Tech OS repository adapter self-check passed');

function findEntityFiles(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const targetPath = path.join(folder, entry.name);
    if (entry.isDirectory()) return entry.name === 'templates' ? [] : findEntityFiles(targetPath);
    return entry.name.toLowerCase() !== 'readme.md' && entry.name.endsWith('.md') ? [targetPath] : [];
  });
}

function blob(sha, content) {
  return { sha, content: Buffer.from(content, 'utf8').toString('base64'), encoding: 'base64', size: Buffer.byteLength(content) };
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
}
