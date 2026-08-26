import assert from 'node:assert/strict';
import { decryptNote, encryptNote } from '../src/services/encryptedNote.ts';
import { getWebCryptoUnavailableReason, requireWebCrypto } from '../src/services/webCrypto.ts';

const original = '白泽临时文本\nsecret';
const encrypted = await encryptNote(original, 'correct horse battery staple');
assert.equal(await decryptNote(encrypted, 'correct horse battery staple'), original);
await assert.rejects(() => decryptNote(encrypted, 'wrong password'));
assert.match(getWebCryptoUnavailableReason({ crypto: undefined, isSecureContext: false, protocol: 'http:' }), /HTTPS/);
assert.match(getWebCryptoUnavailableReason({ crypto: undefined, isSecureContext: true, protocol: 'https:' }), /无法使用 Web Crypto/);
assert.throws(() => requireWebCrypto({ crypto: undefined, isSecureContext: false, protocol: 'http:' }), /HTTPS/);
const supportedCrypto = {
  getRandomValues() {},
  subtle: { importKey() {}, deriveKey() {}, encrypt() {}, decrypt() {} },
};
assert.equal(getWebCryptoUnavailableReason({ crypto: supportedCrypto, isSecureContext: true, protocol: 'https:' }), null);
console.log('encrypted note self-check passed');
