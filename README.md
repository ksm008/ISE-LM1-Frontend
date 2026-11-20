# ISE-LM1 Frontend

정보보안기사와 리눅스마스터 1급 시험을 준비하기 위한 학습 사이트의 프론트엔드입니다.
시험 범위를 항목별로 정리해 제공하고, 실제 리눅스 컨테이너에 접속하는 터미널 실습과 패킷 분석 실습 환경을 함께 제공합니다.

## 주요 기능

- **회원**
  - 메인 페이지만 미리 보기로 볼 수 있고, 나머지 학습 페이지·실습은 로그인(이메일 인증 완료)해야 이용할 수 있습니다. 로그인하지 않고 들어가면 로그인 화면으로 이동했다가 로그인 후 원래 페이지로 돌아갑니다.
  - 회원가입(아이디·비밀번호·이메일, 비밀번호 조건 체크 목록) → 이메일 인증번호 6자리 입력 → 이용
  - 구글 로그인: 연동된 계정이 있으면 바로 로그인, 없으면 아이디·비밀번호만 정해 가입하고 Gmail 로 인증. 내 계정(`/account`)에서 구글 연동·해제
  - 관리자 계정은 헤더에 "관리자" 표시. 로그아웃하면 진행 중인 실습도 끝납니다.
- **자격증별 학습 페이지**
  - 정보보안기사: 주요 항목 5개에 대한 항목별 페이지
    1. 시스템 및 네트워크 보안 특성 파악
    2. 취약점 점검 및 보완
    3. 보안 로그 수집, 분석 및 침해 대응
    4. 위험분석 및 정보보호 대책 수립
    5. 최신 보안 동향
  - 리눅스마스터 1급: 준비 중
- **상단 메뉴**: 정보보안기사 메뉴에 마우스를 올리면 주요 항목과 실습 메뉴를 바로 선택할 수 있습니다.
- **실습**
  - 터미널 실습: 실습용 컨테이너를 생성해 브라우저에서 쉘을 사용합니다.
    - 페이지에 들어오면 실습이 자동으로 시작됩니다. 실습 중에 다른 페이지로 이동하면 터미널이 자동으로 PIP 창이 되고, 실습 페이지로 돌아오면 다시 페이지에 붙습니다.
    - 실습 컨테이너에서는 `sudo` 를 쓰더라도 `apt` 로 패키지를 추가 설치할 수 없습니다 (백엔드에서 차단, `dpkg -l` 등 조회는 가능).
    - 세션은 10분 동안 유지되며, "세션 갱신" 버튼으로 다시 10분으로 연장합니다. 만료 1분 전에 터미널에 안내가 표시됩니다.
    - PIP 창: 이동·크기 조절할 수 있습니다. 위쪽 막대에 원래 화면으로 / 세션 갱신 / 남은 시간, 맨 오른쪽에 종료(×) 버튼이 있으며 종료하면 실습도 끝납니다. PIP 에서 실습이 만료되거나 셸이 끝나면 안내를 볼 수 있게 창이 남아 있습니다.
    - 새 실습을 시작하면 터미널 화면이 초기화됩니다.
    - 우클릭: 선택한 글자가 있으면 복사, 없으면 붙여넣기 (Windows Terminal·PuTTY 방식). 브라우저가 처음 한 번 클립보드 권한을 묻습니다. HTTPS 또는 localhost 에서만 동작합니다.
    - eBPF 모니터링 로그 패널은 현재 비활성화되어 있습니다 (`src/pages/TerminalLabPage.jsx` 주석 참고).
  - 웹 취약점 실습: SQL 인젝션(Form, Union, Stored Procedure, Mass / Error-based, Blind), XSS(Stored, Reflected, DOM based), CSRF, SSRF, 운영체제 명령어 실행, 파일 업로드·다운로드, 경로 추적, 파일 삽입, URL/파라미터 변조, 불충분한 세션 관리, 정보누출 카테고리 (실습 내용은 준비 중)
  - Wireshark 패킷 분석: 실행 중인 터미널 실습 컨테이너의 패킷을 실시간으로 캡처해 Wireshark와 비슷한 화면에서 분석합니다.
    - 페이지에 들어오면 터미널 실습이 자동으로 시작되고(진행 중이면 그대로 사용) 터미널이 PIP 창으로 뜹니다. PIP 터미널에서 명령을 실행하며 패킷을 확인합니다. 터미널 실습 툴바의 **Wireshark로 캡처** 버튼으로도 이동할 수 있습니다.
    - 패킷 목록(프로토콜별 색), 계층별 상세 트리, 16진수/ASCII 바이트 창. 트리 항목을 고르면 해당 바이트가 강조되고, 바이트를 누르면 해당 항목이 선택됩니다.
    - 해석하는 프로토콜: Ethernet, Linux cooked capture(v1/v2), ARP, IPv4, IPv6, ICMP, ICMPv6, TCP(상대 시퀀스 번호, 스트림 번호), UDP, DNS, HTTP, TLS(Client Hello SNI), SSH
    - 캡처 필터(BPF, tcpdump 문법)와 표시 필터(`ip.addr == 10.0.0.1`, `tcp.port in {80 443}`, `http.host contains "naver"`, `&&` `||` `!` 등 Wireshark 문법 일부)
    - pcap 파일 저장(표시 중인 패킷)과 열기(실습 없이도 가능, pcapng 미지원)

## 기술 스택

| 구분 | 사용 기술 |
|---|---|
| 프레임워크 | React 19 |
| 빌드 도구 | Vite 8 |
| 라우팅 | React Router 8 |
| 터미널 | xterm.js (`@xterm/xterm`, `@xterm/addon-fit`) |
| 린트 | oxlint |

## 시작하기

Node.js 20 이상이 필요합니다.

```bash
npm install
npm run dev
```

개발 서버가 실행되면 브라우저에서 `http://localhost:5173` 으로 접속합니다.

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 (`dist/` 생성) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | oxlint 실행 |

### 환경 변수

백엔드 주소는 `VITE_API_BASE_URL` 로 지정합니다. 지정하지 않으면 `http://localhost:8080` 을 사용합니다.

```bash
cp .env.example .env.local
```

```
VITE_API_BASE_URL=http://localhost:8080
```

`.env.local` 은 git에 포함되지 않습니다.

## 페이지 구성

| 경로 | 페이지 |
|---|---|
| `/` | 메인 페이지 (로그인 전에는 미리 보기) |
| `/login`, `/signup` | 로그인, 회원가입 (누구나) |
| `/signup/google` | 연동 계정이 없는 구글 계정으로 가입 (누구나) |
| `/verify-email` | 이메일 인증번호 입력 (로그인, 인증 전) |
| `/account` | 내 계정, 구글 연동 (이하 로그인 필요) |
| `/isec/:topicId` | 정보보안기사 항목별 페이지 |
| `/linux` | 리눅스마스터 1급 페이지 |
| `/lab` | 실습 목록 |
| `/lab/terminal` | 터미널 실습 |
| `/lab/wireshark` | Wireshark 패킷 분석 실습 |
| `/lab/vuln` | 웹 취약점 실습 (카테고리 목록) |
| `/lab/vuln/:vulnId` | 웹 취약점 카테고리 페이지 |

## 프로젝트 구조

```
src/
├── main.jsx                  # 엔트리, BrowserRouter 설정
├── App.jsx                   # 라우트 정의와 공통 레이아웃
├── index.css                 # 전역 스타일과 색상 변수 (라이트/다크 모드)
├── data/
│   └── curriculum.js         # 자격증, 주요 항목, 실습 목록 정의
├── components/
│   ├── Header.jsx            # 상단 메뉴와 드롭다운
│   ├── Header.css
│   └── EbpfLogPanel.jsx      # eBPF 모니터링 로그 패널 (현재 미사용)
├── lab/
│   ├── TerminalSessionProvider.jsx  # 터미널 실습 세션 (xterm, WebSocket, 세션 시간, PIP 상태)
│   ├── terminalSession.js    # 세션 컨텍스트와 useTerminalSession 훅
│   ├── TerminalView.jsx      # xterm 을 붙여서 보여주는 자리 (페이지 / PIP)
│   ├── TerminalPip.jsx       # PIP 창 (이동, 크기 조절, 갱신·종료 버튼)
│   ├── SessionTimer.jsx      # 남은 세션 시간 표시
│   └── TerminalLab.css
├── wireshark/
│   ├── useCapture.js         # 캡처 WebSocket 연결과 패킷 저장
│   ├── dissect.js            # 패킷 해석기 (프로토콜별 상세 트리, 목록 요약, 필터 필드)
│   ├── filter.js             # 표시 필터 파서
│   ├── pcap.js               # pcap 저장 / 열기
│   ├── tree.js               # 바이트 위치 → 상세 트리 항목 찾기
│   ├── PacketList.jsx        # 패킷 목록 (보이는 줄만 렌더링)
│   ├── PacketDetails.jsx     # 상세 트리
│   ├── PacketBytes.jsx       # 16진수 / ASCII 바이트
│   └── Wireshark.css
├── config.js                 # 백엔드 주소 (VITE_API_BASE_URL)
├── api.js                    # REST 호출 (세션 쿠키, CSRF 헤더, 한국어 오류)
├── auth/                     # AuthProvider·useAuth(로그인 상태), RequireAuth(로그인 필요 라우트),
│                             # policy.js(아이디·비밀번호 규칙), PasswordFields, GoogleIcon, Auth.css
└── pages/
    ├── HomePage.jsx          # 메인 페이지
    ├── TopicPage.jsx         # 정보보안기사 항목 페이지
    ├── LinuxMasterPage.jsx   # 리눅스마스터 1급 페이지
    ├── LabHubPage.jsx        # 실습 목록
    ├── TerminalLabPage.jsx   # 터미널 실습
    ├── WiresharkLabPage.jsx  # Wireshark 실습
    ├── VulnLabPage.jsx       # 웹 취약점 실습 카테고리 목록
    ├── VulnCategoryPage.jsx  # 웹 취약점 카테고리 (실습 내용은 추후 구성)
    ├── NotFoundPage.jsx      # 404
    └── Pages.css
```

### 항목과 실습 추가하기

메뉴, 메인 페이지, 항목 페이지는 모두 `src/data/curriculum.js` 의 데이터를 기준으로 그려집니다.

- 정보보안기사 항목을 추가하거나 수정하려면 `isecTopics` 배열을 수정합니다.
- 리눅스마스터 1급 항목은 `exams` 배열의 `linux` 항목 `topics` 에 추가합니다.
- 웹 취약점 실습 카테고리는 `vulnCategories` 배열(세부 유형은 `groups`)을 수정합니다.
- 실습을 추가하려면 `labs` 배열에 항목을 추가하고, `App.jsx` 의 `/lab` 하위에 라우트를 등록합니다.

## 백엔드 연동

회원 기능은 백엔드의 `/api/auth/**` 를 사용합니다 (백엔드 README 의 API 표 참고). 모든 요청은 세션 쿠키를 보내도록 `credentials: 'include'` 로 하고, POST 는 쿠키 `XSRF-TOKEN` 값을 헤더 `X-XSRF-TOKEN` 으로 보냅니다(`src/api.js`).

터미널·Wireshark 실습 페이지는 아래 API를 사용합니다. 백엔드는 별도 저장소에서 관리합니다.

| 종류 | 엔드포인트 | 설명 |
|---|---|---|
| WebSocket | `/ws/terminal?labId={labId}` | 실습 컨테이너의 쉘 입출력 |
| WebSocket | `/ws/capture?labId={labId}` | 실행 중인 실습 컨테이너의 패킷 캡처 (Wireshark 실습) |
| SSE | `/api/logs?labId={labId}` | 해당 실습의 eBPF 모니터링 로그 스트림 (현재 미사용) |

- `labId` 는 실습을 시작할 때 클라이언트에서 UUID로 생성합니다.
- WebSocket 메시지는 양방향 모두 JSON입니다.
  - 보내는 메시지: 입력 `{"type":"input","data":"..."}`, 터미널 크기 `{"type":"resize","cols":120,"rows":30}`, 세션 갱신 `{"type":"renew"}`
  - 받는 메시지: 쉘 출력 `{"type":"output","data":"..."}`, 남은 세션 시간 `{"type":"session","remainingSeconds":600}`
- 연결 직후와 터미널 크기가 바뀔 때(창 크기, PIP 크기 조절) `resize` 를 보내 컨테이너 TTY 크기를 맞춥니다.
- 패킷 캡처 메시지(JSON)
  - 보내는 메시지: 시작 `{"type":"start","interface":"any","filter":"icmp"}`, 중지 `{"type":"stop"}`
  - 받는 메시지: `ready`(인터페이스 목록, snaplen, maxPackets), `started`(linkType), `packets`(`[{no, s, us, len, data(base64)}]`), `stopped`(reason, error, packets), `error`(message)
  - 패킷 해석은 브라우저에서 합니다. 터미널 실습이 끝나면 서버가 1000(`실습이 종료되었습니다`)으로 닫습니다.
- 실습 중에는 어느 페이지로 이동해도 실습이 유지됩니다 (실습 페이지 밖에서는 PIP). 실습은 종료 버튼, 세션 만료, 셸 종료(`exit`) 때만 끝납니다.
- eBPF 로그 패널을 다시 쓸 때는 SSE가 열린 뒤 WebSocket을 연결해야 초기 로그가 유실되지 않습니다 (`startLab({ deferConnect: true })`).

## 배포 시 참고

클라이언트 라우팅을 사용하므로, 웹 서버에서 존재하지 않는 경로 요청을 모두 `index.html` 로 보내도록 설정해야 합니다. 설정하지 않으면 `/lab/terminal` 같은 주소로 바로 접속하거나 새로고침할 때 404가 발생합니다.
