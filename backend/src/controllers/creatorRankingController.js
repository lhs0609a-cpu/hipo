const creatorRankingService = require('../services/creatorRankingService');

/**
 * 크리에이터 랭킹 목록 조회
 */
exports.getRankings = async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const rankings = await creatorRankingService.getTopCreators(parseInt(limit));

    res.json({
      rankings,
      total: rankings.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('랭킹 조회 오류:', error);
    res.status(500).json({ error: '랭킹 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 특정 크리에이터 랭킹 조회
 */
exports.getCreatorRanking = async (req, res) => {
  try {
    const { userId } = req.params;
    const ranking = await creatorRankingService.getCreatorRanking(parseInt(userId));

    if (!ranking) {
      return res.status(404).json({ error: '크리에이터를 찾을 수 없습니다' });
    }

    res.json(ranking);
  } catch (error) {
    console.error('크리에이터 랭킹 조회 오류:', error);
    res.status(500).json({ error: '랭킹 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 내 랭킹 조회
 */
exports.getMyRanking = async (req, res) => {
  try {
    const userId = req.user.id;
    const ranking = await creatorRankingService.getCreatorRanking(userId);

    if (!ranking) {
      return res.json({
        message: '아직 랭킹이 없습니다. 주식을 발행하고 활동을 시작하세요!',
        hasRanking: false
      });
    }

    res.json({
      hasRanking: true,
      ...ranking
    });
  } catch (error) {
    console.error('내 랭킹 조회 오류:', error);
    res.status(500).json({ error: '랭킹 조회 중 오류가 발생했습니다' });
  }
};
