import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  ScrollView,
  Linking,
} from 'react-native';
import { likePost } from '../api/posts';
import { COLORS, TRUST_LEVEL_COLORS } from '../constants/colors';
import api from '../api/client';

export default function NewsScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const [combinedNews, setCombinedNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all'); // all, following, popular, invested

  useEffect(() => {
    loadNews();
  }, [selectedTab]);

  const loadNews = async () => {
    try {
      setLoading(true);
      let userPosts = [];
      let realNews = [];

      // 1. 사용자 게시물 가져오기
      let postEndpoint = '/posts/feed';
      let postParams = {};

      switch (selectedTab) {
        case 'following':
          postEndpoint = '/posts/following';
          break;
        case 'popular':
          postEndpoint = '/posts/popular';
          postParams = { minTrustLevel: 5 };
          break;
        case 'invested':
          postEndpoint = '/posts/invested';
          break;
        default:
          postEndpoint = '/posts/feed';
      }

      try {
        const postResponse = await api.get(postEndpoint, { params: postParams });
        if (postResponse.data.success) {
          userPosts = (postResponse.data.posts || []).map(post => ({
            ...post,
            type: 'post', // 게시물임을 표시
          }));
        }
      } catch (error) {
        console.error('게시물 조회 오류:', error);
      }

      // 2. 실제 뉴스 가져오기 (크리에이터 이름으로)
      try {
        const newsResponse = await api.get('/news/my-creators', {
          params: { type: selectedTab }
        });

        if (newsResponse.data.success) {
          realNews = (newsResponse.data.articles || []).map(article => ({
            ...article,
            type: 'news', // 실제 뉴스임을 표시
            id: `news-${article.url}`, // 고유 ID
          }));
        }
      } catch (error) {
        console.error('실제 뉴스 조회 오류:', error);
        // 뉴스 API가 설정되지 않았을 수 있으므로 오류는 무시
      }

      // 3. 게시물과 뉴스를 섞어서 표시 (최신순)
      const combined = [...userPosts, ...realNews].sort((a, b) => {
        const dateA = new Date(a.publishedAt || a.createdAt);
        const dateB = new Date(b.publishedAt || b.createdAt);
        return dateB - dateA;
      });

      setCombinedNews(combined);
    } catch (error) {
      console.error('뉴스 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNews();
    setRefreshing(false);
  };

  const handleLike = async (postId) => {
    try {
      const result = await likePost(postId);

      setCombinedNews(prevNews =>
        prevNews.map(item =>
          item.id === postId && item.type === 'post'
            ? { ...item, isLiked: result.isLiked, likesCount: result.likesCount }
            : item
        )
      );
    } catch (error) {
      console.error('좋아요 처리 오류:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTabTitle = () => {
    switch (selectedTab) {
      case 'all': return '전체 뉴스';
      case 'following': return '팔로잉 뉴스';
      case 'popular': return '인기 크리에이터';
      case 'invested': return '내 투자';
      default: return '뉴스';
    }
  };

  const getTabSubtitle = () => {
    switch (selectedTab) {
      case 'all': return '모든 크리에이터의 소식과 뉴스';
      case 'following': return '내가 팔로우한 사람들의 소식과 뉴스';
      case 'popular': return '유명 크리에이터와 연예인 소식';
      case 'invested': return '내가 투자한 크리에이터의 소식과 뉴스';
      default: return '';
    }
  };

  // 실제 뉴스 카드 렌더링
  const renderRealNews = (item) => {
    return (
      <TouchableOpacity
        style={styles.newsCard}
        onPress={() => Linking.openURL(item.url)}
        activeOpacity={0.7}
      >
        <View style={styles.newsLabel}>
          <Text style={styles.newsLabelText}>📰 실시간 뉴스</Text>
          <Text style={styles.newsSource}>{item.source}</Text>
        </View>

        {/* 크리에이터 정보 */}
        <View style={styles.creatorTag}>
          <Text style={styles.creatorTagText}>
            {item.isVerified && '✓ '}
            🎯 {item.creatorRealName || item.creatorName}
            {item.creatorOccupation && ` · ${item.creatorOccupation}`}
          </Text>
          {item.creatorTrustLevel && (
            <View style={[styles.trustBadge, {
              backgroundColor: TRUST_LEVEL_COLORS[item.creatorTrustLevel] || theme.colors.textSecondary
            }]}>
              <Text style={styles.trustText}>신뢰도 {item.creatorTrustLevel}</Text>
            </View>
          )}
        </View>
        {/* 검색 키워드 표시 (동명이인 구분용) */}
        {item.searchKeyword && item.searchKeyword !== item.creatorName && (
          <View style={styles.searchKeywordContainer}>
            <Text style={styles.searchKeywordText}>
              🔍 검색어: {item.searchKeyword}
            </Text>
          </View>
        )}

        {/* 뉴스 이미지 */}
        {item.urlToImage && (
          <Image source={{ uri: item.urlToImage }} style={styles.newsImage} />
        )}

        {/* 뉴스 제목 */}
        <Text style={styles.newsTitle}>{item.title}</Text>

        {/* 뉴스 설명 */}
        {item.description && (
          <Text style={styles.newsDescription} numberOfLines={3}>
            {item.description}
          </Text>
        )}

        {/* 메타 정보 */}
        <View style={styles.newsMeta}>
          <Text style={styles.newsAuthor}>{item.author || item.source}</Text>
          <Text style={styles.newsTime}> · {formatDate(item.publishedAt)}</Text>
        </View>

        <View style={styles.newsFooter}>
          <Text style={styles.newsLink}>뉴스 전문 보기 →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // 사용자 게시물 렌더링
  const renderUserPost = (item) => {
    const author = item.author;
    const trustLevelColor = TRUST_LEVEL_COLORS[author.trustLevel] || theme.colors.textSecondary;
    const isLocked = item.contentLocked;

    return (
      <View style={styles.newsCard}>
        <View style={styles.postLabel}>
          <Text style={styles.postLabelText}>✍️ 크리에이터 게시물</Text>
        </View>

        <TouchableOpacity
          style={styles.newsHeader}
          onPress={() => navigation.navigate('Profile', { userId: author.id })}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{author.username?.charAt(0)?.toUpperCase()}</Text>
          </View>
          <View style={styles.authorInfo}>
            <View style={styles.authorRow}>
              <Text style={styles.authorName}>{author.username}</Text>
              {item.myShareholding && (
                <View style={styles.shareholdingBadge}>
                  <Text style={styles.shareholdingText}>{item.myShareholding}주 보유</Text>
                </View>
              )}
              {author.isFollowing && (
                <View style={styles.followingBadge}>
                  <Text style={styles.followingText}>팔로잉</Text>
                </View>
              )}
            </View>
            <View style={styles.metaRow}>
              <View style={[styles.trustBadge, { backgroundColor: trustLevelColor }]}>
                <Text style={styles.trustText}>신뢰도 {author.trustLevel}</Text>
              </View>
              <Text style={styles.timestamp}> · {formatDate(item.createdAt)}</Text>
              {author.category && (
                <Text style={styles.category}> · {author.category}</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.contentContainer}>
          {item.content && (
            <Text style={[styles.content, isLocked && styles.lockedContent]}>
              {item.content}
            </Text>
          )}
          {item.imageUrl && !isLocked && (
            <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
            disabled={isLocked}
          >
            <Text style={styles.actionIcon}>{item.isLiked ? '❤️' : '🤍'}</Text>
            <Text style={styles.actionText}>{item.likesCount || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} disabled={isLocked}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>{item.commentsCount || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Profile', { userId: author.id })}
          >
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionText}>프로필</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderNewsItem = ({ item }) => {
    if (item.type === 'news') {
      return renderRealNews(item);
    } else {
      return renderUserPost(item);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{getTabTitle()}</Text>
        <Text style={styles.headerSubtitle}>{getTabSubtitle()}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollView}
        contentContainerStyle={styles.tabContainer}
      >
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
          onPress={() => setSelectedTab('all')}
        >
          <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>
            전체 🌐
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'following' && styles.tabActive]}
          onPress={() => setSelectedTab('following')}
        >
          <Text style={[styles.tabText, selectedTab === 'following' && styles.tabTextActive]}>
            팔로잉 💚
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'popular' && styles.tabActive]}
          onPress={() => setSelectedTab('popular')}
        >
          <Text style={[styles.tabText, selectedTab === 'popular' && styles.tabTextActive]}>
            인기 크리에이터 ⭐
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'invested' && styles.tabActive]}
          onPress={() => setSelectedTab('invested')}
        >
          <Text style={[styles.tabText, selectedTab === 'invested' && styles.tabTextActive]}>
            내 투자 💼
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <FlatList
        data={combinedNews}
        renderItem={renderNewsItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📰</Text>
            <Text style={styles.emptyText}>
              {selectedTab === 'following' && '팔로우한 사람이 없습니다'}
              {selectedTab === 'popular' && '인기 크리에이터 소식이 없습니다'}
              {selectedTab === 'invested' && '투자한 크리에이터가 없습니다'}
              {selectedTab === 'all' && '아직 뉴스가 없습니다'}
            </Text>
            <Text style={styles.emptySubtext}>
              크리에이터를 팔로우하거나 투자하면 실시간 뉴스를 받아볼 수 있습니다
            </Text>
          </View>
        }
        contentContainerStyle={combinedNews.length === 0 ? styles.emptyListContent : styles.listContent}
      />
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.colors.background,
  },
  header: {
    backgroundColor: t.colors.surface,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  tabScrollView: {
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  tabContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: t.colors.background,
  },
  tabActive: {
    backgroundColor: t.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textSecondary,
  },
  tabTextActive: {
    color: t.colors.surface,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyListContent: {
    flex: 1,
  },
  newsCard: {
    backgroundColor: t.colors.surface,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  // 실제 뉴스 스타일
  newsLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  newsLabelText: {
    fontSize: 12,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.primary,
  },
  newsSource: {
    fontSize: 11,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  creatorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  creatorTagText: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.text,
  },
  searchKeywordContainer: {
    backgroundColor: t.colors.warning + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: t.colors.warning + '40',
  },
  searchKeywordText: {
    fontSize: 11,
    fontFamily: t.fonts.semibold,
    color: t.colors.warning,
    fontWeight: '600',
  },
  newsImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: t.colors.border,
  },
  newsTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.text,
    lineHeight: 24,
    marginBottom: 8,
  },
  newsDescription: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  newsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  newsAuthor: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  newsTime: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  newsFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  newsLink: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.primary,
    textAlign: 'center',
  },
  // 게시물 스타일
  postLabel: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  postLabelText: {
    fontSize: 12,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.success,
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: t.colors.surface,
    fontSize: 20,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  authorInfo: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 6,
  },
  authorName: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.text,
  },
  shareholdingBadge: {
    backgroundColor: t.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  shareholdingText: {
    color: t.colors.surface,
    fontSize: 11,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  followingBadge: {
    backgroundColor: t.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  followingText: {
    color: t.colors.surface,
    fontSize: 11,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  trustBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trustText: {
    color: t.colors.surface,
    fontSize: 11,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  category: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    color: t.colors.primary,
    fontWeight: '600',
  },
  contentContainer: {
    marginBottom: 12,
  },
  content: {
    fontSize: 15,
    fontFamily: t.fonts.regular,
    lineHeight: 22,
    color: t.colors.text,
  },
  lockedContent: {
    fontStyle: 'italic',
    color: t.colors.textSecondary,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: t.colors.border,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
  },
  actionText: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    color: t.colors.textSecondary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    fontFamily: t.fonts.regular,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
