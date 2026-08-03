/**
 * HIPO Design System
 *
 * 값은 전부 ./tokens.js 에 있습니다. 이 파일은 기존 임포트 경로를 유지하기 위한
 * 호환 레이어이자, 토큰을 조합한 공통 스타일 헬퍼를 제공합니다.
 *
 * 새 코드에서는 useTheme() 사용을 권장합니다.
 */

import {
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
  brand,
  neutral,
  gradients,
  dataviz,
} from './tokens';

export const colors = lightColors;

export {
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
  brand,
  neutral,
  gradients,
  dataviz,
};

/**
 * 팔레트에서 공통 스타일을 생성한다. 라이트/다크 양쪽에서 재사용된다.
 * ThemeContext 가 현재 팔레트로 호출한다.
 */
export const createCommonStyles = (c, shadowSet = shadows) => ({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },

  card: {
    backgroundColor: c.surface,
    borderRadius: borderRadius.card,
    ...shadowSet.card,
  },

  cardOutlined: {
    backgroundColor: c.surface,
    borderRadius: borderRadius.card,
    borderWidth: layout.hairline,
    borderColor: c.border,
  },

  section: {
    backgroundColor: c.surface,
    marginTop: layout.sectionSpacing,
    paddingVertical: spacing.lg,
  },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: c.surface,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: layout.headerHeight,
    paddingHorizontal: spacing.base,
    backgroundColor: c.surface,
  },

  headerBordered: {
    borderBottomWidth: layout.hairline,
    borderBottomColor: c.borderLight,
  },

  divider: {
    height: layout.hairline,
    backgroundColor: c.divider,
  },

  sectionTitle: {
    ...textStyles.title3,
    color: c.textPrimary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },

  sectionSubtitle: {
    ...textStyles.caption,
    color: c.textSecondary,
    marginTop: spacing.xs,
  },

  /** 하단 고정 CTA 영역. 세이프에어리어는 사용하는 쪽에서 더한다. */
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: c.surface,
    borderTopWidth: layout.hairline,
    borderTopColor: c.borderLight,
  },

  /** 등락 표시용 pill */
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
});

export const commonStyles = createCommonStyles(lightColors, shadows);

const theme = {
  colors: lightColors,
  typography,
  textStyles,
  spacing,
  borderRadius,
  shadows,
  layout,
  hitSlop,
  animations,
  zIndex,
  commonStyles,
};

export default theme;
