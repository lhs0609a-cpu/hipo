import React, { useEffect, useRef } from 'react';
import { getAppWidth, getAppHeight } from '../utils/appWidth';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';

const SCREEN_WIDTH = getAppWidth();

/**
 * 스켈레톤 로딩 컴포넌트 (Shimmer Effect)
 */

// 기본 스켈레톤 박스
export const SkeletonBox = ({ width, height, borderRadius = 8, style }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <View
      style={[
        styles.skeletonBox,
        { width, height, borderRadius },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  );
};

// 원형 스켈레톤 (아바타용)
export const SkeletonCircle = ({ size = 44, style }) => (
  <SkeletonBox width={size} height={size} borderRadius={size / 2} style={style} />
);

// 텍스트 스켈레톤
export const SkeletonText = ({ width = '100%', height = 16, style }) => (
  <SkeletonBox width={width} height={height} borderRadius={4} style={style} />
);

// 홈 화면 자산 섹션 스켈레톤
export const HomeAssetSkeleton = () => (
  <View style={styles.homeAssetSkeleton}>
    <SkeletonText width={60} height={14} />
    <SkeletonText width={180} height={40} style={{ marginTop: 8 }} />
    <View style={styles.quickActionsSkeleton}>
      {[...Array(5)].map((_, i) => (
        <View key={i} style={styles.quickActionItemSkeleton}>
          <SkeletonBox width={56} height={56} borderRadius={16} />
          <SkeletonText width={40} height={12} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  </View>
);

// 주식 카드 스켈레톤
export const StockCardSkeleton = () => (
  <View style={styles.stockCardSkeleton}>
    <SkeletonCircle size={44} />
    <View style={styles.stockCardInfo}>
      <SkeletonText width={100} height={16} />
      <SkeletonText width={60} height={13} style={{ marginTop: 6 }} />
    </View>
    <View style={styles.stockCardRight}>
      <SkeletonText width={80} height={16} />
      <SkeletonBox width={50} height={24} borderRadius={6} style={{ marginTop: 6 }} />
    </View>
  </View>
);

// 주식 리스트 스켈레톤
export const StockListSkeleton = ({ count = 5 }) => (
  <View style={styles.listSkeleton}>
    {[...Array(count)].map((_, i) => (
      <StockCardSkeleton key={i} />
    ))}
  </View>
);

// 트렌딩 카드 스켈레톤 (수평 스크롤용)
export const TrendingCardSkeleton = () => (
  <View style={styles.trendingCardSkeleton}>
    <SkeletonCircle size={48} />
    <SkeletonText width={80} height={14} style={{ marginTop: 10 }} />
    <SkeletonText width={60} height={16} style={{ marginTop: 6 }} />
    <SkeletonBox width={50} height={22} borderRadius={6} style={{ marginTop: 6 }} />
  </View>
);

// 트렌딩 섹션 스켈레톤
export const TrendingSectionSkeleton = () => (
  <View style={styles.sectionSkeleton}>
    <View style={styles.sectionHeaderSkeleton}>
      <View>
        <SkeletonText width={120} height={18} />
        <SkeletonText width={160} height={13} style={{ marginTop: 4 }} />
      </View>
      <SkeletonText width={60} height={14} />
    </View>
    <View style={styles.horizontalScrollSkeleton}>
      {[...Array(4)].map((_, i) => (
        <TrendingCardSkeleton key={i} />
      ))}
    </View>
  </View>
);

// 포트폴리오 요약 스켈레톤
export const PortfolioSummarySkeleton = () => (
  <View style={styles.portfolioSummarySkeleton}>
    <SkeletonBox width="100%" height={180} borderRadius={20} />
    <View style={styles.portfolioStatsSkeleton}>
      {[...Array(3)].map((_, i) => (
        <View key={i} style={styles.portfolioStatItem}>
          <SkeletonBox width={40} height={40} borderRadius={12} />
          <View style={{ marginLeft: 8 }}>
            <SkeletonText width={30} height={18} />
            <SkeletonText width={50} height={11} style={{ marginTop: 4 }} />
          </View>
        </View>
      ))}
    </View>
  </View>
);

// 포트폴리오 아이템 스켈레톤
export const PortfolioItemSkeleton = () => (
  <View style={styles.portfolioItemSkeleton}>
    <View style={styles.portfolioItemHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <SkeletonText width={100} height={17} />
        <SkeletonCircle size={20} style={{ marginLeft: 8 }} />
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <SkeletonText width={80} height={16} />
        <SkeletonText width={50} height={13} style={{ marginTop: 4 }} />
      </View>
    </View>
    <SkeletonBox width="100%" height={60} borderRadius={10} style={{ marginTop: 12 }} />
    <View style={styles.portfolioItemDetails}>
      {[...Array(3)].map((_, i) => (
        <View key={i} style={styles.portfolioDetailRow}>
          <SkeletonText width={60} height={14} />
          <SkeletonText width={80} height={15} />
        </View>
      ))}
    </View>
  </View>
);

// 검색 결과 스켈레톤
export const SearchResultSkeleton = () => (
  <View style={styles.searchResultSkeleton}>
    <SkeletonCircle size={48} />
    <View style={styles.searchResultInfo}>
      <SkeletonText width={120} height={15} />
      <SkeletonText width={80} height={13} style={{ marginTop: 4 }} />
    </View>
    <SkeletonBox width={60} height={24} borderRadius={6} />
  </View>
);

// 알림 아이템 스켈레톤
export const NotificationItemSkeleton = () => (
  <View style={styles.notificationItemSkeleton}>
    <SkeletonBox width={44} height={44} borderRadius={12} />
    <View style={styles.notificationContent}>
      <View style={styles.notificationHeader}>
        <SkeletonText width={150} height={15} />
        <SkeletonText width={40} height={11} />
      </View>
      <SkeletonText width="90%" height={14} style={{ marginTop: 6 }} />
    </View>
  </View>
);

// 전체 화면 로딩 스켈레톤
export const FullScreenSkeleton = ({ type = 'home' }) => {
  if (type === 'portfolio') {
    return (
      <View style={styles.fullScreenSkeleton}>
        <PortfolioSummarySkeleton />
        <View style={{ marginTop: 24 }}>
          <View style={styles.sectionHeaderSkeleton}>
            <SkeletonText width={100} height={18} />
            <SkeletonText width={30} height={14} />
          </View>
          {[...Array(3)].map((_, i) => (
            <PortfolioItemSkeleton key={i} />
          ))}
        </View>
      </View>
    );
  }

  if (type === 'search') {
    return (
      <View style={styles.fullScreenSkeleton}>
        {[...Array(6)].map((_, i) => (
          <SearchResultSkeleton key={i} />
        ))}
      </View>
    );
  }

  if (type === 'notifications') {
    return (
      <View style={styles.fullScreenSkeleton}>
        {[...Array(5)].map((_, i) => (
          <NotificationItemSkeleton key={i} />
        ))}
      </View>
    );
  }

  // Default: home
  return (
    <View style={styles.fullScreenSkeleton}>
      <HomeAssetSkeleton />
      <View style={{ marginTop: 8 }}>
        <TrendingSectionSkeleton />
      </View>
      <View style={{ marginTop: 16 }}>
        <StockListSkeleton count={3} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonBox: {
    backgroundColor: COLORS.gray200,
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
  },
  shimmerGradient: {
    width: '100%',
    height: '100%',
  },
  // Home Asset
  homeAssetSkeleton: {
    backgroundColor: COLORS.surface,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  quickActionsSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 28,
  },
  quickActionItemSkeleton: {
    alignItems: 'center',
  },
  // Stock card
  stockCardSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.surface,
    marginBottom: 1,
  },
  stockCardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  stockCardRight: {
    alignItems: 'flex-end',
  },
  listSkeleton: {
    backgroundColor: COLORS.surface,
  },
  // Trending
  trendingCardSkeleton: {
    width: 130,
    backgroundColor: COLORS.gray100,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginRight: 12,
  },
  sectionSkeleton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 20,
  },
  sectionHeaderSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  horizontalScrollSkeleton: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  // Portfolio
  portfolioSummarySkeleton: {
    padding: 16,
    backgroundColor: COLORS.surface,
  },
  portfolioStatsSkeleton: {
    flexDirection: 'row',
    marginTop: 16,
  },
  portfolioStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  portfolioItemSkeleton: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  portfolioItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  portfolioItemDetails: {
    marginTop: 12,
    gap: 10,
  },
  portfolioDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // Search
  searchResultSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    marginHorizontal: 16,
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: 14,
  },
  // Notification
  notificationItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    marginHorizontal: 16,
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // Full screen
  fullScreenSkeleton: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});

export default {
  SkeletonBox,
  SkeletonCircle,
  SkeletonText,
  HomeAssetSkeleton,
  StockCardSkeleton,
  StockListSkeleton,
  TrendingCardSkeleton,
  TrendingSectionSkeleton,
  PortfolioSummarySkeleton,
  PortfolioItemSkeleton,
  SearchResultSkeleton,
  NotificationItemSkeleton,
  FullScreenSkeleton,
};
