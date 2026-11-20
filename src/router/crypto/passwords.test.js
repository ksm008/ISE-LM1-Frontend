import { describe, expect, it } from 'vitest';
import { md5, toHex } from './md5.js';
import { decodeType7, encodeType7, hashSecret, isType5Hash, md5crypt, verifySecret } from './passwords.js';

const enc = (s) => new TextEncoder().encode(s);

describe('md5', () => {
  it('RFC 1321 예시 값', () => {
    expect(toHex(md5(enc('')))).toBe('d41d8cd98f00b204e9800998ecf8427e');
    expect(toHex(md5(enc('abc')))).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(toHex(md5(enc('The quick brown fox jumps over the lazy dog')))).toBe('9e107d9d372bb6826bd81d3542a419d6');
    expect(toHex(md5(enc('a'.repeat(1000))))).toBe('cabe45dcc9ae5b66ba86600cca6b8ba8');
  });
});

describe('type 5 (MD5-crypt)', () => {
  it('openssl passwd -1 과 같은 값', () => {
    expect(md5crypt('password', 'saltsalt')).toBe('$1$saltsalt$qjXMvbEw8oaL.CzflDtaK/');
    expect(md5crypt('cisco', 'abcd')).toBe('$1$abcd$2hDGYdE0UrwK2pqoiF6BB1');
    expect(md5crypt('Str0ng!Pass', 'R1sa')).toBe('$1$R1sa$mgy54J1u8AW659lfMM1JJ.');
  });

  it('해시 확인', () => {
    const hash = hashSecret('Secret#1');
    expect(isType5Hash(hash)).toBe(true);
    expect(verifySecret('Secret#1', hash)).toBe(true);
    expect(verifySecret('secret#1', hash)).toBe(false);
  });
});

describe('type 7', () => {
  it('알려진 값 복호화', () => {
    expect(decodeType7('0822455D0A16')).toBe('cisco');
  });

  it('암호화 후 복호화', () => {
    for (let seed = 0; seed < 16; seed++) {
      expect(decodeType7(encodeType7('Pa55w0rd!', seed))).toBe('Pa55w0rd!');
    }
    expect(encodeType7('cisco', 8)).toBe('0822455D0A16');
    expect(decodeType7('zz')).toBeNull();
  });
});
