const { Merchandise, MerchandiseOrder, User } = require('../models');
const { getShareholding } = require('../utils/shareholderHelper');

/**
 * 굿즈 생성 (크리에이터용)
 */
exports.createMerchandise = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const {
      name,
      description,
      imageUrl,
      price,
      totalStock,
      merchandiseType = 'GENERAL',
      minSharesRequired = 0,
      shareholderOnly = false,
      earlyAccessStartsAt,
      publicSaleStartsAt,
      salesEndsAt
    } = req.body;

    if (!name || !price || !totalStock) {
      return res.status(400).json({
        error: '굿즈 이름, 가격, 재고가 필요합니다.'
      });
    }

    const merchandise = await Merchandise.create({
      creatorId,
      name,
      description,
      imageUrl,
      price,
      totalStock,
      availableStock: totalStock,
      merchandiseType,
      minSharesRequired,
      shareholderOnly,
      earlyAccessStartsAt,
      publicSaleStartsAt,
      salesEndsAt,
      status: 'UPCOMING'
    });

    res.status(201).json({
      message: '굿즈가 생성되었습니다.',
      merchandise
    });
  } catch (error) {
    console.error('굿즈 생성 오류:', error);
    res.status(500).json({ error: '굿즈 생성 중 오류가 발생했습니다.' });
  }
};

/**
 * 굿즈 목록 조회
 */
exports.getMerchandises = async (req, res) => {
  try {
    const { creatorId, status, merchandiseType } = req.query;
    const where = {};

    if (creatorId) where.creatorId = creatorId;
    if (status) where.status = status;
    if (merchandiseType) where.merchandiseType = merchandiseType;

    const merchandises = await Merchandise.findAll({
      where,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'profileImage']
      }],
      order: [['createdAt', 'DESC']]
    });

    // 현재 시간에 따라 판매 상태 업데이트
    const now = new Date();
    for (const merch of merchandises) {
      if (merch.availableStock === 0 && merch.status !== 'SOLD_OUT') {
        await merch.update({ status: 'SOLD_OUT' });
      } else if (now > new Date(merch.salesEndsAt) && merch.status !== 'ENDED') {
        await merch.update({ status: 'ENDED' });
      } else if (now >= new Date(merch.publicSaleStartsAt) && merch.status === 'EARLY_ACCESS') {
        await merch.update({ status: 'PUBLIC_SALE' });
      } else if (now >= new Date(merch.earlyAccessStartsAt) && merch.status === 'UPCOMING') {
        await merch.update({ status: 'EARLY_ACCESS' });
      }
    }

    res.json({ merchandises });
  } catch (error) {
    console.error('굿즈 목록 조회 오류:', error);
    res.status(500).json({ error: '굿즈 목록 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 굿즈 구매
 */
exports.purchaseMerchandise = async (req, res) => {
  try {
    const { merchandiseId } = req.params;
    const { quantity = 1, shippingAddress } = req.body;
    const userId = req.user.id;

    const merchandise = await Merchandise.findByPk(merchandiseId);

    if (!merchandise) {
      return res.status(404).json({ error: '굿즈를 찾을 수 없습니다.' });
    }

    // 재고 확인
    if (merchandise.availableStock < quantity) {
      return res.status(400).json({
        error: '재고가 부족합니다.',
        availableStock: merchandise.availableStock
      });
    }

    // 판매 상태 확인
    const now = new Date();
    const isEarlyAccess = now >= new Date(merchandise.earlyAccessStartsAt) &&
                          now < new Date(merchandise.publicSaleStartsAt);
    const isPublicSale = now >= new Date(merchandise.publicSaleStartsAt) &&
                         now < new Date(merchandise.salesEndsAt);

    if (!isEarlyAccess && !isPublicSale) {
      return res.status(400).json({ error: '현재 구매 가능한 시간이 아닙니다.' });
    }

    // 주주 권한 확인
    const shareholding = await getShareholding(userId, merchandise.creatorId);

    // 주주 전용 굿즈인 경우
    if (merchandise.shareholderOnly && shareholding < merchandise.minSharesRequired) {
      return res.status(403).json({
        error: `이 굿즈는 ${merchandise.minSharesRequired}주 이상 보유한 주주만 구매할 수 있습니다.`,
        currentShares: shareholding,
        requiredShares: merchandise.minSharesRequired
      });
    }

    // 우선 구매 시간에는 최소 주식 수 확인
    if (isEarlyAccess && shareholding < merchandise.minSharesRequired) {
      return res.status(403).json({
        error: `주주 우선 구매는 ${merchandise.minSharesRequired}주 이상 보유자만 가능합니다.`,
        currentShares: shareholding,
        requiredShares: merchandise.minSharesRequired,
        publicSaleStartsAt: merchandise.publicSaleStartsAt
      });
    }

    const totalPrice = parseFloat(merchandise.price) * quantity;

    // 주문 생성
    const order = await MerchandiseOrder.create({
      merchandiseId,
      userId,
      quantity,
      totalPrice,
      shareholdingAtOrder: shareholding,
      isEarlyAccess,
      orderStatus: 'PENDING',
      shippingAddress
    });

    // 재고 감소
    await merchandise.update({
      availableStock: merchandise.availableStock - quantity
    });

    // 재고 소진 시 상태 변경
    if (merchandise.availableStock - quantity === 0) {
      await merchandise.update({ status: 'SOLD_OUT' });
    }

    const orderWithDetails = await MerchandiseOrder.findByPk(order.id, {
      include: [
        {
          model: Merchandise,
          as: 'merchandise',
          include: [{
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'profileImage']
          }]
        }
      ]
    });

    res.status(201).json({
      message: '굿즈를 구매했습니다.',
      order: orderWithDetails
    });
  } catch (error) {
    console.error('굿즈 구매 오류:', error);
    res.status(500).json({ error: '굿즈 구매 중 오류가 발생했습니다.' });
  }
};

/**
 * 내 주문 내역 조회
 */
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await MerchandiseOrder.findAll({
      where: { userId },
      include: [{
        model: Merchandise,
        as: 'merchandise',
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profileImage']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ orders });
  } catch (error) {
    console.error('주문 내역 조회 오류:', error);
    res.status(500).json({ error: '주문 내역 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 주문 상태 업데이트 (크리에이터용)
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus, trackingNumber } = req.body;
    const userId = req.user.id;

    const order = await MerchandiseOrder.findByPk(orderId, {
      include: [{
        model: Merchandise,
        as: 'merchandise'
      }]
    });

    if (!order) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }

    // 크리에이터 확인
    if (order.merchandise.creatorId !== userId) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    await order.update({
      orderStatus,
      trackingNumber: trackingNumber || order.trackingNumber
    });

    res.json({
      message: '주문 상태가 업데이트되었습니다.',
      order
    });
  } catch (error) {
    console.error('주문 상태 업데이트 오류:', error);
    res.status(500).json({ error: '주문 상태 업데이트 중 오류가 발생했습니다.' });
  }
};
