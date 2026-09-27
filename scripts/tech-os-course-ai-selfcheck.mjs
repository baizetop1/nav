import assert from 'node:assert/strict';
import fs from 'node:fs';

// Fake tokens and fetch-only mocks: running this file cannot call a paid API.
const fakeKey = 'selfcheck_fake_key_never_a_real_credential';
const rawSecretError = `provider_raw_error_${fakeKey}`;
const originalFetch = globalThis.fetch;
const originalConsole = { log: console.log, warn: console.warn, error: console.error };
const storageDescriptors = new Map();
let consoleCalls = 0;
globalThis.fetch = () => { throw new Error('No real network is allowed in this selfcheck'); };
for (const name of ['localStorage', 'sessionStorage', 'indexedDB']) {
  storageDescriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { configurable: true, get() { throw new Error(`Unexpected storage access: ${name}`); } });
}
console.log = console.warn = console.error = () => { consoleCalls++; };

try {
  const {
    normalizeCourseAiEndpoint, buildCourseOutlineMessages, buildCourseLessonMessages,
    requestCourseAi, CourseAiError, COURSE_AI_TIMEOUT_MS, COURSE_AI_MAX_RESPONSE_BYTES,
    COURSE_AI_PRIVACY_NOTICE,
  } = await import('../src/services/techOsCourseAi.ts');
  const profile = { topic: '理解 HTTP', background: '只会打开浏览器', goal: '自己解释请求与响应', timeBudget: '每天 20 分钟，共一周', environment: 'Windows PowerShell、Chrome、Node.js' };
  const config = { endpoint: 'https://gateway.example.test/v1', model: 'user-specified/model-v2', apiKey: fakeKey, maxTokens: 6000, tokenParameter: 'max_tokens' };
  const messages = [{ role: 'system', content: '只写中文课程。' }, { role: 'user', content: '学习 HTTP。' }];
  const completion = (content = '## 开始前\n\n这是合成测试正文。', extra = {}) => ({ choices: [{ finish_reason: 'stop', message: { role: 'assistant', content, refusal: null } }], ...extra });
  const jsonResponse = (value, init = {}) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' }, ...init });
  const mockOptions = (value = completion()) => ({ fetcher: async () => jsonResponse(value), timeoutMs: 1000 });
  async function rejected(promise, code) {
    await assert.rejects(promise, error => {
      assert.ok(error instanceof CourseAiError, 'Only safe classified errors may escape');
      assert.equal(error.code, code);
      assert.ok(!error.message.includes(fakeKey));
      assert.ok(!error.message.includes(rawSecretError));
      assert.equal(error.cause, undefined, 'Do not retain raw server errors as causes');
      return true;
    });
  }

  assert.equal(COURSE_AI_TIMEOUT_MS, 180000);
  assert.equal(COURSE_AI_MAX_RESPONSE_BYTES, 1024 * 1024);
  assert.match(COURSE_AI_PRIVACY_NOTICE, /鉴权网关/);
  assert.match(COURSE_AI_PRIVACY_NOTICE, /不等于安全保管/);
  for (const [input, expected] of [
    ['https://EXAMPLE.test/v1/', 'https://example.test/v1/chat/completions'],
    ['https://gateway.test/custom/api///', 'https://gateway.test/custom/api/chat/completions'],
    ['https://gateway.test/v1/chat/completions/', 'https://gateway.test/v1/chat/completions'],
    [' https://gateway.test ', 'https://gateway.test/chat/completions'],
    ['http://localhost:1234/v1', 'http://localhost:1234/v1/chat/completions'],
    ['http://127.0.0.1:8080', 'http://127.0.0.1:8080/chat/completions'],
    ['http://[::1]:1234/v1/', 'http://[::1]:1234/v1/chat/completions'],
    ['http://[::1]', 'http://[::1]/chat/completions'],
  ]) assert.equal(normalizeCourseAiEndpoint(input), expected);
  for (const endpoint of ['', 'api.example.test', '//example.test', 'ftp://example.test', 'http://example.test', 'http://192.168.0.2', 'http://localhost.evil.test', 'http://localhost.', 'http://127.1', 'http://2130706433', 'http://0x7f000001', 'http://[::ffff:127.0.0.1]', 'https://user:pass@example.test', 'https://@example.test', 'https://example.test?', 'https://example.test#', 'https://example.test/v1?key=secret', 'https://example.test\\evil', 'https://example.test/has space', 'https://example.test/\ninjected', 'https://example.test:99999']) {
    assert.throws(() => normalizeCourseAiEndpoint(endpoint), error => error instanceof CourseAiError && error.code === 'configuration');
  }

  const untrustedProfile = { ...profile, apiKey: fakeKey, repositoryBody: 'DO_NOT_SEND_REPOSITORY', toJSON() { throw new Error('Do not serialize profile objects directly'); } };
  const outline = buildCourseOutlineMessages(untrustedProfile);
  assert.deepEqual(outline.map(item => item.role), ['system', 'user']);
  assert.deepEqual(JSON.parse(outline[1].content), { profile });
  assert.match(outline[0].content, /2 到 12/);
  assert.match(outline[0].content, /body.*空字符串/);
  assert.ok(!JSON.stringify(outline).includes(fakeKey));
  assert.ok(!JSON.stringify(outline).includes('DO_NOT_SEND_REPOSITORY'));
  const course = { version: 1, title: 'HTTP 入门', summary: '从请求到响应', lessons: [{ title: '请求由什么组成？' }, { title: '状态码表示什么？' }], token: fakeKey, path: 'DO_NOT_SEND_PATH' };
  for (const lesson of course.lessons) Object.defineProperty(lesson, 'body', { get() { throw new Error('Other or target lesson bodies must never be read'); } });
  const lessonMessages = buildCourseLessonMessages(untrustedProfile, course, 1);
  const sentLesson = JSON.parse(lessonMessages[1].content);
  assert.deepEqual(sentLesson.profile, profile);
  assert.deepEqual(sentLesson.course, { title: course.title, summary: course.summary, lessonTitles: course.lessons.map(lesson => lesson.title) });
  assert.deepEqual(sentLesson.targetLesson, { index: 2, title: '状态码表示什么？' });
  assert.ok(!JSON.stringify(lessonMessages).includes(fakeKey));
  assert.ok(!JSON.stringify(lessonMessages).includes('DO_NOT_SEND_PATH'));
  for (const heading of ['开始前', '学习思路', '工具准备', '为什么这样做', '工具与操作', '观察与预期', '常见误区', '卡住时怎么办', '检查理解', '参考答案', '完成标志']) assert.ok(lessonMessages[0].content.includes(heading));
  assert.match(lessonMessages[0].content, /人工核验/);
  assert.match(lessonMessages[0].content, /不运行命令/);
  assert.match(lessonMessages[0].content, /2 到 4/);
  for (const key of Object.keys(profile)) {
    assert.throws(() => buildCourseOutlineMessages({ ...profile, [key]: ' ' }), CourseAiError);
    assert.throws(() => buildCourseLessonMessages({ ...profile, [key]: '' }, course, 0), CourseAiError);
    assert.throws(() => buildCourseOutlineMessages({ ...profile, [key]: '长'.repeat(key === 'topic' ? 161 : 2001) }), CourseAiError);
  }
  for (const index of [-1, 2, 0.5, NaN]) assert.throws(() => buildCourseLessonMessages(profile, course, index), CourseAiError);
  assert.throws(() => buildCourseLessonMessages(profile, {...course, version: 2}, 0), CourseAiError);

  let calls = 0;
  const result = await requestCourseAi(config, messages, { fetcher: async (url, init) => {
    calls++;
    assert.equal(url, 'https://gateway.example.test/v1/chat/completions');
    assert.equal(init.method, 'POST');
    assert.equal(init.credentials, 'omit');
    assert.equal(init.cache, 'no-store');
    assert.equal(init.redirect, 'error');
    assert.equal(init.referrerPolicy, 'no-referrer');
    assert.equal(init.headers.Authorization, `Bearer ${fakeKey}`);
    assert.equal(init.headers['Content-Type'], 'application/json');
    const payload = JSON.parse(init.body);
    assert.deepEqual(payload, { model: config.model, messages, stream: false, max_tokens: 6000 });
    assert.ok(!init.body.includes(fakeKey));
    assert.ok(init.signal instanceof AbortSignal);
    return jsonResponse(completion('完整正文', { usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 } }));
  } });
  assert.equal(calls, 1);
  assert.deepEqual(result, { content: '完整正文', usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 } });
  await requestCourseAi({ ...config, apiKey: '', tokenParameter: 'max_completion_tokens', maxTokens: 16000 }, messages, { fetcher: async (_url, init) => {
    assert.equal(init.headers.Authorization, undefined);
    const payload = JSON.parse(init.body);
    assert.equal(payload.max_completion_tokens, 16000);
    assert.equal(payload.max_tokens, undefined);
    return jsonResponse(completion());
  } });
  await requestCourseAi({ ...config, tokenParameter: undefined, maxTokens: 256 }, messages, { fetcher: async (_url, init) => {
    assert.equal(JSON.parse(init.body).max_tokens, 256);
    return jsonResponse(completion());
  } });
  let invalidCalls = 0;
  const neverFetch = { fetcher: async () => { invalidCalls++; return jsonResponse(completion()); } };
  for (const changes of [{ model: '' }, { model: 'm'.repeat(201) }, { model: 'model\nname' }, { maxTokens: 255 }, { maxTokens: 16001 }, { maxTokens: 256.5 }, { maxTokens: NaN }, { apiKey: 'not a valid key' }, { tokenParameter: 'max_output_tokens' }, { endpoint: 'http://external.test' }]) await rejected(requestCourseAi({ ...config, ...changes }, messages, neverFetch), 'configuration');
  for (const invalidMessages of [[], [{ role: 'assistant', content: 'no' }], [{ role: 'user', content: '' }], Array.from({length:9},()=>messages[0]), [{ role: 'user', content: '中文'.repeat(12000) }]]) await rejected(requestCourseAi(config, invalidMessages, neverFetch), 'configuration');
  await rejected(requestCourseAi(config, [{ role: 'user', content: fakeKey }], neverFetch), 'sensitive-input');
  await rejected(requestCourseAi({ ...config, model: fakeKey }, messages, neverFetch), 'sensitive-input');
  await rejected(requestCourseAi({ ...config, endpoint: `https://gateway.test/${fakeKey}` }, messages, neverFetch), 'sensitive-input');
  for (const timeoutMs of [0, -1, NaN, Infinity, 180001]) await rejected(requestCourseAi(config, messages, { ...neverFetch, timeoutMs }), 'configuration');
  assert.equal(invalidCalls, 0, 'Invalid inputs must not contact any endpoint');

  for (const [status, code] of [[400,'bad-request'], [401,'authentication'], [403,'forbidden'], [404,'http'], [422,'bad-request'], [429,'rate-limit'], [500,'server'], [503,'server']]) {
    let attempts = 0;
    await rejected(requestCourseAi(config, messages, { fetcher: async () => { attempts++; return new Response(rawSecretError, { status }); } }), code);
    assert.equal(attempts, 1, 'HTTP failures must never auto-retry');
  }
  let networkAttempts = 0;
  await rejected(requestCourseAi(config, messages, { fetcher: async () => { networkAttempts++; throw new TypeError(rawSecretError); } }), 'network');
  assert.equal(networkAttempts, 1);

  for (const [payload, code] of [
    [completion('partial', { choices: [{ finish_reason: 'length', message: {role:'assistant',content:'partial'} }] }), 'truncated'],
    [{ choices: [{ finish_reason:'content_filter', message: {role:'assistant',content:rawSecretError} }] }, 'refused'],
    [{ choices: [{ finish_reason:'refusal', message: {role:'assistant',content:rawSecretError} }] }, 'refused'],
    [{ choices: [{ finish_reason:'stop', message: {role:'assistant',content:'x',refusal:rawSecretError} }] }, 'refused'],
    [{ choices: [{ finish_reason:'tool_calls', message: {role:'assistant',content:'x',tool_calls:[{function:{arguments:rawSecretError}}]} }] }, 'malformed'],
    [{ choices: [{ finish_reason:'stop', message: {role:'assistant',content:'x',tool_calls:[{}]} }] }, 'malformed'],
    [{ choices: [{ finish_reason:'stop', message: {role:'assistant',content:'x',function_call:{name:'execute'}} }] }, 'malformed'],
    [{ choices: [{ message: {role:'assistant',content:'x'} }] }, 'malformed'],
    [{ choices: [{ finish_reason:null, message:{role:'assistant',content:'x'} }] }, 'malformed'],
    [{ choices: [{ finish_reason:'stop', message:{role:'tool',content:'x'} }] }, 'malformed'],
    [completion(null), 'empty'], [completion(' \n '), 'empty'], [completion([{type:'text',text:'not supported'}]), 'malformed'],
    [{ choices:[] }, 'malformed'], [null,'malformed'], [{error:{message:rawSecretError}},'malformed'],
    [completion(`A provider echoed ${fakeKey} into its content.`), 'secret-echo'],
  ]) await rejected(requestCourseAi(config, messages, mockOptions(payload)), code);
  for (const raw of ['not json ' + rawSecretError, '{"choices":', 'data: {"choices":[]}\n\n']) await rejected(requestCourseAi(config, messages, { fetcher: async()=>new Response(raw) }), 'malformed');
  await rejected(requestCourseAi(config, messages, { fetcher: async()=>new Response('event', {headers:{'Content-Type':'text/event-stream'}}) }), 'malformed');
  await rejected(requestCourseAi(config, messages, { fetcher: async()=>new Response(null) }), 'empty');
  const sanitized = await requestCourseAi(config, messages, mockOptions(completion('ok', {usage:{prompt_tokens:-2,completion_tokens:'42',total_tokens:1e100}})));
  assert.equal(sanitized.usage, undefined);
  const partialUsage = await requestCourseAi(config, messages, mockOptions(completion('ok', {usage:{prompt_tokens:0,completion_tokens:1.5,total_tokens:30}})));
  assert.deepEqual(partialUsage.usage, {promptTokens:0,totalTokens:30});
  const secondChoice = completion('only first');
  secondChoice.choices.push({finish_reason:'stop',message:{role:'assistant',content:fakeKey}});
  assert.equal((await requestCourseAi(config,messages,mockOptions(secondChoice))).content, 'only first');

  let streamCancelled = false;
  const oversized = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(600000)); }, cancel() { streamCancelled = true; } });
  await rejected(requestCourseAi(config, messages, { fetcher: async()=>new Response(oversized) }), 'response-limit');
  assert.ok(streamCancelled);
  let declaredCancelled = false;
  await rejected(requestCourseAi(config, messages, { fetcher: async()=>new Response(new ReadableStream({cancel(){declaredCancelled=true;}}), {headers:{'Content-Length':String(COURSE_AI_MAX_RESPONSE_BYTES+1)}}) }), 'response-limit');
  assert.ok(declaredCancelled);
  // Byte cap must not accidentally use JavaScript character count.
  await rejected(requestCourseAi(config, messages, mockOptions(completion('界'.repeat(360000)))), 'response-limit');
  const utf8 = new TextEncoder().encode(JSON.stringify(completion('中文边界正确')));
  const splitStream = new ReadableStream({ start(controller) { for (let offset=0;offset<utf8.length;offset++) controller.enqueue(utf8.slice(offset,offset+1)); controller.close(); } });
  assert.equal((await requestCourseAi(config, messages, {fetcher:async()=>new Response(splitStream)})).content, '中文边界正确');
  await rejected(requestCourseAi(config,messages,{fetcher:async()=>new Response(new Uint8Array([0xff,0xfe]))}), 'malformed');

  const preAbort = new AbortController(); preAbort.abort(rawSecretError);
  await rejected(requestCourseAi(config,messages,{...neverFetch,signal:preAbort.signal}), 'aborted');
  assert.equal(invalidCalls,0);
  let timeoutSignal;
  await rejected(requestCourseAi(config,messages,{timeoutMs:5,fetcher:(_url,init)=>{timeoutSignal=init.signal;return new Promise(()=>{});}}), 'timeout');
  assert.ok(timeoutSignal.aborted);
  const midAbort = new AbortController();
  let inFlightSignal;
  const cancelled = requestCourseAi(config,messages,{signal:midAbort.signal,fetcher:(_url,init)=>{inFlightSignal=init.signal;return new Promise(()=>{});}});
  midAbort.abort(rawSecretError);
  await rejected(cancelled,'aborted'); assert.ok(inFlightSignal.aborted);
  let slowCancelled=false;
  await rejected(requestCourseAi(config,messages,{timeoutMs:5,fetcher:async()=>new Response(new ReadableStream({cancel(){slowCancelled=true;}}))}), 'timeout');
  assert.ok(slowCancelled, 'Timeout includes reading the response, not just headers');
  let releaseLate;
  let lateCancelled = false;
  const lateRequest=requestCourseAi(config,messages,{timeoutMs:5,fetcher:()=>new Promise(resolve=>{releaseLate=resolve;})});
  await rejected(lateRequest,'timeout');
  releaseLate(new Response(new ReadableStream({cancel(){lateCancelled=true;}})));
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.ok(lateCancelled,'Late responses after timeout must be cancelled');
  // On successful completion, the external signal listener and timeout are removed.
  const completedSignal = new AbortController();
  let completedRequestSignal;
  await requestCourseAi(config,messages,{signal:completedSignal.signal,timeoutMs:20,fetcher:async(_url,init)=>{completedRequestSignal=init.signal;return jsonResponse(completion());}});
  completedSignal.abort(rawSecretError);
  await new Promise(resolve=>setTimeout(resolve,25));
  assert.equal(completedRequestSignal.aborted,false,'Completed requests must not be aborted by stale listeners/timers');
  let failedBodyCancelled=false;
  await rejected(requestCourseAi(config,messages,{fetcher:async()=>new Response(new ReadableStream({cancel(){failedBodyCancelled=true;}}),{status:401})}), 'authentication');
  assert.ok(failedBodyCancelled,'HTTP error bodies are cancelled without being read');
  const readingAbort=new AbortController();
  let readingCancelled=false;
  const readingRequest=requestCourseAi(config,messages,{signal:readingAbort.signal,fetcher:async()=>new Response(new ReadableStream({cancel(){readingCancelled=true;}}))});
  await new Promise(resolve=>setTimeout(resolve,0));
  readingAbort.abort(rawSecretError);
  await rejected(readingRequest,'aborted');
  assert.ok(readingCancelled,'User cancellation must also stop response-body reading');

  const source = fs.readFileSync(new URL('../src/services/techOsCourseAi.ts', import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:localStorage|sessionStorage|indexedDB|console|eval)\s*\./);
  assert.doesNotMatch(source,/\bnew\s+Function\b/);
  assert.equal(consoleCalls,0,'Transport must not log secrets, errors, or generated content');
} finally {
  globalThis.fetch=originalFetch;
  Object.assign(console,originalConsole);
  for (const [name,descriptor] of storageDescriptors) {
    if (descriptor) Object.defineProperty(globalThis,name,descriptor);
    else delete globalThis[name];
  }
}
console.log('Tech OS course AI selfcheck passed: endpoint/profile isolation, mock-only requests, safe errors, bounded streams, cancellation, and no storage/logging.');
