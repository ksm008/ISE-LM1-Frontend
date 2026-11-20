import { useCallback, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/authContext.js';
import { openRouterConsole } from './routerConsole.js';
import { RouterSessionContext, routerLabPath } from './routerContext.js';

// 저장한 설정(startup-config)은 계정별로 이 브라우저에 남긴다
const storageKey = (username) => `iselm1.router.startup.v1.${username ?? 'guest'}`;

function loadStartup(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStartupTo(key, value) {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  } catch {
    // 저장할 수 없는 환경 (사생활 보호 모드 등)
  }
}

/**
 * 라우터 실습 콘솔을 앱 전체에서 관리한다 (터미널 실습과 같은 방식).
 * 콘솔(xterm + 라우터 세션)은 하나만 만들고, 실습 페이지 / PIP 창 중 보이는 곳(RouterView)으로 DOM 을 옮겨 붙인다.
 * 콘솔을 쓰기 시작한 뒤(키 입력) 라우터 실습 페이지 밖으로 나가면 자동으로 PIP 가 되고, 돌아오면 페이지에 붙는다.
 * PIP 의 종료(×)는 전원 끄기: 저장하지 않은 설정은 사라지고, 다음에는 저장된 설정으로 부팅한다.
 * 라우터는 브라우저 안에서만 동작하므로 서버 자원을 쓰지 않는다.
 */
function RouterSessionProvider({ children }) {
  const { me } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const username = me?.active ? me.username : null;

  const hostRef = useRef(null); // 콘솔이 들어 있는 div
  const consoleRef = useRef(null); // { owner, api }
  const [activeUser, setActiveUser] = useState(null); // 콘솔을 쓰기 시작한 계정

  const active = username !== null && activeUser === username;
  const pip = active && location.pathname !== routerLabPath;

  const getHost = useCallback(() => {
    if (!hostRef.current) {
      const host = document.createElement('div');
      host.className = 'router-console';
      hostRef.current = host;
    }
    return hostRef.current;
  }, []);

  const powerOff = useCallback(() => {
    consoleRef.current?.api.dispose();
    consoleRef.current = null;
    setActiveUser(null);
  }, []);

  const open = useCallback(() => {
    const key = storageKey(username);
    const owner = username;
    const api = openRouterConsole(getHost(), {
      startup: loadStartup(key),
      onStartupChange: (value) => saveStartupTo(key, value),
      onActivity: () => setActiveUser(owner),
    });
    consoleRef.current = { owner, api };
  }, [getHost, username]);

  // 콘솔을 보여 줄 자리(slot)에 붙인다. 처음이거나 다른 계정이면 새로 켠다.
  const attach = useCallback(
    (slot) => {
      const host = getHost();
      slot.appendChild(host);
      if (consoleRef.current && consoleRef.current.owner !== username) {
        consoleRef.current.api.dispose();
        consoleRef.current = null;
      }
      if (!consoleRef.current) open();
      consoleRef.current.api.fit();
      consoleRef.current.api.focus();
    },
    [getHost, open, username],
  );

  const detach = useCallback((slot) => {
    const host = hostRef.current;
    if (host && host.parentNode === slot) slot.removeChild(host);
  }, []);

  /** 저장된 설정을 지우고 공장 초기 상태로 다시 켠다 */
  const reset = useCallback(() => {
    saveStartupTo(storageKey(username), null);
    powerOff();
    if (hostRef.current?.isConnected) open();
  }, [username, powerOff, open]);

  const enterPip = useCallback((path) => navigate(typeof path === 'string' ? path : '/'), [navigate]);
  const exitPip = useCallback(() => navigate(routerLabPath), [navigate]);

  const value = useMemo(
    () => ({ pip, active, attach, detach, reset, powerOff, enterPip, exitPip }),
    [pip, active, attach, detach, reset, powerOff, enterPip, exitPip],
  );

  return <RouterSessionContext.Provider value={value}>{children}</RouterSessionContext.Provider>;
}

export default RouterSessionProvider;
