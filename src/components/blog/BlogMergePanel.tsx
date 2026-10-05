import { useMemo, useState } from 'react';
import { planBlogMerge, resolveBlogMerge } from '../../lib/blogMerge';
export function BlogMergePanel({ base, local, remote, disabled, onApply, onClose }: { base: string; local: string; remote: string; disabled: boolean; onApply: (markdown: string) => void; onClose: () => void }) {
  const result = useMemo(() => { try { return { plan: planBlogMerge(base, local, remote), error: '' }; } catch (error) { return { plan: null, error: (error as Error).message }; } }, [base, local, remote]);
  const [selection, setSelection] = useState<{ local: string; remote: string; choices: Record<string, 'local' | 'remote'> }>({ local, remote, choices: {} });
  const choices = selection.local === local && selection.remote === remote ? selection.choices : {};
  let merged: string | null = null, error = result.error;
  try { if (result.plan) merged = resolveBlogMerge(result.plan, choices); } catch (cause) { error = (cause as Error).message; }
  const changes = result.plan?.blocks.filter(block => block.local !== block.base || block.remote !== block.base) || [];
  const unresolved = changes.filter(block => block.merged === null && !choices[block.id]).length;
  return <section className="space-y-3 rounded-xl border appearance-border p-4" aria-label="博客远端比较">
    <h3 className="font-semibold">按改动块合并</h3><p className="text-xs leading-5">以打开文章时的原文为基线。不同位置的修改自动合并；同一处修改需选择本机或远端。尚有 {unresolved} 处待选择。</p>
    {result.plan?.fallback && <p role="status" className="text-xs">文章改动较大，已合并为较大的比较块以避免卡顿。请仔细核对。</p>}
    {error && <p role="alert">{error}</p>}{!changes.length && <p className="text-sm">双方内容均与原文一致。</p>}
    <div className="max-h-[65vh] space-y-3 overflow-y-auto">{changes.map((block, i) => <div key={block.id} className="rounded-xl border appearance-border p-3"><p className="mb-2 text-xs font-semibold">改动 {i + 1} · 原文第 {block.start + 1} 行附近 · {block.merged === null ? '需要选择' : '可自动合并'}</p><details><summary className="cursor-pointer text-xs appearance-muted">查看原文</summary><pre className="mt-2 whitespace-pre-wrap break-words text-xs">{block.base || '（无内容）'}</pre></details><div className="mt-2 grid gap-2 sm:grid-cols-2">{(['local', 'remote'] as const).map(side => <div key={side} className="min-w-0 rounded-lg appearance-soft p-2"><p className="text-xs font-semibold">{side === 'local' ? '本机修改' : '远端修改'}</p><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs">{block[side] || '（删除此段）'}</pre>{block.merged === null && <button type="button" className="baize-button-secondary mt-2 text-xs" aria-pressed={choices[block.id] === side} disabled={disabled} onClick={() => setSelection({ local, remote, choices: { ...choices, [block.id]: side } })}>使用{side === 'local' ? '本机' : '远端'}这一段</button>}</div>)}</div></div>)}</div>
    {merged !== null && <details><summary className="cursor-pointer text-xs">查看合并后的完整源码</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{merged}</pre></details>}
    <div className="flex flex-wrap gap-2"><button type="button" className="baize-button-primary" disabled={disabled || merged === null || Boolean(error)} onClick={() => { if (merged !== null) onApply(merged); }}>保存合并结果到本机</button><button type="button" className="baize-button-secondary" onClick={onClose}>关闭比较</button></div><p className="text-xs appearance-muted">合并只更新本地文章和远端基线，不会提交；再次发布时仍会检查远端版本。</p>
  </section>;
}
