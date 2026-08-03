import React, { useRef, useCallback } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { hitSlop } from '../../styles/tokens';
import haptics from '../../utils/haptics';

/**
 * 카드. onPress 를 주면 눌림 애니메이션이 붙는다.
 *
 * @param variant 'elevated' — 그림자 (기본, 라이트 모드에서 위계 표현)
 *                'outlined' — 테두리만 (밀도 높은 리스트에 적합)
 *                'filled'   — 배경 톤만 (섹션 내부 중첩용)
 */
export function Card({
  children,
  onPress,
  onLongPress,
  variant = 'elevated',
  padding = 'lg',
  radius = 'card',
  style,
  disabled,
  accessibilityLabel,
  ...rest
}) {
  const { theme, isDark } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: theme.animations.pressScale.card,
      ...theme.animations.spring.press,
    }).start();
  }, [scale, theme]);

  const pressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, ...theme.animations.spring.release }).start();
  }, [scale, theme]);

  // 다크 모드에서는 그림자가 안 보이므로 표면을 한 단계 올리고 테두리로 구분한다
  const variantStyle = {
    elevated: isDark
      ? {
          backgroundColor: theme.colors.surfaceRaised,
          borderWidth: theme.layout.hairline,
          borderColor: theme.colors.borderLight,
        }
      : { backgroundColor: theme.colors.surface, ...theme.shadows.card },
    outlined: {
      backgroundColor: theme.colors.surface,
      borderWidth: theme.layout.hairline,
      borderColor: theme.colors.border,
    },
    filled: { backgroundColor: theme.colors.surfaceSunken },
  }[variant];

  const base = [
    {
      borderRadius: theme.borderRadius[radius] ?? theme.borderRadius.card,
      padding: theme.spacing[padding] ?? theme.spacing.lg,
    },
    variantStyle,
    style,
  ];

  if (!onPress && !onLongPress) {
    return (
      <View style={base} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => {
          haptics.selection();
          onPress?.();
        }}
        onLongPress={onLongPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[base, disabled && { opacity: 0.5 }]}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/**
 * 섹션 헤더. 우측에 "전체보기" 같은 액션을 붙일 수 있다.
 *   <SectionHeader title="보유 크리에이터" actionLabel="전체보기" onAction={…} />
 */
export function SectionHeader({ title, subtitle, actionLabel, onAction, style }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.sectionHeader, { paddingHorizontal: theme.spacing.lg }, style]}>
      <View style={styles.flex}>
        <Text style={[theme.textStyles.title3, { color: theme.colors.textPrimary }]}>{title}</Text>
        {subtitle ? (
          <Text
            style={[
              theme.textStyles.caption,
              { color: theme.colors.textSecondary, marginTop: 2 },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel ? (
        <Pressable
          onPress={onAction}
          hitSlop={hitSlop.base}
          accessibilityRole="button"
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.5 }]}
        >
          <Text style={[theme.textStyles.captionStrong, { color: theme.colors.textSecondary }]}>
            {actionLabel}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * 라벨 배지.
 * @param tone 'neutral' | 'brand' | 'up' | 'down' | 'success' | 'warning' | 'danger'
 */
export function Pill({ children, tone = 'neutral', icon, size = 'base', style, textStyle }) {
  const { theme } = useTheme();
  const c = theme.colors;

  const tones = {
    neutral: { bg: c.surfaceSunken, fg: c.textSecondary },
    brand: { bg: c.primaryBackground, fg: c.primary },
    up: { bg: c.stockUpBackground, fg: c.stockUpText },
    down: { bg: c.stockDownBackground, fg: c.stockDownText },
    success: { bg: c.successBackground, fg: c.successText },
    warning: { bg: c.warningBackground, fg: c.warningText },
    danger: { bg: c.errorBackground, fg: c.errorText },
  };
  const t = tones[tone] || tones.neutral;
  const small = size === 'sm';

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: t.bg,
          paddingHorizontal: small ? 7 : 10,
          paddingVertical: small ? 2 : 4,
          borderRadius: theme.borderRadius.full,
        },
        style,
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={small ? 10 : 12} color={t.fg} style={{ marginRight: 3 }} />
      ) : null}
      <Text
        style={[
          small ? theme.textStyles.footnote : theme.textStyles.captionStrong,
          { color: t.fg },
          textStyle,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

/** 리스트 사이 1px 구분선. 좌측 인셋을 줄 수 있다. */
export function Divider({ inset = 0, style }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          height: theme.layout.hairline,
          backgroundColor: theme.colors.divider,
          marginLeft: inset,
        },
        style,
      ]}
    />
  );
}

/** 섹션 사이 여백 블록 */
export function Spacer({ size = 'lg' }) {
  const { theme } = useTheme();
  return <View style={{ height: theme.spacing[size] ?? theme.spacing.lg }} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    paddingLeft: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
});

export default Card;
