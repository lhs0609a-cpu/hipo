/**
 * 주문 매칭 엔진 서비스
 * - 지정가 주문 매칭
 * - 손절/익절 조건 확인 및 발동
 * - 만료 주문 정리
 */

const { User, Stock, Holding, StockOrder, StockTrade, Transaction, Wallet, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getIO, sendTradeTick } = require('../config/socket');
const { broadcastOrderBook } = require('./orderBookService');
const stockPriceService = require('./stockPriceService');
const { updateBalance } = require('../utils/balanceService');
const { isCircuitBreakerActive } = require('../utils/circuitBreaker');
const { checkDailyTradeLimit, recordDailyTradeAmount } = require('../utils/dailyTradeLimit');
const { applyTradePrice } = require('../utils/priceEngine');

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
    // 1. 스탑 주문 조건 확인 및 발동
    await this.checkAndTriggerStopOrders();

    // 2. 지정가 주문 매칭
    await this.matchLimitOrders();

    // 3. 만료 주문 정리
    await this.cleanupExpiredOrders();
  }

  /**
   * 스탑 주문 (손절/익절/스탑리밋) 조건 확인 및 발동
   */
  async checkAndTriggerStopOrders() {
    const t = await sequelize.transaction();

    try {
      // 발동 대기 중인 스탑 주문 조회
      const pendingStopOrders = await StockOrder.findAll({
        where: {
          orderMode: { [Op.in]: ['stop_loss', 'take_profit', 'stop_limit'] },
          status: 'PENDING',
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
          this.emitOrderTriggered(order);
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
        status: { [Op.in]: ['PENDING', 'PARTIAL'] },
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
    const t = await sequelize.transaction();

    try {
      // 매수 주문 (높은 가격순)
      const buyOrders = await StockOrder.findAll({
        where: {
          stockId,
          orderType: 'BUY',
          status: { [Op.in]: ['PENDING', 'PARTIAL'] },
          isTriggered: true
        },
        order: [['limitPrice', 'DESC'], ['createdAt', 'ASC']],
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      // 매도 주문 (낮은 가격순)
      const sellOrders = await StockOrder.findAll({
        where: {
          stockId,
          orderType: 'SELL',
          status: { [Op.in]: ['PENDING', 'PARTIAL'] },
          isTriggered: true
        },
        order: [['limitPrice', 'ASC'], ['createdAt', 'ASC']],
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      // 매칭 실행
      for (const buyOrder of buyOrders) {
        for (const sellOrder of sellOrders) {
          // 이미 체결된 주문 건너뛰기
          if (buyOrder.status === 'FILLED' || sellOrder.status === 'FILLED') {
            continue;
          }

          // 가격 조건 확인: 매수 지정가 >= 매도 지정가
          if (buyOrder.limitPrice >= sellOrder.limitPrice) {
            // 체결 가격: 먼저 등록된 주문의 가격 (시간 우선)
            const executionPrice = buyOrder.createdAt < sellOrder.createdAt
              ? buyOrder.limitPrice
              : sellOrder.limitPrice;

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

      await t.commit();
    } catch (error) {
      await t.rollback();
      console.error(`주식 ${stockId} 매칭 오류:`, error);
    }
  }

  /**
   * 매칭 체결 실행
   */
  async executeMatch(buyOrder, sellOrder, quantity, price, transaction) {
    const totalAmount = quantity * price;

    // 매수자 정보
    const buyer = await User.findByPk(buyOrder.userId, { transaction });
    // 매도자 정보
    const seller = await User.findByPk(sellOrder.userId, { transaction });
    // 주식 정보
    const stock = await Stock.findByPk(buyOrder.stockId, { transaction });

    // 서킷브레이커 확인
    if (isCircuitBreakerActive(stock)) {
      console.log(`서킷브레이커 활성: stockId=${stock.id}, 매칭 스킵`);
      return;
    }

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

    // 일일 거래 한도 확인 (매수자)
    const buyerTradeCheck = await checkDailyTradeLimit(buyer, totalAmount, transaction);
    if (!buyerTradeCheck.allowed) {
      console.log(`매수자 일일 한도 초과: ${buyer.id}`);
      await buyOrder.update({
        status: 'CANCELLED',
        cancelReason: '일일 거래 한도 초과',
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

    // 1. 매수자 PO 차감 (User + Wallet 동시)
    await updateBalance(buyer.id, -totalAmount, {
      transaction,
      walletFields: { totalPOSpent: totalAmount }
    });

    // 2. 매도자 PO 증가 (User + Wallet 동시)
    await updateBalance(seller.id, totalAmount, { transaction });

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

    // 6. 거래 내역 저장
    await Transaction.create({
      buyerId: buyer.id,
      sellerId: seller.id,
      stockId: stock.id,
      shares: quantity,
      pricePerShare: price,
      totalAmount,
      transactionType: 'trade'
    }, { transaction });

    // 7. 주문 상태 업데이트
    const buyFilled = buyOrder.filledQuantity + quantity;
    const sellFilled = sellOrder.filledQuantity + quantity;

    await buyOrder.update({
      filledQuantity: buyFilled,
      status: buyFilled >= buyOrder.quantity ? 'FILLED' : 'PARTIAL',
      averageFilledPrice: this.calculateAveragePrice(buyOrder, quantity, price),
      filledAt: buyFilled >= buyOrder.quantity ? new Date() : null
    }, { transaction });

    await sellOrder.update({
      filledQuantity: sellFilled,
      status: sellFilled >= sellOrder.quantity ? 'FILLED' : 'PARTIAL',
      averageFilledPrice: this.calculateAveragePrice(sellOrder, quantity, price),
      filledAt: sellFilled >= sellOrder.quantity ? new Date() : null
    }, { transaction });

    // 8. 일일 거래 사용량 기록
    await recordDailyTradeAmount(buyer, totalAmount, transaction);
    await recordDailyTradeAmount(seller, totalAmount, transaction);

    console.log(`체결: ${quantity}주 @ ${price} PO (매수: ${buyer.username}, 매도: ${seller.username})`);

    // 9. 체결가 = 현재가 반영 (호가 매칭 체결가가 곧 시장가)
    await applyTradePrice(stock, price, { volume: quantity, transaction });

    // 10. 실시간 알림
    this.emitTradeExecuted(trade, buyer, seller, stock, quantity, price);
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
    const t = await sequelize.transaction();

    try {
      const now = new Date();

      const expiredOrders = await StockOrder.findAll({
        where: {
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
        this.emitOrderExpired(order);
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
      io.emit('trade:executed', {
        tradeId: trade.id,
        stockId: stock.id,
        quantity,
        price,
        totalAmount: quantity * price,
        timestamp: new Date()
      });

      // 종목 구독자에게 체결 한 건 (체결 내역 화면용)
      sendTradeTick(stock.id, {
        id: trade.id,
        quantity,
        price,
        totalAmount: quantity * price
      });

      // 체결로 잔량이 바뀌었으므로 호가창을 다시 만들어 보낸다.
      // await 하지 않는다 — 체결 경로를 소켓 I/O 로 지연시키지 않기 위함.
      broadcastOrderBook(stock.id);

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
