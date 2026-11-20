// 라우터 비밀번호 표시 형식
//   type 5: MD5-crypt 해시 ($1$salt$hash). enable secret, username secret. 되돌릴 수 없다.
//   type 7: service password-encryption 이 쓰는 단순 XOR 암호화. 쉽게 복호화된다(보안상 약함).
import { md5 } from './md5.js';

const encoder = new TextEncoder();
const ITOA64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const concat = (...parts) => {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
};

/** MD5-crypt (FreeBSD $1$ 형식) */
export function md5crypt(password, salt) {
  const pw = encoder.encode(password);
  const s = encoder.encode(salt.slice(0, 8));
  const magic = encoder.encode('$1$');

  let final = md5(concat(pw, s, pw));
  const parts = [pw, magic, s];
  for (let left = pw.length; left > 0; left -= 16) parts.push(final.slice(0, Math.min(16, left)));
  for (let i = pw.length; i; i >>= 1) parts.push(i & 1 ? new Uint8Array(1) : pw.slice(0, 1));
  final = md5(concat(...parts));

  for (let i = 0; i < 1000; i++) {
    const round = [];
    round.push(i & 1 ? pw : final);
    if (i % 3) round.push(s);
    if (i % 7) round.push(pw);
    round.push(i & 1 ? final : pw);
    final = md5(concat(...round));
  }

  let out = '';
  const to64 = (v, n) => {
    for (let k = 0; k < n; k++) {
      out += ITOA64[v & 0x3f];
      v >>= 6;
    }
  };
  const f = final;
  to64((f[0] << 16) | (f[6] << 8) | f[12], 4);
  to64((f[1] << 16) | (f[7] << 8) | f[13], 4);
  to64((f[2] << 16) | (f[8] << 8) | f[14], 4);
  to64((f[3] << 16) | (f[9] << 8) | f[15], 4);
  to64((f[4] << 16) | (f[10] << 8) | f[5], 4);
  to64(f[11], 2);
  return `$1$${salt.slice(0, 8)}$${out}`;
}

export function randomSalt(length = 4) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ITOA64[b & 0x3f]).join('');
}

/** type 5 해시를 만든다 */
export const hashSecret = (password, salt = randomSalt()) => md5crypt(password, salt);

/** 입력한 비밀번호가 type 5 해시와 맞는지 */
export function verifySecret(password, hash) {
  const m = /^\$1\$([^$]{0,8})\$/.exec(hash ?? '');
  return Boolean(m) && md5crypt(password, m[1]) === hash;
}

export const isType5Hash = (value) => /^\$1\$[./0-9A-Za-z]{0,8}\$[./0-9A-Za-z]{22}$/.test(value);

// ---- type 7 ----
const XLAT = 'dsfd;kfoA,.iyewrkldJKDHSUBsgvca69834ncxv9873254k;fg87';

export function encodeType7(plain, seed = Math.floor(Math.random() * 16)) {
  let out = String(seed).padStart(2, '0');
  for (let i = 0; i < plain.length; i++) {
    const v = plain.charCodeAt(i) ^ XLAT.charCodeAt((seed + i) % XLAT.length);
    out += v.toString(16).toUpperCase().padStart(2, '0');
  }
  return out;
}

/** type 7 문자열을 복호화한다. 형식이 틀리면 null */
export function decodeType7(encoded) {
  if (!/^\d{2}([0-9A-Fa-f]{2})*$/.test(encoded)) return null;
  const seed = parseInt(encoded.slice(0, 2), 10);
  if (seed > 15) return null;
  let out = '';
  for (let i = 2, k = 0; i < encoded.length; i += 2, k++) {
    out += String.fromCharCode(parseInt(encoded.slice(i, i + 2), 16) ^ XLAT.charCodeAt((seed + k) % XLAT.length));
  }
  return out;
}
