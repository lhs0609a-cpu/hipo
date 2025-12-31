const { User, Stock, Watchlist, PriceHistory, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * 관심 종목 목록 조회
 */
exports.getWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const watchlistItems = await Watchlist.findAll({
      where: { userId },
      include: [{
        model: Stock,
        as: 'stock',
        include: [{ model: User, as: 'issuer', attributes: ['username', 'profileImage'] }]
      }],
      order: [['createdAt', 'DESC']]
    });

    const items = watchlistItems.map(item => ({
      id: item.id,
      stockId: item.stockId,
      creator: item.stock.issuer,
      sharePrice: item.stock.sharePrice,
      priceChange: item.stock.priceChangePercent,
      addedPrice: item.addedPrice,
      priceAtAdd: item.addedPrice,
      currentProfit: item.stock.sharePrice - item.addedPrice,
      currentProfitPercent: item.addedPrice > 0
        ? ((item.stock.sharePrice - item.addedPrice) / item.addedPrice * 100).toFixed(2)
        : 0,
      priceAlert: item.priceAlert,
      alertCondition: item.alertCondition,
      notes: item.notes,
      addedAt: item.createdAt
    }));

    res.json({ watchlist: items });
  } catch (error) {
    console.error('관심 종목 조회 오류:', error);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다' });
  }
};

/**
 * 관심 종목 추가
 */
exports.addToWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stockId, notes, priceAlert, alertCondition } = req.body;

    // 이미 추가되어 있는지 확인
    const existing = await Watchlist.findOne({
      where: { userId, stockId }
    });

    if (existing) {
      return res.status(400).json({ error: '이미 관심 종목에 추가되어 있습니다' });
    }

    const stock = await Stock.findByPk(stockId);
    if (!stock) {
      return res.status(404).json({ error: '주식을 찾을 수 없습니다' });
    }

    const watchlistItem = await Watchlist.create({
      userId,
      stockId,
      addedPrice: stock.sharePrice,
      notes,
      priceAlert,
      alertCondition
    });

    res.json({
      message: '관심 종목에 추가되었습니다',
      item: {
        id: watchlistItem.id,
        stockId,
        addedPrice: stock.sharePrice
      }
    });
  } catch (error) {
    console.error('관심 종목 추가 오류:', error);
    res.status(500).json({ error: '추가 중 오류가 발생했습니다' });
  }
};

/**
 * 관심 종목 삭제
 */
exports.removeFromWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stockId } = req.params;

    const deleted = await Watchlist.destroy({
      where: { userId, stockId }
    });

    if (!deleted) {
      return res.status(404).json({ error: '관심 종목을 찾을 수 없습니다' });
    }

    res.json({ message: '관심 종목에서 삭제되었습니다' });
  } catch (error) {
    console.error('관심 종목 삭제 오류:', error);
    res.status(500).json({ error: '삭제 중 오류가 발생했습니다' });
  }
};

/**
 * 관심 종목 알림 설정
 */
exports.setWatchlistAlert = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stockId } = req.params;
    const { priceAlert, alertCondition } = req.body;

    const item = await Watchlist.findOne({
      where: { userId, stockId }
    });

    if (!item) {
      return res.status(404).json({ error: '관심 종목을 찾을 수 없습니다' });
    }

    await item.update({ priceAlert, alertCondition });

    res.json({
      message: '알림이 설정되었습니다',
      priceAlert,
      alertCondition
    });
  } catch (error) {
    console.error('알림 설정 오류:', error);
    res.status(500).json({ error: '설정 중 오류가 발생했습니다' });
  }
};

/**
 * 관심 종목 메모 수정
 */
exports.updateWatchlistNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stockId } = req.params;
    const { notes } = req.body;

    const item = await Watchlist.findOne({
      where: { userId, stockId }
    });

    if (!item) {
      return res.status(404).json({ error: '관심 종목을 찾을 수 없습니다' });
    }

    await item.update({ notes });

    res.json({
      message: '메모가 수정되었습니다',
      notes
    });
  } catch (error) {
    console.error('메모 수정 오류:', error);
    res.status(500).json({ error: '수정 중 오류가 발생했습니다' });
  }
};

/**
 * 관심 종목 여부 확인
 */
exports.checkWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stockId } = req.params;

    const item = await Watchlist.findOne({
      where: { userId, stockId }
    });

    res.json({ isWatching: !!item });
  } catch (error) {
    console.error('관심 종목 확인 오류:', error);
    res.status(500).json({ error: '확인 중 오류가 발생했습니다' });
  }
};

/**
 * 섹터별 주식 목록
 */
exports.getStocksByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { sortBy = 'marketCapTotal', sortOrder = 'DESC', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { status: 'active' };
    if (category && category !== 'all') {
      whereClause.category = category;
    }

    const { count, rows: stocks } = await Stock.findAndCountAll({
      where: whereClause,
      include: [{ model: User, as: 'issuer', attributes: ['username', 'profileImage', 'bio'] }],
      order: [[sortBy, sortOrder]],
      offset,
      limit: parseInt(limit)
    });

    res.json({
      stocks: stocks.map(stock => ({
        id: stock.id,
        creator: stock.issuer,
        sharePrice: stock.sharePrice,
        priceChange: stock.priceChangePercent,
        marketCap: stock.marketCapTotal,
        volume: stock.dayVolume,
        tier: stock.tier,
        category: stock.category
      })),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('섹터별 조회 오류:', error);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다' });
  }
};

/**
 * 카테고리 목록 조회
 */
exports.getCategories = async (req, res) => {
  try {
    const categories = await Stock.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('market_cap_total')), 'totalMarketCap']
      ],
      where: { status: 'active' },
      group: ['category']
    });

    const categoryLabels = {
      entertainment: { name: '연예', icon: '🎬' },
      sports: { name: '스포츠', icon: '⚽' },
      influencer: { name: '인플루언서', icon: '📱' },
      business: { name: '비즈니스', icon: '💼' },
      creator: { name: '크리에이터', icon: '🎨' },
      other: { name: '기타', icon: '📦' }
    };

    res.json({
      categories: categories.map(c => ({
        id: c.category,
        ...categoryLabels[c.category] || { name: c.category, icon: '📦' },
        stockCount: parseInt(c.dataValues.count),
        totalMarketCap: parseFloat(c.dataValues.totalMarketCap) || 0
      }))
    });
  } catch (error) {
    console.error('카테고리 조회 오류:', error);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다' });
  }
};
