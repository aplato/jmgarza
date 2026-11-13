/**
 * Cryptographically-seeded deterministic PRNG utilities (cyrb128 + sfc32).
 */

/**
 * Generates a 16-character lowercase hex seed from the browser/Node CSPRNG.
 * @returns {string}
 */
export function generateCryptoSeed() {
  const buf = new Uint32Array(2);
  globalThis.crypto.getRandomValues(buf);
  return (
    buf[0].toString(16).padStart(8, '0') +
    buf[1].toString(16).padStart(8, '0')
  ).toLowerCase();
}

/**
 * Hashes an arbitrary seed string into four 32-bit unsigned integers (cyrb128).
 * @param {string} str
 * @returns {[number, number, number, number]}
 */
function cyrb128(str) {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [
    (h1 ^ h2 ^ h3 ^ h4) >>> 0,
    (h2 ^ h1) >>> 0,
    (h3 ^ h1) >>> 0,
    (h4 ^ h1) >>> 0,
  ];
}

/**
 * Creates a deterministic sfc32 PRNG instance from any seed string.
 * @param {string} seed
 */
export function createPrng(seed) {
  const normalized = String(seed ?? '0').trim().toLowerCase() || '0';
  let [a, b, c, d] = cyrb128(normalized);

  function next() {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  // Warm up 12 rounds to diffuse initial state
  for (let i = 0; i < 12; i++) {
    next();
  }

  function range(min, max) {
    return min + next() * (max - min);
  }

  function int(min, max) {
    const lo = Math.ceil(Math.min(min, max));
    const hi = Math.floor(Math.max(min, max));
    return Math.floor(next() * (hi - lo + 1)) + lo;
  }

  function chance(prob) {
    return next() < Number(prob);
  }

  /**
   * Selects a key from `weightMap` proportional to its positive numeric weight.
   * Falls back deterministically to the first key if all weights are <= 0.
   * @param {Record<string, number>} weightMap
   * @returns {string}
   */
  function weighted(weightMap) {
    const entries = Object.entries(weightMap ?? {});
    if (entries.length === 0) {
      return '';
    }
    let total = 0;
    const sanitized = entries.map(([key, rawWeight]) => {
      const w = Math.max(0, Number(rawWeight) || 0);
      total += w;
      return [key, w];
    });

    if (total <= 0) {
      return sanitized[0][0];
    }

    let threshold = next() * total;
    for (const [key, w] of sanitized) {
      if (w <= 0) continue;
      if (threshold < w) {
        return key;
      }
      threshold -= w;
    }
    return sanitized[sanitized.length - 1][0];
  }

  function pick(arr) {
    if (!arr || arr.length === 0) return undefined;
    return arr[Math.floor(next() * arr.length)];
  }

  return {
    next,
    range,
    int,
    chance,
    weighted,
    pick,
  };
}

