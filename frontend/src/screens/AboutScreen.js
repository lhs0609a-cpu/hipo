import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '100';

const SUPPORT_EMAIL = 'support@hipo.kr';
const SUPPORT_PHONE = '1588-0000';
const FAQ_URL = 'https://hipo.kr/faq';
const NOTICE_URL = 'https://hipo.kr/notice';

export default function AboutScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [tapCount, setTapCount] = useState(0);

  const handleVersionTap = () => {
    setTapCount((prev) => prev + 1);
    if (tapCount >= 6) {
      Alert.alert('개발자 모드', '개발자 모드가 활성화되었습니다.');
      setTapCount(0);
    }
  };

  const handleOpenLink = async (url) => {
    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('오류', '링크를 열 수 없습니다.');
        }
      }
    } catch (error) {
      console.error('링크 열기 실패:', error);
    }
  };

  const handleEmail = () => {
    handleOpenLink(`mailto:${SUPPORT_EMAIL}`);
  };

  const handlePhone = () => {
    handleOpenLink(`tel:${SUPPORT_PHONE}`);
  };

  const handleKakaoChannel = () => {
    handleOpenLink('https://pf.kakao.com/_hipo');
  };

  const renderMenuItem = (icon, iconColor, label, description, onPress, showBadge = false) => (
    <TouchableOpacity
      style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
        {description && (
          <Text style={[styles.menuDescription, { color: theme.colors.textTertiary }]}>
            {description}
          </Text>
        )}
      </View>
      {showBadge && (
        <View style={[styles.newBadge, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }, { backgroundColor: theme.colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>앱 정보</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 앱 로고 및 버전 */}
        <TouchableOpacity
          style={styles.appInfoSection}
          onPress={handleVersionTap}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.colors.primary, isDark ? '#1E4BC7' : '#5E93F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.appLogo}
          >
            <Text style={styles.appLogoText}>H</Text>
          </LinearGradient>
          <Text style={[styles.appName, { color: theme.colors.textPrimary }]}>HIPO</Text>
          <Text style={[styles.appSlogan, { color: theme.colors.textSecondary }]}>
            크리에이터 주식 투자 플랫폼
          </Text>
          <View style={[styles.versionBadge, { backgroundColor: theme.colors.primaryBackground }]}>
            <Text style={[styles.versionText, { color: theme.colors.primary }]}>
              버전 {APP_VERSION} ({BUILD_NUMBER})
            </Text>
          </View>
        </TouchableOpacity>

        {/* 고객 지원 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>고객 지원</Text>

          {renderMenuItem(
            'help-circle',
            '#2B5FE3',
            '자주 묻는 질문',
            '이용 방법, 거래 관련 FAQ',
            () => handleOpenLink(FAQ_URL)
          )}

          {renderMenuItem(
            'chatbubble-ellipses',
            '#00B368',
            '1:1 문의',
            '고객센터 채팅 상담',
            handleKakaoChannel
          )}

          {renderMenuItem(
            'mail',
            '#F59B00',
            '이메일 문의',
            SUPPORT_EMAIL,
            handleEmail
          )}

          {renderMenuItem(
            'call',
            '#8B5CF6',
            '전화 문의',
            `${SUPPORT_PHONE} (평일 09:00-18:00)`,
            handlePhone
          )}
        </View>

        {/* 앱 가이드 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>앱 가이드</Text>

          {renderMenuItem(
            'book',
            '#00B368',
            '앱 사용법',
            '튜토리얼 다시보기',
            () => navigation.navigate('Tutorial', { nextScreen: 'About' })
          )}

          {renderMenuItem(
            'help-circle',
            '#2B5FE3',
            '투자 가이드',
            '크리에이터 주식 투자 방법',
            () => navigation.navigate('InvestGuide')
          )}
        </View>

        {/* 공지사항 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>공지사항</Text>

          {renderMenuItem(
            'megaphone',
            '#EC5F9E',
            '공지사항',
            '서비스 소식 및 업데이트',
            () => handleOpenLink(NOTICE_URL),
            true
          )}

          {renderMenuItem(
            'newspaper',
            '#6E8CA0',
            '업데이트 내역',
            '버전별 변경 사항',
            () => navigation.navigate('UpdateHistory')
          )}
        </View>

        {/* 약관 및 정책 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>약관 및 정책</Text>

          {renderMenuItem(
            'document-text',
            '#2B5FE3',
            '서비스 이용약관',
            null,
            () => navigation.navigate('Terms')
          )}

          {renderMenuItem(
            'shield-checkmark',
            '#00B368',
            '개인정보 처리방침',
            null,
            () => navigation.navigate('PrivacyPolicy')
          )}

          {renderMenuItem(
            'card',
            '#F59B00',
            '전자금융거래 이용약관',
            null,
            () => navigation.navigate('FinancialTerms')
          )}

          {renderMenuItem(
            'information-circle',
            '#8B5CF6',
            '오픈소스 라이선스',
            null,
            () => navigation.navigate('OpenSourceLicense')
          )}
        </View>

        {/* 사업자 정보 */}
        <View style={[styles.businessInfo, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.businessTitle, { color: theme.colors.textPrimary }]}>사업자 정보</Text>
          <View style={styles.businessContent}>
            <Text style={[styles.businessText, { color: theme.colors.textSecondary }]}>
              상호: (주)하이포
            </Text>
            <Text style={[styles.businessText, { color: theme.colors.textSecondary }]}>
              대표: 홍길동
            </Text>
            <Text style={[styles.businessText, { color: theme.colors.textSecondary }]}>
              사업자등록번호: 123-45-67890
            </Text>
            <Text style={[styles.businessText, { color: theme.colors.textSecondary }]}>
              통신판매업 신고번호: 2024-서울강남-12345
            </Text>
            <Text style={[styles.businessText, { color: theme.colors.textSecondary }]}>
              주소: 서울특별시 강남구 테헤란로 123
            </Text>
            <Text style={[styles.businessText, { color: theme.colors.textSecondary }]}>
              이메일: info@hipo.kr
            </Text>
          </View>
        </View>

        {/* SNS */}
        <View style={styles.socialSection}>
          <Text style={[styles.socialTitle, { color: theme.colors.textSecondary }]}>
            HIPO와 소통하기
          </Text>
          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => handleOpenLink('https://instagram.com/hipo_kr')}
            >
              <Ionicons name="logo-instagram" size={24} color="#E4405F" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => handleOpenLink('https://twitter.com/hipo_kr')}
            >
              <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => handleOpenLink('https://youtube.com/@hipo_kr')}
            >
              <Ionicons name="logo-youtube" size={24} color="#F0344B" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: theme.colors.surface }]}
              onPress={handleKakaoChannel}
            >
              <View style={[styles.kakaoIcon, { backgroundColor: '#FEE500' }]}>
                <Text style={styles.kakaoText}>K</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 저작권 */}
        <Text style={[styles.copyright, { color: theme.colors.textTertiary }]}>
          © 2024 HIPO. All rights reserved.
        </Text>

        {/* 하단 여백 */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  appInfoSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  appLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appLogoText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  appSlogan: {
    fontSize: 14,
    marginBottom: 16,
  },
  versionBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  versionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  menuDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  newBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  businessInfo: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 14,
    marginBottom: 24,
  },
  businessTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  businessContent: {
    gap: 6,
  },
  businessText: {
    fontSize: 13,
    lineHeight: 18,
  },
  socialSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  socialTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kakaoIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kakaoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A1418',
  },
  copyright: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
});
