import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { TerminalSessionContext, terminalLabPath } from './terminalSession.js';

// 백엔드 주소: .env.local 등에 VITE_API_BASE_URL 로 지정 (기본값 localhost:8080)
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

// 세션 만료 이 시간 전에 터미널에 안내를 띄운다
const EXPIRY_WARNING_MS = 60_000;

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

// 백엔드로 보내는 메시지는 JSON: {type:'input', data} / {type:'resize', cols, rows} / {type:'renew'}
function sendMessage(ws, message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * 터미널 실습 세션을 앱 전체에서 관리한다.
 * xterm 인스턴스는 하나만 만들고, 실습 페이지 / PIP 창 중 보이는 곳(TerminalView)으로 DOM 을 옮겨 붙인다.
 * 그래서 PIP 모드에서는 다른 페이지로 이동해도 실습이 유지된다.
 */
function TerminalSessionProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const hostRef = useRef(null); // xterm 이 들어 있는 div
  const termRef = useRef(null);
  const fitRef = useRef(null);
  const wsRef = useRef(null);
  const labIdRef = useRef(null);

  const [status, setStatus] = useState('disconnected'); // disconnected | connecting | connected
  const [labId, setLabId] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null); // 세션 만료 시각 (ms)
  const [pip, setPip] = useState(false);

  const getHost = useCallback(() => {
    if (!hostRef.current) {
      const host = document.createElement('div');
      host.className = 'terminal-host';
      hostRef.current = host;
    }
    return hostRef.current;
  }, []);

  const fitTerminal = useCallback(() => {
    const host = hostRef.current;
    if (!fitRef.current || !host?.isConnected || host.clientWidth === 0 || host.clientHeight === 0) return;
    try {
      fitRef.current.fit();
    } catch {
      // 화면에 붙어 있지 않은 순간에는 크기를 계산하지 못할 수 있음
    }
  }, []);

  // 터미널을 보여줄 자리(slot)에 xterm 을 붙인다. 처음 붙을 때 xterm 을 만든다.
  const attachTerminal = useCallback(
    (slot) => {
      const host = getHost();
      slot.appendChild(host);

      if (!termRef.current) {
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
        term.open(host);
        term.onData((data) => sendMessage(wsRef.current, { type: 'input', data }));
        // 크기가 바뀌면 컨테이너 TTY 크기도 맞춘다
        term.onResize(({ cols, rows }) => sendMessage(wsRef.current, { type: 'resize', cols, rows }));
        termRef.current = term;
        fitRef.current = fitAddon;
      }

      fitTerminal();
      termRef.current.focus();
    },
    [getHost, fitTerminal],
  );

  const detachTerminal = useCallback((slot) => {
    const host = hostRef.current;
    if (host && host.parentNode === slot) {
      slot.removeChild(host);
    }
  }, []);

  // 터미널 영역 크기가 바뀌면(창 크기, PIP 크기 조절, 자리 이동) 다시 맞춘다
  useEffect(() => {
    const observer = new ResizeObserver(() => fitTerminal());
    observer.observe(getHost());
    return () => observer.disconnect();
  }, [getHost, fitTerminal]);

  useEffect(() => {
    const handleBeforeUnload = () => wsRef.current?.close();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const connectTerminal = useCallback((id) => {
    const term = termRef.current;
    // 이미 연결 중이거나, 그 사이 다른 실습으로 바뀐 경우 무시
    if (!term || wsRef.current || id !== labIdRef.current) return;

    const ws = new WebSocket(`${WS_BASE_URL}/ws/terminal?labId=${encodeURIComponent(id)}`);
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
      term.clear();
      // 서버는 셸이 준비된 뒤 이 메시지들을 처리한다. 컨테이너 TTY 크기를 화면에 맞춘 뒤 프롬프트를 띄운다.
      sendMessage(ws, { type: 'resize', cols: term.cols, rows: term.rows });
      sendMessage(ws, { type: 'input', data: '\n' });
    };

    ws.onmessage = (event) => {
      if (wsRef.current !== ws) return;
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message.type === 'output' && typeof message.data === 'string') {
        term.write(message.data);
      } else if (message.type === 'session' && Number.isFinite(message.remainingSeconds)) {
        // 셸 준비 완료(첫 메시지) 또는 세션 갱신
        setStatus('connected');
        setExpiresAt(Date.now() + message.remainingSeconds * 1000);
      }
    };

    ws.onerror = () => {
      if (wsRef.current !== ws) return;
      term.writeln('\r\n--- 연결 오류 발생 ---');
      // 상태 정리는 항상 뒤따라 오는 onclose 에서 처리
    };

    ws.onclose = (event) => {
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
      labIdRef.current = null;
      setLabId(null);
      setExpiresAt(null);
      setStatus('disconnected');
    };
  }, []);

  /**
   * 실습을 시작한다.
   * deferConnect: true 이면 WebSocket 을 바로 연결하지 않는다. eBPF 로그 패널(EbpfLogPanel)을 쓸 때
   * SSE 구독이 열린 뒤 onReady 에서 connectTerminal(labId) 을 호출하기 위한 옵션 (초기 로그 유실 방지).
   */
  const startLab = useCallback(
    ({ deferConnect = false } = {}) => {
      const term = termRef.current;
      if (!term || labIdRef.current) return;

      const id = createLabId();
      labIdRef.current = id;
      term.clear();
      term.writeln('실습 컨테이너 생성 중...');
      setLabId(id);
      setStatus('connecting');

      if (!deferConnect) {
        connectTerminal(id);
      }
    },
    [connectTerminal],
  );

  const stopLab = useCallback(() => {
    const ws = wsRef.current;
    if (ws) {
      // onclose 에서 상태 정리까지 처리됨
      ws.stopByUser();
      return;
    }
    // WebSocket 연결 전(deferConnect 대기 중)이면 상태만 되돌린다
    if (labIdRef.current) {
      labIdRef.current = null;
      termRef.current?.writeln('\r\n--- 실습을 종료했습니다 ---');
      setLabId(null);
      setStatus('disconnected');
    }
  }, []);

  const renewSession = useCallback(() => {
    sendMessage(wsRef.current, { type: 'renew' });
  }, []);

  // 만료 1분 전 안내 (PIP 모드에서는 갱신 버튼이 보이지 않으므로 터미널에 띄운다)
  useEffect(() => {
    if (!expiresAt) return;
    const delay = expiresAt - Date.now() - EXPIRY_WARNING_MS;
    if (delay <= 0) return;
    const timer = setTimeout(() => {
      termRef.current?.writeln(
        '\r\n\x1b[33m[알림] 1분 후 세션이 만료됩니다. 실습 페이지의 "세션 갱신" 버튼으로 연장할 수 있습니다.\x1b[0m',
      );
    }, delay);
    return () => clearTimeout(timer);
  }, [expiresAt]);

  // PIP 로 전환하면 메인 페이지로 이동한다 (PIP 창에서 실습을 이어감)
  const enterPip = useCallback(() => {
    setPip(true);
    navigate('/');
  }, [navigate]);

  // PIP 창의 종료 버튼: 실습을 끝내고 PIP 를 닫는다
  const closePip = useCallback(() => {
    stopLab();
    setPip(false);
  }, [stopLab]);

  // 다른 페이지에서 PIP 를 닫으면 실습 페이지로 이동한 뒤 PIP 를 해제한다
  // (먼저 해제하면 아래 effect 가 "PIP 아닌 상태로 실습 페이지 밖"으로 보고 실습을 종료함)
  const pendingPipExitRef = useRef(false);
  const exitPip = useCallback(() => {
    if (location.pathname === terminalLabPath) {
      setPip(false);
    } else {
      pendingPipExitRef.current = true;
      navigate(terminalLabPath);
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (location.pathname === terminalLabPath) {
      if (pendingPipExitRef.current) {
        pendingPipExitRef.current = false;
        setPip(false);
      }
      // 실습이 끝난 뒤 다시 들어오면 이전 실습 화면을 지운다 (진행 중인 실습은 그대로)
      if (!labIdRef.current) {
        termRef.current?.reset();
      }
    } else if (!pip) {
      // PIP 가 아닌 상태로 실습 페이지를 벗어나면 실습을 종료한다 (PIP 모드에서는 다른 페이지에서도 유지)
      stopLab();
    }
  }, [location.pathname, pip, stopLab]);

  const value = useMemo(
    () => ({
      status,
      labId,
      expiresAt,
      pip,
      startLab,
      stopLab,
      connectTerminal,
      renewSession,
      enterPip,
      exitPip,
      closePip,
      attachTerminal,
      detachTerminal,
    }),
    [
      status,
      labId,
      expiresAt,
      pip,
      startLab,
      stopLab,
      connectTerminal,
      renewSession,
      enterPip,
      exitPip,
      closePip,
      attachTerminal,
      detachTerminal,
    ],
  );

  return <TerminalSessionContext.Provider value={value}>{children}</TerminalSessionContext.Provider>;
}

export default TerminalSessionProvider;
