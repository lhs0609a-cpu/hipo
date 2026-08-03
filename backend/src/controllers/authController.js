const bcrypt = require('bcrypt');
const { User, Stock, Wallet, WalletTransaction } = require('../models');
const {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  revokeAllUserTokens,
  revokeRefreshToken,
} = require('../middleware/auth');

// 웰컴 보너스 금액 (radix 10 명시)
const WELCOME_BONUS_AMOUNT = parseInt(process.env.WELCOME_BONUS_AMOUNT, 10) || 10000;

// =====================================================
// 비밀번호 정책 (OWASP 권장사항 기반)
// =====================================================
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = {
  minLength: /.{8,}/,                    // 최소 8자
  hasUpperCase: /[A-Z]/,                 // 대문자 포함
  hasLowerCase: /[a-z]/,                 // 소문자 포함
  hasNumber: /[0-9]/,                    // 숫자 포함
  hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/\\~`]/, // 특수문자 포함 (일반적인 특수문자)
};

/**
 * 비밀번호 유효성 검사
 * @param {string} password - 검사할 비밀번호
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePassword(password) {
  const errors = [];

  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다`);
  }

  if (!PASSWORD_REGEX.hasUpperCase.test(password)) {
    errors.push('비밀번호에 대문자(A-Z)가 포함되어야 합니다');
  }

  if (!PASSWORD_REGEX.hasLowerCase.test(password)) {
    errors.push('비밀번호에 소문자(a-z)가 포함되어야 합니다');
  }

  if (!PASSWORD_REGEX.hasNumber.test(password)) {
    errors.push('비밀번호에 숫자(0-9)가 포함되어야 합니다');
  }

  // 특수문자는 권장사항 (필수 아님)
  const hasSpecialChar = PASSWORD_REGEX.hasSpecialChar.test(password);

  return {
    valid: errors.length === 0,
    errors,
    strength: errors.length === 0 && hasSpecialChar ? 'strong' : (errors.length === 0 ? 'medium' : 'weak'),
  };
}

/**
 * 이메일 유효성 검사 (RFC 5322 기반 강화된 검증)
 */
function validateEmail(email) {
  // 최소 TLD 길이 2자 이상, 로컬 파트와 도메인 파트 검증
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * 회원가입
 */
exports.register = async (req, res) => {
  try {
    const { email, username, password, displayName } = req.body;

    // 입력 검증
    if (!email || !username || !password) {
      return res.status(400).json({
        error: '모든 필드를 입력해주세요',
        code: 'MISSING_FIELDS'
      });
    }

    // 이메일 형식 검증
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: '올바른 이메일 형식이 아닙니다',
        code: 'INVALID_EMAIL'
      });
    }

    // 사용자명 검증 (영문, 숫자, 한글, 밑줄만 허용, 2-20자)
    const usernameRegex = /^[a-zA-Z0-9가-힣_]{2,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        error: '별칭은 2-20자의 영문, 숫자, 한글, 밑줄(_)만 사용할 수 있습니다',
        code: 'INVALID_USERNAME'
      });
    }

    // 비밀번호 정책 검증
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: '비밀번호가 보안 요구사항을 충족하지 않습니다',
        code: 'WEAK_PASSWORD',
        details: passwordValidation.errors,
        requirements: [
          `최소 ${PASSWORD_MIN_LENGTH}자 이상`,
          '대문자(A-Z) 포함',
          '소문자(a-z) 포함',
          '숫자(0-9) 포함',
          '특수문자 포함 (권장)',
        ]
      });
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
      poBalance: WELCOME_BONUS_AMOUNT,
      marketCap: parseInt(process.env.INITIAL_MARKET_CAP, 10) || 5000
    });

    // 주식 자동 생성 (가입 즉시 거래 가능하도록 초기 유통량 30% 공급)
    await Stock.create({
      userId: user.id,
      totalShares: 100000,
      issuedShares: 0,
      availableShares: 30000,
      sharePrice: 100
    });

    // 지갑 생성 (있는 경우)
    try {
      await Wallet.create({
        userId: user.id,
        poBalance: WELCOME_BONUS_AMOUNT,
        totalPOEarned: WELCOME_BONUS_AMOUNT,
      });

      // 웰컴 보너스 트랜잭션 기록
      // WalletTransaction 필수: userId, type(ENUM: CHARGE/USE/REFUND/BONUS/ADMIN_ADJUSTMENT), amount, balanceBefore/After
      await WalletTransaction.create({
        userId: user.id,
        type: 'BONUS',
        amount: WELCOME_BONUS_AMOUNT,
        balanceBefore: 0,
        balanceAfter: WELCOME_BONUS_AMOUNT,
        description: '🎉 신규 가입 웰컴 보너스',
        metadata: JSON.stringify({ type: 'welcome_bonus', isFirstTime: true })
      });
    } catch (walletError) {
      console.log('Wallet creation skipped (model may not exist):', walletError.message);
    }

    // Access Token과 Refresh Token 발급
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Refresh Token을 DB에 저장
    await saveRefreshToken(user.id, refreshToken, req);

    res.status(201).json({
      message: '회원가입 성공',
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15분 (초 단위)
      // 하위 호환성을 위해 token도 유지 (accessToken과 동일)
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        profileImage: user.profileImage,
        poBalance: user.poBalance,
        marketCap: user.marketCap,
        trustLevel: user.trustLevel,
        trustMultiplier: user.trustMultiplier,
        onboardedAt: user.onboardedAt // 신규 가입은 null → 온보딩 동선으로 분기
      },
      welcomeBonus: {
        amount: WELCOME_BONUS_AMOUNT,
        message: `축하합니다! ${WELCOME_BONUS_AMOUNT.toLocaleString()} PO가 지급되었습니다.`
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

    // 가상 계정 로그인 차단
    if (user.isVirtual && user.virtualStatus !== 'claimed') {
      return res.status(403).json({
        error: '가상 사전상장 계정으로는 로그인할 수 없습니다',
        code: 'VIRTUAL_ACCOUNT_LOGIN_BLOCKED'
      });
    }

    // 마지막 로그인 시간 업데이트
    await user.update({ lastLoginAt: new Date() });

    // Access Token과 Refresh Token 발급
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Refresh Token을 DB에 저장
    await saveRefreshToken(user.id, refreshToken, req);

    res.json({
      message: '로그인 성공',
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15분 (초 단위)
      // 하위 호환성을 위해 token도 유지 (accessToken과 동일)
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        profileImage: user.profileImage,
        poBalance: user.poBalance,
        marketCap: user.marketCap,
        trustLevel: user.trustLevel,
        trustMultiplier: user.trustMultiplier,
        onboardedAt: user.onboardedAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '로그인 중 오류가 발생했습니다' });
  }
};

/**
 * 로그아웃 (모든 디바이스)
 */
exports.logoutAll = async (req, res) => {
  try {
    await revokeAllUserTokens(req.user.id);

    res.json({
      success: true,
      message: '모든 디바이스에서 로그아웃되었습니다'
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: '로그아웃 중 오류가 발생했습니다' });
  }
};

/**
 * 로그아웃 (현재 디바이스)
 */
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    res.json({
      success: true,
      message: '로그아웃되었습니다'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: '로그아웃 중 오류가 발생했습니다' });
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
