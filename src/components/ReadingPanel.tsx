import { useEffect, useState } from 'react';
import { BookOpen, Bookmark, X } from 'lucide-react';
import { loadReading, READING_EVENT, updateReading } from '../services/readingHistory';
import type { TextNode } from '../types/text-network';

export function ReadingPanel({ nodes, onClose, onSync }: { nodes: TextNode[]; onClose: () => void; onSync: () => void }) {
  const [store, setStore] = useState(loadReading), [tab, setTab] = useState<'recent' | 'later' | 'continue'>('recent');
  const [url, setUrl] = useState(''), [title, setTitle] = useState(''), [message, setMessage] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const refresh = () => setStore(loadReading()), network = () => setOnline(navigator.onLine);
    window.addEventListener(READING_EVENT, refresh); window.addEventListener('storage', refresh); window.addEventListener('online', network); window.addEventListener('offline', network);
    return () => { window.removeEventListener(READING_EVENT, refresh); window.removeEventListener('storage', refresh); window.removeEventListener('online', network); window.removeEventListener('offline', network); };
  }, []);
  const items = Object.values(store.items).filter(item => !item.deletedAt && (tab === 'later' ? item.readLater : tab === 'continue' ? item.position > 0 && item.position < 98 : true)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return <section className="baize-panel min-w-0 max-w-full scroll-mt-24 basis-full space-y-4 rounded-2xl p-4 sm:p-5" aria-label="阅读中心">
    <div className="flex items-center gap-2"><BookOpen size={19} /><h2 className="flex-1 font-bold">阅读中心</h2><span className="text-xs">{online ? '在线' : '离线 · 可记录，联网后同步'}</span><button type="button" className="baize-icon-button" onClick={onClose} aria-label="关闭阅读中心"><X size={18} /></button></div>
    <p className="text-xs leading-5">本站博客会记录阅读位置；手机和电脑在 Inbox 完成加密同步后可接着读。外部网页可加入稍后阅读，但无法跟踪其阅读位置。</p>
    <div className="flex flex-wrap gap-2">{([['recent', '最近阅读'], ['later', '稍后阅读'], ['continue', '接着读']] as const).map(([value, label]) => <button type="button" key={value} className={tab === value ? 'baize-button-primary' : 'baize-button-secondary'} onClick={() => setTab(value)}>{label}</button>)}<button type="button" className="baize-button-secondary" onClick={onSync}>同步到其他设备</button></div>
    <form className="grid gap-2 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); try { updateReading(url, title || url, { readLater: true }); setUrl(''); setTitle(''); setMessage('已保存到稍后阅读。'); } catch (error) { setMessage((error as Error).message); } }}><label className="sr-only" htmlFor="reading-url">稍后阅读网址</label><input id="reading-url" className="baize-input" type="url" required placeholder="粘贴要稍后阅读的网址" value={url} onChange={event => setUrl(event.target.value)} /><input className="baize-input" placeholder="标题（可选）" aria-label="稍后阅读标题" value={title} onChange={event => setTitle(event.target.value)} /><select className="baize-input" aria-label="选择博客文章" value="" onChange={event => { const node = nodes.find(item => item.id === event.target.value); if (node) { setUrl(node.url); setTitle(node.title); } }}><option value="">或者选择博客文章…</option>{nodes.filter(node => node.type === 'post').map(node => <option key={node.id} value={node.id}>{node.title}</option>)}</select><button className="baize-button-secondary" type="submit"><Bookmark size={15} />加入稍后阅读</button></form>
    <p role="status" className="text-xs">{message}</p>
    <div className="grid gap-3 sm:grid-cols-2">{items.slice(0, 100).map(item => { const resume = new URL(item.url); if (item.position > 0) resume.searchParams.set('resume', '1'); return <article className="min-w-0 rounded-xl border border-[#5f8f84]/20 p-3" key={item.url}><a className="block truncate font-semibold hover:underline" href={resume.href}>{item.title}</a><p className="mt-1 truncate text-xs text-[#718986]">{new URL(item.url).hostname} · 阅读 {Math.round(item.position)}%</p><div className="mt-2 h-1 bg-[#5f8f84]/10"><div className="h-full bg-[#356b66]" style={{ width: `${item.position}%` }} /></div><div className="mt-3 flex flex-wrap gap-2"><a className="baize-button-primary text-xs" href={resume.href}>{item.position > 0 ? '从上次位置继续' : '打开阅读'}</a><button type="button" className="baize-button-secondary text-xs" onClick={() => { try { updateReading(item.url, item.title, { readLater: !item.readLater }); } catch (error) { setMessage((error as Error).message); } }}>{item.readLater ? '移出稍后阅读' : '稍后阅读'}</button><button type="button" className="baize-button-secondary text-xs" onClick={() => { try { updateReading(item.url, item.title, { deletedAt: new Date().toISOString() }); } catch (error) { setMessage((error as Error).message); } }}>移除记录</button></div></article>; })}</div>
    {!items.length && <p className="py-6 text-center text-sm text-[#718986]">这里还没有记录。打开一篇本站文章，或先加入稍后阅读。</p>}
  </section>;
}
