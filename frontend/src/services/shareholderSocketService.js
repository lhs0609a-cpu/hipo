/**
 * 주주 커뮤니티 실시간 채팅 Socket.IO 서비스
 */

import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 백엔드 소켓 URL
const SOCKET_URL = 'https://hipo-backend.fly.dev';

class ShareholderSocketService {
  constructor() {
    this.socket = null;
    this.currentCommunityId = null;
    this.isVipRoom = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * 소켓 연결
   */
  async connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다');
      }

      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      this.setupConnectionEvents();

      return new Promise((resolve, reject) => {
        this.socket.on('connect', () => {
          console.log('주주 커뮤니티 소켓 연결됨');
          this.reconnectAttempts = 0;
          resolve(this.socket);
        });

        this.socket.on('connect_error', (error) => {
          console.error('소켓 연결 오류:', error.message);
          reject(error);
        });
      });
    } catch (error) {
      console.error('소켓 연결 실패:', error);
      throw error;
    }
  }

  /**
   * 연결 이벤트 설정
   */
  setupConnectionEvents() {
    this.socket.on('disconnect', (reason) => {
      console.log('소켓 연결 해제:', reason);
      this.notifyListeners('disconnect', { reason });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('소켓 재연결 성공:', attemptNumber);
      // 이전 방에 다시 참여
      if (this.currentCommunityId) {
        this.joinCommunity(this.currentCommunityId, this.isVipRoom);
      }
      this.notifyListeners('reconnect', { attemptNumber });
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('재연결 오류:', error.message);
      this.notifyListeners('reconnect_error', { error: error.message });
    });
  }

  /**
   * 주주 커뮤니티 입장
   */
  joinCommunity(communityId, isVipRoom = false) {
    if (!this.socket?.connected) {
      console.warn('소켓이 연결되지 않았습니다');
      return false;
    }

    // 이전 방에서 나가기
    if (this.currentCommunityId && this.currentCommunityId !== communityId) {
      this.leaveCommunity();
    }

    this.currentCommunityId = communityId;
    this.isVipRoom = isVipRoom;

    this.socket.emit('shareholder:join', { communityId, isVipRoom });

    // 이벤트 리스너 설정
    this.setupCommunityEventListeners();

    return true;
  }

  /**
   * 주주 커뮤니티 퇴장
   */
  leaveCommunity() {
    if (!this.socket?.connected || !this.currentCommunityId) {
      return;
    }

    this.socket.emit('shareholder:leave', {
      communityId: this.currentCommunityId,
      isVipRoom: this.isVipRoom
    });

    this.removeCommunityEventListeners();
    this.currentCommunityId = null;
    this.isVipRoom = false;
  }

  /**
   * 커뮤니티 이벤트 리스너 설정
   */
  setupCommunityEventListeners() {
    // 새 메시지 수신
    this.socket.on('shareholder:new_message', (message) => {
      this.notifyListeners('new_message', message);
    });

    // 사용자 입장
    this.socket.on('shareholder:user_joined', (data) => {
      this.notifyListeners('user_joined', data);
    });

    // 사용자 퇴장
    this.socket.on('shareholder:user_left', (data) => {
      this.notifyListeners('user_left', data);
    });

    // 타이핑 표시
    this.socket.on('shareholder:typing', (data) => {
      this.notifyListeners('typing', data);
    });

    // 접속자 수
    this.socket.on('shareholder:online_count', (data) => {
      this.notifyListeners('online_count', data);
    });

    // 메시지 고정
    this.socket.on('shareholder:message_pinned', (data) => {
      this.notifyListeners('message_pinned', data);
    });

    // 공지사항
    this.socket.on('shareholder:new_notice', (notice) => {
      this.notifyListeners('new_notice', notice);
    });

    // 시스템 메시지
    this.socket.on('shareholder:system', (data) => {
      this.notifyListeners('system', data);
    });
  }

  /**
   * 커뮤니티 이벤트 리스너 제거
   */
  removeCommunityEventListeners() {
    const events = [
      'shareholder:new_message',
      'shareholder:user_joined',
      'shareholder:user_left',
      'shareholder:typing',
      'shareholder:online_count',
      'shareholder:message_pinned',
      'shareholder:new_notice',
      'shareholder:system'
    ];

    events.forEach(event => {
      this.socket?.off(event);
    });
  }

  /**
   * 메시지 전송
   */
  sendMessage(content, author, tier, tierBadge, tierColor, shareholding) {
    if (!this.socket?.connected || !this.currentCommunityId) {
      console.warn('메시지 전송 불가: 소켓 미연결 또는 커뮤니티 미참여');
      return false;
    }

    this.socket.emit('shareholder:message', {
      communityId: this.currentCommunityId,
      content,
      isVipRoom: this.isVipRoom,
      author,
      tier,
      tierBadge,
      tierColor,
      shareholding
    });

    return true;
  }

  /**
   * 타이핑 시작 알림
   */
  startTyping(username, tier) {
    if (!this.socket?.connected || !this.currentCommunityId) return;

    this.socket.emit('shareholder:typing:start', {
      communityId: this.currentCommunityId,
      isVipRoom: this.isVipRoom,
      username,
      tier
    });
  }

  /**
   * 타이핑 종료 알림
   */
  stopTyping() {
    if (!this.socket?.connected || !this.currentCommunityId) return;

    this.socket.emit('shareholder:typing:stop', {
      communityId: this.currentCommunityId,
      isVipRoom: this.isVipRoom
    });
  }

  /**
   * 접속자 수 요청
   */
  requestOnlineCount() {
    if (!this.socket?.connected || !this.currentCommunityId) return;

    this.socket.emit('shareholder:request_online', {
      communityId: this.currentCommunityId,
      isVipRoom: this.isVipRoom
    });
  }

  /**
   * VIP 방으로 전환
   */
  switchToVipRoom() {
    if (!this.currentCommunityId) return false;

    this.leaveCommunity();
    return this.joinCommunity(this.currentCommunityId, true);
  }

  /**
   * 일반 방으로 전환
   */
  switchToRegularRoom() {
    if (!this.currentCommunityId) return false;

    const communityId = this.currentCommunityId;
    this.leaveCommunity();
    return this.joinCommunity(communityId, false);
  }

  /**
   * 이벤트 리스너 등록
   */
  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // 리스너 제거 함수 반환
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * 이벤트 리스너 제거
   */
  removeListener(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * 모든 리스너에게 알림
   */
  notifyListeners(event, data) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`리스너 실행 오류 (${event}):`, error);
      }
    });
  }

  /**
   * 연결 해제
   */
  disconnect() {
    this.leaveCommunity();
    this.listeners.clear();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * 연결 상태 확인
   */
  isConnected() {
    return this.socket?.connected || false;
  }

  /**
   * 현재 커뮤니티 ID
   */
  getCurrentCommunityId() {
    return this.currentCommunityId;
  }

  /**
   * VIP 룸 여부
   */
  getIsVipRoom() {
    return this.isVipRoom;
  }
}

// 싱글톤 인스턴스
const shareholderSocketService = new ShareholderSocketService();
export default shareholderSocketService;
