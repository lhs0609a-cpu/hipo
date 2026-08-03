const { User, Stock, Holding, Post, Comment, StockTransaction, Wallet } = require('../models');
const { Op } = require('sequelize');
const { sendStockPriceUpdate } = require('../config/socket');
const { checkAndTriggerCircuitBreaker } = require('../utils/circuitBreaker');

class StockPriceService {
  /**
   * 주가 계산 알고리즘
   *
   * 기본가: 100 PO
   *
   * 요소:
   * 1. 팔로워 증가율 (30%) - 최근 30일 주주 증가
   * 2. 콘텐츠 참여도 (30%) - 좋아요, 댓글, 공유 수
   * 3. 거래량 (20%) - 매수/매도 활동
   * 4. 배당 수익률 (10%) - 실제 지급된 배당
   * 5. 외부 명성 (10%) - 신뢰도 등급
   */
  async calculateStockPrice(userId) {
    try {
      const user = await User.findByPk(userId);
      const stock = await Stock.findOne({ where: { userId } });

      if (!stock) {
        console.log(`주식 없음: userId ${userId}`);
        return null;
      }

      // 기본가
      const basePrice = 100;

      // 1. 팔로워 증가율 (30%)
      const followerGrowth = await this.getFollowerGrowthRate(stock.id);
      const followerFactor = 1 + (followerGrowth * 0.3);

      // 2. 콘텐츠 참여도 (30%)
      const engagement = await this.getEngagementRate(userId);
      const engagementFactor = 1 + (engagement * 0.3);

      // 3. 거래량 (20%)
      const volume = await this.getTradingVolume(stock.id);
      const volumeFactor = 1 + (volume * 0.2);

      // 4. 배당 수익률 (10%)
      const dividendYield = await this.getDividendYield(userId);
      const dividendFactor = 1 + (dividendYield * 0.1);

      // 5. 외부 명성 (10%) - 신뢰도 등급
      const reputation = this.getReputationScore(user.trustLevel);
      const reputationFactor = 1 + (reputation * 0.1);

      // 최종 주가 계산
      const newPrice = Math.floor(
        basePrice *
        followerFactor *
        engagementFactor *
        volumeFactor *
        dividendFactor *
        reputationFactor
      );

      // 주가 업데이트
      const oldPrice = stock.sharePrice || 100;
      await stock.update({
        sharePrice: newPrice,
        previousClose: oldPrice,
        priceChangePercent: oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice * 100) : 0
      });

      console.log(`📊 주가 업데이트: ${user.username} - ${oldPrice} → ${newPrice} PO`);

      // 가격 변동률이 dailyPriceLimit을 초과하면 서킷브레이커 자동 발동
      const triggered = await checkAndTriggerCircuitBreaker(stock, oldPrice, newPrice);
      if (triggered) {
        console.log(`🚨 서킷브레이커 자동 발동: ${user.username} (${oldPrice} → ${newPrice})`);
      }

      // 주가 변동이 있으면 실시간 알림 전송
      if (oldPrice !== newPrice) {
        const changePercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice * 100).toFixed(2) : 0;
        sendStockPriceUpdate({
          userId,
          username: user.username,
          oldPrice,
          newPrice,
          changePercent: parseFloat(changePercent)
        });
      }

      return {
        userId,
        oldPrice,
        newPrice,
        change: newPrice - oldPrice,
        changePercent: oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice * 100).toFixed(2) : 0,
        factors: {
          followerGrowth,
          engagement,
          volume,
          dividendYield,
          reputation
        }
      };
    } catch (error) {
      console.error('주가 계산 오류:', error);
      throw error;
    }
  }

  /**
   * 1. 팔로워 증가율 계산
   * 최근 30일 주주 증가율
   */
  async getFollowerGrowthRate(stockId) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // 30일 이전 주주 수
      const oldCount = await Holding.count({
        where: {
          stockId,
          createdAt: { [Op.lt]: thirtyDaysAgo }
        }
      });

      // 최근 30일 신규 주주 수
      const newCount = await Holding.count({
        where: {
          stockId,
          createdAt: { [Op.gte]: thirtyDaysAgo }
        }
      });

      // 증가율 (0~1)
      const growthRate = oldCount > 0 ? newCount / oldCount : (newCount > 0 ? 0.5 : 0);

      return Math.min(growthRate, 2); // 최대 2배
    } catch (error) {
      console.error('팔로워 증가율 계산 오류:', error);
      return 0;
    }
  }

  /**
   * 2. 콘텐츠 참여도 계산
   * 최근 7일 평균 참여도 (좋아요, 댓글, 공유)
   */
  async getEngagementRate(userId) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // 최근 7일 게시물
      const posts = await Post.findAll({
        where: {
          userId,
          createdAt: { [Op.gte]: sevenDaysAgo }
        },
        attributes: ['id', 'likesCount', 'commentsCount', 'sharesCount']
      });

      if (posts.length === 0) return 0;

      // 총 참여도 계산 (좋아요 1점, 댓글 2점, 공유 3점)
      const totalEngagement = posts.reduce((sum, post) => {
        return sum +
          (post.likesCount || 0) +
          (post.commentsCount || 0) * 2 +
          (post.sharesCount || 0) * 3;
      }, 0);

      // 게시물당 평균 참여도
      const avgEngagement = totalEngagement / posts.length;

      // 정규화 (0~1, 100점을 1로)
      return Math.min(avgEngagement / 100, 3);
    } catch (error) {
      console.error('참여도 계산 오류:', error);
      return 0;
    }
  }

  /**
   * 3. 거래량 계산
   * 최근 7일 거래량
   */
  async getTradingVolume(stockId) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const transactions = await StockTransaction.findAll({
        where: {
          stockId,
          createdAt: { [Op.gte]: sevenDaysAgo }
        },
        attributes: ['quantity']
      });

      const totalVolume = transactions.reduce((sum, tx) => sum + tx.quantity, 0);

      // 정규화 (1000주를 1로)
      return Math.min(totalVolume / 1000, 2);
    } catch (error) {
      console.error('거래량 계산 오류:', error);
      return 0;
    }
  }

  /**
   * 4. 배당 수익률 계산
   * 최근 배당금 / 시가총액
   */
  async getDividendYield(userId) {
    try {
      const wallet = await Wallet.findOne({ where: { userId } });

      if (!wallet) return 0;

      // 오늘 지급한 배당
      const todayDividend = parseFloat(wallet.todayDividendReceived || 0);

      // 시가총액
      const stock = await Stock.findOne({ where: { userId } });
      const marketCap = (stock.sharePrice || 100) * stock.totalShares;

      if (marketCap === 0) return 0;

      // 배당 수익률
      const yieldRate = (todayDividend * 365) / marketCap;

      return Math.min(yieldRate, 1);
    } catch (error) {
      console.error('배당 수익률 계산 오류:', error);
      return 0;
    }
  }

  /**
   * 5. 명성 점수 (신뢰도 등급 기반)
   */
  getReputationScore(trustLevel) {
    const scores = {
      bronze: 0,
      silver: 0.2,
      gold: 0.5,
      platinum: 0.8,
      diamond: 1.2,
      master: 1.8,
      legend: 2.5
    };

    return scores[trustLevel] || 0;
  }

  /**
   * 전체 주식 주가 재계산 (크론잡용)
   */
  async recalculateAllStocks() {
    try {
      console.log('📊 전체 주식 주가 재계산 시작...');

      const stocks = await Stock.findAll({
        include: [{ model: User, as: 'creator' }]
      });

      let updated = 0;
      for (const stock of stocks) {
        await this.calculateStockPrice(stock.userId);
        updated++;
      }

      console.log(`✅ ${updated}개 주식 주가 업데이트 완료`);
    } catch (error) {
      console.error('전체 주가 재계산 오류:', error);
    }
  }
}

module.exports = new StockPriceService();
