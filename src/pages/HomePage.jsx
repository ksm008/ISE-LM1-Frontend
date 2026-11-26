import { Link } from 'react-router';
import { useAuth } from '../auth/authContext.js';
import '../auth/Auth.css';
import { isecTopics, labPath, labs, topicPath } from '../data/curriculum.js';
import './Pages.css';

function HomePage() {
  const { me } = useAuth();

  return (
    <div className="page">
      {/* 로그인 전에는 메인 페이지만 미리 보기로 볼 수 있다 */}
      {me && !me.active && (
        <div className="preview-banner">
          <span>
            {me.authenticated
              ? '이메일 인증을 마치면 모든 학습 콘텐츠와 실습을 이용할 수 있습니다.'
              : '미리 보기 화면입니다. 로그인하면 모든 학습 콘텐츠와 실습을 이용할 수 있습니다.'}
          </span>
          <span className="preview-banner__actions">
            {me.authenticated ? (
              <Link to="/verify-email" className="btn btn--primary">
                이메일 인증하기
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn--primary">
                  로그인
                </Link>
                <Link to="/signup" className="btn">
                  회원가입
                </Link>
              </>
            )}
          </span>
        </div>
      )}

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

      {/* 로그인 상태를 확인하는 동안은 비워 둔다 (미리 보기 화면이 잠깐 보였다 바뀌지 않게) */}
      {me && (me.active ? <MemberContent /> : <GuestOverview />)}
    </div>
  );
}

// 로그인 전: 항목 이름은 보여 주지 않고 무엇을 담고 있는지만 간단히 알린다
const OVERVIEW = [
  {
    title: '정보보안기사 학습 문서',
    desc: '시험 범위를 다섯 개 영역으로 나눠 정리한 학습 문서를 제공합니다.',
  },
  {
    title: '브라우저에서 하는 보안 실습',
    desc: '실제 리눅스 환경과 시뮬레이터로 명령어, 패킷 분석, 장비 설정, 웹 취약점을 직접 다뤄 봅니다.',
  },
  {
    title: '리눅스마스터 1급',
    desc: '시험 범위 학습 자료를 준비하고 있습니다.',
  },
];

function GuestOverview() {
  return (
    <section className="section">
      <div className="section__head">
        <h2>무엇을 담고 있나요</h2>
        <p>로그인하면 모든 학습 문서와 실습을 이용할 수 있습니다.</p>
      </div>
      <ul className="overview-list">
        {OVERVIEW.map((item) => (
          <li key={item.title} className="overview-item">
            <strong>{item.title}</strong>
            <span>{item.desc}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// 로그인 후: 학습 항목 5개 한 줄, 실습 4개 한 줄
function MemberContent() {
  return (
    <>
      <section className="section">
        <div className="section__head">
          <h2>정보보안기사 학습</h2>
          <p>다섯 개 영역의 학습 문서를 차례로 읽어 보세요.</p>
        </div>
        <ol className="home-grid home-grid--topics">
          {isecTopics.map((topic, idx) => (
            <li key={topic.id}>
              <Link to={topicPath(topic.id)} className="topic-card">
                <span className="topic-card__num">{String(idx + 1).padStart(2, '0')}</span>
                <span className="topic-card__title">{topic.title}</span>
                <span className="topic-card__summary">{topic.summary}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>실습</h2>
          <p>터미널, 패킷 분석, 라우터 설정, 웹 취약점을 직접 다뤄 보세요.</p>
        </div>
        <ul className="home-grid home-grid--labs">
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
    </>
  );
}

export default HomePage;
