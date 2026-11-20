// 패킷 해석기 (Ethernet / Linux cooked / ARP / IPv4 / IPv6 / ICMP / ICMPv6 / TCP / UDP / DNS / HTTP / TLS / SSH)
//
// createDissector(linkType)(packet) 는 다음을 돌려준다.
//   summary: 목록에 표시할 { src, dst, protocol, info, color }
//   tree:    상세 트리. 노드 = { key, label, start, length, children }  (start/length 는 패킷 안의 바이트 위치)
//   fields:  표시 필터용 값. Map<필드 이름, 값 배열>
// TCP 상대 시퀀스 번호와 스트림 번호를 계산하므로 패킷을 도착 순서대로 넣어야 한다.

export const LINK_TYPES = {
  0: 'BSD loopback',
  1: 'Ethernet',
  101: 'Raw IP',
  113: 'Linux cooked capture v1',
  276: 'Linux cooked capture v2',
};

const ETHER_TYPES = { 0x0800: 'IPv4', 0x0806: 'ARP', 0x86dd: 'IPv6', 0x8100: '802.1Q VLAN' };
const IP_PROTOCOLS = { 1: 'ICMP', 2: 'IGMP', 6: 'TCP', 17: 'UDP', 47: 'GRE', 50: 'ESP', 58: 'ICMPv6', 132: 'SCTP' };
const SLL_PACKET_TYPES = ['Unicast to us', 'Broadcast', 'Multicast', 'Unicast to another host', 'Sent by us'];
const DNS_TYPES = {
  1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 12: 'PTR', 15: 'MX', 16: 'TXT', 28: 'AAAA', 33: 'SRV', 64: 'SVCB', 65: 'HTTPS', 255: 'ANY',
};
const DNS_RCODES = ['No error', 'Format error', 'Server failure', 'No such name', 'Not implemented', 'Refused'];
const TCP_FLAG_NAMES = ['FIN', 'SYN', 'RST', 'PSH', 'ACK', 'URG', 'ECE', 'CWR', 'AE'];
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH', 'CONNECT', 'TRACE'];
const TLS_CONTENT_TYPES = { 20: 'Change Cipher Spec', 21: 'Alert', 22: 'Handshake', 23: 'Application Data' };
const TLS_HANDSHAKE_TYPES = {
  1: 'Client Hello', 2: 'Server Hello', 4: 'New Session Ticket', 8: 'Encrypted Extensions', 11: 'Certificate',
  12: 'Server Key Exchange', 13: 'Certificate Request', 14: 'Server Hello Done', 15: 'Certificate Verify',
  16: 'Client Key Exchange', 20: 'Finished',
};
const TLS_VERSIONS = { 0x0300: 'SSL 3.0', 0x0301: 'TLS 1.0', 0x0302: 'TLS 1.1', 0x0303: 'TLS 1.2', 0x0304: 'TLS 1.3' };
const ICMP_TYPES = {
  0: 'Echo (ping) reply', 3: 'Destination unreachable', 4: 'Source quench', 5: 'Redirect', 8: 'Echo (ping) request',
  9: 'Router advertisement', 10: 'Router solicitation', 11: 'Time-to-live exceeded', 12: 'Parameter problem',
  13: 'Timestamp request', 14: 'Timestamp reply',
};
const ICMP_UNREACHABLE = [
  'Network unreachable', 'Host unreachable', 'Protocol unreachable', 'Port unreachable', 'Fragmentation needed',
  'Source route failed', 'Destination network unknown', 'Destination host unknown', 'Source host isolated',
  'Network administratively prohibited', 'Host administratively prohibited', 'Network unreachable for ToS',
  'Host unreachable for ToS', 'Communication administratively filtered',
];
const ICMPV6_TYPES = {
  1: 'Destination Unreachable', 2: 'Packet Too Big', 3: 'Time Exceeded', 4: 'Parameter Problem',
  128: 'Echo (ping) request', 129: 'Echo (ping) reply', 133: 'Router Solicitation', 134: 'Router Advertisement',
  135: 'Neighbor Solicitation', 136: 'Neighbor Advertisement', 143: 'Multicast Listener Report Message v2',
};
const WELL_KNOWN_UDP = { 67: 'DHCP', 68: 'DHCP', 69: 'TFTP', 123: 'NTP', 137: 'NBNS', 161: 'SNMP', 162: 'SNMP', 514: 'Syslog', 1900: 'SSDP' };

/** 표시 필터에서 쓸 수 있는 필드 (자동 완성·검증용) */
export const KNOWN_FIELDS = [
  'frame', 'frame.number', 'frame.len', 'frame.cap_len', 'frame.time_relative',
  'eth', 'eth.src', 'eth.dst', 'eth.addr', 'eth.type', 'sll', 'sll.pkttype',
  'arp', 'arp.opcode', 'arp.src.hw_mac', 'arp.src.proto_ipv4', 'arp.dst.hw_mac', 'arp.dst.proto_ipv4',
  'ip', 'ip.version', 'ip.src', 'ip.dst', 'ip.addr', 'ip.ttl', 'ip.proto', 'ip.len', 'ip.id', 'ip.flags.df', 'ip.flags.mf', 'ip.frag_offset', 'ip.dsfield',
  'ipv6', 'ipv6.src', 'ipv6.dst', 'ipv6.addr', 'ipv6.nxt', 'ipv6.hlim', 'ipv6.plen',
  'icmp', 'icmp.type', 'icmp.code', 'icmp.ident', 'icmp.seq',
  'icmpv6', 'icmpv6.type', 'icmpv6.code',
  'tcp', 'tcp.srcport', 'tcp.dstport', 'tcp.port', 'tcp.stream', 'tcp.seq', 'tcp.ack', 'tcp.seq_raw', 'tcp.ack_raw', 'tcp.len', 'tcp.window_size_value',
  'tcp.flags', 'tcp.flags.fin', 'tcp.flags.syn', 'tcp.flags.reset', 'tcp.flags.push', 'tcp.flags.ack', 'tcp.flags.urg', 'tcp.options.mss_val', 'tcp.payload',
  'udp', 'udp.srcport', 'udp.dstport', 'udp.port', 'udp.length',
  'dns', 'dns.id', 'dns.flags.response', 'dns.flags.rcode', 'dns.qry.name', 'dns.qry.type', 'dns.resp.name', 'dns.a', 'dns.aaaa', 'dns.cname', 'dns.count.answers',
  'http', 'http.request', 'http.response', 'http.request.method', 'http.request.uri', 'http.request.version', 'http.host', 'http.user_agent', 'http.response.code', 'http.response.phrase', 'http.content_type', 'http.server',
  'tls', 'tls.record.content_type', 'tls.record.version', 'tls.handshake.type', 'tls.handshake.extensions_server_name',
  'ssh', 'ssh.protocol', 'data', 'data.len',
  'dhcp', 'ntp', 'snmp', 'ssdp', 'nbns', 'tftp', 'syslog', 'igmp',
];

// ---- 작은 도우미 ----

const hex = (n, width = 2) => '0x' + n.toString(16).padStart(width, '0');
const u16 = (b, o) => (b[o] << 8) | b[o + 1];
const u32 = (b, o) => ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
const ipv4 = (b, o) => `${b[o]}.${b[o + 1]}.${b[o + 2]}.${b[o + 3]}`;
const mac = (b, o, len = 6) => Array.from(b.subarray(o, o + len), (x) => x.toString(16).padStart(2, '0')).join(':');
const bits = (value, width) => value.toString(2).padStart(width, '0');

function ipv6(b, o) {
  const groups = [];
  for (let i = 0; i < 16; i += 2) groups.push(u16(b, o + i).toString(16));
  // 가장 긴 0 연속 구간을 :: 로 줄인다
  let bestStart = -1;
  let bestLen = 0;
  for (let i = 0; i < 8; ) {
    if (groups[i] !== '0') {
      i++;
      continue;
    }
    let j = i;
    while (j < 8 && groups[j] === '0') j++;
    if (j - i > bestLen && j - i > 1) {
      bestStart = i;
      bestLen = j - i;
    }
    i = j;
  }
  if (bestStart < 0) return groups.join(':');
  const left = groups.slice(0, bestStart).join(':');
  const right = groups.slice(bestStart + bestLen).join(':');
  return `${left}::${right}`;
}

const ascii = (b, o, len) => {
  let s = '';
  for (let i = o; i < o + len && i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
};

function node(key, label, start, length, children = []) {
  return { key, label, start, length, children };
}

function addField(fields, name, value) {
  const list = fields.get(name);
  if (list) list.push(value);
  else fields.set(name, [value]);
}

class Truncated extends Error {}

// 캡처 길이를 넘는 위치를 읽으려 하면 Truncated 를 던진다
function need(b, end) {
  if (end > b.length) throw new Truncated();
}

/** 도착 순서대로 패킷을 해석하는 함수를 만든다. 새 캡처마다 새로 만든다. */
export function createDissector(linkType) {
  const tcpStreams = { map: new Map(), next: 0 }; // "a:p-b:q" → { index, base: { "a:p": seq } }

  return function dissect(packet) {
    const b = packet.bytes;
    const fields = new Map();
    const tree = [];
    const protocols = [];
    const summary = { src: '', dst: '', protocol: '', info: '', color: 'other' };
    const ctx = { b, fields, summary, protocols, tcpStreams, packet };

    const frame = node(
      'frame',
      `Frame ${packet.no}: ${packet.len} bytes on wire (${packet.len * 8} bits), ${b.length} bytes captured (${b.length * 8} bits)`,
      0,
      b.length,
    );
    tree.push(frame);
    addField(fields, 'frame', true);
    addField(fields, 'frame.number', packet.no);
    addField(fields, 'frame.len', packet.len);
    addField(fields, 'frame.cap_len', b.length);

    try {
      dissectLink(ctx, linkType, tree);
    } catch (e) {
      if (!(e instanceof Truncated)) throw e;
      tree.push(node('malformed', '[Packet size limited during capture]', b.length, 0));
      if (!summary.info) summary.info = '[Packet size limited during capture]';
    }

    if (!summary.protocol) summary.protocol = protocols.at(-1) ?? 'Unknown';
    frame.children = [
      node('frame.time', `Arrival Time: ${formatAbsolute(packet)}`, 0, 0),
      node('frame.number', `Frame Number: ${packet.no}`, 0, 0),
      node('frame.len', `Frame Length: ${packet.len} bytes (${packet.len * 8} bits)`, 0, 0),
      node('frame.cap_len', `Capture Length: ${b.length} bytes (${b.length * 8} bits)`, 0, 0),
      node('frame.protocols', `[Protocols in frame: ${protocols.map((p) => p.toLowerCase()).join(':')}]`, 0, 0),
    ];
    return { summary, tree, fields };
  };
}

function formatAbsolute(packet) {
  const d = new Date(packet.s * 1000);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(packet.us, 6)}`
  );
}

// ---- 링크 계층 ----

function dissectLink(ctx, linkType, tree) {
  const { b, fields, summary, protocols } = ctx;

  if (linkType === 1) {
    need(b, 14);
    const dst = mac(b, 0);
    const src = mac(b, 6);
    let type = u16(b, 12);
    let offset = 14;
    const eth = node('eth', `Ethernet II, Src: ${src}, Dst: ${dst}`, 0, 14, [
      node('eth.dst', `Destination: ${dst}`, 0, 6),
      node('eth.src', `Source: ${src}`, 6, 6),
    ]);
    if (type === 0x8100) {
      need(b, 18);
      eth.children.push(node('vlan', `802.1Q Virtual LAN, ID: ${u16(b, 14) & 0x0fff}`, 12, 6));
      type = u16(b, 16);
      offset = 18;
      eth.length = 18;
    }
    eth.children.push(node('eth.type', `Type: ${ETHER_TYPES[type] ?? 'Unknown'} (${hex(type, 4)})`, offset - 2, 2));
    tree.push(eth);
    protocols.push('Eth');
    addField(fields, 'eth', true);
    addField(fields, 'eth.src', src);
    addField(fields, 'eth.dst', dst);
    addField(fields, 'eth.addr', src);
    addField(fields, 'eth.addr', dst);
    addField(fields, 'eth.type', type);
    summary.src = src;
    summary.dst = dst;
    dissectEtherType(ctx, type, offset, tree);
    return;
  }

  if (linkType === 113 || linkType === 276) {
    const v2 = linkType === 276;
    const headerLen = v2 ? 20 : 16;
    need(b, headerLen);
    const pktType = v2 ? b[10] : u16(b, 0);
    const addrLen = v2 ? b[11] : u16(b, 4);
    const addrOffset = v2 ? 12 : 6;
    const proto = v2 ? u16(b, 0) : u16(b, 14);
    const addr = mac(b, addrOffset, Math.min(addrLen, 8));
    const children = [];
    if (v2) {
      children.push(node('sll.etype', `Protocol: ${ETHER_TYPES[proto] ?? 'Unknown'} (${hex(proto, 4)})`, 0, 2));
      children.push(node('sll.ifindex', `Interface index: ${u32(b, 4)}`, 4, 4));
      children.push(node('sll.hatype', `Link-layer address type: ${u16(b, 8)}`, 8, 2));
      children.push(node('sll.pkttype', `Packet type: ${SLL_PACKET_TYPES[pktType] ?? pktType} (${pktType})`, 10, 1));
      children.push(node('sll.halen', `Link-layer address length: ${addrLen}`, 11, 1));
      children.push(node('sll.src', `Source: ${addr}`, 12, 8));
    } else {
      children.push(node('sll.pkttype', `Packet type: ${SLL_PACKET_TYPES[pktType] ?? pktType} (${pktType})`, 0, 2));
      children.push(node('sll.hatype', `Link-layer address type: ${u16(b, 2)}`, 2, 2));
      children.push(node('sll.halen', `Link-layer address length: ${addrLen}`, 4, 2));
      children.push(node('sll.src', `Source: ${addr}`, 6, 8));
      children.push(node('sll.etype', `Protocol: ${ETHER_TYPES[proto] ?? 'Unknown'} (${hex(proto, 4)})`, 14, 2));
    }
    tree.push(node('sll', `Linux cooked capture ${v2 ? 'v2' : 'v1'}`, 0, headerLen, children));
    protocols.push(v2 ? 'SLL2' : 'SLL');
    addField(fields, 'sll', true);
    addField(fields, 'sll.pkttype', pktType);
    if (addrLen) {
      summary.src = addr;
      addField(fields, 'eth.src', addr);
    }
    dissectEtherType(ctx, proto, headerLen, tree);
    return;
  }

  if (linkType === 0) {
    need(b, 4);
    const family = b[0] === 2 || b[3] === 2 ? 0x0800 : 0x86dd;
    tree.push(node('null', `Null/Loopback (family ${family === 0x0800 ? 'IPv4' : 'IPv6'})`, 0, 4));
    dissectEtherType(ctx, family, 4, tree);
    return;
  }

  if (linkType === 101 || linkType === 12 || linkType === 14) {
    need(b, 1);
    dissectEtherType(ctx, b[0] >> 4 === 6 ? 0x86dd : 0x0800, 0, tree);
    return;
  }

  summary.info = `지원하지 않는 링크 타입 (${linkType})`;
  protocols.push('Data');
}

function dissectEtherType(ctx, type, offset, tree) {
  if (type === 0x0800) return dissectIPv4(ctx, offset, tree);
  if (type === 0x86dd) return dissectIPv6(ctx, offset, tree);
  if (type === 0x0806) return dissectARP(ctx, offset, tree);
  ctx.protocols.push(ETHER_TYPES[type] ?? 'Ethertype');
  ctx.summary.info = `Ethernet II (Ethertype ${hex(type, 4)})`;
  dissectData(ctx, offset, ctx.b.length - offset, tree);
}

// ---- ARP ----

function dissectARP(ctx, o, tree) {
  const { b, fields, summary, protocols } = ctx;
  need(b, o + 28);
  const op = u16(b, o + 6);
  const sha = mac(b, o + 8);
  const spa = ipv4(b, o + 14);
  const tha = mac(b, o + 18);
  const tpa = ipv4(b, o + 24);
  const opName = op === 1 ? 'request' : op === 2 ? 'reply' : String(op);
  tree.push(
    node('arp', `Address Resolution Protocol (${opName})`, o, 28, [
      node('arp.hw.type', `Hardware type: ${u16(b, o) === 1 ? 'Ethernet' : u16(b, o)} (${u16(b, o)})`, o, 2),
      node('arp.proto.type', `Protocol type: IPv4 (${hex(u16(b, o + 2), 4)})`, o + 2, 2),
      node('arp.hw.size', `Hardware size: ${b[o + 4]}`, o + 4, 1),
      node('arp.proto.size', `Protocol size: ${b[o + 5]}`, o + 5, 1),
      node('arp.opcode', `Opcode: ${opName} (${op})`, o + 6, 2),
      node('arp.src.hw_mac', `Sender MAC address: ${sha}`, o + 8, 6),
      node('arp.src.proto_ipv4', `Sender IP address: ${spa}`, o + 14, 4),
      node('arp.dst.hw_mac', `Target MAC address: ${tha}`, o + 18, 6),
      node('arp.dst.proto_ipv4', `Target IP address: ${tpa}`, o + 24, 4),
    ]),
  );
  protocols.push('ARP');
  addField(fields, 'arp', true);
  addField(fields, 'arp.opcode', op);
  addField(fields, 'arp.src.hw_mac', sha);
  addField(fields, 'arp.src.proto_ipv4', spa);
  addField(fields, 'arp.dst.hw_mac', tha);
  addField(fields, 'arp.dst.proto_ipv4', tpa);
  summary.src = sha;
  summary.dst = op === 1 ? 'Broadcast' : tha;
  summary.protocol = 'ARP';
  summary.color = 'arp';
  summary.info = op === 1 ? `Who has ${tpa}? Tell ${spa}` : op === 2 ? `${spa} is at ${sha}` : `Opcode ${op}`;
}

// ---- IPv4 / IPv6 ----

function dissectIPv4(ctx, o, tree) {
  const { b, fields, summary, protocols } = ctx;
  need(b, o + 20);
  const ihl = (b[o] & 0x0f) * 4;
  const totalLen = u16(b, o + 2);
  const id = u16(b, o + 4);
  const flagsFrag = u16(b, o + 6);
  const df = (flagsFrag >> 14) & 1;
  const mf = (flagsFrag >> 13) & 1;
  const fragOffset = (flagsFrag & 0x1fff) * 8;
  const ttl = b[o + 8];
  const proto = b[o + 9];
  const src = ipv4(b, o + 12);
  const dst = ipv4(b, o + 16);
  const protoName = IP_PROTOCOLS[proto] ?? String(proto);

  tree.push(
    node('ip', `Internet Protocol Version 4, Src: ${src}, Dst: ${dst}`, o, ihl, [
      node('ip.version', `${bits(b[o] >> 4, 4)} .... = Version: 4`, o, 1),
      node('ip.hdr_len', `.... ${bits(b[o] & 0x0f, 4)} = Header Length: ${ihl} bytes (${ihl / 4})`, o, 1),
      node('ip.dsfield', `Differentiated Services Field: ${hex(b[o + 1])} (DSCP: ${b[o + 1] >> 2}, ECN: ${b[o + 1] & 3})`, o + 1, 1),
      node('ip.len', `Total Length: ${totalLen}`, o + 2, 2),
      node('ip.id', `Identification: ${hex(id, 4)} (${id})`, o + 4, 2),
      node('ip.flags', `${bits(flagsFrag >> 13, 3)}. .... = Flags: ${hex(flagsFrag >> 13)}${df ? ", Don't fragment" : ''}${mf ? ', More fragments' : ''}`, o + 6, 1, [
        node('ip.flags.df', `.${df}.. .... = Don't fragment: ${df ? 'Set' : 'Not set'}`, o + 6, 1),
        node('ip.flags.mf', `..${mf}. .... = More fragments: ${mf ? 'Set' : 'Not set'}`, o + 6, 1),
      ]),
      node('ip.frag_offset', `Fragment Offset: ${fragOffset}`, o + 6, 2),
      node('ip.ttl', `Time to Live: ${ttl}`, o + 8, 1),
      node('ip.proto', `Protocol: ${protoName} (${proto})`, o + 9, 1),
      node('ip.checksum', `Header Checksum: ${hex(u16(b, o + 10), 4)}`, o + 10, 2),
      node('ip.src', `Source Address: ${src}`, o + 12, 4),
      node('ip.dst', `Destination Address: ${dst}`, o + 16, 4),
    ]),
  );
  protocols.push('IP');
  addField(fields, 'ip', true);
  addField(fields, 'ip.version', 4);
  addField(fields, 'ip.src', src);
  addField(fields, 'ip.dst', dst);
  addField(fields, 'ip.addr', src);
  addField(fields, 'ip.addr', dst);
  addField(fields, 'ip.ttl', ttl);
  addField(fields, 'ip.proto', proto);
  addField(fields, 'ip.len', totalLen);
  addField(fields, 'ip.id', id);
  addField(fields, 'ip.flags.df', df);
  addField(fields, 'ip.flags.mf', mf);
  addField(fields, 'ip.frag_offset', fragOffset);
  addField(fields, 'ip.dsfield', b[o + 1]);
  summary.src = src;
  summary.dst = dst;
  ctx.ttl = ttl;

  const payloadStart = o + ihl;
  // 이더넷 패딩을 빼고, 캡처된 만큼만 본다
  const payloadEnd = Math.min(o + Math.max(totalLen, ihl), b.length);
  const payloadLen = Math.max(0, o + totalLen - payloadStart);
  if (fragOffset > 0) {
    protocols.push(protoName);
    summary.protocol = 'IPv4';
    summary.info = `Fragmented IP protocol (proto=${protoName} ${proto}, off=${fragOffset}, ID=${hex(id, 4)})`;
    dissectData(ctx, payloadStart, payloadEnd - payloadStart, tree);
    return;
  }
  dissectTransport(ctx, proto, payloadStart, payloadEnd, payloadLen, src, dst, tree);
}

function dissectIPv6(ctx, o, tree) {
  const { b, fields, summary, protocols } = ctx;
  need(b, o + 40);
  const payloadLen = u16(b, o + 4);
  let next = b[o + 6];
  const hlim = b[o + 7];
  const src = ipv6(b, o + 8);
  const dst = ipv6(b, o + 24);
  const children = [
    node('ipv6.version', `0110 .... = Version: 6`, o, 1),
    node('ipv6.tclass', `Traffic Class: ${hex(((b[o] & 0x0f) << 4) | (b[o + 1] >> 4))}`, o, 2),
    node('ipv6.flow', `Flow Label: ${hex(((b[o + 1] & 0x0f) << 16) | u16(b, o + 2), 5)}`, o + 1, 3),
    node('ipv6.plen', `Payload Length: ${payloadLen}`, o + 4, 2),
    node('ipv6.nxt', `Next Header: ${IP_PROTOCOLS[next] ?? next} (${next})`, o + 6, 1),
    node('ipv6.hlim', `Hop Limit: ${hlim}`, o + 7, 1),
    node('ipv6.src', `Source Address: ${src}`, o + 8, 16),
    node('ipv6.dst', `Destination Address: ${dst}`, o + 24, 16),
  ];
  const ipNode = node('ipv6', `Internet Protocol Version 6, Src: ${src}, Dst: ${dst}`, o, 40, children);
  tree.push(ipNode);

  // 확장 헤더 (Hop-by-Hop, Routing, Destination Options) 건너뛰기
  let offset = o + 40;
  while (next === 0 || next === 43 || next === 60) {
    need(b, offset + 2);
    const extLen = (b[offset + 1] + 1) * 8;
    children.push(node('ipv6.ext', `Extension Header (${next})`, offset, extLen));
    next = b[offset];
    offset += extLen;
  }
  ipNode.length = offset - o;

  protocols.push('IPv6');
  addField(fields, 'ipv6', true);
  addField(fields, 'ipv6.src', src);
  addField(fields, 'ipv6.dst', dst);
  addField(fields, 'ipv6.addr', src);
  addField(fields, 'ipv6.addr', dst);
  addField(fields, 'ipv6.nxt', next);
  addField(fields, 'ipv6.hlim', hlim);
  addField(fields, 'ipv6.plen', payloadLen);
  summary.src = src;
  summary.dst = dst;
  ctx.ttl = hlim;

  const end = Math.min(o + 40 + payloadLen, b.length);
  dissectTransport(ctx, next, offset, end, Math.max(0, o + 40 + payloadLen - offset), src, dst, tree);
}

function dissectTransport(ctx, proto, start, end, payloadLen, src, dst, tree) {
  if (proto === 6) return dissectTCP(ctx, start, end, payloadLen, src, dst, tree);
  if (proto === 17) return dissectUDP(ctx, start, end, tree);
  if (proto === 1) return dissectICMP(ctx, start, end, tree);
  if (proto === 58) return dissectICMPv6(ctx, start, end, tree);
  const name = IP_PROTOCOLS[proto] ?? `IP proto ${proto}`;
  ctx.protocols.push(name);
  addField(ctx.fields, name.toLowerCase(), true);
  ctx.summary.protocol = name;
  ctx.summary.info = name;
  dissectData(ctx, start, end - start, tree);
}

// ---- ICMP ----

function dissectICMP(ctx, o, end, tree) {
  const { b, fields, summary, protocols } = ctx;
  need(b, o + 4);
  const type = b[o];
  const code = b[o + 1];
  let typeName = ICMP_TYPES[type] ?? `Type ${type}`;
  const children = [
    node('icmp.type', `Type: ${type} (${typeName})`, o, 1),
    node('icmp.code', `Code: ${code}${type === 3 && ICMP_UNREACHABLE[code] ? ` (${ICMP_UNREACHABLE[code]})` : ''}`, o + 1, 1),
    node('icmp.checksum', `Checksum: ${hex(u16(b, o + 2), 4)}`, o + 2, 2),
  ];
  let info = typeName;
  if (type === 0 || type === 8) {
    need(b, o + 8);
    const ident = u16(b, o + 4);
    const seq = u16(b, o + 6);
    const seqLe = ((seq & 0xff) << 8) | (seq >> 8);
    children.push(node('icmp.ident', `Identifier (BE): ${ident} (${hex(ident, 4)})`, o + 4, 2));
    children.push(node('icmp.seq', `Sequence Number (BE): ${seq} (${hex(seq, 4)})`, o + 6, 2));
    if (end > o + 8) children.push(node('data', `Data (${end - o - 8} bytes)`, o + 8, end - o - 8));
    addField(fields, 'icmp.ident', ident);
    addField(fields, 'icmp.seq', seq);
    info = `${typeName}  id=${hex(ident, 4)}, seq=${seq}/${seqLe}, ttl=${ctx.ttl}`;
  } else if (type === 3 || type === 11) {
    if (type === 3 && ICMP_UNREACHABLE[code]) info = `${typeName} (${ICMP_UNREACHABLE[code]})`;
    if (type === 11) info = `${typeName} (${code === 0 ? 'Time to live exceeded in transit' : 'Fragment reassembly time exceeded'})`;
    if (end > o + 8) children.push(node('icmp.original', `[원래 패킷 일부 (${end - o - 8} bytes)]`, o + 8, end - o - 8));
  }
  tree.push(node('icmp', 'Internet Control Message Protocol', o, end - o, children));
  protocols.push('ICMP');
  addField(fields, 'icmp', true);
  addField(fields, 'icmp.type', type);
  addField(fields, 'icmp.code', code);
  summary.protocol = 'ICMP';
  summary.color = 'icmp';
  summary.info = info;
}

function dissectICMPv6(ctx, o, end, tree) {
  const { b, fields, summary, protocols } = ctx;
  need(b, o + 4);
  const type = b[o];
  const code = b[o + 1];
  const typeName = ICMPV6_TYPES[type] ?? `Type ${type}`;
  const children = [
    node('icmpv6.type', `Type: ${typeName} (${type})`, o, 1),
    node('icmpv6.code', `Code: ${code}`, o + 1, 1),
    node('icmpv6.checksum', `Checksum: ${hex(u16(b, o + 2), 4)}`, o + 2, 2),
  ];
  let info = typeName;
  if ((type === 128 || type === 129) && end >= o + 8) {
    info = `${typeName} id=${hex(u16(b, o + 4), 4)}, seq=${u16(b, o + 6)}, hop limit=${ctx.ttl}`;
  } else if ((type === 135 || type === 136) && end >= o + 24) {
    const target = ipv6(b, o + 8);
    children.push(node('icmpv6.nd.target', `Target Address: ${target}`, o + 8, 16));
    info = type === 135 ? `${typeName} for ${target}` : `${typeName} ${target}`;
  }
  tree.push(node('icmpv6', 'Internet Control Message Protocol v6', o, end - o, children));
  protocols.push('ICMPv6');
  addField(fields, 'icmpv6', true);
  addField(fields, 'icmpv6.type', type);
  addField(fields, 'icmpv6.code', code);
  summary.protocol = 'ICMPv6';
  summary.color = 'icmp';
  summary.info = info;
}

// ---- TCP ----

function dissectTCP(ctx, o, end, segmentTotal, srcIp, dstIp, tree) {
  const { b, fields, summary, protocols, tcpStreams } = ctx;
  need(b, o + 20);
  const sport = u16(b, o);
  const dport = u16(b, o + 2);
  const seqRaw = u32(b, o + 4);
  const ackRaw = u32(b, o + 8);
  const hdrLen = (b[o + 12] >> 4) * 4;
  const flags = ((b[o + 12] & 0x01) << 8) | b[o + 13];
  const window = u16(b, o + 14);
  const payloadLen = Math.max(0, segmentTotal - hdrLen);

  // 스트림 번호와 상대 시퀀스 번호 (Wireshark 기본 표시와 같다)
  const a = `${srcIp}:${sport}`;
  const z = `${dstIp}:${dport}`;
  const streamKey = a < z ? `${a}-${z}` : `${z}-${a}`;
  let stream = tcpStreams.map.get(streamKey);
  if (!stream || (flags & 0x02 && !(flags & 0x10) && stream.base[a] !== undefined && stream.base[a] !== seqRaw)) {
    // 새 연결 (같은 주소·포트라도 새 SYN 이면 새 스트림)
    stream = { index: tcpStreams.next++, base: {} };
    tcpStreams.map.set(streamKey, stream);
  }
  if (stream.base[a] === undefined) stream.base[a] = seqRaw;
  const seq = (seqRaw - stream.base[a]) >>> 0;
  const ack = flags & 0x10 && stream.base[z] !== undefined ? (ackRaw - stream.base[z]) >>> 0 : ackRaw;

  const flagNames = TCP_FLAG_NAMES.filter((_, i) => flags & (1 << i));
  const flagBit = (bit, name) =>
    node(`tcp.flags.${name.toLowerCase()}`, `${name}: ${flags & bit ? 'Set' : 'Not set'}`, o + 13, 1);

  // 옵션
  const optionNodes = [];
  const optionInfo = [];
  for (let p = o + 20; p < o + hdrLen && p < b.length; ) {
    const kind = b[p];
    if (kind === 0) {
      optionNodes.push(node('tcp.option_kind', 'End of Option List (EOL)', p, 1));
      break;
    }
    if (kind === 1) {
      optionNodes.push(node('tcp.option_kind', 'No-Operation (NOP)', p, 1));
      p++;
      continue;
    }
    if (p + 1 >= b.length) break;
    const len = b[p + 1];
    if (len < 2) break;
    if (kind === 2 && len === 4) {
      const mss = u16(b, p + 2);
      optionNodes.push(node('tcp.options.mss', `Maximum segment size: ${mss} bytes`, p, len));
      optionInfo.push(`MSS=${mss}`);
      addField(fields, 'tcp.options.mss_val', mss);
    } else if (kind === 3 && len === 3) {
      optionNodes.push(node('tcp.options.wscale', `Window scale: ${b[p + 2]} (multiply by ${1 << b[p + 2]})`, p, len));
      optionInfo.push(`WS=${1 << b[p + 2]}`);
    } else if (kind === 4) {
      optionNodes.push(node('tcp.options.sack_perm', 'SACK permitted', p, len));
      optionInfo.push('SACK_PERM');
    } else if (kind === 8 && len === 10) {
      optionNodes.push(node('tcp.options.timestamp', `Timestamps: TSval ${u32(b, p + 2)}, TSecr ${u32(b, p + 6)}`, p, len));
      optionInfo.push(`TSval=${u32(b, p + 2)} TSecr=${u32(b, p + 6)}`);
    } else if (kind === 5) {
      optionNodes.push(node('tcp.options.sack', `SACK (${(len - 2) / 8} blocks)`, p, len));
    } else {
      optionNodes.push(node('tcp.option_kind', `Option kind ${kind} (${len} bytes)`, p, len));
    }
    p += len;
  }

  const children = [
    node('tcp.srcport', `Source Port: ${sport}`, o, 2),
    node('tcp.dstport', `Destination Port: ${dport}`, o + 2, 2),
    node('tcp.stream', `[Stream index: ${stream.index}]`, o, 0),
    node('tcp.len', `[TCP Segment Len: ${payloadLen}]`, o, 0),
    node('tcp.seq', `Sequence Number: ${seq}    (relative sequence number)`, o + 4, 4),
    node('tcp.seq_raw', `Sequence Number (raw): ${seqRaw}`, o + 4, 4),
    node('tcp.ack', `Acknowledgment Number: ${flags & 0x10 ? ack : 0}${flags & 0x10 ? '    (relative ack number)' : ''}`, o + 8, 4),
    node('tcp.ack_raw', `Acknowledgment number (raw): ${ackRaw}`, o + 8, 4),
    node('tcp.hdr_len', `${bits(b[o + 12] >> 4, 4)} .... = Header Length: ${hdrLen} bytes (${hdrLen / 4})`, o + 12, 1),
    node('tcp.flags', `Flags: ${hex(flags, 3)} (${flagNames.join(', ') || 'None'})`, o + 12, 2, [
      flagBit(0x20, 'URG'),
      flagBit(0x10, 'ACK'),
      flagBit(0x08, 'PSH'),
      node('tcp.flags.reset', `Reset: ${flags & 0x04 ? 'Set' : 'Not set'}`, o + 13, 1),
      flagBit(0x02, 'SYN'),
      flagBit(0x01, 'FIN'),
    ]),
    node('tcp.window_size_value', `Window: ${window}`, o + 14, 2),
    node('tcp.checksum', `Checksum: ${hex(u16(b, o + 16), 4)}`, o + 16, 2),
    node('tcp.urgent_pointer', `Urgent Pointer: ${u16(b, o + 18)}`, o + 18, 2),
  ];
  if (optionNodes.length) {
    children.push(node('tcp.options', `Options: (${hdrLen - 20} bytes)`, o + 20, hdrLen - 20, optionNodes));
  }
  const tcpNode = node(
    'tcp',
    `Transmission Control Protocol, Src Port: ${sport}, Dst Port: ${dport}, Seq: ${seq}${flags & 0x10 ? `, Ack: ${ack}` : ''}, Len: ${payloadLen}`,
    o,
    hdrLen,
    children,
  );
  tree.push(tcpNode);

  protocols.push('TCP');
  addField(fields, 'tcp', true);
  addField(fields, 'tcp.srcport', sport);
  addField(fields, 'tcp.dstport', dport);
  addField(fields, 'tcp.port', sport);
  addField(fields, 'tcp.port', dport);
  addField(fields, 'tcp.stream', stream.index);
  addField(fields, 'tcp.seq', seq);
  addField(fields, 'tcp.seq_raw', seqRaw);
  addField(fields, 'tcp.ack', flags & 0x10 ? ack : 0);
  addField(fields, 'tcp.ack_raw', ackRaw);
  addField(fields, 'tcp.len', payloadLen);
  addField(fields, 'tcp.window_size_value', window);
  addField(fields, 'tcp.flags', flags);
  addField(fields, 'tcp.flags.fin', flags & 0x01 ? 1 : 0);
  addField(fields, 'tcp.flags.syn', flags & 0x02 ? 1 : 0);
  addField(fields, 'tcp.flags.reset', flags & 0x04 ? 1 : 0);
  addField(fields, 'tcp.flags.push', flags & 0x08 ? 1 : 0);
  addField(fields, 'tcp.flags.ack', flags & 0x10 ? 1 : 0);
  addField(fields, 'tcp.flags.urg', flags & 0x20 ? 1 : 0);

  summary.protocol = 'TCP';
  summary.color = flags & 0x04 ? 'rst' : flags & 0x03 ? 'synfin' : 'tcp';
  summary.info =
    `${sport} → ${dport} [${flagNames.filter((f) => f !== 'AE').join(', ')}] Seq=${seq}` +
    `${flags & 0x10 ? ` Ack=${ack}` : ''} Win=${window} Len=${payloadLen}` +
    (optionInfo.length && flags & 0x02 ? ` ${optionInfo.join(' ')}` : '');

  const payloadStart = o + hdrLen;
  const capturedPayload = Math.max(0, Math.min(end, b.length) - payloadStart);
  if (payloadLen > 0 && capturedPayload > 0) {
    addField(fields, 'tcp.payload', true);
    dissectTcpPayload(ctx, payloadStart, capturedPayload, sport, dport, tree);
  }
}

function dissectTcpPayload(ctx, o, len, sport, dport, tree) {
  const { b } = ctx;
  const ports = [sport, dport];
  const startText = ascii(b, o, Math.min(len, 16));

  if (startText.startsWith('SSH-')) return dissectSSHBanner(ctx, o, len, sport, dport, tree);
  if (HTTP_METHODS.some((m) => startText.startsWith(m + ' ')) || startText.startsWith('HTTP/1.')) {
    return dissectHTTP(ctx, o, len, tree);
  }
  if (len >= 5 && b[o] >= 20 && b[o] <= 23 && b[o + 1] === 3 && b[o + 2] <= 4) {
    return dissectTLS(ctx, o, len, tree);
  }
  if (ports.includes(22)) {
    ctx.protocols.push('SSH');
    addField(ctx.fields, 'ssh', true);
    tree.push(node('ssh', `SSH Protocol (암호화된 패킷, ${len} bytes)`, o, len));
    ctx.summary.protocol = 'SSH';
    ctx.summary.info = `${sport === 22 ? 'Server' : 'Client'}: Encrypted packet (len=${len})`;
    return;
  }
  if (ports.includes(53) && len > 2) {
    return dissectDNS(ctx, o + 2, len - 2, tree, o);
  }
  if (ports.some((p) => [80, 8080, 8000].includes(p))) {
    ctx.protocols.push('HTTP');
    ctx.summary.info += ' [HTTP 이어지는 데이터]';
  }
  dissectData(ctx, o, len, tree);
}

function dissectSSHBanner(ctx, o, len, sport, dport, tree) {
  const line = ascii(ctx.b, o, len).split('\r\n')[0].split('\n')[0];
  ctx.protocols.push('SSH');
  addField(ctx.fields, 'ssh', true);
  addField(ctx.fields, 'ssh.protocol', line);
  tree.push(node('ssh', 'SSH Protocol', o, len, [node('ssh.protocol', `Protocol: ${line}`, o, line.length)]));
  ctx.summary.protocol = 'SSHv2';
  ctx.summary.info = `${sport < dport ? 'Server' : 'Client'}: Protocol (${line})`;
}

// ---- HTTP ----

function dissectHTTP(ctx, o, len, tree) {
  const { b, fields, summary, protocols } = ctx;
  const text = ascii(b, o, len);
  const headerEnd = text.indexOf('\r\n\r\n');
  const head = headerEnd >= 0 ? text.slice(0, headerEnd) : text;
  const lines = head.split('\r\n');
  const children = [];
  let pos = o;
  const first = lines[0];
  addField(fields, 'http', true);

  if (first.startsWith('HTTP/')) {
    const [version, code, ...phrase] = first.split(' ');
    addField(fields, 'http.response', true);
    addField(fields, 'http.response.code', Number(code));
    addField(fields, 'http.response.phrase', phrase.join(' '));
    addField(fields, 'http.request.version', version);
    children.push(node('http.response.line', `${first}\\r\\n`, pos, first.length + 2));
  } else {
    const [method, uri, version] = first.split(' ');
    addField(fields, 'http.request', true);
    addField(fields, 'http.request.method', method);
    addField(fields, 'http.request.uri', uri ?? '');
    addField(fields, 'http.request.version', version ?? '');
    children.push(node('http.request.line', `${first}\\r\\n`, pos, first.length + 2));
  }
  pos += first.length + 2;

  const headerFields = {
    host: 'http.host',
    'user-agent': 'http.user_agent',
    'content-type': 'http.content_type',
    server: 'http.server',
  };
  for (const line of lines.slice(1)) {
    const colon = line.indexOf(':');
    if (colon > 0) {
      const name = line.slice(0, colon).toLowerCase();
      if (headerFields[name]) addField(fields, headerFields[name], line.slice(colon + 1).trim());
    }
    children.push(node('http.header', `${line}\\r\\n`, pos, line.length + 2));
    pos += line.length + 2;
  }
  if (headerEnd >= 0) {
    children.push(node('http.end', '\\r\\n', pos, 2));
    pos += 2;
    if (o + len > pos) {
      children.push(node('http.file_data', `File Data: ${o + len - pos} bytes`, pos, o + len - pos));
    }
  }

  tree.push(node('http', 'Hypertext Transfer Protocol', o, len, children));
  protocols.push('HTTP');
  summary.protocol = 'HTTP';
  summary.color = 'http';
  summary.info = first;
}

// ---- TLS ----

function dissectTLS(ctx, o, len, tree) {
  const { b, fields, summary, protocols } = ctx;
  const infos = [];
  let maxVersion = 0;
  const end = o + len;
  let p = o;
  addField(fields, 'tls', true);

  while (p + 5 <= end) {
    const type = b[p];
    const version = u16(b, p + 1);
    const recLen = u16(b, p + 3);
    if (!TLS_CONTENT_TYPES[type] || b[p + 1] !== 3) break;
    const recEnd = Math.min(p + 5 + recLen, end);
    const typeName = TLS_CONTENT_TYPES[type];
    const children = [
      node('tls.record.content_type', `Content Type: ${typeName} (${type})`, p, 1),
      node('tls.record.version', `Version: ${TLS_VERSIONS[version] ?? hex(version, 4)} (${hex(version, 4)})`, p + 1, 2),
      node('tls.record.length', `Length: ${recLen}`, p + 3, 2),
    ];
    addField(fields, 'tls.record.content_type', type);
    addField(fields, 'tls.record.version', version);
    maxVersion = Math.max(maxVersion, version);

    if (type === 22 && recEnd > p + 5) {
      const hsType = b[p + 5];
      const hsName = TLS_HANDSHAKE_TYPES[hsType];
      // 암호화된 handshake(TLS 1.3 이후)는 타입을 알 수 없다
      if (hsName && recEnd >= p + 9) {
        addField(fields, 'tls.handshake.type', hsType);
        const hsChildren = [node('tls.handshake.type', `Handshake Type: ${hsName} (${hsType})`, p + 5, 1)];
        let info = hsName;
        if (hsType === 1 || hsType === 2) {
          const hello = parseHello(b, p + 9, recEnd, hsType === 1);
          if (hello.sni) {
            hsChildren.push(node('tls.handshake.extensions_server_name', `Server Name: ${hello.sni}`, hello.sniOffset, hello.sni.length));
            addField(fields, 'tls.handshake.extensions_server_name', hello.sni);
            info += ` (SNI=${hello.sni})`;
          }
          if (hello.version) maxVersion = Math.max(maxVersion, hello.version);
        }
        children.push(node('tls.handshake', `Handshake Protocol: ${hsName}`, p + 5, recEnd - p - 5, hsChildren));
        infos.push(info);
      } else {
        children.push(node('tls.handshake', 'Handshake Protocol: Encrypted Handshake Message', p + 5, recEnd - p - 5));
        infos.push('Encrypted Handshake Message');
      }
    } else {
      if (type === 23) children.push(node('tls.app_data', `Encrypted Application Data: ${recEnd - p - 5} bytes`, p + 5, recEnd - p - 5));
      infos.push(typeName);
    }
    tree.push(node('tls', `Transport Layer Security - ${TLS_VERSIONS[version] ?? 'TLS'} Record Layer: ${typeName}`, p, recEnd - p, children));
    p += 5 + recLen;
  }

  const label = maxVersion >= 0x0304 ? 'TLSv1.3' : maxVersion === 0x0303 ? 'TLSv1.2' : 'TLS';
  protocols.push('TLS');
  summary.protocol = label;
  summary.info = [...new Set(infos)].join(', ') || 'Continuation Data';
}

/** Client/Server Hello 에서 SNI 와 supported_versions 를 찾는다 */
function parseHello(b, o, end, isClient) {
  const result = {};
  try {
    let p = o + 2 + 32; // version + random
    p += 1 + b[p]; // session id
    if (isClient) {
      p += 2 + u16(b, p); // cipher suites
      p += 1 + b[p]; // compression
    } else {
      p += 2 + 1; // cipher suite + compression
    }
    if (p + 2 > end) return result;
    const extEnd = Math.min(p + 2 + u16(b, p), end);
    p += 2;
    while (p + 4 <= extEnd) {
      const type = u16(b, p);
      const len = u16(b, p + 2);
      const data = p + 4;
      if (type === 0 && isClient && len > 5) {
        const nameLen = u16(b, data + 3);
        result.sni = ascii(b, data + 5, nameLen);
        result.sniOffset = data + 5;
      } else if (type === 43) {
        // 클라이언트는 목록, 서버는 선택한 버전 하나
        result.version = isClient ? Math.max(...readVersions(b, data + 1, data + 1 + b[data])) : u16(b, data);
      }
      p = data + len;
    }
  } catch {
    // 잘린 패킷이면 찾은 만큼만 쓴다
  }
  return result;
}

function readVersions(b, start, end) {
  const list = [0];
  for (let i = start; i + 1 < end; i += 2) {
    const v = u16(b, i);
    if ((v & 0x0f0f) !== 0x0a0a) list.push(v); // GREASE 제외
  }
  return list;
}

// ---- UDP ----

function dissectUDP(ctx, o, end, tree) {
  const { b, fields, summary, protocols } = ctx;
  need(b, o + 8);
  const sport = u16(b, o);
  const dport = u16(b, o + 2);
  const length = u16(b, o + 4);
  tree.push(
    node('udp', `User Datagram Protocol, Src Port: ${sport}, Dst Port: ${dport}`, o, 8, [
      node('udp.srcport', `Source Port: ${sport}`, o, 2),
      node('udp.dstport', `Destination Port: ${dport}`, o + 2, 2),
      node('udp.length', `Length: ${length}`, o + 4, 2),
      node('udp.checksum', `Checksum: ${hex(u16(b, o + 6), 4)}`, o + 6, 2),
    ]),
  );
  protocols.push('UDP');
  addField(fields, 'udp', true);
  addField(fields, 'udp.srcport', sport);
  addField(fields, 'udp.dstport', dport);
  addField(fields, 'udp.port', sport);
  addField(fields, 'udp.port', dport);
  addField(fields, 'udp.length', length);
  summary.protocol = 'UDP';
  summary.color = 'udp';
  summary.info = `${sport} → ${dport} Len=${Math.max(0, length - 8)}`;

  const payloadStart = o + 8;
  const payloadLen = Math.max(0, Math.min(end, b.length) - payloadStart);
  if (payloadLen === 0) return;
  if ([53, 5353, 5355].includes(sport) || [53, 5353, 5355].includes(dport)) {
    return dissectDNS(ctx, payloadStart, payloadLen, tree);
  }
  const app = WELL_KNOWN_UDP[sport] ?? WELL_KNOWN_UDP[dport];
  if (app) {
    protocols.push(app);
    addField(fields, app.toLowerCase(), true);
    tree.push(node(app.toLowerCase(), `${app} (${payloadLen} bytes)`, payloadStart, payloadLen));
    summary.protocol = app;
    return;
  }
  dissectData(ctx, payloadStart, payloadLen, tree);
}

// ---- DNS ----

function readName(b, offset, msgStart) {
  const labels = [];
  let p = offset;
  let end = -1;
  for (let jumps = 0; jumps < 20; jumps++) {
    need(b, p + 1);
    const len = b[p];
    if (len === 0) {
      if (end < 0) end = p + 1;
      return { name: labels.join('.') || '<Root>', end };
    }
    if ((len & 0xc0) === 0xc0) {
      need(b, p + 2);
      if (end < 0) end = p + 2;
      p = msgStart + (((len & 0x3f) << 8) | b[p + 1]);
      continue;
    }
    need(b, p + 1 + len);
    labels.push(ascii(b, p + 1, len));
    p += 1 + len;
  }
  return { name: labels.join('.'), end: end < 0 ? p : end };
}

function dissectDNS(ctx, o, len, tree, tcpLengthOffset) {
  const { b, fields, summary, protocols } = ctx;
  need(b, o + 12);
  const id = u16(b, o);
  const flags = u16(b, o + 2);
  const isResponse = flags >> 15;
  const opcode = (flags >> 11) & 0x0f;
  const rcode = flags & 0x0f;
  const qd = u16(b, o + 4);
  const an = u16(b, o + 6);
  const ns = u16(b, o + 8);
  const ar = u16(b, o + 10);

  protocols.push(ctx.summary.protocol === 'UDP' && (u16(b, o - 8) === 5353 || u16(b, o - 6) === 5353) ? 'MDNS' : 'DNS');
  addField(fields, 'dns', true);
  addField(fields, 'dns.id', id);
  addField(fields, 'dns.flags.response', isResponse);
  addField(fields, 'dns.flags.rcode', rcode);
  addField(fields, 'dns.count.answers', an);

  const children = [];
  if (tcpLengthOffset !== undefined) children.push(node('dns.length', `Length: ${u16(b, tcpLengthOffset)}`, tcpLengthOffset, 2));
  children.push(
    node('dns.id', `Transaction ID: ${hex(id, 4)}`, o, 2),
    node('dns.flags', `Flags: ${hex(flags, 4)} ${isResponse ? 'Standard query response' : 'Standard query'}${rcode ? `, ${DNS_RCODES[rcode] ?? rcode}` : isResponse ? ', No error' : ''}`, o + 2, 2, [
      node('dns.flags.response', `${isResponse}... .... .... .... = Response: Message is a ${isResponse ? 'response' : 'query'}`, o + 2, 2),
      node('dns.flags.opcode', `.${bits(opcode, 4)} ... .... .... = Opcode: ${opcode === 0 ? 'Standard query' : opcode} (${opcode})`, o + 2, 2),
      node('dns.flags.recdesired', `.... ...${(flags >> 8) & 1} .... .... = Recursion desired: ${(flags >> 8) & 1 ? 'Do' : "Don't"} query recursively`, o + 2, 2),
      node('dns.flags.rcode', `.... .... .... ${bits(rcode, 4)} = Reply code: ${DNS_RCODES[rcode] ?? rcode} (${rcode})`, o + 2, 2),
    ]),
    node('dns.count.queries', `Questions: ${qd}`, o + 4, 2),
    node('dns.count.answers', `Answer RRs: ${an}`, o + 6, 2),
    node('dns.count.auth_rr', `Authority RRs: ${ns}`, o + 8, 2),
    node('dns.count.add_rr', `Additional RRs: ${ar}`, o + 10, 2),
  );

  const infoParts = [];
  let p = o + 12;
  try {
    if (qd) {
      const queries = node('dns.queries', 'Queries', p, 0);
      for (let i = 0; i < qd; i++) {
        const { name, end } = readName(b, p, o);
        need(b, end + 4);
        const type = u16(b, end);
        const typeName = DNS_TYPES[type] ?? `TYPE${type}`;
        queries.children.push(node('dns.qry', `${name}: type ${typeName}, class ${u16(b, end + 2) === 1 ? 'IN' : u16(b, end + 2)}`, p, end + 4 - p));
        addField(fields, 'dns.qry.name', name);
        addField(fields, 'dns.qry.type', type);
        infoParts.push(`${typeName} ${name}`);
        p = end + 4;
      }
      queries.length = p - queries.start;
      children.push(queries);
    }
    const sections = [
      ['dns.answers', 'Answers', an],
      ['dns.authority', 'Authoritative nameservers', ns],
      ['dns.additional', 'Additional records', ar],
    ];
    for (const [key, label, count] of sections) {
      if (!count) continue;
      const section = node(key, label, p, 0);
      for (let i = 0; i < count; i++) {
        const { name, end } = readName(b, p, o);
        need(b, end + 10);
        const type = u16(b, end);
        const ttl = u32(b, end + 4);
        const rdLen = u16(b, end + 8);
        const rd = end + 10;
        need(b, rd + rdLen);
        const typeName = DNS_TYPES[type] ?? `TYPE${type}`;
        let value = `${rdLen} bytes`;
        if (type === 1 && rdLen === 4) {
          value = ipv4(b, rd);
          if (key === 'dns.answers') addField(fields, 'dns.a', value);
        } else if (type === 28 && rdLen === 16) {
          value = ipv6(b, rd);
          if (key === 'dns.answers') addField(fields, 'dns.aaaa', value);
        } else if ([2, 5, 12].includes(type)) {
          value = readName(b, rd, o).name;
          if (type === 5) addField(fields, 'dns.cname', value);
        } else if (type === 15) {
          value = `${u16(b, rd)} ${readName(b, rd + 2, o).name}`;
        } else if (type === 16) {
          value = ascii(b, rd + 1, b[rd]);
        }
        if (key === 'dns.answers') {
          addField(fields, 'dns.resp.name', name);
          infoParts.push(`${typeName} ${value}`);
        }
        section.children.push(node(`${key}.rr`, `${name}: type ${typeName}, class IN, ttl ${ttl}, ${typeName === 'A' || typeName === 'AAAA' ? 'addr' : 'data'} ${value}`, p, rd + rdLen - p));
        p = rd + rdLen;
      }
      section.length = p - section.start;
      children.push(section);
    }
  } catch (e) {
    if (!(e instanceof Truncated)) throw e;
    children.push(node('dns.malformed', '[잘린 DNS 메시지]', p, 0));
  }

  tree.push(node('dns', `Domain Name System (${isResponse ? 'response' : 'query'})`, o, len, children));
  summary.protocol = protocols.at(-1);
  summary.color = 'udp';
  summary.info =
    `Standard query${isResponse ? ' response' : ''} ${hex(id, 4)}` +
    `${rcode ? ` ${DNS_RCODES[rcode] ?? rcode}` : ''} ${infoParts.join(' ')}`;
}

// ---- 데이터 ----

function dissectData(ctx, o, len, tree) {
  if (len <= 0) return;
  const shown = Math.min(len, ctx.b.length - o);
  ctx.protocols.push('Data');
  addField(ctx.fields, 'data', true);
  addField(ctx.fields, 'data.len', len);
  tree.push(node('data', `Data (${len} bytes)`, o, shown));
}
