import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/app/utils/SafeStorage';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS, STATUS_COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const STORAGE_KEY = STORAGE_KEYS.APPSTORE_CHECKLIST;

interface ChecklistItem {
  id: string;
  labelKey: string;
  descriptionKey?: string;
}

// Apple App Store items - maps to existing launchChecklist items
const APPLE_ITEMS: ChecklistItem[] = [
  { id: 'apple_dev_program', labelKey: 'launchChecklist.items.appStoreConnect', descriptionKey: 'launchChecklist.desc.appStoreConnect' },
  { id: 'bundle_id', labelKey: 'launchChecklist.items.bundleId', descriptionKey: 'launchChecklist.desc.bundleId' },
  { id: 'export_compliance', labelKey: 'launchChecklist.items.exportCompliance', descriptionKey: 'launchChecklist.desc.exportCompliance' },
  { id: 'age_rating', labelKey: 'launchChecklist.items.ageRating', descriptionKey: 'launchChecklist.desc.ageRating' },
  { id: 'privacy_url', labelKey: 'launchChecklist.items.privacyPolicyUrl', descriptionKey: 'launchChecklist.desc.privacyPolicyUrl' },
  { id: 'screenshots', labelKey: 'launchChecklist.items.screenshotSpecs', descriptionKey: 'launchChecklist.desc.screenshotSpecs' },
  { id: 'metadata', labelKey: 'launchChecklist.items.metadataReview', descriptionKey: 'launchChecklist.desc.metadataReview' },
  { id: 'eas_build_ios', labelKey: 'launchChecklist.items.easBuild', descriptionKey: 'launchChecklist.desc.easBuild' },
  { id: 'testflight', labelKey: 'launchChecklist.items.testflightBeta', descriptionKey: 'launchChecklist.desc.testflightBeta' },
  { id: 'submission', labelKey: 'launchChecklist.items.submitApp', descriptionKey: 'launchChecklist.desc.submitApp' },
];

// Google Play Store items - uses newly added launchChecklist items
const PLAY_ITEMS: ChecklistItem[] = [
  { id: 'play_dev_account', labelKey: 'launchChecklist.items.playDevAccount', descriptionKey: 'launchChecklist.desc.playDevAccount' },
  { id: 'play_app_created', labelKey: 'launchChecklist.items.playAppCreated', descriptionKey: 'launchChecklist.desc.playAppCreated' },
  { id: 'app_signing', labelKey: 'launchChecklist.items.playAppSigning', descriptionKey: 'launchChecklist.desc.playAppSigning' },
  { id: 'play_privacy_url', labelKey: 'launchChecklist.items.playPrivacyUrl', descriptionKey: 'launchChecklist.desc.playPrivacyUrl' },
  { id: 'play_screenshots', labelKey: 'launchChecklist.items.playScreenshots', descriptionKey: 'launchChecklist.desc.playScreenshots' },
  { id: 'play_listing', labelKey: 'launchChecklist.items.playListing', descriptionKey: 'launchChecklist.desc.playListing' },
  { id: 'content_rating', labelKey: 'launchChecklist.items.playContentRating', descriptionKey: 'launchChecklist.desc.playContentRating' },
  { id: 'target_audience', labelKey: 'launchChecklist.items.playTargetAudience', descriptionKey: 'launchChecklist.desc.playTargetAudience' },
  { id: 'eas_build_android', labelKey: 'launchChecklist.items.playEasBuildAndroid', descriptionKey: 'launchChecklist.desc.playEasBuildAndroid' },
  { id: 'internal_testing', labelKey: 'launchChecklist.items.playInternalTesting', descriptionKey: 'launchChecklist.desc.playInternalTesting' },
  { id: 'play_submission', labelKey: 'launchChecklist.items.playSubmission', descriptionKey: 'launchChecklist.desc.playSubmission' },
];

interface CheckedState {
  [key: string]: boolean;
}

export default function AppstoreChecklistScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme] || COLORS.light;

  const [checked, setChecked] = useState<CheckedState>({});

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setChecked(JSON.parse(stored) as CheckedState);
      }
    } catch (e) {
      // silently fail
    }
  };

  const saveState = async (newChecked: CheckedState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newChecked));
    } catch (e) {
      // silently fail
    }
  };

  const toggleItem = (id: string) => {
    const newChecked = { ...checked, [id]: !checked[id] };
    setChecked(newChecked);
    saveState(newChecked);
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
            setChecked({});
            await saveState({});
          },
        },
      ]
    );
  };

  const appleDone = APPLE_ITEMS.filter(item => !!checked[item.id]).length;
  const playDone = PLAY_ITEMS.filter(item => !!checked[item.id]).length;

  const renderSection = (title: string, emoji: string, items: ChecklistItem[], doneCount: number, accentColor: string) => {
    const total = items.length;
    const percent = Math.round((doneCount / total) * 100);
    return (
      <View style={[styles.section, { backgroundColor: C.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>{emoji}</Text>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{title}</Text>
          <Text style={[styles.sectionCount, { color: accentColor }]}>{doneCount}/{total}</Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: C.border }]}>
          <View style={[styles.progressBarFill, { backgroundColor: accentColor, width: `${percent}%` }]} />
        </View>
        {items.map((item, index) => {
          const isChecked = !!checked[item.id];
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.checklistItem,
                index < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border },
              ]}
              onPress={() => toggleItem(item.id)}
              accessibilityLabel={t(item.labelKey) || item.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isChecked }}
            >
              <View style={[styles.checkbox, isChecked && { backgroundColor: accentColor, borderColor: accentColor }]}>
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
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, { backgroundColor: C.card }]}>
          <Text style={[styles.title, { color: C.text }]}>📱 {t('tabs.appstoreChecklist') || 'App Stores'}</Text>
          <Text style={[styles.subtitle, { color: C.muted }]}>
            {t('launchChecklist.subtitle') || 'Track your App Store + Play Store submission progress'}
          </Text>
        </View>

        {renderSection('Apple App Store', '🍎', APPLE_ITEMS, appleDone, '#007AFF')}
        {renderSection('Google Play Store', '📦', PLAY_ITEMS, playDone, '#34A853')}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { borderRadius: 12, padding: 16, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  section: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 10 },
  sectionEmoji: { fontSize: 20, marginRight: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', flex: 1 },
  sectionCount: { fontSize: 15, fontWeight: '700' },
  progressBarBg: { height: 4, marginHorizontal: 14, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  progressBarFill: { height: '100%', borderRadius: 2 },
  checklistItem: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 14 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  itemContent: { flex: 1 },
  itemLabel: { fontSize: 14, fontWeight: '500' },
  itemDesc: { fontSize: 12, marginTop: 2 },
  resetButton: { borderWidth: 1.5, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 4 },
  resetButtonText: { fontSize: 15, fontWeight: '600' },
});