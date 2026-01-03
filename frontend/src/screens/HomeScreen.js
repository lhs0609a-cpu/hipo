import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { getStocks, getRecommendedStocks, getMarketChartData } from '../api/stocks';
import { getSavedUser } from '../api/auth';
import { getTrendingPosts } from '../api/posts';
import { getTrendingByCategories } from '../api/users';
import theme from '../styles/theme';

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

      const holdings = stocksData.stocks.filter(s => s.myShares > 0).slice(0, 5);
      setMyHoldings(holdings);
    } catch (error) {
      console.error('Data load error:', error);
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

  // 토스 스타일 Quick Action 아이콘
  const QuickActionIcon = ({ colors, icon }) => (
    <LinearGradient
      colors={colors}
      style={styles.quickActionIconBg}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={styles.quickActionIconText}>{icon}</Text>
    </LinearGradient>
  );

  // Asset Header - 토스 스타일
  const renderAssetHeader = () => {
    return (
      <View style={styles.assetSection}>
        <Pressable
          style={({ pressed }) => [
            styles.assetCard,
            pressed && { opacity: 0.9 }
          ]}
          onPress={() => navigation.navigate('Wallet')}
        >
          <View style={styles.assetLabelRow}>
            <Text style={styles.assetLabel}>내 자산</Text>
            <Text style={styles.assetChevron}>›</Text>
          </View>
          <View style={styles.assetAmountRow}>
            <Text style={styles.assetAmount}>{(user?.poBalance || 0).toLocaleString()}</Text>
            <Text style={styles.assetCurrency}>P</Text>
          </View>
        </Pressable>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable
            style={({ pressed }) => [styles.quickActionItem, pressed && styles.quickActionPressed]}
            onPress={() => navigation.navigate('POCharge')}
          >
            <QuickActionIcon colors={['#10B981', '#34D399']} icon="₩" />
            <Text style={styles.quickActionLabel}>충전</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.quickActionItem, pressed && styles.quickActionPressed]}
            onPress={() => navigation.navigate('Transfer')}
          >
            <QuickActionIcon colors={['#3B82F6', '#60A5FA']} icon="↗" />
            <Text style={styles.quickActionLabel}>송금</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.quickActionItem, pressed && styles.quickActionPressed]}
            onPress={() => navigation.navigate('Portfolio')}
          >
            <QuickActionIcon colors={['#8B5CF6', '#A78BFA']} icon="📊" />
            <Text style={styles.quickActionLabel}>내 주식</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.quickActionItem, pressed && styles.quickActionPressed]}
            onPress={() => navigation.navigate('Community')}
          >
            <QuickActionIcon colors={['#EC4899', '#F472B6']} icon="💬" />
            <Text style={styles.quickActionLabel}>피드</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.quickActionItem, pressed && styles.quickActionPressed]}
            onPress={() => navigation.navigate('Ranking')}
          >
            <QuickActionIcon colors={['#F59E0B', '#FBBF24']} icon="🏆" />
            <Text style={styles.quickActionLabel}>랭킹</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // 내 보유 주식 섹션
  const renderMyHoldings = () => {
    if (myHoldings.length === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>내 보유 주식</Text>
          <Pressable onPress={() => navigation.navigate('Portfolio')}>
            <Text style={styles.sectionMore}>전체보기 ›</Text>
          </Pressable>
        </View>

        {myHoldings.map((item, index) => {
          const priceChange = item.priceChangePercent || 0;
          const isUp = priceChange >= 0;
          const totalValue = (item.myShares || 0) * item.sharePrice;

          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.holdingItem,
                pressed && styles.itemPressed,
                index === myHoldings.length - 1 && styles.lastItem
              ]}
              onPress={() => navigation.navigate('StockDetail', { stockId: item.id })}
            >
              <View style={styles.holdingAvatar}>
                <Text style={styles.holdingAvatarText}>
                  {item.issuer?.username?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.holdingInfo}>
                <Text style={styles.holdingName}>{item.issuer.username}</Text>
                <Text style={styles.holdingShares}>{item.myShares}주</Text>
              </View>
              <View style={styles.holdingRight}>
                <Text style={styles.holdingValue}>{totalValue.toLocaleString()}P</Text>
                <Text style={[styles.holdingChange, { color: isUp ? theme.colors.stockUp : theme.colors.stockDown }]}>
                  {formatChange(priceChange)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  };

  // 시장 현황 섹션
  const renderMarketOverview = () => {
    const stats = chartData?.marketStats || {};
    const priceChange = parseFloat(stats.priceChangePercent || 0);
    const isUp = priceChange >= 0;

    const hasChartData = chartData?.chartData && chartData.chartData.length > 0;

    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>시장 현황</Text>
        </View>

        <View style={styles.marketContent}>
          <View style={styles.marketMain}>
            <Text style={styles.marketLabel}>HIPO 지수</Text>
            <Text style={styles.marketPrice}>
              {parseFloat(stats.currentPrice || 1000).toLocaleString()}
            </Text>
            <View style={[
              styles.marketBadge,
              { backgroundColor: isUp ? theme.colors.stockUpBackground : theme.colors.stockDownBackground }
            ]}>
              <Text style={[styles.marketBadgeText, { color: isUp ? theme.colors.stockUp : theme.colors.stockDown }]}>
                {isUp ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
              </Text>
            </View>
          </View>

          {hasChartData && (
            <View style={styles.chartContainer}>
              <LineChart
                data={{
                  labels: [],
                  datasets: [{
                    data: chartData.chartData.map(d => d.price)
                  }]
                }}
                width={screenWidth - 80}
                height={100}
                withDots={false}
                withInnerLines={false}
                withOuterLines={false}
                withVerticalLabels={false}
                withHorizontalLabels={false}
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: theme.colors.white,
                  backgroundGradientTo: theme.colors.white,
                  decimalPlaces: 0,
                  color: () => isUp ? theme.colors.stockUp : theme.colors.stockDown,
                  strokeWidth: 2.5,
                }}
                bezier
                style={styles.chart}
              />
            </View>
          )}

          <View style={styles.marketStats}>
            <View style={styles.marketStatItem}>
              <Text style={styles.marketStatLabel}>거래대금</Text>
              <Text style={styles.marketStatValue}>
                {parseInt(stats.totalVolume || 0).toLocaleString()}P
              </Text>
            </View>
            <View style={styles.marketStatDivider} />
            <View style={styles.marketStatItem}>
              <Text style={styles.marketStatLabel}>시가총액</Text>
              <Text style={styles.marketStatValue}>
                {parseInt(stats.totalMarketCap || 0).toLocaleString()}P
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // 급상승 크리에이터 섹션
  const renderTrendingCreators = () => {
    const trendingList = recommended.trending || [];
    if (trendingList.length === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>🔥 급상승</Text>
            <Text style={styles.sectionSubtitle}>지금 가장 핫한 크리에이터</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('StockMarket')}>
            <Text style={styles.sectionMore}>전체보기 ›</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {trendingList.slice(0, 10).map((item, index) => {
            const change = item.priceChangePercent || 0;
            const isUp = change >= 0;
            const rankColors = [
              ['#FFD700', '#FFA500'],  // 1등 금색
              ['#C0C0C0', '#A0A0A0'],  // 2등 은색
              ['#CD7F32', '#8B4513'],  // 3등 동색
            ];

            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.trendingCard,
                  pressed && styles.cardPressed
                ]}
                onPress={() => navigation.navigate('StockDetail', { stockId: item.id })}
              >
                {index < 3 && (
                  <LinearGradient
                    colors={rankColors[index]}
                    style={styles.rankBadge}
                  >
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </LinearGradient>
                )}
                <View style={[
                  styles.trendingAvatar,
                  index < 3 && { borderColor: rankColors[index][0], borderWidth: 2 }
                ]}>
                  <Text style={styles.trendingAvatarText}>
                    {item.issuer?.username?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <Text style={styles.trendingName} numberOfLines={1}>
                  {item.issuer?.username}
                </Text>
                <Text style={styles.trendingPrice}>
                  {item.sharePrice?.toLocaleString()}P
                </Text>
                <View style={[
                  styles.trendingBadge,
                  { backgroundColor: isUp ? theme.colors.stockUpBackground : theme.colors.stockDownBackground }
                ]}>
                  <Text style={[
                    styles.trendingBadgeText,
                    { color: isUp ? theme.colors.stockUp : theme.colors.stockDown }
                  ]}>
                    {isUp ? '+' : ''}{change.toFixed(1)}%
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // 인기 크리에이터 섹션
  const renderPopularCreators = () => {
    const popularList = recommended.popular || [];
    if (popularList.length === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>💎 인기 크리에이터</Text>
            <Text style={styles.sectionSubtitle}>많은 사람들이 투자하고 있어요</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {popularList.slice(0, 8).map((item) => {
            const change = item.priceChangePercent || 0;
            const isUp = change >= 0;

            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.popularCard,
                  pressed && styles.cardPressed
                ]}
                onPress={() => navigation.navigate('StockDetail', { stockId: item.id })}
              >
                <View style={styles.popularAvatar}>
                  <Text style={styles.popularAvatarText}>
                    {item.issuer?.username?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <Text style={styles.popularName} numberOfLines={1}>
                  {item.issuer?.username}
                </Text>
                <Text style={styles.popularPrice}>
                  {item.sharePrice?.toLocaleString()}P
                </Text>
                <Text style={[
                  styles.popularChange,
                  { color: isUp ? theme.colors.stockUp : theme.colors.stockDown }
                ]}>
                  {formatChange(change)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // 신규 상장 섹션
  const renderNewestCreators = () => {
    const newestList = recommended.newest || [];
    if (newestList.length === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>✨ 신규 상장</Text>
            <Text style={styles.sectionSubtitle}>새로 등장한 크리에이터</Text>
          </View>
        </View>

        {newestList.slice(0, 5).map((item, index) => {
          const change = item.priceChangePercent || 0;
          const isUp = change >= 0;

          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.newestItem,
                pressed && styles.itemPressed,
                index === Math.min(4, newestList.length - 1) && styles.lastItem
              ]}
              onPress={() => navigation.navigate('StockDetail', { stockId: item.id })}
            >
              <View style={styles.newestBadge}>
                <Text style={styles.newestBadgeText}>NEW</Text>
              </View>
              <View style={styles.newestAvatar}>
                <Text style={styles.newestAvatarText}>
                  {item.issuer?.username?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.newestInfo}>
                <Text style={styles.newestName}>{item.issuer?.username}</Text>
                <Text style={styles.newestMeta}>
                  시가총액 {(item.marketCap || 0).toLocaleString()}P
                </Text>
              </View>
              <View style={styles.newestRight}>
                <Text style={styles.newestPrice}>{item.sharePrice?.toLocaleString()}P</Text>
                <Text style={[styles.newestChange, { color: isUp ? theme.colors.stockUp : theme.colors.stockDown }]}>
                  {formatChange(change)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  };

  // 전체 크리에이터 리스트
  const renderAllCreators = () => {
    if (stocks.length === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>📈 전체 크리에이터</Text>
            <Text style={styles.sectionSubtitle}>{stocks.length}명의 크리에이터</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('StockMarket')}>
            <Text style={styles.sectionMore}>더보기 ›</Text>
          </Pressable>
        </View>

        {stocks.slice(0, 10).map((item, index) => {
          const change = item.priceChangePercent || 0;
          const isUp = change >= 0;

          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.stockItem,
                pressed && styles.itemPressed,
                index === Math.min(9, stocks.length - 1) && styles.lastItem
              ]}
              onPress={() => navigation.navigate('StockDetail', { stockId: item.id })}
            >
              <Text style={styles.stockRank}>{index + 1}</Text>
              <View style={styles.stockAvatar}>
                <Text style={styles.stockAvatarText}>
                  {item.issuer?.username?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.stockInfo}>
                <Text style={styles.stockName}>{item.issuer?.username}</Text>
                <Text style={styles.stockMeta}>
                  거래량 {(item.totalVolume || 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.stockRight}>
                <Text style={styles.stockPrice}>{item.sharePrice?.toLocaleString()}P</Text>
                <View style={[
                  styles.stockBadge,
                  { backgroundColor: isUp ? theme.colors.stockUpBackground : theme.colors.stockDownBackground }
                ]}>
                  <Text style={[styles.stockBadgeText, { color: isUp ? theme.colors.stockUp : theme.colors.stockDown }]}>
                    {formatChange(change)}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  };

  // 커뮤니티 하이라이트
  const renderCommunityHighlight = () => {
    if (trendingPosts.length === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>💬 인기 게시물</Text>
            <Text style={styles.sectionSubtitle}>지금 핫한 이야기</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Community')}>
            <Text style={styles.sectionMore}>더보기 ›</Text>
          </Pressable>
        </View>

        {trendingPosts.slice(0, 3).map((post, index) => (
          <Pressable
            key={post.id}
            style={({ pressed }) => [
              styles.postItem,
              pressed && styles.itemPressed,
              index === Math.min(2, trendingPosts.length - 1) && styles.lastItem
            ]}
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
          >
            <View style={styles.postContent}>
              <Text style={styles.postText} numberOfLines={2}>{post.content}</Text>
              <View style={styles.postMeta}>
                <Text style={styles.postAuthor}>@{post.author?.username}</Text>
                <Text style={styles.postStats}>❤️ {post.likes || 0} · 💬 {post.comments || 0}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderAssetHeader()}
        {renderMyHoldings()}
        {renderMarketOverview()}
        {renderTrendingCreators()}
        {renderPopularCreators()}
        {renderNewestCreators()}
        {renderCommunityHighlight()}
        {renderAllCreators()}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Asset Section
  assetSection: {
    backgroundColor: theme.colors.white,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 24,
  },
  assetCard: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  assetLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  assetLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  assetChevron: {
    fontSize: 22,
    color: theme.colors.gray400,
  },
  assetAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  assetAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -1,
  },
  assetCurrency: {
    fontSize: 24,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  quickActionItem: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  quickActionPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  quickActionIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionIconText: {
    fontSize: 24,
    color: theme.colors.white,
  },
  quickActionLabel: {
    fontSize: 12,
    color: theme.colors.gray700,
    fontWeight: '500',
  },

  // Section Card
  sectionCard: {
    backgroundColor: theme.colors.white,
    marginTop: 8,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  sectionMore: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },

  // Holdings
  holdingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  itemPressed: {
    backgroundColor: theme.colors.background,
  },
  holdingAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  holdingAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.white,
  },
  holdingInfo: {
    flex: 1,
  },
  holdingName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  holdingShares: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  holdingChange: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Market
  marketContent: {
    paddingHorizontal: 20,
  },
  marketMain: {
    marginBottom: 16,
  },
  marketLabel: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginBottom: 6,
  },
  marketPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  marketBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 8,
  },
  marketBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartContainer: {
    marginVertical: 16,
    marginHorizontal: -10,
  },
  chart: {
    borderRadius: 8,
  },
  marketStats: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  marketStatItem: {
    flex: 1,
  },
  marketStatLabel: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginBottom: 4,
  },
  marketStatValue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  marketStatDivider: {
    width: 1,
    backgroundColor: theme.colors.divider,
    marginHorizontal: 16,
  },

  // Horizontal Scroll
  horizontalScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },

  // Trending Card
  trendingCard: {
    width: 130,
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  rankBadge: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.white,
  },
  trendingAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendingAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  trendingName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  trendingPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  trendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  trendingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Popular Card
  popularCard: {
    width: 100,
    alignItems: 'center',
  },
  popularAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  popularAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  popularName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
    textAlign: 'center',
  },
  popularPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.gray700,
    marginBottom: 2,
  },
  popularChange: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Newest Item
  newestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  newestBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 10,
  },
  newestBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.white,
  },
  newestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.warningBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  newestAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.warning,
  },
  newestInfo: {
    flex: 1,
  },
  newestName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  newestMeta: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  newestRight: {
    alignItems: 'flex-end',
  },
  newestPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  newestChange: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Stock Item
  stockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  stockRank: {
    width: 24,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textTertiary,
  },
  stockAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stockAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  stockInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  stockMeta: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  stockRight: {
    alignItems: 'flex-end',
  },
  stockPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Post Item
  postItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  postContent: {},
  postText: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postAuthor: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  postStats: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },

  // Bottom
  bottomSpacing: {
    height: 40,
  },
});
