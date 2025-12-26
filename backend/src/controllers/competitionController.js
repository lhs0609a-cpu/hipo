const {
  TradingCompetition,
  CompetitionParticipant,
  CompetitionTrade,
  User,
  Stock,
  Wallet,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

/**
 * 대회 생성 (관리자)
 */
exports.createCompetition = async (req, res) => {
  try {
    const {
      title,
      description,
      competitionType,
      rankingType,
      startDate,
      endDate,
      registrationStartDate,
      registrationEndDate,
      initialCapital,
      entryFee,
      maxParticipants,
      prizePool,
      prizeDistribution,
      rules,
      bannerImage
    } = req.body;

    const competition = await TradingCompetition.create({
      title,
      description,
      competitionType,
      rankingType: rankingType || 'PROFIT_RATE',
      startDate,
      endDate,
      registrationStartDate,
      registrationEndDate,
      initialCapital: initialCapital || 1000000,
      entryFee: entryFee || 0,
      maxParticipants,
      prizePool: prizePool || 0,
      prizeDistribution,
      rules,
      bannerImage,
      status: 'UPCOMING'
    });

    res.status(201).json(competition);
  } catch (error) {
    console.error('Create competition error:', error);
    res.status(500).json({ error: '대회 생성 실패' });
  }
};

/**
 * 대회 목록 조회
 */
exports.getCompetitions = async (req, res) => {
  try {
    const { status, competitionType, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (competitionType) where.competitionType = competitionType;

    const { rows: competitions, count: total } = await TradingCompetition.findAndCountAll({
      where,
      order: [['startDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      competitions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get competitions error:', error);
    res.status(500).json({ error: '대회 목록 조회 실패' });
  }
};

/**
 * 대회 상세 조회
 */
exports.getCompetitionDetail = async (req, res) => {
  try {
    const { competitionId } = req.params;

    const competition = await TradingCompetition.findByPk(competitionId);

    if (!competition) {
      return res.status(404).json({ error: '대회를 찾을 수 없습니다.' });
    }

    res.json(competition);
  } catch (error) {
    console.error('Get competition detail error:', error);
    res.status(500).json({ error: '대회 상세 조회 실패' });
  }
};

/**
 * 대회 참가 신청
 */
exports.joinCompetition = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { competitionId } = req.params;

    // 대회 확인
    const competition = await TradingCompetition.findByPk(competitionId);
    if (!competition) {
      await transaction.rollback();
      return res.status(404).json({ error: '대회를 찾을 수 없습니다.' });
    }

    // 참가 신청 기간 확인
    const now = new Date();
    if (now < new Date(competition.registrationStartDate)) {
      await transaction.rollback();
      return res.status(400).json({ error: '참가 신청 기간이 아닙니다.' });
    }
    if (now > new Date(competition.registrationEndDate)) {
      await transaction.rollback();
      return res.status(400).json({ error: '참가 신청이 마감되었습니다.' });
    }

    // 최대 참가자 수 확인
    if (competition.maxParticipants && competition.participantCount >= competition.maxParticipants) {
      await transaction.rollback();
      return res.status(400).json({ error: '참가자 수가 가득 찼습니다.' });
    }

    // 이미 참가 중인지 확인
    const existing = await CompetitionParticipant.findOne({
      where: { competitionId, userId }
    });

    if (existing) {
      await transaction.rollback();
      return res.status(400).json({ error: '이미 참가 신청한 대회입니다.' });
    }

    // 참가비 확인 및 차감
    if (competition.entryFee > 0) {
      const wallet = await Wallet.findOne({ where: { userId } });
      if (!wallet || wallet.balance < competition.entryFee) {
        await transaction.rollback();
        return res.status(400).json({ error: 'PO 코인이 부족합니다.' });
      }

      wallet.balance -= competition.entryFee;
      await wallet.save({ transaction });

      // 상금 풀에 추가
      competition.prizePool += competition.entryFee;
    }

    // 참가자 생성
    const participant = await CompetitionParticipant.create({
      competitionId,
      userId,
      initialCapital: competition.initialCapital,
      currentCapital: competition.initialCapital,
      portfolio: {}
    }, { transaction });

    // 참가자 수 증가
    competition.participantCount += 1;
    await competition.save({ transaction });

    await transaction.commit();

    // 사용자 정보와 함께 반환
    const participantWithUser = await CompetitionParticipant.findByPk(participant.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'profileImage', 'trustLevel']
      }]
    });

    res.status(201).json(participantWithUser);
  } catch (error) {
    await transaction.rollback();
    console.error('Join competition error:', error);
    res.status(500).json({ error: '대회 참가 신청 실패' });
  }
};

/**
 * 대회 참가 취소
 */
exports.leaveCompetition = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { competitionId } = req.params;

    const participant = await CompetitionParticipant.findOne({
      where: { competitionId, userId }
    });

    if (!participant) {
      await transaction.rollback();
      return res.status(404).json({ error: '참가 정보를 찾을 수 없습니다.' });
    }

    const competition = await TradingCompetition.findByPk(competitionId);

    // 대회 시작 전에만 취소 가능
    if (new Date() >= new Date(competition.startDate)) {
      await transaction.rollback();
      return res.status(400).json({ error: '대회 시작 후에는 참가 취소할 수 없습니다.' });
    }

    // 참가비 환불
    if (competition.entryFee > 0) {
      const wallet = await Wallet.findOne({ where: { userId } });
      wallet.balance += competition.entryFee;
      await wallet.save({ transaction });

      competition.prizePool = Math.max(0, competition.prizePool - competition.entryFee);
    }

    // 참가자 삭제
    await participant.destroy({ transaction });

    // 참가자 수 감소
    competition.participantCount = Math.max(0, competition.participantCount - 1);
    await competition.save({ transaction });

    await transaction.commit();

    res.json({ message: '대회 참가가 취소되었습니다.' });
  } catch (error) {
    await transaction.rollback();
    console.error('Leave competition error:', error);
    res.status(500).json({ error: '대회 참가 취소 실패' });
  }
};

/**
 * 대회 내 거래 (매수/매도)
 */
exports.tradeinCompetition = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { competitionId } = req.params;
    const { stockId, tradeType, quantity } = req.body;

    // 참가자 확인
    const participant = await CompetitionParticipant.findOne({
      where: { competitionId, userId }
    });

    if (!participant) {
      await transaction.rollback();
      return res.status(404).json({ error: '대회 참가자가 아닙니다.' });
    }

    // 대회 상태 확인
    const competition = await TradingCompetition.findByPk(competitionId);
    if (competition.status !== 'ONGOING') {
      await transaction.rollback();
      return res.status(400).json({ error: '대회가 진행 중이 아닙니다.' });
    }

    // 주식 정보 조회
    const stock = await Stock.findByPk(stockId);
    if (!stock) {
      await transaction.rollback();
      return res.status(404).json({ error: '주식을 찾을 수 없습니다.' });
    }

    const price = stock.sharePrice;
    const totalAmount = quantity * price;
    const portfolio = participant.portfolio || {};

    let profitLoss = null;
    let profitLossPercent = null;

    if (tradeType === 'BUY') {
      // 매수: 자본 확인
      if (participant.currentCapital < totalAmount) {
        await transaction.rollback();
        return res.status(400).json({ error: '자본이 부족합니다.' });
      }

      participant.currentCapital -= totalAmount;

      // 포트폴리오 업데이트
      if (portfolio[stockId]) {
        const existingQuantity = portfolio[stockId].quantity;
        const existingAvgPrice = portfolio[stockId].avgPrice;
        const newAvgPrice = ((existingAvgPrice * existingQuantity) + (price * quantity)) / (existingQuantity + quantity);

        portfolio[stockId] = {
          quantity: existingQuantity + quantity,
          avgPrice: Math.round(newAvgPrice)
        };
      } else {
        portfolio[stockId] = {
          quantity,
          avgPrice: price
        };
      }
    } else {
      // 매도: 보유 수량 확인
      if (!portfolio[stockId] || portfolio[stockId].quantity < quantity) {
        await transaction.rollback();
        return res.status(400).json({ error: '보유 수량이 부족합니다.' });
      }

      participant.currentCapital += totalAmount;

      // 손익 계산
      const avgPrice = portfolio[stockId].avgPrice;
      profitLoss = (price - avgPrice) * quantity;
      profitLossPercent = ((price - avgPrice) / avgPrice) * 100;

      // 포트폴리오 업데이트
      portfolio[stockId].quantity -= quantity;
      if (portfolio[stockId].quantity === 0) {
        delete portfolio[stockId];
      }

      // 통계 업데이트
      participant.totalTrades += 1;
      if (profitLoss > 0) {
        participant.winningTrades += 1;
      } else if (profitLoss < 0) {
        participant.losingTrades += 1;
      }

      if (participant.totalTrades > 0) {
        participant.winRate = (participant.winningTrades / participant.totalTrades) * 100;
      }
    }

    participant.portfolio = portfolio;

    // 수익 및 수익률 계산
    participant.totalProfit = participant.currentCapital - participant.initialCapital;
    participant.profitRate = ((participant.currentCapital - participant.initialCapital) / participant.initialCapital) * 100;

    await participant.save({ transaction });

    // 거래 기록
    const trade = await CompetitionTrade.create({
      competitionId,
      participantId: participant.id,
      userId,
      stockId,
      tradeType,
      quantity,
      price,
      totalAmount,
      profitLoss,
      profitLossPercent,
      capitalAfterTrade: participant.currentCapital
    }, { transaction });

    await transaction.commit();

    // 주식 정보와 함께 반환
    const tradeWithStock = await CompetitionTrade.findByPk(trade.id, {
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
    await transaction.rollback();
    console.error('Trade in competition error:', error);
    res.status(500).json({ error: '대회 거래 실패' });
  }
};

/**
 * 대회 리더보드 (순위)
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const { competitionId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const competition = await TradingCompetition.findByPk(competitionId);
    if (!competition) {
      return res.status(404).json({ error: '대회를 찾을 수 없습니다.' });
    }

    // 순위 산정 기준
    let orderField = 'profitRate';
    if (competition.rankingType === 'TOTAL_PROFIT') orderField = 'totalProfit';
    else if (competition.rankingType === 'TRADE_COUNT') orderField = 'totalTrades';
    else if (competition.rankingType === 'WIN_RATE') orderField = 'winRate';

    const { rows: participants, count: total } = await CompetitionParticipant.findAndCountAll({
      where: { competitionId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'profileImage', 'trustLevel']
      }],
      order: [[orderField, 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 순위 업데이트
    participants.forEach((participant, index) => {
      participant.currentRank = offset + index + 1;
    });

    res.json({
      leaderboard: participants,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: '리더보드 조회 실패' });
  }
};

/**
 * 내 대회 참가 내역
 */
exports.getMyCompetitions = async (req, res) => {
  try {
    const userId = req.user.id;

    const participants = await CompetitionParticipant.findAll({
      where: { userId },
      include: [{
        model: TradingCompetition,
        as: 'competition'
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(participants);
  } catch (error) {
    console.error('Get my competitions error:', error);
    res.status(500).json({ error: '내 대회 참가 내역 조회 실패' });
  }
};

/**
 * 내 대회 거래 내역
 */
exports.getMyCompetitionTrades = async (req, res) => {
  try {
    const userId = req.user.id;
    const { competitionId } = req.params;

    const trades = await CompetitionTrade.findAll({
      where: { competitionId, userId },
      include: [{
        model: Stock,
        as: 'stock',
        include: [{
          model: User,
          as: 'issuer',
          attributes: ['id', 'username', 'profileImage']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(trades);
  } catch (error) {
    console.error('Get my competition trades error:', error);
    res.status(500).json({ error: '대회 거래 내역 조회 실패' });
  }
};

/**
 * 대회 종료 및 보상 분배 (관리자/스케줄러)
 */
exports.finalizeCompetition = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { competitionId } = req.params;

    const competition = await TradingCompetition.findByPk(competitionId);
    if (!competition) {
      await transaction.rollback();
      return res.status(404).json({ error: '대회를 찾을 수 없습니다.' });
    }

    if (competition.status !== 'ONGOING') {
      await transaction.rollback();
      return res.status(400).json({ error: '진행 중인 대회가 아닙니다.' });
    }

    // 최종 순위 산정
    let orderField = 'profitRate';
    if (competition.rankingType === 'TOTAL_PROFIT') orderField = 'totalProfit';
    else if (competition.rankingType === 'TRADE_COUNT') orderField = 'totalTrades';
    else if (competition.rankingType === 'WIN_RATE') orderField = 'winRate';

    const participants = await CompetitionParticipant.findAll({
      where: { competitionId },
      order: [[orderField, 'DESC']]
    });

    // 최종 순위 및 상금 분배
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      participant.finalRank = i + 1;

      // 상금 분배
      const prizeDistribution = competition.prizeDistribution || {};
      const prize = prizeDistribution[i + 1] || 0;

      if (prize > 0) {
        participant.prizeAmount = prize;

        // 지갑에 상금 지급
        const wallet = await Wallet.findOne({ where: { userId: participant.userId } });
        if (wallet) {
          wallet.balance += prize;
          await wallet.save({ transaction });
        }
      }

      await participant.save({ transaction });
    }

    // 대회 상태 변경
    competition.status = 'COMPLETED';
    await competition.save({ transaction });

    await transaction.commit();

    res.json({ message: '대회가 종료되고 보상이 분배되었습니다.', competition });
  } catch (error) {
    await transaction.rollback();
    console.error('Finalize competition error:', error);
    res.status(500).json({ error: '대회 종료 및 보상 분배 실패' });
  }
};
