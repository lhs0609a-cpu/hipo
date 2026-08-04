import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import useThemedStyles from '../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { rankingAPI } from '../services/api';

const RankingScreen = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('creators');

  useEffect(() => {
    fetchRankings();
  }, [activeTab]);

  const fetchRankings = async () => {
    try {
      let response;
      if (activeTab === 'creators') {
        response = await rankingAPI.getCreatorRankings();
      } else if (activeTab === 'investors') {
        response = await rankingAPI.getTopInvestors();
      } else {
        response = await rankingAPI.getWeeklyRankings();
      }
      setRankings(response.data.rankings || []);
    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return { emoji: '🥇', color: '#D9A521' };
    if (rank === 2) return { emoji: '🥈', color: '#9BA3AF' };
    if (rank === 3) return { emoji: '🥉', color: '#B87333' };
    return { emoji: rank.toString(), color: '#666' };
  };

  const renderRankingItem = ({ item, index }) => {
    const rank = index + 1;
    const badge = getRankBadge(rank);
    const isTopThree = rank <= 3;
    const name = item.user?.displayName || item.user?.username || item.displayName || item.username || '사용자';

    return (
      <TouchableOpacity
        style={[styles.rankingItem, isTopThree && styles.topThreeItem]}
        onPress={() => navigation.navigate('UserProfile', { userId: item.userId || item.id })}
      >
        <View style={[styles.rankBadge, { backgroundColor: isTopThree ? badge.color : '#F8F9FB' }]}>
          {isTopThree ? (
            <Text style={styles.rankEmoji}>{badge.emoji}</Text>
          ) : (
            <Text style={styles.rankNumber}>{rank}</Text>
          )}
        </View>

        <View style={styles.userAvatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userStats}>
            {activeTab === 'creators'
              ? `시가총액 ${(item.marketCap || 0).toLocaleString()}원`
              : `수익률 ${(item.returnRate || 0).toFixed(2)}%`}
          </Text>
        </View>

        <View style={styles.rankValue}>
          <Text style={styles.valueText}>
            {activeTab === 'creators'
              ? `${(item.priceChange || 0) >= 0 ? '+' : ''}${(item.priceChange || 0).toFixed(2)}%`
              : `${(item.totalProfit || 0).toLocaleString()}원`}
          </Text>
          <Text style={[styles.changeText, (item.priceChange || 0) >= 0 ? styles.positive : styles.negative]}>
            {(item.priceChange || item.returnRate || 0) >= 0 ? '▲' : '▼'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B5FE3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>랭킹</Text>
        <Text style={styles.headerSubtitle}>실시간 순위</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'creators' && styles.activeTab]}
          onPress={() => setActiveTab('creators')}
        >
          <Text style={[styles.tabText, activeTab === 'creators' && styles.activeTabText]}>
            크리에이터
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'investors' && styles.activeTab]}
          onPress={() => setActiveTab('investors')}
        >
          <Text style={[styles.tabText, activeTab === 'investors' && styles.activeTabText]}>
            투자자
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'weekly' && styles.activeTab]}
          onPress={() => setActiveTab('weekly')}
        >
          <Text style={[styles.tabText, activeTab === 'weekly' && styles.activeTabText]}>
            주간
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rankings}
        renderItem={renderRankingItem}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchRankings} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" style={styles.emptyIcon} />
            <Text style={styles.emptyText}>랭킹 데이터가 없습니다</Text>
          </View>
        }
      />
    </View>
  );
};

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#7C4DEF',
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.surface,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    padding: 4,
    margin: 16,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#7C4DEF',
  },
  tabText: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textSecondary,
  },
  activeTabText: {
    color: t.colors.surface,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  topThreeItem: {
    borderWidth: 2,
    borderColor: '#D9A521',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankEmoji: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
  },
  rankNumber: {
    fontSize: 14,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.textSecondary,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7C4DEF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: t.colors.surface,
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
  },
  userStats: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginTop: 2,
  },
  rankValue: {
    alignItems: 'flex-end',
  },
  valueText: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
  },
  changeText: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    marginTop: 2,
  },
  positive: {
    color: t.colors.error,
  },
  negative: {
    color: t.colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    fontFamily: t.fonts.regular,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
});

export default RankingScreen;
