import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { advanceRestTime, restPose, REST_SPEEDS } from '../src/services/restAnimation.ts';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
assert.deepEqual(REST_SPEEDS, [0.65, 1, 1.3]);
assert.equal(advanceRestTime(4, 1000 / 30, 1), 4 + 1 / 30);
assert.equal(advanceRestTime(4, 60_000, 1), 4.08, 'Sleeping tabs must not fast-forward');
assert.equal(advanceRestTime(4, -10, 1), 4);
assert.equal(advanceRestTime(4, 80, 9), 4.104);
for (const invalid of [NaN, Infinity, -Infinity]) {
  assert.equal(advanceRestTime(0, invalid, 1), 0);
  assert.deepEqual(restPose(invalid), restPose(0));
}
for (let time = 0; time < 3600; time += 0.173) {
  const pose = restPose(time);
  assert.ok(Object.values(pose).every(Number.isFinite));
  assert.ok(Math.abs(pose.boatY) <= 3.5 && Math.abs(pose.boatAngle) <= 1.15);
  assert.ok(pose.paddleAngle >= -34 && pose.paddleAngle <= 10);
  assert.ok(pose.rippleX >= 65 && pose.rippleX <= 235 && pose.rippleY >= 55 && pose.rippleY <= 115, 'Ripples must follow the blade');
  assert.ok(pose.waterX <= 0 && pose.waterX > -1440);
  assert.ok(pose.rippleScale >= 0.65 && pose.rippleScale <= 1.25);
  assert.ok(pose.rippleOpacity >= 0.13 - 1e-12 && pose.rippleOpacity <= 0.29 + 1e-12);
}
const app = read('src/App.tsx'), overlay = read('src/components/rest/RestOverlay.tsx');
const scene = read('src/components/rest/RestScene.tsx');
assert.match(app, /onRest=\{openRest\}/);
assert.match(app, /if \(mode === 'relax'\) openRest\(\)/);
assert.match(app, /id: 'rest', title: '休息一下'/);
assert.match(overlay, /lazy\(\(\) => import\('\.\/RestScene'\)\)/);
assert.match(overlay, /element.showModal\(\)/);
assert.match(overlay, /element.close\(\)/);
assert.match(overlay, /prefers-reduced-motion: reduce/);
assert.match(overlay, /document.removeEventListener\('visibilitychange'/);
assert.match(scene, /if \(!playing\) return/);
assert.match(scene, /cancelAnimationFrame\(frame\)/);
assert.doesNotMatch(scene + overlay, /https?:\/\/|localStorage\.setItem|setInterval|<audio|<iframe/);
console.log('Rest animation: timing, poses, controls, reduced motion and entry wiring passed.');
