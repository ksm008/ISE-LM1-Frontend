// Stored Procedure SQL 인젝션: 저장 프로시저 안에서 입력값을 이어 붙여 동적 SQL 을 만드는 경우
// (SQLite 에는 저장 프로시저가 없어서, 프로시저가 만들어 실행하는 동적 SQL 을 그대로 실행한다)
import { MEMBERS } from './labDb.js';
import { joinParts, runQuery } from './query.js';

export const SP_URL = 'http://shop.lab/member/find.php';

/** 프로시저 sp_find_member 가 실행하는 SQL. safe 이면 파라미터 바인딩(정적 SQL) */
export function spQuery(name, { safe = false } = {}) {
  if (safe) {
    const parts = ['SELECT username, name, email FROM members WHERE name = ?'];
    return { parts, sql: parts[0], params: [name] };
  }
  const parts = ["SELECT username, name, email FROM members WHERE name = '", { input: 'name', value: name }, "'"];
  return { parts, sql: joinParts(parts), params: [] };
}

export function findMember(db, name, { safe = false } = {}) {
  const q = spQuery(name, { safe });
  const r = runQuery(db, q.sql, q.params);
  return { ...q, ...r, safe, input: { name } };
}

/** 이름 하나로는 나올 수 없는 결과(회원 여러 명)가 나왔는지 */
export function leaksOthers(attempt) {
  const names = new Set(attempt.rows.map((row) => row[1]));
  return names.size > 1 || (attempt.rows.length > 0 && !MEMBERS.some((m) => m.name === attempt.input.name));
}

export const SP_MISSIONS = [
  {
    id: 'error',
    title: '작은따옴표로 프로시저 안의 SQL 오류 일으키기',
    hint: "프로시저 안에서 입력값을 문자열로 이어 붙이고 있다면, ' 하나로 동적 SQL 이 깨집니다.",
    example: "이름: '",
    check: (a) => !a.safe && !!a.error,
  },
  {
    id: 'bypass',
    title: '이름 조건을 우회해 다른 회원 정보까지 조회하기',
    hint: 'Form SQL 인젝션과 같은 원리입니다. 프로시저를 거쳐도 동적 SQL 의 WHERE 조건을 항상 참으로 만들 수 있습니다.',
    example: "이름: ' OR '1'='1' --",
    check: (a) => !a.safe && !a.error && leaksOthers(a),
  },
  {
    id: 'safe',
    title: '보안 코딩(파라미터 바인딩)을 켜고 같은 입력이 막히는지 확인하기',
    hint: '프로시저 안에서 정적 SQL 을 쓰거나 sp_executesql 로 파라미터를 바인딩하면 입력값은 이름 값으로만 비교됩니다.',
    example: "보안 코딩 적용 → 이름: ' OR '1'='1' --",
    check: (a) => a.safe && !a.error && /'/.test(a.input.name) && !leaksOthers(a),
  },
];
