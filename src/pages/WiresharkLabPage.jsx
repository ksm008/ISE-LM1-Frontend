import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { labPath } from '../data/curriculum.js';
import { useTerminalSession, terminalLabPath } from '../lab/terminalSession.js';
import { useCapture } from '../wireshark/useCapture.js';
import { compileFilter, FILTER_EXAMPLES } from '../wireshark/filter.js';
import { LINK_TYPES } from '../wireshark/dissect.js';
import PacketList from '../wireshark/PacketList.jsx';
import PacketDetails from '../wireshark/PacketDetails.jsx';
import { findNodePath } from '../wireshark/tree.js';
import PacketBytes from '../wireshark/PacketBytes.jsx';
import '../wireshark/Wireshark.css';

// ---- 툴바 아이콘 ----
const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    {children}
  </svg>
);
const StartIcon = () => (
  <Icon>
    <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
  </Icon>
);
const StopIcon = () => (
  <Icon>
    <rect x="5.5" y="5.5" width="13" height="13" rx="1.5" fill="currentColor" />
  </Icon>
);
const RestartIcon = () => (
  <Icon>
    <path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M19.5 3.5v5h-5z" fill="currentColor" />
  </Icon>
);
const OpenIcon = () => (
  <Icon>
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" fill="none" stroke="currentColor" strokeWidth="1.8" />
  </Icon>
);
const SaveIcon = () => (
  <Icon>
    <path d="M5 4h11l3 3v13H5z M8 4v5h7V4 M8 20v-6h8v6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </Icon>
);
const ClearIcon = () => (
  <Icon>
    <path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </Icon>
);
const AutoScrollIcon = () => (
  <Icon>
    <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

const MIN_PANE = 12; // %

function WiresharkLabPage() {
  const { labId, status, startLab } = useTerminalSession();
  const labRunning = status === 'connected' && Boolean(labId);
  const capture = useCapture(labRunning ? labId : null);

  // 들어오면 터미널 실습을 자동으로 시작한다. 이 페이지에서는 터미널이 PIP 창으로 뜬다.
  // 진행 중인 실습이 있으면 그대로 쓴다.
  useEffect(() => {
    startLab();
  }, [startLab]);
  const { store, version, capturing, connection, interfaces, notice } = capture;

  const [iface, setIface] = useState('any');
  const [captureFilter, setCaptureFilter] = useState('');
  const [filterText, setFilterText] = useState('');
  const [appliedFilter, setAppliedFilter] = useState({ text: '', test: null });
  const [selectedNo, setSelectedNo] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const [sizes, setSizes] = useState([46, 32]); // 목록, 상세 (%). 바이트 창은 나머지
  const panesRef = useRef(null);
  const fileRef = useRef(null);

  const draft = useMemo(() => compileFilter(filterText), [filterText]);
  const dirty = filterText.trim() !== appliedFilter.text;

  // version 이 바뀌면 store.list 에 패킷이 추가된 것이다
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allPackets = useMemo(() => store.list.slice(), [store, version]);
  const displayed = useMemo(
    () => (appliedFilter.test ? allPackets.filter((p) => appliedFilter.test(p.fields)) : allPackets),
    [allPackets, appliedFilter],
  );
  const first = allPackets[0];
  const selected = selectedNo === null ? null : allPackets.find((p) => p.no === selectedNo) ?? null;

  const ready = connection === 'ready';
  const applyFilter = (text = filterText) => {
    const result = compileFilter(text);
    if (!result.ok) return;
    setFilterText(text);
    setAppliedFilter({ text: text.trim(), test: result.test });
  };

  const startCapture = () => {
    setSelectedNo(null);
    setSelectedNode(null);
    setAutoScroll(true);
    capture.start(iface, captureFilter);
  };

  const selectPacket = useCallback((no) => {
    setSelectedNo(no);
    setSelectedNode(null);
  }, []);

  const toggleNode = useCallback((key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // 바이트를 누르면 그 바이트를 담은 가장 깊은 항목을 펼쳐서 고른다
  const selectOffset = (offset) => {
    if (!selected) return;
    const path = findNodePath(selected.tree, offset);
    if (!path.length) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      path.slice(0, -1).forEach((n) => next.add(n.key));
      return next;
    });
    setSelectedNode(path.at(-1));
  };

  // 창 사이 경계 끌기
  const beginResize = (index) => (e) => {
    e.preventDefault();
    const rect = panesRef.current.getBoundingClientRect();
    const startY = e.clientY;
    const start = [...sizes];
    const move = (ev) => {
      const delta = ((ev.clientY - startY) / rect.height) * 100;
      const next = [...start];
      if (index === 0) {
        next[0] = Math.min(Math.max(start[0] + delta, MIN_PANE), start[0] + start[1] - MIN_PANE);
        next[1] = start[0] + start[1] - next[0];
      } else {
        next[1] = Math.min(Math.max(start[1] + delta, MIN_PANE), 100 - start[0] - MIN_PANE);
      }
      setSizes(next);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const filterState = !filterText.trim() ? '' : draft.ok ? ' is-valid' : ' is-invalid';
  const emptyMessage = !labRunning
    ? null
    : capturing
      ? '패킷을 기다리는 중입니다. 터미널에서 ping, curl, nmap 등을 실행해 보세요.'
      : appliedFilter.test && allPackets.length
        ? '표시 필터와 일치하는 패킷이 없습니다.'
        : '▶ 버튼을 눌러 캡처를 시작하세요.';

  return (
    <div className="ws-lab">
      <div className="ws-titlebar">
        <Link to={labPath} className="ws-titlebar__back">
          ← 실습 목록
        </Link>
        <h1>Wireshark 패킷 분석</h1>
        <span className="ws-titlebar__hint">
          {labRunning
            ? '터미널은 PIP 창에서 사용하고, 여기서 패킷을 확인하세요.'
            : status === 'connecting'
              ? '실습 컨테이너를 준비하고 있습니다…'
              : '터미널 실습이 실행 중이 아닙니다.'}
        </span>
      </div>

      {/* 메인 툴바 */}
      <div className="ws-toolbar" role="toolbar" aria-label="캡처 도구">
        <button type="button" className="ws-tool ws-tool--start" title="캡처 시작" onClick={startCapture} disabled={!ready || capturing}>
          <StartIcon />
        </button>
        <button type="button" className="ws-tool ws-tool--stop" title="캡처 중지" onClick={capture.stop} disabled={!capturing}>
          <StopIcon />
        </button>
        <button type="button" className="ws-tool ws-tool--restart" title="캡처 다시 시작" onClick={startCapture} disabled={!capturing}>
          <RestartIcon />
        </button>
        <span className="ws-toolbar__sep" />
        <button type="button" className="ws-tool" title="pcap 파일 열기" onClick={() => fileRef.current.click()}>
          <OpenIcon />
        </button>
        <button
          type="button"
          className="ws-tool"
          title={appliedFilter.test ? '표시된 패킷을 pcap 으로 저장' : 'pcap 으로 저장'}
          onClick={() => capture.save(displayed)}
          disabled={displayed.length === 0}
        >
          <SaveIcon />
        </button>
        <button
          type="button"
          className="ws-tool"
          title="목록 지우기"
          onClick={() => {
            capture.clear();
            setSelectedNo(null);
            setSelectedNode(null);
          }}
          disabled={allPackets.length === 0}
        >
          <ClearIcon />
        </button>
        <button
          type="button"
          className={`ws-tool${autoScroll ? ' is-on' : ''}`}
          title="실시간 캡처 중 마지막 패킷으로 자동 스크롤"
          aria-pressed={autoScroll}
          onClick={() => setAutoScroll((v) => !v)}
        >
          <AutoScrollIcon />
        </button>
        <span className="ws-toolbar__sep" />
        <label className="ws-field">
          인터페이스
          <select value={iface} onChange={(e) => setIface(e.target.value)} disabled={!ready || capturing}>
            {interfaces.map((name) => (
              <option key={name} value={name}>
                {name === 'any' ? 'any (모든 인터페이스)' : name}
              </option>
            ))}
          </select>
        </label>
        <label className="ws-field ws-field--grow">
          캡처 필터
          <input
            type="text"
            value={captureFilter}
            placeholder="BPF 문법, 예: icmp or port 53"
            onChange={(e) => setCaptureFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ready && startCapture()}
            disabled={!ready || capturing}
            spellCheck={false}
            maxLength={512}
          />
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".pcap,.cap,.dmp"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) {
              setSelectedNo(null);
              setSelectedNode(null);
              setAutoScroll(false);
              capture.openFile(file);
            }
          }}
        />
      </div>

      {/* 표시 필터 */}
      <form
        className="ws-filterbar"
        onSubmit={(e) => {
          e.preventDefault();
          applyFilter();
        }}
      >
        <input
          className={`ws-filterbar__input${filterState}`}
          type="text"
          value={filterText}
          placeholder="표시 필터 적용 … 예: tcp.port == 80 && ip.addr == 10.0.0.1"
          onChange={(e) => setFilterText(e.target.value)}
          spellCheck={false}
          aria-invalid={!draft.ok}
          title={draft.ok ? '' : draft.error}
        />
        {filterText && (
          <button
            type="button"
            className="ws-filterbar__clear"
            title="필터 지우기"
            onClick={() => {
              setFilterText('');
              setAppliedFilter({ text: '', test: null });
            }}
          >
            ×
          </button>
        )}
        <button type="submit" className="ws-filterbar__apply" disabled={!draft.ok || !dirty}>
          적용
        </button>
        <select
          className="ws-filterbar__examples"
          value=""
          onChange={(e) => e.target.value && applyFilter(e.target.value)}
          aria-label="필터 예시"
        >
          <option value="">필터 예시…</option>
          {FILTER_EXAMPLES.map((ex) => (
            <option key={ex.filter} value={ex.filter}>
              {ex.label} — {ex.filter}
            </option>
          ))}
        </select>
      </form>
      {!draft.ok && <div className="ws-filterbar__error">{draft.error}</div>}

      {/* 목록 / 상세 / 바이트 */}
      <div className="ws-panes" ref={panesRef}>
        <section className="ws-pane" style={{ flexBasis: `${sizes[0]}%` }}>
          {!labRunning && allPackets.length === 0 ? (
            <div className="ws-guide">
              {status === 'disconnected' ? (
                <>
                  <strong>터미널 실습이 종료되었습니다.</strong>
                  <div>
                    <button type="button" className="ws-guide__btn" onClick={() => startLab()}>
                      실습 다시 시작
                    </button>
                  </div>
                </>
              ) : (
                <strong>실습 컨테이너를 준비하고 있습니다… 오른쪽 아래 PIP 창에 터미널이 뜹니다.</strong>
              )}
              <ol>
                <li>준비가 끝나면 ▶ 로 캡처를 시작합니다.</li>
                <li>
                  PIP 터미널에서 <code>ping -c 3 8.8.8.8</code>, <code>curl http://example.com</code>, <code>nmap localhost</code> 등을
                  실행하고 패킷을 확인합니다.
                </li>
                <li>
                  터미널을 크게 쓰려면 PIP 창의 <b>원래 화면으로</b>(<Link to={terminalLabPath}>터미널 실습</Link>)를 누릅니다. 이
                  화면으로 돌아오면 다시 PIP 가 됩니다.
                </li>
              </ol>
              <span>저장해 둔 pcap 파일은 실습 없이도 툴바의 폴더 버튼(pcap 파일 열기)으로 열어 볼 수 있습니다.</span>
            </div>
          ) : (
            <PacketList
              packets={displayed}
              first={first}
              selectedNo={selectedNo}
              onSelect={selectPacket}
              autoScroll={autoScroll}
              onAutoScrollOff={() => setAutoScroll(false)}
              emptyMessage={emptyMessage}
            />
          )}
        </section>
        <div className="ws-splitter" onPointerDown={beginResize(0)} role="separator" aria-orientation="horizontal" />
        <section className="ws-pane ws-pane--scroll" style={{ flexBasis: `${sizes[1]}%` }}>
          <PacketDetails
            tree={selected?.tree}
            expanded={expanded}
            onToggle={toggleNode}
            selected={selectedNode}
            onSelect={setSelectedNode}
          />
        </section>
        <div className="ws-splitter" onPointerDown={beginResize(1)} role="separator" aria-orientation="horizontal" />
        <section className="ws-pane ws-pane--scroll" style={{ flexBasis: `${100 - sizes[0] - sizes[1]}%` }}>
          <PacketBytes bytes={selected?.bytes} highlight={selectedNode} onSelectOffset={selectOffset} />
        </section>
      </div>

      {/* 상태 표시줄 */}
      <div className="ws-status">
        <span className={`ws-status__dot is-${capturing ? 'live' : ready ? 'ready' : 'off'}`} />
        <span className={`ws-status__msg${notice?.error ? ' is-error' : ''}`}>
          {notice?.text ??
            (ready ? '준비됨' : connection === 'connecting' ? '캡처 서버에 연결 중…' : labRunning ? '연결 끊김' : '실습 대기 중')}
        </span>
        <span className="ws-status__field">{selectedNode ? selectedNode.label : ''}</span>
        <span className="ws-status__count">
          {store.linkType !== null && `${LINK_TYPES[store.linkType] ?? `링크 타입 ${store.linkType}`} · `}
          패킷: {allPackets.length.toLocaleString()} · 표시: {displayed.length.toLocaleString()}
          {allPackets.length > 0 && ` (${((displayed.length / allPackets.length) * 100).toFixed(1)}%)`}
        </span>
      </div>
    </div>
  );
}

export default WiresharkLabPage;
