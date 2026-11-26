import { useMemo, useState } from 'react';
import { SEARCH_URL, UNION_MISSIONS, search, searchUrl } from './unionLab.js';
import { LabBrowser, SqliLabLayout } from './SqliLabParts.jsx';
import { useMissions, useShopDb } from './useSqliLab.js';
import { SERVER_CODE } from './serverCode.js';
import './SqliLab.css';


function UnionSqliLab() {
  const dbState = useShopDb();
  const missionState = useMissions(UNION_MISSIONS);
  const [safe, setSafe] = useState(false);
  const [q, setQ] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [page, setPage] = useState(null); // 마지막 검색 결과

  function run(text) {
    if (!dbState.db) return;
    const a = search(dbState.db, text, { safe });
    setAttempts((prev) => [a, ...prev].slice(0, 30));
    missionState.record(a);
    setPage(a);
  }

  function submit(e) {
    e.preventDefault();
    run(q);
  }

  function reset() {
    dbState.reset();
    missionState.reset();
    setAttempts([]);
    setPage(null);
    setQ('');
    setSafe(false);
  }

  // 검색 전에는 전체 목록을 보여 준다 (서버 SQL 기록에는 넣지 않음)
  const initial = useMemo(() => (dbState.db ? search(dbState.db, '', { safe: false }) : null), [dbState.db]);
  const view = page ?? initial;

  const browser = (
    <LabBrowser url={view && view.input.q ? searchUrl(view.input.q) : SEARCH_URL}>
      <div className="shop-board">
        <div className="shop-logo">LAB SHOP 고객 게시판</div>
        <form className="shop-search" onSubmit={submit} autoComplete="off">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제목 검색"
            aria-label="제목 검색"
            spellCheck={false}
          />
          <button type="submit" className="btn btn--primary" disabled={!dbState.db}>
            {dbState.db ? '검색' : 'DB 준비 중…'}
          </button>
        </form>

        {view?.error ? (
          view.safe ? (
            <p className="shop-msg">요청을 처리하지 못했습니다.</p>
          ) : (
            <p className="shop-msg shop-msg--error">
              <b>Fatal error</b>: Uncaught mysqli_sql_exception: {view.error} in /var/www/html/board/search.php:6
            </p>
          )
        ) : (
          view && (
            <>
              <p className="shop-muted">검색 결과 {view.rows.length}건</p>
              <div className="shop-table-wrap">
                <table className="shop-table">
                  <thead>
                    <tr>
                      <th>번호</th>
                      <th>제목</th>
                      <th>작성자</th>
                      <th>작성일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.rows.map((row, i) => (
                      <tr key={i}>
                        {[0, 1, 2, 3].map((c) => (
                          <td key={c}>{row[c] == null ? '' : String(row[c])}</td>
                        ))}
                      </tr>
                    ))}
                    {view.rows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="shop-table__empty">
                          검색 결과가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )
        )}
      </div>
    </LabBrowser>
  );

  return (
    <SqliLabLayout
      dbState={dbState}
      browser={browser}
      attempts={attempts}
      missions={UNION_MISSIONS}
      missionState={missionState}
      safe={safe}
      onSafeChange={setSafe}
      onReset={reset}
      code={SERVER_CODE['union']}
      notes={<UnionNotes />}
    />
  );
}

function UnionNotes() {
  return (
    <>
      <h2>정리</h2>
      <ul>
        <li>
          <b>원리</b>: <code>UNION</code> 은 두 SELECT 결과를 합친다. 앞뒤 컬럼 수(와 호환되는 자료형)가 같아야 하므로 먼저 컬럼 수를 알아내고, 화면에
          출력되는 칸에 원하는 값을 넣는다.
        </li>
        <li>
          <b>순서</b>: 취약점 확인(<code>'</code>) → 컬럼 수(<code>ORDER BY n</code> / <code>UNION SELECT 1,2,…</code>) → DB 정보(
          <code>database()</code>, <code>version()</code>) → 테이블(<code>information_schema.tables</code>) → 컬럼(
          <code>information_schema.columns</code>) → 데이터.
        </li>
        <li>
          <b>대응</b>: Prepared Statement, 입력값 검증, 오류 메시지 숨김, DB 계정 최소 권한(<code>information_schema</code>·다른 테이블 조회 제한).
        </li>
        <li>
          <b>참고</b>: 이 실습 DB 는 SQLite 로 MySQL 을 흉내 낸다. <code>#</code> 주석은 안 되고 <code>--</code> 를 쓴다. SQLite 의{' '}
          <code>sqlite_master</code> 로도 테이블을 볼 수 있다.
        </li>
      </ul>
    </>
  );
}

export default UnionSqliLab;
