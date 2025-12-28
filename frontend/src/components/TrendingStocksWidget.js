import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList } from 'react-native';
import { Card, CardBody } from './Card';
import { FadeIn } from './Animated';
import theme from '../styles/theme';

/**
 * TrendingStocksWidget Component
 *
 * Displays trending/top performing stocks
 * - Horizontal scrolling list
 * - Stock name, price, change
 * - Creator avatar
 */
const TrendingStocksWidget = ({
  title = '인기 급상승',
  stocks = [],
  onStockPress,
  onViewAll,
  style,
}) => {
  const renderStock = ({ item, index }) => {
    const isPositive = item.priceChange >= 0;

    return (
      <FadeIn delay={index * 30}>
        <TouchableOpacity
          style={styles.stockCard}
          onPress={() => onStockPress?.(item)}
          activeOpacity={0.7}
        >
          {/* Rank Badge */}
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>#{index + 1}</Text>
          </View>

          {/* Creator Avatar */}
          <View style={styles.avatarContainer}>
            {item.profileImage ? (
              <Image
                source={{ uri: item.profileImage }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarPlaceholderText}>
                  {item.username?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>

          {/* Stock Info */}
          <Text style={styles.stockName} numberOfLines={1}>
            {item.stockName || item.username}
          </Text>
          <Text style={styles.username} numberOfLines={1}>
            @{item.username}
          </Text>

          {/* Price */}
          <Text style={styles.price}>
            {item.currentPrice?.toLocaleString()} PO
          </Text>

          {/* Change */}
          <View style={[
            styles.changeBadge,
            isPositive ? styles.changeBadgePositive : styles.changeBadgeNegative
          ]}>
            <Text style={[
              styles.changeText,
              isPositive ? styles.changeTextPositive : styles.changeTextNegative
            ]}>
              {isPositive ? '+' : ''}{item.priceChangePercent?.toFixed(2)}%
            </Text>
          </View>
        </TouchableOpacity>
      </FadeIn>
    );
  };

  if (!stocks || stocks.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text style={styles.viewAll}>전체보기 →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stock List */}
      <FlatList
        horizontal
        data={stocks}
        renderItem={renderStock}
        keyExtractor={(item, index) => item.id || index.toString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  viewAll: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  listContent: {
    paddingHorizontal: theme.spacing.base,
    gap: theme.spacing.md,
  },
  stockCard: {
    width: 140,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.shadows.base,
    position: 'relative',
  },
  rankBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  rankText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.white,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.gray500,
  },
  stockName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
    textAlign: 'center',
  },
  username: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  price: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  changeBadge: {
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'center',
  },
  changeBadgePositive: {
    backgroundColor: theme.colors.stockUpBackground,
  },
  changeBadgeNegative: {
    backgroundColor: theme.colors.stockDownBackground,
  },
  changeText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  changeTextPositive: {
    color: theme.colors.stockUp,
  },
  changeTextNegative: {
    color: theme.colors.stockDown,
  },
});

export default TrendingStocksWidget;
