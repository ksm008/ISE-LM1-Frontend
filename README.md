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
  - 항목 페이지에는 백엔드의 학습 문서(Markdown)를 보여 줍니다. 본문은 페이지 가운데, 왼쪽에 문서 목록, 오른쪽에 목차(소제목 `##`·`###`·`####`, 누르면 그 위치로 스크롤하고 지금 보는 위치를 표시)가 있습니다. 화면 폭이 1180px 이하이면 목차를 숨기고 문서 목록을 본문 위에 둡니다. 이전/다음 문서로 이동할 수 있고, 문서가 없는 항목은 "준비하고 있습니다"로 표시합니다.
  - 리눅스마스터 1급: 준비 중
- **상단 메뉴**: 정보보안기사 메뉴에 마우스를 올리면 주요 항목과 실습 메뉴를 바로 선택할 수 있습니다.
- **모바일**: 화면 폭이 720px 이하이면 계정(아이디·로그아웃)이 헤더 아래 줄로 내려가고, 420px 이하이면 사이트 이름을 `ISE·LM1` 로 줄입니다. 문서는 본문 위 **목차** 버튼(스크롤해도 헤더 아래에 고정)을 누르면 아래에서 목차 창이 올라옵니다. 실습 화면(터미널·라우터·Wireshark)은 화면 높이에 맞춰 페이지가 스크롤되지 않고, 좁은 터미널은 글자를 12px 로 줄입니다. 라우터 실습은 좁은 화면에서 명령 안내를 닫은 채로 시작합니다.
- **실습**
  - 터미널 실습: 실습용 컨테이너를 생성해 브라우저에서 쉘을 사용합니다.
    - 페이지에 들어오면 실습이 자동으로 시작됩니다. 실습 중에 다른 페이지로 이동하면 터미널이 자동으로 PIP 창이 되고, 실습 페이지로 돌아오면 다시 페이지에 붙습니다.
    - 실습 컨테이너에서는 `sudo` 를 쓰더라도 `apt` 로 패키지를 추가 설치할 수 없습니다 (백엔드에서 차단, `dpkg -l` 등 조회는 가능).
    - 세션은 10분 동안 유지되며, "세션 갱신" 버튼으로 다시 10분으로 연장합니다. 만료 1분 전에 터미널에 안내가 표시됩니다.
    - PIP 창: 이동·크기 조절할 수 있습니다. 위쪽 막대에 원래 화면으로 / 세션 갱신 / 남은 시간, 맨 오른쪽에 종료(×) 버튼이 있으며 종료하면 실습도 끝납니다. PIP 에서 실습이 만료되거나 셸이 끝나면 안내를 볼 수 있게 창이 남아 있습니다.
    - 새 실습을 시작하면 터미널 화면이 초기화됩니다.
    - 우클릭: 선택한 글자가 있으면 복사, 없으면 붙여넣기 (Windows Terminal·PuTTY 방식). 브라우저가 처음 한 번 클립보드 권한을 묻습니다. HTTPS 또는 localhost 에서만 동작합니다.
    - eBPF 모니터링 로그 패널은 현재 비활성화되어 있습니다 (`src/pages/TerminalLabPage.jsx` 주석 참고).
  - 웹 취약점 실습: SQL 인젝션(Form, Union, Stored Procedure, Mass / Error-based, Blind), XSS(Stored, Reflected, DOM based), CSRF, SSRF, 운영체제 명령어 실행, 파일 업로드·다운로드, 경로 추적, 파일 삽입, URL/파라미터 변조, 불충분한 세션 관리, 정보누출 카테고리
    - **SQL 인젝션 실습**(Form, Union, Stored Procedure, Error-based): 브라우저 안 SQLite(sql.js, WASM)로 만든 실습용 쇼핑몰 DB 에 취약한 로그인 폼·게시판 검색을 흉내 냅니다. 서버로 보내지 않고, 새로고침하면 처음 상태입니다.
      - 왼쪽은 취약한 웹 페이지(가짜 브라우저 창, SQL 오류를 그대로 보여 줌), 오른쪽은 서버가 실행한 SQL(사용자 입력 부분 강조)과 PHP 코드.
      - 미션(힌트·예시 입력): Form 은 오류 확인 → 인증 우회 → 관리자 로그인, Union 은 오류 확인 → 컬럼 수 → DB 정보 → 테이블 → 컬럼 → 관리자 비밀번호, Stored Procedure 는 프로시저 안 동적 SQL 의 오류 확인 → 조건 우회, Error-based 는 오류 노출 → `extractvalue()` 오류로 DB 버전 출력. "보안 코딩 적용"을 켜면 Prepared Statement(바인딩 값 표시)로 같은 공격이 막히는지 확인합니다.
      - MySQL 흐름을 따라 할 수 있게 `information_schema`(tables, columns, schemata)와 `database()`, `version()`, `user()`, `extractvalue()` 를 흉내 냅니다. `#` 주석은 안 되고 `--` 를 씁니다(오류에 안내). 한 번에 한 문장만 실행합니다(`;` 로 이어 붙인 문장 거부).
    - 나머지 항목은 준비 중
  - 라우터 설정 실습: IOS 스타일 명령을 쓰는 라우터 시뮬레이터 (브라우저 안에서 동작, 서버 자원 없음)
    - 모드 전환(`Router>` → `#` → `(config)#` → `(config-if)#` / `(config-line)#`), 줄임말(`conf t`, `int g0/0`), `?` 즉시 도움말, Tab 자동 완성, ↑↓ 명령 기록, `no`·`do`, `% Invalid input detected at '^' marker.` 오류 위치 표시, `| include/exclude/begin/section` 출력 필터
    - 1단계 범위: enable secret(type 5)·enable password·service password-encryption(type 7)·security passwords min-length, username, console/vty 라인(password, login, login local, exec-timeout, transport input, access-class), SSH(hostname, ip domain-name, crypto key generate rsa, ip ssh version), 불필요한 서비스 끄기(http server, cdp, source-route, small-servers, bootp, finger, domain lookup, 인터페이스의 directed-broadcast 등), banner motd, 인터페이스 IP·shutdown
    - 터미널 실습과 같은 PIP: 콘솔을 쓰는 중에 다른 페이지로 가면 왼쪽 아래 PIP 창으로 바뀌고(터미널 PIP 는 오른쪽 아래), "원래 화면으로"로 돌아오면 입력하던 상태 그대로 이어집니다. PIP 의 ×는 라우터 끄기(저장하지 않은 설정은 사라짐)입니다.
    - 콘솔 로그인(line password / login local)과 enable 비밀번호 확인, 저장(copy running-config startup-config, write memory)·reload·erase. 저장한 설정은 계정별로 브라우저(localStorage)에 남습니다. "라우터 초기화"로 공장 초기 상태
    - ACL 과 접속 시험(토폴로지)은 다음 단계에서 추가합니다.
  - Wireshark 패킷 분석: 실행 중인 터미널 실습 컨테이너의 패킷을 실시간으로 캡처해 Wireshark와 비슷한 화면에서 분석합니다.
    - 페이지에 들어오면 터미널 실습이 자동으로 시작되고(진행 중이면 그대로 사용) 터미널이 PIP 창으로 뜹니다. PIP 터미널에서 명령을 실행하며 패킷을 확인합니다. 터미널 실습 툴바의 **Wireshark로 캡처** 버튼으로도 이동할 수 있습니다.
    - 패킷 목록(프로토콜별 색), 계층별 상세 트리, 16진수/ASCII 바이트 창. 트리 항목을 고르면 해당 바이트가 강조되고, 바이트를 누르면 해당 항목이 선택됩니다.
    - 해석하는 프로토콜: Ethernet, Linux cooked capture(v1/v2), ARP, IPv4, IPv6, ICMP, ICMPv6, TCP(상대 시퀀스 번호, 스트림 번호), UDP, DNS, HTTP, TLS(Client Hello SNI), SSH
    - 캡처 필터(BPF, tcpdump 문법)와 표시 필터(`ip.addr == 10.0.0.1`, `tcp.port in {80 443}`, `http.host contains "naver"`, `&&` `||` `!` 등 Wireshark 문법 일부)
    - pcap 파일 저장(표시 중인 패킷)과 열기(실습 없이도 가능, pcapng 미지원)
    - 캡처 연결만 끊기면(다른 창에서 같은 실습의 캡처 화면을 연 경우 등) 상태 표시줄의 **다시 연결** 버튼으로 실습을 유지한 채 다시 연결합니다.

## 기술 스택

| 구분 | 사용 기술 |
|---|---|
| 프레임워크 | React 19 |
| 빌드 도구 | Vite 8 |
| 라우팅 | React Router 8 |
| 터미널 | xterm.js (`@xterm/xterm`, `@xterm/addon-fit`) |
| 문서 | react-markdown, remark-gfm (HTML 태그는 실행하지 않음) |
| SQL 인젝션 실습 DB | sql.js 1.15.2 (SQLite WASM, 실습 페이지를 열 때만 불러옴) |
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
| `npm test` | 단위 테스트 (Vitest, 라우터 시뮬레이터 엔진, SQL 인젝션 실습) |

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
| `/isec/:topicId` | 정보보안기사 항목별 페이지 (첫 번째 학습 문서) |
| `/isec/:topicId/:docSlug` | 항목의 학습 문서 |
| `/linux` | 리눅스마스터 1급 페이지 |
| `/lab` | 실습 목록 |
| `/lab/terminal` | 터미널 실습 |
| `/lab/wireshark` | Wireshark 패킷 분석 실습 |
| `/lab/router` | 라우터 설정 실습 |
| `/lab/vuln` | 웹 취약점 실습 (카테고리 목록) |
| `/lab/vuln/:vulnId` | 웹 취약점 카테고리 페이지 |
| `/lab/vuln/:vulnId/:labId` | 웹 취약점 세부 실습 (`sql-injection/form`, `union`, `stored-procedure`, `error-based`) |

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
│   ├── PipFrame.jsx          # PIP 창 공통 틀 (이동, 8방향 크기 조절, 닫기) — 터미널·라우터 PIP 가 함께 사용
│   ├── TerminalPip.jsx       # 터미널 PIP (원래 화면으로, 세션 갱신, 남은 시간, 종료)
│   ├── SessionTimer.jsx      # 남은 세션 시간 표시
│   ├── terminalFont.js       # 터미널 글꼴·크기 (좁으면 12px, 라우터 콘솔과 공용)
│   └── TerminalLab.css
├── router/                   # 라우터 설정 실습 (IOS 스타일 시뮬레이터)
│   ├── engine/               # 명령 트리 엔진: tree.js(kw/arg 노드), types.js(값 형식), parser.js(해석·도움말·자동 완성)
│   ├── commands/             # 모드별 명령 정의: exec, global, interface, line, index(no/do/exit/end 추가)
│   ├── device/               # 장비 설정 상태(device.js), show running-config 출력(runningConfig.js)
│   ├── crypto/               # MD5, type 5(MD5-crypt)·type 7 비밀번호
│   ├── session.js            # 콘솔 세션: 모드, 로그인·enable, 저장·재부팅, 출력 필터, 자동 로그아웃
│   ├── routerConsole.js      # xterm 위의 IOS 방식 줄 편집기 (? Tab ↑↓ Ctrl+Z 붙여넣기)
│   ├── RouterSessionProvider.jsx # 콘솔 하나를 앱 전체에서 유지, 페이지·PIP 사이로 옮겨 붙임 (routerContext.js, RouterView.jsx)
│   ├── RouterPip.jsx         # 라우터 PIP (원래 화면으로, 라우터 끄기)
│   ├── *.test.js             # Vitest 단위 테스트
│   └── RouterLab.css
├── vuln/                     # 웹 취약점 실습
│   ├── registry.js           # `취약점/실습` → 화면 (lazy, 실습마다 따로 불러옴)
│   └── sqli/                 # SQL 인젝션 (브라우저 안 SQLite)
│       ├── labDb.js          # 실습 DB (members, posts, information_schema 흉내, database() 등)
│       ├── query.js          # 한 문장만 실행, 결과 행 수 제한, SQLite·MySQL 차이 안내
│       ├── formLab.js        # 로그인 SQL·인증 우회 판정·미션
│       ├── unionLab.js       # 게시판 검색 SQL·UNION 판정·미션
│       ├── spLab.js          # 저장 프로시저 안 동적 SQL·미션
│       ├── errorLab.js       # 게시글 보기(숫자 파라미터)·오류 노출·미션
│       ├── sqlJs.js          # sql.js(WASM) 불러오기
│       ├── useSqliLab.js     # DB 준비·미션 진행 훅
│       ├── SqliLabParts.jsx  # 가짜 브라우저 창, SQL 기록, 미션 목록, 서버 코드, 전체 틀
│       ├── FormSqliLab.jsx / UnionSqliLab.jsx / SpSqliLab.jsx / ErrorSqliLab.jsx
│       ├── sqli.test.js      # 실제 공격 입력으로 시험
│       └── SqliLab.css
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
├── docs/                     # 학습 문서: useDocs.js(/api/docs 호출), MarkdownDoc.jsx(react-markdown + GFM 표),
│                             # headings.js(소제목 id), DocToc.jsx(오른쪽 목차 / 좁은 화면 목차 창), useActiveHeading.js(현재 위치),
│                             # Docs.css(목록 | 본문 | 목차 배치)
├── auth/                     # AuthProvider·useAuth(로그인 상태), RequireAuth(로그인 필요 라우트),
│                             # policy.js(아이디·비밀번호 규칙), PasswordFields, GoogleIcon, Auth.css
└── pages/
    ├── HomePage.jsx          # 메인 페이지
    ├── TopicPage.jsx         # 정보보안기사 항목 페이지 (학습 문서 목록·본문)
    ├── LinuxMasterPage.jsx   # 리눅스마스터 1급 페이지
    ├── LabHubPage.jsx        # 실습 목록
    ├── TerminalLabPage.jsx   # 터미널 실습
    ├── WiresharkLabPage.jsx  # Wireshark 실습
    ├── RouterLabPage.jsx     # 라우터 설정 실습 (콘솔 + 명령 안내, 초기화)
    ├── VulnLabPage.jsx       # 웹 취약점 실습 카테고리 목록
    ├── VulnCategoryPage.jsx  # 웹 취약점 카테고리 (실습 있는 항목은 실습 페이지로 연결)
    ├── VulnPracticePage.jsx  # 웹 취약점 세부 실습 (같은 취약점 실습 탭, vuln/registry.js 화면)
    ├── NotFoundPage.jsx      # 404
    └── Pages.css
```

### 항목과 실습 추가하기

메뉴, 메인 페이지, 항목 페이지는 모두 `src/data/curriculum.js` 의 데이터를 기준으로 그려집니다.

- 정보보안기사 항목을 추가하거나 수정하려면 `isecTopics` 배열을 수정합니다.
- 항목의 학습 문서는 프론트가 아니라 백엔드 `docs/isec/{번호}-{항목 id}/` 에 `.md` 파일로 추가합니다(예: `02-vulnerability`, 번호는 `isecTopics` 순서, `topicDocsDir`). 항목 순서를 바꾸면 백엔드 문서 폴더 이름도 바꿔야 합니다 (백엔드 README "학습 문서").
- 리눅스마스터 1급 항목은 `exams` 배열의 `linux` 항목 `topics` 에 추가합니다.
- 웹 취약점 실습 카테고리는 `vulnCategories` 배열(세부 유형은 `groups`)을 수정합니다. 세부 항목에 실습을 붙이려면 항목을 `{ title, lab, summary }` 로 바꾸고 `src/vuln/registry.js` 에 `'취약점id/lab'` 화면을 등록합니다.
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

`main` 에 push 하면 배포 서버가 1분 안에 받아서 `npm test` → `npm run build`(사이트 주소로 `VITE_API_BASE_URL` 지정) 후 바꿔 놓습니다. 테스트나 빌드가 실패하면 배포하지 않습니다 (백엔드 저장소 `deploy/README.md` "자동 배포").

클라이언트 라우팅을 사용하므로, 웹 서버에서 존재하지 않는 경로 요청을 모두 `index.html` 로 보내도록 설정해야 합니다. 설정하지 않으면 `/lab/terminal` 같은 주소로 바로 접속하거나 새로고침할 때 404가 발생합니다.
