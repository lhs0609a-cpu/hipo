import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import TrustBadge from './TrustBadge';

const CATEGORIES = [
  { key: 'all', label: '전체', icon: 'apps-outline' },
  { key: 'entertainment', label: '엔터테인먼트', icon: 'musical-notes-outline' },
  { key: 'sports', label: '스포츠', icon: 'football-outline' },
  { key: 'creator', label: '크리에이터', icon: 'videocam-outline' },
  { key: 'influencer', label: '인플루언서', icon: 'person-outline' },
];

const TRUST_LEVELS = [
  { key: 'all', label: '전체' },
  { key: 'legend', label: '레전드' },
  { key: 'master', label: '마스터' },
  { key: 'diamond', label: '다이아몬드' },
  { key: 'platinum', label: '플래티넘' },
  { key: 'gold', label: '골드' },
  { key: 'silver', label: '실버' },
  { key: 'bronze', label: '브론즈' },
];

const PRICE_RANGES = [
  { key: 'all', label: '전체', min: 0, max: Infinity },
  { key: 'under1000', label: '1,000 PO 이하', min: 0, max: 1000 },
  { key: '1000to3000', label: '1,000~3,000 PO', min: 1000, max: 3000 },
  { key: '3000to5000', label: '3,000~5,000 PO', min: 3000, max: 5000 },
  { key: 'over5000', label: '5,000 PO 이상', min: 5000, max: Infinity },
];

const SORT_OPTIONS = [
  { key: 'popular', label: '인기순', icon: 'flame-outline' },
  { key: 'priceHigh', label: '가격 높은순', icon: 'arrow-up-outline' },
  { key: 'priceLow', label: '가격 낮은순', icon: 'arrow-down-outline' },
  { key: 'changeHigh', label: '상승률 높은순', icon: 'trending-up-outline' },
  { key: 'newest', label: '최신순', icon: 'time-outline' },
];

const SearchFilterModal = ({ visible, onClose, filters, onApply }) => {
  const [localFilters, setLocalFilters] = useState(filters || {
    category: 'all',
    trustLevel: 'all',
    priceRange: 'all',
    sortBy: 'popular',
  });

  const updateFilter = (key, value) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      category: 'all',
      trustLevel: 'all',
      priceRange: 'all',
      sortBy: 'popular',
    };
    setLocalFilters(resetFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.category !== 'all') count++;
    if (localFilters.trustLevel !== 'all') count++;
    if (localFilters.priceRange !== 'all') count++;
    if (localFilters.sortBy !== 'popular') count++;
    return count;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 헤더 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleReset} style={styles.headerButton}>
              <Text style={styles.resetText}>초기화</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>필터</Text>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* 카테고리 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>카테고리</Text>
              <View style={styles.optionGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.optionChip,
                      localFilters.category === cat.key && styles.optionChipActive,
                    ]}
                    onPress={() => updateFilter('category', cat.key)}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={16}
                      color={localFilters.category === cat.key ? '#fff' : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.optionChipText,
                        localFilters.category === cat.key && styles.optionChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 신뢰등급 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>신뢰등급</Text>
              <View style={styles.trustLevelGrid}>
                {TRUST_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level.key}
                    style={[
                      styles.trustLevelItem,
                      localFilters.trustLevel === level.key && styles.trustLevelItemActive,
                    ]}
                    onPress={() => updateFilter('trustLevel', level.key)}
                  >
                    {level.key !== 'all' ? (
                      <TrustBadge level={level.key} size="small" showLabel={false} variant="icon" />
                    ) : (
                      <View style={styles.allBadge}>
                        <Ionicons name="grid-outline" size={14} color={COLORS.textSecondary} />
                      </View>
                    )}
                    <Text
                      style={[
                        styles.trustLevelText,
                        localFilters.trustLevel === level.key && styles.trustLevelTextActive,
                      ]}
                    >
                      {level.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 가격대 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>가격대</Text>
              <View style={styles.optionList}>
                {PRICE_RANGES.map((range) => (
                  <TouchableOpacity
                    key={range.key}
                    style={[
                      styles.optionRow,
                      localFilters.priceRange === range.key && styles.optionRowActive,
                    ]}
                    onPress={() => updateFilter('priceRange', range.key)}
                  >
                    <Text
                      style={[
                        styles.optionRowText,
                        localFilters.priceRange === range.key && styles.optionRowTextActive,
                      ]}
                    >
                      {range.label}
                    </Text>
                    {localFilters.priceRange === range.key && (
                      <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 정렬 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>정렬</Text>
              <View style={styles.optionList}>
                {SORT_OPTIONS.map((sort) => (
                  <TouchableOpacity
                    key={sort.key}
                    style={[
                      styles.optionRow,
                      localFilters.sortBy === sort.key && styles.optionRowActive,
                    ]}
                    onPress={() => updateFilter('sortBy', sort.key)}
                  >
                    <View style={styles.sortOptionLeft}>
                      <Ionicons
                        name={sort.icon}
                        size={18}
                        color={localFilters.sortBy === sort.key ? COLORS.primary : COLORS.textSecondary}
                      />
                      <Text
                        style={[
                          styles.optionRowText,
                          localFilters.sortBy === sort.key && styles.optionRowTextActive,
                          { marginLeft: 10 },
                        ]}
                      >
                        {sort.label}
                      </Text>
                    </View>
                    {localFilters.sortBy === sort.key && (
                      <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* 적용 버튼 */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>
                {getActiveFilterCount() > 0
                  ? `필터 적용 (${getActiveFilterCount()})`
                  : '적용하기'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// 필터 버튼 컴포넌트 (검색 화면에서 사용)
export const FilterButton = ({ activeCount = 0, onPress }) => (
  <TouchableOpacity style={styles.filterButton} onPress={onPress}>
    <Ionicons name="options-outline" size={20} color={COLORS.text} />
    {activeCount > 0 && (
      <View style={styles.filterBadge}>
        <Text style={styles.filterBadgeText}>{activeCount}</Text>
      </View>
    )}
  </TouchableOpacity>
);

// 활성 필터 태그 컴포넌트
export const ActiveFilterTags = ({ filters, onRemove }) => {
  const tags = [];

  if (filters.category !== 'all') {
    const cat = CATEGORIES.find(c => c.key === filters.category);
    if (cat) tags.push({ key: 'category', label: cat.label });
  }
  if (filters.trustLevel !== 'all') {
    const level = TRUST_LEVELS.find(l => l.key === filters.trustLevel);
    if (level) tags.push({ key: 'trustLevel', label: level.label });
  }
  if (filters.priceRange !== 'all') {
    const range = PRICE_RANGES.find(r => r.key === filters.priceRange);
    if (range) tags.push({ key: 'priceRange', label: range.label });
  }

  if (tags.length === 0) return null;

  return (
    <View style={styles.activeTagsContainer}>
      {tags.map((tag) => (
        <View key={tag.key} style={styles.activeTag}>
          <Text style={styles.activeTagText}>{tag.label}</Text>
          <TouchableOpacity onPress={() => onRemove(tag.key)}>
            <Ionicons name="close-circle" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerButton: {
    width: 60,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  resetText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    gap: 6,
  },
  optionChipActive: {
    backgroundColor: COLORS.primary,
  },
  optionChipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  optionChipTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  trustLevelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trustLevelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.gray100,
    gap: 6,
  },
  trustLevelItemActive: {
    backgroundColor: COLORS.primaryBackground,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  trustLevelText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  trustLevelTextActive: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  allBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionList: {
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  optionRowActive: {
    backgroundColor: COLORS.primaryBackground,
  },
  optionRowText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  optionRowTextActive: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Filter button styles
  filterButton: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.primary,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  // Active filter tags
  activeTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBackground,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  activeTagText: {
    fontSize: 13,
    color: COLORS.primary,
  },
});

export default SearchFilterModal;
