import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, CardBody } from './Card';
import { FadeIn } from './Animated';
import theme from '../styles/theme';

/**
 * PortfolioSummaryWidget Component
 *
 * Displays user's portfolio summary:
 * - Total portfolio value
 * - Today's gain/loss
 * - Percentage change
 * - Quick action buttons
 */
const PortfolioSummaryWidget = ({
  totalValue = 0,
  todayChange = 0,
  todayChangePercent = 0,
  onViewPortfolio,
  onTrade,
  style,
}) => {
  const isPositive = todayChange >= 0;

  return (
    <FadeIn>
      <Card variant="elevated" style={[styles.container, style]}>
        <CardBody>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.label}>내 포트폴리오</Text>
            <TouchableOpacity onPress={onViewPortfolio}>
              <Text style={styles.viewAll}>전체보기 →</Text>
            </TouchableOpacity>
          </View>

          {/* Total Value */}
          <View style={styles.valueContainer}>
            <Text style={styles.totalValue}>
              {totalValue.toLocaleString()} PO
            </Text>
          </View>

          {/* Today's Change */}
          <View style={styles.changeContainer}>
            <View style={[
              styles.changeBadge,
              isPositive ? styles.changeBadgePositive : styles.changeBadgeNegative
            ]}>
              <Text style={[
                styles.changeText,
                isPositive ? styles.changeTextPositive : styles.changeTextNegative
              ]}>
                {isPositive ? '+' : ''}{todayChange.toLocaleString()} PO
              </Text>
              <Text style={[
                styles.changePercent,
                isPositive ? styles.changeTextPositive : styles.changeTextNegative
              ]}>
                ({isPositive ? '+' : ''}{todayChangePercent.toFixed(2)}%)
              </Text>
            </View>
            <Text style={styles.todayLabel}>오늘</Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={onTrade}
            >
              <Text style={styles.actionButtonText}>거래하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={onViewPortfolio}
            >
              <Text style={styles.actionButtonTextSecondary}>상세보기</Text>
            </TouchableOpacity>
          </View>
        </CardBody>
      </Card>
    </FadeIn>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.base,
    marginVertical: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  viewAll: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  valueContainer: {
    marginBottom: theme.spacing.sm,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.base,
    marginRight: theme.spacing.sm,
  },
  changeBadgePositive: {
    backgroundColor: theme.colors.stockUpBackground,
  },
  changeBadgeNegative: {
    backgroundColor: theme.colors.stockDownBackground,
  },
  changeText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    marginRight: theme.spacing.xs,
  },
  changeTextPositive: {
    color: theme.colors.stockUp,
  },
  changeTextNegative: {
    color: theme.colors.stockDown,
  },
  changePercent: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  todayLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  actionButtonSecondary: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  actionButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
  },
  actionButtonTextSecondary: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
});

export default PortfolioSummaryWidget;
