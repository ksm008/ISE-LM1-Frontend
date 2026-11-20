// 전역 설정 모드 Router(config)#
import { arg, kw } from '../engine/tree.js';
import { LINE, range, WORD } from '../engine/types.js';
import { createInterface, INTERFACE_TYPES, VTY_COUNT } from '../device/device.js';
import { verifySecret, encodeType7 } from '../crypto/passwords.js';
import { passwordChoices, secretChoices } from './helpers.js';

// ---- hostname ----
const HOSTNAME_RE = /^[A-Za-z]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

const hostname = kw('hostname', '장비 이름 설정', [
  arg('name', WORD, '장비 이름', [], {
    run: (ctx, a) => {
      if (!HOSTNAME_RE.test(a.name)) {
        ctx.out('% Hostname contains one or more illegal characters.');
        return;
      }
      ctx.d.hostname = a.name;
    },
  }),
], { noRun: (ctx) => { ctx.d.hostname = 'Router'; } });

// ---- enable secret / password ----
function setEnableSecret(ctx, secret, plain) {
  const d = ctx.d;
  if (plain !== null && d.enablePassword && d.enablePassword.plain === plain) {
    ctx.out(
      'The enable secret you have chosen is the same as your enable password.',
      'This is not recommended.  Re-enter the enable secret.',
    );
    return;
  }
  d.enableSecret = secret;
}

function setEnablePassword(ctx, pw) {
  const d = ctx.d;
  if (d.enableSecret && verifySecret(pw.plain, d.enableSecret.hash)) {
    ctx.out(
      'The enable password you have chosen is the same as your enable secret.',
      'This is not recommended.  Re-enter the enable password.',
    );
    return;
  }
  d.enablePassword = pw;
}

const enable = kw('enable', '특권 모드(enable) 비밀번호 설정', [
  kw('password', '특권 모드 비밀번호 (평문 또는 type 7 로 저장, 약함)', passwordChoices(setEnablePassword), {
    noRun: (ctx) => { ctx.d.enablePassword = null; },
  }),
  kw('secret', '특권 모드 secret (type 5 해시로 저장, 권장)', secretChoices(setEnableSecret), {
    noRun: (ctx) => { ctx.d.enableSecret = null; },
  }),
]);

// ---- service ----
function setPasswordEncryption(ctx) {
  const d = ctx.d;
  d.servicePasswordEncryption = !ctx.negated;
  if (ctx.negated) return; // 이미 암호화된 비밀번호는 그대로 둔다 (IOS 와 같음)
  const encrypt = (pw) => {
    if (pw && !pw.enc) pw.enc = encodeType7(pw.plain);
  };
  encrypt(d.enablePassword);
  Object.values(d.users).forEach((u) => encrypt(u.password));
  [...d.lines.con, ...d.lines.vty].forEach((l) => encrypt(l.password));
}

const toggle = (key) => (ctx) => { ctx.d.services[key] = !ctx.negated; };

const service = kw('service', '시스템 서비스 설정', [
  kw('pad', 'PAD(X.25) 서비스', [], { run: toggle('pad') }),
  kw('password-encryption', '설정 파일의 평문 비밀번호를 type 7 로 암호화', [], { run: setPasswordEncryption }),
  kw('tcp-small-servers', 'TCP 소형 서버 (echo, discard, chargen 등)', [], { run: toggle('tcpSmallServers') }),
  kw('udp-small-servers', 'UDP 소형 서버 (echo, discard, chargen)', [], { run: toggle('udpSmallServers') }),
]);

// ---- username ----
function userEntry(ctx, name, privilege) {
  const u = ctx.d.users[name] ?? { privilege: 1, secret: null, password: null };
  if (privilege !== undefined) u.privilege = privilege;
  ctx.d.users[name] = u;
  return u;
}

const userCredential = (privFromArgs) => [
  kw('password', '사용자 비밀번호 (평문 또는 type 7, 약함)', passwordChoices((ctx, pw) => {
    const u = userEntry(ctx, ctx.args.name, privFromArgs(ctx.args));
    u.password = pw;
    u.secret = null;
  })),
  kw('secret', '사용자 secret (type 5 해시, 권장)', secretChoices((ctx, secret) => {
    const u = userEntry(ctx, ctx.args.name, privFromArgs(ctx.args));
    u.secret = secret;
    u.password = null;
  })),
];

const username = kw('username', '로컬 사용자 계정 (login local 에 사용)', [
  arg('name', WORD, '사용자 이름', [
    kw('privilege', '사용자 권한 레벨', [
      arg('privilege', range(0, 15), '권한 레벨 (15: 로그인하면 바로 특권 모드)', userCredential((a) => a.privilege), {
        run: (ctx, a) => userEntry(ctx, a.name, a.privilege),
      }),
    ]),
    ...userCredential(() => undefined),
  ], {
    run: (ctx, a) => userEntry(ctx, a.name),
    noRun: (ctx, a) => { delete ctx.d.users[a.name]; },
  }),
]);

// ---- line ----
const lineCmd = kw('line', 'console / vty 라인 설정 모드로', [
  kw('console', '콘솔 라인', [
    arg('first', range(0, 0), '라인 번호', [], {
      run: (ctx) => ctx.enter('config-line', { kind: 'con', from: 0, to: 0 }),
    }),
  ]),
  kw('vty', '원격 접속(Telnet/SSH) 가상 라인', [
    arg('first', range(0, VTY_COUNT - 1), '첫 번째 라인 번호', [
      arg('last', range(0, VTY_COUNT - 1), '마지막 라인 번호', [], {
        run: (ctx, a) => {
          if (a.last < a.first) {
            ctx.out('%Invalid line range');
            return;
          }
          ctx.enter('config-line', { kind: 'vty', from: a.first, to: a.last });
        },
      }),
    ], { run: (ctx, a) => ctx.enter('config-line', { kind: 'vty', from: a.first, to: a.first }) }),
  ]),
], { noable: false });

// ---- interface ----
export function interfaceNameNodes(onSelect) {
  return INTERFACE_TYPES.map((t) =>
    kw(t.word, t.help, [
      arg('number', { label: t.label, match: (s) => (t.pattern.test(s) ? s : undefined) }, `${t.word} 번호`, [], {
        run: (ctx, a) => onSelect(ctx, `${t.word}${a.number.replace(/^0+(?=\d)/, '')}`, t),
      }),
    ], { splitDigits: true }),
  );
}

const interfaceCmd = kw('interface', '인터페이스 설정 모드로', interfaceNameNodes((ctx, name, type) => {
  if (!ctx.d.interfaces[name]) {
    if (!type.virtual) {
      ctx.out('% Invalid input detected.');
      return;
    }
    ctx.d.interfaces[name] = createInterface(name);
  }
  ctx.enter('config-if', { iface: name });
}), { noable: false });

// ---- banner ----
function setBanner(ctx, a) {
  const text = a.text;
  const delim = text[0];
  const rest = text.slice(1);
  const end = rest.indexOf(delim);
  if (end >= 0) {
    ctx.d.bannerMotd = rest.slice(0, end);
    return;
  }
  // 닫는 구분 문자가 나올 때까지 여러 줄을 받는다
  ctx.out(`Enter TEXT message.  End with the character '${delim}'.`);
  ctx.session.readBanner(delim, rest, (body) => { ctx.d.bannerMotd = body; });
}

const banner = kw('banner', '로그인 안내문(배너) 설정', [
  kw('motd', '접속할 때 보여 줄 안내문 (Message of the Day)', [
    arg('text', LINE, '구분 문자 + 안내문 + 구분 문자 (예: #무단 접근 금지#)', [], { run: setBanner }),
  ], { noRun: (ctx) => { ctx.d.bannerMotd = null; } }),
]);

// ---- ip ----
const sshCmd = kw('ssh', 'SSH 서버 설정', [
  kw('authentication-retries', '인증 재시도 횟수', [
    arg('n', range(0, 5), '횟수', [], { run: (ctx, a) => { ctx.d.ssh.retries = a.n; } }),
  ], { noRun: (ctx) => { ctx.d.ssh.retries = 3; } }),
  kw('time-out', '인증 제한 시간', [
    arg('n', range(1, 120), '초', [], { run: (ctx, a) => { ctx.d.ssh.timeout = a.n; } }),
  ], { noRun: (ctx) => { ctx.d.ssh.timeout = 120; } }),
  kw('version', 'SSH 프로토콜 버전', [
    arg('v', range(1, 2), '버전 (2 권장)', [], {
      run: (ctx, a) => {
        if (a.v === 2 && ctx.d.rsaKeyBits < 768) {
          ctx.out('Please create RSA keys to enable SSH (and of atleast 768 bits for SSH v2).');
        }
        ctx.d.ssh.version = a.v;
      },
    }),
  ], { noRun: (ctx) => { ctx.d.ssh.version = null; } }),
]);

const domainName = (ctx, a) => { ctx.d.domainName = a.name; };

const ip = kw('ip', 'IP 설정', [
  kw('bootp', 'BOOTP 서비스', [kw('server', 'BOOTP 서버', [], { run: toggle('bootp') })]),
  kw('domain', '도메인 설정', [
    kw('lookup', 'DNS 로 이름 찾기 (잘못 친 명령을 호스트 이름으로 찾는 지연 방지에 끔)', [], { run: toggle('domainLookup') }),
    kw('name', '기본 도메인 이름 (RSA 키 생성에 필요)', [arg('name', WORD, '도메인 이름', [], { run: domainName })], {
      noRun: (ctx) => { ctx.d.domainName = null; },
    }),
  ]),
  kw('domain-name', '기본 도메인 이름 (ip domain name 과 같음)', [arg('name', WORD, '도메인 이름', [], { run: domainName })], {
    noRun: (ctx) => { ctx.d.domainName = null; },
  }),
  kw('finger', 'finger 서비스 (사용자 정보 노출)', [], { run: toggle('finger') }),
  kw('http', 'HTTP 관리 서버', [
    kw('secure-server', 'HTTPS 관리 서버', [], { run: toggle('httpSecureServer') }),
    kw('server', 'HTTP(평문) 관리 서버', [], { run: toggle('httpServer') }),
  ]),
  kw('source-route', '출발지 라우팅(source route) 옵션 패킷 처리', [], { run: toggle('sourceRoute') }),
  sshCmd,
]);

// ---- crypto key ----
function generateRsa(ctx, bits) {
  const d = ctx.d;
  ctx.out(`% Generating ${bits} bit RSA keys, keys will be non-exportable...`, '[OK] (elapsed time was 1 seconds)');
  const wasEnabled = d.rsaKeyBits > 0;
  d.rsaKeyBits = bits;
  if (!wasEnabled) ctx.out('', `%SSH-5-ENABLED: SSH ${d.ssh.version === 2 ? '2.0' : '1.99'} has been enabled`);
}

function startRsa(ctx, bits) {
  const d = ctx.d;
  if (d.hostname === 'Router') {
    ctx.out('% Please define a hostname other than Router.');
    return;
  }
  if (!d.domainName) {
    ctx.out('% Please define a domain-name first.');
    return;
  }
  const keyName = `${d.hostname}.${d.domainName}`;
  const go = () => {
    if (bits) return generateRsa(ctx, bits);
    ctx.out(
      `The name for the keys will be: ${keyName}`,
      'Choose the size of the key modulus in the range of 360 to 4096 for your',
      '  General Purpose Keys. Choosing a key modulus greater than 512 may take',
      '  a few minutes.',
      '',
    );
    ctx.session.ask('How many bits in the modulus [512]: ', (answer) => {
      const n = answer === '' ? 512 : Number(answer);
      if (!Number.isInteger(n) || n < 360 || n > 4096) {
        ctx.out('% A decimal number between 360 and 4096.');
        return;
      }
      generateRsa(ctx, n);
    });
  };
  if (d.rsaKeyBits) {
    ctx.out(`% You already have RSA keys defined named ${keyName}.`);
    ctx.session.ask('% Do you really want to replace them? [yes/no]: ', (answer) => {
      if (/^y(es)?$/i.test(answer)) go();
    });
  } else {
    go();
  }
}

const crypto = kw('crypto', '암호화 설정', [
  kw('key', '키 관리', [
    kw('generate', '키 생성', [
      kw('rsa', 'RSA 키 생성 (SSH 사용에 필요)', [
        kw('modulus', '키 길이를 바로 지정', [
          arg('bits', range(360, 4096), '비트 수 (SSH v2 는 768 이상, 2048 권장)', [], {
            run: (ctx, a) => startRsa(ctx, a.bits),
          }),
        ]),
      ], { run: (ctx) => startRsa(ctx, null) }),
    ]),
    kw('zeroize', '키 삭제', [
      kw('rsa', 'RSA 키 삭제 (SSH 꺼짐)', [], {
        run: (ctx) => {
          if (!ctx.d.rsaKeyBits) {
            ctx.out('% No Signature RSA Keys found in configuration.');
            return;
          }
          ctx.out('% All RSA keys will be removed.', '% All router certs issued using these keys will also be removed.');
          ctx.session.ask('Do you really want to remove these keys? [yes/no]: ', (answer) => {
            if (!/^y(es)?$/i.test(answer)) return;
            ctx.d.rsaKeyBits = 0;
            ctx.out('%SSH-5-DISABLED: SSH 1.99 has been disabled');
          });
        },
      }),
    ]),
  ]),
], { noable: false });

// ---- security / login ----
const security = kw('security', '보안 설정', [
  kw('passwords', '비밀번호 정책', [
    kw('min-length', '비밀번호 최소 길이', [
      arg('n', range(0, 16), '최소 길이 (0: 제한 없음)', [], { run: (ctx, a) => { ctx.d.minPasswordLength = a.n; } }),
    ], { noRun: (ctx) => { ctx.d.minPasswordLength = 0; } }),
  ]),
]);

const login = kw('login', '로그인 보안 설정', [
  kw('block-for', '로그인 실패가 반복되면 일정 시간 로그인 차단', [
    arg('blockFor', range(1, 65535), '차단 시간 (초)', [
      kw('attempts', '실패 횟수', [
        arg('attempts', range(1, 65535), '실패 횟수', [
          kw('within', '실패를 세는 시간', [
            arg('within', range(1, 65535), '초', [], {
              run: (ctx, a) => { ctx.d.loginBlock = { blockFor: a.blockFor, attempts: a.attempts, within: a.within }; },
            }),
          ]),
        ]),
      ]),
    ]),
  ], { noRun: (ctx) => { ctx.d.loginBlock = null; } }),
]);

const cdp = kw('cdp', 'CDP (이웃 장비 정보 교환) 설정', [
  kw('run', 'CDP 전체 사용 (장비 정보 노출, 외부 접점에서는 끔)', [], { run: toggle('cdp') }),
]);

export function globalConfigTree() {
  return [banner, cdp, crypto, enable, hostname, interfaceCmd, ip, lineCmd, login, security, service, username];
}
