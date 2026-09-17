# HIPO - 사람을 주식처럼 거래하는 SNS 플랫폼

## 프로젝트 소개

HIPO는 사람을 주식처럼 거래하는 혁신적인 소셜 네트워크 플랫폼입니다.

### 핵심 기능

- 👤 **사용자 주식화**: 각 사용자가 주식으로 발행됨
- 📈 **실시간 주가**: 활동, 팔로워, 참여도에 따른 주가 변동
- 💰 **PO 시스템**: 플랫폼 내 화폐 (PO)
- 💎 **배당 시스템**: 보유 주식에 따른 실시간 배당 지급
- ⭐ **신뢰도 등급**: Bronze → Silver → Gold → Platinum → Diamond → Master → Legend
- 💬 **톡방**: 등급별 차등 채팅방

## 기술 스택

### Backend
- Node.js + Express
- SQLite (Sequelize ORM) - 개발용
- Socket.io (실시간 통신)
- JWT (인증)
- Axios (API 통신)

### Frontend
- React Native (Expo)
- React Navigation
- AsyncStorage (로컬 저장소)
- Axios (API 클라이언트)

## 시작하기

### 사전 요구사항

- Node.js 18+
- npm 또는 yarn
- Expo Go 앱 (모바일 테스트용)

### 백엔드 설정

\`\`\`bash
# 1. 백엔드 디렉토리로 이동
cd backend

# 2. 패키지 설치
npm install

# 3. 서버 시작 (개발 모드)
npm run dev

# 서버가 http://localhost:5555 에서 실행됩니다 (PORT 환경변수로 변경 가능)
# SQLite 데이터베이스가 자동으로 생성됩니다
\`\`\`

#### 스키마 관리

스키마의 원본은 `backend/src/models/*.js` 이고, 반영은 Sequelize의 `sync()`가 담당한다.

\`\`\`bash
npm run migrate                  # alter — 누락된 테이블/컬럼 추가 (기본)
npm run migrate -- --mode=sync   # 없는 테이블만 생성, 기존 테이블은 건드리지 않음
npm run migrate -- --mode=force  # 전체 DROP 후 재생성 (데이터 전부 삭제)
\`\`\`

서버 부팅 시 자동 동기화 여부는 `DB_SYNC` 환경변수로 제어한다.

| 값 | 동작 |
|---|---|
| `alter` | 누락된 테이블/컬럼 추가 (개발 기본값) |
| `sync` | 없는 테이블만 생성 |
| `none` | 동기화 안 함 (**운영 기본값**) |

운영 환경은 부팅 시 스키마를 건드리지 않는다. 변경이 필요하면 `npm run migrate`를 명시적으로 실행할 것.

### 프론트엔드 설정

\`\`\`bash
# 1. 프론트엔드 디렉토리로 이동
cd frontend

# 2. 패키지 설치
npm install

# 3. 앱 실행
npm start

# QR 코드를 스캔하여 Expo Go 앱에서 실행하거나
# w 키를 눌러 웹 브라우저에서 실행
\`\`\`

### API 기본 URL 변경 (필요시)

API/소켓 주소는 `frontend/src/config/index.js` **한 곳**에서만 정의한다.
axios 클라이언트, fetch 래퍼, 소켓 서비스가 모두 여기를 참조하므로 다른 파일에
URL을 하드코딩하지 말 것.

\`\`\`javascript
// frontend/src/config/index.js
const DEV_HOST = 'localhost';  // 실기기 테스트 시 PC의 LAN IP (예: 192.168.0.100)
const DEV_PORT = 5555;         // backend/.env 의 PORT와 일치해야 함
const PROD_ORIGIN = 'https://hipo-backend.fly.dev';
\`\`\`

## API 엔드포인트

### 인증

- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 내 정보 조회 (인증 필요)

### 주식

- `GET /api/stocks` - 주식 목록
- `GET /api/stocks/:id` - 주식 상세
- `POST /api/stocks/buy` - 주식 매수 (인증 필요)
- `POST /api/stocks/sell` - 주식 매도 (인증 필요)
- `GET /api/stocks/me/holdings` - 내 보유 주식 (인증 필요)
- `GET /api/stocks/me/transactions` - 내 거래 내역 (인증 필요)

## 데이터베이스 스키마

- **users**: 사용자 정보
- **stocks**: 주식 발행 정보
- **holdings**: 보유 주식
- **transactions**: 거래 내역
- **activities**: 활동 로그
- **dividends**: 배당 내역
- **chat_rooms**: 채팅방
- **messages**: 메시지

## 개발 진행 상황

### 백엔드 (완성도: 95%)
- [x] 프로젝트 구조 생성
- [x] 백엔드 초기 설정 (Express + SQLite)
- [x] 데이터베이스 스키마 (70+ 테이블)
- [x] 인증 시스템 (회원가입/로그인/JWT)
- [x] 주식 거래 시스템 (매수/매도 API)
- [x] 주가 계산 알고리즘
- [x] 거래 내역 관리
- [x] PO 획득 및 배당 시스템 ✅
- [x] 실시간 기능 (Socket.io) ✅
- [x] 신뢰도 등급 시스템 ✅
- [x] 봇 탐지 시스템
- [x] 커뮤니티 시스템
- [x] NFT, 이벤트, 팬미팅 등

### 프론트엔드 (React Native + Expo, 완성도: 90%)
- [x] Expo 프로젝트 생성
- [x] React Navigation 설정
- [x] API 클라이언트 (Axios)
- [x] 로그인/회원가입 화면
- [x] 피드 화면 (게시글 목록)
- [x] 주식 시장 화면
- [x] 주식 상세 화면
- [x] 보유 주식 화면 (포트폴리오) ✅
- [x] 프로필 화면 ✅
- [x] 거래 내역 화면 ✅
- [x] 배당 화면
- [x] 지갑 화면
- [x] 실시간 알림 시스템 ✅ NEW!

## 주요 기능

### 실시간 알림 시스템 (NEW!)
Socket.IO를 사용한 실시간 양방향 통신:
- **실시간 주가 업데이트**: 주가 변동 시 즉시 알림
- **배당 수령 알림**: 배당금 지급 시 실시간 토스트 알림
- **레벨업 알림**: 신뢰도 등급 상승 시 축하 알림
- **DM 메시지**: 실시간 1:1 메시징
- **커뮤니티 채팅**: 실시간 그룹 채팅
- **연결 상태 표시**: 헤더에 실시간 연결 상태 인디케이터

### 주가 계산 알고리즘
주가는 다음 5가지 요소로 계산됩니다:
- 팔로워 증가율 (30%)
- 콘텐츠 참여도 (30%)
- 거래량 (20%)
- 배당 수익률 (10%)
- 외부 명성 (10%)

### 신뢰도 등급
- **Bronze** (×0.3): 0~10,000 PO
- **Silver** (×0.6): 10,001~50,000 PO
- **Gold** (×1.0): 50,001~200,000 PO
- **Platinum** (×1.5): 200,001~1M PO
- **Diamond** (×2.0): 1M~5M PO
- **Master** (×3.0): 5M~20M PO
- **Legend** (×5.0): 20M+ PO

## 실시간 알림 시스템 사용 방법

### 백엔드
Socket.IO 서버는 자동으로 시작됩니다:
```bash
cd backend
npm run dev
```

### 프론트엔드 (React Native + Expo)
1. 패키지 설치 (이미 설치됨):
```bash
cd frontend
npm install
```

2. 앱 실행:
```bash
npm start
```

3. 로그인 후 헤더에서 실시간 연결 상태 확인
   - 🟢 "실시간 연결됨" = 정상 연결
   - 🔴 "연결 끊김" = 서버 연결 필요

### 실시간 알림 이벤트 목록
- `notification:new` - 일반 알림
- `dividend:received` - 배당 수령 알림
- `level:up` - 레벨업 알림
- `stock:price_update` - 주가 변동 알림
- `message:new` - DM 메시지
- `chat:message` - 커뮤니티 채팅 메시지

## 다음 단계

> 미구현/미작동 항목의 최신 검증 결과는 [`UNIMPLEMENTED_FEATURES.md`](UNIMPLEMENTED_FEATURES.md)
> (요약: [`QUICK_REFERENCE.md`](QUICK_REFERENCE.md)) 참조.

아래 항목은 **이미 구현 완료**되어 목록에서 제외:
`관리자 대시보드`(`/api/admin/*` + `AdminDashboardScreen`), `통계 및 분석`(`/api/admin/charts/*`),
`스키마 관리 정리`(`DB_SYNC` + `npm run migrate`), `실시간 활동 피드`(`post:new`).

1. **테스트 코드**
   - 현재 백엔드 테스트는 4개 파일 (`auth`/`post`/`stock`/`admin`) / 컨트롤러 52개
   - API 단위 테스트 · 통합 테스트 · E2E 테스트

2. **죽은 화면 정리**
   - `HomeScreenRedesigned.js`, `TransactionsScreen.js`가 `AppNavigator`에 등록돼 있지 않음
   - 남길지 지울지 결정 필요 (`HomeScreenRedesigned`는 목 데이터로 동작 중)

3. **에러 트래킹 연동**
   - `frontend/src/components/ErrorBoundary.js:42` — Sentry 등 DSN 발급 후 연결

## 라이선스

MIT
