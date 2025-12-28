import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { COLORS } from '../constants/colors';
import api from '../api/client';

export default function StrategyScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all'); // all, my, followed
  const [strategies, setStrategies] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    strategyType: 'growth', // growth, value, dividend, balanced
    riskLevel: 'medium', // low, medium, high
    targetReturn: '',
    isPublic: true,
  });

  useEffect(() => {
    loadStrategies();
  }, [selectedTab]);

  const loadStrategies = async () => {
    try {
      setLoading(true);
      let endpoint = '/strategies';

      if (selectedTab === 'my') {
        endpoint = '/strategies/my';
      } else if (selectedTab === 'followed') {
        endpoint = '/strategies/followed';
      }

      const response = await api.get(endpoint);
      if (response.data.success) {
        setStrategies(response.data.strategies || []);
      }
    } catch (error) {
      console.error('전략 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const createStrategy = async () => {
    if (!formData.name || !formData.description) {
      if (Platform.OS === 'web') {
        window.alert('전략 이름과 설명을 입력해주세요');
      } else {
        Alert.alert('알림', '전략 이름과 설명을 입력해주세요');
      }
      return;
    }

    try {
      const response = await api.post('/strategies', {
        ...formData,
        targetReturn: parseFloat(formData.targetReturn) || 0,
      });

      if (response.data.success) {
        if (Platform.OS === 'web') {
          window.alert('전략이 생성되었습니다');
        } else {
          Alert.alert('성공', '전략이 생성되었습니다');
        }
        setShowCreateModal(false);
        resetForm();
        loadStrategies();
      }
    } catch (error) {
      console.error('전략 생성 오류:', error);
      if (Platform.OS === 'web') {
        window.alert('전략 생성에 실패했습니다');
      } else {
        Alert.alert('오류', '전략 생성에 실패했습니다');
      }
    }
  };

  const followStrategy = async (strategyId) => {
    try {
      await api.post(`/strategies/${strategyId}/follow`);
      loadStrategies();
    } catch (error) {
      console.error('팔로우 오류:', error);
    }
  };

  const unfollowStrategy = async (strategyId) => {
    try {
      await api.delete(`/strategies/${strategyId}/follow`);
      loadStrategies();
    } catch (error) {
      console.error('언팔로우 오류:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      strategyType: 'growth',
      riskLevel: 'medium',
      targetReturn: '',
      isPublic: true,
    });
  };

  const getStrategyTypeText = (type) => {
    const types = {
      growth: '성장형',
      value: '가치형',
      dividend: '배당형',
      balanced: '균형형',
    };
    return types[type] || type;
  };

  const getRiskLevelText = (level) => {
    const levels = {
      low: '🟢 낮음',
      medium: '🟡 중간',
      high: '🔴 높음',
    };
    return levels[level] || level;
  };

  const getRiskLevelColor = (level) => {
    const colors = {
      low: COLORS.success,
      medium: '#FFA500',
      high: COLORS.danger,
    };
    return colors[level] || COLORS.textSecondary;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>투자 전략</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addButton}>
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* 탭 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
          onPress={() => setSelectedTab('all')}
        >
          <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>
            전체 전략
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'my' && styles.tabActive]}
          onPress={() => setSelectedTab('my')}
        >
          <Text style={[styles.tabText, selectedTab === 'my' && styles.tabTextActive]}>
            내 전략
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'followed' && styles.tabActive]}
          onPress={() => setSelectedTab('followed')}
        >
          <Text style={[styles.tabText, selectedTab === 'followed' && styles.tabTextActive]}>
            팔로우
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {strategies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>
              {selectedTab === 'my'
                ? '작성한 전략이 없습니다'
                : selectedTab === 'followed'
                ? '팔로우한 전략이 없습니다'
                : '등록된 전략이 없습니다'}
            </Text>
            {selectedTab === 'my' && (
              <TouchableOpacity style={styles.emptyButton} onPress={() => setShowCreateModal(true)}>
                <Text style={styles.emptyButtonText}>전략 만들기</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          strategies.map((strategy) => (
            <View key={strategy.id} style={styles.strategyCard}>
              <View style={styles.strategyHeader}>
                <View style={styles.strategyHeaderLeft}>
                  <Text style={styles.strategyName}>{strategy.name}</Text>
                  <Text style={styles.strategyAuthor}>
                    by {strategy.user?.username || '알 수 없음'}
                  </Text>
                </View>
                <View style={styles.strategyBadges}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{getStrategyTypeText(strategy.strategyType)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: getRiskLevelColor(strategy.riskLevel) + '20' }]}>
                    <Text style={[styles.badgeText, { color: getRiskLevelColor(strategy.riskLevel) }]}>
                      {getRiskLevelText(strategy.riskLevel)}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.strategyDescription} numberOfLines={2}>
                {strategy.description}
              </Text>

              <View style={styles.strategyStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>목표 수익률</Text>
                  <Text style={styles.statValue}>{strategy.targetReturn?.toFixed(1)}%</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>실제 수익률</Text>
                  <Text style={[styles.statValue, { color: strategy.totalReturn >= 0 ? COLORS.success : COLORS.danger }]}>
                    {strategy.totalReturn?.toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>팔로워</Text>
                  <Text style={styles.statValue}>{strategy.followerCount || 0}명</Text>
                </View>
              </View>

              <View style={styles.strategyActions}>
                <TouchableOpacity
                  style={styles.detailButton}
                  onPress={() => navigation.navigate('StrategyDetail', { strategyId: strategy.id })}
                >
                  <Text style={styles.detailButtonText}>상세보기</Text>
                </TouchableOpacity>
                {selectedTab !== 'my' && (
                  strategy.isFollowing ? (
                    <TouchableOpacity
                      style={[styles.followButton, styles.unfollowButton]}
                      onPress={() => unfollowStrategy(strategy.id)}
                    >
                      <Text style={styles.unfollowButtonText}>팔로우 취소</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.followButton}
                      onPress={() => followStrategy(strategy.id)}
                    >
                      <Text style={styles.followButtonText}>팔로우</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* 전략 생성 모달 */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>새 전략 만들기</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* 전략 이름 */}
              <Text style={styles.label}>전략 이름</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 장기 성장 투자 전략"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              {/* 설명 */}
              <Text style={styles.label}>설명</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="전략에 대해 설명해주세요..."
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={4}
              />

              {/* 전략 타입 */}
              <Text style={styles.label}>전략 타입</Text>
              <View style={styles.typeButtons}>
                {['growth', 'value', 'dividend', 'balanced'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeButton, formData.strategyType === type && styles.typeButtonActive]}
                    onPress={() => setFormData({ ...formData, strategyType: type })}
                  >
                    <Text style={[styles.typeButtonText, formData.strategyType === type && styles.typeButtonTextActive]}>
                      {getStrategyTypeText(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 위험도 */}
              <Text style={styles.label}>위험도</Text>
              <View style={styles.typeButtons}>
                {['low', 'medium', 'high'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.typeButton, formData.riskLevel === level && styles.typeButtonActive]}
                    onPress={() => setFormData({ ...formData, riskLevel: level })}
                  >
                    <Text style={[styles.typeButtonText, formData.riskLevel === level && styles.typeButtonTextActive]}>
                      {getRiskLevelText(level)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 목표 수익률 */}
              <Text style={styles.label}>목표 수익률 (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 20"
                value={formData.targetReturn}
                onChangeText={(text) => setFormData({ ...formData, targetReturn: text })}
                keyboardType="numeric"
              />

              {/* 공개 여부 */}
              <View style={styles.switchRow}>
                <Text style={styles.label}>전략 공개</Text>
                <TouchableOpacity
                  style={[styles.switch, formData.isPublic && styles.switchActive]}
                  onPress={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
                >
                  <View style={[styles.switchThumb, formData.isPublic && styles.switchThumbActive]} />
                </TouchableOpacity>
              </View>

              {/* 버튼 */}
              <TouchableOpacity style={styles.createButton} onPress={createStrategy}>
                <Text style={styles.createButtonText}>전략 생성</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: COLORS.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    fontSize: 28,
    color: COLORS.primary,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  strategyCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  strategyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  strategyHeaderLeft: {
    flex: 1,
  },
  strategyName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  strategyAuthor: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  strategyBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: COLORS.background,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  strategyDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  strategyStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  strategyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  detailButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  detailButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  followButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  unfollowButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unfollowButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalClose: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    padding: 2,
  },
  switchActive: {
    backgroundColor: COLORS.primary,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  switchThumbActive: {
    transform: [{ translateX: 22 }],
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
