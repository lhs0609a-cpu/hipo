import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StoryBanner from '../components/StoryBanner';
import PortfolioSummaryWidget from '../components/PortfolioSummaryWidget';
import TrendingStocksWidget from '../components/TrendingStocksWidget';
import QuickActionsWidget from '../components/QuickActionsWidget';
import { PostCard } from '../components/Card';
import { Stagger } from '../components/Animated';
import EmptyState from '../components/EmptyState';

/**
 * HomeScreenRedesigned
 *
 * Modern, widget-based home screen with:
 * - Story banner for creators
 * - Portfolio summary
 * - Quick actions
 * - Trending stocks
 * - Recent posts feed
 */
const HomeScreenRedesigned = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stories: [],
    portfolio: {},
    trendingStocks: [],
    recentPosts: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // TODO: Replace with actual API calls
      // const apiService = await import('../services/apiService');

      // Mock data for demonstration
      setData({
        stories: [
          { id: '1', username: 'creator1', profileImage: null, hasUnviewed: true },
          { id: '2', username: 'creator2', profileImage: null, hasUnviewed: true },
          { id: '3', username: 'creator3', profileImage: null, hasUnviewed: false },
        ],
        portfolio: {
          totalValue: 150000,
          todayChange: 5000,
          todayChangePercent: 3.45,
        },
        trendingStocks: [
          {
            id: '1',
            stockName: 'IU',
            username: 'iu_official',
            currentPrice: 12500,
            priceChange: 800,
            priceChangePercent: 6.84,
            profileImage: null,
          },
          {
            id: '2',
            stockName: '손흥민',
            username: 'sonheungmin',
            currentPrice: 25000,
            priceChange: 1500,
            priceChangePercent: 6.38,
            profileImage: null,
          },
          {
            id: '3',
            stockName: '유재석',
            username: 'yoo_jaeseok',
            currentPrice: 18000,
            priceChange: -500,
            priceChangePercent: -2.7,
            profileImage: null,
          },
        ],
        recentPosts: [
          {
            id: '1',
            username: 'creator1',
            timeAgo: '1시간 전',
            content: '안녕하세요! 오늘도 좋은 하루 되세요 ✨',
            likes: 124,
            comments: 23,
          },
          {
            id: '2',
            username: 'creator2',
            timeAgo: '3시간 전',
            content: '새로운 프로젝트를 시작했어요! 많은 관심 부탁드립니다 🎉',
            likes: 89,
            comments: 15,
          },
        ],
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading home data:', error);
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleStoryPress = (story) => {
    // TODO: Navigate to story viewer
    console.log('Story pressed:', story);
  };

  const handleStockPress = (stock) => {
    navigation.navigate('StockDetail', { stockId: stock.id });
  };

  const handleViewPortfolio = () => {
    navigation.navigate('Portfolio');
  };

  const handleTrade = () => {
    navigation.navigate('Trade');
  };

  const handlePostPress = (post) => {
    navigation.navigate('PostDetail', { postId: post.id });
  };

  const handlePostLike = (post) => {
    // TODO: Implement like functionality
    console.log('Like post:', post);
  };

  const handlePostComment = (post) => {
    navigation.navigate('PostDetail', { postId: post.id, focusComment: true });
  };

  const quickActions = [
    {
      id: 'trade',
      icon: '💰',
      label: '거래',
      color: theme.colors.primary,
      onPress: handleTrade,
    },
    {
      id: 'portfolio',
      icon: '📊',
      label: '포트폴리오',
      color: theme.colors.secondary,
      onPress: handleViewPortfolio,
    },
    {
      id: 'wallet',
      icon: '💳',
      label: '지갑',
      color: theme.colors.success,
      onPress: () => navigation.navigate('Wallet'),
    },
    {
      id: 'ranking',
      icon: '🏆',
      label: '랭킹',
      color: theme.colors.warning,
      onPress: () => navigation.navigate('Ranking'),
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState variant="default" title="로딩 중..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Story Banner */}
        <StoryBanner
          stories={data.stories}
          onStoryPress={handleStoryPress}
        />

        {/* Portfolio Summary */}
        <PortfolioSummaryWidget
          totalValue={data.portfolio.totalValue}
          todayChange={data.portfolio.todayChange}
          todayChangePercent={data.portfolio.todayChangePercent}
          onViewPortfolio={handleViewPortfolio}
          onTrade={handleTrade}
        />

        {/* Quick Actions */}
        <QuickActionsWidget actions={quickActions} />

        {/* Trending Stocks */}
        <TrendingStocksWidget
          title="🔥 인기 급상승"
          stocks={data.trendingStocks}
          onStockPress={handleStockPress}
          onViewAll={() => navigation.navigate('Trending')}
        />

        {/* Recent Posts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>최근 게시물</Text>
          </View>

          {data.recentPosts.length > 0 ? (
            <Stagger animation="fadeIn" staggerDelay={100}>
              {data.recentPosts.map((post) => (
                <PostCard
                  key={post.id}
                  username={post.username}
                  timeAgo={post.timeAgo}
                  content={post.content}
                  likes={post.likes}
                  comments={post.comments}
                  onPress={() => handlePostPress(post)}
                  onLike={() => handlePostLike(post)}
                  onComment={() => handlePostComment(post)}
                  style={styles.postCard}
                />
              ))}
            </Stagger>
          ) : (
            <EmptyState
              variant="no-posts"
              style={styles.emptyState}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: t.spacing['2xl'],
  },
  section: {
    marginTop: t.spacing.lg,
  },
  sectionHeader: {
    paddingHorizontal: t.spacing.base,
    marginBottom: t.spacing.md,
  },
  sectionTitle: {
    fontSize: t.typography.fontSize.lg,
    fontWeight: t.typography.fontWeight.bold,
    color: t.colors.textPrimary,
  },
  postCard: {
    marginHorizontal: t.spacing.base,
    marginBottom: t.spacing.sm,
  },
  emptyState: {
    paddingVertical: t.spacing['3xl'],
  },
});

export default HomeScreenRedesigned;
