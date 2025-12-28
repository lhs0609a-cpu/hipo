/**
 * HIPO Design System
 *
 * Centralized design tokens for consistent styling across the app
 */

export const colors = {
  // Primary Colors
  primary: '#4caf50',
  primaryLight: '#80e27e',
  primaryDark: '#087f23',
  primaryBackground: '#e8f5e9',

  // Secondary Colors
  secondary: '#2196f3',
  secondaryLight: '#6ec6ff',
  secondaryDark: '#0069c0',

  // Status Colors
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  info: '#2196f3',

  // Stock Colors
  stockUp: '#4caf50',
  stockDown: '#f44336',
  stockUpBackground: '#e8f5e9',
  stockDownBackground: '#ffebee',

  // Neutral Colors
  white: '#ffffff',
  black: '#000000',
  gray50: '#fafafa',
  gray100: '#f5f5f5',
  gray200: '#eeeeee',
  gray300: '#e0e0e0',
  gray400: '#bdbdbd',
  gray500: '#9e9e9e',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',

  // Text Colors
  textPrimary: '#212121',
  textSecondary: '#757575',
  textDisabled: '#bdbdbd',
  textHint: '#9e9e9e',

  // Background Colors
  background: '#ffffff',
  backgroundSecondary: '#f5f5f5',
  backgroundTertiary: '#fafafa',

  // Border Colors
  border: '#e0e0e0',
  borderLight: '#f0f0f0',
  borderDark: '#bdbdbd',

  // Overlay Colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
};

export const typography = {
  // Font Families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },

  // Font Sizes
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
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
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  // Letter Spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
};

export const spacing = {
  // Base spacing unit: 4px
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
  '6xl': 80,
};

export const borderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
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
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
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

  // Common Heights
  headerHeight: 56,
  tabBarHeight: 60,
  buttonHeight: {
    sm: 32,
    base: 40,
    lg: 48,
    xl: 56,
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
  },

  // Avatar Sizes
  avatarSize: {
    xs: 24,
    sm: 32,
    base: 40,
    md: 48,
    lg: 64,
    xl: 80,
    '2xl': 96,
  },
};

export const animations = {
  // Durations (in milliseconds)
  duration: {
    fast: 150,
    base: 200,
    slow: 300,
    slower: 500,
  },

  // Easing Functions
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

export const zIndex = {
  modal: 1000,
  overlay: 900,
  dropdown: 800,
  header: 700,
  toast: 600,
  tooltip: 500,
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
};

export default theme;
