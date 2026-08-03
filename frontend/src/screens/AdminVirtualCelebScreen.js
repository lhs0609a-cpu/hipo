import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
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
  Platform,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { virtualCelebrityAPI } from '../services/api';

const CATEGORIES = [
  { label: '엔터테인먼트', value: 'entertainment' },
  { label: '스포츠', value: 'sports' },
  { label: '크리에이터', value: 'creator' },
  { label: '인플루언서', value: 'influencer' },
  { label: '기타', value: 'other' },
];

const TRUST_LEVELS = [
  { label: '브론즈', value: 'bronze' },
  { label: '실버', value: 'silver' },
  { label: '골드', value: 'gold' },
  { label: '플래티넘', value: 'platinum' },
  { label: '다이아몬드', value: 'diamond' },
];

const STATUS_FILTERS = [
  { label: '전체', value: '' },
  { label: '미인수', value: 'unclaimed' },
  { label: '인수 대기', value: 'claim_pending' },
  { label: '인수 완료', value: 'claimed' },
];

const CATEGORY_LABELS = {
  entertainment: '엔터테인먼트',
  sports: '스포츠',
  creator: '크리에이터',
  influencer: '인플루언서',
  other: '기타',
};

const STATUS_BADGE_CONFIG = {
  unclaimed: { label: '미인수', color: COLORS.warning, bg: COLORS.warningBackground },
  claim_pending: { label: '인수 대기', color: COLORS.info, bg: COLORS.primaryBackground },
  claimed: { label: '인수 완료', color: COLORS.success, bg: COLORS.successBackground },
};

const TRUST_LEVEL_BADGE_COLORS = {
  bronze: COLORS.bronze,
  silver: COLORS.silver,
  gold: COLORS.gold,
  platinum: COLORS.platinum,
  diamond: COLORS.diamond,
};

function showAlert(title, message) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function AdminVirtualCelebScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  // --- Section toggle ---
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'list'

  // --- Create form state ---
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState('entertainment');
  const [occupation, setOccupation] = useState('');
  const [bio, setBio] = useState('');
  const [trustLevel, setTrustLevel] = useState('bronze');
  const [creating, setCreating] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showTrustPicker, setShowTrustPicker] = useState(false);

  // --- List state ---
  const [celebrities, setCelebrities] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [listPage, setListPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);

  // --- Fetch list ---
  const fetchList = useCallback(async (page = 1, filter = statusFilter) => {
    setListLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filter) {
        params.virtualStatus = filter;
      }
      const res = await virtualCelebrityAPI.adminList(params);
      const data = res.data;
      if (data.success !== false) {
        const items = data.celebrities || data.data || [];
        if (page === 1) {
          setCelebrities(items);
        } else {
          setCelebrities((prev) => [...prev, ...items]);
        }
        setListTotal(data.pagination?.total || data.total || items.length);
        setListPage(page);
      }
    } catch (error) {
      console.error('가상 셀럽 목록 조회 실패:', error);
    } finally {
      setListLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === 'list') {
      fetchList(1);
    }
  }, [activeTab, statusFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchList(1);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (celebrities.length < listTotal && !listLoading) {
      fetchList(listPage + 1);
    }
  };

  // --- Create handler ---
  const resetForm = () => {
    setUsername('');
    setDisplayName('');
    setCategory('entertainment');
    setOccupation('');
    setBio('');
    setTrustLevel('bronze');
    setShowCategoryPicker(false);
    setShowTrustPicker(false);
  };

  const handleCreate = async () => {
    if (!username.trim()) {
      showAlert('입력 오류', '유저네임을 입력해주세요.');
      return;
    }
    if (!displayName.trim()) {
      showAlert('입력 오류', '표시 이름을 입력해주세요.');
      return;
    }
    if (!occupation.trim()) {
      showAlert('입력 오류', '직업을 입력해주세요.');
      return;
    }
    setCreating(true);
    try {
      // 가격·주식수는 보내지 않는다. 종목은 본인 확인 승인 시점에 생성된다.
      const payload = {
        username: username.trim(),
        displayName: displayName.trim(),
        category,
        occupation: occupation.trim(),
        bio: bio.trim(),
        trustLevel,
      };
      const res = await virtualCelebrityAPI.create(payload);
      if (res.data) {
        showAlert(
          '등록 완료',
          `${displayName} 상장 대기 프로필이 생성되었습니다.\n종목은 본인 확인이 완료되면 생성됩니다.`
        );
        resetForm();
      }
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || '가상 셀럽 생성에 실패했습니다.';
      showAlert('생성 실패', msg);
    } finally {
      setCreating(false);
    }
  };

  // --- Dropdown component ---
  const DropdownField = ({ label, value, displayValue, items, visible, onToggle, onSelect }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.dropdownText}>{displayValue}</Text>
        <Text style={styles.dropdownArrow}>{visible ? '\u25B2' : '\u25BC'}</Text>
      </TouchableOpacity>
      {visible && (
        <View style={styles.dropdownList}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.dropdownOption,
                value === item.value && styles.dropdownOptionActive,
              ]}
              onPress={() => onSelect(item.value)}
            >
              <Text
                style={[
                  styles.dropdownOptionText,
                  value === item.value && styles.dropdownOptionTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  // --- Render create form ---
  const renderCreateForm = () => (
    <ScrollView
      contentContainerStyle={styles.formContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>가상 셀럽 생성</Text>
        <Text style={styles.cardSubtitle}>새로운 가상 셀럽 계정을 등록합니다.</Text>

        {/* Username */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>유저네임 *</Text>
          <TextInput
            style={styles.textInput}
            value={username}
            onChangeText={setUsername}
            placeholder="예: bts_jungkook"
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Display Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>표시 이름 *</Text>
          <TextInput
            style={styles.textInput}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="예: 방탄소년단 정국"
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>

        {/* Category Dropdown */}
        <DropdownField
          label="카테고리 *"
          value={category}
          displayValue={CATEGORIES.find((c) => c.value === category)?.label || '선택'}
          items={CATEGORIES}
          visible={showCategoryPicker}
          onToggle={() => {
            setShowCategoryPicker(!showCategoryPicker);
            setShowTrustPicker(false);
          }}
          onSelect={(val) => {
            setCategory(val);
            setShowCategoryPicker(false);
          }}
        />

        {/* Occupation */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>직업 *</Text>
          <TextInput
            style={styles.textInput}
            value={occupation}
            onChangeText={setOccupation}
            placeholder="예: 가수, 배우, 유튜버"
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>

        {/* Bio */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>소개</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="셀럽 소개를 입력해주세요"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Trust Level Dropdown */}
        <DropdownField
          label="신뢰 등급"
          value={trustLevel}
          displayValue={TRUST_LEVELS.find((t) => t.value === trustLevel)?.label || '선택'}
          items={TRUST_LEVELS}
          visible={showTrustPicker}
          onToggle={() => {
            setShowTrustPicker(!showTrustPicker);
            setShowCategoryPicker(false);
          }}
          onSelect={(val) => {
            setTrustLevel(val);
            setShowTrustPicker(false);
          }}
        />

        {/*
          초기 가격·주식 수 입력은 제거했다.
          본인 확인 전 인물에 값을 매기지 않는 것이 정책이며,
          종목 발행 조건은 인수 승인 화면에서 정한다.
        */}
        <View style={styles.policyNotice}>
          <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.policyNoticeText}>
            상장 대기 프로필만 생성됩니다. 가격·주식 수는 본인 확인이 완료된 뒤
            인수 승인 단계에서 설정합니다. 사진과 실명은 저장하지 않습니다.
          </Text>
        </View>

        {/* Preview */}
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>미리보기</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewAvatar}>
              <Text style={styles.previewAvatarText}>
                {displayName ? displayName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>{displayName || '표시 이름'}</Text>
              <Text style={styles.previewUsername}>@{username || 'username'}</Text>
              <Text style={styles.previewMeta}>
                {CATEGORY_LABELS[category] || category} · {occupation || '직업'}
              </Text>
            </View>
            <View style={styles.previewRight}>
              <Text style={styles.previewPending}>상장 전</Text>
              <View
                style={[
                  styles.trustBadge,
                  { backgroundColor: (TRUST_LEVEL_BADGE_COLORS[trustLevel] || theme.colors.gray400) + '30' },
                ]}
              >
                <Text
                  style={[
                    styles.trustBadgeText,
                    { color: TRUST_LEVEL_BADGE_COLORS[trustLevel] || theme.colors.gray400 },
                  ]}
                >
                  {TRUST_LEVELS.find((t) => t.value === trustLevel)?.label || trustLevel}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            creating && styles.submitButtonDisabled,
          ]}
          onPress={handleCreate}
          disabled={creating}
          activeOpacity={0.8}
        >
          {creating ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>가상 셀럽 생성</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  // --- Render list item ---
  const renderCelebItem = ({ item }) => {
    const statusConfig = STATUS_BADGE_CONFIG[item.virtualStatus] || STATUS_BADGE_CONFIG.unclaimed;
    const trustColor = TRUST_LEVEL_BADGE_COLORS[item.trustLevel] || theme.colors.gray400;

    return (
      <View style={styles.listItem}>
        <View style={styles.listItemAvatar}>
          <Text style={styles.listItemAvatarText}>
            {(item.displayName || item.username || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.listItemContent}>
          <View style={styles.listItemTopRow}>
            <Text style={styles.listItemName} numberOfLines={1}>
              {item.displayName || item.username}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
          <Text style={styles.listItemUsername}>@{item.username}</Text>
          <View style={styles.listItemMetaRow}>
            <Text style={styles.listItemCategory}>
              {CATEGORY_LABELS[item.category] || item.category || '-'}
            </Text>
            <View style={styles.metaDot} />
            <Text style={styles.listItemPrice}>
              {(item.sharePrice || 0).toLocaleString()} PO
            </Text>
            <View style={styles.metaDot} />
            <Text style={styles.listItemShareholders}>
              주주 {item.shareholderCount || 0}명
            </Text>
          </View>
          <View style={styles.listItemBadgeRow}>
            <View style={[styles.trustBadgeSmall, { backgroundColor: trustColor + '25' }]}>
              <Text style={[styles.trustBadgeSmallText, { color: trustColor }]}>
                {TRUST_LEVELS.find((t) => t.value === item.trustLevel)?.label || item.trustLevel || '-'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // --- Render list ---
  const renderList = () => (
    <View style={styles.listContainer}>
      {/* Status filter tabs */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[
                styles.filterChip,
                statusFilter === f.value && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter(f.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === f.value && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.listCount}>
        총 {listTotal}명의 가상 셀럽
      </Text>

      {listLoading && celebrities.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      ) : celebrities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>등록된 가상 셀럽이 없습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={celebrities}
          keyExtractor={(item) => String(item.id || item._id)}
          renderItem={renderCelebItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            listLoading && celebrities.length > 0 ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'\u003C'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>가상 셀럽 관리</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tab selector */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'create' && styles.tabActive]}
          onPress={() => setActiveTab('create')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>
            생성
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'list' && styles.tabActive]}
          onPress={() => setActiveTab('list')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>
            목록
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'create' ? renderCreateForm() : renderList()}
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: t.colors.background,
  },

  // --- Header ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  backText: {
    fontSize: 24,
    fontWeight: '300',
    color: t.colors.textPrimary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: t.colors.textPrimary,
  },
  headerRight: {
    width: 40,
  },

  // --- Tabs ---
  tabRow: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: t.colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: t.colors.textTertiary,
  },
  tabTextActive: {
    color: t.colors.primary,
  },

  // --- Form ---
  formContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: t.colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: t.colors.textTertiary,
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: t.colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: t.colors.textPrimary,
    backgroundColor: t.colors.gray50,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  inputWithSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputFlex: {
    flex: 1,
  },
  inputSuffix: {
    fontSize: 15,
    fontWeight: '600',
    color: t.colors.textSecondary,
    marginLeft: 10,
  },

  // --- Dropdown ---
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: t.colors.gray50,
  },
  dropdownText: {
    fontSize: 15,
    color: t.colors.textPrimary,
  },
  dropdownArrow: {
    fontSize: 10,
    color: t.colors.textTertiary,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 10,
    marginTop: 4,
    backgroundColor: t.colors.white,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  dropdownOptionActive: {
    backgroundColor: t.colors.primaryBackground,
  },
  dropdownOptionText: {
    fontSize: 14,
    color: t.colors.textPrimary,
  },
  dropdownOptionTextActive: {
    color: t.colors.primary,
    fontWeight: '600',
  },

  // --- Preview ---
  previewSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: t.colors.textTertiary,
    marginBottom: 10,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.gray50,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: t.colors.divider,
  },
  previewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: t.colors.white,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '700',
    color: t.colors.textPrimary,
  },
  previewUsername: {
    fontSize: 13,
    color: t.colors.textTertiary,
    marginTop: 1,
  },
  previewMeta: {
    fontSize: 12,
    color: t.colors.textSecondary,
    marginTop: 2,
  },
  previewRight: {
    alignItems: 'flex-end',
  },
  previewPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: t.colors.textPrimary,
    marginBottom: 4,
  },
  previewPending: {
    fontSize: 12,
    fontWeight: '600',
    color: t.colors.textTertiary,
    marginBottom: 4,
  },
  policyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 14,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: t.colors.surfaceSunken,
    borderWidth: 1,
    borderColor: t.colors.borderLight,
  },
  policyNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: t.colors.textSecondary,
  },
  trustBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trustBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // --- Submit ---
  submitButton: {
    backgroundColor: t.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: t.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },

  // --- List ---
  listContainer: {
    flex: 1,
  },
  filterRow: {
    backgroundColor: t.colors.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: t.colors.gray100,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: t.colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: t.colors.textSecondary,
  },
  filterChipTextActive: {
    color: t.colors.white,
  },
  listCount: {
    fontSize: 13,
    color: t.colors.textTertiary,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  listContent: {
    paddingBottom: 40,
  },

  // --- List Item ---
  listItem: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  listItemAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: t.colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  listItemAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: t.colors.primary,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: t.colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  listItemUsername: {
    fontSize: 13,
    color: t.colors.textTertiary,
    marginBottom: 4,
  },
  listItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  listItemCategory: {
    fontSize: 12,
    color: t.colors.textSecondary,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: t.colors.gray400,
    marginHorizontal: 6,
  },
  listItemPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: t.colors.textPrimary,
  },
  listItemShareholders: {
    fontSize: 12,
    color: t.colors.textSecondary,
  },
  listItemBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trustBadgeSmallText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // --- Status Badge ---
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // --- Loading / Empty ---
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: t.colors.textTertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: t.colors.textTertiary,
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
