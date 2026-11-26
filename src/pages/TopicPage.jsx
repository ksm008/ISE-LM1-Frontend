import { Suspense, lazy, useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import { isecTopics, labPath, topicDocsDir, topicPath } from '../data/curriculum.js';
import { useDoc, useDocList } from '../docs/useDocs.js';
// 문서 표시(react-markdown, KaTeX 수식)는 문서 페이지를 열 때만 불러온다
const MarkdownDoc = lazy(() => import('../docs/MarkdownDoc.jsx'));
import { DocToc, DocTocSheet } from '../docs/DocToc.jsx';
import { useActiveHeading } from '../docs/useActiveHeading.js';
import NotFoundPage from './NotFoundPage.jsx';
import './Pages.css';

// 항목의 학습 문서: 백엔드 docs/isec/{번호-topicId}/*.md (topicDocsDir). 주소는 /isec/{topicId}[/{문서}] (문서를 빼면 첫 문서)
// 배치: 문서 목록 | 본문 | 목차. 양옆 폭이 같아서 본문이 페이지 가운데에 온다 (Docs.css)
function TopicDocs({ topicId, docSlug }) {
  const docsDir = topicDocsDir(topicId);
  const list = useDocList('isec', docsDir);
  const docs = list.data ?? [];
  const index = docSlug ? docs.findIndex((d) => d.slug === docSlug) : 0;
  const current = docs[index];
  const doc = useDoc('isec', docsDir, current?.slug);

  // 목차는 지금 보이는 문서의 것만 쓴다 (문서를 바꾼 직후 이전 문서의 목차가 남지 않게)
  const [toc, setToc] = useState({ slug: null, headings: [] });
  const loadedSlug = doc.data?.slug;
  const onHeadings = useCallback((headings) => setToc({ slug: loadedSlug, headings }), [loadedSlug]);
  const headings = toc.slug === current?.slug ? toc.headings : [];
  const [activeHeading, goToHeading] = useActiveHeading(headings);

  if (list.loading) return <p className="docs-status">문서를 불러오는 중입니다…</p>;
  if (list.error) return <section className="placeholder-card placeholder-card--static">{list.error.message}</section>;
  if (docs.length === 0) {
    return <section className="placeholder-card placeholder-card--static">학습 콘텐츠를 준비하고 있습니다.</section>;
  }

  const prev = docs[index - 1];
  const next = docs[index + 1];

  return (
    <div className="docs">
      <nav className="docs-nav" aria-label="문서 목록">
        <p className="docs-side__label">문서</p>
        {docs.map((d, i) => (
          <Link key={d.slug} to={docPath(topicId, d.slug)} aria-current={d === current ? 'page' : undefined}>
            <span className="docs-nav__num">{String(i + 1).padStart(2, '0')}</span>
            {d.title}
          </Link>
        ))}
      </nav>

      <div className="docs-main">
        {/* 좁은 화면에서만 보이는 목차 버튼 (넓은 화면은 오른쪽 목차) */}
        <DocTocSheet headings={headings} active={activeHeading} onSelect={goToHeading} />
        <article className="docs-article">
          {!current && <p className="docs-status">문서를 찾을 수 없습니다. 문서 목록에서 다시 고르세요.</p>}
          {current && doc.loading && <p className="docs-status">문서를 불러오는 중입니다…</p>}
          {current && doc.error && <p className="docs-status">{doc.error.message}</p>}
          {doc.data && (
            <Suspense fallback={<p className="docs-status">문서를 표시하는 중…</p>}>
              <MarkdownDoc markdown={doc.data.markdown} onHeadings={onHeadings} />
            </Suspense>
          )}
        </article>

        {current && (prev || next) && (
          <nav className="pager" aria-label="문서 이동">
            {prev ? (
              <Link to={docPath(topicId, prev.slug)} className="pager__link">
                <small>이전 문서</small>
                {prev.title}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link to={docPath(topicId, next.slug)} className="pager__link pager__link--next">
                <small>다음 문서</small>
                {next.title}
              </Link>
            )}
          </nav>
        )}
      </div>

      <aside className="docs-toc-col">
        <DocToc headings={headings} active={activeHeading} onSelect={goToHeading} />
      </aside>
    </div>
  );
}

function docPath(topicId, slug) {
  return `${topicPath(topicId)}/${slug}`;
}

function TopicPage() {
  const { topicId, docSlug } = useParams();
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

      <TopicDocs key={topicId} topicId={topicId} docSlug={docSlug} />

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
