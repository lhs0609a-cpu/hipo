import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';

// Trust level colors (kept static as they represent badge colors)
const TRUST_LEVEL_COLORS = {
  bronze: '#B87333',
  silver: '#9BA3AF',
  gold: '#D9A521',
  platinum: '#6E8CA0',
  diamond: '#3FB6C9',
  master: '#F0344B',
  legend: '#8B5CF6',
};

export default function MenuScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { theme, isDark, themeMode, setTheme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  // 기능 깎기: 고급 트레이딩 섹션은 첫 화면에서 숨기고 토글로만 노출
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetchBalance();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchBalance();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchBalance = async () => {
    try {
      setLoadingBalance(true);
      const response = await api.get('/payment/my-balance');
      if (response.data.success) {
        setBalance(response.data.balance);
      }
    } catch (error) {
      console.error('잔액 조회 실패:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('로그아웃 하시겠습니까?')) {
        await logout();
        window.location.href = '/';
      }
    } else {
      Alert.alert(
        '로그아웃',
        '로그아웃 하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '확인',
            onPress: async () => {
              await logout();
              // AuthContext isAuthenticated=false가 되면
              // AppNavigator가 자동으로 Auth 화면으로 전환합니다
            },
          },
        ]
      );
    }
  };

  const handleThemeChange = (mode) => {
    setTheme(mode);
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>로딩 중...</Text>
        </View>
      </View>
    );
  }

  const trustLevelColor = TRUST_LEVEL_COLORS[user.trustLevel] || theme.colors.textSecondary;

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }, { backgroundColor: theme.colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>메뉴</Text>
      </View>

      {/* 프로필 요약 */}
      <TouchableOpacity
        style={[styles.profileCard, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}
        onPress={() => navigation.navigate('Profile', { userId: user.id })}
      >
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.avatarText}>{user.username?.charAt(0)?.toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <View style={styles.usernameRow}>
            <Text style={[styles.username, { color: theme.colors.textPrimary }]}>{user.username}</Text>
            {user.isVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: theme.colors.success }]}>
                <Text style={styles.verifiedText}>✓ 인증됨</Text>
              </View>
            )}
          </View>
          <Text style={[styles.email, { color: theme.colors.textSecondary }]}>{user.email}</Text>
          <View style={[styles.trustBadge, { backgroundColor: trustLevelColor }]}>
            <Text style={styles.trustText}>신뢰도 {user.trustLevel}</Text>
          </View>
        </View>
        <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
      </TouchableOpacity>

      {/* 지갑 정보 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>내 지갑</Text>
        <View style={[styles.walletCard, { backgroundColor: theme.colors.primary }]}>
          <View style={styles.walletHeader}>
            <Text style={styles.walletLabel}>PO 잔액</Text>
            <Text style={styles.walletBalance}>{user.poBalance?.toLocaleString() || 0} PO</Text>
          </View>
          <View style={styles.walletButtons}>
            <TouchableOpacity
              style={[styles.chargeButton, styles.chargeButtonHalf]}
              onPress={() => navigation.navigate('POCharge')}
            >
              <Text style={[styles.chargeButtonText, { color: theme.colors.primary }]}>충전</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chargeButton, styles.chargeButtonHalf, styles.secondaryButton]}
              onPress={() => navigation.navigate('Wallet')}
            >
              <Text style={styles.secondaryButtonText}>내역</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 자산 정보 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>자산 정보</Text>
        <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>PO 잔액</Text>
            <Text style={[styles.infoValue, { color: theme.colors.textPrimary }]}>{user.poBalance?.toLocaleString() || 0} PO</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>신뢰 배수</Text>
            <Text style={[styles.infoValue, { color: theme.colors.textPrimary }]}>x{user.trustMultiplier || 1}</Text>
          </View>
        </View>
      </View>

      {/* 이벤트 & 보상 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>이벤트 & 보상</Text>
        <TouchableOpacity
          style={[styles.menuItem, styles.highlightMenuItem, { backgroundColor: isDark ? theme.colors.surfaceSecondary : '#FFF6E6', borderColor: isDark ? theme.colors.warning : '#FBBF4C' }]}
          onPress={() => navigation.navigate('Invite')}
        >
          <Ionicons name="gift-outline" style={styles.menuIcon} />
          <View style={styles.menuTextContainer}>
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>친구 초대</Text>
            <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>친구 초대하고 1,500 PO 받기</Text>
          </View>
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>HOT</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('Attendance')}
        >
          <Ionicons name="calendar-outline" style={styles.menuIcon} />
          <View style={styles.menuTextContainer}>
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>출석 체크</Text>
            <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>매일 100 PO, 7일 연속 2배!</Text>
          </View>
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('FriendRanking')}
        >
          <Ionicons name="trophy-outline" style={styles.menuIcon} />
          <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>친구 랭킹</Text>
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('CopyTrading')}
        >
          <Ionicons name="ribbon-outline" style={styles.menuIcon} />
          <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>인기 투자자</Text>
          <View style={{ backgroundColor: '#EEF4FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 8 }}>
            <Text style={{ fontSize: 11, color: '#2B5FE3', fontWeight: '700' }}>NEW</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 뉴스 메뉴 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>소식</Text>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('News')}
        >
          <Ionicons name="newspaper-outline" style={styles.menuIcon} />
          <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>투자 뉴스</Text>
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 투자 & 트레이딩 메뉴 (거래소만 기본 노출, 고급 기능은 토글) */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>투자 & 트레이딩</Text>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('StockMarket')}
        >
          <Ionicons name="bar-chart-outline" style={styles.menuIcon} />
          <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>실시간 크리에이터 시장</Text>
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>

        {showAdvanced && (
          <>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
              onPress={() => navigation.navigate('Watchlist')}
            >
              <Ionicons name="star-outline" style={styles.menuIcon} />
              <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>관심종목</Text>
              <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
              onPress={() => navigation.navigate('PortfolioAnalysis')}
            >
              <Ionicons name="trending-up-outline" style={styles.menuIcon} />
              <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>포트폴리오 분석</Text>
              <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
              onPress={() => navigation.navigate('StockAlert')}
            >
              <Ionicons name="locate-outline" style={styles.menuIcon} />
              <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>크리에이터 알림 설정</Text>
              <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
              onPress={() => navigation.navigate('Strategy')}
            >
              <Ionicons name="bulb-outline" style={styles.menuIcon} />
              <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>투자 전략</Text>
              <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
              onPress={() => navigation.navigate('Competition')}
            >
              <Ionicons name="medal-outline" style={styles.menuIcon} />
              <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>트레이딩 대회</Text>
              <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.surface, justifyContent: 'center' }]}
          onPress={() => setShowAdvanced((v) => !v)}
        >
          <Text style={[styles.menuText, { color: theme.colors.textSecondary, flex: 0 }]}>
            {showAdvanced ? '고급 기능 접기 ▴' : '고급 기능 더보기 ▾'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 거래 메뉴 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>거래</Text>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('Portfolio')}
        >
          <Ionicons name="briefcase-outline" style={styles.menuIcon} />
          <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>보유 크리에이터</Text>
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('TransactionHistory')}
        >
          <Ionicons name="clipboard-outline" style={styles.menuIcon} />
          <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>거래 내역</Text>
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('MyInvestments')}
        >
          <Ionicons name="bar-chart-outline" style={styles.menuIcon} />
          <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>내 투자 현황</Text>
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('MyShareholders')}
        >
          <Ionicons name="people-outline" style={styles.menuIcon} />
          <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>내 주주 목록</Text>
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="hourglass-outline" style={styles.menuIcon} />
          <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>미체결 주문</Text>
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="wallet-outline" style={styles.menuIcon} />
          <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>배당금 내역</Text>
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 커뮤니티 메뉴 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>커뮤니티</Text>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('Messages')}
        >
          <Ionicons name="chatbubble-outline" style={styles.menuIcon} />
          <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>메시지</Text>
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="megaphone-outline" style={styles.menuIcon} />
          <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>알림</Text>
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="star-outline" style={styles.menuIcon} />
          <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>북마크</Text>
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 화면 설정 (다크모드) */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>화면 설정</Text>

        {/* 다크 모드 토글 */}
        <View style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="moon-outline" style={styles.menuIcon} />
          <View style={styles.menuTextContainer}>
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>다크 모드</Text>
            <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>
              {themeMode === 'system' ? '시스템 설정 사용 중' : isDark ? '다크 모드 사용 중' : '라이트 모드 사용 중'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
            thumbColor={isDark ? theme.colors.primary : theme.colors.gray300}
          />
        </View>

        {/* 테마 선택 */}
        <View style={[styles.themeSelector, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={[
              styles.themeOption,
              themeMode === 'light' && { backgroundColor: theme.colors.primaryBackground }
            ]}
            onPress={() => handleThemeChange('light')}
          >
            <Text style={[styles.themeOptionText, { color: themeMode === 'light' ? theme.colors.primary : theme.colors.textSecondary }]}>
              ☀️ 라이트
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.themeOption,
              themeMode === 'dark' && { backgroundColor: theme.colors.primaryBackground }
            ]}
            onPress={() => handleThemeChange('dark')}
          >
            <Text style={[styles.themeOptionText, { color: themeMode === 'dark' ? theme.colors.primary : theme.colors.textSecondary }]}>
              🌙 다크
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.themeOption,
              themeMode === 'system' && { backgroundColor: theme.colors.primaryBackground }
            ]}
            onPress={() => handleThemeChange('system')}
          >
            <Text style={[styles.themeOptionText, { color: themeMode === 'system' ? theme.colors.primary : theme.colors.textSecondary }]}>
              ⚙️ 시스템
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 설정 메뉴 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>설정</Text>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('SecuritySettings')}
        >
          <Ionicons name="lock-closed-outline" style={styles.menuIcon} />
          <View style={styles.menuTextContainer}>
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>보안 설정</Text>
            <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>2FA, 거래 PIN, 일일 한도</Text>
          </View>
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('NotificationSettings')}
        >
          <Ionicons name="notifications-outline" style={styles.menuIcon} />
          <View style={styles.menuTextContainer}>
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>알림 설정</Text>
            <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>거래, 가격, 소셜 알림 관리</Text>
          </View>
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('PrivacySettings')}
        >
          <Ionicons name="lock-closed-outline" style={styles.menuIcon} />
          <View style={styles.menuTextContainer}>
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>개인정보 설정</Text>
            <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>프로필 공개, 데이터 관리</Text>
          </View>
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('Terms')}
        >
          <Ionicons name="clipboard-outline" style={styles.menuIcon} />
          <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>이용약관</Text>
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('PrivacyPolicy')}
        >
          <Ionicons name="document-text-outline" style={styles.menuIcon} />
          <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>개인정보 처리방침</Text>
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('About')}
        >
          <Ionicons name="help-circle-outline" style={styles.menuIcon} />
          <View style={styles.menuTextContainer}>
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>고객 지원 & 앱 정보</Text>
            <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>FAQ, 문의, 버전 정보</Text>
          </View>
          <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 크리에이터 메뉴 (상장인인 경우) */}
      {user.isCreator && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>크리에이터</Text>
          <TouchableOpacity
            style={[styles.menuItem, styles.creatorMenuItem, { backgroundColor: isDark ? 'rgba(0, 179, 104, 0.15)' : '#E7F8F0', borderColor: isDark ? 'rgba(129, 199, 132, 0.5)' : '#5FD3A0' }]}
            onPress={() => navigation.navigate('IPOManagement')}
          >
            <Ionicons name="ribbon-outline" style={styles.menuIcon} />
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>IPO 관리</Text>
              <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>티어, 유상증자, 자사주 관리</Text>
            </View>
            <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
          </TouchableOpacity>
          {/* 게임머니 모델: 현금 출금(수익 정산) 메뉴 제거 — PO는 앱 내에서만 사용 */}
        </View>
      )}

      {/* 인증 메뉴 */}
      {!user.isVerified && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>인증</Text>
          <TouchableOpacity
            style={[styles.verificationMenuItem, { backgroundColor: theme.colors.primaryBackground, borderColor: theme.colors.primaryLight }]}
            onPress={() => navigation.navigate('VerificationRequest')}
          >
            <Text style={styles.menuIcon}>✓</Text>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>본인 인증 요청</Text>
              <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>유명인, 인플루언서 인증</Text>
            </View>
            <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 관리자 메뉴 */}
      {user.role === 'admin' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>관리자</Text>
          <TouchableOpacity
            style={[styles.adminMenuItem, { backgroundColor: isDark ? 'rgba(255, 145, 0, 0.15)' : 'rgba(255, 145, 0, 0.1)', borderColor: isDark ? 'rgba(255, 145, 0, 0.5)' : 'rgba(255, 145, 0, 0.3)' }]}
            onPress={() => navigation.navigate('AdminDashboard')}
          >
            <Ionicons name="bar-chart-outline" style={styles.menuIcon} />
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>관리자 대시보드</Text>
              <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>통계, IPO 심사, 이상 탐지</Text>
            </View>
            <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.adminMenuItem, { backgroundColor: isDark ? 'rgba(255, 145, 0, 0.15)' : 'rgba(255, 145, 0, 0.1)', borderColor: isDark ? 'rgba(255, 145, 0, 0.5)' : 'rgba(255, 145, 0, 0.3)' }]}
            onPress={() => navigation.navigate('AdminVerification')}
          >
            <Text style={styles.menuIcon}>✓</Text>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>인증 관리</Text>
              <Text style={[styles.menuSubtext, { color: theme.colors.textSecondary }]}>사용자 인증 요청 검토</Text>
            </View>
            <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 로그아웃 버튼 */}
      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: theme.colors.error }]}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginTop: 8,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: t.colors.surface,
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  username: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  verifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedText: {
    color: t.colors.surface,
    fontSize: 11,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  email: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    marginBottom: 8,
  },
  trustBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  trustText: {
    color: t.colors.surface,
    fontSize: 11,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 24,
    fontFamily: t.fonts.regular,
    marginLeft: 8,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
  },
  infoValue: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  walletCard: {
    padding: 20,
    borderRadius: 16,
    shadowColor: t.colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletLabel: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    color: t.colors.surface,
    opacity: 0.9,
    fontWeight: '600',
  },
  walletBalance: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.surface,
  },
  walletButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  chargeButton: {
    backgroundColor: t.colors.surface,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  chargeButtonHalf: {
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  chargeButtonText: {
    fontSize: 15,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: t.colors.surface,
    fontSize: 15,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuIcon: {
    fontSize: 20,
    fontFamily: t.fonts.regular,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontFamily: t.fonts.medium,
    fontWeight: '500',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuSubtext: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    marginTop: 2,
  },
  verificationMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  adminMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  highlightMenuItem: {
    borderWidth: 1,
  },
  newBadge: {
    backgroundColor: t.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  newBadgeText: {
    color: t.colors.surface,
    fontSize: 11,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  creatorMenuItem: {
    borderWidth: 1,
  },
  themeSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginTop: 8,
  },
  themeOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  themeOptionText: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 40,
    alignItems: 'center',
  },
  logoutText: {
    color: t.colors.surface,
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
});
