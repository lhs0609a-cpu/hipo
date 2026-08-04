import React, { useState, useEffect, useCallback } from 'react';
import useThemedStyles from '../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { friendRankingAPI, earlyBirdAPI } from '../services/api';

const FriendRankingScreen = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rankings, setRankings] = useState([]);
  const [earlyBirdBadges, setEarlyBirdBadges] = useState([]);
  const [activeTab, setActiveTab] = useState('ranking');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rankingRes, badgesRes] = await Promise.all([
        friendRankingAPI.getRanking(),
        earlyBirdAPI.getMyBadges(),
      ]);
      setRankings(rankingRes.data.rankings || []);
      setEarlyBirdBadges(badgesRes.data.badges || []);
    } catch (error) {
      console.error('Error fetching friend ranking:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toLocaleString();
  };

  const formatPercent = (num) => {
    if (!num && num !== 0) return '0%';
    const prefix = num >= 0 ? '+' : '';
    return `${prefix}${parseFloat(num).toFixed(2)}%`;
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return { icon: 'trophy', color: '#D9A521', label: '1위' };
    if (rank === 2) return { icon: 'medal', color: '#9BA3AF', label: '2위' };
    if (rank === 3) return { icon: 'medal', color: '#B87333', label: '3위' };
    return { icon: null, color: '#666', label: `${rank}위` };
  };

  const renderRankingItem = ({ item, index }) => {
    const badge = getRankBadge(item.rank);

    return (
      <TouchableOpacity
        style={[styles.rankingItem, item.isMe && styles.myRankItem]}
        onPress={() => item.user?.id && navigation.navigate('Profile', { userId: item.user.id })}
      >
        {/* 순위 */}
        <View style={styles.rankSection}>
          {badge.icon ? (
            <Ionicons name={badge.icon} size={28} color={badge.color} />
          ) : (
            <Text style={styles.rankNumber}>{item.rank}</Text>
          )}
        </View>

        {/* 프로필 */}
        <View style={styles.profileSection}>
          {item.user?.profileImage ? (
            <Image source={{ uri: item.user.profileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {item.user?.username?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.username}>{item.user?.username}</Text>
              {item.isMe && (
                <View style={styles.meBadge}>
                  <Text style={styles.meBadgeText}>나</Text>
                </View>
              )}
            </View>
            <Text style={styles.investedAmount}>
              투자금: {formatNumber(item.totalInvested)} PO
            </Text>
          </View>
        </View>

        {/* 수익률 */}
        <View style={styles.profitSection}>
          <Text style={[
            styles.profitPercent,
            item.profitPercent >= 0 ? styles.profit : styles.loss,
          ]}>
            {formatPercent(item.profitPercent)}
          </Text>
          <Text style={[
            styles.profitAmount,
            item.profit >= 0 ? styles.profit : styles.loss,
          ]}>
            {item.profit >= 0 ? '+' : ''}{formatNumber(item.profit)} PO
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderBadgeItem = ({ item }) => (
    <View style={styles.badgeItem}>
      <View style={[styles.badgeIcon, { backgroundColor: item.color + '20' }]}>
        <Ionicons name="ribbon" size={32} color={item.color} />
      </View>
      <View style={styles.badgeInfo}>
        <Text style={styles.badgeName}>{item.name}</Text>
        <Text style={styles.badgeDesc}>{item.description}</Text>
        <Text style={styles.badgeDate}>
          {new Date(item.earnedAt).toLocaleDateString('ko-KR')} 획득
        </Text>
      </View>
    </View>
  );

  const renderHeader = () => {
    // 내 정보 찾기
    const myRank = rankings.find(r => r.isMe);

    if (!myRank) return null;

    return (
      <View style={styles.myRankCard}>
        <View style={styles.myRankHeader}>
          <Text style={styles.myRankLabel}>내 순위</Text>
          <View style={styles.myRankBadge}>
            {myRank.rank <= 3 ? (
              <Ionicons
                name={getRankBadge(myRank.rank).icon}
                size={24}
                color={getRankBadge(myRank.rank).color}
              />
            ) : null}
            <Text style={styles.myRankNumber}>{myRank.rank}위</Text>
          </View>
        </View>

        <View style={styles.myRankStats}>
          <View style={styles.myRankStatItem}>
            <Text style={styles.myRankStatLabel}>총 투자금</Text>
            <Text style={styles.myRankStatValue}>
              {formatNumber(myRank.totalInvested)} PO
            </Text>
          </View>
          <View style={styles.myRankStatItem}>
            <Text style={styles.myRankStatLabel}>평가금</Text>
            <Text style={styles.myRankStatValue}>
              {formatNumber(myRank.currentValue)} PO
            </Text>
          </View>
          <View style={styles.myRankStatItem}>
            <Text style={styles.myRankStatLabel}>수익률</Text>
            <Text style={[
              styles.myRankProfitValue,
              myRank.profitPercent >= 0 ? styles.profit : styles.loss,
            ]}>
              {formatPercent(myRank.profitPercent)}
            </Text>
          </View>
        </View>
      </View>
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>친구 랭킹</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 탭 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ranking' && styles.activeTab]}
          onPress={() => setActiveTab('ranking')}
        >
          <Ionicons
            name="podium"
            size={20}
            color={activeTab === 'ranking' ? '#2B5FE3' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'ranking' && styles.activeTabText]}>
            수익률 랭킹
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'badges' && styles.activeTab]}
          onPress={() => setActiveTab('badges')}
        >
          <Ionicons
            name="ribbon"
            size={20}
            color={activeTab === 'badges' ? '#2B5FE3' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'badges' && styles.activeTabText]}>
            얼리버드 뱃지
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'ranking' ? (
        <FlatList
          data={rankings}
          renderItem={renderRankingItem}
          keyExtractor={(item) => item.user?.id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>친구를 초대해서 함께 경쟁해보세요!</Text>
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={() => navigation.navigate('Invite')}
              >
                <Ionicons name="person-add" size={20} color="#fff" />
                <Text style={styles.inviteButtonText}>친구 초대하기</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          data={earlyBirdBadges}
          renderItem={renderBadgeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="ribbon-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>아직 획득한 얼리버드 뱃지가 없습니다</Text>
              <Text style={styles.emptySubtext}>
                크리에이터의 초기 100명 투자자가 되면{'\n'}
                특별한 얼리버드 뱃지를 받을 수 있어요!
              </Text>
            </View>
          }
          ListHeaderComponent={
            earlyBirdBadges.length > 0 ? (
              <View style={styles.badgeHeader}>
                <Text style={styles.badgeHeaderTitle}>
                  획득한 뱃지 {earlyBirdBadges.length}개
                </Text>
                <Text style={styles.badgeHeaderDesc}>
                  초기 투자자로서 특별한 혜택을 받을 수 있어요
                </Text>
              </View>
            ) : null
          }
        />
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: t.colors.surface,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.backgroundSecondary,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: t.colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    color: t.colors.textTertiary,
    fontWeight: '600',
  },
  activeTabText: {
    color: t.colors.primary,
  },
  listContent: {
    padding: 16,
  },
  myRankCard: {
    backgroundColor: t.colors.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  myRankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  myRankLabel: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: 'rgba(255,255,255,0.8)',
  },
  myRankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  myRankNumber: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.surface,
  },
  myRankStats: {
    flexDirection: 'row',
  },
  myRankStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  myRankStatLabel: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  myRankStatValue: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.surface,
  },
  myRankProfitValue: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  profit: {
    color: t.colors.error,
  },
  loss: {
    color: t.colors.primaryDark,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  myRankItem: {
    backgroundColor: t.colors.primaryBackground,
    borderWidth: 1,
    borderColor: t.colors.primary,
  },
  rankSection: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textSecondary,
  },
  profileSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.surface,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  username: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  meBadge: {
    backgroundColor: t.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  meBadgeText: {
    fontSize: 11,
    fontFamily: t.fonts.semibold,
    color: t.colors.surface,
    fontWeight: '600',
  },
  investedAmount: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  profitSection: {
    alignItems: 'flex-end',
  },
  profitPercent: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    marginBottom: 2,
  },
  profitAmount: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
  },
  badgeHeader: {
    marginBottom: 16,
  },
  badgeHeaderTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    marginBottom: 4,
  },
  badgeHeaderDesc: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  badgeItem: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  badgeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  badgeInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeName: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    marginBottom: 4,
  },
  badgeDesc: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginBottom: 4,
  },
  badgeDate: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.borderDark,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  inviteButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    color: t.colors.surface,
    fontWeight: '600',
  },
});

export default FriendRankingScreen;
