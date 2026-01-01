import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, Pressable } from 'react-native';
import theme from '../styles/theme';

/**
 * Toss Style Button Component
 *
 * 토스 스타일의 깔끔한 버튼 컴포넌트
 * - primary: 토스 블루 배경
 * - secondary: 연한 회색 배경 (F2F4F6)
 * - soft: 연한 파란색 배경
 * - outline: 테두리만
 * - ghost: 배경 없음
 * - danger: 빨간색
 * - buy: 매수 버튼 (빨간색)
 * - sell: 매도 버튼 (파란색)
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
  ...props
}) => {
  const isDisabled = disabled || loading;

  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          button: styles.primary,
          text: styles.primaryText,
          loader: theme.colors.white,
        };
      case 'secondary':
        return {
          button: styles.secondary,
          text: styles.secondaryText,
          loader: theme.colors.textPrimary,
        };
      case 'soft':
        return {
          button: styles.soft,
          text: styles.softText,
          loader: theme.colors.primary,
        };
      case 'outline':
        return {
          button: styles.outline,
          text: styles.outlineText,
          loader: theme.colors.primary,
        };
      case 'ghost':
        return {
          button: styles.ghost,
          text: styles.ghostText,
          loader: theme.colors.primary,
        };
      case 'danger':
        return {
          button: styles.danger,
          text: styles.dangerText,
          loader: theme.colors.white,
        };
      case 'buy':
        return {
          button: styles.buy,
          text: styles.buyText,
          loader: theme.colors.white,
        };
      case 'sell':
        return {
          button: styles.sell,
          text: styles.sellText,
          loader: theme.colors.white,
        };
      case 'buyOutline':
        return {
          button: styles.buyOutline,
          text: styles.buyOutlineText,
          loader: theme.colors.stockUp,
        };
      case 'sellOutline':
        return {
          button: styles.sellOutline,
          text: styles.sellOutlineText,
          loader: theme.colors.stockDown,
        };
      case 'link':
        return {
          button: styles.link,
          text: styles.linkText,
          loader: theme.colors.primary,
        };
      default:
        return {
          button: styles.primary,
          text: styles.primaryText,
          loader: theme.colors.white,
        };
    }
  };

  const variantStyles = getVariantStyle();

  const buttonStyles = [
    styles.button,
    variantStyles.button,
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    isDisabled && variantStyles.button.backgroundColor && {
      backgroundColor: theme.colors.gray200,
    },
    style,
  ];

  const textStyles = [
    styles.text,
    variantStyles.text,
    styles[`size_${size}Text`],
    isDisabled && styles.disabledText,
    textStyle,
  ];

  return (
    <Pressable
      style={({ pressed }) => [
        ...buttonStyles,
        pressed && !isDisabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      {...props}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variantStyles.loader}
          />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <View style={styles.iconLeft}>{icon}</View>
            )}
            <Text style={textStyles}>{children}</Text>
            {icon && iconPosition === 'right' && (
              <View style={styles.iconRight}>{icon}</View>
            )}
          </>
        )}
      </View>
    </Pressable>
  );
};

/**
 * Toss Style Icon Button
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
  const buttonSize = theme.layout.buttonHeight[size] || 48;

  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.gray100;
      case 'soft':
        return theme.colors.primaryBackground;
      default:
        return 'transparent';
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.iconButton,
        {
          width: buttonSize,
          height: buttonSize,
          backgroundColor: getBackgroundColor(),
        },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      {icon}
    </Pressable>
  );
};

/**
 * Toss Style Chip Button
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
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <View style={styles.chipContent}>
        {icon && <View style={styles.chipIcon}>{icon}</View>}
        <Text style={[
          styles.chipText,
          selected && styles.chipTextSelected,
          textStyle,
        ]}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
};

/**
 * Button Group Component
 */
export const ButtonGroup = ({ children, style, spacing = 'sm', vertical = false }) => {
  return (
    <View style={[
      styles.buttonGroup,
      vertical && styles.buttonGroupVertical,
      { gap: theme.spacing[spacing] },
      style,
    ]}>
      {children}
    </View>
  );
};

/**
 * Toss Style Full Width Bottom Button
 */
export const BottomButton = ({
  children,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  ...props
}) => {
  return (
    <View style={styles.bottomButtonContainer}>
      <Button
        onPress={onPress}
        variant={variant}
        size="lg"
        loading={loading}
        disabled={disabled}
        fullWidth
        style={[styles.bottomButton, style]}
        {...props}
      >
        {children}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  // Base Button
  button: {
    borderRadius: theme.borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Variants - Toss Style
  primary: {
    backgroundColor: theme.colors.primary,
  },
  primaryText: {
    color: theme.colors.white,
  },

  secondary: {
    backgroundColor: theme.colors.gray100,
  },
  secondaryText: {
    color: theme.colors.textPrimary,
  },

  soft: {
    backgroundColor: theme.colors.primaryBackground,
  },
  softText: {
    color: theme.colors.primary,
  },

  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.gray200,
  },
  outlineText: {
    color: theme.colors.textPrimary,
  },

  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: theme.colors.primary,
  },

  danger: {
    backgroundColor: theme.colors.error,
  },
  dangerText: {
    color: theme.colors.white,
  },

  link: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  linkText: {
    color: theme.colors.primary,
  },

  // Buy/Sell Buttons - 토스증권 스타일
  buy: {
    backgroundColor: theme.colors.stockUp,
  },
  buyText: {
    color: theme.colors.white,
  },

  sell: {
    backgroundColor: theme.colors.stockDown,
  },
  sellText: {
    color: theme.colors.white,
  },

  buyOutline: {
    backgroundColor: theme.colors.stockUpBackground,
    borderWidth: 1,
    borderColor: theme.colors.stockUp,
  },
  buyOutlineText: {
    color: theme.colors.stockUp,
  },

  sellOutline: {
    backgroundColor: theme.colors.stockDownBackground,
    borderWidth: 1,
    borderColor: theme.colors.stockDown,
  },
  sellOutlineText: {
    color: theme.colors.stockDown,
  },

  // Sizes - 토스 스타일 (넉넉한 패딩)
  size_xs: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    height: theme.layout.buttonHeight.xs,
    borderRadius: theme.borderRadius.sm,
  },
  size_xsText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },

  size_sm: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    height: theme.layout.buttonHeight.sm,
  },
  size_smText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  size_base: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    height: theme.layout.buttonHeight.base,
  },
  size_baseText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  size_lg: {
    paddingVertical: theme.spacing.base,
    paddingHorizontal: theme.spacing.xl,
    height: theme.layout.buttonHeight.lg,
  },
  size_lgText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  size_xl: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing['2xl'],
    height: theme.layout.buttonHeight.xl,
  },
  size_xlText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },

  // States
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  disabled: {
    opacity: 0.4,
  },

  disabledText: {
    color: theme.colors.textDisabled,
  },

  fullWidth: {
    width: '100%',
  },

  // Icons
  iconLeft: {
    marginRight: theme.spacing.sm,
  },
  iconRight: {
    marginLeft: theme.spacing.sm,
  },

  // Icon Button
  iconButton: {
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Chip Button - 토스 스타일
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.gray100,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: theme.colors.primaryBackground,
    borderColor: theme.colors.primary,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipIcon: {
    marginRight: theme.spacing.xs,
  },
  chipText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  chipTextSelected: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  // Button Group
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonGroupVertical: {
    flexDirection: 'column',
  },

  // Bottom Button
  bottomButtonContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  bottomButton: {
    borderRadius: theme.borderRadius.base,
  },

  // Base Text
  text: {
    textAlign: 'center',
  },
});

export default Button;
