import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { linking } from '../services/deepLinkService';
import haptics from '../utils/haptics';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

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

// Onboarding (첫 주주 되기)
import FirstBuyOnboardingScreen from '../screens/onboarding/FirstBuyOnboardingScreen';

// Settlement Screen
import SettlementScreen from '../screens/SettlementScreen';

// Virtual Celebrity Screens
import VirtualClaimScreen from '../screens/VirtualClaimScreen';
import AdminVirtualCelebrityScreen from '../screens/AdminVirtualCelebrityScreen';
import ClaimRequestScreen from '../screens/ClaimRequestScreen';
import ClaimStatusScreen from '../screens/ClaimStatusScreen';
import CelebSuggestionScreen from '../screens/CelebSuggestionScreen';
import AdminVirtualCelebScreen from '../screens/AdminVirtualCelebScreen';
import AdminClaimReviewScreen from '../screens/AdminClaimReviewScreen';

// Detail Screens
import PostDetailScreen from '../screens/PostDetailScreen';
import UserProfileScreen from '../screens/UserProfileScreen';

// Growth & Engagement Screens
import CopyTradingScreen from '../screens/CopyTradingScreen';

// Viral/Marketing Screens
import InviteScreen from '../screens/InviteScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import FriendRankingScreen from '../screens/FriendRankingScreen';

// Settings Screens
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import PrivacySettingsScreen from '../screens/PrivacySettingsScreen';
import AboutScreen from '../screens/AboutScreen';
import PriceAlertScreen from '../screens/PriceAlertScreen';
import TutorialScreen from '../screens/TutorialScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// 탭 정의 — 아이콘은 outline/filled 쌍으로 두어 선택 상태를 형태로도 구분한다
const TABS = [
  { name: 'Home', component: HomeScreen, title: '홈', icon: 'home-outline', iconActive: 'home' },
  {
    name: 'Community',
    component: CommunityScreen,
    title: '피드',
    icon: 'people-outline',
    iconActive: 'people',
  },
  { name: 'Menu', component: MenuScreen, title: '메뉴', icon: 'grid-outline', iconActive: 'grid' },
];

// 하단 탭 네비게이터
function MainTabs() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // 제스처바가 있는 기기에서는 인셋만큼만 더한다. 홈 버튼 기기는 최소 여백을 준다.
  const bottomInset = insets.bottom > 0 ? insets.bottom : theme.spacing.sm;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.borderLight,
          borderTopWidth: theme.layout.hairline,
          height: theme.layout.tabBarHeight + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: theme.spacing.sm,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: -0.1,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
      }}
      screenListeners={{
        tabPress: () => haptics.selection(),
      }}
    >
      {TABS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={24} color={color} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

// 메인 앱 스택
function MainStack() {
  const { theme } = useTheme();
  const { user } = useAuth();

  // 온보딩 미완료(첫 매수 동선 안 거침)면 온보딩 화면을 첫 화면으로
  const needsOnboarding = user && !user.onboardedAt;

  return (
    <Stack.Navigator
      initialRouteName={needsOnboarding ? 'FirstBuyOnboarding' : 'MainTabs'}
      screenOptions={{
        // 헤더에 그림자 대신 헤어라인 — 무게감을 줄이고 콘텐츠에 집중시킨다
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: theme.layout.hairline,
          borderBottomColor: theme.colors.borderLight,
        },
        headerTintColor: theme.colors.textPrimary,
        headerTitleAlign: 'center',
        headerBackTitleVisible: false,
        headerTitleStyle: {
          ...theme.textStyles.headline,
          color: theme.colors.textPrimary,
        },
        headerLeftContainerStyle: { paddingLeft: theme.spacing.xs },
        headerRightContainerStyle: { paddingRight: theme.spacing.base },
        headerBackImage: ({ tintColor }) => (
          <Ionicons
            name="chevron-back"
            size={26}
            color={tintColor}
            style={{ marginLeft: Platform.OS === 'ios' ? 8 : 0 }}
          />
        ),
        cardStyle: { backgroundColor: theme.colors.background },
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }}
    >
      <Stack.Screen
        name="FirstBuyOnboarding"
        component={FirstBuyOnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
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
        options={{ title: '지갑' }}
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

      {/* Settlement Screen */}
      <Stack.Screen
        name="Settlement"
        component={SettlementScreen}
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

      {/* Virtual Celebrity Screens */}
      <Stack.Screen
        name="VirtualClaim"
        component={VirtualClaimScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminVirtualCelebrity"
        component={AdminVirtualCelebrityScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClaimRequest"
        component={ClaimRequestScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClaimStatus"
        component={ClaimStatusScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CelebSuggestion"
        component={CelebSuggestionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminVirtualCeleb"
        component={AdminVirtualCelebScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminClaimReview"
        component={AdminClaimReviewScreen}
        options={{ headerShown: false }}
      />

      {/* Settings Screens */}
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PrivacySettings"
        component={PrivacySettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PriceAlert"
        component={PriceAlertScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Tutorial"
        component={TutorialScreen}
        options={{ headerShown: false }}
      />

      {/* Growth & Engagement */}
      <Stack.Screen
        name="CopyTrading"
        component={CopyTradingScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// 온보딩/인증 스택 (로그인 전)
function AuthStack() {
  const { onboardingCompleted } = useAuth();
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.textPrimary,
        headerShown: false,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }}
      initialRouteName={onboardingCompleted ? 'Login' : 'Onboarding'}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// 앱 네비게이터
export default function AppNavigator() {
  const { loading, isAuthenticated } = useAuth();
  const { theme, isDark } = useTheme();

  // React Navigation v7 은 theme.fonts 를 참조하므로 기본 테마를 반드시 스프레드한다
  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.textPrimary,
        border: theme.colors.borderLight,
        notification: theme.colors.error,
      },
    };
  }, [isDark, theme]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingWordmark, { color: theme.colors.primary }]}>HIPO</Text>
        <View style={[styles.loadingRule, { backgroundColor: theme.colors.primary }]} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme} linking={linking}>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingWordmark: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1.6,
  },
  loadingRule: {
    width: 28,
    height: 3,
    borderRadius: 2,
    marginTop: 14,
    opacity: 0.35,
  },
});
