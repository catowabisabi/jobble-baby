import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS, STATUS_COLORS } from '../theme';

const STORAGE_KEY = '@jobble/launch_checklist_items';

interface ChecklistItem {
  id: string;
  labelKey: string;
  descriptionKey?: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'app_store_connect', labelKey: 'launchChecklist.items.appStoreConnect', descriptionKey: 'launchChecklist.desc.appStoreConnect' },
  { id: 'bundle_id', labelKey: 'launchChecklist.items.bundleId', descriptionKey: 'launchChecklist.desc.bundleId' },
  { id: 'export_compliance', labelKey: 'launchChecklist.items.exportCompliance', descriptionKey: 'launchChecklist.desc.exportCompliance' },
  { id: 'content_rights', labelKey: 'launchChecklist.items.contentRights', descriptionKey: 'launchChecklist.desc.contentRights' },
  { id: 'age_rating', labelKey: 'launchChecklist.items.ageRating', descriptionKey: 'launchChecklist.desc.ageRating' },
  { id: 'screenshots', labelKey: 'launchChecklist.items.screenshotSpecs', descriptionKey: 'launchChecklist.desc.screenshotSpecs' },
  { id: 'metadata_review', labelKey: 'launchChecklist.items.metadataReview', descriptionKey: 'launchChecklist.desc.metadataReview' },
  { id: 'eas_build', labelKey: 'launchChecklist.items.easBuild', descriptionKey: 'launchChecklist.desc.easBuild' },
  { id: 'testflight', labelKey: 'launchChecklist.items.testflightBeta', descriptionKey: 'launchChecklist.desc.testflightBeta' },
  { id: 'privacy_policy', labelKey: 'launchChecklist.items.privacyPolicyUrl', descriptionKey: 'launchChecklist.desc.privacyPolicyUrl' },
  { id: 'description', labelKey: 'launchChecklist.items.appDescription', descriptionKey: 'launchChecklist.desc.appDescription' },
  { id: 'keywords', labelKey: 'launchChecklist.items.keywords', descriptionKey: 'launchChecklist.desc.keywords' },
  { id: 'support_url', labelKey: 'launchChecklist.items.supportUrl', descriptionKey: 'launchChecklist.desc.supportUrl' },
  { id: 'category', labelKey: 'launchChecklist.items.category', descriptionKey: 'launchChecklist.desc.category' },
  { id: 'pricing', labelKey: 'launchChecklist.items.pricing', descriptionKey: 'launchChecklist.desc.pricing' },
  { id: 'submit', labelKey: 'launchChecklist.items.submitApp', descriptionKey: 'launchChecklist.desc.submitApp' },
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
        const allDone = CHECKLIST_ITEMS.every(item => parsed[item.id]);
        setHasBadge(allDone);
      }
    } catch (e) {
      console.error('Failed to load launch checklist state', e);
    }
  };

  const saveState = async (newChecked: CheckedState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newChecked));
    } catch (e) {
      console.error('Failed to save launch checklist state', e);
    }
  };

  const toggleItem = (id: string) => {
    const newChecked = { ...checked, [id]: !checked[id] };
    setChecked(newChecked);
    saveState(newChecked);
    if (Object.values(newChecked).every(Boolean)) {
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

  const completedCount = Object.values(checked).filter(Boolean).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const percent = Math.round((completedCount / totalCount) * 100);

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
            <Text style={[styles.progressCount, { color: C.accent }]}>{completedCount}/{totalCount}</Text>
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

        {/* Checklist Items */}
        <View style={[styles.checklistCard, { backgroundColor: C.card }]}>
          {CHECKLIST_ITEMS.map((item, index) => {
            const isChecked = !!checked[item.id];
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.checklistItem,
                  index < CHECKLIST_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border },
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
                <Text style={[styles.itemNumber, { color: C.muted }]}>{index + 1}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

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
  checklistCard: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  checklistItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 0 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  itemContent: { flex: 1 },
  itemLabel: { fontSize: 15, fontWeight: '500' },
  itemDesc: { fontSize: 12, marginTop: 2 },
  itemNumber: { fontSize: 12, fontWeight: '600', marginLeft: 8 },
  resetButton: { borderWidth: 1.5, borderRadius: 8, padding: 14, alignItems: 'center' },
  resetButtonText: { fontSize: 15, fontWeight: '600' },
});