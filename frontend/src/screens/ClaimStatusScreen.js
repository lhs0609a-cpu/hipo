import React, { useState, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { virtualCelebrityAPI } from '../services/api';
import { COLORS } from '../constants/colors';

const STATUS_CONFIG = {
  pending: {
    label: '\uB300\uAE30\uC911',
    color: COLORS.warning,
    backgroundColor: COLORS.warningBackground,
    icon: '\u23F3',
  },
  under_review: {
    label: '\uC2EC\uC0AC\uC911',
    color: COLORS.info,
    backgroundColor: COLORS.primaryBackground,
    icon: '\uD83D\uDD0D',
  },
  approved: {
    label: '\uC2B9\uC778\uB428',
    color: COLORS.success,
    backgroundColor: COLORS.successBackground,
    icon: '\u2705',
  },
  rejected: {
    label: '\uAC70\uBD80\uB428',
    color: COLORS.danger,
    backgroundColor: COLORS.errorBackground,
    icon: '\u274C',
  },
  cancelled: {
    label: '\uCDE8\uC18C\uB428',
    color: COLORS.gray500,
    backgroundColor: COLORS.gray100,
    icon: '\u26D4',
  },
};

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ClaimStatusScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClaims = useCallback(async () => {
    try {
      const res = await virtualCelebrityAPI.getMyClaims();
      const data = res.data?.claims || res.data || [];
      setClaims(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('\uC778\uC218 \uC2E0\uCCAD \uB0B4\uC5ED \uC870\uD68C \uC2E4\uD328:', error);
      setClaims([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await fetchClaims();
    setLoading(false);
  }, [fetchClaims]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchClaims();
    setRefreshing(false);
  }, [fetchClaims]);

  const getTimelineSteps = (claim) => {
    const status = claim.status || 'pending';
    const steps = [
      {
        key: 'submitted',
        label: '\uC2E0\uCCAD\uC77C',
        date: claim.createdAt || claim.submittedAt,
        completed: true,
      },
      {
        key: 'review',
        label: '\uC2EC\uC0AC \uC2DC\uC791',
        date: claim.reviewStartedAt || (status !== 'pending' ? claim.updatedAt : null),
        completed: status === 'under_review' || status === 'approved' || status === 'rejected',
      },
      {
        key: 'result',
        label: '\uACB0\uACFC',
        date: status === 'approved' || status === 'rejected' || status === 'cancelled'
          ? (claim.resolvedAt || claim.updatedAt)
          : null,
        completed: status === 'approved' || status === 'rejected' || status === 'cancelled',
      },
    ];
    return steps;
  };

  const renderStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.backgroundColor }]}>
        <Text style={[styles.statusBadgeText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  const renderTimeline = (claim) => {
    const steps = getTimelineSteps(claim);

    return (
      <View style={styles.timeline}>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const isActive = step.completed;

          return (
            <View key={step.key} style={styles.timelineStep}>
              {/* Connector line and dot */}
              <View style={styles.timelineIndicator}>
                <View
                  style={[
                    styles.timelineDot,
                    {
                      backgroundColor: isActive ? theme.colors.primary : theme.colors.gray300,
                      borderColor: isActive ? theme.colors.primaryLight : theme.colors.gray300,
                    },
                  ]}
                />
                {!isLast && (
                  <View
                    style={[
                      styles.timelineLine,
                      {
                        backgroundColor: steps[index + 1]?.completed
                          ? theme.colors.primary
                          : theme.colors.gray200,
                      },
                    ]}
                  />
                )}
              </View>

              {/* Step content */}
              <View style={styles.timelineContent}>
                <Text
                  style={[
                    styles.timelineLabel,
                    {
                      color: isActive
                        ? theme.colors.textPrimary
                        : theme.colors.textDisabled || theme.colors.gray400,
                      fontWeight: isActive ? '600' : '400',
                    },
                  ]}
                >
                  {step.label}
                </Text>
                {step.date ? (
                  <Text
                    style={[
                      styles.timelineDate,
                      { color: theme.colors.textTertiary || theme.colors.gray500 },
                    ]}
                  >
                    {formatDateTime(step.date)}
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.timelineDate,
                      { color: theme.colors.textDisabled || theme.colors.gray400 },
                    ]}
                  >
                    -
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderClaimCard = (claim) => {
    const status = claim.status || 'pending';
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const celebName =
      claim.virtualUser?.displayName ||
      claim.virtualUser?.name ||
      claim.virtualCelebrity?.name ||
      claim.celebName ||
      '\uAC00\uC0C1 \uC140\uB7FD';
    const celebInitial = celebName.charAt(0).toUpperCase();

    return (
      <View
        key={claim.id || claim._id}
        style={[
          styles.claimCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {/* Card header: celeb info + status */}
        <View style={styles.cardHeader}>
          <View style={styles.celebInfo}>
            <View style={[styles.profilePlaceholder, { backgroundColor: theme.colors.primaryBackground }]}>
              <Text style={[styles.profileInitial, { color: theme.colors.primary }]}>
                {celebInitial}
              </Text>
            </View>
            <View style={styles.celebTextContainer}>
              <Text
                style={[styles.celebName, { color: theme.colors.textPrimary }]}
                numberOfLines={1}
              >
                {celebName}
              </Text>
              <Text style={[styles.claimId, { color: theme.colors.textTertiary || theme.colors.gray500 }]}>
                {claim.id ? `#${String(claim.id).slice(-8).toUpperCase()}` : ''}
              </Text>
            </View>
          </View>
          {renderStatusBadge(status)}
        </View>

        {/* Timeline */}
        <View style={[styles.timelineContainer, { borderTopColor: theme.colors.border }]}>
          <Text style={[styles.timelineSectionTitle, { color: theme.colors.textSecondary }]}>
            {'\uC9C4\uD589 \uC0C1\uD669'}
          </Text>
          {renderTimeline(claim)}
        </View>

        {/* Rejection reason */}
        {status === 'rejected' && claim.rejectionReason && (
          <View style={[styles.reasonContainer, { backgroundColor: theme.colors.errorBackground }]}>
            <Text style={[styles.reasonLabel, { color: theme.colors.danger }]}>
              {'\uAC70\uBD80 \uC0AC\uC720'}
            </Text>
            <Text style={[styles.reasonText, { color: theme.colors.danger }]}>
              {claim.rejectionReason || claim.reason}
            </Text>
          </View>
        )}

        {/* Verification code for approved */}
        {status === 'approved' && (claim.verificationCode || claim.code) && (
          <View style={[styles.verificationContainer, { backgroundColor: theme.colors.successBackground }]}>
            <Text style={[styles.verificationLabel, { color: theme.colors.success }]}>
              {'\uC778\uC99D \uCF54\uB4DC'}
            </Text>
            <Text style={[styles.verificationCode, { color: theme.colors.success }]}>
              {claim.verificationCode || claim.code}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.gray100 }]}>
        <Text style={styles.emptyIcon}>{'\uD83D\uDCCB'}</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
        {'\uC2E0\uCCAD \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4'}
      </Text>
      <Text style={[styles.emptyDescription, { color: theme.colors.textTertiary || theme.colors.gray500 }]}>
        {'\uAC00\uC0C1 \uC140\uB7FD \uC778\uC218 \uC2E0\uCCAD\uC744 \uD558\uBA74\n\uC5EC\uAE30\uC11C \uC9C4\uD589 \uC0C1\uD669\uC744 \uD655\uC778\uD560 \uC218 \uC788\uC5B4\uC694'}
      </Text>
      <TouchableOpacity
        style={[styles.browseButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('VirtualCelebrity')}
      >
        <Text style={styles.browseButtonText}>{'\uC140\uB7FD \uB458\uB7EC\uBCF4\uAE30'}</Text>
      </TouchableOpacity>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View
          style={[
            styles.header,
            { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
          ]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.colors.textPrimary }]}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            {'\uC778\uC218 \uC2E0\uCCAD \uD604\uD669'}
          </Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textTertiary || theme.colors.gray500 }]}>
            {'\uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uB294 \uC911...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.colors.textPrimary }]}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          {'\uC778\uC218 \uC2E0\uCCAD \uD604\uD669'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Summary banner */}
        {claims.length > 0 && (
          <View style={[styles.summaryBanner, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.summaryTitle}>{'\uC804\uCCB4 \uC2E0\uCCAD'}</Text>
            <Text style={styles.summaryCount}>{claims.length}{'\uAC74'}</Text>
            <View style={styles.summaryStats}>
              {Object.entries(
                claims.reduce((acc, c) => {
                  const s = c.status || 'pending';
                  acc[s] = (acc[s] || 0) + 1;
                  return acc;
                }, {})
              ).map(([status, count]) => {
                const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
                return (
                  <View key={status} style={styles.summaryStatItem}>
                    <View
                      style={[
                        styles.summaryStatDot,
                        { backgroundColor: 'rgba(255,255,255,0.9)' },
                      ]}
                    />
                    <Text style={styles.summaryStatText}>
                      {config.label} {count}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Claims list or empty state */}
        {claims.length === 0 ? (
          renderEmptyState()
        ) : (
          claims.map((claim) => renderClaimCard(claim))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  backText: {
    fontSize: 24,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  content: {
    padding: 16,
  },

  // Summary banner
  summaryBanner: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCount: {
    color: t.colors.surface,
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
  },
  summaryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 12,
  },
  summaryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryStatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  summaryStatText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
  },

  // Claim card
  claimCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  celebInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  profilePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 20,
    fontWeight: '700',
  },
  celebTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  celebName: {
    fontSize: 16,
    fontWeight: '700',
  },
  claimId: {
    fontSize: 12,
    marginTop: 2,
  },

  // Status badge
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Timeline section
  timelineContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  timelineSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  timeline: {
    paddingLeft: 4,
  },
  timelineStep: {
    flexDirection: 'row',
    minHeight: 48,
  },
  timelineIndicator: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginTop: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 12,
  },
  timelineLabel: {
    fontSize: 14,
  },
  timelineDate: {
    fontSize: 12,
    marginTop: 2,
  },

  // Rejection reason
  reasonContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },

  // Verification code
  verificationContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  verificationLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  verificationCode: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 3,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  browseButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  browseButtonText: {
    color: t.colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});
