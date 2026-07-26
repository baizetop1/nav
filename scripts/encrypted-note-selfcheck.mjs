import assert from 'node:assert/strict';
import { decryptNote, encryptNote } from '../src/services/encryptedNote.ts';

const original = '白泽临时文本\nsecret';
const encrypted = await encryptNote(original, 'correct horse battery staple');
assert.equal(await decryptNote(encrypted, 'correct horse battery staple'), original);
await assert.rejects(() => decryptNote(encrypted, 'wrong password'));
console.log('encrypted note self-check passed');
