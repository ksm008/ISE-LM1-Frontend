import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const ROW_HEIGHT = 20;
const OVERSCAN = 10;

const COLUMNS = ['No.', 'Time', 'Source', 'Destination', 'Protocol', 'Length', 'Info'];

function relativeTime(packet, first) {
  if (!first) return '0.000000';
  return (packet.s - first.s + (packet.us - first.us) / 1e6).toFixed(6);
}

/**
 * 패킷 목록 (보이는 줄만 그린다).
 * autoScroll 이면 새 패킷이 들어올 때 맨 아래로 이동하고, 사용자가 위로 스크롤하면 onAutoScrollOff 를 부른다.
 */
function PacketList({ packets, first, selectedNo, onSelect, autoScroll, onAutoScrollOff, emptyMessage }) {
  const bodyRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(300);

  useEffect(() => {
    const el = bodyRef.current;
    const observer = new ResizeObserver(() => setHeight(el.clientHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (autoScroll && el) el.scrollTop = el.scrollHeight;
  }, [packets.length, autoScroll]);

  const selectedIndex = packets.findIndex((p) => p.no === selectedNo);

  const scrollToIndex = (index) => {
    const el = bodyRef.current;
    const top = index * ROW_HEIGHT;
    if (top < el.scrollTop) el.scrollTop = top;
    // 머리글(ROW_HEIGHT) 아래에 보이도록 한 줄 더 내린다
    else if (top + ROW_HEIGHT * 2 > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW_HEIGHT * 2 - el.clientHeight;
  };

  const handleKeyDown = (e) => {
    if (!packets.length) return;
    const page = Math.max(1, Math.floor(height / ROW_HEIGHT) - 1);
    const moves = { ArrowDown: 1, ArrowUp: -1, PageDown: page, PageUp: -page };
    let next;
    if (e.key in moves) next = (selectedIndex < 0 ? 0 : selectedIndex) + moves[e.key];
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = packets.length - 1;
    else return;
    e.preventDefault();
    next = Math.min(packets.length - 1, Math.max(0, next));
    onSelect(packets[next].no);
    scrollToIndex(next);
    if (next < packets.length - 1) onAutoScrollOff();
  };

  const handleScroll = (e) => {
    const el = e.currentTarget;
    setScrollTop(el.scrollTop);
    if (autoScroll && el.scrollTop + el.clientHeight < el.scrollHeight - ROW_HEIGHT * 2) onAutoScrollOff();
  };

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(packets.length, Math.ceil((scrollTop + height) / ROW_HEIGHT) + OVERSCAN);
  const rows = [];
  for (let i = start; i < end; i++) {
    const p = packets[i];
    const s = p.summary;
    rows.push(
      <div
        key={p.no}
        role="row"
        aria-selected={p.no === selectedNo}
        className={`ws-list__row pkt--${s.color}${p.no === selectedNo ? ' is-selected' : ''}`}
        style={{ top: i * ROW_HEIGHT }}
        onMouseDown={() => onSelect(p.no)}
      >
        <span className="num">{p.no}</span>
        <span className="num">{relativeTime(p, first)}</span>
        <span>{s.src}</span>
        <span>{s.dst}</span>
        <span>{s.protocol}</span>
        <span className="num">{p.len}</span>
        <span>{s.info}</span>
      </div>,
    );
  }

  return (
    <div className="ws-list" role="grid" aria-label="패킷 목록">
      <div ref={bodyRef} className="ws-list__body" tabIndex={0} onScroll={handleScroll} onKeyDown={handleKeyDown}>
        {/* 가로 스크롤 때 목록과 함께 움직이도록 스크롤 영역 안에 둔다 */}
        <div className="ws-list__head" role="row">
          {COLUMNS.map((c) => (
            <span key={c} role="columnheader">
              {c}
            </span>
          ))}
        </div>
        <div className="ws-list__spacer" style={{ height: packets.length * ROW_HEIGHT }}>
          {rows}
        </div>
        {packets.length === 0 && emptyMessage && <div className="ws-list__empty">{emptyMessage}</div>}
      </div>
    </div>
  );
}

export default PacketList;
