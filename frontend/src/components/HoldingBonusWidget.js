import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { holdingBonusAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// 마일스톤 아이콘 매핑
const MILESTONE_ICONS = {
  7: 'calendar-outline',
  30: 'medal-outline',
  90: 'star-outline',
  180: 'trophy-outline',
  365: 'diamond-outline',
};

const MILESTONE_COLORS = {
  7: '#00B368',
  30: '#2B5FE3',
  90: '#8B5CF6',
  180: '#F59B00',
  365: '#EC5F9E',
};

const HoldingBonusWidget = ({ stockId, compact = false, onBonusClaimed }) => {
  const { isAuthenticated, updateUser, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [data, setData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [claimedBonus, setClaimedBonus] = useState(null);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      let response;
      if (stockId) {
        response = await holdingBonusAPI.getStockStatus(stockId);
      } else {
        response = await holdingBonusAPI.getMyStatus();
      }
      setData(response.data);
    } catch (error) {
      console.error('Holding bonus fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, stockId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClaim = async (targetStockId, milestoneDays) => {
    if (claiming) return;

    setClaiming(true);
    try {
      const response = await holdingBonusAPI.claimBonus(targetStockId, milestoneDays);
      if (response.data.success) {
        setClaimedBonus(response.data.bonus);
        setShowModal(true);

        // 데이터 새로고침
        await fetchData();

        // 부모에게 알림
        if (onBonusClaimed) {
          onBonusClaimed(response.data.bonus.bonusAmount);
        }

        // 유저 잔액 업데이트
        if (updateUser && user) {
          updateUser({ ...user, poBalance: response.data.newBalance });
        }
      }
    } catch (error) {
      console.error('Claim bonus error:', error);
    } finally {
      setClaiming(false);
    }
  };

  if (!isAuthenticated || loading) {
    return null;
  }

  if (!data) {
    return null;
  }

  // 단일 주식 뷰 (StockDetailScreen용)
  if (stockId && data.holding) {
    const { holding, milestones, nextMilestone, totalClaimed } = data;
    const claimableMilestones = milestones.filter(m => m.canClaim);

    return (
      <>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="diamond" size={20} color="#8B5CF6" />
              <Text style={styles.headerTitle}>장기 보유 보너스</Text>
            </View>
            {totalClaimed > 0 && (
              <Text style={styles.totalClaimed}>
                누적 {totalClaimed.toLocaleString()} PO
              </Text>
            )}
          </View>

          {/* 보유 현황 */}
          <View style={styles.holdingInfo}>
            <View style={styles.holdingStatItem}>
              <Text style={styles.holdingStatValue}>{holding.holdingDays}일</Text>
              <Text style={styles.holdingStatLabel}>보유 기간</Text>
            </View>
            <View style={styles.holdingStatDivider} />
            <View style={styles.holdingStatItem}>
              <Text style={styles.holdingStatValue}>{holding.shares}주</Text>
              <Text style={styles.holdingStatLabel}>보유 수량</Text>
            </View>
            <View style={styles.holdingStatDivider} />
            <View style={styles.holdingStatItem}>
              <Text style={styles.holdingStatValue}>
                {holding.currentValue.toLocaleString()}
              </Text>
              <Text style={styles.holdingStatLabel}>현재 가치 (PO)</Text>
            </View>
          </View>

          {/* 수령 가능한 보너스 */}
          {claimableMilestones.length > 0 && (
            <View style={styles.claimableSection}>
              <Text style={styles.claimableTitle}>
                수령 가능한 보너스 ({claimableMilestones.length}개)
              </Text>
              {claimableMilestones.map((milestone) => (
                <TouchableOpacity
                  key={milestone.days}
                  style={styles.claimableItem}
                  onPress={() => handleClaim(stockId, milestone.days)}
                  disabled={claiming}
                >
                  <LinearGradient
                    colors={[MILESTONE_COLORS[milestone.days], MILESTONE_COLORS[milestone.days] + '80']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.claimableGradient}
                  >
                    <View style={styles.claimableLeft}>
                      <Ionicons
                        name={MILESTONE_ICONS[milestone.days]}
                        size={24}
                        color="#fff"
                      />
                      <View style={styles.claimableInfo}>
                        <Text style={styles.claimableLabel}>{milestone.label}</Text>
                        <Text style={styles.claimableDesc}>{milestone.description}</Text>
                      </View>
                    </View>
                    <View style={styles.claimableRight}>
                      {claiming ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.claimableAmount}>
                            +{milestone.estimatedBonus.toLocaleString()} PO
                          </Text>
                          <Text style={styles.claimableRate}>
                            ({milestone.rate}%)
                          </Text>
                        </>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 다음 마일스톤 진행 상황 */}
          {nextMilestone && (
            <View style={styles.nextMilestoneSection}>
              <View style={styles.nextMilestoneHeader}>
                <Text style={styles.nextMilestoneTitle}>다음 마일스톤</Text>
                <Text style={styles.nextMilestoneDays}>
                  {nextMilestone.daysRemaining}일 남음
                </Text>
              </View>
              <View style={styles.nextMilestoneInfo}>
                <View style={[
                  styles.nextMilestoneIcon,
                  { backgroundColor: MILESTONE_COLORS[nextMilestone.days] + '20' }
                ]}>
                  <Ionicons
                    name={MILESTONE_ICONS[nextMilestone.days]}
                    size={24}
                    color={MILESTONE_COLORS[nextMilestone.days]}
                  />
                </View>
                <View style={styles.nextMilestoneDetails}>
                  <Text style={styles.nextMilestoneLabel}>{nextMilestone.label}</Text>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${nextMilestone.progress}%`,
                          backgroundColor: MILESTONE_COLORS[nextMilestone.days],
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {holding.holdingDays}/{nextMilestone.days}일 ({nextMilestone.progress}%)
                  </Text>
                </View>
                <Text style={[styles.nextMilestoneBonus, { color: MILESTONE_COLORS[nextMilestone.days] }]}>
                  +{nextMilestone.estimatedBonus?.toLocaleString() || '?'} PO
                </Text>
              </View>
            </View>
          )}

          {/* 전체 마일스톤 목록 */}
          <View style={styles.milestonesSection}>
            <Text style={styles.milestonesTitle}>보너스 현황</Text>
            <View style={styles.milestonesList}>
              {milestones.map((milestone) => (
                <View
                  key={milestone.days}
                  style={[
                    styles.milestoneItem,
                    milestone.status === 'locked' && styles.milestoneLocked,
                  ]}
                >
                  <View style={[
                    styles.milestoneIconCircle,
                    {
                      backgroundColor:
                        milestone.status === 'claimed' ? MILESTONE_COLORS[milestone.days] :
                        milestone.status === 'claimable' ? MILESTONE_COLORS[milestone.days] + '30' :
                        '#DFE3EB'
                    }
                  ]}>
                    {milestone.status === 'claimed' ? (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    ) : (
                      <Ionicons
                        name={MILESTONE_ICONS[milestone.days]}
                        size={16}
                        color={milestone.status === 'claimable' ? MILESTONE_COLORS[milestone.days] : '#999'}
                      />
                    )}
                  </View>
                  <Text style={[
                    styles.milestoneDays,
                    milestone.status === 'locked' && styles.milestoneTextLocked,
                  ]}>
                    {milestone.days}일
                  </Text>
                  <Text style={[
                    styles.milestoneRate,
                    milestone.status === 'locked' && styles.milestoneTextLocked,
                    { color: milestone.status !== 'locked' ? MILESTONE_COLORS[milestone.days] : '#999' }
                  ]}>
                    {milestone.rate}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 보너스 수령 완료 모달 */}
        <Modal
          visible={showModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={[
                styles.successIconCircle,
                { backgroundColor: claimedBonus ? MILESTONE_COLORS[claimedBonus.milestoneDays] + '20' : '#E7F8F0' }
              ]}>
                <Ionicons
                  name={claimedBonus ? MILESTONE_ICONS[claimedBonus.milestoneDays] : 'gift'}
                  size={48}
                  color={claimedBonus ? MILESTONE_COLORS[claimedBonus.milestoneDays] : '#00B368'}
                />
              </View>
              <Text style={styles.successTitle}>보너스 획득!</Text>
              <Text style={[
                styles.successAmount,
                { color: claimedBonus ? MILESTONE_COLORS[claimedBonus.milestoneDays] : '#00B368' }
              ]}>
                +{claimedBonus?.bonusAmount?.toLocaleString() || 0} PO
              </Text>
              <Text style={styles.successLabel}>
                {claimedBonus?.milestoneLabel || '장기 보유 보너스'}
              </Text>
              <Text style={styles.successDesc}>
                {claimedBonus?.bonusRate}% 보너스 (보유 가치 {claimedBonus?.holdingValue?.toLocaleString()} PO 기준)
              </Text>
              <TouchableOpacity
                style={[
                  styles.successButton,
                  { backgroundColor: claimedBonus ? MILESTONE_COLORS[claimedBonus.milestoneDays] : '#00B368' }
                ]}
                onPress={() => {
                  setShowModal(false);
                  setClaimedBonus(null);
                }}
              >
                <Text style={styles.successButtonText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // 전체 보유 주식 뷰 (PortfolioScreen용) - Compact 모드
  if (compact && data.holdings) {
    const totalClaimable = data.totalClaimable || 0;
    const hasClaimable = totalClaimable > 0;

    if (!hasClaimable) return null;

    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={() => setShowModal(true)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#8B5CF6', '#6D3FD4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.compactGradient}
        >
          <View style={styles.compactLeft}>
            <View style={styles.compactIconCircle}>
              <Ionicons name="diamond" size={24} color="#fff" />
            </View>
            <View style={styles.compactInfo}>
              <Text style={styles.compactTitle}>장기 보유 보너스</Text>
              <Text style={styles.compactSubtitle}>수령 가능한 보너스가 있어요</Text>
            </View>
          </View>
          <View style={styles.compactRight}>
            <Text style={styles.compactAmount}>+{totalClaimable.toLocaleString()}</Text>
            <Text style={styles.compactUnit}>PO</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  totalClaimed: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '600',
  },

  // Holding Info
  holdingInfo: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  holdingStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  holdingStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  holdingStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  holdingStatDivider: {
    width: 1,
    backgroundColor: '#DFE3EB',
    marginHorizontal: 12,
  },

  // Claimable Section
  claimableSection: {
    marginBottom: 16,
  },
  claimableTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  claimableItem: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  claimableGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  claimableLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  claimableInfo: {},
  claimableLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  claimableDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  claimableRight: {
    alignItems: 'flex-end',
  },
  claimableAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  claimableRate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Next Milestone Section
  nextMilestoneSection: {
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  nextMilestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nextMilestoneTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  nextMilestoneDays: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  nextMilestoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextMilestoneIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nextMilestoneDetails: {
    flex: 1,
  },
  nextMilestoneLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#DFE3EB',
    borderRadius: 3,
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#999',
  },
  nextMilestoneBonus: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },

  // Milestones Section
  milestonesSection: {
    marginTop: 8,
  },
  milestonesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  milestonesList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  milestoneItem: {
    alignItems: 'center',
    flex: 1,
  },
  milestoneLocked: {
    opacity: 0.5,
  },
  milestoneIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  milestoneDays: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  milestoneRate: {
    fontSize: 12,
    fontWeight: '700',
  },
  milestoneTextLocked: {
    color: '#999',
  },

  // Compact Mode
  compactContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  compactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactInfo: {},
  compactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  compactSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  compactAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  compactUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  successAmount: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 8,
  },
  successLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  successDesc: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  successButton: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default HoldingBonusWidget;
