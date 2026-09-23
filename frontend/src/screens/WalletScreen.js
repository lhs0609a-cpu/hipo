import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, Pressable, RefreshControl, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { walletAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const notify = (title, message) => Platform.OS === 'web' ? window.alert(`${title}\n${message}`) : Alert.alert(title, message);
const number = value => Number(value || 0).toLocaleString('ko-KR');
const txMeta = {
  deposit: ['현금에서 PO로', 'arrow-down', '#15A06D', '#EAF8F3'],
  withdraw: ['환전 신청', 'arrow-up', '#F06D55', '#FFF0ED'],
  buy: ['사람 주식 매수', 'add', '#7656D6', '#F2EEFF'],
  sell: ['사람 주식 매도', 'remove', '#2F6BFF', '#EAF1FF'],
  dividend: ['응원 보상', 'gift', '#E89A24', '#FFF6E8'],
  transfer: ['PO 송금', 'paper-plane', '#2F6BFF', '#EAF1FF'],
};

export default function WalletScreen({ navigation }) {
  const { isAuthenticated } = useAuth();
  const [balance, setBalance] = useState(0);
  const [available, setAvailable] = useState(0);
  const [reserved, setReserved] = useState(0);
  const [cash, setCash] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [modalType, setModalType] = useState(null);
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    if (!isAuthenticated) { setLoading(false); return; }
    try {
      const [balanceRes, txRes] = await Promise.all([walletAPI.getBalance(), walletAPI.getTransactions()]);
      setBalance(Number(balanceRes.data.balance || 0));
      setAvailable(Number(balanceRes.data.availableBalance || 0));
      setReserved(Number(balanceRes.data.reservedBalance || 0));
      setCash(Number(balanceRes.data.cashBalance || 0));
      setTransactions(txRes.data.transactions || []);
      setError('');
    } catch (e) { setError(e.response?.data?.message || '지갑 정보를 불러오지 못했어요.'); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); return navigation.addListener('focus', load); }, [isAuthenticated, navigation]);
  const refresh = useCallback(() => { setRefreshing(true); load(); }, []);

  const submit = async () => {
    const value = Number(amount);
    if (!Number.isSafeInteger(value) || value <= 0) return notify('금액을 확인해주세요', '1 PO 이상의 정수 금액을 입력해주세요.');
    if (modalType === 'withdraw' && value > available) return notify('사용 가능 PO가 부족해요', `현재 ${number(available)} PO까지 신청할 수 있어요.`);
    setProcessing(true);
    try {
      if (modalType === 'deposit') await walletAPI.deposit(value);
      else await walletAPI.withdraw(value, { bankName, accountNumber, accountHolder });
      notify('신청을 완료했어요', modalType === 'deposit' ? `${number(value)} PO로 전환했어요.` : `${number(value)} PO 환전을 접수했어요.`);
      setModalType(null); setAmount(''); load();
    } catch (e) { notify('처리하지 못했어요', e.response?.data?.error || e.response?.data?.message || '잠시 후 다시 시도해주세요.'); }
    finally { setProcessing(false); }
  };

  if (!isAuthenticated) return <SafeAreaView style={styles.safe}><View style={styles.guest}><View style={styles.guestIcon}><Ionicons name="wallet" size={34} color="#2F6BFF" /></View><Text style={styles.guestTitle}>내 자산을 한눈에</Text><Text style={styles.guestText}>로그인하면 PO와 보유한 사람,{`\n`}모든 거래 흐름을 이어서 볼 수 있어요.</Text><Pressable style={styles.primary} onPress={() => navigation.navigate('Login')}><Text style={styles.primaryText}>로그인</Text></Pressable></View></SafeAreaView>;
  if (loading) return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color="#2F6BFF" /></View></SafeAreaView>;

  const renderTransaction = ({ item }) => {
    const [fallback, icon, color, tint] = txMeta[item.type] || ['PO 변동', 'swap-horizontal', '#59687C', '#EFF3F8'];
    const positive = Number(item.amount) > 0 || ['deposit', 'sell', 'dividend'].includes(item.type);
    return <View style={styles.txRow}><View style={[styles.txIcon, { backgroundColor: tint }]}><Ionicons name={icon} size={18} color={color} /></View><View style={styles.txCopy}><Text style={styles.txTitle}>{item.description || fallback}</Text><Text style={styles.txDate}>{new Date(item.createdAt || item.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}</Text></View><Text style={[styles.txAmount, { color: positive ? '#15A06D' : '#273447' }]}>{positive ? '+' : '-'}{number(Math.abs(Number(item.amount || 0)))} PO</Text></View>;
  };

  return <SafeAreaView style={styles.safe}><View style={styles.shell}>
    <View style={styles.header}><Pressable testID="wallet-back" style={styles.headerButton} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color="#273447" /></Pressable><Text style={styles.headerTitle}>내 지갑</Text><Pressable style={styles.headerButton} onPress={() => navigation.navigate('TransactionHistory')}><Ionicons name="receipt-outline" size={21} color="#273447" /></Pressable></View>
    <FlatList data={transactions} renderItem={renderTransaction} keyExtractor={(item, index) => String(item.id || index)} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#2F6BFF" />} contentContainerStyle={styles.page}
      ListHeaderComponent={<>
        <View style={styles.balanceCard}><View style={styles.cardGlow} /><Text style={styles.balanceLabel}>전체 PO</Text><Text style={styles.balanceValue}>{number(balance)} <Text style={styles.balanceUnit}>PO</Text></Text><View style={styles.balanceLine} /><View style={styles.breakdown}><View><Text style={styles.breakLabel}>사용 가능</Text><Text style={styles.breakValue}>{number(available)} PO</Text></View><View><Text style={styles.breakLabel}>주문 예약</Text><Text style={styles.breakValue}>{number(reserved)} PO</Text></View><View><Text style={styles.breakLabel}>충전 대기 현금</Text><Text style={styles.breakValue}>{number(cash)}원</Text></View></View></View>
        <View style={styles.actions}>{[
          ['add-circle', '현금 충전', () => navigation.navigate('Charge')],
          ['repeat', 'PO 전환', () => setModalType('deposit')],
          ['paper-plane', '송금', () => navigation.navigate('Transfer')],
          ['cash', '환전', () => setModalType('withdraw')],
        ].map(([icon, label, action]) => <Pressable key={label} style={styles.action} onPress={action}><View style={styles.actionIcon}><Ionicons name={icon} size={21} color="#2F6BFF" /></View><Text style={styles.actionText}>{label}</Text></Pressable>)}</View>
        {!!error && <Pressable style={styles.error} onPress={load}><Ionicons name="cloud-offline-outline" size={18} color="#F06D55" /><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>다시 시도</Text></Pressable>}
        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>최근 흐름</Text><Pressable onPress={() => navigation.navigate('TransactionHistory')}><Text style={styles.more}>전체보기</Text></Pressable></View>
      </>}
      ListEmptyComponent={<View style={styles.empty}><Ionicons name="receipt-outline" size={34} color="#B7C0CC" /><Text style={styles.emptyTitle}>아직 PO 흐름이 없어요</Text><Text style={styles.emptyText}>첫 번째 사람을 발견하거나 PO를 충전해보세요.</Text></View>}
      ListFooterComponent={<Text style={styles.notice}>환전 신청에는 표시된 정책에 따라 수수료가 적용될 수 있어요.</Text>}
    />

    <Modal visible={!!modalType} transparent animationType="slide" onRequestClose={() => setModalType(null)}><Pressable style={styles.overlay} onPress={() => setModalType(null)}><Pressable style={styles.sheet} onPress={() => {}}><View style={styles.handle} /><View style={styles.sheetIcon}><Ionicons name={modalType === 'deposit' ? 'repeat' : 'cash'} size={23} color="#2F6BFF" /></View><Text style={styles.sheetTitle}>{modalType === 'deposit' ? '현금을 PO로 바꿀까요?' : 'PO를 현금으로 바꿀까요?'}</Text><Text style={styles.sheetSub}>{modalType === 'deposit' ? `결제 완료 현금 ${number(cash)}원 안에서 전환할 수 있어요.` : `사용 가능 ${number(available)} PO · 환전 정책이 적용돼요.`}</Text>
      <Text style={styles.label}>금액</Text><View style={styles.amountWrap}><TextInput style={styles.amountInput} value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="0" placeholderTextColor="#B0B8C1" /><Text style={styles.amountUnit}>PO</Text></View>
      {modalType === 'withdraw' && <><Text style={styles.label}>받을 계좌</Text><TextInput style={styles.sheetInput} value={bankName} onChangeText={setBankName} placeholder="은행명" placeholderTextColor="#B0B8C1" /><TextInput style={styles.sheetInput} value={accountNumber} onChangeText={setAccountNumber} placeholder="계좌번호" placeholderTextColor="#B0B8C1" /><TextInput style={styles.sheetInput} value={accountHolder} onChangeText={setAccountHolder} placeholder="예금주" placeholderTextColor="#B0B8C1" /></>}
      <Pressable style={[styles.primary, processing && { opacity: 0.55 }]} disabled={processing} onPress={submit}>{processing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{modalType === 'deposit' ? 'PO로 전환하기' : '환전 신청하기'}</Text>}</Pressable></Pressable></Pressable></Modal>
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F8FB' }, shell: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { height: 64, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF' }, headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { color: '#202B3C', fontSize: 16, fontWeight: '900' },
  page: { padding: 16, paddingBottom: 38 }, balanceCard: { minHeight: 209, borderRadius: 28, backgroundColor: '#172640', padding: 22, overflow: 'hidden' }, cardGlow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(70,120,255,0.17)', right: -60, top: -85 }, balanceLabel: { color: '#91A2BB', fontSize: 12, fontWeight: '700' }, balanceValue: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', letterSpacing: -0.7, marginTop: 8 }, balanceUnit: { color: '#91B0F4', fontSize: 15 }, balanceLine: { height: 1, backgroundColor: 'rgba(255,255,255,0.09)', marginVertical: 22 }, breakdown: { flexDirection: 'row', justifyContent: 'space-between' }, breakLabel: { color: '#8293AD', fontSize: 9 }, breakValue: { color: '#E8EEF8', fontSize: 11, fontWeight: '800', marginTop: 6 },
  actions: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 24, paddingVertical: 16, justifyContent: 'space-around', marginTop: 12 }, action: { alignItems: 'center', minWidth: 68 }, actionIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#EDF3FF', alignItems: 'center', justifyContent: 'center' }, actionText: { color: '#59687C', fontSize: 10, fontWeight: '700', marginTop: 7 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 29, marginBottom: 10, paddingHorizontal: 3 }, sectionTitle: { color: '#273447', fontSize: 18, fontWeight: '900' }, more: { color: '#7A8799', fontSize: 11, fontWeight: '700' },
  txRow: { minHeight: 75, paddingHorizontal: 15, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F2F5' }, txIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, txCopy: { flex: 1, marginLeft: 11 }, txTitle: { color: '#273447', fontSize: 13, fontWeight: '800' }, txDate: { color: '#A1AAB7', fontSize: 9, marginTop: 4 }, txAmount: { fontSize: 12, fontWeight: '900' },
  empty: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 22, paddingVertical: 40 }, emptyTitle: { color: '#536071', fontSize: 14, fontWeight: '800', marginTop: 12 }, emptyText: { color: '#9AA4B2', fontSize: 10, marginTop: 5 }, notice: { color: '#A1AAB7', fontSize: 9, lineHeight: 15, textAlign: 'center', marginTop: 18 }, error: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF4F1', borderRadius: 16, padding: 13, marginTop: 12 }, errorText: { flex: 1, color: '#8F6159', fontSize: 10 }, retry: { color: '#F06D55', fontSize: 10, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(18,25,38,0.48)', justifyContent: 'flex-end' }, sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 30, maxHeight: '88%' }, handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#D8DDE5', alignSelf: 'center', marginBottom: 20 }, sheetIcon: { width: 47, height: 47, borderRadius: 16, backgroundColor: '#EAF1FF', alignItems: 'center', justifyContent: 'center' }, sheetTitle: { color: '#182335', fontSize: 23, fontWeight: '900', letterSpacing: -0.5, marginTop: 17 }, sheetSub: { color: '#7A8799', fontSize: 12, lineHeight: 19, marginTop: 8, marginBottom: 22 }, label: { color: '#536071', fontSize: 11, fontWeight: '800', marginBottom: 8, marginTop: 10 }, amountWrap: { height: 60, borderRadius: 17, backgroundColor: '#F3F5F8', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17 }, amountInput: { flex: 1, fontSize: 23, fontWeight: '800', color: '#202B3C' }, amountUnit: { color: '#7A8799', fontSize: 13, fontWeight: '800' }, sheetInput: { height: 53, borderRadius: 15, backgroundColor: '#F3F5F8', paddingHorizontal: 16, marginBottom: 9, fontSize: 14, color: '#273447' }, primary: { height: 57, borderRadius: 18, backgroundColor: '#2F6BFF', alignItems: 'center', justifyContent: 'center', marginTop: 18 }, primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  guest: { flex: 1, maxWidth: 500, width: '100%', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }, guestIcon: { width: 82, height: 82, borderRadius: 28, backgroundColor: '#EAF1FF', alignItems: 'center', justifyContent: 'center' }, guestTitle: { color: '#182335', fontSize: 25, fontWeight: '900', marginTop: 22 }, guestText: { color: '#7A8799', fontSize: 13, lineHeight: 21, textAlign: 'center', marginTop: 10 },
});
