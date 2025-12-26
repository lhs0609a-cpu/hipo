require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('./src/config/passport');
const { testConnection, sequelize } = require('./src/config/database');
const { initSocket } = require('./src/config/socket');
const { startAdminScheduler } = require('./src/jobs/adminScheduler');
const stockAlertMonitorService = require('./src/services/stockAlertMonitorService');
const stockTickerService = require('./src/services/stockTickerService');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Passport 초기화
app.use(passport.initialize());

// Static files - 업로드된 이미지 서빙
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/stocks', require('./src/routes/stock'));
app.use('/api/posts', require('./src/routes/post'));
app.use('/api/users', require('./src/routes/user'));
app.use('/api/upload', require('./src/routes/upload'));
app.use('/api/notifications', require('./src/routes/notification'));
app.use('/api/bookmarks', require('./src/routes/bookmark'));
app.use('/api/hashtags', require('./src/routes/hashtag'));
app.use('/api/search', require('./src/routes/search'));
app.use('/api/messages', require('./src/routes/message'));
app.use('/api/stories', require('./src/routes/story'));
app.use('/api/qa', require('./src/routes/qa'));
app.use('/api/video-calls', require('./src/routes/videoCall'));
app.use('/api/polls', require('./src/routes/poll'));
app.use('/api/shareholder', require('./src/routes/shareholderTransaction'));
app.use('/api/live-streams', require('./src/routes/liveStream'));
app.use('/api/fan-meetings', require('./src/routes/fanMeeting'));
app.use('/api/nfts', require('./src/routes/nft'));
app.use('/api/merchandises', require('./src/routes/merchandise'));
app.use('/api/events', require('./src/routes/event'));
app.use('/api/wallet', require('./src/routes/wallet'));
app.use('/api/stock-market', require('./src/routes/stockMarket'));
app.use('/api/badges', require('./src/routes/badge'));
app.use('/api/referrals', require('./src/routes/referral'));
app.use('/api/communities', require('./src/routes/community'));
app.use('/api/community-admin', require('./src/routes/communityAdmin'));
app.use('/api/creator-community', require('./src/routes/creatorCommunity'));
app.use('/api/chat', require('./src/routes/chat'));
app.use('/api/dividend', require('./src/routes/dividend'));
app.use('/api/daily-missions', require('./src/routes/dailyMission'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/stock-alerts', require('./src/routes/stockAlert'));
app.use('/api/strategies', require('./src/routes/strategy'));
app.use('/api/competitions', require('./src/routes/competition'));
app.use('/api/news', require('./src/routes/news'));
app.use('/api/verification', require('./src/routes/verification'));
app.use('/api/payment', require('./src/routes/payment'));
app.use('/api/errors', require('./src/routes/error'));
app.use('/api/feedback', require('./src/routes/feedback'));
app.use('/api/creator-rankings', require('./src/routes/creatorRanking'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: '요청하신 엔드포인트를 찾을 수 없습니다' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: '서버 오류가 발생했습니다',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
async function startServer() {
  try {
    // 데이터베이스 연결 테스트
    await testConnection();

    // 테이블 동기화 (개발 환경에서만)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: false });
      console.log('📊 Database synchronized');
    }

    // Socket.IO 초기화
    initSocket(server);

    // 방장 자동 교체 스케줄러 시작
    startAdminScheduler();

    // 주식 알림 모니터링 서비스 시작
    stockAlertMonitorService.start();

    // 실시간 주가 티커 서비스 시작
    stockTickerService.start();

    // 서버 시작
    server.listen(PORT, () => {
      console.log(`🚀 HIPO Backend Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;
