import { createContext, useContext } from 'react';

// 라우터 실습 세션 (RouterSessionProvider 가 제공)
export const RouterSessionContext = createContext(null);

export const routerLabPath = '/lab/router';

export function useRouterSession() {
  const ctx = useContext(RouterSessionContext);
  if (!ctx) {
    throw new Error('useRouterSession 은 RouterSessionProvider 안에서만 사용할 수 있습니다.');
  }
  return ctx;
}
