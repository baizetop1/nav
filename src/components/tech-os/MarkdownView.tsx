import { createElement, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, Copy, ListTree } from 'lucide-react';
import { parseTechOsMarkdown, parseTechOsMarkdownInline, techOsMarkdownPlainText, type TechOsMarkdownBlock } from '../../services/techOsMarkdown';

interface MarkdownViewProps {
  body: string;
  anchorPrefix?: string;
}

export function MarkdownView({ body, anchorPrefix }: MarkdownViewProps) {
  const instanceId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const prefix = anchorPrefix || `tech-os-${instanceId}`;
  const blocks = useMemo(() => parseTechOsMarkdown(body, prefix), [body, prefix]);
  const headings = blocks.filter((block): block is Extract<TechOsMarkdownBlock, { type: 'heading' }> => block.type === 'heading');
  const firstLevel = headings.length ? Math.min(...headings.map(heading => heading.level)) : 1;
  const goToHeading = (id: string) => {
    const heading = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-tech-os-heading]') || []).find(element => element.id === id);
    if (!heading) return;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  return <div ref={rootRef} className="min-w-0 max-w-full space-y-4 text-sm leading-7 text-[#365b5b] [overflow-wrap:anywhere] dark:text-[#cbd7d3]">
    {headings.length >= 2 && <details className="rounded-xl border border-[#5f8f84]/20 bg-[#5f8f84]/5 p-3 dark:border-[#c9a96b]/15 dark:bg-[#c9a96b]/5"><summary className="cursor-pointer text-xs font-semibold text-[#456b68] dark:text-[#cbd7d3]"><ListTree size={15} className="mr-1 inline-block align-text-bottom" aria-hidden="true" />正文目录 · {headings.length} 个章节</summary><nav aria-label="正文目录" className="mt-2"><ol className="max-h-72 space-y-1 overflow-y-auto">{headings.map(heading => <li key={heading.id} style={{ paddingLeft: `${Math.min(heading.level - firstLevel, 3) * .7}rem` }}><button type="button" className="block w-full rounded-lg px-2 py-1.5 text-left text-xs leading-5 hover:bg-[#5f8f84]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5f8f84] dark:hover:bg-[#c9a96b]/10" onClick={() => goToHeading(heading.id)}>{techOsMarkdownPlainText(heading.text)}</button></li>)}</ol></nav></details>}
    {blocks.map((block, index) => renderBlock(block, index, firstLevel))}
  </div>;
}

function renderBlock(block: TechOsMarkdownBlock, key: number, firstLevel: number): ReactNode {
  if (block.type === 'heading') {
    const level = Math.min(6, 3 + block.level - firstLevel);
    return createElement(`h${level}`, { key: block.id, id: block.id, tabIndex: -1, 'data-tech-os-heading': true, ...(block.stepId ? { 'data-tech-os-step': block.stepId } : {}), className: 'scroll-mt-24 border-b border-[#5f8f84]/15 pb-2 pt-2 text-base font-bold text-[#173b41] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5f8f84]/50 dark:border-[#c9a96b]/12 dark:text-[#f4f1e8]' }, renderInline(block.text));
  }
  if (block.type === 'unordered-list') {
    return <ul key={key} className="list-disc space-y-1 pl-5">{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</ul>;
  }
  if (block.type === 'ordered-list') {
    return <ol key={key} className="list-decimal space-y-1 pl-5">{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</ol>;
  }
  if (block.type === 'code') return <CopyableCode key={key} language={block.language} text={block.text} />;
  if (block.type === 'table') {
    const [header, ...rows] = block.rows;
    return <div key={key} className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-[#5f8f84]/15 dark:border-[#c9a96b]/12" tabIndex={0} role="region" aria-label="可横向滚动的表格"><table className="w-full min-w-[32rem] text-left text-xs"><thead className="bg-[#5f8f84]/8 text-[#315e5b] dark:bg-[#c9a96b]/8 dark:text-[#e2d5b2]"><tr>{header.map((cell, index) => <th key={index} className="px-3 py-2 font-semibold">{renderInline(cell)}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-t border-[#5f8f84]/10 dark:border-[#c9a96b]/10">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2">{renderInline(cell)}</td>)}</tr>)}</tbody></table></div>;
  }
  return <p key={key} className="whitespace-pre-wrap [overflow-wrap:anywhere]">{renderInline(block.text)}</p>;
}

function CopyableCode({ language, text }: { language: string; text: string }) {
  const [status, setStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const generation = useRef(0);
  useEffect(() => { generation.current += 1; setStatus('idle'); return () => { generation.current += 1; }; }, [text, language]);
  const copy = async () => {
    const currentGeneration = generation.current;
    setStatus('copying');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      if (currentGeneration === generation.current) setStatus('copied');
    } catch { if (currentGeneration === generation.current) setStatus('error'); }
  };
  return <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-[#5f8f84]/15 bg-[#0d292e] text-[#e8eee9] dark:border-[#c9a96b]/15 dark:bg-[#06171b]">
    <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-[11px]"><span className="min-w-0 truncate font-mono text-[#b1c9c2]">{language || '代码'}</span><button type="button" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1 text-xs hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b1c9c2] disabled:opacity-60" aria-label="复制代码" disabled={status === 'copying'} onClick={() => void copy()}>{status === 'copied' ? <Check size={13} /> : <Copy size={13} />}{status === 'copying' ? '复制中…' : status === 'copied' ? '已复制' : '复制代码'}</button></div>
    <pre tabIndex={0} aria-label={language ? `${language} 代码，可横向滚动` : '代码，可横向滚动'} className="m-0 max-w-full overflow-x-auto p-4 font-mono text-xs leading-6"><code data-language={language}>{text}</code></pre>
    {(status === 'copied' || status === 'error') && <p role="status" className={`border-t border-white/10 px-3 py-2 text-xs leading-5 ${status === 'error' ? 'text-[#f1c6ae]' : 'text-[#b1d4bd]'}`}>{status === 'error' ? '复制失败：浏览器未允许写入剪贴板。请重试，或选中代码后手动复制。' : '代码已复制到剪贴板。'}</p>}
  </div>;
}

function renderInline(text: string, allowLinks = true): ReactNode[] {
  return parseTechOsMarkdownInline(text, allowLinks).map((part, index) => {
    if (part.type === 'code') return <code key={index} className="break-all rounded bg-[#5f8f84]/10 px-1.5 py-0.5 font-mono text-[0.9em] text-[#285954] dark:bg-[#c9a96b]/10 dark:text-[#e3ca91]">{part.text}</code>;
    if (part.type === 'strong') return <strong key={index} className="font-semibold text-[#234b4e] dark:text-[#f4f1e8]">{renderInline(part.text, false)}</strong>;
    if (part.type === 'link') return <a key={index} href={part.href} target="_blank" rel="noopener noreferrer" className="break-all text-[#285f59] underline decoration-[#5f8f84]/50 underline-offset-2 hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5f8f84] dark:text-[#e0c98e]">{renderInline(part.text, false)}</a>;
    return <span key={index}>{part.text}</span>;
  });
}
