import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE } from '../config';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';

export default function LoginScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const { login, oauthError, clearOAuthError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  /**
   * 구글 로그인 실패는 리다이렉트로 돌아온 뒤에 판명된다.
   * 이 화면이 다시 뜬 시점에 알려주지 않으면 사용자는 아무 일도 없었던 것처럼
   * 로그인 화면만 다시 보게 된다.
   */
  useEffect(() => {
    if (!oauthError) return;
    if (Platform.OS === 'web') {
      alert(oauthError);
    } else {
      Alert.alert('구글 로그인 실패', oauthError);
    }
    clearOAuthError();
  }, [oauthError]);

  const handleLogin = async () => {
    const errors = [];

    if (!email || email.trim() === '') {
      errors.push('이메일을 입력해주세요');
    } else if (!email.includes('@')) {
      errors.push('올바른 이메일 형식이 아닙니다');
    }

    if (!password || password.trim() === '') {
      errors.push('비밀번호를 입력해주세요');
    }

    if (errors.length > 0) {
      const errorMessage = errors.join('\n');
      if (Platform.OS === 'web') {
        alert(errorMessage);
      } else {
        Alert.alert('입력 오류', errorMessage);
      }
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        // AuthContext가 isAuthenticated를 true로 설정하면
        // AppNavigator가 자동으로 Main 화면으로 전환합니다
        if (Platform.OS === 'web') {
          window.location.href = '/';
        }
        // 모바일에서는 AuthContext 상태 변경으로 자동 전환
      } else {
        const errorMsg = result.error || '로그인 중 오류가 발생했습니다';
        if (Platform.OS === 'web') {
          alert(errorMsg);
        } else {
          Alert.alert('로그인 실패', errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = error.message || '로그인 중 오류가 발생했습니다';
      if (Platform.OS === 'web') {
        alert(errorMsg);
      } else {
        Alert.alert('로그인 실패', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const googleAuthUrl = `${API_BASE}/api/auth/google`;

      /**
       * 브라우저를 백엔드로 통째로 보내는 방식이라, 백엔드가 죽어 있으면
       * 사용자는 원인을 알 수 없는 404 페이지를 보게 된다.
       * (실제로 config 의 주소가 사라진 Vercel 프리뷰를 가리키고 있었다)
       * 이동하기 전에 서버가 살아 있는지, OAuth 가 설정돼 있는지 먼저 확인한다.
       */
      try {
        const probe = await fetch(googleAuthUrl, { method: 'HEAD', redirect: 'manual' });
        if (probe.status === 503) {
          const msg = '서버에 Google 로그인이 설정되지 않았습니다. 관리자에게 문의해주세요.';
          Platform.OS === 'web' ? alert(msg) : Alert.alert('알림', msg);
          return;
        }
      } catch (probeError) {
        /**
         * fetch 는 서버가 죽었을 때와 CORS 로 거부당했을 때를 구분해 주지 않는다.
         * 둘 다 TypeError 다. 예전에는 "백엔드가 꺼져 있다"고만 안내해서,
         * 실제로는 살아 있는데 이 도메인이 허용 목록에 없던 상황을 오진했다.
         * (해결: 서버의 ADDITIONAL_CORS_ORIGINS 에 이 도메인 추가)
         */
        const msg =
          `서버에 연결하지 못했습니다.\n\n주소: ${API_BASE}\n\n` +
          '백엔드가 꺼져 있거나, 이 도메인이 서버의 허용 목록(CORS)에 ' +
          '없을 수 있습니다.';
        Platform.OS === 'web' ? alert(msg) : Alert.alert('연결 실패', msg);
        return;
      }

      if (Platform.OS === 'web') {
        window.location.href = googleAuthUrl;
      } else {
        const supported = await Linking.canOpenURL(googleAuthUrl);
        if (supported) {
          await Linking.openURL(googleAuthUrl);
        } else {
          Alert.alert('오류', 'Google 로그인을 열 수 없습니다');
        }
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        alert('Google 로그인 중 오류가 발생했습니다');
      } else {
        Alert.alert('오류', 'Google 로그인 중 오류가 발생했습니다');
      }
    }
  };

  const isFormValid = email.includes('@') && password.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Text style={styles.logo}>HIPO</Text>
            <Text style={styles.tagline}>크리에이터 주식 플랫폼</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>이메일</Text>
              <View style={[
                styles.inputWrapper,
                emailFocused && styles.inputWrapperFocused,
                email && !email.includes('@') && styles.inputWrapperError,
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder="example@email.com"
                  placeholderTextColor={theme.colors.textDisabled}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
              {email && !email.includes('@') && (
                <Text style={styles.errorText}>올바른 이메일 형식을 입력해주세요</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>비밀번호</Text>
              <View style={[
                styles.inputWrapper,
                passwordFocused && styles.inputWrapperFocused,
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호를 입력하세요"
                  placeholderTextColor={theme.colors.textDisabled}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry
                />
              </View>
            </View>

            <Button
              onPress={handleLogin}
              loading={loading}
              disabled={!isFormValid}
              fullWidth
              size="lg"
              style={styles.loginButton}
            >
              로그인
            </Button>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              variant="outline"
              onPress={handleGoogleLogin}
              fullWidth
              size="lg"
              icon={<Text style={styles.googleIcon}>G</Text>}
            >
              Google로 계속하기
            </Button>
          </View>

          {/* Footer Section */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>계정이 없으신가요?</Text>
            <Pressable
              onPress={() => navigation.navigate('Register')}
              style={({ pressed }) => pressed && { opacity: 0.7 }}
            >
              <Text style={styles.signupLink}>회원가입</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: t.spacing.xl,
    justifyContent: 'center',
  },

  // Logo Section
  logoSection: {
    alignItems: 'center',
    marginBottom: t.spacing['4xl'],
  },
  logo: {
    fontSize: 48,
    fontFamily: t.fonts.regular,
    fontWeight: t.typography.fontWeight.bold,
    color: t.colors.primary,
    letterSpacing: t.typography.letterSpacing.tight,
    marginBottom: t.spacing.sm,
  },
  tagline: {
    fontSize: t.typography.fontSize.base,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    fontWeight: t.typography.fontWeight.medium,
  },

  // Form Section
  formSection: {
    marginBottom: t.spacing['2xl'],
  },
  inputGroup: {
    marginBottom: t.spacing.lg,
  },
  inputLabel: {
    fontSize: t.typography.fontSize.sm,
    fontFamily: t.fonts.regular,
    fontWeight: t.typography.fontWeight.semibold,
    color: t.colors.textPrimary,
    marginBottom: t.spacing.sm,
  },
  inputWrapper: {
    backgroundColor: t.colors.gray50,
    borderRadius: t.borderRadius.base,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputWrapperFocused: {
    borderColor: t.colors.primary,
    backgroundColor: t.colors.white,
  },
  inputWrapperError: {
    borderColor: t.colors.error,
  },
  input: {
    paddingHorizontal: t.spacing.base,
    paddingVertical: t.spacing.base,
    fontSize: t.typography.fontSize.base,
    fontFamily: t.fonts.regular,
    color: t.colors.textPrimary,
  },
  errorText: {
    fontSize: t.typography.fontSize.xs,
    fontFamily: t.fonts.regular,
    color: t.colors.error,
    marginTop: t.spacing.xs,
    marginLeft: t.spacing.xs,
  },
  loginButton: {
    marginTop: t.spacing.sm,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: t.spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: t.colors.gray200,
  },
  dividerText: {
    marginHorizontal: t.spacing.base,
    color: t.colors.textTertiary,
    fontSize: t.typography.fontSize.sm,
    fontFamily: t.fonts.regular,
    fontWeight: t.typography.fontWeight.medium,
  },

  // Google Button
  googleIcon: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    fontWeight: t.typography.fontWeight.bold,
    color: t.colors.textPrimary,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: t.spacing.sm,
  },
  footerText: {
    fontSize: t.typography.fontSize.sm,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  signupLink: {
    fontSize: t.typography.fontSize.sm,
    fontFamily: t.fonts.regular,
    color: t.colors.primary,
    fontWeight: t.typography.fontWeight.semibold,
  },
});
