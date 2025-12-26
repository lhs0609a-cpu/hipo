const { Stock, User } = require('../models');
const { getIO } = require('../config/socket');

class StockTickerService {
  constructor() {
    this.interval = null;
    this.isRunning = false;
  }

  /**
   * 주가 티커 서비스 시작
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Stock ticker service is already running');
      return;
    }

    console.log('🚀 Starting stock ticker service...');
    this.isRunning = true;

    // 초기 브로드캐스트
    this.broadcastStockPrices();

    // 5초마다 주가 업데이트 브로드캐스트
    this.interval = setInterval(() => {
      this.broadcastStockPrices();
    }, 5000);

    console.log('✅ Stock ticker service started - broadcasting every 5 seconds');
  }

  /**
   * 주가 티커 서비스 중지
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.isRunning = false;
      console.log('🛑 Stock ticker service stopped');
    }
  }

  /**
   * 모든 주가를 브로드캐스트
   */
  async broadcastStockPrices() {
    try {
      // 상위 50개 주식 조회 (시가총액 순)
      const stocks = await Stock.findAll({
        include: [{
          model: User,
          as: 'issuer',
          attributes: ['id', 'username', 'displayName', 'profileImage', 'trustLevel']
        }],
        order: [['marketCapTotal', 'DESC']],
        limit: 50
      });

      if (stocks.length === 0) {
        return;
      }

      // 주가 데이터 포맷팅
      const tickerData = stocks.map(stock => ({
        stockId: stock.id,
        userId: stock.userId,
        username: stock.issuer?.username || 'Unknown',
        displayName: stock.issuer?.displayName || stock.issuer?.username,
        profileImage: stock.issuer?.profileImage,
        trustLevel: stock.issuer?.trustLevel || 'bronze',
        sharePrice: parseFloat(stock.sharePrice),
        priceChange: parseFloat(stock.priceChange || 0),
        priceChangePercent: parseFloat(stock.priceChangePercent || 0),
        marketCap: parseFloat(stock.marketCapTotal || 0),
        totalShares: parseInt(stock.totalShares),
        issuedShares: parseInt(stock.issuedShares),
        lastUpdated: stock.updatedAt
      }));

      // Socket.IO를 통해 모든 연결된 클라이언트에게 브로드캐스트
      const io = getIO();
      io.emit('stock:ticker_update', {
        stocks: tickerData,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error broadcasting stock prices:', error);
    }
  }

  /**
   * 특정 주식 가격 업데이트 브로드캐스트
   */
  async broadcastSingleStock(stockId) {
    try {
      const stock = await Stock.findByPk(stockId, {
        include: [{
          model: User,
          as: 'issuer',
          attributes: ['id', 'username', 'displayName', 'profileImage', 'trustLevel']
        }]
      });

      if (!stock) {
        return;
      }

      const stockData = {
        stockId: stock.id,
        userId: stock.userId,
        username: stock.issuer?.username || 'Unknown',
        displayName: stock.issuer?.displayName || stock.issuer?.username,
        profileImage: stock.issuer?.profileImage,
        trustLevel: stock.issuer?.trustLevel || 'bronze',
        sharePrice: parseFloat(stock.sharePrice),
        priceChange: parseFloat(stock.priceChange || 0),
        priceChangePercent: parseFloat(stock.priceChangePercent || 0),
        marketCap: parseFloat(stock.marketCapTotal || 0),
        lastUpdated: stock.updatedAt
      };

      const io = getIO();
      io.emit('stock:price_update', {
        stock: stockData,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error broadcasting single stock price:', error);
    }
  }
}

// 싱글톤 인스턴스
const stockTickerService = new StockTickerService();

module.exports = stockTickerService;
