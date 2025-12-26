const { QA, User } = require('../models');
const { getShareholderStatus, hasPermission } = require('../utils/shareholderHelper');

/**
 * 주간 번호 계산 (YYYY-WW 형식)
 */
function getWeekNumber(date = new Date()) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return `${date.getFullYear()}-${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Q&A 질문 작성
 */
exports.createQuestion = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId, question, isPublic = true } = req.body;

    if (!targetUserId || !question) {
      return res.status(400).json({ error: '대상 사용자와 질문 내용이 필요합니다.' });
    }

    // 주주 권한 확인 (우량 주주 이상만 Q&A 참여 가능)
    const canParticipate = await hasPermission(userId, targetUserId, 'weeklyQA');

    if (!canParticipate) {
      const status = await getShareholderStatus(userId, targetUserId);
      return res.status(403).json({
        error: 'Q&A 참여 권한이 없습니다. 우량 주주 등급 이상이 필요합니다.',
        currentTier: status.tierName,
        shareholding: status.shareholding,
        requiredTier: '우량 주주 (100주 이상)'
      });
    }

    const weekNumber = getWeekNumber();

    const qa = await QA.create({
      userId,
      targetUserId,
      question,
      isPublic,
      weekNumber,
      status: 'pending'
    });

    const qaWithUser = await QA.findByPk(qa.id, {
      include: [
        {
          model: User,
          as: 'questioner',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'answerer',
          attributes: ['id', 'username', 'profilePicture']
        }
      ]
    });

    res.status(201).json(qaWithUser);
  } catch (error) {
    console.error('Q&A 질문 작성 오류:', error);
    res.status(500).json({ error: 'Q&A 질문 작성 중 오류가 발생했습니다.' });
  }
};

/**
 * Q&A 답변 작성 (대상 사용자만 가능)
 */
exports.answerQuestion = async (req, res) => {
  try {
    const userId = req.user.id;
    const { qaId } = req.params;
    const { answer } = req.body;

    if (!answer) {
      return res.status(400).json({ error: '답변 내용이 필요합니다.' });
    }

    const qa = await QA.findByPk(qaId);

    if (!qa) {
      return res.status(404).json({ error: 'Q&A를 찾을 수 없습니다.' });
    }

    // 본인에게 온 질문만 답변 가능
    if (qa.targetUserId !== userId) {
      return res.status(403).json({ error: '본인에게 온 질문만 답변할 수 있습니다.' });
    }

    qa.answer = answer;
    qa.status = 'answered';
    await qa.save();

    const qaWithUser = await QA.findByPk(qa.id, {
      include: [
        {
          model: User,
          as: 'questioner',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'answerer',
          attributes: ['id', 'username', 'profilePicture']
        }
      ]
    });

    res.json(qaWithUser);
  } catch (error) {
    console.error('Q&A 답변 작성 오류:', error);
    res.status(500).json({ error: 'Q&A 답변 작성 중 오류가 발생했습니다.' });
  }
};

/**
 * 특정 사용자의 Q&A 목록 조회
 */
exports.getQAsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, weekNumber, page = 1, limit = 20 } = req.query;

    const where = { targetUserId: userId };

    if (status) {
      where.status = status;
    }

    if (weekNumber) {
      where.weekNumber = weekNumber;
    }

    // 본인이 아닌 경우 공개된 것만 조회
    if (req.user.id !== parseInt(userId)) {
      where.isPublic = true;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await QA.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'questioner',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'answerer',
          attributes: ['id', 'username', 'profilePicture']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      qas: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Q&A 목록 조회 오류:', error);
    res.status(500).json({ error: 'Q&A 목록 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 내가 작성한 질문 목록 조회
 */
exports.getMyQuestions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const where = { userId };

    if (status) {
      where.status = status;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await QA.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'questioner',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'answerer',
          attributes: ['id', 'username', 'profilePicture']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      qas: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('내 질문 조회 오류:', error);
    res.status(500).json({ error: '내 질문 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * Q&A 삭제 (질문자 또는 답변자만 가능)
 */
exports.deleteQA = async (req, res) => {
  try {
    const userId = req.user.id;
    const { qaId } = req.params;

    const qa = await QA.findByPk(qaId);

    if (!qa) {
      return res.status(404).json({ error: 'Q&A를 찾을 수 없습니다.' });
    }

    // 질문자 또는 답변자만 삭제 가능
    if (qa.userId !== userId && qa.targetUserId !== userId) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    await qa.destroy();

    res.json({ message: 'Q&A가 삭제되었습니다.' });
  } catch (error) {
    console.error('Q&A 삭제 오류:', error);
    res.status(500).json({ error: 'Q&A 삭제 중 오류가 발생했습니다.' });
  }
};

/**
 * Q&A 거부 (답변자만 가능)
 */
exports.rejectQuestion = async (req, res) => {
  try {
    const userId = req.user.id;
    const { qaId } = req.params;

    const qa = await QA.findByPk(qaId);

    if (!qa) {
      return res.status(404).json({ error: 'Q&A를 찾을 수 없습니다.' });
    }

    // 본인에게 온 질문만 거부 가능
    if (qa.targetUserId !== userId) {
      return res.status(403).json({ error: '본인에게 온 질문만 거부할 수 있습니다.' });
    }

    qa.status = 'rejected';
    await qa.save();

    const qaWithUser = await QA.findByPk(qa.id, {
      include: [
        {
          model: User,
          as: 'questioner',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'answerer',
          attributes: ['id', 'username', 'profilePicture']
        }
      ]
    });

    res.json(qaWithUser);
  } catch (error) {
    console.error('Q&A 거부 오류:', error);
    res.status(500).json({ error: 'Q&A 거부 중 오류가 발생했습니다.' });
  }
};
