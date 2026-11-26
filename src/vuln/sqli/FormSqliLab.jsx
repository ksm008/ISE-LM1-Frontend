import { useState } from 'react';
import { FORM_MISSIONS, LOGIN_URL, attemptLogin } from './formLab.js';
import { LabBrowser, SqliLabLayout } from './SqliLabParts.jsx';
import { useMissions, useShopDb } from './useSqliLab.js';
import './SqliLab.css';

const VULNERABLE_CODE = `<?php
$id = $_POST['username'];
$pw = $_POST['password'];

// 입력값을 SQL 문자열에 그대로 이어 붙인다 (취약)
$sql = "SELECT id, username, name, role FROM members
        WHERE username = '$id' AND password = '$pw'";
$result = mysqli_query($conn, $sql);

if ($row = mysqli_fetch_assoc($result)) {   // 첫 번째 행으로 로그인
    $_SESSION['user'] = $row['username'];
}`;

const SAFE_CODE = `<?php
$id = $_POST['username'];
$pw = $_POST['password'];

// SQL 구조는 고정하고, 입력값은 값으로만 전달한다
$stmt = mysqli_prepare($conn, "SELECT id, username, name, role FROM members
                               WHERE username = ? AND password = ?");
mysqli_stmt_bind_param($stmt, "ss", $id, $pw);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);
// 실제 서비스: 비밀번호는 password_hash() 로 저장하고 password_verify() 로 비교`;

function FormSqliLab() {
  const dbState = useShopDb();
  const missionState = useMissions(FORM_MISSIONS);
  const [safe, setSafe] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [session, setSession] = useState(null); // 로그인 결과 화면

  function submit(e) {
    e.preventDefault();
    if (!dbState.db) return;
    const a = attemptLogin(dbState.db, username, password, { safe });
    setAttempts((prev) => [a, ...prev].slice(0, 30));
    missionState.record(a);
    setSession(a);
  }

  function reset() {
    dbState.reset();
    missionState.reset();
    setAttempts([]);
    setSession(null);
    setUsername('');
    setPassword('');
    setSafe(false);
  }

  const user = session?.user;

  const browser = (
    <LabBrowser url={user ? 'http://shop.lab/mypage.php' : LOGIN_URL}>
      {user ? (
        <div className="shop-welcome">
          <p className="shop-welcome__hello">
            <strong>{user.name}</strong>({user.username})님, 환영합니다.
          </p>
          {user.role === 'admin' ? (
            <div className="shop-admin">
              <strong>관리자 메뉴</strong>
              <span>회원 관리 · 주문 관리 · 공지 작성</span>
            </div>
          ) : (
            <p className="shop-muted">일반 회원으로 로그인했습니다.</p>
          )}
          <button type="button" className="btn" onClick={() => setSession(null)}>
            로그아웃
          </button>
        </div>
      ) : (
        <form className="shop-form" onSubmit={submit} autoComplete="off">
          <div className="shop-logo">LAB SHOP</div>
          <label>
            아이디
            <input value={username} onChange={(e) => setUsername(e.target.value)} spellCheck={false} />
          </label>
          <label>
            비밀번호
            <input value={password} onChange={(e) => setPassword(e.target.value)} spellCheck={false} />
          </label>
          <button type="submit" className="btn btn--primary" disabled={!dbState.db}>
            {dbState.db ? '로그인' : 'DB 준비 중…'}
          </button>
          {session && !session.user && !session.error && <p className="shop-msg">아이디 또는 비밀번호가 올바르지 않습니다.</p>}
          {session?.error &&
            (session.safe ? (
              <p className="shop-msg">요청을 처리하지 못했습니다.</p>
            ) : (
              <p className="shop-msg shop-msg--error">
                <b>Fatal error</b>: Uncaught mysqli_sql_exception: {session.error} in /var/www/html/login.php:7
              </p>
            ))}
          <p className="shop-muted shop-form__note">실습용 비밀번호 칸은 입력이 보이도록 일반 글자로 표시합니다.</p>
        </form>
      )}
    </LabBrowser>
  );

  return (
    <SqliLabLayout
      dbState={dbState}
      browser={browser}
      attempts={attempts}
      missions={FORM_MISSIONS}
      missionState={missionState}
      safe={safe}
      onSafeChange={setSafe}
      onReset={reset}
      code={{ vulnerable: VULNERABLE_CODE, safe: SAFE_CODE }}
      notes={<FormNotes />}
    />
  );
}

function FormNotes() {
  return (
    <>
      <h2>정리</h2>
      <ul>
        <li>
          <b>원리</b>: 입력값의 <code>'</code> 가 SQL 문자열을 끝내고, 뒤에 붙인 <code>OR '1'='1'</code> 이 조건을 항상 참으로, <code>--</code>{' '}
          가 나머지(비밀번호 검사)를 주석으로 만든다.
        </li>
        <li>
          <b>대응</b>: Prepared Statement(바인딩), 입력값 검증(허용 문자 제한), 오류 메시지 숨김, DB 계정 최소 권한, 비밀번호 해시 저장.
        </li>
        <li>
          <b>참고</b>: MySQL 의 <code>-- </code> 주석은 뒤에 공백이 있어야 하고 <code>#</code> 도 쓸 수 있다. 이 실습 DB(SQLite)는 <code>--</code> 만
          지원한다.
        </li>
      </ul>
    </>
  );
}

export default FormSqliLab;
