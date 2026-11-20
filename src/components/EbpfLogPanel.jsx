import { useEffect, useRef, useState } from 'react';

// 현재 터미널 실습 페이지에서는 사용하지 않는다 (TerminalLabPage 의 주석 참고).

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');

// 로그 패널에 유지할 최대 줄 수 (초과분은 오래된 것부터 버림)
const MAX_LOGS = 1000;

const LOG_STATUS_LABEL = {
  idle: '',
  connecting: '연결 중...',
  open: '수신 중',
  reconnecting: '재연결 중...',
};

/**
 * 실시간 eBPF 모니터링 로그 패널.
 * labId 가 생기면 /api/logs SSE 를 구독하고, labId 가 null 이 되면(실습 종료) 구독을 닫는다.
 * onReady(labId): SSE 가 열렸거나(실패 포함) 더 기다릴 필요가 없을 때 한 번 호출된다.
 * 백엔드는 WebSocket 연결 때 로그 스트리밍을 시작하므로, 여기서 터미널을 연결해야 초기 로그가 유실되지 않는다.
 */
function EbpfLogPanel({ labId, onReady }) {
  const [logs, setLogs] = useState([]);
  const [logStatus, setLogStatus] = useState('idle'); // idle | connecting | open | reconnecting
  const containerRef = useRef(null);
  const seqRef = useRef(0);
  const stickToBottomRef = useRef(true);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  });

  // 새 실습이 시작되면 이전 로그를 지운다 (렌더 중 상태 조정)
  const [prevLabId, setPrevLabId] = useState(labId);
  if (labId !== prevLabId) {
    setPrevLabId(labId);
    if (labId) {
      setLogs([]);
      setLogStatus('connecting');
    }
  }

  useEffect(() => {
    if (!labId) return;

    const appendLog = (text) => {
      const id = ++seqRef.current;
      setLogs((prev) => {
        const next = [...prev, { id, text }];
        return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
      });
    };

    stickToBottomRef.current = true;

    // 로그인 세션 쿠키를 함께 보낸다 (/api/logs 는 로그인 필요)
    const es = new EventSource(`${API_BASE_URL}/api/logs?labId=${encodeURIComponent(labId)}`, { withCredentials: true });
    let ready = false;
    const notifyReady = () => {
      if (ready) return;
      ready = true;
      onReadyRef.current?.(labId);
    };

    es.onopen = () => {
      setLogStatus('open');
      notifyReady();
    };
    es.onmessage = (event) => appendLog(event.data);
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        // 브라우저가 재연결을 포기한 경우 (예: 4xx 응답, 잘못된 Content-Type)
        setLogStatus('idle');
        appendLog('[시스템] 모니터링 로그 연결이 종료되었습니다.');
      } else {
        // EventSource 가 자동 재연결을 시도하는 중
        setLogStatus('reconnecting');
      }
      // 모니터링 로그 연결에 실패해도 터미널 실습은 진행한다
      notifyReady();
    };

    return () => {
      es.close();
      setLogStatus('idle');
    };
  }, [labId]);

  // 새 로그가 오면, 사용자가 맨 아래를 보고 있을 때만 자동 스크롤
  useEffect(() => {
    const el = containerRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
  };

  return (
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
          {LOG_STATUS_LABEL[logStatus]}
        </span>
      </div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', color: '#00ff88' }}
      >
        {logs.map((log) => (
          <div key={log.id} style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
            {log.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default EbpfLogPanel;
