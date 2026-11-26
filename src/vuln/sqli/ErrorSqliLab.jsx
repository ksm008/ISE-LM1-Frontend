import { useState } from 'react';
import { ERROR_MISSIONS, VIEW_URL, viewPost, viewUrl } from './errorLab.js';
import { LabBrowser, SqliLabLayout } from './SqliLabParts.jsx';
import { useMissions, useShopDb } from './useSqliLab.js';
import { SERVER_CODE } from './serverCode.js';
import './SqliLab.css';


function ErrorSqliLab() {
  const dbState = useShopDb();
  const missionState = useMissions(ERROR_MISSIONS);
  const [safe, setSafe] = useState(false);
  const [id, setId] = useState('1');
  const [attempts, setAttempts] = useState([]);
  const [view, setView] = useState(null);

  function submit(e) {
    e.preventDefault();
    if (!dbState.db) return;
    const a = viewPost(dbState.db, id, { safe });
    setAttempts((prev) => [a, ...prev].slice(0, 30));
    missionState.record(a);
    setView(a);
  }

  function reset() {
    dbState.reset();
    missionState.reset();
    setAttempts([]);
    setView(null);
    setId('1');
    setSafe(false);
  }

  const post = view && !view.error ? view.rows[0] : null;

  const browser = (
    <LabBrowser url={view ? viewUrl(view.input.id) : VIEW_URL}>
      <div className="shop-board">
        <div className="shop-logo">LAB SHOP 게시글 보기</div>
        <form className="shop-search" onSubmit={submit} autoComplete="off">
          <input value={id} onChange={(e) => setId(e.target.value)} aria-label="게시글 번호 (id)" spellCheck={false} />
          <button type="submit" className="btn btn--primary" disabled={!dbState.db}>
            {dbState.db ? '열기' : 'DB 준비 중…'}
          </button>
        </form>
        <p className="shop-muted shop-form__note">주소의 id 파라미터를 바꾸는 것과 같습니다.</p>
        {view?.error &&
          (view.safe ? (
            <p className="shop-msg">요청을 처리하지 못했습니다.</p>
          ) : (
            <p className="shop-msg shop-msg--error">DB 오류: {view.error}</p>
          ))}
        {view && !view.error && !post && <p className="shop-msg">게시글을 찾을 수 없습니다.</p>}
        {post && (
          <article className="shop-post">
            <h3>{String(post[1])}</h3>
            <p className="shop-muted">
              {String(post[2])} · {String(post[3])} · 글 번호 {String(post[0])}
            </p>
          </article>
        )}
      </div>
    </LabBrowser>
  );

  return (
    <SqliLabLayout
      dbState={dbState}
      browser={browser}
      attempts={attempts}
      missions={ERROR_MISSIONS}
      missionState={missionState}
      safe={safe}
      onSafeChange={setSafe}
      onReset={reset}
      code={SERVER_CODE['error-based']}
      notes={<ErrorNotes />}
    />
  );
}

function ErrorNotes() {
  return (
    <>
      <h2>정리</h2>
      <ul>
        <li>
          <b>원리</b>: 애플리케이션이 DB 오류 메시지를 그대로 보여 주면, 공격자는 일부러 오류를 일으켜 SQL 구조·DB 종류·버전을 알아내고, 오류 메시지에
          값을 담는 함수(MySQL <code>extractvalue()</code>, <code>updatexml()</code> 등)로 데이터를 빼낼 수 있다.
        </li>
        <li>
          <b>대응</b>: Prepared Statement, 숫자 파라미터는 숫자인지 검증, 오류는 서버 로그에만 남기고 사용자에게는 일반 안내(<code>display_errors = Off</code>
          ), DB 계정 최소 권한.
        </li>
        <li>
          <b>참고</b>: 이 실습 DB 는 SQLite 로 <code>extractvalue()</code> 를 흉내 낸다(오류 메시지는 31자까지).
        </li>
      </ul>
    </>
  );
}

export default ErrorSqliLab;
