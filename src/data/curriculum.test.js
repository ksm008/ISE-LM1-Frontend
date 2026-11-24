import { describe, expect, it } from 'vitest';
import { topicDocsDir } from './curriculum.js';

describe('학습 문서 폴더 이름', () => {
  it('항목 번호 + id', () => {
    expect(topicDocsDir('system-network')).toBe('01-system-network');
    expect(topicDocsDir('vulnerability')).toBe('02-vulnerability');
    expect(topicDocsDir('log-response')).toBe('03-log-response');
    expect(topicDocsDir('risk-management')).toBe('04-risk-management');
    expect(topicDocsDir('trends')).toBe('05-trends');
    expect(topicDocsDir('none')).toBeNull();
  });
});
