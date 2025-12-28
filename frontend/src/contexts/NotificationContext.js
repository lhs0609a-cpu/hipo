import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import notificationService from '../services/notificationService';
import { t } from '../i18n';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [pushToken, setPushToken] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const [lastNotification, setLastNotification] = useState(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    initializeNotifications();

    // App state listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      notificationService.removeNotificationListeners();
    };
  }, []);

  const handleAppStateChange = async (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground - update badge count
      const count = await notificationService.getBadgeCount();
      setBadgeCount(count);
    }
    appState.current = nextAppState;
  };

  const initializeNotifications = async () => {
    try {
      // Check permission status
      const status = await notificationService.getPermissionStatus();
      setPermissionGranted(status === 'granted');

      if (status === 'granted') {
        // Register for push notifications
        const token = await notificationService.registerForPushNotifications();
        if (token) {
          setPushToken(token);
          // Send token to backend
          await notificationService.sendTokenToBackend(token);
        }
      }

      // Setup listeners
      notificationService.setupNotificationListeners(
        handleNotificationReceived,
        handleNotificationTapped
      );

      // Get initial badge count
      const count = await notificationService.getBadgeCount();
      setBadgeCount(count);
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  const handleNotificationReceived = (notification) => {
    console.log('Notification received in context:', notification);
    setLastNotification(notification);

    // Update badge count
    setBadgeCount(prev => prev + 1);
  };

  const handleNotificationTapped = (response) => {
    console.log('Notification tapped in context:', response);
    const { notification } = response;
    setLastNotification(notification);

    // Handle navigation based on notification data
    if (notification.request.content.data) {
      handleNotificationAction(notification.request.content.data);
    }
  };

  const handleNotificationAction = (data) => {
    // Handle different notification types
    console.log('Handling notification action:', data);

    // This will be connected to navigation
    // Example: navigation.navigate(data.screen, data.params);
  };

  const requestPermission = async () => {
    const granted = await notificationService.requestPermissions();
    setPermissionGranted(granted);

    if (granted) {
      const token = await notificationService.registerForPushNotifications();
      if (token) {
        setPushToken(token);
        await notificationService.sendTokenToBackend(token);
      }
      return true;
    }
    return false;
  };

  const scheduleNotification = async (title, body, data = {}, seconds = 0) => {
    if (!permissionGranted) {
      Alert.alert(
        t('notifications.permissionRequired'),
        t('notifications.permissionMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('settings.settings'), onPress: requestPermission },
        ]
      );
      return null;
    }

    return await notificationService.scheduleLocalNotification(title, body, data, seconds);
  };

  const clearBadge = async () => {
    await notificationService.clearBadge();
    setBadgeCount(0);
  };

  const updateBadgeCount = async (count) => {
    await notificationService.setBadgeCount(count);
    setBadgeCount(count);
  };

  const value = {
    pushToken,
    permissionGranted,
    badgeCount,
    lastNotification,
    requestPermission,
    scheduleNotification,
    clearBadge,
    updateBadgeCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
