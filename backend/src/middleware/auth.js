const jwt = require('jsonwebtoken');
const { User, RefreshToken } = require('../models');

// JWT 설정
const ACCESS_TOKEN_EXPIRY = '15m';  // 15분
const REFRESH_TOKEN_EXPIRY = '7d';  // 7일
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Access Token 생성
 */
function generateAccessToken(userId) {
  return jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Refresh Token 생성
 */
function generateRefreshToken(userId) {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Access Token 인증 미들웨어
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: '인증 토큰이 필요합니다',
        code: 'TOKEN_REQUIRED'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Refresh Token으로 API 접근 시도 방지
    if (decoded.type === 'refresh') {
      return res.status(401).json({
        error: 'Access Token이 필요합니다',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: '유효하지 않은 토큰입니다',
        code: 'INVALID_TOKEN'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: '유효하지 않은 토큰입니다',
        code: 'INVALID_TOKEN'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: '토큰이 만료되었습니다',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(500).json({
      error: '인증 처리 중 오류가 발생했습니다',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Refresh Token 검증 및 새 토큰 발급
 */
async function refreshTokens(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh Token이 필요합니다',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    // JWT 검증
    let decoded;
    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Refresh Token이 만료되었습니다. 다시 로그인해주세요.',
          code: 'REFRESH_TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        error: '유효하지 않은 Refresh Token입니다',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // DB에서 Refresh Token 확인
    const storedToken = await RefreshToken.findOne({
      where: { token: refreshToken, isRevoked: false }
    });

    if (!storedToken) {
      return res.status(401).json({
        error: 'Refresh Token이 유효하지 않습니다',
        code: 'REFRESH_TOKEN_NOT_FOUND'
      });
    }

    // 만료 확인
    if (new Date() > storedToken.expiresAt) {
      await storedToken.update({ isRevoked: true });
      return res.status(401).json({
        error: 'Refresh Token이 만료되었습니다',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }

    // 사용자 확인
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: '사용자를 찾을 수 없습니다',
        code: 'USER_NOT_FOUND'
      });
    }

    // 마지막 사용 시간 업데이트
    await storedToken.update({ lastUsedAt: new Date() });

    // 새 Access Token 발급
    const newAccessToken = generateAccessToken(user.id);

    res.json({
      success: true,
      accessToken: newAccessToken,
      expiresIn: 15 * 60, // 15분 (초 단위)
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({
      error: '토큰 갱신 중 오류가 발생했습니다',
      code: 'REFRESH_ERROR'
    });
  }
}

/**
 * Refresh Token 저장
 */
async function saveRefreshToken(userId, token, req) {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  return await RefreshToken.create({
    userId,
    token,
    expiresAt,
    deviceInfo: req?.headers?.['user-agent'] || null,
    ipAddress: req?.ip || req?.connection?.remoteAddress || null,
  });
}

/**
 * 특정 사용자의 모든 Refresh Token 무효화 (로그아웃)
 */
async function revokeAllUserTokens(userId) {
  return await RefreshToken.update(
    { isRevoked: true },
    { where: { userId, isRevoked: false } }
  );
}

/**
 * 특정 Refresh Token 무효화
 */
async function revokeRefreshToken(token) {
  return await RefreshToken.update(
    { isRevoked: true },
    { where: { token } }
  );
}

/**
 * 선택적 인증 미들웨어
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'refresh') {
          const user = await User.findByPk(decoded.userId);
          if (user) {
            req.user = user;
          }
        }
      } catch (error) {
        // Token invalid, but continue anyway
      }
    }

    next();
  } catch (error) {
    next();
  }
}

/**
 * 관리자 권한 확인 미들웨어
 *
 * 관리자 판별 기준 (우선순위):
 * 1. user.role === 'admin' (데이터베이스 역할)
 * 2. ADMIN_EMAILS 환경변수에 포함된 이메일 (초기 설정용, 프로덕션에서는 비권장)
 */
async function isAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: '인증이 필요합니다',
        code: 'AUTH_REQUIRED'
      });
    }

    // 1. 데이터베이스 역할 기반 확인 (권장)
    let isAdminUser = req.user.role === 'admin';

    // 2. 환경변수 기반 관리자 이메일 확인 (초기 설정용)
    // ⚠️ 보안 주의: 프로덕션에서는 DB role 사용 권장
    if (!isAdminUser && process.env.ADMIN_EMAILS) {
      const adminEmails = process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase());
      isAdminUser = adminEmails.includes(req.user.email?.toLowerCase());

      if (isAdminUser) {
        console.warn(`[SECURITY] Admin access via ADMIN_EMAILS env: ${req.user.email}. Consider setting role='admin' in DB.`);
      }
    }

    if (!isAdminUser) {
      console.warn(`[SECURITY] Admin access denied for user: ${req.user.email} (role: ${req.user.role})`);
      return res.status(403).json({
        error: '관리자 권한이 필요합니다',
        code: 'ADMIN_REQUIRED'
      });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({
      error: '권한 확인 중 오류가 발생했습니다',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * 만료된 Refresh Token 정리 (배치 작업용)
 */
async function cleanupExpiredTokens() {
  try {
    const result = await RefreshToken.destroy({
      where: {
        [require('sequelize').Op.or]: [
          { expiresAt: { [require('sequelize').Op.lt]: new Date() } },
          { isRevoked: true }
        ]
      }
    });
    console.log(`Cleaned up ${result} expired/revoked refresh tokens`);
    return result;
  } catch (error) {
    console.error('Error cleaning up tokens:', error);
  }
}

module.exports = authenticateToken;
module.exports.authenticateToken = authenticateToken;
module.exports.optionalAuth = optionalAuth;
module.exports.isAdmin = isAdmin;
module.exports.refreshTokens = refreshTokens;
module.exports.generateAccessToken = generateAccessToken;
module.exports.generateRefreshToken = generateRefreshToken;
module.exports.saveRefreshToken = saveRefreshToken;
module.exports.revokeAllUserTokens = revokeAllUserTokens;
module.exports.revokeRefreshToken = revokeRefreshToken;
module.exports.cleanupExpiredTokens = cleanupExpiredTokens;
module.exports.ACCESS_TOKEN_EXPIRY = ACCESS_TOKEN_EXPIRY;
module.exports.REFRESH_TOKEN_EXPIRY = REFRESH_TOKEN_EXPIRY;
