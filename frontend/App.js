import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { SocketProvider } from './src/contexts/SocketContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { NotificationProvider } from './src/contexts/NotificationContext';

export default function App() {
  return (
    <LanguageProvider>
      <NotificationProvider>
        <SocketProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </SocketProvider>
      </NotificationProvider>
    </LanguageProvider>
  );
}
