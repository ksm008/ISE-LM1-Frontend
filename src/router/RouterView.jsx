import { useEffect, useRef } from 'react';
import { useRouterSession } from './routerContext.js';

// 라우터 콘솔을 이 자리에 붙여서 보여준다. 한 번에 하나의 RouterView 만 렌더링한다.
function RouterView({ className }) {
  const { attach, detach } = useRouterSession();
  const slotRef = useRef(null);

  useEffect(() => {
    const slot = slotRef.current;
    attach(slot);
    return () => detach(slot);
  }, [attach, detach]);

  return <div ref={slotRef} className={className} />;
}

export default RouterView;
