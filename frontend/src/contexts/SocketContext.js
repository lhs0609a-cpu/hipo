import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from '../config';

// Socket Context 생성
const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let socketInstance = null;

    const initSocket = async () => {
      try {
        // AsyncStorage에서 JWT 토큰 가져오기
        const token = await AsyncStorage.getItem('token');

        if (!token) {
          console.log('Socket: No token found, skipping connection');
          return;
        }

        // Socket.io 클라이언트 인스턴스 생성
        socketInstance = io(SOCKET_URL, {
          auth: {
            token, // JWT 토큰 전달
          },
          transports: ['websocket', 'polling'], // 전송 방식
          reconnection: true, // 자동 재연결
          reconnectionAttempts: 5, // 재연결 시도 횟수
          reconnectionDelay: 1000, // 재연결 대기 시간
        });

        // 연결 성공
        socketInstance.on('connect', () => {
          console.log('Socket: Connected successfully', socketInstance.id);
          setIsConnected(true);
          setError(null);
        });

        // 연결 해제
        socketInstance.on('disconnect', (reason) => {
          console.log('Socket: Disconnected', reason);
          setIsConnected(false);
        });

        // 연결 에러
        socketInstance.on('connect_error', (err) => {
          console.error('Socket: Connection error', err.message);
          setError(err.message);
          setIsConnected(false);
        });

        // 재연결 시도
        socketInstance.on('reconnect_attempt', (attempt) => {
          console.log('Socket: Reconnection attempt', attempt);
        });

        // 재연결 성공
        socketInstance.on('reconnect', (attemptNumber) => {
          console.log('Socket: Reconnected after', attemptNumber, 'attempts');
          setIsConnected(true);
          setError(null);
        });

        // 재연결 실패
        socketInstance.on('reconnect_failed', () => {
          console.error('Socket: Reconnection failed');
          setError('Failed to reconnect to server');
        });

        setSocket(socketInstance);
      } catch (err) {
        console.error('Socket: Initialization error', err);
        setError(err.message);
      }
    };

    initSocket();

    // 클린업: 컴포넌트 언마운트 시 소켓 연결 해제
    return () => {
      if (socketInstance) {
        console.log('Socket: Cleaning up connection');
        socketInstance.disconnect();
      }
    };
  }, []);

  const value = {
    socket,
    isConnected,
    error,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// useSocket 커스텀 훅
export const useSocket = () => {
  const context = useContext(SocketContext);

  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }

  return context;
};

export default SocketContext;
