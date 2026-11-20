import { describe, expect, it } from 'vitest';
import { RouterSession } from './session.js';
import { decodeType7, verifySecret } from './crypto/passwords.js';

/** 세션을 만들고 Enter(시작)까지 누른다 */
function start(startup = null) {
  let output = '';
  let saved = startup;
  const s = new RouterSession({
    startup,
    timers: false,
    onOutput: (t) => { output += t; },
    onStartupChange: (v) => { saved = v; },
  });
  const run = (...lines) => {
    output = '';
    for (const l of lines) s.submit(l);
    return output.replace(/\r\n/g, '\n');
  };
  run(''); // Press RETURN
  return { s, run, saved: () => saved };
}

describe('모드 전환과 프롬프트', () => {
  it('user → priv → config → interface → end', () => {
    const { s, run } = start();
    expect(s.prompt).toBe('Router>');
    run('en');
    expect(s.prompt).toBe('Router#');
    run('conf t');
    expect(s.prompt).toBe('Router(config)#');
    run('int g0/0');
    expect(s.prompt).toBe('Router(config-if)#');
    run('exit');
    expect(s.prompt).toBe('Router(config)#');
    run('line vty 0 4');
    expect(s.prompt).toBe('Router(config-line)#');
    const out = run('end');
    expect(s.prompt).toBe('Router#');
    expect(out).toContain('%SYS-5-CONFIG_I');
  });

  it('하위 모드에서 전역 명령을 치면 전역 모드로 나가서 실행', () => {
    const { s, run } = start();
    run('enable', 'configure terminal', 'interface GigabitEthernet0/1', 'hostname R1');
    expect(s.prompt).toBe('R1(config)#');
    run('interface gi0/0', 'line con 0');
    expect(s.prompt).toBe('R1(config-line)#');
  });
});

describe('파서 오류 메시지', () => {
  it('잘못된 단어는 ^ 로 위치 표시', () => {
    const { run } = start();
    run('enable', 'conf t');
    const out = run('hostnme R1');
    expect(out).toContain("% Invalid input detected at '^' marker.");
    // 프롬프트 "Router(config)#" 15자 다음 위치(0)에 ^
    expect(out.split('\n')[0]).toBe(`${' '.repeat(15)}^`);
    const out2 = run('ip address 1.1.1.1');
    expect(out2.split('\n')[0]).toBe(`${' '.repeat(15 + 3)}^`);
  });

  it('줄임말이 여러 명령과 겹치면 Ambiguous', () => {
    const { run } = start();
    run('enable');
    expect(run('c')).toContain('% Ambiguous command:  "c"');
  });

  it('끝나지 않은 명령은 Incomplete', () => {
    const { run } = start();
    run('enable', 'conf t');
    expect(run('enable secret')).toContain('% Incomplete command.');
  });

  it('EXEC 모드의 모르는 명령', () => {
    const { run } = start();
    const out = run('foo');
    expect(out).toContain('Translating "foo"');
    expect(out).toContain('% Unknown command or computer name');
    run('en', 'conf t', 'no ip domain lookup', 'end');
    expect(run('foo')).not.toContain('Translating');
  });
});

describe('도움말과 자동 완성', () => {
  it('? 목록과 <cr>', () => {
    const { s, run } = start();
    run('enable', 'conf t');
    const lines = s.help('enable ');
    expect(lines.some((l) => l.trim().startsWith('password'))).toBe(true);
    expect(lines.some((l) => l.trim().startsWith('secret'))).toBe(true);
    expect(s.help('service password-encryption ').at(-1).trim()).toBe('<cr>');
    expect(s.help('ho')).toEqual(['hostname']);
    expect(s.help('xyz')).toEqual(['% Unrecognized command']);
  });

  it('Tab 완성', () => {
    const { s, run } = start();
    run('enable');
    expect(s.complete('conf')).toBe('configure ');
    expect(s.complete('configure t')).toBe('configure terminal ');
    expect(s.complete('c')).toBeNull();
  });
});

describe('장비 접근 보안', () => {
  it('enable secret 은 type 5 해시로 저장되고 enable 할 때 확인', () => {
    const { s, run } = start();
    run('enable', 'conf t', 'enable secret Cisco#123', 'end', 'disable');
    const hash = s.device.enableSecret.hash;
    expect(hash).toMatch(/^\$1\$/);
    expect(verifySecret('Cisco#123', hash)).toBe(true);

    run('enable');
    expect(s.prompt).toBe('Password: ');
    expect(s.echo).toBe(false);
    run('wrong');
    expect(s.prompt).toBe('Password: ');
    run('Cisco#123');
    expect(s.prompt).toBe('Router#');
    expect(run('show running-config')).toContain(`enable secret 5 ${hash}`);
  });

  it('enable 비밀번호 3번 틀리면 % Bad secrets', () => {
    const { s, run } = start();
    run('enable', 'conf t', 'enable secret Cisco#123', 'end', 'disable', 'enable');
    const out = run('a', 'b', 'c');
    expect(out).toContain('% Bad secrets');
    expect(s.prompt).toBe('Router>');
  });

  it('service password-encryption 은 평문 비밀번호를 type 7 로 바꾼다', () => {
    const { s, run } = start();
    run('enable', 'conf t', 'enable password Plain1!', 'line con 0', 'password ConPass1', 'login', 'exit');
    let cfg = run('do show running-config');
    expect(cfg).toContain('enable password Plain1!');
    expect(cfg).toContain(' password ConPass1');
    run('service password-encryption');
    cfg = run('do show running-config');
    const m = /enable password 7 ([0-9A-F]+)/.exec(cfg);
    expect(m).not.toBeNull();
    expect(decodeType7(m[1])).toBe('Plain1!');
    expect(cfg).toMatch(/ password 7 [0-9A-F]+/);
    expect(s.device.lines.con[0].password.plain).toBe('ConPass1');
  });

  it('enable secret 과 enable password 를 같게 하면 거부', () => {
    const { s, run } = start();
    run('enable', 'conf t', 'enable secret Same#123');
    expect(run('enable password Same#123')).toContain('same as your enable secret');
    expect(s.device.enablePassword).toBeNull();
  });

  it('security passwords min-length', () => {
    const { s, run } = start();
    run('enable', 'conf t', 'security passwords min-length 10');
    expect(run('enable secret short')).toContain('% Password too short - must be at least 10 characters');
    expect(s.device.enableSecret).toBeNull();
    run('enable secret LongEnough#1');
    expect(s.device.enableSecret).not.toBeNull();
  });

  it('잘못된 type 5 / type 7 입력', () => {
    const { run } = start();
    run('enable', 'conf t');
    expect(run('enable secret 5 notahash')).toContain('not a valid encrypted secret');
    expect(run('enable password 7 ZZ')).toContain('Invalid encrypted password');
  });

  it('콘솔 login 과 비밀번호: logout 후 다시 로그인', () => {
    const { s, run } = start();
    run('enable', 'conf t', 'line console 0', 'password Con#Pass1', 'login', 'end', 'exit');
    expect(run('')).toContain('User Access Verification');
    expect(s.prompt).toBe('Password: ');
    run('Con#Pass1');
    expect(s.prompt).toBe('Router>');
  });

  it('login local 과 privilege 15 사용자는 바로 특권 모드', () => {
    const { s, run } = start();
    run('enable', 'conf t', 'username admin privilege 15 secret Adm1n#Pass', 'username user1 password User#1', 'line con 0', 'login local', 'end');
    const cfg = run('show running-config');
    expect(cfg).toMatch(/username admin privilege 15 secret 5 \$1\$/);
    expect(cfg).toContain('username user1 password User#1');
    run('exit', '');
    expect(s.prompt).toBe('Username: ');
    run('admin', 'wrong');
    expect(s.prompt).toBe('Username: ');
    run('admin', 'Adm1n#Pass');
    expect(s.prompt).toBe('Router#');
    run('exit', '', 'user1', 'User#1');
    expect(s.prompt).toBe('Router>');
  });

  it('vty 설정은 같은 내용의 라인끼리 묶어 보여 준다', () => {
    const { run } = start();
    run('enable', 'conf t', 'line vty 0 4', 'transport input ssh', 'login local', 'exec-timeout 5 0', 'access-class 10 in', 'end');
    const cfg = run('show run | section line vty');
    expect(cfg).toContain('line vty 0 4\n access-class 10 in\n exec-timeout 5 0\n login local\n transport input ssh');
    expect(cfg).toContain('line vty 5 15\n login');
  });

  it('SSH: 호스트 이름과 도메인이 있어야 RSA 키를 만들 수 있다', () => {
    const { s, run } = start();
    run('enable', 'conf t');
    expect(run('crypto key generate rsa modulus 2048')).toContain('hostname other than Router');
    run('hostname R1');
    expect(run('crypto key generate rsa modulus 2048')).toContain('define a domain-name first');
    run('ip domain-name lab.local');
    const out = run('crypto key generate rsa');
    expect(out).toContain('The name for the keys will be: R1.lab.local');
    expect(s.prompt).toBe('How many bits in the modulus [512]: ');
    expect(run('2048')).toContain('%SSH-5-ENABLED');
    run('ip ssh version 2', 'end');
    expect(run('show ip ssh')).toContain('SSH Enabled - version 2.0');
  });

  it('불필요한 서비스 끄기', () => {
    const { run } = start();
    run('enable', 'conf t', 'no ip http server', 'no cdp run', 'no ip source-route', 'service tcp-small-servers', 'no service tcp-small-servers', 'end');
    const cfg = run('show running-config');
    expect(cfg).toContain('no ip http server');
    expect(cfg).toContain('no cdp run');
    expect(cfg).toContain('no ip source-route');
    expect(cfg).not.toContain('service tcp-small-servers');
  });

  it('banner motd: 한 줄과 여러 줄', () => {
    const { s, run } = start();
    run('enable', 'conf t', 'banner motd #Authorized access only#');
    expect(s.device.bannerMotd).toBe('Authorized access only');
    const out = run('banner motd $');
    expect(out).toContain("End with the character '$'");
    run('line one', 'line two$');
    expect(s.device.bannerMotd).toBe('\nline one\nline two');
    expect(s.prompt).toBe('Router(config)#');
  });
});

describe('인터페이스', () => {
  it('IP 주소와 no shutdown', () => {
    const { run } = start();
    run('enable', 'conf t', 'interface g0/0', 'ip address 192.168.1.1 255.255.255.0');
    expect(run('no shutdown')).toContain('changed state to up');
    expect(run('do show ip interface brief')).toMatch(/GigabitEthernet0\/0\s+192\.168\.1\.1\s+YES manual up\s+up/);
  });

  it('잘못된 마스크·네트워크 주소·겹치는 대역', () => {
    const { run } = start();
    run('enable', 'conf t', 'int g0/0');
    expect(run('ip address 10.0.0.1 255.0.255.0')).toContain('Bad mask');
    expect(run('ip address 10.0.0.0 255.255.255.0')).toContain('Bad mask /24 for address 10.0.0.0');
    run('ip address 10.0.0.1 255.255.255.0', 'int g0/1');
    expect(run('ip address 10.0.0.2 255.255.255.0')).toContain('overlaps with GigabitEthernet0/0');
  });

  it('잘못된 인터페이스 번호', () => {
    const { run } = start();
    run('enable', 'conf t');
    expect(run('interface g0/9')).toContain('% Invalid input');
    run('interface loopback 0');
    expect(run('do show ip interface brief')).toContain('Loopback0');
  });
});

describe('저장과 재부팅', () => {
  it('저장하지 않으면 reload 때 묻고, 저장한 설정으로 다시 시작', () => {
    const { s, run, saved } = start();
    run('enable', 'conf t', 'hostname R1', 'end');
    run('reload');
    // 질문은 출력이 아니라 프롬프트로 보여 준다
    expect(s.prompt).toBe('System configuration has been modified. Save? [yes/no]: ');
    run('yes');
    expect(s.prompt).toBe('Proceed with reload? [confirm]');
    run('');
    expect(saved().hostname).toBe('R1');
    run('');
    expect(s.prompt).toBe('R1>');

    const again = start(saved());
    expect(again.s.prompt).toBe('R1>');
  });

  it('copy run start, show startup-config, erase', () => {
    const { s, run, saved } = start();
    run('enable');
    expect(run('show startup-config')).toContain('startup-config is not present');
    run('copy running-config startup-config');
    expect(run('')).toContain('[OK]');
    expect(saved()).not.toBeNull();
    run('erase startup-config', '');
    expect(saved()).toBeNull();
    expect(s.prompt).toBe('Router#');
  });

  it('do 와 출력 필터', () => {
    const { run } = start();
    run('enable', 'conf t', 'hostname R1', 'enable secret Abc#12345');
    const out = run('do show running-config | include ^enable|^hostname');
    expect(out.trim().split('\n')).toHaveLength(2);
  });
});
