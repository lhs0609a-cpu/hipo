import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/colors';
import api from '../api/client';

export default function VerificationRequestScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [formData, setFormData] = useState({
    verificationType: 'celebrity',
    realName: '',
    occupation: '',
    category: '',
    description: '',
    newsKeywords: '',
    followerCount: '',
    socialLinks: {
      instagram: '',
      youtube: '',
      twitter: '',
      tiktok: '',
      other: ''
    }
  });

  const verificationTypes = [
    { value: 'celebrity', label: '연예인', icon: '⭐' },
    { value: 'influencer', label: '인플루언서', icon: '📱' },
    { value: 'athlete', label: '운동선수', icon: '🏆' },
    { value: 'professional', label: '전문가', icon: '👔' },
    { value: 'business', label: '사업가', icon: '💼' },
    { value: 'other', label: '기타', icon: '🎯' },
  ];

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      setChecking(true);
      const response = await api.get('/verification/my-status');
      if (response.data.success) {
        setCurrentStatus(response.data.verification);

        // 이미 인증된 경우
        if (response.data.isVerified) {
          Alert.alert(
            '이미 인증됨',
            '귀하의 계정은 이미 인증되었습니다.',
            [{ text: '확인', onPress: () => navigation.goBack() }]
          );
        }
      }
    } catch (error) {
      console.error('인증 상태 확인 오류:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async () => {
    // 유효성 검사
    if (!formData.realName.trim()) {
      Alert.alert('오류', '실명을 입력해주세요');
      return;
    }
    if (!formData.occupation.trim()) {
      Alert.alert('오류', '직업/분야를 입력해주세요');
      return;
    }

    Alert.alert(
      '인증 요청 제출',
      '인증 요청을 제출하시겠습니까? 검토까지 3-5일 소요됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '제출',
          onPress: async () => {
            try {
              setLoading(true);

              const requestData = {
                ...formData,
                followerCount: parseInt(formData.followerCount) || 0,
                newsKeywords: formData.newsKeywords || `${formData.realName} ${formData.occupation}`,
                category: formData.category || formData.verificationType
              };

              const response = await api.post('/verification/request', requestData);

              if (response.data.success) {
                const { autoApproved, autoRejected, score, message } = response.data;

                if (autoApproved) {
                  Alert.alert(
                    '🎉 자동 인증 완료!',
                    `${message}\n\n프로필에 인증 배지(✓)가 표시됩니다.`,
                    [{ text: '확인', onPress: () => navigation.goBack() }]
                  );
                } else if (autoRejected) {
                  Alert.alert(
                    '인증 거부',
                    `${message}\n\n점수를 높이려면:\n• 소셜 미디어 팔로워 수 증가\n• 여러 플랫폼에 일관된 프로필 생성\n• 뉴스 기사 등 웹 활동 증가`,
                    [{ text: '확인', onPress: () => navigation.goBack() }]
                  );
                } else {
                  Alert.alert(
                    '관리자 검토 필요',
                    `${message}\n\n자동 검증 점수: ${score}/100\n(90점 이상: 자동 승인, 70점 미만: 자동 거부)`,
                    [{ text: '확인', onPress: () => navigation.goBack() }]
                  );
                }
              }
            } catch (error) {
              console.error('인증 요청 제출 오류:', error);
              Alert.alert('오류', error.response?.data?.error || '인증 요청 제출에 실패했습니다');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCancel = async () => {
    if (!currentStatus || currentStatus.status !== 'pending') return;

    Alert.alert(
      '인증 요청 취소',
      '정말 인증 요청을 취소하시겠습니까?',
      [
        { text: '아니오', style: 'cancel' },
        {
          text: '예',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await api.delete(`/verification/cancel/${currentStatus.id}`);

              if (response.data.success) {
                Alert.alert('취소 완료', '인증 요청이 취소되었습니다');
                setCurrentStatus(null);
              }
            } catch (error) {
              console.error('인증 요청 취소 오류:', error);
              Alert.alert('오류', '취소에 실패했습니다');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (checking) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // 대기 중인 요청이 있는 경우
  if (currentStatus && currentStatus.status === 'pending') {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.statusCard}>
          <Text style={styles.statusIcon}>⏳</Text>
          <Text style={styles.statusTitle}>인증 요청 대기 중</Text>
          <Text style={styles.statusDescription}>
            검토가 진행 중입니다. 3-5일 이내에 결과를 알려드립니다.
          </Text>

          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>제출 일시</Text>
            <Text style={styles.infoValue}>
              {new Date(currentStatus.submittedAt).toLocaleString('ko-KR')}
            </Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>인증 유형</Text>
            <Text style={styles.infoValue}>
              {verificationTypes.find(t => t.value === currentStatus.verificationType)?.label}
            </Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>실명</Text>
            <Text style={styles.infoValue}>{currentStatus.realName}</Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>직업/분야</Text>
            <Text style={styles.infoValue}>{currentStatus.occupation}</Text>
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>요청 취소</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // 거부된 요청이 있는 경우
  if (currentStatus && currentStatus.status === 'rejected') {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.statusCard}>
          <Text style={styles.statusIcon}>❌</Text>
          <Text style={styles.statusTitle}>인증 요청 거부됨</Text>
          <Text style={styles.statusDescription}>
            귀하의 인증 요청이 거부되었습니다.
          </Text>

          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionLabel}>거부 사유</Text>
            <Text style={styles.rejectionText}>{currentStatus.rejectionReason}</Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>검토 일시</Text>
            <Text style={styles.infoValue}>
              {new Date(currentStatus.reviewedAt).toLocaleString('ko-KR')}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              setCurrentStatus(null);
              setFormData({
                ...formData,
                realName: currentStatus.realName,
                occupation: currentStatus.occupation,
                category: currentStatus.category,
                description: currentStatus.description
              });
            }}
          >
            <Text style={styles.primaryButtonText}>다시 신청하기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // 인증 요청 폼
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>✓</Text>
        <Text style={styles.headerTitle}>본인 인증 요청</Text>
        <Text style={styles.headerDescription}>
          유명인, 인플루언서, 전문가라면 본인 인증을 통해 신뢰도를 높이고
          정확한 뉴스를 받아보세요.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>인증 유형 선택</Text>
        <View style={styles.typeGrid}>
          {verificationTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeCard,
                formData.verificationType === type.value && styles.typeCardActive
              ]}
              onPress={() => setFormData({ ...formData, verificationType: type.value })}
            >
              <Text style={styles.typeIcon}>{type.icon}</Text>
              <Text style={[
                styles.typeLabel,
                formData.verificationType === type.value && styles.typeLabelActive
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>기본 정보</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>실명 *</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 아이유, 손흥민"
            placeholderTextColor={COLORS.textSecondary}
            value={formData.realName}
            onChangeText={(text) => setFormData({ ...formData, realName: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>직업/분야 *</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 가수, 배우, 축구선수"
            placeholderTextColor={COLORS.textSecondary}
            value={formData.occupation}
            onChangeText={(text) => setFormData({ ...formData, occupation: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>카테고리 (선택)</Text>
          <TextInput
            style={styles.input}
            placeholder="예: K-POP, 영화, 프리미어리그"
            placeholderTextColor={COLORS.textSecondary}
            value={formData.category}
            onChangeText={(text) => setFormData({ ...formData, category: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>뉴스 검색 키워드 (선택)</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 아이유 가수, IU, 이지은"
            placeholderTextColor={COLORS.textSecondary}
            value={formData.newsKeywords}
            onChangeText={(text) => setFormData({ ...formData, newsKeywords: text })}
          />
          <Text style={styles.inputHint}>
            동명이인 구분을 위해 검색 키워드를 지정할 수 있습니다
          </Text>
        </View>

        <Text style={styles.sectionTitle}>활동 정보</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>공개 플랫폼 팔로워/구독자 수 (선택)</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 50000"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="numeric"
            value={formData.followerCount}
            onChangeText={(text) => setFormData({ ...formData, followerCount: text })}
          />
        </View>

        <Text style={styles.sectionTitle}>소셜 미디어 링크 (선택)</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Instagram</Text>
          <TextInput
            style={styles.input}
            placeholder="https://instagram.com/username"
            placeholderTextColor={COLORS.textSecondary}
            value={formData.socialLinks.instagram}
            onChangeText={(text) => setFormData({
              ...formData,
              socialLinks: { ...formData.socialLinks, instagram: text }
            })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>YouTube</Text>
          <TextInput
            style={styles.input}
            placeholder="https://youtube.com/@username"
            placeholderTextColor={COLORS.textSecondary}
            value={formData.socialLinks.youtube}
            onChangeText={(text) => setFormData({
              ...formData,
              socialLinks: { ...formData.socialLinks, youtube: text }
            })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Twitter/X</Text>
          <TextInput
            style={styles.input}
            placeholder="https://twitter.com/username"
            placeholderTextColor={COLORS.textSecondary}
            value={formData.socialLinks.twitter}
            onChangeText={(text) => setFormData({
              ...formData,
              socialLinks: { ...formData.socialLinks, twitter: text }
            })}
          />
        </View>

        <Text style={styles.sectionTitle}>추가 설명 (선택)</Text>

        <View style={styles.inputGroup}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="본인 인증이 필요한 이유나 추가 정보를 입력해주세요"
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
          />
        </View>

        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>📋 안내사항</Text>
          <Text style={styles.noticeText}>
            • 검토는 영업일 기준 3-5일 소요됩니다{'\n'}
            • 허위 정보 제공 시 영구 제재될 수 있습니다{'\n'}
            • 인증 승인 시 프로필에 인증 배지가 표시됩니다{'\n'}
            • 소셜 미디어 계정을 통해 본인 확인이 진행됩니다
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>인증 요청 제출</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  header: {
    backgroundColor: COLORS.surface,
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  typeCard: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  typeCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  typeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  typeLabelActive: {
    color: COLORS.primary,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
  },
  textArea: {
    height: 120,
    paddingTop: 14,
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  noticeBox: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  noticeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  statusCard: {
    backgroundColor: COLORS.surface,
    margin: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  statusDescription: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  infoSection: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  rejectionBox: {
    width: '100%',
    backgroundColor: COLORS.error + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  rejectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.error,
    marginBottom: 8,
  },
  rejectionText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  cancelButton: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.error + '15',
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  cancelButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 16,
    padding: 18,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
});
