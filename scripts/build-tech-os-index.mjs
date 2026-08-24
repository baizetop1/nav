import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { findTechOsProjectRoot, validateTechOs } from './check-tech-os.mjs';

const INDEX_SCHEMA = 'tech-os-index/v1';
const COMMON_FIELDS = new Set(['schema', 'kind', 'id', 'title', 'status', 'created', 'tags']);

export function createTechOsIndex(root = findTechOsProjectRoot()) {
  const report = validateTechOs(root);
  const state = readState(path.join(root, 'tech-os', 'state.yml'));
  const entities = report.entities
    .map(entity => ({
      id: entity.data.id,
      kind: entity.data.kind,
      title: entity.data.title,
      status: entity.data.status,
      created: entity.data.created,
      tags: entity.data.tags,
      sourcePath: entity.relative,
      fields: Object.fromEntries(Object.entries(entity.data).filter(([key]) => !COMMON_FIELDS.has(key))),
      body: entity.body.trim(),
    }))
    .sort((left, right) => left.kind.localeCompare(right.kind) || left.id.localeCompare(right.id));
  const files = [
    { path: 'tech-os/state.yml', content: fs.readFileSync(path.join(root, 'tech-os', 'state.yml'), 'utf8') },
    ...report.entities.map(entity => ({ path: entity.relative, content: fs.readFileSync(entity.file, 'utf8') })),
  ].sort((left, right) => left.path.localeCompare(right.path));

  return {
    schema: INDEX_SCHEMA,
    sourceSchema: 'tech-os/v1',
    sourceUpdated: state.updated,
    state: {
      visionId: state.vision_id,
      mainRouteId: state.main_route_id,
      currentQuestId: state.current_quest_id,
      mode: state.mode,
    },
    entities,
    files,
  };
}

export function writeTechOsIndex(root = findTechOsProjectRoot(), outputPath = path.join(root, 'src', 'generated', 'tech-os-index.json')) {
  const index = createTechOsIndex(root);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  return { index, outputPath };
}

function readState(statePath) {
  const entries = fs.readFileSync(statePath, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').split('\n')
    .filter(line => line.trim() && !line.trimStart().startsWith('#'))
    .map(line => {
      const match = line.match(/^([a-z][a-z0-9_-]*):\s*(.+)$/i);
      if (!match) throw new Error(`tech-os/state.yml 包含不支持的字段：${line}`);
      return [match[1], match[2].trim()];
    });
  return Object.fromEntries(entries);
}

async function main() {
  try {
    const { index, outputPath } = writeTechOsIndex();
    console.log(`Tech OS 前端索引已生成：${index.entities.length} 个对象 → ${path.relative(process.cwd(), outputPath)}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const isEntryPoint = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isEntryPoint) await main();
