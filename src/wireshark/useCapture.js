import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_BASE_URL } from '../config.js';
import { createDissector } from './dissect.js';
import { buildPcap, downloadBlob, parsePcap } from './pcap.js';

// 캡처한 패킷 묶음. 패킷 = { no, s, us, len, bytes, summary, tree, fields }
function createStore(linkType, source) {
  return { linkType, source, list: [], dissect: linkType === null ? null : createDissector(linkType) };
}

function base64ToBytes(text) {
  const raw = atob(text);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function addPacket(store, packet) {
  let result;
  try {
    result = store.dissect(packet);
  } catch (e) {
    // 해석기 버그가 있어도 목록에는 남긴다
    console.error('패킷 해석 실패', packet.no, e);
    result = {
      summary: { src: '', dst: '', protocol: 'Error', info: '패킷을 해석하지 못했습니다.', color: 'other' },
      tree: [{ key: 'frame', label: `Frame ${packet.no}`, start: 0, length: packet.bytes.length, children: [] }],
      fields: new Map([['frame.number', [packet.no]]]),
    };
  }
  store.list.push({ ...packet, ...result });
}

/**
 * 패킷 캡처 WebSocket (/ws/capture?labId=) 연결과 캡처한 패킷을 관리한다.
 * labId 가 없으면(실습 중이 아니면) 연결하지 않는다. 파일 열기는 실습 없이도 된다.
 */
export function useCapture(labId) {
  // 연결 상태는 labId 별로 기록하고, 현재 labId 의 것만 쓴다 (ready | capturing | closed)
  const [link, setLink] = useState({ labId: null, status: null });
  const [interfaces, setInterfaces] = useState(['any']);
  const [notice, setNotice] = useState(null); // { text, error }
  const [version, setVersion] = useState(0); // 패킷이 바뀔 때마다 증가
  const [store, setStore] = useState(() => createStore(null, null));
  const storeRef = useRef(store); // WebSocket 핸들러에서 쓰는 최신 store
  const wsRef = useRef(null);

  const bump = () => setVersion((v) => v + 1);
  const replaceStore = (next) => {
    storeRef.current = next;
    setStore(next);
  };

  const linkStatus = !labId ? 'idle' : link.labId === labId && link.status ? link.status : 'connecting';
  const connection = linkStatus === 'capturing' ? 'ready' : linkStatus; // idle | connecting | ready | closed
  const capturing = linkStatus === 'capturing';

  useEffect(() => {
    if (!labId) return undefined;
    const ws = new WebSocket(`${WS_BASE_URL}/ws/capture?labId=${encodeURIComponent(labId)}`);
    wsRef.current = ws;
    let closedByUs = false;
    const setStatus = (status) => setLink({ labId, status });

    ws.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      switch (message.type) {
        case 'ready':
          setStatus('ready');
          if (Array.isArray(message.interfaces) && message.interfaces.length) setInterfaces(message.interfaces);
          break;
        case 'started': {
          replaceStore(createStore(message.linkType, 'live'));
          setStatus('capturing');
          const filter = message.filter ? ` (필터: ${message.filter})` : '';
          setNotice({ text: `${message.interface} 에서 캡처 중${filter}` });
          bump();
          break;
        }
        case 'packets': {
          const store = storeRef.current;
          if (!store.dissect || store.source !== 'live') break;
          for (const p of message.packets ?? []) {
            addPacket(store, { no: p.no, s: p.s, us: p.us, len: p.len, bytes: base64ToBytes(p.data) });
          }
          bump();
          break;
        }
        case 'stopped':
          setStatus('ready');
          setNotice({ text: `${message.reason} (패킷 ${message.packets}개)`, error: Boolean(message.error) });
          break;
        case 'error':
          setNotice({ text: message.message, error: true });
          break;
        default:
          break;
      }
    };

    ws.onclose = (event) => {
      if (wsRef.current === ws) wsRef.current = null;
      if (closedByUs) return;
      setStatus('closed');
      setNotice({ text: `캡처 서버와 연결이 끊어졌습니다${event.reason ? ` (${event.reason})` : ''}`, error: true });
    };

    return () => {
      closedByUs = true;
      ws.close();
    };
  }, [labId]);

  const send = (message) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  };

  const start = useCallback((iface, filter) => send({ type: 'start', interface: iface, filter }), []);
  const stop = useCallback(() => send({ type: 'stop' }), []);

  /** 목록만 비운다 (캡처 중이면 이후 패킷은 계속 쌓인다) */
  const clear = useCallback(() => {
    const current = storeRef.current;
    replaceStore(createStore(current.linkType, current.source));
  }, []);

  const openFile = useCallback(async (file) => {
    try {
      const { linkType, packets } = parsePcap(await file.arrayBuffer());
      send({ type: 'stop' });
      const store = createStore(linkType, 'file');
      packets.forEach((p) => addPacket(store, p));
      replaceStore(store);
      setNotice({ text: `${file.name} 을(를) 열었습니다 (패킷 ${packets.length}개)` });
      bump();
    } catch (e) {
      setNotice({ text: e.message, error: true });
    }
  }, []);

  const save = useCallback((packets) => {
    const current = storeRef.current;
    if (current.linkType === null || packets.length === 0) return;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
    downloadBlob(buildPcap(current.linkType, packets), `capture-${stamp}.pcap`);
  }, []);

  return {
    connection,
    capturing,
    interfaces,
    notice,
    version,
    store,
    start,
    stop,
    clear,
    openFile,
    save,
  };
}
