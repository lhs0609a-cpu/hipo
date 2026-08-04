import React, { useState, useEffect, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { getPosts, likePost, getMyInvestmentNews } from '../api/posts';
import { useTheme } from '../contexts/ThemeContext';

export default function CommunityScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedType, setFeedType] = useState('investment');

  // Animation for like button
  const createLikeAnimation = () => new Animated.Value(1);

  useEffect(() => {
    loadPosts();
  }, [feedType]);

  const loadPosts = async () => {
    try {
      let data;
      if (feedType === 'investment') {
        data = await getMyInvestmentNews();
        setPosts(data.news || []);
      } else {
        const feed = feedType === 'following' ? 'following' : null;
        data = await getPosts(1, 20, feed);
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('포스트 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const handleLike = async (postId) => {
    try {
      await likePost(postId);
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            isLiked: !post.isLiked,
            likesCount: post.isLiked ? post.likesCount - 1 : post.likesCount + 1
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('좋아요 오류:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;

    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const renderPost = ({ item, index }) => {
    if (item.contentLocked) {
      return (
        <Animated.View
          style={[
            styles.postCard,
            { backgroundColor: theme.colors.surface }
          ]}
        >
          <View style={styles.postHeader}>
            <TouchableOpacity
              style={styles.authorInfo}
              onPress={() => item.author?.id && navigation.navigate('Profile', { userId: item.author.id })}
            >
              <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.avatarText}>
                  {item.author?.username?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <View>
                <Text style={[styles.authorName, { color: theme.colors.textPrimary }]}>
                  {item.author?.username || '알 수 없음'}
                </Text>
                <Text style={[styles.postDate, { color: theme.colors.textSecondary }]}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.lockedContent}>
            <Ionicons name="lock-closed-outline" style={styles.lockIcon} />
            <Text style={[styles.lockText, { color: theme.colors.textSecondary }]}>
              {item.content}
            </Text>
          </View>
        </Animated.View>
      );
    }

    return (
      <Animated.View
        style={[
          styles.postCard,
          { backgroundColor: theme.colors.surface }
        ]}
      >
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.authorInfo}
            onPress={() => item.author?.id && navigation.navigate('Profile', { userId: item.author.id })}
          >
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              {item.author?.profileImage ? (
                <Image source={{ uri: item.author.profileImage }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {item.author?.username?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              )}
            </View>
            <View>
              <Text style={[styles.authorName, { color: theme.colors.textPrimary }]}>
                {item.author?.username || '알 수 없음'}
              </Text>
              <Text style={[styles.postDate, { color: theme.colors.textSecondary }]}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          </TouchableOpacity>

          {item.visibilityType !== 'PUBLIC' && (
            <View style={[styles.visibilityBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.visibilityText}>
                {item.visibilityType === 'SHAREHOLDERS_ONLY' ? '주주 전용' : `${item.minimumShares}주+`}
              </Text>
            </View>
          )}
        </View>

        {item.imageUrl && (
          <Image
            source={{ uri: item.imageUrl }}
            style={[styles.postImage, { backgroundColor: theme.colors.backgroundSecondary }]}
            resizeMode="cover"
          />
        )}

        {item.content && (
          <View style={styles.contentContainer}>
            <Text style={[styles.content, { color: theme.colors.textPrimary }]}>
              {item.content}
            </Text>
          </View>
        )}

        <View style={[styles.actionsContainer, { borderTopColor: theme.colors.divider }]}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionIcon, item.isLiked && { color: theme.colors.stockUp }]}>
              {item.isLiked ? '❤️' : '🤍'}
            </Text>
            <Text style={[styles.actionText, { color: theme.colors.textPrimary }]}>
              {item.likesCount || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" style={styles.actionIcon} />
            <Text style={[styles.actionText, { color: theme.colors.textPrimary }]}>
              {item.commentsCount || 0}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }, { backgroundColor: theme.colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>피드</Text>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Text style={styles.createButtonText}>+ 글쓰기</Text>
        </TouchableOpacity>
      </View>

      {/* 피드 타입 토글 */}
      <View style={[styles.feedToggle, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            { backgroundColor: theme.colors.backgroundSecondary },
            feedType === 'investment' && { backgroundColor: theme.colors.primary }
          ]}
          onPress={() => setFeedType('investment')}
        >
          <Text style={[
            styles.toggleText,
            { color: theme.colors.textSecondary },
            feedType === 'investment' && styles.toggleTextActive
          ]}>
            투자 피드
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            { backgroundColor: theme.colors.backgroundSecondary },
            feedType === 'all' && { backgroundColor: theme.colors.primary }
          ]}
          onPress={() => setFeedType('all')}
        >
          <Text style={[
            styles.toggleText,
            { color: theme.colors.textSecondary },
            feedType === 'all' && styles.toggleTextActive
          ]}>
            전체
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            { backgroundColor: theme.colors.backgroundSecondary },
            feedType === 'following' && { backgroundColor: theme.colors.primary }
          ]}
          onPress={() => setFeedType('following')}
        >
          <Text style={[
            styles.toggleText,
            { color: theme.colors.textSecondary },
            feedType === 'following' && styles.toggleTextActive
          ]}>
            팔로잉
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id?.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="create-outline" style={styles.emptyIcon} />
            <Text style={[styles.emptyText, { color: theme.colors.textPrimary }]}>
              아직 게시글이 없습니다
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              첫 번째 글을 작성해보세요!
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    color: t.colors.surface,
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  feedToggle: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: t.colors.surface,
  },
  listContent: {
    paddingBottom: 100,
  },
  postCard: {
    marginBottom: 8,
    paddingVertical: 16,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    color: t.colors.surface,
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  authorName: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    marginBottom: 2,
  },
  postDate: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
  },
  visibilityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  visibilityText: {
    color: t.colors.surface,
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  postImage: {
    width: '100%',
    height: 300,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  content: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    lineHeight: 24,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    marginTop: 12,
    gap: 20,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  actionIcon: {
    fontSize: 24,
    fontFamily: t.fonts.regular,
  },
  actionText: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  lockedContent: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 48,
    fontFamily: t.fonts.regular,
    marginBottom: 12,
  },
  lockText: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    textAlign: 'center',
  },
  emptyContainer: {
    paddingTop: 100,
    alignItems: 'center',
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
  },
});
