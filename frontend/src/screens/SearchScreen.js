import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import useThemedStyles from '../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchAPI } from '../services/api';
import { COLORS } from '../constants/colors';
import { LoadingState, NoResultsState, ErrorState } from '../components/StateDisplay';
import SearchFilterModal, { FilterButton, ActiveFilterTags } from '../components/SearchFilterModal';
import TrustBadge from '../components/TrustBadge';
import VirtualStatusBadge from '../components/VirtualStatusBadge';

const SearchScreen = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], stocks: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([
    '아이유', '손흥민', '뉴진스', '페이커',
  ]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    trustLevel: 'all',
    priceRange: 'all',
    sortBy: 'popular',
    virtualOnly: false,
  });

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.category !== 'all') count++;
    if (filters.trustLevel !== 'all') count++;
    if (filters.priceRange !== 'all') count++;
    if (filters.sortBy !== 'popular') count++;
    if (filters.virtualOnly) count++;
    return count;
  };

  const removeFilter = (key) => {
    const defaultValues = {
      category: 'all',
      trustLevel: 'all',
      priceRange: 'all',
      sortBy: 'popular',
      virtualOnly: false,
    };
    setFilters(prev => ({ ...prev, [key]: defaultValues[key] }));
  };

  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setError(null);
    try {
      const response = await searchAPI.search(searchQuery);
      setResults(response.data || { users: [], stocks: [], posts: [] });

      // 최근 검색어에 추가
      setRecentSearches(prev => {
        const filtered = prev.filter(s => s !== searchQuery);
        return [searchQuery, ...filtered].slice(0, 10);
      });
    } catch (err) {
      console.error('Search error:', err);
      setError('검색 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
    >
      <View style={styles.userAvatar}>
        <Text style={styles.avatarText}>
          {(item.displayName || item.username || 'U').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle}>{item.displayName || item.username}</Text>
        <Text style={styles.resultSubtitle}>@{item.username}</Text>
      </View>
      <Text style={styles.resultType}>사용자</Text>
    </TouchableOpacity>
  );

  const renderStockItem = ({ item }) => {
    const priceChange = item.priceChangePercent || 0;
    const isUp = priceChange >= 0;

    return (
      <TouchableOpacity
        style={styles.stockResultItem}
        onPress={() => navigation.navigate('StockDetail', { stockId: item.id })}
      >
        <View style={styles.stockResultLeft}>
          <View style={[styles.stockAvatar, { backgroundColor: theme.colors.primaryBackground }]}>
            <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
              {(item.issuer?.displayName || item.issuer?.username || 'C').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.stockInfo}>
            <View style={styles.stockNameRow}>
              <Text style={styles.stockName}>
                {item.issuer?.displayName || item.issuer?.username || '크리에이터'}
              </Text>
              {item.issuer?.trustLevel && (
                <TrustBadge
                  level={item.issuer.trustLevel}
                  size="small"
                  showLabel={false}
                  variant="icon"
                  style={{ marginLeft: 6 }}
                />
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Text style={styles.stockCategory}>
                {item.category === 'entertainment' ? '엔터' :
                 item.category === 'sports' ? '스포츠' :
                 item.category === 'creator' ? '크리에이터' : '인플루언서'}
              </Text>
              {item.isVirtualListing && (
                <VirtualStatusBadge
                  virtualStatus={item.issuer?.virtualStatus || 'unclaimed'}
                  size="small"
                />
              )}
            </View>
          </View>
        </View>
        <View style={styles.stockPriceInfo}>
          <Text style={styles.stockPrice}>{(item.sharePrice || 0).toLocaleString()} PO</Text>
          <View style={[styles.priceChangeBadge, { backgroundColor: isUp ? theme.colors.stockUpBackground : theme.colors.stockDownBackground }]}>
            <Ionicons
              name={isUp ? 'caret-up' : 'caret-down'}
              size={12}
              color={isUp ? theme.colors.up : theme.colors.down}
            />
            <Text style={[styles.priceChangeText, { color: isUp ? theme.colors.up : theme.colors.down }]}>
              {Math.abs(priceChange).toFixed(2)}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPostItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
    >
      <View style={[styles.userAvatar, { backgroundColor: '#F59B00' }]}>
        <Text style={styles.avatarText}>📝</Text>
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>{item.content}</Text>
        <Text style={styles.resultSubtitle}>
          {item.author?.displayName || item.author?.username}
        </Text>
      </View>
      <Text style={styles.resultType}>게시물</Text>
    </TouchableOpacity>
  );

  const getFilteredResults = () => {
    if (activeTab === 'all') {
      return [
        ...results.users.map(u => ({ ...u, type: 'user' })),
        ...results.stocks.map(s => ({ ...s, type: 'stock' })),
        ...results.posts.map(p => ({ ...p, type: 'post' })),
      ];
    }
    if (activeTab === 'users') return results.users.map(u => ({ ...u, type: 'user' }));
    if (activeTab === 'stocks') return results.stocks.map(s => ({ ...s, type: 'stock' }));
    if (activeTab === 'posts') return results.posts.map(p => ({ ...p, type: 'post' }));
    return [];
  };

  const renderItem = ({ item }) => {
    if (item.type === 'user') return renderUserItem({ item });
    if (item.type === 'stock') return renderStockItem({ item });
    if (item.type === 'post') return renderPostItem({ item });
    return null;
  };

  const hasResults = results.users.length > 0 || results.stocks.length > 0 || results.posts.length > 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>검색</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={20} color={theme.colors.gray400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="크리에이터, 주식 검색..."
            placeholderTextColor={theme.colors.gray400}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
            accessibilityLabel="검색어 입력"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.gray400} />
            </TouchableOpacity>
          )}
        </View>
        <FilterButton
          activeCount={getActiveFilterCount()}
          onPress={() => setShowFilterModal(true)}
        />
      </View>

      {/* 활성 필터 태그 */}
      <ActiveFilterTags filters={filters} onRemove={removeFilter} />

      {/* 가상 셀럽 필터 토글 */}
      <View style={styles.virtualFilterRow}>
        <TouchableOpacity
          style={[styles.virtualFilterButton, filters.virtualOnly && styles.virtualFilterButtonActive]}
          onPress={() => setFilters(prev => ({ ...prev, virtualOnly: !prev.virtualOnly }))}
        >
          <Text style={[styles.virtualFilterText, filters.virtualOnly && styles.virtualFilterTextActive]}>
            👻 가상 셀럽만
          </Text>
        </TouchableOpacity>
      </View>

      {hasResults && (
        <View style={styles.tabContainer}>
          {['all', 'users', 'stocks', 'posts'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === 'all' ? '전체' : tab === 'users' ? '사용자' : tab === 'stocks' ? '주식' : '게시물'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <LoadingState message="검색 중..." />
        </View>
      ) : error ? (
        <ErrorState
          title="검색 오류"
          description={error}
          onRetry={() => handleSearch()}
        />
      ) : hasSearched && !hasResults ? (
        <NoResultsState
          searchTerm={query}
          onClear={() => {
            setQuery('');
            setHasSearched(false);
          }}
        />
      ) : hasResults ? (
        <FlatList
          data={getFilteredResults()}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.type}-${item.id || index}`}
          contentContainerStyle={styles.resultsList}
        />
      ) : (
        <View style={styles.recentContainer}>
          <Text style={styles.recentTitle}>최근 검색어</Text>
          <View style={styles.recentTags}>
            {recentSearches.map((search, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recentTag}
                onPress={() => {
                  setQuery(search);
                  handleSearch(search);
                }}
              >
                <Text style={styles.recentTagText}>{search}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.trendingTitle}>인기 검색어</Text>
          <View style={styles.trendingList}>
            {[
              { rank: 1, name: '아이유', change: 'up' },
              { rank: 2, name: '손흥민', change: 'up' },
              { rank: 3, name: '뉴진스', change: 'same' },
              { rank: 4, name: '페이커', change: 'up' },
              { rank: 5, name: '임영웅', change: 'down' },
            ].map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.trendingItem}
                onPress={() => {
                  setQuery(item.name);
                  handleSearch(item.name);
                }}
              >
                <Text style={[
                  styles.trendingRank,
                  item.rank <= 3 && { color: theme.colors.primary }
                ]}>
                  {item.rank}
                </Text>
                <Text style={styles.trendingText}>{item.name}</Text>
                <Ionicons
                  name={item.change === 'up' ? 'arrow-up' : item.change === 'down' ? 'arrow-down' : 'remove'}
                  size={14}
                  color={item.change === 'up' ? theme.colors.up : item.change === 'down' ? theme.colors.down : theme.colors.gray400}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* 카테고리 바로가기 */}
          <Text style={styles.categoryTitle}>카테고리</Text>
          <View style={styles.categoryGrid}>
            {[
              { key: 'entertainment', label: '엔터테인먼트', icon: 'musical-notes', color: '#F0344B' },
              { key: 'sports', label: '스포츠', icon: 'football', color: '#00B0A6' },
              { key: 'creator', label: '크리에이터', icon: 'videocam', color: '#3FB6C9' },
              { key: 'influencer', label: '인플루언서', icon: 'person', color: '#6BC9A8' },
            ].map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={styles.categoryItem}
                onPress={() => {
                  setFilters(prev => ({ ...prev, category: cat.key }));
                  setShowFilterModal(true);
                }}
              >
                <View style={[styles.categoryIconBg, { backgroundColor: cat.color + '20' }]}>
                  <Ionicons name={cat.icon} size={24} color={cat.color} />
                </View>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 필터 모달 */}
      <SearchFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
      />
    </View>
  );
};

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  virtualFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  virtualFilterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.colors.gray300 || t.colors.borderDark,
    backgroundColor: t.colors.surface,
  },
  virtualFilterButtonActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F2EEFE',
  },
  virtualFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: t.colors.gray600 || t.colors.textSecondary,
  },
  virtualFilterTextActive: {
    color: '#8B5CF6',
  },
  header: {
    backgroundColor: t.colors.primary,
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: t.colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: t.colors.surface,
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.gray100,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: t.colors.textPrimary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: t.colors.gray100,
  },
  activeTab: {
    backgroundColor: t.colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: t.colors.textSecondary,
  },
  activeTabText: {
    color: t.colors.white,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    padding: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: t.colors.white,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: t.colors.textPrimary,
  },
  resultSubtitle: {
    fontSize: 13,
    color: t.colors.textSecondary,
    marginTop: 2,
  },
  resultType: {
    fontSize: 12,
    color: t.colors.textTertiary,
    backgroundColor: t.colors.gray100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  recentContainer: {
    padding: 20,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: t.colors.textPrimary,
    marginBottom: 12,
  },
  recentTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 30,
  },
  recentTag: {
    backgroundColor: t.colors.primaryBackground,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recentTagText: {
    fontSize: 14,
    color: t.colors.primary,
  },
  trendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: t.colors.textPrimary,
    marginBottom: 12,
  },
  trendingList: {
    backgroundColor: t.colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  trendingRank: {
    fontSize: 16,
    fontWeight: '700',
    color: t.colors.textSecondary,
    width: 24,
  },
  trendingText: {
    flex: 1,
    fontSize: 15,
    color: t.colors.textPrimary,
    marginLeft: 8,
  },
  // Category grid
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: t.colors.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryItem: {
    width: '47%',
    backgroundColor: t.colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  categoryIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: t.colors.textSecondary,
  },
  // Stock result item styles
  stockResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  stockResultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stockAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  stockInfo: {
    flex: 1,
  },
  stockNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockName: {
    fontSize: 15,
    fontWeight: '600',
    color: t.colors.textPrimary,
  },
  stockCategory: {
    fontSize: 12,
    color: t.colors.textSecondary,
    marginTop: 2,
  },
  stockPriceInfo: {
    alignItems: 'flex-end',
  },
  stockPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: t.colors.textPrimary,
    marginBottom: 4,
  },
  priceChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 2,
  },
  priceChangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SearchScreen;
