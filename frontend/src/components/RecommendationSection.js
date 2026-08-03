import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import TrustBadge from './TrustBadge';

/**
 * 홈 화면 추천 섹션 컴포넌트
 */

// 섹션 헤더
export const SectionHeader = ({ title, subtitle, icon, iconColor, onSeeMore }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderLeft}>
      {icon && (
        <View style={[styles.sectionIcon, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
      )}
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    {onSeeMore && (
      <TouchableOpacity onPress={onSeeMore} style={styles.seeMoreButton}>
        <Text style={styles.seeMoreText}>더보기</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
      </TouchableOpacity>
    )}
  </View>
);

// 트렌딩 크리에이터 카드
export const TrendingCard = ({ item, onPress, rank }) => {
  const priceChange = item.priceChangePercent || 0;
  const isUp = priceChange >= 0;

  return (
    <TouchableOpacity style={styles.trendingCard} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={isUp ? ['#F0344B', '#FF6B7C'] : ['#2B5FE3', '#5E93F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.trendingCardGradient}
      >
        {rank && (
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>{rank}</Text>
          </View>
        )}
        <View style={styles.trendingCardContent}>
          <View style={styles.trendingAvatar}>
            <Text style={styles.trendingAvatarText}>
              {(item.issuer?.displayName || item.issuer?.username || 'C').charAt(0)}
            </Text>
          </View>
          <Text style={styles.trendingName} numberOfLines={1}>
            {item.issuer?.displayName || item.issuer?.username || '크리에이터'}
          </Text>
          {item.issuer?.trustLevel && (
            <TrustBadge level={item.issuer.trustLevel} size="small" showLabel={false} variant="icon" />
          )}
        </View>
        <View style={styles.trendingPriceInfo}>
          <Text style={styles.trendingPrice}>{(item.sharePrice || 0).toLocaleString()} PO</Text>
          <View style={styles.trendingChange}>
            <Ionicons name={isUp ? 'caret-up' : 'caret-down'} size={14} color="#fff" />
            <Text style={styles.trendingChangeText}>{Math.abs(priceChange).toFixed(2)}%</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// 신규 상장 카드
export const NewListingCard = ({ item, onPress }) => (
  <TouchableOpacity style={styles.newListingCard} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.newBadge}>
      <Text style={styles.newBadgeText}>NEW</Text>
    </View>
    <View style={styles.newListingAvatar}>
      <Text style={styles.newListingAvatarText}>
        {(item.issuer?.displayName || item.issuer?.username || 'C').charAt(0)}
      </Text>
    </View>
    <Text style={styles.newListingName} numberOfLines={1}>
      {item.issuer?.displayName || item.issuer?.username || '크리에이터'}
    </Text>
    <Text style={styles.newListingCategory}>
      {item.category === 'entertainment' ? '엔터' :
       item.category === 'sports' ? '스포츠' :
       item.category === 'creator' ? '크리에이터' : '인플루언서'}
    </Text>
    <Text style={styles.newListingPrice}>{(item.sharePrice || 0).toLocaleString()} PO</Text>
  </TouchableOpacity>
);

// 배당률 TOP 카드
export const DividendCard = ({ item, onPress, rank }) => (
  <TouchableOpacity style={styles.dividendCard} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.dividendCardHeader}>
      <View style={styles.dividendRank}>
        <Text style={styles.dividendRankText}>{rank}</Text>
      </View>
      <View style={styles.dividendInfo}>
        <Text style={styles.dividendName} numberOfLines={1}>
          {item.issuer?.displayName || item.issuer?.username || '크리에이터'}
        </Text>
        <Text style={styles.dividendPrice}>{(item.sharePrice || 0).toLocaleString()} PO</Text>
      </View>
    </View>
    <View style={styles.dividendRateContainer}>
      <Text style={styles.dividendRateLabel}>배당률</Text>
      <Text style={styles.dividendRate}>{item.dividendRate || 0}%</Text>
    </View>
  </TouchableOpacity>
);

// 카테고리별 추천
export const CategoryCard = ({ category, count, onPress }) => {
  const categoryConfig = {
    entertainment: { icon: 'musical-notes', color: '#F0344B', label: '엔터테인먼트' },
    sports: { icon: 'football', color: '#00B0A6', label: '스포츠' },
    creator: { icon: 'videocam', color: '#3FB6C9', label: '크리에이터' },
    influencer: { icon: 'person', color: '#6BC9A8', label: '인플루언서' },
  };

  const config = categoryConfig[category] || categoryConfig.creator;

  return (
    <TouchableOpacity style={styles.categoryCard} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={[config.color, config.color + 'CC']}
        style={styles.categoryCardGradient}
      >
        <Ionicons name={config.icon} size={28} color="#fff" />
        <Text style={styles.categoryCardLabel}>{config.label}</Text>
        <Text style={styles.categoryCardCount}>{count}명</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// 수평 스크롤 섹션
export const HorizontalSection = ({
  title,
  subtitle,
  icon,
  iconColor,
  data,
  renderItem,
  onSeeMore,
  loading,
}) => {
  if (loading) {
    return (
      <View style={styles.sectionContainer}>
        <SectionHeader title={title} subtitle={subtitle} icon={icon} iconColor={iconColor} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.sectionContainer}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        iconColor={iconColor}
        onSeeMore={onSeeMore}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
      >
        {data.map((item, index) => renderItem(item, index))}
      </ScrollView>
    </View>
  );
};

// 리스트 섹션
export const ListSection = ({
  title,
  subtitle,
  icon,
  iconColor,
  data,
  renderItem,
  onSeeMore,
  loading,
  maxItems = 5,
}) => {
  if (loading) {
    return (
      <View style={styles.sectionContainer}>
        <SectionHeader title={title} subtitle={subtitle} icon={icon} iconColor={iconColor} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.sectionContainer}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        iconColor={iconColor}
        onSeeMore={onSeeMore}
      />
      <View style={styles.listContainer}>
        {data.slice(0, maxItems).map((item, index) => renderItem(item, index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 24,
  },
  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeMoreText: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  loadingContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  listContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  // Trending card
  trendingCard: {
    width: 160,
    borderRadius: 16,
    overflow: 'hidden',
  },
  trendingCardGradient: {
    padding: 16,
    height: 140,
    justifyContent: 'space-between',
  },
  rankBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  trendingCardContent: {
    alignItems: 'center',
    marginTop: 8,
  },
  trendingAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendingAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  trendingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  trendingPriceInfo: {
    alignItems: 'center',
  },
  trendingPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  trendingChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  trendingChangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 2,
  },
  // New listing card
  newListingCard: {
    width: 130,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.up,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  newListingAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  newListingAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  newListingName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  newListingCategory: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  newListingPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  // Dividend card
  dividendCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dividendCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dividendRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF6E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dividendRankText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59B00',
  },
  dividendInfo: {
    flex: 1,
  },
  dividendName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  dividendPrice: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dividendRateContainer: {
    alignItems: 'flex-end',
  },
  dividendRateLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginBottom: 2,
  },
  dividendRate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F59B00',
  },
  // Category card
  categoryCard: {
    width: 140,
    borderRadius: 14,
    overflow: 'hidden',
  },
  categoryCardGradient: {
    padding: 16,
    height: 100,
    justifyContent: 'space-between',
  },
  categoryCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  categoryCardCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
});

export default {
  SectionHeader,
  TrendingCard,
  NewListingCard,
  DividendCard,
  CategoryCard,
  HorizontalSection,
  ListSection,
};
