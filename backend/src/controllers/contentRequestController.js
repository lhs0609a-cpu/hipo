const { ContentRequest, ContentRequestVote, ShareholderCommunity, CommunityMember, User, Notification } = require('../models');
const { sequelize } = require('../config/database');
const { getIO } = require('../config/socket');

// 콘텐츠 요청 생성 (방장 권한)
exports.createContentRequest = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { communityId } = req.params;
    const { requestType, title, description, votingDuration = 7 } = req.body;
    const adminId = req.user.id;

    // 방장 확인
    const community = await ShareholderCommunity.findByPk(communityId);
    if (!community || community.currentAdminId !== adminId) {
      await transaction.rollback();
      return res.status(403).json({ error: '방장만 콘텐츠를 요청할 수 있습니다' });
    }

    // 투표 마감 시간 설정
    const votingEndsAt = new Date();
    votingEndsAt.setDate(votingEndsAt.getDate() + votingDuration);

    const contentRequest = await ContentRequest.create({
      communityId,
      requestedBy: adminId,
      creatorId: community.creatorId,
      requestType,
      title,
      description,
      status: 'VOTING',
      votingEndsAt
    }, { transaction });

    // 상장인에게 알림
    await Notification.create({
      userId: community.creatorId,
      type: 'CONTENT_REQUEST',
      title: '새로운 콘텐츠 요청',
      message: `${community.name}에서 "${title}" 요청이 들어왔습니다`,
      relatedId: contentRequest.id
    }, { transaction });

    await transaction.commit();

    // 실시간 알림
    const io = getIO();
    io.to(`community:${communityId}`).emit('content_request_created', {
      requestId: contentRequest.id,
      title,
      votingEndsAt
    });

    res.json({ contentRequest, message: '콘텐츠 요청이 생성되었습니다' });

  } catch (error) {
    await transaction.rollback();
    console.error('콘텐츠 요청 생성 오류:', error);
    res.status(500).json({ error: '콘텐츠 요청 생성에 실패했습니다' });
  }
};

// 콘텐츠 요청 투표
exports.voteContentRequest = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { requestId } = req.params;
    const { vote } = req.body; // 'YES' or 'NO'
    const userId = req.user.id;

    const contentRequest = await ContentRequest.findByPk(requestId);
    if (!contentRequest) {
      await transaction.rollback();
      return res.status(404).json({ error: '콘텐츠 요청을 찾을 수 없습니다' });
    }

    // 투표 마감 확인
    if (new Date() > contentRequest.votingEndsAt) {
      await transaction.rollback();
      return res.status(400).json({ error: '투표가 마감되었습니다' });
    }

    // 상태 확인
    if (contentRequest.status !== 'VOTING') {
      await transaction.rollback();
      return res.status(400).json({ error: '현재 투표 진행 중이 아닙니다' });
    }

    // 멤버 확인
    const member = await CommunityMember.findOne({
      where: { communityId: contentRequest.communityId, userId, isBanned: false }
    });

    if (!member) {
      await transaction.rollback();
      return res.status(403).json({ error: '해당 커뮤니티의 멤버가 아닙니다' });
    }

    // 이미 투표했는지 확인
    const existingVote = await ContentRequestVote.findOne({
      where: { requestId, userId }
    });

    if (existingVote) {
      await transaction.rollback();
      return res.status(400).json({ error: '이미 투표하셨습니다' });
    }

    // 투표 기록
    await ContentRequestVote.create({
      requestId,
      userId,
      vote
    }, { transaction });

    // 투표 카운트 업데이트
    if (vote === 'YES') {
      contentRequest.yesVotes += 1;
    } else {
      contentRequest.noVotes += 1;
    }
    contentRequest.totalVoters += 1;

    await contentRequest.save({ transaction });

    await transaction.commit();

    // 실시간 업데이트
    const io = getIO();
    io.to(`community:${contentRequest.communityId}`).emit('content_request_vote_updated', {
      requestId: contentRequest.id,
      yesVotes: contentRequest.yesVotes,
      noVotes: contentRequest.noVotes,
      totalVoters: contentRequest.totalVoters
    });

    res.json({
      vote,
      yesVotes: contentRequest.yesVotes,
      noVotes: contentRequest.noVotes,
      totalVoters: contentRequest.totalVoters
    });

  } catch (error) {
    await transaction.rollback();
    console.error('콘텐츠 요청 투표 오류:', error);
    res.status(500).json({ error: '투표 처리에 실패했습니다' });
  }
};

// 투표 결과 확인 및 과반 여부 판단
exports.checkVotingResult = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { requestId } = req.params;

    const contentRequest = await ContentRequest.findByPk(requestId);
    if (!contentRequest) {
      await transaction.rollback();
      return res.status(404).json({ error: '콘텐츠 요청을 찾을 수 없습니다' });
    }

    // 투표 마감 확인
    if (new Date() < contentRequest.votingEndsAt) {
      return res.status(400).json({ error: '투표가 아직 진행 중입니다' });
    }

    // 과반 판단 (총 투표자의 50% 이상 찬성)
    const isMajorityApproved = contentRequest.yesVotes > (contentRequest.totalVoters / 2);

    // 상태 업데이트
    await contentRequest.update({
      isMajorityApproved,
      status: isMajorityApproved ? 'APPROVED' : 'REJECTED'
    }, { transaction });

    // 상장인에게 알림
    await Notification.create({
      userId: contentRequest.creatorId,
      type: isMajorityApproved ? 'CONTENT_REQUEST_APPROVED' : 'CONTENT_REQUEST_REJECTED',
      title: isMajorityApproved ? '콘텐츠 요청 승인됨' : '콘텐츠 요청 거부됨',
      message: `"${contentRequest.title}" 요청이 ${isMajorityApproved ? '과반 찬성으로 승인' : '과반 미달로 거부'}되었습니다`,
      relatedId: contentRequest.id
    }, { transaction });

    await transaction.commit();

    // 실시간 알림
    const io = getIO();
    io.to(`community:${contentRequest.communityId}`).emit('content_request_result', {
      requestId: contentRequest.id,
      isMajorityApproved,
      status: contentRequest.status
    });

    res.json({
      requestId: contentRequest.id,
      isMajorityApproved,
      status: contentRequest.status,
      yesVotes: contentRequest.yesVotes,
      noVotes: contentRequest.noVotes,
      totalVoters: contentRequest.totalVoters
    });

  } catch (error) {
    await transaction.rollback();
    console.error('투표 결과 확인 오류:', error);
    res.status(500).json({ error: '투표 결과 확인에 실패했습니다' });
  }
};

// 상장인의 콘텐츠 요청 응답 (승인/거부)
exports.respondToRequest = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { requestId } = req.params;
    const { creatorResponse, scheduledAt, contentUrl, status } = req.body;
    const creatorId = req.user.id;

    const contentRequest = await ContentRequest.findByPk(requestId, {
      include: [{ model: ShareholderCommunity, as: 'community' }]
    });

    if (!contentRequest) {
      await transaction.rollback();
      return res.status(404).json({ error: '콘텐츠 요청을 찾을 수 없습니다' });
    }

    // 상장인 확인
    if (contentRequest.creatorId !== creatorId) {
      await transaction.rollback();
      return res.status(403).json({ error: '해당 요청의 상장인만 응답할 수 있습니다' });
    }

    // 과반 승인된 요청만 처리 가능
    if (!contentRequest.isMajorityApproved) {
      await transaction.rollback();
      return res.status(400).json({ error: '과반 승인된 요청만 응답할 수 있습니다' });
    }

    // 응답 업데이트
    await contentRequest.update({
      creatorResponse,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      contentUrl,
      status: status || 'APPROVED',
      completedAt: contentUrl ? new Date() : null
    }, { transaction });

    // 방장에게 알림
    await Notification.create({
      userId: contentRequest.requestedBy,
      type: 'CREATOR_RESPONDED',
      title: '상장인 응답',
      message: `"${contentRequest.title}" 요청에 상장인이 응답했습니다`,
      relatedId: contentRequest.id
    }, { transaction });

    await transaction.commit();

    // 실시간 알림
    const io = getIO();
    io.to(`community:${contentRequest.communityId}`).emit('creator_responded', {
      requestId: contentRequest.id,
      creatorResponse,
      scheduledAt,
      contentUrl
    });

    res.json({ contentRequest, message: '응답이 등록되었습니다' });

  } catch (error) {
    await transaction.rollback();
    console.error('상장인 응답 오류:', error);
    res.status(500).json({ error: '응답 등록에 실패했습니다' });
  }
};

// 콘텐츠 요청 목록 조회
exports.getContentRequests = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { status } = req.query;

    const whereClause = { communityId };
    if (status) {
      whereClause.status = status;
    }

    const contentRequests = await ContentRequest.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'username', 'displayName', 'profileImage']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'displayName', 'profileImage']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ contentRequests });

  } catch (error) {
    console.error('콘텐츠 요청 목록 조회 오류:', error);
    res.status(500).json({ error: '콘텐츠 요청 목록을 불러올 수 없습니다' });
  }
};

// 콘텐츠 요청 상세 조회
exports.getContentRequestDetail = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const contentRequest = await ContentRequest.findByPk(requestId, {
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'username', 'displayName', 'profileImage']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'displayName', 'profileImage']
        },
        {
          model: ShareholderCommunity,
          as: 'community'
        }
      ]
    });

    if (!contentRequest) {
      return res.status(404).json({ error: '콘텐츠 요청을 찾을 수 없습니다' });
    }

    // 내가 투표했는지 확인
    const myVote = await ContentRequestVote.findOne({
      where: { requestId, userId }
    });

    res.json({
      contentRequest,
      myVote: myVote ? myVote.vote : null,
      hasVoted: !!myVote
    });

  } catch (error) {
    console.error('콘텐츠 요청 상세 조회 오류:', error);
    res.status(500).json({ error: '콘텐츠 요청 상세를 불러올 수 없습니다' });
  }
};

// 상장인의 콘텐츠 요청 목록 (모든 커뮤니티)
exports.getCreatorContentRequests = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const { status } = req.query;

    const whereClause = { creatorId };
    if (status) {
      whereClause.status = status;
    }

    const contentRequests = await ContentRequest.findAll({
      where: whereClause,
      include: [
        {
          model: ShareholderCommunity,
          as: 'community',
          attributes: ['id', 'name', 'tier']
        },
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'username', 'displayName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ contentRequests });

  } catch (error) {
    console.error('상장인 콘텐츠 요청 목록 조회 오류:', error);
    res.status(500).json({ error: '콘텐츠 요청 목록을 불러올 수 없습니다' });
  }
};

module.exports = exports;
