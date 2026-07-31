export const TEXT_TRANSFER_VERSION = 'v1' as const;
export const MAX_TEXT_TRANSFER_BYTES = 1_200;

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

export function textTransferByteLength(text: string): number {
  return encoder.encode(text).length;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('传输二维码内容格式无效。');
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  try {
    return Uint8Array.from(atob(base64), character => character.charCodeAt(0));
  } catch {
    throw new Error('传输二维码内容格式无效。');
  }
}

export function encodeTextTransferPayload(text: string): string {
  if (!text) throw new Error('临时文本为空，无法生成传输二维码。');
  const bytes = encoder.encode(text);
  if (bytes.length > MAX_TEXT_TRANSFER_BYTES) {
    throw new Error(`文本为 ${bytes.length} 字节，超过二维码传输上限 ${MAX_TEXT_TRANSFER_BYTES} 字节。`);
  }
  return `${TEXT_TRANSFER_VERSION}.${toBase64Url(bytes)}`;
}

export function decodeTextTransferPayload(payload: string): string {
  const [version, encoded, ...extra] = payload.split('.');
  if (version !== TEXT_TRANSFER_VERSION || !encoded || extra.length) throw new Error('不支持的临时文本二维码格式。');
  const bytes = fromBase64Url(encoded);
  if (bytes.length > MAX_TEXT_TRANSFER_BYTES) throw new Error('临时文本二维码超过允许的大小。');
  try {
    const text = decoder.decode(bytes);
    if (!text) throw new Error();
    return text;
  } catch {
    throw new Error('临时文本二维码内容已损坏。');
  }
}

export function buildTextTransferUrl(text: string, currentUrl: string): string {
  const url = new URL(currentUrl);
  url.hash = `/transfer?data=${encodeTextTransferPayload(text)}`;
  return url.toString();
}

export function parseTextTransferHash(hash: string): string | null {
  if (!hash.startsWith('#/transfer?')) return null;
  const params = new URLSearchParams(hash.slice(hash.indexOf('?') + 1));
  const payload = params.get('data');
  if (!payload) throw new Error('临时文本二维码缺少传输内容。');
  return decodeTextTransferPayload(payload);
}
