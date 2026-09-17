# HIPO Platform - 미구현 기능 및 TODO

> **최종 검증: 2026-09-17** (코드 직접 대조)
>
> 이전 판(2025-11-02)은 존재하지 않는 `webapp/` 디렉토리와 `C:\Users\u\hipo` 절대경로를
> 기준으로 작성되어 있었다. 실제 프론트엔드는 `frontend/` (React Native + Expo) 하나뿐이다.
> 경로는 모두 저장소 루트 기준 상대경로로 적는다.

---

## 1. 이전 문서 항목 재검증 결과

| 이전 문서가 "미구현"이라 적은 항목 | 실제 상태 (2026-09-17) |
|---|---|
| 봇 탐지 운영진 알림 (`botDetector.js:26`) | **이미 구현됨.** `increaseSuspicionScore()`가 `role: 'admin'` 사용자 전원에게 `sendNotificationToUser()`로 전송한다. |
| 프로필 사용자 게시글 로딩 | **구현 완료 (이번 작업).** 아래 3장 참조. |
| Socket.IO 실시간 주가 브로드캐스트 | **이미 구현됨.** `sendStockPriceUpdate()` ← `stockPriceService.js` |
| Socket.IO 실시간 배당 알림 | **이미 구현됨.** `sendDividendNotification()` ← `dividendCalculator.js` |
| Socket.IO 실시간 레벨업 알림 | **이미 구현됨.** `sendLevelUpNotification()` ← `chatController.js` |
| 관리자 대시보드 | **이미 구현됨.** `/api/admin/*` 11개 엔드포인트 + `AdminDashboardScreen.js` |
| 통계 및 분석 (차트) | **이미 구현됨.** `/api/admin/charts/{user-growth,transaction-volume,coin-flow,active-users}` |
| 배당 시스템 / 신뢰도 등급 | **이미 구현됨.** (이전 문서도 같은 결론) |

---

## 2. 이번 검증에서 새로 발견한 "동작하지 않던" 부분 → 수정 완료

이전 문서는 TODO 주석만 세었기 때문에, 주석이 없는 채로 런타임에 깨지던 아래 항목들을 놓쳤다.

### 2.00 `sequelize.sync()`가 모델 0개를 대상으로 돌고 있었음 (최치명) — 수정됨

**증상:** 갓 클론한 상태에서 서버를 띄우면 `📊 Database synchronized`가 찍히는데도
**테이블이 하나도 만들어지지 않는다.** 이후 백그라운드 서비스가
`no such table: stocks`, `no such table: transactions`, `no such table: stock_orders`,
`no such table: stock_alerts`, `no such table: shareholder_communities`로 계속 실패하고,
`GET /api/stocks`는 500을 반환한다.

**원인:** `server.js`의 `startServer()`가
`require('./src/config/database')`로 **sequelize 인스턴스만** 가져온 뒤 곧바로
`sequelize.sync({ alter: true })`를 호출했다. `sync()`는 *그 시점까지 define된 모델만*
생성하는데, 모델 등록(`src/models/index.js`)은 그 다음 단계인 `loadRoutes()`가
컨트롤러를 통해 `../models`를 require할 때 비로소 일어난다.
즉 **sync가 항상 빈 모델 목록을 대상으로 실행**되고 있었다.

기존 배포 환경에서는 예전에 만들어둔 테이블이 남아 있어 이 문제가 가려져 있었다.

**조치:** `sync()` 직전에 `require('./src/models')`를 추가하고, 등록된 모델 수를 로그로 남긴다.

### 2.0 타임스탬프 속성명이 통째로 어긋나 있었음 (최치명) — 수정됨

**증상:** `where: { createdAt: ... }`를 쓰는 모든 쿼리가
`SQLITE_ERROR: no such column: X.createdAt`로 실패했다.
**관리자 통계/차트 전체**(`adminController.js`에만 19곳), 배당 집계, 봇 탐지,
포트폴리오·에러 리포트 기간 필터 등이 전부 여기에 걸려 있었다.

**원인:** `backend/src/config/database.js`의 전역 `define`이
```js
underscored: true,
createdAt: 'created_at',   // ← 이게 문제
updatedAt: 'updated_at'
```
로 되어 있었다. Sequelize에서 `define.createdAt`은 **컬럼명이 아니라 속성명**을 바꾼다.
즉 모델의 속성이 `createdAt`이 아니라 `created_at`이 되어버려, 코드가 쓰는
`createdAt` 키는 "알 수 없는 속성" → 원시 컬럼명으로 그대로 SQL에 나갔다.
컬럼 매핑은 `underscored: true`만으로 이미 `created_at`이 되므로 이 두 줄은 불필요했다.

`createdAt`을 명시 선언한 모델 14개(`Notification`, `Watchlist`, `StockAlert` 등)만
우연히 정상 동작하고 있었고, 나머지 81개 모델은 전부 깨져 있었다.

**조치:**
- 전역 `define`에서 `createdAt`/`updatedAt` 별칭 제거 (`underscored: true`만 유지).
- `Payment.js` / `WalletTransaction.js`의 `underscored: false` 제거 —
  두 모델은 인덱스가 `created_at`을 참조하는데 `underscored: false` 탓에
  타임스탬프 컬럼이 `createdAt`으로 생성돼 `sync` 자체가 실패했다.
  (일반 컬럼은 각 속성의 `field:` 선언이 우선하므로 영향 없음.)

### 2.1 Notification 모델 ↔ 호출부 전면 불일치 (치명) — 수정됨

**증상:** 소셜 알림을 제외한 모든 알림이 DB 저장에 실패했고, 알림 화면은 제목/본문이 항상 비어 있었다.

**원인:** `backend/src/models/Notification.js`가 `type ENUM('like','comment','follow','mention')`,
`actorId NOT NULL`, 그리고 `title`/`message`/`relatedId`/`data` 컬럼 없음으로 정의되어 있었다.
반면 17개 호출부가 `title`/`message`/`relatedId`/`data`/`metadata`와 13종 커스텀 타입
(`DIVIDEND_RECEIVED`, `REFERRAL`, `STOCK_PURCHASED`, `BADGE_EARNED`, `MISSION_COMPLETE`,
`tier_change`, `VICE_ADMIN_APPOINTED`, `CONTENT_REQUEST` 등)으로 레코드를 만들고 있었다.
동시에 `frontend/src/screens/NotificationScreen.js`는 `item.title` / `item.message`를 렌더한다.

**조치:**
- 모델을 상위집합으로 확장: `type`을 `STRING(50)`으로, `actorId`를 nullable(시스템 알림용)로,
  `title`/`message`/`relatedId`/`data(JSON)` 컬럼 추가, `(user_id, is_read)` 인덱스 추가.
- `notificationController.createNotification()`이 소셜 알림(like/comment/follow/mention)에도
  제목·본문을 채워 넣고, 생성 즉시 `sendNotificationToUser()`로 실시간 푸시하도록 변경.
- `dividendCalculator.js`의 `metadata` → `data`로 통일 (읽는 쪽 `n.metadata?.x`도 함께 수정).

### 2.2 `sequelize.Op` 오용 9곳 (치명) — 수정됨

**증상:** 아래 기능이 호출 즉시 `TypeError: Cannot read properties of undefined`로 실패했다.

Sequelize v6에서 `Op`는 클래스(`require('sequelize').Op`)에 있고 **인스턴스에는 없다**.
5개 파일이 인스턴스(`require('../config/database').sequelize`)에서 `sequelize.Op.gte`를 읽고 있었다.

| 파일 | 영향받던 기능 |
|---|---|
| `controllers/chatController.js:187` | 채팅 이전 메시지 페이지네이션 |
| `controllers/communityAdminController.js:261` | 커뮤니티 이달의 제재 통계 |
| `controllers/levelController.js:65,66,69,326` | 레벨 랭킹 산출, 부방장 후보 조회 |
| `utils/botDetector.js:69,128` | 봇 탐지 COMMENT_SPEED / LIKE_BURST 패턴 |
| `utils/dividendCalculator.js:304` | 배당 계산용 최근 7일 활동 집계 |

**조치:** 5개 파일 모두 `const { Op } = require('sequelize')`를 임포트하고 `Op.*`로 교체.

### 2.3 PO 보상 엔진이 어디에도 연결돼 있지 않음 (치명) — 수정됨

**증상:** 플랫폼의 핵심 루프인 **활동 → PO 획득 → 주주 배당 → 주가 상승**이 전혀 돌지 않았다.
게시글을 쓰든 댓글을 달든 좋아요를 누르든 PO가 1도 지급되지 않았다.

**원인:** `backend/src/utils/coinRewards.js`는 일일 한도, 신뢰도 배율, Bronze 상한, 거래 기록,
크리에이터 배당 연계까지 완비된 상태였지만 **저장소 전체에서 단 한 번도 `require`되지 않았다.**
`botDetector.js`도 마찬가지로 호출자가 없어, README가 "구현됨"이라 적은 봇 탐지가 실제로는
한 번도 실행되지 않고 있었다.

추가로 `CoinTransaction.source` ENUM에 `BASE_REWARDS`의 키 18개 중 6개
(`LIKE`, `PROFILE_VISIT`, `STOCK_HOLDING_DAILY`, `MONTHLY_CONTENT`,
`ATTENDANCE_STREAK_7`, `CREATOR_REVIEW_PERFECT`)가 빠져 있어서, 연결했더라도
그대로는 저장 시점에 제약 위반이 났을 것이다.

**조치:**
- `CoinTransaction.source` ENUM에 누락 6종 추가 (`LIKE`는 누른 사람, `LIKE_RECEIVED`는 받은 사람).
- `postController.js`에 `awardActivity()` 헬퍼 추가 — 봇 탐지를 먼저 돌리고, 의심 패턴이면
  보상을 건너뛴다. 보상/탐지 실패가 본 동작(작성·좋아요)을 깨지 않도록 예외를 전부 삼킨다.
- 연결 지점: `createPost` → `POST_CREATE`, `addComment` → `COMMENT_CREATE`(+`COMMENT` 탐지),
  `likePost` → `LIKE`(+`LIKE` 탐지). 세 응답 모두 `reward` 필드로 지급 결과를 반환한다.

> 이로써 `botDetector`의 `COMMENT_SPEED` / `LIKE_BURST` 패턴이 실제로 동작하기 시작한다
> (2.2의 `Op` 수정이 선행돼야 했던 이유이기도 하다).

### 2.35 Google OAuth 환경변수가 없으면 API 55개가 통째로 죽음 (치명) — 수정됨

**증상:** `.env` 없이 갓 클론한 상태로 서버를 띄우면
`⚠️ Failed to load routes: OAuth2Strategy requires a clientID option`이 뜨고,
서버는 기동되지만 **`/health`와 `/` 외 모든 API가 404**가 된다.

**원인:** `server.js`의 `loadRoutes()` 첫 줄이 `require('./src/config/passport')`인데,
`passport.js`가 모듈 로드 시점에 `new GoogleStrategy({ clientID: undefined, ... })`를
무조건 실행한다. `GoogleStrategy` 생성자는 `clientID`가 없으면 즉시 throw 하고,
그 예외가 `loadRoutes()`의 try/catch에 잡혀 **라우트 등록이 한 줄도 실행되지 않은 채** 끝난다.

**조치:**
- `passport.js`: 자격증명이 있을 때만 전략을 등록하고, 없으면 경고만 남긴다.
- `routes/auth.js`: 전략 미등록 상태에서 `passport.authenticate('google')`을 타면
  "Unknown authentication strategy"로 500이 나므로, `requireGoogleOAuth` 가드를 앞에 두고
  503 + 안내 메시지를 반환한다.

### 2.4 `UserProfileScreen` 응답 파싱 오류 — 수정됨

`GET /api/users/:userId`는 `{ user: {...} }`로 응답하는데 `setUser(userResponse.data)`로 받고
있어서 사용자명·팔로워 수·뱃지가 전부 undefined로 렌더됐다. `data.user`로 수정.

### 2.5 실시간 알림을 아무도 구독하지 않음 — 수정됨

서버는 `notification:new`를 보내고 `frontend/src/hooks/useNotifications.js`에 구독 훅도 있었지만
**어느 화면도 그 훅을 임포트하지 않아** 실시간 알림이 화면에 도달하지 않았다.
`NotificationScreen.js`가 `useSocket()`으로 직접 구독하도록 연결(중복 방지 포함).

---

## 3. 프로필 게시글 로딩 (이전 문서 HIGH 우선순위) — 구현 완료

백엔드 `GET /api/users/:userId/posts` (`userController.getUserPosts`)는 페이지네이션까지
완비돼 있었으나 **프론트에서 한 번도 호출하지 않았다.** 두 프로필 화면 모두 게시물 *개수*만
표시하고 목록은 없었다.

- `frontend/src/screens/ProfileScreen.js` — "게시물" 섹션 추가 (목록 + 더 보기 + 빈 상태)
- `frontend/src/screens/UserProfileScreen.js` — "포스트" 섹션 추가 (동일)
- 게시글 탭 시 `PostDetail`로 이동

---

## 4. 설정 일원화 (신규)

프론트엔드 API/소켓 주소가 5곳에 서로 다르게 하드코딩돼 있어서, 화면마다 다른 백엔드를
바라보고 있었다 (`services/api.js` → fly.dev, `services/apiService.js` → localhost:3000,
`config/index.js` → localhost:5555 + 만료된 Vercel 프리뷰 URL).

- `frontend/src/config/index.js`를 **단일 출처**로 삼고 나머지 전부가 이를 참조하도록 변경.
- 운영 주소를 `https://hipo-backend.fly.dev` (= `backend/fly.toml`의 앱)로 정정.
- 로컬 개발 포트를 5555로 통일 (`backend/server.js` 기본값, `backend/.env.example`).
  운영/Docker/Fly는 `PORT=3000`을 명시 주입하므로 영향 없음.
- `LoginScreen` / `RegisterScreen`의 Google OAuth URL도 `API_URL` 기반으로 변경.

---

## 5. 2차 작업에서 구현한 항목

### 5.1 실시간 활동 피드 — 구현 완료

새 게시글이 올라와도 피드는 수동 새로고침 전까지 갱신되지 않았다.
서버에 브로드캐스트 자체가 없었다 (`io.emit`으로 나가는 11종 중 게시글 관련은 전무).

- `config/socket.js`에 `broadcastNewPost()` 추가 → `post:new` 이벤트
- `postController.createPost()`에서 호출.
  단 **`visibilityType === 'PUBLIC'`인 글만** 브로드캐스트한다 —
  팔로워/주주 전용 글은 수신자마다 열람 권한이 달라 일괄 전송하면 안 된다.
- `FeedScreen.js`가 `useSocket()`으로 구독. 본인 글(작성 응답으로 이미 반영)과
  새로고침 경합으로 인한 중복을 걸러낸다.

### 5.2 봇 탐지 미사용 패턴 2종 — 구현 완료

`SUSPICIOUS_PATTERNS`에 상수만 정의되고 검사 함수가 없던 두 패턴을 구현했다.

| 패턴 | 구현 | 연결 지점 |
|---|---|---|
| `REPEATED_CONTENT` | `checkRepeatedContent()` — 최근 24시간 내 동일 `content` 3회 이상 | `createPost`, `addComment` |
| `RAPID_STOCK_TRADES` | `checkRapidStockTrades()` — 10분 내 매수/매도 50건 이상 | `buyStock` |

`detectBot(userId, activityType, context)`로 시그니처를 확장해 콘텐츠를 넘길 수 있게 했다.

### 5.3 `checkEmptyProfile()` 연결 — 구현 완료 (핫패스 제외)

export만 되고 호출되지 않던 함수다. 단순히 `detectBot()`에 넣으면
**호출마다 +10점이 누적**되어 프로필 미작성 사용자가 활동 7번 만에
70점(봇 의심)에 도달한다. 그래서 활동 단위가 아니라 **하루 1회 스캔**으로 돌린다.

- `jobs/adminScheduler.js`에 `scanEmptyProfiles()` 추가 (24시간 간격)
- 가입 후 기준일이 지났고 `bio`/`displayName`이 비어 있으며 아직 100점이 아닌 계정만 대상
- `stopAdminScheduler()`가 인터벌 두 개를 모두 정리하도록 수정 (이전 시그니처도 호환)

### 5.4 주식 매수 PO 보상 — 구현 완료

`BASE_REWARDS.STOCK_PURCHASE`(100 PO)가 정의돼 있었지만 `buyStock`은 보상을
지급하지 않았다. `RAPID_STOCK_TRADES` 탐지를 먼저 돌리고 통과 시에만 지급하도록 연결했다.

---

## 6. 남아 있는 TODO / 미구현

| 우선순위 | 항목 | 위치 |
|---|---|---|
| 보류 | `HomeScreenRedesigned.js`가 목 데이터로 동작 — **`AppNavigator`에 등록되지 않은 죽은 화면**. 현재 `HomeScreen.js`가 실제로 쓰인다. 둘 중 무엇을 남길지는 제품 결정이라 손대지 않음 | `frontend/src/screens/HomeScreenRedesigned.js:45,123,144` |
| 보류 | `TransactionsScreen.js`도 네비게이터 미등록 (`TransactionHistoryScreen.js`가 등록돼 있음) | — |
| LOW | 에러 트래킹 서비스(Sentry 등) 미연동 — DSN 발급이 선행돼야 함 | `frontend/src/components/ErrorBoundary.js:42` |

---

## 7. 구조적 개선 과제

### 7.1 스키마 관리 — 정리 완료

**이전:** `server.js`가 부팅할 때마다 무조건 `sequelize.sync({ alter: true })`를 실행했다.
모델 96개에 대해 운영 중 스키마를 건드리는 것은 위험하고 느리다.
(게다가 §2.00 때문에 그 sync는 실제로 아무 테이블도 만들지 않고 있었다.)

**조치:**
- 부팅 시 동기화를 `DB_SYNC` 환경변수로 제어 — `alter` | `sync` | `none`.
  **기본값: 운영=`none`, 그 외=`alter`.** 즉 운영 환경은 이제 부팅 시 스키마를 건드리지 않는다.
- `npm run migrate` 복구 (`src/config/migrate.js`) — 가리키던 파일이 아예 없어서 깨져 있던 스크립트다.
  ```bash
  npm run migrate                  # alter (기본)
  npm run migrate -- --mode=sync   # 없는 테이블만 생성
  npm run migrate -- --mode=force  # 전체 DROP 후 재생성
  ```
  `force`는 운영 환경에서 `ALLOW_DESTRUCTIVE_MIGRATE=yes` 없이는 거부된다.
- 루트에 흩어져 있던 일회성 스크립트 10개를 `backend/scripts/legacy/`로 이동하고
  경위와 대체 수단을 `scripts/legacy/README.md`에 정리했다.

> 별도 마이그레이션 파일 체계(예: sequelize-cli)는 **일부러 도입하지 않았다.**
> 이 프로젝트의 스키마 원본은 `src/models/*.js`이고 반영은 `sync()`가 담당한다.
> 마이그레이션 파일을 따로 두면 모델 정의와 이중 관리가 되어 오히려 어긋나기 쉽다.
> 핵심 문제는 "동기화 방식"이 아니라 **"언제 동기화가 도는지가 통제되지 않는 것"**이었고, 그쪽을 고쳤다.

### 7.2 남은 과제

1. **테스트 커버리지** — 컨트롤러 52개에 대해 테스트는 4개 파일(`auth`/`post`/`stock`/`admin`)뿐이다.
2. **잔여물** — 루트 `fix_register.py`는 `C:/Users/u/hipo` 경로가 박힌 일회성 패치 스크립트다.
   `bcrypt`와 `bcryptjs`가 동시에 의존성에 들어 있다.

---

## 8. 코드베이스 통계 (2026-09-17)

| 항목 | 수 |
|---|---|
| 백엔드 모델 | 95 |
| 백엔드 라우트 | 55 |
| 백엔드 컨트롤러 | 52 |
| 백엔드 서비스 | 13 |
| 생성되는 테이블 | 98 |
| 프론트엔드 화면 | 62 (등록 60) |
| 백엔드 테스트 파일 | 4 |
