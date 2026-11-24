// 실습 터미널(xterm) 글꼴. 터미널 실습과 라우터 콘솔이 함께 쓴다.

// Windows 는 Consolas, macOS·iOS 는 Menlo, Android·Linux 는 DejaVu Sans Mono 계열
export const TERMINAL_FONT = 'Consolas, Menlo, "DejaVu Sans Mono", "Liberation Mono", "Courier New", monospace';

// 좁은 터미널(휴대폰, 작은 PIP)은 글자를 줄여 한 줄에 더 많은 글자가 들어가게 한다
const NARROW_WIDTH = 520;

export function terminalFontSize(width) {
  return width < NARROW_WIDTH ? 12 : 14;
}

// 터미널 영역 너비에 맞는 글자 크기로 바꾼다 (바뀌었으면 true). 크기를 바꾼 뒤에는 fit 을 다시 해야 한다.
export function applyTerminalFontSize(term, width) {
  const size = terminalFontSize(width);
  if (term.options.fontSize === size) return false;
  term.options.fontSize = size;
  return true;
}
