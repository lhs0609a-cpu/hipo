import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSavedUser } from '../api/auth';
import { COLORS, TRUST_LEVEL_COLORS } from '../constants/colors';
import api from '../api/client';

export default function MenuScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    loadUser();
    fetchBalance();

    // 화면이 포커스될 때마다 잔액 갱신
    const unsubscribe = navigation.addListener('focus', () => {
      fetchBalance();
    });

    return unsubscribe;
  }, [navigation]);

  const loadUser = async () => {
    try {
      const userData = await getSavedUser();
      setUser(userData);
    } catch (error) {
      console.error('사용자 정보 조회 오류:', error);
    }
  };

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
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
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
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user');
              navigation.replace('Auth');
            },
          },
        ]
      );
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </View>
    );
  }

  const trustLevelColor = TRUST_LEVEL_COLORS[user.trustLevel] || COLORS.textSecondary;

  return (
    <ScrollView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>메뉴</Text>
      </View>

      {/* 프로필 요약 */}
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => navigation.navigate('Profile', { userId: user.id })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.username?.charAt(0)?.toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <View style={styles.usernameRow}>
            <Text style={styles.username}>{user.username}</Text>
            {user.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ 인증됨</Text>
              </View>
            )}
          </View>
          <Text style={styles.email}>{user.email}</Text>
          <View style={[styles.trustBadge, { backgroundColor: trustLevelColor }]}>
            <Text style={styles.trustText}>신뢰도 {user.trustLevel}</Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* 지갑 정보 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 내 지갑</Text>
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Text style={styles.walletLabel}>충전 잔액</Text>
            {loadingBalance ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.walletBalance}>{balance.toLocaleString()}원</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.chargeButton}
            onPress={() => navigation.navigate('Charge')}
          >
            <Text style={styles.chargeButtonText}>💳 충전하기</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 자산 정보 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>자산 정보</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>PO 잔액</Text>
            <Text style={styles.infoValue}>{user.poBalance?.toLocaleString() || 0} PO</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>신뢰 배수</Text>
            <Text style={styles.infoValue}>x{user.trustMultiplier || 1}</Text>
          </View>
        </View>
      </View>

      {/* 뉴스 메뉴 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>소식</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('News')}
        >
          <Text style={styles.menuIcon}>📰</Text>
          <Text style={styles.menuText}>투자 뉴스</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 투자 & 트레이딩 메뉴 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>투자 & 트레이딩</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('StockMarket')}
        >
          <Text style={styles.menuIcon}>📊</Text>
          <Text style={styles.menuText}>실시간 크리에이터 시장</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('StockAlert')}
        >
          <Text style={styles.menuIcon}>🎯</Text>
          <Text style={styles.menuText}>크리에이터 알림 설정</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Strategy')}
        >
          <Text style={styles.menuIcon}>📈</Text>
          <Text style={styles.menuText}>투자 전략</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Competition')}
        >
          <Text style={styles.menuIcon}>🏆</Text>
          <Text style={styles.menuText}>트레이딩 대회</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 거래 메뉴 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>거래</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Portfolio')}
        >
          <Text style={styles.menuIcon}>💼</Text>
          <Text style={styles.menuText}>보유 크리에이터</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('TransactionHistory')}
        >
          <Text style={styles.menuIcon}>📋</Text>
          <Text style={styles.menuText}>거래 내역</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('MyInvestments')}
        >
          <Text style={styles.menuIcon}>📊</Text>
          <Text style={styles.menuText}>내 투자 현황</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('MyShareholders')}
        >
          <Text style={styles.menuIcon}>👥</Text>
          <Text style={styles.menuText}>내 주주 목록</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>⏳</Text>
          <Text style={styles.menuText}>미체결 주문</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>💰</Text>
          <Text style={styles.menuText}>배당금 내역</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 커뮤니티 메뉴 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>커뮤니티</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Messages')}
        >
          <Text style={styles.menuIcon}>💬</Text>
          <Text style={styles.menuText}>메시지</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>📢</Text>
          <Text style={styles.menuText}>알림</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>⭐</Text>
          <Text style={styles.menuText}>북마크</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 설정 메뉴 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>설정</Text>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>🔔</Text>
          <Text style={styles.menuText}>알림 설정</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>🔒</Text>
          <Text style={styles.menuText}>개인정보 설정</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Terms')}
        >
          <Text style={styles.menuIcon}>📋</Text>
          <Text style={styles.menuText}>이용약관</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('PrivacyPolicy')}
        >
          <Text style={styles.menuIcon}>🔒</Text>
          <Text style={styles.menuText}>개인정보 처리방침</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>❓</Text>
          <Text style={styles.menuText}>고객 지원</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 인증 메뉴 */}
      {!user.isVerified && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>인증</Text>
          <TouchableOpacity
            style={styles.verificationMenuItem}
            onPress={() => navigation.navigate('VerificationRequest')}
          >
            <Text style={styles.menuIcon}>✓</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>본인 인증 요청</Text>
              <Text style={styles.menuSubtext}>유명인, 인플루언서 인증</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 관리자 메뉴 */}
      {user.role === 'admin' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>관리자</Text>
          <TouchableOpacity
            style={styles.adminMenuItem}
            onPress={() => navigation.navigate('AdminVerification')}
          >
            <Text style={styles.menuIcon}>👑</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>인증 관리</Text>
              <Text style={styles.menuSubtext}>사용자 인증 요청 검토</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 로그아웃 버튼 */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 20,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  verifiedBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  email: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  trustBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  trustText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 24,
    color: COLORS.textTertiary,
    marginLeft: 8,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  walletCard: {
    backgroundColor: COLORS.primary,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
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
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '600',
  },
  walletBalance: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  chargeButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  chargeButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  verificationMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  adminMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
  },
  logoutButton: {
    backgroundColor: COLORS.danger,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 40,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
