const { Wallet, CoinTransaction, Withdrawal, User } = require('../models');
const { sequelize } = require('../config/database');
const { updateBalance } = require('../utils/balanceService');
const { CASH_OUT_ENABLED, CASH_OUT_DISABLED_MESSAGE } = require('../config/featureFlags');

/**
 * 코인 입금
 */
exports.depositCoins = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { amount, paymentMethod, paymentId } = req.body;

    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: '입금액은 0보다 커야 합니다.' });
    }

    // 지갑 조회 또는 생성
    const [wallet] = await Wallet.findOrCreate({
      where: { userId },
      defaults: { balance: 0, totalDeposited: 0, totalWithdrawn: 0, totalEarned: 0 },
      transaction
    });

    // 잔액 및 입금 총액 업데이트
    const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
    const newTotalDeposited = parseFloat(wallet.totalDeposited) + parseFloat(amount);

    await wallet.update({
      balance: newBalance,
      totalDeposited: newTotalDeposited
    }, { transaction });

    // 거래 내역 기록
    await CoinTransaction.create({
      userId,
      transactionType: 'DEPOSIT',
      amount: parseFloat(amount),
      balanceAfter: newBalance,
      relatedId: paymentId || null,
      description: paymentMethod ? `${paymentMethod} 입금` : '코인 입금'
    }, { transaction });

    await transaction.commit();

    res.json({
      message: '입금이 완료되었습니다.',
      wallet: {
        balance: newBalance,
        totalDeposited: newTotalDeposited
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('입금 오류:', error);
    res.status(500).json({ error: '입금 처리 중 오류가 발생했습니다.' });
  }
};

/**
 * 지갑 정보 조회
 */
exports.getWalletBalance = async (req, res) => {
  try {
    const userId = req.user.id;

    const [wallet] = await Wallet.findOrCreate({
      where: { userId },
      defaults: { balance: 0, totalDeposited: 0, totalWithdrawn: 0, totalEarned: 0 }
    });

    res.json({
      wallet: {
        balance: parseFloat(wallet.balance) || 0,
        totalDeposited: parseFloat(wallet.totalDeposited) || 0,
        totalWithdrawn: parseFloat(wallet.totalWithdrawn) || 0,
        totalEarned: parseFloat(wallet.totalEarned) || 0
      }
    });
  } catch (error) {
    console.error('지갑 조회 오류:', error);
    res.status(500).json({ error: '지갑 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 거래 내역 조회
 */
exports.getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, limit = 50, offset = 0 } = req.query;

    const where = { userId };
    if (type) where.transactionType = type;

    const transactions = await CoinTransaction.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await CoinTransaction.count({ where });

    res.json({
      transactions,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('거래 내역 조회 오류:', error);
    res.status(500).json({ error: '거래 내역 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 출금 요청
 */
exports.requestWithdrawal = async (req, res) => {
  // 게임머니 모델: PO/코인→현금 출금 차단
  if (!CASH_OUT_ENABLED) {
    return res.status(403).json({ error: CASH_OUT_DISABLED_MESSAGE });
  }

  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { amount, bankName, accountNumber, accountHolder } = req.body;

    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: '출금액은 0보다 커야 합니다.' });
    }

    if (!bankName || !accountNumber || !accountHolder) {
      await transaction.rollback();
      return res.status(400).json({ error: '은행명, 계좌번호, 예금주가 필요합니다.' });
    }

    // 최소 출금액 확인 (100 HIPO 코인 = $100)
    const MIN_WITHDRAWAL = 100;
    if (amount < MIN_WITHDRAWAL) {
      await transaction.rollback();
      return res.status(400).json({
        error: `최소 출금액은 ${MIN_WITHDRAWAL} HIPO 코인($100)입니다.`,
        minAmount: MIN_WITHDRAWAL,
        requestedAmount: amount
      });
    }

    // 지갑 잔액 확인
    const wallet = await Wallet.findOne({ where: { userId }, transaction });
    if (!wallet || parseFloat(wallet.balance) < amount) {
      await transaction.rollback();
      return res.status(400).json({
        error: '잔액이 부족합니다.',
        required: amount,
        current: wallet ? parseFloat(wallet.balance) : 0
      });
    }

    // 수수료 계산 (15%)
    const feeRate = 0.15;
    const feeAmount = parseFloat(amount) * feeRate;
    const netAmount = parseFloat(amount) - feeAmount;

    // 출금 요청 생성
    const withdrawal = await Withdrawal.create({
      userId,
      amount: parseFloat(amount),
      feeAmount,
      netAmount,
      feeRate,
      bankName,
      accountNumber,
      accountHolder,
      status: 'PENDING'
    }, { transaction });

    // 지갑 잔액 차감
    await wallet.update({
      balance: parseFloat(wallet.balance) - parseFloat(amount)
    }, { transaction });

    // 거래 내역 기록
    await CoinTransaction.create({
      userId,
      transactionType: 'WITHDRAWAL',
      amount: -parseFloat(amount),
      balanceAfter: parseFloat(wallet.balance) - parseFloat(amount),
      relatedId: withdrawal.id,
      description: `출금 요청 (수수료 ${feeRate * 100}%)`
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      message: '출금 요청이 접수되었습니다. 승인 후 처리됩니다.',
      withdrawal: {
        id: withdrawal.id,
        amount: parseFloat(amount),
        feeAmount,
        netAmount,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('출금 요청 오류:', error);
    res.status(500).json({ error: '출금 요청 중 오류가 발생했습니다.' });
  }
};

/**
 * 내 출금 내역 조회
 */
exports.getMyWithdrawals = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const where = { userId };
    if (status) where.status = status;

    const withdrawals = await Withdrawal.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.json({ withdrawals });
  } catch (error) {
    console.error('출금 내역 조회 오류:', error);
    res.status(500).json({ error: '출금 내역 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 출금 승인/거부 (관리자 전용)
 */
exports.processWithdrawal = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { withdrawalId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      await transaction.rollback();
      return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
    }

    const withdrawal = await Withdrawal.findByPk(withdrawalId, { transaction });

    if (!withdrawal) {
      await transaction.rollback();
      return res.status(404).json({ error: '출금 요청을 찾을 수 없습니다.' });
    }

    if (withdrawal.status !== 'PENDING') {
      await transaction.rollback();
      return res.status(400).json({ error: '이미 처리된 출금 요청입니다.' });
    }

    // 거부된 경우 잔액 복구
    if (status === 'REJECTED') {
      const wallet = await Wallet.findOne({
        where: { userId: withdrawal.userId },
        transaction
      });

      await wallet.update({
        balance: parseFloat(wallet.balance) + parseFloat(withdrawal.amount)
      }, { transaction });

      await CoinTransaction.create({
        userId: withdrawal.userId,
        transactionType: 'WITHDRAWAL',
        amount: parseFloat(withdrawal.amount),
        balanceAfter: parseFloat(wallet.balance) + parseFloat(withdrawal.amount),
        relatedId: withdrawalId,
        description: `출금 거부 환불: ${rejectionReason || '관리자 거부'}`
      }, { transaction });

      await withdrawal.update({
        status: 'REJECTED',
        rejectionReason: rejectionReason || '관리자에 의해 거부됨',
        processedAt: new Date()
      }, { transaction });
    } else {
      // 승인된 경우
      const wallet = await Wallet.findOne({
        where: { userId: withdrawal.userId },
        transaction
      });

      await wallet.update({
        totalWithdrawn: parseFloat(wallet.totalWithdrawn) + parseFloat(withdrawal.amount)
      }, { transaction });

      await withdrawal.update({
        status: 'APPROVED',
        processedAt: new Date()
      }, { transaction });
    }

    await transaction.commit();

    res.json({
      message: status === 'APPROVED' ? '출금이 승인되었습니다.' : '출금이 거부되었습니다.',
      withdrawal
    });
  } catch (error) {
    await transaction.rollback();
    console.error('출금 처리 오류:', error);
    res.status(500).json({ error: '출금 처리 중 오류가 발생했습니다.' });
  }
};

// === PO 충전/교환 시스템 ===

/**
 * PO 충전 (결제 후)
 */
exports.chargePO = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const { amount, paymentMethod, paymentId } = req.body;

    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: '충전 금액은 0보다 커야 합니다' });
    }

    // 충전 금액별 보너스
    let bonus = 0;
    if (amount >= 100000) bonus = Math.floor(amount * 0.05); // 10만원 이상 5%
    else if (amount >= 50000) bonus = Math.floor(amount * 0.03); // 5만원 이상 3%
    else if (amount >= 10000) bonus = Math.floor(amount * 0.01); // 1만원 이상 1%

    const totalPO = amount + bonus;

    // 사용자 PO 잔액 증가 (User + Wallet 동시)
    const { newBalance } = await updateBalance(userId, totalPO, { transaction });

    // 거래 내역 기록
    await CoinTransaction.create({
      userId,
      transactionType: 'DEPOSIT',
      amount: totalPO,
      balanceAfter: newBalance,
      relatedId: paymentId,
      description: `PO 충전 (${paymentMethod || '결제'})`
    }, { transaction });

    await transaction.commit();

    res.json({
      message: 'PO 충전이 완료되었습니다',
      charged: amount,
      bonus,
      total: totalPO,
      newBalance
    });
  } catch (error) {
    await transaction.rollback();
    console.error('PO 충전 오류:', error);
    res.status(500).json({ error: 'PO 충전 중 오류가 발생했습니다' });
  }
};

/**
 * PO 잔액 조회
 */
exports.getPOBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      attributes: ['poBalance', 'balance']
    });

    // 오늘 받은 배당금
    const { Op } = require('sequelize');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayDividend = await CoinTransaction.sum('amount', {
      where: {
        userId,
        transactionType: 'EARN',
        source: 'dividend',
        createdAt: { [Op.gte]: today }
      }
    }) || 0;

    res.json({
      poBalance: user.poBalance,
      cashBalance: user.balance || 0,
      todayDividend
    });
  } catch (error) {
    console.error('PO 잔액 조회 오류:', error);
    res.status(500).json({ error: '잔액 조회 중 오류가 발생했습니다' });
  }
};

/**
 * PO → 현금 전환 요청
 */
exports.convertPOToCash = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const { amount, bankName, accountNumber, accountHolder } = req.body;

    if (!amount || amount < 10000) {
      await transaction.rollback();
      return res.status(400).json({ error: '최소 전환 금액은 10,000 PO입니다' });
    }

    const user = await User.findByPk(userId, { transaction });
    if (user.poBalance < amount) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'PO가 부족합니다',
        required: amount,
        available: user.poBalance
      });
    }

    // 전환 수수료 10%
    const feeRate = 0.1;
    const fee = Math.floor(amount * feeRate);
    const netAmount = amount - fee;

    // PO 차감 (User + Wallet 동시)
    await updateBalance(userId, -amount, {
      transaction,
      walletFields: { totalPOWithdrawn: amount }
    });

    // 출금 요청 생성
    await Withdrawal.create({
      userId,
      amount,
      feeAmount: fee,
      netAmount,
      feeRate,
      bankName,
      accountNumber,
      accountHolder,
      status: 'PENDING',
      type: 'PO_CONVERSION'
    }, { transaction });

    await transaction.commit();

    res.json({
      message: 'PO 전환 요청이 접수되었습니다',
      amount,
      fee,
      netAmount,
      newBalance: user.poBalance - amount
    });
  } catch (error) {
    await transaction.rollback();
    console.error('PO 전환 오류:', error);
    res.status(500).json({ error: 'PO 전환 중 오류가 발생했습니다' });
  }
};

/**
 * PO 사용 내역 조회
 */
exports.getPOHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { Op } = require('sequelize');
    const where = { userId };
    if (type) where.transactionType = type;

    const { count, rows: transactions } = await CoinTransaction.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      transactions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('PO 내역 조회 오류:', error);
    res.status(500).json({ error: '내역 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 충전 상품 목록
 */
exports.getChargeProducts = async (req, res) => {
  try {
    const products = [
      { id: 1, amount: 5000, bonus: 0, price: 5000, label: '5,000 PO' },
      { id: 2, amount: 10000, bonus: 100, price: 10000, label: '10,000 PO (+1%)' },
      { id: 3, amount: 30000, bonus: 300, price: 30000, label: '30,000 PO (+1%)' },
      { id: 4, amount: 50000, bonus: 1500, price: 50000, label: '50,000 PO (+3%)' },
      { id: 5, amount: 100000, bonus: 5000, price: 100000, label: '100,000 PO (+5%)' },
      { id: 6, amount: 300000, bonus: 15000, price: 300000, label: '300,000 PO (+5%)' },
      { id: 7, amount: 500000, bonus: 30000, price: 500000, label: '500,000 PO (+6%)' },
      { id: 8, amount: 1000000, bonus: 80000, price: 1000000, label: '1,000,000 PO (+8%)' }
    ];

    res.json({ products });
  } catch (error) {
    console.error('충전 상품 조회 오류:', error);
    res.status(500).json({ error: '상품 조회 중 오류가 발생했습니다' });
  }
};
