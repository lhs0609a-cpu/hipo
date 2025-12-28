import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import theme from '../styles/theme';

/**
 * Button Component Library
 *
 * Provides consistent button UI with:
 * - Multiple variants (primary, secondary, outline, ghost, danger)
 * - Multiple sizes (sm, base, lg, xl)
 * - Loading states
 * - Disabled states
 * - Icon support
 * - Full width option
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

  const buttonStyles = [
    styles.button,
    styles[variant],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`size_${size}Text`],
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...props}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? '#fff' : theme.colors.primary}
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
    </TouchableOpacity>
  );
};

/**
 * Icon Button Component
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
  const buttonSize = theme.layout.buttonHeight[size];

  return (
    <TouchableOpacity
      style={[
        styles.iconButton,
        styles[variant],
        { width: buttonSize, height: buttonSize },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      {...props}
    >
      {icon}
    </TouchableOpacity>
  );
};

/**
 * Button Group Component
 */
export const ButtonGroup = ({ children, style, spacing = 'md' }) => {
  return (
    <View style={[styles.buttonGroup, { gap: theme.spacing[spacing] }, style]}>
      {children}
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

  // Variants
  primary: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
  primaryText: {
    color: theme.colors.white,
  },

  secondary: {
    backgroundColor: theme.colors.secondary,
    ...theme.shadows.sm,
  },
  secondaryText: {
    color: theme.colors.white,
  },

  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  outlineText: {
    color: theme.colors.primary,
  },

  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: theme.colors.primary,
  },

  danger: {
    backgroundColor: theme.colors.error,
    ...theme.shadows.sm,
  },
  dangerText: {
    color: theme.colors.white,
  },

  link: {
    backgroundColor: 'transparent',
  },
  linkText: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },

  // Sizes
  size_sm: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    height: theme.layout.buttonHeight.sm,
  },
  size_smText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },

  size_base: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    height: theme.layout.buttonHeight.base,
  },
  size_baseText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  size_lg: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    height: theme.layout.buttonHeight.lg,
  },
  size_lgText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  size_xl: {
    paddingVertical: theme.spacing.base,
    paddingHorizontal: theme.spacing.xl,
    height: theme.layout.buttonHeight.xl,
  },
  size_xlText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },

  // States
  disabled: {
    opacity: 0.5,
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

  // Button Group
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Base Text
  text: {
    textAlign: 'center',
  },
});

export default Button;
