import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const scripts = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')).scripts;
const failed = [];
for (const [name, command] of Object.entries(scripts).filter(([name]) => name.startsWith('test:') && name !== 'test:all')) {
  console.log(`\n${name}`);
  const [runtime, ...args] = command.split(/\s+/);
  if (runtime !== 'node') throw new Error(`Unsupported test command: ${name}`);
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) failed.push(name);
}
if (failed.length) { console.error(`Failed: ${failed.join(', ')}`); process.exit(1); }
console.log('All registered self-check suites passed.');
