import assert from 'node:assert/strict';
import {
  buildTextTransferUrl,
  decodeTextTransferPayload,
  encodeTextTransferPayload,
  MAX_TEXT_TRANSFER_BYTES,
  parseTextTransferHash,
  textTransferByteLength,
} from '../src/lib/textTransfer.ts';

const text = '临时文本\nhello 👋';
const payload = encodeTextTransferPayload(text);
assert.equal(decodeTextTransferPayload(payload), text);
const url = new URL(buildTextTransferUrl(text, 'https://baizetop1.github.io/nav/'));
assert.equal(parseTextTransferHash(url.hash), text);
assert.equal(parseTextTransferHash('#/admin'), null);
assert.equal(textTransferByteLength('白泽'), 6);
assert.throws(() => encodeTextTransferPayload('a'.repeat(MAX_TEXT_TRANSFER_BYTES + 1)), /超过/);
assert.throws(() => decodeTextTransferPayload('v2.bad'), /不支持/);
assert.throws(() => parseTextTransferHash('#/transfer?data=v1.%'), /格式无效/);

console.log('text transfer self-check passed');
