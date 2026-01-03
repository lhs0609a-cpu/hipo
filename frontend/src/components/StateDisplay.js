import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

/**
 * Empty State Component
 * 데이터가 없을 때 표시하는 컴포넌트
 */
export const EmptyState = ({
  icon = 'cube-outline',
  emoji,
  title = '데이터가 없습니다',
  description,
  actionLabel,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {emoji ? (
        <Text style={styles.emoji}>{emoji}</Text>
      ) : (
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={48} color={COLORS.gray400} />
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
        >
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Error State Component
 * 에러가 발생했을 때 표시하는 컴포넌트
 */
export const ErrorState = ({
  title = '오류가 발생했습니다',
  description = '잠시 후 다시 시도해주세요',
  onRetry,
  retryLabel = '다시 시도',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconContainer, styles.errorIconContainer]}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityLabel={retryLabel}
          accessibilityRole="button"
        >
          <Ionicons name="refresh-outline" size={18} color={COLORS.white} />
          <Text style={styles.retryButtonText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Loading State Component
 * 로딩 중일 때 표시하는 컴포넌트
 */
export const LoadingState = ({
  message = '로딩 중...',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {message && <Text style={styles.loadingText}>{message}</Text>}
    </View>
  );
};

/**
 * Network Error State Component
 * 네트워크 오류시 표시하는 컴포넌트
 */
export const NetworkErrorState = ({
  onRetry,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconContainer, styles.warningIconContainer]}>
        <Ionicons name="cloud-offline-outline" size={48} color={COLORS.warning} />
      </View>
      <Text style={styles.title}>네트워크 연결 오류</Text>
      <Text style={styles.description}>
        인터넷 연결을 확인하고 다시 시도해주세요
      </Text>
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityLabel="다시 시도"
          accessibilityRole="button"
        >
          <Ionicons name="refresh-outline" size={18} color={COLORS.white} />
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * No Results State Component
 * 검색 결과가 없을 때 표시하는 컴포넌트
 */
export const NoResultsState = ({
  searchTerm,
  onClear,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Ionicons name="search-outline" size={48} color={COLORS.gray400} />
      </View>
      <Text style={styles.title}>검색 결과 없음</Text>
      <Text style={styles.description}>
        {searchTerm
          ? `"${searchTerm}"에 대한 결과가 없습니다`
          : '검색어를 입력해주세요'}
      </Text>
      {onClear && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onClear}
          accessibilityLabel="검색어 지우기"
          accessibilityRole="button"
        >
          <Text style={styles.actionButtonText}>검색어 지우기</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 300,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorIconContainer: {
    backgroundColor: COLORS.errorBackground,
  },
  warningIconContainer: {
    backgroundColor: COLORS.warningBackground,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  actionButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
