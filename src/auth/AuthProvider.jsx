import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { AuthContext } from './authContext.js';

const ANONYMOUS = { authenticated: false, active: false };

/**
 * 로그인 상태를 앱 전체에 제공한다.
 * me: null(확인 중) | { authenticated, username, email, role, emailVerified, active, googleLinked, googleEmail }
 *   active: 이메일 인증을 마쳤거나 관리자 → 사이트를 이용할 수 있음
 */
function AuthProvider({ children }) {
  const [me, setMe] = useState(null);
  const [config, setConfig] = useState({ googleEnabled: false, mailEnabled: true });

  const refresh = useCallback(async () => {
    try {
      setMe(await api('/api/auth/me'));
    } catch (e) {
      setMe({ ...ANONYMOUS, error: e.message });
    }
  }, []);

  // 처음 한 번 로그인 상태와 서버 기능 설정을 불러온다
  useEffect(() => {
    let cancelled = false;
    api('/api/auth/me')
      .then((data) => !cancelled && setMe(data))
      .catch((e) => !cancelled && setMe({ ...ANONYMOUS, error: e.message }));
    api('/api/auth/config')
      .then((data) => !cancelled && setConfig(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await api('/api/auth/login', { method: 'POST', body: { username, password } });
    setMe(data);
    return data;
  }, []);

  const signup = useCallback(async (form) => {
    const result = await api('/api/auth/signup', { method: 'POST', body: form });
    setMe(result.me);
    return result;
  }, []);

  const signupWithGoogle = useCallback(async (form) => {
    const result = await api('/api/auth/signup/google', { method: 'POST', body: form });
    setMe(result.me);
    return result;
  }, []);

  const sendCode = useCallback(() => api('/api/auth/email/send', { method: 'POST' }), []);

  const verifyCode = useCallback(async (code) => {
    const data = await api('/api/auth/email/verify', { method: 'POST', body: { code } });
    setMe(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      setMe(ANONYMOUS);
    }
  }, []);

  const unlinkGoogle = useCallback(async () => {
    const data = await api('/api/auth/google/unlink', { method: 'POST' });
    setMe(data);
    return data;
  }, []);

  const value = useMemo(
    () => ({ me, config, refresh, login, signup, signupWithGoogle, sendCode, verifyCode, logout, unlinkGoogle }),
    [me, config, refresh, login, signup, signupWithGoogle, sendCode, verifyCode, logout, unlinkGoogle],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
