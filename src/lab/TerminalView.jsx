import { useEffect, useRef } from 'react';
import { useTerminalSession } from './terminalSession.js';

// 실습 터미널(xterm)을 이 자리에 붙여서 보여준다. 한 번에 하나의 TerminalView 만 렌더링한다.
function TerminalView({ className }) {
  const { attachTerminal, detachTerminal } = useTerminalSession();
  const slotRef = useRef(null);

  useEffect(() => {
    const slot = slotRef.current;
    attachTerminal(slot);
    return () => detachTerminal(slot);
  }, [attachTerminal, detachTerminal]);

  return <div ref={slotRef} className={className} />;
}

export default TerminalView;
