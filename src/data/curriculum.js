// 사이트에서 다루는 자격증과 주요 항목 정의
// 새 항목을 추가하면 헤더 메뉴, 메인 페이지, 항목 페이지에 자동으로 반영됩니다.

export const isecTopics = [
  {
    id: 'system-network',
    title: '시스템 및 네트워크 보안 특성 파악',
    summary: '운영체제와 네트워크의 구조를 이해하고 각 구성 요소의 보안 특성을 파악합니다.',
  },
  {
    id: 'vulnerability',
    title: '취약점 점검 및 보완',
    summary: '시스템·네트워크·애플리케이션의 취약점을 점검하고 보완 조치를 적용합니다.',
  },
  {
    id: 'log-response',
    title: '보안 로그 수집, 분석 및 침해 대응',
    summary: '보안 로그를 수집·분석해 침해 징후를 탐지하고 사고에 대응합니다.',
  },
  {
    id: 'risk-management',
    title: '위험분석 및 정보보호 대책 수립',
    summary: '자산과 위협을 기반으로 위험을 분석하고 정보보호 대책을 수립합니다.',
  },
  {
    id: 'trends',
    title: '최신 보안 동향',
    summary: '최신 공격 기법과 보안 기술, 관련 제도의 변화를 살펴봅니다.',
  },
];

export const exams = [
  {
    id: 'isec',
    name: '정보보안기사',
    path: '/isec',
    topics: isecTopics,
  },
  {
    id: 'linux',
    name: '리눅스마스터 1급',
    path: '/linux',
    topics: [], // 주요 항목 추가 예정
  },
];

// 실습 허브 (/lab) 와 개별 실습 목록
export const labPath = '/lab';

export const labs = [
  {
    id: 'terminal',
    title: '터미널 실습',
    path: '/lab/terminal',
    icon: '>_',
    summary: '실습용 리눅스 컨테이너에서 명령어를 직접 입력하며 리눅스 명령어와 보안 도구를 연습합니다.',
  },
  {
    id: 'wireshark',
    title: 'Wireshark 패킷 분석',
    path: '/lab/wireshark',
    icon: '≋',
    summary: '실습 터미널의 네트워크 패킷을 실시간으로 캡처해 Wireshark처럼 프로토콜별로 분석합니다.',
  },
  {
    id: 'router',
    title: '라우터 설정 실습',
    path: '/lab/router',
    icon: '⇄',
    summary: 'IOS 스타일 명령으로 라우터의 접근 보안, 계정, SSH, 서비스 비활성화 등을 직접 설정해 봅니다.',
  },
  {
    id: 'vuln',
    title: '웹 취약점 실습',
    path: '/lab/vuln',
    icon: '</>',
    summary: 'SQL 인젝션, XSS, CSRF 등 주요 웹 애플리케이션 취약점을 유형별로 살펴보고 실습합니다.',
  },
];

// 웹 취약점 실습 (/lab/vuln) 카테고리. 각 카테고리 안의 실습 구성은 추후 정한다.
// groups: 카테고리 안의 세부 유형 (없으면 생략)
export const vulnLabPath = '/lab/vuln';

export const vulnCategories = [
  {
    id: 'sql-injection',
    title: 'SQL 인젝션',
    summary: '입력값에 SQL 구문을 넣어 데이터베이스 질의를 조작하는 취약점입니다.',
    groups: [
      {
        label: '공격 기법',
        items: ['Form SQL 인젝션', 'Union SQL 인젝션', 'Stored Procedure SQL 인젝션', 'Mass SQL 인젝션'],
      },
      { label: '공격 유형', items: ['Error-based SQL 인젝션', 'Blind SQL 인젝션'] },
    ],
  },
  {
    id: 'xss',
    title: '크로스 사이트 스크립트 취약점',
    summary: '공격자의 스크립트가 다른 사용자의 브라우저에서 실행되는 취약점입니다.',
    groups: [{ label: '유형', items: ['Stored XSS', 'Reflected XSS', 'DOM based XSS'] }],
  },
  {
    id: 'csrf',
    title: 'CSRF',
    summary: '로그인한 사용자가 의도하지 않은 요청을 서버에 보내도록 만드는 취약점입니다.',
  },
  {
    id: 'ssrf',
    title: 'SSRF',
    summary: '서버가 공격자가 지정한 내부·외부 주소로 요청을 보내도록 만드는 취약점입니다.',
  },
  {
    id: 'os-command',
    title: '운영체제 명령어 실행 취약점',
    summary: '입력값이 운영체제 명령어로 실행되어 서버에서 임의 명령을 실행할 수 있는 취약점입니다.',
  },
  {
    id: 'file-upload',
    title: '파일 업로드 취약점',
    summary: '검증 없이 업로드된 파일(웹셸 등)이 서버에서 실행될 수 있는 취약점입니다.',
  },
  {
    id: 'file-download',
    title: '파일 다운로드 취약점',
    summary: '다운로드 기능을 이용해 허용되지 않은 서버 파일을 내려받을 수 있는 취약점입니다.',
  },
  {
    id: 'path-traversal',
    title: '경로 추적 취약점',
    summary: '../ 같은 경로 조작으로 웹 루트 밖의 파일이나 디렉터리에 접근하는 취약점입니다.',
  },
  {
    id: 'file-inclusion',
    title: '파일 삽입 취약점',
    summary: '외부 입력으로 지정한 파일을 서버 측 코드가 포함(include)해 실행하는 취약점입니다.',
  },
  {
    id: 'parameter-tampering',
    title: 'URL/파라미터 변조 취약점',
    summary: 'URL이나 요청 파라미터 값을 바꿔 권한 밖의 데이터나 기능에 접근하는 취약점입니다.',
  },
  {
    id: 'session-management',
    title: '불충분한 세션 관리 취약점',
    summary: '예측 가능하거나 만료되지 않는 세션으로 다른 사용자의 세션을 탈취·재사용할 수 있는 취약점입니다.',
  },
  {
    id: 'information-disclosure',
    title: '정보누출 취약점',
    summary: '오류 메시지, 주석, 디렉터리 목록 등으로 시스템 내부 정보가 노출되는 취약점입니다.',
  },
];

export function vulnPath(vulnId) {
  return `${vulnLabPath}/${vulnId}`;
}

export function topicPath(topicId) {
  return `/isec/${topicId}`;
}

// 항목의 학습 문서 폴더 이름 (백엔드 docs/isec/ 아래): 항목 번호(isecTopics 순서) + id. 예) 02-vulnerability
// 항목 순서를 바꾸면 백엔드 문서 폴더 이름도 함께 바꿔야 한다.
export function topicDocsDir(topicId) {
  const index = isecTopics.findIndex((t) => t.id === topicId);
  return index === -1 ? null : `${String(index + 1).padStart(2, '0')}-${topicId}`;
}
