import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const PUSH_TOKEN_KEY = '@hipo_push_token';

class PushNotificationService {
  /**
   * Register the device for push notifications.
   * - Checks for physical device
   * - Requests permission if not already granted
   * - Retrieves Expo push token and persists it locally + on backend
   * - Configures Android notification channel
   * @returns {string|null} The Expo push token, or null on failure
   */
  async registerForPushNotifications() {
    if (!Device.isDevice) {
      console.warn('PushNotificationService: Push notifications require a physical device.');
      return null;
    }

    try {
      // Check existing permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('PushNotificationService: Permission not granted for push notifications.');
        return null;
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;

      // Save token locally
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

      // Send token to backend
      await api.post('/notifications/push-token', {
        token,
        platform: Platform.OS,
      });

      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2B5FE3',
        });
      }

      return token;
    } catch (error) {
      console.error('PushNotificationService: Failed to register for push notifications:', error);
      return null;
    }
  }

  /**
   * Set up notification handlers for foreground display and user interaction.
   * - Configures how notifications appear when the app is foregrounded
   * - Listens for incoming notifications
   * - Listens for user taps on notifications (for deep link navigation)
   * @returns {Function} A cleanup function to remove all listeners
   */
  setupNotificationHandlers() {
    // Configure foreground notification behaviour
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Listener: notification received while app is foregrounded
    const notificationReceivedSubscription =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('PushNotificationService: Notification received:', notification);
      });

    // Listener: user tapped on a notification
    const notificationResponseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log('PushNotificationService: Notification tapped, data:', data);

        // Deep link navigation can be handled here based on data.screen
        if (data && data.screen) {
          // Navigation logic is delegated to the consumer of this service.
          // Emit a custom event or store the target screen for the navigator to pick up.
          this._lastNotificationResponse = response;
        }
      });

    // Return cleanup function
    return () => {
      notificationReceivedSubscription.remove();
      notificationResponseSubscription.remove();
    };
  }

  /**
   * Schedule a weekly portfolio report notification.
   * Fires every Sunday at 10:00 AM.
   */
  async schedulePortfolioReport() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '주간 포트폴리오 리포트',
        body: '이번 주 투자 성과를 확인해보세요!',
        data: { screen: 'PortfolioReport' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // Sunday (1 = Sunday in Expo)
        hour: 10,
        minute: 0,
      },
    });
  }

  /**
   * Send a local notification immediately.
   * @param {string} title - Notification title
   * @param {string} body - Notification body text
   * @param {Object} data - Optional data payload
   */
  async sendLocalNotification(title, body, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null,
    });
  }

  /**
   * Schedule a daily reminder notification at 9:00 AM.
   */
  async scheduleDailyReminder() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '오늘의 투자 현황',
        body: '출석 체크하고 보너스 받아가세요!',
        data: { screen: 'Home' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
      },
    });
  }

  /**
   * Cancel all previously scheduled notifications.
   */
  async cancelAllScheduled() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
