const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

// =====================================================
// 허용된 CORS 도메인 목록 (server.js와 동일하게 유지)
// =====================================================
const ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000',
  'https://hipo.app',
  'https://www.hipo.app',
  'https://api.hipo.app',
  'https://hipo-frontend.vercel.app',
];

// 환경 변수에서 추가 도메인 허용
if (process.env.ADDITIONAL_CORS_ORIGINS) {
  const additionalOrigins = process.env.ADDITIONAL_CORS_ORIGINS.split(',').map(o => o.trim());
  ALLOWED_ORIGINS.push(...additionalOrigins);
}

// Socket.IO 초기화
function initSocket(server) {
  // JWT_SECRET 필수 확인
  if (!process.env.JWT_SECRET) {
    console.error('[CRITICAL] JWT_SECRET 환경변수가 설정되지 않았습니다!');
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }
  }

  // CORS origin 검증 함수
  const validateOrigin = (origin, callback) => {
    // 개발 환경에서 origin이 없는 요청 허용
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // 프로덕션: 허용된 도메인만
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    // 개발 환경: localhost 허용
    if (process.env.NODE_ENV !== 'production') {
      if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('exp://'))) {
        return callback(null, true);
      }
    }
    callback(new Error('CORS policy violation'));
  };

  io = socketIo(server, {
    cors: {
      origin: validateOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    }
  });

  // 인증 미들웨어
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('인증 토큰이 필요합니다'));
    }

    // JWT_SECRET이 없으면 연결 거부
    if (!process.env.JWT_SECRET) {
      console.error('[SECURITY] JWT_SECRET not configured, rejecting connection');
      return next(new Error('서버 설정 오류'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('유효하지 않은 토큰입니다'));
    }
  });

  // 연결 이벤트
  io.on('connection', (socket) => {
    // 프로덕션에서는 연결 로깅 최소화
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Socket] 사용자 연결됨: ${socket.userId}`);
    }

    // 사용자를 자신의 방에 참여시킴
    socket.join(`user:${socket.userId}`);

    // 연결 해제
    socket.on('disconnect', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Socket] 사용자 연결 해제됨: ${socket.userId}`);
      }
    });

    // DM 메시지 전송 이벤트
    socket.on('message:send', (data) => {
      // 메시지 수신자에게 전송
      socket.to(`user:${data.recipientId}`).emit('message:new', data);
    });

    // DM 타이핑 이벤트
    socket.on('typing:start', (data) => {
      socket.to(`user:${data.recipientId}`).emit('typing:start', {
        userId: socket.userId
      });
    });

    socket.on('typing:stop', (data) => {
      socket.to(`user:${data.recipientId}`).emit('typing:stop', {
        userId: socket.userId
      });
    });

    // === 종목 구독 (호가창 / 차트 / 체결내역) ===
    //
    // 종목 상세를 보는 동안만 해당 종목 room 에 들어간다.
    // 예전에는 io.emit 으로 전 종목 업데이트를 모든 클라이언트에 뿌려서
    // A 종목 차트가 B 종목 체결에 반응하는 문제가 있었다.

    socket.on('stock:subscribe', (stockId) => {
      if (!stockId) return;
      socket.join(`stock:${stockId}`);
    });

    socket.on('stock:unsubscribe', (stockId) => {
      if (!stockId) return;
      socket.leave(`stock:${stockId}`);
    });

    // === 커뮤니티 채팅방 이벤트 ===

    // 커뮤니티 채팅방 참여
    socket.on('community:join', (communityId) => {
      socket.join(`community:${communityId}`);

      // 다른 멤버들에게 참여 알림
      socket.to(`community:${communityId}`).emit('community:user_joined', {
        userId: socket.userId,
        timestamp: new Date()
      });
    });

    // 커뮤니티 채팅방 나가기
    socket.on('community:leave', (communityId) => {
      socket.leave(`community:${communityId}`);

      // 다른 멤버들에게 나간 알림
      socket.to(`community:${communityId}`).emit('community:user_left', {
        userId: socket.userId,
        timestamp: new Date()
      });
    });

    // 커뮤니티 채팅 메시지 전송
    socket.on('chat:send', async (data) => {
      // 메시지를 커뮤니티 방의 모든 사용자에게 브로드캐스트
      io.to(`community:${data.communityId}`).emit('chat:message', {
        ...data,
        timestamp: new Date()
      });
    });

    // 채팅방 타이핑 표시
    socket.on('chat:typing:start', (data) => {
      socket.to(`community:${data.communityId}`).emit('chat:typing', {
        userId: socket.userId,
        communityId: data.communityId,
        isTyping: true
      });
    });

    socket.on('chat:typing:stop', (data) => {
      socket.to(`community:${data.communityId}`).emit('chat:typing', {
        userId: socket.userId,
        communityId: data.communityId,
        isTyping: false
      });
    });

    // 메시지 읽음 표시
    socket.on('chat:read', (data) => {
      io.to(`community:${data.communityId}`).emit('chat:read_receipt', {
        userId: socket.userId,
        messageId: data.messageId,
        communityId: data.communityId
      });
    });

    // 실시간 사용자 수 업데이트
    socket.on('community:request_user_count', async (communityId) => {
      const roomSize = io.sockets.adapter.rooms.get(`community:${communityId}`)?.size || 0;
      socket.emit('community:user_count', {
        communityId,
        count: roomSize
      });
    });

    // === 주주 전용 커뮤니티 이벤트 ===

    // 주주 커뮤니티 입장
    socket.on('shareholder:join', async (data) => {
      const { communityId, isVipRoom } = data;
      const roomName = isVipRoom ? `shareholder-vip:${communityId}` : `shareholder:${communityId}`;

      socket.join(roomName);

      // 현재 접속자 수 전송
      const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;

      // 입장 알림
      socket.to(roomName).emit('shareholder:user_joined', {
        communityId,
        userId: socket.userId,
        isVipRoom,
        onlineCount: roomSize,
        timestamp: new Date()
      });

      // 본인에게 접속자 수 전송
      socket.emit('shareholder:online_count', {
        communityId,
        isVipRoom,
        count: roomSize
      });
    });

    // 주주 커뮤니티 퇴장
    socket.on('shareholder:leave', (data) => {
      const { communityId, isVipRoom } = data;
      const roomName = isVipRoom ? `shareholder-vip:${communityId}` : `shareholder:${communityId}`;

      socket.leave(roomName);

      const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;

      socket.to(roomName).emit('shareholder:user_left', {
        communityId,
        userId: socket.userId,
        isVipRoom,
        onlineCount: roomSize,
        timestamp: new Date()
      });
    });

    // 주주 커뮤니티 메시지 전송
    socket.on('shareholder:message', async (data) => {
      const { communityId, content, isVipRoom, author, tier, tierBadge, tierColor, shareholding } = data;
      const roomName = isVipRoom ? `shareholder-vip:${communityId}` : `shareholder:${communityId}`;

      const messageData = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        communityId,
        content,
        isVipRoom,
        author: {
          id: socket.userId,
          ...author
        },
        tier,
        tierBadge,
        tierColor,
        shareholding,
        createdAt: new Date(),
        isPinned: false
      };

      // 해당 방의 모든 사용자에게 브로드캐스트
      io.to(roomName).emit('shareholder:new_message', messageData);
    });

    // 주주 커뮤니티 타이핑 표시
    socket.on('shareholder:typing:start', (data) => {
      const { communityId, isVipRoom, username, tier } = data;
      const roomName = isVipRoom ? `shareholder-vip:${communityId}` : `shareholder:${communityId}`;

      socket.to(roomName).emit('shareholder:typing', {
        communityId,
        userId: socket.userId,
        username,
        tier,
        isTyping: true
      });
    });

    socket.on('shareholder:typing:stop', (data) => {
      const { communityId, isVipRoom } = data;
      const roomName = isVipRoom ? `shareholder-vip:${communityId}` : `shareholder:${communityId}`;

      socket.to(roomName).emit('shareholder:typing', {
        communityId,
        userId: socket.userId,
        isTyping: false
      });
    });

    // 메시지 고정 알림
    socket.on('shareholder:pin_message', (data) => {
      const { communityId, messageId, isVipRoom } = data;
      const roomName = isVipRoom ? `shareholder-vip:${communityId}` : `shareholder:${communityId}`;

      io.to(roomName).emit('shareholder:message_pinned', {
        communityId,
        messageId,
        pinnedBy: socket.userId,
        timestamp: new Date()
      });
    });

    // 공지사항 알림
    socket.on('shareholder:notice', (data) => {
      const { communityId, notice } = data;

      // 일반 채팅방과 VIP룸 모두에 알림
      io.to(`shareholder:${communityId}`).emit('shareholder:new_notice', notice);
      io.to(`shareholder-vip:${communityId}`).emit('shareholder:new_notice', notice);
    });

    // 접속자 수 요청
    socket.on('shareholder:request_online', (data) => {
      const { communityId, isVipRoom } = data;
      const roomName = isVipRoom ? `shareholder-vip:${communityId}` : `shareholder:${communityId}`;
      const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;

      socket.emit('shareholder:online_count', {
        communityId,
        isVipRoom,
        count: roomSize
      });
    });
  });

  console.log('✅ Socket.IO initialized');
  return io;
}

// Socket.IO 인스턴스 가져오기
function getIO() {
  if (!io) {
    throw new Error('Socket.IO가 초기화되지 않았습니다');
  }
  return io;
}

// 특정 사용자에게 알림 전송
function sendNotificationToUser(userId, notification) {
  if (io) {
    io.to(`user:${userId}`).emit('notification:new', notification);
  }
}

// 특정 사용자에게 메시지 전송
function sendMessageToUser(userId, message) {
  if (io) {
    io.to(`user:${userId}`).emit('message:new', message);
  }
}

/**
 * 실시간 주가 업데이트 전송.
 *
 * 페이로드는 아래 한 가지 형태로 고정한다. 예전에 socket.js 는 평평한 구조를,
 * stockTickerService 는 { stock: {...} } 중첩 구조를 같은 이벤트명으로 보내서
 * 수신 측이 한쪽을 조용히 버리고 있었다.
 *
 *   { stockId, newPrice, oldPrice, changePercent, volume, userId?, username?, timestamp }
 *
 * 종목 room 과 전역 양쪽으로 보낸다.
 *  - `stock:<id>` room  : 종목 상세 화면(차트/호가창)이 구독. 다른 종목 이벤트에 흔들리지 않는다.
 *  - 전역 브로드캐스트   : 홈/목록의 시세 티커용. 수신 측이 stockId 로 걸러 쓴다.
 */
function sendStockPriceUpdate(stockUpdate) {
  if (!io) return;

  const payload = {
    stockId: stockUpdate.stockId,
    userId: stockUpdate.userId,
    username: stockUpdate.username,
    oldPrice: stockUpdate.oldPrice,
    newPrice: stockUpdate.newPrice,
    changePercent: stockUpdate.changePercent,
    volume: stockUpdate.volume,
    timestamp: new Date()
  };

  io.to(`stock:${stockUpdate.stockId}`).emit('stock:price_update', payload);
  io.emit('stock:ticker_update', payload);
}

/**
 * 호가창 변경 브로드캐스트.
 * 주문 생성 / 체결 / 취소 시 해당 종목 구독자에게만 보낸다.
 */
function sendOrderBookUpdate(stockId, orderBook) {
  if (!io || !stockId) return;
  io.to(`stock:${stockId}`).emit('orderbook:update', {
    stockId,
    ...orderBook,
    timestamp: new Date()
  });
}

/**
 * 체결 내역(Time & Sales) 한 건 추가.
 */
function sendTradeTick(stockId, trade) {
  if (!io || !stockId) return;
  io.to(`stock:${stockId}`).emit('trade:tick', {
    stockId,
    ...trade,
    timestamp: trade.timestamp || new Date()
  });
}

// 배당 알림 전송
function sendDividendNotification(userId, dividend) {
  if (io) {
    const notification = {
      type: 'DIVIDEND',
      title: '배당금 지급',
      message: `${dividend.amount}원의 배당금이 지급되었습니다`,
      amount: dividend.amount,
      creatorId: dividend.creatorId,
      creatorName: dividend.creatorName,
      timestamp: new Date()
    };

    io.to(`user:${userId}`).emit('dividend:received', notification);
    io.to(`user:${userId}`).emit('notification:new', notification);
  }
}

// 레벨업 알림 전송
function sendLevelUpNotification(userId, levelData) {
  if (io) {
    const notification = {
      type: 'LEVEL_UP',
      title: '레벨 업!',
      message: `축하합니다! ${levelData.oldLevel}에서 ${levelData.newLevel}로 레벨업했습니다`,
      oldLevel: levelData.oldLevel,
      newLevel: levelData.newLevel,
      newBadge: levelData.newBadge,
      rewards: levelData.rewards,
      timestamp: new Date()
    };

    io.to(`user:${userId}`).emit('level:up', notification);
    io.to(`user:${userId}`).emit('notification:new', notification);
  }
}

// 주식 알림 전송
function sendStockAlert(userId, alertData) {
  if (io) {
    const notification = {
      type: 'STOCK_ALERT',
      title: '주식 알림',
      message: alertData.message,
      alertId: alertData.alertId,
      stockId: alertData.stockId,
      stock: alertData.stock,
      alertType: alertData.alertType,
      triggerPrice: alertData.triggerPrice,
      timestamp: alertData.createdAt || new Date()
    };

    io.to(`user:${userId}`).emit('stock:alert', notification);
    io.to(`user:${userId}`).emit('notification:new', notification);
  }
}

// 주주 커뮤니티 메시지 브로드캐스트
function sendShareholderMessage(communityId, message, isVipRoom = false) {
  if (io) {
    const roomName = isVipRoom ? `shareholder-vip:${communityId}` : `shareholder:${communityId}`;
    io.to(roomName).emit('shareholder:new_message', message);
  }
}

// 주주 커뮤니티 공지 브로드캐스트
function sendShareholderNotice(communityId, notice) {
  if (io) {
    io.to(`shareholder:${communityId}`).emit('shareholder:new_notice', notice);
    io.to(`shareholder-vip:${communityId}`).emit('shareholder:new_notice', notice);
  }
}

// 주주 커뮤니티 시스템 메시지 (입장, 퇴장, 경고 등)
function sendShareholderSystemMessage(communityId, type, data, isVipRoom = false) {
  if (io) {
    const roomName = isVipRoom ? `shareholder-vip:${communityId}` : `shareholder:${communityId}`;
    io.to(roomName).emit('shareholder:system', {
      type,
      ...data,
      timestamp: new Date()
    });
  }
}

// 주주 커뮤니티 접속자 수 조회
function getShareholderOnlineCount(communityId, isVipRoom = false) {
  if (io) {
    const roomName = isVipRoom ? `shareholder-vip:${communityId}` : `shareholder:${communityId}`;
    return io.sockets.adapter.rooms.get(roomName)?.size || 0;
  }
  return 0;
}

// 실시간 거래 체결 피드 브로드캐스트
function sendTradeExecuted(tradeData) {
  if (io) {
    io.emit('trade:executed', {
      username: tradeData.username,
      stockName: tradeData.stockName,
      type: tradeData.type, // 'buy' | 'sell'
      shares: tradeData.shares,
      price: tradeData.price,
      totalAmount: tradeData.totalAmount,
      timestamp: new Date()
    });
  }
}

// 포트폴리오 일일 리포트 푸시 (특정 유저)
function sendPortfolioReport(userId, reportData) {
  if (io) {
    const notification = {
      type: 'PORTFOLIO_REPORT',
      title: '오늘의 포트폴리오',
      message: `오늘 수익: ${reportData.dailyProfit >= 0 ? '+' : ''}${reportData.dailyProfit?.toLocaleString()} PO (${reportData.dailyProfitRate >= 0 ? '+' : ''}${reportData.dailyProfitRate?.toFixed(2)}%)`,
      ...reportData,
      timestamp: new Date()
    };
    io.to(`user:${userId}`).emit('notification:new', notification);
  }
}

// 가상 셀럽 인수 완료 알림 (전체)
function sendClaimCompletedAlert(stockData) {
  if (io) {
    io.emit('stock:claimed', {
      stockId: stockData.stockId,
      celebName: stockData.celebName,
      message: `${stockData.celebName}님이 실제 본인 인증을 완료했습니다!`,
      timestamp: new Date()
    });
  }
}

module.exports = {
  initSocket,
  getIO,
  sendNotificationToUser,
  sendMessageToUser,
  sendStockPriceUpdate,
  sendOrderBookUpdate,
  sendTradeTick,
  sendDividendNotification,
  sendLevelUpNotification,
  sendStockAlert,
  sendShareholderMessage,
  sendShareholderNotice,
  sendShareholderSystemMessage,
  getShareholderOnlineCount,
  sendTradeExecuted,
  sendPortfolioReport,
  sendClaimCompletedAlert
};
