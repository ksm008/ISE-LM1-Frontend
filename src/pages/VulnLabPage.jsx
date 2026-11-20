import { Link } from 'react-router';
import { labPath, labs, vulnCategories, vulnPath } from '../data/curriculum.js';
import './Pages.css';

const lab = labs.find((l) => l.id === 'vuln');

// 웹 취약점 실습: 카테고리 목록
function VulnLabPage() {
  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="현재 위치">
        <Link to="/">홈</Link>
        <span aria-hidden="true">/</span>
        <Link to={labPath}>실습</Link>
        <span aria-hidden="true">/</span>
        <span>{lab.title}</span>
      </nav>

      <header className="topic-header">
        <h1>{lab.title}</h1>
        <p>{lab.summary} 실습할 취약점을 선택하세요.</p>
      </header>

      <ul className="topic-grid">
        {vulnCategories.map((vuln, index) => (
          <li key={vuln.id}>
            <Link to={vulnPath(vuln.id)} className="topic-card">
              <span className="topic-card__num">{String(index + 1).padStart(2, '0')}</span>
              <span className="topic-card__title">{vuln.title}</span>
              <span className="topic-card__summary">{vuln.summary}</span>
              {vuln.groups && (
                <span className="vuln-tags">
                  {vuln.groups.flatMap((g) => g.items).map((item) => (
                    <span key={item} className="vuln-tag">
                      {item}
                    </span>
                  ))}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default VulnLabPage;
