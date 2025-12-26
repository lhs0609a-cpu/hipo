const { StockTransaction, User } = require('../models');
const { getShareholderStatus, getShareholding } = require('../utils/shareholderHelper');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * 주식 매수 (주주 혜택 시스템용)
 */
exports.buyShares = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const buyerId = req.user.id;
    const { targetUserId, quantity, pricePerShare } = req.body;

    if (!targetUserId || !quantity || !pricePerShare || quantity <= 0 || pricePerShare <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: '유효하지 않은 입력입니다.' });
    }

    // 자기 자신의 주식은 매수할 수 없음
    if (buyerId === targetUserId) {
      await transaction.rollback();
      return res.status(400).json({ error: '본인의 주식은 매수할 수 없습니다.' });
    }

    const totalAmount = quantity * pricePerShare;

    // 구매자 정보
    const buyer = await User.findByPk(buyerId, { transaction });

    if (!buyer) {
      await transaction.rollback();
      return res.status(404).json({ error: '구매자를 찾을 수 없습니다.' });
    }

    // 잔액 확인 (PO 잔액)
    if (buyer.poBalance < totalAmount) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'PO가 부족합니다.',
        required: totalAmount,
        available: buyer.poBalance
      });
    }

    // PO 차감
    buyer.poBalance -= totalAmount;
    await buyer.save({ transaction });

    // 판매자에게 PO 지급
    const seller = await User.findByPk(targetUserId, { transaction });
    if (seller) {
      seller.poBalance += totalAmount;
      await seller.save({ transaction });
    }

    // 거래 기록 생성
    const stockTransaction = await StockTransaction.create({
      buyerId,
      sellerId: targetUserId, // 초기 발행자는 대상 사용자
      targetUserId,
      quantity,
      pricePerShare,
      totalAmount,
      transactionType: 'buy'
    }, { transaction });

    await transaction.commit();

    // 업데이트된 주주 상태 조회
    const shareholderStatus = await getShareholderStatus(buyerId, targetUserId);

    res.status(201).json({
      message: '주식 매수가 완료되었습니다.',
      transaction: stockTransaction,
      shareholderStatus,
      newBalance: buyer.poBalance
    });
  } catch (error) {
    await transaction.rollback();
    console.error('주식 매수 오류:', error);
    res.status(500).json({ error: '주식 매수 중 오류가 발생했습니다.' });
  }
};

/**
 * 주식 매도
 */
exports.sellShares = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const sellerId = req.user.id;
    const { targetUserId, quantity, pricePerShare } = req.body;

    if (!targetUserId || !quantity || !pricePerShare || quantity <= 0 || pricePerShare <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: '유효하지 않은 입력입니다.' });
    }

    // 현재 보유 주식 수 확인
    const currentHolding = await getShareholding(sellerId, targetUserId);

    if (currentHolding < quantity) {
      await transaction.rollback();
      return res.status(400).json({
        error: '보유 주식이 부족합니다.',
        requested: quantity,
        available: currentHolding
      });
    }

    const totalAmount = quantity * pricePerShare;

    // 판매자 정보
    const seller = await User.findByPk(sellerId, { transaction });

    if (!seller) {
      await transaction.rollback();
      return res.status(404).json({ error: '판매자를 찾을 수 없습니다.' });
    }

    // PO 지급
    seller.poBalance += totalAmount;
    await seller.save({ transaction });

    // 구매자로부터 PO 차감 (실제 거래소에서는 구매자가 있어야 함)
    // 여기서는 간단히 대상 사용자가 buyback하는 것으로 처리
    const buyer = await User.findByPk(targetUserId, { transaction });
    if (buyer) {
      if (buyer.poBalance < totalAmount) {
        await transaction.rollback();
        return res.status(400).json({
          error: '구매자의 PO가 부족합니다.'
        });
      }
      buyer.poBalance -= totalAmount;
      await buyer.save({ transaction });
    }

    // 거래 기록 생성
    const stockTransaction = await StockTransaction.create({
      buyerId: targetUserId, // buyback의 경우
      sellerId,
      targetUserId,
      quantity,
      pricePerShare,
      totalAmount,
      transactionType: 'sell'
    }, { transaction });

    await transaction.commit();

    // 업데이트된 주주 상태 조회
    const shareholderStatus = await getShareholderStatus(sellerId, targetUserId);

    res.json({
      message: '주식 매도가 완료되었습니다.',
      transaction: stockTransaction,
      shareholderStatus,
      newBalance: seller.poBalance
    });
  } catch (error) {
    await transaction.rollback();
    console.error('주식 매도 오류:', error);
    res.status(500).json({ error: '주식 매도 중 오류가 발생했습니다.' });
  }
};

/**
 * 주식 양도 (무료 전송)
 */
exports.transferShares = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const fromUserId = req.user.id;
    const { toUserId, targetUserId, quantity } = req.body;

    if (!toUserId || !targetUserId || !quantity || quantity <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: '유효하지 않은 입력입니다.' });
    }

    // 본인에게 양도 불가
    if (fromUserId === toUserId) {
      await transaction.rollback();
      return res.status(400).json({ error: '본인에게 주식을 양도할 수 없습니다.' });
    }

    // 현재 보유 주식 수 확인
    const currentHolding = await getShareholding(fromUserId, targetUserId);

    if (currentHolding < quantity) {
      await transaction.rollback();
      return res.status(400).json({
        error: '보유 주식이 부족합니다.',
        requested: quantity,
        available: currentHolding
      });
    }

    // 양도인의 주식 감소 (매도 거래로 기록)
    await StockTransaction.create({
      buyerId: toUserId,
      sellerId: fromUserId,
      targetUserId,
      quantity,
      pricePerShare: 0,
      totalAmount: 0,
      transactionType: 'transfer'
    }, { transaction });

    await transaction.commit();

    // 업데이트된 주주 상태 조회
    const fromStatus = await getShareholderStatus(fromUserId, targetUserId);
    const toStatus = await getShareholderStatus(toUserId, targetUserId);

    res.json({
      message: '주식 양도가 완료되었습니다.',
      from: fromStatus,
      to: toStatus
    });
  } catch (error) {
    await transaction.rollback();
    console.error('주식 양도 오류:', error);
    res.status(500).json({ error: '주식 양도 중 오류가 발생했습니다.' });
  }
};

/**
 * 주식 부여 (관리자 기능)
 */
exports.grantShares = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const granterId = req.user.id;
    const { toUserId, targetUserId, quantity } = req.body;

    if (!toUserId || !targetUserId || !quantity || quantity <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: '유효하지 않은 입력입니다.' });
    }

    // 대상 사용자 본인만 자신의 주식을 부여할 수 있음
    if (granterId !== targetUserId) {
      await transaction.rollback();
      return res.status(403).json({ error: '본인의 주식만 부여할 수 있습니다.' });
    }

    // 주식 부여 기록 생성
    await StockTransaction.create({
      buyerId: toUserId,
      sellerId: granterId,
      targetUserId,
      quantity,
      pricePerShare: 0,
      totalAmount: 0,
      transactionType: 'grant'
    }, { transaction });

    await transaction.commit();

    // 업데이트된 주주 상태 조회
    const shareholderStatus = await getShareholderStatus(toUserId, targetUserId);

    res.status(201).json({
      message: '주식 부여가 완료되었습니다.',
      shareholderStatus
    });
  } catch (error) {
    await transaction.rollback();
    console.error('주식 부여 오류:', error);
    res.status(500).json({ error: '주식 부여 중 오류가 발생했습니다.' });
  }
};

/**
 * 특정 사용자의 주식 거래 내역 조회
 */
exports.getTransactionHistory = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await StockTransaction.findAndCountAll({
      where: { targetUserId },
      include: [
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'targetUser',
          attributes: ['id', 'username', 'profilePicture']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      transactions: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('거래 내역 조회 오류:', error);
    res.status(500).json({ error: '거래 내역 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 내 주주 상태 조회
 */
exports.getMyShareholderStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.params;

    const status = await getShareholderStatus(userId, targetUserId);

    res.json(status);
  } catch (error) {
    console.error('주주 상태 조회 오류:', error);
    res.status(500).json({ error: '주주 상태 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 특정 사용자의 주주 목록 조회
 */
exports.getShareholders = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // 모든 거래를 집계하여 주주 목록 생성
    const transactions = await StockTransaction.findAll({
      where: { targetUserId },
      attributes: [
        'buyerId',
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN buyer_id = user_id THEN quantity ELSE 0 END')), 'bought'],
        [sequelize.literal('(SELECT SUM(quantity) FROM stock_transactions WHERE seller_id = stock_transactions.buyer_id AND target_user_id = stock_transactions.target_user_id)'), 'sold']
      ],
      group: ['buyerId'],
      raw: true
    });

    // 주식 보유량 계산
    const shareholdersData = await Promise.all(
      transactions.map(async (t) => {
        const shares = await getShareholding(t.buyerId, targetUserId);
        if (shares > 0) {
          const user = await User.findByPk(t.buyerId, {
            attributes: ['id', 'username', 'profilePicture']
          });
          const status = await getShareholderStatus(t.buyerId, targetUserId);
          return {
            user,
            ...status
          };
        }
        return null;
      })
    );

    // null 제거 및 주식 수로 정렬
    const shareholders = shareholdersData
      .filter(s => s !== null)
      .sort((a, b) => b.shareholding - a.shareholding);

    // 페이지네이션
    const offset = (page - 1) * limit;
    const paginatedShareholders = shareholders.slice(offset, offset + parseInt(limit));

    res.json({
      shareholders: paginatedShareholders,
      pagination: {
        total: shareholders.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(shareholders.length / limit)
      }
    });
  } catch (error) {
    console.error('주주 목록 조회 오류:', error);
    res.status(500).json({ error: '주주 목록 조회 중 오류가 발생했습니다.' });
  }
};
