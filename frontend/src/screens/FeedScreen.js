import React, { useState, useEffect, useCallback } from 'react';
import useThemedStyles from '../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { postAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const FeedScreen = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);

  const fetchPosts = async () => {
    try {
      setError(null);
      const response = await postAPI.getAll();
      setPosts(response.data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      let errorMessage = '게시물을 불러올 수 없습니다';
      if (error.response) {
        errorMessage = error.response.data?.message || `서버 오류 (${error.response.status})`;
      } else if (error.request) {
        errorMessage = '서버에 연결할 수 없습니다.\n인터넷 연결을 확인해주세요.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, []);

  const handleCreatePost = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        '로그인 필요',
        '게시물을 작성하려면 로그인이 필요합니다.',
        [
          { text: '취소', style: 'cancel' },
          { text: '로그인', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    if (!newPost.trim()) {
      Alert.alert('오류', '내용을 입력해주세요');
      return;
    }

    setPosting(true);
    try {
      await postAPI.create({ content: newPost });
      setNewPost('');
      fetchPosts();
      Alert.alert('성공', '게시물이 작성되었습니다');
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('오류', '게시물 작성에 실패했습니다');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId, isLiked) => {
    if (!isAuthenticated) {
      Alert.alert(
        '로그인 필요',
        '좋아요를 하려면 로그인이 필요합니다.',
        [
          { text: '취소', style: 'cancel' },
          { text: '로그인', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    try {
      if (isLiked) {
        await postAPI.unlike(postId);
      } else {
        await postAPI.like(postId);
      }
      // Update local state
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            isLiked: !isLiked,
            likeCount: isLiked ? post.likeCount - 1 : post.likeCount + 1,
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const renderPostItem = ({ item }) => {
    const authorName = item.author?.displayName || item.author?.username || '익명';
    const timeAgo = getTimeAgo(item.createdAt || item.created_at);

    return (
      <View style={styles.postItem}>
        <View style={styles.postHeader}>
          <View style={styles.authorAvatar}>
            <Text style={styles.avatarText}>
              {authorName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{authorName}</Text>
            <Text style={styles.postTime}>{timeAgo}</Text>
          </View>
        </View>

        <Text style={styles.postContent}>{item.content}</Text>

        {item.image && (
          <Image source={{ uri: item.image }} style={styles.postImage} />
        )}

        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item.id, item.isLiked)}
          >
            <Text style={styles.actionIcon}>{item.isLiked ? '❤️' : '🤍'}</Text>
            <Text style={styles.actionText}>{item.likeCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>{item.commentCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>🔗</Text>
            <Text style={styles.actionText}>공유</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B5FE3" />
      </View>
    );
  }

  if (error && posts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Text style={styles.headerTitle}>피드</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPosts}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>피드</Text>
        <Text style={styles.headerSubtitle}>주주들의 이야기</Text>
      </View>

      {isAuthenticated && (
        <View style={styles.createPostContainer}>
          <TextInput
            style={styles.postInput}
            placeholder="무슨 생각을 하고 계신가요?"
            placeholderTextColor="#999"
            value={newPost}
            onChangeText={setNewPost}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.postButton, posting && styles.buttonDisabled]}
            onPress={handleCreatePost}
            disabled={posting}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.postButtonText}>게시</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={posts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item.id?.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>아직 게시물이 없습니다</Text>
            <Text style={styles.emptySubtext}>첫 번째 게시물을 작성해보세요!</Text>
          </View>
        }
      />
    </View>
  );
};

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: t.colors.primary,
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.surface,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  createPostContainer: {
    backgroundColor: t.colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.borderLight,
  },
  postInput: {
    backgroundColor: t.colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    fontFamily: t.fonts.regular,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  postButton: {
    backgroundColor: t.colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  postButtonText: {
    color: t.colors.surface,
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  postItem: {
    backgroundColor: t.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: t.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: t.colors.surface,
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
  },
  postTime: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginTop: 2,
  },
  postContent: {
    fontSize: 15,
    fontFamily: t.fonts.regular,
    color: t.colors.textPrimary,
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 12,
  },
  postActions: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: t.colors.backgroundSecondary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionIcon: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    marginRight: 6,
  },
  actionText: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    fontFamily: t.fonts.regular,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    fontSize: 48,
    fontFamily: t.fonts.regular,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: t.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  retryButtonText: {
    color: t.colors.surface,
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
});

export default FeedScreen;
