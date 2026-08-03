import React, { useRef, useCallback } from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Pressable,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { hitSlop as hitSlopTokens } from '../styles/tokens';
import haptics from '../utils/haptics';

/**
 * HIPO Button
 *
 * - 높이는 minHeight 로 잡아 접근성 큰 글씨에서 라벨이 잘리지 않게 한다.
 * - 눌림 시 스케일 애니메이션 + 햅틱.
 */
const Button = ({
  children,
  onPress,
  variant = 'primary',
  size = 'base',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  haptic = 'light',
  ...props
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const handlePress = useCallback(
    (e) => {
      if (haptic && haptics[haptic]) haptics[haptic]();
      onPress?.(e);
    },
    [haptic, onPress]
  );

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      friction: 8,
      tension: 300,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 400,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          button: { backgroundColor: theme.colors.primary },
          text: { color: theme.colors.white },
          loader: theme.colors.white,
        };
      case 'secondary':
        return {
          button: { backgroundColor: theme.colors.gray100 },
          text: { color: theme.colors.textPrimary },
          loader: theme.colors.textPrimary,
        };
      case 'soft':
        return {
          button: { backgroundColor: theme.colors.primaryBackground },
          text: { color: theme.colors.primary },
          loader: theme.colors.primary,
        };
      case 'outline':
        return {
          button: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: theme.colors.border,
          },
          text: { color: theme.colors.textPrimary },
          loader: theme.colors.primary,
        };
      case 'ghost':
        return {
          button: { backgroundColor: 'transparent' },
          text: { color: theme.colors.primary },
          loader: theme.colors.primary,
        };
      case 'danger':
        return {
          button: { backgroundColor: theme.colors.error },
          text: { color: theme.colors.white },
          loader: theme.colors.white,
        };
      case 'buy':
        return {
          button: { backgroundColor: theme.colors.stockUp },
          text: { color: theme.colors.white },
          loader: theme.colors.white,
        };
      case 'sell':
        return {
          button: { backgroundColor: theme.colors.stockDown },
          text: { color: theme.colors.white },
          loader: theme.colors.white,
        };
      case 'buyOutline':
        return {
          button: {
            backgroundColor: theme.colors.stockUpBackground,
            borderWidth: 1,
            borderColor: theme.colors.stockUp,
          },
          text: { color: theme.colors.stockUp },
          loader: theme.colors.stockUp,
        };
      case 'sellOutline':
        return {
          button: {
            backgroundColor: theme.colors.stockDownBackground,
            borderWidth: 1,
            borderColor: theme.colors.stockDown,
          },
          text: { color: theme.colors.stockDown },
          loader: theme.colors.stockDown,
        };
      case 'link':
        return {
          button: { backgroundColor: 'transparent', paddingHorizontal: 0 },
          text: { color: theme.colors.primary },
          loader: theme.colors.primary,
        };
      default:
        return {
          button: { backgroundColor: theme.colors.primary },
          text: { color: theme.colors.white },
          loader: theme.colors.white,
        };
    }
  };

  const variantStyles = getVariantStyle();

  const sizeStyles = {
    xs: {
      button: {
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
        minHeight: theme.layout.buttonHeight.xs,
        borderRadius: theme.borderRadius.sm,
      },
      text: {
        fontSize: theme.typography.fontSize.xs,
        fontWeight: theme.typography.fontWeight.medium,
      },
    },
    sm: {
      button: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        minHeight: theme.layout.buttonHeight.sm,
        borderRadius: theme.borderRadius.base,
      },
      text: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.semibold,
      },
    },
    base: {
      button: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        minHeight: theme.layout.buttonHeight.base,
        borderRadius: theme.borderRadius.base,
      },
      text: {
        fontSize: theme.typography.fontSize.base,
        fontWeight: theme.typography.fontWeight.semibold,
      },
    },
    lg: {
      button: {
        paddingVertical: theme.spacing.base,
        paddingHorizontal: theme.spacing.xl,
        minHeight: theme.layout.buttonHeight.lg,
        borderRadius: theme.borderRadius.base,
      },
      text: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: theme.typography.fontWeight.semibold,
      },
    },
    xl: {
      button: {
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: theme.spacing['2xl'],
        minHeight: theme.layout.buttonHeight.xl,
        borderRadius: theme.borderRadius.md,
      },
      text: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold,
      },
    },
  };

  const currentSizeStyle = sizeStyles[size] || sizeStyles.base;

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        fullWidth && styles.fullWidth,
      ]}
    >
      <Pressable
        style={[
          styles.button,
          variantStyles.button,
          currentSizeStyle.button,
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          style,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        {...props}
      >
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="small" color={variantStyles.loader} />
          ) : (
            <>
              {icon && iconPosition === 'left' && (
                <View style={styles.iconLeft}>{icon}</View>
              )}
              <Text style={[styles.text, variantStyles.text, currentSizeStyle.text, textStyle]}>
                {children}
              </Text>
              {icon && iconPosition === 'right' && (
                <View style={styles.iconRight}>{icon}</View>
              )}
            </>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

/**
 * Animated Icon Button
 */
export const IconButton = ({
  icon,
  onPress,
  size = 'base',
  variant = 'ghost',
  disabled = false,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const buttonSize = theme.layout.buttonHeight[size] || 48;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      friction: 8,
      tension: 300,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 400,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.backgroundSecondary;
      case 'soft':
        return theme.colors.primaryBackground;
      default:
        return 'transparent';
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={[
          styles.iconButton,
          {
            width: buttonSize,
            height: buttonSize,
            backgroundColor: getBackgroundColor(),
          },
          disabled && styles.disabled,
          style,
        ]}
        onPress={(e) => {
          haptics.selection();
          onPress?.(e);
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        hitSlop={buttonSize < 44 ? hitSlopTokens.base : hitSlopTokens.sm}
        accessibilityRole="button"
        {...props}
      >
        {icon}
      </Pressable>
    </Animated.View>
  );
};

/**
 * Animated Chip Button
 */
export const ChipButton = ({
  children,
  onPress,
  selected = false,
  disabled = false,
  icon,
  style,
  textStyle,
  ...props
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 8,
      tension: 300,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 400,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={[
          styles.chip,
          { backgroundColor: theme.colors.backgroundSecondary },
          selected && {
            backgroundColor: theme.colors.primaryBackground,
            borderColor: theme.colors.primary,
          },
          disabled && styles.disabled,
          style,
        ]}
        onPress={(e) => {
          haptics.selection();
          onPress?.(e);
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        hitSlop={hitSlopTokens.sm}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        {...props}
      >
        <View style={styles.chipContent}>
          {icon && <View style={styles.chipIcon}>{icon}</View>}
          <Text
            style={[
              styles.chipText,
              { color: theme.colors.textSecondary },
              selected && { color: theme.colors.primary, fontWeight: '600' },
              textStyle,
            ]}
          >
            {children}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

/**
 * Button Group Component
 */
export const ButtonGroup = ({ children, style, spacing = 'sm', vertical = false }) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.buttonGroup,
        vertical && styles.buttonGroupVertical,
        { gap: theme.spacing[spacing] },
        style,
      ]}
    >
      {children}
    </View>
  );
};

/**
 * 하단 고정 CTA. 홈 인디케이터/제스처바를 실제 인셋으로 피한다.
 */
export const BottomButton = ({
  children,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  containerStyle,
  ...props
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bottomButtonContainer,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.borderLight,
          borderTopWidth: theme.layout.hairline,
          paddingBottom: Math.max(insets.bottom, theme.spacing.base),
        },
        containerStyle,
      ]}
    >
      <Button
        onPress={onPress}
        variant={variant}
        size="lg"
        loading={loading}
        disabled={disabled}
        fullWidth
        style={style}
        {...props}
      >
        {children}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  fullWidth: {
    width: '100%',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  iconButton: {
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonGroupVertical: {
    flexDirection: 'column',
  },
  bottomButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});

export default Button;
