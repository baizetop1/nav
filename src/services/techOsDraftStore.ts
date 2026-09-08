import type { RepositoryTarget } from './github';
import type { TechOsSourceFile } from '../types/tech-os';
import { isManagedTechOsPath } from './techOsRepository.ts';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export interface TechOsWorkingCopy { version: 1; base: TechOsSourceFile[]; files: TechOsSourceFile[]; conflicts?: string[] }
const key = (target: RepositoryTarget) => `baize_tech_os_drafts_v1:${encodeURIComponent(`${target.owner}/${target.repo}:${target.branch}`)}`;
function parseWorkingCopy(raw: string | null): TechOsWorkingCopy | null {
  try {
    const value = JSON.parse(raw || 'null');
    const validFiles = (files: unknown): files is TechOsSourceFile[] => Array.isArray(files) && files.length <= 500 && files.every(file => file && typeof file.path === 'string' && isManagedTechOsPath(file.path) && typeof file.content === 'string' && file.content.length <= 256 * 1024) && new Set(files.map(file => file.path)).size === files.length;
    if (value?.version === 1 && validFiles(value.files) && validFiles(value.base) && (value.conflicts === undefined || (Array.isArray(value.conflicts) && value.conflicts.every((path: unknown) => typeof path === 'string' && isManagedTechOsPath(path))))) return value;
  } catch { /* Leave recovery to the explicit save path. */ }
  return null;
}
export function loadTechOsWorkingCopy(target: RepositoryTarget, fallback: TechOsSourceFile[], storage: StorageLike = localStorage): TechOsWorkingCopy {
  try {
    const value = parseWorkingCopy(storage.getItem(key(target)));
    if (value) return value;
  } catch { /* Keep the unreadable original; it is never overwritten on load. */ }
  return { version: 1, base: fallback, files: fallback };
}
export function saveTechOsWorkingCopy(target: RepositoryTarget, copy: TechOsWorkingCopy, storage: StorageLike = localStorage): boolean {
  try {
    const storageKey = key(target), previous = storage.getItem(storageKey);
    if (previous !== null && !parseWorkingCopy(previous)) {
      const recoveryKey = `${storageKey}:recovery`, existing = storage.getItem(recoveryKey);
      // Never replace an unreadable working copy until its exact bytes are safely backed up.
      if (existing !== null && existing !== previous) return false;
      if (existing !== previous) storage.setItem(recoveryKey, previous);
    }
    storage.setItem(storageKey, JSON.stringify(copy)); return true;
  } catch { return false; }
}

/** Three-way merge: only locally changed files may override the freshly read repository. */
export function mergeTechOsWorkingCopy(base: TechOsSourceFile[], local: TechOsSourceFile[], remote: TechOsSourceFile[]) {
  const before = new Map(base.map(file => [file.path, file.content.replace(/\r\n/g, '\n')]));
  const ours = new Map(local.map(file => [file.path, file.content.replace(/\r\n/g, '\n')]));
  const theirs = new Map(remote.map(file => [file.path, file.content.replace(/\r\n/g, '\n')]));
  const files: TechOsSourceFile[] = [], conflicts: string[] = [];
  for (const path of new Set([...before.keys(), ...ours.keys(), ...theirs.keys()])) {
    const b = before.get(path), l = ours.get(path), r = theirs.get(path);
    if (l === b || l === undefined) { if (r !== undefined) files.push({ path, content: r }); continue; }
    if (r !== b && l !== r) conflicts.push(path);
    files.push({ path, content: l });
  }
  return { files, conflicts };
}
