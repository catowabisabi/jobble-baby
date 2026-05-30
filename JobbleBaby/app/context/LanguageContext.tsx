import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import en from '../i18n/en.json';
import zh from '../i18n/zh.json';

type Language = 'en' | 'zh';
type TranslationKeys = typeof en;

const translations: Record<Language, TranslationKeys> = { en, zh };

interface LanguageContextType {
  language: Language;
  effectiveLanguage: Language;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = '@jobble/language';

function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj) ?? path;
}

function getDeviceLocale(): Language {
  // Fallback device locale detection
  // On iOS: uses the device language
  // On Android: uses the device locale
  try {
    // Use Intl.DateTimeFormat().resolvedOptions().locale as a simple fallback
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (locale.startsWith('zh')) return 'zh';
  } catch {}
  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => getDeviceLocale());

  // Load persisted language on mount
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'en' || stored === 'zh') {
          setLanguageState(stored);
        }
      } catch (e) {
        // Silent fail - use default
      }
    };
    load();
  }, []);

  const effectiveLanguage = language;

  const t = (key: string, params?: Record<string, string | number>): string => {
    const translation = getNestedValue(translations[effectiveLanguage], key);
    const finalTranslation = translation === key
      ? getNestedValue(translations.en, key)
      : translation;
    if (!params) return finalTranslation;
    return finalTranslation.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? `{{${k}}}`));
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
  };

  const toggleLanguage = () => {
    const next: Language = language === 'en' ? 'zh' : 'en';
    setLanguage(next);
  };

  return (
    <LanguageContext.Provider value={{ language, effectiveLanguage, t, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}