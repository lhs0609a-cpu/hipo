# HIPO 디자인 시스템

## 원칙

1. **값의 출처는 하나다.** 모든 색·간격·타이포는 `src/styles/tokens.js` 에서 나온다.
   화면 코드에 hex 를 새로 쓰지 않는다.
2. **브랜드와 등락을 분리한다.** primary(`#2B5FE3`, 딥 인디고)와 하락(`#2F7FEE`, 밝은 파랑)은
   명도로 구분된다. 이전에는 둘 다 `#3182F6` 이라 CTA와 하락가가 같은 색이었다.
3. **텍스트로 쓰는 색은 AA를 만족한다.** 흰 배경 위 작은 글씨에는 `*Text` 변형을 쓴다
   (`stockUpText`, `stockDownText`, `successText`, `warningText`).
4. **숫자는 tabular numeral.** 금액이 갱신될 때 자릿수 폭이 흔들리면 안 된다.
5. **세이프에어리어는 하드코딩하지 않는다.** 항상 실제 인셋을 읽는다.

## 파일 구조

```
src/styles/tokens.js       ← 단일 소스. 팔레트·타이포·간격·모션·엘리베이션
src/styles/theme.js        ← tokens 재수출 + commonStyles 헬퍼 (호환 레이어)
src/constants/colors.js    ← COLORS 정적 별칭 (다크모드 미대응, 신규 코드에선 지양)
src/contexts/ThemeContext  ← useTheme() — 라이트/다크 자동 전환
src/components/ui/         ← Screen, AppHeader, Card, Money, Delta, Pill …
src/hooks/useResponsive.js ← 기기 폭 기반 스케일
src/utils/haptics.js       ← 햅틱 (expo-haptics 없으면 무시)
```

## 화면 작성 패턴

### 세이프에어리어

`paddingTop: Platform.OS === 'ios' ? 60 : 50` 같은 코드는 쓰지 않는다.

```jsx
import { Screen, AppHeader } from '../components/ui';

// 네비게이터 헤더가 있는 화면
<Screen edges={['bottom']} scroll refreshing={r} onRefresh={load}>…</Screen>

// 헤더를 직접 그리는 화면 (headerShown: false)
<Screen edges={['top', 'bottom']} scroll>
  <AppHeader title="지갑" onBack={() => navigation.goBack()} />
  …
</Screen>

// 하단 고정 CTA
<Screen scroll footer={<BottomBar><Button fullWidth>매수하기</Button></BottomBar>}>
```

`Screen` 이 인셋·키보드 회피·RefreshControl·StatusBar 를 모두 처리한다.

### 색

```jsx
const { theme } = useTheme();

theme.colors.primary          // 브랜드 / CTA
theme.colors.textPrimary      // 본문
theme.colors.surface          // 카드 배경
theme.colors.border           // 테두리

// 등락은 delta() 헬퍼로 한 번에
const d = theme.delta(changeRate);   // { text, base, surface, sign }
<Text style={{ color: d.text }}>…</Text>
```

### 타이포

fontSize/fontWeight 를 직접 조합하지 말고 프리셋을 쓴다.

```jsx
theme.textStyles.title1        // 화면 제목
theme.textStyles.headline      // 섹션/카드 제목
theme.textStyles.body          // 본문
theme.textStyles.caption       // 보조 정보
theme.textStyles.displayNumber // 큰 금액 (tabular)
```

### 금액과 등락

```jsx
import { Money, Delta } from '../components/ui';

<Money value={1250000} suffix="PO" size="display" />
<Money value={holdings} size="caption" compact />   // 125만
<Delta value={-1.42} />                              // ▼ 1.42% (파란 pill)
<Delta value={3.1} amount={2100} />                  // ▲ 2,100  3.10%
```

### 터치 타겟

아이콘·칩처럼 48pt 미만인 요소에는 반드시 `hitSlop` 을 준다.

```jsx
import { hitSlop } from '../styles/tokens';
<Pressable hitSlop={hitSlop.base} accessibilityRole="button" …/>
```

### 접근성 큰 글씨

버튼·리스트 아이템에 `height` 대신 `minHeight` 를 쓴다. 폰트 스케일이 커져도 라벨이 잘리지 않는다.

```jsx
const { isLargeText } = useResponsive();
```

## 다크 모드 — 전 화면 적용 완료

모든 화면(78/78)의 StyleSheet 가 테마에 반응한다. 방식은 `useThemedStyles`.

```jsx
const makeStyles = (t) => StyleSheet.create({
  container: { backgroundColor: t.colors.background },
});

export default function MyScreen() {
  const styles = useThemedStyles(makeStyles);
  …
}
```

`const styles = StyleSheet.create(...)` 를 모듈 스코프에 두면 라이트 팔레트가
박제되므로, **새 화면도 반드시 이 패턴을 따를 것.**

남은 hex 32건은 보라/주황 등 액센트라 테마와 무관하게 고정이어도 되는 값이다.
모듈 스코프 상수 객체(카테고리 색 등)의 `COLORS.*` 참조도 정적으로 남겨 두었다.

## 웹에서의 폭 제약

이 앱은 모바일용이지만 react-native-web 으로 브라우저에서도 뜬다.
데스크톱 뷰포트(1920px)에서는 모든 레이아웃이 그 폭으로 늘어나 전혀 다른 화면이 된다.

`components/ui/AppFrame.js` 가 App.js 에서 네비게이터를 감싸,
뷰포트가 520px 를 넘으면 앱을 430px 폰 폭으로 가두고 가운데 정렬한다.
탭바까지 함께 제약된다. 좁은 화면에서는 아무 일도 하지 않는다.

**가로로 늘어나는 레이아웃을 만들지 말 것.** 항목을 나란히 놓을 때는
`justifyContent: 'space-between'` 대신 각 항목에 `flex: 1` 을 주는 편이
폭 변화에 안전하다.

## 남은 작업

- **Screen / AppHeader 프리미티브 적용**: 세이프에어리어는 전 화면에서 인셋 기반으로
  처리했지만, 루트 컨테이너 구조는 화면마다 제각각이라 `Screen` 으로 통일하지 않았다.
  새 화면은 `Screen` 을 쓰는 것을 권장한다 (키보드 회피·하단 인셋까지 한 번에 해결).
- **키보드 회피**: 입력이 있는 화면 중 일부만 처리돼 있다. `Screen`(기본 keyboard=true)
  으로 감싸면 해결된다.
- **hitSlop**: 작은 터치 타겟 전수 점검.

## 해결됨: 매도 시 PO 신규 발행 → 환매 준비 포인트

예전 `sellStock` 은 매도자에게 PO 를 지급하면서 아무 데서도 차감하지 않아
충전 → 매수 → 매도 반복으로 포인트가 무한히 늘어났다.

이제 발행시장 매수 대금을 나눠 적립한다. 정책은 `backend/src/config/pointEconomy.js`.

```
매수 10,000 PO
  ├─ 5,000 → 크리에이터 자유 잔고
  └─ 5,000 → 종목의 환매 준비 포인트 (Stock.buybackReserve)

매도 → 준비 포인트에서 차감 후 지급 (총량 보존)
풀 부족 → 호가창(주주 간 거래)으로 안내
```

비율은 `BUYBACK_RESERVE_RATE` (기본 0.5), 기능 자체는 `BUYBACK_ENABLED` 로 끌 수 있다.

**⚠️ 이건 포인트다.** 실제 자금 예치·에스크로·신탁이 아니라 종목에 귀속된 게임 포인트
카운터다. 현금 인출 통로는 여전히 없다 ([[game-money-model]]). 코드·문구에서
"예치금/신탁" 같은 표현을 쓰지 않는다.

기존 종목은 준비금이 0이라 매도가 막히므로 백필이 필요하다.

```bash
node scripts/backfillBuybackReserve.js            # 미리보기
node scripts/backfillBuybackReserve.js --write    # 적용
```

## 알려진 선재 버그 (이번 작업 범위 밖)

- `screens/PortfolioAnalysisScreen.js` — `styles.sectorChart` 정의 없이 참조
- `components/stock/PriceDisplay.js` — `styles.nameRow`, `liveIndicator`, `liveDot`, `liveText` 정의 없이 참조

둘 다 HEAD 시점부터 존재했고, RN 이 undefined 스타일을 무시해 크래시는 나지 않는다.
