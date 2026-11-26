import { Suspense } from 'react';
import { Link, useParams } from 'react-router';
import { findVulnLab, labPath, vulnItem, vulnItemPath, vulnLabPath, vulnPath } from '../data/curriculum.js';
import { vulnLabComponents } from '../vuln/registry.js';
import NotFoundPage from './NotFoundPage.jsx';
import './Pages.css';

// 웹 취약점 실습: 세부 항목 실습 화면 (/lab/vuln/:vulnId/:labId)
function VulnPracticePage() {
  const { vulnId, labId } = useParams();
  const found = findVulnLab(vulnId, labId);
  const Lab = vulnLabComponents[`${vulnId}/${labId}`];
  if (!found || !Lab) return <NotFoundPage />;

  const { vuln, item } = found;
  const siblings = vuln.groups.flatMap((g) => g.items).map(vulnItem).filter((i) => i.lab);

  return (
    <div className="page page--wide">
      <nav className="breadcrumb" aria-label="현재 위치">
        <Link to="/">홈</Link>
        <span aria-hidden="true">/</span>
        <Link to={labPath}>실습</Link>
        <span aria-hidden="true">/</span>
        <Link to={vulnLabPath}>웹 취약점 실습</Link>
        <span aria-hidden="true">/</span>
        <Link to={vulnPath(vuln.id)}>{vuln.title}</Link>
        <span aria-hidden="true">/</span>
        <span>{item.title}</span>
      </nav>

      <header className="topic-header topic-header--compact">
        <h1>{item.title}</h1>
        <p>{item.summary} 모든 동작은 이 브라우저 안의 실습용 DB 에서만 일어나고, 새로고침하면 처음 상태로 돌아갑니다.</p>
      </header>

      {siblings.length > 1 && (
        <nav className="vuln-lab-tabs" aria-label={`${vuln.title} 실습`}>
          {siblings.map((s) => (
            <Link
              key={s.lab}
              to={vulnItemPath(vuln.id, s.lab)}
              className={`vuln-lab-tab${s.lab === labId ? ' vuln-lab-tab--active' : ''}`}
              aria-current={s.lab === labId ? 'page' : undefined}
            >
              {s.title}
            </Link>
          ))}
        </nav>
      )}

      <Suspense fallback={<p className="vuln-lab-loading">실습 화면을 불러오는 중…</p>}>
        {/* 실습을 바꾸면 상태를 새로 시작 */}
        <Lab key={`${vulnId}/${labId}`} />
      </Suspense>
    </div>
  );
}

export default VulnPracticePage;
