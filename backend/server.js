require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check (always available)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'HIPO Backend API', version: '1.0.0' });
});

// Function to load routes after database is ready
function loadRoutes() {
  try {
    const passport = require('./src/config/passport');
    app.use(passport.initialize());

    // Static files
    app.use('/uploads', express.static('uploads'));

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

    console.log('✅ All routes loaded successfully');
    return true;
  } catch (error) {
    console.error('⚠️ Failed to load routes:', error.message);
    console.error(error.stack);
    return false;
  }
}

// 404 handler - must be added after routes
function add404Handler() {
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
}

// Start server
async function startServer() {
  try {
    const { testConnection, sequelize } = require('./src/config/database');

    // 1. 데이터베이스 연결 테스트
    const dbConnected = await testConnection();

    // 2. 테이블 동기화 (먼저!)
    if (dbConnected) {
      await sequelize.sync({ alter: false });
      console.log('📊 Database synchronized');
    }

    // 3. Routes 로드 (DB 동기화 후)
    const routesLoaded = loadRoutes();

    // 4. 404 핸들러 추가
    add404Handler();

    // 5. 백그라운드 서비스 시작 (테이블 생성 후)
    if (routesLoaded) {
      try {
        const { initSocket } = require('./src/config/socket');
        const { startAdminScheduler } = require('./src/jobs/adminScheduler');
        const stockAlertMonitorService = require('./src/services/stockAlertMonitorService');
        const stockTickerService = require('./src/services/stockTickerService');

        // Socket.IO 초기화
        initSocket(server);

        // 방장 자동 교체 스케줄러 시작
        startAdminScheduler();

        // 주식 알림 모니터링 서비스 시작
        stockAlertMonitorService.start();

        // 실시간 주가 티커 서비스 시작
        stockTickerService.start();

        console.log('✅ Background services started');
      } catch (serviceError) {
        console.error('⚠️ Failed to start some background services:', serviceError.message);
      }
    }

    // 6. 서버 시작
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

// Only start server if not in Vercel serverless environment
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  startServer();
} else {
  // For Vercel: load routes immediately (Vercel handles DB differently)
  loadRoutes();
  add404Handler();
}

// Export for Vercel serverless
module.exports = app;
