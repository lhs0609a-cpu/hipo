const {
  StockAlert,
  StockAlertHistory,
  Stock,
  User,
  PriceHistory,
  Transaction
} = require('../models');
const { Op } = require('sequelize');
const { sendStockAlert } = require('../config/socket');

class StockAlertMonitorService {
  constructor() {
    this.monitoringInterval = null;
    this.checkInterval = 60000; // 1분마다 체크
  }

  /**
   * 모니터링 시작
   */
  start() {
    console.log('📊 주식 알림 모니터링 서비스 시작');

    // 즉시 한 번 실행
    this.checkAllAlerts();

    // 주기적 실행
    this.monitoringInterval = setInterval(() => {
      this.checkAllAlerts();
    }, this.checkInterval);
  }

  /**
   * 모니터링 중지
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('📊 주식 알림 모니터링 서비스 중지');
    }
  }

  /**
   * 모든 활성 알림 확인
   */
  async checkAllAlerts() {
    try {
      // 활성화된 알림 조회
      const alerts = await StockAlert.findAll({
        where: { isActive: true },
        include: [
          {
            model: Stock,
            as: 'stock',
            include: [{
              model: User,
              as: 'issuer',
              attributes: ['id', 'username', 'profileImage']
            }]
          },
          {
            model: User,
            as: 'user'
          }
        ]
      });

      console.log(`🔍 ${alerts.length}개의 활성 알림 확인 중...`);

      for (const alert of alerts) {
        await this.checkAlert(alert);
      }
    } catch (error) {
      console.error('Check all alerts error:', error);
    }
  }

  /**
   * 개별 알림 확인
   */
  async checkAlert(alert) {
    try {
      const stock = alert.stock;
      const currentPrice = stock.sharePrice;
      const priceChangePercent = stock.priceChangePercent || 0;

      let shouldTrigger = false;
      let message = '';
      let triggerValue = '';

      switch (alert.alertType) {
        case 'PRICE_ABOVE':
          if (currentPrice >= alert.targetPrice) {
            shouldTrigger = true;
            message = `${stock.issuer.username} 주식이 목표가 ${alert.targetPrice.toLocaleString()}PO에 도달했습니다. (현재가: ${currentPrice.toLocaleString()}PO)`;
            triggerValue = `${currentPrice}`;
          }
          break;

        case 'PRICE_BELOW':
          if (currentPrice <= alert.targetPrice) {
            shouldTrigger = true;
            message = `${stock.issuer.username} 주식이 목표가 ${alert.targetPrice.toLocaleString()}PO 이하로 하락했습니다. (현재가: ${currentPrice.toLocaleString()}PO)`;
            triggerValue = `${currentPrice}`;
          }
          break;

        case 'PERCENT_UP':
          if (priceChangePercent >= alert.targetPercent) {
            shouldTrigger = true;
            message = `${stock.issuer.username} 주식이 ${priceChangePercent.toFixed(2)}% 상승했습니다. (목표: ${alert.targetPercent}%)`;
            triggerValue = `${priceChangePercent.toFixed(2)}%`;
          }
          break;

        case 'PERCENT_DOWN':
          if (priceChangePercent <= -alert.targetPercent) {
            shouldTrigger = true;
            message = `${stock.issuer.username} 주식이 ${Math.abs(priceChangePercent).toFixed(2)}% 하락했습니다. (목표: ${alert.targetPercent}%)`;
            triggerValue = `${priceChangePercent.toFixed(2)}%`;
          }
          break;

        case 'VOLUME_SPIKE':
          const volumeSpike = await this.checkVolumeSpike(stock.id);
          if (volumeSpike) {
            shouldTrigger = true;
            message = `${stock.issuer.username} 주식의 거래량이 급증했습니다!`;
            triggerValue = 'SPIKE';
          }
          break;

        case 'NEW_HIGH':
          const isNewHigh = await this.checkNewHigh(stock.id, currentPrice);
          if (isNewHigh) {
            shouldTrigger = true;
            message = `${stock.issuer.username} 주식이 신고가를 경신했습니다! (${currentPrice.toLocaleString()}PO)`;
            triggerValue = 'NEW_HIGH';
          }
          break;

        case 'NEW_LOW':
          const isNewLow = await this.checkNewLow(stock.id, currentPrice);
          if (isNewLow) {
            shouldTrigger = true;
            message = `${stock.issuer.username} 주식이 신저가를 기록했습니다. (${currentPrice.toLocaleString()}PO)`;
            triggerValue = 'NEW_LOW';
          }
          break;

        case 'DIVIDEND_PAID':
          // 배당금 지급은 별도 이벤트에서 트리거
          break;
      }

      if (shouldTrigger) {
        await this.triggerAlert(alert, currentPrice, triggerValue, message);
      }
    } catch (error) {
      console.error('Check alert error:', error);
    }
  }

  /**
   * 알림 트리거
   */
  async triggerAlert(alert, currentPrice, triggerValue, message) {
    try {
      // 히스토리 생성
      const history = await StockAlertHistory.create({
        alertId: alert.id,
        userId: alert.userId,
        stockId: alert.stockId,
        alertType: alert.alertType,
        triggerPrice: currentPrice,
        triggerValue,
        message,
        isRead: false
      });

      // 실시간 알림 전송 (Socket.IO)
      if (typeof sendStockAlert === 'function') {
        sendStockAlert(alert.userId, {
          id: history.id,
          alertId: alert.id,
          stockId: alert.stockId,
          stock: alert.stock,
          alertType: alert.alertType,
          triggerPrice: currentPrice,
          message,
          createdAt: history.createdAt
        });
      }

      console.log(`🔔 알림 트리거: ${alert.user.username} - ${message}`);

      // 반복 알림이 아니면 비활성화
      if (!alert.isRecurring) {
        alert.isActive = false;
      }

      alert.lastTriggeredAt = new Date();
      await alert.save();
    } catch (error) {
      console.error('Trigger alert error:', error);
    }
  }

  /**
   * 거래량 급증 확인
   */
  async checkVolumeSpike(stockId) {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // 최근 1시간 거래량
      const recentVolume = await Transaction.count({
        where: {
          stockId,
          createdAt: { [Op.gte]: oneHourAgo }
        }
      });

      // 평균 시간당 거래량 (최근 24시간)
      const dailyVolume = await Transaction.count({
        where: {
          stockId,
          createdAt: { [Op.gte]: oneDayAgo }
        }
      });

      const avgHourlyVolume = dailyVolume / 24;

      // 최근 1시간 거래량이 평균의 3배 이상이면 급증
      return recentVolume >= avgHourlyVolume * 3;
    } catch (error) {
      console.error('Check volume spike error:', error);
      return false;
    }
  }

  /**
   * 신고가 확인
   */
  async checkNewHigh(stockId, currentPrice) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const maxPrice = await PriceHistory.max('price', {
        where: {
          stockId,
          createdAt: { [Op.gte]: thirtyDaysAgo }
        }
      });

      return currentPrice > (maxPrice || 0);
    } catch (error) {
      console.error('Check new high error:', error);
      return false;
    }
  }

  /**
   * 신저가 확인
   */
  async checkNewLow(stockId, currentPrice) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const minPrice = await PriceHistory.min('price', {
        where: {
          stockId,
          createdAt: { [Op.gte]: thirtyDaysAgo }
        }
      });

      return currentPrice < (minPrice || Infinity);
    } catch (error) {
      console.error('Check new low error:', error);
      return false;
    }
  }

  /**
   * 배당금 지급 시 알림 트리거 (외부에서 호출)
   */
  async triggerDividendAlert(userId, stockId, dividendAmount) {
    try {
      const alerts = await StockAlert.findAll({
        where: {
          userId,
          stockId,
          alertType: 'DIVIDEND_PAID',
          isActive: true
        },
        include: [
          {
            model: Stock,
            as: 'stock',
            include: [{
              model: User,
              as: 'issuer',
              attributes: ['id', 'username', 'profileImage']
            }]
          },
          {
            model: User,
            as: 'user'
          }
        ]
      });

      for (const alert of alerts) {
        const message = `${alert.stock.issuer.username} 주식의 배당금 ${dividendAmount.toLocaleString()}PO가 지급되었습니다.`;

        await this.triggerAlert(
          alert,
          alert.stock.sharePrice,
          `${dividendAmount}`,
          message
        );
      }
    } catch (error) {
      console.error('Trigger dividend alert error:', error);
    }
  }
}

// 싱글톤 인스턴스
const stockAlertMonitorService = new StockAlertMonitorService();

module.exports = stockAlertMonitorService;
