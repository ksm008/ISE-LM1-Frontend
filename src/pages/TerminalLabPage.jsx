import { Link } from 'react-router';
import { labPath } from '../data/curriculum.js';
import SessionTimer from '../lab/SessionTimer.jsx';
import TerminalView from '../lab/TerminalView.jsx';
import { useTerminalSession } from '../lab/terminalSession.js';
import '../lab/TerminalLab.css';

// ---- eBPF 모니터링 로그 패널 (비활성화) ----
// 다시 사용하려면 아래 세 곳의 주석을 해제한다.
//   1. 이 import
//   2. "실습 시작" 버튼의 onClick 을 () => startLab({ deferConnect: true }) 로 변경
//      (SSE 구독이 열린 뒤 터미널을 연결해야 초기 로그가 유실되지 않음)
//   3. 화면 아래쪽의 <EbpfLogPanel /> (터미널 옆에 두려면 .terminal-lab__frame 과 함께 flex 행으로 감싼다)
// import EbpfLogPanel from '../components/EbpfLogPanel.jsx';

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
    pip,
    startLab,
    stopLab,
    renewSession,
    enterPip,
    exitPip,
    // labId, connectTerminal, // eBPF 로그 패널을 쓸 때 필요
  } = useTerminalSession();

  // PIP 가 아닌 상태로 이 페이지를 벗어나면 실습이 종료된다 (TerminalSessionProvider 에서 처리)

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

        <div className="terminal-lab__session">
          <SessionTimer expiresAt={expiresAt} className="terminal-lab__timer" />
          <button
            type="button"
            className="terminal-lab__icon-btn"
            onClick={pip ? exitPip : enterPip}
            title={pip ? '원래 화면으로' : 'PIP 모드 (메인 페이지로 이동)'}
            aria-label={pip ? '원래 화면으로' : 'PIP 모드 (메인 페이지로 이동)'}
            aria-pressed={pip}
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
        {pip ? (
          <div className="terminal-lab__pip-placeholder">
            <span>PIP 모드에서 실습 중입니다. 다른 페이지로 이동해도 실습이 유지됩니다.</span>
            <button type="button" className="terminal-lab__btn" onClick={exitPip}>
              원래 화면으로
            </button>
          </div>
        ) : (
          <TerminalView className="terminal-lab__screen" />
        )}
      </div>

      {/* <EbpfLogPanel labId={labId} onReady={connectTerminal} /> */}
    </div>
  );
}

export default TerminalLabPage;
