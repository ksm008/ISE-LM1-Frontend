import { useState } from 'react';
import { SP_MISSIONS, SP_URL, findMember } from './spLab.js';
import { LabBrowser, SqliLabLayout } from './SqliLabParts.jsx';
import { useMissions, useShopDb } from './useSqliLab.js';
import './SqliLab.css';

const VULNERABLE_CODE = `-- 저장 프로시저 (MS-SQL 예)
CREATE PROCEDURE sp_find_member @name NVARCHAR(50)
AS
BEGIN
    -- 프로시저 안에서 입력값을 이어 붙여 동적 SQL 을 만든다 (취약)
    DECLARE @sql NVARCHAR(500);
    SET @sql = 'SELECT username, name, email FROM members WHERE name = '''
               + @name + '''';
    EXEC (@sql);
END

-- 웹 애플리케이션: EXEC sp_find_member @name = ? (호출 자체는 바인딩해도 소용없음)`;

const SAFE_CODE = `-- 방법 1: 동적 SQL 을 쓰지 않는다 (정적 SQL)
CREATE PROCEDURE sp_find_member @name NVARCHAR(50)
AS
BEGIN
    SELECT username, name, email FROM members WHERE name = @name;
END

-- 방법 2: 동적 SQL 이 꼭 필요하면 sp_executesql 로 파라미터 바인딩
-- EXEC sp_executesql N'SELECT ... WHERE name = @n', N'@n NVARCHAR(50)', @n = @name;
-- 그리고 웹 계정에는 필요한 프로시저 실행 권한만 준다 (최소 권한)`;

function SpSqliLab() {
  const dbState = useShopDb();
  const missionState = useMissions(SP_MISSIONS);
  const [safe, setSafe] = useState(false);
  const [name, setName] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [view, setView] = useState(null);

  function submit(e) {
    e.preventDefault();
    if (!dbState.db) return;
    const a = findMember(dbState.db, name, { safe });
    setAttempts((prev) => [a, ...prev].slice(0, 30));
    missionState.record(a);
    setView(a);
  }

  function reset() {
    dbState.reset();
    missionState.reset();
    setAttempts([]);
    setView(null);
    setName('');
    setSafe(false);
  }

  const browser = (
    <LabBrowser url={SP_URL}>
      <div className="shop-board">
        <div className="shop-logo">LAB SHOP 회원 찾기</div>
        <form className="shop-search" onSubmit={submit} autoComplete="off">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="회원 이름 (예: 김민수)" aria-label="회원 이름" spellCheck={false} />
          <button type="submit" className="btn btn--primary" disabled={!dbState.db}>
            {dbState.db ? '찾기' : 'DB 준비 중…'}
          </button>
        </form>
        {view?.error ? (
          view.safe ? (
            <p className="shop-msg">요청을 처리하지 못했습니다.</p>
          ) : (
            <p className="shop-msg shop-msg--error">
              <b>SQL Server error</b> (sp_find_member): {view.error}
            </p>
          )
        ) : (
          view && (
            <div className="shop-table-wrap">
              <table className="shop-table">
                <thead>
                  <tr>
                    <th>아이디</th>
                    <th>이름</th>
                    <th>이메일</th>
                  </tr>
                </thead>
                <tbody>
                  {view.rows.map((row, i) => (
                    <tr key={i}>
                      {[0, 1, 2].map((c) => (
                        <td key={c}>{row[c] == null ? '' : String(row[c])}</td>
                      ))}
                    </tr>
                  ))}
                  {view.rows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="shop-table__empty">
                        찾는 회원이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
      missions={SP_MISSIONS}
      missionState={missionState}
      safe={safe}
      onSafeChange={setSafe}
      onReset={reset}
      code={{ vulnerable: VULNERABLE_CODE, safe: SAFE_CODE }}
      notes={<SpNotes />}
    />
  );
}

function SpNotes() {
  return (
    <>
      <h2>정리</h2>
      <ul>
        <li>
          <b>원리</b>: 저장 프로시저를 쓰면 안전하다고 오해하기 쉽지만, 프로시저 안에서 입력값을 이어 붙여 <code>EXEC</code> 로 실행하면 일반 SQL
          인젝션과 똑같이 취약하다. 웹에서 프로시저를 바인딩해 호출해도 막을 수 없다.
        </li>
        <li>
          <b>대응</b>: 프로시저 안에서 정적 SQL 사용, 동적 SQL 이 필요하면 <code>sp_executesql</code> 파라미터 바인딩, 입력값 검증, 웹 DB 계정은
          필요한 프로시저 실행 권한만(최소 권한), 위험한 확장 프로시저(예: <code>xp_cmdshell</code>) 비활성화.
        </li>
        <li>
          <b>참고</b>: 오른쪽 SQL 기록은 프로시저가 안에서 만든 동적 SQL 이다(이 실습 DB 는 SQLite 라 프로시저를 흉내만 낸다).
        </li>
      </ul>
    </>
  );
}

export default SpSqliLab;
