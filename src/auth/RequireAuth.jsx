import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './authContext.js';

// 로그인(이메일 인증 완료 또는 관리자)해야 볼 수 있는 페이지를 감싼다.
// 로그인하지 않았으면 로그인 화면으로, 인증 전이면 이메일 인증 화면으로 보낸다.
function RequireAuth() {
  const { me } = useAuth();
  const location = useLocation();

  if (me === null) {
    return <div className="auth-loading">로그인 상태를 확인하고 있습니다…</div>;
  }
  if (!me.authenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (!me.active) {
    return <Navigate to="/verify-email" replace />;
  }
  return <Outlet />;
}

export default RequireAuth;
