const { Expo } = require('expo-server-sdk');
const { User } = require('../models');

class PushNotificationService {
  constructor() {
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN,
    });
  }

  // Send push notification to a single user
  async sendToUser(userId, title, body, data = {}) {
    try {
      const user = await User.findByPk(userId);

      if (!user || !user.pushToken) {
        console.log(`No push token for user ${userId}`);
        return null;
      }

      // Check notification settings
      const settings = user.notificationSettings || {};
      if (data.type && settings[data.type] === false) {
        console.log(`User ${userId} has disabled ${data.type} notifications`);
        return null;
      }

      return await this.sendNotification(user.pushToken, title, body, data);
    } catch (error) {
      console.error('Error sending push to user:', error);
      return null;
    }
  }

  // Send push notification to multiple users
  async sendToUsers(userIds, title, body, data = {}) {
    try {
      const users = await User.findAll({
        where: {
          id: userIds
        },
        attributes: ['id', 'pushToken', 'notificationSettings']
      });

      const tokens = users
        .filter(user => user.pushToken && Expo.isExpoPushToken(user.pushToken))
        .filter(user => {
          // Check notification settings
          const settings = user.notificationSettings || {};
          return !data.type || settings[data.type] !== false;
        })
        .map(user => user.pushToken);

      if (tokens.length === 0) {
        console.log('No valid push tokens found');
        return [];
      }

      return await this.sendBatchNotifications(tokens, title, body, data);
    } catch (error) {
      console.error('Error sending push to users:', error);
      return [];
    }
  }

  // Send a single push notification
  async sendNotification(pushToken, title, body, data = {}) {
    try {
      // Check that the push token is valid
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        return null;
      }

      const message = {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        badge: 1,
      };

      const ticket = await this.expo.sendPushNotificationsAsync([message]);
      console.log('Push notification sent:', ticket);
      return ticket[0];
    } catch (error) {
      console.error('Error sending push notification:', error);
      return null;
    }
  }

  // Send batch push notifications
  async sendBatchNotifications(pushTokens, title, body, data = {}) {
    try {
      const messages = pushTokens.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        badge: 1,
      }));

      // Chunk messages for batch sending (Expo limit: 100 per batch)
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const chunkTickets = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...chunkTickets);
        } catch (error) {
          console.error('Error sending chunk:', error);
        }
      }

      console.log(`Sent ${tickets.length} push notifications`);
      return tickets;
    } catch (error) {
      console.error('Error sending batch notifications:', error);
      return [];
    }
  }

  // Notification templates
  async notifyTrade(userId, tradeType, stockName, quantity, price) {
    const title = tradeType === 'buy' ? '매수 완료' : '매도 완료';
    const body = `${stockName} ${quantity}주를 ${price.toLocaleString()}원에 ${tradeType === 'buy' ? '매수' : '매도'}했습니다`;

    return await this.sendToUser(userId, title, body, {
      type: 'trading',
      screen: 'Portfolio',
      tradeType,
      stockName,
    });
  }

  async notifyDividend(userId, amount, stockName) {
    const title = '배당금 수령';
    const body = `${stockName}에서 ${amount.toLocaleString()} PO 배당금을 받았습니다`;

    return await this.sendToUser(userId, title, body, {
      type: 'dividend',
      screen: 'Wallet',
      amount,
      stockName,
    });
  }

  async notifyPriceAlert(userId, stockName, currentPrice, targetPrice, alertType) {
    const title = '주가 알림';
    let body;

    if (alertType === 'above') {
      body = `${stockName} 주가가 ${targetPrice.toLocaleString()}원을 돌파했습니다! (현재가: ${currentPrice.toLocaleString()}원)`;
    } else if (alertType === 'below') {
      body = `${stockName} 주가가 ${targetPrice.toLocaleString()}원 아래로 떨어졌습니다! (현재가: ${currentPrice.toLocaleString()}원)`;
    } else {
      body = `${stockName} 주가가 크게 변동했습니다! (현재가: ${currentPrice.toLocaleString()}원)`;
    }

    return await this.sendToUser(userId, title, body, {
      type: 'priceAlert',
      screen: 'StockDetail',
      stockName,
      currentPrice,
    });
  }

  async notifyNewFollower(userId, followerName) {
    const title = '새로운 팔로워';
    const body = `${followerName}님이 회원님을 팔로우하기 시작했습니다`;

    return await this.sendToUser(userId, title, body, {
      type: 'social',
      screen: 'Profile',
      followerName,
    });
  }

  async notifyNewComment(userId, commenterName, postId) {
    const title = '새로운 댓글';
    const body = `${commenterName}님이 회원님의 게시물에 댓글을 남겼습니다`;

    return await this.sendToUser(userId, title, body, {
      type: 'social',
      screen: 'Post',
      postId,
    });
  }

  async notifyNewLike(userId, likerName, postId) {
    const title = '새로운 좋아요';
    const body = `${likerName}님이 회원님의 게시물을 좋아합니다`;

    return await this.sendToUser(userId, title, body, {
      type: 'social',
      screen: 'Post',
      postId,
    });
  }

  async notifyNewMessage(userId, senderName) {
    const title = '새로운 메시지';
    const body = `${senderName}님으로부터 새로운 메시지가 도착했습니다`;

    return await this.sendToUser(userId, title, body, {
      type: 'social',
      screen: 'Messages',
      senderName,
    });
  }

  async notifyStockMovement(userId, stockName, changePercent) {
    const isUp = changePercent > 0;
    const title = isUp ? '주가 급등 알림' : '주가 급락 알림';
    const body = `${stockName} 주가가 ${Math.abs(changePercent).toFixed(2)}% ${isUp ? '상승' : '하락'}했습니다`;

    return await this.sendToUser(userId, title, body, {
      type: 'priceAlert',
      screen: 'StockDetail',
      stockName,
      changePercent,
    });
  }

  async notifySystem(userId, title, body) {
    return await this.sendToUser(userId, title, body, {
      type: 'system',
    });
  }
}

module.exports = new PushNotificationService();
