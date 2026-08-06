import React, { useState, useEffect } from 'react';
import useThemedStyles from '../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { securityAPI } from '../services/api';
import comingSoon from '../utils/comingSoon';

const SecuritySettingsScreen = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    twoFactorEnabled: false,
    hasTradingPin: false,
    identityVerified: false,
    dailyTradeLimit: 10000000,
  });

  // Modal states
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [twoFAModalVisible, setTwoFAModalVisible] = useState(false);
  const [limitModalVisible, setLimitModalVisible] = useState(false);

  // Form states
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [twoFAToken, setTwoFAToken] = useState('');
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFAQRCode, setTwoFAQRCode] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await securityAPI.getSettings();
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching security settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = async () => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      Alert.alert('오류', '거래 비밀번호는 6자리 숫자여야 합니다');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다');
      return;
    }

    setProcessing(true);
    try {
      await securityAPI.setTradingPin(pin, confirmPin);
      Alert.alert('성공', '거래 비밀번호가 설정되었습니다');
      setPinModalVisible(false);
      setPin('');
      setConfirmPin('');
      fetchSettings();
    } catch (error) {
      Alert.alert('오류', error.response?.data?.error || '설정에 실패했습니다');
    } finally {
      setProcessing(false);
    }
  };

  const handleSetup2FA = async () => {
    setProcessing(true);
    try {
      const response = await securityAPI.setup2FA();
      setTwoFASecret(response.data.secret);
      setTwoFAQRCode(response.data.qrCode);
      setTwoFAModalVisible(true);
    } catch (error) {
      Alert.alert('오류', error.response?.data?.error || '2FA 설정에 실패했습니다');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerify2FA = async () => {
    if (twoFAToken.length !== 6) {
      Alert.alert('오류', '6자리 인증 코드를 입력해주세요');
      return;
    }

    setProcessing(true);
    try {
      await securityAPI.verify2FA(twoFAToken);
      Alert.alert('성공', '2단계 인증이 활성화되었습니다');
      setTwoFAModalVisible(false);
      setTwoFAToken('');
      fetchSettings();
    } catch (error) {
      Alert.alert('오류', error.response?.data?.error || '인증에 실패했습니다');
    } finally {
      setProcessing(false);
    }
  };

  const handleSetDailyLimit = async () => {
    const limit = parseInt(newLimit.replace(/,/g, ''));
    if (!limit || limit < 100000) {
      Alert.alert('오류', '최소 100,000 PO 이상 설정해야 합니다');
      return;
    }

    setProcessing(true);
    try {
      await securityAPI.setDailyLimit(limit, pin);
      Alert.alert('성공', '일일 거래 한도가 설정되었습니다');
      setLimitModalVisible(false);
      setNewLimit('');
      fetchSettings();
    } catch (error) {
      Alert.alert('오류', error.response?.data?.error || '설정에 실패했습니다');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B5FE3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>보안 설정</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* 거래 비밀번호 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>거래 보안</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setPinModalVisible(true)}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="keypad-outline" size={24} color="#2B5FE3" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>거래 비밀번호</Text>
                <Text style={styles.settingDesc}>
                  {settings.hasTradingPin ? '설정됨' : '미설정'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={settings.twoFactorEnabled ? null : handleSetup2FA}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#2B5FE3" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>2단계 인증 (TOTP)</Text>
                <Text style={styles.settingDesc}>
                  {settings.twoFactorEnabled ? '활성화됨' : '비활성화'}
                </Text>
              </View>
            </View>
            {settings.twoFactorEnabled ? (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ON</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#999" />
            )}
          </TouchableOpacity>
        </View>

        {/* 거래 한도 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>거래 한도</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setLimitModalVisible(true)}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="trending-up-outline" size={24} color="#2B5FE3" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>일일 거래 한도</Text>
                <Text style={styles.settingDesc}>
                  {settings.dailyTradeLimit?.toLocaleString()} PO
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* 본인 인증 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>본인 인증</Text>

          <TouchableOpacity
            style={styles.settingItem}
            // 'IdentityVerification' 이라는 화면은 등록된 적이 없다.
            // 본인 인증 동선은 VerificationRequest 가 담당한다.
            onPress={() => navigation.navigate('VerificationRequest')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="person-circle-outline" size={24} color="#2B5FE3" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>신분증 인증</Text>
                <Text style={[
                  styles.settingDesc,
                  settings.identityVerified && styles.verifiedText
                ]}>
                  {settings.identityVerified ? '인증 완료' : '미인증'}
                </Text>
              </View>
            </View>
            {settings.identityVerified ? (
              <Ionicons name="checkmark-circle" size={24} color="#00B368" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#999" />
            )}
          </TouchableOpacity>
        </View>

        {/* 접속 기록 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>접속 관리</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => comingSoon('로그인 기록')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="time-outline" size={24} color="#2B5FE3" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>접속 기록</Text>
                <Text style={styles.settingDesc}>최근 로그인 내역 확인</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* PIN 설정 모달 */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>거래 비밀번호 설정</Text>
            <Text style={styles.modalDesc}>6자리 숫자를 입력해주세요</Text>

            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={setPin}
              placeholder="비밀번호"
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />
            <TextInput
              style={styles.pinInput}
              value={confirmPin}
              onChangeText={setConfirmPin}
              placeholder="비밀번호 확인"
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setPinModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleSetPin}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>설정</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2FA 설정 모달 */}
      <Modal visible={twoFAModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>2단계 인증 설정</Text>
            <Text style={styles.modalDesc}>
              Google Authenticator 또는 Authy로{'\n'}아래 QR 코드를 스캔하세요
            </Text>

            {twoFAQRCode && (
              <Image
                source={{ uri: twoFAQRCode }}
                style={styles.qrCode}
              />
            )}

            <Text style={styles.secretText}>
              시크릿 키: {twoFASecret}
            </Text>

            <TextInput
              style={styles.pinInput}
              value={twoFAToken}
              onChangeText={setTwoFAToken}
              placeholder="6자리 인증 코드"
              keyboardType="number-pad"
              maxLength={6}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setTwoFAModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleVerify2FA}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>확인</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 거래 한도 모달 */}
      <Modal visible={limitModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>일일 거래 한도 설정</Text>
            <Text style={styles.modalDesc}>
              현재 한도: {settings.dailyTradeLimit?.toLocaleString()} PO
            </Text>

            <TextInput
              style={styles.pinInput}
              value={newLimit}
              onChangeText={setNewLimit}
              placeholder="새 한도 (PO)"
              keyboardType="number-pad"
            />

            <View style={styles.limitOptions}>
              {[1000000, 5000000, 10000000, 50000000].map(amount => (
                <TouchableOpacity
                  key={amount}
                  style={styles.limitOption}
                  onPress={() => setNewLimit(amount.toString())}
                >
                  <Text style={styles.limitOptionText}>
                    {(amount / 10000).toLocaleString()}만
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setLimitModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleSetDailyLimit}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>설정</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.borderLight,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: t.colors.surface,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    paddingVertical: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: t.colors.backgroundSecondary,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingInfo: {
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 17,
    fontFamily: t.fonts.medium,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  verifiedText: {
    color: t.colors.success,
  },
  activeBadge: {
    backgroundColor: t.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: t.colors.surface,
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  pinInput: {
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 17,
    fontFamily: t.fonts.regular,
    textAlign: 'center',
    marginBottom: 12,
  },
  qrCode: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginBottom: 16,
  },
  secretText: {
    fontSize: 12,
    color: t.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  limitOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  limitOption: {
    backgroundColor: t.colors.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  limitOptionText: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textPrimary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: t.colors.backgroundSecondary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: t.colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    color: t.colors.surface,
    fontWeight: '600',
  },
});

export default SecuritySettingsScreen;
