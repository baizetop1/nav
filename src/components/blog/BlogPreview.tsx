import type { ReactNode } from 'react';

function safeUrl(value: string, base: string): string | undefined {
  try { const url = new URL(value, base); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}
function inline(text: string, base: string, images: Record<string, string> = {}): ReactNode[] {
  return text.split(/(!?\[[^\]\n]*\]\([^\s)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((part, index) => {
    const link = part.match(/^(!?)\[([^\]]*)\]\(([^\s)]+)\)$/);
    if (link) {
      const url = safeUrl(link[3], base);
      if (!url) return <span key={index}>{part}</span>;
      if (link[1]) return <img key={index} src={safeUrl(images[link[3]] || url, base)} alt={link[2]} loading="lazy" referrerPolicy="no-referrer" className="my-3 inline-block max-h-[32rem] max-w-full rounded-xl object-contain" />;
      return <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{link[2] || url}</a>;
    }
    if (part.startsWith('`')) return <code key={index} className="rounded bg-[#5f8f84]/10 px-1 font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
    if (part.startsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    return <span key={index}>{part}</span>;
  });
}
export function BlogPreview({ body, baseUrl = 'https://baizeone.top/', imagePreviews = {} }: { body: string; baseUrl?: string; imagePreviews?: Record<string, string> }) {
  const render = (text: string, _base: string) => inline(text, _base, imagePreviews);
  const lines = body.replace(/\r\n/g, '\n').split('\n'), blocks: ReactNode[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i], key = i;
    if (!line.trim()) { i++; continue; }
    const fence = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (fence) {
      const content: string[] = []; i++;
      while (i < lines.length && !new RegExp(`^\\s*${fence[1][0]}{${fence[1].length},}\\s*$`).test(lines[i])) content.push(lines[i++]);
      i++;
      blocks.push(<pre key={key} className="overflow-x-auto rounded-xl bg-[#102c33] p-4 text-xs leading-6 text-[#edf1e8]"><code>{content.join('\n')}</code></pre>); continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { blocks.push(<h3 key={key} className={heading[1].length < 3 ? 'pt-3 text-xl font-bold' : 'pt-2 text-base font-bold'}>{render(heading[2], baseUrl)}</h3>); i++; continue; }
    if (/^\s*>/.test(line)) {
      const content: string[] = []; while (i < lines.length && /^\s*>/.test(lines[i])) content.push(lines[i++].replace(/^\s*>\s?/, ''));
      blocks.push(<blockquote key={key} className="border-l-4 border-[#5f8f84]/40 pl-4 text-[#718986]">{render(content.join('\n'), baseUrl)}</blockquote>); continue;
    }
    const list = line.match(/^\s*([-*+] |\d+[.)] )/);
    if (list) {
      const ordered = /^\d/.test(list[1]), items: ReactNode[] = [], pattern = ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*+]\s+/;
      while (i < lines.length && pattern.test(lines[i])) { items.push(<li key={i}>{render(lines[i++].replace(pattern, ''), baseUrl)}</li>); }
      blocks.push(ordered ? <ol key={key} className="list-decimal space-y-1 pl-6">{items}</ol> : <ul key={key} className="list-disc space-y-1 pl-6">{items}</ul>); continue;
    }
    if (line.includes('|') && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] || '')) {
      const cells = (row: string) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
      const header = cells(line), rows: string[][] = []; i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++]));
      blocks.push(<div key={key} className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr>{header.map((cell, j) => <th key={j} className="border-b p-2">{render(cell, baseUrl)}</th>)}</tr></thead><tbody>{rows.map((row, j) => <tr key={j}>{row.map((cell, k) => <td key={k} className="border-b border-[#5f8f84]/15 p-2">{render(cell, baseUrl)}</td>)}</tr>)}</tbody></table></div>); continue;
    }
    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) { blocks.push(<hr key={key} className="border-[#5f8f84]/20" />); i++; continue; }
    const paragraph = [line]; i++;
    while (i < lines.length && lines[i].trim() && !/^\s*(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|`{3}|~{3})/.test(lines[i]) && !/^\s*\|?\s*:?-{3,}/.test(lines[i + 1] || '')) paragraph.push(lines[i++]);
    blocks.push(<p key={key} className="whitespace-pre-wrap">{render(paragraph.join('\n'), baseUrl)}</p>);
  }
  return <div className="space-y-4 break-words text-sm leading-7" aria-label="文章正文预览">{blocks.length ? blocks : <p className="text-[#718986]">正文预览会显示在这里。</p>}</div>;
}
