import PipFrame, { PipButton, RestoreIcon } from './PipFrame.jsx';
import SessionTimer from './SessionTimer.jsx';
import TerminalView from './TerminalView.jsx';
import { useTerminalSession } from './terminalSession.js';

// PIP 모드일 때 화면 위에 떠 있는 터미널 창. 페이지를 이동해도 유지된다.
// 막대: 원래 화면으로 / 세션 갱신 / 남은 시간, 맨 오른쪽 종료(×)
function TerminalPip() {
  const { pip, status, expiresAt, exitPip, closePip, renewSession } = useTerminalSession();
  if (!pip) return null;

  return (
    <PipFrame
      label="터미널 실습 PIP"
      corner="right"
      onClose={closePip}
      closeTitle="실습 종료"
      bar={
        <>
          <PipButton onClick={exitPip} title="원래 화면으로">
            <RestoreIcon />
            원래 화면으로
          </PipButton>
          <PipButton
            onClick={renewSession}
            disabled={status !== 'connected'}
            title="지금부터 세션 시간을 다시 처음 길이(기본 10분)로 연장합니다"
          >
            세션 갱신
          </PipButton>
          <SessionTimer expiresAt={expiresAt} label="" className="terminal-pip__timer" />
        </>
      }
    >
      <TerminalView className="terminal-pip__body" />
    </PipFrame>
  );
}

export default TerminalPip;
