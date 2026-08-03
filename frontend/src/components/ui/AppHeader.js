import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { hitSlop } from '../../styles/tokens';
import haptics from '../../utils/haptics';

/**
 * 화면 자체 헤더 (headerShown: false 인 화면용).
 *
 * 세이프에어리어는 감싸는 <Screen edges={['top', …]}> 이 처리하므로
 * 여기서는 인셋을 다시 더하지 않습니다.
 *
 *   <Screen edges={['top','bottom']}>
 *     <AppHeader title="지갑" onBack={() => navigation.goBack()} />
 *     …
 *
 * @param variant 'default' — 배경 있는 표준 헤더
 *                'transparent' — 히어로 이미지 위에 얹는 투명 헤더
 *                'large' — 큰 타이틀 (iOS large title 스타일)
 */
export default function AppHeader({
  title,
  subtitle,
  onBack,
  right,
  variant = 'default',
  bordered = true,
  style,
  titleStyle,
}) {
  const { theme } = useTheme();
  const isTransparent = variant === 'transparent';
  const isLarge = variant === 'large';

  const tint = isTransparent ? theme.colors.textInverse : theme.colors.textPrimary;

  const handleBack = () => {
    haptics.selection();
    onBack?.();
  };

  return (
    <View style={isLarge ? undefined : null}>
      <View
        style={[
          styles.bar,
          {
            height: theme.layout.headerHeight,
            paddingHorizontal: theme.spacing.xs,
            backgroundColor: isTransparent ? 'transparent' : theme.colors.surface,
          },
          bordered &&
            !isTransparent &&
            !isLarge && {
              borderBottomWidth: theme.layout.hairline,
              borderBottomColor: theme.colors.borderLight,
            },
          style,
        ]}
      >
        <View style={styles.side}>
          {onBack ? (
            <Pressable
              onPress={handleBack}
              hitSlop={hitSlop.base}
              accessibilityRole="button"
              accessibilityLabel="뒤로 가기"
              style={({ pressed }) => [
                styles.iconButton,
                pressed && { backgroundColor: theme.colors.surfaceHover, opacity: 0.9 },
              ]}
            >
              <Ionicons name="chevron-back" size={26} color={tint} />
            </Pressable>
          ) : null}
        </View>

        {!isLarge ? (
          <View style={styles.center} pointerEvents="none">
            <Text
              numberOfLines={1}
              style={[theme.textStyles.headline, { color: tint }, titleStyle]}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                numberOfLines={1}
                style={[theme.textStyles.footnote, { color: theme.colors.textTertiary }]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.center} />
        )}

        <View style={[styles.side, styles.sideRight]}>{right}</View>
      </View>

      {isLarge ? (
        <View
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.base,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Text style={[theme.textStyles.title1, { color: theme.colors.textPrimary }]}>{title}</Text>
          {subtitle ? (
            <Text
              style={[
                theme.textStyles.callout,
                { color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** 헤더 우측 아이콘 버튼. 터치 타겟 44pt 보장. */
export function HeaderIcon({ name, onPress, color, badge, accessibilityLabel }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress?.();
      }}
      hitSlop={hitSlop.sm}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.55 }]}
    >
      <Ionicons name={name} size={22} color={color || theme.colors.textPrimary} />
      {badge ? (
        <View
          style={[
            styles.badge,
            { backgroundColor: theme.colors.error, borderColor: theme.colors.surface },
          ]}
        >
          {typeof badge === 'number' && badge > 0 ? (
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
