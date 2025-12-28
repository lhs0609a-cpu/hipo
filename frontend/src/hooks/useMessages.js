import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';

/**
 * 실시간 메시지를 처리하는 커스텀 훅
 * @returns {Object} 메시지 관련 상태 및 함수들
 */
export const useMessages = () => {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState({});

  useEffect(() => {
    if (!socket || !isConnected) return;

    // 새 메시지 수신
    const handleNewMessage = (message) => {
      console.log('New message received:', message);

      setMessages((prev) => [...prev, message]);

      // 대화 목록 업데이트
      setConversations((prev) => {
        const conversationIndex = prev.findIndex(
          (conv) => conv.id === message.conversationId
        );

        if (conversationIndex >= 0) {
          const updated = [...prev];
          updated[conversationIndex] = {
            ...updated[conversationIndex],
            lastMessage: message,
            updatedAt: message.createdAt,
          };
          return updated;
        }

        return prev;
      });

      setUnreadCount((prev) => prev + 1);
    };

    // 타이핑 시작
    const handleTypingStart = ({ userId, conversationId }) => {
      console.log('User typing:', userId);
      setTypingUsers((prev) => ({
        ...prev,
        [conversationId]: userId,
      }));
    };

    // 타이핑 종료
    const handleTypingStop = ({ conversationId }) => {
      setTypingUsers((prev) => {
        const updated = { ...prev };
        delete updated[conversationId];
        return updated;
      });
    };

    // 읽음 확인
    const handleReadReceipt = ({ conversationId, userId }) => {
      console.log('Message read by:', userId);
      // 메시지 읽음 상태 업데이트
      setMessages((prev) =>
        prev.map((msg) =>
          msg.conversationId === conversationId
            ? { ...msg, isRead: true }
            : msg
        )
      );
    };

    // 이벤트 리스너 등록
    socket.on('message:new', handleNewMessage);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('message:read', handleReadReceipt);

    // 클린업: 이벤트 리스너 제거
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('message:read', handleReadReceipt);
    };
  }, [socket, isConnected]);

  // 메시지 전송
  const sendMessage = useCallback(
    (conversationId, content) => {
      if (!socket || !isConnected) {
        console.warn('Socket not connected');
        return;
      }

      socket.emit('message:send', { conversationId, content });
    },
    [socket, isConnected]
  );

  // 타이핑 알림 시작
  const startTyping = useCallback(
    (conversationId) => {
      if (!socket || !isConnected) return;
      socket.emit('typing:start', { conversationId });
    },
    [socket, isConnected]
  );

  // 타이핑 알림 종료
  const stopTyping = useCallback(
    (conversationId) => {
      if (!socket || !isConnected) return;
      socket.emit('typing:stop', { conversationId });
    },
    [socket, isConnected]
  );

  // 메시지 읽음 처리
  const markAsRead = useCallback(
    (conversationId) => {
      if (!socket || !isConnected) return;
      socket.emit('message:read', { conversationId });
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    [socket, isConnected]
  );

  return {
    messages,
    conversations,
    unreadCount,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
  };
};
