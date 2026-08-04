import React, { useState, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  FlatList,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { virtualCelebrityAPI } from '../services/api';
import { COLORS } from '../constants/colors';

const CATEGORY_OPTIONS = [
  { value: 'entertainment', label: '엔터테인먼트' },
  { value: 'sports', label: '스포츠' },
  { value: 'creator', label: '크리에이터' },
  { value: 'influencer', label: '인플루언서' },
  { value: 'other', label: '기타' },
];

const CATEGORY_COLORS = {
  entertainment: { bg: '#FFF1F2', text: '#F0344B' },
  sports: { bg: '#EEF4FF', text: '#2B5FE3' },
  creator: { bg: '#E7F8F0', text: '#00B368' },
  influencer: { bg: '#FFF6E6', text: '#F59B00' },
  other: { bg: '#F1F3F7', text: '#5D6779' },
};

function getCategoryLabel(value) {
  const found = CATEGORY_OPTIONS.find((opt) => opt.value === value);
  return found ? found.label : value;
}

export default function CelebSuggestionScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  // Tab state
  const [activeTab, setActiveTab] = useState('suggest');

  // Suggest form state
  const [celebName, setCelebName] = useState('');
  const [category, setCategory] = useState('');
  const [occupation, setOccupation] = useState('');
  const [reason, setReason] = useState('');
  const [socialLinks, setSocialLinks] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Suggestions list state
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [votedIds, setVotedIds] = useState(new Set());
  const [votingId, setVotingId] = useState(null);

  // Load suggestions
  const loadSuggestions = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await virtualCelebrityAPI.getSuggestions({ sort: 'popular' });
      const data = response.data?.data || response.data?.suggestions || response.data || [];
      const list = Array.isArray(data) ? data : [];
      setSuggestions(list);
      // 서버가 알려준 "이미 기다리는 중" 상태를 반영해 버튼을 눌린 상태로 시작한다
      const mine = list.filter((s) => s.alreadyWaiting).map((s) => s._id || s.id);
      if (mine.length) setVotedIds((prev) => new Set([...prev, ...mine]));
    } catch (error) {
      console.error('상장 대기 목록 조회 오류:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'popular') {
      loadSuggestions();
    }
  }, [activeTab, loadSuggestions]);

  // Submit suggestion
  const handleSubmit = async () => {
    if (!celebName.trim()) {
      const msg = '셀럽 이름을 입력해주세요.';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('알림', msg);
      return;
    }
    if (!category) {
      const msg = '카테고리를 선택해주세요.';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('알림', msg);
      return;
    }
    if (!reason.trim()) {
      const msg = '추천 이유를 입력해주세요.';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('알림', msg);
      return;
    }

    let parsedSocialLinks = {};
    if (socialLinks.trim()) {
      try {
        parsedSocialLinks = JSON.parse(socialLinks.trim());
      } catch {
        const msg = '소셜 링크는 올바른 JSON 형식이어야 합니다.\n예: {"instagram":"@name","youtube":"url"}';
        Platform.OS === 'web' ? alert(msg) : Alert.alert('형식 오류', msg);
        return;
      }
    }

    setSubmitting(true);
    try {
      await virtualCelebrityAPI.submitSuggestion({
        celebName: celebName.trim(),
        category,
        occupation: occupation.trim(),
        reason: reason.trim(),
        socialLinks: parsedSocialLinks,
      });

      const successMsg = '셀럽 추천이 등록되었습니다!';
      Platform.OS === 'web' ? alert(successMsg) : Alert.alert('완료', successMsg);

      // Reset form
      setCelebName('');
      setCategory('');
      setOccupation('');
      setReason('');
      setSocialLinks('');
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || '추천 등록 중 오류가 발생했습니다.';
      Platform.OS === 'web' ? alert(errorMsg) : Alert.alert('오류', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * "상장되면 좋겠다" 표시.
   *
   * 취소는 제공하지 않는다. 대기 인원이 줄어들면 그 감소 자체가
   * 해당 인물에 대한 부정적 평가로 읽히기 때문이다. 한 번 누르면 누적만 된다.
   */
  const handleExpect = async (id) => {
    if (votedIds.has(id) || votingId === id) return;

    setVotingId(id);
    try {
      await virtualCelebrityAPI.expectListing(id);
      setVotedIds((prev) => new Set([...prev, id]));
      setSuggestions((prev) =>
        prev
          .map((s) =>
            (s._id || s.id) === id
              ? {
                  ...s,
                  waitingCount: (s.waitingCount ?? s.upvoteCount ?? 0) + 1,
                  alreadyWaiting: true,
                }
              : s
          )
          .sort((a, b) => (b.waitingCount || 0) - (a.waitingCount || 0))
      );
    } catch (error) {
      const errorMsg = error.response?.data?.error || '처리 중 오류가 발생했습니다.';
      if (errorMsg.includes('이미') || error.response?.status === 409) {
        setVotedIds((prev) => new Set([...prev, id]));
        return; // 이미 기다리는 중이면 굳이 경고를 띄우지 않는다
      }
      Platform.OS === 'web' ? alert(errorMsg) : Alert.alert('알림', errorMsg);
    } finally {
      setVotingId(null);
    }
  };

  // Render suggestion card
  const renderSuggestionCard = ({ item }) => {
    const id = item._id || item.id;
    const hasVoted = votedIds.has(id);
    const categoryColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other;

    return (
      <View style={styles.suggestionCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.celebName}>{item.celebName}</Text>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor.bg }]}>
              <Text style={[styles.categoryBadgeText, { color: categoryColor.text }]}>
                {getCategoryLabel(item.category)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.upvoteButton,
              hasVoted && styles.upvoteButtonVoted,
            ]}
            onPress={() => handleExpect(id)}
            disabled={hasVoted || votingId === id}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={
              hasVoted
                ? `${item.celebName} 기다리는 중`
                : `${item.celebName} 상장 기다리기`
            }
          >
            {votingId === id ? (
              <ActivityIndicator size="small" color={hasVoted ? theme.colors.white : theme.colors.primary} />
            ) : (
              <>
                <Ionicons
                  name={hasVoted ? 'notifications' : 'notifications-outline'}
                  size={18}
                  color={hasVoted ? theme.colors.white : theme.colors.primary}
                />
                <Text
                  style={[
                    styles.upvoteCount,
                    hasVoted && styles.upvoteCountVoted,
                  ]}
                >
                  {(item.waitingCount ?? item.upvoteCount ?? 0).toLocaleString()}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {item.occupation ? (
          <Text style={styles.occupationText}>{item.occupation}</Text>
        ) : null}

        {item.reason ? (
          <Text style={styles.reasonText} numberOfLines={2}>
            {item.reason}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.suggesterRow}>
            <Ionicons name="person-circle-outline" size={16} color={theme.colors.textTertiary} />
            <Text style={styles.suggesterName}>
              {item.suggestedBy?.username || item.suggesterUsername || '익명'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Render suggest form tab
  const renderSuggestForm = () => (
    <KeyboardAvoidingView
      style={styles.formWrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formHeader}>
          <Ionicons name="star-outline" size={28} color={theme.colors.primary} />
          <Text style={styles.formTitle}>상장 요청하기</Text>
          <Text style={styles.formSubtitle}>
            HIPO에 상장되었으면 하는 인물을 알려주세요.{'\n'}
            기다리는 사람이 많을수록 먼저 검토되며,{'\n'}
            본인 확인이 완료된 뒤에 상장됩니다.
          </Text>
        </View>

        {/* celebName */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            셀럽 이름 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.textInput}
            value={celebName}
            onChangeText={setCelebName}
            placeholder="예: 홍길동"
            placeholderTextColor={theme.colors.textTertiary}
            maxLength={50}
          />
        </View>

        {/* category */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            카테고리 <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.selectButtonText,
                !category && styles.selectButtonPlaceholder,
              ]}
            >
              {category ? getCategoryLabel(category) : '카테고리를 선택해주세요'}
            </Text>
            <Ionicons
              name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>
          {showCategoryPicker && (
            <View style={styles.pickerDropdown}>
              {CATEGORY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.pickerOption,
                    category === opt.value && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    setCategory(opt.value);
                    setShowCategoryPicker(false);
                  }}
                >
                  <View
                    style={[
                      styles.pickerDot,
                      {
                        backgroundColor:
                          (CATEGORY_COLORS[opt.value] || CATEGORY_COLORS.other).text,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.pickerOptionText,
                      category === opt.value && styles.pickerOptionTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {category === opt.value && (
                    <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* occupation */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>직업 / 활동 분야</Text>
          <TextInput
            style={styles.textInput}
            value={occupation}
            onChangeText={setOccupation}
            placeholder="예: 가수, 유튜버, 축구선수"
            placeholderTextColor={theme.colors.textTertiary}
            maxLength={100}
          />
        </View>

        {/* reason */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            추천 이유 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={reason}
            onChangeText={setReason}
            placeholder="이 셀럽을 추천하는 이유를 작성해주세요."
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{reason.length}/500</Text>
        </View>

        {/* socialLinks */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>소셜 링크 (JSON)</Text>
          <TextInput
            style={[styles.textInput, styles.textAreaSmall]}
            value={socialLinks}
            onChangeText={setSocialLinks}
            placeholder='{"instagram":"@name","youtube":"https://..."}'
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.fieldHint}>
            JSON 형식으로 입력해주세요. 비워두셔도 됩니다.
          </Text>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <>
              <Ionicons name="send" size={18} color={theme.colors.white} />
              <Text style={styles.submitButtonText}>추천 등록하기</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // Render popular list tab
  const renderPopularList = () => {
    if (loading && suggestions.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>추천 목록을 불러오는 중...</Text>
        </View>
      );
    }

    if (!loading && suggestions.length === 0) {
      return (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadSuggestions(true)}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
          <Ionicons name="search-outline" size={48} color={theme.colors.textTertiary} />
          <Text style={styles.emptyTitle}>아직 추천이 없습니다</Text>
          <Text style={styles.emptySubtitle}>
            첫 번째로 셀럽을 추천해보세요!
          </Text>
          <TouchableOpacity
            style={styles.goSuggestButton}
            onPress={() => setActiveTab('suggest')}
          >
            <Text style={styles.goSuggestButtonText}>추천하러 가기</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    return (
      <FlatList
        data={suggestions}
        keyExtractor={(item) => String(item._id || item.id)}
        renderItem={renderSuggestionCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.noticeBox}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.textTertiary} />
            <Text style={styles.noticeText}>
              여기 표시되는 숫자는 상장을 기다리는 이용자 수입니다.
              해당 인물에 대한 평가나 가치가 아니며, 본인 확인 전까지 거래되지 않습니다.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadSuggestions(true)}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
      />
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>셀럽 추천</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'suggest' && styles.tabActive]}
          onPress={() => setActiveTab('suggest')}
        >
          <Ionicons
            name="add-circle-outline"
            size={18}
            color={activeTab === 'suggest' ? theme.colors.primary : theme.colors.textTertiary}
          />
          <Text
            style={[styles.tabText, activeTab === 'suggest' && styles.tabTextActive]}
          >
            추천하기
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'popular' && styles.tabActive]}
          onPress={() => setActiveTab('popular')}
        >
          <Ionicons
            name="trending-up-outline"
            size={18}
            color={activeTab === 'popular' ? theme.colors.primary : theme.colors.textTertiary}
          />
          <Text
            style={[styles.tabText, activeTab === 'popular' && styles.tabTextActive]}
          >
            인기 추천
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      <View style={styles.tabContent}>
        {activeTab === 'suggest' ? renderSuggestForm() : renderPopularList()}
      </View>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.colors.surface,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.text,
  },
  headerRight: {
    width: 40,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: t.colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textTertiary,
  },
  tabTextActive: {
    color: t.colors.primary,
  },

  // Tab content
  tabContent: {
    flex: 1,
  },

  // Center container (loading)
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },

  // Form
  formWrapper: {
    flex: 1,
  },
  formScroll: {
    flex: 1,
  },
  formScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: t.colors.surfaceSunken,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: t.fonts.regular,
    lineHeight: 17,
    color: t.colors.textTertiary,
  },
  formTitle: {
    fontSize: 20,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.text,
    marginTop: 12,
  },
  formSubtitle: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },

  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.text,
    marginBottom: 8,
  },
  required: {
    color: t.colors.danger,
  },
  textInput: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: t.fonts.regular,
    color: t.colors.text,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  textAreaSmall: {
    minHeight: 64,
    paddingTop: 14,
  },
  charCount: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  fieldHint: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginTop: 6,
  },

  // Select / dropdown
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectButtonText: {
    fontSize: 15,
    fontFamily: t.fonts.regular,
    color: t.colors.text,
  },
  selectButtonPlaceholder: {
    color: t.colors.textTertiary,
  },
  pickerDropdown: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
    gap: 10,
  },
  pickerOptionSelected: {
    backgroundColor: t.colors.primaryBackground,
  },
  pickerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pickerOptionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: t.fonts.regular,
    color: t.colors.text,
  },
  pickerOptionTextSelected: {
    color: t.colors.primary,
    fontWeight: '600',
  },

  // Submit button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.white,
  },

  // Popular list
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cardSeparator: {
    height: 12,
  },

  // Suggestion card
  suggestionCard: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginRight: 12,
  },
  celebName: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.text,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },

  // Upvote button
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: t.colors.primary,
    backgroundColor: t.colors.white,
    gap: 6,
    minWidth: 64,
  },
  upvoteButtonVoted: {
    backgroundColor: t.colors.primary,
    borderColor: t.colors.primary,
  },
  upvoteCount: {
    fontSize: 14,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.primary,
  },
  upvoteCountVoted: {
    color: t.colors.white,
  },

  occupationText: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: t.colors.divider,
    paddingTop: 10,
  },
  suggesterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  suggesterName: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  goSuggestButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: t.colors.primary,
    borderRadius: 10,
  },
  goSuggestButtonText: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.white,
  },
});
