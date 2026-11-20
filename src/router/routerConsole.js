import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { RouterSession } from './session.js';

// 라우터 콘솔: xterm 위에서 IOS 방식으로 한 줄씩 편집한다. React 와 분리해 두어
// RouterSessionProvider 가 하나를 만들어 실습 페이지와 PIP 창 사이로 옮겨 붙인다.
//   ? 바로 도움말 / Tab 자동 완성 / ↑↓ 명령 기록 / ←→ Home End 이동 / Ctrl+Z 설정 끝내기 / Ctrl+C 취소
//   Ctrl+U 줄 지우기 / Ctrl+W 단어 지우기 / 여러 줄 붙여넣기 / 우클릭: 선택 복사, 없으면 붙여넣기

const ESCAPES = [
  ['\x1b[A', 'up'],
  ['\x1b[B', 'down'],
  ['\x1b[C', 'right'],
  ['\x1b[D', 'left'],
  ['\x1b[H', 'home'],
  ['\x1b[F', 'end'],
  ['\x1bOH', 'home'],
  ['\x1bOF', 'end'],
  ['\x1b[1~', 'home'],
  ['\x1b[4~', 'end'],
  ['\x1b[3~', 'delete'],
];

/**
 * host(화면에 붙어 있는 div)에 라우터 콘솔을 연다.
 * @param {HTMLElement} host
 * @param {object} opts
 * @param {object|null} opts.startup 저장된 설정
 * @param {(value: object|null) => void} opts.onStartupChange 저장된 설정이 바뀔 때
 * @param {() => void} opts.onActivity 처음으로 키를 눌렀을 때 (콘솔 사용 시작)
 * @returns {{ fit, focus, dispose }}
 */
export function openRouterConsole(host, { startup, onStartupChange, onActivity }) {
  const term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Consolas, "Courier New", monospace',
    theme: { background: '#0b0f14', foreground: '#d7dde5', cursor: '#7ee787' },
    scrollback: 5000,
  });
  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(host);

  const fit = () => {
    if (!host.isConnected || host.clientWidth === 0 || host.clientHeight === 0) return;
    try {
      fitAddon.fit();
    } catch {
      // 크기를 계산할 수 없는 순간
    }
  };
  fit();

  let buffer = '';
  let cursor = 0;
  let lastPos = 0; // 마지막으로 그린 커서 위치 (프롬프트 포함, 줄바꿈 계산용)
  let histIndex = null;
  let draft = '';
  let active = false;
  let session = null;

  // 프롬프트 + 입력 중인 줄을 다시 그린다 (여러 줄로 넘어간 경우도 처리)
  const redraw = () => {
    const cols = term.cols;
    const prompt = session.prompt;
    const shown = session.echo ? buffer : '';
    const target = prompt.length + (session.echo ? cursor : 0);
    const up = Math.floor(lastPos / cols);
    let seq = up > 0 ? `\x1b[${up}A` : '';
    seq += '\r\x1b[J' + prompt + shown;
    const end = prompt.length + shown.length;
    if (end > 0 && end % cols === 0) seq += ' \b'; // 줄 끝에서 다음 줄로 넘어가게 한다
    const back = Math.floor(end / cols) - Math.floor(target / cols);
    if (back > 0) seq += `\x1b[${back}A`;
    seq += '\r';
    if (target % cols) seq += `\x1b[${target % cols}C`;
    term.write(seq);
    lastPos = target;
  };

  const resetLine = () => {
    buffer = '';
    cursor = 0;
    lastPos = 0;
    histIndex = null;
  };

  session = new RouterSession({
    startup,
    onOutput: (text) => term.write(text),
    onAsync: () => {
      resetLine();
      redraw();
    },
    onStartupChange,
  });
  redraw();

  const moveToEnd = () => {
    cursor = buffer.length;
    redraw();
  };

  const submit = () => {
    moveToEnd();
    term.write('\r\n');
    const line = buffer;
    resetLine();
    session.submit(line);
    redraw();
  };

  const insert = (text) => {
    buffer = buffer.slice(0, cursor) + text + buffer.slice(cursor);
    cursor += text.length;
    histIndex = null;
    redraw();
  };

  const showHelp = () => {
    moveToEnd();
    term.write('?\r\n');
    term.write(session.help(buffer).map((l) => `${l}\r\n`).join(''));
    lastPos = 0;
    redraw();
  };

  const tab = () => {
    const done = session.complete(buffer);
    if (done) {
      buffer = done;
      cursor = buffer.length;
      redraw();
    }
  };

  const history = (dir) => {
    const list = session.history;
    if (!list.length) return;
    if (histIndex === null) {
      if (dir > 0) return;
      draft = buffer;
      histIndex = list.length;
    }
    histIndex = Math.min(list.length, Math.max(0, histIndex + dir));
    buffer = histIndex === list.length ? draft : list[histIndex];
    if (histIndex === list.length) histIndex = null;
    cursor = buffer.length;
    redraw();
  };

  const control = (name) => {
    const interactive = session.interactive;
    if (name === 'up' && interactive) history(-1);
    else if (name === 'down' && interactive) history(1);
    else if (name === 'left') {
      cursor = Math.max(0, cursor - 1);
      redraw();
    } else if (name === 'right') {
      cursor = Math.min(buffer.length, cursor + 1);
      redraw();
    } else if (name === 'home') {
      cursor = 0;
      redraw();
    } else if (name === 'end') {
      moveToEnd();
    } else if (name === 'delete') {
      buffer = buffer.slice(0, cursor) + buffer.slice(cursor + 1);
      redraw();
    }
  };

  const interrupt = (key) => {
    moveToEnd();
    term.write(key === 'z' ? '^Z\r\n' : '^C\r\n');
    resetLine();
    session.interrupt(key);
    redraw();
  };

  const handleData = (data) => {
    if (!active) {
      active = true;
      onActivity?.();
    }
    let i = 0;
    while (i < data.length) {
      const rest = data.slice(i);
      const esc = rest.startsWith('\x1b') && ESCAPES.find(([seq]) => rest.startsWith(seq));
      if (esc) {
        control(esc[1]);
        i += esc[0].length;
        continue;
      }
      const ch = data[i];
      i += 1;
      if (ch === '\x1b') continue; // 모르는 escape 는 무시
      if (ch === '\r' || ch === '\n') {
        if (ch === '\n' && data[i - 2] === '\r') continue;
        submit();
      } else if (ch === '\x7f' || ch === '\b') {
        if (cursor > 0) {
          buffer = buffer.slice(0, cursor - 1) + buffer.slice(cursor);
          cursor -= 1;
          redraw();
        }
      } else if (ch === '\t') {
        if (session.interactive) tab();
      } else if (ch === '?' && session.interactive) {
        showHelp();
      } else if (ch === '\x1a') {
        interrupt('z');
      } else if (ch === '\x03') {
        interrupt('c');
      } else if (ch === '\x01') {
        control('home');
      } else if (ch === '\x05') {
        control('end');
      } else if (ch === '\x15') {
        buffer = buffer.slice(cursor);
        cursor = 0;
        redraw();
      } else if (ch === '\x17') {
        const before = buffer.slice(0, cursor).replace(/\S*\s*$/, '');
        buffer = before + buffer.slice(cursor);
        cursor = before.length;
        redraw();
      } else if (ch >= ' ') {
        insert(ch);
      }
    }
  };

  const dataListener = term.onData(handleData);

  // 우클릭: 선택한 글자가 있으면 복사, 없으면 붙여넣기
  const onContextMenu = async (event) => {
    event.preventDefault();
    const selection = term.getSelection();
    try {
      if (selection) {
        await navigator.clipboard.writeText(selection);
        term.clearSelection();
      } else {
        const text = await navigator.clipboard.readText();
        if (text) handleData(text.replace(/\r\n/g, '\r'));
      }
    } catch {
      // 클립보드 권한이 없으면 Ctrl+V 를 쓰면 된다
    }
    term.focus();
  };
  host.addEventListener('contextmenu', onContextMenu);

  // 페이지와 PIP 사이로 옮겨 붙거나 크기가 바뀌면 다시 맞춘다
  const observer = new ResizeObserver(fit);
  observer.observe(host);

  return {
    fit,
    focus: () => term.focus(),
    dispose: () => {
      observer.disconnect();
      host.removeEventListener('contextmenu', onContextMenu);
      dataListener.dispose();
      session.destroy();
      term.dispose();
      host.replaceChildren();
    },
  };
}
