import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';

/**
 * 커뮤니티 채팅방 실시간 기능을 처리하는 커스텀 훅
 * @param {string} communityId - 커뮤니티 ID
 * @returns {Object} 채팅 관련 상태 및 함수들
 */
export const useCommunityChat = (communityId) => {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    if (!socket || !isConnected || !communityId) return;

    // 커뮤니티 채팅방 참여
    console.log('Joining community:', communityId);
    socket.emit('community:join', { communityId });

    // 새 채팅 메시지 수신
    const handleChatMessage = (message) => {
      console.log('New chat message:', message);
      setMessages((prev) => [...prev, message]);
    };

    // 사용자 참여 알림
    const handleUserJoined = ({ userId, username }) => {
      console.log('User joined:', username);
      setOnlineUsers((prev) => [...prev, { userId, username }]);
    };

    // 사용자 퇴장 알림
    const handleUserLeft = ({ userId, username }) => {
      console.log('User left:', username);
      setOnlineUsers((prev) => prev.filter((user) => user.userId !== userId));
    };

    // 타이핑 시작
    const handleTypingStart = ({ userId, username }) => {
      setTypingUsers((prev) => {
        if (prev.find((u) => u.userId === userId)) return prev;
        return [...prev, { userId, username }];
      });
    };

    // 타이핑 종료
    const handleTypingStop = ({ userId }) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
    };

    // 현재 접속자 수
    const handleUserCount = ({ count }) => {
      console.log('Community user count:', count);
      setUserCount(count);
    };

    // 읽음 확인
    const handleReadReceipt = ({ messageId, userId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, readBy: [...(msg.readBy || []), userId] }
            : msg
        )
      );
    };

    // 이벤트 리스너 등록
    socket.on('chat:message', handleChatMessage);
    socket.on('community:user_joined', handleUserJoined);
    socket.on('community:user_left', handleUserLeft);
    socket.on('chat:typing:start', handleTypingStart);
    socket.on('chat:typing:stop', handleTypingStop);
    socket.on('community:user_count', handleUserCount);
    socket.on('chat:read_receipt', handleReadReceipt);

    // 접속자 수 요청
    socket.emit('community:request_user_count', { communityId });

    // 클린업: 커뮤니티 퇴장 및 이벤트 리스너 제거
    return () => {
      console.log('Leaving community:', communityId);
      socket.emit('community:leave', { communityId });

      socket.off('chat:message', handleChatMessage);
      socket.off('community:user_joined', handleUserJoined);
      socket.off('community:user_left', handleUserLeft);
      socket.off('chat:typing:start', handleTypingStart);
      socket.off('chat:typing:stop', handleTypingStop);
      socket.off('community:user_count', handleUserCount);
      socket.off('chat:read_receipt', handleReadReceipt);
    };
  }, [socket, isConnected, communityId]);

  // 채팅 메시지 전송
  const sendMessage = useCallback(
    (content) => {
      if (!socket || !isConnected) {
        console.warn('Socket not connected');
        return;
      }

      socket.emit('chat:send', { communityId, content });
    },
    [socket, isConnected, communityId]
  );

  // 타이핑 알림 시작
  const startTyping = useCallback(() => {
    if (!socket || !isConnected) return;
    socket.emit('chat:typing:start', { communityId });
  }, [socket, isConnected, communityId]);

  // 타이핑 알림 종료
  const stopTyping = useCallback(() => {
    if (!socket || !isConnected) return;
    socket.emit('chat:typing:stop', { communityId });
  }, [socket, isConnected, communityId]);

  // 메시지 읽음 처리
  const markAsRead = useCallback(
    (messageId) => {
      if (!socket || !isConnected) return;
      socket.emit('chat:read', { communityId, messageId });
    },
    [socket, isConnected, communityId]
  );

  return {
    messages,
    onlineUsers,
    userCount,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
  };
};
