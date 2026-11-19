import { Link } from 'react-router';
import { labPath, labs } from '../data/curriculum.js';
import './Pages.css';

const lab = labs.find((l) => l.id === 'wireshark');

function WiresharkLabPage() {
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
        <p>{lab.summary}</p>
      </header>

      {/* TODO: 패킷 캡처/분석 기능 연동 (백엔드 API 확정 후 구현) */}
      <section className="placeholder-card placeholder-card--static">
        패킷 분석 실습 기능을 준비하고 있습니다.
      </section>
    </div>
  );
}

export default WiresharkLabPage;
