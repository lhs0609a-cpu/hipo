const { StockOrder, StockTrade, Wallet, CoinTransaction, User, StockTransaction, ShareholderCommunity, CommunityMember } = require('../models');
const { sequelize } = require('../config/database');
const { getShareholding } = require('../utils/shareholderHelper');
const { processReferralCommission } = require('./referralController');
const { autoAssignShareholderBadge } = require('./badgeController');
const { selectRoomAdmin } = require('./communityAdminController');

/**
 * 주식 매수 주문
 */
exports.createBuyOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { targetUserId, quantity, pricePerShare } = req.body;

    if (!targetUserId || !quantity || !pricePerShare) {
      await transaction.rollback();
      return res.status(400).json({
        error: '대상 사용자, 수량, 가격이 필요합니다.'
      });
    }

    if (quantity <= 0 || pricePerShare <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: '수량과 가격은 0보다 커야 합니다.' });
    }

    const totalAmount = parseFloat(pricePerShare) * quantity;

    // 지갑 확인 및 잔액 체크
    const [wallet] = await Wallet.findOrCreate({
      where: { userId },
      defaults: { balance: 0 },
      transaction
    });

    if (parseFloat(wallet.balance) < totalAmount) {
      await transaction.rollback();
      return res.status(400).json({
        error: '잔액이 부족합니다.',
        required: totalAmount,
        current: parseFloat(wallet.balance)
      });
    }

    // 매수 주문 생성
    const order = await StockOrder.create({
      userId,
      targetUserId,
      orderType: 'BUY',
      quantity,
      pricePerShare,
      totalAmount,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간 후 만료
    }, { transaction });

    // 주문 금액만큼 잔액 차감 (예치)
    await wallet.update({
      balance: parseFloat(wallet.balance) - totalAmount
    }, { transaction });

    // 코인 거래 내역 생성
    await CoinTransaction.create({
      userId,
      transactionType: 'STOCK_PURCHASE',
      amount: -totalAmount,
      balanceAfter: parseFloat(wallet.balance) - totalAmount,
      relatedId: order.id,
      description: `주식 매수 주문 (${quantity}주 @ ${pricePerShare} 코인)`
    }, { transaction });

    await transaction.commit();

    // 매칭 시도
    await matchOrders(order.id);

    const orderWithDetails = await StockOrder.findByPk(order.id, {
      include: [
        {
          model: User,
          as: 'targetUser',
          attributes: ['id', 'username', 'profileImage']
        }
      ]
    });

    res.status(201).json({
      message: '매수 주문이 등록되었습니다.',
      order: orderWithDetails
    });
  } catch (error) {
    await transaction.rollback();
    console.error('매수 주문 오류:', error);
    res.status(500).json({ error: '매수 주문 중 오류가 발생했습니다.' });
  }
};

/**
 * 주식 매도 주문
 */
exports.createSellOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { targetUserId, quantity, pricePerShare } = req.body;

    if (!targetUserId || !quantity || !pricePerShare) {
      await transaction.rollback();
      return res.status(400).json({
        error: '대상 사용자, 수량, 가격이 필요합니다.'
      });
    }

    // 보유 주식 확인
    const shareholding = await getShareholding(userId, targetUserId);

    if (shareholding < quantity) {
      await transaction.rollback();
      return res.status(400).json({
        error: '보유 주식이 부족합니다.',
        required: quantity,
        current: shareholding
      });
    }

    const totalAmount = parseFloat(pricePerShare) * quantity;

    // 매도 주문 생성
    const order = await StockOrder.create({
      userId,
      targetUserId,
      orderType: 'SELL',
      quantity,
      pricePerShare,
      totalAmount,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }, { transaction });

    await transaction.commit();

    // 매칭 시도
    await matchOrders(order.id);

    const orderWithDetails = await StockOrder.findByPk(order.id, {
      include: [
        {
          model: User,
          as: 'targetUser',
          attributes: ['id', 'username', 'profileImage']
        }
      ]
    });

    res.status(201).json({
      message: '매도 주문이 등록되었습니다.',
      order: orderWithDetails
    });
  } catch (error) {
    await transaction.rollback();
    console.error('매도 주문 오류:', error);
    res.status(500).json({ error: '매도 주문 중 오류가 발생했습니다.' });
  }
};

/**
 * 주문 매칭 엔진 (간단한 버전)
 */
async function matchOrders(newOrderId) {
  const transaction = await sequelize.transaction();

  try {
    const newOrder = await StockOrder.findByPk(newOrderId, { transaction });

    if (!newOrder || newOrder.status !== 'PENDING') {
      await transaction.commit();
      return;
    }

    // 반대 주문 찾기
    const oppositeType = newOrder.orderType === 'BUY' ? 'SELL' : 'BUY';

    const matchingOrders = await StockOrder.findAll({
      where: {
        targetUserId: newOrder.targetUserId,
        orderType: oppositeType,
        status: ['PENDING', 'PARTIAL']
      },
      order: [
        // 가격 우선 (매수는 높은 가격, 매도는 낮은 가격)
        oppositeType === 'SELL' ? ['pricePerShare', 'ASC'] : ['pricePerShare', 'DESC'],
        // 시간 우선
        ['createdAt', 'ASC']
      ],
      transaction
    });

    for (const matchOrder of matchingOrders) {
      if (newOrder.filledQuantity >= newOrder.quantity) break;

      // 가격 매칭 확인
      if (newOrder.orderType === 'BUY' && parseFloat(newOrder.pricePerShare) < parseFloat(matchOrder.pricePerShare)) continue;
      if (newOrder.orderType === 'SELL' && parseFloat(newOrder.pricePerShare) > parseFloat(matchOrder.pricePerShare)) continue;

      // 체결 수량 계산
      const remainingNew = newOrder.quantity - newOrder.filledQuantity;
      const remainingMatch = matchOrder.quantity - matchOrder.filledQuantity;
      const tradeQuantity = Math.min(remainingNew, remainingMatch);

      // 체결 가격 (먼저 주문한 가격으로 체결)
      const tradePrice = matchOrder.pricePerShare;
      const tradeAmount = parseFloat(tradePrice) * tradeQuantity;

      // 체결 기록 생성
      const trade = await StockTrade.create({
        buyOrderId: newOrder.orderType === 'BUY' ? newOrder.id : matchOrder.id,
        sellOrderId: newOrder.orderType === 'SELL' ? newOrder.id : matchOrder.id,
        buyerId: newOrder.orderType === 'BUY' ? newOrder.userId : matchOrder.userId,
        sellerId: newOrder.orderType === 'SELL' ? newOrder.userId : matchOrder.userId,
        targetUserId: newOrder.targetUserId,
        quantity: tradeQuantity,
        pricePerShare: tradePrice,
        totalAmount: tradeAmount
      }, { transaction });

      // 주문 상태 업데이트
      await newOrder.update({
        filledQuantity: newOrder.filledQuantity + tradeQuantity,
        status: (newOrder.filledQuantity + tradeQuantity >= newOrder.quantity) ? 'FILLED' : 'PARTIAL'
      }, { transaction });

      await matchOrder.update({
        filledQuantity: matchOrder.filledQuantity + tradeQuantity,
        status: (matchOrder.filledQuantity + tradeQuantity >= matchOrder.quantity) ? 'FILLED' : 'PARTIAL'
      }, { transaction });

      // 주식 소유권 이전
      await StockTransaction.create({
        buyerId: trade.buyerId,
        sellerId: trade.sellerId,
        targetUserId: trade.targetUserId,
        quantity: tradeQuantity,
        pricePerShare: tradePrice,
        totalAmount: tradeAmount,
        transactionType: 'buy'
      }, { transaction });

      // 매도자에게 대금 지급
      const [sellerWallet] = await Wallet.findOrCreate({
        where: { userId: trade.sellerId },
        defaults: { balance: 0 },
        transaction
      });

      await sellerWallet.update({
        balance: parseFloat(sellerWallet.balance) + tradeAmount
      }, { transaction });

      await CoinTransaction.create({
        userId: trade.sellerId,
        transactionType: 'STOCK_SALE',
        amount: tradeAmount,
        balanceAfter: parseFloat(sellerWallet.balance) + tradeAmount,
        relatedId: trade.id,
        description: `주식 매도 체결 (${tradeQuantity}주 @ ${tradePrice} 코인)`
      }, { transaction });

      // 추천인 보상 지급 (구매자 기준)
      await processReferralCommission(trade.buyerId, tradeAmount);

      // 주주 뱃지 자동 업데이트 (구매자)
      const buyerShares = await getShareholding(trade.buyerId, trade.targetUserId);
      await autoAssignShareholderBadge(trade.buyerId, trade.targetUserId, buyerShares);

      // 주주 뱃지 자동 업데이트 (판매자)
      const sellerShares = await getShareholding(trade.sellerId, trade.targetUserId);
      await autoAssignShareholderBadge(trade.sellerId, trade.targetUserId, sellerShares);

      // 커뮤니티 멤버 주식 업데이트 및 방장 재선출
      const community = await ShareholderCommunity.findOne({
        where: { creatorId: trade.targetUserId },
        transaction
      });

      if (community) {
        // 구매자 주식 업데이트
        const buyerMember = await CommunityMember.findOne({
          where: { communityId: community.id, userId: trade.buyerId },
          transaction
        });
        if (buyerMember) {
          await buyerMember.update({
            currentShareholding: buyerShares
          }, { transaction });
        }

        // 판매자 주식 업데이트
        const sellerMember = await CommunityMember.findOne({
          where: { communityId: community.id, userId: trade.sellerId },
          transaction
        });
        if (sellerMember) {
          await sellerMember.update({
            currentShareholding: sellerShares
          }, { transaction });
        }

        // 방장 재선출
        await selectRoomAdmin(community.id);
      }
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('주문 매칭 오류:', error);
  }
}

/**
 * 내 주문 목록
 */
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const where = { userId };
    if (status) where.status = status;

    const orders = await StockOrder.findAll({
      where,
      include: [
        {
          model: User,
          as: 'targetUser',
          attributes: ['id', 'username', 'profileImage']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ orders });
  } catch (error) {
    console.error('주문 목록 조회 오류:', error);
    res.status(500).json({ error: '주문 목록 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 주문 취소
 */
exports.cancelOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await StockOrder.findByPk(orderId, { transaction });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }

    if (order.userId !== userId) {
      await transaction.rollback();
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    if (order.status === 'FILLED' || order.status === 'CANCELLED') {
      await transaction.rollback();
      return res.status(400).json({ error: '취소할 수 없는 주문입니다.' });
    }

    // 매수 주문인 경우 잔액 환불
    if (order.orderType === 'BUY') {
      const remainingQty = order.quantity - order.filledQuantity;
      const refundAmount = parseFloat(order.pricePerShare) * remainingQty;

      const wallet = await Wallet.findOne({ where: { userId }, transaction });
      await wallet.update({
        balance: parseFloat(wallet.balance) + refundAmount
      }, { transaction });

      await CoinTransaction.create({
        userId,
        transactionType: 'STOCK_PURCHASE',
        amount: refundAmount,
        balanceAfter: parseFloat(wallet.balance) + refundAmount,
        relatedId: orderId,
        description: '주문 취소 환불'
      }, { transaction });
    }

    await order.update({ status: 'CANCELLED' }, { transaction });

    await transaction.commit();

    res.json({ message: '주문이 취소되었습니다.' });
  } catch (error) {
    await transaction.rollback();
    console.error('주문 취소 오류:', error);
    res.status(500).json({ error: '주문 취소 중 오류가 발생했습니다.' });
  }
};

/**
 * 거래 내역 조회
 */
exports.getMarketTrades = async (req, res) => {
  try {
    const { targetUserId } = req.query;

    const where = {};
    if (targetUserId) where.targetUserId = targetUserId;

    const trades = await StockTrade.findAll({
      where,
      include: [
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'username']
        },
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'username']
        },
        {
          model: User,
          as: 'targetUser',
          attributes: ['id', 'username', 'profileImage']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json({ trades });
  } catch (error) {
    console.error('거래 내역 조회 오류:', error);
    res.status(500).json({ error: '거래 내역 조회 중 오류가 발생했습니다.' });
  }
};
