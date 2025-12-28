import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Button from './Button';
import theme from '../styles/theme';

/**
 * EmptyState Component
 *
 * Displays empty state with:
 * - Customizable icon/illustration
 * - Title and description
 * - Optional action button
 * - Multiple variants for different scenarios
 */
const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default',
  style,
}) => {
  const getDefaultContent = () => {
    switch (variant) {
      case 'no-posts':
        return {
          icon: '📝',
          title: '아직 게시물이 없어요',
          description: '첫 번째 게시물을 작성해보세요',
        };
      case 'no-stocks':
        return {
          icon: '📈',
          title: '보유 주식이 없어요',
          description: '관심있는 크리에이터의 주식을 구매해보세요',
        };
      case 'no-followers':
        return {
          icon: '👥',
          title: '팔로워가 없어요',
          description: '친구들을 초대해보세요',
        };
      case 'no-notifications':
        return {
          icon: '🔔',
          title: '알림이 없어요',
          description: '새로운 알림이 도착하면 여기에 표시됩니다',
        };
      case 'no-messages':
        return {
          icon: '💬',
          title: '메시지가 없어요',
          description: '친구들과 대화를 시작해보세요',
        };
      case 'no-search-results':
        return {
          icon: '🔍',
          title: '검색 결과가 없어요',
          description: '다른 키워드로 다시 검색해보세요',
        };
      case 'no-connection':
        return {
          icon: '📡',
          title: '연결 오류',
          description: '인터넷 연결을 확인해주세요',
        };
      default:
        return {
          icon: '📭',
          title: '표시할 내용이 없어요',
          description: '',
        };
    }
  };

  const defaultContent = getDefaultContent();
  const finalIcon = icon || defaultContent.icon;
  const finalTitle = title || defaultContent.title;
  const finalDescription = description || defaultContent.description;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        {typeof finalIcon === 'string' ? (
          <Text style={styles.emoji}>{finalIcon}</Text>
        ) : (
          finalIcon
        )}

        <Text style={styles.title}>{finalTitle}</Text>

        {finalDescription && (
          <Text style={styles.description}>{finalDescription}</Text>
        )}

        {actionLabel && onAction && (
          <Button
            variant="primary"
            size="lg"
            onPress={onAction}
            style={styles.actionButton}
          >
            {actionLabel}
          </Button>
        )}
      </View>
    </View>
  );
};

/**
 * ErrorState Component
 *
 * Displays error state with retry option
 */
export const ErrorState = ({
  title = '문제가 발생했어요',
  description = '일시적인 오류입니다. 다시 시도해주세요.',
  onRetry,
  retryLabel = '다시 시도',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>😢</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        {onRetry && (
          <Button
            variant="primary"
            size="lg"
            onPress={onRetry}
            style={styles.actionButton}
          >
            {retryLabel}
          </Button>
        )}
      </View>
    </View>
  );
};

/**
 * LoadingState Component
 *
 * Displays loading state with message
 */
export const LoadingState = ({
  message = '로딩 중...',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>⏳</Text>
        <Text style={styles.title}>{message}</Text>
      </View>
    </View>
  );
};

/**
 * MaintenanceState Component
 *
 * Displays maintenance mode message
 */
export const MaintenanceState = ({
  title = '서비스 점검 중',
  description = '더 나은 서비스를 위해 점검 중입니다.\n잠시 후 다시 이용해주세요.',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🔧</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing['2xl'],
    backgroundColor: theme.colors.background,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  emoji: {
    fontSize: 64,
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  actionButton: {
    marginTop: theme.spacing.md,
    minWidth: 160,
  },
});

export default EmptyState;
