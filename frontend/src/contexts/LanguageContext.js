import React, { createContext, useState, useEffect, useContext } from 'react';
import { initializeLanguage, changeLanguage as changeI18nLanguage, getCurrentLanguage, LANGUAGES } from '../i18n';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('ko');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      await initializeLanguage();
      setLanguage(getCurrentLanguage());
    } catch (error) {
      console.error('Failed to load language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (languageCode) => {
    try {
      const success = await changeI18nLanguage(languageCode);
      if (success) {
        setLanguage(languageCode);
        // Force re-render to update all translations
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to change language:', error);
      return false;
    }
  };

  const value = {
    language,
    languages: LANGUAGES,
    changeLanguage,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
