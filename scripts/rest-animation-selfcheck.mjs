import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { advanceRestTime, restPose, REST_SPEEDS } from '../src/services/restAnimation.ts';
import { advanceRestRotation, DEFAULT_REST_INTERVAL, REST_ROTATION_INTERVALS, REST_SCENES } from '../src/services/restPlaylist.ts';
import { pelicanLegPose } from '../src/services/pelicanMotion.ts';

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
assert.equal(DEFAULT_REST_INTERVAL, 60);
assert.deepEqual(REST_ROTATION_INTERVALS, [30, 60, 120, 300]);
assert.deepEqual(REST_SCENES.map(scene => scene.id), ['moonlight', 'balloon', 'rain', 'camp', 'pelican']);
for (const seconds of REST_ROTATION_INTERVALS) {
  let playhead = { index: 0, elapsedMs: 0 };
  for (let turn = 0; turn < REST_SCENES.length * 2; turn++) {
    for (let second = 0; second < seconds - 1; second++) playhead = advanceRestRotation(playhead, 1000, seconds);
    assert.equal(playhead.index, turn % REST_SCENES.length);
    assert.equal(playhead.elapsedMs, (seconds - 1) * 1000);
    playhead = advanceRestRotation(playhead, 1000, seconds);
    assert.deepEqual(playhead, { index: (turn + 1) % REST_SCENES.length, elapsedMs: 0 });
  }
}
assert.deepEqual(advanceRestRotation({ index: 1, elapsedMs: 4000 }, -1000, 30), { index: 1, elapsedMs: 4000 });
assert.deepEqual(advanceRestRotation({ index: 1, elapsedMs: 4000 }, 90_000, 30), { index: 1, elapsedMs: 6000 });
assert.deepEqual(advanceRestRotation({ index: NaN, elapsedMs: Infinity }, NaN, 0), { index: 0, elapsedMs: 0 });
const playlist = read('src/components/rest/useRestPlaylist.ts');
assert.match(playlist, /if \(!running \|\| !ready\) return/);
assert.match(playlist, /if \(document.hidden\) return/);
assert.match(playlist, /window.clearInterval\(timer\)/);
assert.match(overlay, /useRestPlaylist\(playing && autoRotate\)/);
assert.match(overlay, /useState\(!reduced\)/);
for (const name of ['BalloonScene', 'RainScene', 'CampScene', 'PelicanScene']) {
  const source = read('src/components/rest/' + name + '.tsx');
  assert.match(source, /useRestMotion\(playing, speed, draw\)/);
  assert.doesNotMatch(source, /https?:\/\/|localStorage|setInterval|setTimeout|<audio|<iframe/);
  assert.match(overlay, new RegExp("lazy\\(\\(\\) => import\\('\\./" + name + "'\\)\\)"));
}
assert.match(read('src/components/rest/RestScenery.tsx'), /cancelAnimationFrame\(frame\)/);
// The original rider's feet stay attached to opposite pedals throughout a cycle.
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
for (let time = 0; time < 33; time += 0.017) {
  const near = pelicanLegPose(time, 'near'), far = pelicanLegPose(time, 'far');
  close(near.pedal.x + far.pedal.x, 1508);
  close(near.pedal.y + far.pedal.y, 1220);
  for (const side of ['near', 'far']) {
    const { hip, knee, ankle, pedal, path } = pelicanLegPose(time, side);
    close(Math.hypot(knee.x - hip.x, knee.y - hip.y), 119);
    close(Math.hypot(ankle.x - knee.x, ankle.y - knee.y), 124);
    close(Math.hypot(pedal.x - 754, pedal.y - 610), 37);
    close(pedal.x - ankle.x, 3); close(pedal.y - ankle.y, 8);
    assert.doesNotMatch(path, /NaN|Infinity/);
    assert.match(path, /^M[\d.]+ [\d.]+L[\d.]+ [\d.]+L[\d.]+ [\d.]+$/);
    const next = pelicanLegPose(time + 1.65, side);
    close(next.pedal.x, pedal.x); close(next.pedal.y, pedal.y);
  }
}
for (const invalid of [NaN, Infinity, -Infinity, -1]) {
  for (const side of ['near', 'far']) assert.deepEqual(pelicanLegPose(invalid, side), pelicanLegPose(0, side));
}
const pelican = read('src/components/rest/PelicanScene.tsx');
assert.match(pelican, /pelicanLegPose\(time, side\)/);
assert.match(pelican, /useSceneryId\(\)/);
assert.match(pelican, /rest-pelican-rider-position/);
assert.doesNotMatch(pelican, /dangerouslySetInnerHTML|<script|document\.getElementById/);
for (const part of ['rear-spokes', 'front-spokes', 'road', 'waves', 'near-foot', 'far-foot', 'near-leg', 'far-leg']) {
  assert.equal(pelican.split(`data-part="${part}"`).length - 1, 1, `Exactly one ${part} motion part`);
}
console.log('Rest animation: five scenes, pelican pedal geometry, timing/rotation/wraparound, lazy loading, pause and reduced-motion wiring passed.');
