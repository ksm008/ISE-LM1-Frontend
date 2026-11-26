// Error-based SQL 인젝션: 숫자 파라미터(게시글 번호)를 그대로 이어 붙이고, DB 오류를 화면에 그대로 보여 주는 경우
import { DB_NAME, DB_VERSION } from './labDb.js';
import { joinParts, runQuery } from './query.js';

export const VIEW_URL = 'http://shop.lab/board/view.php';

export function viewUrl(id) {
  return `${VIEW_URL}?id=${encodeURIComponent(id)}`;
}

/** 게시글 보기 SQL. 숫자라서 따옴표 없이 이어 붙인다. safe 이면 바인딩 */
export function viewQuery(id, { safe = false } = {}) {
  if (safe) {
    const parts = ['SELECT id, title, writer, created FROM posts WHERE id = ?'];
    return { parts, sql: parts[0], params: [id] };
  }
  const parts = ['SELECT id, title, writer, created FROM posts WHERE id = ', { input: 'id', value: id }];
  return { parts, sql: joinParts(parts), params: [] };
}

export function viewPost(db, id, { safe = false } = {}) {
  const q = viewQuery(id, { safe });
  const r = runQuery(db, q.sql, q.params);
  return { ...q, ...r, safe, input: { id } };
}

const leaked = (a, value) => !a.safe && !!a.error && a.error.includes(value);

export const ERROR_MISSIONS = [
  {
    id: 'error',
    title: '잘못된 입력으로 DB 오류 메시지를 화면에 띄우기',
    hint: '숫자가 들어갈 자리에 SQL 문법에 맞지 않는 글자를 넣어 봅니다. 오류 메시지가 그대로 보이면 공격자에게 단서가 됩니다.',
    example: "번호: 1'",
    check: (a) => !a.safe && !!a.error,
  },
  {
    id: 'dbinfo',
    title: '오류 메시지에 DB 버전(또는 DB 이름)이 찍히게 하기',
    hint: "MySQL 의 extractvalue() 는 XPath 가 잘못되면 그 값을 오류 메시지에 그대로 넣습니다. ~ 처럼 XPath 에 쓸 수 없는 글자를 앞에 붙여 version() 결과를 넘겨 봅니다.",
    example: "번호: 1 AND extractvalue(1, concat('~', version()))",
    check: (a) => leaked(a, DB_VERSION) || leaked(a, DB_NAME),
  },
  {
    id: 'safe',
    title: '보안 코딩(바인딩 + 오류 숨김)을 켜고 같은 입력이 막히는지 확인하기',
    hint: '입력값을 바인딩하면 SQL 로 실행되지 않고, 오류가 나더라도 사용자에게는 일반 안내만 보여 줍니다.',
    example: "보안 코딩 적용 → 번호: 1 AND extractvalue(1, concat('~', version()))",
    check: (a) => a.safe && /\D/.test(a.input.id) && !a.error && a.rows.length === 0,
  },
];
