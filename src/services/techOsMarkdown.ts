export type TechOsMarkdownBlock =
  | { type: 'heading'; id: string; level: number; text: string; stepId?: string }
  | { type: 'paragraph'; text: string }
  | { type: 'unordered-list'; items: string[] }
  | { type: 'ordered-list'; items: string[] }
  | { type: 'code'; language: string; text: string }
  | { type: 'table'; rows: string[][] };

export type TechOsInlinePart =
  | { type: 'text' | 'code' | 'strong'; text: string }
  | { type: 'link'; text: string; href: string };

export function getTechOsHeadingStepId(level: number, text: string): string | undefined {
  if (level !== 3) return undefined;
  return text.match(/^(S\d+)\s*[·:：.\-—]\s*\S.+?\s*$/i)?.[1].toUpperCase()
    || text.match(/^(S\d+)\s*[·:：.\-—]\s*\S\s*$/i)?.[1].toUpperCase();
}

/** Only explicit absolute HTTP(S) destinations are interactive. No raw HTML,
 * images, protocol-relative URLs, credentials or browser-executable schemes. */
export function safeTechOsMarkdownUrl(value: string): string | null {
  if (!/^https?:\/\//i.test(value) || /[\s\u0000-\u001f\u007f\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    return url.hostname && !url.username && !url.password && ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function readLink(input: string, start: number): { end: number; text: string; href: string } | null {
  if (input[start - 1] === '!') return null; // Images stay readable text, not remote requests.
  let labelEnd = start + 1;
  while (labelEnd < Math.min(input.length, start + 514)) {
    if (input[labelEnd] === '\n' || input[labelEnd] === '\r') return null;
    if (input[labelEnd] === '\\') { labelEnd += 2; continue; }
    if (input[labelEnd] === ']') break;
    labelEnd += 1;
  }
  if (input[labelEnd] !== ']' || input[labelEnd + 1] !== '(' || labelEnd === start + 1) return null;
  let end = labelEnd + 2, depth = 1;
  while (end < Math.min(input.length, labelEnd + 4098)) {
    if (input[end] === '\n' || input[end] === '\r') return null;
    if (input[end] === '\\') { end += 2; continue; }
    if (input[end] === '(') depth += 1;
    if (input[end] === ')' && --depth === 0) break;
    end += 1;
  }
  if (depth !== 0 || input[end] !== ')') return null;
  const destination = input.slice(labelEnd + 2, end).trim();
  const match = destination.match(/^(<[^<>]+>|\S+?)(?:[ \t]+(?:"[^"]*"|'[^']*'))?$/);
  if (!match) return null;
  const rawUrl = match[1].startsWith('<') ? match[1].slice(1, -1) : match[1];
  const href = safeTechOsMarkdownUrl(rawUrl);
  return href ? { end: end + 1, text: input.slice(start + 1, labelEnd), href } : null;
}

/** A deliberately small inline parser. Unsupported/unsafe markup remains text. */
export function parseTechOsMarkdownInline(input: string, allowLinks = true): TechOsInlinePart[] {
  const parts: TechOsInlinePart[] = [];
  let plain = '', index = 0;
  const push = (part: TechOsInlinePart) => { if (plain) { parts.push({ type: 'text', text: plain }); plain = ''; } parts.push(part); };
  while (index < input.length) {
    if (input[index] === '\\' && /[\\`*\[\]()]/.test(input[index + 1] || '')) { plain += input[index + 1]; index += 2; continue; }
    if (input[index] === '`') {
      const delimiter = input.slice(index).match(/^`+/)![0];
      const end = input.indexOf(delimiter, index + delimiter.length);
      if (end !== -1) { push({ type: 'code', text: input.slice(index + delimiter.length, end) }); index = end + delimiter.length; continue; }
    }
    if (input.startsWith('**', index)) {
      const end = input.indexOf('**', index + 2);
      if (end > index + 2) { push({ type: 'strong', text: input.slice(index + 2, end) }); index = end + 2; continue; }
    }
    if (allowLinks && input[index] === '[') {
      const link = readLink(input, index);
      if (link) { push({ type: 'link', text: link.text, href: link.href }); index = link.end; continue; }
    }
    plain += input[index]; index += 1;
  }
  if (plain) parts.push({ type: 'text', text: plain });
  return parts;
}

export function techOsMarkdownPlainText(text: string): string {
  return parseTechOsMarkdownInline(text).map(part => part.type === 'strong' || part.type === 'link' ? parseTechOsMarkdownInline(part.text, false).map(inner => inner.text).join('') : part.text).join('');
}

function textHash(text: string): string {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  return (value >>> 0).toString(36);
}

const fenceStart = (line: string) => line.match(/^[ \t]*(`{3,}|~{3,})(.*)$/);
const headingStart = (line: string) => line.match(/^ {0,3}(#{1,6})[ \t]+(.+)$/);
const splitTableRow = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
const tableStart = (lines: string[], index: number) => lines[index].trimStart().startsWith('|') && !!lines[index + 1] && splitTableRow(lines[index + 1]).every(cell => /^:?-{3,}:?$/.test(cell));
const listStart = (line: string) => /^\s*[-*]\s+|^\s*\d+\.\s+/.test(line);
const blockStart = (lines: string[], index: number) => !!fenceStart(lines[index]) || !!headingStart(lines[index]) || listStart(lines[index]) || tableStart(lines, index);

/** Stable anchors are content-derived; only repeated identical headings receive
 * numeric suffixes. Fenced content is consumed before headings or study steps. */
export function parseTechOsMarkdown(body: string, anchorPrefix: string): TechOsMarkdownBlock[] {
  const prefix = anchorPrefix.trim().replace(/[^a-z0-9_-]/gi, '-') || 'tech-os';
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const blocks: TechOsMarkdownBlock[] = [], ids = new Map<string, number>();
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    const fence = fenceStart(line);
    if (fence) {
      const code: string[] = [];
      const close = new RegExp(`^[ \\t]*${fence[1][0]}{${fence[1].length},}[ \\t]*$`);
      index += 1;
      while (index < lines.length && !close.test(lines[index])) { code.push(lines[index]); index += 1; }
      if (index < lines.length) index += 1;
      blocks.push({ type: 'code', language: fence[2].trim().split(/\s+/)[0].slice(0, 40), text: code.join('\n') });
      continue;
    }
    const heading = headingStart(line);
    if (heading) {
      const level = heading[1].length, text = heading[2].replace(/[ \t]+#+[ \t]*$/, '').trim();
      const stepId = getTechOsHeadingStepId(level, text);
      const baseId = stepId ? `${prefix}-step-${stepId}` : `${prefix}-heading-${textHash(text)}`;
      const count = (ids.get(baseId) || 0) + 1;
      ids.set(baseId, count);
      blocks.push({ type: 'heading', id: count === 1 ? baseId : `${baseId}-${count}`, level, text, ...(stepId ? { stepId } : {}) });
      index += 1; continue;
    }
    if (tableStart(lines, index)) {
      const rows = [splitTableRow(line)]; index += 2;
      while (index < lines.length && lines[index].trimStart().startsWith('|')) { rows.push(splitTableRow(lines[index])); index += 1; }
      blocks.push({ type: 'table', rows }); continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) { items.push(lines[index].replace(/^\s*[-*]\s+/, '')); index += 1; }
      blocks.push({ type: 'unordered-list', items }); continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) { items.push(lines[index].replace(/^\s*\d+\.\s+/, '')); index += 1; }
      blocks.push({ type: 'ordered-list', items }); continue;
    }
    const paragraph = [line.trim()]; index += 1;
    while (index < lines.length && lines[index].trim() && !blockStart(lines, index)) { paragraph.push(lines[index].trim()); index += 1; }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }
  return blocks;
}
