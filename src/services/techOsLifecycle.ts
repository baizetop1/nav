import type { TechOsEntity, TechOsIndex, TechOsSourceFile } from '../types/tech-os';
import { parseFlatYaml, parseFrontMatter, validateTechOsDraftFiles } from './techOsDraftValidation.ts';

export interface LifecyclePlan { files: TechOsSourceFile[]; updates: TechOsSourceFile[]; movedPaths: string[]; summary: string }

export function indexFromTechOsFiles(files: TechOsSourceFile[]): TechOsIndex {
  const validation = validateTechOsDraftFiles(files);
  if (!validation.valid) throw new Error(validation.errors.join('\n'));
  const state = parseFlatYaml(files.find(file => file.path === 'tech-os/state.yml')!.content, 'state.yml');
  return {
    schema: 'tech-os-index/v1', sourceSchema: 'tech-os/v1', sourceUpdated: String(state.updated), files,
    state: { visionId: String(state.vision_id), mainRouteId: String(state.main_route_id), currentQuestId: String(state.current_quest_id), mode: state.mode as TechOsIndex['state']['mode'] },
    entities: files.filter(file => file.path.endsWith('.md')).map(file => {
      const { data, body } = parseFrontMatter(file.content, file.path);
      return { id: String(data.id), kind: data.kind as TechOsEntity['kind'], title: String(data.title), status: String(data.status), created: String(data.created), tags: data.tags as string[], fields: data, body, sourcePath: file.path };
    }),
  };
}

function setFields(content: string, changes: Record<string, string | boolean | string[]>): string {
  const hasFrontMatter = content.startsWith('---');
  const parsed = hasFrontMatter ? parseFrontMatter(content, '源文件') : { data: parseFlatYaml(content, 'state.yml'), body: '' };
  const yaml = Object.entries({ ...parsed.data, ...changes }).map(([key, value]) => Array.isArray(value) ? (value.length ? `${key}:\n${value.map(item => `  - ${JSON.stringify(item)}`).join('\n')}` : `${key}: []`) : `${key}: ${JSON.stringify(value)}`).join('\n');
  return hasFrontMatter ? `---\n${yaml}\n---\n${parsed.body}` : `${yaml}\n`;
}

function planEditor(source: TechOsSourceFile[]) {
  const files = new Map(source.map(file => [file.path, file.content.replace(/\r\n/g, '\n')]));
  const movedPaths: string[] = [];
  const edit = (path: string, changes: Record<string, string | boolean | string[]>, destination = path, appendix = '') => {
    const content = files.get(path);
    if (!content) throw new Error(`找不到 ${path}`);
    if (destination !== path) {
      if (files.has(destination)) throw new Error(`目标文件已存在：${destination}`);
      files.delete(path); movedPaths.push(path);
    }
    files.set(destination, setFields(content, changes) + appendix);
  };
  const finish = (summary: string): LifecyclePlan => {
    const result = [...files].map(([path, content]) => ({ path, content }));
    indexFromTechOsFiles(result);
    const baseline = new Map(source.map(file => [file.path, file.content.replace(/\r\n/g, '\n')]));
    return { files: result, updates: result.filter(file => baseline.get(file.path) !== file.content), movedPaths, summary };
  };
  return { files, edit, finish };
}

export function completeQuest(source: TechOsSourceFile[], questId: string, conclusion: string, evidence: string, nextQuestId?: string, date = new Date().toISOString().slice(0, 10)): LifecyclePlan {
  if (conclusion.trim().length < 10 || evidence.trim().length < 5) throw new Error('请填写真实结论（至少 10 字）与可核验的证据位置（至少 5 字）。');
  const index = indexFromTechOsFiles(source);
  const quest = index.entities.find(item => item.id === questId && item.kind === 'quest');
  if (!quest || quest.status !== 'active' || index.state.currentQuestId !== questId) throw new Error('仅能完成当前正在进行的任务。请先读取最新状态。');
  const pending = index.entities.filter(item => item.kind === 'quest' && item.fields.route_id === quest.fields.route_id && item.id !== questId && ['backlog', 'active'].includes(item.status)).sort((a, b) => Number(a.fields.order) - Number(b.fields.order));
  const next = nextQuestId ? pending.find(item => item.id === nextQuestId) : pending[0];
  if (nextQuestId && !next) throw new Error('下一任务必须来自当前路线尚未完成的任务。');
  const editor = planEditor(source);
  editor.edit(quest.sourcePath, { status: 'completed' }, `tech-os/quests/completed/${quest.id}.md`, `\n\n## 完成确认 · ${date}\n\n### 当前结论\n\n${conclusion.trim()}\n\n### 验证证据\n\n${evidence.trim()}\n`);
  if (next) editor.edit(next.sourcePath, { status: 'active' }, `tech-os/quests/active/${next.id}.md`);
  editor.edit('tech-os/state.yml', { current_quest_id: next?.id || '', updated: date });
  return editor.finish(next ? `完成 ${quest.id}，开始 ${next.id}` : `完成 ${quest.id}；本路线任务已结束，进入复盘`);
}

export function activateRoute(source: TechOsSourceFile[], routeId: string, questions: string[], date = new Date().toISOString().slice(0, 10)): LifecyclePlan {
  const index = indexFromTechOsFiles(source);
  const route = index.entities.find(item => item.id === routeId && item.kind === 'route');
  const previous = index.entities.find(item => item.id === index.state.mainRouteId)!;
  if (!route || route.status !== 'backlog' || route.id === previous.id) throw new Error('请选择已保存的 Backlog 路线。');
  const editor = planEditor(source);
  const oldQuests = index.entities.filter(item => item.kind === 'quest' && item.fields.route_id === previous.id);
  const completed = oldQuests.length > 0 && oldQuests.every(item => ['completed', 'skipped'].includes(item.status));
  editor.edit(previous.sourcePath, { status: completed ? 'completed' : 'paused', main: false }, completed ? `tech-os/routes/completed/${previous.id}.md` : `tech-os/graveyard/${previous.id}.md`);
  oldQuests.filter(item => item.status === 'active').forEach(item => editor.edit(item.sourcePath, { status: 'backlog' }, `tech-os/quests/backlog/${item.id}.md`));
  let quests = index.entities.filter(item => item.kind === 'quest' && item.fields.route_id === route.id).sort((a, b) => Number(a.fields.order) - Number(b.fields.order));
  if (!quests.length) {
    const titles = questions.map(value => value.trim()).filter(Boolean);
    if (!titles.length || titles.length > 30 || titles.some(value => !/[?？]$/.test(value) || value.length > 200)) throw new Error('请为新路线填写 1–30 个核心问题，每行一个，以问号结尾。');
    let sequence = Math.max(0, ...index.entities.filter(item => item.kind === 'quest').map(item => Number(item.id.split('-')[1])));
    quests = titles.map((title, i) => {
      const id = `QUEST-${String(++sequence).padStart(3, '0')}`;
      const path = `tech-os/quests/${i ? 'backlog' : 'active'}/${id}.md`;
      const content = `---\nschema: tech-os/v1\nkind: quest\nid: ${id}\ntitle: ${JSON.stringify(title)}\nroute_id: ${route.id}\nstatus: ${i ? 'backlog' : 'active'}\norder: ${i + 1}\ncreated: ${date}\nquestion_ids: []\nknowledge_ids: []\nlab_ids: []\nproject_ids: []\ntags: []\n---\n\n## 研究问题\n\n${title}\n\n### S1 · 建立解释\n\n学什么：明确这个问题的输入、过程和输出。\n\n动手做：查阅一份一手资料，用自己的话写下解释和来源。\n\n完成标志：能给出至少一个具体例子，并列出仍不确定的部分。\n\n### S2 · 动手验证\n\n学什么：区分假设和观察结果。\n\n动手做：设计一个可重复的小实验，记录环境、步骤和结果。\n\n完成标志：保存可复现的记录或产物路径，写下当前结论。\n\n## 当前结论\n\n待实际学习后填写，不自动认定掌握。\n`;
      editor.files.set(path, content);
      return { id, sourcePath: path, status: i ? 'backlog' : 'active' } as TechOsEntity;
    });
  }
  const first = quests.find(item => ['backlog', 'active'].includes(item.status));
  if (!first) throw new Error('这条路线没有可启动的任务。');
  editor.edit(first.sourcePath, { status: 'active' }, `tech-os/quests/active/${first.id}.md`);
  editor.edit(route.sourcePath, { status: 'active', main: true, quest_ids: quests.map(item => item.id) }, `tech-os/routes/active/${route.id}.md`);
  editor.edit('tech-os/state.yml', { main_route_id: route.id, current_quest_id: first.id, updated: date });
  return editor.finish(`启用 ${route.id}，开始 ${first.id}；旧路线${completed ? '完成' : '暂停并保留'}`);
}
