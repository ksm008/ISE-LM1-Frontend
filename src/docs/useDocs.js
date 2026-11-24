import { useEffect, useState } from 'react';
import { api } from '../api.js';

// 백엔드 학습 문서 API (/api/docs/{section}/{topic}[/{slug}])
// 문서 파일은 백엔드 docs 폴더에 있고, 이메일 인증을 마친 회원만 받을 수 있다.

function useApi(path) {
  const [state, setState] = useState({ path: null, data: null, error: null });

  useEffect(() => {
    if (!path) return undefined;
    let ignore = false;
    api(path).then(
      (data) => !ignore && setState({ path, data, error: null }),
      (error) => !ignore && setState({ path, data: null, error }),
    );
    return () => {
      ignore = true;
    };
  }, [path]);

  // 경로가 바뀐 직후에는 이전 결과 대신 불러오는 중으로 본다
  if (!path || state.path !== path) return { loading: Boolean(path), data: null, error: null };
  return { loading: false, data: state.data, error: state.error };
}

export function useDocList(section, topic) {
  return useApi(`/api/docs/${section}/${topic}`);
}

export function useDoc(section, topic, slug) {
  return useApi(slug ? `/api/docs/${section}/${topic}/${slug}` : null);
}
