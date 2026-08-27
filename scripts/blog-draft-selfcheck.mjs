import assert from 'node:assert/strict';
import {
  buildBlogDraftMarkdown,
  createBlogDraftDefaults,
  formatInboxBodyForMarkdown,
  isBlogSlugPathConflict,
  normalizeBlogDraftInput,
  slugifyBlogDraft,
} from '../src/services/blogDraft.ts';
import { createInboxItem } from '../src/services/inbox.ts';

const createdAt = new Date(2026, 7, 27, 9, 2, 3);
const item = createInboxItem({
  type: 'text',
  title: '浏览器的导航入口',
  content: '1.地址栏输入 URL\n2.点击页面中的 <a> 链接\n3.提交 <form>表单',
  tags: ['tech-os/note', '教程', '浏览器机制'],
}, { id: 'inbox-1', now: createdAt });

assert.equal(slugifyBlogDraft('Hello, URL World!'), 'hello-url-world');
assert.equal(slugifyBlogDraft('中文标题', createdAt), 'note-20260827-090203');

const defaults = createBlogDraftDefaults(item, createdAt);
assert.equal(defaults.title, '浏览器的导航入口');
assert.equal(defaults.category, '教程');
assert.deepEqual(defaults.tags, ['教程', '浏览器机制']);

const input = normalizeBlogDraftInput({
  ...defaults,
  slug: 'browser-navigation',
  tags: ['教程', '教程', '浏览器机制'],
  related: ['url-basics', 'url-basics'],
});
const markdown = buildBlogDraftMarkdown(item, input, createdAt);
assert.match(markdown, /status: draft/);
assert.match(markdown, /slug: "browser-navigation"/);
assert.match(markdown, /permalink: \/p\/browser-navigation\//);
assert.match(markdown, /    - "url-basics"/);
assert.match(markdown, /1\. 地址栏输入 URL/);
assert.match(markdown, /2\. 点击页面中的 `<a>` 链接/);
assert.match(markdown, /3\. 提交 `<form>`表单/);
assert.equal(markdown.includes('tech-os/note'), false);
assert.equal(formatInboxBodyForMarkdown('1. 已有空格\n2.需要空格'), '1. 已有空格\n2. 需要空格');
assert.equal(formatInboxBodyForMarkdown('已有 `<a>` 代码'), '已有 `<a>` 代码');
assert.equal(formatInboxBodyForMarkdown('```html\n<a>\n```'), '```html\n<a>\n```');

assert.equal(isBlogSlugPathConflict('_drafts/browser-navigation.md', 'browser-navigation'), true);
assert.equal(isBlogSlugPathConflict('_posts/2026-08-27-browser-navigation.md', 'browser-navigation'), true);
assert.equal(isBlogSlugPathConflict('_posts/2026-08-27-browser-navigation-extra.md', 'browser-navigation'), false);
assert.equal(isBlogSlugPathConflict('_topics/browser-navigation.md', 'browser-navigation'), false);

assert.throws(() => normalizeBlogDraftInput({ ...input, slug: '中文 slug' }), /slug/);
assert.throws(() => normalizeBlogDraftInput({ ...input, tags: [] }), /标签/);
assert.throws(() => normalizeBlogDraftInput({ ...input, related: ['Bad Slug'] }), /相关文章/);

console.log('blog draft self-check passed');
