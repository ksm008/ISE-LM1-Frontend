import { useEffect, useId, useRef, useState } from 'react';

function TocList({ headings, active, onSelect }) {
  return (
    <ul className="docs-toc__list">
      {headings.map((h) => (
        <li key={h.id} className={`docs-toc__item docs-toc__item--h${h.level}`}>
          <button type="button" onClick={() => onSelect(h.id)} aria-current={h.id === active ? 'location' : undefined}>
            {h.text}
          </button>
        </li>
      ))}
    </ul>
  );
}

// 넓은 화면: 문서 오른쪽 목차
export function DocToc({ headings, active, onSelect }) {
  if (headings.length === 0) return null;
  return (
    <nav className="docs-toc" aria-label="이 문서의 목차">
      <p className="docs-side__label">목차</p>
      <TocList headings={headings} active={active} onSelect={onSelect} />
    </nav>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M4 6h16M4 12h11M4 18h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 좁은 화면: 본문 위의 목차 버튼(스크롤해도 헤더 아래에 남음) → 아래에서 올라오는 목차 창
export function DocTocSheet({ headings, active, onSelect }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef(null);
  const openerRef = useRef(null);

  // 열려 있는 동안: Esc 로 닫기, 뒤 페이지 스크롤 막기, 닫으면 버튼으로 포커스 되돌리기
  useEffect(() => {
    if (!open) return undefined;
    const opener = openerRef.current;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      root.style.overflow = prevOverflow;
      opener?.focus({ preventScroll: true });
    };
  }, [open]);

  if (headings.length === 0) return null;

  const current = headings.find((h) => h.id === active);
  const select = (id) => {
    setOpen(false);
    // 스크롤 막기를 푼 다음(닫힌 뒤) 이동한다
    requestAnimationFrame(() => onSelect(id));
  };

  return (
    <>
      <div className="docs-toc-bar">
        <button
          ref={openerRef}
          type="button"
          className="docs-toc-bar__btn"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <ListIcon />
          <span className="docs-toc-bar__label">목차</span>
          {current && <span className="docs-toc-bar__current">{current.text}</span>}
        </button>
      </div>

      {open && (
        <div className="docs-toc-sheet" onClick={() => setOpen(false)}>
          <div
            className="docs-toc-sheet__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="docs-toc-sheet__head">
              <h2 id={titleId}>목차</h2>
              <button
                ref={closeRef}
                type="button"
                className="docs-toc-sheet__close"
                onClick={() => setOpen(false)}
                aria-label="목차 닫기"
              >
                ×
              </button>
            </div>
            <nav className="docs-toc docs-toc--sheet" aria-label="이 문서의 목차">
              <TocList headings={headings} active={active} onSelect={select} />
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
