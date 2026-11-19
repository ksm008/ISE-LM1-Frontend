import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Link } from 'react-router';
import { labPath } from '../data/curriculum.js';

// 백엔드 주소: .env.local 등에 VITE_API_BASE_URL 로 지정 (기본값 localhost:8080)
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

// 로그 패널에 유지할 최대 줄 수 (초과분은 오래된 것부터 버림)
const MAX_LOGS = 1000;

// crypto.randomUUID 는 보안 컨텍스트(HTTPS/localhost)에서만 존재하므로 대체 구현 제공
function createLabId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sendMessage(ws, message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function TerminalLabPage() {
  const terminalRef = useRef(null);
  const termInstance = useRef(null);
  const wsRef = useRef(null);
  const eventSourceRef = useRef(null);
  const logContainerRef = useRef(null);
  const logSeqRef = useRef(0);
  const stickToBottomRef = useRef(true);

  const [status, setStatus] = useState('disconnected');
  const [logStatus, setLogStatus] = useState('idle'); // idle | connecting | open | reconnecting
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#000000',
        foreground: '#d4d4d4',
        cursor: '#00ff00',
      },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    termInstance.current = term;

    // 백엔드로 보내는 메시지는 JSON: {type:'input', data} / {type:'resize', cols, rows}
    const dataDisposable = term.onData((data) => {
      sendMessage(wsRef.current, { type: 'input', data });
    });
    // fitAddon.fit() 으로 크기가 바뀌면 컨테이너 TTY 크기도 맞춘다
    const resizeDisposable = term.onResize(({ cols, rows }) => {
      sendMessage(wsRef.current, { type: 'resize', cols, rows });
    });

    const handleResize = () => fitAddon.fit();
    const handleBeforeUnload = () => {
      wsRef.current?.close();
      eventSourceRef.current?.close();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      dataDisposable.dispose();
      resizeDisposable.dispose();

      // ref 를 먼저 비워서, 닫힐 때 발생하는 이벤트 핸들러가 dispose 된 터미널을 건드리지 않게 함
      // (다른 페이지로 이동하면 실습 연결도 함께 종료됨)
      const ws = wsRef.current;
      const es = eventSourceRef.current;
      wsRef.current = null;
      eventSourceRef.current = null;
      ws?.close();
      es?.close();

      term.dispose();
      termInstance.current = null;
    };
  }, []);

  // 새 로그가 오면, 사용자가 맨 아래를 보고 있을 때만 자동 스크롤
  useEffect(() => {
    const el = logContainerRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs]);

  const handleLogScroll = () => {
    const el = logContainerRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
  };

  const appendLog = (text) => {
    const id = ++logSeqRef.current;
    setLogs((prev) => {
      const next = [...prev, { id, text }];
      return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
    });
  };

  const startLab = () => {
    if (status !== 'disconnected') return;

    const term = termInstance.current;
    if (!term) return;

    const labId = createLabId();
    term.clear();
    term.writeln('실습 컨테이너 생성 및 eBPF 모니터링 연결 중...');
    setLogs([]);
    stickToBottomRef.current = true;
    setStatus('connecting');
    setLogStatus('connecting');

    // 1. eBPF 로그 SSE 연결
    //    백엔드는 WebSocket 이 연결될 때 로그 스트리밍을 시작하므로, SSE 구독이 열린 뒤에
    //    WebSocket 을 연결해야 초기 로그가 버려지지 않는다.
    const es = new EventSource(`${API_BASE_URL}/api/logs?labId=${encodeURIComponent(labId)}`);
    eventSourceRef.current = es;

    let terminalStarted = false;
    const connectTerminalOnce = () => {
      if (terminalStarted) return;
      terminalStarted = true;
      connectTerminal();
    };

    es.onopen = () => {
      if (eventSourceRef.current !== es) return;
      setLogStatus('open');
      connectTerminalOnce();
    };

    es.onmessage = (event) => {
      if (eventSourceRef.current !== es) return;
      appendLog(event.data);
    };

    es.onerror = () => {
      if (eventSourceRef.current !== es) return;
      if (es.readyState === EventSource.CLOSED) {
        // 브라우저가 재연결을 포기한 경우 (예: 4xx 응답, 잘못된 Content-Type)
        setLogStatus('idle');
        appendLog('[시스템] 모니터링 로그 연결이 종료되었습니다.');
        eventSourceRef.current = null;
      } else {
        // EventSource 가 자동 재연결을 시도하는 중
        setLogStatus('reconnecting');
      }
      // 모니터링 로그 연결에 실패해도 터미널 실습은 진행한다
      // (백엔드가 꺼져 있으면 WebSocket 쪽에서 연결 실패로 정리됨)
      connectTerminalOnce();
    };

    // 2. 터미널 WebSocket 연결
    function connectTerminal() {
      const ws = new WebSocket(`${WS_BASE_URL}/ws/terminal?labId=${encodeURIComponent(labId)}`);
      wsRef.current = ws;

      let opened = false;
      let stoppedByUser = false;
      ws.stopByUser = () => {
        stoppedByUser = true;
        ws.close();
      };

      ws.onopen = () => {
        if (wsRef.current !== ws) return;
        opened = true;
        setStatus('connected');
        term.clear();
        // 컨테이너 TTY 크기를 화면에 맞춘 뒤 프롬프트를 띄운다
        sendMessage(ws, { type: 'resize', cols: term.cols, rows: term.rows });
        sendMessage(ws, { type: 'input', data: '\n' });
      };

      ws.onmessage = (event) => {
        if (wsRef.current !== ws) return;
        term.write(event.data);
      };

      ws.onerror = () => {
        if (wsRef.current !== ws) return;
        term.writeln('\r\n--- 연결 오류 발생 ---');
        // 상태 정리는 항상 뒤따라 오는 onclose 에서 처리
      };

      ws.onclose = (event) => {
        // 이미 다른 세션으로 교체됐거나 언마운트된 경우 무시
        if (wsRef.current !== ws) return;

        if (!opened) {
          term.writeln('\r\n--- 터미널 서버에 연결하지 못했습니다 ---');
        } else if (stoppedByUser) {
          term.writeln('\r\n--- 실습을 종료했습니다 ---');
        } else {
          const reason = event.reason ? ` (${event.reason})` : '';
          term.writeln(`\r\n--- 서버와의 연결이 끊어졌습니다${reason} ---`);
        }

        wsRef.current = null;
        if (eventSourceRef.current === es) {
          es.close();
          eventSourceRef.current = null;
        }
        setLogStatus('idle');
        setStatus('disconnected');
      };
    }
  };

  const stopLab = () => {
    const ws = wsRef.current;
    if (ws) {
      // onclose 에서 SSE 정리와 상태 변경까지 처리됨
      ws.stopByUser();
      return;
    }
    // 아직 SSE 연결을 기다리는 중이면 (WebSocket 연결 전) SSE 만 닫는다
    const es = eventSourceRef.current;
    if (es) {
      eventSourceRef.current = null;
      es.close();
      termInstance.current?.writeln('\r\n--- 실습을 종료했습니다 ---');
      setLogStatus('idle');
      setStatus('disconnected');
    }
  };

  const logStatusLabel = {
    idle: '',
    connecting: '연결 중...',
    open: '수신 중',
    reconnecting: '재연결 중...',
  }[logStatus];

  return (
    <div style={{ flex: 1, padding: '20px 16px', backgroundColor: '#121212', color: '#fff' }}>
      <div
        style={{
          marginBottom: '12px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Link to={labPath} style={{ color: '#888', fontSize: '14px', textDecoration: 'none' }}>
          ← 실습 목록
        </Link>
        <h1 style={{ margin: '0 12px 0 4px', fontSize: '18px' }}>터미널 실습</h1>
        <button
          onClick={startLab}
          disabled={status !== 'disconnected'}
          style={{ padding: '8px 16px', cursor: status === 'disconnected' ? 'pointer' : 'not-allowed' }}
        >
          {status === 'connecting' ? '컨테이너 생성 중...' : '실습 시작'}
        </button>
        <button
          onClick={stopLab}
          disabled={status === 'disconnected'}
          style={{ padding: '8px 16px', cursor: status !== 'disconnected' ? 'pointer' : 'not-allowed' }}
        >
          실습 종료
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', height: '550px' }}>
        <div
          ref={terminalRef}
          style={{
            flex: 2,
            minWidth: 0,
            border: '1px solid #333',
            textAlign: 'left',
            backgroundColor: '#000000',
          }}
        />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #333',
            backgroundColor: '#0a0a0a',
            textAlign: 'left',
            fontFamily: 'Consolas, monospace',
            fontSize: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: '#fff',
              fontWeight: 'bold',
              padding: '10px 10px 4px',
              borderBottom: '1px solid #333',
            }}
          >
            <span>실시간 eBPF 모니터링 로그</span>
            <span style={{ fontWeight: 'normal', color: logStatus === 'reconnecting' ? '#ffb347' : '#888' }}>
              {logStatusLabel}
            </span>
          </div>
          <div
            ref={logContainerRef}
            onScroll={handleLogScroll}
            style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', color: '#00ff88' }}
          >
            {logs.map((log) => (
              <div key={log.id} style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
                {log.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TerminalLabPage;
