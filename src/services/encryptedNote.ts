export interface EncryptedNote {
  version: 1;
  algorithm: EncryptedTextFields['algorithm'];
  kdf: EncryptedTextFields['kdf'];
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  updatedAt: string;
}

export interface EncryptedTextFields {
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA-256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

export const ENCRYPTION_ITERATIONS = 600_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const NOTE_CONTEXT = 'baize-nav-temp-note-v1';

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptTextPayload(text: string, password: string, contextLabel: string): Promise<EncryptedTextFields> {
  if (password.length < 12) throw new Error('加密密码至少需要 12 个字符。');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ENCRYPTION_ITERATIONS);
  const context = encoder.encode(contextLabel);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer, additionalData: context.buffer as ArrayBuffer },
    key,
    encoder.encode(text).buffer as ArrayBuffer,
  );
  return {
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: ENCRYPTION_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptTextPayload(payload: EncryptedTextFields, password: string, contextLabel: string): Promise<string> {
  if (password.length < 12) throw new Error('加密密码至少需要 12 个字符。');
  if (payload.algorithm !== 'AES-256-GCM' || payload.kdf !== 'PBKDF2-SHA-256' || payload.iterations !== ENCRYPTION_ITERATIONS) {
    throw new Error('不支持的加密数据格式。');
  }
  try {
    const salt = fromBase64(payload.salt);
    const iv = fromBase64(payload.iv);
    if (salt.length !== 16 || iv.length !== 12) throw new Error('invalid encryption parameters');
    const key = await deriveKey(password, salt, payload.iterations);
    const context = encoder.encode(contextLabel);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer, additionalData: context.buffer as ArrayBuffer },
      key,
      fromBase64(payload.ciphertext).buffer as ArrayBuffer,
    );
    return decoder.decode(plaintext);
  } catch {
    throw new Error('解密失败：密码错误或远端密文已损坏。');
  }
}

export async function encryptNote(text: string, password: string): Promise<EncryptedNote> {
  return {
    version: 1,
    ...await encryptTextPayload(text, password, NOTE_CONTEXT),
    updatedAt: new Date().toISOString(),
  };
}

export async function decryptNote(payload: EncryptedNote, password: string): Promise<string> {
  if (payload.version !== 1) throw new Error('不支持的加密文本格式。');
  return decryptTextPayload(payload, password, NOTE_CONTEXT);
}
