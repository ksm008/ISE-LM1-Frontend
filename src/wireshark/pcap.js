// pcap 파일 저장 / 열기 (pcapng 는 지원하지 않는다)

/** 패킷 목록을 pcap 파일(Blob)로 만든다. packets: [{ s, us, len, bytes }] */
export function buildPcap(linkType, packets, snaplen = 262144) {
  const size = 24 + packets.reduce((sum, p) => sum + 16 + p.bytes.length, 0);
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  const out = new Uint8Array(buffer);
  view.setUint32(0, 0xa1b2c3d4, true);
  view.setUint16(4, 2, true);
  view.setUint16(6, 4, true);
  view.setUint32(16, snaplen, true);
  view.setUint32(20, linkType, true);
  let o = 24;
  for (const p of packets) {
    view.setUint32(o, p.s, true);
    view.setUint32(o + 4, p.us, true);
    view.setUint32(o + 8, p.bytes.length, true);
    view.setUint32(o + 12, p.len, true);
    out.set(p.bytes, o + 16);
    o += 16 + p.bytes.length;
  }
  return new Blob([buffer], { type: 'application/vnd.tcpdump.pcap' });
}

/** pcap 파일을 읽는다. @returns {{ linkType, packets: [{ no, s, us, len, bytes }] }} */
export function parsePcap(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  if (arrayBuffer.byteLength < 24) throw new Error('pcap 파일이 아닙니다.');
  const magic = view.getUint32(0, false);
  let little;
  let nanos = false;
  if (magic === 0xa1b2c3d4) little = false;
  else if (magic === 0xd4c3b2a1) little = true;
  else if (magic === 0xa1b23c4d) [little, nanos] = [false, true];
  else if (magic === 0x4d3cb2a1) [little, nanos] = [true, true];
  else if (magic === 0x0a0d0d0a) throw new Error('pcapng 형식은 지원하지 않습니다. Wireshark 에서 pcap 형식으로 저장해 주세요.');
  else throw new Error('pcap 파일이 아닙니다.');

  const linkType = view.getUint32(20, little) & 0x0fffffff;
  const packets = [];
  let o = 24;
  while (o + 16 <= arrayBuffer.byteLength) {
    const s = view.getUint32(o, little);
    const frac = view.getUint32(o + 4, little);
    const capLen = view.getUint32(o + 8, little);
    const len = view.getUint32(o + 12, little);
    if (o + 16 + capLen > arrayBuffer.byteLength) break; // 잘린 마지막 패킷
    packets.push({
      no: packets.length + 1,
      s,
      us: nanos ? Math.floor(frac / 1000) : frac,
      len,
      bytes: new Uint8Array(arrayBuffer.slice(o + 16, o + 16 + capLen)),
    });
    o += 16 + capLen;
  }
  return { linkType, packets };
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
