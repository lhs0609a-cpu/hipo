const { User } = require('../models');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

/**
 * 거래 비밀번호 설정
 */
exports.setTradingPin = async (req, res) => {
  try {
    const { pin, confirmPin } = req.body;
    const userId = req.user.id;

    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return res.status(400).json({ error: '거래 비밀번호는 6자리 숫자여야 합니다' });
    }

    if (pin !== confirmPin) {
      return res.status(400).json({ error: '비밀번호가 일치하지 않습니다' });
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    await User.update({ tradingPin: hashedPin }, { where: { id: userId } });

    res.json({ message: '거래 비밀번호가 설정되었습니다' });
  } catch (error) {
    console.error('거래 비밀번호 설정 오류:', error);
    res.status(500).json({ error: '거래 비밀번호 설정 중 오류가 발생했습니다' });
  }
};

/**
 * 거래 비밀번호 확인
 */
exports.verifyTradingPin = async (req, res) => {
  try {
    const { pin } = req.body;
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user.tradingPin) {
      return res.status(400).json({ error: '거래 비밀번호가 설정되지 않았습니다' });
    }

    const isValid = await bcrypt.compare(pin, user.tradingPin);
    if (!isValid) {
      return res.status(400).json({ error: '거래 비밀번호가 일치하지 않습니다', valid: false });
    }

    res.json({ valid: true, message: '인증 성공' });
  } catch (error) {
    console.error('거래 비밀번호 확인 오류:', error);
    res.status(500).json({ error: '확인 중 오류가 발생했습니다' });
  }
};

/**
 * 2단계 인증 설정 시작
 */
exports.setup2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);

    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: '이미 2단계 인증이 활성화되어 있습니다' });
    }

    const secret = speakeasy.generateSecret({
      name: `HIPO:${user.email}`,
      issuer: 'HIPO'
    });

    // 시크릿 임시 저장
    await user.update({ twoFactorSecret: secret.base32 });

    // QR 코드 생성
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      message: '인증 앱으로 QR 코드를 스캔하고 코드를 입력해주세요'
    });
  } catch (error) {
    console.error('2FA 설정 오류:', error);
    res.status(500).json({ error: '2FA 설정 중 오류가 발생했습니다' });
  }
};

/**
 * 2단계 인증 활성화 확인
 */
exports.verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA 설정이 시작되지 않았습니다' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ error: '인증 코드가 올바르지 않습니다' });
    }

    await user.update({ twoFactorEnabled: true });

    res.json({ message: '2단계 인증이 활성화되었습니다' });
  } catch (error) {
    console.error('2FA 인증 오류:', error);
    res.status(500).json({ error: '인증 중 오류가 발생했습니다' });
  }
};

/**
 * 2단계 인증 비활성화
 */
exports.disable2FA = async (req, res) => {
  try {
    const { token, password } = req.body;
    const userId = req.user.id;

    const user = await User.findByPk(userId);

    // 비밀번호 확인
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: '비밀번호가 올바르지 않습니다' });
    }

    // 2FA 코드 확인
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ error: '인증 코드가 올바르지 않습니다' });
    }

    await user.update({
      twoFactorEnabled: false,
      twoFactorSecret: null
    });

    res.json({ message: '2단계 인증이 비활성화되었습니다' });
  } catch (error) {
    console.error('2FA 비활성화 오류:', error);
    res.status(500).json({ error: '비활성화 중 오류가 발생했습니다' });
  }
};

/**
 * 보안 설정 조회
 */
exports.getSecuritySettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      attributes: [
        'twoFactorEnabled',
        'biometricEnabled',
        'tradingPin',
        'identityVerified',
        'identityVerifiedAt',
        'dailyTradeLimit'
      ]
    });

    res.json({
      twoFactorEnabled: user.twoFactorEnabled,
      biometricEnabled: user.biometricEnabled,
      hasTradingPin: !!user.tradingPin,
      identityVerified: user.identityVerified,
      identityVerifiedAt: user.identityVerifiedAt,
      dailyTradeLimit: user.dailyTradeLimit
    });
  } catch (error) {
    console.error('보안 설정 조회 오류:', error);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다' });
  }
};

/**
 * 본인 인증 요청
 */
exports.requestIdentityVerification = async (req, res) => {
  try {
    const { realName, birthDate, phoneNumber, idCardImage } = req.body;
    const userId = req.user.id;

    if (!realName || !birthDate || !phoneNumber) {
      return res.status(400).json({ error: '필수 정보를 모두 입력해주세요' });
    }

    // 실제 서비스에서는 본인인증 API 연동 (PASS, 아이핀 등)
    // 여기서는 간단히 처리
    await User.update({
      realName,
      identityVerified: true,
      identityVerifiedAt: new Date()
    }, { where: { id: userId } });

    res.json({ message: '본인 인증이 완료되었습니다' });
  } catch (error) {
    console.error('본인 인증 오류:', error);
    res.status(500).json({ error: '본인 인증 중 오류가 발생했습니다' });
  }
};

/**
 * 일일 거래 한도 설정
 */
exports.setDailyTradeLimit = async (req, res) => {
  try {
    const { limit, pin } = req.body;
    const userId = req.user.id;

    const user = await User.findByPk(userId);

    // 거래 PIN 확인
    if (user.tradingPin) {
      const validPin = await bcrypt.compare(pin, user.tradingPin);
      if (!validPin) {
        return res.status(400).json({ error: '거래 비밀번호가 올바르지 않습니다' });
      }
    }

    await user.update({ dailyTradeLimit: limit });

    res.json({ message: '일일 거래 한도가 설정되었습니다', limit });
  } catch (error) {
    console.error('거래 한도 설정 오류:', error);
    res.status(500).json({ error: '설정 중 오류가 발생했습니다' });
  }
};

/**
 * 접속 기록 조회
 */
exports.getLoginHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    // 실제로는 LoginHistory 모델을 만들어서 기록
    // 여기서는 간단히 마지막 로그인만 반환
    const user = await User.findByPk(userId, {
      attributes: ['lastLoginAt']
    });

    res.json({
      lastLoginAt: user.lastLoginAt,
      history: [] // 실제로는 히스토리 모델에서 조회
    });
  } catch (error) {
    console.error('접속 기록 조회 오류:', error);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다' });
  }
};
