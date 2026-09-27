export const STORAGE_PERSISTENCE_EVENT = 'baize:storage-persistence';
export const SHARED_SYNC_ENTRY_MAX_BYTES = 512 * 1024;
export const NAVIGATION_DRAFT_RECOVERY_KEY = 'nav_cms_draft_recovery_v1';

export type StorageFailureKind = 'quota' | 'permission' | 'size-limit' | 'unavailable' | 'unknown';

export interface StorageWriteOptions {
  label?: string;
  important?: boolean;
  maxBytes?: number;
}

export interface StoragePersistenceIssue {
  key: string;
  label: string;
  kind: StorageFailureKind;
  message: string;
  important: boolean;
  attemptedBytes: number;
  maxBytes?: number;
  occurredAt: string;
}

export interface StoragePersistenceSnapshot {
  issues: StoragePersistenceIssue[];
  pendingWrites: number;
}

export type StorageWriteResult =
  | { ok: true; bytes: number }
  | { ok: false; bytes: number; issue: StoragePersistenceIssue };

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type PendingWrite = { value: string | null; options: StorageWriteOptions };

const issues = new Map<string, StoragePersistenceIssue>();
let snapshotEventQueued = false;
const pendingWrites = new Map<string, PendingWrite>();

export function utf8ByteLength(value: string): number {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value).byteLength;
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) || 0;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}

export function formatStorageBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function classifyStorageError(error: unknown): StorageFailureKind {
  const candidate = error as { name?: unknown; code?: unknown } | null;
  const name = typeof candidate?.name === 'string' ? candidate.name : '';
  const code = typeof candidate?.code === 'number' ? candidate.code : 0;
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || code === 22 || code === 1014) return 'quota';
  if (name === 'SecurityError' || name === 'NotAllowedError') return 'permission';
  return 'unknown';
}

function issueFor(
  key: string,
  bytes: number,
  kind: StorageFailureKind,
  options: StorageWriteOptions,
): StoragePersistenceIssue {
  const label = options.label || key;
  const important = options.important !== false;
  let message: string;
  if (kind === 'size-limit') {
    message = `${label}为 ${formatStorageBytes(bytes)}，超过共享同步单项上限 ${formatStorageBytes(options.maxBytes || SHARED_SYNC_ENTRY_MAX_BYTES)}。`;
  } else if (kind === 'quota') {
    message = `浏览器存储空间不足，${label}未保存。`;
  } else if (kind === 'permission') {
    message = `浏览器禁止本页使用本地存储，${label}未保存。`;
  } else if (kind === 'unavailable') {
    message = `当前环境不支持本地存储，${label}未保存。`;
  } else {
    message = `${label}写入浏览器存储失败。`;
  }
  return {
    key,
    label,
    kind,
    message,
    important,
    attemptedBytes: bytes,
    ...(options.maxBytes === undefined ? {} : { maxBytes: options.maxBytes }),
    occurredAt: new Date().toISOString(),
  };
}

export function writeStorageItem(
  storage: StorageLike,
  key: string,
  value: string,
  options: StorageWriteOptions = {},
): StorageWriteResult {
  const bytes = utf8ByteLength(value);
  if (options.maxBytes !== undefined && bytes > options.maxBytes) {
    return { ok: false, bytes, issue: issueFor(key, bytes, 'size-limit', options) };
  }
  try {
    storage.setItem(key, value);
    return { ok: true, bytes };
  } catch (error) {
    return { ok: false, bytes, issue: issueFor(key, bytes, classifyStorageError(error), options) };
  }
}

function removeStorageItem(storage: StorageLike, key: string, options: StorageWriteOptions = {}): StorageWriteResult {
  try {
    storage.removeItem(key);
    return { ok: true, bytes: 0 };
  } catch (error) {
    return { ok: false, bytes: 0, issue: issueFor(key, 0, classifyStorageError(error), options) };
  }
}

function browserStorage(): { storage?: StorageLike; error?: unknown } {
  try {
    if (typeof localStorage === 'undefined') return {};
    return { storage: localStorage };
  } catch (error) {
    return { error };
  }
}

function emitSnapshot(): void {
  if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return;
  if (snapshotEventQueued) return;
  snapshotEventQueued = true;
  queueMicrotask(() => {
    snapshotEventQueued = false;
    window.dispatchEvent(new CustomEvent(STORAGE_PERSISTENCE_EVENT, { detail: getStoragePersistenceSnapshot() }));
  });
}

function rememberResult(key: string, value: string | null, options: StorageWriteOptions, result: StorageWriteResult): void {
  if (result.ok) {
    issues.delete(key);
    pendingWrites.delete(key);
  } else {
    issues.set(key, result.issue);
    pendingWrites.set(key, { value, options });
  }
  emitSnapshot();
}

export function safeGetLocalStorageItem(key: string, options: StorageWriteOptions = {}): string | null {
  const resolved = browserStorage();
  if (!resolved.storage) {
    const kind: StorageFailureKind = resolved.error ? classifyStorageError(resolved.error) : 'unavailable';
    issues.set(key, issueFor(key, 0, kind === 'unknown' ? 'unavailable' : kind, options));
    emitSnapshot();
    return null;
  }
  try {
    const value = resolved.storage.getItem(key);
    if (issues.has(key) && !pendingWrites.has(key)) {
      issues.delete(key);
      emitSnapshot();
    }
    return value;
  } catch (error) {
    issues.set(key, issueFor(key, 0, classifyStorageError(error), options));
    emitSnapshot();
    return null;
  }
}

export function safeSetLocalStorageItem(
  key: string,
  value: string,
  options: StorageWriteOptions = {},
): StorageWriteResult {
  const resolved = browserStorage();
  const bytes = utf8ByteLength(value);
  const result = resolved.storage
    ? writeStorageItem(resolved.storage, key, value, options)
    : { ok: false as const, bytes, issue: issueFor(key, bytes, resolved.error ? classifyStorageError(resolved.error) : 'unavailable', options) };
  rememberResult(key, value, options, result);
  return result;
}

export function safeRemoveLocalStorageItem(key: string, options: StorageWriteOptions = {}): StorageWriteResult {
  const resolved = browserStorage();
  const result = resolved.storage
    ? removeStorageItem(resolved.storage, key, options)
    : { ok: false as const, bytes: 0, issue: issueFor(key, 0, resolved.error ? classifyStorageError(resolved.error) : 'unavailable', options) };
  rememberResult(key, null, options, result);
  return result;
}

export function getStoragePersistenceSnapshot(): StoragePersistenceSnapshot {
  return {
    issues: [...issues.values()].sort((left, right) => Number(right.important) - Number(left.important) || right.occurredAt.localeCompare(left.occurredAt)),
    pendingWrites: pendingWrites.size,
  };
}

export function retryPendingLocalStorageWrites(): StoragePersistenceSnapshot {
  for (const [key, pending] of [...pendingWrites]) {
    if (pending.value === null) safeRemoveLocalStorageItem(key, pending.options);
    else safeSetLocalStorageItem(key, pending.value, pending.options);
  }
  return getStoragePersistenceSnapshot();
}
