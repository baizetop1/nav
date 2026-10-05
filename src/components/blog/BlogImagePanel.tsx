import { useEffect, useRef, useState } from 'react';
import { BLOG_IMAGE_MAX_BYTES, inspectBlogImage, uploadBlogImage, type BlogImageUpload } from '../../services/blogImages';
import type { RepositoryTarget } from '../../services/github';
export function BlogImagePanel({ file, slug, token, target, onState, onInsert, onChoose, onClose }: { file: File | null; slug: string; token: string; target: RepositoryTarget; onState: (active: boolean) => void; onInsert: (markdown: string, result: BlogImageUpload) => void; onChoose: (file: File) => void; onClose: () => void }) {
  const [preview, setPreview] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [confirmed, setConfirmed] = useState(false), [alt, setAlt] = useState(''), [uploaded, setUploaded] = useState<BlogImageUpload | null>(null);
  const bytes = useRef<Uint8Array | null>(null), requestId = useRef(0);
  useEffect(() => {
    const id = ++requestId.current; let objectUrl = '';
    bytes.current = null; setPreview(''); setError(''); setUploaded(null); setConfirmed(false);
    if (file) { setAlt(file.name.replace(/\.[^.]+$/, '')); void (async () => {
      try {
        if (file.size > BLOG_IMAGE_MAX_BYTES) throw new Error('图片超过 5 MB，请先压缩。');
        const data = new Uint8Array(await file.arrayBuffer()), kind = inspectBlogImage(data);
        if (requestId.current !== id) return;
        objectUrl = URL.createObjectURL(new Blob([data], { type: kind.mime })); bytes.current = data; setPreview(objectUrl);
      } catch (cause) { if (requestId.current === id) setError((cause as Error).message); }
    })(); }
    return () => { requestId.current++; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file]);
  useEffect(() => { onState(Boolean(file) || busy); return () => onState(false); }, [file, busy, onState]);
  const markdown = (result: BlogImageUpload) => `\n![${alt.replace(/[\[\]\\\r\n]/g, '').slice(0, 160) || '图片'}](${result.markdownUrl})\n`;
  const upload = async () => {
    if (!bytes.current || !confirmed || busy) return;
    setBusy(true); setError('');
    try { const result = await uploadBlogImage(bytes.current, slug, token, target); setUploaded(result); onInsert(markdown(result), result); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };
  return <section aria-label="博客图片上传" className="space-y-3 rounded-xl border appearance-border p-4" onDragOver={event => { event.preventDefault(); }} onDrop={event => { event.preventDefault(); if (!busy && !file && event.dataTransfer.files[0]) onChoose(event.dataTransfer.files[0]); }}>
    <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">插入本地图片</h3><button type="button" className="baize-button-secondary text-xs" disabled={busy} onClick={onClose}>{uploaded ? '完成' : '取消'}</button></div>
    <p className="text-xs leading-5 appearance-muted">选择、拖入或在正文粘贴图片。图片仅在内存预览，不会随草稿自动保存。确认后上传至博客仓库；公开仓库中的图片任何人都可读取，请勿上传隐私内容。</p>
    {!file && <input aria-label="选择博客图片" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={event => { const chosen = event.target.files?.[0]; if (chosen) onChoose(chosen); }} />}
    {file && <p className="break-all text-xs">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
    {preview && <img src={preview} alt="待上传图片预览" onError={() => { bytes.current = null; setPreview(''); setError('图片无法解码，请重新选择有效的图片。'); }} className="max-h-64 max-w-full rounded-xl object-contain" />}
    {file && !uploaded && <><label className="block text-xs">图片说明<input className="baize-input mt-1" value={alt} disabled={busy} maxLength={160} onChange={event => setAlt(event.target.value)} /></label><label className="flex items-start gap-2 text-xs leading-5"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />我确认图片可以公开，并允许提交到 {target.owner}/{target.repo} 的 {target.branch} 分支</label><button type="button" className="baize-button-primary" disabled={!preview || !confirmed || busy || !token.trim()} onClick={() => void upload()}>{busy ? '正在上传…' : '上传并插入正文'}</button>{!token.trim() && <p className="text-xs">请先在“连接博客仓库”中输入 Token。</p>}</>}
    {uploaded && <div className="space-y-2 text-xs"><p role="status">图片已提交，引用已插入本地正文；文章仍需另行发布。站点图片地址在博客部署后生效。</p><a href={uploaded.commitUrl} target="_blank" rel="noreferrer" className="underline">查看图片提交</a><textarea aria-label="已上传图片 Markdown" readOnly className="baize-input font-mono text-xs" value={markdown(uploaded)} /><p>关闭此面板后，等待正文显示“已自动保存到本机”再离开。</p></div>}
    {error && <p role="alert" className="text-sm text-[#985247]">{error}</p>}
  </section>;
}
