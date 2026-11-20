// 표시 필터 (Wireshark 표시 필터 문법의 일부)
//
//   tcp                          프로토콜/필드가 있는 패킷
//   ip.addr == 10.0.0.1          값 비교 (==, !=, >, <, >=, <=, eq, ne, gt, lt, ge, le)
//   ip.src == 192.168.0.0/16     IPv4 CIDR
//   http.host contains "naver"   부분 문자열
//   tcp.port in {80 443}         여러 값 중 하나
//   tcp && !(tcp.port == 22)     &&, ||, !, and, or, not, 괄호
//
// 여러 값이 있는 필드(ip.addr 등)는 Wireshark 처럼 "하나라도 같으면" == 이 참이고, != 는 !(==) 이다.

import { KNOWN_FIELDS } from './dissect.js';

const KNOWN = new Set(KNOWN_FIELDS);
const COMPARE_WORDS = { eq: '==', ne: '!=', gt: '>', lt: '<', ge: '>=', le: '<=' };

function tokenize(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const two = text.slice(i, i + 2);
    if (['==', '!=', '>=', '<=', '&&', '||'].includes(two)) {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }
    if ('!<>(){}'.includes(c)) {
      tokens.push({ type: 'op', value: c });
      i++;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let value = '';
      while (j < text.length && text[j] !== '"') {
        if (text[j] === '\\' && j + 1 < text.length) j++;
        value += text[j];
        j++;
      }
      if (j >= text.length) throw new Error('따옴표가 닫히지 않았습니다.');
      tokens.push({ type: 'string', value });
      i = j + 1;
      continue;
    }
    const m = /^[A-Za-z0-9_.:/-]+/.exec(text.slice(i));
    if (!m) throw new Error(`"${c}" 를 해석할 수 없습니다.`);
    tokens.push({ type: 'word', value: m[0] });
    i += m[0].length;
  }
  return tokens;
}

function parseNumber(value) {
  if (/^0x[0-9a-f]+$/i.test(value)) return parseInt(value, 16);
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return null;
}

function ipv4ToInt(text) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((p) => p > 255)) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/** 필드 값 v 와 필터 값 expected 를 비교한다 */
function compare(v, op, expected) {
  if (typeof v === 'boolean') v = v ? 1 : 0;

  if (op === 'contains') return String(v).toLowerCase().includes(expected.toLowerCase());

  if (typeof v === 'number') {
    const n = parseNumber(expected);
    if (n === null) return false;
    switch (op) {
      case '==': return v === n;
      case '>': return v > n;
      case '<': return v < n;
      case '>=': return v >= n;
      case '<=': return v <= n;
      default: return false;
    }
  }

  const s = String(v);
  if (op === '==') {
    const cidr = /^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/.exec(expected);
    if (cidr) {
      const addr = ipv4ToInt(s);
      const net = ipv4ToInt(cidr[1]);
      const prefix = Number(cidr[2]);
      if (addr === null || net === null || prefix > 32) return false;
      const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
      return ((addr & mask) >>> 0) === ((net & mask) >>> 0);
    }
    return s.toLowerCase() === expected.toLowerCase();
  }
  // 문자열 크기 비교는 사전 순
  const cmp = s.localeCompare(expected);
  switch (op) {
    case '>': return cmp > 0;
    case '<': return cmp < 0;
    case '>=': return cmp >= 0;
    case '<=': return cmp <= 0;
    default: return false;
  }
}

function parse(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (t, ...values) => t && (t.type === 'op' || t.type === 'word') && values.includes(t.value);

  function parseOr() {
    let left = parseAnd();
    while (isOp(peek(), '||', 'or')) {
      pos++;
      const right = parseAnd();
      const l = left;
      left = (f) => l(f) || right(f);
    }
    return left;
  }

  function parseAnd() {
    let left = parseNot();
    while (isOp(peek(), '&&', 'and')) {
      pos++;
      const right = parseNot();
      const l = left;
      left = (f) => l(f) && right(f);
    }
    return left;
  }

  function parseNot() {
    if (isOp(peek(), '!', 'not')) {
      pos++;
      const inner = parseNot();
      return (f) => !inner(f);
    }
    return parsePrimary();
  }

  function readValue() {
    const t = tokens[pos++];
    if (!t || (t.type !== 'word' && t.type !== 'string')) throw new Error('비교할 값이 필요합니다.');
    return t.value;
  }

  function parsePrimary() {
    const t = tokens[pos++];
    if (!t) throw new Error('식이 끝나지 않았습니다.');
    if (t.type === 'op' && t.value === '(') {
      const inner = parseOr();
      if (!isOp(tokens[pos++], ')')) throw new Error('괄호가 닫히지 않았습니다.');
      return inner;
    }
    if (t.type !== 'word') throw new Error(`"${t.value}" 위치가 올바르지 않습니다.`);
    const field = t.value.toLowerCase();
    if (!KNOWN.has(field)) throw new Error(`"${t.value}" 는 알 수 없는 필드입니다.`);

    let op = peek();
    if (op && (op.type === 'op' || op.type === 'word')) {
      const value = COMPARE_WORDS[op.value] ?? op.value;
      if (['==', '!=', '>', '<', '>=', '<=', 'contains'].includes(value)) {
        pos++;
        const expected = readValue();
        if (value === '!=') return (f) => !(f.get(field) ?? []).some((v) => compare(v, '==', expected));
        return (f) => (f.get(field) ?? []).some((v) => compare(v, value, expected));
      }
      if (value === 'in') {
        pos++;
        if (!isOp(tokens[pos++], '{')) throw new Error('in 뒤에는 { 값 ... } 이 와야 합니다.');
        const list = [];
        while (pos < tokens.length && !isOp(peek(), '}')) list.push(readValue());
        if (!isOp(tokens[pos++], '}')) throw new Error('} 가 없습니다.');
        return (f) => (f.get(field) ?? []).some((v) => list.some((e) => compare(v, '==', e)));
      }
    }
    return (f) => f.has(field);
  }

  const fn = parseOr();
  if (pos < tokens.length) throw new Error(`"${tokens[pos].value}" 근처의 식이 올바르지 않습니다.`);
  return fn;
}

/**
 * 표시 필터를 컴파일한다.
 * @returns {{ ok: true, test: (fields: Map) => boolean } | { ok: false, error: string }}
 */
export function compileFilter(text) {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true, test: null };
  try {
    return { ok: true, test: parse(tokenize(trimmed)) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export const FILTER_EXAMPLES = [
  { filter: 'icmp', label: 'ping (ICMP)' },
  { filter: 'dns', label: 'DNS 질의/응답' },
  { filter: 'http', label: 'HTTP' },
  { filter: 'tls.handshake.type == 1', label: 'TLS Client Hello (SNI 확인)' },
  { filter: 'tcp.flags.syn == 1 && tcp.flags.ack == 0', label: 'TCP 연결 시도 (SYN 스캔 확인)' },
  { filter: 'tcp.flags.reset == 1', label: 'TCP RST (닫힌 포트 응답)' },
  { filter: 'arp', label: 'ARP' },
  { filter: 'tcp.port in {80 443}', label: '웹 포트 (80, 443)' },
  { filter: '!(tcp.port == 22) && !arp', label: 'SSH·ARP 제외' },
];
