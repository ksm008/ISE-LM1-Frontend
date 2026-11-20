// 명령 트리 노드
//
//   kw(word, help, children, opts)       고정 단어. 앞부분만 입력해도 된다 (예: "conf" → configure)
//   arg(name, type, help, children, opts) 값. type 은 types.js 의 형식 (WORD, <1-99>, A.B.C.D, LINE ...)
//
// opts
//   run(ctx, args)    여기서 명령이 끝날 수 있으면 실행할 함수 (ctx.negated: 앞에 no 가 붙었는지)
//   noRun(ctx, args)  no 를 붙였을 때만 여기서 끝날 수 있으면 실행할 함수 (예: "no enable secret")
//   noable: false     no 를 붙일 수 없는 명령 (no 트리에서 빠진다)
//   hidden: true      도움말(?)·자동 완성에 보이지 않음
//   splitDigits: true "g0/0" 처럼 단어 뒤에 숫자가 바로 붙어도 나눠서 읽는다 (인터페이스 종류)

export function kw(word, help, children = [], opts = {}) {
  return { kind: 'kw', word: word.toLowerCase(), label: word, help, children, ...opts };
}

export function arg(name, type, help, children = [], opts = {}) {
  return { kind: 'arg', name, type, label: type.label, help, children, ...opts };
}

/** 실행할 함수 (없으면 여기서 끝낼 수 없음 → % Incomplete command.) */
export function runnerOf(node, negated) {
  if (!node) return null;
  return negated ? (node.noRun ?? node.run ?? null) : (node.run ?? null);
}
