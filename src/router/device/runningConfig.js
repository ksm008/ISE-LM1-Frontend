// show running-config 출력 (IOS 와 비슷한 순서와 형식)
import { interfaceOrder, showPassword, VTY_COUNT } from './device.js';

function lineBody(line, kind) {
  const out = [];
  if (line.accessClassIn !== null) out.push(` access-class ${line.accessClassIn} in`);
  const [m, s] = line.execTimeout;
  if (m !== 10 || s !== 0) out.push(` exec-timeout ${m} ${s}`);
  if (line.password) out.push(` password ${showPassword(line.password)}`);
  if (line.loggingSync) out.push(' logging synchronous');
  if (line.login === 'login') out.push(' login');
  if (line.login === 'local') out.push(' login local');
  if (kind === 'vty' && line.transport !== 'all') out.push(` transport input ${line.transport}`);
  return out;
}

/** 연속된 같은 설정의 vty 를 묶는다. 0-4 와 5-15 는 원래 따로 있는 묶음이라 합치지 않는다. */
function vtyBlocks(vty) {
  const blocks = [];
  const groups = [
    [0, 4],
    [5, VTY_COUNT - 1],
  ];
  for (const [from, to] of groups) {
    let start = from;
    for (let i = from + 1; i <= to + 1; i++) {
      if (i > to || JSON.stringify(vty[i]) !== JSON.stringify(vty[start])) {
        blocks.push({ from: start, to: i - 1, body: lineBody(vty[start], 'vty') });
        start = i;
      }
    }
  }
  return blocks;
}

export function runningConfigLines(d) {
  const out = ['!', 'version 15.4'];
  out.push(d.servicePasswordEncryption ? 'service password-encryption' : 'no service password-encryption');
  if (!d.services.pad) out.push('no service pad');
  if (d.services.tcpSmallServers) out.push('service tcp-small-servers');
  if (d.services.udpSmallServers) out.push('service udp-small-servers');
  out.push('!', `hostname ${d.hostname}`, '!');

  if (d.minPasswordLength > 0) out.push(`security passwords min-length ${d.minPasswordLength}`);
  if (d.enableSecret) out.push(`enable secret 5 ${d.enableSecret.hash}`);
  if (d.enablePassword) out.push(`enable password ${showPassword(d.enablePassword)}`);
  out.push('!');

  if (!d.services.sourceRoute) out.push('no ip source-route');
  if (!d.services.bootp) out.push('no ip bootp server');
  if (d.services.finger) out.push('ip finger');
  if (!d.services.domainLookup) out.push('no ip domain lookup');
  if (d.domainName) out.push(`ip domain name ${d.domainName}`);
  if (d.loginBlock) {
    const b = d.loginBlock;
    out.push(`login block-for ${b.blockFor} attempts ${b.attempts} within ${b.within}`);
  }
  out.push('!');

  const users = Object.keys(d.users).sort();
  for (const name of users) {
    const u = d.users[name];
    const priv = u.privilege !== 1 ? ` privilege ${u.privilege}` : '';
    if (u.secret) out.push(`username ${name}${priv} secret 5 ${u.secret.hash}`);
    else if (u.password) out.push(`username ${name}${priv} password ${showPassword(u.password)}`);
    else out.push(`username ${name}${priv}`);
  }
  if (users.length) out.push('!');

  if (d.ssh.timeout !== 120) out.push(`ip ssh time-out ${d.ssh.timeout}`);
  if (d.ssh.retries !== 3) out.push(`ip ssh authentication-retries ${d.ssh.retries}`);
  if (d.ssh.version) out.push(`ip ssh version ${d.ssh.version}`);
  if (d.ssh.version || d.ssh.timeout !== 120 || d.ssh.retries !== 3) out.push('!');

  for (const name of interfaceOrder(Object.keys(d.interfaces))) {
    const i = d.interfaces[name];
    out.push(`interface ${name}`);
    if (i.description) out.push(` description ${i.description}`);
    out.push(i.ip ? ` ip address ${i.ip} ${i.mask}` : ' no ip address');
    if (i.directedBroadcast) out.push(' ip directed-broadcast');
    if (!i.redirects) out.push(' no ip redirects');
    if (!i.unreachables) out.push(' no ip unreachables');
    if (!i.proxyArp) out.push(' no ip proxy-arp');
    if (!i.cdp) out.push(' no cdp enable');
    if (i.shutdown) out.push(' shutdown');
    out.push('!');
  }

  out.push(d.services.httpServer ? 'ip http server' : 'no ip http server');
  if (d.services.httpSecureServer) out.push('ip http secure-server');
  out.push('!');
  if (!d.services.cdp) out.push('no cdp run', '!');

  if (d.bannerMotd !== null) {
    out.push(`banner motd ^C${d.bannerMotd}^C`.split('\n').join('\n'));
    out.push('!');
  }

  out.push('line con 0', ...lineBody(d.lines.con[0], 'con'));
  for (const b of vtyBlocks(d.lines.vty)) {
    out.push(b.from === b.to ? `line vty ${b.from}` : `line vty ${b.from} ${b.to}`, ...b.body);
  }
  out.push('!', 'end');
  return out.join('\n').split('\n');
}

export function runningConfigText(device, title = 'Current configuration') {
  const lines = runningConfigLines(device);
  const bytes = new TextEncoder().encode(lines.join('\n')).length;
  return ['Building configuration...', '', `${title} : ${bytes} bytes`, ...lines].join('\n');
}
