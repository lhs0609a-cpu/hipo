import React, { useState } from 'react';
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { virtualCelebrityAPI } from '../services/api';

const STEPS = [
  { key: 'identity', title: '신분 확인', icon: 'person-outline' },
  { key: 'social', title: 'SNS 인증', icon: 'logo-instagram' },
  { key: 'documents', title: '추가 서류', icon: 'document-text-outline' },
  { key: 'submit', title: '제출', icon: 'checkmark-circle-outline' },
];

export default function VirtualClaimScreen({ route, navigation }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { virtualUserId, virtualUserName } = route.params;
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [realName, setRealName] = useState('');
  const [identityDocumentType, setIdentityDocumentType] = useState('');
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    youtube: '',
    twitter: '',
  });
  const [socialVerificationMethod, setSocialVerificationMethod] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const showAlert = (title, message) => {
    Platform.OS === 'web' ? alert(`${title}\n${message}`) : Alert.alert(title, message);
  };

  const validateStep = () => {
    switch (currentStep) {
      case 0:
        if (!realName.trim()) {
          showAlert('입력 필요', '실명을 입력해주세요');
          return false;
        }
        if (!identityDocumentType) {
          showAlert('입력 필요', '신분증 종류를 선택해주세요');
          return false;
        }
        return true;
      case 1:
        const hasAnySocial = Object.values(socialLinks).some(v => v.trim());
        if (!hasAnySocial) {
          showAlert('입력 필요', 'SNS 계정을 최소 1개 이상 입력해주세요');
          return false;
        }
        return true;
      case 2:
        return true; // 추가 서류는 선택 사항
      case 3:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setSubmitting(true);
    try {
      await virtualCelebrityAPI.submitClaim(virtualUserId, {
        verificationType: 'identity',
        realName,
        identityDocumentType,
        socialLinks,
        socialVerificationMethod,
        proofDocuments: [],
      });

      showAlert('신청 완료', '인수 신청이 접수되었습니다. 관리자 심사 후 결과를 알려드립니다.');
      navigation.goBack();
    } catch (error) {
      const errorMsg = error.response?.data?.error || '인수 신청 중 오류가 발생했습니다';
      showAlert('오류', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEPS.map((step, index) => (
        <View key={step.key} style={styles.stepItem}>
          <View style={[
            styles.stepCircle,
            index <= currentStep && styles.stepCircleActive,
            index < currentStep && styles.stepCircleDone,
          ]}>
            {index < currentStep ? (
              <Ionicons name="checkmark" size={16} color="#fff" />
            ) : (
              <Ionicons name={step.icon} size={16} color={index <= currentStep ? '#fff' : '#7C8698'} />
            )}
          </View>
          <Text style={[styles.stepLabel, index <= currentStep && styles.stepLabelActive]}>
            {step.title}
          </Text>
          {index < STEPS.length - 1 && (
            <View style={[styles.stepLine, index < currentStep && styles.stepLineActive]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderIdentityStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>신분 확인</Text>
      <Text style={styles.stepDescription}>
        본인임을 확인하기 위해 실명과 신분증 정보를 입력해주세요.
      </Text>

      <Text style={styles.inputLabel}>실명</Text>
      <TextInput
        style={styles.input}
        value={realName}
        onChangeText={setRealName}
        placeholder="실명을 입력하세요"
        placeholderTextColor="#7C8698"
      />

      <Text style={styles.inputLabel}>신분증 종류</Text>
      <View style={styles.optionGroup}>
        {[
          { key: 'resident_id', label: '주민등록증' },
          { key: 'drivers_license', label: '운전면허증' },
          { key: 'passport', label: '여권' },
        ].map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.optionButton, identityDocumentType === opt.key && styles.optionButtonActive]}
            onPress={() => setIdentityDocumentType(opt.key)}
          >
            <Text style={[styles.optionText, identityDocumentType === opt.key && styles.optionTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSocialStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>SNS 인증</Text>
      <Text style={styles.stepDescription}>
        본인의 공식 SNS 계정을 연결하여 인증해주세요. 최소 1개 이상의 SNS 링크가 필요합니다.
      </Text>

      <Text style={styles.inputLabel}>Instagram</Text>
      <TextInput
        style={styles.input}
        value={socialLinks.instagram}
        onChangeText={(v) => setSocialLinks(prev => ({ ...prev, instagram: v }))}
        placeholder="https://instagram.com/..."
        placeholderTextColor="#7C8698"
        autoCapitalize="none"
      />

      <Text style={styles.inputLabel}>YouTube</Text>
      <TextInput
        style={styles.input}
        value={socialLinks.youtube}
        onChangeText={(v) => setSocialLinks(prev => ({ ...prev, youtube: v }))}
        placeholder="https://youtube.com/@..."
        placeholderTextColor="#7C8698"
        autoCapitalize="none"
      />

      <Text style={styles.inputLabel}>Twitter / X</Text>
      <TextInput
        style={styles.input}
        value={socialLinks.twitter}
        onChangeText={(v) => setSocialLinks(prev => ({ ...prev, twitter: v }))}
        placeholder="https://x.com/..."
        placeholderTextColor="#7C8698"
        autoCapitalize="none"
      />

      <Text style={styles.inputLabel}>인증 방법</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={socialVerificationMethod}
        onChangeText={setSocialVerificationMethod}
        placeholder="예: 프로필에 HIPO 인증 코드를 게시하겠습니다"
        placeholderTextColor="#7C8698"
        multiline
        numberOfLines={3}
      />
    </View>
  );

  const renderDocumentsStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>추가 서류 (선택)</Text>
      <Text style={styles.stepDescription}>
        인수 심사에 도움이 될 추가 증빙 자료나 메모를 작성해주세요.
      </Text>

      <Text style={styles.inputLabel}>추가 설명</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={additionalNotes}
        onChangeText={setAdditionalNotes}
        placeholder="추가적인 설명이나 증빙 자료에 대해 작성해주세요"
        placeholderTextColor="#7C8698"
        multiline
        numberOfLines={5}
      />

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color="#1E4BC7" />
        <Text style={styles.infoText}>
          서류 업로드는 심사 과정에서 관리자가 별도로 요청할 수 있습니다.
        </Text>
      </View>
    </View>
  );

  const renderSubmitStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>인수 신청 확인</Text>
      <Text style={styles.stepDescription}>
        아래 내용을 확인하고 인수 신청을 제출해주세요.
      </Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>대상 크리에이터</Text>
        <Text style={styles.summaryValue}>{virtualUserName}</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>실명</Text>
        <Text style={styles.summaryValue}>{realName}</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>신분증 종류</Text>
        <Text style={styles.summaryValue}>
          {identityDocumentType === 'resident_id' ? '주민등록증' :
           identityDocumentType === 'drivers_license' ? '운전면허증' : '여권'}
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>연결 SNS</Text>
        <Text style={styles.summaryValue}>
          {Object.entries(socialLinks).filter(([, v]) => v.trim()).map(([k]) => k).join(', ') || '없음'}
        </Text>
      </View>

      <View style={styles.warningBox}>
        <Ionicons name="warning-outline" size={20} color="#B26F00" />
        <Text style={styles.warningText}>
          허위 정보로 인수 신청 시 계정이 영구 정지될 수 있습니다.
        </Text>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderIdentityStep();
      case 1: return renderSocialStep();
      case 2: return renderDocumentsStep();
      case 3: return renderSubmitStep();
      default: return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#2E3542" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>본인 인수 신청</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderStepIndicator()}
        {renderCurrentStep()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 0 && (
          <TouchableOpacity style={styles.prevButton} onPress={handlePrev}>
            <Text style={styles.prevButtonText}>이전</Text>
          </TouchableOpacity>
        )}
        {currentStep < STEPS.length - 1 ? (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>다음</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>인수 신청하기</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: t.colors.textPrimary },
  scrollView: { flex: 1 },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: { backgroundColor: t.colors.primary },
  stepCircleDone: { backgroundColor: t.colors.success },
  stepLabel: { fontSize: 11, color: t.colors.textTertiary, marginLeft: 4, marginRight: 4 },
  stepLabelActive: { color: t.colors.primary, fontWeight: '600' },
  stepLine: { width: 20, height: 2, backgroundColor: t.colors.border },
  stepLineActive: { backgroundColor: t.colors.success },
  stepContent: { padding: 20 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: t.colors.textPrimary, marginBottom: 8 },
  stepDescription: { fontSize: 14, color: t.colors.textSecondary, lineHeight: 22, marginBottom: 24 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: t.colors.gray700, marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: t.colors.borderDark,
    borderRadius: 12,
    padding: 14,
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textPrimary,
    backgroundColor: t.colors.background,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  optionGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.colors.borderDark,
    backgroundColor: t.colors.background,
  },
  optionButtonActive: { borderColor: t.colors.primary, backgroundColor: t.colors.primaryBackground },
  optionText: { fontSize: 14, color: t.colors.textSecondary },
  optionTextActive: { color: t.colors.primary, fontWeight: '600' },
  summaryCard: {
    backgroundColor: t.colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  summaryTitle: { fontSize: 12, color: t.colors.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '600', color: t.colors.textPrimary },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: t.colors.primaryBackground,
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    gap: 10,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 13, color: t.colors.primaryDark, lineHeight: 20 },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: t.colors.warningBackground,
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    gap: 10,
    alignItems: 'flex-start',
  },
  warningText: { flex: 1, fontSize: 13, color: t.colors.warningText, lineHeight: 20 },
  footer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    gap: 12,
  },
  prevButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: t.colors.backgroundSecondary,
    alignItems: 'center',
  },
  prevButtonText: { fontSize: 16, fontWeight: '600', color: t.colors.textSecondary },
  nextButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
  },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: t.colors.surface },
  submitButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: t.colors.success,
    alignItems: 'center',
  },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: t.colors.surface },
  buttonDisabled: { opacity: 0.6 },
});
