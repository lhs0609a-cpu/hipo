import React, { useState, useEffect } from 'react';
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
    if (rank === 1) return { emoji: '🥇', color: '#FFD700' };
    if (rank === 2) return { emoji: '🥈', color: '#C0C0C0' };
    if (rank === 3) return { emoji: '🥉', color: '#CD7F32' };
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
        <View style={[styles.rankBadge, { backgroundColor: isTopThree ? badge.color : '#f5f5f5' }]}>
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
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyText}>랭킹 데이터가 없습니다</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#673AB7',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
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
    backgroundColor: '#673AB7',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  topThreeItem: {
    borderWidth: 2,
    borderColor: '#FFD700',
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
    fontSize: 18,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#673AB7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  userStats: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  rankValue: {
    alignItems: 'flex-end',
  },
  valueText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  changeText: {
    fontSize: 14,
    marginTop: 2,
  },
  positive: {
    color: '#e74c3c',
  },
  negative: {
    color: '#3498db',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default RankingScreen;
