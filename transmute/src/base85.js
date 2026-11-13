/**
 * Z85 (ZeroMQ Base-85) encoding and decoding implementation (RFC 32).
 * Maps 4 bytes to 5 ASCII characters drawn from an 85-character alphabet
 * without quotes or backslashes.
 */

const Z85_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#';

const Z85_DECODE_MAP = new Uint8Array(256);
Z85_DECODE_MAP.fill(0xff);
for (let i = 0; i < Z85_CHARS.length; i++) {
  Z85_DECODE_MAP[Z85_CHARS.charCodeAt(i)] = i;
}

const POWERS = [52200625, 614125, 7225, 85, 1];

/**
 * Encodes a `Uint8Array` into a Z85 string.
 * Uneven buffers are padded with trailing 0 bytes to a multiple of 4.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function encode(bytes) {
  const remainder = bytes.length % 4;
  const padding = remainder === 0 ? 0 : 4 - remainder;
  const buf = padding === 0 ? bytes : new Uint8Array(bytes.length + padding);
  if (padding > 0) {
    buf.set(bytes);
  }

  let str = '';
  for (let i = 0; i < buf.length; i += 4) {
    let value =
      ((buf[i] << 24) >>> 0) +
      (buf[i + 1] << 16) +
      (buf[i + 2] << 8) +
      buf[i + 3];

    for (let p = 0; p < 5; p++) {
      str += Z85_CHARS[Math.floor(value / POWERS[p]) % 85];
    }
  }

  return str;
}

/**
 * Decodes a Z85 string back into a `Uint8Array`.
 * @param {string} str
 * @returns {Uint8Array}
 */
export function decode(str) {
  if (str.length % 5 !== 0) {
    throw new Error('Z85 string length must be a multiple of 5');
  }

  const byteLength = (str.length / 5) * 4;
  const out = new Uint8Array(byteLength);
  let outIdx = 0;

  for (let i = 0; i < str.length; i += 5) {
    let value = 0;
    for (let j = 0; j < 5; j++) {
      const code = str.charCodeAt(i + j);
      const val = code < 256 ? Z85_DECODE_MAP[code] : 0xff;
      if (val === 0xff) {
        throw new Error(`Invalid Z85 character: ${str[i + j]}`);
      }
      value += val * POWERS[j];
    }

    if (value > 0xffffffff) {
      throw new Error(`Z85 value overflow: ${str.slice(i, i + 5)}`);
    }

    out[outIdx++] = (value >>> 24) & 0xff;
    out[outIdx++] = (value >>> 16) & 0xff;
    out[outIdx++] = (value >>> 8) & 0xff;
    out[outIdx++] = value & 0xff;
  }

  return out;
}

const utf8Encoder = new TextEncoder();

/**
 * Formats a hex seed string (e.g. 16-char lowercase hex -> 8 bytes -> 10 Z85 ASCII characters)
 * for `.seed-badge`. Falls back deterministically to UTF-8 byte encoding if a non-hex or
 * odd-length seed string is provided.
 * @param {string} seed
 * @returns {string}
 */
export function hexToBase85(seed) {
  const normalized = String(seed ?? '0').trim().toLowerCase() || '0';
  if (normalized.length % 2 === 0 && /^[0-9a-f]+$/.test(normalized)) {
    const bytes = new Uint8Array(normalized.length / 2);
    for (let i = 0; i < normalized.length; i += 2) {
      bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
    }
    return encode(bytes);
  }
  return encode(utf8Encoder.encode(normalized));
}

