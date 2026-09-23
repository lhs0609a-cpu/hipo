import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  competitionAPI,
  liveStreamAPI,
  merchandiseAPI,
  nftAPI,
  strategyAPI,
} from '../services/api';
import { COLORS } from '../constants/colors';

const CONFIG = {
  CompetitionDetail: {
    id: 'competitionId', title: '대회 상세', get: competitionAPI.getById,
    action: competitionAPI.join, actionLabel: '대회 참가하기', color: '#7C3AED',
  },
  StrategyDetail: {
    id: 'strategyId', title: '투자 전략', get: strategyAPI.getById,
    action: (id) => strategyAPI.follow(id), actionLabel: '전략 팔로우', color: '#2563EB',
  },
  LiveStreamDetail: {
    id: 'streamId', title: '라이브', get: liveStreamAPI.getById,
    action: liveStreamAPI.join, actionLabel: '라이브 참여', color: '#E11D48',
  },
  MerchandiseDetail: {
    id: 'productId', title: '굿즈 상세', get: merchandiseAPI.getById,
    action: (id, options) => merchandiseAPI.purchase(id, options), actionLabel: '구매하기', color: '#EA580C',
    needsShipping: true,
  },
  NFTDetail: {
    id: 'nftId', title: 'NFT 상세', get: nftAPI.getById,
    action: nftAPI.buy, actionLabel: 'NFT 구매', color: '#0891B2',
  },
};

const LABELS = {
  description: '소개', status: '상태', price: '가격', entryFee: '참가비', prizePool: '상금',
  participantCount: '참가자', maxParticipants: '최대 참가자', followerCount: '팔로워',
  viewCount: '조회', availableStock: '재고', creatorName: '크리에이터', category: '카테고리',
  startDate: '시작', endDate: '종료', registrationEndDate: '접수 마감', currentPrice: '현재 가격',
};

function unwrap(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  for (const key of ['competition', 'strategy', 'stream', 'merchandise', 'product', 'nft', 'data']) {
    if (payload[key] && typeof payload[key] === 'object' && !Array.isArray(payload[key])) return payload[key];
  }
  return payload;
}

function formatValue(key, value) {
  if (value === null || value === undefined || value === '') return '-';
  if (/date|at$/i.test(key) && !Number.isNaN(Date.parse(value))) return new Date(value).toLocaleString('ko-KR');
  if (typeof value === 'number') return value.toLocaleString('ko-KR');
  if (typeof value === 'boolean') return value ? '예' : '아니요';
  return String(value);
}

export default function EntityDetailScreen({ route, navigation }) {
  const config = CONFIG[route.name];
  const id = route.params?.[config.id];
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [shippingAddress, setShippingAddress] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const response = await config.get(id);
      setItem(unwrap(response.data));
    } catch (requestError) {
      setError(requestError.response?.data?.error || '상세 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [config, id]);

  useEffect(() => { load(); }, [load]);

  const details = useMemo(() => {
    if (!item) return [];
    return Object.entries(item)
      .filter(([key, value]) => LABELS[key] && ['string', 'number', 'boolean'].includes(typeof value))
      .slice(0, 10);
  }, [item]);

  const handleAction = async () => {
    if (config.needsShipping && !shippingAddress.trim()) {
      Alert.alert('배송지 필요', '배송지를 입력해주세요.');
      return;
    }
    try {
      setSubmitting(true);
      const options = config.needsShipping
        ? { quantity: Number(quantity) || 1, shippingAddress: shippingAddress.trim() }
        : undefined;
      await config.action(id, options);
      Alert.alert('완료', `${config.actionLabel} 요청이 처리되었습니다.`);
      await load();
    } catch (actionError) {
      Alert.alert('처리 실패', actionError.response?.data?.error || actionError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const image = item?.imageUrl || item?.image || item?.thumbnail;
  const title = item?.title || item?.name || item?.stockName || config.title;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: config.color }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="뒤로 가기">
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{config.title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={config.color} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={42} color="#94A3B8" />
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity style={[styles.retry, { backgroundColor: config.color }]} onPress={load}>
            <Text style={styles.primaryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          {image ? <Image source={{ uri: image }} style={styles.hero} /> : (
            <View style={[styles.heroFallback, { backgroundColor: `${config.color}18` }]}>
              <Ionicons name="sparkles-outline" size={54} color={config.color} />
            </View>
          )}
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            {item?.description ? <Text style={styles.description}>{item.description}</Text> : null}
            {details.map(([key, value]) => (
              <View style={styles.row} key={key}>
                <Text style={styles.label}>{LABELS[key]}</Text>
                <Text style={styles.value}>{formatValue(key, value)}</Text>
              </View>
            ))}
          </View>
          {config.needsShipping ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>주문 정보</Text>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
                placeholder="수량"
              />
              <TextInput
                style={[styles.input, styles.addressInput]}
                value={shippingAddress}
                onChangeText={setShippingAddress}
                placeholder="배송지 주소"
                multiline
              />
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: config.color }, submitting && styles.disabled]}
            onPress={handleAction}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{config.actionLabel}</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB' },
  header: { minHeight: 64, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 14, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { flex: 1, color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  headerSpacer: { width: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  content: { padding: 18, paddingBottom: 40 },
  hero: { width: '100%', height: 220, borderRadius: 20, marginBottom: 16 },
  heroFallback: { height: 180, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#E8ECF2' },
  title: { fontSize: 25, fontWeight: '900', color: '#111827', marginBottom: 10 },
  description: { fontSize: 15, lineHeight: 23, color: '#475569', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#EEF2F6', gap: 18 },
  label: { color: '#64748B', fontSize: 14 },
  value: { color: '#111827', fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#D9E0EA', borderRadius: 12, paddingHorizontal: 14, fontSize: 15, marginBottom: 10, backgroundColor: '#FAFBFC' },
  addressInput: { minHeight: 84, paddingTop: 13, textAlignVertical: 'top' },
  primaryButton: { minHeight: 54, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  retry: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  error: { color: '#475569', textAlign: 'center', lineHeight: 21 },
  disabled: { opacity: 0.55 },
});
