import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

/**
 * Card Component Library
 *
 * Provides consistent card UI across the app with:
 * - Multiple variants (default, elevated, outlined, filled)
 * - Flexible layouts (vertical, horizontal)
 * - Built-in sections (header, body, footer, image)
 * - Consistent spacing and shadows
 */

/**
 * Base Card Component
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
    variant === 'outlined' && styles.cardOutlined,
    variant === 'filled' && styles.cardFilled,
    disabled && styles.cardDisabled,
    style,
  ];

  if (onPress && !disabled) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
};

/**
 * Card Header Component
 */
export const CardHeader = ({
  title,
  subtitle,
  action,
  avatar,
  style,
}) => {
  return (
    <View style={[styles.cardHeader, style]}>
      {avatar && (
        <View style={styles.cardAvatar}>
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
export const CardBody = ({ children, style }) => {
  return <View style={[styles.cardBody, style]}>{children}</View>;
};

/**
 * Card Footer Component
 */
export const CardFooter = ({ children, style, separated = false }) => {
  return (
    <View style={[styles.cardFooter, separated && styles.cardFooterSeparated, style]}>
      {children}
    </View>
  );
};

/**
 * Card Image Component
 */
export const CardImage = ({ source, height = 200, resizeMode = 'cover', style }) => {
  return (
    <Image
      source={source}
      style={[styles.cardImage, { height }, style]}
      resizeMode={resizeMode}
    />
  );
};

/**
 * Card Divider Component
 */
export const CardDivider = ({ style }) => {
  return <View style={[styles.cardDivider, style]} />;
};

/**
 * Stock Card Component (Specialized)
 */
export const StockCard = ({
  stockName,
  username,
  profileImage,
  currentPrice,
  priceChange,
  priceChangePercent,
  marketCap,
  onPress,
  style,
}) => {
  const isPositive = priceChange >= 0;

  return (
    <Card variant="elevated" onPress={onPress} style={style}>
      <CardHeader
        title={stockName}
        subtitle={`@${username}`}
        avatar={profileImage}
      />
      <CardDivider />
      <CardBody>
        <View style={styles.stockPriceRow}>
          <Text style={styles.stockPrice}>{currentPrice?.toLocaleString()} PO</Text>
          <View style={[styles.stockChange, isPositive ? styles.stockChangePositive : styles.stockChangeNegative]}>
            <Text style={[styles.stockChangeText, isPositive ? styles.stockChangeTextPositive : styles.stockChangeTextNegative]}>
              {isPositive ? '+' : ''}{priceChange?.toLocaleString()} ({isPositive ? '+' : ''}{priceChangePercent?.toFixed(2)}%)
            </Text>
          </View>
        </View>
        {marketCap !== undefined && (
          <Text style={styles.stockMarketCap}>시가총액: {marketCap?.toLocaleString()} PO</Text>
        )}
      </CardBody>
    </Card>
  );
};

/**
 * Post Card Component (Specialized)
 */
export const PostCard = ({
  username,
  profileImage,
  timeAgo,
  content,
  images,
  likes,
  comments,
  onPress,
  onLike,
  onComment,
  style,
}) => {
  return (
    <Card variant="default" onPress={onPress} style={style}>
      <CardHeader
        title={username}
        subtitle={timeAgo}
        avatar={profileImage}
      />
      <CardBody>
        <Text style={styles.postContent}>{content}</Text>
        {images && images.length > 0 && (
          <View style={styles.postImages}>
            {images.slice(0, 4).map((img, idx) => (
              <CardImage
                key={idx}
                source={{ uri: img }}
                height={images.length === 1 ? 300 : 150}
              />
            ))}
          </View>
        )}
      </CardBody>
      <CardFooter separated>
        <View style={styles.postActions}>
          <TouchableOpacity style={styles.postActionButton} onPress={onLike}>
            <Text style={styles.postActionText}>❤️ {likes || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.postActionButton} onPress={onComment}>
            <Text style={styles.postActionText}>💬 {comments || 0}</Text>
          </TouchableOpacity>
        </View>
      </CardFooter>
    </Card>
  );
};

const styles = StyleSheet.create({
  // Base Card Styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 6,
    overflow: 'hidden',
  },
  cardElevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardOutlined: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardFilled: {
    backgroundColor: '#f5f5f5',
  },
  cardDisabled: {
    opacity: 0.6,
  },

  // Card Header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cardHeaderContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  cardAction: {
    marginLeft: 8,
  },

  // Card Body
  cardBody: {
    padding: 16,
  },

  // Card Footer
  cardFooter: {
    padding: 16,
  },
  cardFooterSeparated: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },

  // Card Image
  cardImage: {
    width: '100%',
  },

  // Card Divider
  cardDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },

  // Stock Card Specific
  stockPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stockPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  stockChange: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  stockChangePositive: {
    backgroundColor: '#e8f5e9',
  },
  stockChangeNegative: {
    backgroundColor: '#ffebee',
  },
  stockChangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stockChangeTextPositive: {
    color: '#4caf50',
  },
  stockChangeTextNegative: {
    color: '#f44336',
  },
  stockMarketCap: {
    fontSize: 14,
    color: '#666',
  },

  // Post Card Specific
  postContent: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    marginBottom: 12,
  },
  postImages: {
    marginTop: 8,
    gap: 8,
  },
  postActions: {
    flexDirection: 'row',
    gap: 24,
  },
  postActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postActionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
});

export default Card;
