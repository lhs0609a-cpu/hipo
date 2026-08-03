import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import errorLogger from '../services/errorLogger';

/**
 * FeedbackModal Component
 *
 * Allows users to:
 * - Report bugs
 * - Submit feedback
 * - Rate features
 * - Include error logs automatically
 */
const FeedbackModal = ({ visible, onClose, errorData = null }) => {
  const [feedbackType, setFeedbackType] = useState('bug'); // bug, feature, other
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [includeErrorLogs, setIncludeErrorLogs] = useState(!!errorData);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert('알림', '제목과 내용을 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      // Import apiService
      const { default: apiService } = await import('../services/apiService');

      const feedbackData = {
        type: feedbackType,
        subject: subject.trim(),
        description: description.trim(),
        email: email.trim() || null,
        errorData: includeErrorLogs ? (errorData || errorLogger.getRecentErrors(5)) : null,
        breadcrumbs: includeErrorLogs ? errorLogger.breadcrumbs.slice(-10) : null,
        userContext: errorLogger.userContext,
        timestamp: new Date().toISOString(),
      };

      await apiService.post('/feedback', feedbackData);

      Alert.alert(
        '감사합니다!',
        '소중한 의견이 전달되었습니다. 빠른 시일 내에 검토하겠습니다.',
        [{ text: '확인', onPress: handleClose }]
      );
    } catch (error) {
      console.error('Feedback submission error:', error);
      Alert.alert(
        '오류',
        '의견 전달에 실패했습니다. 잠시 후 다시 시도해주세요.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFeedbackType('bug');
    setSubject('');
    setDescription('');
    setEmail('');
    setIncludeErrorLogs(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>피드백 보내기</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Feedback Type */}
            <Text style={styles.label}>유형</Text>
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  feedbackType === 'bug' && styles.typeButtonActive,
                ]}
                onPress={() => setFeedbackType('bug')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    feedbackType === 'bug' && styles.typeButtonTextActive,
                  ]}
                >
                  🐛 버그 신고
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  feedbackType === 'feature' && styles.typeButtonActive,
                ]}
                onPress={() => setFeedbackType('feature')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    feedbackType === 'feature' && styles.typeButtonTextActive,
                  ]}
                >
                  💡 기능 제안
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  feedbackType === 'other' && styles.typeButtonActive,
                ]}
                onPress={() => setFeedbackType('other')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    feedbackType === 'other' && styles.typeButtonTextActive,
                  ]}
                >
                  💬 기타
                </Text>
              </TouchableOpacity>
            </View>

            {/* Subject */}
            <Text style={styles.label}>제목 *</Text>
            <TextInput
              style={styles.input}
              placeholder="문제 또는 제안을 간단히 요약해주세요"
              value={subject}
              onChangeText={setSubject}
              maxLength={100}
            />

            {/* Description */}
            <Text style={styles.label}>상세 설명 *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="자세한 내용을 입력해주세요"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />

            {/* Email */}
            <Text style={styles.label}>이메일 (선택)</Text>
            <TextInput
              style={styles.input}
              placeholder="답변 받을 이메일 (선택사항)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Include Error Logs */}
            {feedbackType === 'bug' && (
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setIncludeErrorLogs(!includeErrorLogs)}
              >
                <View style={[styles.checkboxBox, includeErrorLogs && styles.checkboxBoxChecked]}>
                  {includeErrorLogs && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>
                  오류 로그 포함 (문제 해결에 도움이 됩니다)
                </Text>
              </TouchableOpacity>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>전송하기</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#DFE3EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DFE3EB',
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    borderColor: '#00B368',
    backgroundColor: '#E7F8F0',
  },
  typeButtonText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  typeButtonTextActive: {
    color: '#00B368',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DFE3EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#DFE3EB',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    borderColor: '#00B368',
    backgroundColor: '#00B368',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#00B368',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 24,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default FeedbackModal;
