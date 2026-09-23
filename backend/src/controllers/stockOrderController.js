const { User, Stock, Holding, StockOrder, StockTrade, Transaction, Wallet, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getIO } = require('../config/socket');
const { reservations, getOrderBook } = require('../services/orderBookService');
const matching = require('../services/orderMatchingService');
const tradingTransaction = require('../services/tradingTransaction');
const { isTradable, priceBounds } = require('../services/marketRules');

/**
 * 지정가/손절/익절 주문 생성
 */
exports.createOrder = async (req, res) => {
  const t = await tradingTransaction();

  try {
    const {
      stockId,
      orderType,      // 'BUY' or 'SELL'
      orderMode,      // 'limit', 'stop_loss', 'take_profit', 'stop_limit'
      quantity,
      limitPrice,     // 지정가
      stopPrice,      // 스탑 가격 (손절/익절 발동 조건)
      expiresIn,
      triggerCondition: requestedTrigger
    } = req.body;

    const userId = req.user.id;

    // 입력 검증
    if (!stockId || !orderType || !orderMode || !Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 100000000) {
      await t.rollback();
      return res.status(400).json({ error: '필수 항목을 모두 입력해주세요' });
    }

    if (!['BUY', 'SELL'].includes(orderType)) {
      await t.rollback();
      return res.status(400).json({ error: '유효하지 않은 주문 유형입니다' });
    }

    if (!['market', 'limit', 'stop_loss', 'take_profit', 'stop_limit'].includes(orderMode)) {
      await t.rollback();
      return res.status(400).json({ error: '유효하지 않은 주문 모드입니다. limit, stop_loss, take_profit, stop_limit 중 하나를 선택하세요' });
    }

    // 주식 정보 조회
    const stock = await Stock.findByPk(stockId, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!stock) {
      await t.rollback();
      return res.status(404).json({ error: '주식을 찾을 수 없습니다' });
    }
    if (!isTradable(stock)) {
      await t.rollback();
      return res.status(400).json({ error: '현재 거래할 수 없는 종목입니다' });
    }
    if (['stop_loss', 'take_profit'].includes(orderMode) && orderType !== 'SELL') {
      await t.rollback();
      return res.status(400).json({ error: '손절·익절은 매도 주문에서 사용할 수 있습니다' });
    }
    if ((limitPrice != null && (!Number.isSafeInteger(limitPrice) || limitPrice <= 0)) ||
        (stopPrice != null && (!Number.isSafeInteger(stopPrice) || stopPrice <= 0)) ||
        (expiresIn != null && (!Number.isFinite(expiresIn) || expiresIn <= 0 || expiresIn > 720))) {
      await t.rollback();
      return res.status(400).json({ error: '가격은 양의 정수, 유효기간은 0~720시간 범위여야 합니다' });
    }

    // 자기 주식 매수 방지
    if (orderType === 'BUY' && stock.userId === userId) {
      await t.rollback();
      return res.status(400).json({ error: '자신의 주식은 매수할 수 없습니다' });
    }

    // 사용자 정보 조회
    const user = await User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
    const issuer = await User.findByPk(stock.userId, { attributes: ['username', 'displayName'], transaction: t });
    const reserved = await reservations(userId, stockId, t);
    const bounds = await priceBounds(stock, t);

    // 가격 검증
    let finalLimitPrice = limitPrice;
    let finalStopPrice = stopPrice;
    let triggerCondition = null;

    if (orderMode === 'market') {
      // Explicit execution protection; never invent liquidity.
      finalLimitPrice = limitPrice || (orderType === 'BUY' ? bounds.upperLimit : bounds.lowerLimit);
    } else if (orderMode === 'limit') {
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
      finalLimitPrice = 1; // 발동 후 상대 매수 호가로 체결
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
      finalLimitPrice = 1;
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

    if (requestedTrigger != null && !['gte', 'lte'].includes(requestedTrigger)) {
      await t.rollback(); return res.status(400).json({ error: '유효하지 않은 발동 조건입니다' });
    }
    if (orderMode === 'stop_limit' && requestedTrigger) triggerCondition = requestedTrigger;
    const totalAmount = quantity * (finalLimitPrice || stock.sharePrice);
    if (['market', 'limit', 'stop_limit'].includes(orderMode) && (finalLimitPrice < bounds.lowerLimit || finalLimitPrice > bounds.upperLimit)) {
      await t.rollback();
      return res.status(400).json({ error: `주문 가격은 ${bounds.lowerLimit}~${bounds.upperLimit} PO 범위여야 합니다` });
    }
    if (!Number.isSafeInteger(totalAmount) || totalAmount > 2147483647) {
      await t.rollback();
      return res.status(400).json({ error: '주문 금액이 허용 범위를 초과했습니다' });
    }

    // 매수 시 잔액 검증 및 예약
    if (orderType === 'BUY') {
      if (Number(user.poBalance) - reserved.cash < totalAmount) {
        await t.rollback();
        return res.status(400).json({
          error: 'PO가 부족합니다',
          required: totalAmount,
          available: Math.max(0, Number(user.poBalance) - reserved.cash)
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

      if (!holding || holding.shares - reserved.shares < quantity) {
        await t.rollback();
        return res.status(400).json({
          error: '보유 주식이 부족합니다',
          requested: quantity,
          available: holding ? Math.max(0, holding.shares - reserved.shares) : 0
        });
      }
    }

    // 만료 시간 설정 (기본 24시간)
    const hours = expiresIn || 24;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    // 주문 생성
    const order = await StockOrder.create({
      engineVersion: 2,
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
      isTriggered: ['limit', 'market'].includes(orderMode),
      status: 'PENDING',
      expiresAt
    }, { transaction: t });

    await t.commit();

    // 실시간 알림
    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('order:created', {
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

    await matching.matchOrdersForStock(stockId);
    await order.reload();
    const filledAmount = Number(await StockTrade.sum('totalAmount', {
      where: { [Op.or]: [{ buyOrderId: order.id }, { sellOrderId: order.id }] }
    }) || 0);
    res.json({
      message: '주문이 등록되었습니다',
      order: {
        id: order.id,
        stockId,
        stockName: issuer?.displayName || issuer?.username,
        orderType,
        orderMode,
        quantity,
        limitPrice: finalLimitPrice,
        stopPrice: finalStopPrice,
        totalAmount,
        status: order.status,
        filledQuantity: order.filledQuantity,
        averageFilledPrice: order.averageFilledPrice,
        filledAmount,
        cancelReason: order.cancelReason,
        expiresAt
      }
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error('주문 생성 오류:', error);
    res.status(500).json({ error: '주문 생성 중 오류가 발생했습니다' });
  }
};

/**
 * 주문 취소
 */
exports.cancelOrder = async (req, res) => {
  const t = await tradingTransaction();

  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await StockOrder.findOne({
      where: {
        id: orderId,
        userId,
        status: { [Op.in]: ['PENDING', 'PARTIAL'] }
      },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: '취소 가능한 주문을 찾을 수 없습니다' });
    }

    if (order.engineVersion !== 2) {
      await t.rollback();
      return res.status(409).json({ error: '기존 주문은 원장 이관 후 처리할 수 있습니다' });
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
      io.to(`user:${userId}`).emit('order:cancelled', {
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
    const { status } = req.query;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
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
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다' });
    }

    const trades = await StockTrade.findAll({
      where: { [Op.or]: [{ buyOrderId: order.id }, { sellOrderId: order.id }] },
      order: [['createdAt', 'ASC']]
    });
    res.json({ order: { ...order.toJSON(), trades } });
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
    const book = await getOrderBook(req.params.stockId);
    if (!book) return res.status(404).json({ error: '주식을 찾을 수 없습니다' });
    res.json(book);
  } catch (error) {
    console.error('호가 조회 오류:', error);
    res.status(500).json({ error: '호가를 불러오지 못했습니다' });
  }
};

exports.getTradingAccount = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const holding = await Holding.findOne({ where: { holderId: req.user.id, stockId: req.params.stockId } });
    const reserved = await reservations(req.user.id, req.params.stockId);
    res.json({ balance: Number(user.poBalance), reservedBalance: reserved.cash,
      availableBalance: Math.max(0, Number(user.poBalance) - reserved.cash),
      shares: holding?.shares || 0, reservedShares: reserved.shares, lockedShares: reserved.lockedShares,
      availableShares: Math.max(0, (holding?.shares || 0) - reserved.shares) });
  } catch (error) { res.status(500).json({ error: '주문 가능 잔고를 불러오지 못했습니다' }); }
};

// Cancel/replace is atomic and receives new time priority. Filled trades stay on the original order.
exports.amendOrder = async (req, res) => {
  const t = await tradingTransaction();
  try {
    const { quantity, limitPrice } = req.body;
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || !Number.isSafeInteger(limitPrice) || limitPrice <= 0 || quantity * limitPrice > 2147483647) {
      await t.rollback(); return res.status(400).json({ error: '정정할 잔량과 가격을 양의 정수로 입력해주세요' });
    }
    const original = await StockOrder.findOne({ where: { id: req.params.orderId, userId: req.user.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!original || original.engineVersion !== 2 || !['PENDING', 'PARTIAL'].includes(original.status) || original.orderMode !== 'limit' || (original.expiresAt && original.expiresAt <= new Date())) {
      await t.rollback(); return res.status(400).json({ error: '유효한 지정가 미체결 주문만 정정할 수 있습니다' });
    }
    const stock = await Stock.findByPk(original.stockId, { transaction: t });
    if (!isTradable(stock)) { await t.rollback(); return res.status(400).json({ error: '현재 거래할 수 없는 종목입니다' }); }
    const bounds = await priceBounds(stock, t);
    if (limitPrice < bounds.lowerLimit || limitPrice > bounds.upperLimit) { await t.rollback(); return res.status(400).json({ error: '정정 가격이 가격제한폭을 벗어났습니다' }); }
    const user = await User.findByPk(req.user.id, { transaction: t, lock: t.LOCK.UPDATE });
    await original.update({ status: 'CANCELLED', cancelReason: '주문 정정', cancelledAt: new Date() }, { transaction: t });
    const reserved = await reservations(user.id, stock.id, t);
    const holding = await Holding.findOne({ where: { holderId: user.id, stockId: stock.id }, transaction: t });
    if ((original.orderType === 'BUY' && Number(user.poBalance) - reserved.cash < quantity * limitPrice) ||
        (original.orderType === 'SELL' && (holding?.shares || 0) - reserved.shares < quantity)) {
      await t.rollback(); return res.status(400).json({ error: '정정할 주문의 가용 잔고 또는 수량이 부족합니다' });
    }
    const order = await StockOrder.create({ engineVersion: 2, userId: user.id, targetUserId: stock.userId, stockId: stock.id,
      orderType: original.orderType, orderMode: 'limit', quantity, limitPrice, pricePerShare: limitPrice,
      totalAmount: quantity * limitPrice, isTriggered: true, status: 'PENDING', expiresAt: original.expiresAt }, { transaction: t });
    await t.commit();
    await matching.matchOrdersForStock(stock.id);
    await order.reload();
    res.json({ order, replacedOrderId: original.id });
  } catch (error) {
    if (!t.finished) await t.rollback();
    res.status(500).json({ error: '주문 정정에 실패했습니다' });
  }
};
