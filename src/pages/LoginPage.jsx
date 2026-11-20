import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { googleLoginUrl } from '../api.js';
import { safeNext, useAuth } from '../auth/authContext.js';
import GoogleIcon from '../auth/GoogleIcon.jsx';
import '../auth/Auth.css';

// 구글 로그인 후 백엔드가 ?error= 로 돌려보내는 사유
const GOOGLE_ERRORS = {
  google_failed: '구글 로그인에 실패했습니다. 다시 시도하세요.',
  google_email: '구글 계정의 이메일을 확인할 수 없습니다.',
  google_email_in_use:
    '이 구글 계정의 이메일로 이미 가입된 계정이 있습니다. 아이디로 로그인한 뒤 내 계정에서 구글 계정을 연동하세요.',
};

function LoginPage() {
  const { me, config, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(GOOGLE_ERRORS[params.get('error')] ?? '');
  const [busy, setBusy] = useState(false);

  if (me?.authenticated) {
    return <Navigate to={me.active ? next : '/verify-email'} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await login(username.trim(), password);
      navigate(result.active ? next : '/verify-email', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>로그인</h1>
        <p className="auth-card__desc">로그인하면 모든 학습 콘텐츠와 실습을 이용할 수 있습니다.</p>

        {(error || me?.error) && <div className="auth-alert">{error || me.error}</div>}

        <label className="auth-field">
          <span>아이디</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            maxLength={20}
            required
            autoFocus
          />
        </label>
        <label className="auth-field">
          <span>비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            maxLength={20}
            required
          />
        </label>

        <button type="submit" className="auth-btn auth-btn--primary" disabled={busy}>
          {busy ? '로그인 중…' : '로그인'}
        </button>

        {config.googleEnabled && (
          <>
            <div className="auth-divider">또는</div>
            <a className="auth-btn auth-btn--google" href={googleLoginUrl}>
              <GoogleIcon /> 구글 계정으로 로그인
            </a>
            <p className="auth-hint">구글 계정이 연동된 계정이 없으면 아이디·비밀번호만 정해서 바로 가입할 수 있습니다.</p>
          </>
        )}

        <p className="auth-foot">
          계정이 없으신가요? <Link to="/signup">회원가입</Link>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;
