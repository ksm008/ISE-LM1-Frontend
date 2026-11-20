import { passwordChecks } from './policy.js';

// 비밀번호 + 비밀번호 확인 입력과 조건 체크 목록 (회원가입, 구글 가입 공통)
function PasswordFields({ password, confirm, onPassword, onConfirm }) {
  const checks = passwordChecks(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <>
      <label className="auth-field">
        <span>비밀번호</span>
        <input
          type="password"
          value={password}
          onChange={(e) => onPassword(e.target.value)}
          autoComplete="new-password"
          maxLength={20}
          required
        />
      </label>
      <ul className="auth-checks" aria-label="비밀번호 조건">
        {checks.map((c) => (
          <li key={c.label} className={c.ok ? 'is-ok' : ''}>
            {c.ok ? '✓' : '·'} {c.label}
          </li>
        ))}
      </ul>
      <label className="auth-field">
        <span>비밀번호 확인</span>
        <input
          type="password"
          value={confirm}
          onChange={(e) => onConfirm(e.target.value)}
          autoComplete="new-password"
          maxLength={20}
          required
          aria-invalid={mismatch}
        />
        {mismatch && <small className="auth-field__error">비밀번호가 일치하지 않습니다.</small>}
      </label>
    </>
  );
}

export default PasswordFields;
