import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Download, ExternalLink, QrCode, X } from 'lucide-react';
import type { Site } from '../types/navigation';

interface QrCodeModalProps {
  site: Site | null;
  onClose: () => void;
}

export function QrCodeModal({ site, onClose }: QrCodeModalProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!site) return;
    setImageUrl('');
    setError('');
    void QRCode.toDataURL(site.url, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#173b41', light: '#f7f6f0' },
    }).then(setImageUrl).catch(() => setError('二维码生成失败，请检查网站地址。'));
  }, [site]);

  useEffect(() => {
    if (!site) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, site]);

  if (!site) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#07191d]/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="qr-title" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="baize-panel w-full max-w-sm rounded-2xl p-5 shadow-2xl">
        <header className="flex items-start justify-between gap-3">
          <div><h2 id="qr-title" className="flex items-center gap-2 text-lg font-bold text-[#173b41] dark:text-[#f4f1e8]"><QrCode size={20} />{site.name}</h2><p className="mt-1 break-all text-xs text-[#718986]">{site.url}</p></div>
          <button type="button" className="baize-icon-button shrink-0" aria-label="关闭二维码" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="my-5 flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-[#5f8f84]/15 bg-[#f7f6f0] p-3">
          {imageUrl ? <img src={imageUrl} alt={`${site.name} 的二维码`} className="h-full w-full object-contain" /> : <span className={`text-sm ${error ? 'text-[#985247]' : 'text-[#718986]'}`}>{error || '正在生成二维码…'}</span>}
        </div>
        <p className="mb-4 text-center text-xs leading-5 text-[#718986]">二维码完全在本机生成，不会把网址发送给第三方服务。</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="baize-button-secondary" onClick={() => { void navigator.clipboard.writeText(site.url); }}><Copy size={16} />复制链接</button>
          <a className="baize-button-secondary" href={site.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />打开网站</a>
          <a className="baize-button-primary col-span-2" href={imageUrl || undefined} download={`${site.id}-qrcode.png`} aria-disabled={!imageUrl} onClick={event => { if (!imageUrl) event.preventDefault(); }}><Download size={16} />下载二维码 PNG</a>
        </div>
      </section>
    </div>
  );
}
