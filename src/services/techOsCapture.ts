import type { InboxDraft, InboxItem } from '../types/inbox.ts';
import type { TechOsCaptureDraft, TechOsCaptureKind } from '../types/tech-os-capture.ts';

export const TECH_OS_CAPTURE_KINDS: TechOsCaptureKind[] = ['question', 'idea', 'note', 'link'];

const CAPTURE_TAG_PREFIX = 'tech-os/';
const CAPTURE_TAGS: Record<TechOsCaptureKind, string> = {
  question: 'tech-os/question',
  idea: 'tech-os/idea',
  note: 'tech-os/note',
  link: 'tech-os/link',
};

export const TECH_OS_CAPTURE_LABELS: Record<TechOsCaptureKind, string> = {
  question: 'Question',
  idea: 'Idea',
  note: 'Note',
  link: 'Link',
};

export function getTechOsCaptureKind(item: Pick<InboxItem, 'type' | 'tags'>): TechOsCaptureKind {
  const explicit = TECH_OS_CAPTURE_KINDS.find(kind => item.tags.includes(CAPTURE_TAGS[kind]));
  return explicit || (item.type === 'link' ? 'link' : 'note');
}

export function getVisibleInboxTags(tags: string[]): string[] {
  return tags.filter(tag => !tag.startsWith(CAPTURE_TAG_PREFIX));
}

export function applyTechOsCaptureKind(draft: InboxDraft, kind: TechOsCaptureKind): InboxDraft {
  const tags = [...new Set([...getVisibleInboxTags(draft.tags || []), CAPTURE_TAGS[kind]])];
  if (kind === 'link') return { ...draft, type: 'link', tags };
  const { url: _url, ...textDraft } = draft;
  return { ...textDraft, type: 'text', tags };
}

export function createTechOsCaptureDraft(item: InboxItem): TechOsCaptureDraft {
  if (item.deletedAt || item.status !== 'inbox') throw new Error('只能处理仍在 Inbox 中的可见记录。');
  const captureKind = getTechOsCaptureKind(item);
  const techOsId = inboxItemIdToTechOsId(item.id);
  const path = `tech-os/inbox/${techOsId}.md`;
  const title = captureTitle(item);
  const userTags = getVisibleInboxTags(item.tags);
  const tagLines = userTags.length ? `tags:\n${userTags.map(tag => `  - ${yamlString(tag)}`).join('\n')}` : 'tags: []';
  const linkSection = item.type === 'link' && item.url ? `\n\n## 链接\n\n${item.url}` : '';
  const content = item.content || (item.type === 'link' ? '待补充链接处理说明。' : title);
  const body = `## Capture Type\n\n${TECH_OS_CAPTURE_LABELS[captureKind]}\n\n## 内容\n\n${content}${linkSection}\n\n## 处理决定\n\n保留为 Tech OS Inbox，或由用户手动转为 Question、Knowledge、Lab、Project、Route Seed 后归档。`;
  const source = [
    '---',
    'schema: tech-os/v1',
    'kind: inbox-item',
    `id: ${techOsId}`,
    `title: ${yamlString(title)}`,
    'status: inbox',
    'source: phase-c',
    `origin_id: ${yamlString(item.id)}`,
    `source_inbox_id: ${yamlString(item.id)}`,
    `capture_type: ${captureKind}`,
    `created: ${item.createdAt.slice(0, 10)}`,
    tagLines,
    '---',
    '',
    body,
    '',
  ].join('\n');
  return { captureKind, inboxItemId: item.id, techOsId, file: { path, content: source } };
}

export function inboxItemIdToTechOsId(id: string): string {
  return `INBOX-${fallbackNumericId(id).padStart(20, '0')}`;
}

function fallbackNumericId(value: string): string {
  const first = hash32(value, 2166136261);
  const second = hash32([...value].reverse().join(''), 2246822507);
  return `${first.toString(10).padStart(10, '0')}${second.toString(10).padStart(10, '0')}`;
}

function hash32(value: string, seed: number): number {
  let hash = seed >>> 0;
  for (const character of value) {
    hash ^= character.codePointAt(0) || 0;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

function captureTitle(item: InboxItem): string {
  const explicit = item.title?.trim();
  if (explicit) return explicit.slice(0, 120);
  if (item.type === 'link' && item.url) return new URL(item.url).hostname.slice(0, 120);
  return item.content?.split(/\r?\n/).map(line => line.trim()).find(Boolean)?.slice(0, 120) || '待处理 Capture';
}

function yamlString(value: string): string {
  return JSON.stringify(value.replace(/\r?\n/g, ' ').trim());
}
