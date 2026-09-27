import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const listeners = new Map();
const worker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const scope = { URL, self: { location: { origin: 'https://nav.test' }, addEventListener: (name, fn) => listeners.set(name, fn) } };
vm.runInNewContext(worker, scope);
for (const suffix of ['learning-lab/navigation.html', 'learning-lab/navigation.html?keyword=test', 'learning-lab/navigation.js']) {
  let intercepted = false;
  listeners.get('fetch')({ request: { method: 'GET', url: `https://nav.test/nav/${suffix}`, mode: 'navigate' }, respondWith: () => { intercepted = true; } });
  assert.equal(intercepted, false, 'lab must not replace the cached application shell or receive its offline fallback');
}
const html = readFileSync(new URL('../public/learning-lab/navigation.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../public/learning-lab/navigation.js', import.meta.url), 'utf8');
assert.ok(html.includes('method="get"') && html.includes('id="section-two"'));
assert.ok(html.includes('rel="icon" href="data:,"'));
assert.doesNotMatch(html, /(?:src|href)="https?:/i, 'no third-party resources or links in the lab');
assert.doesNotMatch(script, /innerHTML|document\.write|localStorage|serviceWorker\.register|fetch\(/, 'no HTML injection, persistence or hidden network logic');
console.log('Tech OS lab: SW isolation, static entry points, safe rendering, no storage or external requests passed.');
