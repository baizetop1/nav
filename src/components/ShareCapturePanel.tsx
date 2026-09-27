import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Bookmark, Check, ClipboardPaste, Copy, Inbox, Share2, X } from 'lucide-react';
import type { InboxDraft } from '../types/inbox';
import { buildCaptureBookmarklet, createShareInboxDraft, parseShareFields, SHARE_LIMITS, type IncomingShare, type ShareCaptureFields } from '../lib/shareCapture';

export interface ShareCapturePanelProps {
  open: boolean;
  incoming?: IncomingShare | null;
  onCapture: (draft: InboxDraft) => string | null | Promise<string | null>;
  onClose: () => void;
}
const emptyFields: ShareCaptureFields = { title: '', url: '', text: '' };

export function ShareCapturePanel({ open, incoming, onCapture, onClose }: ShareCapturePanelProps) {
  const [fields, setFields] = useState<ShareCaptureFields>(() => incoming?.fields || emptyFields);
  const [warnings, setWarnings] = useState<string[]>(() => incoming?.warnings || []);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clipboardMessage, setClipboardMessage] = useState('');
  const panelRef = useRef<HTMLElement>(null);
  const bookmarkRef = useRef<HTMLAnchorElement>(null);
  const id = useId();
  const bookmarklet = useMemo(() => {
    const appUrl = new URL(window.location.href);
    appUrl.search = '';
    appUrl.hash = '';
    return buildCaptureBookmarklet(appUrl.toString());
  }, []);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    if (!incoming) return;
    setFields(incoming.fields);
    setWarnings(incoming.warnings);
    setMessage('');
    setSaved(false);
  }, [incoming]);

  useEffect(() => {
    if (!open) return;
    // This known script is installed by dragging, not executed on this page.
    // DOM assignment avoids React rewriting a javascript: bookmarklet URL.
    bookmarkRef.current?.setAttribute('href', bookmarklet);
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const elements = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href], summary') || []).filter(element => element.getClientRects().length > 0);
      if (!elements.length) { event.preventDefault(); return; }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panelRef.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [open, bookmarklet]);

  if (!open) return null;
  const update = (key: keyof ShareCaptureFields, value: string) => { setFields(current => ({ ...current, [key]: value })); setMessage(''); setSaved(false); };
  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parseShareFields({ text });
      setFields(current => ({ title: current.title, url: parsed.fields.url || current.url, text: parsed.fields.text }));
      setWarnings(parsed.warnings);
      setMessage('');
      setSaved(false);
    } catch { setMessage('无法读取剪贴板，请在下面的输入框中长按或按 Ctrl+V 粘贴。'); }
  };
  const submit = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setSaved(false);
    setMessage('');
    try {
      const error = await onCapture(createShareInboxDraft(fields));
      if (error) { setMessage(error); return; }
      setFields(emptyFields);
      setWarnings([]);
      setSaved(true);
      setMessage('已保存到 Inbox，可继续收集或关闭此窗口。');
    } catch (error) { setMessage(error instanceof Error ? error.message : '保存失败，内容已保留，请重试。'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const copyScript = async () => {
    try { await navigator.clipboard.writeText(bookmarklet); setClipboardMessage('脚本已复制。新建书签，将脚本粘贴到网址字段。'); }
    catch { setClipboardMessage('自动复制不可用，请展开下方脚本文本手动复制。'); }
  };

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#07191d]/45 p-3 backdrop-blur-sm sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={`${id}-heading`} tabIndex={-1} className="baize-panel flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden outline-none">
      <header className="flex items-center justify-between border-b border-[#5f8f84]/15 px-4 py-4 sm:px-6 dark:border-[#c9a96b]/10">
        <div><h2 id={`${id}-heading`} className="flex items-center gap-2 text-lg font-bold text-[#173b41] dark:text-[#f4f1e8]"><Share2 size={20} />一键收集</h2><p className="mt-1 text-xs text-[#718986]">确认内容后保存到 Inbox</p></div>
        <button type="button" className="baize-icon-button" onClick={onClose} disabled={busy} aria-label="关闭一键收集"><X size={20} /></button>
      </header>
      <div className="space-y-4 overflow-y-auto p-4 sm:p-6">
        {incoming && <p className="rounded-xl bg-[#5f8f84]/10 p-3 text-sm text-[#456b68] dark:text-[#b8c6c1]">已接收{incoming.source === 'system' ? '系统分享' : '书签收集'}内容。请检查后保存；打开此页不会自动新增记录。</p>}
        {warnings.length > 0 && <div role="status" className="space-y-1 text-xs leading-5 text-[#985247] dark:text-[#e1a294]">{warnings.map(warning => <p key={warning}>{warning}</p>)}</div>}
        <button type="button" className="baize-button-secondary" disabled={busy} onClick={() => { void paste(); }}><ClipboardPaste size={16} />从剪贴板粘贴</button>
        <form className="space-y-3" onSubmit={event => { event.preventDefault(); void submit(); }}>
          <label className="block space-y-1 text-sm text-[#456b68] dark:text-[#b8c6c1]"><span>标题（可选）</span><input className="baize-input" value={fields.title} maxLength={SHARE_LIMITS.title} disabled={busy} onChange={event => update('title', event.target.value)} placeholder="为这次收集起个名字" /></label>
          <label className="block space-y-1 text-sm text-[#456b68] dark:text-[#b8c6c1]"><span>网址（可选）</span><input className="baize-input" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" value={fields.url} maxLength={SHARE_LIMITS.url} disabled={busy} onChange={event => update('url', event.target.value)} placeholder="https://example.com" /></label>
          <label className="block space-y-1 text-sm text-[#456b68] dark:text-[#b8c6c1]"><span>备注 / 选中文本</span><textarea className="baize-input min-h-28 resize-y" value={fields.text} maxLength={SHARE_LIMITS.text} rows={5} disabled={busy} onChange={event => update('text', event.target.value)} placeholder="也可以只保存一段文本" /><span className="block text-right text-xs text-[#718986]">{fields.text.length} / {SHARE_LIMITS.text}</span></label>
          {message && <p role={saved ? 'status' : 'alert'} className={`text-sm ${saved ? 'text-[#356b66] dark:text-[#b8cec7]' : 'text-[#985247] dark:text-[#e1a294]'}`}>{message}</p>}
          <button type="submit" className="baize-button-primary w-full justify-center" disabled={busy || (!fields.url.trim() && !fields.text.trim())}>{saved ? <Check size={17} /> : <Inbox size={17} />}{busy ? '正在保存…' : '保存到 Inbox'}</button>
        </form>
        <details className="rounded-xl border border-[#5f8f84]/15 p-3 dark:border-[#c9a96b]/10">
          <summary className="cursor-pointer text-sm font-medium text-[#456b68] dark:text-[#b8c6c1]">设置手机分享与桌面收集</summary>
          <div className="mt-3 space-y-3 text-xs leading-5 text-[#718986]">
            <p>手机：先通过浏览器菜单将白泽安装到主屏幕。支持的浏览器中，浏览网页时点“分享”，选择“白泽导航”。如果分享列表没有白泽，请复制网址后在这里粘贴。</p>
            <p>桌面：将下面的“收集到白泽”拖到浏览器书签栏。浏览其他网页时点这个书签，即可带入网址、标题和选中的文本。需要你手动安装书签；有些网站会限制书签脚本运行。</p>
            <div className="flex flex-wrap gap-2">
              <a ref={bookmarkRef} href="#install-bookmarklet" draggable className="baize-button-secondary" onClick={event => { event.preventDefault(); setClipboardMessage('请将此按钮拖到书签栏，或复制脚本后手动新建书签。'); }} onDragStart={event => { event.dataTransfer.setData('text/uri-list', bookmarklet); event.dataTransfer.setData('text/plain', bookmarklet); }}><Bookmark size={15} />收集到白泽</a>
              <button type="button" className="baize-button-secondary" onClick={() => { void copyScript(); }}><Copy size={15} />复制书签脚本</button>
            </div>
            {clipboardMessage && <p role="status">{clipboardMessage}</p>}
            <details><summary className="cursor-pointer">查看脚本文本</summary><textarea aria-label="书签脚本文本" className="baize-input mt-2 text-xs" rows={4} readOnly value={bookmarklet} onFocus={event => event.target.select()} /></details>
            <p>系统分享会经过本站地址，载入后自动清理地址栏中的分享内容。请勿通过此入口传递密码等敏感信息；保存后可使用 Inbox 的加密同步。</p>
          </div>
        </details>
      </div>
    </section>
  </div>;
}
