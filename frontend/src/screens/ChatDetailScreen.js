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
import { COLORS } from '../constants/colors';
import { API_URL } from '../config';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSocket } from '../contexts/SocketContext';

export default function ChatDetailScreen({ route, navigation }) {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const { conversationId, otherUser } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const { socket, isConnected } = useSocket();
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    loadMessages();
    navigation.setOptions({
      title: otherUser?.username || '채팅',
    });

    // Socket 이벤트 리스너
    if (socket && isConnected) {
      socket.on('message:new', handleNewMessage);
      socket.on('typing:start', handleTypingStart);
      socket.on('typing:stop', handleTypingStop);

      // 읽음 처리
      markAsRead();

      return () => {
        socket.off('message:new', handleNewMessage);
        socket.off('typing:start', handleTypingStart);
        socket.off('typing:stop', handleTypingStop);
      };
    }
  }, [socket, isConnected]);

  const handleNewMessage = (message) => {
    if (message.conversationId === conversationId) {
      setMessages((prev) => [...prev, message]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd();
      }, 100);
      markAsRead();
    }
  };

  const handleTypingStart = ({ userId }) => {
    if (userId === otherUser.id) {
      // 타이핑 표시 로직 (선택사항)
      console.log(`${otherUser.username}님이 입력 중...`);
    }
  };

  const handleTypingStop = ({ userId }) => {
    if (userId === otherUser.id) {
      console.log(`${otherUser.username}님이 입력 중지`);
    }
  };

  const loadMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/messages/${conversationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages(response.data.messages || []);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('메시지 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(
        `${API_URL}/messages/${conversationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (error) {
      console.error('읽음 처리 오류:', error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    setSending(true);
    const tempMessage = {
      id: `temp-${Date.now()}`,
      content: inputText,
      senderId: 'me',
      createdAt: new Date().toISOString(),
      isTemp: true,
    };

    setMessages((prev) => [...prev, tempMessage]);
    const messageContent = inputText;
    setInputText('');

    // 타이핑 중지 알림
    if (socket && isConnected) {
      socket.emit('typing:stop', { recipientId: otherUser.id });
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/messages/${conversationId}`,
        {
          content: messageContent,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // 임시 메시지를 실제 메시지로 교체
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessage.id ? response.data.message : msg
        )
      );

      setTimeout(() => {
        flatListRef.current?.scrollToEnd();
      }, 100);
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      // 임시 메시지 제거
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
      alert('메시지 전송에 실패했습니다');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (text) => {
    setInputText(text);

    if (socket && isConnected) {
      if (text.length > 0) {
        socket.emit('typing:start', { recipientId: otherUser.id });

        // 타이핑 중지 타이머 설정
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('typing:stop', { recipientId: otherUser.id });
        }, 2000);
      } else {
        socket.emit('typing:stop', { recipientId: otherUser.id });
      }
    }
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId === 'me' || item.isTemp;
    const time = new Date(item.createdAt).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View
        style={[
          styles.messageWrapper,
          isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessage : styles.otherMessage,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}
          >
            {item.content}
          </Text>
        </View>
        <Text style={styles.messageTime}>{time}</Text>
        {item.isTemp && <Text style={styles.sendingText}>전송 중...</Text>}
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
      {/* 메시지 목록 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {otherUser?.username}님과의 대화를 시작하세요
            </Text>
          </View>
        }
      />

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
          style={[
            styles.sendButton,
            (!inputText.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          <Text style={styles.sendButtonText}>
            {sending ? '...' : '전송'}
          </Text>
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
  messageList: {
    padding: 16,
  },
  messageWrapper: {
    marginBottom: 12,
    maxWidth: '75%',
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 4,
  },
  myMessage: {
    backgroundColor: t.colors.primary,
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: t.colors.text,
  },
  messageTime: {
    fontSize: 11,
    color: t.colors.textSecondary,
  },
  sendingText: {
    fontSize: 10,
    color: t.colors.textSecondary,
    fontStyle: 'italic',
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: t.colors.textSecondary,
  },
});
