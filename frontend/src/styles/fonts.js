/**
 * 서체 — Pretendard
 *
 * ## 왜 Pretendard 인가
 *
 * 이 앱은 지금까지 서체를 지정하지 않아 iOS/Android 가 각자의 기본 폰트로 렌더됐다.
 * 같은 화면이 기기마다 다르게 보이고, 무엇보다 고유한 인상이 없었다.
 *
 * Pretendard 는 한글 UI 의 사실상 표준이다.
 *  - Apple SD Gothic Neo 를 대체하도록 설계돼 iOS/Android 가 같게 보인다
 *  - 숫자 글립이 또렷하고 폭이 일정해 금융 화면에 맞는다
 *  - SIL OFL 라이선스라 상업적 사용이 자유롭다
 *
 * ## 설치
 *
 * https://github.com/orioncactus/pretendard 의 릴리스에서 아래 5개 파일을 받아
 * `frontend/assets/fonts/` 에 그대로 넣는다 (파일명 일치 필요).
 *
 *   Pretendard-Regular.otf
 *   Pretendard-Medium.otf
 *   Pretendard-SemiBold.otf
 *   Pretendard-Bold.otf
 *   Pretendard-ExtraBold.otf
 *
 * 파일이 없어도 앱은 정상 동작한다. 로딩에 실패하면 시스템 폰트로 폴백한다
 * (useAppFonts 참조). 파일을 넣고 다시 실행하면 자동으로 적용된다.
 *
 * ## 왜 굵기별로 파일이 나뉘나
 *
 * React Native 는 커스텀 폰트에서 `fontWeight` 로 굵기를 합성하지 못한다.
 * 굵기마다 별도 패밀리 이름을 지정해야 한다. 그래서 스타일에는
 * `fontFamily: fonts.bold` 처럼 굵기가 박힌 이름을 쓴다.
 */

import { Platform } from 'react-native';

/** 파일이 로드됐을 때 쓸 패밀리 이름 */
const PRETENDARD = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
  extrabold: 'Pretendard-ExtraBold',
};

/**
 * 폰트 파일이 없을 때의 폴백.
 * 그냥 'System' 보다 나은, 각 OS 의 한글 UI 기본 서체를 명시한다.
 */
const SYSTEM_FALLBACK = Platform.select({
  ios: {
    regular: 'Apple SD Gothic Neo',
    medium: 'Apple SD Gothic Neo',
    semibold: 'Apple SD Gothic Neo',
    bold: 'Apple SD Gothic Neo',
    extrabold: 'Apple SD Gothic Neo',
  },
  android: {
    regular: 'sans-serif',
    medium: 'sans-serif-medium',
    semibold: 'sans-serif-medium',
    bold: 'sans-serif',
    extrabold: 'sans-serif',
  },
  default: {
    regular: 'system-ui, -apple-system, sans-serif',
    medium: 'system-ui, -apple-system, sans-serif',
    semibold: 'system-ui, -apple-system, sans-serif',
    bold: 'system-ui, -apple-system, sans-serif',
    extrabold: 'system-ui, -apple-system, sans-serif',
  },
});

/**
 * expo-font 에 넘길 매핑.
 *
 * Metro 는 require 를 정적으로 해석하므로, 여기서 직접 .otf 를 require 하면
 * 파일이 없을 때 **번들 자체가 실패**한다. 그래서 실제 require 는 항상 존재하는
 * `assets/fonts/index.js` 로 밀어 두고, 그 파일이 null 을 돌려주면 폴백한다.
 *
 * 폰트 파일을 넣은 뒤 그 파일의 주석 5줄만 해제하면 적용된다.
 */
let FONT_ASSETS = null;
try {
  // eslint-disable-next-line global-require
  FONT_ASSETS = require('../../assets/fonts');
} catch (e) {
  FONT_ASSETS = null;
}

export { FONT_ASSETS };

/** 폰트 파일이 준비돼 있는지 (= 로딩을 시도할 가치가 있는지) */
export const hasFontAssets = FONT_ASSETS != null && Object.keys(FONT_ASSETS).length > 0;

/**
 * 실제로 쓸 패밀리 이름.
 *
 * 파일이 없으면 처음부터 시스템 폴백으로 시작한다. 파일이 있으면 로딩 성공 후
 * applyFontLoadResult(true) 가 Pretendard 로 전환한다.
 */
let active = hasFontAssets ? { ...PRETENDARD } : { ...SYSTEM_FALLBACK };

export const fonts = new Proxy(
  {},
  {
    get: (_, key) => active[key] ?? active.regular,
  }
);

/** 로딩 결과를 반영한다. App.js 의 useAppFonts 가 호출. */
export function applyFontLoadResult(loaded) {
  active = loaded ? { ...PRETENDARD } : { ...SYSTEM_FALLBACK };
}

/** fontWeight 값 → 패밀리 키 */
export function familyForWeight(weight) {
  const w = String(weight || '400');
  if (w === '800' || w === '900' || w === 'heavy') return 'extrabold';
  if (w === '700' || w === 'bold') return 'bold';
  if (w === '600') return 'semibold';
  if (w === '500') return 'medium';
  return 'regular';
}

export { PRETENDARD, SYSTEM_FALLBACK };
