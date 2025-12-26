const {
  ShareholderCommunity, CommunityMember, CommunityAdmin, CommunityWarning,
  CommunityBan, CommunityPoll, CommunityPollOption, CommunityPollVote,
  CommunityNotice, User, Wallet, CoinTransaction
} = require('../models');
const { sequelize } = require('../config/database');
const { getShareholding } = require('../utils/shareholderHelper');

/**
 * 방장 자동 선출 알고리즘
 */
async function selectRoomAdmin(communityId) {
  const transaction = await sequelize.transaction();

  try {
    const community = await ShareholderCommunity.findByPk(communityId, { transaction });
    if (!community) {
      await transaction.rollback();
      return null;
    }

    // 모든 멤버 조회
    const members = await CommunityMember.findAll({
      where: { communityId, isBanned: false },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'profileImage']
      }],
      transaction
    });

    if (members.length === 0) {
      await transaction.rollback();
      return null;
    }

    // 1순위: 최다 보유 주식
    members.sort((a, b) => {
      if (b.currentShareholding !== a.currentShareholding) {
        return b.currentShareholding - a.currentShareholding;
      }

      // 2순위: 보유 기간 (가입일이 빠를수록 우선)
      const aDuration = new Date() - new Date(a.joinedAt);
      const bDuration = new Date() - new Date(b.joinedAt);
      if (bDuration !== aDuration) {
        return bDuration - aDuration;
      }

      // 3순위: 활동 점수
      return b.activityScore - a.activityScore;
    });

    const topHolder = members[0];
    const newAdminId = topHolder.userId;

    // 기존 방장 해임
    if (community.currentAdminId && community.currentAdminId !== newAdminId) {
      const oldAdmin = await CommunityAdmin.findOne({
        where: { communityId, userId: community.currentAdminId, isActive: true },
        transaction
      });

      if (oldAdmin) {
        const daysServed = Math.floor((new Date() - new Date(oldAdmin.appointedAt)) / (1000 * 60 * 60 * 24));
        await oldAdmin.update({
          isActive: false,
          removedAt: new Date(),
          removalReason: 'AUTO_REPLACED',
          daysServed
        }, { transaction });
      }
    }

    // 신규 방장 임명 (또는 유지)
    if (!community.currentAdminId || community.currentAdminId !== newAdminId) {
      await CommunityAdmin.create({
        communityId,
        userId: newAdminId,
        shareholdingAtAppointment: topHolder.currentShareholding,
        isActive: true
      }, { transaction });

      await community.update({
        currentAdminId: newAdminId
      }, { transaction });
    }

    await transaction.commit();
    return { newAdminId, changed: community.currentAdminId !== newAdminId };
  } catch (error) {
    await transaction.rollback();
    console.error('방장 선출 오류:', error);
    return null;
  }
}

/**
 * 방장 대시보드 조회
 */
exports.getAdminDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { communityId } = req.params;

    const community = await ShareholderCommunity.findByPk(communityId);
    if (!community) {
      return res.status(404).json({ error: '커뮤니티를 찾을 수 없습니다.' });
    }

    // 방장 권한 확인
    if (community.currentAdminId !== userId) {
      return res.status(403).json({ error: '방장만 접근할 수 있습니다.' });
    }

    // 실시간 통계
    const stats = {
      currentMembers: community.memberCount,
      maxMembers: 50,
      dailyMessages: community.dailyMessages,
      totalMessages: community.totalMessages,
      reportCount: community.reportCount
    };

    // 멤버 순위
    const topMembers = await CommunityMember.findAll({
      where: { communityId, isBanned: false },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'profileImage']
      }],
      order: [['currentShareholding', 'DESC']],
      limit: 10
    });

    // 방장 혜택
    const adminRecord = await CommunityAdmin.findOne({
      where: { communityId, userId, isActive: true }
    });

    const daysServed = adminRecord
      ? Math.floor((new Date() - new Date(adminRecord.appointedAt)) / (1000 * 60 * 60 * 24))
      : 0;

    const rewards = {
      monthlyReward: 500,
      totalReward: adminRecord ? parseFloat(adminRecord.totalRewards) : 0,
      daysServed
    };

    res.json({ stats, topMembers, rewards });
  } catch (error) {
    console.error('방장 대시보드 조회 오류:', error);
    res.status(500).json({ error: '대시보드 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 멤버에게 경고 발행
 */
exports.warnMember = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const issuerId = req.user.id;
    const { communityId, targetUserId } = req.params;
    const { reason, reasonDetail, relatedMessageId } = req.body;

    if (!['PROFANITY', 'SPAM', 'FRAUD', 'DEFAMATION', 'OTHER'].includes(reason)) {
      await transaction.rollback();
      return res.status(400).json({ error: '유효하지 않은 경고 사유입니다.' });
    }

    const community = await ShareholderCommunity.findByPk(communityId, { transaction });
    if (!community) {
      await transaction.rollback();
      return res.status(404).json({ error: '커뮤니티를 찾을 수 없습니다.' });
    }

    // 방장 권한 확인
    if (community.currentAdminId !== issuerId) {
      await transaction.rollback();
      return res.status(403).json({ error: '방장만 경고를 발행할 수 있습니다.' });
    }

    // 경고 생성
    const warning = await CommunityWarning.create({
      communityId,
      userId: targetUserId,
      issuedBy: issuerId,
      reason,
      reasonDetail,
      relatedMessageId
    }, { transaction });

    // 멤버 경고 횟수 증가
    const member = await CommunityMember.findOne({
      where: { communityId, userId: targetUserId },
      transaction
    });

    if (member) {
      await member.update({
        warningCount: member.warningCount + 1
      }, { transaction });
    }

    await transaction.commit();

    res.status(201).json({
      message: '경고가 발행되었습니다.',
      warning,
      totalWarnings: member ? member.warningCount + 1 : 1
    });
  } catch (error) {
    await transaction.rollback();
    console.error('경고 발행 오류:', error);
    res.status(500).json({ error: '경고 발행 중 오류가 발생했습니다.' });
  }
};

/**
 * 멤버 강퇴
 */
exports.banMember = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const bannerId = req.user.id;
    const { communityId, targetUserId } = req.params;
    const { reason, reasonDetail } = req.body;

    if (!reason || !reasonDetail || reasonDetail.trim().length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: '강퇴 사유를 상세히 입력해주세요.' });
    }

    const community = await ShareholderCommunity.findByPk(communityId, { transaction });
    if (!community) {
      await transaction.rollback();
      return res.status(404).json({ error: '커뮤니티를 찾을 수 없습니다.' });
    }

    // 방장 권한 확인
    if (community.currentAdminId !== bannerId) {
      await transaction.rollback();
      return res.status(403).json({ error: '방장만 강퇴할 수 있습니다.' });
    }

    // 이번 달 강퇴 횟수 확인 (악용 방지)
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthlyBanCount = await CommunityBan.count({
      where: {
        communityId,
        bannedBy: bannerId,
        bannedAt: { [sequelize.Op.gte]: thisMonth }
      },
      transaction
    });

    if (monthlyBanCount >= 3) {
      await transaction.rollback();
      return res.status(403).json({
        error: '이번 달 강퇴 한도를 초과했습니다. 운영진 검토가 필요합니다.',
        monthlyBanCount
      });
    }

    // 48시간 후 해제
    const bannedUntil = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // 강퇴 기록 생성
    const ban = await CommunityBan.create({
      communityId,
      userId: targetUserId,
      bannedBy: bannerId,
      reason,
      reasonDetail,
      bannedUntil
    }, { transaction });

    // 멤버 상태 업데이트
    const member = await CommunityMember.findOne({
      where: { communityId, userId: targetUserId },
      transaction
    });

    if (member) {
      await member.update({
        isBanned: true,
        bannedUntil
      }, { transaction });
    }

    // 멤버 수 감소
    await community.update({
      memberCount: Math.max(0, community.memberCount - 1)
    }, { transaction });

    await transaction.commit();

    res.json({
      message: '멤버가 강퇴되었습니다. 48시간 후 재입장 가능합니다.',
      ban,
      bannedUntil
    });
  } catch (error) {
    await transaction.rollback();
    console.error('강퇴 오류:', error);
    res.status(500).json({ error: '강퇴 처리 중 오류가 발생했습니다.' });
  }
};

/**
 * 투표 생성 (방장 전용)
 */
exports.createPoll = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const creatorId = req.user.id;
    const { communityId } = req.params;
    const { title, description, options, endsAt, votingPower = 'ONE_SHARE_ONE_VOTE', resultVisibility = 'IMMEDIATE' } = req.body;

    if (!title || !options || !Array.isArray(options) || options.length < 2) {
      await transaction.rollback();
      return res.status(400).json({ error: '제목과 최소 2개 이상의 선택지가 필요합니다.' });
    }

    const community = await ShareholderCommunity.findByPk(communityId, { transaction });
    if (!community) {
      await transaction.rollback();
      return res.status(404).json({ error: '커뮤니티를 찾을 수 없습니다.' });
    }

    // 방장 권한 확인
    if (community.currentAdminId !== creatorId) {
      await transaction.rollback();
      return res.status(403).json({ error: '방장만 투표를 만들 수 있습니다.' });
    }

    // 투표 생성
    const poll = await CommunityPoll.create({
      communityId,
      createdBy: creatorId,
      title,
      description,
      votingPower,
      resultVisibility,
      endsAt: endsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 기본 7일
    }, { transaction });

    // 선택지 생성
    const pollOptions = await Promise.all(
      options.map((text, index) =>
        CommunityPollOption.create({
          pollId: poll.id,
          text,
          order: index
        }, { transaction })
      )
    );

    await transaction.commit();

    res.status(201).json({
      message: '투표가 생성되었습니다.',
      poll,
      options: pollOptions
    });
  } catch (error) {
    await transaction.rollback();
    console.error('투표 생성 오류:', error);
    res.status(500).json({ error: '투표 생성 중 오류가 발생했습니다.' });
  }
};

/**
 * 투표하기
 */
exports.vote = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { pollId } = req.params;
    const { optionId } = req.body;

    const poll = await CommunityPoll.findByPk(pollId, {
      include: [{
        model: ShareholderCommunity,
        as: 'community'
      }],
      transaction
    });

    if (!poll) {
      await transaction.rollback();
      return res.status(404).json({ error: '투표를 찾을 수 없습니다.' });
    }

    if (poll.status !== 'ACTIVE') {
      await transaction.rollback();
      return res.status(400).json({ error: '종료된 투표입니다.' });
    }

    if (new Date() > new Date(poll.endsAt)) {
      await poll.update({ status: 'ENDED' }, { transaction });
      await transaction.rollback();
      return res.status(400).json({ error: '투표 마감 시간이 지났습니다.' });
    }

    // 이미 투표했는지 확인
    const existingVote = await CommunityPollVote.findOne({
      where: { pollId, userId },
      transaction
    });

    if (existingVote) {
      await transaction.rollback();
      return res.status(400).json({ error: '이미 투표하셨습니다.' });
    }

    // 투표권 계산
    const shareholding = await getShareholding(userId, poll.community.creatorId);
    const votePower = poll.votingPower === 'ONE_SHARE_ONE_VOTE' ? shareholding : 1;

    if (votePower === 0) {
      await transaction.rollback();
      return res.status(403).json({ error: '투표 권한이 없습니다. 주식을 보유해야 합니다.' });
    }

    // 투표 기록
    const vote = await CommunityPollVote.create({
      pollId,
      optionId,
      userId,
      votePower,
      shareholdingAtVote: shareholding
    }, { transaction });

    // 선택지 투표 수 업데이트
    const option = await CommunityPollOption.findByPk(optionId, { transaction });
    await option.update({
      voteCount: option.voteCount + votePower,
      voterCount: option.voterCount + 1
    }, { transaction });

    // 투표 총계 업데이트
    await poll.update({
      totalVotes: poll.totalVotes + votePower,
      participantCount: poll.participantCount + 1
    }, { transaction });

    // 투표 참여 보상 (10 HIPO 코인)
    const [wallet] = await Wallet.findOrCreate({
      where: { userId },
      defaults: { balance: 0, totalDeposited: 0, totalWithdrawn: 0, totalEarned: 0 },
      transaction
    });

    const rewardAmount = 10;
    await wallet.update({
      balance: parseFloat(wallet.balance) + rewardAmount,
      totalEarned: parseFloat(wallet.totalEarned) + rewardAmount
    }, { transaction });

    await CoinTransaction.create({
      userId,
      transactionType: 'REFERRAL_BONUS',
      amount: rewardAmount,
      balanceAfter: parseFloat(wallet.balance) + rewardAmount,
      relatedId: pollId,
      description: `투표 참여 보상: ${poll.title}`
    }, { transaction });

    await transaction.commit();

    res.json({
      message: '투표가 완료되었습니다. 10 HIPO 코인이 지급되었습니다.',
      vote,
      reward: rewardAmount
    });
  } catch (error) {
    await transaction.rollback();
    console.error('투표 오류:', error);
    res.status(500).json({ error: '투표 처리 중 오류가 발생했습니다.' });
  }
};

/**
 * 투표 결과 조회
 */
exports.getPollResults = async (req, res) => {
  try {
    const { pollId } = req.params;

    const poll = await CommunityPoll.findByPk(pollId, {
      include: [
        {
          model: CommunityPollOption,
          as: 'options',
          order: [['order', 'ASC']]
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profileImage']
        }
      ]
    });

    if (!poll) {
      return res.status(404).json({ error: '투표를 찾을 수 없습니다.' });
    }

    res.json({ poll });
  } catch (error) {
    console.error('투표 결과 조회 오류:', error);
    res.status(500).json({ error: '투표 결과 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 공지사항 생성 (방장 전용)
 */
exports.createNotice = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const { communityId } = req.params;
    const { title, content, isPinned = true, priority = 0 } = req.body;

    const community = await ShareholderCommunity.findByPk(communityId);
    if (!community) {
      return res.status(404).json({ error: '커뮤니티를 찾을 수 없습니다.' });
    }

    // 방장 또는 커뮤니티 소유자만 공지 작성 가능
    if (community.currentAdminId !== creatorId && community.creatorId !== creatorId) {
      return res.status(403).json({ error: '공지를 작성할 권한이 없습니다.' });
    }

    const notice = await CommunityNotice.create({
      communityId,
      createdBy: creatorId,
      title,
      content,
      isPinned,
      priority
    });

    res.status(201).json({
      message: '공지사항이 등록되었습니다.',
      notice
    });
  } catch (error) {
    console.error('공지 생성 오류:', error);
    res.status(500).json({ error: '공지 생성 중 오류가 발생했습니다.' });
  }
};

/**
 * 공지사항 목록 조회
 */
exports.getNotices = async (req, res) => {
  try {
    const { communityId } = req.params;

    const notices = await CommunityNotice.findAll({
      where: { communityId },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'profileImage']
      }],
      order: [
        ['isPinned', 'DESC'],
        ['priority', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    res.json({ notices });
  } catch (error) {
    console.error('공지 목록 조회 오류:', error);
    res.status(500).json({ error: '공지 목록 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 멤버 가입
 */
exports.joinCommunity = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { communityId } = req.params;

    const community = await ShareholderCommunity.findByPk(communityId, { transaction });
    if (!community) {
      await transaction.rollback();
      return res.status(404).json({ error: '커뮤니티를 찾을 수 없습니다.' });
    }

    // 주식 보유량 확인
    const shareholding = await getShareholding(userId, community.creatorId);
    if (shareholding < community.minSharesRequired) {
      await transaction.rollback();
      return res.status(403).json({
        error: `${community.minSharesRequired}주 이상 보유자만 가입할 수 있습니다.`,
        currentShares: shareholding,
        requiredShares: community.minSharesRequired
      });
    }

    // 강퇴 여부 확인
    const existingMember = await CommunityMember.findOne({
      where: { communityId, userId },
      transaction
    });

    if (existingMember) {
      if (existingMember.isBanned) {
        if (new Date() < new Date(existingMember.bannedUntil)) {
          await transaction.rollback();
          return res.status(403).json({
            error: '강퇴된 상태입니다.',
            bannedUntil: existingMember.bannedUntil
          });
        } else {
          // 강퇴 해제
          await existingMember.update({
            isBanned: false,
            bannedUntil: null,
            currentShareholding: shareholding
          }, { transaction });
        }
      } else {
        await transaction.rollback();
        return res.status(400).json({ error: '이미 가입된 멤버입니다.' });
      }
    } else {
      // 신규 멤버 생성
      await CommunityMember.create({
        communityId,
        userId,
        shareholdingAtJoin: shareholding,
        currentShareholding: shareholding
      }, { transaction });

      // 멤버 수 증가
      await community.update({
        memberCount: community.memberCount + 1
      }, { transaction });
    }

    // 방장 선출 (첫 가입자 또는 주식 변동 시)
    await selectRoomAdmin(communityId);

    await transaction.commit();

    res.json({
      message: '커뮤니티에 가입되었습니다.',
      shareholding
    });
  } catch (error) {
    await transaction.rollback();
    console.error('커뮤니티 가입 오류:', error);
    res.status(500).json({ error: '커뮤니티 가입 중 오류가 발생했습니다.' });
  }
};

/**
 * 멤버 주식 업데이트 (주식 거래 후 자동 호출)
 */
exports.updateMemberShareholding = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { userId, targetUserId } = req.body;

    // 해당 상장인의 커뮤니티 찾기
    const community = await ShareholderCommunity.findOne({
      where: { creatorId: targetUserId },
      transaction
    });

    if (!community) {
      await transaction.commit();
      return res.json({ message: '커뮤니티가 없습니다.' });
    }

    const member = await CommunityMember.findOne({
      where: { communityId: community.id, userId },
      transaction
    });

    if (member) {
      const newShareholding = await getShareholding(userId, targetUserId);
      await member.update({
        currentShareholding: newShareholding
      }, { transaction });

      // 방장 재선출
      const result = await selectRoomAdmin(community.id);

      await transaction.commit();

      if (result && result.changed) {
        return res.json({
          message: '주식 보유량이 업데이트되고 방장이 변경되었습니다.',
          newAdminId: result.newAdminId
        });
      }
    }

    await transaction.commit();
    res.json({ message: '주식 보유량이 업데이트되었습니다.' });
  } catch (error) {
    await transaction.rollback();
    console.error('멤버 주식 업데이트 오류:', error);
    res.status(500).json({ error: '주식 업데이트 중 오류가 발생했습니다.' });
  }
};

module.exports.selectRoomAdmin = selectRoomAdmin;
