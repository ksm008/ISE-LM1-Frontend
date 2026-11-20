import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { googleLinkUrl } from '../api.js';
import { useAuth } from '../auth/authContext.js';
import GoogleIcon from '../auth/GoogleIcon.jsx';
import '../auth/Auth.css';

const GOOGLE_RESULTS = {
  linked: { text: '구글 계정을 연동했습니다. 이제 구글 계정으로도 로그인할 수 있습니다.' },
  in_use: { error: true, text: '이 구글 계정은 이미 다른 계정에 연동되어 있습니다.' },
  disabled: { error: true, text: '구글 로그인이 설정되어 있지 않습니다.' },
};

// 내 계정: 계정 정보, 구글 연동/해제, 로그아웃
function AccountPage() {
  const { me, config, unlinkGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [message, setMessage] = useState(GOOGLE_RESULTS[params.get('google')] ?? null);
  const [busy, setBusy] = useState(false);

  const handleUnlink = async () => {
    setBusy(true);
    try {
      await unlinkGoogle();
      setMessage({ text: '구글 계정 연동을 해제했습니다.' });
    } catch (err) {
      setMessage({ error: true, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  // 먼저 메인(공개 페이지)으로 이동한 뒤 로그아웃한다
  const handleLogout = async () => {
    navigate('/', { replace: true });
    await logout();
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <h1>내 계정</h1>
        {message && <div className={`auth-alert${message.error ? '' : ' auth-alert--info'}`}>{message.text}</div>}

        <dl className="auth-info">
          <dt>아이디</dt>
          <dd>
            {me.username}
            {me.role === 'ADMIN' && <span className="auth-badge">관리자</span>}
          </dd>
          <dt>이메일</dt>
          <dd>{me.email}</dd>
          <dt>구글 계정</dt>
          <dd>{me.googleLinked ? `연동됨 (${me.googleEmail ?? ''})` : '연동 안 됨'}</dd>
        </dl>

        {me.googleLinked ? (
          <button type="button" className="auth-btn" onClick={handleUnlink} disabled={busy}>
            구글 계정 연동 해제
          </button>
        ) : (
          config.googleEnabled && (
            <a className="auth-btn auth-btn--google" href={googleLinkUrl}>
              <GoogleIcon /> 구글 계정 연동하기
            </a>
          )
        )}

        <button type="button" className="auth-btn" onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    </div>
  );
}

export default AccountPage;
