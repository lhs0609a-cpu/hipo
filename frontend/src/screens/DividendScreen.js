import React, { useState, useEffect } from 'react';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { dividendAPI } from '../services/api';
import comingSoon from '../utils/comingSoon';
import { useAuth } from '../contexts/AuthContext';

import goBackOrHome from '../utils/goBackOrHome';
const DividendScreen = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const { isAuthenticated } = useAuth();
  const [dividends, setDividends] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [totalDividend, setTotalDividend] = useState(0);
  const [monthlyDividend, setMonthlyDividend] = useState(0);
  const [dividendSources, setDividendSources] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDividends();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchDividends = async () => {
    try {
      const [historyRes, upcomingRes] = await Promise.all([
        dividendAPI.getHistory(),
        dividendAPI.getUpcoming(),
      ]);
      setDividends(historyRes.data.dividends || []);
      setUpcoming(upcomingRes.data.upcoming || []);

      const total = (historyRes.data.dividends || []).reduce(
        (sum, d) => sum + (d.amount || 0), 0
      );
      setTotalDividend(total);

      // 이번 달 배당 계산
      const now = new Date();
      const thisMonth = (historyRes.data.dividends || []).filter(d => {
        const date = new Date(d.paidAt || d.createdAt);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).reduce((sum, d) => sum + (d.amount || 0), 0);
      setMonthlyDividend(thisMonth);

      // 배당 원천별 분석 (시뮬레이션)
      calculateDividendSources(historyRes.data.dividends || []);
    } catch (error) {
      console.error('Error fetching dividends:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateDividendSources = (dividendList) => {
    // 배당 원천별 비율 계산 (실제로는 서버에서 계산)
    const sources = [
      {
        id: 'content',
        name: '콘텐츠 수익',
        icon: 'videocam',
        color: '#F0344B',
        percentage: 40,
        description: '영상, 게시물 등 콘텐츠 활동 수익'
      },
      {
        id: 'engagement',
        name: '팬 참여도',
        icon: 'heart',
        color: '#00B0A6',
        percentage: 25,
        description: '좋아요, 댓글, 공유 등 팬 상호작용'
      },
      {
        id: 'growth',
        name: '성장 보너스',
        icon: 'trending-up',
        color: '#3FB6C9',
        percentage: 20,
        description: '팔로워 증가, 영향력 확대'
      },
      {
        id: 'trading',
        name: '거래 수수료',
        icon: 'swap-horizontal',
        color: '#6BC9A8',
        percentage: 15,
        description: '주식 거래에서 발생하는 수수료 배분'
      },
    ];
    setDividendSources(sources);
  };

  // 배당 원천 설명 카드
  const renderDividendExplanation = () => (
    <View style={styles.explanationCard}>
      <View style={styles.explanationHeader}>
        <Ionicons name="help-circle" size={20} color="#2B5FE3" />
        <Text style={styles.explanationTitle}>배당금은 어디서 오나요?</Text>
      </View>
      <Text style={styles.explanationText}>
        HIPO의 배당금은 크리에이터의 실제 활동 수익에서 발생합니다.
        크리에이터가 성장하면 주주인 당신도 함께 수익을 얻습니다.
      </Text>

      <View style={styles.sourcesList}>
        {dividendSources.map((source) => (
          <View key={source.id} style={styles.sourceItem}>
            <View style={[styles.sourceIcon, { backgroundColor: source.color + '20' }]}>
              <Ionicons name={source.icon} size={20} color={source.color} />
            </View>
            <View style={styles.sourceInfo}>
              <View style={styles.sourceNameRow}>
                <Text style={styles.sourceName}>{source.name}</Text>
                <Text style={[styles.sourcePercentage, { color: source.color }]}>
                  {source.percentage}%
                </Text>
              </View>
              <Text style={styles.sourceDescription}>{source.description}</Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${source.percentage}%`, backgroundColor: source.color }
                  ]}
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  // 배당 통계 카드
  const renderStatsCard = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>총 누적 배당</Text>
        <Text style={styles.statValue}>{totalDividend.toLocaleString()} PO</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>이번 달</Text>
        <Text style={[styles.statValue, { color: '#00B368' }]}>
          +{monthlyDividend.toLocaleString()} PO
        </Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>예정 배당</Text>
        <Text style={[styles.statValue, { color: '#F59B00' }]}>
          {upcoming.reduce((sum, u) => sum + (u.expectedAmount || 0), 0).toLocaleString()} PO
        </Text>
      </View>
    </View>
  );

  // 배당 내역 아이템
  const renderDividendItem = ({ item }) => (
    <TouchableOpacity
      style={styles.dividendItem}
      onPress={() => navigation.navigate('StockDetail', { stockId: item.stockId })}
    >
      <View style={styles.dividendLeft}>
        <View style={styles.stockAvatar}>
          <Text style={styles.avatarText}>
            {(item.stock?.issuer?.displayName || 'S').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.dividendInfo}>
          <Text style={styles.stockName}>
            {item.stock?.issuer?.displayName || item.stock?.issuer?.username || '크리에이터'}
          </Text>
          <Text style={styles.dividendDate}>
            {new Date(item.paidAt || item.createdAt).toLocaleDateString('ko-KR')}
          </Text>
          {item.source && (
            <View style={styles.sourceTag}>
              <Text style={styles.sourceTagText}>{item.source}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.dividendRight}>
        <Text style={styles.dividendAmount}>+{(item.amount || 0).toLocaleString()} PO</Text>
        <Text style={styles.dividendShares}>{item.shares || 0}주 보유</Text>
      </View>
    </TouchableOpacity>
  );

  // 예정 배당 아이템
  const renderUpcomingItem = ({ item }) => (
    <TouchableOpacity
      style={styles.upcomingItem}
      onPress={() => navigation.navigate('StockDetail', { stockId: item.stockId })}
    >
      <View style={styles.upcomingLeft}>
        <View style={[styles.stockAvatar, { backgroundColor: '#F59B00' }]}>
          <Ionicons name="time" size={20} color="#fff" />
        </View>
        <View style={styles.dividendInfo}>
          <Text style={styles.stockName}>
            {item.stock?.issuer?.displayName || item.stock?.issuer?.username || '크리에이터'}
          </Text>
          <Text style={styles.upcomingDate}>
            {new Date(item.scheduledAt).toLocaleDateString('ko-KR')} 지급 예정
          </Text>
        </View>
      </View>
      <View style={styles.dividendRight}>
        <Text style={styles.expectedAmount}>
          {(item.expectedAmount || 0).toLocaleString()} PO
        </Text>
        <Text style={styles.dividendRate}>배당률 {item.rate || 0}%</Text>
      </View>
    </TouchableOpacity>
  );

  // 빈 상태
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="wallet-outline" size={48} color="#ccc" />
      </View>
      <Text style={styles.emptyTitle}>
        {activeTab === 'history' ? '배당 내역이 없습니다' : '예정된 배당이 없습니다'}
      </Text>
      <Text style={styles.emptyText}>
        크리에이터 주식을 보유하면{'\n'}활동에 따른 배당금을 받을 수 있어요
      </Text>
      <TouchableOpacity
        style={styles.investButton}
        onPress={() => navigation.navigate('StockMarket')}
      >
        <Text style={styles.investButtonText}>투자하러 가기</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00B368" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBackOrHome(navigation)}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>배당 내역</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loginRequiredContainer}>
          <Ionicons name="lock-closed" size={64} color="#ccc" />
          <Text style={styles.loginRequiredTitle}>로그인이 필요합니다</Text>
          <Text style={styles.loginRequiredText}>
            배당 내역을 확인하려면{'\n'}로그인해주세요.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>로그인하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <LinearGradient
        colors={['#00B368', '#00915A']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => goBackOrHome(navigation)}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>배당 내역</Text>
        <TouchableOpacity onPress={() => comingSoon('배당 설정')}>
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* 탭 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            개요
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            배당 내역
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            예정 배당
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' ? (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchDividends} />
          }
        >
          {/* 통계 */}
          {renderStatsCard()}

          {/* 배당 원천 설명 */}
          {renderDividendExplanation()}

          {/* 최근 배당 미리보기 */}
          {dividends.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>최근 배당</Text>
                <TouchableOpacity onPress={() => setActiveTab('history')}>
                  <Text style={styles.sectionMore}>전체보기</Text>
                </TouchableOpacity>
              </View>
              {dividends.slice(0, 3).map((item) => (
                <View key={item.id}>
                  {renderDividendItem({ item })}
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      ) : (
        <FlatList
          data={activeTab === 'history' ? dividends : upcoming}
          renderItem={activeTab === 'history' ? renderDividendItem : renderUpcomingItem}
          keyExtractor={(item) => item.id?.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchDividends} />
          }
          ListEmptyComponent={renderEmpty}
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
    backgroundColor: t.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    padding: 4,
    margin: 16,
    marginTop: -10,
    borderRadius: 12,
    shadowColor: t.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: t.colors.success,
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

  // 통계 카드
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: t.colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textPrimary,
  },

  // 배당 원천 설명
  explanationCard: {
    backgroundColor: t.colors.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  explanationTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textPrimary,
  },
  explanationText: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  sourcesList: {
    gap: 16,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sourceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sourceName: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
  },
  sourcePercentage: {
    fontSize: 14,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  sourceDescription: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: t.colors.backgroundSecondary,
    borderRadius: 2,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },

  // 최근 섹션
  recentSection: {
    marginHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textPrimary,
  },
  sectionMore: {
    fontSize: 14,
    fontFamily: t.fonts.medium,
    color: t.colors.success,
    fontWeight: '500',
  },

  // 리스트
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  dividendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  upcomingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: t.colors.warning,
  },
  dividendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  upcomingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stockAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.colors.success,
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
  dividendInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
  },
  dividendDate: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginTop: 2,
  },
  sourceTag: {
    backgroundColor: t.colors.successBackground,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  sourceTagText: {
    fontSize: 11,
    fontFamily: t.fonts.medium,
    color: t.colors.success,
    fontWeight: '500',
  },
  upcomingDate: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.warning,
    marginTop: 2,
  },
  dividendRight: {
    alignItems: 'flex-end',
  },
  dividendAmount: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.success,
  },
  expectedAmount: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.textPrimary,
  },
  dividendShares: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginTop: 2,
  },
  dividendRate: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.warning,
    marginTop: 2,
  },

  // 빈 상태
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: t.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  investButton: {
    backgroundColor: t.colors.success,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  investButtonText: {
    color: t.colors.surface,
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },

  // 로그인 필요
  loginRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loginRequiredTitle: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.textPrimary,
    marginTop: 20,
    marginBottom: 12,
  },
  loginRequiredText: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: t.colors.success,
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 10,
  },
  loginButtonText: {
    color: t.colors.surface,
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
});

export default DividendScreen;
