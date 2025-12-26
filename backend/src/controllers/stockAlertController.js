const { StockAlert, StockAlertHistory, Stock, User, Watchlist, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * 주식 알림 생성
 */
exports.createAlert = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stockId, alertType, targetPrice, targetPercent, isRecurring } = req.body;

    // 주식 존재 확인
    const stock = await Stock.findByPk(stockId);
    if (!stock) {
      return res.status(404).json({ error: '주식을 찾을 수 없습니다.' });
    }

    // 알림 생성
    const alert = await StockAlert.create({
      userId,
      stockId,
      alertType,
      targetPrice,
      targetPercent,
      isRecurring: isRecurring || false,
      isActive: true
    });

    // 주식 정보와 함께 반환
    const alertWithStock = await StockAlert.findByPk(alert.id, {
      include: [
        {
          model: Stock,
          as: 'stock',
          include: [{
            model: User,
            as: 'issuer',
            attributes: ['id', 'username', 'profileImage']
          }]
        }
      ]
    });

    res.status(201).json(alertWithStock);
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ error: '알림 생성 실패' });
  }
};

/**
 * 내 알림 목록 조회
 */
exports.getMyAlerts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { isActive } = req.query;

    const where = { userId };
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const alerts = await StockAlert.findAll({
      where,
      include: [
        {
          model: Stock,
          as: 'stock',
          include: [{
            model: User,
            as: 'issuer',
            attributes: ['id', 'username', 'profileImage']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(alerts);
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: '알림 목록 조회 실패' });
  }
};

/**
 * 알림 수정
 */
exports.updateAlert = async (req, res) => {
  try {
    const userId = req.user.id;
    const { alertId } = req.params;
    const { targetPrice, targetPercent, isActive, isRecurring } = req.body;

    const alert = await StockAlert.findOne({
      where: { id: alertId, userId }
    });

    if (!alert) {
      return res.status(404).json({ error: '알림을 찾을 수 없습니다.' });
    }

    // 수정
    if (targetPrice !== undefined) alert.targetPrice = targetPrice;
    if (targetPercent !== undefined) alert.targetPercent = targetPercent;
    if (isActive !== undefined) alert.isActive = isActive;
    if (isRecurring !== undefined) alert.isRecurring = isRecurring;

    await alert.save();

    // 주식 정보와 함께 반환
    const updatedAlert = await StockAlert.findByPk(alert.id, {
      include: [
        {
          model: Stock,
          as: 'stock',
          include: [{
            model: User,
            as: 'issuer',
            attributes: ['id', 'username', 'profileImage']
          }]
        }
      ]
    });

    res.json(updatedAlert);
  } catch (error) {
    console.error('Update alert error:', error);
    res.status(500).json({ error: '알림 수정 실패' });
  }
};

/**
 * 알림 삭제
 */
exports.deleteAlert = async (req, res) => {
  try {
    const userId = req.user.id;
    const { alertId } = req.params;

    const alert = await StockAlert.findOne({
      where: { id: alertId, userId }
    });

    if (!alert) {
      return res.status(404).json({ error: '알림을 찾을 수 없습니다.' });
    }

    await alert.destroy();

    res.json({ message: '알림이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ error: '알림 삭제 실패' });
  }
};

/**
 * 알림 히스토리 조회
 */
exports.getAlertHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { rows: history, count: total } = await StockAlertHistory.findAndCountAll({
      where: { userId },
      include: [
        {
          model: Stock,
          as: 'stock',
          include: [{
            model: User,
            as: 'issuer',
            attributes: ['id', 'username', 'profileImage']
          }]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      history,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get alert history error:', error);
    res.status(500).json({ error: '알림 히스토리 조회 실패' });
  }
};

/**
 * 알림 히스토리 읽음 처리
 */
exports.markHistoryAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { historyId } = req.params;

    const history = await StockAlertHistory.findOne({
      where: { id: historyId, userId }
    });

    if (!history) {
      return res.status(404).json({ error: '히스토리를 찾을 수 없습니다.' });
    }

    history.isRead = true;
    await history.save();

    res.json(history);
  } catch (error) {
    console.error('Mark history as read error:', error);
    res.status(500).json({ error: '읽음 처리 실패' });
  }
};

/**
 * 미읽은 알림 개수
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await StockAlertHistory.count({
      where: { userId, isRead: false }
    });

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: '미읽은 알림 개수 조회 실패' });
  }
};

/**
 * 워치리스트에 추가
 */
exports.addToWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stockId, note } = req.body;

    // 주식 존재 확인
    const stock = await Stock.findByPk(stockId);
    if (!stock) {
      return res.status(404).json({ error: '주식을 찾을 수 없습니다.' });
    }

    // 이미 추가되어 있는지 확인
    const existing = await Watchlist.findOne({
      where: { userId, stockId }
    });

    if (existing) {
      return res.status(400).json({ error: '이미 워치리스트에 추가된 주식입니다.' });
    }

    const watchlist = await Watchlist.create({
      userId,
      stockId,
      note
    });

    const watchlistWithStock = await Watchlist.findByPk(watchlist.id, {
      include: [
        {
          model: Stock,
          as: 'stock',
          include: [{
            model: User,
            as: 'issuer',
            attributes: ['id', 'username', 'profileImage']
          }]
        }
      ]
    });

    res.status(201).json(watchlistWithStock);
  } catch (error) {
    console.error('Add to watchlist error:', error);
    res.status(500).json({ error: '워치리스트 추가 실패' });
  }
};

/**
 * 워치리스트 조회
 */
exports.getWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const watchlist = await Watchlist.findAll({
      where: { userId },
      include: [
        {
          model: Stock,
          as: 'stock',
          include: [{
            model: User,
            as: 'issuer',
            attributes: ['id', 'username', 'profileImage']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(watchlist);
  } catch (error) {
    console.error('Get watchlist error:', error);
    res.status(500).json({ error: '워치리스트 조회 실패' });
  }
};

/**
 * 워치리스트에서 제거
 */
exports.removeFromWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stockId } = req.params;

    const watchlist = await Watchlist.findOne({
      where: { userId, stockId }
    });

    if (!watchlist) {
      return res.status(404).json({ error: '워치리스트에서 찾을 수 없습니다.' });
    }

    await watchlist.destroy();

    res.json({ message: '워치리스트에서 제거되었습니다.' });
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    res.status(500).json({ error: '워치리스트 제거 실패' });
  }
};

/**
 * 워치리스트 메모 수정
 */
exports.updateWatchlistNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stockId } = req.params;
    const { note } = req.body;

    const watchlist = await Watchlist.findOne({
      where: { userId, stockId }
    });

    if (!watchlist) {
      return res.status(404).json({ error: '워치리스트에서 찾을 수 없습니다.' });
    }

    watchlist.note = note;
    await watchlist.save();

    res.json(watchlist);
  } catch (error) {
    console.error('Update watchlist note error:', error);
    res.status(500).json({ error: '메모 수정 실패' });
  }
};
