const { Wallet, CoinTransaction, Withdrawal, User } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const tradingTransaction = require('../services/tradingTransaction');
const { account, changeBalance, positiveAmount } = require('../services/poAccountService');

/**
 * 코인 입금
 */
exports.depositCoins = require('./poWalletController').depositCoins;

/**
 * 지갑 정보 조회
 */
exports.getWalletBalance = require('./poWalletController').getWalletBalance;

/**
 * 거래 내역 조회
 */
exports.getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, limit = 50, offset = 0 } = req.query;

    const where = { userId, coinType: 'PO' };
    if (type && type !== 'all') where.transactionType = type;

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
 * 다른 사용자에게 PO를 전송합니다. 미체결 주문 예약금은 전송할 수 없습니다.
 */
exports.transferPO = async (req, res) => {
  const transaction = await tradingTransaction();
  try {
    const amount = Number(req.body.amount);
    const recipientQuery = String(req.body.recipient || '').trim();
    positiveAmount(amount);
    if (!recipientQuery) {
      const error = new Error('받는 사람의 이메일 또는 사용자명을 입력해주세요');
      error.status = 400;
      throw error;
    }

    const recipient = await User.findOne({
      where: { [Op.or]: [{ email: recipientQuery.toLowerCase() }, { username: recipientQuery }] },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!recipient) {
      const error = new Error('받는 사용자를 찾을 수 없습니다');
      error.status = 404;
      throw error;
    }
    if (recipient.id === req.user.id) {
      const error = new Error('본인에게는 전송할 수 없습니다');
      error.status = 400;
      throw error;
    }

    const senderAccount = await account(req.user.id, transaction);
    if (senderAccount.availableBalance < amount) {
      const error = new Error('주문 예약금을 제외한 사용 가능 PO가 부족합니다');
      error.status = 400;
      throw error;
    }

    await changeBalance(req.user.id, -amount, transaction, {
      source: 'OTHER',
      description: `${recipient.username}님에게 PO 전송`,
      relatedId: recipient.id,
    });
    const received = await changeBalance(recipient.id, amount, transaction, {
      source: 'OTHER',
      description: `${req.user.username}님에게서 PO 수신`,
      relatedId: req.user.id,
    });
    await transaction.commit();

    res.status(201).json({
      success: true,
      amount,
      balance: Number(senderAccount.user.poBalance) - amount,
      recipient: { id: recipient.id, username: recipient.username },
      recipientBalance: received.balance,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

/**
 * 출금 요청
 */
exports.requestWithdrawal = require('./poWalletController').requestWithdrawal;

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
exports.processWithdrawal = require('./poWalletController').processWithdrawal;

// === PO 충전/교환 시스템 ===

/**
 * PO 충전 (결제 후)
 */
exports.chargePO = require('./poWalletController').chargePO;

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
        source: 'STOCK_DIVIDEND',
        createdAt: { [Op.gte]: today }
      }
    }) || 0;

    res.json({
      poBalance: user.poBalance,
      ...(await require('../services/poAccountService').account(userId).then(({ reservedBalance, availableBalance }) => ({ reservedBalance, availableBalance }))),
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
exports.convertPOToCash = require('./poWalletController').convertPOToCash;

/**
 * PO 사용 내역 조회
 */
exports.getPOHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { Op } = require('sequelize');
    const where = { userId, coinType: 'PO' };
    if (type && type !== 'all') where.transactionType = type;

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

    // Payment bonuses belong to cash charging; PO conversion is one-to-one.
    res.json({ products: products.map(product => ({ ...product, bonus: 0, label: `${product.amount.toLocaleString()} PO` })) });
  } catch (error) {
    console.error('충전 상품 조회 오류:', error);
    res.status(500).json({ error: '상품 조회 중 오류가 발생했습니다' });
  }
};
