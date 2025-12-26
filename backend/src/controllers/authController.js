const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, Stock } = require('../models');

/**
 * 회원가입
 */
exports.register = async (req, res) => {
  try {
    const { email, username, password, displayName } = req.body;

    // 입력 검증
    if (!email || !username || !password) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '비밀번호는 최소 6자 이상이어야 합니다' });
    }

    // displayName이 없으면 username 사용
    const finalDisplayName = displayName || username;

    // 이메일 중복 확인
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ error: '이미 사용 중인 이메일입니다' });
    }

    // 별칭(username) 중복 확인 - 고유해야 함
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ error: '이미 사용 중인 별칭입니다' });
    }

    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const user = await User.create({
      email,
      username,
      password: hashedPassword,
      displayName: finalDisplayName,
      poBalance: parseInt(process.env.INITIAL_PO_BALANCE) || 10000,
      marketCap: parseInt(process.env.INITIAL_MARKET_CAP) || 5000
    });

    // 주식 자동 생성
    await Stock.create({
      userId: user.id,
      totalShares: 100000,
      issuedShares: 0,
      sharePrice: 100
    });

    // JWT 토큰 발급
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: '회원가입 성공',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        profileImage: user.profileImage,
        poBalance: user.poBalance,
        marketCap: user.marketCap,
        trustLevel: user.trustLevel,
        trustMultiplier: user.trustMultiplier
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '회원가입 중 오류가 발생했습니다' });
  }
};

/**
 * 로그인
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요' });
    }

    // 사용자 찾기
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 틀렸습니다' });
    }

    // 비밀번호 확인
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 틀렸습니다' });
    }

    // 마지막 로그인 시간 업데이트
    await user.update({ lastLoginAt: new Date() });

    // JWT 토큰 발급
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: '로그인 성공',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        profileImage: user.profileImage,
        poBalance: user.poBalance,
        marketCap: user.marketCap,
        trustLevel: user.trustLevel,
        trustMultiplier: user.trustMultiplier
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '로그인 중 오류가 발생했습니다' });
  }
};

/**
 * 내 정보 조회
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    res.json({ user });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ error: '사용자 정보 조회 중 오류가 발생했습니다' });
  }
};
