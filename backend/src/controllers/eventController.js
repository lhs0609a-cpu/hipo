const { Event, EventTicket, User } = require('../models');
const { getShareholding } = require('../utils/shareholderHelper');
const crypto = require('crypto');

/**
 * 이벤트 생성 (크리에이터용)
 */
exports.createEvent = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const {
      name,
      description,
      eventType,
      eventDate,
      location,
      imageUrl,
      generalTickets = 0,
      vipTickets = 0,
      backstageTickets = 0,
      shareholderEarlyAccessStartsAt,
      publicSaleStartsAt,
      salesEndsAt,
      minSharesForVIP = 1000,
      minSharesForBackstage = 10000
    } = req.body;

    if (!name || !eventType || !eventDate) {
      return res.status(400).json({
        error: '이벤트 이름, 유형, 일시가 필요합니다.'
      });
    }

    const totalTickets = generalTickets + vipTickets + backstageTickets;

    const event = await Event.create({
      creatorId,
      name,
      description,
      eventType,
      eventDate,
      location,
      imageUrl,
      totalTickets,
      availableTickets: totalTickets,
      generalTickets,
      vipTickets,
      backstageTickets,
      shareholderEarlyAccessStartsAt,
      publicSaleStartsAt,
      salesEndsAt,
      minSharesForVIP,
      minSharesForBackstage,
      status: 'UPCOMING'
    });

    res.status(201).json({
      message: '이벤트가 생성되었습니다.',
      event
    });
  } catch (error) {
    console.error('이벤트 생성 오류:', error);
    res.status(500).json({ error: '이벤트 생성 중 오류가 발생했습니다.' });
  }
};

/**
 * 이벤트 목록 조회
 */
exports.getEvents = async (req, res) => {
  try {
    const { creatorId, eventType, status } = req.query;
    const where = {};

    if (creatorId) where.creatorId = creatorId;
    if (eventType) where.eventType = eventType;
    if (status) where.status = status;

    const events = await Event.findAll({
      where,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'profileImage']
      }],
      order: [['eventDate', 'ASC']]
    });

    res.json({ events });
  } catch (error) {
    console.error('이벤트 목록 조회 오류:', error);
    res.status(500).json({ error: '이벤트 목록 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 티켓 구매
 */
exports.purchaseTicket = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { ticketType, purchasePrice } = req.body;
    const userId = req.user.id;

    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
    }

    // 판매 시간 확인
    const now = new Date();
    const isEarlyAccess = now >= new Date(event.shareholderEarlyAccessStartsAt) &&
                          now < new Date(event.publicSaleStartsAt);
    const isPublicSale = now >= new Date(event.publicSaleStartsAt) &&
                         now < new Date(event.salesEndsAt);

    if (!isEarlyAccess && !isPublicSale) {
      return res.status(400).json({ error: '현재 티켓 구매 가능한 시간이 아닙니다.' });
    }

    // 주식 보유량 확인
    const shareholding = await getShareholding(userId, event.creatorId);

    // 티켓 유형별 권한 확인
    if (ticketType === 'BACKSTAGE') {
      if (shareholding < event.minSharesForBackstage) {
        return res.status(403).json({
          error: `백스테이지 티켓은 ${event.minSharesForBackstage}주 이상 보유한 최대주주만 구매할 수 있습니다.`,
          currentShares: shareholding,
          requiredShares: event.minSharesForBackstage
        });
      }
      if (event.backstageTickets <= 0) {
        return res.status(400).json({ error: '백스테이지 티켓이 매진되었습니다.' });
      }
    } else if (ticketType === 'VIP') {
      if (shareholding < event.minSharesForVIP) {
        return res.status(403).json({
          error: `VIP 티켓은 ${event.minSharesForVIP}주 이상 보유한 주주만 구매할 수 있습니다.`,
          currentShares: shareholding,
          requiredShares: event.minSharesForVIP
        });
      }
      if (event.vipTickets <= 0) {
        return res.status(400).json({ error: 'VIP 티켓이 매진되었습니다.' });
      }
    } else if (ticketType === 'GENERAL') {
      if (event.generalTickets <= 0) {
        return res.status(400).json({ error: '일반 티켓이 매진되었습니다.' });
      }
    } else if (ticketType === 'SHAREHOLDER_ONLY') {
      if (shareholding < 1) {
        return res.status(403).json({
          error: '주주 전용 티켓은 주식 보유자만 구매할 수 있습니다.'
        });
      }
    }

    // 이미 티켓을 구매했는지 확인
    const existingTicket = await EventTicket.findOne({
      where: {
        eventId,
        userId
      }
    });

    if (existingTicket) {
      return res.status(400).json({ error: '이미 이 이벤트의 티켓을 보유하고 있습니다.' });
    }

    // 티켓 번호 및 QR 코드 생성
    const ticketNumber = crypto.randomUUID();
    const qrCode = `HIPO-EVENT-${eventId}-${ticketNumber}`;

    // 티켓 생성
    const ticket = await EventTicket.create({
      eventId,
      userId,
      ticketType,
      ticketNumber,
      qrCode,
      shareholdingAtPurchase: shareholding,
      purchasePrice: purchasePrice || 0
    });

    // 티켓 재고 감소
    if (ticketType === 'BACKSTAGE') {
      await event.update({
        backstageTickets: event.backstageTickets - 1,
        availableTickets: event.availableTickets - 1
      });
    } else if (ticketType === 'VIP') {
      await event.update({
        vipTickets: event.vipTickets - 1,
        availableTickets: event.availableTickets - 1
      });
    } else if (ticketType === 'GENERAL') {
      await event.update({
        generalTickets: event.generalTickets - 1,
        availableTickets: event.availableTickets - 1
      });
    }

    // 매진 확인
    if (event.availableTickets - 1 === 0) {
      await event.update({ status: 'SOLD_OUT' });
    }

    const ticketWithDetails = await EventTicket.findByPk(ticket.id, {
      include: [
        {
          model: Event,
          as: 'event',
          include: [{
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'profileImage']
          }]
        }
      ]
    });

    res.status(201).json({
      message: '티켓을 구매했습니다.',
      ticket: ticketWithDetails
    });
  } catch (error) {
    console.error('티켓 구매 오류:', error);
    res.status(500).json({ error: '티켓 구매 중 오류가 발생했습니다.' });
  }
};

/**
 * 내 티켓 목록 조회
 */
exports.getMyTickets = async (req, res) => {
  try {
    const userId = req.user.id;

    const tickets = await EventTicket.findAll({
      where: { userId },
      include: [{
        model: Event,
        as: 'event',
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profileImage']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ tickets });
  } catch (error) {
    console.error('티켓 목록 조회 오류:', error);
    res.status(500).json({ error: '티켓 목록 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 티켓 사용 (입장 처리, 크리에이터/관리자용)
 */
exports.useTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;

    const ticket = await EventTicket.findByPk(ticketId, {
      include: [{
        model: Event,
        as: 'event'
      }]
    });

    if (!ticket) {
      return res.status(404).json({ error: '티켓을 찾을 수 없습니다.' });
    }

    // 이벤트 주최자 확인
    if (ticket.event.creatorId !== userId) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    // 이미 사용된 티켓 확인
    if (ticket.isUsed) {
      return res.status(400).json({
        error: '이미 사용된 티켓입니다.',
        usedAt: ticket.usedAt
      });
    }

    await ticket.update({
      isUsed: true,
      usedAt: new Date()
    });

    res.json({
      message: '티켓이 사용 처리되었습니다.',
      ticket
    });
  } catch (error) {
    console.error('티켓 사용 처리 오류:', error);
    res.status(500).json({ error: '티켓 사용 처리 중 오류가 발생했습니다.' });
  }
};
