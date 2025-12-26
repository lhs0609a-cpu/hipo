const { VideoCallBooking, User } = require('../models');
const { getShareholderStatus, hasPermission } = require('../utils/shareholderHelper');
const { Op } = require('sequelize');

/**
 * 화상통화 예약 신청
 */
exports.createBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId, scheduledAt, duration = 30, notes } = req.body;

    if (!targetUserId || !scheduledAt) {
      return res.status(400).json({ error: '대상 사용자와 예약 시간이 필요합니다.' });
    }

    // 주주 권한 확인 (대주주 이상만 화상통화 예약 가능)
    const canBook = await hasPermission(userId, targetUserId, 'monthlyVideoCall');

    if (!canBook) {
      const status = await getShareholderStatus(userId, targetUserId);
      return res.status(403).json({
        error: '화상통화 예약 권한이 없습니다. 대주주 등급 이상이 필요합니다.',
        currentTier: status.tierName,
        shareholding: status.shareholding,
        requiredTier: '대주주 (1,000주 이상)'
      });
    }

    const scheduledDate = new Date(scheduledAt);
    const monthKey = scheduledDate.toISOString().substring(0, 7); // YYYY-MM

    // 이번 달에 이미 예약했는지 확인
    const existingBooking = await VideoCallBooking.findOne({
      where: {
        userId,
        targetUserId,
        monthKey,
        status: {
          [Op.in]: ['pending', 'confirmed']
        }
      }
    });

    if (existingBooking) {
      return res.status(400).json({
        error: '이번 달에 이미 화상통화 예약이 있습니다.',
        existingBooking
      });
    }

    // 해당 시간에 다른 예약이 있는지 확인
    const timeConflict = await VideoCallBooking.findOne({
      where: {
        targetUserId,
        scheduledAt: {
          [Op.between]: [
            new Date(scheduledDate.getTime() - 30 * 60000), // 30분 전
            new Date(scheduledDate.getTime() + 30 * 60000)  // 30분 후
          ]
        },
        status: {
          [Op.in]: ['pending', 'confirmed']
        }
      }
    });

    if (timeConflict) {
      return res.status(400).json({
        error: '해당 시간대에 다른 예약이 있습니다. 다른 시간을 선택해주세요.'
      });
    }

    const booking = await VideoCallBooking.create({
      userId,
      targetUserId,
      scheduledAt: scheduledDate,
      duration,
      notes,
      monthKey,
      status: 'pending'
    });

    const bookingWithUsers = await VideoCallBooking.findByPk(booking.id, {
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'host',
          attributes: ['id', 'username', 'profilePicture']
        }
      ]
    });

    res.status(201).json(bookingWithUsers);
  } catch (error) {
    console.error('화상통화 예약 생성 오류:', error);
    res.status(500).json({ error: '화상통화 예약 중 오류가 발생했습니다.' });
  }
};

/**
 * 예약 확정 (대상 사용자만 가능)
 */
exports.confirmBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookingId } = req.params;
    const { meetingLink } = req.body;

    const booking = await VideoCallBooking.findByPk(bookingId);

    if (!booking) {
      return res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
    }

    // 본인에게 온 예약만 확정 가능
    if (booking.targetUserId !== userId) {
      return res.status(403).json({ error: '본인에게 온 예약만 확정할 수 있습니다.' });
    }

    booking.status = 'confirmed';
    if (meetingLink) {
      booking.meetingLink = meetingLink;
    }
    await booking.save();

    const bookingWithUsers = await VideoCallBooking.findByPk(booking.id, {
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'host',
          attributes: ['id', 'username', 'profilePicture']
        }
      ]
    });

    res.json(bookingWithUsers);
  } catch (error) {
    console.error('예약 확정 오류:', error);
    res.status(500).json({ error: '예약 확정 중 오류가 발생했습니다.' });
  }
};

/**
 * 예약 취소
 */
exports.cancelBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await VideoCallBooking.findByPk(bookingId);

    if (!booking) {
      return res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
    }

    // 예약자 또는 대상자만 취소 가능
    if (booking.userId !== userId && booking.targetUserId !== userId) {
      return res.status(403).json({ error: '취소 권한이 없습니다.' });
    }

    booking.status = 'cancelled';
    if (reason) {
      booking.cancellationReason = reason;
    }
    await booking.save();

    const bookingWithUsers = await VideoCallBooking.findByPk(booking.id, {
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'host',
          attributes: ['id', 'username', 'profilePicture']
        }
      ]
    });

    res.json(bookingWithUsers);
  } catch (error) {
    console.error('예약 취소 오류:', error);
    res.status(500).json({ error: '예약 취소 중 오류가 발생했습니다.' });
  }
};

/**
 * 예약 거부 (대상 사용자만 가능)
 */
exports.rejectBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await VideoCallBooking.findByPk(bookingId);

    if (!booking) {
      return res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
    }

    // 본인에게 온 예약만 거부 가능
    if (booking.targetUserId !== userId) {
      return res.status(403).json({ error: '본인에게 온 예약만 거부할 수 있습니다.' });
    }

    booking.status = 'rejected';
    if (reason) {
      booking.cancellationReason = reason;
    }
    await booking.save();

    const bookingWithUsers = await VideoCallBooking.findByPk(booking.id, {
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'host',
          attributes: ['id', 'username', 'profilePicture']
        }
      ]
    });

    res.json(bookingWithUsers);
  } catch (error) {
    console.error('예약 거부 오류:', error);
    res.status(500).json({ error: '예약 거부 중 오류가 발생했습니다.' });
  }
};

/**
 * 예약 완료 처리
 */
exports.completeBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookingId } = req.params;

    const booking = await VideoCallBooking.findByPk(bookingId);

    if (!booking) {
      return res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
    }

    // 예약자 또는 대상자만 완료 처리 가능
    if (booking.userId !== userId && booking.targetUserId !== userId) {
      return res.status(403).json({ error: '완료 처리 권한이 없습니다.' });
    }

    booking.status = 'completed';
    await booking.save();

    const bookingWithUsers = await VideoCallBooking.findByPk(booking.id, {
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'host',
          attributes: ['id', 'username', 'profilePicture']
        }
      ]
    });

    res.json(bookingWithUsers);
  } catch (error) {
    console.error('예약 완료 오류:', error);
    res.status(500).json({ error: '예약 완료 처리 중 오류가 발생했습니다.' });
  }
};

/**
 * 내 예약 목록 조회
 */
exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, type = 'requested', page = 1, limit = 20 } = req.query;

    const where = type === 'requested'
      ? { userId }
      : { targetUserId: userId };

    if (status) {
      where.status = status;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await VideoCallBooking.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'host',
          attributes: ['id', 'username', 'profilePicture']
        }
      ],
      order: [['scheduledAt', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      bookings: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('예약 목록 조회 오류:', error);
    res.status(500).json({ error: '예약 목록 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 특정 예약 조회
 */
exports.getBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookingId } = req.params;

    const booking = await VideoCallBooking.findByPk(bookingId, {
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'host',
          attributes: ['id', 'username', 'profilePicture']
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
    }

    // 예약자 또는 대상자만 조회 가능
    if (booking.userId !== userId && booking.targetUserId !== userId) {
      return res.status(403).json({ error: '조회 권한이 없습니다.' });
    }

    res.json(booking);
  } catch (error) {
    console.error('예약 조회 오류:', error);
    res.status(500).json({ error: '예약 조회 중 오류가 발생했습니다.' });
  }
};
