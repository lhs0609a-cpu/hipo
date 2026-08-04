import React, { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { virtualCelebrityAPI } from '../services/api';
import VirtualStatusBadge from '../components/VirtualStatusBadge';

const TABS = [
  { key: 'celebrities', label: '가상 셀럽' },
  { key: 'claims', label: '인수 요청' },
  { key: 'create', label: '새로 생성' },
];

export default function AdminVirtualCelebrityScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('celebrities');
  const [celebrities, setCelebrities] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({
    username: '',
    displayName: '',
    bio: '',
    category: 'entertainment',
    occupation: '',
    trustLevel: 'silver',
    initialPrice: '1000',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'celebrities') {
        const res = await virtualCelebrityAPI.adminList();
        setCelebrities(res.data?.data || []);
      } else if (activeTab === 'claims') {
        const res = await virtualCelebrityAPI.adminListClaims();
        setClaims(res.data?.data || []);
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const showAlert = (title, message) => {
    Platform.OS === 'web' ? alert(`${title}\n${message}`) : Alert.alert(title, message);
  };

  const handleCreate = async () => {
    if (!createForm.username || !createForm.displayName) {
      showAlert('입력 필요', '별칭과 표시 이름을 입력하세요');
      return;
    }

    setCreating(true);
    try {
      await virtualCelebrityAPI.create({
        ...createForm,
        initialPrice: parseInt(createForm.initialPrice) || 1000,
      });
      showAlert('성공', '가상 셀럽이 생성되었습니다');
      setCreateForm({
        username: '',
        displayName: '',
        bio: '',
        category: 'entertainment',
        occupation: '',
        trustLevel: 'silver',
        initialPrice: '1000',
      });
      setActiveTab('celebrities');
    } catch (error) {
      showAlert('오류', error.response?.data?.error || '생성 중 오류가 발생했습니다');
    } finally {
      setCreating(false);
    }
  };

  const handleApproveClaim = async (claimId) => {
    try {
      await virtualCelebrityAPI.approveClaim(claimId, {});
      showAlert('성공', '인수가 승인되었습니다');
      loadData();
    } catch (error) {
      showAlert('오류', error.response?.data?.error || '승인 중 오류가 발생했습니다');
    }
  };

  const handleRejectClaim = (claimId) => {
    if (Platform.OS === 'web') {
      const reason = prompt('거절 사유를 입력하세요:');
      if (reason) {
        virtualCelebrityAPI.rejectClaim(claimId, { rejectionReason: reason })
          .then(() => { showAlert('완료', '인수가 거부되었습니다'); loadData(); })
          .catch(err => showAlert('오류', err.response?.data?.error || '거부 중 오류가 발생했습니다'));
      }
    } else {
      Alert.prompt('거절 사유', '거절 사유를 입력하세요:', async (reason) => {
        if (reason) {
          try {
            await virtualCelebrityAPI.rejectClaim(claimId, { rejectionReason: reason });
            showAlert('완료', '인수가 거부되었습니다');
            loadData();
          } catch (err) {
            showAlert('오류', err.response?.data?.error || '거부 중 오류가 발생했습니다');
          }
        }
      });
    }
  };

  const renderCelebrityItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.displayName || item.username || '?').charAt(0)}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.displayName}</Text>
          <Text style={styles.cardUsername}>@{item.username}</Text>
        </View>
        <VirtualStatusBadge virtualStatus={item.virtualStatus} size="small" />
      </View>
      {item.issuedStock && (
        <View style={styles.stockInfo}>
          <Text style={styles.stockPrice}>
            {item.issuedStock.sharePrice?.toLocaleString()} PO
          </Text>
          <Text style={styles.stockMeta}>
            주주 {item.issuedStock.shareholderCount || 0}명
          </Text>
        </View>
      )}
    </View>
  );

  const renderClaimItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>
            {item.virtualUser?.displayName} → {item.claimant?.displayName}
          </Text>
          <Text style={styles.cardUsername}>
            실명: {item.realName} | 상태: {item.status}
          </Text>
        </View>
      </View>

      {item.socialLinks && Object.keys(item.socialLinks).length > 0 && (
        <View style={styles.socialInfo}>
          {Object.entries(item.socialLinks).filter(([, v]) => v).map(([key, value]) => (
            <Text key={key} style={styles.socialLink}>{key}: {value}</Text>
          ))}
        </View>
      )}

      {(item.status === 'pending' || item.status === 'under_review') && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApproveClaim(item.id)}
          >
            <Text style={styles.approveText}>승인</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleRejectClaim(item.id)}
          >
            <Text style={styles.rejectText}>거부</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderCreateForm = () => (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.formTitle}>가상 셀럽 생성</Text>

      <Text style={styles.label}>별칭 (username) *</Text>
      <TextInput
        style={styles.input}
        value={createForm.username}
        onChangeText={(v) => setCreateForm(prev => ({ ...prev, username: v }))}
        placeholder="예: 아이유"
        placeholderTextColor="#7C8698"
      />

      <Text style={styles.label}>표시 이름 *</Text>
      <TextInput
        style={styles.input}
        value={createForm.displayName}
        onChangeText={(v) => setCreateForm(prev => ({ ...prev, displayName: v }))}
        placeholder="예: 아이유 (IU)"
        placeholderTextColor="#7C8698"
      />

      <Text style={styles.label}>소개</Text>
      <TextInput
        style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
        value={createForm.bio}
        onChangeText={(v) => setCreateForm(prev => ({ ...prev, bio: v }))}
        placeholder="크리에이터 소개"
        placeholderTextColor="#7C8698"
        multiline
      />

      <Text style={styles.label}>카테고리</Text>
      <View style={styles.categoryRow}>
        {['entertainment', 'sports', 'creator', 'influencer'].map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, createForm.category === cat && styles.categoryChipActive]}
            onPress={() => setCreateForm(prev => ({ ...prev, category: cat }))}
          >
            <Text style={[styles.categoryChipText, createForm.category === cat && styles.categoryChipTextActive]}>
              {cat === 'entertainment' ? '엔터' : cat === 'sports' ? '스포츠' : cat === 'creator' ? '크리에이터' : '인플루언서'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>직업</Text>
      <TextInput
        style={styles.input}
        value={createForm.occupation}
        onChangeText={(v) => setCreateForm(prev => ({ ...prev, occupation: v }))}
        placeholder="예: 가수, 배우, 유튜버"
        placeholderTextColor="#7C8698"
      />

      <Text style={styles.label}>초기 주가 (PO)</Text>
      <TextInput
        style={styles.input}
        value={createForm.initialPrice}
        onChangeText={(v) => setCreateForm(prev => ({ ...prev, initialPrice: v }))}
        placeholder="1000"
        placeholderTextColor="#7C8698"
        keyboardType="numeric"
      />

      <TouchableOpacity
        style={[styles.createButton, creating && { opacity: 0.6 }]}
        onPress={handleCreate}
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.createButtonText}>가상 셀럽 생성</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2E3542" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>가상 셀럽 관리</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'create' ? (
        renderCreateForm()
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B5FE3" />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'celebrities' ? celebrities : claims}
          renderItem={activeTab === 'celebrities' ? renderCelebrityItem : renderClaimItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#CBD1DC" />
              <Text style={styles.emptyText}>
                {activeTab === 'celebrities' ? '가상 셀럽이 없습니다' : '인수 요청이 없습니다'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.backgroundSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 16,
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: t.colors.textPrimary },
  tabs: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: t.colors.backgroundSecondary,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: t.colors.primary },
  tabText: { fontSize: 14, color: t.colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: t.colors.surface },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: t.colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: t.colors.surface },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: t.colors.textPrimary },
  cardUsername: { fontSize: 13, color: t.colors.textSecondary, marginTop: 2 },
  stockInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: t.colors.backgroundSecondary,
  },
  stockPrice: { fontSize: 15, fontWeight: '600', color: t.colors.textPrimary },
  stockMeta: { fontSize: 13, color: t.colors.textSecondary },
  socialInfo: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.colors.backgroundSecondary },
  socialLink: { fontSize: 13, color: t.colors.primary, marginBottom: 4 },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  approveButton: { backgroundColor: t.colors.successBackground },
  approveText: { fontSize: 14, fontWeight: '600', color: t.colors.successText },
  rejectButton: { backgroundColor: t.colors.stockUpSoft },
  rejectText: { fontSize: 14, fontWeight: '600', color: t.colors.errorText },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, color: t.colors.textDisabled, marginTop: 12 },
  // Create form
  formContainer: { padding: 20 },
  formTitle: { fontSize: 22, fontWeight: '700', color: t.colors.textPrimary, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: t.colors.gray700, marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: t.colors.borderDark,
    borderRadius: 12,
    padding: 14,
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textPrimary,
    backgroundColor: t.colors.surface,
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.colors.borderDark,
    backgroundColor: t.colors.surface,
  },
  categoryChipActive: { borderColor: t.colors.primary, backgroundColor: t.colors.primaryBackground },
  categoryChipText: { fontSize: 14, color: t.colors.textSecondary },
  categoryChipTextActive: { color: t.colors.primary, fontWeight: '600' },
  createButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
  },
  createButtonText: { fontSize: 16, fontWeight: '600', color: t.colors.surface },
});
