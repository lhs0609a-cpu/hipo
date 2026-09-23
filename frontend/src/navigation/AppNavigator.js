import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import WelcomeScreen from '../screens/WelcomeScreen';

// Main Tab Screens
import HomeScreen from '../screens/HomeScreen';
import CommunityScreen from '../screens/CommunityScreen';
import MenuScreen from '../screens/MenuScreen';

// Detail Screens
import StockDetailScreen from '../screens/StockDetailScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import MessageScreen from '../screens/MessageScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import CommunityChatScreen from '../screens/CommunityChatScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TransactionHistoryScreen from '../screens/TransactionHistoryScreen';
import MyShareholdersScreen from '../screens/MyShareholdersScreen';
import MyInvestmentsScreen from '../screens/MyInvestmentsScreen';

// News & Info Screens
import NewsScreen from '../screens/NewsScreen';
import TermsScreen from '../screens/TermsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';

// Stock Features
import StockMarketScreen from '../screens/StockMarketScreen';
import StockAlertScreen from '../screens/StockAlertScreen';
import StrategyScreen from '../screens/StrategyScreen';
import CompetitionScreen from '../screens/CompetitionScreen';

// Verification & Payment
import VerificationRequestScreen from '../screens/VerificationRequestScreen';
import AdminVerificationScreen from '../screens/AdminVerificationScreen';
import ChargeScreen from '../screens/ChargeScreen';
import PaymentHistoryScreen from '../screens/PaymentHistoryScreen';

// Additional Feature Screens
import WalletScreen from '../screens/WalletScreen';
import NotificationScreen from '../screens/NotificationScreen';
import EventScreen from '../screens/EventScreen';
import FeedScreen from '../screens/FeedScreen';
import CommunityDetailScreen from '../screens/CommunityDetailScreen';

// Social & Content Screens
import StoryScreen from '../screens/StoryScreen';
import LiveStreamScreen from '../screens/LiveStreamScreen';
import NFTScreen from '../screens/NFTScreen';
import MerchandiseScreen from '../screens/MerchandiseScreen';
import DividendScreen from '../screens/DividendScreen';
import MissionScreen from '../screens/MissionScreen';
import RankingScreen from '../screens/RankingScreen';
import SearchScreen from '../screens/SearchScreen';

// Language & Settings
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';

// Advanced Feature Screens
import SecuritySettingsScreen from '../screens/SecuritySettingsScreen';
import PortfolioAnalysisScreen from '../screens/PortfolioAnalysisScreen';
import IPOManagementScreen from '../screens/IPOManagementScreen';
import IPOEligibilityScreen from '../screens/IPOEligibilityScreen';
import IPOListScreen from '../screens/IPOListScreen';
import IPODetailScreen from '../screens/IPODetailScreen';
import WatchlistScreen from '../screens/WatchlistScreen';
import POChargeScreen from '../screens/POChargeScreen';
import AdvancedOrderScreen from '../screens/AdvancedOrderScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';

// Pre-IPO Screens
import PreIPOListScreen from '../screens/PreIPOListScreen';
import PreIPODetailScreen from '../screens/PreIPODetailScreen';
import MyPreIPOInvestmentsScreen from '../screens/MyPreIPOInvestmentsScreen';

// Tier Screens
import TierInfoScreen from '../screens/TierInfoScreen';

// Shareholder Community Screens
import ShareholderCommunityScreen from '../screens/ShareholderCommunityScreen';

// Detail Screens
import PostDetailScreen from '../screens/PostDetailScreen';
import UserProfileScreen from '../screens/UserProfileScreen';

// Viral/Marketing Screens
import InviteScreen from '../screens/InviteScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import FriendRankingScreen from '../screens/FriendRankingScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import LoginHistoryScreen from '../screens/LoginHistoryScreen';
import TransferScreen from '../screens/TransferScreen';
import EntityDetailScreen from '../screens/EntityDetailScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// 하단 탭 네비게이터
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#2F6BFF',
        tabBarInactiveTintColor: '#9AA4B2',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#EDF0F4',
          height: 70,
          paddingBottom: 10,
          paddingTop: 7,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
        },
        tabBarIcon: ({ color, focused }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            Market: focused ? 'trending-up' : 'trending-up-outline',
            Community: focused ? 'chatbubbles' : 'chatbubbles-outline',
            Menu: focused ? 'grid' : 'grid-outline',
          };
          return <Ionicons name={icons[route.name]} size={focused ? 23 : 22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '홈',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Market"
        component={StockMarketScreen}
        options={{ title: '발견', headerShown: false }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          title: '피드',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          title: '메뉴',
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

// 메인 앱 스택
function MainStack({ initialRouteName }) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#202B3C',
        headerTitleStyle: { fontWeight: '800', fontSize: 16 },
        headerShadowVisible: false,
        cardStyle: { backgroundColor: '#F6F8FB' },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />

      {/* Auth Screens */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ headerShown: false }}
      />

      {/* Stock Screens */}
      <Stack.Screen
        name="StockDetail"
        component={StockDetailScreen}
        options={{ title: '주식 상세' }}
      />
      <Stack.Screen
        name="StockMarket"
        component={StockMarketScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StockAlert"
        component={StockAlertScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Strategy"
        component={StrategyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Competition"
        component={CompetitionScreen}
        options={{ headerShown: false }}
      />

      {/* Post & Community */}
      <Stack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Feed"
        component={FeedScreen}
        options={{ title: '피드' }}
      />
      <Stack.Screen
        name="CommunityDetail"
        component={CommunityDetailScreen}
        options={{ title: '커뮤니티' }}
      />
      <Stack.Screen
        name="CommunityChat"
        component={CommunityChatScreen}
        options={{ title: '커뮤니티 채팅' }}
      />

      {/* Message & Chat */}
      <Stack.Screen
        name="Messages"
        component={MessageScreen}
        options={{ title: '메시지' }}
      />
      <Stack.Screen
        name="ChatDetail"
        component={ChatDetailScreen}
        options={{ title: '채팅' }}
      />

      {/* Portfolio & Investment */}
      <Stack.Screen
        name="Portfolio"
        component={PortfolioScreen}
        options={{ title: '보유 크리에이터' }}
      />
      <Stack.Screen
        name="MyShareholders"
        component={MyShareholdersScreen}
        options={{ title: '내 주주 목록' }}
      />
      <Stack.Screen
        name="MyInvestments"
        component={MyInvestmentsScreen}
        options={{ title: '내 투자 현황' }}
      />
      <Stack.Screen
        name="Dividend"
        component={DividendScreen}
        options={{ title: '배당 내역' }}
      />

      {/* Wallet & Payment */}
      <Stack.Screen
        name="Wallet"
        component={WalletScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Charge"
        component={ChargeScreen}
        options={{ title: '충전하기' }}
      />
      <Stack.Screen
        name="TransactionHistory"
        component={TransactionHistoryScreen}
        options={{ title: '거래 내역' }}
      />
      <Stack.Screen
        name="PaymentHistory"
        component={PaymentHistoryScreen}
        options={{ title: '결제 내역' }}
      />

      {/* Profile & User */}
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: '프로필' }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Notification"
        component={NotificationScreen}
        options={{ title: '알림' }}
      />

      {/* News & Events */}
      <Stack.Screen
        name="News"
        component={NewsScreen}
        options={{ title: '투자 뉴스' }}
      />
      <Stack.Screen
        name="Event"
        component={EventScreen}
        options={{ title: '이벤트' }}
      />

      {/* Social Features */}
      <Stack.Screen
        name="Story"
        component={StoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LiveStream"
        component={LiveStreamScreen}
        options={{ title: '라이브' }}
      />
      <Stack.Screen
        name="NFT"
        component={NFTScreen}
        options={{ title: 'NFT' }}
      />
      <Stack.Screen
        name="Merchandise"
        component={MerchandiseScreen}
        options={{ title: '굿즈샵' }}
      />

      {/* Mission & Ranking */}
      <Stack.Screen
        name="Mission"
        component={MissionScreen}
        options={{ title: '데일리 미션' }}
      />
      <Stack.Screen
        name="Ranking"
        component={RankingScreen}
        options={{ title: '랭킹' }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: '검색' }}
      />

      {/* Verification */}
      <Stack.Screen
        name="VerificationRequest"
        component={VerificationRequestScreen}
        options={{ title: '본인 인증 요청' }}
      />
      <Stack.Screen
        name="AdminVerification"
        component={AdminVerificationScreen}
        options={{ title: '인증 관리' }}
      />

      {/* Settings & Info */}
      <Stack.Screen
        name="Terms"
        component={TermsScreen}
        options={{ title: '이용약관' }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: '개인정보 처리방침' }}
      />
      <Stack.Screen
        name="LanguageSelection"
        component={LanguageSelectionScreen}
        options={{ title: '언어 설정' }}
      />

      {/* Advanced Feature Screens */}
      <Stack.Screen
        name="SecuritySettings"
        component={SecuritySettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PortfolioAnalysis"
        component={PortfolioAnalysisScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="IPOManagement"
        component={IPOManagementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="IPOEligibility"
        component={IPOEligibilityScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="IPOList"
        component={IPOListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="IPODetail"
        component={IPODetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Watchlist"
        component={WatchlistScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="POCharge"
        component={POChargeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdvancedOrder"
        component={AdvancedOrderScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ headerShown: false }}
      />

      {/* Pre-IPO Screens */}
      <Stack.Screen
        name="PreIPOList"
        component={PreIPOListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PreIPODetail"
        component={PreIPODetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyPreIPOInvestments"
        component={MyPreIPOInvestmentsScreen}
        options={{ headerShown: false }}
      />

      {/* Tier Screens */}
      <Stack.Screen
        name="TierInfo"
        component={TierInfoScreen}
        options={{ headerShown: false }}
      />

      {/* Shareholder Community Screens */}
      <Stack.Screen
        name="ShareholderCommunity"
        component={ShareholderCommunityScreen}
        options={{ headerShown: false }}
      />

      {/* Viral/Marketing Screens */}
      <Stack.Screen
        name="Invite"
        component={InviteScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FriendRanking"
        component={FriendRankingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="LoginHistory" component={LoginHistoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Transfer" component={TransferScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CompetitionDetail" component={EntityDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="StrategyDetail" component={EntityDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="LiveStreamDetail" component={EntityDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MerchandiseDetail" component={EntityDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NFTDetail" component={EntityDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// 앱 네비게이터
export default function AppNavigator() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingMark}><Text style={styles.loadingMarkText}>H</Text></View>
        <Text style={styles.loadingText}>HIPO.</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <MainStack initialRouteName={isAuthenticated ? 'MainTabs' : 'Welcome'} />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingMark: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#2F6BFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingMarkText: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  loadingText: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: '#121926',
  },
});
