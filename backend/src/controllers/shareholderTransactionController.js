const { StockTransaction, User, Stock, Holding } = require('../models');
const { getShareholderStatus, getShareholding } = require('../utils/shareholderHelper');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * 주식 매수 (주주 혜택 시스템용)
 */
exports.buyShares = async (req, res) => {
  const stock = await Stock.findOne({ where: { userId: req.body.targetUserId } });
  if (!stock) return res.status(404).json({ error: '종목을 찾을 수 없습니다' });
  req.body = { ...req.body, stockId: stock.id, orderType: 'BUY', orderMode: 'limit', limitPrice: req.body.pricePerShare };
  return require('./stockOrderController').createOrder(req, res);
};

/**
 * 주식 매도
 */
exports.sellShares = async (req, res) => {
  const stock = await Stock.findOne({ where: { userId: req.body.targetUserId } });
  if (!stock) return res.status(404).json({ error: '종목을 찾을 수 없습니다' });
  req.body = { ...req.body, stockId: stock.id, orderType: 'SELL', orderMode: 'limit', limitPrice: req.body.pricePerShare };
  return require('./stockOrderController').createOrder(req, res);
};

/**
 * 주식 양도 (무료 전송)
 */
exports.transferShares = async (req, res) => {
  try {
    const { toUserId, targetUserId, quantity } = req.body;
    await require('../services/shareTransferService')(req.user.id, toUserId, targetUserId, quantity, false);
    res.json({ message: '주식 이전이 완료되었습니다', from: await getShareholderStatus(req.user.id, targetUserId),
      to: await getShareholderStatus(toUserId, targetUserId), shareholderStatus: await getShareholderStatus(toUserId, targetUserId) });
  } catch (error) { res.status(400).json({ error: error.message }); }
};

/**
 * 주식 부여 (관리자 기능)
 */
exports.grantShares = async (req, res) => {
  try {
    const { toUserId, targetUserId, quantity } = req.body;
    await require('../services/shareTransferService')(req.user.id, toUserId, targetUserId, quantity, true);
    res.json({ message: '주식 이전이 완료되었습니다', from: await getShareholderStatus(req.user.id, targetUserId),
      to: await getShareholderStatus(toUserId, targetUserId), shareholderStatus: await getShareholderStatus(toUserId, targetUserId) });
  } catch (error) { res.status(400).json({ error: error.message }); }
};

/**
 * 특정 사용자의 주식 거래 내역 조회
 */
exports.getTransactionHistory = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    res.json(await require('../services/shareholderHistoryService')(targetUserId, page, limit));
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
    const stock = await Stock.findOne({ where: { userId: req.params.targetUserId } });
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    if (!stock) return res.json({ shareholders: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    const { count, rows } = await Holding.findAndCountAll({ where: { stockId: stock.id, shares: { [Op.gt]: 0 } },
      include: [{ model: User, as: 'holder', attributes: ['id', 'username', 'profileImage'] }],
      order: [['shares', 'DESC'], ['id', 'ASC']], limit, offset: (page - 1) * limit });
    const shareholders = await Promise.all(rows.map(async h => ({ user: h.holder, ...await getShareholderStatus(h.holderId, req.params.targetUserId) })));
    res.json({ shareholders, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (error) { res.status(500).json({ error: '주주 목록 조회 실패' }); }
};
