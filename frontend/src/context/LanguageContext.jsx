import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // Get language from localStorage or default to 'uz'
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved && ['uz', 'ru', 'en'].includes(saved) ? saved : 'uz';
  });

  // Save language to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('language', language);
    // Also set document language
    document.documentElement.lang = language;
  }, [language]);

  // Get translated strings
  const getTranslation = (path) => {
    const keys = path.split('.');
    let value = translations[language];
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return path; // Return path if translation not found
      }
    }
    
    return value;
  };

  // Alias for shorter syntax
  const t = getTranslation;

  const changeLanguage = (lang) => {
    if (['uz', 'ru', 'en'].includes(lang)) {
      setLanguage(lang);
    }
  };

  const value = {
    language,
    setLanguage: changeLanguage,
    t,
    translations: translations[language],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
