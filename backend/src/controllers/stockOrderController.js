const { User, Stock, Holding, StockOrder, StockTrade, Transaction, Wallet, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getIO } = require('../config/socket');

/**
 * 지정가/손절/익절 주문 생성
 */
exports.createOrder = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      stockId,
      orderType,      // 'BUY' or 'SELL'
      orderMode,      // 'limit', 'stop_loss', 'take_profit', 'stop_limit'
      quantity,
      limitPrice,     // 지정가
      stopPrice,      // 스탑 가격 (손절/익절 발동 조건)
      expiresIn       // 만료 시간 (시간 단위, 기본 24시간)
    } = req.body;

    const userId = req.user.id;

    // 입력 검증
    if (!stockId || !orderType || !orderMode || !quantity || quantity <= 0) {
      await t.rollback();
      return res.status(400).json({ error: '필수 항목을 모두 입력해주세요' });
    }

    if (!['BUY', 'SELL'].includes(orderType)) {
      await t.rollback();
      return res.status(400).json({ error: '유효하지 않은 주문 유형입니다' });
    }

    if (!['limit', 'stop_loss', 'take_profit', 'stop_limit'].includes(orderMode)) {
      await t.rollback();
      return res.status(400).json({ error: '유효하지 않은 주문 모드입니다. limit, stop_loss, take_profit, stop_limit 중 하나를 선택하세요' });
    }

    // 주식 정보 조회
    const stock = await Stock.findByPk(stockId, {
      include: [{ model: User, as: 'issuer', attributes: ['id', 'username', 'displayName'] }],
      transaction: t
    });

    if (!stock) {
      await t.rollback();
      return res.status(404).json({ error: '주식을 찾을 수 없습니다' });
    }

    // 자기 주식 매수 방지
    if (orderType === 'BUY' && stock.userId === userId) {
      await t.rollback();
      return res.status(400).json({ error: '자신의 주식은 매수할 수 없습니다' });
    }

    // 사용자 정보 조회
    const user = await User.findByPk(userId, { transaction: t });

    // 가격 검증
    let finalLimitPrice = limitPrice;
    let finalStopPrice = stopPrice;
    let triggerCondition = null;

    if (orderMode === 'limit') {
      if (!limitPrice || limitPrice <= 0) {
        await t.rollback();
        return res.status(400).json({ error: '지정가를 입력해주세요' });
      }
    } else if (orderMode === 'stop_loss') {
      // 손절: 현재가보다 낮은 가격에 도달하면 매도 발동
      if (!stopPrice || stopPrice <= 0) {
        await t.rollback();
        return res.status(400).json({ error: '손절가를 입력해주세요' });
      }
      if (stopPrice >= stock.sharePrice) {
        await t.rollback();
        return res.status(400).json({ error: '손절가는 현재가보다 낮아야 합니다' });
      }
      triggerCondition = 'lte'; // 이하일 때 발동
      finalLimitPrice = stopPrice; // 손절 시 시장가로 즉시 매도
    } else if (orderMode === 'take_profit') {
      // 익절: 현재가보다 높은 가격에 도달하면 매도 발동
      if (!stopPrice || stopPrice <= 0) {
        await t.rollback();
        return res.status(400).json({ error: '익절가를 입력해주세요' });
      }
      if (stopPrice <= stock.sharePrice) {
        await t.rollback();
        return res.status(400).json({ error: '익절가는 현재가보다 높아야 합니다' });
      }
      triggerCondition = 'gte'; // 이상일 때 발동
      finalLimitPrice = stopPrice;
    } else if (orderMode === 'stop_limit') {
      // 스탑 리밋: stopPrice 도달 시 limitPrice로 지정가 주문 발동
      if (!stopPrice || !limitPrice || stopPrice <= 0 || limitPrice <= 0) {
        await t.rollback();
        return res.status(400).json({ error: '스탑가와 지정가를 모두 입력해주세요' });
      }
      if (orderType === 'BUY') {
        triggerCondition = 'gte'; // 매수: 가격이 올라갈 때 발동
      } else {
        triggerCondition = 'lte'; // 매도: 가격이 내려갈 때 발동
      }
    }

    const totalAmount = quantity * (finalLimitPrice || stock.sharePrice);

    // 매수 시 잔액 검증 및 예약
    if (orderType === 'BUY') {
      if (user.poBalance < totalAmount) {
        await t.rollback();
        return res.status(400).json({
          error: 'PO가 부족합니다',
          required: totalAmount,
          available: user.poBalance
        });
      }

      // PO 예약 (실제 차감하지 않고 동결)
      // 주문이 체결되거나 취소될 때 처리
    }

    // 매도 시 보유 주식 검증
    if (orderType === 'SELL') {
      const holding = await Holding.findOne({
        where: { holderId: userId, stockId },
        transaction: t
      });

      if (!holding || holding.shares < quantity) {
        await t.rollback();
        return res.status(400).json({
          error: '보유 주식이 부족합니다',
          requested: quantity,
          available: holding ? holding.shares : 0
        });
      }
    }

    // 만료 시간 설정 (기본 24시간)
    const hours = expiresIn || 24;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    // 주문 생성
    const order = await StockOrder.create({
      userId,
      targetUserId: stock.userId,
      stockId,
      orderType,
      orderMode,
      quantity,
      pricePerShare: finalLimitPrice || stock.sharePrice,
      totalAmount,
      limitPrice: finalLimitPrice,
      stopPrice: finalStopPrice,
      triggerCondition,
      isTriggered: orderMode === 'limit', // 지정가는 즉시 활성화
      status: 'PENDING',
      expiresAt
    }, { transaction: t });

    await t.commit();

    // 실시간 알림
    try {
      const io = getIO();
      io.emit('order:created', {
        orderId: order.id,
        userId,
        stockId,
        orderType,
        orderMode,
        quantity,
        limitPrice: finalLimitPrice,
        stopPrice: finalStopPrice,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('주문 생성 알림 오류:', err);
    }

    res.json({
      message: '주문이 등록되었습니다',
      order: {
        id: order.id,
        stockId,
        stockName: stock.issuer?.displayName || stock.issuer?.username,
        orderType,
        orderMode,
        quantity,
        limitPrice: finalLimitPrice,
        stopPrice: finalStopPrice,
        totalAmount,
        status: order.status,
        expiresAt
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('주문 생성 오류:', error);
    res.status(500).json({ error: '주문 생성 중 오류가 발생했습니다' });
  }
};

/**
 * 주문 취소
 */
exports.cancelOrder = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await StockOrder.findOne({
      where: {
        id: orderId,
        userId,
        status: { [Op.in]: ['PENDING', 'PARTIAL'] }
      },
      transaction: t
    });

    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: '취소 가능한 주문을 찾을 수 없습니다' });
    }

    // 주문 취소
    await order.update({
      status: 'CANCELLED',
      cancelReason: '사용자 취소',
      cancelledAt: new Date()
    }, { transaction: t });

    await t.commit();

    // 실시간 알림
    try {
      const io = getIO();
      io.emit('order:cancelled', {
        orderId: order.id,
        userId,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('주문 취소 알림 오류:', err);
    }

    res.json({
      message: '주문이 취소되었습니다',
      orderId: order.id
    });
  } catch (error) {
    await t.rollback();
    console.error('주문 취소 오류:', error);
    res.status(500).json({ error: '주문 취소 중 오류가 발생했습니다' });
  }
};

/**
 * 내 주문 목록 조회
 */
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { userId };
    if (status) {
      whereClause.status = status;
    }

    const orders = await StockOrder.findAll({
      where: whereClause,
      include: [
        {
          model: Stock,
          as: 'stock',
          include: [{
            model: User,
            as: 'issuer',
            attributes: ['id', 'username', 'displayName', 'profileImage']
          }]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await StockOrder.count({ where: whereClause });

    // 활성 주문 요약
    const activeOrders = await StockOrder.count({
      where: { userId, status: { [Op.in]: ['PENDING', 'PARTIAL'] } }
    });

    res.json({
      orders,
      summary: {
        activeOrders,
        total
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('주문 목록 조회 오류:', error);
    res.status(500).json({ error: '주문 목록 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 주문 상세 조회
 */
exports.getOrderDetail = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await StockOrder.findOne({
      where: { id: orderId, userId },
      include: [
        {
          model: Stock,
          as: 'stock',
          include: [{
            model: User,
            as: 'issuer',
            attributes: ['id', 'username', 'displayName', 'profileImage']
          }]
        },
        {
          model: StockTrade,
          as: 'trades',
          include: [
            { model: User, as: 'buyer', attributes: ['username', 'displayName'] },
            { model: User, as: 'seller', attributes: ['username', 'displayName'] }
          ]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다' });
    }

    res.json({ order });
  } catch (error) {
    console.error('주문 상세 조회 오류:', error);
    res.status(500).json({ error: '주문 상세 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 특정 주식의 대기 주문 조회 (호가창용)
 */
exports.getStockOrders = async (req, res) => {
  try {
    const { stockId } = req.params;

    // 매수 대기 주문 (높은 가격순)
    const buyOrders = await StockOrder.findAll({
      where: {
        stockId,
        orderType: 'BUY',
        orderMode: 'limit',
        status: { [Op.in]: ['PENDING', 'PARTIAL'] },
        isTriggered: true
      },
      attributes: [
        'limitPrice',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount']
      ],
      group: ['limitPrice'],
      order: [['limitPrice', 'DESC']],
      limit: 10,
      raw: true
    });

    // 매도 대기 주문 (낮은 가격순)
    const sellOrders = await StockOrder.findAll({
      where: {
        stockId,
        orderType: 'SELL',
        orderMode: 'limit',
        status: { [Op.in]: ['PENDING', 'PARTIAL'] },
        isTriggered: true
      },
      attributes: [
        'limitPrice',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount']
      ],
      group: ['limitPrice'],
      order: [['limitPrice', 'ASC']],
      limit: 10,
      raw: true
    });

    // 최우선 호가
    const bestBid = buyOrders.length > 0 ? parseFloat(buyOrders[0].limitPrice) : null;
    const bestAsk = sellOrders.length > 0 ? parseFloat(sellOrders[0].limitPrice) : null;

    res.json({
      bids: buyOrders.map(o => ({
        price: parseFloat(o.limitPrice),
        quantity: parseInt(o.totalQuantity),
        orderCount: parseInt(o.orderCount)
      })),
      asks: sellOrders.map(o => ({
        price: parseFloat(o.limitPrice),
        quantity: parseInt(o.totalQuantity),
        orderCount: parseInt(o.orderCount)
      })),
      bestBid,
      bestAsk,
      spread: bestBid && bestAsk ? bestAsk - bestBid : null
    });
  } catch (error) {
    console.error('주식 주문 조회 오류:', error);
    res.status(500).json({ error: '주식 주문 조회 중 오류가 발생했습니다' });
  }
};
