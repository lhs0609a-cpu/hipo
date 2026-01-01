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
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getStocks, getRecommendedStocks, getMarketChartData } from '../api/stocks';
import { getSavedUser } from '../api/auth';
import { getTrendingPosts } from '../api/posts';
import { getTrendingByCategories } from '../api/users';
import theme from '../styles/theme';
import { SectionCard, ListItem, StockCard } from '../components/Card';

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

      const holdings = stocksData.stocks.filter(s => s.myShares > 0).slice(0, 3);
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

  // Quick Actions - Toss Style
  const renderQuickActions = () => {
    const actions = [
      { icon: '💸', label: '충전', onPress: () => navigation.navigate('POCharge') },
      { icon: '📤', label: '송금', onPress: () => {} },
      { icon: '💼', label: '내 주식', onPress: () => navigation.navigate('Portfolio') },
      { icon: '📱', label: '피드', onPress: () => navigation.navigate('Community') },
      { icon: '📊', label: '랭킹', onPress: () => navigation.navigate('Ranking') },
    ];

    return (
      <View style={styles.quickActions}>
        {actions.map((action, index) => (
          <Pressable
            key={index}
            style={({ pressed }) => [
              styles.quickActionItem,
              pressed && styles.quickActionPressed
            ]}
            onPress={action.onPress}
          >
            <View style={styles.quickActionIcon}>
              <Text style={styles.quickActionEmoji}>{action.icon}</Text>
            </View>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  };

  // Asset Card - Toss Style Header
  const renderAssetHeader = () => {
    return (
      <View style={styles.assetSection}>
        <Pressable
          style={({ pressed }) => [
            styles.assetCard,
            pressed && { opacity: 0.95 }
          ]}
          onPress={() => navigation.navigate('Wallet')}
        >
          <View style={styles.assetLabelRow}>
            <Text style={styles.assetLabel}>내 자산</Text>
            <Text style={styles.assetChevron}>›</Text>
          </View>
          <View style={styles.assetAmountRow}>
            <Text style={styles.assetAmount}>{(user?.poBalance || 0).toLocaleString()}</Text>
            <Text style={styles.assetCurrency}> P</Text>
          </View>
        </Pressable>

        {renderQuickActions()}
      </View>
    );
  };

  // My Holdings Section
  const renderMyHoldings = () => {
    if (myHoldings.length === 0) return null;

    return (
      <SectionCard
        title="내 보유 주식"
        action={
          <Pressable onPress={() => navigation.navigate('Portfolio')}>
            <Text style={styles.sectionMore}>전체보기</Text>
          </Pressable>
        }
      >
        {myHoldings.map((item) => {
          const priceChange = item.priceChangePercent || 0;
          const isUp = priceChange >= 0;
          const totalValue = (item.myShares || 0) * item.sharePrice;

          return (
            <ListItem
              key={item.id}
              title={item.issuer.username}
              subtitle={`${item.myShares}주 · ${item.sharePrice.toLocaleString()} P`}
              right={
                <View style={styles.holdingRight}>
                  <Text style={styles.holdingValue}>{totalValue.toLocaleString()} P</Text>
                  <Text style={[
                    styles.holdingChange,
                    { color: isUp ? theme.colors.stockUp : theme.colors.stockDown }
                  ]}>
                    {formatChange(priceChange)}
                  </Text>
                </View>
              }
              onPress={() => navigation.navigate('StockDetail', { stockId: item.id })}
              showChevron
            />
          );
        })}
      </SectionCard>
    );
  };

  // Market Overview Section
  const renderMarketOverview = () => {
    if (!chartData || !chartData.chartData || chartData.chartData.length === 0) return null;

    const stats = chartData.marketStats;
    const priceChange = parseFloat(stats.priceChangePercent || 0);
    const isUp = priceChange >= 0;

    const data = {
      labels: chartData.chartData.map((_, idx) => idx % 3 === 0 ? '' : ''),
      datasets: [{
        data: chartData.chartData.map(d => d.price)
      }]
    };

    return (
      <SectionCard title="시장 현황">
        <View style={styles.marketCard}>
          <View style={styles.marketHeader}>
            <View>
              <Text style={styles.marketLabel}>현재 지수</Text>
              <Text style={styles.marketPrice}>{parseFloat(stats.currentPrice || 0).toLocaleString()} P</Text>
            </View>
            <View style={[
              styles.marketChangeBadge,
              { backgroundColor: isUp ? theme.colors.stockUpBackground : theme.colors.stockDownBackground }
            ]}>
              <Text style={[
                styles.marketChangeText,
                { color: isUp ? theme.colors.stockUp : theme.colors.stockDown }
              ]}>
                {isUp ? '+' : ''}{priceChange.toFixed(2)}%
              </Text>
            </View>
          </View>

          <View style={styles.chartWrapper}>
            <LineChart
              data={data}
              width={screenWidth - 72}
              height={120}
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
                strokeWidth: 2,
              }}
              bezier
              style={styles.chart}
            />
          </View>

          <View style={styles.marketStats}>
            <View style={styles.marketStatItem}>
              <Text style={styles.marketStatLabel}>거래대금</Text>
              <Text style={styles.marketStatValue}>{parseInt(stats.totalVolume || 0).toLocaleString()} P</Text>
            </View>
            <View style={styles.marketStatDivider} />
            <View style={styles.marketStatItem}>
              <Text style={styles.marketStatLabel}>시가총액</Text>
              <Text style={styles.marketStatValue}>{parseInt(stats.totalMarketCap || 0).toLocaleString()} P</Text>
            </View>
          </View>
        </View>
      </SectionCard>
    );
  };

  // Trending Creators Section
  const renderTrendingCreators = () => {
    if (!recommended.trending || recommended.trending.length === 0) return null;

    return (
      <SectionCard
        title="급상승"
        subtitle="지금 가장 핫한 크리에이터"
        action={
          <Pressable onPress={() => navigation.navigate('StockMarket')}>
            <Text style={styles.sectionMore}>전체보기</Text>
          </Pressable>
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {recommended.trending.slice(0, 10).map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.creatorCard,
                pressed && styles.cardPressed
              ]}
              onPress={() => navigation.navigate('StockDetail', { stockId: item.id })}
            >
              <View style={styles.creatorAvatar}>
                <Text style={styles.creatorAvatarText}>
                  {item.issuer?.username?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <Text style={styles.creatorName} numberOfLines={1}>{item.issuer?.username}</Text>
              <Text style={styles.creatorPrice}>{item.sharePrice?.toLocaleString()} P</Text>
              <Text style={[
                styles.creatorChange,
                { color: (item.priceChangePercent || 0) >= 0 ? theme.colors.stockUp : theme.colors.stockDown }
              ]}>
                {(item.priceChangePercent || 0) >= 0 ? '+' : ''}{(item.priceChangePercent || 0).toFixed(2)}%
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </SectionCard>
    );
  };

  // Category Section
  const renderCategories = () => {
    const categoriesArray = Object.values(categories);
    if (categoriesArray.length === 0) return null;

    return categoriesArray.slice(0, 3).map((category, idx) => {
      if (!category.users || category.users.length === 0) return null;

      return (
        <SectionCard key={idx} title={`${category.icon || '🔥'} ${category.name}`}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {category.users.slice(0, 8).map((user) => (
              <Pressable
                key={user.id}
                style={({ pressed }) => [
                  styles.categoryUserCard,
                  pressed && styles.cardPressed
                ]}
                onPress={() => navigation.navigate('Profile', { userId: user.id })}
              >
                <View style={styles.categoryUserAvatar}>
                  <Text style={styles.categoryUserAvatarText}>{user.username[0].toUpperCase()}</Text>
                </View>
                <Text style={styles.categoryUserName} numberOfLines={1}>{user.username}</Text>
                <Text style={styles.categoryUserMeta}>{user.followersCount || 0} 팔로워</Text>
              </Pressable>
            ))}
          </ScrollView>
        </SectionCard>
      );
    });
  };

  // All Creators List
  const renderAllCreators = () => {
    if (stocks.length === 0) return null;

    return (
      <SectionCard
        title="전체 크리에이터"
        subtitle={`${stocks.length}명의 크리에이터`}
      >
        {stocks.slice(0, 20).map((item) => {
          const priceChange = item.priceChangePercent || 0;
          const isUp = priceChange >= 0;

          return (
            <StockCard
              key={item.id}
              stockName={item.issuer?.username || '알 수 없음'}
              username={item.issuer?.username}
              currentPrice={item.sharePrice}
              priceChange={item.priceChange || 0}
              priceChangePercent={priceChange}
              onPress={() => navigation.navigate('StockDetail', { stockId: item.id })}
              compact
            />
          );
        })}
      </SectionCard>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
        {renderCategories()}
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
  scrollContent: {
    paddingBottom: theme.spacing['2xl'],
  },

  // Asset Section - Toss Style
  assetSection: {
    backgroundColor: theme.colors.white,
    paddingTop: 60,
    paddingBottom: theme.spacing.lg,
  },
  assetCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  assetLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  assetLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  assetChevron: {
    fontSize: 20,
    color: theme.colors.textTertiary,
  },
  assetAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  assetAmount: {
    fontSize: theme.typography.fontSize['4xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  assetCurrency: {
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  // Quick Actions - Toss Style
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.base,
  },
  quickActionItem: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  quickActionPressed: {
    opacity: 0.7,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: theme.borderRadius.base,
    backgroundColor: theme.colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  quickActionEmoji: {
    fontSize: 24,
  },
  quickActionLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
  },

  // Section Styles
  sectionMore: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    fontWeight: theme.typography.fontWeight.medium,
  },

  // Holdings
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  holdingChange: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },

  // Market Card
  marketCard: {
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.gray50,
    borderRadius: theme.borderRadius.md,
  },
  marketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.base,
  },
  marketLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  marketPrice: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  marketChangeBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  marketChangeText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  chartWrapper: {
    marginHorizontal: -theme.spacing.sm,
    marginBottom: theme.spacing.base,
  },
  chart: {
    borderRadius: theme.borderRadius.sm,
  },
  marketStats: {
    flexDirection: 'row',
    paddingTop: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray200,
  },
  marketStatItem: {
    flex: 1,
  },
  marketStatLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.xs,
  },
  marketStatValue: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  marketStatDivider: {
    width: 1,
    backgroundColor: theme.colors.gray200,
    marginHorizontal: theme.spacing.base,
  },

  // Horizontal Scroll
  horizontalScroll: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },

  // Creator Card
  creatorCard: {
    width: 120,
    padding: theme.spacing.base,
    backgroundColor: theme.colors.gray50,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  creatorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  creatorAvatarText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.white,
  },
  creatorName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  creatorPrice: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  creatorChange: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },

  // Category User Card
  categoryUserCard: {
    width: 80,
    alignItems: 'center',
  },
  categoryUserAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  categoryUserAvatarText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  categoryUserName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: 2,
    textAlign: 'center',
  },
  categoryUserMeta: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },

  // Bottom Spacing
  bottomSpacing: {
    height: theme.spacing['3xl'],
  },
});
