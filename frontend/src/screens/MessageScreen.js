import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { API_URL } from '../config';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSocket } from '../contexts/SocketContext';

export default function MessageScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    loadConversations();

    // 새 메시지 수신 시 목록 업데이트
    if (socket && isConnected) {
      socket.on('message:new', handleNewMessage);

      return () => {
        socket.off('message:new', handleNewMessage);
      };
    }
  }, [socket, isConnected]);

  const handleNewMessage = (message) => {
    // 새 메시지가 오면 대화 목록 새로고침
    loadConversations();
  };

  const loadConversations = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/messages/conversations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('대화 목록 로드 오류:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  const renderConversation = ({ item }) => {
    const hasUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={[styles.conversationCard, hasUnread && styles.conversationCardUnread]}
        onPress={() =>
          navigation.navigate('ChatDetail', {
            conversationId: item.id,
            otherUser: item.otherUser,
          })
        }
      >
        <View style={styles.conversationHeader}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {item.otherUser?.username?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>

          <View style={styles.conversationContent}>
            <View style={styles.conversationTop}>
              <Text style={[styles.username, hasUnread && styles.usernameUnread]}>
                {item.otherUser?.username || '알 수 없음'}
              </Text>
              <Text style={styles.time}>{formatTime(item.lastMessageAt)}</Text>
            </View>

            <View style={styles.conversationBottom}>
              <Text
                style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
                numberOfLines={1}
              >
                {item.lastMessage || '메시지 없음'}
              </Text>
              {hasUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>메시지</Text>
        <View style={styles.headerRight}>
          {isConnected && <View style={styles.onlineDot} />}
          <Text style={styles.headerSubtitle}>
            {isConnected ? '온라인' : '오프라인'}
          </Text>
        </View>
      </View>

      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>대화 내역이 없습니다</Text>
            <Text style={styles.emptySubtext}>
              다른 사용자에게 메시지를 보내보세요!
            </Text>
          </View>
        }
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  listContent: {
    padding: 16,
  },
  conversationCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  conversationCardUnread: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  conversationHeader: {
    flexDirection: 'row',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
  },
  conversationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  usernameUnread: {
    fontWeight: 'bold',
  },
  time: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  conversationBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  lastMessageUnread: {
    color: COLORS.text,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
