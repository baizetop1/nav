import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, QrCode, ScanLine, X } from 'lucide-react';
import { buildTextTransferUrl, MAX_TEXT_TRANSFER_BYTES, textTransferByteLength } from '../lib/textTransfer';

interface TempTextQrModalProps {
  text: string;
  onClose: () => void;
}

type TransferMode = 'receive' | 'plain';

export function TempTextQrModal({ text, onClose }: TempTextQrModalProps) {
  const [mode, setMode] = useState<TransferMode>('receive');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const byteLength = textTransferByteLength(text);
  const qrContent = useMemo(() => mode === 'receive' && text && byteLength <= MAX_TEXT_TRANSFER_BYTES
    ? buildTextTransferUrl(text, window.location.href)
    : text, [byteLength, mode, text]);

  useEffect(() => {
    setImageUrl('');
    if (!text) {
      setError('临时文本为空。');
      return;
    }
    if (byteLength > MAX_TEXT_TRANSFER_BYTES) {
      setError(`当前文本 ${byteLength} 字节，超过 ${MAX_TEXT_TRANSFER_BYTES} 字节上限。请缩短内容或使用 GitHub 加密同步。`);
      return;
    }
    setError('');
    void QRCode.toDataURL(qrContent, {
      width: 380,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#173b41', light: '#f7f6f0' },
    }).then(setImageUrl).catch(() => setError('二维码生成失败，请缩短临时文本后重试。'));
  }, [byteLength, qrContent, text]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#07191d]/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="temp-qr-title" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="baize-panel w-full max-w-md rounded-2xl p-5 shadow-2xl">
        <header className="flex items-start justify-between gap-3">
          <div><h2 id="temp-qr-title" className="flex items-center gap-2 text-lg font-bold text-[#173b41] dark:text-[#f4f1e8]"><QrCode size={20} />临时文本二维码</h2><p className={`mt-1 text-xs ${byteLength > MAX_TEXT_TRANSFER_BYTES ? 'text-[#985247]' : 'text-[#718986]'}`}>{byteLength} / {MAX_TEXT_TRANSFER_BYTES} UTF-8 字节</p></div>
          <button type="button" className="baize-icon-button shrink-0" aria-label="关闭文本二维码" onClick={onClose}><X size={18} /></button>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-[#5f8f84]/15 bg-white/20 p-1 dark:border-[#c9a96b]/10 dark:bg-[#07191d]/20">
          <button type="button" onClick={() => setMode('receive')} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${mode === 'receive' ? 'bg-[#356b66] text-white dark:bg-[#c9a96b] dark:text-[#102c33]' : 'text-[#64807c] hover:bg-[#5f8f84]/10 dark:text-[#aab9b5]'}`}>打开白泽接收</button>
          <button type="button" onClick={() => setMode('plain')} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${mode === 'plain' ? 'bg-[#356b66] text-white dark:bg-[#c9a96b] dark:text-[#102c33]' : 'text-[#64807c] hover:bg-[#5f8f84]/10 dark:text-[#aab9b5]'}`}>纯文本扫码</button>
        </div>

        <div className="my-4 flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-[#5f8f84]/15 bg-[#f7f6f0] p-3">
          {imageUrl ? <img src={imageUrl} alt="临时文本传输二维码" className="h-full w-full object-contain" /> : <span className={`px-6 text-center text-sm leading-6 ${error ? 'text-[#985247]' : 'text-[#718986]'}`}>{error || '正在生成二维码…'}</span>}
        </div>

        <p className="mb-4 text-xs leading-5 text-[#718986]">{mode === 'receive' ? '扫码后打开白泽导航，预览并确认写入临时文本。文本位于网址 # 片段中，不会发送到 GitHub Pages 服务器。' : '扫码应用会直接显示文本，适合复制到其他应用。'} 二维码内容未加密，请勿在他人可见时展示敏感信息。</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={!qrContent || Boolean(error)} className="baize-button-secondary" onClick={() => { void navigator.clipboard.writeText(qrContent); }}><Copy size={16} />{mode === 'receive' ? '复制传输链接' : '复制文本'}</button>
          <a className="baize-button-primary" href={imageUrl || undefined} download="baize-temp-text-qr.png" aria-disabled={!imageUrl} onClick={event => { if (!imageUrl) event.preventDefault(); }}><Download size={16} />下载二维码</a>
        </div>
      </section>
    </div>
  );
}

interface TextTransferReceiveModalProps {
  text: string;
  currentText: string;
  onAccept: () => void;
  onClose: () => void;
}

export function TextTransferReceiveModal({ text, currentText, onAccept, onClose }: TextTransferReceiveModalProps) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#07191d]/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="receive-text-title" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="baize-panel w-full max-w-lg rounded-2xl p-5 shadow-2xl">
        <header className="flex items-start justify-between gap-3"><div><h2 id="receive-text-title" className="flex items-center gap-2 text-lg font-bold text-[#173b41] dark:text-[#f4f1e8]"><ScanLine size={20} />收到临时文本</h2><p className="mt-1 text-xs text-[#718986]">请确认内容后再写入本机。</p></div><button type="button" className="baize-icon-button" aria-label="取消接收" onClick={onClose}><X size={18} /></button></header>
        <textarea readOnly value={text} rows={10} className="baize-input mt-4 resize-y font-mono leading-6" />
        <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-[#718986]">{textTransferByteLength(text)} 字节</span><button type="button" className="baize-icon-button flex items-center gap-1 text-xs" onClick={() => { void navigator.clipboard.writeText(text); }}><Copy size={14} />复制</button></div>
        {currentText && currentText !== text && <p className="mt-3 rounded-xl bg-[#c9a96b]/10 p-3 text-xs leading-5 text-[#735f31] dark:text-[#dac58f]">接收后会覆盖本设备已有的临时文本。</p>}
        <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" className="baize-button-secondary" onClick={onClose}>取消</button><button type="button" className="baize-button-primary" onClick={onAccept}><Check size={16} />确认接收</button></div>
      </section>
    </div>
  );
}
