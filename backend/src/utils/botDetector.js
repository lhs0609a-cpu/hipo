const { DailyLimit, User, CoinTransaction, Post, Comment, Transaction } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
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
      createdAt: { [Op.gte]: fiveSecondsAgo }
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
      createdAt: { [Op.gte]: oneMinuteAgo }
    }
  });

  if (recentLikes >= SUSPICIOUS_PATTERNS.LIKE_BURST.threshold) {
    await increaseSuspicionScore(userId, 'LIKE_BURST', SUSPICIOUS_PATTERNS.LIKE_BURST.score);
    return { suspicious: true, pattern: 'LIKE_BURST', score: SUSPICIOUS_PATTERNS.LIKE_BURST.score };
  }

  return { suspicious: false };
}

// 반복 콘텐츠 체크
// 같은 내용을 여러 번 게시/댓글하는 도배 패턴.
// 최근 24시간 내 동일 content가 threshold회 이상이면 의심.
async function checkRepeatedContent(userId, { content, kind = 'POST' } = {}) {
  if (!content || !content.trim()) return { suspicious: false };

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const Model = kind === 'COMMENT' ? Comment : Post;

  const duplicates = await Model.count({
    where: {
      userId,
      content: content.trim(),
      createdAt: { [Op.gte]: oneDayAgo }
    }
  });

  // 이번 작성분은 아직 저장 전이므로, 기존 동일 콘텐츠가 threshold-1개면 이번이 threshold번째
  if (duplicates >= SUSPICIOUS_PATTERNS.REPEATED_CONTENT.threshold - 1) {
    await increaseSuspicionScore(userId, 'REPEATED_CONTENT', SUSPICIOUS_PATTERNS.REPEATED_CONTENT.score);
    return { suspicious: true, pattern: 'REPEATED_CONTENT', score: SUSPICIOUS_PATTERNS.REPEATED_CONTENT.score };
  }

  return { suspicious: false };
}

// 단시간 대량 거래 체크
// 사람이 손으로 낼 수 없는 속도의 매수/매도는 자동매매 봇으로 본다.
async function checkRapidStockTrades(userId) {
  const { threshold, withinMinutes } = SUSPICIOUS_PATTERNS.RAPID_STOCK_TRADES;
  const since = new Date(Date.now() - withinMinutes * 60 * 1000);

  const recentTrades = await Transaction.count({
    where: {
      [Op.or]: [{ buyerId: userId }, { sellerId: userId }],
      createdAt: { [Op.gte]: since }
    }
  });

  if (recentTrades >= threshold) {
    await increaseSuspicionScore(userId, 'RAPID_STOCK_TRADES', SUSPICIOUS_PATTERNS.RAPID_STOCK_TRADES.score);
    return { suspicious: true, pattern: 'RAPID_STOCK_TRADES', score: SUSPICIOUS_PATTERNS.RAPID_STOCK_TRADES.score };
  }

  return { suspicious: false };
}

// 종합 봇 탐지 (활동 전 체크)
//
// @param {string} userId
// @param {string} activityType - 'COMMENT' | 'LIKE' | 'POST' | 'STOCK_TRADE'
// @param {Object} context - 패턴별 추가 정보 (예: { content } for REPEATED_CONTENT)
async function detectBot(userId, activityType, context = {}) {
  const checks = [];

  if (activityType === 'COMMENT') {
    checks.push(await checkCommentSpeed(userId));
    checks.push(await checkRepeatedContent(userId, { content: context.content, kind: 'COMMENT' }));
  }

  if (activityType === 'LIKE') {
    checks.push(await checkLikeBurst(userId));
  }

  if (activityType === 'POST') {
    checks.push(await checkRepeatedContent(userId, { content: context.content, kind: 'POST' }));
  }

  if (activityType === 'STOCK_TRADE') {
    checks.push(await checkRapidStockTrades(userId));
  }

  checks.push(await checkNightActivity(userId));

  // checkEmptyProfile은 여기서 부르지 않는다.
  // 호출할 때마다 +10점이 누적되므로 활동마다 돌리면 프로필 미작성 사용자가
  // 활동 7번 만에 70점(봇 의심)에 도달한다. 하루 1회 스캔으로 처리한다.
  // → src/jobs/adminScheduler.js 의 scanEmptyProfiles()

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
  checkLikeBurst,
  checkRepeatedContent,
  checkRapidStockTrades
};
