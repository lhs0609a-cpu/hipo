# HIPO 미구현 기능 - 요약

> **최종 검증: 2026-09-17.** 상세 내용은 [`UNIMPLEMENTED_FEATURES.md`](UNIMPLEMENTED_FEATURES.md).
> 이전 판(2025-11-02)은 존재하지 않는 `webapp/` 기준이라 폐기했다.

## 이전 문서의 "미구현 2건" → 현재

| 항목 | 상태 |
|---|---|
| 봇 탐지 운영진 알림 | 이미 구현돼 있었음 |
| 프로필 게시글 로딩 | **구현 완료** (`ProfileScreen`, `UserProfileScreen`) |

## 이번에 고친 실제 장애 8건

| 심각도 | 내용 |
|---|---|
| **최치명** | `server.js`가 모델 등록 **전에** `sequelize.sync()`를 호출 → sync가 항상 모델 0개를 대상으로 돌아 **테이블이 하나도 생성되지 않음**. 그런데도 "Database synchronized"만 출력 |
| **최치명** | `database.js` 전역 `define`의 `createdAt: 'created_at'`이 컬럼명이 아니라 **속성명**을 바꿔, `where: { createdAt }` 쿼리가 전부 `no such column`으로 실패 → **관리자 통계/차트 전체**(19곳), 배당 집계, 봇 탐지, 기간 필터가 죽어 있었음. 95개 모델 중 81개가 영향 |
| 치명 | **PO 보상 엔진(`coinRewards.js`)이 어디서도 호출되지 않음** → 게시글/댓글/좋아요에 PO가 전혀 지급되지 않아 핵심 루프(활동→PO→배당→주가)가 정지. `botDetector.js`도 동일하게 호출자 없음 |
| 치명 | `Notification` 모델이 호출부와 불일치 → 배당/추천/구매/뱃지/티어 알림 전부 저장 실패, 알림 화면 제목·본문 공백 |
| 치명 | `sequelize.Op` 오용 9곳 → 채팅 페이징, 레벨 랭킹, 봇 탐지 2패턴, 배당 7일 집계가 `TypeError` |
| 치명 | `.env` 없이 클론하면 `passport.js`가 로드 시점에 throw → **API 55개가 통째로 등록 실패**, `/health` 외 전부 404 |
| 높음 | `Payment`/`WalletTransaction`의 `underscored: false` → 인덱스가 없는 컬럼 참조로 `sync` 자체 실패 |
| 높음 | `UserProfileScreen`이 `{ user }` 응답을 잘못 파싱 → 타인 프로필 전체가 빈 값 |
| 중간 | `notification:new` 실시간 이벤트를 아무 화면도 구독하지 않음 |

## 2차 작업 — 추가 구현

| 항목 | 내용 |
|---|---|
| 실시간 활동 피드 | `broadcastNewPost()` → `post:new` 이벤트 신설, `FeedScreen`에서 구독 (전체공개 글만, 본인 글·중복 필터) |
| 봇 탐지 패턴 2종 | `REPEATED_CONTENT`(24h 내 동일 글 3회), `RAPID_STOCK_TRADES`(10분 내 거래 50건) 구현 및 연결 |
| `checkEmptyProfile` 연결 | 활동마다 +10점이 누적돼 핫패스에 못 넣음 → `adminScheduler`의 일일 스캔으로 처리 |
| 주식 매수 PO 보상 | `STOCK_PURCHASE`(100 PO) 미지급 상태였던 것을 봇 탐지 통과 시 지급하도록 연결 |
| 스키마 관리 | 부팅 시 sync를 `DB_SYNC`로 제어 (**운영 기본 `none`**), `npm run migrate` 복구, 일회성 스크립트 10개를 `scripts/legacy/`로 정리 |

## 부가 정리

- 프론트엔드 API/소켓 주소 5곳 하드코딩 → `frontend/src/config/index.js` 단일 출처로 통합
- 로컬 개발 포트 5555로 통일 (백엔드 기본값 · `.env.example`)
- `npm run seed` → `src/scripts/seedData.js` 연결, `uuid` 의존성 선언

## 남은 과제

| 우선순위 | 항목 |
|---|---|
| 보류 | `HomeScreenRedesigned.js` / `TransactionsScreen.js` — 네비게이터 미등록 죽은 화면. 남길지 지울지는 제품 결정 |
| LOW | Sentry 등 에러 트래킹 미연동 (`ErrorBoundary.js:42`) — DSN 발급 선행 필요 |
| 구조 | 테스트 4개 파일 / 컨트롤러 52개 |

## 코드베이스 규모

모델 95 · 라우트 55 · 컨트롤러 52 · 서비스 13 · 화면 62 · 생성 테이블 98
