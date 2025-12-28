import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { getPosts, likePost, getMyInvestmentNews } from '../api/posts';
import { COLORS } from '../constants/colors';

export default function CommunityScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedType, setFeedType] = useState('investment'); // 'investment', 'all' or 'following'

  useEffect(() => {
    loadPosts();
  }, [feedType]);

  const loadPosts = async () => {
    try {
      let data;
      if (feedType === 'investment') {
        // 내가 주식을 산 사람의 피드
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
      // 좋아요 상태 업데이트
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

  const renderPost = ({ item }) => {
    // 잠긴 포스트 처리
    if (item.contentLocked) {
      return (
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <TouchableOpacity
              style={styles.authorInfo}
              onPress={() => item.author?.id && navigation.navigate('Profile', { userId: item.author.id })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.author?.username?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <View>
                <Text style={styles.authorName}>{item.author?.username || '알 수 없음'}</Text>
                <Text style={styles.postDate}>{formatDate(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.lockedContent}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.lockText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.postCard}>
        {/* 포스트 헤더 */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.authorInfo}
            onPress={() => item.author?.id && navigation.navigate('Profile', { userId: item.author.id })}
          >
            <View style={styles.avatar}>
              {item.author?.profileImage ? (
                <Image source={{ uri: item.author.profileImage }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {item.author?.username?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              )}
            </View>
            <View>
              <Text style={styles.authorName}>{item.author?.username || '알 수 없음'}</Text>
              <Text style={styles.postDate}>{formatDate(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>

          {/* 공개 범위 뱃지 */}
          {item.visibilityType !== 'PUBLIC' && (
            <View style={styles.visibilityBadge}>
              <Text style={styles.visibilityText}>
                {item.visibilityType === 'SHAREHOLDERS_ONLY' ? '주주 전용' : `${item.minimumShares}주+`}
              </Text>
            </View>
          )}
        </View>

        {/* 포스트 이미지 */}
        {item.imageUrl && (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}

        {/* 포스트 내용 */}
        {item.content && (
          <View style={styles.contentContainer}>
            <Text style={styles.content}>{item.content}</Text>
          </View>
        )}

        {/* 포스트 액션 */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
          >
            <Text style={[styles.actionIcon, item.isLiked && { color: COLORS.up }]}>
              {item.isLiked ? '❤️' : '🤍'}
            </Text>
            <Text style={styles.actionText}>{item.likesCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>{item.commentsCount || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // 초 단위

    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;

    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>피드</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Text style={styles.createButtonText}>+ 글쓰기</Text>
        </TouchableOpacity>
      </View>

      {/* 피드 타입 토글 */}
      <View style={styles.feedToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, feedType === 'investment' && styles.toggleButtonActive]}
          onPress={() => setFeedType('investment')}
        >
          <Text style={[styles.toggleText, feedType === 'investment' && styles.toggleTextActive]}>
            투자 피드
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, feedType === 'all' && styles.toggleButtonActive]}
          onPress={() => setFeedType('all')}
        >
          <Text style={[styles.toggleText, feedType === 'all' && styles.toggleTextActive]}>
            전체
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, feedType === 'following' && styles.toggleButtonActive]}
          onPress={() => setFeedType('following')}
        >
          <Text style={[styles.toggleText, feedType === 'following' && styles.toggleTextActive]}>
            팔로잉
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>아직 게시글이 없습니다</Text>
            <Text style={styles.emptySubtext}>첫 번째 글을 작성해보세요!</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  feedToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 0,
  },
  postCard: {
    backgroundColor: COLORS.surface,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  postDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  visibilityBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  visibilityText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  postImage: {
    width: '100%',
    height: 300,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  lockedContent: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  lockText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    paddingTop: 100,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
