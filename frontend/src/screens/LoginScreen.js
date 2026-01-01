import React, { useState } from 'react';
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
  SafeAreaView,
} from 'react-native';
import { login } from '../api/auth';
import theme from '../styles/theme';
import Button from '../components/Button';

export default function LoginScreen({ navigation }) {
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
      const data = await login(email, password);

      if (Platform.OS === 'web') {
        window.location.href = '/';
      } else {
        Alert.alert('환영합니다', `${data.user.username}님, 반갑습니다!`, [
          { text: '확인', onPress: () => navigation.replace('Main') },
        ]);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || '로그인 중 오류가 발생했습니다';

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
      const googleAuthUrl = 'http://localhost:5555/api/auth/google';

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    justifyContent: 'center',
  },

  // Logo Section
  logoSection: {
    alignItems: 'center',
    marginBottom: theme.spacing['4xl'],
  },
  logo: {
    fontSize: 48,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    letterSpacing: theme.typography.letterSpacing.tight,
    marginBottom: theme.spacing.sm,
  },
  tagline: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },

  // Form Section
  formSection: {
    marginBottom: theme.spacing['2xl'],
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  inputWrapper: {
    backgroundColor: theme.colors.gray50,
    borderRadius: theme.borderRadius.base,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputWrapperFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.white,
  },
  inputWrapperError: {
    borderColor: theme.colors.error,
  },
  input: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.base,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  errorText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  loginButton: {
    marginTop: theme.spacing.sm,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.gray200,
  },
  dividerText: {
    marginHorizontal: theme.spacing.base,
    color: theme.colors.textTertiary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },

  // Google Button
  googleIcon: {
    fontSize: 18,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  footerText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  signupLink: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
