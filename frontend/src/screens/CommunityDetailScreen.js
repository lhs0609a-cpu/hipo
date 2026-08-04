import React, { useState, useEffect, useCallback, useRef } from 'react';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { communityAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const CommunityDetailScreen = ({ route, navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const { communityId } = route.params;
  const { isAuthenticated, user } = useAuth();
  const [community, setCommunity] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const flatListRef = useRef(null);

  const fetchCommunityData = async () => {
    try {
      setError(null);
      const [communityRes, messagesRes] = await Promise.all([
        communityAPI.getById(communityId),
        communityAPI.getMessages(communityId),
      ]);
      setCommunity(communityRes.data.community);
      setMessages(messagesRes.data.messages || []);
    } catch (error) {
      console.error('Error fetching community:', error);
      let errorMessage = '커뮤니티 정보를 불러올 수 없습니다';
      if (error.response) {
        errorMessage = error.response.data?.message || `서버 오류 (${error.response.status})`;
      } else if (error.request) {
        errorMessage = '서버에 연결할 수 없습니다.\n인터넷 연결을 확인해주세요.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunityData();
  }, [communityId]);

  const handleJoinLeave = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        '로그인 필요',
        '커뮤니티에 가입하려면 로그인이 필요합니다.',
        [
          { text: '취소', style: 'cancel' },
          { text: '로그인', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    try {
      if (community.isJoined) {
        await communityAPI.leave(communityId);
        setCommunity({ ...community, isJoined: false, memberCount: community.memberCount - 1 });
      } else {
        await communityAPI.join(communityId);
        setCommunity({ ...community, isJoined: true, memberCount: community.memberCount + 1 });
      }
    } catch (error) {
      console.error('Error joining/leaving community:', error);
      Alert.alert('오류', '요청을 처리할 수 없습니다');
    }
  };

  const handleSendMessage = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        '로그인 필요',
        '메시지를 보내려면 로그인이 필요합니다.',
        [
          { text: '취소', style: 'cancel' },
          { text: '로그인', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    if (!newMessage.trim()) return;

    setSending(true);
    try {
      // API 호출 (실제 API가 있다면)
      // await communityAPI.sendMessage(communityId, newMessage);

      // 임시로 로컬에 메시지 추가
      const tempMessage = {
        id: Date.now(),
        content: newMessage,
        author: {
          id: user?.id,
          username: user?.username,
          displayName: user?.displayName || user?.username,
        },
        createdAt: new Date().toISOString(),
      };
      setMessages([...messages, tempMessage]);
      setNewMessage('');

      // 스크롤 to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('오류', '메시지 전송에 실패했습니다');
    } finally {
      setSending(false);
    }
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return date.toLocaleDateString('ko-KR');
  };

  const renderMessageItem = ({ item }) => {
    const isMyMessage = item.author?.id === user?.id;
    const authorName = item.author?.displayName || item.author?.username || '익명';

    return (
      <View style={[styles.messageContainer, isMyMessage && styles.myMessageContainer]}>
        {!isMyMessage && (
          <View style={styles.messageAvatar}>
            <Text style={styles.avatarText}>
              {authorName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={[styles.messageBubble, isMyMessage && styles.myMessageBubble]}>
          {!isMyMessage && (
            <Text style={styles.messageAuthor}>{authorName}</Text>
          )}
          <Text style={[styles.messageContent, isMyMessage && styles.myMessageContent]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>
            {getTimeAgo(item.createdAt || item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B5FE3" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCommunityData}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.communityName}>{community?.name}</Text>
          <Text style={styles.memberCount}>멤버 {community?.memberCount || 0}명</Text>
        </View>
        <TouchableOpacity
          style={[styles.joinButton, community?.isJoined && styles.leaveButton]}
          onPress={handleJoinLeave}
        >
          <Text style={[styles.joinButtonText, community?.isJoined && styles.leaveButtonText]}>
            {community?.isJoined ? '탈퇴' : '가입'}
          </Text>
        </TouchableOpacity>
      </View>

      {community?.description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>{community.description}</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id?.toString()}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>아직 메시지가 없습니다</Text>
            <Text style={styles.emptySubtext}>첫 번째 메시지를 보내보세요!</Text>
          </View>
        }
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder="메시지를 입력하세요..."
          placeholderTextColor="#999"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, sending && styles.buttonDisabled]}
          onPress={handleSendMessage}
          disabled={sending || !newMessage.trim()}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>전송</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: 20,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.surface,
  },
  memberCount: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  joinButton: {
    backgroundColor: t.colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  leaveButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: t.colors.surface,
  },
  joinButtonText: {
    color: t.colors.primary,
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  leaveButtonText: {
    color: t.colors.surface,
  },
  descriptionContainer: {
    backgroundColor: t.colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.borderLight,
  },
  description: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    lineHeight: 20,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: t.colors.surface,
    fontSize: 14,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
  },
  messageBubble: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    maxWidth: '75%',
    shadowColor: t.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  myMessageBubble: {
    backgroundColor: t.colors.primary,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  messageAuthor: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    color: t.colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageContent: {
    fontSize: 15,
    fontFamily: t.fonts.regular,
    color: t.colors.textPrimary,
    lineHeight: 20,
  },
  myMessageContent: {
    color: t.colors.surface,
  },
  messageTime: {
    fontSize: 11,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.borderLight,
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    backgroundColor: t.colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: t.fonts.regular,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: t.colors.primary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: t.colors.surface,
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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

export default CommunityDetailScreen;
