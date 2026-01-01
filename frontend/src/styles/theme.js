/**
 * HIPO Design System - Toss Style
 *
 * 토스 스타일의 깔끔하고 미니멀한 디자인 시스템
 */

export const colors = {
  // Primary Colors - 토스 블루
  primary: '#3182F6',
  primaryLight: '#5B9CF6',
  primaryDark: '#1B64DA',
  primaryBackground: '#EBF4FF',
  primarySoft: '#F2F6FC',

  // Secondary Colors
  secondary: '#6B7684',
  secondaryLight: '#8B95A1',
  secondaryDark: '#4E5968',

  // Status Colors
  success: '#00C853',
  successBackground: '#E8F8EF',
  warning: '#FF9100',
  warningBackground: '#FFF4E5',
  error: '#F04452',
  errorBackground: '#FFEBEE',
  info: '#3182F6',
  infoBackground: '#EBF4FF',

  // Stock Colors - 토스 스타일 (상승 빨강, 하락 파랑)
  stockUp: '#F04452',
  stockDown: '#3182F6',
  stockUpBackground: '#FFF0F1',
  stockDownBackground: '#EBF4FF',

  // Neutral Colors - 토스 그레이 스케일
  white: '#FFFFFF',
  black: '#191F28',

  gray50: '#F9FAFB',
  gray100: '#F2F4F6',
  gray200: '#E5E8EB',
  gray300: '#D1D6DB',
  gray400: '#B0B8C1',
  gray500: '#8B95A1',
  gray600: '#6B7684',
  gray700: '#4E5968',
  gray800: '#333D4B',
  gray900: '#191F28',

  // Text Colors
  textPrimary: '#191F28',
  textSecondary: '#6B7684',
  textTertiary: '#8B95A1',
  textDisabled: '#B0B8C1',
  textHint: '#ADB5BD',
  textInverse: '#FFFFFF',

  // Background Colors
  background: '#F7F8FA',
  backgroundPure: '#FFFFFF',
  backgroundSecondary: '#F2F4F6',
  backgroundTertiary: '#E5E8EB',
  surface: '#FFFFFF',
  surfaceSecondary: '#F7F8FA',

  // Border Colors
  border: '#E5E8EB',
  borderLight: '#F2F4F6',
  borderDark: '#D1D6DB',
  divider: '#F2F4F6',

  // Overlay Colors
  overlay: 'rgba(25, 31, 40, 0.4)',
  overlayLight: 'rgba(25, 31, 40, 0.2)',
  overlayDark: 'rgba(25, 31, 40, 0.6)',

  // Button Colors
  buttonPrimary: '#3182F6',
  buttonSecondary: '#F2F4F6',
  buttonDanger: '#F04452',
  buttonBuy: '#F04452',
  buttonSell: '#3182F6',

  // Trust Level Colors
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
  master: '#FF6B6B',
  legend: '#9B59B6',
};

export const typography = {
  // Font Families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    light: 'System',
  },

  // Font Sizes - 토스 스타일 (더 큰 사이즈)
  fontSize: {
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

  // Font Weights
  fontWeight: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
    loose: 1.8,
  },

  // Letter Spacing
  letterSpacing: {
    tighter: -0.8,
    tight: -0.4,
    normal: 0,
    wide: 0.4,
    wider: 0.8,
  },
};

export const spacing = {
  // Base spacing unit: 4px (토스 스타일의 넉넉한 여백)
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
  full: 9999,
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  // 토스 스타일의 부드러운 그림자
  xs: {
    shadowColor: '#191F28',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#191F28',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  base: {
    shadowColor: '#191F28',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#191F28',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#191F28',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: '#191F28',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  // 토스 스타일 카드 그림자
  card: {
    shadowColor: '#191F28',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  // 부드러운 inner glow 효과
  soft: {
    shadowColor: '#3182F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 0,
  },
};

export const layout = {
  // Container Max Widths
  maxWidth: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },

  // Common Heights - 토스 스타일
  headerHeight: 56,
  tabBarHeight: 64,
  bottomSheetHandle: 24,

  buttonHeight: {
    xs: 32,
    sm: 40,
    base: 48,
    lg: 56,
    xl: 64,
  },

  inputHeight: {
    sm: 40,
    base: 48,
    lg: 56,
  },

  // Icon Sizes
  iconSize: {
    xs: 16,
    sm: 20,
    base: 24,
    md: 28,
    lg: 32,
    xl: 40,
    '2xl': 48,
    '3xl': 56,
  },

  // Avatar Sizes
  avatarSize: {
    xs: 24,
    sm: 32,
    base: 40,
    md: 48,
    lg: 56,
    xl: 72,
    '2xl': 88,
    '3xl': 120,
  },

  // Card Paddings
  cardPadding: {
    sm: 12,
    base: 16,
    lg: 20,
    xl: 24,
  },

  // Section spacing
  sectionSpacing: 8,
  screenPadding: 20,
};

export const animations = {
  // Durations (in milliseconds) - 토스 스타일의 빠른 애니메이션
  duration: {
    instant: 100,
    fast: 150,
    base: 200,
    normal: 250,
    slow: 350,
    slower: 500,
  },

  // Spring configs for react-native-reanimated
  spring: {
    gentle: {
      damping: 20,
      stiffness: 150,
    },
    bouncy: {
      damping: 10,
      stiffness: 200,
    },
    stiff: {
      damping: 30,
      stiffness: 300,
    },
  },
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

// 토스 스타일 공통 스타일 헬퍼
export const commonStyles = {
  // 토스 스타일 카드
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    ...shadows.card,
  },

  // 토스 스타일 섹션 컨테이너
  section: {
    backgroundColor: colors.white,
    marginTop: layout.sectionSpacing,
    paddingVertical: spacing.lg,
  },

  // 토스 스타일 리스트 아이템
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
  },

  // 토스 스타일 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: layout.headerHeight,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  // 섹션 타이틀
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.base,
    paddingHorizontal: spacing.lg,
  },

  // 서브 타이틀
  sectionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
};

// Export complete theme object
const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  layout,
  animations,
  zIndex,
  commonStyles,
};

export default theme;
