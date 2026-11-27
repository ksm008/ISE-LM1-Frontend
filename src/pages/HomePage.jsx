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
        <h1 className="hero__title">정보보안기사 · 리눅스마스터 1급 학습 노트</h1>
        <p className="hero__desc">
          시험 범위를 항목별로 직접 정리한 문서를 읽고, 같은 화면에서 실제 리눅스 컨테이너 터미널과
          실습 도구로 확인합니다.
        </p>
        <div className="hero__actions">
          <Link to={topicPath(isecTopics[0].id)} className="btn btn--primary">
            첫 문서부터 읽기
          </Link>
          <Link to={labPath} className="btn">
            실습 목록
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

// 로그인 후: 문서 차례처럼 한 줄씩. 학습 항목 번호는 읽는 순서(헤더 메뉴·항목 페이지와 같음)라 남긴다
function MemberContent() {
  return (
    <>
      <section className="section">
        <div className="section__head">
          <h2>정보보안기사</h2>
          <p>다섯 개 영역의 학습 문서를 차례로 읽어 보세요.</p>
        </div>
        <ol className="index-list">
          {isecTopics.map((topic, idx) => (
            <li key={topic.id}>
              <Link to={topicPath(topic.id)} className="index-row">
                <span className="index-row__num">{idx + 1}</span>
                <span className="index-row__body">
                  <span className="index-row__title">{topic.title}</span>
                  <span className="index-row__summary">{topic.summary}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>실습</h2>
          <p>문서에서 읽은 내용을 브라우저에서 직접 해 봅니다.</p>
        </div>
        <ul className="index-list index-list--plain">
          {labs.map((lab) => (
            <li key={lab.id}>
              <Link to={lab.path} className="index-row">
                <span className="index-row__body">
                  <span className="index-row__title">{lab.title}</span>
                  <span className="index-row__summary">{lab.summary}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>리눅스마스터 1급</h2>
        </div>
        <ul className="index-list index-list--plain">
          <li>
            <Link to="/linux" className="index-row">
              <span className="index-row__body">
                <span className="index-row__title">학습 자료 준비 중</span>
                <span className="index-row__summary">주요 항목을 정리하고 있습니다.</span>
              </span>
            </Link>
          </li>
        </ul>
      </section>
    </>
  );
}

export default HomePage;
