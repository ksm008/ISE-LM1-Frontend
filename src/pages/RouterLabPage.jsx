import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { labPath } from '../data/curriculum.js';
import RouterView from '../router/RouterView.jsx';
import { useRouterSession } from '../router/routerContext.js';
import '../router/RouterLab.css';

function PipIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="12" y="11.5" width="7.5" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}

// 1단계 명령 안내 (명령은 영문 그대로, 설명은 한국어)
const GUIDE = [
  {
    title: '기본 조작',
    items: [
      ['enable', '특권 모드로 (Router> → Router#)'],
      ['configure terminal', '설정 모드로 (줄여서 conf t)'],
      ['end  또는  Ctrl+Z', '설정을 마치고 특권 모드로'],
      ['show running-config', '현재 설정 보기 (sh run)'],
      ['show run | include login', '출력에서 찾기 (include, exclude, begin, section)'],
      ['do show run', '설정 모드에서 show 실행'],
      ['copy running-config startup-config', '설정 저장 (write memory)'],
      ['?  /  Tab', '다음에 올 수 있는 명령 보기 / 자동 완성'],
    ],
  },
  {
    title: '관리자 비밀번호',
    items: [
      ['enable secret <비밀번호>', '특권 모드 비밀번호 (type 5 해시, 권장)'],
      ['enable password <비밀번호>', '평문 저장이라 약함 (secret 과 비교)'],
      ['service password-encryption', '평문 비밀번호를 type 7 로 암호화'],
      ['security passwords min-length 8', '비밀번호 최소 길이'],
    ],
  },
  {
    title: '계정과 접속 라인',
    items: [
      ['username admin privilege 15 secret <비밀번호>', '로컬 사용자 계정'],
      ['line console 0', '콘솔 라인 설정 모드로'],
      ['password <비밀번호>  →  login', '라인 비밀번호로 로그인'],
      ['line vty 0 4', '원격 접속(Telnet/SSH) 라인'],
      ['login local', '로컬 계정(username)으로 로그인'],
      ['transport input ssh', 'Telnet 을 막고 SSH 만 허용'],
      ['exec-timeout 5 0', '5분 동안 입력이 없으면 로그아웃'],
    ],
  },
  {
    title: 'SSH 사용 준비',
    items: [
      ['hostname R1', '장비 이름 (기본값 Router 로는 키 생성 불가)'],
      ['ip domain-name lab.local', '도메인 이름 (키 이름에 사용)'],
      ['crypto key generate rsa modulus 2048', 'RSA 키 생성 → SSH 켜짐'],
      ['ip ssh version 2', 'SSH v2 만 사용'],
      ['show ip ssh', 'SSH 상태 확인'],
    ],
  },
  {
    title: '불필요한 서비스 끄기',
    items: [
      ['no ip http server', 'HTTP 관리 서버'],
      ['no cdp run', '이웃 장비에 정보 노출'],
      ['no ip source-route', '출발지 라우팅 옵션'],
      ['no service tcp-small-servers', 'echo, chargen 등 (udp 도 같음)'],
      ['no ip bootp server  /  no ip finger', 'BOOTP, finger'],
      ['no ip domain lookup', '잘못 친 명령을 DNS 로 찾는 지연 방지'],
      ['interface g0/0 → no ip directed-broadcast', 'Smurf 공격 방지 (no ip redirects, no ip proxy-arp)'],
    ],
  },
  {
    title: '배너와 인터페이스',
    items: [
      ['banner motd #무단 접근 금지#', '접속 안내문 (# 는 구분 문자)'],
      ['interface g0/0', '인터페이스 설정 모드로'],
      ['ip address 192.168.1.1 255.255.255.0', 'IP 주소'],
      ['no shutdown', '인터페이스 켜기'],
      ['show ip interface brief', '인터페이스 상태 요약'],
    ],
  },
];

// RouterLab.css 의 @media (max-width: 900px) 와 같은 값
const NARROW_QUERY = '(max-width: 900px)';

function RouterLabPage() {
  // 콘솔은 RouterSessionProvider 가 앱 전체에서 유지한다 (다른 페이지로 가면 PIP)
  const { active, reset, enterPip } = useRouterSession();
  const [confirmReset, setConfirmReset] = useState(false);
  // 좁은 화면(안내가 콘솔 아래로 가는 폭)에서는 처음에 안내를 닫아 콘솔이 화면을 다 쓰게 한다
  const [guideOpen, setGuideOpen] = useState(() => !window.matchMedia(NARROW_QUERY).matches);
  const resetTimer = useRef(null);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  // 초기화: 한 번 누르면 확인 상태, 5초 안에 다시 누르면 저장된 설정을 지우고 새로 시작
  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      resetTimer.current = setTimeout(() => setConfirmReset(false), 5000);
      return;
    }
    clearTimeout(resetTimer.current);
    setConfirmReset(false);
    reset();
  };

  return (
    <div className={`router-lab${guideOpen ? ' has-guide' : ''}`}>
      <div className="router-lab__toolbar">
        <Link to={labPath} className="router-lab__back">
          ← 실습 목록
        </Link>
        <h1 className="router-lab__title">라우터 설정 실습</h1>
        <span className="router-lab__hint">IOS 스타일 명령 · 1단계: 장비 접근 보안</span>
        <div className="router-lab__actions">
          <button
            type="button"
            className="router-lab__icon-btn"
            onClick={enterPip}
            disabled={!active}
            title="PIP 모드 (메인 페이지로 이동, 콘솔을 쓰는 중에 다른 페이지로 가도 자동으로 PIP 가 됩니다)"
            aria-label="PIP 모드"
          >
            <PipIcon />
          </button>
          <button type="button" className="router-lab__btn" onClick={() => setGuideOpen((v) => !v)} aria-pressed={guideOpen}>
            {guideOpen ? '안내 숨기기' : '명령 안내'}
          </button>
          <button
            type="button"
            className={`router-lab__btn${confirmReset ? ' is-danger' : ''}`}
            onClick={handleReset}
            title="저장된 설정(startup-config)을 지우고 공장 초기 상태로 다시 시작합니다"
          >
            {confirmReset ? '한 번 더 누르면 초기화' : '라우터 초기화'}
          </button>
        </div>
      </div>

      <div className={`router-lab__body${guideOpen ? '' : ' is-wide'}`}>
        <div className="router-lab__console">
          <RouterView className="router-lab__slot" />
        </div>

        {guideOpen && (
          <aside className="router-guide" aria-label="명령 안내">
            <p className="router-guide__intro">
              콘솔에서 Enter 를 눌러 시작하세요. <code>?</code> 를 누르면 그 자리에서 쓸 수 있는 명령이 나옵니다. 설정은{' '}
              <code>copy running-config startup-config</code> 로 저장해야 재부팅(<code>reload</code>) 후에도 남습니다.
            </p>
            {GUIDE.map((section) => (
              <section key={section.title} className="router-guide__section">
                <h2>{section.title}</h2>
                <dl>
                  {section.items.map(([cmd, desc]) => (
                    <div key={cmd} className="router-guide__item">
                      <dt>
                        <code>{cmd}</code>
                      </dt>
                      <dd>{desc}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
            <p className="router-guide__note">
              실제 장비의 운영체제가 아니라 학습용 시뮬레이터입니다. 지원하지 않는 명령은{' '}
              <code>% Invalid input</code> 으로 표시됩니다. ACL(access-list)과 접속 시험은 다음 단계에서 추가됩니다.
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}

export default RouterLabPage;
