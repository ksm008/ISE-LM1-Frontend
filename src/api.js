import { API_BASE_URL } from './config.js';

// 백엔드 REST 호출. 로그인은 세션 쿠키(JSESSIONID)로 유지하므로 credentials: 'include' 로 보낸다.
// 상태를 바꾸는 요청(POST 등)은 CSRF 토큰이 필요하다: 쿠키 XSRF-TOKEN 값을 헤더 X-XSRF-TOKEN 으로 보낸다.
// (쿠키는 포트와 관계없이 호스트 기준이라 개발 환경 localhost:5173 에서도 localhost:8080 의 쿠키를 읽을 수 있다)

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function readCookie(name) {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

let csrfRequest = null;

async function csrfToken(forceRefresh = false) {
  const cookie = readCookie('XSRF-TOKEN');
  if (cookie && !forceRefresh) return cookie;
  csrfRequest ??= fetch(`${API_BASE_URL}/api/auth/csrf`, { credentials: 'include' })
    .then((res) => res.json())
    .finally(() => {
      csrfRequest = null;
    });
  const data = await csrfRequest;
  return readCookie('XSRF-TOKEN') ?? data.token;
}

const DEFAULT_MESSAGES = {
  401: '로그인이 필요합니다.',
  403: '권한이 없습니다.',
  500: '서버 오류가 발생했습니다.',
};

export async function api(path, { method = 'GET', body } = {}, retried = false) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['X-XSRF-TOKEN'] = await csrfToken(retried);

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, '서버에 연결하지 못했습니다. 잠시 후 다시 시도하세요.');
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // CSRF 토큰이 바뀐 경우(구글 로그인 직후 등) 한 번만 새 토큰으로 다시 보낸다
    if (res.status === 403 && method !== 'GET' && !retried && !data?.message) {
      return api(path, { method, body }, true);
    }
    throw new ApiError(res.status, data?.message ?? DEFAULT_MESSAGES[res.status] ?? `요청 실패 (${res.status})`, data);
  }
  return data;
}

// 구글 로그인·연동은 브라우저가 백엔드 주소로 이동해서 진행한다
export const googleLoginUrl = `${API_BASE_URL}/oauth2/authorization/google`;
export const googleLinkUrl = `${API_BASE_URL}/api/auth/google/link`;
