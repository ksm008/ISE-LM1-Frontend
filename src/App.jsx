import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

function App() {
  const terminalRef = useRef(null);
  const termInstance = useRef(null);
  const wsRef = useRef(null);
  const eventSourceRef = useRef(null);
  const [status, setStatus] = useState('disconnected');
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

    const dataDisposable = term.onData((data) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(data);
      }
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
      wsRef.current?.close();
      eventSourceRef.current?.close();
      term.dispose();
    };
  }, []);

  const startLab = () => {
    if (status !== 'disconnected') return;

    const labId = crypto.randomUUID();
    const term = termInstance.current;
    term.clear();
    term.writeln('실습 컨테이너 생성 및 eBPF 모니터링 연결 중...');
    setLogs([]);
    setStatus('connecting');

    // 1. eBPF 로그 SSE 연결
    const es = new EventSource(`http://localhost:8080/api/logs?labId=${labId}`);
    eventSourceRef.current = es;
    es.onmessage = (event) => {
      setLogs((prev) => [...prev, event.data]);
    };

    // 2. 터미널 WebSocket 연결
    const ws = new WebSocket(`ws://localhost:8080/ws/terminal?labId=${labId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      term.clear();
      ws.send('\n');
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onerror = () => {
      term.writeln('\r\n--- 연결 오류 발생 ---');
      setStatus('disconnected');
    };

    ws.onclose = () => {
      term.writeln('\r\n--- 실습 종료 (컨테이너 자동 삭제 완료) ---');
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      setStatus('disconnected');
      wsRef.current = null;
    };
  };

  const stopLab = () => {
    wsRef.current?.close();
    eventSourceRef.current?.close();
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#121212', minHeight: '100vh', color: '#fff' }}>
      <div style={{ marginBottom: '10px', display: 'flex', gap: '8px' }}>
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
            border: '1px solid #333',
            textAlign: 'left',
            backgroundColor: '#000000',
          }}
        />
        <div
          style={{
            flex: 1,
            border: '1px solid #333',
            backgroundColor: '#0a0a0a',
            padding: '10px',
            overflowY: 'auto',
            textAlign: 'left',
            fontFamily: 'Consolas, monospace',
            fontSize: '12px',
            color: '#00ff88',
          }}
        >
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #333', paddingBottom: '4px' }}>
            실시간 eBPF 모니터링 로그
          </div>
          {logs.map((log, idx) => (
            <div key={idx} style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;