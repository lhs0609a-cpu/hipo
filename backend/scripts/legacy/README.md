# 레거시 일회성 스크립트

여기 있는 파일들은 예전에 `backend/` 루트에 흩어져 있던 **일회성 패치 스크립트**다.
정식 도구가 아니므로 새로 실행할 일은 없다. 이력 보존 목적으로만 남겨둔다.

## 왜 더 이상 필요 없는가

`add-*-column.js` 들이 추가하던 컬럼(`balance`, `real_name`, `push_token`,
`tier`, `shareholder_count`, `available_shares` 등)은 **모두 `src/models/*.js`에
이미 선언되어 있다.** 즉 스키마 동기화만 정상적으로 돌면 자동으로 생성된다.

이 스크립트들이 만들어졌던 이유는 동기화가 실제로는 동작하지 않았기 때문이다 —
`server.js`가 모델을 등록하기 **전에** `sequelize.sync()`를 호출해서
sync가 항상 빈 모델 목록을 대상으로 돌고 있었다 (2026-09-17 수정).

## 지금 스키마를 바꾸려면

```bash
npm run migrate                  # alter — 누락된 테이블/컬럼 추가 (기본)
npm run migrate -- --mode=sync   # 없는 테이블만 생성
npm run migrate -- --mode=force  # 전체 DROP 후 재생성 (데이터 삭제)
```

서버 부팅 시 동기화 동작은 `DB_SYNC` 환경변수로 제어한다
(`alter` | `sync` | `none`, 기본값: 운영=`none`, 그 외=`alter`).

## 파일 목록

| 파일 | 용도 |
|---|---|
| `add-available-shares-column.js` | `stocks.available_shares` 추가 |
| `add-balance-column.js` | `users.balance` 추가 |
| `add-news-columns.js` | `users.real_name/occupation/category/news_keywords` 추가 |
| `add-push-notification-columns.js` | `users.push_token/push_platform/notification_settings` 추가 |
| `add-tier-system-columns.js` | `stocks.tier/shareholder_count/transaction_count` 추가 |
| `check-schema.js` | 스키마 덤프 확인용 |
| `count-users.js` | 사용자 수 확인용 |
| `migrate-posts.js` | 게시글 데이터 이관 |
| `seed-users.js` | 초기 사용자 시드 (현재는 `npm run seed` 사용) |
| `sync_db.js` | 수동 sync (현재는 `npm run migrate` 사용) |
