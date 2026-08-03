const { User, LoginStreak, WalletTransaction } = require('../models');
const { Op } = require('sequelize');
const { updateBalance } = require('../utils/balanceService');

/**
 * 연속 로그인 상태 조회
 */
exports.getStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    let streak = await LoginStreak.findOne({ where: { userId } });

    // 최초 접근 시 레코드 생성
    if (!streak) {
      streak = await LoginStreak.create({
        userId,
        currentStreak: 0,
        longestStreak: 0,
      });
    }

    // 오늘 날짜 (KST 기준)
    const today = new Date();
    today.setHours(today.getHours() + 9); // UTC -> KST
    const todayStr = today.toISOString().split('T')[0];

    // 어제 날짜
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // 스트릭 상태 업데이트
    let needsUpdate = false;

    if (streak.lastLoginDate) {
      const lastLoginStr = streak.lastLoginDate;

      if (lastLoginStr === todayStr) {
        // 오늘 이미 로그인함 - 상태 유지
      } else if (lastLoginStr === yesterdayStr) {
        // 어제 로그인함 - 스트릭 계속, 오늘 첫 로그인
        streak.currentStreak += 1;
        streak.lastLoginDate = todayStr;
        needsUpdate = true;
      } else {
        // 어제 로그인 안함 - 스트릭 리셋
        streak.currentStreak = 1;
        streak.lastLoginDate = todayStr;
        needsUpdate = true;
      }
    } else {
      // 첫 로그인
      streak.currentStreak = 1;
      streak.lastLoginDate = todayStr;
      needsUpdate = true;
    }

    // 최장 스트릭 업데이트
    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await streak.save();
    }

    // 오늘 보상 수령 가능 여부
    const canClaimToday = streak.lastClaimDate !== todayStr;

    // 현재 스트릭 기준 보상 계산
    const todayReward = LoginStreak.getRewardForDay(streak.currentStreak);
    const weeklyRewards = LoginStreak.getWeeklyRewards();

    // 7일 주기 내 현재 위치
    const dayInCycle = ((streak.currentStreak - 1) % 7) + 1;

    res.json({
      success: true,
      streak: {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        dayInCycle,
        totalDaysClaimed: streak.totalDaysClaimed,
        totalRewardsClaimed: streak.totalRewardsClaimed,
      },
      reward: {
        canClaim: canClaimToday,
        todayReward,
        weeklyRewards,
      },
    });
  } catch (error) {
    console.error('Login streak status error:', error);
    res.status(500).json({ error: '로그인 스트릭 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 일일 보상 수령
 */
exports.claimReward = async (req, res) => {
  try {
    const userId = req.user.id;

    const streak = await LoginStreak.findOne({ where: { userId } });

    if (!streak) {
      return res.status(404).json({ error: '로그인 기록이 없습니다' });
    }

    // 오늘 날짜 (KST 기준)
    const today = new Date();
    today.setHours(today.getHours() + 9);
    const todayStr = today.toISOString().split('T')[0];

    // 이미 오늘 수령했는지 확인
    if (streak.lastClaimDate === todayStr) {
      return res.status(400).json({
        error: '오늘의 보상을 이미 수령했습니다',
        nextClaimAt: getNextDayMidnight(),
      });
    }

    // 오늘 로그인 기록 확인
    if (streak.lastLoginDate !== todayStr) {
      return res.status(400).json({ error: '먼저 로그인 확인이 필요합니다' });
    }

    // 보상 계산
    const reward = LoginStreak.getRewardForDay(streak.currentStreak);

    // 유저 PO 업데이트 (User + Wallet 동시)
    const { newBalance } = await updateBalance(userId, reward.po);

    // 스트릭 업데이트
    await streak.update({
      lastClaimDate: todayStr,
      totalRewardsClaimed: streak.totalRewardsClaimed + reward.po,
      totalDaysClaimed: streak.totalDaysClaimed + 1,
    });

    // 거래 기록 (Wallet이 있는 경우)
    try {
      await WalletTransaction.create({
        userId,
        transactionType: 'LOGIN_REWARD',
        amount: reward.po,
        balanceAfter: newBalance,
        description: `🔥 ${streak.currentStreak}일 연속 로그인 보상`,
        metadata: JSON.stringify({
          type: 'login_streak_reward',
          streak: streak.currentStreak,
          dayInCycle: ((streak.currentStreak - 1) % 7) + 1,
        }),
      });
    } catch (walletError) {
      console.log('Wallet transaction skipped:', walletError.message);
    }

    res.json({
      success: true,
      reward: {
        po: reward.po,
        description: reward.description,
        streak: streak.currentStreak,
      },
      newBalance,
      message: `${reward.po} PO를 받았습니다!`,
    });
  } catch (error) {
    console.error('Claim reward error:', error);
    res.status(500).json({ error: '보상 수령 중 오류가 발생했습니다' });
  }
};

/**
 * 연속 로그인 랭킹 조회
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const leaderboard = await LoginStreak.findAll({
      where: { currentStreak: { [Op.gt]: 0 } },
      order: [['currentStreak', 'DESC'], ['longestStreak', 'DESC']],
      limit: parseInt(limit),
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'displayName', 'profileImage'],
      }],
    });

    res.json({
      success: true,
      leaderboard: leaderboard.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        username: entry.user?.username,
        displayName: entry.user?.displayName,
        profileImage: entry.user?.profileImage,
        currentStreak: entry.currentStreak,
        longestStreak: entry.longestStreak,
      })),
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: '랭킹 조회 중 오류가 발생했습니다' });
  }
};

// 다음 날 자정 시간 계산 (KST)
function getNextDayMidnight() {
  const tomorrow = new Date();
  tomorrow.setHours(tomorrow.getHours() + 9); // KST
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setHours(tomorrow.getHours() - 9); // UTC로 변환
  return tomorrow.toISOString();
}
