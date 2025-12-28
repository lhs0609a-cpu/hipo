import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ScaleIn } from './Animated';
import theme from '../styles/theme';

/**
 * QuickActionsWidget Component
 *
 * Grid of quick action buttons for common tasks
 */
const QuickActionsWidget = ({ actions = [], style }) => {
  const defaultActions = [
    {
      id: 'trade',
      icon: '💰',
      label: '거래',
      color: theme.colors.primary,
      onPress: () => {},
    },
    {
      id: 'portfolio',
      icon: '📊',
      label: '포트폴리오',
      color: theme.colors.secondary,
      onPress: () => {},
    },
    {
      id: 'wallet',
      icon: '💳',
      label: '지갑',
      color: theme.colors.success,
      onPress: () => {},
    },
    {
      id: 'ranking',
      icon: '🏆',
      label: '랭킹',
      color: theme.colors.warning,
      onPress: () => {},
    },
  ];

  const finalActions = actions.length > 0 ? actions : defaultActions;

  const renderAction = (action, index) => (
    <ScaleIn key={action.id || index} delay={index * 50}>
      <TouchableOpacity
        style={[styles.actionButton, { borderColor: action.color }]}
        onPress={action.onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${action.color}15` }]}>
          <Text style={styles.icon}>{action.icon}</Text>
        </View>
        <Text style={styles.label}>{action.label}</Text>
      </TouchableOpacity>
    </ScaleIn>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.grid}>
        {finalActions.map(renderAction)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    minWidth: '22%',
    aspectRatio: 1,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  icon: {
    fontSize: 24,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
});

export default QuickActionsWidget;
