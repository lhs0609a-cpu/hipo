const { User, Wallet, Withdrawal, CoinTransaction, Dividend, sequelize } = require('../models');
const { Op } = require('sequelize');
const { updateBalance } = require('../utils/balanceService');
const { CASH_OUT_ENABLED, CASH_OUT_DISABLED_MESSAGE } = require('../config/featureFlags');

const FEE_RATE = 0.10;       // 10% 플랫폼 수수료
const TAX_RATE = 0.033;      // 3.3% 기타소득세
const MIN_SETTLEMENT = 10000; // 최소 정산 금액 (PO)

/**
 * 정산 대시보드 조회
 */
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);

    if (!user || !user.isCreator) {
      return res.status(403).json({ error: '크리에이터만 정산을 이용할 수 있습니다.' });
    }

    // Wallet 정보 조회
    const wallet = await Wallet.findOne({ where: { userId } });

    // 최근 수입 내역 (배당 + 코인 거래)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentDividends = await Dividend.findAll({
      where: {
        holderId: userId,
        createdAt: { [Op.gte]: thirtyDaysAgo }
      },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    const recentTransactions = await CoinTransaction.findAll({
      where: {
        userId,
        transactionType: 'EARN',
        createdAt: { [Op.gte]: thirtyDaysAgo }
      },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // 정산 가능 금액 계산
    const balance = user.poBalance || 0;
    const settleable = Math.max(0, balance);
    const fee = Math.floor(settleable * FEE_RATE);
    const taxBase = settleable - fee;
    const tax = Math.floor(taxBase * TAX_RATE);
    const netAmount = settleable - fee - tax;

    // 진행중인 정산 확인
    const pendingSettlement = await Withdrawal.findOne({
      where: {
        userId,
        status: { [Op.in]: ['PENDING', 'PROCESSING'] }
      }
    });

    res.json({
      success: true,
      balance,
      settleable,
      fee,
      tax,
      netAmount,
      minSettlement: MIN_SETTLEMENT,
      cashOutEnabled: CASH_OUT_ENABLED,
      canSettle: CASH_OUT_ENABLED && balance >= MIN_SETTLEMENT && user.identityVerified && !!user.bankInfo && !pendingSettlement,
      hasPendingSettlement: !!pendingSettlement,
      identityVerified: user.identityVerified || false,
      bankInfo: user.bankInfo || null,
      wallet: wallet ? {
        totalDividendReceived: parseFloat(wallet.totalDividendReceived || 0),
        totalPOWithdrawn: parseFloat(wallet.totalPOWithdrawn || 0),
        totalPOEarned: parseFloat(wallet.totalPOEarned || 0),
      } : null,
      recentEarnings: {
        dividends: recentDividends.map(d => ({
          id: d.id,
          amount: parseFloat(d.amount),
          createdAt: d.createdAt,
          type: 'DIVIDEND'
        })),
        transactions: recentTransactions.map(t => ({
          id: t.id,
          amount: parseFloat(t.amount),
          source: t.source,
          description: t.description,
          createdAt: t.createdAt,
          type: 'EARNING'
        }))
      }
    });
  } catch (error) {
    console.error('정산 대시보드 조회 오류:', error);
    res.status(500).json({ error: '정산 대시보드 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 은행 계좌 등록/수정
 */
exports.registerBankAccount = async (req, res) => {
  // 게임머니 모델: 현금 인출이 비활성화된 경우 정산 계좌 등록도 받지 않는다.
  if (!CASH_OUT_ENABLED) {
    return res.status(403).json({ error: CASH_OUT_DISABLED_MESSAGE });
  }
  try {
    const userId = req.user.id;
    const { bankName, accountNumber, accountHolder } = req.body;

    if (!bankName || !accountNumber || !accountHolder) {
      return res.status(400).json({ error: '은행명, 계좌번호, 예금주명을 모두 입력해주세요.' });
    }

    // 계좌번호 숫자만 허용
    const cleanAccountNumber = accountNumber.replace(/[^0-9]/g, '');
    if (cleanAccountNumber.length < 10 || cleanAccountNumber.length > 16) {
      return res.status(400).json({ error: '유효한 계좌번호를 입력해주세요. (10~16자리)' });
    }

    const bankInfo = {
      bankName: bankName.trim(),
      accountNumber: cleanAccountNumber,
      accountHolder: accountHolder.trim(),
      registeredAt: new Date().toISOString()
    };

    await User.update({ bankInfo }, { where: { id: userId } });

    res.json({
      success: true,
      bankInfo: {
        bankName: bankInfo.bankName,
        accountNumber: cleanAccountNumber.slice(0, 4) + '****' + cleanAccountNumber.slice(-4),
        accountHolder: bankInfo.accountHolder
      }
    });
  } catch (error) {
    console.error('계좌 등록 오류:', error);
    res.status(500).json({ error: '계좌 등록 중 오류가 발생했습니다.' });
  }
};

/**
 * 정산 신청
 */
exports.requestSettlement = async (req, res) => {
  // 게임머니 모델: PO→현금 정산(인출) 차단
  if (!CASH_OUT_ENABLED) {
    return res.status(403).json({ error: CASH_OUT_DISABLED_MESSAGE });
  }

  const t = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { amount } = req.body;

    const user = await User.findByPk(userId, { transaction: t });

    // 크리에이터 확인
    if (!user.isCreator) {
      await t.rollback();
      return res.status(403).json({ error: '크리에이터만 정산을 신청할 수 있습니다.' });
    }

    // 본인인증 확인
    if (!user.identityVerified) {
      await t.rollback();
      return res.status(400).json({ error: '정산을 위해 본인인증이 필요합니다.' });
    }

    // 계좌 등록 확인
    if (!user.bankInfo) {
      await t.rollback();
      return res.status(400).json({ error: '정산 계좌를 먼저 등록해주세요.' });
    }

    const requestAmount = parseInt(amount);
    if (!requestAmount || requestAmount < MIN_SETTLEMENT) {
      await t.rollback();
      return res.status(400).json({ error: `최소 정산 금액은 ${MIN_SETTLEMENT.toLocaleString()} PO입니다.` });
    }

    // 잔액 확인
    if (user.poBalance < requestAmount) {
      await t.rollback();
      return res.status(400).json({ error: 'PO 잔액이 부족합니다.' });
    }

    // 진행중인 정산 확인
    const pendingSettlement = await Withdrawal.findOne({
      where: {
        userId,
        status: { [Op.in]: ['PENDING', 'PROCESSING'] }
      },
      transaction: t
    });

    if (pendingSettlement) {
      await t.rollback();
      return res.status(400).json({ error: '이미 진행중인 정산이 있습니다. 완료 후 다시 시도해주세요.' });
    }

    // 수수료, 세금 계산
    const feeAmount = Math.floor(requestAmount * FEE_RATE);
    const taxBase = requestAmount - feeAmount;
    const taxAmount = Math.floor(taxBase * TAX_RATE);
    const netAmount = requestAmount - feeAmount - taxAmount;

    // 1+2. User + Wallet 잔고 동시 차감
    await updateBalance(userId, -requestAmount, {
      transaction: t,
      walletFields: { totalPOWithdrawn: requestAmount }
    });

    // 3. Withdrawal 레코드 생성
    const withdrawal = await Withdrawal.create({
      userId,
      amount: requestAmount,
      feePercentage: FEE_RATE * 100,
      feeAmount,
      netAmount,
      bankInfo: user.bankInfo,
      status: 'PENDING'
    }, { transaction: t });

    // 4. CoinTransaction 기록
    await CoinTransaction.create({
      userId,
      coinType: 'AC',
      transactionType: 'WITHDRAW',
      amount: -requestAmount,
      balanceAfter: user.poBalance - requestAmount,
      source: 'WITHDRAWAL',
      description: `정산 신청: ${requestAmount.toLocaleString()} PO (실수령 ${netAmount.toLocaleString()}원)`,
      relatedId: withdrawal.id,
      relatedType: 'Withdrawal'
    }, { transaction: t });

    await t.commit();

    res.json({
      success: true,
      settlement: {
        id: withdrawal.id,
        amount: requestAmount,
        feeAmount,
        taxAmount,
        netAmount,
        status: 'PENDING',
        bankInfo: {
          bankName: user.bankInfo.bankName,
          accountNumber: user.bankInfo.accountNumber.slice(0, 4) + '****' + user.bankInfo.accountNumber.slice(-4),
          accountHolder: user.bankInfo.accountHolder
        },
        createdAt: withdrawal.createdAt
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('정산 신청 오류:', error);
    res.status(500).json({ error: '정산 신청 중 오류가 발생했습니다.' });
  }
};

/**
 * 정산 내역 조회
 */
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows: settlements } = await Withdrawal.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      success: true,
      settlements: settlements.map(s => ({
        id: s.id,
        amount: parseFloat(s.amount),
        feeAmount: parseFloat(s.feeAmount || 0),
        netAmount: parseFloat(s.netAmount || 0),
        status: s.status,
        bankInfo: s.bankInfo ? {
          bankName: s.bankInfo.bankName,
          accountNumber: s.bankInfo.accountNumber
            ? s.bankInfo.accountNumber.slice(0, 4) + '****' + s.bankInfo.accountNumber.slice(-4)
            : '',
          accountHolder: s.bankInfo.accountHolder
        } : null,
        rejectionReason: s.rejectionReason,
        processedAt: s.processedAt,
        createdAt: s.createdAt
      })),
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('정산 내역 조회 오류:', error);
    res.status(500).json({ error: '정산 내역 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 정산 취소
 */
exports.cancelSettlement = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { id } = req.params;

    const withdrawal = await Withdrawal.findOne({
      where: { id, userId },
      transaction: t
    });

    if (!withdrawal) {
      await t.rollback();
      return res.status(404).json({ error: '정산 내역을 찾을 수 없습니다.' });
    }

    if (withdrawal.status !== 'PENDING') {
      await t.rollback();
      return res.status(400).json({ error: '대기 중인 정산만 취소할 수 있습니다.' });
    }

    const refundAmount = parseFloat(withdrawal.amount);

    // 1+2. User + Wallet 잔고 동시 환불
    const { newBalance } = await updateBalance(userId, refundAmount, {
      transaction: t,
      walletFields: { totalPOWithdrawn: -refundAmount }
    });

    // 3. Withdrawal 상태 변경
    await withdrawal.update(
      { status: 'REJECTED', rejectionReason: '사용자 취소' },
      { transaction: t }
    );

    // 4. CoinTransaction 환불 기록
    await CoinTransaction.create({
      userId,
      coinType: 'AC',
      transactionType: 'REFUND',
      amount: refundAmount,
      balanceAfter: newBalance,
      source: 'WITHDRAWAL',
      description: `정산 취소 환불: ${refundAmount.toLocaleString()} PO`,
      relatedId: withdrawal.id,
      relatedType: 'Withdrawal'
    }, { transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: '정산이 취소되었습니다.',
      refundedAmount: refundAmount
    });
  } catch (error) {
    await t.rollback();
    console.error('정산 취소 오류:', error);
    res.status(500).json({ error: '정산 취소 중 오류가 발생했습니다.' });
  }
};
