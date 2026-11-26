// Form SQL 인젝션: 로그인 폼의 아이디·비밀번호를 그대로 이어 붙여 만든 SQL
import { MEMBERS } from './labDb.js';
import { joinParts, runQuery } from './query.js';

export const LOGIN_URL = 'http://shop.lab/login.php';

/** 로그인 SQL. safe 이면 Prepared Statement(자리표시자 ?)를 쓴다 */
export function loginQuery(username, password, { safe = false } = {}) {
  if (safe) {
    const parts = ['SELECT id, username, name, role FROM members WHERE username = ? AND password = ?'];
    return { parts, sql: parts[0], params: [username, password] };
  }
  const parts = [
    "SELECT id, username, name, role FROM members WHERE username = '",
    { input: 'username', value: username },
    "' AND password = '",
    { input: 'password', value: password },
    "'",
  ];
  return { parts, sql: joinParts(parts), params: [] };
}

/** 로그인 시도. 결과의 첫 번째 행을 로그인한 회원으로 본다(흔한 취약 코드와 같음) */
export function attemptLogin(db, username, password, { safe = false } = {}) {
  const q = loginQuery(username, password, { safe });
  const r = runQuery(db, q.sql, q.params);
  let user = null;
  if (!r.error && r.rows.length > 0) {
    const row = Object.fromEntries(r.columns.map((c, i) => [c, r.rows[0][i]]));
    user = { id: row.id, username: row.username, name: row.name, role: row.role };
  }
  return { ...q, ...r, safe, input: { username, password }, user };
}

/** 로그인한 회원의 실제 비밀번호를 모르고 들어왔는지 (인젝션으로 인증 우회) */
export function isBypass(attempt) {
  if (!attempt.user) return false;
  const member = MEMBERS.find((m) => m.id === attempt.user.id);
  return !member || attempt.input.username !== member.username || attempt.input.password !== member.password;
}

export const FORM_MISSIONS = [
  {
    id: 'error',
    title: '작은따옴표 하나로 SQL 오류를 일으켜 취약점 확인하기',
    hint: "아이디에 ' 를 넣으면 SQL 문자열이 중간에 끝나 문법 오류가 납니다. 오류가 화면에 그대로 보이면 입력값이 SQL 에 바로 들어간다는 뜻입니다.",
    example: "아이디: '",
    check: (a) => !a.safe && !!a.error,
  },
  {
    id: 'bypass',
    title: '비밀번호를 모르는 채로 로그인하기',
    hint: "WHERE 조건을 항상 참으로 만들고 뒷부분(AND password = ...)은 -- 주석으로 지웁니다. 결과의 첫 번째 회원으로 로그인됩니다.",
    example: "아이디: ' OR '1'='1' --   (비밀번호는 아무거나)",
    check: (a) => !a.safe && isBypass(a),
  },
  {
    id: 'admin',
    title: '관리자(admin) 계정으로 로그인하기',
    hint: '관리자 아이디를 알고 있다면 아이디 뒤의 비밀번호 검사만 주석으로 지우면 됩니다. 아이디를 모른다면 role 컬럼 조건을 넣어 볼 수도 있습니다.',
    example: "아이디: admin' --",
    check: (a) => !a.safe && isBypass(a) && a.user.role === 'admin',
  },
  {
    id: 'safe',
    title: '보안 코딩(Prepared Statement)을 켜고 같은 공격이 막히는지 확인하기',
    hint: "'보안 코딩 적용'을 켜면 입력값이 SQL 문법이 아니라 값으로만 전달됩니다. 위에서 성공한 입력을 그대로 다시 넣어 보세요.",
    example: "보안 코딩 적용 → 아이디: admin' --",
    check: (a) => a.safe && !a.error && !a.user && /'/.test(a.input.username + a.input.password),
  },
];
