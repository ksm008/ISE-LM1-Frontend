import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { googleLoginUrl } from '../api.js';
import { useAuth } from '../auth/authContext.js';
import GoogleIcon from '../auth/GoogleIcon.jsx';
import PasswordFields from '../auth/PasswordFields.jsx';
import { USERNAME_RULE, isValidEmail, isValidPassword, isValidUsername } from '../auth/policy.js';
import '../auth/Auth.css';

function SignupPage() {
  const { me, config, signup } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // 가입 처리 중(busy)에는 가입 결과를 담아 직접 이동하므로 여기서 먼저 보내지 않는다
  if (me?.authenticated && !busy) {
    return <Navigate to={me.active ? '/' : '/verify-email'} replace />;
  }

  const usernameBad = username.length > 0 && !isValidUsername(username);
  const emailBad = email.length > 0 && !isValidEmail(email);
  const canSubmit =
    isValidUsername(username) && isValidEmail(email) && isValidPassword(password) && password === confirm && !busy;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      const result = await signup({ username, password, email: email.trim() });
      navigate('/verify-email', { replace: true, state: { signup: result } });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>회원가입</h1>
        <p className="auth-card__desc">가입 후 이메일로 받은 인증번호 6자리를 입력하면 사이트를 이용할 수 있습니다.</p>

        {error && <div className="auth-alert">{error}</div>}

        <label className="auth-field">
          <span>아이디</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            maxLength={20}
            required
            autoFocus
            aria-invalid={usernameBad}
          />
          <small className={usernameBad ? 'auth-field__error' : 'auth-field__hint'}>{USERNAME_RULE}</small>
        </label>

        <PasswordFields password={password} confirm={confirm} onPassword={setPassword} onConfirm={setConfirm} />

        <label className="auth-field">
          <span>이메일</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={254}
            required
            aria-invalid={emailBad}
          />
          {emailBad && <small className="auth-field__error">이메일 형식이 올바르지 않습니다.</small>}
        </label>

        <button type="submit" className="auth-btn auth-btn--primary" disabled={!canSubmit}>
          {busy ? '가입 중…' : '가입하고 인증번호 받기'}
        </button>

        {config.googleEnabled && (
          <>
            <div className="auth-divider">또는</div>
            <a className="auth-btn auth-btn--google" href={googleLoginUrl}>
              <GoogleIcon /> 구글 계정으로 가입
            </a>
            <p className="auth-hint">구글 계정의 Gmail 주소로 가입하고, 아이디·비밀번호만 정하면 됩니다.</p>
          </>
        )}

        <p className="auth-foot">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </form>
    </div>
  );
}

export default SignupPage;
