import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { APPEARANCE_STORAGE_KEY, APPEARANCE_THEMES, DEFAULT_APPEARANCE_PREFERENCE, localAppearanceDateKey, parseAppearancePreference, readAppearancePreference, resolveAppearanceTheme, resolveDailyTheme, saveAppearancePreference } from '../src/lib/appearance.ts';

assert.equal(APPEARANCE_STORAGE_KEY, 'baize_appearance_v1');
assert.deepEqual(APPEARANCE_THEMES.map(theme => theme.id), ['landscape', 'mist', 'paper', 'graphite']);
assert.deepEqual(DEFAULT_APPEARANCE_PREFERENCE, { version: 1, mode: 'fixed', themeId: 'landscape' });
for (const raw of [null, undefined, '', ' ', '{', 'null', '[]', 'true', '"mist"', '{}', '{"version":0,"mode":"fixed","themeId":"mist"}', '{"version":2,"mode":"daily","themeId":"mist"}', '{"version":1,"mode":"auto","themeId":"mist"}', '{"version":1,"mode":"fixed","themeId":"unknown"}', 'x'.repeat(4097)]) assert.equal(parseAppearancePreference(raw), null, String(raw).slice(0, 100));
for (const mode of ['fixed', 'daily']) for (const { id: themeId } of APPEARANCE_THEMES) {
  const preference = { version: 1, mode, themeId };
  assert.deepEqual(parseAppearancePreference(JSON.stringify(preference)), preference);
}

let writes = 0;
const data = new Map();
const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => { writes++; data.set(key, value); } };
assert.deepEqual(readAppearancePreference(storage), { preference: DEFAULT_APPEARANCE_PREFERENCE, status: 'missing' });
assert.equal(writes, 0);
data.set(APPEARANCE_STORAGE_KEY, '{invalid old value');
assert.deepEqual(readAppearancePreference(storage), { preference: DEFAULT_APPEARANCE_PREFERENCE, status: 'invalid' });
assert.equal(writes, 0);
assert.equal(data.get(APPEARANCE_STORAGE_KEY), '{invalid old value');
assert.equal(readAppearancePreference(null).status, 'unavailable');
assert.equal(readAppearancePreference({ getItem() { throw new Error('denied'); } }).status, 'unavailable');
const selected = { version: 1, mode: 'fixed', themeId: 'paper' };
assert.deepEqual(saveAppearancePreference(selected, storage), { ok: true });
assert.equal(writes, 1);
assert.equal(data.size, 1, 'Appearance must write only its own key');
assert.deepEqual(readAppearancePreference(storage), { preference: selected, status: 'valid' });
for (const name of ['QuotaExceededError', 'SecurityError', 'Error']) {
  const failing = { setItem() { const error = new Error('simulated'); error.name = name; throw error; } };
  const result = saveAppearancePreference(selected, failing);
  assert.equal(result.ok, false);
  assert.match(result.message, /本次打开/);
  assert.deepEqual(selected, { version: 1, mode: 'fixed', themeId: 'paper' }, 'Failed save must not mutate the session choice');
}
assert.equal(saveAppearancePreference(selected, null).ok, false);
assert.deepEqual(saveAppearancePreference(selected, storage), { ok: true }, 'An explicit retry can succeed');

const morning = new Date(2026, 8, 27, 0, 1);
const evening = new Date(2026, 8, 27, 23, 59);
assert.equal(localAppearanceDateKey(morning), '2026-09-27');
assert.equal(resolveDailyTheme(morning), resolveDailyTheme(evening));
assert.equal(resolveAppearanceTheme(selected, morning), 'paper');
assert.equal(resolveAppearanceTheme({ ...selected, mode: 'daily' }, morning), resolveDailyTheme(morning));
const cycle = Array.from({ length: 5 }, (_, day) => resolveDailyTheme(new Date(2026, 8, 27 + day, 12)));
assert.equal(new Set(cycle.slice(0, 4)).size, 4);
assert.equal(cycle[0], cycle[4]);
assert.equal(resolveDailyTheme(new Date(Number.NaN)), 'landscape');
assert.equal(localAppearanceDateKey(new Date(Number.NaN)), '');
assert.ok(APPEARANCE_THEMES.some(theme => theme.id === resolveDailyTheme(new Date(1969, 11, 31))));

// Run the same local calendar checks in both directions from UTC and across DST.
const appearanceUrl = new URL('../src/lib/appearance.ts', import.meta.url).href;
for (const timeZone of ['Asia/Shanghai', 'America/Los_Angeles', 'Pacific/Auckland']) {
  const code = `import assert from 'node:assert/strict'; import { resolveDailyTheme, localAppearanceDateKey } from ${JSON.stringify(appearanceUrl)}; const early = new Date(2026, 8, 27, 0, 1); const late = new Date(2026, 8, 27, 23, 59); assert.equal(localAppearanceDateKey(early), '2026-09-27'); assert.equal(resolveDailyTheme(early), resolveDailyTheme(late)); for (const [month, day] of [[2, 7], [9, 31]]) { const cycle = Array.from({length: 5}, (_, i) => resolveDailyTheme(new Date(2026, month, day + i, 12))); assert.equal(new Set(cycle.slice(0, 4)).size, 4); assert.equal(cycle[0], cycle[4]); } console.log(resolveDailyTheme(early));`;
  const child = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', code], { env: { ...process.env, TZ: timeZone }, encoding: 'utf8' });
  assert.equal(child.status, 0, `${timeZone}: ${child.stderr}`);
  assert.equal(child.stdout.trim(), resolveDailyTheme(morning), 'The same local calendar date should resolve identically in every timezone');
}
console.log('appearance self-check passed');
