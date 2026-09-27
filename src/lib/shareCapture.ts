import type { InboxDraft } from '../types/inbox.ts';

export const SHARE_LIMITS = { title: 240, url: 4096, text: 12_000 } as const;
const MAX_INCOMING_LENGTH = 200_000;
const SHARE_QUERY_KEYS = ['share_title', 'share_text', 'share_url'] as const;

export interface ShareCaptureFields { title: string; url: string; text: string }
export interface IncomingShare {
  fields: ShareCaptureFields;
  warnings: string[];
  source: 'system' | 'bookmarklet';
  cleanUrl: string;
}
type ShareLocation = Pick<Location, 'pathname' | 'search' | 'hash'>;

export function normalizeShareUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > SHARE_LIMITS.url || !/^https?:\/\//i.test(trimmed) || /[\s\u0000-\u001f\u007f\\]/.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url.toString();
  } catch { return null; }
}

function limitText(value: string, limit: number): string {
  const sliced = value.replace(/\u0000/g, '').trim().slice(0, limit);
  return /[\uD800-\uDBFF]$/.test(sliced) ? sliced.slice(0, -1) : sliced;
}

export function parseShareFields(input: Partial<ShareCaptureFields>): Pick<IncomingShare, 'fields' | 'warnings'> {
  const warnings: string[] = [];
  const rawTitle = input.title || '';
  const rawText = input.text || '';
  const rawUrl = (input.url || '').trim();
  const title = limitText(rawTitle, SHARE_LIMITS.title);
  let text = limitText(rawText, SHARE_LIMITS.text);
  let url = rawUrl ? normalizeShareUrl(rawUrl) || '' : '';
  if (rawTitle.length > SHARE_LIMITS.title || rawText.length > SHARE_LIMITS.text) warnings.push('分享内容较长，已截取可预览部分；保存前请检查。');
  if (rawUrl && !url) warnings.push('已忽略无效网址：仅接收不含账号密码的 HTTP/HTTPS 链接，最长 4096 字符。');
  // Android share sheets may put the URL in text instead of the URL field.
  const candidates = text.match(/https?:\/\/[^\s<>"`]+/gi) || [];
  for (const candidate of candidates) {
    const normalized = normalizeShareUrl(candidate);
    if (!normalized) {
      text = text.replace(candidate, '').trim();
      warnings.push('分享文本中的不安全或超长网址已移除。');
    } else if (!url) {
      url = normalized;
      text = text.replace(candidate, '').trim();
    } else if (normalized === url) { text = text.replace(candidate, '').trim(); }
  }
  if (/^(?:javascript|data|file|vbscript):/i.test(text)) { text = ''; warnings.push('不支持此类链接。'); }
  return { fields: { title, url, text }, warnings: [...new Set(warnings)] };
}

/** Parse only. The caller must replace the current history URL with cleanUrl immediately. */
export function parseIncomingShare(location: ShareLocation): IncomingShare | null {
  const query = new URLSearchParams(location.search);
  const isBookmarklet = /^#\/capture(?:\?|$)/.test(location.hash);
  const legacyQuery = query.get('capture') === '1';
  const isSystem = SHARE_QUERY_KEYS.some(key => query.has(key)) || legacyQuery;
  if (!isBookmarklet && !isSystem) return null;
  const params = isBookmarklet
    ? new URLSearchParams(location.hash.includes('?') ? location.hash.slice(location.hash.indexOf('?') + 1) : '')
    : new URLSearchParams(location.search);
  const prefix = isBookmarklet || legacyQuery ? '' : 'share_';
  for (const key of SHARE_QUERY_KEYS) query.delete(key);
  if (legacyQuery) for (const key of ['capture', 'title', 'text', 'url']) query.delete(key);
  const cleanSearch = query.toString();
  const cleanUrl = `${location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}${isBookmarklet ? '#/' : location.hash}`;
  const result = location.search.length + location.hash.length > MAX_INCOMING_LENGTH
    ? { fields: { title: '', text: '', url: '' }, warnings: ['分享内容过大，无法载入。请手动粘贴需要保存的部分。'] }
    : parseShareFields({ title: params.get(`${prefix}title`) || '', text: params.get(`${prefix}text`) || '', url: params.get(`${prefix}url`) || '' });
  if (!result.fields.url && !result.fields.text) result.warnings.push('没有可保存的网址或文本，请补充内容。');
  return { ...result, source: isBookmarklet ? 'bookmarklet' : 'system', cleanUrl };
}

/** Called at explicit submit time; opening a share URL does not persist any data. */
export function createShareInboxDraft(fields: ShareCaptureFields): InboxDraft {
  if (fields.title.length > SHARE_LIMITS.title || fields.text.length > SHARE_LIMITS.text || fields.url.length > SHARE_LIMITS.url) throw new Error('内容超过长度限制，请缩短后再保存。');
  const title = fields.title.trim();
  const content = fields.text.trim();
  const url = fields.url.trim() ? normalizeShareUrl(fields.url) : null;
  if (fields.url.trim() && !url) throw new Error('请输入不含账号密码的完整 HTTP/HTTPS 网址。');
  if (!url && !content) throw new Error('请填写网址或备注文本。');
  return { type: url ? 'link' : 'text', ...(title ? { title } : {}), ...(url ? { url } : {}), ...(content ? { content } : {}), tags: ['网页收集'] };
}

export function buildCaptureBookmarklet(appUrl: string): string {
  const safeUrl = normalizeShareUrl(appUrl);
  if (!safeUrl) throw new Error('白泽导航地址无效。');
  const target = new URL(safeUrl);
  target.search = '';
  target.hash = '';
  const base = JSON.stringify(target.toString());
  // The fragment is not sent to the server and is removed when the preview loads.
  return `javascript:(()=>{if(!/^https?:$/.test(location.protocol)||location.href.length>${SHARE_LIMITS.url}){alert('仅支持长度不超过 ${SHARE_LIMITS.url} 字符的 HTTP/HTTPS 页面');return;}const p=new URLSearchParams({title:document.title.slice(0,${SHARE_LIMITS.title}),url:location.href,text:String(window.getSelection()||'').slice(0,${SHARE_LIMITS.text})});window.open(${base}+'#/capture?'+p.toString(),'_blank','noopener,noreferrer');})()`;
}
