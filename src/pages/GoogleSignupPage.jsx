import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { api, googleLoginUrl } from '../api.js';
import { useAuth } from '../auth/authContext.js';
import PasswordFields from '../auth/PasswordFields.jsx';
import { USERNAME_RULE, isValidPassword, isValidUsername } from '../auth/policy.js';
import '../auth/Auth.css';

// 연동된 계정이 없는 구글 계정으로 로그인했을 때: 아이디·비밀번호만 정해서 가입한다.
// 이메일은 그 구글 계정의 Gmail 이며, 그 주소로 인증번호를 보낸다.
function GoogleSignupPage() {
  const { me, signupWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [google, setGoogle] = useState(undefined); // undefined: 확인 중, null: 정보 없음
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/api/auth/google/pending')
      .then(setGoogle)
      .catch(() => setGoogle(null));
  }, []);

  // 가입 처리 중(busy)에는 가입 결과를 담아 직접 이동하므로 여기서 먼저 보내지 않는다
  if (me?.authenticated && !busy) {
    return <Navigate to={me.active ? '/' : '/verify-email'} replace />;
  }

  const usernameBad = username.length > 0 && !isValidUsername(username);
  const canSubmit = isValidUsername(username) && isValidPassword(password) && password === confirm && !busy;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      const result = await signupWithGoogle({ username, password });
      navigate('/verify-email', { replace: true, state: { signup: result } });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (google === undefined) {
    return <div className="auth-loading">구글 계정 정보를 확인하고 있습니다…</div>;
  }

  if (google === null) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>구글 계정으로 가입</h1>
          <div className="auth-alert">구글 로그인 정보가 없거나 만료되었습니다.</div>
          <a className="auth-btn auth-btn--primary" href={googleLoginUrl}>
            다시 구글로 로그인
          </a>
          <p className="auth-foot">
            <Link to="/login">로그인 화면으로</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>구글 계정으로 가입</h1>
        <p className="auth-card__desc">
          이 구글 계정과 연동된 계정이 없습니다. 사용할 아이디와 비밀번호를 정하면 가입하고, 아래 Gmail 로 인증번호를
          보냅니다.
        </p>

        {error && <div className="auth-alert">{error}</div>}

        <div className="auth-field">
          <span>이메일 (구글 계정)</span>
          <div className="auth-readonly">{google.email}</div>
        </div>

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

        <button type="submit" className="auth-btn auth-btn--primary" disabled={!canSubmit}>
          {busy ? '가입 중…' : '가입하고 인증번호 받기'}
        </button>
      </form>
    </div>
  );
}

export default GoogleSignupPage;
