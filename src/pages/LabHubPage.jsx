import { Link } from 'react-router';
import { labs } from '../data/curriculum.js';
import './Pages.css';

function LabHubPage() {
  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="현재 위치">
        <Link to="/">홈</Link>
        <span aria-hidden="true">/</span>
        <span>실습</span>
      </nav>

      <header className="topic-header">
        <h1>실습</h1>
        <p>학습한 내용을 실제 환경에서 확인해 보세요. 원하는 실습을 선택하면 됩니다.</p>
      </header>

      <ul className="topic-grid lab-grid">
        {labs.map((lab) => (
          <li key={lab.id}>
            <Link to={lab.path} className="topic-card topic-card--lab">
              <span className="topic-card__num">{lab.icon}</span>
              <span className="topic-card__title">{lab.title}</span>
              <span className="topic-card__summary">{lab.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default LabHubPage;
