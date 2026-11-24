import { describe, expect, it } from 'vitest';
import { applyTerminalFontSize, terminalFontSize } from './terminalFont.js';

describe('터미널 글자 크기', () => {
  it('좁으면 12, 넓으면 14', () => {
    expect(terminalFontSize(375)).toBe(12);
    expect(terminalFontSize(519)).toBe(12);
    expect(terminalFontSize(520)).toBe(14);
    expect(terminalFontSize(1200)).toBe(14);
  });

  it('바뀔 때만 true', () => {
    const term = { options: { fontSize: 14 } };
    expect(applyTerminalFontSize(term, 900)).toBe(false);
    expect(applyTerminalFontSize(term, 375)).toBe(true);
    expect(term.options.fontSize).toBe(12);
    expect(applyTerminalFontSize(term, 380)).toBe(false);
  });
});
