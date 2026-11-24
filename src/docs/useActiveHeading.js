import { useCallback, useEffect, useRef, useState } from 'react';

// 고정 헤더 아래 이 거리(px)를 지난 마지막 소제목을 현재 위치로 본다
const ACTIVE_OFFSET = 40;
// 목차를 눌러 스크롤하는 동안에는 누른 항목을 표시한다. 스크롤 이벤트가 이 시간만큼 없으면 끝난 것으로 본다.
const CLICK_SETTLE_MS = 200;

function headerHeight() {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--header-h');
  return parseFloat(value) || 61;
}

function findActive(headings) {
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  if (atBottom) return headings.at(-1)?.id ?? null;
  // 좁은 화면에서는 본문 위 목차 막대도 헤더 아래에 붙어 있다
  const bar = document.querySelector('.docs-toc-bar');
  const barHeight = bar && bar.offsetParent !== null ? bar.offsetHeight : 0;
  const line = headerHeight() + barHeight + ACTIVE_OFFSET;
  let active = null;
  for (const h of headings) {
    const el = document.getElementById(h.id);
    if (el && el.getBoundingClientRect().top <= line) active = h.id;
  }
  return active;
}

/**
 * 지금 읽고 있는 소제목과, 소제목으로 스크롤하는 함수.
 * 문서 끝 쪽 소제목은 화면 맨 위까지 올라가지 못해서 스크롤 위치로 계산하면 다른 항목이 표시되므로,
 * 목차를 눌러 이동하는 동안에는 누른 항목을 그대로 둔다.
 */
export function useActiveHeading(headings) {
  const [active, setActive] = useState(null);
  const clickLock = useRef({ locked: false, timer: 0 });

  const releaseLater = useCallback(() => {
    const lock = clickLock.current;
    clearTimeout(lock.timer);
    lock.timer = setTimeout(() => {
      lock.locked = false;
    }, CLICK_SETTLE_MS);
  }, []);

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
  }, [headings, releaseLater]);

  const goTo = useCallback(
    (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      clickLock.current.locked = true;
      releaseLater(); // 이미 그 위치라 스크롤이 일어나지 않는 경우
      setActive(id);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [releaseLater],
  );

  return [active, goTo];
}
