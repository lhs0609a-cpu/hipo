import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { COLORS } from '../constants/colors';

export default function PostDetailScreen({ route, navigation }) {
  const { postId } = route.params;
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPost = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/posts/${postId}`);
      setPost(response.data);
    } catch (err) {
      console.error('포스트 로드 오류:', err);
      setError('포스트를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleLike = async () => {
    try {
      await api.post(`/posts/${postId}/like`);
      setPost(prev => ({
        ...prev,
        isLiked: !prev.isLiked,
        likesCount: prev.isLiked ? prev.likesCount - 1 : prev.likesCount + 1
      }));
    } catch (err) {
      Alert.alert('오류', '좋아요 처리에 실패했습니다');
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;

    try {
      setSubmitting(true);
      await api.post(`/posts/${postId}/comments`, { content: comment });
      setComment('');
      fetchPost();
    } catch (err) {
      Alert.alert('오류', '댓글 작성에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>포스트</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>포스트</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPost}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!post) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>포스트</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView}>
          {/* Author Info */}
          <TouchableOpacity
            style={styles.authorSection}
            onPress={() => navigation.navigate('Profile', { userId: post.author?.id })}
          >
            <Image
              source={{ uri: post.author?.profileImage || 'https://via.placeholder.com/50' }}
              style={styles.authorImage}
            />
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>
                {post.author?.displayName || post.author?.username}
              </Text>
              <Text style={styles.postDate}>{formatDate(post.createdAt)}</Text>
            </View>
          </TouchableOpacity>

          {/* Post Content */}
          <View style={styles.contentSection}>
            <Text style={styles.content}>{post.content}</Text>
            {post.imageUrl && (
              <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Ionicons
                name={post.isLiked ? 'heart' : 'heart-outline'}
                size={24}
                color={post.isLiked ? COLORS.error : COLORS.textSecondary}
              />
              <Text style={styles.actionText}>{post.likesCount || 0}</Text>
            </TouchableOpacity>
            <View style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={24} color={COLORS.textSecondary} />
              <Text style={styles.actionText}>{post.commentsCount || 0}</Text>
            </View>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons
                name={post.isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={24}
                color={post.isBookmarked ? COLORS.primary : COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Comments */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>댓글 {post.comments?.length || 0}개</Text>
            {post.comments?.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Image
                  source={{ uri: comment.author?.profileImage || 'https://via.placeholder.com/32' }}
                  style={styles.commentAuthorImage}
                />
                <View style={styles.commentContent}>
                  <Text style={styles.commentAuthor}>{comment.author?.username}</Text>
                  <Text style={styles.commentText}>{comment.content}</Text>
                  <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInputSection}>
          <TextInput
            style={styles.commentInput}
            placeholder="댓글을 입력하세요..."
            placeholderTextColor={COLORS.textSecondary}
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !comment.trim() && styles.sendButtonDisabled]}
            onPress={handleComment}
            disabled={!comment.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="send" size={20} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  authorImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  authorInfo: {
    marginLeft: 12,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  postDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  contentSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  content: {
    fontSize: 16,
    color: COLORS.white,
    lineHeight: 24,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginTop: 12,
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    marginLeft: 6,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  commentsSection: {
    padding: 16,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAuthorImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: COLORS.surface,
    padding: 10,
    borderRadius: 12,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  commentText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  commentDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  commentInputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  commentInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.white,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
