const { User, Stock, Holding, Follow, Post, sequelize } = require('../models');
const { Op } = require('sequelize');

class CreatorRankingService {
  /**
   * 크리에이터 랭킹 계산
   * 다양한 지표를 종합하여 점수 산정
   */
  async calculateCreatorRankings() {
    try {
      // 모든 크리에이터 조회 (주식이 발행된 사용자)
      const creators = await User.findAll({
        include: [{
          model: Stock,
          as: 'issuedStock',
          required: true
        }]
      });

      const rankings = [];

      for (const creator of creators) {
        const score = await this.calculateCreatorScore(creator.id);

        rankings.push({
          userId: creator.id,
          username: creator.username,
          displayName: creator.displayName || creator.username,
          profileImage: creator.profileImage,
          bio: creator.bio,
          trustLevel: creator.trustLevel,
          score: score.total,
          metrics: score.metrics,
          rank: 0 // Will be set after sorting
        });
      }

      // 점수 순으로 정렬
      rankings.sort((a, b) => b.score - a.score);

      // 랭크 설정
      rankings.forEach((creator, index) => {
        creator.rank = index + 1;
      });

      return rankings;
    } catch (error) {
      console.error('크리에이터 랭킹 계산 오류:', error);
      throw error;
    }
  }

  /**
   * 개별 크리에이터 점수 계산
   */
  async calculateCreatorScore(userId) {
    try {
      // 주식 정보
      const stock = await Stock.findOne({
        where: { userId },
        include: [{
          model: User,
          as: 'issuer'
        }]
      });

      if (!stock) {
        return { total: 0, metrics: {} };
      }

      // 팔로워 수
      const followerCount = await Follow.count({
        where: { followingId: userId }
      });

      // 주주 수
      const holderCount = await Holding.count({
        where: { stockId: stock.id, shares: { [Op.gt]: 0 } }
      });

      // 게시글 수
      const postCount = await Post.count({
        where: { userId }
      });

      // 게시글 좋아요 합계
      const postLikesResult = await sequelize.query(
        `SELECT SUM(likesCount) as totalLikes FROM posts WHERE userId = ?`,
        {
          replacements: [userId],
          type: sequelize.QueryTypes.SELECT
        }
      );
      const totalLikes = postLikesResult[0]?.totalLikes || 0;

      // 시가총액
      const marketCap = parseFloat(stock.marketCapTotal || 0);

      // 주가 변동률
      const priceChangePercent = parseFloat(stock.priceChangePercent || 0);

      // 점수 계산 (가중치 적용)
      const metrics = {
        marketCap: marketCap,
        marketCapScore: Math.min(marketCap / 1000000, 100), // 최대 100점
        followers: followerCount,
        followersScore: Math.min(followerCount * 2, 50), // 최대 50점
        holders: holderCount,
        holdersScore: Math.min(holderCount * 3, 75), // 최대 75점
        posts: postCount,
        postsScore: Math.min(postCount * 0.5, 25), // 최대 25점
        likes: totalLikes,
        likesScore: Math.min(totalLikes * 0.1, 25), // 최대 25점
        priceChange: priceChangePercent,
        priceChangeScore: Math.max(Math.min(priceChangePercent * 2, 25), -25), // -25 ~ 25점
        trustLevel: stock.issuer?.trustLevel || 'bronze',
        trustLevelScore: this.getTrustLevelScore(stock.issuer?.trustLevel)
      };

      const totalScore =
        metrics.marketCapScore +
        metrics.followersScore +
        metrics.holdersScore +
        metrics.postsScore +
        metrics.likesScore +
        metrics.priceChangeScore +
        metrics.trustLevelScore;

      return {
        total: Math.round(totalScore),
        metrics
      };
    } catch (error) {
      console.error('크리에이터 점수 계산 오류:', error);
      return { total: 0, metrics: {} };
    }
  }

  /**
   * 신뢰도 레벨에 따른 점수
   */
  getTrustLevelScore(level) {
    const scores = {
      bronze: 0,
      silver: 5,
      gold: 10,
      platinum: 15,
      diamond: 20,
      master: 25,
      legend: 30
    };
    return scores[level] || 0;
  }

  /**
   * 상위 N명의 크리에이터 조회
   */
  async getTopCreators(limit = 100) {
    const rankings = await this.calculateCreatorRankings();
    return rankings.slice(0, limit);
  }

  /**
   * 특정 크리에이터의 랭킹 조회
   */
  async getCreatorRanking(userId) {
    const rankings = await this.calculateCreatorRankings();
    const creatorRanking = rankings.find(r => r.userId === userId);

    if (!creatorRanking) {
      return null;
    }

    // 전후 랭킹도 함께 반환
    const rankIndex = creatorRanking.rank - 1;
    const nearbyRankings = rankings.slice(
      Math.max(0, rankIndex - 2),
      Math.min(rankings.length, rankIndex + 3)
    );

    return {
      creator: creatorRanking,
      nearby: nearbyRankings,
      total: rankings.length
    };
  }
}

// 싱글톤 인스턴스
const creatorRankingService = new CreatorRankingService();

module.exports = creatorRankingService;
