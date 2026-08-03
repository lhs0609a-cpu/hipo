import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_URL } from '../config';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';

const WELCOME_BONUS = 10000; // 웰컴 보너스 금액

export default function RegisterScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [welcomeModalVisible, setWelcomeModalVisible] = useState(false);
  const [welcomeBonusAmount, setWelcomeBonusAmount] = useState(WELCOME_BONUS);

  const handleRegister = async () => {
    // 디버깅: 입력값 출력
    console.log('=== 회원가입 입력값 확인 ===');
    console.log('이메일:', JSON.stringify(email), '길이:', email?.length, '타입:', typeof email);
    console.log('사용자명:', JSON.stringify(username), '길이:', username?.length, '타입:', typeof username);
    console.log('비밀번호:', '***', '길이:', password?.length, '타입:', typeof password);
    console.log('비밀번호 확인:', '***', '길이:', confirmPassword?.length, '타입:', typeof confirmPassword);

    // 각 필드를 개별적으로 검증
    const errors = [];

    // 이메일 검증
    if (!email || email.trim() === '') {
      errors.push('이메일을 입력해주세요');
      console.log('❌ 이메일 검증 실패: 빈 값');
    } else if (!email.includes('@')) {
      errors.push('올바른 이메일 형식이 아닙니다 (예: user@example.com)');
      console.log('❌ 이메일 검증 실패: @ 없음');
    } else {
      console.log('✅ 이메일 검증 통과');
    }

    // 사용자명 검증
    if (!username || username.trim() === '') {
      errors.push('사용자명을 입력해주세요');
      console.log('❌ 사용자명 검증 실패: 빈 값');
    } else if (username.length < 3) {
      errors.push('사용자명은 최소 3자 이상이어야 합니다');
      console.log('❌ 사용자명 검증 실패: 3자 미만');
    } else if (username.length > 20) {
      errors.push('사용자명은 최대 20자까지 가능합니다');
      console.log('❌ 사용자명 검증 실패: 20자 초과');
    } else {
      console.log('✅ 사용자명 검증 통과');
    }

    // 비밀번호 검증
    if (!password || password.trim() === '') {
      errors.push('비밀번호를 입력해주세요');
      console.log('❌ 비밀번호 검증 실패: 빈 값');
    } else {
      // 비밀번호 강도 검증
      const passwordIssues = [];
      if (password.length < 6) {
        passwordIssues.push(`현재 ${password.length}자 (최소 6자 필요)`);
        console.log('❌ 비밀번호 검증 실패: 6자 미만');
      }
      if (password.length > 50) {
        passwordIssues.push('비밀번호가 너무 깁니다 (최대 50자)');
        console.log('❌ 비밀번호 검증 실패: 50자 초과');
      }
      if (passwordIssues.length > 0) {
        errors.push('비밀번호: ' + passwordIssues.join(', '));
      } else {
        console.log('✅ 비밀번호 검증 통과');
      }
    }

    // 비밀번호 확인 검증
    if (!confirmPassword || confirmPassword.trim() === '') {
      errors.push('비밀번호 확인을 입력해주세요');
      console.log('❌ 비밀번호 확인 검증 실패: 빈 값');
    } else if (password !== confirmPassword) {
      errors.push('비밀번호가 일치하지 않습니다');
      console.log('❌ 비밀번호 확인 검증 실패: 불일치');
    } else {
      console.log('✅ 비밀번호 확인 검증 통과');
    }

    // 에러가 있으면 표시
    if (errors.length > 0) {
      console.log('❌ 총', errors.length, '개의 오류 발견');
      const errorMessage = '입력 오류:\n\n' + errors.map((err, idx) => `${idx + 1}. ${err}`).join('\n');
      if (Platform.OS === 'web') {
        alert(errorMessage);
      } else {
        Alert.alert('입력 오류', errors.join('\n\n'));
      }
      return;
    }

    console.log('✅ 모든 검증 통과! 서버에 요청 보냅니다.');

    setLoading(true);

    try {
      console.log('회원가입 시도:', email, username);
      const result = await register({ email, username, password });
      console.log('회원가입 결과:', result);

      if (result.success) {
        // AuthContext가 자동으로 토큰/사용자 정보를 저장하고 isAuthenticated를 설정

        // 웰컴 보너스 모달 표시
        if (Platform.OS === 'web') {
          alert(`🎉 환영합니다!\n\n${WELCOME_BONUS.toLocaleString()} PO가 지급되었습니다.\n지금 바로 투자를 시작해보세요!`);
          window.location.href = '/';
        } else {
          setWelcomeModalVisible(true);
        }
      } else {
        const errorMsg = result.error || '회원가입 중 오류가 발생했습니다';
        if (Platform.OS === 'web') {
          alert('회원가입 실패: ' + errorMsg);
        } else {
          Alert.alert('회원가입 실패', errorMsg);
        }
      }
    } catch (error) {
      console.error('회원가입 실패:', error);
      const errorMsg = error.message || '회원가입 중 오류가 발생했습니다';

      if (Platform.OS === 'web') {
        alert('회원가입 실패: ' + errorMsg);
      } else {
        Alert.alert('회원가입 실패', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // Google OAuth URL을 환경변수 기반으로 설정
      const baseUrl = API_URL.replace('/api', '');
      const googleAuthUrl = `${baseUrl}/api/auth/google`;

      if (Platform.OS === 'web') {
        // 웹에서는 직접 페이지 이동
        window.location.href = googleAuthUrl;
      } else {
        // 모바일에서는 Linking API 사용
        const supported = await Linking.canOpenURL(googleAuthUrl);
        if (supported) {
          await Linking.openURL(googleAuthUrl);
        } else {
          Alert.alert('오류', 'Google 로그인을 열 수 없습니다');
        }
      }
    } catch (error) {
      console.error('Google 로그인 오류:', error);
      if (Platform.OS === 'web') {
        alert('Google 로그인 중 오류가 발생했습니다');
      } else {
        Alert.alert('오류', 'Google 로그인 중 오류가 발생했습니다');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>회원가입</Text>
          <Text style={styles.subtitle}>
            HIPO에 가입하고 사람들과 거래를 시작하세요
          </Text>

          {/* 웰컴 보너스 배너 */}
          <View style={styles.welcomeBanner}>
            <LinearGradient
              colors={['#D9A521', '#F59B00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.welcomeBannerGradient}
            >
              <Ionicons name="gift" size={24} color="#fff" />
              <View style={styles.welcomeBannerText}>
                <Text style={styles.welcomeBannerTitle}>신규 가입 보너스</Text>
                <Text style={styles.welcomeBannerAmount}>{WELCOME_BONUS.toLocaleString()} PO 즉시 지급!</Text>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="이메일"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {email && !email.includes('@') && (
                <Text style={styles.helperText}>이메일 형식: user@example.com</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="사용자명 (3-20자)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
              {username && username.length < 3 && (
                <Text style={styles.helperText}>
                  {username.length}/3 (최소 3자 필요)
                </Text>
              )}
              {username && username.length >= 3 && (
                <Text style={styles.helperTextSuccess}>사용 가능</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="비밀번호 (최소 6자)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              {password && password.length < 6 && (
                <Text style={styles.helperText}>
                  {password.length}/6 (최소 6자 필요)
                </Text>
              )}
              {password && password.length >= 6 && (
                <Text style={styles.helperTextSuccess}>강도: 양호</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="비밀번호 확인"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
              {confirmPassword && password !== confirmPassword && (
                <Text style={styles.helperText}>비밀번호가 일치하지 않습니다</Text>
              )}
              {confirmPassword && password === confirmPassword && password.length >= 6 && (
                <Text style={styles.helperTextSuccess}>비밀번호 일치</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>가입하기</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
            >
              <Text style={styles.googleButtonText}>Google로 가입</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.linkText}>이미 계정이 있으신가요? 로그인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 웰컴 보너스 모달 */}
      <Modal
        visible={welcomeModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#D9A521', '#F59B00']}
              style={styles.modalHeader}
            >
              <View style={styles.giftIconContainer}>
                <Ionicons name="gift" size={48} color="#fff" />
              </View>
            </LinearGradient>

            <View style={styles.modalBody}>
              <Text style={styles.modalTitle}>🎉 환영합니다!</Text>
              <Text style={styles.modalSubtitle}>
                HIPO에 가입해 주셔서 감사합니다
              </Text>

              <View style={styles.bonusBox}>
                <Text style={styles.bonusLabel}>웰컴 보너스 지급</Text>
                <Text style={styles.bonusAmount}>
                  {welcomeBonusAmount.toLocaleString()} PO
                </Text>
              </View>

              <Text style={styles.modalDescription}>
                지금 바로 크리에이터에 투자하고{'\n'}
                수익을 창출해보세요!
              </Text>

              <TouchableOpacity
                style={styles.startButton}
                onPress={() => {
                  setWelcomeModalVisible(false);
                  // AuthContext isAuthenticated=true이므로
                  // AppNavigator가 자동으로 Main 화면으로 전환합니다
                }}
              >
                <LinearGradient
                  colors={[theme.colors.primary, '#2B5FE3']}
                  style={styles.startButtonGradient}
                >
                  <Text style={styles.startButtonText}>투자 시작하기</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: t.colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: t.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: t.colors.surface,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    color: t.colors.danger,
    marginTop: 6,
    marginLeft: 4,
  },
  helperTextSuccess: {
    fontSize: 12,
    color: t.colors.success,
    marginTop: 6,
    marginLeft: 4,
  },
  button: {
    backgroundColor: t.colors.primary,
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: t.colors.primary,
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: t.colors.border,
  },
  dividerText: {
    marginHorizontal: 10,
    color: t.colors.textSecondary,
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  googleButtonText: {
    color: t.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  // 웰컴 보너스 배너 스타일
  welcomeBanner: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  welcomeBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  welcomeBannerText: {
    marginLeft: 12,
  },
  welcomeBannerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  welcomeBannerAmount: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  giftIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: t.colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: t.colors.textSecondary,
    marginBottom: 20,
  },
  bonusBox: {
    backgroundColor: t.colors.warningBackground,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  bonusLabel: {
    fontSize: 12,
    color: t.colors.warningText,
    marginBottom: 4,
  },
  bonusAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: t.colors.warning,
  },
  modalDescription: {
    fontSize: 14,
    color: t.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  startButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});
