import { useLayoutEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { readHeadings, remarkHeadingIds } from './headings.js';
import './Docs.css';

// 문서 안의 HTML 태그는 실행하지 않는다 (rehype-raw 를 쓰지 않음). 링크 주소는 react-markdown 기본 검사(javascript: 차단)를 따른다.
const components = {
  a({ href, children, node: _node, ...rest }) {
    const external = /^https?:\/\//.test(href ?? '');
    return (
      <a href={href} {...rest} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    );
  },
};

const remarkPlugins = [remarkGfm, remarkHeadingIds];

// onHeadings: 본문을 그린 뒤 소제목(##~####) 목록 [{id, level, text}] 을 알려 준다 (목차용)
function MarkdownDoc({ markdown, onHeadings }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    onHeadings?.(readHeadings(ref.current));
  }, [markdown, onHeadings]);

  return (
    <div className="markdown-body" ref={ref}>
      <Markdown remarkPlugins={remarkPlugins} components={components}>
        {markdown}
      </Markdown>
    </div>
  );
}

export default MarkdownDoc;
