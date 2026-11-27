// EXEC 모드 명령 (사용자 모드 Router> / 특권 모드 Router#)
import { kw } from '../engine/tree.js';
import { interfaceOrder, interfaceStatus } from '../device/device.js';
import { runningConfigText } from '../device/runningConfig.js';

const pad = (s, n) => String(s).padEnd(n);

function showIpInterfaceBrief(ctx) {
  const d = ctx.d;
  const rows = [
    `${pad('Interface', 23)}${pad('IP-Address', 16)}OK? Method ${pad('Status', 22)}Protocol`,
  ];
  for (const name of interfaceOrder(Object.keys(d.interfaces))) {
    const i = d.interfaces[name];
    const st = interfaceStatus(name, i);
    rows.push(
      `${pad(name, 23)}${pad(i.ip ?? 'unassigned', 16)}YES ${pad(i.ip ? 'manual' : 'unset', 7)}${pad(st.status, 22)}${st.protocol}`,
    );
  }
  ctx.out(...rows);
}

function showVersion(ctx) {
  const s = ctx.session;
  const up = Math.floor((Date.now() - s.bootedAt) / 60000);
  ctx.out(
    '일단고 라우터 시뮬레이터 (IOS 스타일 명령 학습용), Version 15.4',
    '',
    `${ctx.d.hostname} uptime is ${up} minute${up === 1 ? '' : 's'}`,
    'System image file is "simulator:router-15.4"',
    '',
    `${Object.keys(ctx.d.interfaces).filter((n) => n.startsWith('GigabitEthernet')).length} Gigabit Ethernet interfaces`,
    `${Object.keys(ctx.d.interfaces).filter((n) => n.startsWith('Serial')).length} Serial interfaces`,
    '',
    'Configuration register is 0x2102',
  );
}

function showIpSsh(ctx) {
  const d = ctx.d;
  const enabled = d.rsaKeyBits > 0;
  const ver = d.ssh.version === 2 ? '2.0' : d.ssh.version === 1 ? '1.5' : '1.99';
  ctx.out(`SSH ${enabled ? 'Enabled' : 'Disabled'} - version ${ver}`);
  if (!enabled) ctx.out('%Please create RSA keys to enable SSH (and of atleast 768 bits for SSH v2).');
  ctx.out(`Authentication timeout: ${d.ssh.timeout} secs; Authentication retries: ${d.ssh.retries}`);
}

function showRsaKey(ctx) {
  const d = ctx.d;
  if (!d.rsaKeyBits) return;
  ctx.out(
    `% Key pair was generated at: (simulated)`,
    `Key name: ${d.hostname}.${d.domainName}`,
    `Key type: RSA KEYS ${d.rsaKeyBits} bits`,
    ' Storage Device: not specified',
    ' Usage: General Purpose Key',
    ' Key is not exportable.',
  );
}

function showUsers(ctx) {
  ctx.out(
    '    Line       User       Host(s)              Idle       Location',
    `*  0 con 0     ${pad(ctx.session.loginUser ?? '', 10)} idle                 00:00:00`,
    '',
    '  Interface    User               Mode         Idle     Peer Address',
  );
}

function showClock(ctx) {
  const now = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const p = (n, w = 2) => String(n).padStart(w, '0');
  ctx.out(
    `*${p(now.getUTCHours())}:${p(now.getUTCMinutes())}:${p(now.getUTCSeconds())}.${p(now.getUTCMilliseconds(), 3)} UTC ` +
      `${days[now.getUTCDay()]} ${months[now.getUTCMonth()]} ${now.getUTCDate()} ${now.getUTCFullYear()}`,
  );
}

const showHistory = (ctx) => ctx.out(...ctx.session.history.map((h) => `  ${h}`));
const showPrivilege = (ctx) => ctx.out(`Current privilege level is ${ctx.session.mode === 'user' ? 1 : 15}`);

function showCommon() {
  return [
    kw('clock', '시스템 시계', [], { run: showClock }),
    kw('history', '이번 세션에서 입력한 명령 목록', [], { run: showHistory }),
    kw('ip', 'IP 정보', [
      kw('interface', '인터페이스 IP 상태', [kw('brief', '인터페이스별 IP·상태 요약', [], { run: showIpInterfaceBrief })]),
    ]),
    kw('privilege', '현재 권한 레벨', [], { run: showPrivilege }),
    kw('users', '접속한 사용자', [], { run: showUsers }),
    kw('version', '시스템 정보', [], { run: showVersion }),
  ];
}

function showPrivileged() {
  return [
    ...showCommon().map((n) =>
      n.word === 'ip'
        ? {
            ...n,
            children: [
              ...n.children,
              kw('ssh', 'SSH 서버 설정과 상태', [], { run: showIpSsh }),
            ],
          }
        : n,
    ),
    kw('crypto', '암호화 설정', [
      kw('key', '키 정보', [
        kw('mypubkey', '이 장비의 공개 키', [kw('rsa', 'RSA 공개 키', [], { run: showRsaKey })]),
      ]),
    ]),
    kw('running-config', '현재 동작 중인 설정', [], { run: (ctx) => ctx.out(runningConfigText(ctx.d)) }),
    kw('startup-config', '저장된(부팅 시 읽는) 설정', [], {
      run: (ctx) => {
        const startup = ctx.session.startup;
        if (!startup) ctx.out('startup-config is not present');
        else ctx.out(runningConfigText(startup, 'Using').replace('Building configuration...\n\n', ''));
      },
    }),
  ];
}

// ---- 사용자 모드 ----
export function userExecTree() {
  return [
    kw('enable', '특권 모드로 전환', [], { run: (ctx) => ctx.session.requestEnable() }),
    kw('exit', '접속 종료', [], { run: (ctx) => ctx.session.logout() }),
    kw('logout', '접속 종료', [], { run: (ctx) => ctx.session.logout() }),
    kw('show', '시스템 정보 보기', showCommon()),
  ];
}

// ---- 특권 모드 ----
function saveConfig(ctx) {
  ctx.session.saveStartup();
  ctx.out('Building configuration...', '[OK]');
}

function eraseStartup(ctx) {
  ctx.session.ask('Erasing the nvram filesystem will remove all configuration files! Continue? [confirm]', (answer) => {
    if (answer === '' || /^y/i.test(answer)) {
      ctx.session.eraseStartup();
      ctx.out('[OK]', 'Erase of nvram: complete');
    }
  });
}

export function privilegedExecTree() {
  return [
    kw('configure', '설정 모드로 전환', [
      kw('terminal', '터미널에서 설정', [], {
        run: (ctx) => {
          ctx.out('Enter configuration commands, one per line.  End with CNTL/Z.');
          ctx.enter('config');
        },
      }),
    ]),
    kw('copy', '설정 파일 복사', [
      kw('running-config', '현재 설정에서', [
        kw('startup-config', '저장된 설정으로 (저장)', [], {
          run: (ctx) =>
            ctx.session.ask('Destination filename [startup-config]? ', (answer) => {
              if (answer === '' || answer === 'startup-config') saveConfig(ctx);
              else ctx.out('%Error opening ' + answer + ' (Permission denied)');
            }),
        }),
      ]),
    ]),
    kw('disable', '사용자 모드로 전환', [], { run: (ctx) => ctx.enter('user') }),
    kw('enable', '특권 모드 (이미 특권 모드)', [], { run: () => {} }),
    kw('erase', '파일 지우기', [kw('startup-config', '저장된 설정 지우기', [], { run: eraseStartup })]),
    kw('exit', '접속 종료', [], { run: (ctx) => ctx.session.logout() }),
    kw('logout', '접속 종료', [], { run: (ctx) => ctx.session.logout() }),
    kw('reload', '재부팅 (저장된 설정으로 다시 시작)', [], { run: (ctx) => ctx.session.requestReload() }),
    kw('show', '시스템 정보 보기', showPrivileged()),
    kw('write', '설정 저장 (copy running-config startup-config 와 같음)', [
      kw('erase', '저장된 설정 지우기', [], { run: eraseStartup }),
      kw('memory', '현재 설정을 저장', [], { run: saveConfig }),
      kw('terminal', '현재 설정 보기', [], { run: (ctx) => ctx.out(runningConfigText(ctx.d)) }),
    ], { run: saveConfig }),
  ];
}

/** 설정 모드의 do 뒤에 올 수 있는 특권 모드 명령 */
export function doTree() {
  return privilegedExecTree().filter((n) => ['copy', 'erase', 'show', 'write', 'reload'].includes(n.word));
}
