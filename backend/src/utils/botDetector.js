const { DailyLimit, User, CoinTransaction } = require('../models');
const { sequelize } = require('../config/database');
const { sendNotificationToUser } = require('../config/socket');

// 의심 패턴 정의
const SUSPICIOUS_PATTERNS = {
  COMMENT_SPEED: { threshold: 5, withinSeconds: 10, score: 15 },
  REPEATED_CONTENT: { threshold: 3, score: 20 },
  NIGHT_ACTIVITY: { startHour: 2, endHour: 5, threshold: 20, score: 10 },
  LIKE_BURST: { threshold: 20, withinSeconds: 60, score: 25 },
  EMPTY_PROFILE: { daysAfterSignup: 7, score: 10 },
  RAPID_STOCK_TRADES: { threshold: 50, withinMinutes: 10, score: 30 }
};

// 봇 의심 점수 증가
async function increaseSuspicionScore(userId, pattern, amount) {
  try {
    const user = await User.findByPk(userId);
    if (!user) return;

    const newScore = Math.min(user.botSuspicionScore + amount, 100);
    await user.update({ botSuspicionScore: newScore });

    // 70점 이상이면 알림 (수동 검토 필요)
    if (newScore >= 70 && user.botSuspicionScore < 70) {
      console.warn(`⚠️  봇 의심 계정 감지: ${userId} (점수: ${newScore})`);

      // 운영진에게 알림 전송
      try {
        const adminUsers = await User.findAll({
          where: {
            role: 'admin'
          }
        });

        const notification = {
          type: 'BOT_DETECTION',
          title: '봇 의심 계정 감지',
          message: `사용자 ID ${userId}가 봇으로 의심됩니다 (점수: ${newScore}, 패턴: ${pattern})`,
          userId: userId,
          score: newScore,
          pattern: pattern,
          timestamp: new Date()
        };

        // 모든 관리자에게 실시간 알림 전송
        adminUsers.forEach(admin => {
          sendNotificationToUser(admin.id, notification);
        });
      } catch (notifyError) {
        console.error('관리자 알림 전송 오류:', notifyError);
      }
    }

    return newScore;
  } catch (error) {
    console.error('의심 점수 증가 오류:', error);
  }
}

// 댓글 속도 체크
async function checkCommentSpeed(userId) {
  const fiveSecondsAgo = new Date(Date.now() - 10000);

  const recentComments = await CoinTransaction.count({
    where: {
      userId,
      source: 'COMMENT_CREATE',
      createdAt: { [sequelize.Op.gte]: fiveSecondsAgo }
    }
  });

  if (recentComments >= SUSPICIOUS_PATTERNS.COMMENT_SPEED.threshold) {
    await increaseSuspicionScore(userId, 'COMMENT_SPEED', SUSPICIOUS_PATTERNS.COMMENT_SPEED.score);
    return { suspicious: true, pattern: 'COMMENT_SPEED', score: SUSPICIOUS_PATTERNS.COMMENT_SPEED.score };
  }

  return { suspicious: false };
}

// 야간 활동 체크
async function checkNightActivity(userId) {
  const now = new Date();
  const hour = now.getHours();

  if (hour >= SUSPICIOUS_PATTERNS.NIGHT_ACTIVITY.startHour && hour < SUSPICIOUS_PATTERNS.NIGHT_ACTIVITY.endHour) {
    const today = now.toISOString().split('T')[0];
    const dailyLimit = await DailyLimit.findOne({ where: { userId, date: today } });

    if (dailyLimit) {
      const totalActivity = dailyLimit.commentCount + dailyLimit.postCount + dailyLimit.likeCount;

      if (totalActivity >= SUSPICIOUS_PATTERNS.NIGHT_ACTIVITY.threshold) {
        await increaseSuspicionScore(userId, 'NIGHT_ACTIVITY', SUSPICIOUS_PATTERNS.NIGHT_ACTIVITY.score);
        return { suspicious: true, pattern: 'NIGHT_ACTIVITY', score: SUSPICIOUS_PATTERNS.NIGHT_ACTIVITY.score };
      }
    }
  }

  return { suspicious: false };
}

// 프로필 미작성 체크
async function checkEmptyProfile(userId) {
  const user = await User.findByPk(userId);
  if (!user) return { suspicious: false };

  const daysSinceSignup = Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));

  if (daysSinceSignup >= SUSPICIOUS_PATTERNS.EMPTY_PROFILE.daysAfterSignup) {
    if (!user.bio && !user.profileImage && !user.displayName) {
      await increaseSuspicionScore(userId, 'EMPTY_PROFILE', SUSPICIOUS_PATTERNS.EMPTY_PROFILE.score);
      return { suspicious: true, pattern: 'EMPTY_PROFILE', score: SUSPICIOUS_PATTERNS.EMPTY_PROFILE.score };
    }
  }

  return { suspicious: false };
}

// 좋아요 폭발 체크
async function checkLikeBurst(userId) {
  const oneMinuteAgo = new Date(Date.now() - 60000);

  const recentLikes = await CoinTransaction.count({
    where: {
      userId,
      source: 'LIKE',
      createdAt: { [sequelize.Op.gte]: oneMinuteAgo }
    }
  });

  if (recentLikes >= SUSPICIOUS_PATTERNS.LIKE_BURST.threshold) {
    await increaseSuspicionScore(userId, 'LIKE_BURST', SUSPICIOUS_PATTERNS.LIKE_BURST.score);
    return { suspicious: true, pattern: 'LIKE_BURST', score: SUSPICIOUS_PATTERNS.LIKE_BURST.score };
  }

  return { suspicious: false };
}

// 종합 봇 탐지 (활동 전 체크)
async function detectBot(userId, activityType) {
  const checks = [];

  if (activityType === 'COMMENT') {
    checks.push(await checkCommentSpeed(userId));
  }

  if (activityType === 'LIKE') {
    checks.push(await checkLikeBurst(userId));
  }

  checks.push(await checkNightActivity(userId));

  const suspiciousCheck = checks.find(c => c.suspicious);

  if (suspiciousCheck) {
    return {
      isSuspicious: true,
      pattern: suspiciousCheck.pattern,
      score: suspiciousCheck.score
    };
  }

  return { isSuspicious: false };
}

// 의심 점수 감소 (정상 활동 보상)
async function decreaseSuspicionScore(userId, amount = 5) {
  try {
    const user = await User.findByPk(userId);
    if (!user || user.botSuspicionScore === 0) return;

    const newScore = Math.max(user.botSuspicionScore - amount, 0);
    await user.update({ botSuspicionScore: newScore });

    return newScore;
  } catch (error) {
    console.error('의심 점수 감소 오류:', error);
  }
}

module.exports = {
  SUSPICIOUS_PATTERNS,
  detectBot,
  increaseSuspicionScore,
  decreaseSuspicionScore,
  checkCommentSpeed,
  checkNightActivity,
  checkEmptyProfile,
  checkLikeBurst
};
