import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';
import { headingId, remarkHeadingIds } from './headings.js';

const render = (markdown) =>
  renderToStaticMarkup(createElement(Markdown, { remarkPlugins: [remarkGfm, remarkHeadingIds] }, markdown));

describe('소제목 id', () => {
  it('한글·영문·기호', () => {
    expect(headingId('SQL 인젝션 (SQL Injection)')).toBe('h-sql-인젝션-sql-injection');
    expect(headingId('  대응 방안!  ')).toBe('h-대응-방안');
    expect(headingId('???')).toBe('h-section');
  });

  it('##~#### 에만 id, # 은 제외, 같은 제목은 번호를 붙임', () => {
    const html = render('# 문서\n\n## 개요\n\n### 예시\n\n#### 코드 `id`\n\n##### 5단계\n\n## 개요\n\n## 개요');
    expect(html).toContain('<h1>문서</h1>');
    expect(html).toContain('<h2 id="h-개요">');
    expect(html).toContain('<h3 id="h-예시">');
    expect(html).toContain('<h4 id="h-코드-id">');
    expect(html).toContain('<h5>5단계</h5>');
    expect(html).toContain('<h2 id="h-개요-1">');
    expect(html).toContain('<h2 id="h-개요-2">');
  });

  it('HTML 태그는 실행하지 않음', () => {
    const html = render('## 제목\n\n<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<img');
  });
});
