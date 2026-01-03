import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { searchAPI } from '../services/api';
import { COLORS } from '../constants/colors';
import { LoadingState, NoResultsState, ErrorState } from '../components/StateDisplay';

const SearchScreen = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], stocks: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([
    '비트코인', '테슬라', '애플', '삼성전자',
  ]);

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

  const renderStockItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => navigation.navigate('StockDetail', { stockId: item.id })}
    >
      <View style={[styles.userAvatar, { backgroundColor: '#4CAF50' }]}>
        <Text style={styles.avatarText}>
          {(item.issuer?.displayName || item.name || 'S').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle}>
          {item.issuer?.displayName || item.issuer?.username || item.name}
        </Text>
        <Text style={styles.resultSubtitle}>{(item.sharePrice || 0).toLocaleString()}원</Text>
      </View>
      <Text style={styles.resultType}>주식</Text>
    </TouchableOpacity>
  );

  const renderPostItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
    >
      <View style={[styles.userAvatar, { backgroundColor: '#FF9800' }]}>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>검색</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="사용자, 주식, 게시물 검색..."
          placeholderTextColor={COLORS.gray400}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => handleSearch()}
          returnKeyType="search"
          accessibilityLabel="검색어 입력"
          accessibilityHint="사용자, 주식, 게시물을 검색할 수 있습니다"
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => handleSearch()}
          accessibilityLabel="검색"
          accessibilityRole="button"
        >
          <Text style={styles.searchButtonText}>🔍</Text>
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
                  handleSearch();
                }}
              >
                <Text style={styles.recentTagText}>{search}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.trendingTitle}>인기 검색어</Text>
          <View style={styles.trendingList}>
            {['1. 크리에이터A', '2. 신규상장', '3. 배당주', '4. 성장주', '5. IPO'].map((item, index) => (
              <TouchableOpacity key={index} style={styles.trendingItem}>
                <Text style={styles.trendingText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.surface,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginRight: 10,
    color: COLORS.textPrimary,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.white,
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
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  resultSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  resultType: {
    fontSize: 12,
    color: COLORS.textTertiary,
    backgroundColor: COLORS.gray100,
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
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  recentTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 30,
  },
  recentTag: {
    backgroundColor: COLORS.primaryBackground,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recentTagText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  trendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  trendingList: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  trendingItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  trendingText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
});

export default SearchScreen;
