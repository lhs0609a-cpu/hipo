import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { SocketProvider } from './src/contexts/SocketContext';
import { StockProvider } from './src/contexts/StockContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LanguageProvider>
          <NotificationProvider>
            <SocketProvider>
              <StockProvider>
                <StatusBar style="auto" />
                <AppNavigator />
              </StockProvider>
            </SocketProvider>
          </NotificationProvider>
        </LanguageProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
