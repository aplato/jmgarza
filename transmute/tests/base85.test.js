import test from 'node:test';
import assert from 'node:assert/strict';
import { encode, decode, hexToBase85 } from '../src/base85.js';

test('encode and decode match Z85 specification test vectors and round-trip bytes', () => {
  // RFC 32 test vector: 0x864F... = "HelloWorld"
  const helloBytes = new Uint8Array([0x86, 0x4F, 0xD2, 0x6F, 0xB5, 0x59, 0xF7, 0x5B]);
  const encoded = encode(helloBytes);
  assert.equal(encoded, 'HelloWorld');
  assert.deepEqual(decode(encoded), helloBytes);

  const zeros = new Uint8Array(8);
  assert.equal(encode(zeros), '0000000000');
  assert.deepEqual(decode('0000000000'), zeros);

  const maxBytes = new Uint8Array(8).fill(0xff);
  assert.equal(encode(maxBytes), '%nSc0%nSc0');
  assert.deepEqual(decode('%nSc0%nSc0'), maxBytes);
});

test('decode rejects invalid Z85 characters, invalid lengths, and chunk overflows', () => {
  assert.throws(() => decode('abc'), /Z85 string length must be a multiple of 5/);
  assert.throws(() => decode('Hell"World'), /Invalid Z85 character/);
  assert.throws(() => decode('%nSc1'), /Z85 value overflow/);
  assert.throws(() => decode('#####'), /Z85 value overflow/);
});

test('hexToBase85 converts 16-char hex seed into exactly 10 Z85 ASCII characters', () => {
  const s1 = hexToBase85('a9f4c2107b03e89a');
  const s2 = hexToBase85('  A9F4C2107B03E89A\n');
  assert.equal(s1, s2);
  assert.equal(s1.length, 10);
  assert.match(s1, /^[0-9a-zA-Z.:+=^!/*?&<>()\[\]{}@%$#-]{10}$/);
  assert.deepEqual(
    decode(s1),
    new Uint8Array([0xa9, 0xf4, 0xc2, 0x10, 0x7b, 0x03, 0xe8, 0x9a])
  );
});

test('hexToBase85 handles non-hex or odd-length inputs deterministically', () => {
  const nonHex = hexToBase85('seed-a');
  assert.ok(nonHex.length >= 5);
  const empty = hexToBase85('');
  assert.ok(empty.length >= 5);
});

