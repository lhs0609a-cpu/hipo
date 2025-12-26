const {
  InvestmentStrategy,
  StrategyFollow,
  StrategyTrade,
  StrategyPerformance,
  User,
  Stock,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

/**
 * 전략 생성
 */
exports.createStrategy = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      strategyType,
      riskLevel,
      targetReturn,
      rules,
      isPublic,
      isPremium,
      subscriptionFee
    } = req.body;

    const strategy = await InvestmentStrategy.create({
      userId,
      title,
      description,
      strategyType,
      riskLevel,
      targetReturn,
      rules,
      isPublic: isPublic !== undefined ? isPublic : true,
      isPremium: isPremium || false,
      subscriptionFee: subscriptionFee || 0,
      isActive: true
    });

    // 작성자 정보와 함께 반환
    const strategyWithCreator = await InvestmentStrategy.findByPk(strategy.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'profileImage', 'trustLevel']
      }]
    });

    res.status(201).json(strategyWithCreator);
  } catch (error) {
    console.error('Create strategy error:', error);
    res.status(500).json({ error: '전략 생성 실패' });
  }
};

/**
 * 전략 목록 조회
 */
exports.getStrategies = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      strategyType,
      riskLevel,
      sortBy = 'followerCount'
    } = req.query;
    const offset = (page - 1) * limit;

    const where = { isPublic: true, isActive: true };
    if (strategyType) where.strategyType = strategyType;
    if (riskLevel) where.riskLevel = riskLevel;

    let order = [['followerCount', 'DESC']];
    if (sortBy === 'return') order = [['totalReturn', 'DESC']];
    else if (sortBy === 'winRate') order = [['winRate', 'DESC']];
    else if (sortBy === 'recent') order = [['createdAt', 'DESC']];

    const { rows: strategies, count: total } = await InvestmentStrategy.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'profileImage', 'trustLevel']
      }],
      order,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      strategies,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get strategies error:', error);
    res.status(500).json({ error: '전략 목록 조회 실패' });
  }
};

/**
 * 전략 상세 조회
 */
exports.getStrategyDetail = async (req, res) => {
  try {
    const { strategyId } = req.params;

    const strategy = await InvestmentStrategy.findByPk(strategyId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profileImage', 'trustLevel', 'bio']
        }
      ]
    });

    if (!strategy) {
      return res.status(404).json({ error: '전략을 찾을 수 없습니다.' });
    }

    // 조회수 증가
    strategy.viewCount += 1;
    await strategy.save();

    // 최근 거래 내역 조회
    const recentTrades = await StrategyTrade.findAll({
      where: { strategyId },
      include: [{
        model: Stock,
        as: 'stock',
        include: [{
          model: User,
          as: 'issuer',
          attributes: ['id', 'username', 'profileImage']
        }]
      }],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // 성과 차트 데이터 (최근 30일)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const performanceData = await StrategyPerformance.findAll({
      where: {
        strategyId,
        date: { [Op.gte]: thirtyDaysAgo }
      },
      order: [['date', 'ASC']]
    });

    res.json({
      ...strategy.toJSON(),
      recentTrades,
      performanceData
    });
  } catch (error) {
    console.error('Get strategy detail error:', error);
    res.status(500).json({ error: '전략 상세 조회 실패' });
  }
};

/**
 * 내 전략 목록
 */
exports.getMyStrategies = async (req, res) => {
  try {
    const userId = req.user.id;

    const strategies = await InvestmentStrategy.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    res.json(strategies);
  } catch (error) {
    console.error('Get my strategies error:', error);
    res.status(500).json({ error: '내 전략 조회 실패' });
  }
};

/**
 * 전략 수정
 */
exports.updateStrategy = async (req, res) => {
  try {
    const userId = req.user.id;
    const { strategyId } = req.params;
    const {
      title,
      description,
      targetReturn,
      rules,
      isPublic,
      isPremium,
      subscriptionFee,
      isActive
    } = req.body;

    const strategy = await InvestmentStrategy.findOne({
      where: { id: strategyId, userId }
    });

    if (!strategy) {
      return res.status(404).json({ error: '전략을 찾을 수 없습니다.' });
    }

    // 수정
    if (title) strategy.title = title;
    if (description) strategy.description = description;
    if (targetReturn !== undefined) strategy.targetReturn = targetReturn;
    if (rules) strategy.rules = rules;
    if (isPublic !== undefined) strategy.isPublic = isPublic;
    if (isPremium !== undefined) strategy.isPremium = isPremium;
    if (subscriptionFee !== undefined) strategy.subscriptionFee = subscriptionFee;
    if (isActive !== undefined) strategy.isActive = isActive;

    await strategy.save();

    res.json(strategy);
  } catch (error) {
    console.error('Update strategy error:', error);
    res.status(500).json({ error: '전략 수정 실패' });
  }
};

/**
 * 전략 삭제
 */
exports.deleteStrategy = async (req, res) => {
  try {
    const userId = req.user.id;
    const { strategyId } = req.params;

    const strategy = await InvestmentStrategy.findOne({
      where: { id: strategyId, userId }
    });

    if (!strategy) {
      return res.status(404).json({ error: '전략을 찾을 수 없습니다.' });
    }

    await strategy.destroy();

    res.json({ message: '전략이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete strategy error:', error);
    res.status(500).json({ error: '전략 삭제 실패' });
  }
};

/**
 * 전략 팔로우
 */
exports.followStrategy = async (req, res) => {
  try {
    const userId = req.user.id;
    const { strategyId } = req.params;
    const { isAutoCopy, copyPercentage } = req.body;

    // 전략 존재 확인
    const strategy = await InvestmentStrategy.findByPk(strategyId);
    if (!strategy) {
      return res.status(404).json({ error: '전략을 찾을 수 없습니다.' });
    }

    // 이미 팔로우 중인지 확인
    const existing = await StrategyFollow.findOne({
      where: { userId, strategyId }
    });

    if (existing) {
      return res.status(400).json({ error: '이미 팔로우 중인 전략입니다.' });
    }

    const follow = await StrategyFollow.create({
      userId,
      strategyId,
      isAutoCopy: isAutoCopy || false,
      copyPercentage: copyPercentage || 100
    });

    // 팔로워 수 증가
    strategy.followerCount += 1;
    await strategy.save();

    res.status(201).json(follow);
  } catch (error) {
    console.error('Follow strategy error:', error);
    res.status(500).json({ error: '전략 팔로우 실패' });
  }
};

/**
 * 전략 언팔로우
 */
exports.unfollowStrategy = async (req, res) => {
  try {
    const userId = req.user.id;
    const { strategyId } = req.params;

    const follow = await StrategyFollow.findOne({
      where: { userId, strategyId }
    });

    if (!follow) {
      return res.status(404).json({ error: '팔로우 정보를 찾을 수 없습니다.' });
    }

    await follow.destroy();

    // 팔로워 수 감소
    const strategy = await InvestmentStrategy.findByPk(strategyId);
    if (strategy) {
      strategy.followerCount = Math.max(0, strategy.followerCount - 1);
      await strategy.save();
    }

    res.json({ message: '언팔로우되었습니다.' });
  } catch (error) {
    console.error('Unfollow strategy error:', error);
    res.status(500).json({ error: '언팔로우 실패' });
  }
};

/**
 * 내가 팔로우한 전략 목록
 */
exports.getMyFollowedStrategies = async (req, res) => {
  try {
    const userId = req.user.id;

    const follows = await StrategyFollow.findAll({
      where: { userId },
      include: [{
        model: InvestmentStrategy,
        as: 'strategy',
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profileImage']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(follows);
  } catch (error) {
    console.error('Get followed strategies error:', error);
    res.status(500).json({ error: '팔로우 전략 조회 실패' });
  }
};

/**
 * 전략 거래 기록
 */
exports.recordTrade = async (req, res) => {
  try {
    const userId = req.user.id;
    const { strategyId } = req.params;
    const { stockId, tradeType, quantity, price, reason } = req.body;

    // 전략 소유 확인
    const strategy = await InvestmentStrategy.findOne({
      where: { id: strategyId, userId }
    });

    if (!strategy) {
      return res.status(404).json({ error: '전략을 찾을 수 없습니다.' });
    }

    const totalAmount = quantity * price;

    const trade = await StrategyTrade.create({
      strategyId,
      userId,
      stockId,
      tradeType,
      quantity,
      price,
      totalAmount,
      reason
    });

    // 주식 정보와 함께 반환
    const tradeWithStock = await StrategyTrade.findByPk(trade.id, {
      include: [{
        model: Stock,
        as: 'stock',
        include: [{
          model: User,
          as: 'issuer',
          attributes: ['id', 'username', 'profileImage']
        }]
      }]
    });

    res.status(201).json(tradeWithStock);
  } catch (error) {
    console.error('Record trade error:', error);
    res.status(500).json({ error: '거래 기록 실패' });
  }
};

/**
 * 전략 거래 내역
 */
exports.getStrategyTrades = async (req, res) => {
  try {
    const { strategyId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { rows: trades, count: total } = await StrategyTrade.findAndCountAll({
      where: { strategyId },
      include: [{
        model: Stock,
        as: 'stock',
        include: [{
          model: User,
          as: 'issuer',
          attributes: ['id', 'username', 'profileImage']
        }]
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      trades,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get strategy trades error:', error);
    res.status(500).json({ error: '거래 내역 조회 실패' });
  }
};
