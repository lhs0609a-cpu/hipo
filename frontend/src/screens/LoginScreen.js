import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const notify = (title, message) => Platform.OS === 'web' ? window.alert(`${title}\n${message}`) : Alert.alert(title, message);

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || !password) {
      notify('입력을 확인해주세요', '이메일과 비밀번호를 올바르게 입력해주세요.');
      return;
    }
    setLoading(true);
    const result = await login(email.trim().toLowerCase(), password);
    setLoading(false);
    if (!result.success) return notify('로그인하지 못했어요', result.error);
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.shell}>
            <View style={styles.nav}>
              <Pressable style={styles.back} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color="#202B3C" /></Pressable>
              <Text style={styles.wordmark}>HIPO.</Text><View style={styles.back} />
            </View>

            <View style={styles.intro}>
              <View style={styles.spark}><Ionicons name="sparkles" size={20} color="#2F6BFF" /></View>
              <Text style={styles.title}>다시 만나서 반가워요</Text>
              <Text style={styles.subtitle}>내가 발견한 사람과 자산의 변화를{`\n`}이어서 확인해보세요.</Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>이메일</Text>
              <View style={styles.inputWrap}><Ionicons name="mail-outline" size={19} color="#8B95A1" /><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="name@example.com" placeholderTextColor="#B0B8C1" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} /></View>
              <Text style={[styles.label, styles.nextLabel]}>비밀번호</Text>
              <View style={styles.inputWrap}><Ionicons name="lock-closed-outline" size={19} color="#8B95A1" /><TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="비밀번호 입력" placeholderTextColor="#B0B8C1" secureTextEntry={!showPassword} onSubmitEditing={submit} /><Pressable onPress={() => setShowPassword(v => !v)}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#8B95A1" /></Pressable></View>

              <Pressable style={({ pressed }) => [styles.primary, (!email || !password) && styles.disabled, pressed && styles.pressed]} disabled={loading || !email || !password} onPress={submit}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>로그인</Text>}
              </Pressable>
              <View style={styles.helpRow}><Pressable><Text style={styles.help}>비밀번호를 잊었어요</Text></Pressable><View style={styles.helpDot} /><Pressable onPress={() => navigation.navigate('Register')}><Text style={styles.helpStrong}>새 계정 만들기</Text></Pressable></View>
            </View>

            <View style={styles.security}><Ionicons name="shield-checkmark" size={18} color="#20A66A" /><View><Text style={styles.securityTitle}>안전하게 보호하고 있어요</Text><Text style={styles.securityText}>개인정보와 거래 정보는 암호화되어 전송돼요.</Text></View></View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  page: { flexGrow: 1, alignItems: 'center' },
  shell: { width: '100%', maxWidth: 500, paddingHorizontal: 22, paddingBottom: 30 },
  nav: { height: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  wordmark: { color: '#121926', fontSize: 20, fontWeight: '900', letterSpacing: -0.8 },
  intro: { marginTop: 38 },
  spark: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#EBF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { color: '#121926', fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: '#6B7684', fontSize: 15, lineHeight: 23, marginTop: 11, fontWeight: '500' },
  form: { marginTop: 38 },
  label: { color: '#333D4B', fontSize: 13, fontWeight: '800', marginBottom: 9, marginLeft: 2 },
  nextLabel: { marginTop: 18 },
  inputWrap: { height: 58, paddingHorizontal: 17, borderRadius: 17, backgroundColor: '#F4F6F8', flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: '#F4F6F8' },
  input: { flex: 1, fontSize: 16, color: '#202B3C', height: '100%' },
  primary: { height: 58, borderRadius: 18, backgroundColor: '#2F6BFF', alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.78 },
  helpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  help: { color: '#8B95A1', fontSize: 13, fontWeight: '600' },
  helpStrong: { color: '#2F6BFF', fontSize: 13, fontWeight: '800' },
  helpDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#D1D6DB', marginHorizontal: 10 },
  security: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F3FAF7', borderRadius: 18, padding: 17, marginTop: 48 },
  securityTitle: { color: '#2D4A3E', fontSize: 13, fontWeight: '800' },
  securityText: { color: '#72867D', fontSize: 11, marginTop: 3 },
});
