// 아이디·비밀번호·이메일 규칙. 백엔드(iselm1.auth.AuthPolicy)와 같은 규칙이다.

export const USERNAME_RULE = '4~20자, 영문 소문자로 시작, 영문 소문자·숫자·_';
const USERNAME_RE = /^[a-z][a-z0-9_]{3,19}$/;
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export const isValidUsername = (value) => USERNAME_RE.test(value);
export const isValidEmail = (value) => value.length <= 254 && EMAIL_RE.test(value.trim());

/** 비밀번호 조건별 충족 여부 (가입 화면의 체크 목록) */
export function passwordChecks(password) {
  return [
    { label: '8~20자', ok: password.length >= 8 && password.length <= 20 },
    { label: '영문 대문자', ok: /[A-Z]/.test(password) },
    { label: '영문 소문자', ok: /[a-z]/.test(password) },
    { label: '숫자', ok: /[0-9]/.test(password) },
    { label: '특수문자', ok: /[!-/:-@[-`{-~]/.test(password) },
    { label: '공백·한글 없음', ok: password.length > 0 && /^[!-~]+$/.test(password) },
  ];
}

export const isValidPassword = (password) => passwordChecks(password).every((c) => c.ok);
