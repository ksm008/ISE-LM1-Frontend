import { useEffect } from 'react';
import { Link } from 'react-router';
import { labPath, labs } from '../data/curriculum.js';
import SessionTimer from '../lab/SessionTimer.jsx';
import TerminalView from '../lab/TerminalView.jsx';
import { useTerminalSession } from '../lab/terminalSession.js';
import '../lab/TerminalLab.css';

// ---- eBPF 모니터링 로그 패널 (비활성화) ----
// 다시 사용하려면 아래 세 곳의 주석을 해제한다.
//   1. 이 import
//   2. 자동 시작 useEffect 와 "실습 시작" 버튼에서 startLab({ deferConnect: true }) 로 변경
//      (SSE 구독이 열린 뒤 터미널을 연결해야 초기 로그가 유실되지 않음)
//   3. 화면 아래쪽의 <EbpfLogPanel /> (터미널 옆에 두려면 .terminal-lab__frame 과 함께 flex 행으로 감싼다)
// import EbpfLogPanel from '../components/EbpfLogPanel.jsx';

const wiresharkPath = labs.find((l) => l.id === 'wireshark').path;

function PipIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="12" y="11.5" width="7.5" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}

function TerminalLabPage() {
  const {
    status,
    expiresAt,
    startLab,
    stopLab,
    renewSession,
    enterPip,
    // labId, connectTerminal, // eBPF 로그 패널을 쓸 때 필요
  } = useTerminalSession();

  // 페이지에 들어오면 실습을 자동으로 시작한다 (진행 중인 실습이 있으면 그대로 이어서 보여 준다).
  // 실습 중에 다른 페이지로 이동하면 자동으로 PIP 가 된다 (TerminalSessionProvider 에서 처리).
  useEffect(() => {
    startLab();
  }, [startLab]);

  return (
    <div className="terminal-lab">
      <div className="terminal-lab__toolbar">
        <Link to={labPath} className="terminal-lab__back">
          ← 실습 목록
        </Link>
        <h1 className="terminal-lab__title">터미널 실습</h1>
        <button
          type="button"
          className="terminal-lab__btn"
          onClick={() => startLab()}
          disabled={status !== 'disconnected'}
        >
          {status === 'connecting' ? '컨테이너 생성 중...' : '실습 시작'}
        </button>
        <button type="button" className="terminal-lab__btn" onClick={stopLab} disabled={status === 'disconnected'}>
          실습 종료
        </button>

        <button
          type="button"
          className="terminal-lab__btn"
          onClick={() => enterPip(wiresharkPath)}
          disabled={status !== 'connected'}
          title="터미널을 PIP 창으로 띄우고 Wireshark 화면에서 이 실습의 패킷을 캡처합니다"
        >
          Wireshark로 캡처
        </button>

        <div className="terminal-lab__session">
          <SessionTimer expiresAt={expiresAt} className="terminal-lab__timer" />
          <button
            type="button"
            className="terminal-lab__icon-btn"
            onClick={enterPip}
            disabled={status === 'disconnected'}
            title="PIP 모드 (메인 페이지로 이동, 실습 중에 다른 페이지로 가도 자동으로 PIP 가 됩니다)"
            aria-label="PIP 모드 (메인 페이지로 이동)"
          >
            <PipIcon />
          </button>
          <button
            type="button"
            className="terminal-lab__btn"
            onClick={renewSession}
            disabled={status !== 'connected'}
            title="지금부터 세션 시간을 다시 처음 길이(기본 10분)로 연장합니다"
          >
            세션 갱신
          </button>
        </div>
      </div>

      <div className="terminal-lab__frame">
        {/* 이 페이지에서는 PIP 가 뜨지 않으므로 터미널은 항상 여기에 붙는다 */}
        <TerminalView className="terminal-lab__screen" />
      </div>

      {/* <EbpfLogPanel labId={labId} onReady={connectTerminal} /> */}
    </div>
  );
}

export default TerminalLabPage;
