import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend Socket.IO URL
const SOCKET_URL = 'https://hipo-backend.fly.dev';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    /** 현재 구독 중인 종목 id. 재연결 시 복구하는 데 쓴다. */
    this.subscribedStocks = new Set();
  }

  /**
   * Socket.IO 연결
   */
  async connect() {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        console.log('No token found, skipping socket connection');
        return null;
      }

      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      this.setupEventHandlers();

      return this.socket;
    } catch (error) {
      console.error('Socket connection error:', error);
      return null;
    }
  }

  /**
   * 이벤트 핸들러 설정
   */
  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      // 끊겼다 붙으면 서버 쪽 room 이 사라지므로 구독을 다시 건다
      this.resubscribeStocks();
      this.emit('connectionChange', true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      this.emit('connectionChange', false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('Max reconnection attempts reached');
      }
    });

    // 실시간 주가 티커 업데이트
    this.socket.on('stock:ticker_update', (data) => {
      this.emit('stockTickerUpdate', data);
    });

    // 개별 주식 가격 업데이트 (구독 중인 종목 room)
    this.socket.on('stock:price_update', (data) => {
      this.emit('stockPriceUpdate', data);
    });

    // 호가창 변경 (구독 중인 종목 room)
    this.socket.on('orderbook:update', (data) => {
      this.emit('orderBookUpdate', data);
    });

    // 체결 한 건 (Time & Sales)
    this.socket.on('trade:tick', (data) => {
      this.emit('tradeTick', data);
    });

    // 거래 체결
    this.socket.on('trade:new', (data) => {
      this.emit('tradeNew', data);
    });

    this.socket.on('trade:executed', (data) => {
      this.emit('tradeExecuted', data);
    });

    // 주문 관련
    this.socket.on('order:created', (data) => {
      this.emit('orderCreated', data);
    });

    this.socket.on('order:filled', (data) => {
      this.emit('orderFilled', data);
    });

    this.socket.on('order:cancelled', (data) => {
      this.emit('orderCancelled', data);
    });

    this.socket.on('order:triggered', (data) => {
      this.emit('orderTriggered', data);
    });

    // 알림
    this.socket.on('notification:new', (data) => {
      this.emit('notificationNew', data);
    });

    // 배당
    this.socket.on('dividend:received', (data) => {
      this.emit('dividendReceived', data);
    });

    // 주식 알림
    this.socket.on('stock:alert', (data) => {
      this.emit('stockAlert', data);
    });

    // 신규 상장
    this.socket.on('stock:new', (data) => {
      this.emit('stockNew', data);
    });

    // 가상 셀럽 인수 완료
    this.socket.on('stock:claimed', (data) => {
      this.emit('stockClaimed', data);
    });

    // 포트폴리오 리포트
    this.socket.on('portfolio:report', (data) => {
      this.emit('portfolioReport', data);
    });
  }

  /**
   * 연결 해제
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  /**
   * 이벤트 리스너 등록
   */
  /**
   * 종목 구독. 종목 상세 화면이 마운트될 때 호출한다.
   * 구독한 종목의 price_update / orderbook:update / trade:tick 만 받게 된다.
   */
  subscribeStock(stockId) {
    if (!stockId) return;
    this.subscribedStocks.add(stockId);
    if (this.socket?.connected) {
      this.socket.emit('stock:subscribe', stockId);
    }
  }

  unsubscribeStock(stockId) {
    if (!stockId) return;
    this.subscribedStocks.delete(stockId);
    if (this.socket?.connected) {
      this.socket.emit('stock:unsubscribe', stockId);
    }
  }

  /** 재연결 시 구독 복구 */
  resubscribeStocks() {
    if (!this.socket?.connected) return;
    for (const stockId of this.subscribedStocks) {
      this.socket.emit('stock:subscribe', stockId);
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // cleanup 함수 반환
    return () => {
      this.off(event, callback);
    };
  }

  /**
   * 이벤트 리스너 제거
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * 내부 이벤트 emit
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * 서버로 이벤트 전송
   */
  send(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  /**
   * 커뮤니티 채팅방 참여
   */
  joinCommunity(communityId) {
    this.send('community:join', communityId);
  }

  /**
   * 커뮤니티 채팅방 나가기
   */
  leaveCommunity(communityId) {
    this.send('community:leave', communityId);
  }

  /**
   * 채팅 메시지 전송
   */
  sendChatMessage(communityId, message) {
    this.send('chat:send', { communityId, ...message });
  }

  /**
   * 타이핑 시작
   */
  startTyping(communityId) {
    this.send('chat:typing:start', { communityId });
  }

  /**
   * 타이핑 중지
   */
  stopTyping(communityId) {
    this.send('chat:typing:stop', { communityId });
  }

  /**
   * 연결 상태 확인
   */
  getConnectionStatus() {
    return this.isConnected;
  }
}

// 싱글톤 인스턴스
const socketService = new SocketService();

export default socketService;
