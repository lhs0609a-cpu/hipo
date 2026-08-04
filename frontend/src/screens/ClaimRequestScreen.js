import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { virtualCelebrityAPI } from '../services/api';
import { COLORS } from '../constants/colors';

const STEPS = [
  { key: 'realName', label: '실명 입력' },
  { key: 'method', label: '인증 방법' },
  { key: 'documents', label: '서류 제출' },
  { key: 'confirm', label: '확인 및 제출' },
];

const VERIFICATION_METHODS = [
  {
    key: 'social_post',
    label: 'SNS 인증 게시물',
    description: '본인 SNS 계정에 인증 코드를 포함한 게시물을 업로드합니다.',
    icon: 'logo-instagram',
  },
  {
    key: 'id_document',
    label: '신분증 제출',
    description: '정부 발행 신분증 사본을 제출하여 본인임을 증명합니다.',
    icon: 'card-outline',
  },
  {
    key: 'agency_letter',
    label: '소속사 확인서',
    description: '소속사 또는 매니지먼트에서 발행한 확인서를 제출합니다.',
    icon: 'business-outline',
  },
  {
    key: 'video_call',
    label: '화상 통화 인증',
    description: '관리자와의 화상 통화를 통해 본인 인증을 진행합니다.',
    icon: 'videocam-outline',
  },
  {
    key: 'other',
    label: '기타 방법',
    description: '위 방법 외 다른 인증 수단이 있는 경우 직접 기재합니다.',
    icon: 'ellipsis-horizontal-circle-outline',
  },
];

function showAlert(title, message) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function ClaimRequestScreen({ route, navigation }) {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const { virtualUserId, virtualUserName } = route.params;

  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resultData, setResultData] = useState(null);

  // Step 1: 실명
  const [claimantRealName, setClaimantRealName] = useState('');

  // Step 2: 인증 방법
  const [verificationMethod, setVerificationMethod] = useState('');

  // Step 3: 서류/링크
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    youtube: '',
    twitter: '',
    website: '',
  });
  const [proofDocumentUrl, setProofDocumentUrl] = useState('');
  const [verificationNote, setVerificationNote] = useState('');

  // === Navigation ===
  const canGoNext = () => {
    switch (currentStep) {
      case 0:
        return claimantRealName.trim().length >= 2;
      case 1:
        return verificationMethod !== '';
      case 2:
        return true; // 서류/링크는 선택사항이 있을 수 있음
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canGoNext()) return;
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  // === Submit ===
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const filteredSocialLinks = {};
      Object.entries(socialLinks).forEach(([key, value]) => {
        if (value.trim()) {
          filteredSocialLinks[key] = value.trim();
        }
      });

      const proofDocuments = [];
      if (proofDocumentUrl.trim()) {
        proofDocuments.push({ type: 'url', url: proofDocumentUrl.trim() });
      }

      const payload = {
        claimantRealName: claimantRealName.trim(),
        verificationMethod,
        socialLinks: Object.keys(filteredSocialLinks).length > 0 ? filteredSocialLinks : undefined,
        proofDocuments: proofDocuments.length > 0 ? proofDocuments : undefined,
        verificationNote: verificationNote.trim() || undefined,
      };

      const response = await virtualCelebrityAPI.submitClaim(virtualUserId, payload);

      if (response.data.success) {
        setResultData(response.data.data);
        setSubmitted(true);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || '인수 신청 중 오류가 발생했습니다.';
      showAlert('오류', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // === Step Indicator ===
  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {STEPS.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;

        return (
          <View key={step.key} style={styles.stepItemWrapper}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  isActive && styles.stepCircleActive,
                  isCompleted && styles.stepCircleCompleted,
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      isActive && styles.stepNumberActive,
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isActive && styles.stepLabelActive,
                  isCompleted && styles.stepLabelCompleted,
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
            {index < STEPS.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  isCompleted && styles.stepLineCompleted,
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );

  // === Step 1: 실명 입력 ===
  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>실명을 입력해주세요</Text>
      <Text style={styles.stepDescription}>
        {virtualUserName} 계정의 실제 소유자임을 확인하기 위해 실명이 필요합니다.
        입력하신 실명은 관리자 심사에만 사용되며, 외부에 공개되지 않습니다.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>실명 (본명)</Text>
        <TextInput
          style={styles.textInput}
          value={claimantRealName}
          onChangeText={setClaimantRealName}
          placeholder="본인의 실명을 입력해주세요"
          placeholderTextColor={theme.colors.textTertiary}
          autoFocus
          maxLength={30}
        />
        <Text style={styles.inputHint}>
          * 신분증에 기재된 이름과 동일해야 합니다
        </Text>
      </View>
    </View>
  );

  // === Step 2: 인증 방법 선택 ===
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>인증 방법을 선택해주세요</Text>
      <Text style={styles.stepDescription}>
        본인임을 증명할 수 있는 가장 적합한 인증 방법을 선택해주세요.
        인증 방법에 따라 심사 기간이 달라질 수 있습니다.
      </Text>

      <View style={styles.methodList}>
        {VERIFICATION_METHODS.map((method) => {
          const isSelected = verificationMethod === method.key;
          return (
            <TouchableOpacity
              key={method.key}
              style={[
                styles.methodCard,
                isSelected && styles.methodCardSelected,
              ]}
              onPress={() => setVerificationMethod(method.key)}
              activeOpacity={0.7}
            >
              <View style={styles.methodCardHeader}>
                <View
                  style={[
                    styles.methodIconCircle,
                    isSelected && styles.methodIconCircleSelected,
                  ]}
                >
                  <Ionicons
                    name={method.icon}
                    size={22}
                    color={isSelected ? '#FFFFFF' : theme.colors.primary}
                  />
                </View>
                <View style={styles.methodCardTextArea}>
                  <Text
                    style={[
                      styles.methodLabel,
                      isSelected && styles.methodLabelSelected,
                    ]}
                  >
                    {method.label}
                  </Text>
                  <Text style={styles.methodDescription}>
                    {method.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioOuter,
                    isSelected && styles.radioOuterSelected,
                  ]}
                >
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // === Step 3: 서류/링크 제출 ===
  const renderStep2 = () => {
    const selectedMethod = VERIFICATION_METHODS.find(
      (m) => m.key === verificationMethod
    );

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>증빙 자료를 제출해주세요</Text>
        <Text style={styles.stepDescription}>
          선택하신 인증 방법({selectedMethod?.label})에 맞는 증빙 자료를 제출해주세요.
          심사를 위한 추가 정보를 입력할 수 있습니다.
        </Text>

        {/* SNS 링크 */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>SNS 계정 링크</Text>
          <Text style={styles.sectionHint}>
            본인 소유의 SNS 계정 링크를 입력해주세요
          </Text>

          <View style={styles.inputGroup}>
            <View style={styles.socialInputRow}>
              <View style={styles.socialIconBox}>
                <Ionicons name="logo-instagram" size={18} color="#E4405F" />
              </View>
              <TextInput
                style={styles.socialInput}
                value={socialLinks.instagram}
                onChangeText={(text) =>
                  setSocialLinks({ ...socialLinks, instagram: text })
                }
                placeholder="Instagram 프로필 URL"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.socialInputRow}>
              <View style={styles.socialIconBox}>
                <Ionicons name="logo-youtube" size={18} color="#F0344B" />
              </View>
              <TextInput
                style={styles.socialInput}
                value={socialLinks.youtube}
                onChangeText={(text) =>
                  setSocialLinks({ ...socialLinks, youtube: text })
                }
                placeholder="YouTube 채널 URL"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.socialInputRow}>
              <View style={styles.socialIconBox}>
                <Ionicons name="logo-twitter" size={18} color="#1DA1F2" />
              </View>
              <TextInput
                style={styles.socialInput}
                value={socialLinks.twitter}
                onChangeText={(text) =>
                  setSocialLinks({ ...socialLinks, twitter: text })
                }
                placeholder="X (Twitter) 프로필 URL"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.socialInputRow}>
              <View style={styles.socialIconBox}>
                <Ionicons name="globe-outline" size={18} color={theme.colors.primary} />
              </View>
              <TextInput
                style={styles.socialInput}
                value={socialLinks.website}
                onChangeText={(text) =>
                  setSocialLinks({ ...socialLinks, website: text })
                }
                placeholder="공식 웹사이트 URL"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </View>
        </View>

        {/* 증빙 서류 링크 */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>증빙 서류 링크</Text>
          <Text style={styles.sectionHint}>
            신분증 사본, 소속사 확인서 등 서류 이미지 또는 파일 링크를 입력해주세요
          </Text>
          <TextInput
            style={styles.textInput}
            value={proofDocumentUrl}
            onChangeText={setProofDocumentUrl}
            placeholder="서류 파일 URL (Google Drive, Dropbox 등)"
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        {/* 추가 메모 */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>추가 참고사항</Text>
          <Text style={styles.sectionHint}>
            심사에 도움이 될 추가 정보가 있으면 자유롭게 작성해주세요
          </Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={verificationNote}
            onChangeText={setVerificationNote}
            placeholder="추가 설명을 입력해주세요 (선택)"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>
            {verificationNote.length}/500
          </Text>
        </View>
      </View>
    );
  };

  // === Step 4: 확인 및 제출 ===
  const renderStep3 = () => {
    const selectedMethod = VERIFICATION_METHODS.find(
      (m) => m.key === verificationMethod
    );

    const filledSocialLinks = Object.entries(socialLinks).filter(
      ([, value]) => value.trim()
    );

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>신청 내용을 확인해주세요</Text>
        <Text style={styles.stepDescription}>
          아래 내용으로 인수 신청을 제출합니다. 제출 후에는 수정이 불가능하므로
          정보를 다시 한번 확인해주세요.
        </Text>

        {/* 대상 크리에이터 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="person-circle-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.summaryHeaderText}>인수 대상</Text>
          </View>
          <Text style={styles.summaryValue}>{virtualUserName}</Text>
        </View>

        {/* 실명 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="id-card-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.summaryHeaderText}>실명</Text>
          </View>
          <Text style={styles.summaryValue}>{claimantRealName}</Text>
        </View>

        {/* 인증 방법 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.summaryHeaderText}>인증 방법</Text>
          </View>
          <Text style={styles.summaryValue}>{selectedMethod?.label}</Text>
        </View>

        {/* SNS 링크 */}
        {filledSocialLinks.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="link-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.summaryHeaderText}>SNS 링크</Text>
            </View>
            {filledSocialLinks.map(([key, value]) => (
              <View key={key} style={styles.summaryLinkRow}>
                <Text style={styles.summaryLinkLabel}>{key}</Text>
                <Text style={styles.summaryLinkValue} numberOfLines={1}>
                  {value}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 증빙 서류 */}
        {proofDocumentUrl.trim() !== '' && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.summaryHeaderText}>증빙 서류</Text>
            </View>
            <Text style={styles.summaryValue} numberOfLines={2}>
              {proofDocumentUrl}
            </Text>
          </View>
        )}

        {/* 추가 메모 */}
        {verificationNote.trim() !== '' && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.summaryHeaderText}>추가 참고사항</Text>
            </View>
            <Text style={styles.summaryValue}>{verificationNote}</Text>
          </View>
        )}

        {/* 유의사항 */}
        <View style={styles.noticeCard}>
          <View style={styles.noticeHeader}>
            <Ionicons name="information-circle" size={20} color={theme.colors.warning} />
            <Text style={styles.noticeTitle}>유의사항</Text>
          </View>
          <Text style={styles.noticeText}>
            {'\u2022'} 인수 신청은 총 3건까지 가능합니다
          </Text>
          <Text style={styles.noticeText}>
            {'\u2022'} 24시간 이내에는 1건만 신청할 수 있습니다
          </Text>
          <Text style={styles.noticeText}>
            {'\u2022'} 거부 시 7일간 재신청이 불가능합니다
          </Text>
          <Text style={styles.noticeText}>
            {'\u2022'} 허위 정보 제출 시 계정이 제한될 수 있습니다
          </Text>
          <Text style={styles.noticeText}>
            {'\u2022'} 심사는 영업일 기준 1~3일 소요됩니다
          </Text>
        </View>
      </View>
    );
  };

  // === Success Screen ===
  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIconWrapper}>
        <Ionicons name="checkmark-circle" size={72} color={theme.colors.success} />
      </View>
      <Text style={styles.successTitle}>인수 신청 완료</Text>
      <Text style={styles.successMessage}>
        {virtualUserName} 계정 인수 신청이 접수되었습니다.{'\n'}
        관리자 심사 후 결과를 알려드리겠습니다.
      </Text>

      {resultData?.verificationCode && (
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>인증 코드</Text>
          <Text style={styles.codeValue}>{resultData.verificationCode}</Text>
          <Text style={styles.codeHint}>
            SNS 인증 게시물에 이 코드를 포함해주세요.{'\n'}
            유효기간: 48시간
          </Text>
        </View>
      )}

      <View style={styles.successActions}>
        <TouchableOpacity
          style={styles.successButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.successButtonText}>돌아가기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.successButtonOutline}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.successButtonOutlineText}>홈으로</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // === Main Render ===
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderStep0();
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.successScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderSuccess()}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>계정 인수 신청</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Target Info Banner */}
        <View style={styles.targetBanner}>
          <Ionicons name="person-circle" size={24} color={theme.colors.primary} />
          <Text style={styles.targetBannerText}>
            <Text style={styles.targetBannerName}>{virtualUserName}</Text> 계정 인수
          </Text>
        </View>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderCurrentStep()}
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomBar}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
            >
              <Ionicons name="chevron-back" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.backButtonText}>이전</Text>
            </TouchableOpacity>
          )}

          {currentStep < STEPS.length - 1 ? (
            <TouchableOpacity
              style={[
                styles.nextButton,
                !canGoNext() && styles.nextButtonDisabled,
                currentStep === 0 && styles.nextButtonFull,
              ]}
              onPress={handleNext}
              disabled={!canGoNext()}
            >
              <Text style={styles.nextButtonText}>다음</Text>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.submitButton,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>신청 제출</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  flex: {
    flex: 1,
  },

  // Header
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
  headerBackButton: {
    padding: 4,
    width: 40,
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

  // Target Banner
  targetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: t.colors.primaryBackground,
    gap: 10,
  },
  targetBannerText: {
    fontSize: 15,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  targetBannerName: {
    fontWeight: '700',
    color: t.colors.primary,
  },

  // Step Indicator
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  stepItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: t.colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: t.colors.gray200,
  },
  stepCircleActive: {
    backgroundColor: t.colors.primaryBackground,
    borderColor: t.colors.primary,
  },
  stepCircleCompleted: {
    backgroundColor: t.colors.primary,
    borderColor: t.colors.primary,
  },
  stepNumber: {
    fontSize: 12,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textTertiary,
  },
  stepNumberActive: {
    color: t.colors.primary,
  },
  stepLabel: {
    fontSize: 11,
    fontFamily: t.fonts.medium,
    fontWeight: '500',
    color: t.colors.textTertiary,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: t.colors.primary,
    fontWeight: '700',
  },
  stepLabelCompleted: {
    color: t.colors.textSecondary,
    fontWeight: '600',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: t.colors.gray200,
    marginHorizontal: 4,
    marginBottom: 20,
  },
  stepLineCompleted: {
    backgroundColor: t.colors.primary,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },

  // Step Content
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontFamily: t.fonts.extrabold,
    fontWeight: '800',
    color: t.colors.text,
    marginBottom: 10,
  },
  stepDescription: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 28,
  },

  // Input
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.text,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  inputHint: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    textAlign: 'right',
    marginTop: 4,
  },

  // Method Selection
  methodList: {
    gap: 12,
  },
  methodCard: {
    backgroundColor: t.colors.surface,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    borderRadius: 14,
    padding: 16,
  },
  methodCardSelected: {
    borderColor: t.colors.primary,
    backgroundColor: t.colors.primaryBackground,
  },
  methodCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  methodIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodIconCircleSelected: {
    backgroundColor: t.colors.primary,
  },
  methodCardTextArea: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 15,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.text,
    marginBottom: 3,
  },
  methodLabelSelected: {
    color: t.colors.primary,
  },
  methodDescription: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    lineHeight: 18,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: t.colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: t.colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: t.colors.primary,
  },

  // Section Block
  sectionBlock: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 15,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.text,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginBottom: 12,
    lineHeight: 18,
  },

  // Social Input
  socialInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  socialIconBox: {
    width: 44,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.colors.gray50,
    borderRightWidth: 1,
    borderRightColor: t.colors.border,
  },
  socialInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.text,
  },

  // Summary
  summaryCard: {
    backgroundColor: t.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  summaryHeaderText: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textSecondary,
  },
  summaryValue: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.text,
    lineHeight: 22,
  },
  summaryLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  summaryLinkLabel: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textTertiary,
    width: 70,
    textTransform: 'capitalize',
  },
  summaryLinkValue: {
    flex: 1,
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.primary,
  },

  // Notice
  noticeCard: {
    backgroundColor: t.colors.warningBackground,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  noticeTitle: {
    fontSize: 14,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.warning,
  },
  noticeText: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.gray700,
    lineHeight: 20,
    marginBottom: 2,
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: t.colors.gray100,
    gap: 4,
  },
  backButtonText: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textSecondary,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: t.colors.primary,
    gap: 4,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonDisabled: {
    backgroundColor: t.colors.gray300,
  },
  nextButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.surface,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: t.colors.primary,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.surface,
  },

  // Success Screen
  successScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  successContainer: {
    alignItems: 'center',
  },
  successIconWrapper: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: t.fonts.extrabold,
    fontWeight: '800',
    color: t.colors.text,
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 15,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  codeCard: {
    width: '100%',
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  codeLabel: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textSecondary,
    marginBottom: 12,
  },
  codeValue: {
    fontSize: 28,
    fontFamily: t.fonts.extrabold,
    fontWeight: '800',
    color: t.colors.primary,
    letterSpacing: 4,
    marginBottom: 12,
  },
  codeHint: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  successActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  successButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
  },
  successButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.surface,
  },
  successButtonOutline: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: t.colors.gray100,
    alignItems: 'center',
  },
  successButtonOutlineText: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textSecondary,
  },
});
