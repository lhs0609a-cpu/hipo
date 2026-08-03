/**
 * 시드 데이터 라우터 - 개발/테스트용
 *
 * ⚠️ 보안 주의: 이 라우터는 데이터베이스를 완전히 초기화할 수 있습니다.
 * - 프로덕션 환경에서는 자동으로 비활성화됩니다.
 * - 관리자 인증이 필요합니다.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const models = require('../models');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const { User, Stock, Post, Comment, Like, Holding, Transaction, Follow, PriceHistory, PreIPORound } = models;

// =====================================================
// 보안 미들웨어: 프로덕션 환경 차단
// =====================================================
const blockInProduction = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    console.warn(`[SECURITY] Blocked seed endpoint access in production: ${req.path} from ${req.ip}`);
    return res.status(403).json({
      success: false,
      error: '프로덕션 환경에서는 시드 데이터 API를 사용할 수 없습니다.',
      code: 'PRODUCTION_BLOCKED'
    });
  }
  next();
};

// 시드 비밀 키 확인 (추가 보안 레이어)
const verifySeedSecret = (req, res, next) => {
  const seedSecret = req.headers['x-seed-secret'] || req.body.seedSecret;
  const expectedSecret = process.env.SEED_SECRET;

  // SEED_SECRET이 설정되지 않은 경우 개발 환경에서만 허용
  if (!expectedSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[SECURITY] SEED_SECRET is required in production');
      return res.status(403).json({
        success: false,
        error: '시드 시크릿이 설정되지 않았습니다.',
        code: 'SEED_SECRET_MISSING'
      });
    }
    // 개발 환경에서는 경고만 출력
    console.warn('[WARN] SEED_SECRET not set - seed endpoints unprotected');
    return next();
  }

  // SEED_SECRET이 설정된 경우 검증
  if (seedSecret !== expectedSecret) {
    console.warn(`[SECURITY] Invalid seed secret from ${req.ip}`);
    return res.status(403).json({
      success: false,
      error: '시드 시크릿이 올바르지 않습니다.',
      code: 'INVALID_SEED_SECRET'
    });
  }
  next();
};

// 안전한 랜덤 비밀번호 생성 (시드 데이터용)
const generateSecurePassword = () => {
  const crypto = require('crypto');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  const randomBytes = crypto.randomBytes(16);
  for (let i = 0; i < 16; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
};

// 한국 이름 생성기
const koreanFirstNames = ['민준', '서준', '도윤', '예준', '시우', '주원', '하준', '지호', '지후', '준서', '서연', '지우', '서현', '민서', '하은', '하윤', '윤서', '지민', '채원', '수아'];
const koreanLastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍'];

// 크리에이터 데이터 (확장)
const creators = [
  // 톱티어 엔터테이너
  { username: '아이유', displayName: '아이유 (IU)', category: 'entertainment', occupation: '가수', bio: '음악으로 세상을 물들이는 가수 아이유입니다', trustLevel: 'legend', marketCap: 50000000, trending: true },
  { username: '손흥민', displayName: '손흥민', category: 'sports', occupation: '축구선수', bio: '토트넘 홋스퍼 FC 소속 축구선수', trustLevel: 'diamond', marketCap: 45000000, trending: true },
  { username: 'V_뷔', displayName: 'V (뷔)', category: 'entertainment', occupation: '가수', bio: 'BTS 멤버 뷔입니다', trustLevel: 'legend', marketCap: 48000000 },
  { username: '제니', displayName: 'JENNIE', category: 'entertainment', occupation: '가수', bio: 'BLACKPINK JENNIE', trustLevel: 'diamond', marketCap: 42000000, trending: true },
  { username: '임영웅', displayName: '임영웅', category: 'entertainment', occupation: '가수', bio: '영웅시대와 함께하는 가수 임영웅입니다', trustLevel: 'master', marketCap: 35000000 },
  { username: '이강인', displayName: '이강인', category: 'sports', occupation: '축구선수', bio: 'PSG 소속 축구선수 이강인', trustLevel: 'platinum', marketCap: 28000000, trending: true },
  { username: '김연아', displayName: '김연아', category: 'sports', occupation: '피겨스케이터', bio: '피겨 퀸 김연아입니다', trustLevel: 'legend', marketCap: 38000000 },
  { username: '아이브', displayName: 'IVE 공식', category: 'entertainment', occupation: '아이돌', bio: 'IVE 공식 계정입니다', trustLevel: 'diamond', marketCap: 32000000 },
  { username: '뉴진스', displayName: 'NewJeans', category: 'entertainment', occupation: '아이돌', bio: 'NewJeans 공식 계정', trustLevel: 'diamond', marketCap: 36000000, trending: true },
  { username: '류현진', displayName: '류현진', category: 'sports', occupation: '야구선수', bio: '한화 이글스 투수 류현진입니다', trustLevel: 'platinum', marketCap: 25000000 },
  { username: '박서준', displayName: '박서준', category: 'entertainment', occupation: '배우', bio: '배우 박서준입니다', trustLevel: 'platinum', marketCap: 22000000 },
  { username: '전지현', displayName: '전지현', category: 'entertainment', occupation: '배우', bio: '배우 전지현 공식 계정', trustLevel: 'master', marketCap: 30000000 },
  { username: '페이커', displayName: 'Faker (이상혁)', category: 'creator', occupation: 'e스포츠', bio: 'T1 미드라이너 Faker입니다', trustLevel: 'legend', marketCap: 40000000, trending: true },
  { username: '침착맨', displayName: '침착맨', category: 'creator', occupation: '유튜버', bio: '침착맨입니다. 워후.', trustLevel: 'platinum', marketCap: 18000000 },
  { username: '쯔양', displayName: '쯔양', category: 'creator', occupation: '유튜버', bio: '먹방 유튜버 쯔양입니다', trustLevel: 'gold', marketCap: 15000000 },
  { username: '우왁굳', displayName: '우왁굳', category: 'creator', occupation: '유튜버', bio: '트위치 스트리머 우왁굳입니다', trustLevel: 'gold', marketCap: 12000000 },
  { username: '고세구', displayName: '고세구', category: 'creator', occupation: '버튜버', bio: '버추얼 아이돌 이세돌 고세구입니다', trustLevel: 'silver', marketCap: 8000000 },
  { username: '주르르', displayName: '주르르', category: 'creator', occupation: '버튜버', bio: '이세돌 주르르입니다', trustLevel: 'silver', marketCap: 7500000 },
  { username: '릴파', displayName: '릴파', category: 'creator', occupation: '버튜버', bio: '이세돌 릴파입니다', trustLevel: 'silver', marketCap: 7000000 },
  { username: '도티', displayName: '도티', category: 'creator', occupation: '유튜버', bio: '도티TV 운영자 도티입니다', trustLevel: 'gold', marketCap: 10000000 },
  // 추가 크리에이터 (초기 유동성 강화)
  { username: '한소희', displayName: '한소희', category: 'entertainment', occupation: '배우', bio: '배우 한소희입니다', trustLevel: 'platinum', marketCap: 24000000, trending: true },
  { username: '차은우', displayName: '차은우', category: 'entertainment', occupation: '배우/가수', bio: '아스트로 멤버, 배우 차은우입니다', trustLevel: 'platinum', marketCap: 26000000 },
  { username: '기안84', displayName: '기안84', category: 'creator', occupation: '웹툰작가', bio: '복학왕, 나 혼자 산다 기안84입니다', trustLevel: 'gold', marketCap: 14000000 },
  { username: '이무진', displayName: '이무진', category: 'entertainment', occupation: '가수', bio: '가수 이무진입니다', trustLevel: 'gold', marketCap: 12000000, trending: true },
  { username: '에스파', displayName: 'aespa', category: 'entertainment', occupation: '아이돌', bio: 'aespa 공식 계정', trustLevel: 'diamond', marketCap: 34000000 },
  { username: '세븐틴', displayName: 'SEVENTEEN', category: 'entertainment', occupation: '아이돌', bio: '세븐틴 공식 계정', trustLevel: 'diamond', marketCap: 38000000 },
  { username: '대도서관', displayName: '대도서관', category: 'creator', occupation: '스트리머', bio: '아프리카TV 대도서관입니다', trustLevel: 'gold', marketCap: 11000000 },
  { username: '뽀로로', displayName: '뽀로로', category: 'creator', occupation: '캐릭터', bio: '뽀로로와 친구들 공식 계정', trustLevel: 'platinum', marketCap: 20000000 },
  { username: '오킹', displayName: '오킹', category: 'creator', occupation: '유튜버', bio: '게임 유튜버 오킹입니다', trustLevel: 'silver', marketCap: 6000000 },
  { username: '풍월량', displayName: '풍월량', category: 'creator', occupation: '스트리머', bio: '트위치 스트리머 풍월량입니다', trustLevel: 'gold', marketCap: 9000000 },
];

// 가격 추세 패턴 타입
const trendPatterns = {
  STRONG_UP: { baseChange: 0.015, volatility: 0.02 },
  MODERATE_UP: { baseChange: 0.008, volatility: 0.015 },
  SIDEWAYS: { baseChange: 0, volatility: 0.01 },
  MODERATE_DOWN: { baseChange: -0.008, volatility: 0.015 },
  STRONG_DOWN: { baseChange: -0.015, volatility: 0.02 },
  VOLATILE: { baseChange: 0, volatility: 0.03 },
};

// 가격 히스토리 생성 함수
function generatePriceHistory(stockId, currentPrice, days = 90, pattern = 'MODERATE_UP') {
  const history = [];
  const { baseChange, volatility } = trendPatterns[pattern] || trendPatterns.MODERATE_UP;

  // 현재가에서 역산하여 시작가 계산
  let endPrice = currentPrice;
  let startPrice = endPrice / Math.pow(1 + baseChange, days);

  let price = startPrice;
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // 일간 변동
    const dailyChange = baseChange + (Math.random() - 0.5) * volatility * 2;
    const open = price;
    const close = price * (1 + dailyChange);
    const high = Math.max(open, close) * (1 + Math.random() * volatility);
    const low = Math.min(open, close) * (1 - Math.random() * volatility);
    const volume = Math.floor(Math.random() * 10000) + 500;

    history.push({
      stockId,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
      timeframe: '1d',
      timestamp: date,
    });

    price = close;
  }

  return history;
}

// 게시물 내용
const postContents = [
  '오늘 새 앨범 작업 중입니다! 기대해주세요',
  '팬 여러분 덕분에 여기까지 왔습니다. 항상 감사합니다',
  '오늘 연습 끝! 내일도 화이팅',
  '팬미팅에서 만난 모든 분들 감사합니다',
  '새로운 도전을 시작합니다. 응원해주세요!',
  '오늘 하루도 수고하셨습니다',
  '드디어 발표! 곧 뵙겠습니다',
  '연습실에서 열심히 준비 중이에요',
  '주말에 쉬면서 충전 중입니다',
  '여러분의 응원이 큰 힘이 됩니다',
  '오늘 촬영 현장에서! 비하인드 곧 공개할게요',
  '항상 최선을 다하겠습니다. 지켜봐주세요!',
  '팬분들 덕분에 매일 행복합니다',
  '이번 무대 정말 기대됩니다! 많이 봐주세요',
  '여러분과 함께해서 행복해요',
];

// 댓글 내용
const commentContents = [
  '항상 응원합니다!',
  '최고예요!!',
  '팬이에요~ 사랑해요!',
  '대박 기대됩니다!',
  '주식 더 사야겠다 ㅋㅋ',
  '언제나 응원해요!',
  '진짜 최고!!',
  '기다리고 있을게요',
  '화이팅!!',
  '오늘도 좋은 하루 되세요~',
  '너무 멋져요!!',
  '항상 행복하세요',
  '대주주로서 응원합니다!',
  '주가 올라라!!',
  '팬미팅 때 봬요!',
];

// POST /api/seed/reset - 데이터베이스 리셋 (테이블 재생성)
// 🔒 보안: 프로덕션 차단 + 인증 + 관리자 권한 + 시드 시크릿 필요
router.post('/reset',
  blockInProduction,
  authenticateToken,
  isAdmin,
  verifySeedSecret,
  async (req, res) => {
    try {
      console.log(`[SEED] Database reset initiated by admin: ${req.user.email}`);
      const { sequelize } = require('../config/database');

      // 확인 메시지 체크
      const { confirmReset } = req.body;
      if (confirmReset !== 'CONFIRM_DATABASE_RESET') {
        return res.status(400).json({
          success: false,
          error: '데이터베이스 리셋을 확인하려면 confirmReset: "CONFIRM_DATABASE_RESET"을 전송하세요.',
          code: 'CONFIRMATION_REQUIRED'
        });
      }

      // 모든 테이블 드롭 후 재생성
      await sequelize.sync({ force: true });

      console.log(`[SEED] Database reset completed by admin: ${req.user.email}`);

      res.json({
        success: true,
        message: '데이터베이스가 리셋되었습니다. 모든 테이블이 새로 생성되었습니다.',
        executedBy: req.user.email,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('데이터베이스 리셋 오류:', error);
      res.status(500).json({
        success: false,
        message: '데이터베이스 리셋 실패',
        error: error.message
      });
    }
  }
);

// POST /api/seed/generate - 시드 데이터 생성
// 🔒 보안: 프로덕션 차단 + 인증 + 관리자 권한 필요
router.post('/generate',
  blockInProduction,
  authenticateToken,
  isAdmin,
  verifySeedSecret,
  async (req, res) => {
  try {
    console.log('시드 데이터 생성 시작...');
    const results = {
      creators: 0,
      regularUsers: 0,
      stocks: 0,
      holdings: 0,
      transactions: 0,
      posts: 0,
      comments: 0,
      likes: 0,
      priceHistory: 0,
    };

    // 시드 데이터용 비밀번호 (환경변수 또는 랜덤 생성)
    // ⚠️ 보안: 실제 운영에서는 사용하지 않음 (blockInProduction 미들웨어로 차단됨)
    const seedPassword = process.env.SEED_USER_PASSWORD || generateSecurePassword();
    const hashedPassword = await bcrypt.hash(seedPassword, 10);

    // ⚠️ 보안: 비밀번호는 절대 로깅하지 않음 (부분적으로도 금지)
    console.log('[SEED] Seed password configured (not logged for security)');

    const creatorUsers = [];
    const regularUsers = [];
    const stocks = [];
    const posts = [];

    // 1. 크리에이터 생성
    for (const creator of creators) {
      let user = await User.findOne({ where: { username: creator.username } });
      if (!user) {
        user = await User.create({
          id: uuidv4(),
          email: `${creator.username.toLowerCase().replace(/\s/g, '')}@hipo.kr`,
          username: creator.username,
          displayName: creator.displayName,
          password: hashedPassword,
          bio: creator.bio,
          category: creator.category,
          occupation: creator.occupation,
          trustLevel: creator.trustLevel,
          marketCap: creator.marketCap,
          poBalance: 1000000,
          isCreator: true,
          isVerified: true,
          isVirtual: true,
          virtualStatus: 'unclaimed',
          virtualCreatedAt: new Date(),
          realName: creator.displayName,
          newsKeywords: creator.displayName,
          referralCode: `${creator.username.substring(0, 4).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        });
        results.creators++;
      }
      creatorUsers.push(user);
    }

    // 2. 일반 사용자 생성 (30명)
    for (let i = 0; i < 30; i++) {
      const lastName = koreanLastNames[Math.floor(Math.random() * koreanLastNames.length)];
      const firstName = koreanFirstNames[Math.floor(Math.random() * koreanFirstNames.length)];
      const username = `${lastName}${firstName}${Math.floor(Math.random() * 1000)}`;

      let user = await User.findOne({ where: { username } });
      if (!user) {
        const trustLevels = ['bronze', 'bronze', 'silver', 'silver', 'gold'];
        user = await User.create({
          id: uuidv4(),
          email: `user${i}_${Date.now()}@example.com`,
          username,
          displayName: `${lastName}${firstName}`,
          password: hashedPassword,
          bio: `안녕하세요! ${lastName}${firstName}입니다.`,
          trustLevel: trustLevels[Math.floor(Math.random() * trustLevels.length)],
          poBalance: Math.floor(Math.random() * 500000) + 10000,
          referralCode: `USER${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        });
        results.regularUsers++;
      }
      regularUsers.push(user);
    }

    // 3. 주식 생성 및 가격 히스토리
    for (let i = 0; i < creatorUsers.length; i++) {
      const creator = creatorUsers[i];
      const creatorData = creators[i];
      let stock = await Stock.findOne({ where: { userId: creator.id } });

      if (!stock) {
        // 트렌딩 크리에이터는 더 높은 가격과 상승 추세
        const isTrending = creatorData?.trending || false;
        const basePrice = isTrending
          ? Math.floor(Math.random() * 3000) + 2000
          : Math.floor(Math.random() * 4000) + 500;
        const priceChange = isTrending
          ? Math.random() * 20 + 5  // +5% ~ +25%
          : (Math.random() - 0.3) * 30;  // -9% ~ +21%
        const issuedShares = Math.floor(Math.random() * 50000) + 10000;
        const tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
        const categories = ['entertainment', 'sports', 'creator', 'influencer'];

        stock = await Stock.create({
          id: uuidv4(),
          userId: creator.id,
          totalShares: 100000,
          issuedShares,
          availableShares: Math.floor(Math.random() * 5000) + 1000,
          sharePrice: basePrice,
          marketCapTotal: basePrice * issuedShares,
          priceChangePercent: priceChange.toFixed(2),
          dividendRate: Math.floor(Math.random() * 20) + 10,
          tier: tiers[Math.floor(Math.random() * tiers.length)],
          category: creatorData?.category || categories[Math.floor(Math.random() * categories.length)],
          shareholderCount: Math.floor(Math.random() * 500) + 50,
          transactionCount: Math.floor(Math.random() * 2000) + 100,
          dayVolume: Math.floor(Math.random() * 10000) + 500,
          status: 'virtual',
          isVirtualListing: true,
          virtualListingNote: `${creatorData?.displayName || creator.username}은(는) 사전상장 크리에이터입니다. 본인 인수 전까지 가상 주식으로 거래됩니다.`,
          isTrending: isTrending,
        });
        results.stocks++;

        // 가격 히스토리 생성 (PriceHistory 모델이 있을 경우)
        if (PriceHistory) {
          try {
            // 트렌딩 여부에 따라 패턴 결정
            const patterns = Object.keys(trendPatterns);
            let pattern;
            if (isTrending) {
              pattern = Math.random() > 0.3 ? 'STRONG_UP' : 'MODERATE_UP';
            } else {
              pattern = patterns[Math.floor(Math.random() * patterns.length)];
            }

            const historyData = generatePriceHistory(stock.id, basePrice, 90, pattern);

            for (const data of historyData) {
              await PriceHistory.create(data);
              results.priceHistory++;
            }
          } catch (historyError) {
            console.log('Price history creation skipped:', historyError.message);
          }
        }
      }
      stocks.push(stock);
    }

    const allUsers = [...creatorUsers, ...regularUsers];

    // 4. 주식 보유 생성
    for (const stock of stocks) {
      const shareholderCount = Math.floor(Math.random() * 15) + 5;
      const shuffledUsers = allUsers.sort(() => Math.random() - 0.5).slice(0, shareholderCount);

      for (const holder of shuffledUsers) {
        if (holder.id === stock.userId) continue;

        const existingHolding = await Holding.findOne({
          where: { holderId: holder.id, stockId: stock.id }
        });
        if (!existingHolding) {
          await Holding.create({
            id: uuidv4(),
            holderId: holder.id,
            stockId: stock.id,
            shares: Math.floor(Math.random() * 500) + 10,
            averagePrice: stock.sharePrice - Math.floor(Math.random() * 200),
          });
          results.holdings++;
        }
      }
    }

    // 5. 거래 내역 생성
    for (const stock of stocks) {
      const txPerStock = Math.floor(Math.random() * 20) + 10;

      for (let i = 0; i < txPerStock; i++) {
        const buyer = allUsers[Math.floor(Math.random() * allUsers.length)];
        const seller = allUsers[Math.floor(Math.random() * allUsers.length)];
        if (buyer.id === seller.id) continue;

        const shares = Math.floor(Math.random() * 50) + 1;
        const pricePerShare = stock.sharePrice + Math.floor((Math.random() - 0.5) * 200);
        const createdAt = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));

        await Transaction.create({
          id: uuidv4(),
          buyerId: buyer.id,
          sellerId: seller.id,
          stockId: stock.id,
          shares,
          pricePerShare,
          totalAmount: shares * pricePerShare,
          transactionType: 'buy',
          createdAt,
        });
        results.transactions++;
      }
    }

    // 6. 게시물 생성
    for (const creator of creatorUsers) {
      const postCount = Math.floor(Math.random() * 4) + 2;

      for (let i = 0; i < postCount; i++) {
        const content = postContents[Math.floor(Math.random() * postContents.length)];
        const createdAt = new Date(Date.now() - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000));

        const post = await Post.create({
          id: uuidv4(),
          userId: creator.id,
          content,
          likesCount: Math.floor(Math.random() * 500) + 10,
          commentsCount: Math.floor(Math.random() * 50) + 5,
          visibilityType: Math.random() > 0.9 ? 'SHAREHOLDERS_ONLY' : 'PUBLIC',
          createdAt,
        });
        posts.push(post);
        results.posts++;
      }
    }

    // 7. 댓글 생성
    for (const post of posts) {
      const commentsPerPost = Math.floor(Math.random() * 8) + 3;

      for (let i = 0; i < commentsPerPost; i++) {
        const commenter = allUsers[Math.floor(Math.random() * allUsers.length)];
        const content = commentContents[Math.floor(Math.random() * commentContents.length)];

        await Comment.create({
          id: uuidv4(),
          postId: post.id,
          userId: commenter.id,
          content,
          shareholding: Math.floor(Math.random() * 100),
        });
        results.comments++;
      }
    }

    // 8. 좋아요 생성
    for (const post of posts) {
      const likesPerPost = Math.floor(Math.random() * 30) + 5;
      const likers = allUsers.sort(() => Math.random() - 0.5).slice(0, likesPerPost);

      for (const liker of likers) {
        try {
          await Like.create({
            id: uuidv4(),
            postId: post.id,
            userId: liker.id,
          });
          results.likes++;
        } catch (e) {
          // 중복 무시
        }
      }
    }

    res.json({
      success: true,
      message: '시드 데이터 생성 완료!',
      results
    });

  } catch (error) {
    console.error('시드 데이터 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '시드 데이터 생성 실패',
      error: error.message
    });
  }
});

// GET /api/seed/status - 현재 데이터 상태 확인
// 🔒 보안: 프로덕션 차단 + 인증 필요
router.get('/status',
  blockInProduction,
  authenticateToken,
  async (req, res) => {
  try {
    const [userCount, stockCount, postCount, transactionCount, holdingCount, priceHistoryCount] = await Promise.all([
      User.count(),
      Stock.count(),
      Post.count(),
      Transaction.count(),
      Holding.count(),
      PriceHistory ? PriceHistory.count() : Promise.resolve(0),
    ]);

    res.json({
      success: true,
      data: {
        users: userCount,
        stocks: stockCount,
        posts: postCount,
        transactions: transactionCount,
        holdings: holdingCount,
        priceHistory: priceHistoryCount,
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/seed/trending - 트렌딩 주식 데이터 업데이트
// 🔒 보안: 프로덕션 차단 + 인증 + 관리자 권한 필요
router.post('/trending',
  blockInProduction,
  authenticateToken,
  isAdmin,
  async (req, res) => {
  try {
    // 상위 10개 주식을 트렌딩으로 설정
    const stocks = await Stock.findAll({
      order: [['marketCapTotal', 'DESC']],
      limit: 10,
    });

    let updated = 0;
    for (const stock of stocks) {
      // 트렌딩 주식에 양수 변동률 부여
      const newPriceChange = (Math.random() * 15 + 5).toFixed(2);
      await stock.update({
        priceChangePercent: newPriceChange,
        isTrending: true,
        dayVolume: Math.floor(Math.random() * 20000) + 5000,
      });
      updated++;
    }

    res.json({
      success: true,
      message: `${updated}개의 트렌딩 주식이 업데이트되었습니다`,
      trendingCount: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/seed/simulate-activity - 실시간 활동 시뮬레이션
// 🔒 보안: 프로덕션 차단 + 인증 + 관리자 권한 필요
router.post('/simulate-activity',
  blockInProduction,
  authenticateToken,
  isAdmin,
  async (req, res) => {
  try {
    const results = { transactions: 0, priceUpdates: 0 };

    // 랜덤 거래 10건 생성
    const users = await User.findAll({ limit: 50 });
    const stocks = await Stock.findAll({ where: { status: 'active' }, limit: 20 });

    if (users.length > 0 && stocks.length > 0) {
      for (let i = 0; i < 10; i++) {
        const buyer = users[Math.floor(Math.random() * users.length)];
        const stock = stocks[Math.floor(Math.random() * stocks.length)];

        if (buyer.id !== stock.userId) {
          const shares = Math.floor(Math.random() * 20) + 1;
          const pricePerShare = stock.sharePrice;

          await Transaction.create({
            id: uuidv4(),
            buyerId: buyer.id,
            sellerId: stock.userId,
            stockId: stock.id,
            shares,
            pricePerShare,
            totalAmount: shares * pricePerShare,
            transactionType: 'buy',
          });
          results.transactions++;

          // 주가 미세 변동
          const priceChange = (Math.random() - 0.4) * 2; // -0.8% ~ +1.2%
          const newPrice = Math.round(stock.sharePrice * (1 + priceChange / 100));
          await stock.update({
            sharePrice: newPrice,
            priceChangePercent: (parseFloat(stock.priceChangePercent || 0) + priceChange).toFixed(2),
            dayVolume: (stock.dayVolume || 0) + shares,
          });
          results.priceUpdates++;
        }
      }
    }

    res.json({
      success: true,
      message: '활동 시뮬레이션 완료',
      results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
