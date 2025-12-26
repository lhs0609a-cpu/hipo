const { Poll, PollOption, PollVote, User } = require('../models');
const { getShareholderStatus, getShareholding, hasPermission } = require('../utils/shareholderHelper');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * 투표 생성
 */
exports.createPoll = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const {
      title,
      description,
      endsAt,
      options,
      isPublic = true,
      allowMultipleChoices = false,
      requiresShareholderStatus = false,
      minSharesRequired = 0
    } = req.body;

    if (!title || !endsAt || !options || options.length < 2) {
      await transaction.rollback();
      return res.status(400).json({
        error: '제목, 종료 시간, 최소 2개의 선택지가 필요합니다.'
      });
    }

    // 투표 권한이 필요한 경우 (최대주주만 투표 생성 가능)
    if (requiresShareholderStatus) {
      const canCreatePoll = await hasPermission(userId, userId, 'votingRight');

      if (!canCreatePoll) {
        await transaction.rollback();
        const status = await getShareholderStatus(userId, userId);
        return res.status(403).json({
          error: '투표 생성 권한이 없습니다. 최대주주 등급이 필요합니다.',
          currentTier: status.tierName,
          shareholding: status.shareholding,
          requiredTier: '최대주주 (10,000주 이상)'
        });
      }
    }

    const poll = await Poll.create({
      userId,
      title,
      description,
      endsAt,
      isPublic,
      allowMultipleChoices,
      requiresShareholderStatus,
      minSharesRequired,
      status: 'active'
    }, { transaction });

    // 선택지 생성
    const pollOptions = await Promise.all(
      options.map((optionText, index) =>
        PollOption.create({
          pollId: poll.id,
          text: optionText,
          order: index
        }, { transaction })
      )
    );

    await transaction.commit();

    const pollWithOptions = await Poll.findByPk(poll.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: PollOption,
          as: 'options',
          attributes: ['id', 'text', 'order', 'votesCount']
        }
      ]
    });

    res.status(201).json(pollWithOptions);
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
    const { optionIds } = req.body; // 배열 형태로 받음 (다중 선택 지원)

    if (!optionIds || !Array.isArray(optionIds) || optionIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: '선택한 옵션이 필요합니다.' });
    }

    const poll = await Poll.findByPk(pollId, {
      include: [
        {
          model: PollOption,
          as: 'options'
        }
      ]
    });

    if (!poll) {
      await transaction.rollback();
      return res.status(404).json({ error: '투표를 찾을 수 없습니다.' });
    }

    // 투표 상태 확인
    if (poll.status !== 'active') {
      await transaction.rollback();
      return res.status(400).json({ error: '종료되었거나 취소된 투표입니다.' });
    }

    // 종료 시간 확인
    if (new Date() > new Date(poll.endsAt)) {
      await transaction.rollback();
      // 자동으로 상태 업데이트
      poll.status = 'closed';
      await poll.save();
      return res.status(400).json({ error: '이미 종료된 투표입니다.' });
    }

    // 다중 선택 확인
    if (!poll.allowMultipleChoices && optionIds.length > 1) {
      await transaction.rollback();
      return res.status(400).json({ error: '단일 선택만 가능한 투표입니다.' });
    }

    // 주주 권한 확인
    let shareholding = 0;
    if (poll.requiresShareholderStatus) {
      shareholding = await getShareholding(userId, poll.userId);

      if (shareholding < poll.minSharesRequired) {
        await transaction.rollback();
        return res.status(403).json({
          error: `이 투표는 최소 ${poll.minSharesRequired}주 이상 보유한 주주만 참여할 수 있습니다.`,
          currentShares: shareholding,
          requiredShares: poll.minSharesRequired
        });
      }
    }

    // 이미 투표했는지 확인
    const existingVotes = await PollVote.findAll({
      where: {
        pollId,
        userId
      }
    });

    if (existingVotes.length > 0) {
      await transaction.rollback();
      return res.status(400).json({ error: '이미 투표에 참여했습니다.' });
    }

    // 투표 기록 생성
    const votes = await Promise.all(
      optionIds.map(optionId =>
        PollVote.create({
          pollId,
          optionId,
          userId,
          shareholding
        }, { transaction })
      )
    );

    // 각 옵션의 득표 수 업데이트
    await Promise.all(
      optionIds.map(optionId =>
        PollOption.increment('votesCount', {
          by: 1,
          where: { id: optionId },
          transaction
        })
      )
    );

    await transaction.commit();

    const updatedPoll = await Poll.findByPk(pollId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: PollOption,
          as: 'options',
          attributes: ['id', 'text', 'order', 'votesCount']
        }
      ]
    });

    res.json({
      message: '투표가 완료되었습니다.',
      poll: updatedPoll,
      votes
    });
  } catch (error) {
    await transaction.rollback();
    console.error('투표 오류:', error);
    res.status(500).json({ error: '투표 중 오류가 발생했습니다.' });
  }
};

/**
 * 투표 목록 조회
 */
exports.getPolls = async (req, res) => {
  try {
    const { status, userId, page = 1, limit = 20 } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    // 본인이 아닌 경우 공개된 것만 조회
    if (!userId || parseInt(userId) !== req.user.id) {
      where.isPublic = true;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Poll.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: PollOption,
          as: 'options',
          attributes: ['id', 'text', 'order', 'votesCount']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // 각 투표에 대해 사용자가 투표했는지 확인
    const pollsWithVoteStatus = await Promise.all(
      rows.map(async (poll) => {
        const hasVoted = await PollVote.findOne({
          where: {
            pollId: poll.id,
            userId: req.user.id
          }
        });

        return {
          ...poll.toJSON(),
          hasVoted: !!hasVoted
        };
      })
    );

    res.json({
      polls: pollsWithVoteStatus,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('투표 목록 조회 오류:', error);
    res.status(500).json({ error: '투표 목록 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 투표 상세 조회
 */
exports.getPoll = async (req, res) => {
  try {
    const { pollId } = req.params;

    const poll = await Poll.findByPk(pollId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: PollOption,
          as: 'options',
          attributes: ['id', 'text', 'order', 'votesCount']
        }
      ]
    });

    if (!poll) {
      return res.status(404).json({ error: '투표를 찾을 수 없습니다.' });
    }

    // 비공개 투표인 경우 권한 확인
    if (!poll.isPublic && poll.userId !== req.user.id) {
      return res.status(403).json({ error: '비공개 투표입니다.' });
    }

    // 사용자가 투표했는지 확인
    const userVotes = await PollVote.findAll({
      where: {
        pollId,
        userId: req.user.id
      },
      include: [
        {
          model: PollOption,
          as: 'option',
          attributes: ['id', 'text']
        }
      ]
    });

    res.json({
      ...poll.toJSON(),
      hasVoted: userVotes.length > 0,
      userVotes
    });
  } catch (error) {
    console.error('투표 조회 오류:', error);
    res.status(500).json({ error: '투표 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 투표 종료
 */
exports.closePoll = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pollId } = req.params;

    const poll = await Poll.findByPk(pollId);

    if (!poll) {
      return res.status(404).json({ error: '투표를 찾을 수 없습니다.' });
    }

    // 본인이 생성한 투표만 종료 가능
    if (poll.userId !== userId) {
      return res.status(403).json({ error: '본인이 생성한 투표만 종료할 수 있습니다.' });
    }

    poll.status = 'closed';
    await poll.save();

    const updatedPoll = await Poll.findByPk(pollId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: PollOption,
          as: 'options',
          attributes: ['id', 'text', 'order', 'votesCount']
        }
      ]
    });

    res.json(updatedPoll);
  } catch (error) {
    console.error('투표 종료 오류:', error);
    res.status(500).json({ error: '투표 종료 중 오류가 발생했습니다.' });
  }
};

/**
 * 투표 삭제
 */
exports.deletePoll = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pollId } = req.params;

    const poll = await Poll.findByPk(pollId);

    if (!poll) {
      return res.status(404).json({ error: '투표를 찾을 수 없습니다.' });
    }

    // 본인이 생성한 투표만 삭제 가능
    if (poll.userId !== userId) {
      return res.status(403).json({ error: '본인이 생성한 투표만 삭제할 수 있습니다.' });
    }

    await poll.destroy();

    res.json({ message: '투표가 삭제되었습니다.' });
  } catch (error) {
    console.error('투표 삭제 오류:', error);
    res.status(500).json({ error: '투표 삭제 중 오류가 발생했습니다.' });
  }
};
