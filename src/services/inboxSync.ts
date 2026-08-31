import type { RepositoryTarget } from './github.ts';
import { getEncryptedInbox, saveEncryptedInbox } from './github.ts';
import { decryptTextPayload, encryptTextPayload, type EncryptedTextFields } from './encryptedNote.ts';
import { parseInboxStore } from './inbox.ts';
import {
  emptyStudyProgressStore,
  mergeStudyProgressStores,
  parseStudyProgressStore,
  type StudyProgressStore,
  type StudyTaskProgress,
} from './techOsStudyProgress.ts';
import type { InboxItem, InboxStore } from '../types/inbox.ts';
import type { InboxSyncMeta } from '../types/inbox-sync.ts';

export const ENCRYPTED_INBOX_FORMAT = 'baize-inbox' as const;
export const ENCRYPTED_INBOX_VERSION = 1 as const;
export const PRIVATE_SHARED_DATA_VERSION = 2 as const;
export const INBOX_SYNC_META_KEY = 'baize_inbox_sync_meta_v1';
const INBOX_ENCRYPTION_CONTEXT = 'baize-nav-inbox-v1';

export interface EncryptedInbox extends EncryptedTextFields {
  format: typeof ENCRYPTED_INBOX_FORMAT;
  version: typeof ENCRYPTED_INBOX_VERSION;
  encryptedAt: string;
}

export interface PrivateSharedDataStore {
  version: typeof PRIVATE_SHARED_DATA_VERSION;
  updatedAt: string;
  items: InboxItem[];
  studyProgress: StudyProgressStore;
}

export interface InboxSyncResult {
  items: InboxItem[];
  studyProgress: StudyProgressStore;
  syncedAt: string;
  commitUrl: string;
}

export interface InboxRestoreResult {
  items: InboxItem[];
  studyProgress: StudyProgressStore;
  remoteItems: InboxItem[];
  remoteStudyProgress: StudyProgressStore;
  restoredAt: string;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function mergeInboxItems(localItems: InboxItem[], remoteItems: InboxItem[]): InboxItem[] {
  const merged = new Map<string, InboxItem>();
  for (const item of [...localItems, ...remoteItems]) {
    const existing = merged.get(item.id);
    if (!existing) {
      merged.set(item.id, item);
      continue;
    }
    merged.set(item.id, selectNewestInboxItem(existing, item));
  }
  return [...merged.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id));
}

export async function encryptInbox(
  items: InboxItem[],
  password: string,
  now = new Date(),
  studyProgress: StudyProgressStore = emptyStudyProgressStore(),
): Promise<EncryptedInbox> {
  const updatedAt = now.toISOString();
  if (!parseInboxStore({ version: 1, updatedAt, items })) throw new Error('本机 Inbox 数据无效，已停止加密同步。');
  const parsedStudyProgress = parseStudyProgressStore(studyProgress);
  if (!parsedStudyProgress) throw new Error('本机学习进度数据无效，已停止加密同步。');
  const store: PrivateSharedDataStore = {
    version: PRIVATE_SHARED_DATA_VERSION,
    updatedAt,
    items,
    studyProgress: parsedStudyProgress,
  };
  return {
    format: ENCRYPTED_INBOX_FORMAT,
    version: ENCRYPTED_INBOX_VERSION,
    ...await encryptTextPayload(JSON.stringify(store), password, INBOX_ENCRYPTION_CONTEXT),
    encryptedAt: updatedAt,
  };
}

export async function decryptInbox(input: EncryptedInbox | string | unknown, password: string): Promise<PrivateSharedDataStore> {
  const payload = parseEncryptedInbox(input);
  const plaintext = await decryptTextPayload(payload, password, INBOX_ENCRYPTION_CONTEXT);
  let value: unknown;
  try {
    value = JSON.parse(plaintext) as unknown;
  } catch {
    throw new Error('远端共享数据解密成功，但内容不是有效 JSON。');
  }

  const legacyStore = parseInboxStore(value);
  if (legacyStore) return normalizeLegacyInboxStore(legacyStore);
  const store = parsePrivateSharedDataStore(value);
  if (!store) throw new Error('远端共享数据 schema 无效，已保留本机数据。');
  return store;
}

export async function restoreInboxFromCloud(
  localItems: InboxItem[],
  target: RepositoryTarget,
  token: string,
  password: string,
  localStudyProgress: StudyProgressStore = emptyStudyProgressStore(),
): Promise<InboxRestoreResult> {
  const remote = await getEncryptedInbox(target, token);
  if (!remote) throw new Error('远端还没有加密共享数据。请先在已有设备执行“合并并同步”。');
  const remoteStore = await decryptInbox(remote.payload, password);
  return {
    items: mergeInboxItems(localItems, remoteStore.items),
    studyProgress: mergeStudyProgressStores(localStudyProgress, remoteStore.studyProgress),
    remoteItems: remoteStore.items,
    remoteStudyProgress: remoteStore.studyProgress,
    restoredAt: remoteStore.updatedAt,
  };
}

export async function synchronizeInbox(
  localItems: InboxItem[],
  target: RepositoryTarget,
  token: string,
  password: string,
  localStudyProgress: StudyProgressStore = emptyStudyProgressStore(),
): Promise<InboxSyncResult> {
  const remote = await getEncryptedInbox(target, token);
  const remoteStore = remote ? await decryptInbox(remote.payload, password) : null;
  const items = mergeInboxItems(localItems, remoteStore?.items || []);
  const studyProgress = mergeStudyProgressStores(localStudyProgress, remoteStore?.studyProgress || emptyStudyProgressStore());
  const payload = await encryptInbox(items, password, new Date(), studyProgress);
  const commitUrl = await saveEncryptedInbox(target, token, payload, remote?.sha);
  return { items, studyProgress, syncedAt: payload.encryptedAt, commitUrl };
}

export function createInboxSyncMeta(
  items: InboxItem[],
  syncedAt = new Date().toISOString(),
  studyProgress: StudyProgressStore = emptyStudyProgressStore(),
): InboxSyncMeta {
  return {
    version: 2,
    lastSyncedAt: syncedAt,
    itemVersions: Object.fromEntries(items.map(item => [item.id, inboxItemSyncVersion(item)])),
    studyVersions: Object.fromEntries(flattenStudyProgress(studyProgress).map(([key, progress]) => [key, studyProgressSyncVersion(progress)])),
  };
}

export function parseInboxSyncMeta(value: unknown): InboxSyncMeta | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const meta = value as Record<string, unknown>;
  if ((meta.version !== 1 && meta.version !== 2) || !isValidTimestamp(meta.lastSyncedAt)) return null;
  if (!isItemVersionMap(meta.itemVersions)) return null;
  if (meta.version === 1) {
    return {
      version: 2,
      lastSyncedAt: meta.lastSyncedAt,
      itemVersions: { ...meta.itemVersions },
      studyVersions: {},
    };
  }
  if (!isStudyVersionMap(meta.studyVersions)) return null;
  return {
    version: 2,
    lastSyncedAt: meta.lastSyncedAt,
    itemVersions: { ...meta.itemVersions },
    studyVersions: { ...meta.studyVersions },
  };
}

export function loadInboxSyncMeta(storage: StorageLike = localStorage): InboxSyncMeta | null {
  try {
    const saved = storage.getItem(INBOX_SYNC_META_KEY);
    return saved ? parseInboxSyncMeta(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
}

export function saveInboxSyncMeta(meta: InboxSyncMeta, storage: StorageLike = localStorage): boolean {
  const parsed = parseInboxSyncMeta(meta);
  if (!parsed) return false;
  try {
    storage.setItem(INBOX_SYNC_META_KEY, JSON.stringify(parsed));
    return true;
  } catch {
    return false;
  }
}

export function isInboxItemSynced(item: InboxItem, meta: InboxSyncMeta | null): boolean {
  const syncedVersion = meta?.itemVersions[item.id];
  return syncedVersion === item.updatedAt || syncedVersion === inboxItemSyncVersion(item);
}

export function countUnsyncedInboxItems(items: InboxItem[], meta: InboxSyncMeta | null): number {
  return items.filter(item => !isInboxItemSynced(item, meta)).length;
}

export function countUnsyncedStudyProgress(studyProgress: StudyProgressStore, meta: InboxSyncMeta | null): number {
  return flattenStudyProgress(studyProgress)
    .filter(([key, progress]) => {
      const syncedVersion = meta?.studyVersions[key];
      return syncedVersion !== progress.updatedAt && syncedVersion !== studyProgressSyncVersion(progress);
    })
    .length;
}

function normalizeLegacyInboxStore(store: InboxStore): PrivateSharedDataStore {
  return {
    version: PRIVATE_SHARED_DATA_VERSION,
    updatedAt: store.updatedAt,
    items: store.items,
    studyProgress: emptyStudyProgressStore(),
  };
}

function parsePrivateSharedDataStore(value: unknown): PrivateSharedDataStore | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const expectedKeys = ['version', 'updatedAt', 'items', 'studyProgress'];
  if (Object.keys(candidate).some(key => !expectedKeys.includes(key)) || expectedKeys.some(key => !(key in candidate))) return null;
  if (candidate.version !== PRIVATE_SHARED_DATA_VERSION || !isValidTimestamp(candidate.updatedAt)) return null;
  const inboxStore = parseInboxStore({ version: 1, updatedAt: candidate.updatedAt, items: candidate.items });
  const studyProgress = parseStudyProgressStore(candidate.studyProgress);
  if (!inboxStore || !studyProgress) return null;
  return {
    version: PRIVATE_SHARED_DATA_VERSION,
    updatedAt: candidate.updatedAt,
    items: inboxStore.items,
    studyProgress,
  };
}

function flattenStudyProgress(studyProgress: StudyProgressStore): Array<[string, StudyTaskProgress]> {
  return Object.entries(studyProgress.quests).flatMap(([questId, tasks]) =>
    Object.entries(tasks).map(([taskId, progress]) => [`${questId}/${taskId}`, progress] as [string, StudyTaskProgress]),
  );
}

function isItemVersionMap(value: unknown): value is Record<string, string> {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.entries(value as Record<string, unknown>)
      .every(([id, version]) => Boolean(id) && isItemSyncVersion(version));
}

function isStudyVersionMap(value: unknown): value is Record<string, string> {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.entries(value as Record<string, unknown>)
      .every(([id, version]) => Boolean(id) && isStudySyncVersion(version));
}

function isItemSyncVersion(value: unknown): value is string {
  if (isValidTimestamp(value)) return true;
  if (typeof value !== 'string') return false;
  const separator = value.lastIndexOf('|');
  return separator > 0
    && isValidTimestamp(value.slice(0, separator))
    && /^[0-9a-f]{8}$/.test(value.slice(separator + 1));
}

function isStudySyncVersion(value: unknown): value is string {
  if (isValidTimestamp(value)) return true;
  if (typeof value !== 'string') return false;
  const separator = value.lastIndexOf('|');
  return separator > 0
    && isValidTimestamp(value.slice(0, separator))
    && /^[01]$/.test(value.slice(separator + 1));
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function selectNewestInboxItem(left: InboxItem, right: InboxItem): InboxItem {
  const timeComparison = left.updatedAt.localeCompare(right.updatedAt);
  if (timeComparison !== 0) return timeComparison > 0 ? left : right;
  if (Boolean(left.deletedAt) !== Boolean(right.deletedAt)) return left.deletedAt ? left : right;
  const leftValue = stableItemValue(left);
  const rightValue = stableItemValue(right);
  if (leftValue === rightValue) return { ...left, tags: [...left.tags].sort() };
  return leftValue > rightValue ? left : right;
}

function stableItemValue(item: InboxItem): string {
  return JSON.stringify({
    id: item.id,
    type: item.type,
    title: item.title || '',
    content: item.content || '',
    url: item.url || '',
    tags: [...item.tags].sort(),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    status: item.status,
    deletedAt: item.deletedAt || '',
  });
}

function inboxItemSyncVersion(item: InboxItem): string {
  return `${item.updatedAt}|${fnv1a(stableItemValue(item))}`;
}

function studyProgressSyncVersion(progress: { completed: boolean; updatedAt: string }): string {
  return `${progress.updatedAt}|${progress.completed ? '1' : '0'}`;
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function parseEncryptedInbox(input: EncryptedInbox | string | unknown): EncryptedInbox {
  let value: unknown = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      throw new Error('远端 Inbox 密文文件不是有效 JSON。');
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('远端 Inbox 密文格式无效。');
  const payload = value as Record<string, unknown>;
  const expectedKeys = ['format', 'version', 'algorithm', 'kdf', 'iterations', 'salt', 'iv', 'ciphertext', 'encryptedAt'];
  if (Object.keys(payload).some(key => !expectedKeys.includes(key)) || expectedKeys.some(key => !(key in payload))) {
    throw new Error('远端 Inbox 密文包含不支持的字段。');
  }
  if (payload.format !== ENCRYPTED_INBOX_FORMAT || payload.version !== ENCRYPTED_INBOX_VERSION) {
    throw new Error('不支持的远端 Inbox 密文版本。');
  }
  if (!isValidTimestamp(payload.encryptedAt)) throw new Error('远端 Inbox 密文时间无效。');
  return payload as unknown as EncryptedInbox;
}
