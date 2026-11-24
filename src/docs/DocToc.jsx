import { useEffect, useRef, useState } from 'react';

// 이 위치(화면 위쪽 기준, 헤더 높이 포함)를 지난 마지막 소제목을 현재 위치로 본다
const ACTIVE_OFFSET = 100;
// 목차를 눌러 스크롤하는 동안에는 누른 항목을 표시한다. 스크롤 이벤트가 이 시간만큼 없으면 끝난 것으로 본다.
const CLICK_SETTLE_MS = 200;

function findActive(headings) {
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  if (atBottom) return headings.at(-1)?.id ?? null;
  let active = null;
  for (const h of headings) {
    const el = document.getElementById(h.id);
    if (el && el.getBoundingClientRect().top <= ACTIVE_OFFSET) active = h.id;
  }
  return active;
}

// 문서 오른쪽 목차: 소제목(##, ###, ####)을 누르면 그 위치로 스크롤한다
function DocToc({ headings }) {
  const [active, setActive] = useState(null);
  // 문서 끝 쪽 소제목은 화면 맨 위까지 올라가지 못해서, 스크롤 위치로 계산하면 다른 항목이 표시된다
  const clickLock = useRef({ locked: false, timer: 0 });

  const releaseLater = () => {
    const lock = clickLock.current;
    clearTimeout(lock.timer);
    lock.timer = setTimeout(() => {
      lock.locked = false;
    }, CLICK_SETTLE_MS);
  };

  useEffect(() => {
    if (headings.length === 0) return undefined;
    const lock = clickLock.current;
    // 소제목 수가 적어 스크롤마다 바로 계산한다 (requestAnimationFrame 은 창이 가려지면 멈춘다)
    const update = () => {
      if (lock.locked) {
        releaseLater();
        return;
      }
      setActive(findActive(headings));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      clearTimeout(lock.timer);
      lock.locked = false;
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [headings]);

  if (headings.length === 0) return null;

  const go = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    clickLock.current.locked = true;
    releaseLater(); // 이미 그 위치라 스크롤이 일어나지 않는 경우
    setActive(id);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="docs-toc" aria-label="이 문서의 목차">
      <p className="docs-side__label">목차</p>
      <ul>
        {headings.map((h) => (
          <li key={h.id} className={`docs-toc__item docs-toc__item--h${h.level}`}>
            <button
              type="button"
              onClick={() => go(h.id)}
              aria-current={h.id === active ? 'location' : undefined}
            >
              {h.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default DocToc;
