// 명령 트리로 입력 줄을 해석한다. 같은 트리로 실행, ? 도움말, Tab 자동 완성을 모두 처리한다.
import { runnerOf } from './tree.js';

/** 공백으로 나눈 토큰과 각 토큰의 시작 위치 */
export function tokenize(line) {
  const tokens = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(line))) tokens.push({ text: m[0], start: m.index });
  return tokens;
}

const SPLIT_RE = /^([a-z][a-z-]*?)(\d\S*)$/i;

/**
 * tokens[i] 에 맞는 자식 노드를 고른다.
 * @returns {{node, value, consumed, tokens?}} | {error: 'invalid'|'ambiguous'}
 */
function pick(children, tokens, i, line) {
  const tok = tokens[i];
  const lower = tok.text.toLowerCase();
  const kws = children.filter((c) => c.kind === 'kw');

  const exact = kws.find((c) => c.word === lower);
  if (exact) return { node: exact, consumed: 1 };

  const prefix = kws.filter((c) => c.word.startsWith(lower));
  if (prefix.length === 1) return { node: prefix[0], consumed: 1 };
  if (prefix.length > 1) return { error: 'ambiguous' };

  // "g0/0" → "g" + "0/0" (인터페이스 종류 뒤에 번호가 바로 붙은 경우)
  const split = SPLIT_RE.exec(tok.text);
  if (split) {
    const head = split[1].toLowerCase();
    const cands = kws.filter((c) => c.splitDigits && c.word.startsWith(head));
    if (cands.length === 1) {
      const next = [
        ...tokens.slice(0, i),
        { text: split[1], start: tok.start },
        { text: split[2], start: tok.start + split[1].length },
        ...tokens.slice(i + 1),
      ];
      return { node: cands[0], consumed: 1, tokens: next };
    }
    if (cands.length > 1) return { error: 'ambiguous' };
  }

  for (const c of children) {
    if (c.kind !== 'arg') continue;
    if (c.type.rest) return { node: c, value: line.slice(tok.start), consumed: tokens.length - i };
    const v = c.type.match(tok.text);
    if (v !== undefined) return { node: c, value: v, consumed: 1 };
  }
  return { error: 'invalid' };
}

/**
 * 입력 줄을 트리를 따라 끝까지 읽는다.
 * @returns {{node, args, path, error?, errorToken?}}
 */
export function walk(rootChildren, line) {
  let tokens = tokenize(line);
  let children = rootChildren;
  let node = null;
  const args = {};
  const path = [];
  for (let i = 0; i < tokens.length; ) {
    const res = pick(children, tokens, i, line);
    if (res.error) {
      return { node, args, path, error: res.error, errorToken: tokens[i], tokenIndex: i };
    }
    if (res.tokens) tokens = res.tokens;
    node = res.node;
    path.push(node);
    if (node.kind === 'arg') args[node.name] = res.value;
    i += res.consumed;
    children = node.children ?? [];
  }
  return { node, args, path, tokens };
}

/** 명령 앞에 no 가 붙었는지 (no 노드는 negates: true) */
export const isNegated = (path) => path.length > 0 && path[0].negates === true;

/** 현재 위치에서 보여 줄 도움말 목록 (보이는 노드만) */
const visible = (children) => children.filter((c) => !c.hidden);

/**
 * ? 도움말
 *   "conf ?"  → 다음에 올 수 있는 항목과 설명 (+ <cr>)
 *   "con?"    → con 으로 시작하는 단어 목록
 * @returns {{kind: 'list', items: [{label, help}]} | {kind: 'words', words: []} | {kind: 'error', ...}}
 */
export function help(rootChildren, text) {
  const endsWithSpace = text.length === 0 || /\s$/.test(text);
  if (endsWithSpace) {
    const res = walk(rootChildren, text);
    if (res.error) return { kind: 'error', ...res };
    const children = res.node ? (res.node.children ?? []) : rootChildren;
    const items = visible(children).map((c) => ({ label: c.label, help: c.help }));
    if (res.node && runnerOf(res.node, isNegated(res.path))) items.push({ label: '<cr>', help: '' });
    return { kind: 'list', items };
  }

  // 마지막 단어를 입력하는 중
  const lastStart = text.search(/\S+$/);
  const before = text.slice(0, lastStart);
  const partial = text.slice(lastStart).toLowerCase();
  const res = walk(rootChildren, before);
  if (res.error) return { kind: 'error', ...res };
  const children = res.node ? (res.node.children ?? []) : rootChildren;
  const words = visible(children)
    .filter((c) => c.kind === 'kw' && c.word.startsWith(partial))
    .map((c) => c.word);
  if (words.length) return { kind: 'words', words };
  // 값 자리면 그 형식을 보여 준다
  const argsHere = visible(children).filter((c) => c.kind === 'arg');
  if (argsHere.length) return { kind: 'list', items: argsHere.map((c) => ({ label: c.label, help: c.help })) };
  return { kind: 'error', error: 'unrecognized', errorToken: { text: partial, start: lastStart } };
}

/** Tab 자동 완성. 후보가 하나면 완성한 줄을, 아니면 null */
export function complete(rootChildren, text) {
  if (text.length === 0 || /\s$/.test(text)) return null;
  const lastStart = text.search(/\S+$/);
  const before = text.slice(0, lastStart);
  const partial = text.slice(lastStart).toLowerCase();
  const res = walk(rootChildren, before);
  if (res.error) return null;
  const children = res.node ? (res.node.children ?? []) : rootChildren;
  const words = visible(children).filter((c) => c.kind === 'kw' && c.word.startsWith(partial));
  if (words.length !== 1) return null;
  return `${before}${words[0].label} `;
}
