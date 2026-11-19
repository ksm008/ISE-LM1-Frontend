import { createContext, useContext } from 'react';

// 터미널 실습 세션 (TerminalSessionProvider 가 제공)
export const TerminalSessionContext = createContext(null);

export const terminalLabPath = '/lab/terminal';

export function useTerminalSession() {
  const ctx = useContext(TerminalSessionContext);
  if (!ctx) {
    throw new Error('useTerminalSession 은 TerminalSessionProvider 안에서만 사용할 수 있습니다.');
  }
  return ctx;
}
