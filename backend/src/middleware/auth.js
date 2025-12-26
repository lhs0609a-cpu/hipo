const jwt = require('jsonwebtoken');
const { User } = require('../models');

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: '인증 토큰이 필요합니다' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 사용자 조회
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다' });
    }

    // request에 사용자 정보 추가
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: '유효하지 않은 토큰입니다' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: '토큰이 만료되었습니다' });
    }
    return res.status(500).json({ error: '인증 처리 중 오류가 발생했습니다' });
  }
}

// 선택적 인증 미들웨어 (토큰이 있으면 인증, 없어도 계속 진행)
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.userId);

        if (user) {
          req.user = user;
        }
      } catch (error) {
        // Token invalid, but continue anyway
        console.log('Invalid token in optional auth, continuing without user');
      }
    }

    next();
  } catch (error) {
    next();
  }
}

// 관리자 권한 확인 미들웨어
async function isAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '인증이 필요합니다' });
    }

    // User 모델에 role 필드가 있으면 사용, 없으면 특정 사용자 ID로 관리자 확인
    // 여기서는 간단히 첫 번째 사용자를 관리자로 가정하거나, 특정 이메일을 확인
    const isAdminUser = req.user.role === 'admin' ||
                        req.user.email === 'admin@hipo.com' ||
                        req.user.id === '1'; // 또는 특정 관리자 ID

    if (!isAdminUser) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: '권한 확인 중 오류가 발생했습니다' });
  }
}

// Export as both default and named export
module.exports = authenticateToken;
module.exports.authenticateToken = authenticateToken;
module.exports.optionalAuth = optionalAuth;
module.exports.isAdmin = isAdmin;
