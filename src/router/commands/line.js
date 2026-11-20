// 라인 설정 모드 Router(config-line)#  (console 0 / vty N M)
import { arg, kw } from '../engine/tree.js';
import { range } from '../engine/types.js';
import { passwordChoices } from './helpers.js';

/** 선택한 라인들 */
function lines(ctx) {
  const { kind, from, to } = ctx.sub;
  return ctx.d.lines[kind].slice(from, to + 1);
}

const each = (ctx, fn) => lines(ctx).forEach(fn);
const lineNumber = (sub) => (sub.kind === 'con' ? 0 : sub.from + 2);

function setLogin(ctx, mode) {
  each(ctx, (l) => { l.login = ctx.negated ? 'none' : mode; });
  if (!ctx.negated && mode === 'login' && lines(ctx).some((l) => !l.password)) {
    ctx.out(`% Login disabled on line ${lineNumber(ctx.sub)}, until 'password' is set`);
  }
}

const setTransport = (value) => (ctx) => {
  if (ctx.sub.kind !== 'vty') return; // 콘솔에는 의미 없음
  each(ctx, (l) => { l.transport = ctx.negated ? 'all' : value; });
};

export function lineTree() {
  return [
    kw('access-class', '이 라인으로 접속할 수 있는 출발지 제한 (ACL, 2단계에서 동작)', [
      arg('acl', range(1, 199), '접근 목록 번호', [
        kw('in', '들어오는 접속에 적용', [], {
          run: (ctx, a) => each(ctx, (l) => { l.accessClassIn = ctx.negated ? null : a.acl; }),
        }),
      ]),
    ]),
    kw('exec-timeout', '입력이 없을 때 자동 로그아웃 시간', [
      arg('min', range(0, 35791), '분 (0 0: 자동 로그아웃 안 함, 권장하지 않음)', [
        arg('sec', range(0, 2147483), '초', [], { run: (ctx, a) => each(ctx, (l) => { l.execTimeout = [a.min, a.sec]; }) }),
      ], { run: (ctx, a) => each(ctx, (l) => { l.execTimeout = [a.min, 0]; }) }),
    ], { noRun: (ctx) => each(ctx, (l) => { l.execTimeout = [10, 0]; }) }),
    kw('logging', '로그 출력', [
      kw('synchronous', '로그 메시지가 입력 중인 줄을 끊지 않게 함', [], {
        run: (ctx) => each(ctx, (l) => { l.loggingSync = !ctx.negated; }),
      }),
    ]),
    kw('login', '이 라인에 로그인 요구 (password)', [
      kw('local', '로컬 사용자 계정(username)으로 로그인', [], { run: (ctx) => setLogin(ctx, 'local') }),
    ], { run: (ctx) => setLogin(ctx, 'login') }),
    kw('password', '라인 비밀번호 (login 과 함께 사용)', passwordChoices((ctx, pw) => each(ctx, (l) => { l.password = { ...pw }; })), {
      noRun: (ctx) => each(ctx, (l) => { l.password = null; }),
    }),
    kw('transport', '허용할 접속 프로토콜', [
      kw('input', '들어오는 접속', [
        kw('all', '모든 프로토콜', [], { run: setTransport('all') }),
        kw('none', '원격 접속 차단', [], { run: setTransport('none') }),
        kw('ssh', 'SSH 만 (권장)', [kw('telnet', 'Telnet 도', [], { run: setTransport('telnet ssh') })], { run: setTransport('ssh') }),
        kw('telnet', 'Telnet (평문 전송, 권장하지 않음)', [kw('ssh', 'SSH 도', [], { run: setTransport('telnet ssh') })], {
          run: setTransport('telnet'),
        }),
      ], { noRun: setTransport('all') }),
    ]),
  ];
}
