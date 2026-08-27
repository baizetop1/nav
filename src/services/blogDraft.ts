import type { InboxItem } from '../types/inbox';
import { createRepositoryTextFile, type RepositoryTarget } from './github.ts';

export interface BlogDraftInput {
  title: string;
  slug: string;
  category: string;
  format: string;
  tags: string[];
  related: string[];
}

export interface BlogDraftResult {
  commitUrl: string;
  sha: string;
  filePath: string;
  slug: string;
}

export function createBlogDraftDefaults(item: InboxItem, now = new Date()): BlogDraftInput {
  const title = item.title?.trim()
    || item.content?.split(/\r?\n/).map(line => line.trim()).find(Boolean)?.slice(0, 80)
    || (item.url ? new URL(item.url).hostname : '')
    || '新博客草稿';
  const visibleTags = item.tags.filter(tag => !tag.startsWith('tech-os/'));
  return {
    title,
    slug: slugifyBlogDraft(title, validDate(item.createdAt) || now),
    category: visibleTags[0] || '随笔',
    format: '笔记',
    tags: visibleTags.length ? visibleTags : ['记录'],
    related: [],
  };
}

export function slugifyBlogDraft(value: string, fallbackDate = new Date()): string {
  const ascii = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || `note-${formatTimestamp(fallbackDate)}`;
}

export function normalizeBlogDraftInput(input: BlogDraftInput): BlogDraftInput {
  const title = input.title.trim();
  const slug = input.slug.trim().toLowerCase();
  const category = input.category.trim();
  const format = input.format.trim();
  const tags = uniqueStrings(input.tags);
  const related = uniqueStrings(input.related);
  if (!title) throw new Error('请输入博客标题。');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error('slug 只能使用小写英文、数字和连字号。');
  if (!category) throw new Error('请输入博客分类。');
  if (!format) throw new Error('请选择文章形式。');
  if (!tags.length) throw new Error('至少需要一个标签。');
  const invalidRelated = related.find(value => !/^[a-z0-9][a-z0-9-]*$/.test(value));
  if (invalidRelated) throw new Error(`相关文章 slug 无效：${invalidRelated}`);
  return { title, slug, category, format, tags, related };
}

export function buildBlogDraftMarkdown(item: InboxItem, input: BlogDraftInput, now = new Date()): string {
  const normalized = normalizeBlogDraftInput(input);
  const date = formatLocalDate(now);
  const tags = normalized.tags.map(tag => `    - ${yamlString(tag)}`).join('\n');
  const related = normalized.related.length
    ? `related:\n${normalized.related.map(slug => `    - ${yamlString(slug)}`).join('\n')}\n`
    : '# related:\n#     - another-post-slug\n';
  return `---
layout: post
title: ${yamlString(normalized.title)}
subtitle: ""
date: ${date}
author: 白泽
catalog: true
category: ${yamlString(normalized.category)}
format: ${yamlString(normalized.format)}
status: draft
slug: ${yamlString(normalized.slug)}
permalink: /p/${normalized.slug}/
tags:
${tags}
# Topic 是手工维护的正式知识节点；不要把全部 tags 复制到这里。
# topics:
#     - knowledge-management
${related}---

${inboxBody(item)}
`;
}

export function isBlogSlugPathConflict(path: string, slug: string): boolean {
  const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return path === `_drafts/${slug}.md` || new RegExp(`^_posts/\\d{4}-\\d{2}-\\d{2}-${escapedSlug}\\.md$`).test(path);
}

export async function createInboxBlogDraft(
  item: InboxItem,
  input: BlogDraftInput,
  token: string,
  target: RepositoryTarget,
  now = new Date(),
): Promise<BlogDraftResult> {
  const normalized = normalizeBlogDraftInput(input);
  const filePath = `_drafts/${normalized.slug}.md`;
  const result = await createRepositoryTextFile(target, token, {
    path: filePath,
    content: buildBlogDraftMarkdown(item, normalized, now),
    message: `Draft: ${normalized.title}`,
    conflictsWith: path => isBlogSlugPathConflict(path, normalized.slug),
  });
  return { ...result, filePath, slug: normalized.slug };
}

function inboxBody(item: InboxItem): string {
  const sections: string[] = [];
  if (item.type === 'link' && item.url) sections.push(`[${item.title?.trim() || item.url}](${item.url})`);
  if (item.content?.trim()) sections.push(item.content.trim());
  return sections.join('\n\n') || '<!-- 在这里继续完善正文。 -->';
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function validDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatLocalDate(value: Date): string {
  return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
}

function formatTimestamp(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
    '-',
    String(value.getHours()).padStart(2, '0'),
    String(value.getMinutes()).padStart(2, '0'),
    String(value.getSeconds()).padStart(2, '0'),
  ].join('');
}
