import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getStocks, getRecommendedStocks, getMarketChartData } from '../api/stocks';
import { getSavedUser } from '../api/auth';
import { getTrendingPosts } from '../api/posts';
import { getTrendingByCategories } from '../api/users';
import { COLORS, TRUST_LEVEL_COLORS } from '../constants/colors';

const screenWidth = Dimensions.get('window').width;

export default function HomeScreen({ navigation }) {
  const [stocks, setStocks] = useState([]);
  const [recommended, setRecommended] = useState({
    trending: [],
    popular: [],
    newest: [],
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myHoldings, setMyHoldings] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [categories, setCategories] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stocksData, recommendedData, userData, chartDataResult, trendingPostsData, categoriesData] = await Promise.all([
        getStocks(),
        getRecommendedStocks(),
        getSavedUser(),
        getMarketChartData('1d', 12).catch(() => ({ chartData: [], marketStats: {} })),
        getTrendingPosts(1, 10).catch(() => ({ posts: [] })),
        getTrendingByCategories(5).catch(() => ({ categories: {} })),
      ]);
      setStocks(stocksData.stocks);
      setRecommended(recommendedData);
      setUser(userData);
      setChartData(chartDataResult);
      setTrendingPosts(trendingPostsData.posts || []);
      setCategories(categoriesData.categories || {});

      // 내 보유 크리에이터 필터링 (실제로는 별도 API 호출이 필요할 수 있음)
      const holdings = stocksData.stocks.filter(s => s.myShares > 0).slice(0, 3);
      setMyHoldings(holdings);
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatChange = (change) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  // 자주 쓰는 메뉴
  const renderQuickActions = () => {
    const actions = [
      { icon: '💸', label: '충전', onPress: () => {} },
      { icon: '📤', label: '송금', onPress: () => {} },
      { icon: '💼', label: '보유크리에이터', onPress: () => navigation.navigate('Portfolio') },
      { icon: '📱', label: '피드', onPress: () => navigation.navigate('Community') },
      { icon: '📰', label: '뉴스', onPress: () => navigation.navigate('News') },
      { icon: '📋', label: '거래내역', onPress: () => navigation.navigate('TransactionHistory') },
      { icon: '👥', label: '내주주', onPress: () => navigation.navigate('MyShareholders') },
      { icon: '📊', label: '투자현황', onPress: () => navigation.navigate('MyInvestments') },
      { icon: '💬', label: '메시지', onPress: () => navigation.navigate('Messages') },
    ];

    return (
      <View style={styles.quickActionsContainer}>
        <View style={styles.quickActionsHeader}>
          <Text style={styles.quickActionsTitle}>자주 쓰는 메뉴</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsScroll}
        >
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionButton}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>{action.icon}</Text>
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // 내 보유 크리에이터 카드
  const renderMyHoldingsCard = () => {
    if (myHoldings.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>내 보유 크리에이터</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Portfolio')}>
            <Text style={styles.sectionMore}>전체보기 →</Text>
          </TouchableOpacity>
        </View>
        {myHoldings.map((item) => {
          const priceChange = item.priceChangePercent || 0;
          const isUp = priceChange >= 0;
          const changeColor = isUp ? COLORS.up : COLORS.down;
          const totalValue = (item.myShares || 0) * item.sharePrice;

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.holdingCard}
              onPress={() => navigation.navigate('StockDetail', { stockId: item.id })}
              activeOpacity={0.7}
            >
              <View style={styles.holdingHeader}>
                <Text style={styles.holdingName}>{item.issuer.username}</Text>
                <Text style={styles.holdingValue}>{totalValue.toLocaleString()} PO</Text>
              </View>
              <View style={styles.holdingDetails}>
                <Text style={styles.holdingShares}>{item.myShares}주 · {item.sharePrice.toLocaleString()} PO</Text>
                <Text style={[styles.holdingChange, { color: changeColor }]}>
                  {isUp ? '▲' : '▼'} {formatChange(priceChange)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // 시장 차트 섹션
  const renderMarketChart = () => {
    if (!chartData || !chartData.chartData || chartData.chartData.length === 0) return null;

    const data = {
      labels: chartData.chartData.map((_, idx) => idx % 3 === 0 ? `${idx}h` : ''),
      datasets: [{
        data: chartData.chartData.map(d => d.price)
      }]
    };

    const stats = chartData.marketStats;
    const priceChange = parseFloat(stats.priceChangePercent || 0);
    const isUp = priceChange >= 0;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📈 실시간 시장 현황</Text>
        </View>

        {/* 시장 통계 카드 */}
        <View style={styles.marketStatsCard}>
          <View style={styles.mainStatContainer}>
            <Text style={styles.mainStatLabel}>현재가</Text>
            <View style={styles.priceRow}>
              <Text style={styles.currentPrice}>{parseFloat(stats.currentPrice || 0).toLocaleString()} PO</Text>
              <View style={[styles.changeBadge, { backgroundColor: isUp ? COLORS.up + '20' : COLORS.down + '20' }]}>
                <Text style={[styles.changeText, { color: isUp ? COLORS.up : COLORS.down }]}>
                  {isUp ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>거래대금 (24h)</Text>
              <Text style={styles.statValue}>{parseInt(stats.totalVolume || 0).toLocaleString()} PO</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>시가총액</Text>
              <Text style={styles.statValue}>{parseInt(stats.totalMarketCap || 0).toLocaleString()} PO</Text>
            </View>
          </View>
        </View>

        {/* 차트 */}
        <View style={styles.chartContainer}>
          <LineChart
            data={data}
            width={screenWidth - 40}
            height={180}
            chartConfig={{
              backgroundColor: COLORS.surface,
              backgroundGradientFrom: COLORS.background,
              backgroundGradientTo: COLORS.background,
              decimalPlaces: 0,
              color: (opacity = 1) => isUp ? `rgba(76, 175, 80, ${opacity})` : `rgba(244, 67, 54, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(153, 153, 153, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: '2',
                strokeWidth: '2',
                stroke: isUp ? COLORS.up : COLORS.down
              }
            }}
            bezier
            style={styles.chart}
          />
        </View>
      </View>
    );
  };

  // 카테고리별 인플루언서 섹션
  const renderCategorySection = () => {
    const categoriesArray = Object.values(categories);
    if (categoriesArray.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔥 지금 뜨는 카테고리</Text>
        </View>
        {categoriesArray.map((category, idx) => {
          if (!category.users || category.users.length === 0) return null;

          return (
            <View key={idx} style={styles.categoryContainer}>
              <Text style={styles.categoryTitle}>{category.icon} {category.name}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {category.users.slice(0, 5).map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.categoryUserCard}
                    onPress={() => navigation.navigate('Profile', { userId: user.id })}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.categoryUserAvatar, { backgroundColor: TRUST_LEVEL_COLORS[user.trustLevel] || COLORS.textSecondary }]}>
                      <Text style={styles.categoryUserAvatarText}>{user.username[0].toUpperCase()}</Text>
                    </View>
                    <Text style={styles.categoryUserName} numberOfLines={1}>{user.username}</Text>
                    <Text style={styles.categoryUserFollowers}>{user.followersCount || 0} 팔로워</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          );
        })}
      </View>
    );
  };

  // 트렌딩 피드 섹션
  const renderTrendingFeed = () => {
    if (trendingPosts.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>🔥 실시간 핫한 피드</Text>
            <Text style={styles.sectionSubtitle}>지금 가장 인기 있는 포스트</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Community')}>
            <Text style={styles.sectionMore}>전체보기 →</Text>
          </TouchableOpacity>
        </View>
        {trendingPosts.slice(0, 3).map((post) => (
          <TouchableOpacity
            key={post.id}
            style={styles.trendingPostCard}
            onPress={() => navigation.navigate('Community')}
            activeOpacity={0.7}
          >
            <View style={styles.trendingPostHeader}>
              <Text style={styles.trendingPostAuthor}>{post.author?.username}</Text>
              <View style={[styles.trendingPostBadge, { backgroundColor: TRUST_LEVEL_COLORS[post.author?.trustLevel] || COLORS.textSecondary }]}>
                <Text style={styles.trendingPostBadgeText}>{post.author?.trustLevel}</Text>
              </View>
            </View>
            <Text style={styles.trendingPostContent} numberOfLines={2}>{post.content}</Text>
            <View style={styles.trendingPostFooter}>
              <Text style={styles.trendingPostStat}>❤️ {post.likesCount || 0}</Text>
              <Text style={styles.trendingPostStat}>💬 {post.commentsCount || 0}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // 추천 크리에이터 섹션
  const renderRecommendedSection = (title, data, icon, subtitle) => {
    if (!data || data.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{icon} {title}</Text>
            {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
          </View>
          <TouchableOpacity>
            <Text style={styles.sectionMore}>더보기 →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {data.slice(0, 10).map((item) => {
            const priceChange = item.priceChangePercent || 0;
            const isUp = priceChange >= 0;
            const changeColor = isUp ? COLORS.up : COLORS.down;

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.recommendCard}
                onPress={() => navigation.navigate('StockDetail', { stockId: item.id })}
                activeOpacity={0.7}
              >
                <View style={styles.recommendHeader}>
                  <View style={[styles.recommendTrustBadge, { backgroundColor: TRUST_LEVEL_COLORS[item.issuer.trustLevel] || COLORS.textSecondary }]}>
                    <Text style={styles.recommendTrustText}>{item.issuer.trustLevel}</Text>
                  </View>
                </View>
                <Text style={styles.recommendName} numberOfLines={1}>{item.issuer.username}</Text>
                <Text style={styles.recommendPrice}>{item.sharePrice.toLocaleString()}<Text style={styles.recommendCurrency}> PO</Text></Text>
                <View style={styles.recommendFooter}>
                  <Text style={[styles.recommendChange, { color: changeColor }]}>
                    {isUp ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 토스 스타일 헤더 - 자산 카드 */}
        <View style={styles.assetHeader}>
          <View style={styles.assetCard}>
            <Text style={styles.assetLabel}>내 자산</Text>
            <View style={styles.assetAmountContainer}>
              <Text style={styles.assetAmount}>{(user?.poBalance || 0).toLocaleString()}</Text>
              <Text style={styles.assetCurrency}> PO</Text>
            </View>
            <View style={styles.assetMeta}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>신뢰도</Text>
                <View style={[styles.metaBadge, { backgroundColor: TRUST_LEVEL_COLORS[user?.trustLevel] || COLORS.textSecondary }]}>
                  <Text style={styles.metaBadgeText}>{user?.trustLevel || 0}</Text>
                </View>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>신뢰 배수</Text>
                <Text style={styles.metaValue}>x{user?.trustMultiplier || 1}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 빠른 액션 버튼들 */}
        {renderQuickActions()}

        {/* 시장 차트 */}
        {renderMarketChart()}

        {/* 카테고리별 인플루언서 */}
        {renderCategorySection()}

        {/* 트렌딩 피드 */}
        {renderTrendingFeed()}

        {/* 내 보유 크리에이터 */}
        {renderMyHoldingsCard()}

        {/* 추천 섹션들 */}
        {renderRecommendedSection('급상승 크리에이터', recommended.trending, '🔥', '지금 가장 핫한 크리에이터')}
        {renderRecommendedSection('인기 크리에이터', recommended.popular, '⭐', '많은 사람들이 주목하는')}
        {renderRecommendedSection('신규 상장', recommended.newest, '🆕', '새로 거래를 시작한')}

        {/* 전체 크리에이터 목록 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👥 전체 크리에이터</Text>
            <Text style={styles.sectionSubtitle}>{stocks.length}명의 크리에이터</Text>
          </View>
          <View style={styles.stockList}>
            {stocks.slice(0, 50).map((item) => {
              const priceChange = item.priceChangePercent || 0;
              const isUp = priceChange >= 0;
              const changeColor = isUp ? COLORS.up : COLORS.down;

              const trustColor = TRUST_LEVEL_COLORS[item.issuer?.trustLevel] || COLORS.textSecondary;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.stockCard}
                  onPress={() => navigation.navigate('StockDetail', { stockId: item.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.stockAvatar}>
                    <Text style={styles.stockAvatarText}>
                      {item.issuer?.username?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={styles.stockLeft}>
                    <View style={styles.stockNameRow}>
                      <Text style={styles.stockName}>{item.issuer?.username || '알 수 없음'}</Text>
                      {item.issuer?.isVerified && <Text style={styles.verifiedBadge}>✓</Text>}
                    </View>
                    <Text style={styles.stockMeta}>
                      {item.holderCount || 0}명 보유 · 배당 {item.dividendRate}%
                    </Text>
                    {item.issuer?.trustLevel && (
                      <View style={[styles.trustLevelBadge, { backgroundColor: trustColor }]}>
                        <Text style={styles.trustLevelText}>{item.issuer.trustLevel}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.stockRight}>
                    <Text style={styles.stockPrice}>{item.sharePrice.toLocaleString()} PO</Text>
                    <Text style={[styles.stockChange, { color: changeColor }]}>
                      {isUp ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  // 토스 스타일 자산 헤더
  assetHeader: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  assetCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 24,
    backdropFilter: 'blur(10px)',
  },
  assetLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    fontWeight: '500',
  },
  assetAmountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  assetAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  assetCurrency: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  assetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  metaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metaDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  // 빠른 액션
  quickActionsContainer: {
    backgroundColor: COLORS.surface,
    paddingVertical: 20,
    marginBottom: 8,
  },
  quickActionsHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  quickActionsScroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  actionButton: {
    alignItems: 'center',
    width: 80,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionIconText: {
    fontSize: 28,
  },
  actionLabel: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  // 섹션
  section: {
    marginTop: 8,
    paddingVertical: 20,
    backgroundColor: COLORS.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  sectionMore: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // 내 보유 크리에이터
  holdingCard: {
    backgroundColor: COLORS.background,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  holdingName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  holdingValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  holdingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holdingShares: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  holdingChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  // 추천 카드
  horizontalScroll: {
    paddingLeft: 20,
  },
  recommendCard: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    width: 150,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recommendHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  recommendTrustBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recommendTrustText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  recommendName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  recommendPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  recommendCurrency: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  recommendFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendChange: {
    fontSize: 13,
    fontWeight: '600',
  },
  // 전체 크리에이터 리스트
  stockList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  stockCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stockAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stockAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stockLeft: {
    flex: 1,
  },
  stockNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  stockName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  verifiedBadge: {
    fontSize: 14,
    color: COLORS.primary,
  },
  stockMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  trustLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  trustLevelText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  stockRight: {
    alignItems: 'flex-end',
  },
  stockPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  stockChange: {
    fontSize: 13,
    fontWeight: '600',
  },
  // 시장 차트 스타일
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartContainer: {
    paddingHorizontal: 20,
  },
  marketStatsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mainStatContainer: {
    marginBottom: 16,
  },
  mainStatLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  changeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  marketStats: {
    alignItems: 'flex-end',
  },
  marketStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  marketStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  // 카테고리 스타일
  categoryContainer: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  categoryUserCard: {
    width: 100,
    alignItems: 'center',
    marginRight: 12,
  },
  categoryUserAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryUserAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoryUserName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  categoryUserFollowers: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  // 트렌딩 피드 스타일
  trendingPostCard: {
    backgroundColor: COLORS.background,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  trendingPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendingPostAuthor: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginRight: 8,
  },
  trendingPostBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trendingPostBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trendingPostContent: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  trendingPostFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  trendingPostStat: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
