import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { isecTopics, labPath, labs, topicPath } from '../data/curriculum.js';
import './Header.css';

function Header() {
  const [isecOpen, setIsecOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();

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
      </div>
    </header>
  );
}

export default Header;
