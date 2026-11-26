// SQL 인젝션 실습 화면 공용 부품: 가짜 브라우저 창, 실행된 SQL 기록, 미션 목록, 서버 코드
import { errorHint, MAX_ROWS } from './query.js';
import { CODE_LANGS } from './serverCode.js';
import { useCodeLang } from './useSqliLab.js';

export function LabBrowser({ url, children }) {
  return (
    <div className="sqli-browser">
      <div className="sqli-browser__bar">
        <span className="sqli-browser__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="sqli-browser__url" title={url}>
          {url}
        </span>
      </div>
      <div className="sqli-browser__body">{children}</div>
    </div>
  );
}

/** SQL 조각 표시 (사용자 입력 부분 강조) */
function SqlText({ parts }) {
  return (
    <code className="sqli-sql">
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <span key={i}>{p}</span>
        ) : (
          <mark key={i} className="sqli-sql__input" title={`사용자 입력 (${p.input})`}>
            {p.value}
          </mark>
        ),
      )}
    </code>
  );
}

function resultText(a) {
  if (a.error) return null;
  return `${a.rows.length}${a.truncated ? `+ (처음 ${MAX_ROWS}행만)` : ''}행`;
}

function LogEntry({ attempt, latest = false }) {
  const hint = errorHint(attempt.error);
  return (
    <li className={`sqli-log__entry${latest ? ' sqli-log__entry--latest' : ''}`}>
      <div className="sqli-log__meta">
        <span className={`sqli-badge${attempt.safe ? ' sqli-badge--safe' : ''}`}>
          {attempt.safe ? 'Prepared Statement' : '문자열 연결'}
        </span>
        {attempt.error ? <span className="sqli-log__err">오류</span> : <span>결과 {resultText(attempt)}</span>}
      </div>
      <SqlText parts={attempt.parts} />
      {attempt.safe && (
        <div className="sqli-log__params">
          바인딩 값:{' '}
          {attempt.params.map((v, i) => (
            <code key={i}>{JSON.stringify(v)}</code>
          ))}
        </div>
      )}
      {attempt.error && latest && (
        <div className="sqli-log__error">
          {attempt.error}
          {hint && <div className="sqli-log__hint">{hint}</div>}
        </div>
      )}
    </li>
  );
}

/** 서버가 실행한 SQL (최신이 위) */
export function SqlLog({ attempts }) {
  if (!attempts.length) {
    return <p className="sqli-empty">왼쪽 페이지에서 입력하고 보내면, 서버가 DB 에 보낸 SQL 이 여기에 나옵니다.</p>;
  }
  const [last, ...older] = attempts;
  return (
    <>
      <ol className="sqli-log">
        <LogEntry attempt={last} latest />
      </ol>
      {older.length > 0 && (
        <details className="sqli-log__older">
          <summary>이전 SQL {older.length}개</summary>
          <ol className="sqli-log">
            {older.map((a, i) => (
              <LogEntry key={older.length - i} attempt={a} />
            ))}
          </ol>
        </details>
      )}
    </>
  );
}

export function MissionList({ missions, done, latest }) {
  return (
    <ol className="sqli-missions">
      {missions.map((m, i) => {
        const ok = done.has(m.id);
        return (
          <li
            key={m.id}
            className={`sqli-mission${ok ? ' sqli-mission--done' : ''}${latest.includes(m.id) ? ' sqli-mission--new' : ''}`}
          >
            <div className="sqli-mission__head">
              <span className="sqli-mission__check" aria-hidden="true">
                {ok ? '✓' : i + 1}
              </span>
              <span className="sqli-mission__title">
                {m.title}
                <span className="visually-hidden">{ok ? ' (완료)' : ' (미완료)'}</span>
              </span>
            </div>
            <details className="sqli-mission__hint">
              <summary>힌트</summary>
              <p>{m.hint}</p>
              <details>
                <summary>예시 입력 보기</summary>
                <code>{m.example}</code>
              </details>
            </details>
          </li>
        );
      })}
    </ol>
  );
}

export function SafeToggle({ safe, onChange }) {
  return (
    <label className={`sqli-toggle${safe ? ' sqli-toggle--on' : ''}`}>
      <input type="checkbox" checked={safe} onChange={(e) => onChange(e.target.checked)} />
      <span>보안 코딩 적용 (Prepared Statement)</span>
    </label>
  );
}

/** 서버 코드 (언어 탭: PHP / Java). code = { php: {vulnerable, safe}, java: {...} } */
export function ServerCode({ code, safeMode }) {
  const [lang, setLang] = useCodeLang();
  const current = code[lang] ?? code.php;
  return (
    <div className="sqli-code">
      <div className="sqli-code__head">
        <span className="sqli-code__label">
          {safeMode ? '안전한 코드 (입력값은 값으로만 전달)' : '취약한 코드 (입력값을 SQL 문자열에 그대로 연결)'}
        </span>
        <div className="sqli-code__tabs" role="tablist" aria-label="서버 코드 언어">
          {CODE_LANGS.filter((l) => code[l.id]).map((l) => (
            <button
              key={l.id}
              type="button"
              role="tab"
              aria-selected={lang === l.id}
              className={`sqli-code__tab${lang === l.id ? ' sqli-code__tab--active' : ''}`}
              onClick={() => setLang(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <pre>
        <code>{safeMode ? current.safe : current.vulnerable}</code>
      </pre>
    </div>
  );
}

/** 실습 화면 전체 틀 */
export function SqliLabLayout({ dbState, browser, attempts, missions, missionState, safe, onSafeChange, onReset, code, notes }) {
  const total = missions.length;
  const count = missionState.done.size;
  return (
    <div className="sqli-lab">
      <div className="sqli-toolbar">
        <SafeToggle safe={safe} onChange={onSafeChange} />
        <span className="sqli-progress">
          미션 {count}/{total}
        </span>
        <button type="button" className="btn sqli-reset" onClick={onReset}>
          처음부터 다시
        </button>
      </div>

      {dbState.error && (
        <p className="sqli-load-error" role="alert">
          실습 DB 를 불러오지 못했습니다: {dbState.error}
        </p>
      )}

      <div className="sqli-grid">
        <section className="sqli-panel" aria-label="취약한 웹 페이지">
          <h2 className="sqli-panel__title">웹 페이지</h2>
          {browser}
        </section>
        <section className="sqli-panel" aria-label="서버">
          <h2 className="sqli-panel__title">서버에서 실행된 SQL</h2>
          <SqlLog attempts={attempts} />
          <ServerCode code={code} safeMode={safe} />
        </section>
      </div>

      <section className="sqli-panel sqli-panel--missions" aria-label="미션">
        <h2 className="sqli-panel__title">미션</h2>
        <MissionList missions={missions} done={missionState.done} latest={missionState.latest} />
      </section>

      {notes && <section className="sqli-notes">{notes}</section>}
    </div>
  );
}
