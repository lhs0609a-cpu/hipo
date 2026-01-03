/**
 * IPO 상장 자격 체크 서비스
 *
 * 자격 요건:
 * 1. 팔로워 수: 100명 이상
 * 2. 활동 기간: 30일 이상
 * 3. 본인 인증: 완료
 * 4. 콘텐츠 점수: 50점 이상 (최근 30일 게시물 참여도)
 * 5. 프로필 완성도: 80% 이상
 */

const { User, Follow, Post, Like, Comment, IPOEligibility, Stock, sequelize } = require('../models');
const { Op } = require('sequelize');

// 기본 요건 설정
const DEFAULT_REQUIREMENTS = {
  minFollowers: 100,
  minActivityDays: 30,
  minContentScore: 50,
  minProfileCompleteness: 80,
  requireIdentityVerification: true
};

/**
 * 팔로워 수 계산
 */
async function getFollowerCount(userId) {
  const count = await Follow.count({
    where: { followingId: userId }
  });
  return count;
}

/**
 * 계정 나이 계산 (일)
 */
function getAccountAgeDays(user) {
  const now = new Date();
  const createdAt = new Date(user.createdAt);
  const diffTime = Math.abs(now - createdAt);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * 콘텐츠 점수 계산
 * - 최근 30일 게시물 수 (최대 30점)
 * - 평균 좋아요 수 (최대 35점)
 * - 평균 댓글 수 (최대 35점)
 */
async function calculateContentScore(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 최근 30일 게시물 조회
  const posts = await Post.findAll({
    where: {
      userId,
      createdAt: { [Op.gte]: thirtyDaysAgo }
    },
    attributes: ['id', 'likesCount', 'commentsCount']
  });

  if (posts.length === 0) {
    return 0;
  }

  // 게시물 수 점수 (최대 30점, 10개 이상이면 만점)
  const postCountScore = Math.min(posts.length / 10 * 30, 30);

  // 평균 좋아요 점수 (최대 35점, 평균 20개 이상이면 만점)
  const totalLikes = posts.reduce((sum, post) => sum + (post.likesCount || 0), 0);
  const avgLikes = totalLikes / posts.length;
  const likeScore = Math.min(avgLikes / 20 * 35, 35);

  // 평균 댓글 점수 (최대 35점, 평균 10개 이상이면 만점)
  const totalComments = posts.reduce((sum, post) => sum + (post.commentsCount || 0), 0);
  const avgComments = totalComments / posts.length;
  const commentScore = Math.min(avgComments / 10 * 35, 35);

  const totalScore = postCountScore + likeScore + commentScore;
  return Math.round(totalScore * 100) / 100;
}

/**
 * 프로필 완성도 계산
 * - 프로필 이미지: 20%
 * - 자기소개 (bio): 20%
 * - 표시 이름: 15%
 * - 직업: 15%
 * - 카테고리: 15%
 * - 실명: 15%
 */
function calculateProfileCompleteness(user) {
  let score = 0;

  if (user.profileImage) score += 20;
  if (user.bio && user.bio.length >= 10) score += 20;
  if (user.displayName) score += 15;
  if (user.occupation) score += 15;
  if (user.category) score += 15;
  if (user.realName) score += 15;

  return score;
}

/**
 * 자격 요건 체크 및 업데이트
 */
async function checkEligibility(userId, options = {}) {
  const requirements = { ...DEFAULT_REQUIREMENTS, ...options };

  // 사용자 조회
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('사용자를 찾을 수 없습니다');
  }

  // 이미 상장된 사용자인지 확인
  const existingStock = await Stock.findOne({ where: { userId } });
  if (existingStock) {
    return {
      isEligible: false,
      alreadyListed: true,
      message: '이미 상장된 사용자입니다'
    };
  }

  // 각 요건 체크
  const followerCount = await getFollowerCount(userId);
  const accountAgeDays = getAccountAgeDays(user);
  const contentScore = await calculateContentScore(userId);
  const profileCompleteness = calculateProfileCompleteness(user);

  // 요건 충족 여부
  const followerRequirementMet = followerCount >= requirements.minFollowers;
  const activityPeriodMet = accountAgeDays >= requirements.minActivityDays;
  const identityVerifiedMet = requirements.requireIdentityVerification ? user.identityVerified : true;
  const contentScoreMet = contentScore >= requirements.minContentScore;
  const profileCompleteMet = profileCompleteness >= requirements.minProfileCompleteness;

  // 종합 자격 충족 여부
  const isEligible = followerRequirementMet &&
                     activityPeriodMet &&
                     identityVerifiedMet &&
                     contentScoreMet &&
                     profileCompleteMet;

  // 자격 정보 저장/업데이트
  const [eligibility, created] = await IPOEligibility.findOrCreate({
    where: { userId },
    defaults: {
      userId,
      currentFollowers: followerCount,
      accountAgeDays,
      contentScore,
      profileCompleteness,
      followerRequirementMet,
      activityPeriodMet,
      identityVerifiedMet,
      contentScoreMet,
      profileCompleteMet,
      isEligible,
      eligibleAt: isEligible ? new Date() : null,
      lastCheckedAt: new Date(),
      requiredFollowers: requirements.minFollowers,
      requiredActivityDays: requirements.minActivityDays,
      requiredContentScore: requirements.minContentScore,
      requiredProfileCompleteness: requirements.minProfileCompleteness
    }
  });

  if (!created) {
    await eligibility.update({
      currentFollowers: followerCount,
      accountAgeDays,
      contentScore,
      profileCompleteness,
      followerRequirementMet,
      activityPeriodMet,
      identityVerifiedMet,
      contentScoreMet,
      profileCompleteMet,
      isEligible,
      eligibleAt: isEligible && !eligibility.eligibleAt ? new Date() : eligibility.eligibleAt,
      lastCheckedAt: new Date()
    });
  }

  // 결과 반환
  return {
    isEligible,
    alreadyListed: false,
    requirements: {
      followers: {
        required: requirements.minFollowers,
        current: followerCount,
        met: followerRequirementMet,
        remaining: Math.max(0, requirements.minFollowers - followerCount)
      },
      activityPeriod: {
        required: requirements.minActivityDays,
        current: accountAgeDays,
        met: activityPeriodMet,
        remaining: Math.max(0, requirements.minActivityDays - accountAgeDays)
      },
      identityVerification: {
        required: requirements.requireIdentityVerification,
        verified: user.identityVerified,
        met: identityVerifiedMet
      },
      contentScore: {
        required: requirements.minContentScore,
        current: contentScore,
        met: contentScoreMet,
        remaining: Math.max(0, requirements.minContentScore - contentScore)
      },
      profileCompleteness: {
        required: requirements.minProfileCompleteness,
        current: profileCompleteness,
        met: profileCompleteMet,
        remaining: Math.max(0, requirements.minProfileCompleteness - profileCompleteness)
      }
    },
    overallProgress: calculateOverallProgress({
      followerRequirementMet,
      activityPeriodMet,
      identityVerifiedMet,
      contentScoreMet,
      profileCompleteMet
    }),
    tips: generateTips({
      followerRequirementMet,
      activityPeriodMet,
      identityVerifiedMet,
      contentScoreMet,
      profileCompleteMet,
      profileCompleteness,
      user
    })
  };
}

/**
 * 전체 진행률 계산
 */
function calculateOverallProgress(requirements) {
  const total = 5;
  const met = Object.values(requirements).filter(Boolean).length;
  return Math.round((met / total) * 100);
}

/**
 * 개선 팁 생성
 */
function generateTips(data) {
  const tips = [];

  if (!data.followerRequirementMet) {
    tips.push({
      type: 'followers',
      message: '팔로워를 늘려보세요! 좋은 콘텐츠를 꾸준히 올리면 팔로워가 증가합니다.',
      priority: 'high'
    });
  }

  if (!data.activityPeriodMet) {
    tips.push({
      type: 'activity',
      message: '아직 활동 기간이 부족합니다. 조금만 더 기다려주세요.',
      priority: 'medium'
    });
  }

  if (!data.identityVerifiedMet) {
    tips.push({
      type: 'identity',
      message: '본인 인증을 완료해주세요. 설정 > 보안 > 본인인증에서 진행할 수 있습니다.',
      priority: 'high'
    });
  }

  if (!data.contentScoreMet) {
    tips.push({
      type: 'content',
      message: '더 많은 게시물을 올리고 팔로워들과 소통해보세요. 좋아요와 댓글이 많을수록 점수가 올라갑니다.',
      priority: 'high'
    });
  }

  if (!data.profileCompleteMet) {
    const missingFields = [];
    if (!data.user.profileImage) missingFields.push('프로필 이미지');
    if (!data.user.bio || data.user.bio.length < 10) missingFields.push('자기소개');
    if (!data.user.displayName) missingFields.push('표시 이름');
    if (!data.user.occupation) missingFields.push('직업');
    if (!data.user.category) missingFields.push('카테고리');
    if (!data.user.realName) missingFields.push('실명');

    tips.push({
      type: 'profile',
      message: `프로필을 완성해주세요. 누락된 항목: ${missingFields.join(', ')}`,
      priority: 'medium',
      missingFields
    });
  }

  return tips;
}

/**
 * 자격 요건만 빠르게 확인 (DB 업데이트 없이)
 */
async function quickCheck(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    return { isEligible: false, error: '사용자를 찾을 수 없습니다' };
  }

  const existingStock = await Stock.findOne({ where: { userId } });
  if (existingStock) {
    return { isEligible: false, alreadyListed: true };
  }

  const eligibility = await IPOEligibility.findOne({ where: { userId } });
  if (eligibility) {
    return {
      isEligible: eligibility.isEligible,
      lastCheckedAt: eligibility.lastCheckedAt
    };
  }

  // 자격 정보가 없으면 체크 실행
  return checkEligibility(userId);
}

module.exports = {
  checkEligibility,
  quickCheck,
  getFollowerCount,
  calculateContentScore,
  calculateProfileCompleteness,
  DEFAULT_REQUIREMENTS
};
