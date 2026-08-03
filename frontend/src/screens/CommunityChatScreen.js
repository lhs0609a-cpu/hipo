import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useCommunityChat } from '../hooks/useCommunityChat';
import { COLORS } from '../constants/colors';
import { API_URL } from '../config';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CommunityChatScreen({ route, navigation }) {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const { communityId, communityName } = route.params;
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const flatListRef = useRef(null);

  const {
    messages,
    userCount,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping,
  } = useCommunityChat(communityId);

  const [allMessages, setAllMessages] = useState([]);

  useEffect(() => {
    loadMessages();
    navigation.setOptions({
      title: communityName || '커뮤니티 채팅',
    });
  }, []);

  useEffect(() => {
    // Socket으로 받은 메시지를 기존 메시지에 추가
    if (messages.length > 0) {
      setAllMessages((prev) => [...prev, ...messages]);
      // 새 메시지가 오면 스크롤 아래로
      setTimeout(() => {
        flatListRef.current?.scrollToEnd();
      }, 100);
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/chat/${communityId}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 50 },
        }
      );
      setAllMessages(response.data.messages || []);
    } catch (error) {
      console.error('메시지 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(
        `${API_URL}/chat/${communityId}/messages`,
        {
          content: inputText,
          messageType: 'TEXT',
          replyToId: replyTo?.id,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setInputText('');
      setReplyTo(null);
      stopTyping();
    } catch (error) {
      console.error('메시지 전송 오류:', error);
    }
  };

  const handleTyping = (text) => {
    setInputText(text);
    if (text.length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const handleLike = async (messageId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(
        `${API_URL}/chat/messages/${messageId}/like`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (error) {
      console.error('좋아요 오류:', error);
    }
  };

  const renderMessage = ({ item }) => {
    const isFiltered = item.isFilteredByAI;

    return (
      <View style={styles.messageContainer}>
        <View style={styles.messageHeader}>
          <Text style={styles.senderName}>{item.sender?.username || '알 수 없음'}</Text>
          <Text style={styles.timestamp}>
            {new Date(item.createdAt).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {item.replyTo && (
          <View style={styles.replyContainer}>
            <Text style={styles.replyText}>
              ↳ {item.replyTo.sender?.username}: {item.replyTo.content}
            </Text>
          </View>
        )}

        <Text style={styles.messageContent}>{item.content}</Text>

        {isFiltered && (
          <Text style={styles.aiWarning}>
            ⚠️ AI 필터: 의심 키워드 감지됨
          </Text>
        )}

        {item.isPinned && (
          <Text style={styles.pinnedBadge}>📌 고정됨</Text>
        )}

        <View style={styles.messageActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
          >
            <Text style={styles.actionText}>❤️ {item.likeCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setReplyTo(item)}
          >
            <Text style={styles.actionText}>↩️ 답장</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerText}>👥 접속자: {userCount}명</Text>
        {typingUsers.length > 0 && (
          <Text style={styles.typingText}>
            {typingUsers[0].username}님이 입력 중...
          </Text>
        )}
      </View>

      {/* 메시지 목록 */}
      <FlatList
        ref={flatListRef}
        data={allMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>아직 메시지가 없습니다</Text>
            <Text style={styles.emptySubtext}>첫 메시지를 보내보세요!</Text>
          </View>
        }
      />

      {/* 답장 표시 */}
      {replyTo && (
        <View style={styles.replyPreview}>
          <View style={styles.replyPreviewContent}>
            <Text style={styles.replyPreviewTitle}>
              {replyTo.sender?.username}님에게 답장
            </Text>
            <Text style={styles.replyPreviewText} numberOfLines={1}>
              {replyTo.content}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Text style={styles.replyPreviewClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 입력창 */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleTyping}
          placeholder="메시지를 입력하세요..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendButtonText}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  },
  header: {
    padding: 12,
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.colors.text,
  },
  typingText: {
    fontSize: 12,
    color: t.colors.textSecondary,
    marginTop: 4,
  },
  messageList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: t.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  senderName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: t.colors.primary,
  },
  timestamp: {
    fontSize: 11,
    color: t.colors.textSecondary,
  },
  replyContainer: {
    padding: 8,
    backgroundColor: t.colors.background,
    borderLeftWidth: 3,
    borderLeftColor: t.colors.primary,
    marginBottom: 8,
    borderRadius: 4,
  },
  replyText: {
    fontSize: 12,
    color: t.colors.textSecondary,
  },
  messageContent: {
    fontSize: 15,
    color: t.colors.text,
    lineHeight: 20,
  },
  aiWarning: {
    fontSize: 11,
    color: t.colors.danger,
    marginTop: 8,
    fontWeight: '600',
  },
  pinnedBadge: {
    fontSize: 11,
    color: t.colors.warning,
    marginTop: 4,
    fontWeight: '600',
  },
  messageActions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 12,
    color: t.colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: t.colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: t.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  replyPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: t.colors.primary,
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 13,
    color: t.colors.textSecondary,
  },
  replyPreviewClose: {
    fontSize: 20,
    color: t.colors.textSecondary,
    paddingHorizontal: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: t.colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: t.colors.textSecondary,
  },
});
