import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translations
import ko from './locales/ko.json';
import en from './locales/en.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';

// Create i18n instance
const i18n = new I18n({
  ko,
  en,
  ja,
  zh,
});

// Set default locale
i18n.defaultLocale = 'ko';
i18n.locale = 'ko';
i18n.enableFallback = true;

// Language management
export const LANGUAGE_KEY = '@hipo_language';

export const LANGUAGES = {
  ko: { name: '한국어', flag: '🇰🇷' },
  en: { name: 'English', flag: '🇺🇸' },
  ja: { name: '日本語', flag: '🇯🇵' },
  zh: { name: '中文', flag: '🇨🇳' },
};

// Initialize language from storage or device
export const initializeLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

    if (savedLanguage && LANGUAGES[savedLanguage]) {
      i18n.locale = savedLanguage;
    } else {
      // Use device language if supported
      const deviceLanguage = Localization.locale.split('-')[0];
      i18n.locale = LANGUAGES[deviceLanguage] ? deviceLanguage : 'ko';
    }
  } catch (error) {
    console.error('Failed to load language:', error);
    i18n.locale = 'ko';
  }
};

// Change language
export const changeLanguage = async (languageCode) => {
  try {
    if (LANGUAGES[languageCode]) {
      i18n.locale = languageCode;
      await AsyncStorage.setItem(LANGUAGE_KEY, languageCode);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to change language:', error);
    return false;
  }
};

// Get current language
export const getCurrentLanguage = () => i18n.locale;

// Translation function
export const t = (key, options) => i18n.t(key, options);

export default i18n;
