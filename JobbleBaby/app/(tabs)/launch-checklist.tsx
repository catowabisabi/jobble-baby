import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS, STATUS_COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const STORAGE_KEY = STORAGE_KEYS.LAUNCH_CHECKLIST_ITEMS;

interface ChecklistItem {
  id: string;
  labelKey: string;
  descriptionKey?: string;
}

interface Section {
  id: string;
  titleKey: string;
  items: ChecklistItem[];
}

const SECTIONS: Section[] = [
  {
    id: 'apple',
    titleKey: 'launchChecklist.appleSection',
    items: [
      { id: 'eas_credentials', labelKey: 'launchChecklist.items.easCredentials', descriptionKey: 'launchChecklist.desc.easCredentials' },
      { id: 'appstore_connect', labelKey: 'launchChecklist.items.appStoreConnect', descriptionKey: 'launchChecklist.desc.appStoreConnect' },
      { id: 'bundle_id', labelKey: 'launchChecklist.items.bundleId', descriptionKey: 'launchChecklist.desc.bundleId' },
      { id: 'testflight', labelKey: 'launchChecklist.items.testflightBeta', descriptionKey: 'launchChecklist.desc.testflightBeta' },
      { id: 'privacy_policy', labelKey: 'launchChecklist.items.privacyPolicyUrl', descriptionKey: 'launchChecklist.desc.privacyPolicyUrl' },
      { id: 'contact_email', labelKey: 'launchChecklist.items.contactEmail', descriptionKey: 'launchChecklist.desc.contactEmail' },
      { id: 'screenshots', labelKey: 'launchChecklist.items.screenshotSpecs', descriptionKey: 'launchChecklist.desc.screenshotSpecs' },
    ],
  },
  {
    id: 'google',
    titleKey: 'launchChecklist.googleSection',
    items: [
      { id: 'play_console', labelKey: 'launchChecklist.items.playConsole', descriptionKey: 'launchChecklist.desc.playConsole' },
      { id: 'bundle_id_g', labelKey: 'launchChecklist.items.bundleId', descriptionKey: 'launchChecklist.desc.bundleId' },
      { id: 'aab_build', labelKey: 'launchChecklist.items.aabBuild', descriptionKey: 'launchChecklist.desc.aabBuild' },
      { id: 'privacy_policy_g', labelKey: 'launchChecklist.items.privacyPolicyUrl', descriptionKey: 'launchChecklist.desc.privacyPolicyUrl' },
      { id: 'screenshots_g', labelKey: 'launchChecklist.items.screenshotSpecs', descriptionKey: 'launchChecklist.desc.screenshotSpecs' },
    ],
  },
  {
    id: 'presubmission',
    titleKey: 'launchChecklist.presubmissionSection',
    items: [
      { id: 'tsc_check', labelKey: 'launchChecklist.items.tscCheck', descriptionKey: 'launchChecklist.desc.tscCheck' },
      { id: 'audit_script', labelKey: 'launchChecklist.items.auditScript', descriptionKey: 'launchChecklist.desc.auditScript' },
      { id: 'tabs_registered', labelKey: 'launchChecklist.items.tabsRegistered', descriptionKey: 'launchChecklist.desc.tabsRegistered' },
      { id: 'i18n_complete', labelKey: 'launchChecklist.items.i18nComplete', descriptionKey: 'launchChecklist.desc.i18nComplete' },
      { id: 'privacy_deployed', labelKey: 'launchChecklist.items.privacyDeployed', descriptionKey: 'launchChecklist.desc.privacyDeployed' },
      { id: 'eas_credentials_ps', labelKey: 'launchChecklist.items.easCredentialsConfigured', descriptionKey: 'launchChecklist.desc.easCredentialsConfigured' },
    ],
  },
];

interface CheckedState {
  [key: string]: boolean;
}

export default function LaunchChecklistScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme] || COLORS.light;

  const [checked, setChecked] = useState<CheckedState>({});
  const [hasBadge, setHasBadge] = useState(false);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CheckedState;
        setChecked(parsed);
        const allItems = SECTIONS.flatMap(s => s.items);
        const allDone = allItems.every(item => parsed[item.id]);
        setHasBadge(allDone);
      }
    } catch (e) { /* silently fail */ }
  };

  const saveState = async (newChecked: CheckedState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newChecked));
    } catch (e) { /* silently fail */ }
  };

  const toggleItem = (id: string) => {
    const newChecked = { ...checked, [id]: !checked[id] };
    setChecked(newChecked);
    saveState(newChecked);
    const allItems = SECTIONS.flatMap(s => s.items);
    if (allItems.every(item => newChecked[item.id])) {
      setHasBadge(true);
    } else {
      setHasBadge(false);
    }
  };

  const resetAll = () => {
    Alert.alert(
      t('launchChecklist.resetAlertTitle') || 'Reset Checklist',
      t('launchChecklist.resetAlertMessage') || 'Are you sure you want to uncheck all items?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.confirm') || 'Confirm',
          onPress: async () => {
            const empty: CheckedState = {};
            setChecked(empty);
            await saveState(empty);
            setHasBadge(false);
          },
        },
      ]
    );
  };

  const totalItems = SECTIONS.flatMap(s => s.items).length;
  const completedCount = Object.values(checked).filter(Boolean).length;
  const percent = Math.round((completedCount / totalItems) * 100);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: C.card }]}>
          <Text style={[styles.title, { color: C.text }]}>{t('tabs.launchChecklist') || 'Launch Checklist'}</Text>
          <Text style={[styles.subtitle, { color: C.muted }]}>
            {t('launchChecklist.subtitle') || 'Track your App Store submission progress'}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressCard, { backgroundColor: C.card }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: C.text }]}>{t('launchChecklist.progress') || 'Progress'}</Text>
            <Text style={[styles.progressCount, { color: C.accent }]}>{completedCount}/{totalItems}</Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: C.border }]}>
            <View style={[styles.progressBarFill, { backgroundColor: C.accent, width: `${percent}%` }]} />
          </View>
          <Text style={[styles.percentText, { color: C.muted }]}>{percent}% complete</Text>
        </View>

        {/* Badge */}
        {hasBadge && (
          <View style={[styles.badgeCard, { backgroundColor: C.accent + '20', borderColor: C.accent }]}>
            <Text style={[styles.badgeEmoji]}>🎖️</Text>
            <Text style={[styles.badgeTitle, { color: C.accent }]}>
              {t('launchChecklist.badge') || 'Launch Ready'}
            </Text>
            <Text style={[styles.badgeDesc, { color: C.muted }]}>
              {t('launchChecklist.badgeDesc') || 'All submission items verified'}
            </Text>
          </View>
        )}

        {/* Sections */}
        {SECTIONS.map((section) => {
          const sectionItems = section.items;
          const sectionDone = sectionItems.filter(item => checked[item.id]).length;
          const sectionTotal = sectionItems.length;
          return (
            <View key={section.id} style={[styles.sectionCard, { backgroundColor: C.card }]}>
              {/* Section Header */}
              <View style={[styles.sectionHeader, { borderBottomColor: C.border }]}>
                <Text style={[styles.sectionTitle, { color: C.text }]}>
                  {t(section.titleKey)}
                </Text>
                <Text style={[styles.sectionCount, { color: C.muted }]}>
                  {sectionDone}/{sectionTotal}
                </Text>
              </View>

              {/* Section Items */}
              {sectionItems.map((item, index) => {
                const isChecked = !!checked[item.id];
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.checklistItem,
                      index < sectionItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border },
                    ]}
                    onPress={() => toggleItem(item.id)}
                    accessibilityLabel={t(item.labelKey) || item.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isChecked }}
                  >
                    <View style={[styles.checkbox, isChecked && { backgroundColor: C.accent, borderColor: C.accent }]}>
                      {isChecked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={styles.itemContent}>
                      <Text style={[styles.itemLabel, { color: C.text }, isChecked && { textDecorationLine: 'line-through', opacity: 0.6 }]}>
                        {t(item.labelKey) || item.id}
                      </Text>
                      {item.descriptionKey && (
                        <Text style={[styles.itemDesc, { color: C.muted }]}>
                          {t(item.descriptionKey)}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        {/* Reset Button */}
        <TouchableOpacity
          style={[styles.resetButton, { borderColor: STATUS_COLORS.error }]}
          onPress={resetAll}
          accessibilityLabel={t('launchChecklist.resetAll') || 'Reset all items'}
        >
          <Text style={[styles.resetButtonText, { color: STATUS_COLORS.error }]}>
            {t('launchChecklist.resetAll') || 'Reset All'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// SafeAreaView fallback for Android
function SafeAreaView({ children, style }: { children: React.ReactNode; style?: any }) {
  const { Platform } = require('react-native');
  if (Platform.OS === 'ios') {
    const { SafeAreaView: RNSAV } = require('react-native');
    return <RNSAV style={style}>{children}</RNSAV>;
  }
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { borderRadius: 12, padding: 16, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  progressCard: { borderRadius: 12, padding: 16, marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 16, fontWeight: '600' },
  progressCount: { fontSize: 16, fontWeight: '700' },
  progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  percentText: { fontSize: 12, marginTop: 6, textAlign: 'right' },
  badgeCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, alignItems: 'center' },
  badgeEmoji: { fontSize: 32, marginBottom: 8 },
  badgeTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  badgeDesc: { fontSize: 14, textAlign: 'center' },
  sectionCard: { borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionCount: { fontSize: 13, fontWeight: '600' },
  checklistItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 0 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  itemContent: { flex: 1 },
  itemLabel: { fontSize: 15, fontWeight: '500' },
  itemDesc: { fontSize: 12, marginTop: 2 },
  resetButton: { borderWidth: 1.5, borderRadius: 8, padding: 14, alignItems: 'center' },
  resetButtonText: { fontSize: 15, fontWeight: '600' },
});
