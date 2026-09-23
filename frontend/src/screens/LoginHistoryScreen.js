import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { securityAPI } from '../services/api';

export default function LoginHistoryScreen({ navigation }) {
  const [data, setData] = useState({ history: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setError(''); setData((await securityAPI.getLoginHistory()).data); }
    catch (e) { setError(e.response?.data?.error || '접속 기록을 불러오지 못했습니다.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const history = data.history?.length ? data.history : (data.lastLoginAt ? [{ id: 'last', createdAt: data.lastLoginAt, successful: true }] : []);

  return <View style={styles.container}>
    <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#111827" /></TouchableOpacity><Text style={styles.title}>접속 기록</Text><View style={{ width: 24 }} /></View>
    {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#3182F6" /></View> :
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        <View style={styles.notice}><Ionicons name="shield-checkmark" size={24} color="#16A34A" /><Text style={styles.noticeText}>내가 접속하지 않은 기록이 있다면 즉시 비밀번호를 변경하세요.</Text></View>
        {error ? <Text style={styles.error}>{error}</Text> : history.length ? history.map((entry, index) => <View style={styles.card} key={entry.id || index}>
          <View style={styles.icon}><Ionicons name={entry.successful === false ? 'alert-circle' : 'checkmark-circle'} size={24} color={entry.successful === false ? '#E11D48' : '#16A34A'} /></View>
          <View style={styles.info}><Text style={styles.cardTitle}>{entry.successful === false ? '실패한 로그인' : '로그인'}</Text><Text style={styles.meta}>{new Date(entry.createdAt || entry.loginAt).toLocaleString('ko-KR')}</Text><Text style={styles.meta}>{[entry.ipAddress, entry.device, entry.location].filter(Boolean).join(' · ') || '기기 정보 없음'}</Text></View>
        </View>) : <View style={styles.empty}><Ionicons name="time-outline" size={42} color="#94A3B8" /><Text style={styles.emptyText}>저장된 접속 기록이 없습니다.</Text></View>}
      </ScrollView>}
  </View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#F7F8FA' }, header: { padding: 18, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E8EB' }, title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#191F28' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { padding: 18 }, notice: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 14, backgroundColor: '#ECFDF3', marginBottom: 14 }, noticeText: { flex: 1, color: '#166534', lineHeight: 20 }, card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 15, borderWidth: 1, borderColor: '#E5E8EB', marginBottom: 10 }, icon: { marginRight: 12 }, info: { flex: 1 }, cardTitle: { fontSize: 16, fontWeight: '800', color: '#191F28', marginBottom: 5 }, meta: { fontSize: 13, color: '#6B7684', marginTop: 2 }, empty: { alignItems: 'center', padding: 50 }, emptyText: { color: '#6B7684', marginTop: 12 }, error: { color: '#E11D48', textAlign: 'center', padding: 24 } });
