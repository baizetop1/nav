/** Bounded, lossless line-based three-way merge. Unchanged bytes are retained. */
export interface BlogMergeBlock { id: string; start: number; end: number; base: string; local: string; remote: string; merged: string | null }
export interface BlogMergePlan { blocks: BlogMergeBlock[]; fallback: boolean }
type Edit = { start: number; end: number; lines: string[]; side: 'local' | 'remote' };
const MAX_BYTES = 256 * 1024;
const linesOf = (text: string) => text.match(/[^\n]*\n|[^\n]+$/g) || [];
function changes(base: string[], next: string[], side: Edit['side']): { edits: Edit[]; fallback: boolean } {
  let prefix = 0, suffix = 0;
  while (prefix < base.length && prefix < next.length && base[prefix] === next[prefix]) prefix++;
  while (suffix < base.length - prefix && suffix < next.length - prefix && base[base.length - 1 - suffix] === next[next.length - 1 - suffix]) suffix++;
  const a = base.slice(prefix, base.length - suffix), b = next.slice(prefix, next.length - suffix);
  if (!a.length && !b.length) return { edits: [], fallback: false };
  if ((a.length + 1) * (b.length + 1) > 2_000_000 || a.length + b.length > 12_000) return { edits: [{ start: prefix, end: base.length - suffix, lines: b, side }], fallback: true };
  const width = b.length + 1, table = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) table[i * width + j] = a[i] === b[j] ? 1 + table[(i + 1) * width + j + 1] : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
  const edits: Edit[] = []; let i = 0, j = 0, active: Edit | null = null;
  const flush = () => { if (active) edits.push(active); active = null; };
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { flush(); i++; j++; continue; }
    if (!active) active = { start: prefix + i, end: prefix + i, lines: [], side };
    if (j < b.length && (i === a.length || table[i * width + j + 1] >= table[(i + 1) * width + j])) active.lines.push(b[j++]);
    else { i++; active.end = prefix + i; }
  }
  flush(); return { edits, fallback: false };
}
function overlaps(a: Edit, b: Edit): boolean {
  if (a.start === a.end && b.start === b.end) return a.start === b.start;
  if (a.start === a.end) return a.start > b.start && a.start < b.end;
  if (b.start === b.end) return b.start > a.start && b.start < a.end;
  return a.start < b.end && b.start < a.end;
}
function applyRegion(base: string[], start: number, end: number, edits: Edit[]): string {
  let cursor = start, text = '';
  for (const edit of edits.sort((a, b) => a.start - b.start)) { text += base.slice(cursor, edit.start).join('') + edit.lines.join(''); cursor = edit.end; }
  return text + base.slice(cursor, end).join('');
}
export function planBlogMerge(original: string, local: string, remote: string): BlogMergePlan {
  for (const text of [original, local, remote]) if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('合并文章不能超过 256 KB。');
  const base = linesOf(original), left = changes(base, linesOf(local), 'local'), right = changes(base, linesOf(remote), 'remote');
  const edits = [...left.edits, ...right.edits].sort((a, b) => a.start - b.start || a.end - b.end);
  const groups: Edit[][] = [];
  for (const edit of edits) { const group = groups[groups.length - 1]; if (group?.some(item => overlaps(item, edit))) group.push(edit); else groups.push([edit]); }
  const blocks: BlogMergeBlock[] = []; let cursor = 0;
  for (const group of groups) {
    const start = Math.min(...group.map(edit => edit.start)), end = Math.max(...group.map(edit => edit.end));
    if (start > cursor) { const text = base.slice(cursor, start).join(''); blocks.push({ id: `same-${cursor}`, start: cursor, end: start, base: text, local: text, remote: text, merged: text }); }
    const before = base.slice(start, end).join(''), ours = applyRegion(base, start, end, group.filter(edit => edit.side === 'local')), theirs = applyRegion(base, start, end, group.filter(edit => edit.side === 'remote'));
    blocks.push({ id: `change-${start}-${end}`, start, end, base: before, local: ours, remote: theirs, merged: ours === theirs ? ours : ours === before ? theirs : theirs === before ? ours : null }); cursor = end;
  }
  const tail = base.slice(cursor).join('');
  if (tail || !blocks.length) blocks.push({ id: `same-${cursor}`, start: cursor, end: base.length, base: tail, local: tail, remote: tail, merged: tail });
  return { blocks, fallback: left.fallback || right.fallback };
}
export function resolveBlogMerge(plan: BlogMergePlan, choices: Record<string, 'local' | 'remote'>): string | null {
  let result = '';
  for (const block of plan.blocks) { const text = block.merged ?? (choices[block.id] ? block[choices[block.id]] : null); if (text === null) return null; result += text; }
  if (new TextEncoder().encode(result).length > MAX_BYTES) throw new Error('合并结果超过 256 KB，请先分拆文章。');
  return result;
}
