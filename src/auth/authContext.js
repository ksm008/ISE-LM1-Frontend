import { createContext, useContext } from 'react';

// 로그인 상태 (AuthProvider 가 제공)
export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth 는 AuthProvider 안에서만 사용할 수 있습니다.');
  }
  return ctx;
}

/** 로그인 후 돌아갈 경로. 외부 주소로 보내지 않도록 사이트 안의 경로만 허용한다. */
export function safeNext(next) {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
