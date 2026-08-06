const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const {
  authenticateToken,
  refreshTokens,
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
} = require('../middleware/auth');
const passport = require('../config/passport');

// =====================================================
// Rate Limiting 설정 - 무차별 대입 공격 방지
// =====================================================

// 로그인 시도 제한: 15분에 5회
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 최대 5회
  message: {
    error: '로그인 시도가 너무 많습니다. 15분 후에 다시 시도해주세요.',
    code: 'TOO_MANY_LOGIN_ATTEMPTS',
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  // IP + 이메일 조합으로 제한 (동일 IP에서 여러 계정 시도 방지)
  keyGenerator: (req) => {
    return `${req.ip}-${req.body?.email || 'unknown'}`;
  },
  skip: (req) => {
    // 개발 환경에서는 rate limiting 스킵 (선택적)
    return process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true';
  },
});

// 회원가입 제한: 1시간에 3회 (IP당)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1시간
  max: 3, // 최대 3회
  message: {
    error: '회원가입 시도가 너무 많습니다. 1시간 후에 다시 시도해주세요.',
    code: 'TOO_MANY_REGISTER_ATTEMPTS',
    retryAfter: 60 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true';
  },
});

// 토큰 갱신 제한: 1분에 10회
const refreshLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 10, // 최대 10회
  message: {
    error: '토큰 갱신 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    code: 'TOO_MANY_REFRESH_ATTEMPTS',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 비밀번호 재설정 제한: 1시간에 3회
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1시간
  max: 3,
  message: {
    error: '비밀번호 재설정 요청이 너무 많습니다. 1시간 후에 다시 시도해주세요.',
    code: 'TOO_MANY_PASSWORD_RESET_ATTEMPTS',
    retryAfter: 60 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/auth/register
 * 회원가입
 * 🔒 Rate Limit: 1시간에 3회
 */
router.post('/register', registerLimiter, authController.register);

/**
 * POST /api/auth/login
 * 로그인
 * 🔒 Rate Limit: 15분에 5회
 */
router.post('/login', loginLimiter, authController.login);

/**
 * GET /api/auth/me
 * 내 정보 조회 (인증 필요)
 */
router.get('/me', authenticateToken, authController.getMe);

/**
 * POST /api/auth/refresh
 * Access Token 갱신 (Refresh Token 사용)
 * 🔒 Rate Limit: 1분에 10회
 */
router.post('/refresh', refreshLimiter, refreshTokens);

/**
 * POST /api/auth/logout
 * 로그아웃 (현재 디바이스)
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * POST /api/auth/logout-all
 * 모든 디바이스에서 로그아웃
 */
router.post('/logout-all', authenticateToken, authController.logoutAll);

/**
 * 클라이언트(웹) 주소. 배포 시 CLIENT_URL 로 주입한다.
 * 예전에는 localhost:8081 이 네 군데에 하드코딩돼 있어 배포 환경에서
 * 로그인에 성공해도 로컬 주소로 튕겼다.
 */
const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:8081').replace(/\/+$/, '');

/** 앱 딥링크 스킴. frontend/app.json 의 expo.scheme 과 같아야 한다. */
const APP_SCHEME = process.env.APP_SCHEME || 'hipo';

/**
 * Google OAuth 가 설정돼 있는지 확인한다.
 *
 * passport 전략은 GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL 이 모두 있을 때만 등록된다
 * (config/passport.js). 없는 상태로 passport.authenticate('google') 을 부르면
 * "Unknown authentication strategy" 로 500 이 나거나 라우트가 없는 것처럼 보인다.
 * 원인을 알 수 있는 메시지를 돌려준다.
 */
/**
 * OAuth 결과를 클라이언트에 넘기기 위한 일회용 코드 저장소.
 *
 * ## 왜 토큰을 URL 로 바로 주지 않는가
 *
 * 예전에는 콜백이 `localStorage.setItem('accessToken', ...)` 을 하는 HTML 을
 * 돌려줬다. 그런데 그 localStorage 는 **백엔드 오리진(hipo-backend.fly.dev)**
 * 의 저장소다. localStorage 는 오리진별로 격리되므로 CLIENT_URL(Vercel)에서는
 * 절대 읽을 수 없다. 즉 구글 인증은 통과하는데 앱은 로그아웃 상태로 남았다.
 *
 * 그렇다고 토큰을 쿼리스트링에 실으면 7일짜리 refresh token 이 브라우저
 * 히스토리·리퍼러·중간 로그에 그대로 남는다. 그래서 한 번만 쓸 수 있는
 * 짧은 수명의 코드만 넘기고, 실제 토큰은 클라이언트가 POST 로 교환해 간다.
 *
 * 저장소가 프로세스 메모리인 이유: 코드의 수명이 2분이라 재시작 때 날아가도
 * 영향이 한 번의 로그인 재시도뿐이다. 다만 **머신을 2대 이상으로 늘리면**
 * 교환 요청이 다른 머신에 붙어 실패하므로, 그때는 Redis/DB 로 옮겨야 한다.
 */
const AUTH_CODE_TTL_MS = 2 * 60 * 1000;
const pendingAuthCodes = new Map();

function issueAuthCode(payload) {
  const code = crypto.randomBytes(32).toString('hex');
  pendingAuthCodes.set(code, { payload, expiresAt: Date.now() + AUTH_CODE_TTL_MS });
  return code;
}

function consumeAuthCode(code) {
  const entry = pendingAuthCodes.get(code);
  if (!entry) return null;
  // 일회용: 만료 여부와 무관하게 조회 즉시 폐기한다
  pendingAuthCodes.delete(code);
  if (entry.expiresAt < Date.now()) return null;
  return entry.payload;
}

// 교환되지 않고 버려진 코드(사용자가 창을 닫은 경우)가 쌓이지 않도록 청소한다.
// unref() 로 두어 이 타이머가 프로세스 종료를 막지 않게 한다.
setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of pendingAuthCodes) {
    if (entry.expiresAt < now) pendingAuthCodes.delete(code);
  }
}, AUTH_CODE_TTL_MS).unref();

/**
 * 클라이언트에 내보내도 되는 사용자 필드만 추린다.
 *
 * 예전 콜백은 `JSON.stringify(req.user)` 로 Sequelize 인스턴스를 통째로
 * 직렬화해서 **password 해시까지** 브라우저에 내려보냈다.
 * 모양은 authController.login 의 응답과 맞춘다.
 */
function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    profileImage: user.profileImage,
    poBalance: user.poBalance,
    marketCap: user.marketCap,
    trustLevel: user.trustLevel,
    trustMultiplier: user.trustMultiplier,
    onboardedAt: user.onboardedAt,
  };
}

const requireGoogleOAuth = (req, res, next) => {
  if (!passport._strategy || !passport._strategy('google')) {
    return res.status(503).json({
      error: 'Google 로그인이 설정되지 않았습니다',
      detail:
        '서버에 GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL 환경변수가 필요합니다',
      code: 'GOOGLE_OAUTH_NOT_CONFIGURED',
    });
  }
  return next();
};

/**
 * GET /api/auth/google
 * Google OAuth 인증 시작
 */
router.get(
  '/google',
  requireGoogleOAuth,
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

/**
 * GET /api/auth/google/callback
 * Google OAuth 콜백
 */
router.get(
  '/google/callback',
  requireGoogleOAuth,
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${CLIENT_URL}?error=auth_failed`,
  }),
  async (req, res) => {
    try {
      // Access Token과 Refresh Token 생성
      const accessToken = generateAccessToken(req.user.id);
      const refreshToken = generateRefreshToken(req.user.id);

      // Refresh Token을 DB에 저장
      await saveRefreshToken(req.user.id, refreshToken, req);

      // 토큰 자체가 아니라 교환용 코드만 넘긴다 (위 pendingAuthCodes 주석 참고)
      const authCode = issueAuthCode({
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // 초 단위. authController.login 과 동일
        user: publicUser(req.user),
      });

      // 웹 환경과 모바일 환경 구분
      const userAgent = req.headers['user-agent'] || '';
      const isMobile = /mobile/i.test(userAgent) && !/web/i.test(userAgent);

      if (isMobile) {
        // 앱으로 딥링크. 스킴은 app.json 의 expo.scheme 과 같아야 열린다
        // (예전에는 존재하지 않는 myapp:// 을 써서 앱이 열리지 않았다)
        res.redirect(`${APP_SCHEME}://auth?authCode=${authCode}`);
      } else {
        res.redirect(`${CLIENT_URL}/?authCode=${authCode}`);
      }
    } catch (error) {
      console.error('Google OAuth 콜백 오류:', error);
      res.redirect(`${CLIENT_URL}?error=auth_failed`);
    }
  }
);

/**
 * 일회용 코드 교환 제한: 1분에 20회.
 *
 * 코드가 32바이트 난수라 추측 공격은 사실상 불가능하지만,
 * 실패한 교환을 무한히 반복하는 것 자체를 막는다.
 */
const oauthExchangeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    code: 'TOO_MANY_EXCHANGE_ATTEMPTS',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/auth/google/exchange
 * OAuth 콜백이 준 일회용 코드를 실제 토큰으로 교환한다.
 *
 * 응답 모양은 POST /api/auth/login 과 동일해서 클라이언트가 같은 경로로 처리한다.
 */
router.post('/google/exchange', oauthExchangeLimiter, (req, res) => {
  const authCode = req.body?.code;

  if (!authCode || typeof authCode !== 'string') {
    return res.status(400).json({
      error: '인증 코드가 필요합니다',
      code: 'AUTH_CODE_REQUIRED',
    });
  }

  const payload = consumeAuthCode(authCode);

  if (!payload) {
    return res.status(400).json({
      error: '만료되었거나 이미 사용된 인증 코드입니다. 다시 로그인해주세요.',
      code: 'AUTH_CODE_INVALID',
    });
  }

  return res.json({
    success: true,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    expiresIn: payload.expiresIn,
    // 하위 호환성을 위해 token 도 유지 (accessToken 과 동일)
    token: payload.accessToken,
    user: payload.user,
  });
});

module.exports = router;
