const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

// Socket.IO 초기화
function initSocket(server) {
  io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // 인증 미들웨어
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('인증 토큰이 필요합니다'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('유효하지 않은 토큰입니다'));
    }
  });

  // 연결 이벤트
  io.on('connection', (socket) => {
    console.log(`사용자 연결됨: ${socket.userId}`);

    // 사용자를 자신의 방에 참여시킴
    socket.join(`user:${socket.userId}`);

    // 연결 해제
    socket.on('disconnect', () => {
      console.log(`사용자 연결 해제됨: ${socket.userId}`);
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

    // === 커뮤니티 채팅방 이벤트 ===

    // 커뮤니티 채팅방 참여
    socket.on('community:join', (communityId) => {
      socket.join(`community:${communityId}`);
      console.log(`사용자 ${socket.userId}가 커뮤니티 ${communityId}에 참여`);

      // 다른 멤버들에게 참여 알림
      socket.to(`community:${communityId}`).emit('community:user_joined', {
        userId: socket.userId,
        timestamp: new Date()
      });
    });

    // 커뮤니티 채팅방 나가기
    socket.on('community:leave', (communityId) => {
      socket.leave(`community:${communityId}`);
      console.log(`사용자 ${socket.userId}가 커뮤니티 ${communityId}에서 나감`);

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

// 실시간 주가 업데이트 전송
function sendStockPriceUpdate(stockUpdate) {
  if (io) {
    io.emit('stock:price_update', {
      userId: stockUpdate.userId,
      username: stockUpdate.username,
      oldPrice: stockUpdate.oldPrice,
      newPrice: stockUpdate.newPrice,
      changePercent: stockUpdate.changePercent,
      timestamp: new Date()
    });
  }
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

module.exports = {
  initSocket,
  getIO,
  sendNotificationToUser,
  sendMessageToUser,
  sendStockPriceUpdate,
  sendDividendNotification,
  sendLevelUpNotification,
  sendStockAlert
};
