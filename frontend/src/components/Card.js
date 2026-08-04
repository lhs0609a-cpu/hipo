import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import theme from '../styles/theme';

/**
 * Toss Style Card Component Library
 *
 * 토스 스타일의 깔끔한 카드 컴포넌트
 * - default: 기본 흰색 카드
 * - elevated: 그림자가 있는 카드
 * - section: 섹션 형태의 카드
 * - outlined: 테두리가 있는 카드
 */

/**
 * Base Card Component - 토스 스타일
 */
export const Card = ({
  children,
  variant = 'default',
  onPress,
  style,
  disabled = false,
}) => {
  const cardStyles = [
    styles.card,
    variant === 'elevated' && styles.cardElevated,
    variant === 'section' && styles.cardSection,
    variant === 'outlined' && styles.cardOutlined,
    variant === 'filled' && styles.cardFilled,
    variant === 'transparent' && styles.cardTransparent,
    disabled && styles.cardDisabled,
    style,
  ];

  if (onPress && !disabled) {
    return (
      <Pressable
        style={({ pressed }) => [
          ...cardStyles,
          pressed && styles.cardPressed,
        ]}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyles}>{children}</View>;
};

/**
 * Section Card - 토스 스타일 섹션 컨테이너
 */
export const SectionCard = ({
  children,
  title,
  subtitle,
  action,
  style,
}) => {
  return (
    <View style={[styles.sectionCard, style]}>
      {(title || action) && (
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            {title && <Text style={styles.sectionTitle}>{title}</Text>}
            {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
          </View>
          {action && <View>{action}</View>}
        </View>
      )}
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
};

/**
 * Card Header Component - 토스 스타일
 */
export const CardHeader = ({
  title,
  subtitle,
  action,
  avatar,
  avatarSize = 'base',
  style,
}) => {
  const avatarSizeValue = theme.layout.avatarSize[avatarSize] || 40;

  return (
    <View style={[styles.cardHeader, style]}>
      {avatar && (
        <View style={[
          styles.cardAvatar,
          { width: avatarSizeValue, height: avatarSizeValue, borderRadius: avatarSizeValue / 2 }
        ]}>
          {typeof avatar === 'string' ? (
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
          ) : (
            avatar
          )}
        </View>
      )}

      <View style={styles.cardHeaderContent}>
        {title && <Text style={styles.cardTitle}>{title}</Text>}
        {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
      </View>

      {action && <View style={styles.cardAction}>{action}</View>}
    </View>
  );
};

/**
 * Card Body Component
 */
export const CardBody = ({ children, style, noPadding = false }) => {
  return (
    <View style={[
      styles.cardBody,
      noPadding && { padding: 0 },
      style
    ]}>
      {children}
    </View>
  );
};

/**
 * Card Footer Component
 */
export const CardFooter = ({ children, style, separated = false }) => {
  return (
    <View style={[
      styles.cardFooter,
      separated && styles.cardFooterSeparated,
      style
    ]}>
      {children}
    </View>
  );
};

/**
 * Card Image Component
 */
export const CardImage = ({ source, height = 200, resizeMode = 'cover', style, borderRadius = true }) => {
  return (
    <Image
      source={source}
      style={[
        styles.cardImage,
        { height },
        borderRadius && styles.cardImageRounded,
        style
      ]}
      resizeMode={resizeMode}
    />
  );
};

/**
 * Card Divider Component - 토스 스타일
 */
export const CardDivider = ({ style, inset = false }) => {
  return (
    <View style={[
      styles.cardDivider,
      inset && styles.cardDividerInset,
      style
    ]} />
  );
};

/**
 * List Item Card - 토스 스타일 리스트 아이템
 */
export const ListItem = ({
  title,
  subtitle,
  description,
  left,
  right,
  onPress,
  showChevron = false,
  style,
}) => {
  const content = (
    <View style={[styles.listItem, style]}>
      {left && <View style={styles.listItemLeft}>{left}</View>}

      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.listItemSubtitle}>{subtitle}</Text>}
        {description && <Text style={styles.listItemDescription}>{description}</Text>}
      </View>

      {(right || showChevron) && (
        <View style={styles.listItemRight}>
          {right}
          {showChevron && <Text style={styles.chevron}>›</Text>}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [pressed && styles.listItemPressed]}
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

/**
 * Stock Card Component - 토스증권 스타일
 */
export const StockCard = ({
  stockName,
  ticker,
  username,
  profileImage,
  currentPrice,
  priceChange,
  priceChangePercent,
  marketCap,
  volume,
  onPress,
  style,
  compact = false,
}) => {
  const isPositive = priceChange >= 0;
  const changeColor = isPositive ? theme.colors.stockUp : theme.colors.stockDown;
  const changeBgColor = isPositive ? theme.colors.stockUpBackground : theme.colors.stockDownBackground;

  if (compact) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.stockCardCompact,
          pressed && styles.cardPressed,
          style
        ]}
        onPress={onPress}
      >
        <View style={styles.stockCardCompactLeft}>
          {profileImage && (
            <Image source={{ uri: profileImage }} style={styles.stockAvatar} />
          )}
          <View>
            <Text style={styles.stockName}>{stockName}</Text>
            <Text style={styles.stockTicker}>{ticker || `@${username}`}</Text>
          </View>
        </View>
        <View style={styles.stockCardCompactRight}>
          <Text style={styles.stockPriceCompact}>{currentPrice?.toLocaleString()} P</Text>
          <Text style={[styles.stockChangeCompact, { color: changeColor }]}>
            {isPositive ? '+' : ''}{priceChangePercent?.toFixed(2)}%
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Card variant="elevated" onPress={onPress} style={[styles.stockCard, style]}>
      <View style={styles.stockCardHeader}>
        {profileImage && (
          <Image source={{ uri: profileImage }} style={styles.stockAvatarLarge} />
        )}
        <View style={styles.stockCardHeaderInfo}>
          <Text style={styles.stockNameLarge}>{stockName}</Text>
          <Text style={styles.stockTickerLarge}>{ticker || `@${username}`}</Text>
        </View>
      </View>

      <View style={styles.stockPriceSection}>
        <Text style={styles.stockPriceLarge}>{currentPrice?.toLocaleString()} P</Text>
        <View style={[styles.stockChangeBadge, { backgroundColor: changeBgColor }]}>
          <Text style={[styles.stockChangeText, { color: changeColor }]}>
            {isPositive ? '+' : ''}{priceChange?.toLocaleString()} ({isPositive ? '+' : ''}{priceChangePercent?.toFixed(2)}%)
          </Text>
        </View>
      </View>

      {(marketCap !== undefined || volume !== undefined) && (
        <View style={styles.stockMetaSection}>
          {marketCap !== undefined && (
            <View style={styles.stockMetaItem}>
              <Text style={styles.stockMetaLabel}>시가총액</Text>
              <Text style={styles.stockMetaValue}>{marketCap?.toLocaleString()} P</Text>
            </View>
          )}
          {volume !== undefined && (
            <View style={styles.stockMetaItem}>
              <Text style={styles.stockMetaLabel}>거래량</Text>
              <Text style={styles.stockMetaValue}>{volume?.toLocaleString()}</Text>
            </View>
          )}
        </View>
      )}
    </Card>
  );
};

/**
 * Post Card Component - 토스피드 스타일
 */
export const PostCard = ({
  username,
  profileImage,
  timeAgo,
  content,
  images,
  likes,
  comments,
  shares,
  isLiked,
  onPress,
  onLike,
  onComment,
  onShare,
  onProfile,
  style,
}) => {
  return (
    <Card variant="default" style={[styles.postCard, style]}>
      <Pressable
        style={({ pressed }) => [styles.postHeader, pressed && styles.listItemPressed]}
        onPress={onProfile}
      >
        {profileImage && (
          <Image source={{ uri: profileImage }} style={styles.postAvatar} />
        )}
        <View style={styles.postHeaderInfo}>
          <Text style={styles.postUsername}>{username}</Text>
          <Text style={styles.postTime}>{timeAgo}</Text>
        </View>
      </Pressable>

      <Pressable onPress={onPress}>
        <Text style={styles.postContent}>{content}</Text>

        {images && images.length > 0 && (
          <View style={styles.postImages}>
            {images.length === 1 ? (
              <Image
                source={{ uri: images[0] }}
                style={styles.postImageSingle}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.postImageGrid}>
                {images.slice(0, 4).map((img, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: img }}
                    style={[
                      styles.postImageGridItem,
                      images.length === 2 && { width: '49%' },
                      images.length === 3 && idx === 0 && { width: '100%', height: 180 },
                    ]}
                    resizeMode="cover"
                  />
                ))}
                {images.length > 4 && (
                  <View style={styles.postImageOverlay}>
                    <Text style={styles.postImageOverlayText}>+{images.length - 4}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </Pressable>

      <View style={styles.postActions}>
        <Pressable
          style={({ pressed }) => [styles.postActionButton, pressed && styles.postActionPressed]}
          onPress={onLike}
        >
          <Text style={[styles.postActionIcon, isLiked && styles.postActionIconActive]}>
            {isLiked ? '❤️' : '🤍'}
          </Text>
          <Text style={[styles.postActionText, isLiked && styles.postActionTextActive]}>
            {likes || 0}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.postActionButton, pressed && styles.postActionPressed]}
          onPress={onComment}
        >
          <Ionicons name="chatbubble-outline" style={styles.postActionIcon} />
          <Text style={styles.postActionText}>{comments || 0}</Text>
        </Pressable>

        {onShare && (
          <Pressable
            style={({ pressed }) => [styles.postActionButton, pressed && styles.postActionPressed]}
            onPress={onShare}
          >
            <Ionicons name="arrow-up-outline" style={styles.postActionIcon} />
            <Text style={styles.postActionText}>{shares || '공유'}</Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
};

/**
 * Stats Card - 토스 스타일 통계 카드
 */
export const StatsCard = ({
  label,
  value,
  subValue,
  trend,
  trendValue,
  icon,
  onPress,
  style,
}) => {
  const trendColor = trend === 'up' ? theme.colors.stockUp :
                     trend === 'down' ? theme.colors.stockDown :
                     theme.colors.textSecondary;

  return (
    <Card variant="default" onPress={onPress} style={[styles.statsCard, style]}>
      {icon && <View style={styles.statsIcon}>{icon}</View>}
      <Text style={styles.statsLabel}>{label}</Text>
      <Text style={styles.statsValue}>{value}</Text>
      {(subValue || trendValue) && (
        <View style={styles.statsSubRow}>
          {subValue && <Text style={styles.statsSubValue}>{subValue}</Text>}
          {trendValue && (
            <Text style={[styles.statsTrend, { color: trendColor }]}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''} {trendValue}
            </Text>
          )}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  // Base Card Styles - 토스 스타일
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  cardElevated: {
    ...theme.shadows.card,
  },
  cardSection: {
    borderRadius: 0,
    marginTop: theme.spacing.sm,
  },
  cardOutlined: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardFilled: {
    backgroundColor: theme.colors.gray50,
  },
  cardTransparent: {
    backgroundColor: 'transparent',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardPressed: {
    opacity: 0.9,
    backgroundColor: theme.colors.gray50,
  },

  // Section Card - 토스 스타일
  sectionCard: {
    backgroundColor: theme.colors.white,
    marginTop: theme.spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  sectionContent: {
    paddingBottom: theme.spacing.base,
  },

  // Card Header - 토스 스타일
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.base,
  },
  cardAvatar: {
    overflow: 'hidden',
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.gray100,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cardHeaderContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  cardAction: {
    marginLeft: theme.spacing.sm,
  },

  // Card Body
  cardBody: {
    padding: theme.spacing.base,
  },

  // Card Footer
  cardFooter: {
    padding: theme.spacing.base,
  },
  cardFooterSeparated: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },

  // Card Image
  cardImage: {
    width: '100%',
  },
  cardImageRounded: {
    borderRadius: theme.borderRadius.sm,
  },

  // Card Divider - 토스 스타일
  cardDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
  },
  cardDividerInset: {
    marginLeft: theme.spacing.lg,
  },

  // List Item - 토스 스타일
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.base,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.white,
  },
  listItemPressed: {
    backgroundColor: theme.colors.gray50,
  },
  listItemLeft: {
    marginRight: theme.spacing.base,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  listItemSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  listItemDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
  },
  listItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  chevron: {
    fontSize: 20,
    color: theme.colors.textTertiary,
    marginLeft: theme.spacing.xs,
  },

  // Stock Card - 토스증권 스타일
  stockCard: {
    padding: theme.spacing.lg,
  },
  stockCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.base,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.white,
  },
  stockCardCompactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockCardCompactRight: {
    alignItems: 'flex-end',
  },
  stockAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.gray100,
  },
  stockAvatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: theme.spacing.base,
    backgroundColor: theme.colors.gray100,
  },
  stockName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  stockNameLarge: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  stockTicker: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  stockTickerLarge: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  stockPriceCompact: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  stockChangeCompact: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    marginTop: 2,
  },
  stockCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  stockCardHeaderInfo: {
    flex: 1,
  },
  stockPriceSection: {
    marginBottom: theme.spacing.base,
  },
  stockPriceLarge: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  stockChangeBadge: {
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.sm,
  },
  stockChangeText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  stockMetaSection: {
    flexDirection: 'row',
    paddingTop: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  stockMetaItem: {
    flex: 1,
  },
  stockMetaLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  stockMetaValue: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },

  // Post Card - 토스피드 스타일
  postCard: {
    padding: theme.spacing.base,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.gray100,
  },
  postHeaderInfo: {
    flex: 1,
  },
  postUsername: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  postTime: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  postContent: {
    fontSize: theme.typography.fontSize.base,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  postImages: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.base,
    overflow: 'hidden',
  },
  postImageSingle: {
    width: '100%',
    height: 250,
    borderRadius: theme.borderRadius.base,
  },
  postImageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  postImageGridItem: {
    width: '49%',
    height: 120,
    borderRadius: theme.borderRadius.sm,
  },
  postImageOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '49%',
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  postImageOverlayText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },
  postActions: {
    flexDirection: 'row',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  postActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.xl,
    paddingVertical: theme.spacing.xs,
  },
  postActionPressed: {
    opacity: 0.7,
  },
  postActionIcon: {
    fontSize: 16,
    marginRight: theme.spacing.xs,
  },
  postActionIconActive: {
    color: theme.colors.stockUp,
  },
  postActionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  postActionTextActive: {
    color: theme.colors.stockUp,
  },

  // Stats Card - 토스 스타일
  statsCard: {
    padding: theme.spacing.lg,
    alignItems: 'flex-start',
  },
  statsIcon: {
    marginBottom: theme.spacing.md,
  },
  statsLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  statsValue: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  statsSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  statsSubValue: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    marginRight: theme.spacing.sm,
  },
  statsTrend: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
});

export default Card;
