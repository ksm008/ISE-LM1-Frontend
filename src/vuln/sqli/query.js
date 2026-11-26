// 웹 애플리케이션이 DB 에 질의를 보내는 부분 (취약한 방식 / 안전한 방식 공통)

export const MAX_ROWS = 100;

/**
 * 쿼리 조각으로 SQL 을 만든다. 조각은 문자열(개발자가 쓴 SQL) 또는 { input } (사용자 입력)이다.
 * 화면에서 사용자 입력 부분을 강조하는 데도 같은 조각을 쓴다.
 */
export function joinParts(parts) {
  return parts.map((p) => (typeof p === 'string' ? p : p.value)).join('');
}

/**
 * SQL 한 문장을 실행한다. PHP mysqli_query 처럼 한 번에 한 문장만 실행한다(;로 여러 문장 불가).
 * @returns {{ columns: string[], rows: unknown[][], error: string | null, truncated: boolean }}
 */
export function runQuery(db, sql, params = []) {
  const result = { columns: [], rows: [], error: null, truncated: false };
  let stmt = null;
  try {
    // 문장 수만 센다(실행하지 않음). 반복기는 다음 문장으로 넘어갈 때 이전 문장을 닫는다
    let count = 0;
    for (const s of db.iterateStatements(sql)) {
      count += 1;
      s.free();
    }
    if (count === 0) throw new Error('실행할 SQL 문장이 없습니다');
    if (count > 1) throw new Error('한 번에 한 문장만 실행할 수 있습니다 (세미콜론으로 여러 문장을 이어 실행할 수 없음)');
    stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    result.columns = stmt.getColumnNames();
    while (stmt.step()) {
      if (result.rows.length >= MAX_ROWS) {
        result.truncated = true;
        break;
      }
      result.rows.push(stmt.get());
    }
  } catch (e) {
    result.error = e?.message ?? String(e);
    result.columns = [];
    result.rows = [];
  } finally {
    stmt?.free();
  }
  return result;
}

/** SQLite 와 MySQL 의 차이로 막힐 때 덧붙이는 안내 */
export function errorHint(error) {
  if (!error) return null;
  if (error.includes('"#"')) return '이 실습 DB(SQLite)는 # 주석을 지원하지 않습니다. -- 로 뒤를 주석 처리하세요.';
  if (/do not have the same number of result columns/.test(error)) {
    return 'UNION 앞뒤 SELECT 의 컬럼 수가 다릅니다. 컬럼 수를 맞춰 보세요.';
  }
  if (/ORDER BY term out of range/.test(error)) return 'ORDER BY 번호가 컬럼 수보다 큽니다.';
  return null;
}

/** 결과의 모든 칸을 문자열로 (미션 판정용) */
export function cells(rows) {
  return rows.flat().map((v) => (v == null ? '' : String(v)));
}
