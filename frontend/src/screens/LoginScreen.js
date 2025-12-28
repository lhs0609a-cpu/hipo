import React, { useState } from 'react';
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
  Linking,
} from 'react-native';
import { login } from '../api/auth';
import { COLORS } from '../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // 각 필드를 개별적으로 검증
    const errors = [];

    // 이메일 검증
    if (!email || email.trim() === '') {
      errors.push('이메일을 입력해주세요');
    } else if (!email.includes('@')) {
      errors.push('올바른 이메일 형식이 아닙니다');
    }

    // 비밀번호 검증
    if (!password || password.trim() === '') {
      errors.push('비밀번호를 입력해주세요');
    }

    // 에러가 있으면 표시
    if (errors.length > 0) {
      const errorMessage = '입력 오류:\n\n' + errors.map((err, idx) => `${idx + 1}. ${err}`).join('\n');
      if (Platform.OS === 'web') {
        alert(errorMessage);
      } else {
        Alert.alert('입력 오류', errors.join('\n\n'));
      }
      return;
    }

    setLoading(true);

    try {
      console.log('로그인 시도:', email);
      const data = await login(email, password);
      console.log('로그인 성공:', data);

      // 웹에서는 페이지를 새로고침하여 인증 상태 업데이트
      if (Platform.OS === 'web') {
        window.location.href = '/';
      } else {
        Alert.alert('성공', `환영합니다, ${data.user.username}님!`, [
          {
            text: '확인',
            onPress: () => navigation.replace('Main'),
          },
        ]);
      }
    } catch (error) {
      console.error('로그인 실패:', error);
      console.error('에러 응답:', error.response?.data);

      const errorMsg = error.response?.data?.error || error.message || '로그인 중 오류가 발생했습니다';

      if (Platform.OS === 'web') {
        alert('로그인 실패: ' + errorMsg);
      } else {
        Alert.alert('로그인 실패', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // Google OAuth URL (포트 5555로 변경)
      const googleAuthUrl = 'http://localhost:5555/api/auth/google';

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
      <View style={styles.content}>
        <Text style={styles.title}>HIPO</Text>
        <Text style={styles.subtitle}>사람을 주식처럼 거래하는 SNS</Text>

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
              <Text style={styles.helperText}>올바른 이메일 형식을 입력해주세요</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="비밀번호"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>로그인</Text>
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
            <Text style={styles.googleButtonText}>Google로 로그인</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.linkText}>계정이 없으신가요? 회원가입</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 50,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 6,
    marginLeft: 4,
  },
  button: {
    backgroundColor: COLORS.primary,
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
    color: COLORS.primary,
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
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 10,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  googleButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
