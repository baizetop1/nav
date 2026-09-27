import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getLinkHealthState, parseLinkHealthReport } from '../src/lib/linkHealth.ts';
import {
  LINK_CHECK_HEADERS,
  assessRequestResult,
  createHealthEntry,
} from './link-health-rules.mjs';

const checkedAt = '2026-09-27T03:00:00.000Z';
const [healthy, warning, unhealthy, browserFailure] = parseLinkHealthReport([
  { siteId: 'healthy', url: 'https://healthy.example.com', status: 200, ok: true, checkedAt, error: null, source: 'github-actions', consecutiveFailures: 0, confirmedFailure: false, lastSuccessfulAt: checkedAt, failureKind: null },
  { siteId: 'warning', url: 'https://warning.example.com', status: 503, ok: false, checkedAt, error: 'HTTP 503', source: 'github-actions', consecutiveFailures: 1, confirmedFailure: false, lastSuccessfulAt: '2026-09-26T03:00:00.000Z', failureKind: 'http' },
  { siteId: 'unhealthy', url: 'https://down.example.com', status: null, ok: false, checkedAt, error: 'Timeout', source: 'github-actions', consecutiveFailures: 2, confirmedFailure: true, lastSuccessfulAt: null, failureKind: 'timeout' },
  { siteId: 'browser', url: 'https://browser.example.com', status: null, ok: false, checkedAt, error: '无法连接', source: 'browser', consecutiveFailures: 9, confirmedFailure: true, lastSuccessfulAt: null, failureKind: 'network' },
]);

assert.equal(getLinkHealthState(healthy), 'healthy');
assert.equal(getLinkHealthState(warning), 'warning');
assert.equal(getLinkHealthState(unhealthy), 'unhealthy');
assert.equal(getLinkHealthState(browserFailure), 'warning');
assert.equal(warning.lastSuccessfulAt, '2026-09-26T03:00:00.000Z');
assert.equal(parseLinkHealthReport([{ siteId: 'bad', url: 'javascript:alert(1)', status: 200, ok: true, checkedAt, error: null }]).length, 0);

for (const status of [400, 401, 403, 405, 408, 429, 451]) {
  const assessment = assessRequestResult({ status, ok: false, error: null });
  assert.equal(assessment.ok, true, `HTTP ${status} should prove reachability`);
  assert.equal(assessment.restricted, true, `HTTP ${status} should be marked restricted`);
}
for (const [status, kind] of [[404, 'not-found'], [410, 'not-found'], [500, 'server'], [503, 'server'], [521, 'server']]) {
  const assessment = assessRequestResult({ status, ok: false, error: null });
  assert.equal(assessment.ok, false);
  assert.equal(assessment.failureKind, kind);
}
assert.equal(assessRequestResult({ status: null, ok: false, error: 'Timeout after 10000ms' }).failureKind, 'timeout');
assert.equal(assessRequestResult({ status: null, ok: false, error: 'getaddrinfo ENOTFOUND example.test' }).failureKind, 'dns');
assert.match(LINK_CHECK_HEADERS['User-Agent'], /Mozilla\/5\.0.+Chrome\//);

const oldRestricted = { siteId: 'restricted', url: 'https://restricted.example.com', status: 403, ok: false, checkedAt, error: 'HTTP 403', source: 'github-actions', consecutiveFailures: 12, confirmedFailure: true, failureKind: 'http' };
const [normalizedRestricted] = parseLinkHealthReport([oldRestricted]);
assert.equal(normalizedRestricted.ok, true);
assert.equal(normalizedRestricted.restricted, true);
assert.equal(normalizedRestricted.consecutiveFailures, 0);
assert.equal(normalizedRestricted.confirmedFailure, false);
assert.equal(getLinkHealthState(normalizedRestricted), 'healthy');

const firstFailure = createHealthEntry({ id: 'missing', url: 'https://missing.example.com' }, checkedAt, { status: 404, ok: false, error: null });
assert.equal(firstFailure.consecutiveFailures, 1);
assert.equal(firstFailure.confirmedFailure, false);
const secondFailure = createHealthEntry({ id: 'missing', url: 'https://missing.example.com' }, '2026-09-27T04:00:00.000Z', { status: 404, ok: false, error: null }, firstFailure);
assert.equal(secondFailure.consecutiveFailures, 2);
assert.equal(secondFailure.confirmedFailure, true);
const restrictionAfterFailure = createHealthEntry({ id: 'missing', url: 'https://missing.example.com' }, '2026-09-27T05:00:00.000Z', { status: 429, ok: false, error: null }, secondFailure);
assert.equal(restrictionAfterFailure.ok, true);
assert.equal(restrictionAfterFailure.restricted, true);
assert.equal(restrictionAfterFailure.consecutiveFailures, 0);
assert.equal(restrictionAfterFailure.confirmedFailure, false);
const [notFoundCannotClaimRestricted] = parseLinkHealthReport([
  { siteId: 'still-missing', url: 'https://missing.example.com', status: 404, ok: false, restricted: true, checkedAt, error: 'HTTP 404', source: 'github-actions', consecutiveFailures: 2, confirmedFailure: true },
]);
assert.equal(notFoundCannotClaimRestricted.restricted, false);
assert.equal(getLinkHealthState(notFoundCannotClaimRestricted), 'unhealthy');
const cardSource = await readFile(new URL('../src/components/Card.tsx', import.meta.url), 'utf8');
assert.match(cardSource, /getLinkHealthState\(health\)/);
assert.match(cardSource, /healthState === 'warning'[\s\S]*待复查/);
assert.match(cardSource, /healthState === 'unhealthy'[\s\S]*异常/);
assert.doesNotMatch(cardSource, /health && !health\.ok/);
const panelSource = await readFile(new URL('../src/components/LinkHealthPanel.tsx', import.meta.url), 'utf8');
assert.match(panelSource, /可达受限 · HTTP/);
assert.match(panelSource, /401、403、405、429/);
console.log('Link health: restricted HTTP responses, legacy normalization, failure threshold and browser fallback passed.');
