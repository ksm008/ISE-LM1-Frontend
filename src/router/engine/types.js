// 명령 값 형식. match(text) 는 맞으면 값을, 아니면 undefined 를 돌려준다.
// rest: true 는 그 위치부터 줄 끝까지를 하나의 값으로 받는다 (LINE).

export const WORD = { label: 'WORD', match: (t) => t };

export const LINE = { label: 'LINE', rest: true };

export function range(min, max) {
  return {
    label: `<${min}-${max}>`,
    match: (t) => {
      if (!/^\d+$/.test(t)) return undefined;
      const n = Number(t);
      return n >= min && n <= max ? n : undefined;
    },
  };
}

export function parseIpv4(text) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((p) => p > 255)) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

export const formatIpv4 = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');

export const IPV4 = { label: 'A.B.C.D', match: (t) => (parseIpv4(t) === null ? undefined : t) };

/** 고정 값 목록 중 하나 (예: 0 | 5 | 7 같은 비밀번호 형식은 kw 로 처리하므로 거의 안 씀) */
export function oneOf(label, values) {
  return { label, match: (t) => (values.includes(t) ? t : undefined) };
}
