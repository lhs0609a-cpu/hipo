import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { userAPI } from '../services/api';

const OPTIONS = [
  ['trading', '거래 알림', '주문 체결과 취소 알림'],
  ['dividend', '배당 알림', '배당 지급과 예정 알림'],
  ['priceAlert', '가격 알림', '설정한 목표 가격 도달 알림'],
  ['social', '소셜 알림', '댓글, 좋아요, 팔로우 알림'],
  ['system', '서비스 알림', '보안과 중요 공지 알림'],
];

export default function NotificationSettingsScreen({ navigation }) {
  const [settings, setSettings] = useState(null); const [saving, setSaving] = useState(false);
  useEffect(() => { userAPI.getNotificationSettings().then((r) => setSettings(r.data.settings)).catch(() => setSettings(Object.fromEntries(OPTIONS.map(([key]) => [key, true])))); }, []);
  const toggle = (key) => setSettings((current) => ({ ...current, [key]: !current[key] }));
  const save = async () => { try { setSaving(true); const r = await userAPI.updateNotificationSettings(settings); setSettings(r.data.settings); Alert.alert('저장 완료', '알림 설정을 저장했습니다.'); } catch (e) { Alert.alert('저장 실패', e.response?.data?.error || '설정을 저장하지 못했습니다.'); } finally { setSaving(false); } };
  return <View style={styles.container}><View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#111827" /></TouchableOpacity><Text style={styles.title}>알림 설정</Text><View style={{ width: 24 }} /></View>
    {!settings ? <View style={styles.center}><ActivityIndicator size="large" color="#3182F6" /></View> : <View style={styles.content}><View style={styles.card}>{OPTIONS.map(([key, label, hint], index) => <View style={[styles.row, index > 0 && styles.divider]} key={key}><View style={styles.text}><Text style={styles.label}>{label}</Text><Text style={styles.hint}>{hint}</Text></View><Switch value={settings[key] !== false} onValueChange={() => toggle(key)} trackColor={{ false: '#D1D5DB', true: '#93C5FD' }} thumbColor={settings[key] !== false ? '#2563EB' : '#F8FAFC'} /></View>)}</View><TouchableOpacity style={[styles.button, saving && { opacity: 0.55 }]} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>설정 저장</Text>}</TouchableOpacity></View>}
  </View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#F7F8FA' }, header: { padding: 18, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E8EB' }, title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#191F28' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { padding: 20 }, card: { backgroundColor: '#FFF', borderRadius: 18, paddingHorizontal: 17, borderWidth: 1, borderColor: '#E5E8EB' }, row: { minHeight: 76, flexDirection: 'row', alignItems: 'center' }, divider: { borderTopWidth: 1, borderTopColor: '#EEF1F4' }, text: { flex: 1, paddingRight: 15 }, label: { color: '#191F28', fontSize: 16, fontWeight: '700' }, hint: { color: '#8B95A1', fontSize: 13, marginTop: 4 }, button: { minHeight: 54, backgroundColor: '#3182F6', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20 }, buttonText: { color: '#FFF', fontWeight: '800', fontSize: 16 } });
