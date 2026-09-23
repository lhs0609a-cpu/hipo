import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { walletAPI } from '../services/api';

export default function TransferScreen({ navigation }) {
  const [balance, setBalance] = useState(0); const [recipient, setRecipient] = useState(''); const [amount, setAmount] = useState(''); const [sending, setSending] = useState(false);
  const load = async () => { try { const r = await walletAPI.getBalance(); setBalance(Number(r.data.availableBalance ?? r.data.poBalance ?? r.data.balance ?? 0)); } catch (_) {} };
  useEffect(() => { load(); }, []);
  const performTransfer = async (numericAmount) => {
    try { setSending(true); const r = await walletAPI.transfer(recipient.trim(), numericAmount); setBalance(Number(r.data.balance)); setAmount(''); Alert.alert('전송 완료', `${r.data.recipient.username}님에게 전송했습니다.`); }
    catch (e) { Alert.alert('전송 실패', e.response?.data?.error || '전송을 완료하지 못했습니다.'); } finally { setSending(false); }
  };
  const send = async () => {
    const numericAmount = Number(amount);
    if (!recipient.trim() || !Number.isSafeInteger(numericAmount) || numericAmount <= 0) return Alert.alert('확인 필요', '받는 사람과 올바른 정수 금액을 입력해주세요.');
    const message = `${recipient.trim()}님에게 ${numericAmount.toLocaleString()} PO를 전송할까요?`;
    if (Platform.OS === 'web') {
      if (globalThis.confirm(message)) await performTransfer(numericAmount);
      return;
    }
    Alert.alert('PO 전송', message, [{ text: '취소', style: 'cancel' }, { text: '전송', onPress: () => performTransfer(numericAmount) }]);
  };
  return <View style={styles.container}><View style={styles.header}><TouchableOpacity testID="transfer-back" onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={23} color="#273447" /></TouchableOpacity><Text style={styles.headerTitle}>PO 보내기</Text><View style={{ width: 24 }} /></View><View style={styles.content}>
    <View style={styles.balanceCard}><Text style={styles.balanceLabel}>사용 가능 PO</Text><Text style={styles.balance}>{balance.toLocaleString()} <Text style={styles.unit}>PO</Text></Text></View>
    <Text style={styles.label}>받는 사람</Text><TextInput style={styles.input} value={recipient} onChangeText={setRecipient} autoCapitalize="none" placeholder="이메일 또는 사용자명" />
    <Text style={styles.label}>보낼 금액</Text><TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="0" />
    <Text style={styles.help}>미체결 주문에 예약된 PO는 전송할 수 없습니다.</Text>
    <TouchableOpacity style={[styles.button, sending && styles.disabled]} onPress={send} disabled={sending}>{sending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>전송하기</Text>}</TouchableOpacity>
  </View></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#F6F8FB' }, header: { backgroundColor: '#FFFFFF', paddingHorizontal: 18, height: 64, flexDirection: 'row', alignItems: 'center' }, headerTitle: { color: '#202B3C', flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '900' }, content: { padding: 20 }, balanceCard: { backgroundColor: '#172640', borderRadius: 26, padding: 23, marginBottom: 25 }, balanceLabel: { color: '#94A3B8', fontSize: 13, marginBottom: 8 }, balance: { color: '#FFF', fontSize: 30, fontWeight: '900' }, unit: { fontSize: 16, color: '#93B1F4' }, label: { color: '#334155', fontSize: 13, fontWeight: '800', marginBottom: 8, marginTop: 10 }, input: { minHeight: 56, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDF0F4', borderRadius: 17, paddingHorizontal: 16, fontSize: 16 }, help: { color: '#7A8799', fontSize: 11, marginTop: 12 }, button: { minHeight: 57, backgroundColor: '#2F6BFF', borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 28 }, buttonText: { color: '#FFF', fontSize: 16, fontWeight: '800' }, disabled: { opacity: 0.55 } });
