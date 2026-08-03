const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const crypto = require('crypto');
const { User, Stock } = require('../models');

// =====================================================
// Google OAuth 환경 변수 검증
// =====================================================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

// Google OAuth가 설정된 경우에만 전략 등록
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Google 프로필에서 이메일 가져오기
        const email = profile.emails[0].value;
        const username = profile.displayName || profile.emails[0].value.split('@')[0];
        const profileImage = profile.photos[0]?.value;

        // 기존 사용자 찾기
        let user = await User.findOne({ where: { email } });

        if (user) {
          // 기존 사용자: 프로필 이미지 업데이트
          if (profileImage && !user.profileImage) {
            await user.update({ profileImage });
          }
          return done(null, user);
        }

        // 새 사용자 생성 (OAuth 사용자는 암호학적으로 안전한 임시 비밀번호 사용)
        const securePassword = 'oauth_' + crypto.randomBytes(32).toString('hex');
        user = await User.create({
          email,
          username,
          profileImage,
          password: securePassword,
          poBalance: parseInt(process.env.INITIAL_PO_BALANCE, 10) || 10000,
          marketCap: parseInt(process.env.INITIAL_MARKET_CAP, 10) || 5000,
          trustLevel: 'bronze',
          isCreator: true,
        });

        // 새 사용자에게 주식 생성
        await Stock.create({
          userId: user.id,
          totalShares: 100000,
          issuedShares: 0,
          sharePrice: 100,
          marketCapTotal: 10000000,
        });

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth 오류:', error);
        return done(error, null);
      }
    }
    )
  );
} else {
  // Google OAuth 환경 변수가 설정되지 않은 경우 경고
  console.warn('[WARN] Google OAuth is disabled: Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_CALLBACK_URL');
  console.warn('[WARN] To enable Google OAuth, set these environment variables');
}

// 세션 직렬화
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// 세션 역직렬화
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
