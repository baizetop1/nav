import type { RepositoryTarget } from './github.ts';
import { getEncryptedInbox, saveEncryptedInbox } from './github.ts';
import { decryptTextPayload, encryptTextPayload, type EncryptedTextFields } from './encryptedNote.ts';
import { parseInboxStore } from './inbox.ts';
import type { InboxItem, InboxStore } from '../types/inbox.ts';
import type { InboxSyncMeta } from '../types/inbox-sync.ts';

export const ENCRYPTED_INBOX_FORMAT = 'baize-inbox' as const;
export const ENCRYPTED_INBOX_VERSION = 1 as const;
export const INBOX_SYNC_META_KEY = 'baize_inbox_sync_meta_v1';
const INBOX_ENCRYPTION_CONTEXT = 'baize-nav-inbox-v1';

export interface EncryptedInbox extends EncryptedTextFields {
  format: typeof ENCRYPTED_INBOX_FORMAT;
  version: typeof ENCRYPTED_INBOX_VERSION;
  encryptedAt: string;
}

export interface InboxSyncResult {
  items: InboxItem[];
  syncedAt: string;
  commitUrl: string;
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

export async function encryptInbox(items: InboxItem[], password: string, now = new Date()): Promise<EncryptedInbox> {
  const store: InboxStore = { version: 1, updatedAt: now.toISOString(), items };
  if (!parseInboxStore(store)) throw new Error('本机 Inbox 数据无效，已停止加密同步。');
  return {
    format: ENCRYPTED_INBOX_FORMAT,
    version: ENCRYPTED_INBOX_VERSION,
    ...await encryptTextPayload(JSON.stringify(store), password, INBOX_ENCRYPTION_CONTEXT),
    encryptedAt: now.toISOString(),
  };
}

export async function decryptInbox(input: EncryptedInbox | string | unknown, password: string): Promise<InboxStore> {
  const payload = parseEncryptedInbox(input);
  const plaintext = await decryptTextPayload(payload, password, INBOX_ENCRYPTION_CONTEXT);
  let value: unknown;
  try {
    value = JSON.parse(plaintext) as unknown;
  } catch {
    throw new Error('远端 Inbox 解密成功，但内容不是有效 JSON。');
  }
  const store = parseInboxStore(value);
  if (!store) throw new Error('远端 Inbox schema 无效，已保留本机数据。');
  return store;
}

export async function synchronizeInbox(
  localItems: InboxItem[],
  target: RepositoryTarget,
  token: string,
  password: string,
): Promise<InboxSyncResult> {
  const remote = await getEncryptedInbox(target, token);
  const remoteItems = remote ? (await decryptInbox(remote.payload, password)).items : [];
  const items = mergeInboxItems(localItems, remoteItems);
  const payload = await encryptInbox(items, password);
  const commitUrl = await saveEncryptedInbox(target, token, payload, remote?.sha);
  return { items, syncedAt: payload.encryptedAt, commitUrl };
}

export function createInboxSyncMeta(items: InboxItem[], syncedAt = new Date().toISOString()): InboxSyncMeta {
  return {
    version: 1,
    lastSyncedAt: syncedAt,
    itemVersions: Object.fromEntries(items.map(item => [item.id, item.updatedAt])),
  };
}

export function parseInboxSyncMeta(value: unknown): InboxSyncMeta | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const meta = value as Partial<InboxSyncMeta>;
  if (meta.version !== 1 || typeof meta.lastSyncedAt !== 'string' || Number.isNaN(Date.parse(meta.lastSyncedAt))) return null;
  if (!meta.itemVersions || typeof meta.itemVersions !== 'object' || Array.isArray(meta.itemVersions)) return null;
  if (Object.entries(meta.itemVersions).some(([id, updatedAt]) => !id || typeof updatedAt !== 'string' || Number.isNaN(Date.parse(updatedAt)))) return null;
  return meta as InboxSyncMeta;
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
  if (!parseInboxSyncMeta(meta)) return false;
  try {
    storage.setItem(INBOX_SYNC_META_KEY, JSON.stringify(meta));
    return true;
  } catch {
    return false;
  }
}

export function isInboxItemSynced(item: InboxItem, meta: InboxSyncMeta | null): boolean {
  return meta?.itemVersions[item.id] === item.updatedAt;
}

export function countUnsyncedInboxItems(items: InboxItem[], meta: InboxSyncMeta | null): number {
  return items.filter(item => !isInboxItemSynced(item, meta)).length;
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
  if (typeof payload.encryptedAt !== 'string' || Number.isNaN(Date.parse(payload.encryptedAt))) {
    throw new Error('远端 Inbox 密文时间无效。');
  }
  return payload as unknown as EncryptedInbox;
}
