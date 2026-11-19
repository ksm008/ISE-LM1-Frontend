import { Link } from 'react-router';
import { labs } from '../data/curriculum.js';
import './Pages.css';

function LinuxMasterPage() {
  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="현재 위치">
        <Link to="/">홈</Link>
        <span aria-hidden="true">/</span>
        <span>리눅스마스터 1급</span>
      </nav>

      <header className="topic-header">
        <h1>리눅스마스터 1급</h1>
        <p>주요 항목을 준비하고 있습니다.</p>
      </header>

      <section className="placeholder-card placeholder-card--static">
        학습 콘텐츠를 준비하고 있습니다. 그동안 <Link to={labs.find((l) => l.id === 'terminal').path}>터미널 실습</Link>에서 리눅스 명령어를 연습해 보세요.
      </section>
    </div>
  );
}

export default LinuxMasterPage;
