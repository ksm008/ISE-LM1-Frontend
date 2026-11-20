import PipFrame, { PipButton, RestoreIcon } from '../lab/PipFrame.jsx';
import RouterView from './RouterView.jsx';
import { useRouterSession } from './routerContext.js';
import './RouterLab.css';

// 라우터 콘솔 PIP. 터미널 PIP 와 겹치지 않도록 왼쪽 아래에서 시작한다.
// 막대: 원래 화면으로, 맨 오른쪽 종료(×, 전원 끄기)
function RouterPip() {
  const { pip, exitPip, powerOff } = useRouterSession();
  if (!pip) return null;

  return (
    <PipFrame
      label="라우터 설정 실습 PIP"
      corner="left"
      onClose={powerOff}
      closeTitle="라우터 끄기 (저장하지 않은 설정은 사라짐)"
      bar={
        <>
          <PipButton onClick={exitPip} title="원래 화면으로">
            <RestoreIcon />
            원래 화면으로
          </PipButton>
          <span className="router-pip__label">라우터 콘솔</span>
        </>
      }
    >
      <RouterView className="terminal-pip__body router-pip__body" />
    </PipFrame>
  );
}

export default RouterPip;
