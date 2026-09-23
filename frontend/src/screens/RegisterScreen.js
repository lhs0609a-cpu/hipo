import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const notify = (title, message) => Platform.OS === 'web' ? window.alert(`${title}\n${message}`) : Alert.alert(title, message);

function Field({ label, icon, value, onChangeText, placeholder, secureTextEntry, keyboardType, hint, ok }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}><Ionicons name={icon} size={19} color="#8B95A1" /><TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#B0B8C1" secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize="none" autoCorrect={false} /></View>
      {!!value && hint && <Text style={[styles.hint, ok && styles.hintOk]}>{ok ? '✓ ' : ''}{hint}</Text>}
    </View>
  );
}

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const valid = useMemo(() => /^\S+@\S+\.\S+$/.test(email.trim()) && username.trim().length >= 3 && password.length >= 6 && password === confirm && agreed, [email, username, password, confirm, agreed]);

  const submit = async () => {
    if (!valid) return notify('조금만 더 확인해주세요', '입력 조건과 필수 약관 동의를 확인해주세요.');
    setLoading(true);
    const result = await register({ email: email.trim().toLowerCase(), username: username.trim(), password });
    setLoading(false);
    if (!result.success) return notify('가입을 완료하지 못했어요', result.error);
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.shell}>
            <View style={styles.nav}><Pressable style={styles.back} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color="#202B3C" /></Pressable><Text style={styles.step}>가입하기</Text><View style={styles.back} /></View>
            <View style={styles.progress}><View style={styles.progressOn} /></View>
            <View style={styles.intro}><Text style={styles.title}>새로운 가능성을{`\n`}만날 준비가 됐나요?</Text><Text style={styles.subtitle}>간단한 정보만 입력하면 10,000 PO로{`\n`}바로 시작할 수 있어요.</Text></View>

            <View style={styles.form}>
              <Field label="이메일" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" hint={/^\S+@\S+\.\S+$/.test(email) ? '사용할 수 있는 이메일이에요' : '이메일 형식을 확인해주세요'} ok={/^\S+@\S+\.\S+$/.test(email)} />
              <Field label="활동 이름" icon="person-outline" value={username} onChangeText={setUsername} placeholder="3~20자로 입력" hint={username.trim().length >= 3 ? '좋아요. 이 이름으로 활동해요' : '3자 이상 입력해주세요'} ok={username.trim().length >= 3} />
              <Field label="비밀번호" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="6자 이상 입력" secureTextEntry hint={password.length >= 6 ? '안전하게 설정됐어요' : `현재 ${password.length}자 · 6자 이상 필요`} ok={password.length >= 6} />
              <Field label="비밀번호 확인" icon="checkmark-circle-outline" value={confirm} onChangeText={setConfirm} placeholder="한 번 더 입력" secureTextEntry hint={password === confirm && confirm ? '비밀번호가 같아요' : '비밀번호가 일치하지 않아요'} ok={password === confirm && !!confirm} />

              <Pressable style={styles.agreement} onPress={() => setAgreed(v => !v)}>
                <View style={[styles.checkbox, agreed && styles.checkboxOn]}>{agreed && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}</View>
                <Text style={styles.agreementText}><Text style={styles.required}>[필수]</Text> 이용약관과 개인정보 처리방침에 동의해요</Text>
                <Ionicons name="chevron-forward" size={16} color="#A1AAB7" />
              </Pressable>

              <Pressable style={({ pressed }) => [styles.primary, !valid && styles.disabled, pressed && styles.pressed]} disabled={!valid || loading} onPress={submit}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>10,000 PO 받고 시작하기</Text>}
              </Pressable>
              <Pressable style={styles.loginLink} onPress={() => navigation.navigate('Login')}><Text style={styles.loginText}>이미 계정이 있다면 <Text style={styles.loginStrong}>로그인</Text></Text></Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  page: { flexGrow: 1, alignItems: 'center' },
  shell: { width: '100%', maxWidth: 500, paddingHorizontal: 22, paddingBottom: 36 },
  nav: { height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  step: { color: '#202B3C', fontSize: 15, fontWeight: '800' },
  progress: { height: 3, backgroundColor: '#EDF0F4', borderRadius: 2 },
  progressOn: { width: '100%', height: 3, backgroundColor: '#2F6BFF', borderRadius: 2 },
  intro: { marginTop: 34 },
  title: { color: '#121926', fontSize: 29, lineHeight: 38, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: '#6B7684', fontSize: 15, lineHeight: 23, marginTop: 12 },
  form: { marginTop: 32 },
  field: { marginBottom: 19 },
  label: { color: '#333D4B', fontSize: 13, fontWeight: '800', marginBottom: 9, marginLeft: 2 },
  inputWrap: { height: 57, borderRadius: 17, backgroundColor: '#F4F6F8', paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 11 },
  input: { flex: 1, height: '100%', fontSize: 16, color: '#202B3C' },
  hint: { color: '#F04452', fontSize: 11, fontWeight: '600', marginTop: 7, marginLeft: 4 },
  hintOk: { color: '#20A66A' },
  agreement: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: '#D1D6DB', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: '#2F6BFF', borderColor: '#2F6BFF' },
  agreementText: { flex: 1, color: '#6B7684', fontSize: 12, fontWeight: '600' },
  required: { color: '#2F6BFF', fontWeight: '800' },
  primary: { height: 58, borderRadius: 18, backgroundColor: '#2F6BFF', alignItems: 'center', justifyContent: 'center', marginTop: 13 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.78 },
  loginLink: { alignItems: 'center', paddingTop: 21 },
  loginText: { color: '#8B95A1', fontSize: 13, fontWeight: '600' },
  loginStrong: { color: '#2F6BFF', fontWeight: '800' },
});
