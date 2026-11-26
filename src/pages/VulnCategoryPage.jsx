import { Link, useParams } from 'react-router';
import { labPath, vulnCategories, vulnItem, vulnItemPath, vulnLabPath, vulnPath } from '../data/curriculum.js';
import NotFoundPage from './NotFoundPage.jsx';
import './Pages.css';

// 웹 취약점 실습: 카테고리 페이지 (세부 항목 중 lab 이 있는 것은 실습 페이지로 연결)
function VulnCategoryPage() {
  const { vulnId } = useParams();
  const index = vulnCategories.findIndex((v) => v.id === vulnId);

  if (index === -1) return <NotFoundPage />;

  const vuln = vulnCategories[index];
  const prev = vulnCategories[index - 1];
  const next = vulnCategories[index + 1];

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="현재 위치">
        <Link to="/">홈</Link>
        <span aria-hidden="true">/</span>
        <Link to={labPath}>실습</Link>
        <span aria-hidden="true">/</span>
        <Link to={vulnLabPath}>웹 취약점 실습</Link>
        <span aria-hidden="true">/</span>
        <span>{vuln.title}</span>
      </nav>

      <header className="topic-header">
        <span className="topic-header__num">{String(index + 1).padStart(2, '0')}</span>
        <h1>{vuln.title}</h1>
        <p>{vuln.summary}</p>
      </header>

      {vuln.groups?.map((group) => (
        <section key={group.label} className="vuln-group">
          <h2>{group.label}</h2>
          <ul className="topic-grid">
            {group.items.map(vulnItem).map((item) => (
              <li key={item.title}>
                {item.lab ? (
                  <Link to={vulnItemPath(vuln.id, item.lab)} className="topic-card vuln-group__item">
                    <strong>{item.title}</strong>
                    <span>{item.summary}</span>
                    <span className="vuln-group__go">실습하기 →</span>
                  </Link>
                ) : (
                  <div className="placeholder-card vuln-group__item">
                    <strong>{item.title}</strong>
                    <span>실습 내용을 준비하고 있습니다.</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!vuln.groups && (
        <section className="placeholder-card placeholder-card--static">실습 내용을 준비하고 있습니다.</section>
      )}

      <nav className="pager" aria-label="취약점 이동">
        {prev ? (
          <Link to={vulnPath(prev.id)} className="pager__link">
            <small>이전 취약점</small>
            {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={vulnPath(next.id)} className="pager__link pager__link--next">
            <small>다음 취약점</small>
            {next.title}
          </Link>
        ) : (
          <Link to={vulnLabPath} className="pager__link pager__link--next">
            <small>마지막 항목</small>
            취약점 목록으로
          </Link>
        )}
      </nav>
    </div>
  );
}

export default VulnCategoryPage;
