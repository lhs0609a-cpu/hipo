import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { SocketProvider } from './src/contexts/SocketContext';
import { StockProvider } from './src/contexts/StockContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import pushNotificationService from './src/services/pushNotificationService';
import AppFrame from './src/components/ui/AppFrame';
import { startReferralCapture } from './src/services/deepLinkService';
import pendingReferral from './src/services/pendingReferral';

function AppContent() {
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();

  /**
   * 초대 링크 추적.
   *
   * 초대 링크를 누른 사람은 대개 아직 가입 전이라 그 시점엔 추천 코드를
   * 서버에 보낼 수 없다. 그래서 코드를 먼저 저장해 두고(capture),
   * 로그인/가입이 끝난 뒤에 적용한다(redeem).
   *
   * 이 배선이 없어서 초대 링크로 들어온 신규 유저가 추천인에 전혀
   * 연결되지 않았고, 초대 보상이 나가지 않아 루프가 돌지 않았다.
   */
  useEffect(() => startReferralCapture(), []);

  useEffect(() => {
    if (!isAuthenticated) return;
    pendingReferral.redeem().catch(() => {});
  }, [isAuthenticated]);

  // 푸시 알림 초기화
  useEffect(() => {
    if (isAuthenticated) {
      pushNotificationService.registerForPushNotifications().catch(() => {});
      pushNotificationService.scheduleDailyReminder().catch(() => {});
      pushNotificationService.schedulePortfolioReport().catch(() => {});
    }
    const cleanup = pushNotificationService.setupNotificationHandlers();
    return cleanup;
  }, [isAuthenticated]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/*
        넓은 뷰포트(데스크톱 브라우저 등)에서는 앱을 폰 폭으로 가둔다.
        네비게이터를 통째로 감싸므로 하단 탭바까지 함께 제약된다.
      */}
      <AppFrame>
        <AppNavigator />
      </AppFrame>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <LanguageProvider>
            <NotificationProvider>
              <SocketProvider>
                <StockProvider>
                  <AppContent />
                </StockProvider>
              </SocketProvider>
            </NotificationProvider>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
