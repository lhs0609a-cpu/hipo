import React, { useState } from 'react';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../i18n';

export default function LanguageSelectionScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const { language: currentLanguage, languages, changeLanguage } = useLanguage();
  const [isChanging, setIsChanging] = useState(false);

  const handleLanguageChange = async (languageCode) => {
    if (languageCode === currentLanguage) {
      return;
    }

    setIsChanging(true);
    try {
      const success = await changeLanguage(languageCode);
      if (success) {
        Alert.alert(
          t('success.updated'),
          t('settings.languageChanged'),
          [
            {
              text: t('common.confirm'),
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(t('common.error'), t('errors.tryAgain'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.tryAgain'));
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('settings.language')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('settings.selectLanguage')}
        </Text>
      </View>

      <View style={styles.languageList}>
        {Object.entries(languages).map(([code, { name, flag }]) => (
          <TouchableOpacity
            key={code}
            style={[
              styles.languageItem,
              currentLanguage === code && styles.languageItemActive,
            ]}
            onPress={() => handleLanguageChange(code)}
            disabled={isChanging}
          >
            <View style={styles.languageInfo}>
              <Text style={styles.languageFlag}>{flag}</Text>
              <Text
                style={[
                  styles.languageName,
                  currentLanguage === code && styles.languageNameActive,
                ]}
              >
                {name}
              </Text>
            </View>

            {currentLanguage === code && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkIcon}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t('settings.languageChangeNote')}
        </Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: t.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  languageList: {
    padding: 16,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 12,
    backgroundColor: t.colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageItemActive: {
    backgroundColor: t.colors.successBackground,
    borderColor: t.colors.success,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  languageNameActive: {
    color: t.colors.successText,
    fontWeight: 'bold',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: t.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
