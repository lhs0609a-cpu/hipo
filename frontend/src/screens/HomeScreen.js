import React, { useState, useEffect, useMemo } from 'react';
import { getAppWidth, getAppHeight } from '../utils/appWidth';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { Money, Delta } from '../components/ui/Money';
import { hitSlop } from '../styles/tokens';
import { getStocks, getRecommendedStocks, getMarketChartData } from '../api/stocks';
import { getSavedUser } from '../api/auth';
import { getTrendingPosts } from '../api/posts';
import { getTrendingByCategories } from '../api/users';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import DividendCalendarWidget from '../components/DividendCalendarWidget';
import LoginStreakWidget from '../components/LoginStreakWidget';
import VirtualStatusBadge from '../components/VirtualStatusBadge';
import SparklineChart from '../components/stock/SparklineChart';
import LiveTradeFeed from '../components/LiveTradeFeed';
import { virtualCelebrityAPI } from '../services/api';

const screenWidth = getAppWidth();

export default function HomeScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
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
  const [virtualCelebs, setVirtualCelebs] = useState([]);

  // Dynamic styles based on theme
  const dynamicStyles = useMemo(() => ({
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
    assetSection: {
      backgroundColor: theme.colors.surface,
      // 실제 상태바 인셋 위에 여백을 얹는다 (기기별 하드코딩 제거)
      paddingTop: insets.top + 12,
      paddingBottom: 24,
    },
    sectionCard: {
      backgroundColor: theme.colors.surface,
      marginTop: theme.layout.sectionSpacing,
      paddingVertical: 22,
    },
    holdingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    itemPressed: {
      backgroundColor: theme.colors.backgroundSecondary,
    },
    trendingCard: {
      width: 130,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      position: 'relative',
    },
    chartConfig: {
      backgroundColor: 'transparent',
      backgroundGradientFrom: theme.colors.surface,
      backgroundGradientTo: theme.colors.surface,
      decimalPlaces: 0,
      strokeWidth: 2.5,
    },
  }), [theme, isDark, insets.top]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stocksData, recommendedData, userData, chartDataResult, trendingPostsData, categoriesData, virtualCelebsData] = await Promise.all([
        getStocks(),
        getRecommendedStocks(),
        getSavedUser(),
        getMarketChartData('1d', 12).catch(() => ({ chartData: [], marketStats: {} })),
        getTrendingPosts(1, 10).catch(() => ({ posts: [] })),
        getTrendingByCategories(5).catch(() => ({ categories: {} })),
        virtualCelebrityAPI.browse({ limit: 10 }).then(r => r.data).catch(() => ({ data: [] })),
      ]);
      setStocks(stocksData.stocks);
      setRecommended(recommendedData);
      setUser(userData);
      setChartData(chartDataResult);
      setTrendingPosts(trendingPostsData.posts || []);
      setCategories(categoriesData.categories || {});
      setVirtualCelebs(virtualCelebsData.data || []);

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

  // 퀵 액션 정의 — 이모지 대신 벡터 아이콘으로 통일해 렌더 편차를 없앤다
  const QUICK_ACTIONS = [
    { key: 'charge', label: '충전', icon: 'add-circle', route: 'POCharge', colors: theme.colors.gradients.brand },
    { key: 'portfolio', label: '내 주식', icon: 'pie-chart', route: 'Portfolio', colors: ['#8B5CF6', '#A78BFA'] },
    { key: 'ranking', label: '랭킹', icon: 'trophy', route: 'Ranking', colors: ['#F59B00', '#FBBF4C'] },
    { key: 'dividend', label: '배당', icon: 'gift', route: 'Dividend', colors: ['#00B368', '#34D399'] },
    { key: 'invite', label: '초대', icon: 'person-add', route: 'Invite', colors: ['#EC5F9E', '#F080B7'] },
  ];

  const QuickAction = ({ item }) => (
    <Pressable
      style={({ pressed }) => [styles.quickActionItem, pressed && styles.quickActionPressed]}
      onPress={() => navigation.navigate(item.route)}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <LinearGradient
        colors={item.colors}
        style={styles.quickActionIconBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={item.icon} size={22} color="#FFFFFF" />
      </LinearGradient>
      <Text style={styles.quickActionLabel}>{item.label}</Text>
    </Pressable>
  );

  // 히어로 — 자산이 화면에서 가장 먼저, 가장 크게 읽혀야 한다
  const renderAssetHeader = () => {
    const holdingsValue = myHoldings.reduce(
      (sum, s) => sum + (s.myShares || 0) * (s.sharePrice || 0),
      0
    );
    const holdingsDelta = myHoldings.length
      ? myHoldings.reduce((sum, s) => sum + (s.priceChangePercent || 0), 0) / myHoldings.length
      : 0;

    return (
      <View style={dynamicStyles.assetSection}>
        <Pressable
          style={({ pressed }) => [styles.assetCard, pressed && { opacity: 0.6 }]}
          onPress={() => navigation.navigate('Wallet')}
          accessibilityRole="button"
          accessibilityLabel="내 자산, 지갑으로 이동"
        >
          <View style={styles.assetLabelRow}>
            <Text style={styles.assetLabel}>내 자산</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
          </View>

          <Money
            value={user?.poBalance || 0}
            suffix="PO"
            size="display"
            color={theme.colors.textPrimary}
          />

          {holdingsValue > 0 ? (
            <View style={styles.assetSubRow}>
              <Text style={styles.assetSubLabel}>보유 평가</Text>
              <Money
                value={holdingsValue}
                size="caption"
                color={theme.colors.textSecondary}
                compact
              />
              <Delta value={holdingsDelta} size="caption" variant="pill" style={{ marginLeft: 6 }} />
            </View>
          ) : null}
        </Pressable>

        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((item) => (
            <QuickAction key={item.key} item={item} />
          ))}
        </View>
      </View>
    );
  };

  // 내 보유 주식 섹션
  const renderMyHoldings = () => {
    if (myHoldings.length === 0) return null;

    return (
      <View style={dynamicStyles.sectionCard}>
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
                <Text style={styles.holdingValue}>{totalValue.toLocaleString()} PO</Text>
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
      <View style={dynamicStyles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>시장 현황</Text>
        </View>

        <View style={styles.marketContent}>
          <View style={styles.marketMain}>
            <Text style={styles.marketLabel}>HIPO 지수</Text>
            <Money
              value={parseFloat(stats.currentPrice || 1000)}
              size="headline"
              color={theme.colors.textPrimary}
            />
            <Delta value={priceChange} size="caption" style={{ marginTop: 8 }} />
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
                  ...dynamicStyles.chartConfig,
                  color: () => isUp ? theme.colors.stockUp : theme.colors.stockDown,
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
                {parseInt(stats.totalVolume || 0).toLocaleString()} PO
              </Text>
            </View>
            <View style={styles.marketStatDivider} />
            <View style={styles.marketStatItem}>
              <Text style={styles.marketStatLabel}>시가총액</Text>
              <Text style={styles.marketStatValue}>
                {parseInt(stats.totalMarketCap || 0).toLocaleString()} PO
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
      <View style={dynamicStyles.sectionCard}>
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
              ['#D9A521', '#F59B00'],  // 1등 금색
              ['#9BA3AF', '#A3ABBA'],  // 2등 은색
              ['#B87333', '#8A5626'],  // 3등 동색
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
                {item.isVirtualListing && (
                  <VirtualStatusBadge
                    virtualStatus={item.issuer?.virtualStatus || 'unclaimed'}
                    size="small"
                    style={{ marginBottom: 4 }}
                  />
                )}
                {item.recentPrices && item.recentPrices.length > 1 && (
                  <SparklineChart
                    data={item.recentPrices}
                    width={80}
                    height={28}
                    showLastDot
                  />
                )}
                <Text style={styles.trendingPrice}>
                  {item.sharePrice?.toLocaleString()} PO
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

  // 배당률 TOP 섹션
  const renderHighDividendCreators = () => {
    // 배당률 높은 순으로 정렬
    const highDividendList = [...stocks]
      .filter(s => s.dividendRate > 0)
      .sort((a, b) => (b.dividendRate || 0) - (a.dividendRate || 0))
      .slice(0, 5);

    if (highDividendList.length === 0) return null;

    return (
      <View style={dynamicStyles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderWithIcon}>
            <View style={[styles.sectionIconBg, { backgroundColor: '#FFF6E6' }]}>
              <Ionicons name="wallet-outline" style={styles.sectionIconEmoji} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>배당률 TOP</Text>
              <Text style={styles.sectionSubtitle}>높은 배당을 받을 수 있어요</Text>
            </View>
          </View>
          <Pressable onPress={() => navigation.navigate('Dividend')}>
            <Text style={styles.sectionMore}>더보기 ›</Text>
          </Pressable>
        </View>

        {highDividendList.map((item, index) => {
          const change = item.priceChangePercent || 0;
          const isUp = change >= 0;

          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.dividendItem,
                pressed && styles.itemPressed,
                index === highDividendList.length - 1 && styles.lastItem
              ]}
              onPress={() => navigation.navigate('StockDetail', { stockId: item.id })}
            >
              <View style={styles.dividendRankBadge}>
                <Text style={styles.dividendRankText}>{index + 1}</Text>
              </View>
              <View style={styles.dividendAvatar}>
                <Text style={styles.dividendAvatarText}>
                  {item.issuer?.username?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.dividendInfo}>
                <Text style={styles.dividendName}>{item.issuer?.displayName || item.issuer?.username}</Text>
                <Text style={styles.dividendPrice}>{item.sharePrice?.toLocaleString()} PO</Text>
              </View>
              <View style={styles.dividendRateBox}>
                <Text style={styles.dividendRateLabel}>배당률</Text>
                <Text style={styles.dividendRateValue}>{item.dividendRate || 0}%</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  };

  // 인기 크리에이터 섹션
  const renderPopularCreators = () => {
    const popularList = recommended.popular || [];
    if (popularList.length === 0) return null;

    return (
      <View style={dynamicStyles.sectionCard}>
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
                  {item.sharePrice?.toLocaleString()} PO
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
      <View style={dynamicStyles.sectionCard}>
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
                  시가총액 {(item.marketCap || 0).toLocaleString()} PO
                </Text>
              </View>
              <View style={styles.newestRight}>
                <Text style={styles.newestPrice}>{item.sharePrice?.toLocaleString()} PO</Text>
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

  // 인기 가상 셀럽 섹션
  /**
   * 상장 대기 섹션.
   *
   * 본인 확인 전 인물에는 가격·등락률을 표시하지 않는다.
   * 표시하는 값은 "몇 명이 기다리는가" 뿐이며, 이건 그 인물에 대한 평가가 아니라
   * 우리 이용자들의 수요다. 카피도 그 주어를 유지해야 한다.
   */
  const renderVirtualCelebs = () => {
    if (virtualCelebs.length === 0) return null;

    return (
      <View style={dynamicStyles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>상장을 기다리는 중</Text>
            <Text style={styles.sectionSubtitle}>
              본인 확인이 완료되면 상장돼요
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('CelebSuggestion')}
            hitSlop={hitSlop.base}
          >
            <Text style={styles.sectionMore}>요청하기 ›</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {virtualCelebs.slice(0, 10).map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.trendingCard,
                {
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surfaceSunken,
                },
                pressed && styles.cardPressed,
              ]}
              onPress={() => navigation.navigate('CelebSuggestion')}
              accessibilityRole="button"
              accessibilityLabel={`${item.displayName || item.username}, ${item.waitingCount || 0}명이 기다리는 중`}
            >
              {/* 초상권: 본인 확인 전에는 실사진 대신 이니셜만 */}
              <View style={[styles.trendingAvatar, { backgroundColor: theme.colors.backgroundTertiary }]}>
                <Text style={[styles.trendingAvatarText, { color: theme.colors.textSecondary }]}>
                  {item.avatarInitial || '?'}
                </Text>
              </View>

              <Text style={styles.trendingName} numberOfLines={1}>
                {item.displayName || item.username}
              </Text>

              <View style={styles.waitingRow}>
                <Ionicons name="people-outline" size={12} color={theme.colors.textTertiary} />
                <Text style={styles.waitingText}>
                  {(item.waitingCount || 0).toLocaleString()}명 대기
                </Text>
              </View>

              <View style={[styles.pendingChip, { backgroundColor: theme.colors.backgroundTertiary }]}>
                <Text style={[styles.pendingChipText, { color: theme.colors.textTertiary }]}>
                  상장 전
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  // 전체 크리에이터 리스트
  const renderAllCreators = () => {
    if (stocks.length === 0) return null;

    return (
      <View style={dynamicStyles.sectionCard}>
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
                <Text style={styles.stockPrice}>{item.sharePrice?.toLocaleString()} PO</Text>
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
      <View style={dynamicStyles.sectionCard}>
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

  /**
   * 상장된 종목이 하나도 없을 때.
   *
   * 이 상태에서는 추천·전체목록 섹션이 전부 null 을 돌려주기 때문에
   * 자산/시장현황 아래로 거대한 빈 공간만 남는다. 첫인상이 "고장난 앱"이 된다.
   * 대신 지금 할 수 있는 행동을 준다 (온보딩 빈 상태와 같은 논리).
   */
  const renderEmptyMarket = () => {
    if (stocks.length > 0 || virtualCelebs.length > 0) return null;

    return (
      <View style={dynamicStyles.sectionCard}>
        <View style={styles.emptyMarket}>
          <Ionicons name="storefront-outline" size={36} color={theme.colors.textTertiary} />
          <Text style={styles.emptyMarketTitle}>아직 상장된 크리에이터가 없어요</Text>
          <Text style={styles.emptyMarketDesc}>
            HIPO는 본인이 동의한 사람만 상장합니다.{'\n'}
            첫 크리에이터를 모시는 중이에요.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.emptyMarketBtn, pressed && { opacity: 0.7 }]}
            onPress={() => navigation.navigate('CelebSuggestion')}
          >
            <Text style={styles.emptyMarketBtnText}>보고 싶은 사람 상장 요청하기</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.emptyMarketLink, pressed && { opacity: 0.6 }]}
            onPress={() => navigation.navigate('Invite')}
            hitSlop={hitSlop.base}
          >
            <Text style={styles.emptyMarketLinkText}>내 종목에 첫 주주 초대하기</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={dynamicStyles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
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
        {isAuthenticated && <LoginStreakWidget onRewardClaimed={loadData} />}
        {renderMyHoldings()}
        {renderMarketOverview()}
        <View style={styles.tradeFeedContainer}>
          <LiveTradeFeed compact />
        </View>
        {isAuthenticated && <DividendCalendarWidget navigation={navigation} />}
        {renderTrendingCreators()}
        {renderVirtualCelebs()}
        {renderHighDividendCreators()}
        {renderPopularCreators()}
        {renderNewestCreators()}
        {renderCommunityHighlight()}
        {renderAllCreators()}
        {renderEmptyMarket()}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  tradeFeedContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },

  // Asset Section
  assetSection: {
    backgroundColor: t.colors.white,
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
    ...t.textStyles.captionStrong,
    color: t.colors.textSecondary,
  },
  assetSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  assetSubLabel: {
    ...t.textStyles.caption,
    color: t.colors.textTertiary,
    marginRight: 6,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    // 각 항목이 flex:1 로 균등 분배되므로 space-between 은 불필요
    paddingHorizontal: 12,
  },
  quickActionItem: {
    // 폭을 균등 배분한다. space-between 만 쓰면 넓은 화면에서 양끝으로 벌어져
    // 가운데가 텅 비어 보인다 (웹 데스크톱에서 특히 두드러졌다).
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  quickActionPressed: {
    opacity: 0.65,
  },
  quickActionIconBg: {
    width: 50,
    height: 50,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    ...t.textStyles.footnote,
    color: t.colors.textSecondary,
  },

  // Section Card
  sectionCard: {
    backgroundColor: t.colors.white,
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
    ...t.textStyles.title3,
    color: t.colors.textPrimary,
  },
  sectionSubtitle: {
    ...t.textStyles.caption,
    color: t.colors.textTertiary,
    marginTop: 3,
  },
  sectionMore: {
    ...t.textStyles.captionStrong,
    color: t.colors.textTertiary,
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionIconEmoji: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
  },

  // Dividend TOP Section
  dividendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  dividendRankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: t.colors.warningBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dividendRankText: {
    fontSize: 12,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.warning,
  },
  dividendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dividendAvatarText: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.primary,
  },
  dividendInfo: {
    flex: 1,
  },
  dividendName: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
  },
  dividendPrice: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginTop: 2,
  },
  dividendRateBox: {
    alignItems: 'flex-end',
  },
  dividendRateLabel: {
    fontSize: 11,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
  },
  dividendRateValue: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.warning,
  },

  // Holdings
  holdingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  itemPressed: {
    backgroundColor: t.colors.background,
  },
  holdingAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  holdingAvatarText: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.white,
  },
  holdingInfo: {
    flex: 1,
  },
  holdingName: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
    marginBottom: 2,
  },
  holdingShares: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
    marginBottom: 2,
  },
  holdingChange: {
    fontSize: 14,
    fontFamily: t.fonts.medium,
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
    ...t.textStyles.caption,
    color: t.colors.textTertiary,
    marginBottom: 6,
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
    borderTopColor: t.colors.divider,
  },
  marketStatItem: {
    flex: 1,
  },
  marketStatLabel: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginBottom: 4,
  },
  marketStatValue: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
  },
  marketStatDivider: {
    width: 1,
    backgroundColor: t.colors.divider,
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
    backgroundColor: t.colors.background,
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
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.white,
  },
  trendingAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: t.colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendingAvatarText: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textSecondary,
  },
  trendingName: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  trendingPrice: {
    fontSize: 15,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textPrimary,
    marginBottom: 6,
  },
  trendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  trendingBadgeText: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },

  // 상장 종목이 없을 때의 빈 상태
  emptyMarket: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyMarketTitle: {
    ...t.textStyles.headline,
    color: t.colors.textPrimary,
    marginTop: 12,
  },
  emptyMarketDesc: {
    ...t.textStyles.caption,
    color: t.colors.textTertiary,
    textAlign: 'center',
    marginTop: 6,
  },
  emptyMarketBtn: {
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: t.borderRadius.full,
    backgroundColor: t.colors.primaryBackground,
  },
  emptyMarketBtnText: {
    ...t.textStyles.bodyStrong,
    color: t.colors.primary,
  },
  emptyMarketLink: {
    marginTop: 12,
    paddingVertical: 6,
  },
  emptyMarketLinkText: {
    ...t.textStyles.caption,
    color: t.colors.textSecondary,
    textDecorationLine: 'underline',
  },

  // 상장 대기 카드 — 가격 대신 대기 인원만 표시한다
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 3,
  },
  waitingText: {
    ...t.textStyles.footnote,
    color: t.colors.textTertiary,
  },
  pendingChip: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: t.borderRadius.full,
  },
  pendingChipText: {
    ...t.textStyles.footnote,
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
    backgroundColor: t.colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  popularAvatarText: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.primary,
  },
  popularName: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
    marginBottom: 2,
    textAlign: 'center',
  },
  popularPrice: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.gray700,
    marginBottom: 2,
  },
  popularChange: {
    fontSize: 12,
    fontFamily: t.fonts.medium,
    fontWeight: '500',
  },

  // Newest Item
  newestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  newestBadge: {
    backgroundColor: t.colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 10,
  },
  newestBadgeText: {
    fontSize: 11,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.white,
  },
  newestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.warningBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  newestAvatarText: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.warning,
  },
  newestInfo: {
    flex: 1,
  },
  newestName: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
    marginBottom: 2,
  },
  newestMeta: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
  },
  newestRight: {
    alignItems: 'flex-end',
  },
  newestPrice: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
    marginBottom: 2,
  },
  newestChange: {
    fontSize: 12,
    fontFamily: t.fonts.medium,
    fontWeight: '500',
  },

  // Stock Item
  stockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  stockRank: {
    width: 24,
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textTertiary,
  },
  stockAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stockAvatarText: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textSecondary,
  },
  stockInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
    marginBottom: 2,
  },
  stockMeta: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
  },
  stockRight: {
    alignItems: 'flex-end',
  },
  stockPrice: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
    marginBottom: 4,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  stockBadgeText: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },

  // Post Item
  postItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  postContent: {},
  postText: {
    fontSize: 15,
    fontFamily: t.fonts.regular,
    lineHeight: 22,
    color: t.colors.textPrimary,
    marginBottom: 8,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postAuthor: {
    fontSize: 12,
    fontFamily: t.fonts.medium,
    color: t.colors.primary,
    fontWeight: '500',
  },
  postStats: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
  },

  // Bottom
  bottomSpacing: {
    height: 40,
  },
});
