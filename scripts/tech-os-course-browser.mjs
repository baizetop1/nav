import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.BAIZE_PLAYWRIGHT_PATH || 'playwright');
const appUrl = new URL(process.env.BAIZE_APP_URL || 'http://127.0.0.1:5189/nav/');
appUrl.hash = '/tech-os';
const origin = appUrl.origin;
const output = new URL('../artifacts/tech-os-course/', import.meta.url);
const index = JSON.parse(await readFile(new URL('../src/generated/tech-os-index.json', import.meta.url), 'utf8'));
const authored = index.entities.find(entity => entity.id === 'QUEST-002');
assert.ok(authored?.body.includes('#### 参考答案'), 'use an authored, complete lesson fixture');
const testKey = 'readonlysecret'; // Deliberately fictional; never use a real credential in this test.
const privateMarker = 'COURSE_TEST_PRIVATE_CONTENT_DO_NOT_SEND';
const courseOutline = {
  version: 1, title: '模拟 AI 网络入门', summary: '学习地址与请求的区别。',
  lessons: [{ title: '浏览器如何解释地址？', body: '' }, { title: '如何观察一次请求？', body: '' }],
};
const importedCourse = {
  ...courseOutline, title: '导入的完整网络课程',
  lessons: courseOutline.lessons.map(lesson => ({ ...lesson, body: authored.body })),
};
const errors = [];
let workingCopyStorageKey = '';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BAIZE_BROWSER_CHANNEL || 'msedge', headless: true });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const responseJson = content => JSON.stringify({ choices: [{ finish_reason: 'stop', message: { role: 'assistant', content } }], usage: { prompt_tokens: 120, completion_tokens: 340, total_tokens: 460 } });

async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert.ok(dimensions.page <= dimensions.viewport, `${label}: horizontal overflow ${JSON.stringify(dimensions)}`);
}
async function noPersistedKey(page) {
  const leaked = await page.evaluate(key => {
    const values = storage => Array.from({ length: storage.length }, (_, i) => storage.key(i)).map(name => `${name}:${storage.getItem(name)}`);
    return [...values(localStorage), ...values(sessionStorage), ...(window.__courseStorageWrites || [])].some(value => value.includes(key));
  }, testKey);
  assert.equal(leaked, false, 'API key must never enter local/session storage, even transiently');
}
async function navigate(page, name) {
  await page.locator('#tech-os-sidebar').waitFor({ state: 'attached' });
  const item = page.getByRole('navigation', { name: 'Tech OS 工作台', exact: true }).getByRole('button', { name, exact: true });
  if (!await item.isVisible()) await page.getByRole('button', { name: '打开 Tech OS 导航', exact: true }).click();
  await item.click();
}

try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block', acceptDownloads: true });
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    const queue = [], calls = [], unexpected = [], releaseGates = [];
    const cors = { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'authorization, content-type', 'content-type': 'application/json' };
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === origin) return route.continue();
      // This fictional hostname is handled locally. Never fall through to a real API.
      if (url.origin !== 'https://ai.example.test') return route.abort();
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      calls.push({ url: request.url(), method: request.method(), headers: request.headers(), body: request.postData() || '' });
      const next = queue.shift();
      if (!next) { unexpected.push('AI request without an explicit test response'); return route.fulfill({ status: 500, headers: cors, body: '{}' }); }
      next.started?.resolve();
      if (next.gate) await next.gate.promise;
      try { await route.fulfill({ status: next.status || 200, headers: cors, body: next.status ? '{"error":"private-server-diagnostic"}' : responseJson(next.content) }); }
      catch (cause) { if (!next.allowAbort) unexpected.push(`Mock delivery failed: ${cause.message}`); }
      finally { next.finished?.resolve(); }
    });
    await context.addInitScript(({ marker, allowedOrigin }) => {
      if (location.origin !== allowedOrigin) return;
      localStorage.setItem('course_browser_private_fixture', marker);
      window.__courseStorageWrites = [];
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        window.__courseStorageWrites.push(`${key}:${value}`);
        if (window.__courseQuotaFailure && key.startsWith('baize_tech_os_drafts_v1:')) throw new DOMException('Test quota failure', 'QuotaExceededError');
        return original.call(this, key, value);
      };
      const originalFileText = File.prototype.text;
      File.prototype.text = async function () {
        const result = await originalFileText.call(this);
        if (window.__delayCourseFileText && this.name === 'late-course.json') {
          window.__courseDelayedFileStarted = true;
          await new Promise(resolve => { window.__releaseCourseFileText = resolve; });
          window.__courseDelayedFileReleased = true;
        }
        return result;
      };
    }, { marker: privateMarker, allowedOrigin: origin });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    page.on('dialog', dialog => void dialog.accept());
    try {
      await page.goto(appUrl.href);
      await navigate(page, '新方向 / AI 课程');
      const wizard = page.getByRole('region', { name: '新方向课程向导', exact: true });
      const json = wizard.locator('textarea[aria-label="课程 JSON 原文"]');
      const title = wizard.getByRole('textbox', { name: '课程路线名称', exact: true });
      const body = wizard.getByRole('textbox', { name: '本课 Markdown 教案', exact: true });
      const consent = wizard.getByRole('checkbox', { name: /我确认目标地址可信/ });
      const apiKeyInput = wizard.locator('input[aria-label="AI API Key"]');
      const generateOutline = wizard.getByRole('button', { name: 'AI 生成路线大纲', exact: true });
      const generateLesson = wizard.getByRole('button', { name: 'AI 生成所选课教案', exact: true });
      const waitTitle = async value => page.waitForFunction(expected => document.querySelector('[aria-label="课程路线名称"]')?.value === expected, value);
      const waitBody = async value => page.waitForFunction(expected => document.querySelector('[aria-label="本课 Markdown 教案"]')?.value === expected, value);
      const originalStudy = await page.evaluate(() => localStorage.getItem('baize_tech_os_study_progress_v1'));
      assert.equal(await json.isVisible(), true, 'empty JSON editor must be immediately usable');
      assert.equal(await json.inputValue(), '');
      await wizard.getByRole('textbox', { name: '学习主题', exact: true }).fill('网络与浏览器');
      await wizard.getByRole('textbox', { name: '已有基础', exact: true }).fill('只会打开浏览器');
      await wizard.getByRole('textbox', { name: '希望做到什么', exact: true }).fill('独立观察和解释文档请求');
      await wizard.getByRole('textbox', { name: '可用时间', exact: true }).fill('每天二十分钟');
      await wizard.getByRole('textbox', { name: '设备与工具条件', exact: true }).fill('Windows 和 Edge');
      await wizard.getByRole('button', { name: '先建立本地大纲（不调用 AI）', exact: true }).click();
      await title.waitFor();
      const local = JSON.parse(await json.inputValue());
      assert.ok(local.lessons.length >= 2 && local.lessons.every(lesson => lesson.body === ''));
      assert.equal(calls.length, 0, 'local outline never makes an AI request');

      // Editing buffers must tolerate temporarily invalid titles and preserve typing.
      await title.fill('');
      assert.equal(await title.isVisible(), true, 'clearing a title cannot unmount the editor');
      await title.fill('重输后的课程名称');
      const question = wizard.getByRole('textbox', { name: '本课问题', exact: true });
      await question.fill('');
      assert.equal(await question.isVisible(), true);
      await question.fill('如何验证地址变化？');
      await body.fill('## 开始前');
      await body.press('Control+End');
      await body.press('Enter');
      assert.equal(await body.inputValue(), '## 开始前\n', 'trailing newline survives a keystroke');
      await body.pressSequentially('先做预测');
      await body.press('Space');
      assert.equal(await body.inputValue(), '## 开始前\n先做预测 ', 'trailing space is not trimmed during editing');
      assert.equal(await body.evaluate(element => document.activeElement === element), true, 'typing retains focus');

      await wizard.getByRole('textbox', { name: 'AI 接口地址', exact: true }).fill('https://ai.example.test/v1');
      await wizard.getByRole('textbox', { name: 'AI 模型 ID', exact: true }).fill('mock-course-model');
      await apiKeyInput.fill(testKey);
      assert.equal(await apiKeyInput.getAttribute('type'), 'password');
      await wizard.getByRole('combobox', { name: 'AI 生成范围', exact: true }).selectOption('outline');
      assert.equal(await generateOutline.isEnabled(), false);
      await consent.check();
      await wizard.getByRole('textbox', { name: 'AI 接口地址', exact: true }).fill('https://ai.example.test/other/v1');
      assert.equal(await consent.isChecked(), false, 'consent is invalidated when the destination changes');
      assert.equal(await generateOutline.isEnabled(), false);
      await wizard.getByRole('textbox', { name: 'AI 接口地址', exact: true }).fill('https://ai.example.test/v1');
      await consent.check();
      queue.push({ content: JSON.stringify(courseOutline) });
      await generateOutline.click();
      await waitTitle(courseOutline.title);
      assert.equal(await body.inputValue(), '');
      assert.equal(await consent.isChecked(), false, 'a new request requires fresh consent after content changes');
      assert.equal(calls.length, 1);

      queue.push({ content: authored.body });
      await consent.check();
      await generateLesson.click();
      await waitBody(authored.body.trim());
      const completedOne = JSON.parse(await json.inputValue());
      assert.equal(completedOne.lessons[1].body, '', 'generating one lesson leaves other lessons untouched');
      assert.match(await wizard.innerText(), /1\/2 课教学结构齐全/);
      assert.equal(calls.length, 2);
      await noPersistedKey(page);

      const downloadEvent = page.waitForEvent('download');
      await wizard.getByRole('button', { name: '下载课程包', exact: true }).click();
      const download = await downloadEvent;
      const chunks = [];
      for await (const chunk of await download.createReadStream()) chunks.push(chunk);
      const exported = Buffer.concat(chunks).toString('utf8');
      assert.equal(exported.includes(testKey), false);
      assert.deepEqual(Object.keys(JSON.parse(exported)).sort(), ['lessons', 'summary', 'title', 'version']);

      const beforeFailure = await json.inputValue();
      queue.push({ status: 401 });
      await consent.check();
      await generateLesson.click();
      await wizard.getByRole('alert').filter({ hasText: '鉴权失败' }).waitFor();
      assert.equal(await json.inputValue(), beforeFailure, 'API failure preserves the entire existing draft');
      assert.equal((await wizard.innerText()).includes('private-server-diagnostic'), false, 'server error bodies are not echoed');
      assert.equal(calls.length, 3, 'failure is not retried automatically');

      const gate = deferred(), started = deferred(), finished = deferred();
      releaseGates.push(gate);
      queue.push({ content: '迟到结果不应覆盖取消后的编辑', gate, started, finished, allowAbort: true });
      await consent.check();
      await generateLesson.click();
      await started.promise;
      assert.equal(await body.isDisabled(), true);
      await wizard.getByRole('button', { name: '取消生成', exact: true }).click();
      await wizard.getByRole('alert').filter({ hasText: '取消' }).waitFor();
      assert.equal(await json.inputValue(), beforeFailure);
      const afterCancel = authored.body.trim() + '\n\n取消后保留的新输入。';
      await body.fill(afterCancel);
      gate.resolve();
      await finished.promise;
      await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
      assert.equal(await body.inputValue(), afterCancel, 'a canceled request cannot overwrite newer input');

      // Escaped JSON can hide the same key from a raw-response substring check.
      await wizard.getByRole('combobox', { name: 'AI 生成范围', exact: true }).selectOption('outline');
      const unicodeKey = [...testKey].map(character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`).join('');
      const escapedEcho = JSON.stringify({ ...courseOutline, summary: testKey }).replace(testKey, unicodeKey);
      assert.equal(escapedEcho.includes(testKey), false);
      const beforeEcho = await json.inputValue();
      queue.push({ content: escapedEcho });
      await consent.check();
      await generateOutline.click();
      await wizard.getByRole('alert').filter({ hasText: /密钥|凭据/ }).waitFor();
      assert.equal(await json.inputValue(), beforeEcho, 'decoded credential echoes never enter the course');
      await noPersistedKey(page);

      const fileInput = wizard.locator('input[type="file"][aria-label="选择课程 JSON 文件"]');
      await fileInput.setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{"broken":') });
      await wizard.getByRole('alert').filter({ hasText: /JSON/ }).waitFor();
      assert.equal(await json.inputValue(), beforeEcho, 'invalid imports preserve the current course');
      await fileInput.setInputFiles({ name: 'complete-course.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(importedCourse)) });
      await waitTitle(importedCourse.title);
      assert.match(await wizard.innerText(), /2\/2 课教学结构齐全/);
      assert.equal(calls.length, 5, 'file import is entirely local');

      // A file read can finish after the component has unmounted and reopened.
      await page.evaluate(() => { window.__delayCourseFileText = true; });
      await fileInput.setInputFiles({ name: 'late-course.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...importedCourse, title: '过期导入不能覆盖的新课程' })) });
      await page.waitForFunction(() => window.__courseDelayedFileStarted);
      await navigate(page, '总览');
      await navigate(page, '新方向 / AI 课程');
      await title.fill('离开导入后手动编辑的课程');
      const afterImportNavigation = await json.inputValue();
      await page.evaluate(() => window.__releaseCourseFileText());
      await page.waitForFunction(() => window.__courseDelayedFileReleased);
      await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
      assert.equal(await json.inputValue(), afterImportNavigation, 'late file read from an unmounted wizard cannot overwrite a newer session edit');
      assert.equal(await apiKeyInput.inputValue(), '', 'navigation releases API key memory, not the course draft');
      await noOverflow(page, `course editor ${width}px`);
      await wizard.getByRole('combobox', { name: '选择课程', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: fileURLToPath(new URL(`course-${width}.png`, output)) });

      const staging = wizard.getByRole('region', { name: '确认课程草稿', exact: true });
      const stage = staging.getByRole('button', { name: '加入 Repository 草稿', exact: true });
      const reviewed = staging.getByRole('checkbox');
      const confirmation = staging.getByRole('textbox', { name: '确认加入课程草稿', exact: true });
      const target = (await confirmation.getAttribute('placeholder')).match(/STAGE ROUTE-\d+/)?.[0];
      assert.ok(target);
      assert.equal(await stage.isEnabled(), false);
      await reviewed.check();
      await confirmation.fill('STAGE WRONG');
      assert.equal(await stage.isEnabled(), false);
      await confirmation.fill(target);
      assert.equal(await stage.isEnabled(), true);
      await wizard.getByRole('textbox', { name: '课程路线简介', exact: true }).fill('导入后经本机人工整理的课程简介。');
      assert.equal(await reviewed.isChecked(), false, 'content edits invalidate the previous stage review');
      assert.equal(await confirmation.inputValue(), '');
      await reviewed.check();
      await confirmation.fill(target);

      // Failed local persistence must never clear the only recoverable course.
      const beforeQuotaFailure = await json.inputValue();
      await page.evaluate(() => { window.__courseQuotaFailure = true; });
      await stage.click();
      await wizard.getByRole('alert').filter({ hasText: /保存|存储|空间/ }).waitFor();
      assert.equal(await wizard.isVisible(), true, 'a failed save must stay in the wizard');
      assert.equal(await json.inputValue(), beforeQuotaFailure, 'quota failure preserves the session JSON');
      assert.equal(await page.getByRole('heading', { name: 'Repository Adapter', exact: true }).count(), 0);
      const recoveryEvent = page.waitForEvent('download');
      await wizard.getByRole('button', { name: '下载课程包', exact: true }).click();
      const recoveryDownload = await recoveryEvent;
      const recoveryChunks = [];
      for await (const chunk of await recoveryDownload.createReadStream()) recoveryChunks.push(chunk);
      assert.equal(JSON.parse(Buffer.concat(recoveryChunks).toString('utf8')).title, '离开导入后手动编辑的课程');
      await page.evaluate(() => { window.__courseQuotaFailure = false; });
      await stage.click();
      await page.getByRole('heading', { name: 'Repository Adapter', exact: true }).waitFor();
      const routeId = target.slice('STAGE '.length);
      await page.waitForFunction(id => Object.keys(localStorage).some(key => key.startsWith('baize_tech_os_drafts_v1:') && JSON.parse(localStorage.getItem(key)).files?.some(file => file.path === `tech-os/routes/backlog/${id}.md`)), routeId);
      const copy = await page.evaluate(id => Object.keys(localStorage).filter(key => key.startsWith('baize_tech_os_drafts_v1:')).map(key => JSON.parse(localStorage.getItem(key))).find(value => value.files?.some(file => file.path === `tech-os/routes/backlog/${id}.md`)), routeId);
      workingCopyStorageKey = await page.evaluate(id => Object.keys(localStorage).find(key => key.startsWith('baize_tech_os_drafts_v1:') && JSON.parse(localStorage.getItem(key)).files?.some(file => file.path === `tech-os/routes/backlog/${id}.md`)), routeId);
      const files = new Map(copy.files.map(file => [file.path, file.content]));
      for (const original of index.files) assert.equal(files.get(original.path), original.content.replace(/\r\n/g, '\n'), `staging preserves existing ${original.path}`);
      const existing = new Set(index.files.map(file => file.path));
      const added = copy.files.filter(file => !existing.has(file.path));
      assert.equal(added.length, 3, 'stage adds exactly one route and two quests');
      assert.ok(added.every(file => /\nstatus: backlog\n/.test(file.content)));
      assert.equal(await page.evaluate(() => localStorage.getItem('baize_tech_os_study_progress_v1')), originalStudy, 'importing lessons does not complete study steps');
      await noPersistedKey(page);
      await noOverflow(page, `repository ${width}px`);
      assert.equal(calls.length, 5, 'staging never invokes GitHub or another AI request');
      for (const call of calls) {
        assert.equal(call.url, 'https://ai.example.test/v1/chat/completions');
        assert.equal(call.method, 'POST');
        assert.equal(call.headers.authorization, `Bearer ${testKey}`);
        assert.equal(call.body.includes(testKey), false, 'key is only in Authorization, never prompts');
        assert.equal(call.body.includes(privateMarker), false, 'unrelated local storage is never sent');
        assert.equal(JSON.parse(call.body).stream, false);
      }
      assert.deepEqual(unexpected, []);
      assert.equal(queue.length, 0);
      await navigate(page, '新方向 / AI 课程');
      assert.equal(await apiKeyInput.inputValue(), '', 'leaving the wizard releases its key state');
      assert.equal(await json.inputValue(), '', 'staged content is no longer an unsaved wizard session');
      console.log(`Tech OS course wizard passed at ${width}px: local/AI outlines, single lesson, consent, failures, cancel, encoded key rejection, editing, late import, quota recovery and isolated backlog staging.`);
    } finally {
      for (const gate of releaseGates) gate.resolve();
      await context.close();
    }
  }

  // A restored working copy is authoritative: bundled, superseded paths must not
  // be merged back in when a lifecycle transition has already moved a Quest.
  assert.ok(workingCopyStorageKey);
  const baselineFiles = index.files.map(file => ({ ...file, content: file.content.replace(/\r\n/g, '\n') }));
  const relocatedFiles = baselineFiles.map(file => {
    if (file.path === 'tech-os/quests/active/QUEST-001.md') return { path: 'tech-os/quests/completed/QUEST-001.md', content: file.content.replace(/^status: active$/m, 'status: completed') };
    if (file.path === 'tech-os/quests/backlog/QUEST-002.md') return { path: 'tech-os/quests/active/QUEST-002.md', content: file.content.replace(/^status: backlog$/m, 'status: active') };
    if (file.path === 'tech-os/state.yml') return { ...file, content: file.content.replace(/^current_quest_id: QUEST-001$/m, 'current_quest_id: QUEST-002') };
    return file;
  });
  assert.ok(relocatedFiles.some(file => file.path === 'tech-os/quests/completed/QUEST-001.md' && /^status: completed$/m.test(file.content)));
  assert.ok(relocatedFiles.some(file => file.path === 'tech-os/state.yml' && /^current_quest_id: QUEST-002$/m.test(file.content)));
  const seeded = { version: 1, base: baselineFiles, files: relocatedFiles, conflicts: ['tech-os/state.yml'] };
  const relocatedContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  relocatedContext.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await relocatedContext.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await relocatedContext.addInitScript(({ allowedOrigin, key, copy }) => {
    if (location.origin === allowedOrigin) localStorage.setItem(key, JSON.stringify(copy));
  }, { allowedOrigin: origin, key: workingCopyStorageKey, copy: seeded });
  try {
    const page = await relocatedContext.newPage();
    page.setDefaultTimeout(15_000);
    page.on('dialog', dialog => void dialog.accept());
    await page.goto(appUrl.href);
    await navigate(page, '新方向 / AI 课程');
    const wizard = page.getByRole('region', { name: '新方向课程向导', exact: true });
    await wizard.locator('input[type="file"][aria-label="选择课程 JSON 文件"]').setInputFiles({ name: 'relocated-course.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(importedCourse)) });
    const staging = wizard.getByRole('region', { name: '确认课程草稿', exact: true });
    await staging.waitFor();
    const confirmation = staging.getByRole('textbox', { name: '确认加入课程草稿', exact: true });
    const target = (await confirmation.getAttribute('placeholder')).match(/STAGE ROUTE-\d+/)?.[0];
    assert.ok(target);
    await staging.getByRole('checkbox').check();
    await confirmation.fill(target);
    await staging.getByRole('button', { name: '加入 Repository 草稿', exact: true }).click();
    await page.getByRole('heading', { name: 'Repository Adapter', exact: true }).waitFor();
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), workingCopyStorageKey);
    assert.deepEqual(saved.base, seeded.base, 'staging must preserve the saved merge baseline');
    assert.deepEqual(saved.conflicts, seeded.conflicts, 'staging must preserve unresolved conflict markers');
    const finalFiles = new Map(saved.files.map(file => [file.path, file.content]));
    for (const file of relocatedFiles) assert.equal(finalFiles.get(file.path), file.content, `preserve restored ${file.path}`);
    assert.equal(finalFiles.has('tech-os/quests/active/QUEST-001.md'), false, 'do not revive the bundled old active path');
    assert.equal(finalFiles.has('tech-os/quests/backlog/QUEST-002.md'), false, 'do not revive the bundled old backlog path');
    assert.equal(saved.files.length, seeded.files.length + 3);
    await noOverflow(page, 'restored working copy');
    await page.screenshot({ path: fileURLToPath(new URL('course-relocated.png', output)) });
    console.log('Tech OS course wizard preserves moved Quest paths, current Quest, saved merge baseline and conflicts while staging new backlog lessons.');
  } finally { await relocatedContext.close(); }
  assert.deepEqual(errors, [], 'no uncaught application errors');
} finally { await browser.close(); }
