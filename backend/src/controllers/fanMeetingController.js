const { FanMeeting, FanMeetingEntry, User } = require('../models');
const { getShareholding } = require('../utils/shareholderHelper');
const { Op } = require('sequelize');

/**
 * 팬미팅 생성 (크리에이터용)
 */
exports.createFanMeeting = async (req, res) => {
  try {
    const hostId = req.user.id;
    const {
      title,
      description,
      scheduledAt,
      duration = 30,
      maxParticipants = 1,
      minShares = 1000,
      quarter
    } = req.body;

    if (!title || !scheduledAt) {
      return res.status(400).json({ error: '제목과 일정이 필요합니다' });
    }

    const fanMeeting = await FanMeeting.create({
      hostId,
      title,
      description,
      scheduledAt,
      duration,
      maxParticipants,
      minShares,
      quarter,
      status: 'pending'
    });

    res.status(201).json({
      message: '팬미팅이 생성되었습니다',
      fanMeeting
    });
  } catch (error) {
    console.error('팬미팅 생성 오류:', error);
    res.status(500).json({ error: '팬미팅 생성 중 오류가 발생했습니다' });
  }
};

/**
 * 팬미팅 목록 조회
 */
exports.getFanMeetings = async (req, res) => {
  try {
    const { hostId, status } = req.query;
    const where = {};

    if (hostId) where.hostId = hostId;
    if (status) where.status = status;

    const fanMeetings = await FanMeeting.findAll({
      where,
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'username', 'profileImage']
        },
        {
          model: FanMeetingEntry,
          as: 'entries',
          attributes: ['id', 'userId', 'shareholding', 'isWinner']
        }
      ],
      order: [['scheduledAt', 'DESC']]
    });

    res.json({ fanMeetings });
  } catch (error) {
    console.error('팬미팅 목록 조회 오류:', error);
    res.status(500).json({ error: '팬미팅 목록 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 팬미팅 상세 조회
 */
exports.getFanMeetingById = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const fanMeeting = await FanMeeting.findByPk(meetingId, {
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'username', 'profileImage']
        },
        {
          model: FanMeetingEntry,
          as: 'entries',
          include: [{
            model: User,
            as: 'participant',
            attributes: ['id', 'username', 'profileImage']
          }]
        }
      ]
    });

    if (!fanMeeting) {
      return res.status(404).json({ error: '팬미팅을 찾을 수 없습니다' });
    }

    res.json({ fanMeeting });
  } catch (error) {
    console.error('팬미팅 조회 오류:', error);
    res.status(500).json({ error: '팬미팅 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 팬미팅 추첨 참가
 */
exports.enterFanMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    const fanMeeting = await FanMeeting.findByPk(meetingId);
    if (!fanMeeting) {
      return res.status(404).json({ error: '팬미팅을 찾을 수 없습니다' });
    }

    // 추첨 진행 중인지 확인
    if (fanMeeting.status !== 'open') {
      return res.status(400).json({ error: '현재 추첨에 참가할 수 없습니다' });
    }

    // 이미 참가했는지 확인
    const existingEntry = await FanMeetingEntry.findOne({
      where: { meetingId, userId }
    });

    if (existingEntry) {
      return res.status(400).json({ error: '이미 추첨에 참가하셨습니다' });
    }

    // 주식 보유량 확인
    const shareholding = await getShareholding(userId, fanMeeting.hostId);

    if (shareholding < fanMeeting.minShares) {
      return res.status(403).json({
        error: `추첨에 참가하려면 최소 ${fanMeeting.minShares}주가 필요합니다`,
        currentShares: shareholding,
        requiredShares: fanMeeting.minShares
      });
    }

    // 추첨 참가 등록
    const entry = await FanMeetingEntry.create({
      meetingId,
      userId,
      shareholding,
      lotteryWeight: shareholding // 주식 수 = 가중치
    });

    res.status(201).json({
      message: '팬미팅 추첨에 참가하셨습니다',
      entry
    });
  } catch (error) {
    console.error('팬미팅 참가 오류:', error);
    res.status(500).json({ error: '팬미팅 참가 중 오류가 발생했습니다' });
  }
};

/**
 * 팬미팅 추첨 실행 (크리에이터용)
 */
exports.conductLottery = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    const fanMeeting = await FanMeeting.findByPk(meetingId, {
      include: [{
        model: FanMeetingEntry,
        as: 'entries'
      }]
    });

    if (!fanMeeting) {
      return res.status(404).json({ error: '팬미팅을 찾을 수 없습니다' });
    }

    // 주최자 확인
    if (fanMeeting.hostId !== userId) {
      return res.status(403).json({ error: '추첨을 실행할 권한이 없습니다' });
    }

    // 추첨 진행 중인지 확인
    if (fanMeeting.status !== 'open') {
      return res.status(400).json({ error: '추첨을 진행할 수 없는 상태입니다' });
    }

    const entries = fanMeeting.entries;

    if (entries.length === 0) {
      return res.status(400).json({ error: '추첨 참가자가 없습니다' });
    }

    // 가중치 기반 추첨 알고리즘
    const totalWeight = entries.reduce((sum, entry) => sum + entry.lotteryWeight, 0);
    const winners = [];
    const remainingEntries = [...entries];

    // maxParticipants만큼 당첨자 선정
    for (let i = 0; i < Math.min(fanMeeting.maxParticipants, entries.length); i++) {
      // 남은 참가자들의 총 가중치 계산
      const currentTotalWeight = remainingEntries.reduce((sum, entry) => sum + entry.lotteryWeight, 0);

      // 가중치 기반 랜덤 선택
      let randomWeight = Math.random() * currentTotalWeight;
      let selectedEntry = null;

      for (const entry of remainingEntries) {
        randomWeight -= entry.lotteryWeight;
        if (randomWeight <= 0) {
          selectedEntry = entry;
          break;
        }
      }

      if (selectedEntry) {
        // 당첨자로 표시
        await selectedEntry.update({ isWinner: true });
        winners.push(selectedEntry);

        // 남은 참가자 목록에서 제거
        const index = remainingEntries.findIndex(e => e.id === selectedEntry.id);
        if (index > -1) {
          remainingEntries.splice(index, 1);
        }
      }
    }

    // 팬미팅 상태를 'closed'로 변경
    await fanMeeting.update({ status: 'closed' });

    // 당첨자 정보와 함께 응답
    const winnersWithDetails = await FanMeetingEntry.findAll({
      where: {
        meetingId,
        isWinner: true
      },
      include: [{
        model: User,
        as: 'participant',
        attributes: ['id', 'username', 'profileImage']
      }]
    });

    res.json({
      message: '추첨이 완료되었습니다',
      winners: winnersWithDetails,
      totalEntries: entries.length,
      totalWeight
    });
  } catch (error) {
    console.error('팬미팅 추첨 오류:', error);
    res.status(500).json({ error: '팬미팅 추첨 중 오류가 발생했습니다' });
  }
};

/**
 * 팬미팅 상태 변경 (크리에이터용)
 */
exports.updateFanMeetingStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const fanMeeting = await FanMeeting.findByPk(meetingId);
    if (!fanMeeting) {
      return res.status(404).json({ error: '팬미팅을 찾을 수 없습니다' });
    }

    // 주최자 확인
    if (fanMeeting.hostId !== userId) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    const validStatuses = ['pending', 'open', 'closed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '유효하지 않은 상태입니다' });
    }

    await fanMeeting.update({ status });

    res.json({
      message: '팬미팅 상태가 변경되었습니다',
      fanMeeting
    });
  } catch (error) {
    console.error('팬미팅 상태 변경 오류:', error);
    res.status(500).json({ error: '팬미팅 상태 변경 중 오류가 발생했습니다' });
  }
};

/**
 * 내 팬미팅 참가 내역 조회
 */
exports.getMyEntries = async (req, res) => {
  try {
    const userId = req.user.id;

    const entries = await FanMeetingEntry.findAll({
      where: { userId },
      include: [{
        model: FanMeeting,
        as: 'meeting',
        include: [{
          model: User,
          as: 'host',
          attributes: ['id', 'username', 'profileImage']
        }]
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({ entries });
  } catch (error) {
    console.error('내 참가 내역 조회 오류:', error);
    res.status(500).json({ error: '참가 내역 조회 중 오류가 발생했습니다' });
  }
};
