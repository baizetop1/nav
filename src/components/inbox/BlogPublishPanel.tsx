import { useState } from 'react';
import type { InboxItem } from '../../types/inbox';
import { siteConfig } from '../../data/config';
import type { BlogDraftInput } from '../../services/blogDraft';
import { prepareBlogPublication, publishBlogPlan, type BlogPublicationPlan } from '../../services/blogPublish';
import { MarkdownView } from '../tech-os/MarkdownView';

export function BlogPublishPanel({ item, input, token }: { item: InboxItem; input: BlogDraftInput; token: string }) {
  const [plan, setPlan] = useState<BlogPublicationPlan | null>(null);
  const [busy, setBusy] = useState(false), [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState('');
  const [published, setPublished] = useState(false);
  const [commitUrl, setCommitUrl] = useState('');
  const prepare = async () => {
    setBusy(true); setPlan(null); setConfirmed(false); setMessage('');
    try { setPlan(await prepareBlogPublication(item, input, token, siteConfig.blogRepository)); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  };
  const publish = async () => {
    if (!plan || !confirmed || !window.confirm(`确定公开发表《${plan.title}》？\n所有人将可以访问；请确认没有密码、Token 或私人信息。`)) return;
    setBusy(true);
    try { const result = await publishBlogPlan(plan, token, siteConfig.blogRepository); setPublished(true); setCommitUrl(result.commitUrl); setMessage('正式文章已提交到博客仓库，等待 GitHub Pages 构建；不需要再运行命令。'); }
    catch (error) { setPlan(null); setConfirmed(false); setMessage((error as Error).message); }
    finally { setBusy(false); }
  };
  return <section className="mt-5 space-y-3 rounded-xl border border-[#5f8f84]/25 p-4" aria-label="正式发表到博客">
    <h4 className="font-semibold">正式发表到博客</h4>
    <p className="text-xs leading-5">这是公开发布，不是私有同步。若已有同名草稿，将使用远端最新正文并原子转为正式文章；不会用旧 Inbox 覆盖你修改过的草稿。</p>
    {!published && <button type="button" className="baize-button-secondary" disabled={busy || !token.trim()} onClick={() => void prepare()}>读取并预览正式文章</button>}
    {plan && !published && <><p className="break-all text-xs">{plan.draftPath ? `来源：远端 ${plan.draftPath}（以远端元信息及正文为准）` : '来源：当前 Inbox 记录与上方表单'} → {plan.filePath}</p><div className="max-h-72 overflow-auto rounded-xl bg-white/40 p-3 dark:bg-black/10"><MarkdownView body={plan.markdown.slice(plan.markdown.indexOf('\n---\n', 4) + 5)} /></div><details><summary className="cursor-pointer text-xs">检查完整 Markdown</summary><pre className="max-h-60 overflow-auto whitespace-pre-wrap break-all text-xs">{plan.markdown}</pre></details><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />我已检查预览，确认文章可以公开</label><button className="baize-button-primary" type="button" disabled={busy || !confirmed} onClick={() => void publish()}>确认公开发表</button></>}
    <p role="status" className="break-words text-xs">{busy ? '正在处理…' : message}</p>
    {published && plan && <div className="flex flex-wrap gap-3 text-sm"><a className="underline" href={`https://baizeone.top/p/${plan.slug}/`} target="_blank" rel="noreferrer">查看文章（部署后可见）</a><a className="underline" href={`https://github.com/${siteConfig.blogRepository.owner}/${siteConfig.blogRepository.repo}/actions`} target="_blank" rel="noreferrer">查看部署状态</a><a className="underline" href={commitUrl} target="_blank" rel="noreferrer">查看提交</a></div>}
  </section>;
}
