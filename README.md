# ISE-LM1 Frontend

정보보안기사와 리눅스마스터 1급 시험을 준비하기 위한 학습 사이트의 프론트엔드입니다.
시험 범위를 항목별로 정리해 제공하고, 실제 리눅스 컨테이너에 접속하는 터미널 실습과 패킷 분석 실습 환경을 함께 제공합니다.

## 주요 기능

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
    - 세션은 10분 동안 유지되며, "세션 갱신" 버튼으로 다시 10분으로 연장합니다. 만료 1분 전에 터미널에 안내가 표시됩니다.
    - PIP 모드: 아이콘을 누르면 메인 페이지로 이동하고 터미널만 작은 창으로 띄웁니다. 창은 이동·크기 조절할 수 있고, 다른 페이지로 이동해도 실습이 유지됩니다. 창 위쪽 막대에 원래 화면으로 / 세션 갱신 / 남은 시간, 맨 오른쪽에 종료(×) 버튼이 있으며 종료하면 실습도 끝납니다.
    - 실습이 끝난 뒤 페이지를 나갔다 다시 들어오면 터미널 화면이 초기화됩니다.
    - eBPF 모니터링 로그 패널은 현재 비활성화되어 있습니다 (`src/pages/TerminalLabPage.jsx` 주석 참고).
  - Wireshark 패킷 분석: 준비 중

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
| `/` | 메인 페이지 (사이트 소개, 주요 항목, 실습 안내) |
| `/isec/:topicId` | 정보보안기사 항목별 페이지 |
| `/linux` | 리눅스마스터 1급 페이지 |
| `/lab` | 실습 목록 |
| `/lab/terminal` | 터미널 실습 |
| `/lab/wireshark` | Wireshark 패킷 분석 실습 |

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
└── pages/
    ├── HomePage.jsx          # 메인 페이지
    ├── TopicPage.jsx         # 정보보안기사 항목 페이지
    ├── LinuxMasterPage.jsx   # 리눅스마스터 1급 페이지
    ├── LabHubPage.jsx        # 실습 목록
    ├── TerminalLabPage.jsx   # 터미널 실습
    ├── WiresharkLabPage.jsx  # Wireshark 실습
    ├── NotFoundPage.jsx      # 404
    └── Pages.css
```

### 항목과 실습 추가하기

메뉴, 메인 페이지, 항목 페이지는 모두 `src/data/curriculum.js` 의 데이터를 기준으로 그려집니다.

- 정보보안기사 항목을 추가하거나 수정하려면 `isecTopics` 배열을 수정합니다.
- 리눅스마스터 1급 항목은 `exams` 배열의 `linux` 항목 `topics` 에 추가합니다.
- 실습을 추가하려면 `labs` 배열에 항목을 추가하고, `App.jsx` 의 `/lab` 하위에 라우트를 등록합니다.

## 백엔드 연동

터미널 실습 페이지는 아래 API를 사용합니다. 백엔드는 별도 저장소에서 관리합니다.

| 종류 | 엔드포인트 | 설명 |
|---|---|---|
| WebSocket | `/ws/terminal?labId={labId}` | 실습 컨테이너의 쉘 입출력 |
| SSE | `/api/logs?labId={labId}` | 해당 실습의 eBPF 모니터링 로그 스트림 (현재 미사용) |

- `labId` 는 실습을 시작할 때 클라이언트에서 UUID로 생성합니다.
- WebSocket 메시지는 양방향 모두 JSON입니다.
  - 보내는 메시지: 입력 `{"type":"input","data":"..."}`, 터미널 크기 `{"type":"resize","cols":120,"rows":30}`, 세션 갱신 `{"type":"renew"}`
  - 받는 메시지: 쉘 출력 `{"type":"output","data":"..."}`, 남은 세션 시간 `{"type":"session","remainingSeconds":600}`
- 연결 직후와 터미널 크기가 바뀔 때(창 크기, PIP 크기 조절) `resize` 를 보내 컨테이너 TTY 크기를 맞춥니다.
- PIP 모드가 아닌 상태로 실습 페이지를 벗어나면 실습이 종료됩니다. PIP 모드에서는 다른 페이지로 이동해도 유지됩니다.
- eBPF 로그 패널을 다시 쓸 때는 SSE가 열린 뒤 WebSocket을 연결해야 초기 로그가 유실되지 않습니다 (`startLab({ deferConnect: true })`).

## 배포 시 참고

클라이언트 라우팅을 사용하므로, 웹 서버에서 존재하지 않는 경로 요청을 모두 `index.html` 로 보내도록 설정해야 합니다. 설정하지 않으면 `/lab/terminal` 같은 주소로 바로 접속하거나 새로고침할 때 404가 발생합니다.
