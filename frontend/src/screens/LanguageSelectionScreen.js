import React, { useState } from 'react';
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageItemActive: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4caf50',
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
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4caf50',
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
