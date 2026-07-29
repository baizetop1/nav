import assert from 'node:assert/strict';
import { createBackup } from '../src/lib/backup.ts';
import {
  decryptBackup,
  encryptBackup,
  ENCRYPTED_BACKUP_FORMAT,
  ENCRYPTED_BACKUP_ITERATIONS,
} from '../src/services/encryptedBackup.ts';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const navigation = {
  sites: [{
    id: 'secret-site',
    name: 'Private dashboard',
    description: 'must not appear in ciphertext',
    url: 'https://private.example.com',
    categoryId: 'private',
    tags: ['personal'],
  }],
  categories: [{ id: 'private', name: 'Private', order: 1 }],
  layout: [{ siteId: 'secret-site', order: 1, size: 'normal' }],
};
const storage = new MemoryStorage();
storage.setItem('nav_temp_text', 'encrypted temporary text');
storage.setItem('theme', 'dark');
const backup = createBackup(navigation, storage);
const password = 'correct horse battery staple';

const first = await encryptBackup(backup, password);
assert.equal(first.format, ENCRYPTED_BACKUP_FORMAT);
assert.equal(first.iterations, ENCRYPTED_BACKUP_ITERATIONS);
assert.deepEqual(Object.keys(first).sort(), [
  'algorithm',
  'ciphertext',
  'encryptedAt',
  'format',
  'iterations',
  'iv',
  'kdf',
  'salt',
  'version',
]);
const serialized = JSON.stringify(first);
assert.equal(serialized.includes('private.example.com'), false);
assert.equal(serialized.includes('encrypted temporary text'), false);

const restored = await decryptBackup(serialized, password);
assert.deepEqual(restored, backup);

const second = await encryptBackup(JSON.stringify(backup), password);
assert.notEqual(second.salt, first.salt);
assert.notEqual(second.iv, first.iv);
assert.notEqual(second.ciphertext, first.ciphertext);

await assert.rejects(() => encryptBackup(backup, 'too short'), /12/);
await assert.rejects(() => decryptBackup(first, 'short'), /12/);
await assert.rejects(() => decryptBackup(first, 'a-valid-but-wrong-password'), /密码错误|已损坏/);

const tampered = structuredClone(first);
const ciphertext = Buffer.from(tampered.ciphertext, 'base64');
ciphertext[0] ^= 1;
tampered.ciphertext = ciphertext.toString('base64');
await assert.rejects(() => decryptBackup(tampered, password), /密码错误|已损坏/);

const unexpectedField = { ...first, plaintext: backup };
await assert.rejects(() => decryptBackup(unexpectedField, password), /unsupported field/);

const invalidBackup = structuredClone(backup);
invalidBackup.version = 99;
await assert.rejects(() => encryptBackup(invalidBackup, password), /unsupported version/);

console.log('encrypted backup self-check passed');
