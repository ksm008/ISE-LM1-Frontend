import { Link, useParams } from 'react-router';
import { isecTopics, labPath, topicPath } from '../data/curriculum.js';
import NotFoundPage from './NotFoundPage.jsx';
import './Pages.css';

function TopicPage() {
  const { topicId } = useParams();
  const index = isecTopics.findIndex((t) => t.id === topicId);

  if (index === -1) return <NotFoundPage />;

  const topic = isecTopics[index];
  const prev = isecTopics[index - 1];
  const next = isecTopics[index + 1];

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="현재 위치">
        <Link to="/">홈</Link>
        <span aria-hidden="true">/</span>
        <span>정보보안기사</span>
      </nav>

      <header className="topic-header">
        <span className="topic-header__num">{String(index + 1).padStart(2, '0')}</span>
        <h1>{topic.title}</h1>
        <p>{topic.summary}</p>
      </header>

      <section className="placeholder-card placeholder-card--static">
        학습 콘텐츠를 준비하고 있습니다.
      </section>

      <nav className="pager" aria-label="항목 이동">
        {prev ? (
          <Link to={topicPath(prev.id)} className="pager__link">
            <small>이전 항목</small>
            {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={topicPath(next.id)} className="pager__link pager__link--next">
            <small>다음 항목</small>
            {next.title}
          </Link>
        ) : (
          <Link to={labPath} className="pager__link pager__link--next pager__link--lab">
            <small>마지막 단계</small>
            실습하러 가기 (터미널 · Wireshark)
          </Link>
        )}
      </nav>
    </div>
  );
}

export default TopicPage;
