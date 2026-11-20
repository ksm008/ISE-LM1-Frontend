import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/authContext.js';
import { isecTopics, labPath, labs, topicPath } from '../data/curriculum.js';
import './Header.css';

function Header() {
  const [isecOpen, setIsecOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { me, logout } = useAuth();

  // 먼저 메인(공개 페이지)으로 이동한 뒤 로그아웃한다. 반대로 하면 보호된 페이지가 로그인 화면으로 먼저 보낸다.
  const handleLogout = async () => {
    navigate('/');
    await logout();
  };

  // 메뉴 밖을 누르거나 Esc 를 누르면 닫기 (터치 기기 대응)
  useEffect(() => {
    if (!isecOpen) return;
    const handlePointer = (e) => {
      if (!menuRef.current?.contains(e.target)) setIsecOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsecOpen(false);
    };
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isecOpen]);

  const isIsecActive = location.pathname.startsWith('/isec') || location.pathname.startsWith(labPath);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="site-header__brand">
          ISE·LM1 스터디
        </Link>

        <nav className="site-nav" aria-label="자격증 메뉴">
          <div
            ref={menuRef}
            className={`site-nav__item has-dropdown${isecOpen ? ' is-open' : ''}`}
            onMouseEnter={() => setIsecOpen(true)}
            onMouseLeave={() => setIsecOpen(false)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setIsecOpen(false);
            }}
          >
            <button
              type="button"
              className={`site-nav__link${isIsecActive ? ' is-active' : ''}`}
              aria-haspopup="true"
              aria-expanded={isecOpen}
              onClick={() => setIsecOpen((v) => !v)}
              onFocus={() => setIsecOpen(true)}
            >
              정보보안기사
              <span className="site-nav__caret" aria-hidden="true">▾</span>
            </button>

            {/* 메뉴 항목을 누르면 이동과 함께 닫힘 */}
            <ul className="dropdown" role="menu" onClick={() => setIsecOpen(false)}>
              {isecTopics.map((topic, idx) => (
                <li key={topic.id} role="none">
                  <NavLink to={topicPath(topic.id)} role="menuitem" className="dropdown__link">
                    <span className="dropdown__num">{idx + 1}</span>
                    {topic.title}
                  </NavLink>
                </li>
              ))}
              <li role="separator" className="dropdown__divider" />
              <li role="presentation" className="dropdown__label">
                <Link to={labPath}>실습</Link>
              </li>
              {labs.map((lab) => (
                <li key={lab.id} role="none">
                  <NavLink to={lab.path} role="menuitem" className="dropdown__link dropdown__link--lab">
                    <span className="dropdown__num" aria-hidden="true">{lab.icon}</span>
                    {lab.title}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="site-nav__item">
            <NavLink to="/linux" className={({ isActive }) => `site-nav__link${isActive ? ' is-active' : ''}`}>
              리눅스마스터 1급
            </NavLink>
          </div>
        </nav>

        {/* 로그인 상태 (오른쪽 끝) */}
        <div className="site-auth">
          {me?.authenticated ? (
            <>
              <NavLink to={me.active ? '/account' : '/verify-email'} className="site-auth__user">
                {me.username}
                {me.role === 'ADMIN' && <span className="site-auth__badge">관리자</span>}
                {!me.active && <span className="site-auth__badge site-auth__badge--warn">인증 필요</span>}
              </NavLink>
              <button type="button" className="site-auth__btn" onClick={handleLogout}>
                로그아웃
              </button>
            </>
          ) : (
            me && (
              <>
                <Link to="/login" className="site-auth__btn">
                  로그인
                </Link>
                <Link to="/signup" className="site-auth__btn site-auth__btn--primary">
                  회원가입
                </Link>
              </>
            )
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
