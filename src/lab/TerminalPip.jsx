import { useEffect, useRef, useState } from 'react';
import SessionTimer from './SessionTimer.jsx';
import TerminalView from './TerminalView.jsx';
import { useTerminalSession } from './terminalSession.js';
import './TerminalLab.css';

const MARGIN = 16;
const MIN_WIDTH = 300;
const MIN_HEIGHT = 160;
const DEFAULT_WIDTH = 560;
const DEFAULT_HEIGHT = 340;

// 크기 조절 손잡이 (가장자리 4개 + 모서리 4개)
const RESIZE_DIRECTIONS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

// 화면 오른쪽 아래 구석의 기본 위치
function initialRect() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.max(MIN_WIDTH, Math.min(DEFAULT_WIDTH, vw - MARGIN * 2));
  const h = Math.max(MIN_HEIGHT, Math.min(DEFAULT_HEIGHT, vh - MARGIN * 2));
  return { x: Math.max(0, vw - w - MARGIN), y: Math.max(0, vh - h - MARGIN), w, h };
}

// 창 크기가 바뀌어도 PIP 가 화면 밖으로 나가지 않게 한다
function fitIntoViewport(rect) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = clamp(rect.w, MIN_WIDTH, vw);
  const h = clamp(rect.h, MIN_HEIGHT, vh);
  return { w, h, x: clamp(rect.x, 0, vw - w), y: clamp(rect.y, 0, vh - h) };
}

function PipWindow({ session }) {
  const { status, expiresAt, exitPip, closePip, renewSession } = session;
  const [rect, setRect] = useState(initialRect);
  const gestureRef = useRef(null); // 진행 중인 이동/크기 조절 { mode, dir, startX, startY, start }

  useEffect(() => {
    const handleResize = () => setRect((r) => fitIntoViewport(r));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const beginGesture = (e, mode, dir) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    gestureRef.current = { mode, dir, startX: e.clientX, startY: e.clientY, start: rect };
  };

  const moveGesture = (e) => {
    const g = gestureRef.current;
    if (!g) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const s = g.start;

    if (g.mode === 'move') {
      setRect({ ...s, x: clamp(s.x + dx, 0, vw - s.w), y: clamp(s.y + dy, 0, vh - s.h) });
      return;
    }

    let { x, y, w, h } = s;
    if (g.dir.includes('e')) {
      w = clamp(s.w + dx, MIN_WIDTH, vw - s.x);
    }
    if (g.dir.includes('w')) {
      x = clamp(s.x + dx, 0, s.x + s.w - MIN_WIDTH);
      w = s.w + (s.x - x);
    }
    if (g.dir.includes('s')) {
      h = clamp(s.h + dy, MIN_HEIGHT, vh - s.y);
    }
    if (g.dir.includes('n')) {
      y = clamp(s.y + dy, 0, s.y + s.h - MIN_HEIGHT);
      h = s.h + (s.y - y);
    }
    setRect({ x, y, w, h });
  };

  const endGesture = (e) => {
    if (!gestureRef.current) return;
    gestureRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const gestureHandlers = {
    onPointerMove: moveGesture,
    onPointerUp: endGesture,
    onPointerCancel: endGesture,
  };

  return (
    <div
      className="terminal-pip"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      role="dialog"
      aria-label="터미널 실습 PIP"
    >
      {/* 테두리 위쪽: 끌어서 이동. 왼쪽부터 원래 화면으로 / 세션 갱신 / 남은 시간, 맨 오른쪽에 종료 */}
      <div
        className="terminal-pip__bar"
        onPointerDown={(e) => {
          if (e.target.closest('button')) return;
          beginGesture(e, 'move');
        }}
        {...gestureHandlers}
      >
        <button type="button" className="terminal-pip__btn" onClick={exitPip} title="원래 화면으로">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path
              d="M14 10 21 3M14 10V5M14 10h5M10 14l-7 7M10 14v5M10 14H5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          원래 화면으로
        </button>
        <button
          type="button"
          className="terminal-pip__btn"
          onClick={renewSession}
          disabled={status !== 'connected'}
          title="지금부터 세션 시간을 다시 처음 길이(기본 10분)로 연장합니다"
        >
          세션 갱신
        </button>
        <SessionTimer expiresAt={expiresAt} label="" className="terminal-pip__timer" />
        <button
          type="button"
          className="terminal-pip__close"
          onClick={closePip}
          title="실습 종료"
          aria-label="실습 종료"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <TerminalView className="terminal-pip__body" />

      {RESIZE_DIRECTIONS.map((dir) => (
        <div
          key={dir}
          className={`terminal-pip__resize terminal-pip__resize--${dir}`}
          onPointerDown={(e) => beginGesture(e, 'resize', dir)}
          {...gestureHandlers}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

// PIP 모드일 때 화면 위에 떠 있는 터미널 창. 페이지를 이동해도 유지된다.
function TerminalPip() {
  const session = useTerminalSession();
  if (!session.pip) return null;
  // PIP 를 열 때마다 오른쪽 아래 구석에서 시작
  return <PipWindow session={session} />;
}

export default TerminalPip;
