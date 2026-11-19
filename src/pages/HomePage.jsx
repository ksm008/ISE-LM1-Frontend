import { Link } from 'react-router';
import { isecTopics, labPath, labs, topicPath } from '../data/curriculum.js';
import './Pages.css';

function HomePage() {
  return (
    <div className="page">
      <section className="hero">
        <p className="hero__eyebrow">자격증 학습 사이트</p>
        <h1 className="hero__title">
          정보보안기사 · 리눅스마스터 1급
          <br />
          함께 준비하는 학습 공간
        </h1>
        <p className="hero__desc">
          정보보안기사와 리눅스마스터 1급 시험 범위를 항목별로 정리하고,
          실제 리눅스 컨테이너 터미널에서 직접 명령어를 실습할 수 있습니다.
        </p>
        <div className="hero__actions">
          <Link to={topicPath(isecTopics[0].id)} className="btn btn--primary">
            정보보안기사 학습 시작
          </Link>
          <Link to={labPath} className="btn">
            실습 바로가기
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>정보보안기사 주요 항목</h2>
          <p>다섯 개 항목을 차례로 학습한 뒤 터미널과 Wireshark로 직접 실습해 보세요.</p>
        </div>

        <ol className="topic-grid">
          {isecTopics.map((topic, idx) => (
            <li key={topic.id}>
              <Link to={topicPath(topic.id)} className="topic-card">
                <span className="topic-card__num">{String(idx + 1).padStart(2, '0')}</span>
                <span className="topic-card__title">{topic.title}</span>
                <span className="topic-card__summary">{topic.summary}</span>
              </Link>
            </li>
          ))}
          {labs.map((lab) => (
            <li key={lab.id}>
              <Link to={lab.path} className="topic-card topic-card--lab">
                <span className="topic-card__num">{lab.icon}</span>
                <span className="topic-card__title">{lab.title}</span>
                <span className="topic-card__summary">{lab.summary}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>리눅스마스터 1급</h2>
          <p>주요 항목을 준비하고 있습니다.</p>
        </div>
        <Link to="/linux" className="placeholder-card">
          리눅스마스터 1급 페이지로 이동 →
        </Link>
      </section>
    </div>
  );
}

export default HomePage;
