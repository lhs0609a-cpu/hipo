import React, { useState } from 'react';
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
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';

export default function LoginScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

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
      // API_URL에서 /api를 제거하고 Google OAuth 경로 추가
      const baseUrl = API_URL.replace('/api', '');
      const googleAuthUrl = `${baseUrl}/api/auth/google`;

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
    fontWeight: t.typography.fontWeight.bold,
    color: t.colors.primary,
    letterSpacing: t.typography.letterSpacing.tight,
    marginBottom: t.spacing.sm,
  },
  tagline: {
    fontSize: t.typography.fontSize.base,
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
    color: t.colors.textPrimary,
  },
  errorText: {
    fontSize: t.typography.fontSize.xs,
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
    fontWeight: t.typography.fontWeight.medium,
  },

  // Google Button
  googleIcon: {
    fontSize: 18,
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
    color: t.colors.textSecondary,
  },
  signupLink: {
    fontSize: t.typography.fontSize.sm,
    color: t.colors.primary,
    fontWeight: t.typography.fontWeight.semibold,
  },
});
