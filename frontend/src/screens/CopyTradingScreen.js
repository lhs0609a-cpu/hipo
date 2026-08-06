import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { rankingAPI } from '../services/api';

import goBackOrHome from '../utils/goBackOrHome';
const TABS = [
  { key: 'all', label: '전체' },
  { key: 'return', label: '수익률 TOP' },
  { key: 'dividend', label: '배당 수익 TOP' },
  { key: 'followers', label: '팔로워 TOP' },
];

const RANK_GRADIENTS = {
  1: ['#D9A521', '#F59B00'],
  2: ['#9BA3AF', '#A3ABBA'],
  3: ['#B87333', '#A57C18'],
};

const TRUST_LEVEL_LABELS = {
  bronze: '브론즈',
  silver: '실버',
  gold: '골드',
  platinum: '플래티넘',
  diamond: '다이아몬드',
  master: '마스터',
  legend: '레전드',
};

function formatNumber(num) {
  if (num == null) return '0';
  return num.toLocaleString();
}

function formatReturn(value) {
  if (value == null) return '+0.00%';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function getReturnColor(value) {
  if (value == null || value === 0) return COLORS.textSecondary;
  return value > 0 ? COLORS.stockUp : COLORS.stockDown;
}

function sortInvestors(investors, tab) {
  if (!investors || investors.length === 0) return [];
  const sorted = [...investors];
  switch (tab) {
    case 'return':
      return sorted.sort((a, b) => (b.returnRate ?? 0) - (a.returnRate ?? 0));
    case 'dividend':
      return sorted.sort((a, b) => (b.dividendProfit ?? 0) - (a.dividendProfit ?? 0));
    case 'followers':
      return sorted.sort((a, b) => (b.followerCount ?? 0) - (a.followerCount ?? 0));
    default:
      return sorted;
  }
}

export default function CopyTradingScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [followingMap, setFollowingMap] = useState({});

  const loadData = useCallback(async () => {
    try {
      const response = await rankingAPI.getTopInvestors();
      const data = response.data?.investors || response.data?.data || response.data || [];
      setInvestors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('인기 투자자 로딩 오류:', error);
      setInvestors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleToggleFollow = useCallback((userId) => {
    setFollowingMap((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  }, []);

  const handleViewPortfolio = useCallback(
    (userId) => {
      navigation.navigate('UserProfile', { userId });
    },
    [navigation]
  );

  const sortedInvestors = sortInvestors(investors, activeTab);

  // --- Render Functions ---

  const renderHeader = () => (
    <SafeAreaView style={styles.headerSafeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => goBackOrHome(navigation)}
          activeOpacity={0.7}
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>인기 투자자</Text>
        <View style={styles.headerRight} />
      </View>
    </SafeAreaView>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderRankBadge = (rank) => {
    const gradientColors = RANK_GRADIENTS[rank];
    if (gradientColors) {
      return (
        <LinearGradient
          colors={gradientColors}
          style={styles.rankBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.rankBadgeText}>{rank}</Text>
        </LinearGradient>
      );
    }
    return (
      <View style={styles.rankPlain}>
        <Text style={styles.rankPlainText}>{rank}</Text>
      </View>
    );
  };

  const renderHoldingPills = (topHoldings) => {
    if (!topHoldings || topHoldings.length === 0) return null;
    return (
      <View style={styles.holdingPillsRow}>
        {topHoldings.slice(0, 3).map((holding, index) => (
          <View key={index} style={styles.holdingPill}>
            <Text style={styles.holdingPillText} numberOfLines={1}>
              {holding.stockName || holding.name || '---'}
              {holding.weight != null ? ` ${holding.weight}%` : ''}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderInvestorCard = ({ item, index }) => {
    const rank = index + 1;
    const userId = item.userId || item.id || item._id;
    const username = item.username || item.user?.username || '---';
    const displayName = item.displayName || item.user?.displayName || username;
    const firstLetter = (username.charAt(0) || '?').toUpperCase();
    const trustLevel = item.trustLevel || item.user?.trustLevel;
    const returnRate = item.returnRate ?? item.profitRate ?? 0;
    const totalProfit = item.totalProfit ?? item.dividendProfit ?? 0;
    const followerCount = item.followerCount ?? item.followers ?? 0;
    const topHoldings = item.topHoldings || item.holdings || [];
    const isFollowing = !!followingMap[userId];

    return (
      <View style={styles.card}>
        {/* Top row: Rank + Avatar + Name */}
        <View style={styles.cardTopRow}>
          {renderRankBadge(rank)}

          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{firstLetter}</Text>
          </View>

          <View style={styles.nameSection}>
            <View style={styles.nameRow}>
              <Text style={styles.username} numberOfLines={1}>
                {username}
              </Text>
              {trustLevel && (
                <View style={[styles.trustBadge, { backgroundColor: getTrustBadgeColor(trustLevel) }]}>
                  <Text style={styles.trustBadgeText}>
                    {TRUST_LEVEL_LABELS[trustLevel] || trustLevel}
                  </Text>
                </View>
              )}
            </View>
            {displayName !== username && (
              <Text style={styles.displayName} numberOfLines={1}>
                {displayName}
              </Text>
            )}
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>수익률</Text>
            <Text style={[styles.statValue, { color: getReturnColor(returnRate) }]}>
              {formatReturn(returnRate)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>총 수익</Text>
            <Text style={styles.statValue}>
              {formatNumber(totalProfit)} PO
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>팔로워</Text>
            <Text style={styles.statValue}>
              {formatNumber(followerCount)}명
            </Text>
          </View>
        </View>

        {/* Top Holdings Pills */}
        {renderHoldingPills(topHoldings)}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.viewPortfolioButton}
            onPress={() => handleViewPortfolio(userId)}
            activeOpacity={0.7}
          >
            <Ionicons name="pie-chart-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.viewPortfolioText}>포트폴리오 보기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowing ? styles.followButtonActive : styles.followButtonInactive,
            ]}
            onPress={() => handleToggleFollow(userId)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFollowing ? 'checkmark' : 'person-add-outline'}
              size={14}
              color={isFollowing ? theme.colors.white : theme.colors.primary}
            />
            <Text
              style={[
                styles.followButtonText,
                isFollowing ? styles.followButtonTextActive : styles.followButtonTextInactive,
              ]}
            >
              {isFollowing ? '팔로잉' : '팔로우'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={theme.colors.gray300} />
      <Text style={styles.emptyTitle}>아직 랭킹 데이터가 없습니다</Text>
      <Text style={styles.emptySubtitle}>
        투자자들의 활동이 쌓이면 랭킹이 표시됩니다
      </Text>
    </View>
  );

  // --- Main Render ---

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {renderHeader()}
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>인기 투자자를 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderTabs()}
      <FlatList
        data={sortedInvestors}
        keyExtractor={(item, index) =>
          item.userId || item.id || item._id || String(index)
        }
        renderItem={renderInvestorCard}
        contentContainerStyle={[
          styles.listContent,
          sortedInvestors.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />
    </View>
  );
}

function getTrustBadgeColor(level) {
  const map = {
    bronze: '#FFF6E6',
    silver: '#F1F3F7',
    gold: '#FFF6E6',
    platinum: '#F8F9FB',
    diamond: '#EEF4FF',
    master: '#FFF1F2',
    legend: '#F2EEFE',
  };
  return map[level] || theme.colors.gray100;
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },

  // Header
  headerSafeArea: {
    backgroundColor: t.colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textPrimary,
  },
  headerRight: {
    width: 40,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: t.colors.surface,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: t.colors.gray100,
  },
  tabActive: {
    backgroundColor: t.colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textSecondary,
  },
  tabTextActive: {
    color: t.colors.white,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flex: 1,
  },

  // Card
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: t.colors.border,
  },

  // Card Top Row
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  // Rank Badges
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankBadgeText: {
    fontSize: 14,
    fontFamily: t.fonts.extrabold,
    fontWeight: '800',
    color: t.colors.white,
  },
  rankPlain: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: t.colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankPlainText: {
    fontSize: 14,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textSecondary,
  },

  // Avatar
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.primary,
  },

  // Name Section
  nameSection: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textPrimary,
    flexShrink: 1,
  },
  displayName: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginTop: 2,
  },

  // Trust Badge
  trustBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  trustBadgeText: {
    fontSize: 11,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.gray700,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.gray50,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: t.fonts.medium,
    color: t.colors.textTertiary,
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textPrimary,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: t.colors.gray200,
  },

  // Holding Pills
  holdingPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  holdingPill: {
    backgroundColor: t.colors.primaryBackground,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  holdingPillText: {
    fontSize: 12,
    fontFamily: t.fonts.medium,
    fontWeight: '500',
    color: t.colors.primary,
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewPortfolioButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: t.colors.primaryBackground,
    gap: 6,
  },
  viewPortfolioText: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.primary,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 4,
  },
  followButtonActive: {
    backgroundColor: t.colors.primary,
  },
  followButtonInactive: {
    backgroundColor: t.colors.white,
    borderWidth: 1.5,
    borderColor: t.colors.primary,
  },
  followButtonText: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  followButtonTextActive: {
    color: t.colors.white,
  },
  followButtonTextInactive: {
    color: t.colors.primary,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textPrimary,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
