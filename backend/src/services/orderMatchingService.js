/**
 * 주문 매칭 엔진 서비스
 * - 지정가 주문 매칭
 * - 손절/익절 조건 확인 및 발동
 * - 만료 주문 정리
 */

const { User, Stock, Holding, StockOrder, StockTrade, Transaction, Wallet, PriceHistory, CoinTransaction, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getIO } = require('../config/socket');
const { activeWhere } = require('./orderBookService');
const tradingTransaction = require('./tradingTransaction');
const { tradingDay, isTradable, priceBounds } = require('./marketRules');

class OrderMatchingService {
  constructor() {
    this.isRunning = false;
  }

  /**
   * 매칭 엔진 시작 (주기적 실행)
   */
  start(intervalMs = 5000) {
    if (this.isRunning) {
      console.log('주문 매칭 엔진이 이미 실행 중입니다');
      return;
    }

    this.isRunning = true;
    console.log(`주문 매칭 엔진 시작 (${intervalMs}ms 간격)`);

    this.interval = setInterval(async () => {
      try {
        await this.runMatchingCycle();
      } catch (error) {
        console.error('매칭 사이클 오류:', error);
      }
    }, intervalMs);
  }

  /**
   * 매칭 엔진 중지
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.isRunning = false;
      console.log('주문 매칭 엔진 중지');
    }
  }

  /**
   * 매칭 사이클 실행
   */
  async runMatchingCycle() {
    if (this.cycleRunning) return;
    this.cycleRunning = true;
    try {
      await this.cleanupExpiredOrders();
      await this.checkAndTriggerStopOrders();
      await this.matchLimitOrders();
    } finally { this.cycleRunning = false; }
  }

  /**
   * 스탑 주문 (손절/익절/스탑리밋) 조건 확인 및 발동
   */
  async checkAndTriggerStopOrders() {
    const t = await tradingTransaction();

    try {
      // 발동 대기 중인 스탑 주문 조회
      const pendingStopOrders = await StockOrder.findAll({
        where: {
          orderMode: { [Op.in]: ['stop_loss', 'take_profit', 'stop_limit'] },
          ...activeWhere(),
          isTriggered: false,
          stopPrice: { [Op.not]: null }
        },
        include: [{
          model: Stock,
          as: 'stock'
        }],
        transaction: t
      });

      for (const order of pendingStopOrders) {
        const currentPrice = order.stock.sharePrice;
        let shouldTrigger = false;

        if (order.triggerCondition === 'gte' && currentPrice >= order.stopPrice) {
          shouldTrigger = true;
        } else if (order.triggerCondition === 'lte' && currentPrice <= order.stopPrice) {
          shouldTrigger = true;
        }

        if (shouldTrigger) {
          await order.update({
            isTriggered: true,
            triggeredAt: new Date()
          }, { transaction: t });

          console.log(`스탑 주문 발동: ${order.id} (${order.orderMode})`);

          // 실시간 알림
          t.afterCommit(() => this.emitOrderTriggered(order));
        }
      }

      await t.commit();
    } catch (error) {
      await t.rollback();
      console.error('스탑 주문 확인 오류:', error);
    }
  }

  /**
   * 지정가 주문 매칭
   */
  async matchLimitOrders() {
    // 활성 주문이 있는 주식 ID 조회
    const activeStockIds = await StockOrder.findAll({
      where: {
        ...activeWhere(),
        isTriggered: true
      },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('stock_id')), 'stockId']],
      raw: true
    });

    // 각 주식별로 매칭 실행
    for (const { stockId } of activeStockIds) {
      if (stockId) {
        await this.matchOrdersForStock(stockId);
      }
    }
  }

  /**
   * 특정 주식의 주문 매칭
   */
  async matchOrdersForStock(stockId) {
    const t = await tradingTransaction();

    try {
      const stock = await Stock.findByPk(stockId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!isTradable(stock)) { await t.commit(); return; }
      const bounds = await priceBounds(stock, t);
      // 매수 주문 (높은 가격순)
      const buyOrders = await StockOrder.findAll({
        where: {
          stockId,
          orderType: 'BUY',
          ...activeWhere(),
          isTriggered: true
        },
        order: [['limitPrice', 'DESC'], ['createdAt', 'ASC'], ['id', 'ASC']],
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      // 매도 주문 (낮은 가격순)
      const sellOrders = await StockOrder.findAll({
        where: {
          stockId,
          orderType: 'SELL',
          ...activeWhere(),
          isTriggered: true
        },
        order: [['limitPrice', 'ASC'], ['createdAt', 'ASC'], ['id', 'ASC']],
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      // 매칭 실행
      for (const buyOrder of buyOrders) {
        for (const sellOrder of sellOrders) {
          // 이미 체결된 주문 건너뛰기
          if (!['PENDING', 'PARTIAL'].includes(buyOrder.status) || !['PENDING', 'PARTIAL'].includes(sellOrder.status) || buyOrder.userId === sellOrder.userId) {
            continue;
          }

          // 가격 조건 확인: 매수 지정가 >= 매도 지정가
          if (buyOrder.limitPrice >= sellOrder.limitPrice) {
            // 체결 가격: 먼저 등록된 주문의 가격 (시간 우선)
            const buyMarket = buyOrder.orderMode === 'market';
            const sellMarket = ['market', 'stop_loss', 'take_profit'].includes(sellOrder.orderMode);
            if (buyMarket && sellMarket) continue;
            const buyFirst = Number(buyOrder.createdAt) < Number(sellOrder.createdAt) ||
              (Number(buyOrder.createdAt) === Number(sellOrder.createdAt) && buyOrder.id < sellOrder.id);
            const executionPrice = buyMarket ? Number(sellOrder.limitPrice) : sellMarket ? Number(buyOrder.limitPrice) : buyFirst
              ? buyOrder.limitPrice
              : sellOrder.limitPrice;
            if (executionPrice < bounds.lowerLimit || executionPrice > bounds.upperLimit) continue;

            // 체결 수량: 두 주문 중 작은 잔여 수량
            const buyRemaining = buyOrder.quantity - buyOrder.filledQuantity;
            const sellRemaining = sellOrder.quantity - sellOrder.filledQuantity;
            const matchQuantity = Math.min(buyRemaining, sellRemaining);

            if (matchQuantity > 0) {
              await this.executeMatch(buyOrder, sellOrder, matchQuantity, executionPrice, t);
            }
          }
        }
      }

      // Market and triggered stop-market orders never rest in the book.
      for (const order of buyOrders.concat(sellOrders)) {
        if (['market', 'stop_loss', 'take_profit'].includes(order.orderMode) && ['PENDING', 'PARTIAL'].includes(order.status)) {
          await order.update({ status: 'CANCELLED', cancelReason: '즉시 체결 후 미체결 잔량 취소', cancelledAt: new Date() }, { transaction: t });
        }
      }
      await t.commit();
    } catch (error) {
      if (!t.finished) await t.rollback();
      console.error(`주식 ${stockId} 매칭 오류:`, error);
    }
  }

  /**
   * 매칭 체결 실행
   */
  async executeMatch(buyOrder, sellOrder, quantity, price, transaction) {
    const totalAmount = quantity * price;

    // 매수자 정보
    const participants = await User.findAll({ where: { id: { [Op.in]: [buyOrder.userId, sellOrder.userId] } }, order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
    const buyer = participants.find(user => user.id === buyOrder.userId);
    // 매도자 정보
    const seller = participants.find(user => user.id === sellOrder.userId);
    // 주식 정보
    const stock = await Stock.findByPk(buyOrder.stockId, { transaction });

    // 잔액 검증 (매수자)
    if (buyer.poBalance < totalAmount) {
      console.log(`매수자 잔액 부족: ${buyer.id}`);
      await buyOrder.update({
        status: 'CANCELLED',
        cancelReason: '잔액 부족',
        cancelledAt: new Date()
      }, { transaction });
      return;
    }

    // 보유량 검증 (매도자)
    const sellerHolding = await Holding.findOne({
      where: { holderId: seller.id, stockId: stock.id },
      transaction
    });

    if (!sellerHolding || sellerHolding.shares < quantity) {
      console.log(`매도자 보유량 부족: ${seller.id}`);
      await sellOrder.update({
        status: 'CANCELLED',
        cancelReason: '보유량 부족',
        cancelledAt: new Date()
      }, { transaction });
      return;
    }

    // === 체결 처리 ===

    // 1. 매수자 PO 차감
    await buyer.update({
      poBalance: buyer.poBalance - totalAmount
    }, { transaction });

    const buyerWallet = await Wallet.findOne({
      where: { userId: buyer.id },
      transaction
    });
    if (buyerWallet) {
      await buyerWallet.update({
        poBalance: buyer.poBalance,
        totalPOSpent: parseFloat(buyerWallet.totalPOSpent) + totalAmount
      }, { transaction });
    }

    // 2. 매도자 PO 증가
    await seller.update({
      poBalance: Number(seller.poBalance) + totalAmount
    }, { transaction });

    const sellerWallet = await Wallet.findOne({
      where: { userId: seller.id },
      transaction
    });
    if (sellerWallet) {
      await sellerWallet.update({
        poBalance: seller.poBalance
      }, { transaction });
    }

    // 3. 매수자 보유 주식 업데이트
    const [buyerHolding, created] = await Holding.findOrCreate({
      where: { holderId: buyer.id, stockId: stock.id },
      defaults: {
        shares: quantity,
        averagePrice: price,
        acquiredAt: new Date()
      },
      transaction
    });

    if (!created) {
      const newTotalShares = buyerHolding.shares + quantity;
      const newAveragePrice = Math.floor(
        (buyerHolding.averagePrice * buyerHolding.shares + totalAmount) / newTotalShares
      );
      await buyerHolding.update({
        shares: newTotalShares,
        averagePrice: newAveragePrice
      }, { transaction });
    }

    // 4. 매도자 보유 주식 감소
    if (sellerHolding.shares === quantity) {
      await sellerHolding.destroy({ transaction });
    } else {
      await sellerHolding.update({
        shares: sellerHolding.shares - quantity
      }, { transaction });
    }

    // 5. 거래 기록 생성
    const trade = await StockTrade.create({
      buyOrderId: buyOrder.id,
      sellOrderId: sellOrder.id,
      buyerId: buyer.id,
      sellerId: seller.id,
      targetUserId: stock.userId,
      quantity,
      pricePerShare: price,
      totalAmount
    }, { transaction });

    await CoinTransaction.bulkCreate([
      { userId: buyer.id, coinType: 'PO', transactionType: 'SPEND', source: 'STOCK_PURCHASE', amount: -totalAmount,
        balanceAfter: buyer.poBalance, relatedId: trade.id, description: `${quantity}주 매수` },
      { userId: seller.id, coinType: 'PO', transactionType: 'EARN', source: 'STOCK_SELL', amount: totalAmount,
        balanceAfter: seller.poBalance, relatedId: trade.id, description: `${quantity}주 매도` }
    ], { transaction });
    // 6. 거래 내역 저장
    await Transaction.create({
      buyerId: buyer.id,
      sellerId: seller.id,
      stockId: stock.id,
      shares: quantity,
      pricePerShare: price,
      totalAmount,
      transactionType: 'buy'
    }, { transaction });

    // 7. 주문 상태 업데이트
    const buyFilled = buyOrder.filledQuantity + quantity;
    const sellFilled = sellOrder.filledQuantity + quantity;
    const buyValue = Number(await StockTrade.sum('totalAmount', { where: { buyOrderId: buyOrder.id }, transaction }));
    const sellValue = Number(await StockTrade.sum('totalAmount', { where: { sellOrderId: sellOrder.id }, transaction }));

    await buyOrder.update({
      filledQuantity: buyFilled,
      status: buyFilled >= buyOrder.quantity ? 'FILLED' : 'PARTIAL',
      averageFilledPrice: buyValue / buyFilled,
      filledAt: buyFilled >= buyOrder.quantity ? new Date() : null
    }, { transaction });

    await sellOrder.update({
      filledQuantity: sellFilled,
      status: sellFilled >= sellOrder.quantity ? 'FILLED' : 'PARTIAL',
      averageFilledPrice: sellValue / sellFilled,
      filledAt: sellFilled >= sellOrder.quantity ? new Date() : null
    }, { transaction });

    console.log(`체결: ${quantity}주 @ ${price} PO (매수: ${buyer.username}, 매도: ${seller.username})`);

    // 8. 실시간 알림
    const timestamp = new Date();
    const day = tradingDay(timestamp);
    const todayVolume = await Transaction.sum('shares', { where: { stockId: stock.id, createdAt: { [Op.gte]: day } }, transaction });
    const { referencePrice: previous } = await priceBounds(stock, transaction);
    await stock.update({ sharePrice: price, dayVolume: todayVolume,
      shareholderCount: await Holding.count({ where: { stockId: stock.id, shares: { [Op.gt]: 0 } }, transaction }),
      previousClose: previous,
      marketCapTotal: price * stock.issuedShares,
      priceChangePercent: previous > 0 ? (price - previous) / previous * 100 : 0
    }, { transaction });
    for (const [timeframe, duration] of [['1m', 60000], ['5m', 300000], ['15m', 900000], ['1h', 3600000], ['1d', 86400000]]) {
      const bucket = timeframe === '1d' ? day : new Date(Math.floor(timestamp.getTime() / duration) * duration);
      const candle = await PriceHistory.findOne({ where: { stockId: stock.id, timeframe, timestamp: bucket }, transaction });
      if (candle) await candle.update({ high: Math.max(Number(candle.high), price), low: Math.min(Number(candle.low), price), close: price, volume: candle.volume + quantity }, { transaction });
      else await PriceHistory.create({ stockId: stock.id, timeframe, timestamp: bucket, open: price, high: price, low: price, close: price, volume: quantity }, { transaction });
    }
    const dailyCandle = await PriceHistory.findOne({ where: { stockId: stock.id, timeframe: '1d', timestamp: day }, transaction });
    await stock.update({ dayOpen: Number(dailyCandle.open), dayHigh: Number(dailyCandle.high), dayLow: Number(dailyCandle.low) }, { transaction });
    transaction.afterCommit(() => this.emitTradeExecuted(trade, buyer, seller, stock, quantity, price));
  }

  /**
   * 평균 체결가 계산
   */
  calculateAveragePrice(order, newQuantity, newPrice) {
    if (order.filledQuantity === 0) {
      return newPrice;
    }
    const totalValue = (order.averageFilledPrice || 0) * order.filledQuantity + newPrice * newQuantity;
    const totalQuantity = order.filledQuantity + newQuantity;
    return Math.floor(totalValue / totalQuantity);
  }

  /**
   * 만료 주문 정리
   */
  async cleanupExpiredOrders() {
    const t = await tradingTransaction();

    try {
      const now = new Date();

      const expiredOrders = await StockOrder.findAll({
        where: {
          engineVersion: 2,
          status: { [Op.in]: ['PENDING', 'PARTIAL'] },
          expiresAt: { [Op.lt]: now }
        },
        transaction: t
      });

      for (const order of expiredOrders) {
        await order.update({
          status: 'CANCELLED',
          cancelReason: '주문 만료',
          cancelledAt: now
        }, { transaction: t });

        console.log(`만료 주문 취소: ${order.id}`);
        t.afterCommit(() => this.emitOrderExpired(order));
      }

      await t.commit();

      if (expiredOrders.length > 0) {
        console.log(`${expiredOrders.length}개의 만료 주문 정리 완료`);
      }
    } catch (error) {
      await t.rollback();
      console.error('만료 주문 정리 오류:', error);
    }
  }

  /**
   * 실시간 알림: 스탑 주문 발동
   */
  emitOrderTriggered(order) {
    try {
      const io = getIO();
      io.to(`user:${order.userId}`).emit('order:triggered', {
        orderId: order.id,
        orderMode: order.orderMode,
        stockId: order.stockId,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('스탑 발동 알림 오류:', err);
    }
  }

  /**
   * 실시간 알림: 체결
   */
  emitTradeExecuted(trade, buyer, seller, stock, quantity, price) {
    try {
      const io = getIO();

      // 전체 브로드캐스트
      io.emit('stock:price_update', {
        stock: { stockId: stock.id, userId: stock.userId, sharePrice: price, priceChangePercent: Number(stock.priceChangePercent), dayVolume: stock.dayVolume },
        userId: stock.userId, newPrice: price, changePercent: Number(stock.priceChangePercent), timestamp: new Date()
      });
      io.emit('trade:executed', {
        tradeId: trade.id,
        stockId: stock.id,
        quantity,
        price,
        totalAmount: quantity * price,
        timestamp: new Date()
      });

      // 매수자에게 알림
      io.to(`user:${buyer.id}`).emit('order:filled', {
        tradeId: trade.id,
        orderType: 'BUY',
        stockId: stock.id,
        quantity,
        price,
        totalAmount: quantity * price
      });

      // 매도자에게 알림
      io.to(`user:${seller.id}`).emit('order:filled', {
        tradeId: trade.id,
        orderType: 'SELL',
        stockId: stock.id,
        quantity,
        price,
        totalAmount: quantity * price
      });
    } catch (err) {
      console.error('체결 알림 오류:', err);
    }
  }

  /**
   * 실시간 알림: 주문 만료
   */
  emitOrderExpired(order) {
    try {
      const io = getIO();
      io.to(`user:${order.userId}`).emit('order:expired', {
        orderId: order.id,
        stockId: order.stockId,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('만료 알림 오류:', err);
    }
  }

  /**
   * 수동 매칭 실행 (테스트/관리용)
   */
  async runOnce() {
    console.log('수동 매칭 사이클 실행');
    await this.runMatchingCycle();
    console.log('수동 매칭 사이클 완료');
  }
}

// 싱글톤 인스턴스
const orderMatchingService = new OrderMatchingService();

module.exports = orderMatchingService;
