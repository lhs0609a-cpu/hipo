import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import StockDetailScreen from '../screens/StockDetailScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import CommunityScreen from '../screens/CommunityScreen';
import CommunityDetailScreen from '../screens/CommunityDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FeedScreen from '../screens/FeedScreen';
import NotificationScreen from '../screens/NotificationScreen';
import WalletScreen from '../screens/WalletScreen';
import TransactionHistoryScreen from '../screens/TransactionHistoryScreen';
import EventScreen from '../screens/EventScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Icons
const TabIcon = ({ name, focused }) => {
  const icons = {
    Home: '🏠',
    Feed: '📰',
    Portfolio: '📊',
    Notification: '🔔',
    Profile: '👤',
  };

  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
        {icons[name]}
      </Text>
    </View>
  );
};

// Main Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: '홈' }}
      />
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{ tabBarLabel: '피드' }}
      />
      <Tab.Screen
        name="Portfolio"
        component={PortfolioScreen}
        options={{ tabBarLabel: '포트폴리오' }}
      />
      <Tab.Screen
        name="Notification"
        component={NotificationScreen}
        options={{ tabBarLabel: '알림' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: '프로필' }}
      />
    </Tab.Navigator>
  );
};

// Auth Stack
const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

// Main Stack
const MainStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StockDetail"
        component={StockDetailScreen}
        options={{
          title: '주식 상세',
          headerBackTitle: '뒤로',
        }}
      />
      <Stack.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          title: '커뮤니티',
          headerBackTitle: '뒤로',
        }}
      />
      <Stack.Screen
        name="CommunityDetail"
        component={CommunityDetailScreen}
        options={{
          title: '커뮤니티',
          headerBackTitle: '뒤로',
        }}
      />
      <Stack.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          title: '지갑',
          headerBackTitle: '뒤로',
        }}
      />
      <Stack.Screen
        name="TransactionHistory"
        component={TransactionHistoryScreen}
        options={{
          title: '거래 내역',
          headerBackTitle: '뒤로',
        }}
      />
      <Stack.Screen
        name="Event"
        component={EventScreen}
        options={{
          title: '이벤트',
          headerBackTitle: '뒤로',
        }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

// App Navigator - 항상 MainStack 사용 (게스트도 접근 가능)
const AppNavigator = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>HIPO</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <MainStack />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
  },
  loadingText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabBar: {
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 24,
  },
  tabIconFocused: {
    transform: [{ scale: 1.1 }],
  },
});

export default AppNavigator;
