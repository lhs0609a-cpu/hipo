const {
  ShareholderCommunity, CommunityMember, CommunityAdmin, CommunityNotice,
  CommunityNoticeRead, AdminReview, AdminIncentive, CommunityAttendance,
  User, Wallet, CoinTransaction
} = require('../models');
const { sequelize } = require('../config/database');

/**
 * 상장인 통합 대시보드
 */
exports.getCreatorDashboard = async (req, res) => {
  try {
    const creatorId = req.user.id;

    // 상장인의 모든 커뮤니티 조회
    const communities = await ShareholderCommunity.findAll({
      where: { creatorId },
      include: [
        {
          model: User,
          as: 'currentAdmin',
          attributes: ['id', 'username', 'profileImage']
        }
      ],
      order: [['memberCount', 'DESC']]
    });

    // 각 커뮤니티의 미확인 메시지 수 등 상세 정보
    const dashboardData = await Promise.all(
      communities.map(async (community) => {
        // 등급 결정 (최소 주식 요구량 기반)
        let tierLevel = 'EXCELLENT';
        if (community.minSharesRequired >= 10000) tierLevel = 'LARGEST';
        else if (community.minSharesRequired >= 1000) tierLevel = 'MAJOR';

        // 활성도 계산 (일일 메시지 기준)
        const activityRating = community.dailyMessages >= 100 ? 5 :
                              community.dailyMessages >= 50 ? 4 :
                              community.dailyMessages >= 20 ? 3 :
                              community.dailyMessages >= 5 ? 2 : 1;

        // 방장 정보
        const admin = await CommunityAdmin.findOne({
          where: { communityId: community.id, isActive: true },
          include: [{
            model: User,
            as: 'admin',
            attributes: ['id', 'username', 'profileImage']
          }]
        });

        const adminMember = admin ? await CommunityMember.findOne({
          where: { communityId: community.id, userId: admin.userId }
        }) : null;

        return {
          id: community.id,
          name: community.name,
          memberCount: community.memberCount,
          dailyMessages: community.dailyMessages,
          totalMessages: community.totalMessages,
          reportCount: community.reportCount,
          tierLevel,
          activityRating,
          admin: admin ? {
            id: admin.userId,
            username: admin.admin.username,
            profileImage: admin.admin.profileImage,
            shareholding: adminMember ? adminMember.currentShareholding : 0,
            daysServed: Math.floor((new Date() - new Date(admin.appointedAt)) / (1000 * 60 * 60 * 24))
          } : null
        };
      })
    );

    res.json({ communities: dashboardData });
  } catch (error) {
    console.error('상장인 대시보드 조회 오류:', error);
    res.status(500).json({ error: '대시보드 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 일괄 공지 전송
 */
exports.broadcastNotice = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const creatorId = req.user.id;
    const { title, content, tierLevelMessages } = req.body;

    if (!title || !content) {
      await transaction.rollback();
      return res.status(400).json({ error: '제목과 내용이 필요합니다.' });
    }

    // 상장인의 모든 커뮤니티 조회
    const communities = await ShareholderCommunity.findAll({
      where: { creatorId },
      transaction
    });

    const createdNotices = [];

    for (const community of communities) {
      // 등급별 차등 메시지 적용
      let finalContent = content;
      if (tierLevelMessages) {
        if (community.minSharesRequired >= 10000 && tierLevelMessages.LARGEST) {
          finalContent = tierLevelMessages.LARGEST;
        } else if (community.minSharesRequired >= 1000 && tierLevelMessages.MAJOR) {
          finalContent = tierLevelMessages.MAJOR;
        } else if (tierLevelMessages.EXCELLENT) {
          finalContent = tierLevelMessages.EXCELLENT;
        }
      }

      const notice = await CommunityNotice.create({
        communityId: community.id,
        createdBy: creatorId,
        title,
        content: finalContent,
        isPinned: true,
        priority: 100 // 일괄 공지는 최상위 우선순위
      }, { transaction });

      createdNotices.push({
        communityId: community.id,
        communityName: community.name,
        noticeId: notice.id
      });
    }

    await transaction.commit();

    res.status(201).json({
      message: `${communities.length}개 커뮤니티에 공지가 전송되었습니다.`,
      notices: createdNotices
    });
  } catch (error) {
    await transaction.rollback();
    console.error('일괄 공지 전송 오류:', error);
    res.status(500).json({ error: '공지 전송 중 오류가 발생했습니다.' });
  }
};

/**
 * 공지사항 읽음 확인
 */
exports.markNoticeAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { noticeId } = req.params;

    const notice = await CommunityNotice.findByPk(noticeId);
    if (!notice) {
      return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
    }

    // 읽음 기록
    const [read, created] = await CommunityNoticeRead.findOrCreate({
      where: { noticeId, userId },
      defaults: { readAt: new Date() }
    });

    // 조회 수 증가
    if (created) {
      await notice.update({
        viewCount: notice.viewCount + 1
      });
    }

    res.json({
      message: '공지를 확인했습니다.',
      alreadyRead: !created
    });
  } catch (error) {
    console.error('공지 읽음 처리 오류:', error);
    res.status(500).json({ error: '공지 읽음 처리 중 오류가 발생했습니다.' });
  }
};

/**
 * 공지사항 읽지 않은 사용자 목록
 */
exports.getUnreadMembers = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const { noticeId } = req.params;

    const notice = await CommunityNotice.findByPk(noticeId, {
      include: [{
        model: ShareholderCommunity,
        as: 'community'
      }]
    });

    if (!notice) {
      return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
    }

    // 상장인 권한 확인
    if (notice.community.creatorId !== creatorId) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    // 모든 멤버 조회
    const allMembers = await CommunityMember.findAll({
      where: { communityId: notice.communityId, isBanned: false },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'profileImage']
      }]
    });

    // 읽은 사용자 목록
    const readRecords = await CommunityNoticeRead.findAll({
      where: { noticeId }
    });

    const readUserIds = new Set(readRecords.map(r => r.userId));

    // 읽지 않은 사용자 필터링
    const unreadMembers = allMembers.filter(m => !readUserIds.has(m.userId));

    res.json({
      totalMembers: allMembers.length,
      readCount: readRecords.length,
      unreadCount: unreadMembers.length,
      unreadMembers: unreadMembers.map(m => ({
        id: m.userId,
        username: m.user.username,
        profileImage: m.user.profileImage,
        shareholding: m.currentShareholding
      }))
    });
  } catch (error) {
    console.error('미확인 멤버 조회 오류:', error);
    res.status(500).json({ error: '미확인 멤버 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 방장 평가 (상장인 전용)
 */
exports.reviewAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const creatorId = req.user.id;
    const { communityId } = req.params;
    const { communicationScore, managementScore, contributionScore, comment } = req.body;

    // 점수 검증 (1-5)
    if (![communicationScore, managementScore, contributionScore].every(score => score >= 1 && score <= 5)) {
      await transaction.rollback();
      return res.status(400).json({ error: '점수는 1-5 사이여야 합니다.' });
    }

    const community = await ShareholderCommunity.findByPk(communityId, { transaction });
    if (!community) {
      await transaction.rollback();
      return res.status(404).json({ error: '커뮤니티를 찾을 수 없습니다.' });
    }

    // 상장인 권한 확인
    if (community.creatorId !== creatorId) {
      await transaction.rollback();
      return res.status(403).json({ error: '커뮤니티 소유자만 방장을 평가할 수 있습니다.' });
    }

    // 현재 방장 확인
    if (!community.currentAdminId) {
      await transaction.rollback();
      return res.status(400).json({ error: '현재 방장이 없습니다.' });
    }

    const currentMonth = new Date().toISOString().substring(0, 7);
    const totalScore = communicationScore + managementScore + contributionScore;
    const isPerfect = totalScore === 15;

    // 평가 생성
    const review = await AdminReview.create({
      communityId,
      adminId: community.currentAdminId,
      reviewedBy: creatorId,
      month: currentMonth,
      communicationScore,
      managementScore,
      contributionScore,
      totalScore,
      comment,
      isPerfect,
      bonusAwarded: isPerfect ? 500 : 0
    }, { transaction });

    // 만점 시 보너스 지급
    if (isPerfect) {
      const [wallet] = await Wallet.findOrCreate({
        where: { userId: community.currentAdminId },
        defaults: { balance: 0, totalDeposited: 0, totalWithdrawn: 0, totalEarned: 0 },
        transaction
      });

      const bonusAmount = 500;
      await wallet.update({
        balance: parseFloat(wallet.balance) + bonusAmount,
        totalEarned: parseFloat(wallet.totalEarned) + bonusAmount
      }, { transaction });

      await CoinTransaction.create({
        userId: community.currentAdminId,
        transactionType: 'REFERRAL_BONUS',
        amount: bonusAmount,
        balanceAfter: parseFloat(wallet.balance) + bonusAmount,
        relatedId: review.id,
        description: `방장 평가 만점 보너스: ${community.name}`
      }, { transaction });
    }

    await transaction.commit();

    res.status(201).json({
      message: isPerfect ? '평가가 완료되었습니다. 방장에게 500 HIPO 코인 보너스가 지급되었습니다.' : '평가가 완료되었습니다.',
      review,
      bonusAwarded: isPerfect ? 500 : 0
    });
  } catch (error) {
    await transaction.rollback();
    console.error('방장 평가 오류:', error);
    res.status(500).json({ error: '방장 평가 중 오류가 발생했습니다.' });
  }
};

/**
 * 출석 체크
 */
exports.checkAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { communityId } = req.params;

    const today = new Date().toISOString().split('T')[0];

    // 이미 출석했는지 확인
    const existingAttendance = await CommunityAttendance.findOne({
      where: { communityId, userId, date: today },
      transaction
    });

    if (existingAttendance) {
      await transaction.rollback();
      return res.status(400).json({ error: '오늘 이미 출석했습니다.' });
    }

    // 어제 출석 확인
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];

    const yesterdayAttendance = await CommunityAttendance.findOne({
      where: { communityId, userId, date: yesterdayDate },
      transaction
    });

    const streakCount = yesterdayAttendance ? yesterdayAttendance.streakCount + 1 : 1;
    const is7DayStreak = streakCount === 7;
    const baseReward = 10;
    const streakBonus = is7DayStreak ? 100 : 0;
    const totalReward = baseReward + streakBonus;

    // 출석 기록
    const attendance = await CommunityAttendance.create({
      communityId,
      userId,
      date: today,
      reward: totalReward,
      isStreakBonus: is7DayStreak,
      streakCount
    }, { transaction });

    // 보상 지급
    const [wallet] = await Wallet.findOrCreate({
      where: { userId },
      defaults: { balance: 0, totalDeposited: 0, totalWithdrawn: 0, totalEarned: 0 },
      transaction
    });

    await wallet.update({
      balance: parseFloat(wallet.balance) + totalReward,
      totalEarned: parseFloat(wallet.totalEarned) + totalReward
    }, { transaction });

    await CoinTransaction.create({
      userId,
      transactionType: 'REFERRAL_BONUS',
      amount: totalReward,
      balanceAfter: parseFloat(wallet.balance) + totalReward,
      relatedId: attendance.id,
      description: is7DayStreak
        ? `출석 체크 (7일 연속 보너스 포함)`
        : `출석 체크 (${streakCount}일 연속)`
    }, { transaction });

    await transaction.commit();

    res.json({
      message: is7DayStreak
        ? `출석 완료! 7일 연속 출석 보너스로 ${totalReward} HIPO 코인을 받았습니다!`
        : `출석 완료! ${totalReward} HIPO 코인을 받았습니다. (${streakCount}일 연속)`,
      reward: totalReward,
      streakCount,
      isStreakBonus: is7DayStreak
    });
  } catch (error) {
    await transaction.rollback();
    console.error('출석 체크 오류:', error);
    res.status(500).json({ error: '출석 체크 중 오류가 발생했습니다.' });
  }
};

/**
 * 커뮤니티 출석률 조회
 */
exports.getAttendanceStats = async (req, res) => {
  try {
    const { communityId } = req.params;

    const today = new Date().toISOString().split('T')[0];

    const community = await ShareholderCommunity.findByPk(communityId);
    if (!community) {
      return res.status(404).json({ error: '커뮤니티를 찾을 수 없습니다.' });
    }

    // 오늘 출석 수
    const todayAttendance = await CommunityAttendance.count({
      where: { communityId, date: today }
    });

    // 출석률 계산
    const attendanceRate = community.memberCount > 0
      ? Math.round((todayAttendance / community.memberCount) * 100)
      : 0;

    res.json({
      todayAttendance,
      totalMembers: community.memberCount,
      attendanceRate
    });
  } catch (error) {
    console.error('출석률 조회 오류:', error);
    res.status(500).json({ error: '출석률 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 내 출석 이력 조회
 */
exports.getMyAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { communityId } = req.params;
    const { limit = 30 } = req.query;

    const attendances = await CommunityAttendance.findAll({
      where: { communityId, userId },
      order: [['date', 'DESC']],
      limit: parseInt(limit)
    });

    // 현재 연속 출석 일수
    let currentStreak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      const attendance = attendances.find(a => a.date === dateStr);
      if (attendance) {
        currentStreak++;
      } else {
        break;
      }
    }

    res.json({
      attendances,
      currentStreak,
      totalAttendance: attendances.length
    });
  } catch (error) {
    console.error('출석 이력 조회 오류:', error);
    res.status(500).json({ error: '출석 이력 조회 중 오류가 발생했습니다.' });
  }
};
