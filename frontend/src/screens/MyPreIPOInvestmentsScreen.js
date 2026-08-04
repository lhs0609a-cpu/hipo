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

const STATUS_TABS = [
  { key: 'all', label: '전체' },
  { key: 'confirmed', label: '투자 중' },
  { key: 'converted', label: '전환 완료' },
  { key: 'cancelled', label: '취소/환불' },
];

export default function MyPreIPOInvestmentsScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const [activeTab, setActiveTab] = useState('all');
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalInvested: 0,
    totalShares: 0,
    activeCount: 0,
    convertedCount: 0,
  });

  const fetchInvestments = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      const response = await preIPOAPI.getMyInvestments({
        status: activeTab === 'all' ? undefined : activeTab,
      });

      if (response.data.success) {
        setInvestments(response.data.investments || []);
        if (response.data.stats) {
          setStats(response.data.stats);
        }
      }
    } catch (error) {
      console.error('투자 목록 조회 오류:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchInvestments();
  }, [activeTab]);

  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toLocaleString('ko-KR');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      pending: { text: '확인 중', color: '#F59B00', icon: '⏳' },
      confirmed: { text: '투자 확정', color: '#00B368', icon: '✓' },
      converted: { text: 'IPO 전환', color: '#2B5FE3', icon: '🚀' },
      refunded: { text: '환불됨', color: '#7C8698', icon: '↩' },
      cancelled: { text: '취소됨', color: '#F0344B', icon: '✕' },
    };
    return statusMap[status] || { text: status, color: '#666', icon: '?' };
  };

  const getLockupStatus = (investment) => {
    if (!investment.lockupEndAt) return null;

    const now = new Date();
    const lockupEnd = new Date(investment.lockupEndAt);

    if (now >= lockupEnd) {
      return { text: '해제됨', color: '#00B368' };
    }

    const daysRemaining = Math.ceil((lockupEnd - now) / (1000 * 60 * 60 * 24));
    return { text: `${daysRemaining}일 남음`, color: '#F59B00' };
  };

  const renderInvestmentCard = ({ item: investment }) => {
    const status = getStatusInfo(investment.status);
    const lockup = getLockupStatus(investment);

    return (
      <TouchableOpacity
        style={styles.investmentCard}
        onPress={() => navigation.navigate('PreIPODetail', { roundId: investment.roundId })}
      >
        {/* 헤더 */}
        <View style={styles.cardHeader}>
          <View style={styles.issuerInfo}>
            <Image
              source={{
                uri: investment.round?.issuer?.profileImage || 'https://via.placeholder.com/50',
              }}
              style={styles.issuerAvatar}
            />
            <View>
              <Text style={styles.issuerName}>
                {investment.round?.issuer?.displayName || '알 수 없음'}
              </Text>
              <Text style={styles.roundName}>{investment.round?.roundName || 'Pre-IPO'}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <Text style={styles.statusIcon}>{status.icon}</Text>
            <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
          </View>
        </View>

        {/* 투자 정보 */}
        <View style={styles.investmentInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>투자 수량</Text>
            <Text style={styles.infoValue}>{formatNumber(investment.shares)}주</Text>
          </View>
          {investment.bonusShares > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabelBonus}>보너스 주식</Text>
              <Text style={styles.infoValueBonus}>+{formatNumber(investment.bonusShares)}주</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>최종 배정</Text>
            <Text style={styles.infoValueHighlight}>{formatNumber(investment.finalShares)}주</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>투자 금액</Text>
            <Text style={styles.infoValue}>{formatNumber(investment.totalAmount)}원</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>주당 가격</Text>
            <Text style={styles.infoValue}>{formatNumber(investment.pricePerShare)}원</Text>
          </View>
        </View>

        {/* 할인 적용 */}
        {investment.discountApplied > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {investment.isEarlyBird ? '🎁 얼리버드 ' : ''}
              {investment.discountApplied}% 할인 적용
            </Text>
          </View>
        )}

        {/* 락업 상태 */}
        {lockup && investment.status === 'confirmed' && (
          <View style={styles.lockupInfo}>
            <Text style={styles.lockupLabel}>락업 해제</Text>
            <Text style={[styles.lockupValue, { color: lockup.color }]}>{lockup.text}</Text>
          </View>
        )}

        {/* 투자 일시 */}
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>투자일: {formatDate(investment.createdAt)}</Text>
          {investment.status === 'converted' && (
            <Text style={styles.dateText}>전환일: {formatDate(investment.convertedAt)}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💎</Text>
      <Text style={styles.emptyTitle}>Pre-IPO 투자 내역이 없습니다</Text>
      <Text style={styles.emptySubtitle}>상장 전 투자 기회를 확인해보세요</Text>
      <TouchableOpacity
        style={styles.exploreButton}
        onPress={() => navigation.navigate('PreIPOList')}
      >
        <Text style={styles.exploreButtonText}>Pre-IPO 둘러보기</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 Pre-IPO 투자</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 통계 배너 */}
      <LinearGradient colors={['#182F68', '#183580']} style={styles.statsBanner}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(stats.totalInvested)}원</Text>
            <Text style={styles.statLabel}>총 투자금액</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(stats.totalShares)}주</Text>
            <Text style={styles.statLabel}>총 보유 주식</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValueSmall}>{stats.activeCount}건</Text>
            <Text style={styles.statLabel}>투자 중</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValueSmall}>{stats.convertedCount}건</Text>
            <Text style={styles.statLabel}>전환 완료</Text>
          </View>
        </View>
      </LinearGradient>

      {/* 탭 */}
      <View style={styles.tabContainer}>
        {STATUS_TABS.map((tab) => (
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
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00B368" />
        </View>
      ) : (
        <FlatList
          data={investments}
          renderItem={renderInvestmentCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchInvestments(true)}
              tintColor="#00B368"
            />
          }
          ListEmptyComponent={renderEmptyState}
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
    borderBottomColor: t.colors.textPrimary,
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    fontSize: 24,
    fontFamily: t.fonts.regular,
    color: t.colors.surface,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.surface,
  },
  statsBanner: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#193CA0',
  },
  statValue: {
    fontSize: 20,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.surface,
  },
  statValueSmall: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.surface,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: '#91B8FB',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: t.colors.success,
  },
  tabText: {
    fontSize: 12,
    fontFamily: t.fonts.medium,
    color: t.colors.textTertiary,
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
  investmentCard: {
    backgroundColor: t.colors.textPrimary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: t.colors.textPrimary,
  },
  issuerName: {
    fontSize: 15,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.surface,
  },
  roundName: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  investmentInfo: {
    backgroundColor: t.colors.surfaceRaised,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
  },
  infoLabelBonus: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.warning,
  },
  infoValue: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.surface,
  },
  infoValueBonus: {
    fontSize: 12,
    fontFamily: t.fonts.medium,
    color: t.colors.warning,
    fontWeight: '500',
  },
  infoValueHighlight: {
    fontSize: 14,
    fontFamily: t.fonts.bold,
    color: t.colors.success,
    fontWeight: 'bold',
  },
  discountBadge: {
    backgroundColor: '#FF980020',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  discountText: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.warning,
    textAlign: 'center',
  },
  lockupInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: t.colors.textPrimary,
    marginBottom: 8,
  },
  lockupLabel: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
  },
  lockupValue: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: t.colors.textPrimary,
  },
  dateText: {
    fontSize: 11,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    fontFamily: t.fonts.regular,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.surface,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginBottom: 20,
  },
  exploreButton: {
    backgroundColor: t.colors.success,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  exploreButtonText: {
    color: t.colors.surface,
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
});
