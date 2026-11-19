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
    summary: '실습용 리눅스 컨테이너에서 명령어를 직접 입력하고, eBPF 모니터링 로그를 실시간으로 확인합니다.',
  },
  {
    id: 'wireshark',
    title: 'Wireshark 패킷 분석',
    path: '/lab/wireshark',
    icon: '≋',
    summary: '네트워크 패킷을 캡처하고 Wireshark로 프로토콜과 공격 트래픽을 분석합니다.',
  },
];

export function topicPath(topicId) {
  return `/isec/${topicId}`;
}
