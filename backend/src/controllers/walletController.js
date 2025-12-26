const { Wallet, CoinTransaction, Withdrawal, User } = require('../models');
const { sequelize } = require('../config/database');

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
