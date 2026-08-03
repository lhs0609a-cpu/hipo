/**
 * COLORS — 라이트 팔레트의 정적 별칭.
 *
 * 값의 출처는 src/styles/tokens.js 입니다. 이 파일은 기존 임포트를 깨지 않기 위한
 * 얇은 re-export 이며, 여기에 새 색을 직접 정의하지 마세요.
 *
 * 주의: COLORS 는 다크 모드를 따라가지 않습니다.
 * 다크 모드 대응이 필요한 화면은 useTheme() 의 theme.colors 를 쓰세요.
 */

import { lightColors, tier, gradients, dataviz } from '../styles/tokens';

export const COLORS = {
  ...lightColors,

  // 과거 코드에서 참조되던 별칭 유지
  textMuted: lightColors.textTertiary,
  secondary: lightColors.secondary,
  stockUpBackground: lightColors.stockUpBackground,
  stockDownBackground: lightColors.stockDownBackground,
};

export const TRUST_LEVEL_COLORS = { ...tier };

export const GRADIENTS = gradients;
export const CHART_COLORS = dataviz;

export default COLORS;
