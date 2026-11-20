import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/authContext.js';
import '../auth/Auth.css';

// 이메일 인증번호(숫자 6자리) 입력. 가입 직후 또는 인증 전 계정으로 로그인했을 때 온다.
function VerifyEmailPage() {
  const { me, config, sendCode, verifyCode, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const signup = location.state?.signup; // 가입 직후 결과 (메일 발송 여부, 다시 보내기 대기 시간)

  const [code, setCode] = useState('');
  const [message, setMessage] = useState(() =>
    signup?.mailSent === false ? { error: true, text: signup.mailError } : signup ? { text: '인증번호를 보냈습니다.' } : null,
  );
  const [cooldownUntil, setCooldownUntil] = useState(() =>
    signup?.cooldownSeconds ? Date.now() + signup.cooldownSeconds * 1000 : 0,
  );
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const autoSent = useRef(Boolean(signup));

  const remaining = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  useEffect(() => {
    if (remaining <= 0) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  const requestCode = async () => {
    setBusy(true);
    try {
      const data = await sendCode();
      setCooldownUntil(Date.now() + data.cooldownSeconds * 1000);
      setNow(Date.now());
      setMessage({ text: '인증번호를 보냈습니다. 메일함(스팸함 포함)을 확인하세요.' });
    } catch (err) {
      const wait = err.data?.retryAfterSeconds;
      if (wait) {
        setCooldownUntil(Date.now() + wait * 1000);
        setNow(Date.now());
        setMessage({ text: '최근에 보낸 인증번호를 입력하세요.' });
      } else {
        setMessage({ error: true, text: err.message });
      }
    } finally {
      setBusy(false);
    }
  };

  // 가입 직후가 아니면(인증 전 계정으로 로그인) 들어오자마자 인증번호를 보낸다
  useEffect(() => {
    if (!me?.authenticated || me.active || autoSent.current) return;
    autoSent.current = true;
    requestCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  if (me === null) return <div className="auth-loading">로그인 상태를 확인하고 있습니다…</div>;
  if (!me.authenticated) return <Navigate to="/login" replace />;
  if (me.active) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return;
    setBusy(true);
    try {
      await verifyCode(code);
      navigate('/', { replace: true });
    } catch (err) {
      setMessage({ error: true, text: err.message });
      setCode('');
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>이메일 인증</h1>
        <p className="auth-card__desc">
          <strong>{me.email}</strong> 로 보낸 인증번호 6자리를 입력하세요. 인증을 마치면 사이트를 이용할 수 있습니다.
        </p>

        {!config.mailEnabled && (
          <div className="auth-alert auth-alert--info">
            개발 모드: 메일 설정 전이라 인증번호는 메일 대신 백엔드 서버 로그에 출력됩니다.
          </div>
        )}
        {message && <div className={`auth-alert${message.error ? '' : ' auth-alert--info'}`}>{message.text}</div>}

        <label className="auth-field">
          <span>인증번호</span>
          <input
            className="auth-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            required
            autoFocus
          />
        </label>

        <button type="submit" className="auth-btn auth-btn--primary" disabled={busy || code.length !== 6}>
          인증하기
        </button>
        <button type="button" className="auth-btn" onClick={requestCode} disabled={busy || remaining > 0}>
          {remaining > 0 ? `인증번호 다시 보내기 (${remaining}초)` : '인증번호 다시 보내기'}
        </button>

        <p className="auth-foot">
          인증번호는 10분 동안 유효하며 5번까지 입력할 수 있습니다.{' '}
          <button type="button" className="auth-link" onClick={logout}>
            다른 계정으로 로그인
          </button>
        </p>
      </form>
    </div>
  );
}

export default VerifyEmailPage;
