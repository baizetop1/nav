import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const scripts = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')).scripts;
const scope = process.argv.find(value => value.startsWith('--scope='))?.slice('--scope='.length) || 'all';
if (!['all', 'app', 'game'].includes(scope)) throw new Error(`Unsupported test scope: ${scope}`);
const runners = new Set(['test:all', 'test:app', 'test:game']);
const selected = Object.entries(scripts).filter(([name]) => {
  if (!name.startsWith('test:') || runners.has(name)) return false;
  if (scope === 'app') return !name.startsWith('test:shuihu');
  if (scope === 'game') return name.startsWith('test:shuihu');
  return true;
});
const failed = [];
for (const [name, command] of selected) {
  console.log(`\n${name}`);
  const [runtime, ...args] = command.split(/\s+/);
  if (runtime !== 'node') throw new Error(`Unsupported test command: ${name}`);
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) failed.push(name);
}
if (failed.length) { console.error(`Failed: ${failed.join(', ')}`); process.exit(1); }
console.log(`All ${scope} self-check suites passed.`);
