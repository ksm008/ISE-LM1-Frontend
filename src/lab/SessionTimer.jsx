import { useSyncExternalStore } from 'react';

// 남은 세션 시간 표시용 현재 시각(초 단위). active 일 때만 1초마다 다시 그린다.
const subscribeClock = (onChange) => {
  const timer = setInterval(onChange, 1000);
  return () => clearInterval(timer);
};
const subscribeNothing = () => () => {};
const getNowSeconds = () => Math.floor(Date.now() / 1000) * 1000;

function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/** 남은 세션 시간. expiresAt 이 없으면(실습 중이 아니면) 아무것도 그리지 않는다. */
function SessionTimer({ expiresAt, label = '남은 시간 ', className = '' }) {
  const active = expiresAt !== null;
  const now = useSyncExternalStore(active ? subscribeClock : subscribeNothing, getNowSeconds);
  if (!active) return null;

  const remainingMs = expiresAt - now;
  return (
    <span
      className={`session-timer${remainingMs <= 60_000 ? ' is-expiring' : ''} ${className}`.trim()}
      title="세션이 만료되면 실습이 종료됩니다"
    >
      {label}
      {formatRemaining(remainingMs)}
    </span>
  );
}

export default SessionTimer;
