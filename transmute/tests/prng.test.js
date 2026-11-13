import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCryptoSeed, createPrng } from '../src/prng.js';
import { DEFAULT_CONFIG, ALCHEMICAL_SYMBOLS, cloneConfig, formatConfigSnippet } from '../src/config.js';

test('generateCryptoSeed returns distinct 16-char lowercase hex strings', () => {
  const s1 = generateCryptoSeed();
  const s2 = generateCryptoSeed();
  assert.match(s1, /^[0-9a-f]{16}$/);
  assert.match(s2, /^[0-9a-f]{16}$/);
  assert.notEqual(s1, s2);
});

test('createPrng is deterministic and case-insensitive for hex seeds', () => {
  const p1 = createPrng('a9f4c2107b03e89a');
  const p2 = createPrng('A9F4C2107B03E89A');
  const seq1 = Array.from({ length: 10 }, () => p1.next());
  const seq2 = Array.from({ length: 10 }, () => p2.next());
  assert.deepEqual(seq1, seq2);
  assert.ok(seq1.every((n) => Number.isFinite(n) && n >= 0 && n < 1));
});

test('createPrng.weighted handles normal weights and all-zero fallback', () => {
  const prng = createPrng('0123456789abcdef');
  assert.equal(prng.weighted({ only: 10, never: 0 }), 'only');
  assert.equal(prng.weighted({ first: 0, second: 0 }), 'first');
});

test('DEFAULT_CONFIG and formatConfigSnippet round-trip valid config and U+1F700 symbols', () => {
  assert.ok(ALCHEMICAL_SYMBOLS.length >= 24);
  assert.ok(ALCHEMICAL_SYMBOLS.every((s) => s.codePointAt(0) >= 0x1f700 && s.codePointAt(0) <= 0x1f77f));
  const copy = cloneConfig(DEFAULT_CONFIG);
  copy.subcircles.spawnProbability = 0.88;
  const snippet = formatConfigSnippet(copy);
  assert.match(snippet, /^export const DEFAULT_CONFIG = \{[\s\S]+\};\n?$/);
  assert.match(snippet, /"spawnProbability": 0\.88/);
});

