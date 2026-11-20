// 백엔드 주소: .env.local 등에 VITE_API_BASE_URL 로 지정 (기본값 localhost:8080)
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');
