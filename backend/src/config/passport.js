const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User, Stock } = require('../models');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
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

        // 새 사용자 생성
        user = await User.create({
          email,
          username,
          profileImage,
          password: 'google_oauth_' + Math.random().toString(36), // 임시 비밀번호
          poBalance: parseInt(process.env.INITIAL_PO_BALANCE) || 10000,
          marketCap: parseInt(process.env.INITIAL_MARKET_CAP) || 5000,
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
