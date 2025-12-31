const { User, Referral, Attendance, InviteLeaderboard, Badge, UserBadge, Stock, Holding, Notification, sequelize } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');

// 추천 코드 생성
const generateReferralCode = (username) => {
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${username.slice(0, 4).toUpperCase()}${random}`;
};

// 주 시작일(월요일) 계산
const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// 주 종료일(일요일) 계산
const getWeekEnd = (date = new Date()) => {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
};

// ===== 추천 코드 시스템 =====

// 내 추천 코드 조회/생성
exports.getMyReferralCode = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user.referralCode) {
      user.referralCode = generateReferralCode(user.username);
      await user.save();
    }

    // 추천 통계
    const referralStats = await Referral.findAll({
      where: { referrerId: req.user.id },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalInvites'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END")), 'completedInvites'],
        [sequelize.fn('SUM', sequelize.col('total_commission')), 'totalEarned']
      ],
      raw: true
    });

    // 딥링크 URL 생성
    const inviteLink = `https://hipo.app/invite/${user.referralCode}`;
    const shareMessage = `HIPO에서 나에게 투자해봐! 가입하면 1,000 PO 즉시 지급! ${inviteLink}`;

    res.json({
      referralCode: user.referralCode,
      inviteLink,
      shareMessage,
      stats: {
        totalInvites: parseInt(referralStats[0]?.totalInvites || 0),
        completedInvites: parseInt(referralStats[0]?.completedInvites || 0),
        totalEarned: parseInt(referralStats[0]?.totalEarned || 0)
      }
    });
  } catch (error) {
    console.error('Get referral code error:', error);
    res.status(500).json({ message: '추천 코드 조회에 실패했습니다' });
  }
};

// 추천 코드 적용 (회원가입 시)
exports.applyReferralCode = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { code } = req.body;
    const userId = req.user.id;

    // 이미 추천 받은 적 있는지 확인
    const existingReferral = await Referral.findOne({
      where: { referredUserId: userId }
    });

    if (existingReferral) {
      await t.rollback();
      return res.status(400).json({ message: '이미 추천 코드를 적용했습니다' });
    }

    // 추천인 찾기
    const referrer = await User.findOne({
      where: { referralCode: code.toUpperCase() }
    });

    if (!referrer) {
      await t.rollback();
      return res.status(404).json({ message: '유효하지 않은 추천 코드입니다' });
    }

    if (referrer.id === userId) {
      await t.rollback();
      return res.status(400).json({ message: '자신의 추천 코드는 사용할 수 없습니다' });
    }

    // 추천 관계 생성
    await Referral.create({
      referrerId: referrer.id,
      referredUserId: userId,
      referralCode: code.toUpperCase(),
      status: 'PENDING'
    }, { transaction: t });

    // 피추천인 보상 (1,000 PO)
    const referredUser = await User.findByPk(userId);
    referredUser.poBalance += 1000;
    await referredUser.save({ transaction: t });

    // 추천인 보상 (500 PO) - 가입 보상
    referrer.poBalance += 500;
    await referrer.save({ transaction: t });

    // 주간 리더보드 업데이트
    await updateWeeklyLeaderboard(referrer.id, t);

    // 알림 발송
    await Notification.create({
      userId: referrer.id,
      type: 'REFERRAL',
      title: '친구 초대 성공!',
      message: `${referredUser.username}님이 회원가입했습니다. 500 PO 지급!`,
      data: { referredUserId: userId }
    }, { transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: '추천 코드가 적용되었습니다. 1,000 PO가 지급되었습니다!',
      reward: 1000
    });
  } catch (error) {
    await t.rollback();
    console.error('Apply referral code error:', error);
    res.status(500).json({ message: '추천 코드 적용에 실패했습니다' });
  }
};

// 주간 리더보드 업데이트
const updateWeeklyLeaderboard = async (userId, transaction) => {
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();

  let leaderboard = await InviteLeaderboard.findOne({
    where: {
      userId,
      weekStart: weekStart.toISOString().split('T')[0]
    },
    transaction
  });

  if (leaderboard) {
    leaderboard.inviteCount += 1;
    await leaderboard.save({ transaction });
  } else {
    await InviteLeaderboard.create({
      userId,
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      inviteCount: 1
    }, { transaction });
  }
};

// 추천인의 첫 거래 완료 시 호출
exports.onReferredUserFirstTrade = async (userId) => {
  const t = await sequelize.transaction();

  try {
    const referral = await Referral.findOne({
      where: {
        referredUserId: userId,
        status: 'PENDING'
      },
      include: [{ model: User, as: 'referrer' }]
    });

    if (!referral) {
      await t.rollback();
      return;
    }

    // 상태 업데이트
    referral.status = 'COMPLETED';
    referral.firstPurchaseAt = new Date();
    referral.totalCommission += 1000;
    await referral.save({ transaction: t });

    // 추천인 추가 보상 (1,000 PO)
    const referrer = await User.findByPk(referral.referrerId);
    referrer.poBalance += 1000;
    await referrer.save({ transaction: t });

    // 피추천인 추가 보상 (500 PO)
    const referredUser = await User.findByPk(userId);
    referredUser.poBalance += 500;
    await referredUser.save({ transaction: t });

    // 주간 리더보드 - 완료 카운트 업데이트
    const weekStart = getWeekStart();
    const leaderboard = await InviteLeaderboard.findOne({
      where: {
        userId: referral.referrerId,
        weekStart: weekStart.toISOString().split('T')[0]
      },
      transaction: t
    });

    if (leaderboard) {
      leaderboard.completedInvites += 1;
      leaderboard.earnedReward += 1000;
      await leaderboard.save({ transaction: t });
    }

    // 10명 초대 달성 시 VIP 뱃지
    const totalCompleted = await Referral.count({
      where: {
        referrerId: referral.referrerId,
        status: 'COMPLETED'
      }
    });

    if (totalCompleted >= 10) {
      await grantVIPBadge(referral.referrerId, t);
    }

    // 알림 발송
    await Notification.create({
      userId: referral.referrerId,
      type: 'REFERRAL',
      title: '친구 첫 거래 완료!',
      message: `${referredUser.username}님이 첫 거래를 완료했습니다. 1,000 PO 추가 지급!`,
      data: { referredUserId: userId }
    }, { transaction: t });

    await t.commit();
  } catch (error) {
    await t.rollback();
    console.error('Referral first trade reward error:', error);
  }
};

// VIP 뱃지 지급
const grantVIPBadge = async (userId, transaction) => {
  // VIP 뱃지 찾기/생성
  let vipBadge = await Badge.findOne({
    where: { name: 'VIP_INVITER' }
  });

  if (!vipBadge) {
    vipBadge = await Badge.create({
      name: 'VIP_INVITER',
      displayName: 'VIP 초대왕',
      description: '10명 이상의 친구를 초대하여 VIP 자격을 획득했습니다',
      badgeType: 'REFERRAL',
      color: '#FFD700'
    }, { transaction });
  }

  // 이미 보유 여부 확인
  const existing = await UserBadge.findOne({
    where: { userId, badgeId: vipBadge.id }
  });

  if (!existing) {
    await UserBadge.create({
      userId,
      badgeId: vipBadge.id
    }, { transaction });
  }
};

// 내 초대 목록 조회
exports.getMyReferrals = async (req, res) => {
  try {
    const referrals = await Referral.findAll({
      where: { referrerId: req.user.id },
      include: [{
        model: User,
        as: 'referredUser',
        attributes: ['id', 'username', 'profileImage', 'createdAt']
      }],
      order: [['createdAt', 'DESC']]
    });

    const formattedReferrals = referrals.map(r => ({
      id: r.id,
      user: r.referredUser,
      status: r.status,
      commission: r.totalCommission,
      joinedAt: r.createdAt,
      firstTradeAt: r.firstPurchaseAt
    }));

    res.json({ referrals: formattedReferrals });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ message: '초대 목록 조회에 실패했습니다' });
  }
};

// ===== 출석 체크 시스템 =====

// 출석 체크
exports.checkIn = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // 오늘 이미 출석했는지 확인
    const existingAttendance = await Attendance.findOne({
      where: { userId, checkInDate: today }
    });

    if (existingAttendance) {
      await t.rollback();
      return res.status(400).json({
        message: '오늘 이미 출석하셨습니다',
        attendance: existingAttendance
      });
    }

    // 어제 출석 기록 확인 (연속 출석 계산)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const yesterdayAttendance = await Attendance.findOne({
      where: { userId, checkInDate: yesterdayStr }
    });

    const streakCount = yesterdayAttendance ? yesterdayAttendance.streakCount + 1 : 1;

    // 기본 보상 (100 PO)
    let reward = 100;
    let bonusReward = 0;
    let weeklyMilestone = false;

    // 7일 연속 출석 보너스 (2배)
    if (streakCount % 7 === 0) {
      bonusReward = reward;
      weeklyMilestone = true;
    }

    const totalReward = reward + bonusReward;

    // 출석 기록 생성
    const attendance = await Attendance.create({
      userId,
      checkInDate: today,
      streakCount,
      reward,
      bonusReward,
      weeklyMilestone
    }, { transaction: t });

    // PO 지급
    const user = await User.findByPk(userId);
    user.poBalance += totalReward;
    await user.save({ transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: weeklyMilestone
        ? `🎉 7일 연속 출석! ${totalReward} PO 지급!`
        : `출석 완료! ${reward} PO 지급!`,
      attendance: {
        streakCount,
        reward,
        bonusReward,
        totalReward,
        weeklyMilestone
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Check-in error:', error);
    res.status(500).json({ message: '출석 체크에 실패했습니다' });
  }
};

// 출석 현황 조회
exports.getAttendanceStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // 오늘 출석 여부
    const todayAttendance = await Attendance.findOne({
      where: { userId, checkInDate: today }
    });

    // 이번 달 출석 기록
    const monthStart = new Date();
    monthStart.setDate(1);

    const monthlyAttendance = await Attendance.findAll({
      where: {
        userId,
        checkInDate: { [Op.gte]: monthStart.toISOString().split('T')[0] }
      },
      order: [['checkInDate', 'ASC']]
    });

    // 현재 연속 출석일
    const lastAttendance = await Attendance.findOne({
      where: { userId },
      order: [['checkInDate', 'DESC']]
    });

    // 총 출석일
    const totalDays = await Attendance.count({ where: { userId } });

    // 총 보상
    const totalRewards = await Attendance.sum('reward', { where: { userId } }) || 0;
    const totalBonusRewards = await Attendance.sum('bonusReward', { where: { userId } }) || 0;

    res.json({
      checkedInToday: !!todayAttendance,
      currentStreak: lastAttendance?.streakCount || 0,
      totalDays,
      totalRewards: totalRewards + totalBonusRewards,
      monthlyRecord: monthlyAttendance.map(a => ({
        date: a.checkInDate,
        streakCount: a.streakCount,
        reward: a.reward + a.bonusReward,
        weeklyMilestone: a.weeklyMilestone
      })),
      nextMilestone: 7 - (lastAttendance?.streakCount % 7 || 0)
    });
  } catch (error) {
    console.error('Get attendance status error:', error);
    res.status(500).json({ message: '출석 현황 조회에 실패했습니다' });
  }
};

// ===== 친구 랭킹 =====

// 친구 수익률 랭킹
exports.getFriendRanking = async (req, res) => {
  try {
    const userId = req.user.id;

    // 내가 초대한 친구들 + 나를 초대한 사람
    const myReferrals = await Referral.findAll({
      where: {
        [Op.or]: [
          { referrerId: userId },
          { referredUserId: userId }
        ]
      },
      include: [
        { model: User, as: 'referrer', attributes: ['id', 'username', 'profileImage'] },
        { model: User, as: 'referredUser', attributes: ['id', 'username', 'profileImage'] }
      ]
    });

    // 친구 ID 목록 수집
    const friendIds = new Set();
    myReferrals.forEach(r => {
      if (r.referrerId !== userId) friendIds.add(r.referrerId);
      if (r.referredUserId !== userId) friendIds.add(r.referredUserId);
    });
    friendIds.add(userId); // 나도 포함

    // 각 친구의 수익률 계산
    const rankings = [];

    for (const friendId of friendIds) {
      const user = await User.findByPk(friendId, {
        attributes: ['id', 'username', 'profileImage']
      });

      // 보유 주식 정보
      const holdings = await Holding.findAll({
        where: { holderId: friendId },
        include: [{ model: Stock, as: 'stock' }]
      });

      let totalInvested = 0;
      let currentValue = 0;

      holdings.forEach(h => {
        totalInvested += h.averagePrice * h.quantity;
        currentValue += (h.stock?.currentPrice || 0) * h.quantity;
      });

      const profitPercent = totalInvested > 0
        ? ((currentValue - totalInvested) / totalInvested) * 100
        : 0;

      rankings.push({
        user,
        totalInvested,
        currentValue,
        profit: currentValue - totalInvested,
        profitPercent: parseFloat(profitPercent.toFixed(2)),
        isMe: friendId === userId
      });
    }

    // 수익률 기준 정렬
    rankings.sort((a, b) => b.profitPercent - a.profitPercent);

    // 순위 부여
    rankings.forEach((r, i) => {
      r.rank = i + 1;
    });

    res.json({ rankings });
  } catch (error) {
    console.error('Get friend ranking error:', error);
    res.status(500).json({ message: '친구 랭킹 조회에 실패했습니다' });
  }
};

// ===== 초대 리더보드 =====

// 주간 초대 리더보드
exports.getWeeklyLeaderboard = async (req, res) => {
  try {
    const weekStart = getWeekStart();

    const leaderboard = await InviteLeaderboard.findAll({
      where: { weekStart: weekStart.toISOString().split('T')[0] },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'profileImage']
      }],
      order: [['inviteCount', 'DESC']],
      limit: 100
    });

    // 순위 부여 및 보상 정보
    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      user: entry.user,
      inviteCount: entry.inviteCount,
      completedInvites: entry.completedInvites,
      earnedReward: entry.earnedReward,
      weeklyReward: getWeeklyReward(index + 1)
    }));

    // 내 순위 찾기
    const myEntry = leaderboard.find(e => e.userId === req.user.id);
    const myRank = myEntry ? formattedLeaderboard.find(f => f.user.id === req.user.id) : null;

    res.json({
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: getWeekEnd().toISOString().split('T')[0],
      leaderboard: formattedLeaderboard,
      myRank,
      rewards: {
        first: 100000,
        second: 50000,
        third: 30000,
        top10: 10000
      }
    });
  } catch (error) {
    console.error('Get weekly leaderboard error:', error);
    res.status(500).json({ message: '리더보드 조회에 실패했습니다' });
  }
};

// 주간 보상 계산
const getWeeklyReward = (rank) => {
  if (rank === 1) return 100000;
  if (rank === 2) return 50000;
  if (rank === 3) return 30000;
  if (rank <= 10) return 10000;
  return 0;
};

// ===== 소셜 공유 =====

// 공유 카드 데이터 생성
exports.getShareCard = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      include: [{
        model: Stock,
        as: 'issuedStock'
      }]
    });

    if (!user.issuedStock) {
      return res.status(404).json({ message: '발행된 주식이 없습니다' });
    }

    const stock = user.issuedStock;

    // 주가 변동 계산
    const priceChange = stock.previousPrice
      ? ((stock.currentPrice - stock.previousPrice) / stock.previousPrice * 100).toFixed(2)
      : 0;

    const shareData = {
      username: user.username,
      profileImage: user.profileImage,
      currentPrice: stock.currentPrice,
      priceChange: parseFloat(priceChange),
      marketCap: stock.currentPrice * stock.totalShares,
      holders: stock.holderCount || 0,
      tier: stock.tier || 'BRONZE'
    };

    // 공유 메시지
    const shareMessage = `${user.username}의 주식이 현재 ${stock.currentPrice.toLocaleString()} PO! ${priceChange >= 0 ? '📈' : '📉'} ${Math.abs(priceChange)}% 변동! HIPO에서 확인하세요!`;

    res.json({
      shareData,
      shareMessage,
      shareUrl: `https://hipo.app/stock/${stock.id}`,
      referralUrl: `https://hipo.app/invite/${user.referralCode}`
    });
  } catch (error) {
    console.error('Get share card error:', error);
    res.status(500).json({ message: '공유 카드 생성에 실패했습니다' });
  }
};

// 자아 바이럴 - "누군가 당신의 주식을 샀습니다" 알림
exports.notifyStockPurchase = async (sellerId, buyerId, quantity, price) => {
  try {
    const buyer = await User.findByPk(buyerId, {
      attributes: ['id', 'username', 'profileImage']
    });

    const seller = await User.findByPk(sellerId, {
      attributes: ['id', 'username']
    });

    // 판매자(크리에이터)에게 알림
    await Notification.create({
      userId: sellerId,
      type: 'STOCK_PURCHASED',
      title: '🎉 누군가 당신에게 투자했습니다!',
      message: `${buyer.username}님이 당신의 주식 ${quantity}주를 ${price.toLocaleString()} PO에 구매했습니다!`,
      data: {
        buyerId,
        buyerUsername: buyer.username,
        quantity,
        price
      }
    });

    // 푸시 알림 발송 (실제 구현 시)
    // await sendPushNotification(sellerId, { ... });

  } catch (error) {
    console.error('Notify stock purchase error:', error);
  }
};

// ===== 얼리버드 뱃지 =====

// 초기 투자자 뱃지 지급 (주식당 처음 100명)
exports.grantEarlyBirdBadge = async (stockId, userId) => {
  try {
    // 해당 주식의 현재 투자자 수 확인
    const holderCount = await Holding.count({
      where: { stockId }
    });

    // 100명 이내일 때만 뱃지 지급
    if (holderCount > 100) return;

    const stock = await Stock.findByPk(stockId, {
      include: [{ model: User, as: 'creator' }]
    });

    if (!stock) return;

    // 얼리버드 뱃지 찾기/생성
    const badgeName = `EARLY_BIRD_${stockId}`;
    let badge = await Badge.findOne({ where: { name: badgeName } });

    if (!badge) {
      badge = await Badge.create({
        name: badgeName,
        displayName: `${stock.creator.username}의 얼리버드`,
        description: `${stock.creator.username}의 초기 100명 투자자`,
        badgeType: 'ACHIEVEMENT',
        color: '#FF6B6B'
      });
    }

    // 이미 보유 여부 확인
    const existing = await UserBadge.findOne({
      where: { userId, badgeId: badge.id }
    });

    if (!existing) {
      await UserBadge.create({ userId, badgeId: badge.id });

      // 알림 발송
      await Notification.create({
        userId,
        type: 'BADGE_EARNED',
        title: '🏆 얼리버드 뱃지 획득!',
        message: `${stock.creator.username}의 초기 100명 투자자가 되었습니다!`,
        data: { badgeId: badge.id, stockId }
      });
    }
  } catch (error) {
    console.error('Grant early bird badge error:', error);
  }
};

// 내 얼리버드 뱃지 목록
exports.getMyEarlyBirdBadges = async (req, res) => {
  try {
    const userId = req.user.id;

    const userBadges = await UserBadge.findAll({
      where: { userId },
      include: [{
        model: Badge,
        as: 'badge',
        where: {
          badgeType: 'ACHIEVEMENT',
          name: { [Op.like]: 'EARLY_BIRD_%' }
        }
      }]
    });

    res.json({
      badges: userBadges.map(ub => ({
        id: ub.badge.id,
        name: ub.badge.displayName,
        description: ub.badge.description,
        color: ub.badge.color,
        earnedAt: ub.createdAt
      }))
    });
  } catch (error) {
    console.error('Get early bird badges error:', error);
    res.status(500).json({ message: '뱃지 조회에 실패했습니다' });
  }
};

// 초대 미션 - 미션 시스템과 연동
exports.checkInviteMission = async (userId) => {
  try {
    // 첫 친구 초대 미션 확인
    const inviteCount = await Referral.count({
      where: { referrerId: userId }
    });

    if (inviteCount === 1) {
      // 미션 완료 알림
      await Notification.create({
        userId,
        type: 'MISSION_COMPLETE',
        title: '🎯 미션 완료!',
        message: '첫 친구 초대 미션을 완료했습니다!',
        data: { missionType: 'FIRST_INVITE' }
      });
    }
  } catch (error) {
    console.error('Check invite mission error:', error);
  }
};

// ===== 내부 호출용 함수들 (stockController에서 사용) =====

// Ego Viral - 크리에이터에게 알림 (내부용)
exports.notifyStockPurchaseInternal = async (buyerId, stockId, shares) => {
  try {
    const stock = await Stock.findByPk(stockId, {
      include: [{ model: User, as: 'issuer', attributes: ['id', 'username'] }]
    });

    if (!stock || !stock.issuer) return;

    const buyer = await User.findByPk(buyerId, {
      attributes: ['id', 'username', 'profileImage']
    });

    if (!buyer) return;

    const totalAmount = stock.sharePrice * shares;

    // 크리에이터에게 알림
    await Notification.create({
      userId: stock.issuer.id,
      type: 'STOCK_PURCHASED',
      title: '🎉 누군가 당신에게 투자했습니다!',
      message: `${buyer.username}님이 당신의 주식 ${shares}주를 ${totalAmount.toLocaleString()} PO에 구매했습니다!`,
      data: {
        buyerId: buyer.id,
        buyerUsername: buyer.username,
        buyerProfileImage: buyer.profileImage,
        shares,
        totalAmount,
        stockId
      }
    });

    console.log(`Ego Viral: ${buyer.username} -> ${stock.issuer.username} (${shares}주)`);
  } catch (error) {
    console.error('Notify stock purchase internal error:', error);
  }
};

// 얼리버드 뱃지 부여 (내부용)
exports.grantEarlyBirdBadgeInternal = async (userId, stockId) => {
  try {
    // 해당 주식의 현재 투자자 수 확인
    const holderCount = await Holding.count({
      where: { stockId }
    });

    // 100명 이내일 때만 뱃지 지급
    if (holderCount > 100) return;

    const stock = await Stock.findByPk(stockId, {
      include: [{ model: User, as: 'issuer', attributes: ['id', 'username'] }]
    });

    if (!stock || !stock.issuer) return;

    // 얼리버드 뱃지 찾기/생성
    const badgeName = `EARLY_BIRD_${stockId}`;
    let badge = await Badge.findOne({ where: { name: badgeName } });

    if (!badge) {
      badge = await Badge.create({
        name: badgeName,
        displayName: `${stock.issuer.username}의 얼리버드`,
        description: `${stock.issuer.username}의 초기 100명 투자자`,
        badgeType: 'ACHIEVEMENT',
        color: '#FF6B6B'
      });
    }

    // 이미 보유 여부 확인
    const existing = await UserBadge.findOne({
      where: { userId, badgeId: badge.id }
    });

    if (!existing) {
      await UserBadge.create({ userId, badgeId: badge.id });

      // 알림 발송
      await Notification.create({
        userId,
        type: 'BADGE_EARNED',
        title: '🏆 얼리버드 뱃지 획득!',
        message: `${stock.issuer.username}의 초기 ${holderCount}번째 투자자가 되었습니다!`,
        data: { badgeId: badge.id, stockId, rank: holderCount }
      });

      console.log(`Early Bird Badge: User ${userId} is #${holderCount} investor in stock ${stockId}`);
    }
  } catch (error) {
    console.error('Grant early bird badge internal error:', error);
  }
};

// 첫 거래 추천인 보상 (내부용)
exports.onReferredUserFirstTradeInternal = async (userId) => {
  const t = await sequelize.transaction();

  try {
    const referral = await Referral.findOne({
      where: {
        referredUserId: userId,
        status: 'PENDING'
      },
      include: [{ model: User, as: 'referrer' }]
    });

    if (!referral) {
      await t.rollback();
      return;
    }

    // 상태 업데이트
    referral.status = 'COMPLETED';
    referral.firstPurchaseAt = new Date();
    referral.totalCommission = (referral.totalCommission || 0) + 1000;
    await referral.save({ transaction: t });

    // 추천인 추가 보상 (1,000 PO)
    const referrer = await User.findByPk(referral.referrerId, { transaction: t });
    if (referrer) {
      referrer.poBalance = (referrer.poBalance || 0) + 1000;
      await referrer.save({ transaction: t });
    }

    // 피추천인 추가 보상 (500 PO)
    const referredUser = await User.findByPk(userId, { transaction: t });
    if (referredUser) {
      referredUser.poBalance = (referredUser.poBalance || 0) + 500;
      await referredUser.save({ transaction: t });
    }

    // 주간 리더보드 - 완료 카운트 업데이트
    const weekStart = getWeekStart();
    const leaderboard = await InviteLeaderboard.findOne({
      where: {
        userId: referral.referrerId,
        weekStart: weekStart.toISOString().split('T')[0]
      },
      transaction: t
    });

    if (leaderboard) {
      leaderboard.completedInvites = (leaderboard.completedInvites || 0) + 1;
      leaderboard.earnedReward = (leaderboard.earnedReward || 0) + 1000;
      await leaderboard.save({ transaction: t });
    }

    // 10명 초대 달성 시 VIP 뱃지
    const totalCompleted = await Referral.count({
      where: {
        referrerId: referral.referrerId,
        status: 'COMPLETED'
      },
      transaction: t
    });

    if (totalCompleted >= 10) {
      await grantVIPBadge(referral.referrerId, t);
    }

    // 알림 발송
    if (referrer && referredUser) {
      await Notification.create({
        userId: referral.referrerId,
        type: 'REFERRAL',
        title: '🎉 친구 첫 거래 완료!',
        message: `${referredUser.username}님이 첫 거래를 완료했습니다. 1,000 PO 추가 지급!`,
        data: { referredUserId: userId }
      }, { transaction: t });

      await Notification.create({
        userId: userId,
        type: 'REFERRAL',
        title: '🎁 첫 거래 보너스!',
        message: `첫 거래 완료 보상으로 500 PO가 지급되었습니다!`,
        data: { referrerId: referral.referrerId }
      }, { transaction: t });
    }

    await t.commit();
    console.log(`First trade reward: Referrer ${referral.referrerId} +1000 PO, User ${userId} +500 PO`);
  } catch (error) {
    await t.rollback();
    console.error('On referred user first trade internal error:', error);
  }
};
