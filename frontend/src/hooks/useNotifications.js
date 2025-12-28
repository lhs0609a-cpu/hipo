import { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';

/**
 * 실시간 알림을 처리하는 커스텀 훅
 * @returns {Object} notifications - 알림 목록, unreadCount - 읽지 않은 알림 수
 */
export const useNotifications = () => {
  const { socket, isConnected } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // 새 알림 수신
    const handleNewNotification = (notification) => {
      console.log('New notification received:', notification);

      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    // 이벤트 리스너 등록
    socket.on('notification:new', handleNewNotification);

    // 클린업: 이벤트 리스너 제거
    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, isConnected]);

  // 알림 읽음 처리
  const markAsRead = (notificationId) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  // 모든 알림 읽음 처리
  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, isRead: true }))
    );
    setUnreadCount(0);
  };

  // 알림 삭제
  const deleteNotification = (notificationId) => {
    setNotifications((prev) =>
      prev.filter((notif) => notif.id !== notificationId)
    );
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};
