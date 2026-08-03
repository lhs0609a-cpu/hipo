require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// 환경 변수 검증 (프로덕션에서 필수 변수 누락 시 시작 중단)
const { checkEnvironmentOrExit } = require('./src/utils/envValidation');
checkEnvironmentOrExit();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// =====================================================
// CORS 허용 도메인 설정
// =====================================================
const ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:3000',
  'http://localhost:19006',
  'https://hipo.app',
  'https://www.hipo.app',
  'https://api.hipo.app',
];

// 환경 변수에서 추가 도메인 허용
if (process.env.ADDITIONAL_CORS_ORIGINS) {
  const additionalOrigins = process.env.ADDITIONAL_CORS_ORIGINS.split(',').map(o => o.trim());
  ALLOWED_ORIGINS.push(...additionalOrigins);
}

const corsOptions = {
  origin: (origin, callback) => {
    // 개발 환경에서는 origin이 없는 요청(Postman 등) 허용
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else if (process.env.NODE_ENV !== 'production') {
      // 개발 환경에서는 로컬호스트 허용
      if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation'));
      }
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// =====================================================
// Middleware 설정
// =====================================================

// Helmet 보안 헤더 강화
app.use(helmet({
  // HSTS: HTTPS 강제 (1년, 서브도메인 포함, preload 목록 등록 가능)
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  // Referrer-Policy: 민감한 정보 누출 방지
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  // Content-Security-Policy: XSS 방지 (기본값 사용, 필요시 커스터마이즈)
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  // X-Frame-Options: 클릭재킹 방지
  frameguard: {
    action: 'deny',
  },
  // X-Content-Type-Options: MIME 스니핑 방지
  noSniff: true,
  // X-XSS-Protection: XSS 필터 활성화 (레거시 브라우저용)
  xssFilter: true,
}));
app.use(cors(corsOptions));

// Request Body 크기 제한 (DoS 방지)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 로깅 설정 (프로덕션에서는 combined 포맷 사용)
if (process.env.NODE_ENV === 'production') {
  // 프로덕션: 간략한 로깅, 민감 정보 제외
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400 // 에러만 로깅
  }));
} else {
  app.use(morgan('dev'));
}

// Health check (환경 정보 노출 제거)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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

    // === 신규 고급 기능 라우트 ===
    app.use('/api/trading', require('./src/routes/advancedTrading'));
    app.use('/api/security', require('./src/routes/security'));
    app.use('/api/ipo', require('./src/routes/ipo'));
    app.use('/api/ipo-offerings', require('./src/routes/ipoOffering'));
    app.use('/api/pre-ipo', require('./src/routes/preIPO'));
    app.use('/api/portfolio', require('./src/routes/portfolio'));
    app.use('/api/watchlist', require('./src/routes/watchlist'));

    // === 바이럴/마케팅 기능 라우트 ===
    app.use('/api/viral', require('./src/routes/viral'));

    // === 시드 데이터 라우트 (개발용) ===
    app.use('/api/seed', require('./src/routes/seed'));

    // === 지정가/손절/익절 주문 라우트 ===
    app.use('/api/stock-orders', require('./src/routes/stockOrder'));

    // === 티어 시스템 라우트 ===
    app.use('/api/tiers', require('./src/routes/tier'));

    // === 주주 전용 커뮤니티 라우트 ===
    app.use('/api/shareholder-community', require('./src/routes/shareholderCommunity'));

    // === 연속 로그인 보상 라우트 ===
    app.use('/api/login-streak', require('./src/routes/loginStreak'));

    // === 장기 보유 보너스 라우트 ===
    app.use('/api/holding-bonus', require('./src/routes/holdingBonus'));

    // === 크리에이터 수익 정산 라우트 ===
    app.use('/api/settlement', require('./src/routes/settlement'));

    // === 온보딩(첫 주주 되기) 라우트 ===
    app.use('/api/onboarding', require('./src/routes/onboarding'));

    // === 가상 셀럽 사전상장 라우트 ===
    app.use('/api/virtual-celebrity', require('./src/routes/virtualCelebrity'));

    console.log('✅ All routes loaded successfully');
    return true;
  } catch (error) {
    // 프로덕션에서는 스택 트레이스 로깅 제외
    console.error('⚠️ Failed to load routes:', error.message);
    if (process.env.NODE_ENV !== 'production') {
      console.error(error.stack);
    }
    return false;
  }
}

// 404 handler - must be added after routes
function add404Handler() {
  app.use((req, res) => {
    res.status(404).json({ error: '요청하신 엔드포인트를 찾을 수 없습니다' });
  });

  // Error handler (보안 강화: 에러 메시지 노출 방지)
  app.use((err, req, res, next) => {
    // 개발 환경에서만 스택 트레이스 로깅
    if (process.env.NODE_ENV !== 'production') {
      console.error('[DEV ERROR]', err.message);
      console.error(err.stack);
    } else {
      // 프로덕션에서는 에러 ID와 메시지만 로깅 (스택 트레이스 제외)
      const errorId = Date.now().toString(36);
      console.error(`[ERROR ${errorId}]`, err.message);
    }

    // 클라이언트에게 항상 일반적인 에러 메시지만 반환
    res.status(500).json({
      error: '서버 오류가 발생했습니다',
      // 프로덕션에서는 절대 에러 메시지 노출하지 않음
      ...(process.env.NODE_ENV !== 'production' && { debug: err.message })
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
      // 프로덕션에서는 alter 없이 동기화 (마이그레이션 사용 권장)
      if (process.env.NODE_ENV === 'production') {
        await sequelize.sync();
      } else {
        await sequelize.sync({ alter: true });
      }
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
        const { startTierScheduler } = require('./src/jobs/tierScheduler');
        const stockAlertMonitorService = require('./src/services/stockAlertMonitorService');
        const stockTickerService = require('./src/services/stockTickerService');
        const orderMatchingService = require('./src/services/orderMatchingService');
        const { startPriceHistoryScheduler } = require('./src/jobs/priceHistoryScheduler');

        // Socket.IO 초기화
        initSocket(server);

        // 방장 자동 교체 스케줄러 시작
        startAdminScheduler();

        // 티어 자동 업데이트 스케줄러 시작
        startTierScheduler();

        // 주식 알림 모니터링 서비스 시작
        stockAlertMonitorService.start();

        // 실시간 주가 티커 서비스 시작
        stockTickerService.start();

        // 주문 매칭 엔진 시작 (5초 간격)
        orderMatchingService.start(5000);

        // 가격 히스토리(캔들) 기록 스케줄러 시작 (1분 간격)
        startPriceHistoryScheduler();

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
