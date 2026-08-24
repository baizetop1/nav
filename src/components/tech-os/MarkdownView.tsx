import type { ReactNode } from 'react';

interface MarkdownViewProps {
  body: string;
}

type MarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'unordered-list'; items: string[] }
  | { type: 'ordered-list'; items: string[] }
  | { type: 'code'; language: string; text: string }
  | { type: 'table'; rows: string[][] };

export function MarkdownView({ body }: MarkdownViewProps) {
  const blocks = parseMarkdown(body);
  return <div className="space-y-4 text-sm leading-7 text-[#365b5b] dark:text-[#cbd7d3]">
    {blocks.map((block, index) => renderBlock(block, index))}
  </div>;
}

function renderBlock(block: MarkdownBlock, key: number): ReactNode {
  if (block.type === 'heading') {
    return <h3 key={key} className="border-b border-[#5f8f84]/15 pb-2 pt-2 text-base font-bold text-[#173b41] dark:border-[#c9a96b]/12 dark:text-[#f4f1e8]">{renderInline(block.text)}</h3>;
  }
  if (block.type === 'unordered-list') {
    return <ul key={key} className="list-disc space-y-1 pl-5">{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</ul>;
  }
  if (block.type === 'ordered-list') {
    return <ol key={key} className="list-decimal space-y-1 pl-5">{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</ol>;
  }
  if (block.type === 'code') {
    return <pre key={key} className="overflow-x-auto rounded-xl border border-[#5f8f84]/15 bg-[#0d292e] p-4 font-mono text-xs leading-6 text-[#e8eee9] dark:border-[#c9a96b]/15 dark:bg-[#06171b]"><code data-language={block.language}>{block.text}</code></pre>;
  }
  if (block.type === 'table') {
    const [header, ...rows] = block.rows;
    return <div key={key} className="overflow-x-auto rounded-xl border border-[#5f8f84]/15 dark:border-[#c9a96b]/12"><table className="w-full min-w-[32rem] text-left text-xs"><thead className="bg-[#5f8f84]/8 text-[#315e5b] dark:bg-[#c9a96b]/8 dark:text-[#e2d5b2]"><tr>{header.map((cell, index) => <th key={index} className="px-3 py-2 font-semibold">{renderInline(cell)}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-t border-[#5f8f84]/10 dark:border-[#c9a96b]/10">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2">{renderInline(cell)}</td>)}</tr>)}</tbody></table></div>;
  }
  return <p key={key} className="whitespace-pre-wrap">{renderInline(block.text)}</p>;
}

function renderInline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="rounded bg-[#5f8f84]/10 px-1.5 py-0.5 font-mono text-[0.9em] text-[#285954] dark:bg-[#c9a96b]/10 dark:text-[#e3ca91]">{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index} className="font-semibold text-[#234b4e] dark:text-[#f4f1e8]">{part.slice(2, -2)}</strong>;
    return <span key={index}>{part}</span>;
  });
}

function parseMarkdown(body: string): MarkdownBlock[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }

    const fence = line.match(/^```(.*)$/);
    if (fence) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) { code.push(lines[index]); index += 1; }
      if (index < lines.length) index += 1;
      blocks.push({ type: 'code', language: fence[1].trim(), text: code.join('\n') });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] }); index += 1; continue; }

    if (line.trimStart().startsWith('|') && lines[index + 1]?.trimStart().match(/^\|?\s*:?-+/)) {
      const rows: string[][] = [splitTableRow(line)];
      index += 2;
      while (index < lines.length && lines[index].trimStart().startsWith('|')) { rows.push(splitTableRow(lines[index])); index += 1; }
      blocks.push({ type: 'table', rows });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) { items.push(lines[index].replace(/^\s*[-*]\s+/, '')); index += 1; }
      blocks.push({ type: 'unordered-list', items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) { items.push(lines[index].replace(/^\s*\d+\.\s+/, '')); index += 1; }
      blocks.push({ type: 'ordered-list', items });
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) { paragraph.push(lines[index].trim()); index += 1; }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }
  return blocks;
}

function isBlockStart(lines: string[], index: number): boolean {
  const line = lines[index];
  return /^```|^#{1,6}\s+|^\s*[-*]\s+|^\s*\d+\.\s+/.test(line)
    || (line.trimStart().startsWith('|') && Boolean(lines[index + 1]?.trimStart().match(/^\|?\s*:?-+/)));
}

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
}
