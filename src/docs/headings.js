// 문서 소제목(##, ###, ####)에 id 를 붙이는 remark 플러그인과 목차용 도우미.
// # (제목 1)은 문서 제목이라 목차에 넣지 않는다.

export const TOC_LEVELS = [2, 3, 4];

function textOf(node) {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value;
  return (node.children ?? []).map(textOf).join('');
}

// 소제목 글자로 id 를 만든다. 문서 내용이 페이지의 다른 id·전역 변수와 겹치지 않게 앞에 h- 를 붙인다.
export function headingId(text) {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `h-${slug || 'section'}`;
}

export function remarkHeadingIds() {
  return (tree) => {
    const used = new Map();
    const walk = (node) => {
      if (node.type === 'heading' && TOC_LEVELS.includes(node.depth)) {
        const base = headingId(textOf(node));
        const count = used.get(base) ?? 0;
        used.set(base, count + 1);
        node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id: count ? `${base}-${count}` : base } };
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}

// 화면에 그려진 본문에서 목차 항목을 읽는다
export function readHeadings(container) {
  if (!container) return [];
  const selector = TOC_LEVELS.map((level) => `h${level}[id]`).join(',');
  return [...container.querySelectorAll(selector)].map((el) => ({
    id: el.id,
    level: Number(el.tagName.slice(1)),
    text: el.textContent,
  }));
}
