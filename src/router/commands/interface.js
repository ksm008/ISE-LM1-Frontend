// 인터페이스 설정 모드 Router(config-if)#
import { arg, kw } from '../engine/tree.js';
import { IPV4, LINE, parseIpv4, formatIpv4 } from '../engine/types.js';
import { interfaceStatus } from '../device/device.js';

const iface = (ctx) => ctx.d.interfaces[ctx.sub.iface];

function maskBits(mask) {
  // 연속된 1 로만 이루어진 서브넷 마스크인지
  const inv = ~mask >>> 0;
  if ((inv & (inv + 1)) !== 0) return -1;
  return 32 - Math.log2(inv + 1);
}

function setAddress(ctx, a) {
  const ip = parseIpv4(a.ip);
  const mask = parseIpv4(a.mask);
  const bits = maskBits(mask);
  const hex = `0x${mask.toString(16).toUpperCase().padStart(8, '0')}`;
  if (bits <= 0) {
    ctx.out(`Bad mask ${hex} for address ${a.ip}`);
    return;
  }
  const net = (ip & mask) >>> 0;
  const bcast = (net | (~mask >>> 0)) >>> 0;
  if (bits < 31 && (ip === net || ip === bcast)) {
    ctx.out(`Bad mask /${bits} for address ${a.ip}`);
    return;
  }
  // 다른 인터페이스와 같은 네트워크면 거부
  for (const [name, other] of Object.entries(ctx.d.interfaces)) {
    if (name === ctx.sub.iface || !other.ip) continue;
    const om = parseIpv4(other.mask);
    const on = (parseIpv4(other.ip) & om) >>> 0;
    const smaller = om > mask ? mask : om;
    if (((ip & smaller) >>> 0) === ((on & smaller) >>> 0)) {
      ctx.out(`% ${formatIpv4(net)} overlaps with ${name}`);
      return;
    }
  }
  const i = iface(ctx);
  i.ip = a.ip;
  i.mask = a.mask;
}

function setShutdown(ctx) {
  const name = ctx.sub.iface;
  const i = iface(ctx);
  const was = i.shutdown;
  i.shutdown = !ctx.negated;
  if (was === i.shutdown) return;
  const st = interfaceStatus(name, i);
  ctx.log(`%LINK-5-CHANGED: Interface ${name}, changed state to ${st.status}`);
  ctx.log(`%LINEPROTO-5-UPDOWN: Line protocol on Interface ${name}, changed state to ${st.protocol}`);
}

const flag = (key) => (ctx) => { iface(ctx)[key] = !ctx.negated; };

export function interfaceTree() {
  return [
    kw('cdp', 'CDP', [kw('enable', '이 인터페이스에서 CDP 사용', [], { run: flag('cdp') })]),
    kw('description', '인터페이스 설명', [
      arg('text', LINE, '설명 문구', [], { run: (ctx, a) => { iface(ctx).description = a.text.slice(0, 240); } }),
    ], { noRun: (ctx) => { iface(ctx).description = null; } }),
    kw('ip', 'IP 설정', [
      kw('address', 'IP 주소 설정', [
        arg('ip', IPV4, 'IP 주소', [arg('mask', IPV4, '서브넷 마스크', [], { run: setAddress })]),
      ], {
        noRun: (ctx) => {
          const i = iface(ctx);
          i.ip = null;
          i.mask = null;
        },
      }),
      kw('directed-broadcast', 'directed broadcast 전달 (Smurf 공격에 악용, 끔 권장)', [], { run: flag('directedBroadcast') }),
      kw('proxy-arp', 'Proxy ARP 응답', [], { run: flag('proxyArp') }),
      kw('redirects', 'ICMP redirect 메시지 보내기', [], { run: flag('redirects') }),
      kw('unreachables', 'ICMP unreachable 메시지 보내기', [], { run: flag('unreachables') }),
    ]),
    kw('shutdown', '인터페이스 끄기 (no shutdown: 켜기)', [], { run: setShutdown }),
  ];
}
