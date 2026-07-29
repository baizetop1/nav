import { parseBackup, type NavigationBackup } from '../lib/backup.ts';

export const ENCRYPTED_BACKUP_VERSION = 1 as const;
export const ENCRYPTED_BACKUP_FORMAT = 'baize-navigation-backup' as const;
export const ENCRYPTED_BACKUP_ITERATIONS = 600_000 as const;

export interface EncryptedNavigationBackup {
  format: typeof ENCRYPTED_BACKUP_FORMAT;
  version: typeof ENCRYPTED_BACKUP_VERSION;
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA-256';
  iterations: typeof ENCRYPTED_BACKUP_ITERATIONS;
  salt: string;
  iv: string;
  ciphertext: string;
  encryptedAt: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const additionalData = encoder.encode(`${ENCRYPTED_BACKUP_FORMAT}:v${ENCRYPTED_BACKUP_VERSION}`);
const payloadKeys = [
  'format',
  'version',
  'algorithm',
  'kdf',
  'iterations',
  'salt',
  'iv',
  'ciphertext',
  'encryptedAt',
] as const;
const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function fail(message: string): never {
  throw new Error(`Invalid encrypted navigation backup: ${message}`);
}

function requirePassword(password: string): void {
  if (typeof password !== 'string' || Array.from(password).length < 12) {
    throw new Error('加密密码至少需要 12 个字符。');
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(value: unknown, field: string, expectedLength?: number): Uint8Array {
  if (typeof value !== 'string' || !value || value.length % 4 !== 0 || !base64Pattern.test(value)) {
    fail(`${field} must be valid base64`);
  }

  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(value), character => character.charCodeAt(0));
  } catch {
    fail(`${field} must be valid base64`);
  }

  if (expectedLength !== undefined && bytes.length !== expectedLength) {
    fail(`${field} must decode to ${expectedLength} bytes`);
  }
  return bytes;
}

function parseEncryptedBackup(input: string | unknown): EncryptedNavigationBackup {
  let value: unknown = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      fail('file is not valid JSON');
    }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('payload must be an object');
  const payload = value as Record<string, unknown>;
  const keys = Object.keys(payload);
  if (keys.some(key => !(payloadKeys as readonly string[]).includes(key))) fail('payload contains an unsupported field');
  if (payloadKeys.some(key => !Object.prototype.hasOwnProperty.call(payload, key))) fail('payload is missing a required field');

  if (payload.format !== ENCRYPTED_BACKUP_FORMAT) fail(`unsupported format ${String(payload.format)}`);
  if (payload.version !== ENCRYPTED_BACKUP_VERSION) fail(`unsupported version ${String(payload.version)}`);
  if (payload.algorithm !== 'AES-256-GCM') fail(`unsupported algorithm ${String(payload.algorithm)}`);
  if (payload.kdf !== 'PBKDF2-SHA-256') fail(`unsupported KDF ${String(payload.kdf)}`);
  if (payload.iterations !== ENCRYPTED_BACKUP_ITERATIONS) fail(`unsupported iteration count ${String(payload.iterations)}`);
  if (typeof payload.encryptedAt !== 'string' || Number.isNaN(Date.parse(payload.encryptedAt))) {
    fail('encryptedAt must be a valid date');
  }

  fromBase64(payload.salt, 'salt', 16);
  fromBase64(payload.iv, 'iv', 12);
  const ciphertext = fromBase64(payload.ciphertext, 'ciphertext');
  if (ciphertext.length < 16) fail('ciphertext is too short');

  return payload as unknown as EncryptedNavigationBackup;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password).buffer as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: ENCRYPTED_BACKUP_ITERATIONS,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptBackup(
  input: NavigationBackup | string,
  password: string,
): Promise<EncryptedNavigationBackup> {
  requirePassword(password);
  const backup = parseBackup(input);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const plaintext = encoder.encode(JSON.stringify(backup));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
      additionalData: additionalData.buffer as ArrayBuffer,
      tagLength: 128,
    },
    key,
    plaintext.buffer as ArrayBuffer,
  );

  return {
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: ENCRYPTED_BACKUP_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    encryptedAt: new Date().toISOString(),
  };
}

export async function decryptBackup(
  input: EncryptedNavigationBackup | string | unknown,
  password: string,
): Promise<NavigationBackup> {
  requirePassword(password);
  const payload = parseEncryptedBackup(input);
  const salt = fromBase64(payload.salt, 'salt', 16);
  const iv = fromBase64(payload.iv, 'iv', 12);
  const ciphertext = fromBase64(payload.ciphertext, 'ciphertext');
  const key = await deriveKey(password, salt);

  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer,
        additionalData: additionalData.buffer as ArrayBuffer,
        tagLength: 128,
      },
      key,
      ciphertext.buffer as ArrayBuffer,
    );
  } catch {
    throw new Error('解密失败：密码错误，或加密备份已损坏。');
  }

  let json: string;
  try {
    json = decoder.decode(plaintext);
  } catch {
    throw new Error('解密失败：备份内容不是有效的 UTF-8 文本。');
  }

  try {
    return parseBackup(json);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`解密内容不是有效的完整备份：${reason}`);
  }
}
