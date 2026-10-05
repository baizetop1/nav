import { siteConfig } from '../data/config.ts';
import { blogDraftScope, blogDraftStorageKey, listBlogDrafts, parseBlogDraft, BLOG_WORKSPACE_EVENT, type BlogLocalDraft, type BlogRepositoryTarget } from './blogWorkspace.ts';
import { utf8ByteLength } from './safeStorage.ts';
import { parseWorkingCopy, techOsDraftKey, TECH_OS_DRAFT_EVENT, type TechOsWorkingCopy } from '../services/techOsDraftStore.ts';
import { readDraftDeployment } from './draftDeployment.ts';

export const DRAFT_BACKUP_FORMAT = 'baize-working-drafts';
export const DRAFT_BACKUP_MAX_BYTES = 8 * 1024 * 1024;
export type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> & Partial<Pick<Storage, 'length' | 'key'>>;
export interface WorkingDraftBackup {
  format: typeof DRAFT_BACKUP_FORMAT;
  version: 1;
  exportedAt: string;
  blogs: Array<{ target: BlogRepositoryTarget; drafts: BlogLocalDraft[] }>;
  techOs: Array<{ target: BlogRepositoryTarget; copy: TechOsWorkingCopy }>;
}
export interface StorageWrite { key: string; before: string | null; after: string | null }
export interface DraftRestorePlan { writes: StorageWrite[]; blogs: number; techOs: number; unchanged: number; skipped: string[] }
export interface DraftSummaryItem { id: string; label: string; state: string; pending: boolean; kind: 'blog' | 'tech-os' }

function checkedTarget(value: unknown): BlogRepositoryTarget {
  if (!value || typeof value !== 'object') throw new Error('草稿备份中的仓库信息无效。');
  const target = value as BlogRepositoryTarget;
  blogDraftScope(target);
  return { owner: target.owner.trim().toLowerCase(), repo: target.repo.trim().toLowerCase(), branch: target.branch.trim() };
}
const targetLabel = (target: BlogRepositoryTarget) => `${target.owner}/${target.repo}:${target.branch}`;
const blogContent = (draft: BlogLocalDraft) => JSON.stringify([draft.markdown, draft.source, draft.lastCommit || null]);
const copyContent = (copy: TechOsWorkingCopy) => JSON.stringify([
  [...copy.base].sort((a, b) => a.path.localeCompare(b.path)),
  [...copy.files].sort((a, b) => a.path.localeCompare(b.path)),
  [...(copy.conflicts || [])].sort(),
]);

function checkedCopy(value: unknown): TechOsWorkingCopy {
  const serialized = JSON.stringify(value);
  if (utf8ByteLength(serialized) > 4 * 1024 * 1024) throw new Error('单份 Tech OS 工作副本超过 4 MiB，请先整理后备份。');
  const copy = parseWorkingCopy(serialized);
  if (!copy) throw new Error('Tech OS 工作副本损坏，原记录未改动。');
  if ([...copy.base, ...copy.files].some(file => utf8ByteLength(file.content) > 256 * 1024)) throw new Error('Tech OS 单个文件超过 256 KiB。');
  return copy;
}

export function parseWorkingDraftBackup(input: unknown): WorkingDraftBackup {
  let value = input;
  if (typeof value === 'string') {
    if (utf8ByteLength(value) > DRAFT_BACKUP_MAX_BYTES) throw new Error('草稿备份不能超过 8 MiB。');
    try { value = JSON.parse(value); } catch { throw new Error('草稿备份不是有效的 JSON。'); }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('草稿备份格式无效。');
  const data = value as WorkingDraftBackup;
  if (data.format !== DRAFT_BACKUP_FORMAT || data.version !== 1 || typeof data.exportedAt !== 'string' || !Number.isFinite(Date.parse(data.exportedAt))
    || !Array.isArray(data.blogs) || !Array.isArray(data.techOs) || data.blogs.length > 10 || data.techOs.length > 10) throw new Error('草稿备份版本或结构无效。');
  const blogs = data.blogs.map(group => {
    if (!group || !Array.isArray(group.drafts) || group.drafts.length > 100) throw new Error('每个仓库最多备份 100 篇博客草稿。');
    const target = checkedTarget(group.target), drafts = group.drafts.map(draft => parseBlogDraft(draft));
    if (drafts.some(draft => draft.revision < 1) || new Set(drafts.map(draft => draft.id)).size !== drafts.length) throw new Error('博客草稿版本或编号无效。');
    return { target, drafts };
  });
  const techOs = data.techOs.map(group => {
    if (!group) throw new Error('Tech OS 备份内容无效。');
    return { target: checkedTarget(group.target), copy: checkedCopy(group.copy) };
  });
  if (new Set(blogs.map(group => blogDraftScope(group.target))).size !== blogs.length || new Set(techOs.map(group => techOsDraftKey(group.target))).size !== techOs.length) throw new Error('备份包含重复仓库。');
  const backup: WorkingDraftBackup = { format: DRAFT_BACKUP_FORMAT, version: 1, exportedAt: data.exportedAt, blogs, techOs };
  if (utf8ByteLength(JSON.stringify(backup)) > DRAFT_BACKUP_MAX_BYTES) throw new Error('草稿备份不能超过 8 MiB。');
  return backup;
}

export function captureWorkingDrafts(storage: DraftStorage = localStorage): WorkingDraftBackup {
  const blogs: WorkingDraftBackup['blogs'] = [];
  if (typeof storage.length === 'number' && typeof storage.key === 'function') {
    const local = listBlogDrafts(siteConfig.blogRepository, storage as Storage);
    if (local.issues.length) throw new Error('部分博客草稿无法读取，请先在博客工作台处理或导出原文；备份未生成。');
    if (local.drafts.length) blogs.push({ target: siteConfig.blogRepository, drafts: local.drafts });
  }
  const raw = storage.getItem(techOsDraftKey(siteConfig.repository));
  const techOs: WorkingDraftBackup['techOs'] = raw === null ? [] : [{ target: siteConfig.repository, copy: checkedCopy(JSON.parse(raw)) }];
  return parseWorkingDraftBackup({ format: DRAFT_BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), blogs, techOs });
}

/** Existing blog documents are never replaced; distinct content gets a fresh ID. */
export function planDraftRestore(input: unknown, storage: DraftStorage = localStorage): DraftRestorePlan {
  const backup = parseWorkingDraftBackup(input);
  const plan: DraftRestorePlan = { writes: [], blogs: 0, techOs: 0, unchanged: 0, skipped: [] };
  const plannedKeys = new Set<string>();
  for (const group of backup.blogs) {
    if (blogDraftScope(group.target) !== blogDraftScope(siteConfig.blogRepository)) {
      plan.skipped.push(`${targetLabel(group.target)}：不是当前博客仓库，未恢复。`); continue;
    }
    const local = typeof storage.length === 'number' && typeof storage.key === 'function' ? listBlogDrafts(group.target, storage as Storage).drafts : [];
    const signatures = new Set(local.map(blogContent));
    for (const incoming of group.drafts) {
      if (signatures.has(blogContent(incoming))) { plan.unchanged++; continue; }
      let id = incoming.id, key = blogDraftStorageKey(group.target, id);
      for (let tries = 0; storage.getItem(key) !== null || plannedKeys.has(key); tries++) {
        if (tries > 8) throw new Error('无法分配安全的恢复副本编号，请重试。');
        id = crypto.randomUUID(); key = blogDraftStorageKey(group.target, id);
      }
      const restored = parseBlogDraft({ ...incoming, id, revision: 1 });
      plan.writes.push({ key, before: null, after: JSON.stringify(restored) });
      plannedKeys.add(key); signatures.add(blogContent(incoming)); plan.blogs++;
    }
  }
  for (const group of backup.techOs) {
    if (techOsDraftKey(group.target) !== techOsDraftKey(siteConfig.repository)) {
      plan.skipped.push(`${targetLabel(group.target)}：不是当前 Tech OS 仓库，未恢复。`); continue;
    }
    const key = techOsDraftKey(group.target), current = storage.getItem(key);
    if (current !== null) {
      const parsed = parseWorkingCopy(current);
      if (parsed && copyContent(parsed) === copyContent(group.copy)) plan.unchanged++;
      else plan.skipped.push(`${targetLabel(group.target)}：已有不同的 Tech OS 工作副本，保留本机，未覆盖。`);
      continue;
    }
    plan.writes.push({ key, before: null, after: JSON.stringify(group.copy) }); plan.techOs++;
  }
  return plan;
}

/** Roll back only our own writes; never undo a later edit by another tab. */
export function applyStorageWrites(writes: StorageWrite[], storage: DraftStorage): void {
  const applied: StorageWrite[] = [];
  try {
    for (const write of writes) {
      if (storage.getItem(write.key) !== write.before) throw new Error('另一页面改动了恢复目标，请重新预览；本机内容已保留。');
      if (write.after === null) storage.removeItem(write.key); else storage.setItem(write.key, write.after);
      applied.push(write);
    }
  } catch (error) {
    let incomplete = false;
    for (const write of applied.reverse()) {
      try {
        if (storage.getItem(write.key) !== write.after) { incomplete = true; continue; }
        if (write.before === null) storage.removeItem(write.key); else storage.setItem(write.key, write.before);
      } catch { incomplete = true; }
    }
    throw new Error(`${error instanceof Error ? error.message : '恢复写入失败。'}${incomplete ? '部分回滚未完成，请保留备份文件并检查本机内容。' : '本次恢复已撤回。'}`);
  }
}

export function notifyDraftRestore(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(BLOG_WORKSPACE_EVENT));
    window.dispatchEvent(new Event(TECH_OS_DRAFT_EVENT));
  }
}

export function restoreWorkingDrafts(input: unknown, storage: DraftStorage = localStorage): DraftRestorePlan {
  const plan = planDraftRestore(input, storage);
  applyStorageWrites(plan.writes, storage); notifyDraftRestore(); return plan;
}

export function draftRestoreDescription(plan: Pick<DraftRestorePlan, 'blogs' | 'techOs' | 'unchanged' | 'skipped'>): string {
  return `博客恢复副本 ${plan.blogs} 篇 · Tech OS ${plan.techOs} 份 · 相同内容 ${plan.unchanged} 项 · 保留本机冲突 ${plan.skipped.length} 项`;
}

export function readWorkingDraftSummary(storage: DraftStorage = localStorage): { items: DraftSummaryItem[]; issues: string[] } {
  const items: DraftSummaryItem[] = [], issues: string[] = [];
  if (typeof storage.length === 'number' && typeof storage.key === 'function') {
    const local = listBlogDrafts(siteConfig.blogRepository, storage as Storage);
    issues.push(...local.issues.map(issue => issue.message));
    for (const draft of local.drafts) {
      const pending = !draft.source || draft.markdown !== draft.source.markdown;
      const title = draft.markdown.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1] || draft.source?.path || '未命名文章';
      const deployment = draft.lastCommit ? readDraftDeployment(siteConfig.blogRepository, draft.lastCommit.sha, storage) : null;
      const state = pending ? draft.source ? '有本机修改，待提交' : '仅存本机，待提交' : draft.source?.path.startsWith('_drafts/') ? '已提交仓库草稿，未发布' : deployment?.state === 'success' ? '最近提交已确认上线' : deployment?.state === 'failure' ? '已提交，部署失败' : deployment?.state === 'running' || deployment?.state === 'waiting' ? '已提交，等待部署完成' : '已提交文章，上线状态待核对';
      items.push({ id: draft.id, label: title.slice(0, 120), state, pending, kind: 'blog' });
    }
  }
  try {
    const raw = storage.getItem(techOsDraftKey(siteConfig.repository));
    if (raw !== null) {
      const copy = parseWorkingCopy(raw);
      if (!copy) issues.push('Tech OS 工作副本无法读取，原记录未覆盖。');
      else {
        const base = new Map(copy.base.map(file => [file.path, file.content]));
        const files = new Map(copy.files.map(file => [file.path, file.content]));
        for (const path of new Set([...base.keys(), ...files.keys(), ...(copy.conflicts || [])])) if (base.get(path) !== files.get(path) || copy.conflicts?.includes(path)) items.push({ id: path, label: path, state: copy.conflicts?.includes(path) ? '存在冲突，待处理' : '已存本机，待提交', pending: true, kind: 'tech-os' });
        if (!items.some(item => item.kind === 'tech-os')) items.push({ id: 'tech-os-clean', label: 'Tech OS 工作副本', state: '与读取基线一致，上线状态待核对', pending: false, kind: 'tech-os' });
      }
    }
  } catch { issues.push('Tech OS 本机存储无法读取。'); }
  return { items, issues };
}
