const express = require('express');
const router = express.Router();
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

      // 웹 환경과 모바일 환경 구분
      const userAgent = req.headers['user-agent'] || '';
      const isMobile = /mobile/i.test(userAgent) && !/web/i.test(userAgent);

      if (isMobile) {
        // 앱으로 딥링크. 스킴은 app.json 의 expo.scheme 과 같아야 열린다
        // (예전에는 존재하지 않는 myapp:// 을 써서 앱이 열리지 않았다)
        res.redirect(`${APP_SCHEME}://auth?accessToken=${accessToken}&refreshToken=${refreshToken}`);
      } else {
        // 웹의 경우 토큰을 localStorage에 저장하고 홈으로 리다이렉트
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>로그인 성공</title>
          </head>
          <body>
            <script>
              // 토큰을 localStorage에 저장
              localStorage.setItem('accessToken', '${accessToken}');
              localStorage.setItem('refreshToken', '${refreshToken}');
              // 하위 호환성을 위해 token도 저장
              localStorage.setItem('token', '${accessToken}');
              localStorage.setItem('user', JSON.stringify(${JSON.stringify(req.user)}));
              // 홈 페이지로 리다이렉트
              window.location.href = '${CLIENT_URL}';
            </script>
            <p>로그인 중...</p>
          </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('Google OAuth 콜백 오류:', error);
      res.redirect(`${CLIENT_URL}?error=auth_failed`);
    }
  }
);

module.exports = router;
