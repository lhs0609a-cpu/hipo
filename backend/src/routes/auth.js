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
 * GET /api/auth/google
 * Google OAuth 인증 시작
 */
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

/**
 * GET /api/auth/google/callback
 * Google OAuth 콜백
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: 'http://localhost:8081?error=auth_failed' }),
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
        // React Native 앱의 경우 딥링크 사용
        res.redirect(`myapp://auth?accessToken=${accessToken}&refreshToken=${refreshToken}`);
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
              window.location.href = 'http://localhost:8081';
            </script>
            <p>로그인 중...</p>
          </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('Google OAuth 콜백 오류:', error);
      res.redirect('http://localhost:8081?error=auth_failed');
    }
  }
);

module.exports = router;
