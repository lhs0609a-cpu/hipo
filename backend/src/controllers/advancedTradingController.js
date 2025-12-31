const { User, Stock, StockOrder, Holding, Transaction, PriceHistory, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getIO } = require('../config/socket');

/**
 * 지정가 주문 생성
 */
exports.createLimitOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { stockId, orderType, quantity, limitPrice, expiresIn = 24 } = req.body;
    const userId = req.user.id;

    // 입력 검증
    if (!stockId || !orderType || !quantity || !limitPrice) {
      await t.rollback();
      return res.status(400).json({ error: '필수 항목을 모두 입력해주세요' });
    }

    const stock = await Stock.findByPk(stockId, { transaction: t });
    if (!stock) {
      await t.rollback();
      return res.status(404).json({ error: '주식을 찾을 수 없습니다' });
    }

    // 주식 상태 확인
    if (stock.status !== 'active') {
      await t.rollback();
      return res.status(400).json({ error: '현재 거래가 중지된 주식입니다' });
    }

    // 서킷브레이커 확인
    if (stock.circuitBreakerTriggered && new Date() < stock.circuitBreakerEndTime) {
      await t.rollback();
      return res.status(400).json({ error: '서킷브레이커 발동으로 거래가 일시 중단되었습니다' });
    }

    const user = await User.findByPk(userId, { transaction: t });
    const totalAmount = limitPrice * quantity;
    const fee = Math.floor(totalAmount * parseFloat(stock.tradingFeeRate || 0.0025));

    // 매수 주문시 잔액 확인
    if (orderType === 'BUY') {
      if (user.poBalance < totalAmount + fee) {
        await t.rollback();
        return res.status(400).json({ error: 'PO가 부족합니다', required: totalAmount + fee, available: user.poBalance });
      }
      // 잔액 예약 (차감)
      await user.update({ poBalance: user.poBalance - (totalAmount + fee) }, { transaction: t });
    }

    // 매도 주문시 보유량 확인
    if (orderType === 'SELL') {
      const holding = await Holding.findOne({
        where: { holderId: userId, stockId },
        transaction: t
      });
      if (!holding || holding.shares < quantity) {
        await t.rollback();
        return res.status(400).json({ error: '보유 주식이 부족합니다' });
      }
    }

    // 주문 생성
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);
    const order = await StockOrder.create({
      userId,
      stockId,
      targetUserId: stock.userId,
      orderType,
      orderMode: 'limit',
      quantity,
      pricePerShare: limitPrice,
      limitPrice,
      totalAmount,
      fee,
      status: 'PENDING',
      expiresAt
    }, { transaction: t });

    await t.commit();

    // 즉시 체결 시도
    await this.tryMatchOrder(order.id);

    res.json({
      message: '지정가 주문이 등록되었습니다',
      order: {
        id: order.id,
        orderType,
        quantity,
        limitPrice,
        totalAmount,
        fee,
        expiresAt,
        status: order.status
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('지정가 주문 오류:', error);
    res.status(500).json({ error: '주문 처리 중 오류가 발생했습니다' });
  }
};

/**
 * 손절/익절 주문 생성
 */
exports.createStopOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { stockId, orderType, quantity, stopPrice, limitPrice, triggerCondition } = req.body;
    const userId = req.user.id;

    if (!stockId || !orderType || !quantity || !stopPrice || !triggerCondition) {
      await t.rollback();
      return res.status(400).json({ error: '필수 항목을 모두 입력해주세요' });
    }

    const stock = await Stock.findByPk(stockId, { transaction: t });
    if (!stock) {
      await t.rollback();
      return res.status(404).json({ error: '주식을 찾을 수 없습니다' });
    }

    // 매도 주문시 보유량 확인
    if (orderType === 'SELL') {
      const holding = await Holding.findOne({
        where: { holderId: userId, stockId },
        transaction: t
      });
      if (!holding || holding.shares < quantity) {
        await t.rollback();
        return res.status(400).json({ error: '보유 주식이 부족합니다' });
      }
    }

    const orderMode = triggerCondition === 'lte' ? 'stop_loss' : 'take_profit';
    const order = await StockOrder.create({
      userId,
      stockId,
      targetUserId: stock.userId,
      orderType,
      orderMode,
      quantity,
      pricePerShare: limitPrice || stopPrice,
      stopPrice,
      limitPrice: limitPrice || stopPrice,
      triggerCondition,
      totalAmount: (limitPrice || stopPrice) * quantity,
      status: 'PENDING',
      isTriggered: false
    }, { transaction: t });

    await t.commit();

    res.json({
      message: `${orderMode === 'stop_loss' ? '손절' : '익절'} 주문이 등록되었습니다`,
      order: {
        id: order.id,
        orderType,
        orderMode,
        quantity,
        stopPrice,
        limitPrice: limitPrice || stopPrice,
        triggerCondition,
        status: 'PENDING'
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('손절/익절 주문 오류:', error);
    res.status(500).json({ error: '주문 처리 중 오류가 발생했습니다' });
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
      where: { id: orderId, userId },
      transaction: t
    });

    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: '주문을 찾을 수 없습니다' });
    }

    if (order.status !== 'PENDING' && order.status !== 'PARTIAL') {
      await t.rollback();
      return res.status(400).json({ error: '취소할 수 없는 주문 상태입니다' });
    }

    // 매수 주문이었다면 예약금 환불
    if (order.orderType === 'BUY') {
      const remainingQuantity = order.quantity - order.filledQuantity;
      const refundAmount = order.limitPrice * remainingQuantity + order.fee;
      const user = await User.findByPk(userId, { transaction: t });
      await user.update({ poBalance: user.poBalance + refundAmount }, { transaction: t });
    }

    await order.update({
      status: 'CANCELLED',
      cancelReason: '사용자 취소',
      cancelledAt: new Date()
    }, { transaction: t });

    await t.commit();

    res.json({ message: '주문이 취소되었습니다' });
  } catch (error) {
    await t.rollback();
    console.error('주문 취소 오류:', error);
    res.status(500).json({ error: '주문 취소 중 오류가 발생했습니다' });
  }
};

/**
 * 내 미체결 주문 조회
 */
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'PENDING' } = req.query;

    const whereClause = { userId };
    if (status !== 'all') {
      whereClause.status = status;
    }

    const orders = await StockOrder.findAll({
      where: whereClause,
      include: [{
        model: Stock,
        as: 'stock',
        include: [{ model: User, as: 'issuer', attributes: ['username', 'profileImage'] }]
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ orders });
  } catch (error) {
    console.error('주문 조회 오류:', error);
    res.status(500).json({ error: '주문 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 주문 체결 시도 (내부 함수)
 */
exports.tryMatchOrder = async (orderId) => {
  const t = await sequelize.transaction();
  try {
    const order = await StockOrder.findByPk(orderId, {
      include: [{ model: Stock, as: 'stock' }],
      transaction: t,
      lock: true
    });

    if (!order || order.status !== 'PENDING') {
      await t.rollback();
      return;
    }

    const stock = order.stock || await Stock.findByPk(order.stockId, { transaction: t });
    const currentPrice = stock.sharePrice;

    // 지정가 체결 조건 확인
    let shouldFill = false;
    if (order.orderMode === 'limit') {
      if (order.orderType === 'BUY' && currentPrice <= order.limitPrice) shouldFill = true;
      if (order.orderType === 'SELL' && currentPrice >= order.limitPrice) shouldFill = true;
    }

    if (shouldFill) {
      // 체결 처리
      const filledPrice = Math.min(order.limitPrice, currentPrice);
      await this.executeOrder(order, filledPrice, t);
    }

    await t.commit();
  } catch (error) {
    await t.rollback();
    console.error('주문 체결 오류:', error);
  }
};

/**
 * 주문 실행 (내부 함수)
 */
exports.executeOrder = async (order, price, transaction) => {
  const t = transaction || await sequelize.transaction();
  try {
    const stock = await Stock.findByPk(order.stockId, { transaction: t });
    const user = await User.findByPk(order.userId, { transaction: t });
    const quantity = order.quantity - order.filledQuantity;
    const totalAmount = price * quantity;
    const fee = Math.floor(totalAmount * parseFloat(stock.tradingFeeRate || 0.0025));

    if (order.orderType === 'BUY') {
      // 보유 주식 추가
      const [holding, created] = await Holding.findOrCreate({
        where: { holderId: order.userId, stockId: order.stockId },
        defaults: { shares: quantity, averagePrice: price },
        transaction: t
      });

      if (!created) {
        const newTotal = holding.shares + quantity;
        const newAvg = Math.floor((holding.averagePrice * holding.shares + totalAmount) / newTotal);
        await holding.update({ shares: newTotal, averagePrice: newAvg }, { transaction: t });
      }

      // 거래 기록
      await Transaction.create({
        buyerId: order.userId,
        stockId: order.stockId,
        shares: quantity,
        pricePerShare: price,
        totalAmount,
        transactionType: 'buy'
      }, { transaction: t });

      // 발행량 증가
      await stock.update({
        issuedShares: stock.issuedShares + quantity,
        dayVolume: (stock.dayVolume || 0) + quantity
      }, { transaction: t });
    } else {
      // SELL
      const holding = await Holding.findOne({
        where: { holderId: order.userId, stockId: order.stockId },
        transaction: t
      });

      if (holding.shares === quantity) {
        await holding.destroy({ transaction: t });
      } else {
        await holding.update({ shares: holding.shares - quantity }, { transaction: t });
      }

      // PO 지급
      await user.update({ poBalance: user.poBalance + totalAmount - fee }, { transaction: t });

      // 거래 기록
      await Transaction.create({
        sellerId: order.userId,
        stockId: order.stockId,
        shares: quantity,
        pricePerShare: price,
        totalAmount,
        transactionType: 'sell'
      }, { transaction: t });

      // 발행량 감소
      await stock.update({
        issuedShares: stock.issuedShares - quantity,
        dayVolume: (stock.dayVolume || 0) + quantity
      }, { transaction: t });
    }

    // 주문 상태 업데이트
    await order.update({
      filledQuantity: order.quantity,
      averageFilledPrice: price,
      status: 'FILLED',
      filledAt: new Date()
    }, { transaction: t });

    if (!transaction) await t.commit();

    // 실시간 알림
    try {
      const io = getIO();
      io.to(`user:${order.userId}`).emit('order:filled', {
        orderId: order.id,
        orderType: order.orderType,
        quantity,
        price,
        totalAmount
      });
    } catch (err) {}
  } catch (error) {
    if (!transaction) await t.rollback();
    throw error;
  }
};

/**
 * 스탑 주문 체크 (가격 변동시 호출)
 */
exports.checkStopOrders = async (stockId, newPrice) => {
  try {
    const pendingStops = await StockOrder.findAll({
      where: {
        stockId,
        status: 'PENDING',
        isTriggered: false,
        orderMode: { [Op.in]: ['stop_loss', 'take_profit', 'stop_limit'] }
      }
    });

    for (const order of pendingStops) {
      let triggered = false;
      if (order.triggerCondition === 'lte' && newPrice <= order.stopPrice) triggered = true;
      if (order.triggerCondition === 'gte' && newPrice >= order.stopPrice) triggered = true;

      if (triggered) {
        await order.update({ isTriggered: true, triggeredAt: new Date() });
        await this.tryMatchOrder(order.id);
      }
    }
  } catch (error) {
    console.error('스탑 주문 체크 오류:', error);
  }
};

/**
 * 상한가/하한가 확인
 */
exports.checkPriceLimit = async (stockId, proposedPrice) => {
  const stock = await Stock.findByPk(stockId);
  if (!stock || !stock.previousClose) return { allowed: true, proposedPrice };

  const limit = parseFloat(stock.dailyPriceLimit) / 100;
  const upperLimit = Math.floor(stock.previousClose * (1 + limit));
  const lowerLimit = Math.floor(stock.previousClose * (1 - limit));

  if (proposedPrice > upperLimit) {
    return { allowed: false, message: '상한가 도달', limitPrice: upperLimit };
  }
  if (proposedPrice < lowerLimit) {
    return { allowed: false, message: '하한가 도달', limitPrice: lowerLimit };
  }

  return { allowed: true, proposedPrice };
};

/**
 * 서킷브레이커 발동
 */
exports.triggerCircuitBreaker = async (stockId, durationMinutes = 20) => {
  try {
    const stock = await Stock.findByPk(stockId);
    if (!stock) return;

    await stock.update({
      circuitBreakerTriggered: true,
      circuitBreakerEndTime: new Date(Date.now() + durationMinutes * 60 * 1000)
    });

    // 모든 미체결 주문 알림
    const io = getIO();
    io.emit('stock:circuit_breaker', {
      stockId,
      endTime: stock.circuitBreakerEndTime,
      message: '급격한 가격 변동으로 거래가 일시 중단되었습니다'
    });
  } catch (error) {
    console.error('서킷브레이커 발동 오류:', error);
  }
};
