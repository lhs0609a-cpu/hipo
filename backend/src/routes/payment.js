const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { Payment, WalletTransaction, User } = require('../models');
const tossPaymentService = require('../services/tossPaymentService');
const { sequelize } = require('../config/database');

// 토스페이먼츠 클라이언트 키 조회 (프론트엔드에서 사용)
router.get('/toss-client-key', (req, res) => {
  res.json({
    success: true,
    clientKey: tossPaymentService.getClientKey()
  });
});

// 충전 요청 (결제 전 주문 생성)
router.post('/charge/request', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    // 유효성 검사
    if (!amount || amount < 1000) {
      return res.status(400).json({
        success: false,
        error: '최소 충전 금액은 1,000원입니다'
      });
    }

    if (amount > 1000000) {
      return res.status(400).json({
        success: false,
        error: '최대 충전 금액은 1,000,000원입니다'
      });
    }

    // 보너스 계산
    const bonus = tossPaymentService.calculateBonus(amount);

    // 주문 ID 생성 (중복 방지: timestamp + userId + random)
    const orderId = `ORDER_${Date.now()}_${userId}_${Math.random().toString(36).substr(2, 9)}`;

    // Payment 레코드 생성 (PENDING 상태)
    const payment = await Payment.create({
      userId,
      orderId,
      amount,
      bonusAmount: bonus.bonusAmount,
      totalAmount: bonus.totalAmount,
      paymentMethod: 'PENDING',
      status: 'PENDING',
      requestedAt: new Date()
    });

    res.json({
      success: true,
      orderId,
      amount,
      bonusAmount: bonus.bonusAmount,
      totalAmount: bonus.totalAmount,
      bonusRate: bonus.bonusRate,
      payment
    });
  } catch (error) {
    console.error('충전 요청 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

// 결제 승인 (토스페이먼츠 결제 완료 후)
router.post('/charge/confirm', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { paymentKey, orderId, amount } = req.body;

    // 유효성 검사
    if (!paymentKey || !orderId || !amount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: '필수 정보가 누락되었습니다'
      });
    }

    // Payment 레코드 조회
    const payment = await Payment.findOne({
      where: { orderId, userId }
    });

    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: '주문을 찾을 수 없습니다'
      });
    }

    if (payment.status === 'COMPLETED') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: '이미 처리된 결제입니다'
      });
    }

    // 금액 검증
    if (payment.amount !== amount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: '결제 금액이 일치하지 않습니다'
      });
    }

    // 토스페이먼츠 결제 승인 요청
    const confirmResult = await tossPaymentService.confirmPayment(paymentKey, orderId, amount);

    if (!confirmResult.success) {
      // 결제 승인 실패
      await payment.update({
        status: 'FAILED',
        failureReason: JSON.stringify(confirmResult.error),
        tossResponse: confirmResult.error
      }, { transaction });

      await transaction.commit();

      return res.status(400).json({
        success: false,
        error: '결제 승인에 실패했습니다',
        details: confirmResult.error
      });
    }

    // 결제 방법 추출
    const paymentMethod = tossPaymentService.extractPaymentMethod(confirmResult.data);

    // User 잔액 업데이트
    const user = await User.findByPk(userId, { transaction });
    const balanceBefore = user.balance || 0;
    const balanceAfter = balanceBefore + payment.totalAmount;

    await user.update({ balance: balanceAfter }, { transaction });

    // Payment 상태 업데이트
    await payment.update({
      paymentKey,
      paymentMethod,
      status: 'COMPLETED',
      tossResponse: confirmResult.data,
      completedAt: new Date()
    }, { transaction });

    // WalletTransaction 기록 (충전)
    await WalletTransaction.create({
      userId,
      paymentId: payment.id,
      type: 'CHARGE',
      amount: payment.amount,
      balanceBefore,
      balanceAfter: balanceBefore + payment.amount,
      description: `${payment.amount.toLocaleString()}원 충전`,
      metadata: {
        orderId,
        paymentKey,
        paymentMethod
      }
    }, { transaction });

    // 보너스가 있으면 별도 기록
    if (payment.bonusAmount > 0) {
      await WalletTransaction.create({
        userId,
        paymentId: payment.id,
        type: 'BONUS',
        amount: payment.bonusAmount,
        balanceBefore: balanceBefore + payment.amount,
        balanceAfter: balanceAfter,
        description: `충전 보너스 ${payment.bonusAmount.toLocaleString()}원`,
        metadata: {
          orderId,
          bonusRate: tossPaymentService.calculateBonus(payment.amount).bonusRate
        }
      }, { transaction });
    }

    await transaction.commit();

    res.json({
      success: true,
      message: `${payment.totalAmount.toLocaleString()}원이 충전되었습니다!`,
      payment: await payment.reload(),
      newBalance: balanceAfter
    });
  } catch (error) {
    await transaction.rollback();
    console.error('결제 승인 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

// 결제 실패 처리
router.post('/charge/fail', authenticateToken, async (req, res) => {
  try {
    const { orderId, code, message } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'orderId가 필요합니다'
      });
    }

    const payment = await Payment.findOne({
      where: { orderId, userId: req.user.id }
    });

    if (payment && payment.status === 'PENDING') {
      await payment.update({
        status: 'FAILED',
        failureReason: `${code}: ${message}`
      });
    }

    res.json({
      success: true,
      message: '결제 실패 처리 완료'
    });
  } catch (error) {
    console.error('결제 실패 처리 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

// 내 결제 내역 조회
router.get('/my-payments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 20, offset = 0 } = req.query;

    const where = { userId };
    if (status) {
      where.status = status;
    }

    const payments = await Payment.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await Payment.count({ where });

    res.json({
      success: true,
      payments,
      total,
      hasMore: total > parseInt(offset) + payments.length
    });
  } catch (error) {
    console.error('결제 내역 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

// 내 지갑 거래 내역 조회
router.get('/my-wallet-transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, limit = 50, offset = 0 } = req.query;

    const where = { userId };
    if (type) {
      where.type = type;
    }

    const transactions = await WalletTransaction.findAll({
      where,
      include: [{
        model: Payment,
        as: 'payment',
        required: false
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await WalletTransaction.count({ where });

    res.json({
      success: true,
      transactions,
      total,
      hasMore: total > parseInt(offset) + transactions.length
    });
  } catch (error) {
    console.error('지갑 거래 내역 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

// 내 지갑 잔액 조회
router.get('/my-balance', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'balance']
    });

    res.json({
      success: true,
      balance: user.balance || 0,
      user
    });
  } catch (error) {
    console.error('잔액 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

// ===== 관리자 전용 API =====

// 모든 결제 내역 조회 (관리자)
router.get('/admin/payments', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다'
      });
    }

    const { status, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }

    const payments = await Payment.findAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await Payment.count({ where });

    res.json({
      success: true,
      payments,
      total,
      hasMore: total > parseInt(offset) + payments.length
    });
  } catch (error) {
    console.error('관리자 결제 내역 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

// 결제 통계 (관리자)
router.get('/admin/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다'
      });
    }

    const [totalPayments, completedPayments, totalAmount, todayAmount] = await Promise.all([
      Payment.count(),
      Payment.count({ where: { status: 'COMPLETED' } }),
      Payment.sum('totalAmount', { where: { status: 'COMPLETED' } }),
      Payment.sum('totalAmount', {
        where: {
          status: 'COMPLETED',
          completedAt: {
            [sequelize.Sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalPayments,
        completedPayments,
        totalAmount: totalAmount || 0,
        todayAmount: todayAmount || 0
      }
    });
  } catch (error) {
    console.error('결제 통계 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

module.exports = router;
