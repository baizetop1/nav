import { useEffect, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Pin, SlidersHorizontal } from 'lucide-react';
import { defaultHomeTools, groupHomeTools, HOME_TOOLS_EVENT, HOME_TOOLS_KEY, readHomeTools, saveHomeTools, type HomeToolId } from '../lib/homeTools';
import { WORKSPACE_EVENT } from '../services/workspaceSync';
export interface HomeToolAction { id: HomeToolId; label: string; icon?: ReactNode; run?: () => void; href?: string; active?: boolean; disabled?: boolean }
export function HomeToolLauncher({ actions, compact, onEditingChange }: { actions: HomeToolAction[]; compact: boolean; onEditingChange?: (editing: boolean) => void }) {
  const [stored, setStored] = useState(readHomeTools), [moreOpen, setMoreOpen] = useState(false), [editor, setEditor] = useState<ReturnType<typeof readHomeTools> | null>(null), [message, setMessage] = useState('');
  useEffect(() => { onEditingChange?.(Boolean(editor)); }, [Boolean(editor), onEditingChange]);
  useEffect(() => () => onEditingChange?.(false), [onEditingChange]);
  useEffect(() => { setMoreOpen(false); }, [compact]);
  useEffect(() => { const refresh = () => setStored(readHomeTools()); const storage = (event: StorageEvent) => { if (!event.key || event.key === HOME_TOOLS_KEY) refresh(); }; window.addEventListener('storage', storage); window.addEventListener(HOME_TOOLS_EVENT, refresh); window.addEventListener(WORKSPACE_EVENT, refresh); return () => { window.removeEventListener('storage', storage); window.removeEventListener(HOME_TOOLS_EVENT, refresh); window.removeEventListener(WORKSPACE_EVENT, refresh); }; }, []);
  const groups = groupHomeTools(stored.config, compact), byId = new Map(actions.map(item => [item.id, item]));
  const render = (id: HomeToolId) => {
    const item = byId.get(id); if (!item) return null;
    const content = <>{item.icon}{item.label}{item.active && <span aria-hidden="true" className="utility-launcher-badge">已打开</span>}</>;
    return item.href ? <a key={id} data-home-tool={id} className="baize-button-secondary utility-launcher-button" href={item.href} target="_blank" rel="noopener noreferrer">{content}</a> : <button key={id} data-home-tool={id} type="button" className="baize-button-secondary utility-launcher-button" aria-pressed={item.active} disabled={item.disabled} onClick={item.run}>{content}</button>;
  };
  const move = (index: number, delta: number) => { if (!editor) return; const tools = [...editor.config.tools]; [tools[index], tools[index + delta]] = [tools[index + delta], tools[index]]; setEditor({ ...editor, config: { version: 1, tools } }); };
  return <div className="contents">
    {groups.primary.map(render)}
    {groups.more.length > 0 && <button type="button" className="baize-button-secondary utility-launcher-button" aria-expanded={moreOpen} aria-controls="home-more-tools" onClick={() => setMoreOpen(value => !value)}><ChevronDown size={16} />更多工具<span className="utility-launcher-badge">{groups.more.length}</span></button>}
    <button type="button" className="baize-button-secondary utility-launcher-button" aria-expanded={Boolean(editor)} onClick={() => { setEditor(value => value ? null : readHomeTools()); setMessage(''); }}><SlidersHorizontal size={16} />整理入口</button>
    {moreOpen && <div id="home-more-tools" aria-label="更多首页工具" className="flex basis-full flex-wrap gap-2 rounded-xl border appearance-border appearance-soft p-3">{groups.more.map(render)}</div>}
    {editor && <section aria-label="首页入口整理" className="baize-panel basis-full space-y-3 rounded-2xl p-4"><h2 className="text-sm font-semibold">首页入口整理</h2><p className="text-xs leading-5 appearance-muted">固定项优先展示。普通模式最多展示 6 项（固定项不受此限），工作模式只展示固定项。隐藏仅影响入口，不会关闭正在使用的面板；全局命令面板仍可打开工具。</p>
      {(stored.error || editor.error) && <p role="alert" className="text-xs text-[#985247]">{stored.error || editor.error} 原数据仍保留；可明确选择恢复默认后保存。</p>}
      <ol className="space-y-2">{editor.config.tools.map((item, index) => <li key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg appearance-soft p-2"><span className="mr-auto min-w-24 text-sm">{byId.get(item.id)?.label || item.id}</span><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={item.visible} onChange={event => setEditor({ ...editor, config: { version: 1, tools: editor.config.tools.map(tool => tool.id === item.id ? { ...tool, visible: event.target.checked } : tool) } })} />显示</label><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={item.pinned} onChange={event => setEditor({ ...editor, config: { version: 1, tools: editor.config.tools.map(tool => tool.id === item.id ? { ...tool, pinned: event.target.checked } : tool) } })} /><Pin size={12} />固定</label><button type="button" className="baize-icon-button" aria-label={'上移 ' + (byId.get(item.id)?.label || item.id)} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></button><button type="button" className="baize-icon-button" aria-label={'下移 ' + (byId.get(item.id)?.label || item.id)} disabled={index === editor.config.tools.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></button></li>)}</ol>
      <div className="flex flex-wrap gap-2"><button type="button" className="baize-button-primary" disabled={Boolean(editor.error)} onClick={() => { try { saveHomeTools(editor.config, editor.raw); setEditor(null); setMessage('首页入口已保存到本机。'); } catch (error) { setMessage('保存失败：' + (error as Error).message); } }}>保存入口设置</button><button type="button" className="baize-button-secondary" onClick={() => setEditor({ ...editor, config: defaultHomeTools(), error: '' })}>恢复默认</button><button type="button" className="baize-button-secondary" onClick={() => setEditor(null)}>取消</button></div>
    </section>}
    {message && <p role="status" className="basis-full text-xs">{message}</p>}
  </div>;
}
