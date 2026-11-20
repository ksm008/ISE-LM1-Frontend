// 라우터 한 대의 설정 상태 (running-config). JSON 으로 그대로 저장·복원할 수 있게 순수 데이터만 둔다.

export const INTERFACE_TYPES = [
  { word: 'GigabitEthernet', help: '기가비트 이더넷 인터페이스', pattern: /^0\/[01]$/, label: '<0-0>/<0-1>' },
  { word: 'Serial', help: '시리얼(WAN) 인터페이스', pattern: /^0\/0\/[01]$/, label: '<0-0>/<0-0>/<0-1>' },
  { word: 'Loopback', help: '루프백(가상) 인터페이스', pattern: /^\d{1,10}$/, label: '<0-2147483647>', virtual: true },
];

const PHYSICAL = ['GigabitEthernet0/0', 'GigabitEthernet0/1', 'Serial0/0/0', 'Serial0/0/1'];
export const VTY_COUNT = 16;

export function createInterface(name) {
  const virtual = name.startsWith('Loopback');
  return {
    description: null,
    ip: null,
    mask: null,
    shutdown: !virtual, // 라우터의 물리 인터페이스는 처음에 꺼져 있다
    directedBroadcast: false,
    proxyArp: true,
    redirects: true,
    unreachables: true,
    cdp: true,
  };
}

export function createLine(kind) {
  return {
    password: null, // { plain, enc } enc: type 7 문자열 (암호화되어 있으면)
    login: kind === 'vty' ? 'login' : 'none', // none | login | local
    execTimeout: [10, 0],
    transport: 'all', // vty 만: all | none | ssh | telnet | telnet ssh
    accessClassIn: null,
    loggingSync: false,
  };
}

export function createDevice() {
  return {
    hostname: 'Router',
    servicePasswordEncryption: false,
    enableSecret: null, // { hash } type 5
    enablePassword: null, // { plain, enc }
    users: {}, // 이름 → { privilege, secret: {hash} | null, password: {plain, enc} | null }
    minPasswordLength: 0,
    domainName: null,
    rsaKeyBits: 0,
    ssh: { version: null, timeout: 120, retries: 3 }, // version null = 1.99 (1, 2 모두)
    loginBlock: null, // { blockFor, attempts, within }
    services: {
      pad: true,
      tcpSmallServers: false,
      udpSmallServers: false,
      httpServer: true,
      httpSecureServer: false,
      cdp: true,
      sourceRoute: true,
      finger: false,
      bootp: true,
      domainLookup: true,
    },
    bannerMotd: null, // 여러 줄 문자열
    interfaces: Object.fromEntries(PHYSICAL.map((n) => [n, createInterface(n)])),
    lines: { con: [createLine('con')], vty: Array.from({ length: VTY_COUNT }, () => createLine('vty')) },
  };
}

export const cloneDevice = (device) => JSON.parse(JSON.stringify(device));

/** 인터페이스 정렬 순서 (종류 순, 번호 순) */
export function interfaceOrder(names) {
  const typeIndex = (n) => INTERFACE_TYPES.findIndex((t) => n.startsWith(t.word));
  const nums = (n) => (n.match(/\d+/g) ?? []).map(Number);
  return [...names].sort((a, b) => {
    const t = typeIndex(a) - typeIndex(b);
    if (t) return t;
    const x = nums(a);
    const y = nums(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const d = (x[i] ?? 0) - (y[i] ?? 0);
      if (d) return d;
    }
    return 0;
  });
}

/** 비밀번호 값 표시: 암호화되어 있으면 "7 xxxx", 아니면 평문 */
export const showPassword = (pw) => (pw.enc ? `7 ${pw.enc}` : pw.plain);

export function interfaceStatus(name, iface) {
  if (iface.shutdown) return { status: 'administratively down', protocol: 'down' };
  // 1단계에서는 이더넷·루프백은 연결된 것으로, 시리얼은 상대 장비가 없는 것으로 본다
  if (name.startsWith('Serial')) return { status: 'up', protocol: 'down' };
  return { status: 'up', protocol: 'up' };
}
