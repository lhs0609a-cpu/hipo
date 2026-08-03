import React, { useState, useEffect, useCallback } from 'react';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { preIPOAPI } from '../services/api';

const TABS = [
  { key: 'active', label: '진행 중' },
  { key: 'approved', label: '예정' },
  { key: 'completed', label: '완료' },
];

export default function PreIPOListScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const [activeTab, setActiveTab] = useState('active');
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchRounds = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setPage(1);
      }

      const currentPage = isRefresh ? 1 : page;
      const response = await preIPOAPI.getRounds({
        status: activeTab,
        page: currentPage,
        limit: 20,
      });

      if (response.data.success) {
        const newRounds = response.data.rounds || [];
        if (isRefresh || currentPage === 1) {
          setRounds(newRounds);
        } else {
          setRounds(prev => [...prev, ...newRounds]);
        }
        setHasMore(newRounds.length === 20);
      }
    } catch (error) {
      console.error('Pre-IPO 목록 조회 오류:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchRounds(true);
  }, [activeTab]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      fetchRounds();
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toLocaleString('ko-KR');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getProgressPercentage = (round) => {
    if (!round.totalShares || round.totalShares === 0) return 0;
    return Math.round((round.soldShares / round.totalShares) * 100);
  };

  const getTimeRemaining = (endAt) => {
    if (!endAt) return '-';
    const now = new Date();
    const end = new Date(endAt);
    const diff = end - now;

    if (diff <= 0) return '마감';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}일 남음`;
    if (hours > 0) return `${hours}시간 남음`;
    return '곧 마감';
  };

  const getEligibilityBadge = (type) => {
    const badges = {
      public: { text: '전체 공개', color: '#00B368' },
      followers_only: { text: '팔로워 전용', color: '#2B5FE3' },
      vip_only: { text: 'VIP 전용', color: '#8B5CF6' },
      invited_only: { text: '초대 전용', color: '#F59B00' },
    };
    return badges[type] || { text: type, color: '#666' };
  };

  const renderRoundCard = ({ item: round }) => {
    const progress = getProgressPercentage(round);
    const badge = getEligibilityBadge(round.eligibilityType);

    return (
      <TouchableOpacity
        style={styles.roundCard}
        onPress={() => navigation.navigate('PreIPODetail', { roundId: round.id })}
      >
        {/* 헤더 */}
        <View style={styles.cardHeader}>
          <View style={styles.issuerInfo}>
            <Image
              source={{
                uri: round.issuer?.profileImage || 'https://via.placeholder.com/50',
              }}
              style={styles.issuerAvatar}
            />
            <View>
              <Text style={styles.issuerName}>{round.issuer?.displayName || '알 수 없음'}</Text>
              <Text style={styles.roundName}>{round.roundName}</Text>
            </View>
          </View>
          <View style={[styles.eligibilityBadge, { backgroundColor: badge.color + '20' }]}>
            <Text style={[styles.eligibilityText, { color: badge.color }]}>{badge.text}</Text>
          </View>
        </View>

        {/* 설명 */}
        {round.description && (
          <Text style={styles.description} numberOfLines={2}>
            {round.description}
          </Text>
        )}

        {/* 가격 정보 */}
        <View style={styles.priceSection}>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Pre-IPO 가격</Text>
            <Text style={styles.priceValue}>{formatNumber(round.pricePerShare)}원</Text>
          </View>
          {round.expectedIPOPrice && (
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>예상 공모가</Text>
              <Text style={styles.expectedPrice}>{formatNumber(round.expectedIPOPrice)}원</Text>
            </View>
          )}
          {round.discountRate && (
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>할인율</Text>
              <Text style={styles.discountRate}>-{round.discountRate}%</Text>
            </View>
          )}
        </View>

        {/* 진행률 */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              {formatNumber(round.soldShares)} / {formatNumber(round.totalShares)}주
            </Text>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={['#00B368', '#00B368']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]}
            />
          </View>
        </View>

        {/* 푸터 */}
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>투자자</Text>
            <Text style={styles.footerValue}>{round.currentInvestors || 0}명</Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>모금액</Text>
            <Text style={styles.footerValue}>{formatNumber(round.totalRaised)}원</Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>기간</Text>
            <Text style={styles.footerValue}>
              {formatDate(round.startAt)} ~ {formatDate(round.endAt)}
            </Text>
          </View>
          <View style={styles.timeRemaining}>
            <Text style={styles.timeRemainingText}>{getTimeRemaining(round.endAt)}</Text>
          </View>
        </View>

        {/* 얼리버드 배지 */}
        {round.earlyBirdBonus > 0 && round.earlyBirdLimit > round.currentInvestors && (
          <View style={styles.earlyBirdBadge}>
            <Text style={styles.earlyBirdText}>
              얼리버드 +{round.earlyBirdBonus}% 할인
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>
        {activeTab === 'active' ? '💎' : activeTab === 'approved' ? '📅' : '✅'}
      </Text>
      <Text style={styles.emptyTitle}>
        {activeTab === 'active' && '진행 중인 Pre-IPO가 없습니다'}
        {activeTab === 'approved' && '예정된 Pre-IPO가 없습니다'}
        {activeTab === 'completed' && '완료된 Pre-IPO가 없습니다'}
      </Text>
      <Text style={styles.emptySubtitle}>
        곧 새로운 투자 기회가 열립니다
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pre-IPO</Text>
        <TouchableOpacity
          style={styles.myInvestButton}
          onPress={() => navigation.navigate('MyPreIPOInvestments')}
        >
          <Text style={styles.myInvestButtonText}>내 투자</Text>
        </TouchableOpacity>
      </View>

      {/* 설명 배너 */}
      <LinearGradient
        colors={['#182F68', '#183580']}
        style={styles.infoBanner}
      >
        <Text style={styles.infoBannerTitle}>상장 전 선투자</Text>
        <Text style={styles.infoBannerDesc}>
          IPO 전 할인된 가격으로 먼저 투자하세요!
        </Text>
      </LinearGradient>

      {/* 탭 */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 목록 */}
      {loading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00B368" />
        </View>
      ) : (
        <FlatList
          data={rounds}
          renderItem={renderRoundCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchRounds(true)}
              tintColor="#00B368"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={
            loading && page > 1 ? (
              <ActivityIndicator size="small" color="#00B368" style={styles.footerLoader} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.backgroundPure,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  myInvestButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#333',
    borderRadius: 16,
  },
  myInvestButtonText: {
    color: t.colors.success,
    fontSize: 14,
    fontWeight: '600',
  },
  infoBanner: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  infoBannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  infoBannerDesc: {
    fontSize: 14,
    color: '#91B8FB',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: t.colors.success,
  },
  tabText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  activeTabText: {
    color: t.colors.success,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  roundCard: {
    backgroundColor: t.colors.textPrimary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  issuerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  issuerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#333',
  },
  issuerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  roundName: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  eligibilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eligibilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 12,
    lineHeight: 20,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  priceItem: {
    alignItems: 'center',
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  expectedPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
    textDecorationLine: 'line-through',
  },
  discountRate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: t.colors.error,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: '#888',
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: 'bold',
    color: t.colors.success,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  footerItem: {
    marginRight: 16,
  },
  footerLabel: {
    fontSize: 11,
    color: '#666',
  },
  footerValue: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  timeRemaining: {
    marginLeft: 'auto',
    backgroundColor: '#4CAF5020',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeRemainingText: {
    fontSize: 12,
    color: t.colors.success,
    fontWeight: '600',
  },
  earlyBirdBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: t.colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
  },
  earlyBirdText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
  },
  footerLoader: {
    paddingVertical: 16,
  },
});
