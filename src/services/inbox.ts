import type { InboxDraft, InboxItem, InboxItemStatus, InboxItemType, InboxStore } from '../types/inbox.ts';

export const INBOX_STORAGE_KEY = 'baize_inbox_v1';
export const INBOX_LEGACY_MIGRATION_KEY = 'baize_inbox_legacy_temp_text_migrated_v1';
export const LEGACY_TEMP_TEXT_KEY = 'nav_temp_text';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

interface ItemOptions {
  id?: string;
  now?: Date;
}

interface LoadInboxOptions extends ItemOptions {
  storage?: StorageLike;
}

const itemTypes = new Set<InboxItemType>(['text', 'link']);
const itemStatuses = new Set<InboxItemStatus>(['inbox', 'archived']);

export function createInboxItem(draft: InboxDraft, { id = createId(), now = new Date() }: ItemOptions = {}): InboxItem {
  const normalized = normalizeInboxDraft(draft);
  const timestamp = now.toISOString();
  return {
    id,
    ...normalized,
    createdAt: timestamp,
    updatedAt: timestamp,
    status: 'inbox',
  };
}

export function updateInboxItem(items: InboxItem[], id: string, draft: InboxDraft, now = new Date()): InboxItem[] {
  const normalized = normalizeInboxDraft(draft);
  const timestamp = now.toISOString();
  return items.map(item => item.id === id && !item.deletedAt
    ? { ...item, ...normalized, updatedAt: timestamp }
    : item);
}

export function setInboxItemStatus(items: InboxItem[], id: string, status: InboxItemStatus, now = new Date()): InboxItem[] {
  const timestamp = now.toISOString();
  return items.map(item => item.id === id && !item.deletedAt ? { ...item, status, updatedAt: timestamp } : item);
}

export function softDeleteInboxItem(items: InboxItem[], id: string, now = new Date()): InboxItem[] {
  const timestamp = now.toISOString();
  return items.map(item => item.id === id ? { ...item, deletedAt: timestamp, updatedAt: timestamp } : item);
}

export function normalizeInboxDraft(draft: InboxDraft): Required<Pick<InboxDraft, 'type' | 'tags'>> & Omit<InboxDraft, 'type' | 'tags'> {
  if (!itemTypes.has(draft.type)) throw new Error('记录类型无效。');
  const title = cleanText(draft.title);
  const content = cleanText(draft.content);
  const tags = uniqueStrings(draft.tags || []);
  if (draft.type === 'text') {
    if (!content) throw new Error('请输入记录内容。');
    return { type: 'text', ...(title ? { title } : {}), content, tags };
  }

  const url = normalizeInboxUrl(draft.url || '');
  if (!url) throw new Error('请输入有效的 HTTP/HTTPS 链接。');
  return { type: 'link', ...(title ? { title } : {}), ...(content ? { content } : {}), url, tags };
}

export function parseInboxStore(value: unknown): InboxStore | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const store = value as Partial<InboxStore>;
  if (store.version !== 1 || typeof store.updatedAt !== 'string' || !validDate(store.updatedAt) || !Array.isArray(store.items)) return null;
  const items: InboxItem[] = [];
  const ids = new Set<string>();
  for (const candidate of store.items) {
    const item = parseInboxItem(candidate);
    if (!item || ids.has(item.id)) return null;
    ids.add(item.id);
    items.push(item);
  }
  return { version: 1, updatedAt: store.updatedAt, items };
}

export function loadInbox({ storage = localStorage, now = new Date(), id }: LoadInboxOptions = {}): InboxItem[] {
  let items: InboxItem[] = [];
  try {
    const saved = storage.getItem(INBOX_STORAGE_KEY);
    if (saved) items = parseInboxStore(JSON.parse(saved))?.items || [];
  } catch {
    return [];
  }

  try {
    if (storage.getItem(INBOX_LEGACY_MIGRATION_KEY) !== '1') {
      const legacyText = cleanText(storage.getItem(LEGACY_TEMP_TEXT_KEY));
      if (legacyText && !items.some(item => !item.deletedAt && item.type === 'text' && item.content === legacyText)) {
        items = [createInboxItem({ type: 'text', title: '旧临时文本', content: legacyText, tags: ['迁移'] }, { id, now }), ...items];
      }
      storage.setItem(INBOX_LEGACY_MIGRATION_KEY, '1');
      saveInbox(items, storage, now);
    }
  } catch {
    // The in-memory Inbox remains usable when browser storage is unavailable.
  }
  return items;
}

export function saveInbox(items: InboxItem[], storage: StorageLike = localStorage, now = new Date()): boolean {
  const store: InboxStore = { version: 1, updatedAt: now.toISOString(), items };
  if (!parseInboxStore(store)) return false;
  try {
    storage.setItem(INBOX_STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function inboxItemToMarkdown(item: InboxItem): string {
  const lines: string[] = [];
  if (item.title) lines.push(`## ${item.title}`, '');
  if (item.type === 'link' && item.url) lines.push(`[${item.title || item.url}](${item.url})`);
  if (item.content) {
    if (lines.length && lines[lines.length - 1] !== '') lines.push('');
    lines.push(item.content);
  }
  const visibleTags = item.tags.filter(tag => !tag.startsWith('tech-os/'));
  if (visibleTags.length) lines.push('', visibleTags.map(tag => `#${tag.replace(/\s+/g, '-')}`).join(' '));
  return `${lines.join('\n').trim()}\n`;
}

export function parseInboxTags(value: string): string[] {
  return uniqueStrings(value.split(/[,，]/));
}

function parseInboxItem(value: unknown): InboxItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Partial<InboxItem>;
  if (
    typeof item.id !== 'string' || !item.id ||
    typeof item.type !== 'string' || !itemTypes.has(item.type as InboxItemType) ||
    typeof item.status !== 'string' || !itemStatuses.has(item.status as InboxItemStatus) ||
    typeof item.createdAt !== 'string' || !validDate(item.createdAt) ||
    typeof item.updatedAt !== 'string' || !validDate(item.updatedAt) ||
    !Array.isArray(item.tags) || !item.tags.every(tag => typeof tag === 'string') ||
    (item.title !== undefined && typeof item.title !== 'string') ||
    (item.content !== undefined && typeof item.content !== 'string') ||
    (item.deletedAt !== undefined && (typeof item.deletedAt !== 'string' || !validDate(item.deletedAt)))
  ) return null;
  if (item.type === 'text' && !cleanText(item.content)) return null;
  if (item.type === 'link' && (typeof item.url !== 'string' || !normalizeInboxUrl(item.url))) return null;
  return {
    id: item.id,
    type: item.type,
    ...(cleanText(item.title) ? { title: cleanText(item.title) } : {}),
    ...(cleanText(item.content) ? { content: cleanText(item.content) } : {}),
    ...(item.type === 'link' ? { url: normalizeInboxUrl(item.url || '') || undefined } : {}),
    tags: uniqueStrings(item.tags),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    status: item.status,
    ...(item.deletedAt ? { deletedAt: item.deletedAt } : {}),
  };
}

function normalizeInboxUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map(value => cleanText(value)).filter(Boolean))];
}

function validDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
