const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');

/**
 * POST /api/auth/register
 * 회원가입
 */
router.post('/register', authController.register);

/**
 * POST /api/auth/login
 * 로그인
 */
router.post('/login', authController.login);

/**
 * GET /api/auth/me
 * 내 정보 조회 (인증 필요)
 */
router.get('/me', authenticateToken, authController.getMe);

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
  (req, res) => {
    try {
      // JWT 토큰 생성
      const token = jwt.sign(
        { id: req.user.id, email: req.user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      // 웹 환경과 모바일 환경 구분
      const userAgent = req.headers['user-agent'] || '';
      const isMobile = /mobile/i.test(userAgent) && !/web/i.test(userAgent);

      if (isMobile) {
        // React Native 앱의 경우 딥링크 사용
        res.redirect(`myapp://auth?token=${token}`);
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
              localStorage.setItem('token', '${token}');
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
