/**
 * HIPO Design Tokens — Single Source of Truth
 *
 * 이 파일이 앱 전체 디자인 값의 유일한 출처입니다.
 * styles/theme.js, constants/colors.js, contexts/ThemeContext.js 는 모두 여기서 파생됩니다.
 * 화면 코드에서 hex 를 직접 쓰지 마세요. useTheme() 또는 COLORS 를 통해 접근합니다.
 *
 * 설계 원칙
 *  1. 브랜드(딥 인디고)와 등락(상승 빨강 / 하락 밝은 파랑)을 명도로 분리한다.
 *  2. 텍스트로 쓰이는 색은 흰 배경에서 WCAG AA(4.5:1)를 만족하는 *Text 변형을 따로 둔다.
 *  3. 다크 모드는 명도 반전이 아니라 별도로 튜닝된 레이어드 서페이스로 구성한다.
 *  4. 금액·수치는 tabular numeral 로 렌더해 자릿수가 흔들리지 않게 한다.
 */

import { Platform } from 'react-native';
import { fonts, familyForWeight } from './fonts';

// ─────────────────────────────────────────────────────────────
// Primitive palettes
// ─────────────────────────────────────────────────────────────

/** 브랜드 — 딥 인디고 블루. 500이 CTA 기본값. */
export const brand = {
  50: '#EEF4FF',
  100: '#DBE7FE',
  200: '#BED4FD',
  300: '#91B8FB',
  400: '#5E93F7',
  500: '#2B5FE3',
  600: '#1E4BC7',
  700: '#193CA0',
  800: '#183580',
  900: '#182F68',
};

/** 중립 — 차갑고 절제된 그레이. 기존 Material/iOS/Tailwind 혼용을 대체. */
export const neutral = {
  0: '#FFFFFF',
  25: '#FCFCFD',
  50: '#F8F9FB',
  100: '#F1F3F7',
  150: '#E9ECF2',
  200: '#DFE3EB',
  300: '#CBD1DC',
  400: '#A3ABBA',
  500: '#7C8698',
  600: '#5D6779',
  700: '#454E5E',
  800: '#2E3542',
  900: '#1A1F29',
  950: '#0E1219',
  1000: '#000000',
};

/** 상승(빨강) — 한국 증시 관례. */
export const bull = {
  surface: '#FFF1F2',
  surfaceDark: 'rgba(240, 52, 75, 0.16)',
  soft: '#FFD9DE',
  base: '#F0344B',
  text: '#D91F36',
  strong: '#B81730',
  onDark: '#FF6B7C',
};

/** 하락(파랑) — 브랜드보다 밝게 잡아 CTA와 구분. */
export const bear = {
  surface: '#EFF5FF',
  surfaceDark: 'rgba(47, 127, 238, 0.16)',
  soft: '#D2E3FD',
  base: '#2F7FEE',
  text: '#1B62D6',
  strong: '#1550B4',
  onDark: '#6BA5FB',
};

export const positive = {
  surface: '#E7F8F0',
  surfaceDark: 'rgba(0, 179, 104, 0.16)',
  base: '#00B368',
  text: '#00915A',
  onDark: '#34D399',
};

export const caution = {
  surface: '#FFF6E6',
  surfaceDark: 'rgba(245, 155, 0, 0.16)',
  base: '#F59B00',
  text: '#B26F00',
  onDark: '#FBBF4C',
};

/** 등급 — 채도를 낮춘 메탈릭. 기존 #FFD700 계열의 촌스러움 제거. */
export const tier = {
  bronze: '#B87333',
  silver: '#9BA3AF',
  gold: '#D9A521',
  platinum: '#6E8CA0',
  diamond: '#3FB6C9',
  master: '#E0533D',
  legend: '#8B5CF6',
};

/** 데이터 시각화 / 카테고리 구분용 — 색상환에 고르게 분포, 명도 정렬. */
export const dataviz = [
  '#2B5FE3',
  '#00B0A6',
  '#F59B00',
  '#8B5CF6',
  '#E0533D',
  '#3FB6C9',
  '#D9A521',
  '#EC5F9E',
];

/** 그라디언트 — 히어로 서페이스 전용. 남용 금지. */
export const gradients = {
  brand: ['#3D6FF0', '#2B5FE3'],
  brandDeep: ['#2B5FE3', '#1B3FA8'],
  bull: ['#FF5C6E', '#F0344B'],
  bear: ['#5E9BF5', '#2F7FEE'],
  premium: ['#2E3542', '#0E1219'],
  sunrise: ['#FFB25C', '#F0344B'],
};

// ─────────────────────────────────────────────────────────────
// Semantic colors — Light
// ─────────────────────────────────────────────────────────────

export const lightColors = {
  // Brand
  brand,
  primary: brand[500],
  primaryLight: brand[400],
  primaryDark: brand[700],
  primaryPressed: brand[600],
  primaryBackground: brand[50],
  primarySoft: '#F5F8FF',
  primaryBorder: brand[200],
  onPrimary: neutral[0],

  // Secondary
  secondary: neutral[600],
  secondaryLight: neutral[500],
  secondaryDark: neutral[700],

  // Status
  success: positive.base,
  successText: positive.text,
  successBackground: positive.surface,
  warning: caution.base,
  warningText: caution.text,
  warningBackground: caution.surface,
  error: bull.base,
  errorText: bull.text,
  errorBackground: bull.surface,
  danger: bull.base,
  info: brand[500],
  infoBackground: brand[50],

  // Market direction
  stockUp: bull.base,
  stockUpText: bull.text,
  stockUpBackground: bull.surface,
  stockUpSoft: bull.soft,
  stockDown: bear.base,
  stockDownText: bear.text,
  stockDownBackground: bear.surface,
  stockDownSoft: bear.soft,
  stockFlat: neutral[500],
  stockFlatBackground: neutral[100],
  up: bull.base,
  down: bear.base,

  // Neutral ramp (legacy alias — gray50..gray900)
  white: neutral[0],
  black: neutral[900],
  gray50: neutral[50],
  gray100: neutral[100],
  gray200: neutral[200],
  gray300: neutral[300],
  gray400: neutral[400],
  gray500: neutral[500],
  gray600: neutral[600],
  gray700: neutral[700],
  gray800: neutral[800],
  gray900: neutral[900],
  neutral,

  // Text
  text: neutral[900],
  textPrimary: neutral[900],
  textSecondary: neutral[600],
  textTertiary: neutral[500],
  textDisabled: neutral[400],
  textHint: neutral[400],
  textInverse: neutral[0],
  textLink: brand[600],

  // Surfaces
  background: neutral[50],
  backgroundPure: neutral[0],
  backgroundDark: neutral[0],
  backgroundSecondary: neutral[100],
  backgroundTertiary: neutral[150],
  surface: neutral[0],
  surfaceRaised: neutral[0],
  surfaceSecondary: neutral[50],
  surfaceSunken: neutral[100],
  surfaceHover: neutral[100],
  surfacePressed: neutral[150],
  surfaceOverlay: neutral[0],

  // Borders
  border: neutral[200],
  borderLight: neutral[150],
  borderDark: neutral[300],
  borderStrong: neutral[400],
  divider: neutral[150],
  focusRing: brand[300],

  // Overlays
  overlay: 'rgba(14, 18, 25, 0.45)',
  overlayLight: 'rgba(14, 18, 25, 0.24)',
  overlayDark: 'rgba(14, 18, 25, 0.68)',
  scrim: 'rgba(14, 18, 25, 0.08)',

  // Buttons (legacy aliases)
  buttonPrimary: brand[500],
  buttonSecondary: neutral[100],
  buttonDanger: bull.base,
  buttonBuy: bull.base,
  buttonSell: bear.base,

  // Skeleton / shimmer
  skeleton: neutral[150],
  skeletonHighlight: neutral[100],

  // Tier
  ...tier,

  dataviz,
  gradients,
};

// ─────────────────────────────────────────────────────────────
// Semantic colors — Dark (레이어드 서페이스, 명도 반전 아님)
// ─────────────────────────────────────────────────────────────

export const darkColors = {
  brand,
  primary: brand[400],
  primaryLight: brand[300],
  primaryDark: brand[500],
  primaryPressed: brand[300],
  primaryBackground: 'rgba(94, 147, 247, 0.16)',
  primarySoft: 'rgba(94, 147, 247, 0.08)',
  primaryBorder: 'rgba(94, 147, 247, 0.32)',
  onPrimary: '#08101F',

  secondary: neutral[400],
  secondaryLight: neutral[300],
  secondaryDark: neutral[500],

  success: positive.onDark,
  successText: positive.onDark,
  successBackground: positive.surfaceDark,
  warning: caution.onDark,
  warningText: caution.onDark,
  warningBackground: caution.surfaceDark,
  error: bull.onDark,
  errorText: bull.onDark,
  errorBackground: bull.surfaceDark,
  danger: bull.onDark,
  info: brand[400],
  infoBackground: 'rgba(94, 147, 247, 0.16)',

  stockUp: bull.onDark,
  stockUpText: bull.onDark,
  stockUpBackground: bull.surfaceDark,
  stockUpSoft: 'rgba(240, 52, 75, 0.28)',
  stockDown: bear.onDark,
  stockDownText: bear.onDark,
  stockDownBackground: bear.surfaceDark,
  stockDownSoft: 'rgba(47, 127, 238, 0.28)',
  stockFlat: neutral[400],
  stockFlatBackground: 'rgba(163, 171, 186, 0.14)',
  up: bull.onDark,
  down: bear.onDark,

  // 다크에서는 gray 스케일이 뒤집힌다 (gray50 = 가장 어두움)
  white: neutral[0],
  black: neutral[950],
  gray50: '#171B23',
  gray100: '#1D222C',
  gray150: '#232833',
  gray200: '#2A303C',
  gray300: '#39414F',
  gray400: '#4E586A',
  gray500: '#7C8698',
  gray600: '#A3ABBA',
  gray700: '#CBD1DC',
  gray800: '#DFE3EB',
  gray900: '#F1F3F7',
  neutral,

  text: '#F5F7FA',
  textPrimary: '#F5F7FA',
  textSecondary: '#A9B2C1',
  textTertiary: '#7C8698',
  textDisabled: '#59626F',
  textHint: '#59626F',
  textInverse: neutral[950],
  textLink: brand[300],

  background: '#0B0D12',
  backgroundPure: '#07090D',
  backgroundDark: '#07090D',
  backgroundSecondary: '#13161D',
  backgroundTertiary: '#1A1E27',
  surface: '#13161D',
  surfaceRaised: '#1A1E27',
  surfaceSecondary: '#1A1E27',
  surfaceSunken: '#0B0D12',
  surfaceHover: '#1F242E',
  surfacePressed: '#252B36',
  surfaceOverlay: '#232833',

  border: '#272D38',
  borderLight: '#1E232C',
  borderDark: '#39414F',
  borderStrong: '#4E586A',
  divider: '#1E232C',
  focusRing: brand[400],

  overlay: 'rgba(0, 0, 0, 0.66)',
  overlayLight: 'rgba(0, 0, 0, 0.44)',
  overlayDark: 'rgba(0, 0, 0, 0.82)',
  scrim: 'rgba(255, 255, 255, 0.06)',

  buttonPrimary: brand[500],
  buttonSecondary: '#1F242E',
  buttonDanger: bull.base,
  buttonBuy: bull.base,
  buttonSell: bear.base,

  skeleton: '#1D222C',
  skeletonHighlight: '#252B36',

  ...tier,
  diamond: '#5CCBDC',
  platinum: '#8FA9BC',

  dataviz,
  gradients,
};

// ─────────────────────────────────────────────────────────────
// Typography
// ─────────────────────────────────────────────────────────────

/** 숫자 정렬 고정 — 금액/등락률이 흔들리지 않게 한다. */
export const tabularNums = Platform.select({
  ios: { fontVariant: ['tabular-nums'] },
  android: { fontVariant: ['tabular-nums'] },
  default: { fontVariant: ['tabular-nums'] },
});

export const typography = {
  /**
   * 서체는 styles/fonts.js 가 관리한다.
   * Pretendard 파일이 있으면 그것을, 없으면 각 OS 의 한글 UI 기본 서체를 쓴다.
   *
   * RN 은 커스텀 폰트에서 fontWeight 로 굵기를 합성하지 못하므로
   * 굵기마다 별도 패밀리 이름을 지정해야 한다.
   */
  fontFamily: {
    get light() { return fonts.regular; },
    get regular() { return fonts.regular; },
    get medium() { return fonts.medium; },
    get semibold() { return fonts.semibold; },
    get bold() { return fonts.bold; },
    get extrabold() { return fonts.extrabold; },
  },

  /**
   * 타입 스케일.
   *
   * 각 단계에 역할이 있고, 역할이 없는 크기는 두지 않는다.
   * 이전에는 스케일이 11/13/15/17/20/24/28 이었는데 화면에서는 14·16·18·12·10 이
   * 더 많이 쓰여 스케일이 사실상 무시되고 있었다. 실사용 빈도와 iOS HIG 를 반영해
   * 12·14 를 정식 단계로 올리고, 16·18·10 은 인접 단계로 흡수한다.
   */
  fontSize: {
    /** 법적 고지, 타임스탬프 */
    footnote: 11,
    /** 보조 라벨, 배지 */
    caption: 12,
    /** 리스트 부제, 설명문 */
    callout: 14,
    /** 본문 기본 */
    body: 15,
    /** 섹션·카드 제목, 버튼 */
    headline: 17,
    /** 화면 내 큰 제목 */
    title3: 20,
    title2: 24,
    title1: 28,
    /** 금액 강조 */
    display: 34,
    /** 히어로 금액 */
    displayLarge: 40,

    // ── 구 별칭 (기존 코드 호환) ──
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 40,
    '5xl': 48,
    '6xl': 56,
  },

  fontWeight: {
    light: '400',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  /**
   * 행간 배수.
   *
   * 한글은 라틴보다 글자 높이가 크고 받침이 있어 같은 배수면 답답해 보인다.
   * 라틴 기준(1.2~1.4)보다 한 단계씩 높게 잡는다.
   */
  lineHeight: {
    tight: 1.3,
    snug: 1.4,
    normal: 1.55,
    relaxed: 1.7,
    loose: 1.85,
  },

  /**
   * 자간(pt). 한글은 글자폭이 일정해 큰 글씨에서 성기게 보이므로 조여 준다.
   * 작은 글씨는 0 또는 살짝 벌려 가독성을 확보한다.
   */
  letterSpacing: {
    tighter: -1.2,
    tight: -0.6,
    snug: -0.3,
    normal: 0,
    wide: 0.3,
    wider: 0.6,
  },
};

/**
 * 완성된 텍스트 스타일 프리셋.
 * 개별 화면에서 fontSize/fontWeight 를 조합하는 대신 이 쪽을 쓰면 리듬이 유지된다.
 */
/**
 * 프리셋 하나를 만든다. 굵기에 맞는 서체 패밀리를 자동으로 붙인다.
 *
 * getter 로 두는 이유: 폰트 로딩이 끝나면 fonts 의 값이 바뀌는데,
 * 모듈 로드 시점에 고정해 버리면 폴백 폰트가 박제된다.
 */
const preset = (fontSize, weight, letterSpacing, lineHeight, extra = {}) => ({
  fontSize,
  fontWeight: weight,
  letterSpacing,
  lineHeight,
  get fontFamily() {
    return fonts[familyForWeight(weight)];
  },
  ...extra,
});

export const textStyles = {
  // ── 금액·수치 전용 (tabular numerals) ──
  // 자릿수 폭을 고정해 값이 갱신될 때 숫자가 흔들리지 않게 한다
  displayNumber: preset(40, '700', -1.4, 46, tabularNums),
  headlineNumber: preset(28, '700', -0.8, 34, tabularNums),
  titleNumber: preset(20, '700', -0.5, 26, tabularNums),
  bodyNumber: preset(15, '600', -0.2, 20, tabularNums),
  captionNumber: preset(13, '600', -0.1, 18, tabularNums),

  // ── 텍스트 ──
  // 행간은 한글 기준으로 라틴보다 넉넉하게, 자간은 클수록 더 조인다
  display: preset(34, '800', -1.1, 44),
  title1: preset(28, '700', -0.8, 38),
  title2: preset(24, '700', -0.6, 33),
  title3: preset(20, '700', -0.5, 28),
  headline: preset(17, '600', -0.4, 24),
  body: preset(15, '400', -0.3, 23),
  bodyStrong: preset(15, '600', -0.3, 23),
  callout: preset(14, '400', -0.2, 21),
  calloutStrong: preset(14, '600', -0.2, 21),
  caption: preset(12, '400', -0.1, 17),
  captionStrong: preset(12, '600', -0.1, 17),
  footnote: preset(11, '500', 0, 15),
  /** 섹션 구분용 대문자 라벨 */
  overline: preset(11, '700', 0.8, 14),
  button: preset(16, '600', -0.3, 20),
};

// ─────────────────────────────────────────────────────────────
// Space / Radius / Layout
// ─────────────────────────────────────────────────────────────

export const spacing = {
  '2xs': 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 56,
  '6xl': 64,
  '7xl': 80,
  '8xl': 96,
};

export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  base: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 32,
  card: 20,
  sheet: 28,
  full: 9999,
};

export const layout = {
  maxWidth: { sm: 640, md: 768, lg: 1024, xl: 1280 },

  headerHeight: 56,
  /** 세이프에어리어를 뺀 순수 탭바 높이. insets.bottom 을 별도로 더한다. */
  tabBarHeight: 58,
  bottomSheetHandle: 24,

  /** 최소 터치 타겟 — iOS HIG 44pt / Material 48dp 중 큰 쪽. */
  minTouchTarget: 48,

  buttonHeight: { xs: 32, sm: 40, base: 48, lg: 54, xl: 60 },
  inputHeight: { sm: 40, base: 48, lg: 56 },
  iconSize: { xs: 16, sm: 20, base: 24, md: 28, lg: 32, xl: 40, '2xl': 48, '3xl': 56 },
  avatarSize: { xs: 24, sm: 32, base: 40, md: 48, lg: 56, xl: 72, '2xl': 88, '3xl': 120 },
  cardPadding: { sm: 12, base: 16, lg: 20, xl: 24 },

  sectionSpacing: 12,
  screenPadding: 20,
  hairline: Platform.select({ ios: 0.5, android: 0.7, default: 1 }),
};

/** 작은 아이콘·칩의 터치 여유. <Pressable hitSlop={hitSlop.base} /> */
export const hitSlop = {
  sm: { top: 6, bottom: 6, left: 6, right: 6 },
  base: { top: 10, bottom: 10, left: 10, right: 10 },
  lg: { top: 16, bottom: 16, left: 16, right: 16 },
};

// ─────────────────────────────────────────────────────────────
// Elevation
// ─────────────────────────────────────────────────────────────

/**
 * 라이트 모드 그림자. 다크 모드에서는 그림자가 거의 보이지 않으므로
 * ThemeContext 가 border + surfaceRaised 조합으로 대체한다.
 */
export const shadows = {
  none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  xs: { shadowColor: '#0E1219', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  sm: { shadowColor: '#0E1219', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  base: { shadowColor: '#0E1219', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 },
  md: { shadowColor: '#0E1219', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.09, shadowRadius: 20, elevation: 5 },
  lg: { shadowColor: '#0E1219', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.12, shadowRadius: 32, elevation: 8 },
  xl: { shadowColor: '#0E1219', shadowOffset: { width: 0, height: 22 }, shadowOpacity: 0.16, shadowRadius: 44, elevation: 12 },
  card: { shadowColor: '#0E1219', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sheet: { shadowColor: '#0E1219', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.12, shadowRadius: 28, elevation: 16 },
  soft: { shadowColor: brand[500], shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 4 },
};

// ─────────────────────────────────────────────────────────────
// Motion
// ─────────────────────────────────────────────────────────────

export const animations = {
  duration: {
    instant: 90,
    fast: 140,
    base: 200,
    normal: 260,
    slow: 340,
    slower: 480,
  },
  /** Animated.spring 프리셋 — useNativeDriver 와 함께 사용. */
  spring: {
    press: { friction: 8, tension: 320, useNativeDriver: true },
    release: { friction: 5, tension: 420, useNativeDriver: true },
    gentle: { damping: 20, stiffness: 150 },
    bouncy: { damping: 10, stiffness: 200 },
    stiff: { damping: 30, stiffness: 300 },
  },
  /** 눌림 스케일 — 요소 크기에 따라 다르게. */
  pressScale: { card: 0.985, button: 0.96, icon: 0.9, chip: 0.94 },
};

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  toast: 800,
  overlay: 900,
  max: 1000,
};

export default {
  fonts,
  brand,
  neutral,
  bull,
  bear,
  positive,
  caution,
  tier,
  dataviz,
  gradients,
  lightColors,
  darkColors,
  typography,
  textStyles,
  tabularNums,
  spacing,
  borderRadius,
  layout,
  hitSlop,
  shadows,
  animations,
  zIndex,
};
