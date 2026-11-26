// SQL 인젝션 실습용 쇼핑몰 DB (브라우저 안 SQLite, sql.js).
// 페이지를 열 때마다 새로 만들고, 사용자마다 따로 동작한다(서버에 보내지 않음).
// MySQL 실습 흐름을 따라 할 수 있게 information_schema(tables, columns, schemata)와
// database(), version(), user() 함수를 흉내 낸다.

export const DB_NAME = 'lab_shop';
export const DB_VERSION = '8.0.36-lab';
export const DB_USER = 'shop_app@localhost';

// 회원 (실습이라 비밀번호를 평문으로 둔다. 실제 서비스는 해시로 저장해야 한다)
// admin 을 맨 앞에 두지 않는다: ' OR 1=1 -- 로 들어가면 첫 번째 회원(kim)이 된다
export const MEMBERS = [
  { id: 1, username: 'kim', password: 'kimPass!23', name: '김민수', email: 'kim@shop.lab', role: 'user' },
  { id: 2, username: 'lee', password: 'lee2026^^', name: '이서연', email: 'lee@shop.lab', role: 'user' },
  { id: 3, username: 'admin', password: 'Adm1n#Secret', name: '관리자', email: 'admin@shop.lab', role: 'admin' },
  { id: 4, username: 'park', password: 'parkpark7', name: '박지훈', email: 'park@shop.lab', role: 'user' },
];

export const ADMIN = MEMBERS.find((m) => m.role === 'admin');

export const POSTS = [
  { id: 1, title: '배송 언제 오나요?', writer: 'kim', created: '2026-11-02' },
  { id: 2, title: '겨울 신상품 입고 안내', writer: 'admin', created: '2026-11-05' },
  { id: 3, title: '사이즈 교환 문의', writer: 'lee', created: '2026-11-08' },
  { id: 4, title: '쿠폰 사용 방법 문의', writer: 'park', created: '2026-11-11' },
  { id: 5, title: '배송지 변경 가능한가요?', writer: 'lee', created: '2026-11-15' },
  { id: 6, title: '[공지] 개인정보 처리방침 변경', writer: 'admin', created: '2026-11-18' },
  { id: 7, title: '상품 후기 이벤트 당첨자 발표', writer: 'admin', created: '2026-11-21' },
];

const TABLES = {
  members: [
    ['id', 'int'],
    ['username', 'varchar'],
    ['password', 'varchar'],
    ['name', 'varchar'],
    ['email', 'varchar'],
    ['role', 'varchar'],
  ],
  posts: [
    ['id', 'int'],
    ['title', 'varchar'],
    ['writer', 'varchar'],
    ['created', 'date'],
  ],
};

/** sql.js 모듈(initSqlJs 결과)로 실습 DB 를 만든다 */
export function createShopDb(SQL) {
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE members (id INTEGER PRIMARY KEY, username TEXT, password TEXT, name TEXT, email TEXT, role TEXT);
    CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT, writer TEXT, created TEXT);
  `);
  const m = db.prepare('INSERT INTO members VALUES (?, ?, ?, ?, ?, ?)');
  for (const r of MEMBERS) m.run([r.id, r.username, r.password, r.name, r.email, r.role]);
  m.free();
  const p = db.prepare('INSERT INTO posts VALUES (?, ?, ?, ?)');
  for (const r of POSTS) p.run([r.id, r.title, r.writer, r.created]);
  p.free();

  // MySQL 의 information_schema 흉내 (SQLite 는 별도 DB 를 붙여서 information_schema.tables 형태로 쓸 수 있다)
  db.run(`
    ATTACH ':memory:' AS information_schema;
    CREATE TABLE information_schema.schemata (schema_name TEXT);
    CREATE TABLE information_schema.tables (table_schema TEXT, table_name TEXT, table_type TEXT);
    CREATE TABLE information_schema.columns (table_schema TEXT, table_name TEXT, column_name TEXT, data_type TEXT, ordinal_position INTEGER);
  `);
  db.run('INSERT INTO information_schema.schemata VALUES (?), (?)', ['information_schema', DB_NAME]);
  for (const [table, cols] of Object.entries(TABLES)) {
    db.run('INSERT INTO information_schema.tables VALUES (?, ?, ?)', [DB_NAME, table, 'BASE TABLE']);
    cols.forEach(([col, type], i) => {
      db.run('INSERT INTO information_schema.columns VALUES (?, ?, ?, ?, ?)', [DB_NAME, table, col, type, i + 1]);
    });
  }

  db.create_function('database', () => DB_NAME);
  db.create_function('version', () => DB_VERSION);
  db.create_function('user', () => DB_USER);
  return db;
}
