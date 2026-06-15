import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  Dimensions, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const { width: SCREEN_W } = Dimensions.get('window');

const BIRTHDATE_KEY = STORAGE_KEYS.BABY_BIRTHDATE;
const ACTIVITIES_KEY = STORAGE_KEYS.PERIOD_ACTIVITIES;

interface Period {
  id: string;
  labelKey: string;
  color: string;
  minMonth: number;
  maxMonth: number;
  descriptionKey: string;
  whyKey: string;
  activities: string[];
  signs: string[];
  redFlags: string[];
}

const PERIODS: Period[] = [
  {
    id: 'attachment',
    labelKey: 'attachment',
    color: '#22C55E',
    minMonth: 0,
    maxMonth: 6,
    descriptionKey: 'attachmentDesc',
    whyKey: 'attachmentWhy',
    activities: [
      'Skin-to-skin contact 30min/day',
      'Responsive feeding on cue',
      'Face-to-face play 10min/day',
    ],
    signs: [
      'Social smiles',
      'Calms to parent voice',
      'Eye contact during feeding',
    ],
    redFlags: [
      'No social smile by 3 months',
      'Avoids eye contact',
      'Does not respond to caregiver voice',
    ],
  },
  {
    id: 'language',
    labelKey: 'language',
    color: '#3B82F6',
    minMonth: 0,
    maxMonth: 12,
    descriptionKey: 'languageDesc',
    whyKey: 'languageWhy',
    activities: [
      'Narrate daily activities',
      'Read board books daily',
      'Respond to baby coos with words',
    ],
    signs: [
      'Cooing and babbling',
      'Turns to voice',
      'First words emerge',
    ],
    redFlags: [
      'No babbling by 6 months',
      'No response to sounds',
      'No words by 12 months',
    ],
  },
  {
    id: 'motor',
    labelKey: 'motor',
    color: '#F59E0B',
    minMonth: 2,
    maxMonth: 9,
    descriptionKey: 'motorDesc',
    whyKey: 'motorWhy',
    activities: [
      'Tummy time 30min/day in short bursts',
      'Reaching and grasping toys',
      'Supported sitting practice',
    ],
    signs: [
      'Head control by 2 months',
      'Rolling over',
      'Crawling attempts',
    ],
    redFlags: [
      'No head control by 4 months',
      'Cannot sit with support by 6 months',
      'Asymmetric movements',
    ],
  },
  {
    id: 'visual',
    labelKey: 'visual',
    color: '#8B5CF6',
    minMonth: 0,
    maxMonth: 4,
    descriptionKey: 'visualDesc',
    whyKey: 'visualWhy',
    activities: [
      'High-contrast cards at 20-30cm',
      'Black and white patterns',
      'Face-to-face近距离 play',
    ],
    signs: [
      'Focuses on faces',
      'Tracks moving objects',
      'Reaches for bright objects',
    ],
    redFlags: [
      'Eyes not tracking by 2 months',
      'Persistent eye turning',
      'No reaction to light',
    ],
  },
  {
    id: 'gut_microbiome',
    labelKey: 'gutMicrobiome',
    color: '#14B8A6',
    minMonth: 0,
    maxMonth: 6,
    descriptionKey: 'gutMicrobiomeDesc',
    whyKey: 'gutMicrobiomeWhy',
    activities: [
      'Exclusive breastfeeding preferred',
      'Probiotic supplementation if formula-fed',
      'Gradual allergen introduction at 4-6 months',
    ],
    signs: [
      'Regular bowel movements',
      'Healthy stool color',
      'Good feeding tolerance',
    ],
    redFlags: [
      'Persistent blood in stool',
      'Severe reflux affecting growth',
      'Failure to thrive',
    ],
  },
  {
    id: 'gut_brain_axis',
    labelKey: 'gutBrainAxis',
    color: '#EC4899',
    minMonth: 0,
    maxMonth: 12,
    descriptionKey: 'gutBrainAxisDesc',
    whyKey: 'gutBrainAxisWhy',
    activities: [
      'Gut-friendly foods post-weaning',
      'Fermented foods introduction',
      'Prebiotic fiber sources',
    ],
    signs: [
      'Regular digestion',
      'Normal sleep patterns',
      'Good mood/settling',
    ],
    redFlags: [
      'Chronic constipation',
      'Persistent diarrhea',
      'Unexplained irritability',
    ],
  },
];

interface PeriodActivity {
  date: string;
  activity: string;
  notes: string;
}

function getMonthsFromBirth(birthDateStr: string): number {
  try {
    const birth = new Date(birthDateStr);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 +
      (now.getMonth() - birth.getMonth()) +
      (now.getDate() - birth.getDate()) / 30;
    return Math.max(0, Math.min(months, 12));
  } catch {
    return 0;
  }
}

function getPeriodStatus(period: Period, babyAgeMonths: number): 'active' | 'imminent' | 'passed' {
  if (babyAgeMonths >= period.maxMonth) return 'passed';
  if (babyAgeMonths >= period.minMonth) return 'active';
  if (period.minMonth - babyAgeMonths <= 0.5) return 'imminent';
  return 'passed';
}

export default function CriticalPeriodsScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];
  const bg = C.background;
  const cardBg = C.card;
  const textPrimary = C.text;
  const textSecondary = C.muted;

  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [babyAgeMonths, setBabyAgeMonths] = useState<number>(0);
  const [activities, setActivities] = useState<Record<string, PeriodActivity[]>>({});
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newActivity, setNewActivity] = useState('');

  useEffect(() => {
    loadBirthDate();
    loadActivities();
  }, []);

  const loadBirthDate = async () => {
    try {
      const bd = await safeGetItem(BIRTHDATE_KEY);
      if (bd) {
        setBirthDate(bd);
        setBabyAgeMonths(getMonthsFromBirth(bd));
      }
    } catch {}
  };

  const loadActivities = async () => {
    try {
      const raw = await safeGetItem(ACTIVITIES_KEY);
      if (raw) setActivities(JSON.parse(raw));
    } catch {}
  };

  const saveActivities = async (updated: Record<string, PeriodActivity[]>) => {
    setActivities(updated);
    await safeSetItem(ACTIVITIES_KEY, JSON.stringify(updated));
  };

  const openPeriodDetail = (period: Period) => {
    setSelectedPeriod(period);
    setModalVisible(true);
  };

  const logActivity = async () => {
    if (!selectedPeriod || !newActivity.trim()) return;
    const updated = { ...activities };
    if (!updated[selectedPeriod.id]) updated[selectedPeriod.id] = [];
    updated[selectedPeriod.id].push({
      date: new Date().toISOString().split('T')[0],
      activity: newActivity.trim(),
      notes: '',
    });
    await saveActivities(updated);
    setNewActivity('');
  };

  const getStatusColor = (status: 'active' | 'imminent' | 'passed') => {
    if (status === 'active') return '#22C55E';
    if (status === 'imminent') return '#F59E0B';
    return '#9CA3AF';
  };

  const getStatusLabel = (status: 'active' | 'imminent' | 'passed') => {
    if (status === 'active') return t('criticalPeriods.active');
    if (status === 'imminent') return t('criticalPeriods.imminent');
    return t('criticalPeriods.passed');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          {t('criticalPeriods.title')}
        </Text>
        <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
          {t('criticalPeriods.subtitle')}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Timeline */}
        <View style={[styles.timelineCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            {t('criticalPeriods.timeline')}
          </Text>
          <View style={styles.timeline}>
            <View style={styles.timelineTrack}>
              {[0, 2, 4, 6, 8, 10, 12].map((m) => (
                <View key={m} style={styles.timelineMarker}>
                  <Text style={[styles.timelineLabel, { color: textSecondary }]}>{m}m</Text>
                </View>
              ))}
            </View>
            <View style={styles.periodBands}>
              {PERIODS.map((period) => {
                const left = (period.minMonth / 12) * (SCREEN_W - 72);
                const width = ((period.maxMonth - period.minMonth) / 12) * (SCREEN_W - 72);
                return (
                  <View
                    key={period.id}
                    style={[
                      styles.periodBand,
                      {
                        backgroundColor: period.color,
                        left,
                        width: Math.max(width, 8),
                        opacity: 0.7,
                      },
                    ]}
                  />
                );
              })}
            </View>
            {babyAgeMonths > 0 && (
              <View
                style={[
                  styles.babyMarker,
                  { left: (babyAgeMonths / 12) * (SCREEN_W - 72) - 6 },
                ]}
              >
                <Text style={styles.babyMarkerIcon}>👶</Text>
              </View>
            )}
          </View>
          <View style={styles.legendRow}>
            {PERIODS.map((period) => (
              <View key={period.id} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: period.color }]} />
                <Text style={[styles.legendText, { color: textSecondary }]}>
                  {t(`criticalPeriods.${period.labelKey}`)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Period Cards */}
        <Text style={[styles.sectionTitle, { color: textPrimary, marginHorizontal: 16 }]}>
          {t('criticalPeriods.periods')}
        </Text>
        {PERIODS.map((period) => {
          const status = getPeriodStatus(period, babyAgeMonths);
          const periodActivities = activities[period.id] || [];
          return (
            <TouchableOpacity
              key={period.id}
              style={[styles.periodCard, { backgroundColor: cardBg }]}
              onPress={() => openPeriodDetail(period)}
              accessibilityLabel={t(`criticalPeriods.${period.labelKey}`)}
              accessibilityRole="button"
            >
              <View style={styles.periodCardHeader}>
                <View style={[styles.periodColorBar, { backgroundColor: period.color }]} />
                <View style={styles.periodCardInfo}>
                  <Text style={[styles.periodName, { color: textPrimary }]}>
                    {t(`criticalPeriods.${period.labelKey}`)}
                  </Text>
                  <Text style={[styles.periodRange, { color: textSecondary }]}>
                    {period.minMonth}-{period.maxMonth} months
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(status) + '30' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
                    {getStatusLabel(status)}
                  </Text>
                </View>
              </View>
              {periodActivities.length > 0 && (
                <Text style={[styles.activityCount, { color: textSecondary }]}>
                  {periodActivities.length} {t('criticalPeriods.activitiesLogged')}
                </Text>
              )}
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={textSecondary}
                style={styles.cardArrow}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Period Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: bg }]}>
          {selectedPeriod && (
            <>
              <View style={styles.modalHeader}>
                <View style={[styles.modalColorBar, { backgroundColor: selectedPeriod.color }]} />
                <View style={styles.modalHeaderContent}>
                  <Text style={[styles.modalTitle, { color: textPrimary }]}>
                    {t(`criticalPeriods.${selectedPeriod.labelKey}`)}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                    {selectedPeriod.minMonth}-{selectedPeriod.maxMonth} months
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  accessibilityLabel={t('common.close')}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name="close" size={24} color={textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('criticalPeriods.whatIsIt')}
                  </Text>
                  <Text style={[styles.modalText, { color: textSecondary }]}>
                    {t(`criticalPeriods.${selectedPeriod.descriptionKey}`)}
                  </Text>
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('criticalPeriods.whyMatters')}
                  </Text>
                  <Text style={[styles.modalText, { color: textSecondary }]}>
                    {t(`criticalPeriods.${selectedPeriod.whyKey}`)}
                  </Text>
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('criticalPeriods.topActivities')}
                  </Text>
                  {selectedPeriod.activities.map((act, i) => (
                    <View key={i} style={styles.activityRow}>
                      <MaterialCommunityIcons name="check-circle" size={16} color="#22C55E" />
                      <Text style={[styles.activityText, { color: textSecondary }]}>{act}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('criticalPeriods.signs')}
                  </Text>
                  {selectedPeriod.signs.map((sign, i) => (
                    <View key={i} style={styles.activityRow}>
                      <MaterialCommunityIcons name="eye" size={16} color="#3B82F6" />
                      <Text style={[styles.activityText, { color: textSecondary }]}>{sign}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('criticalPeriods.redFlags')}
                  </Text>
                  {selectedPeriod.redFlags.map((flag, i) => (
                    <View key={i} style={styles.activityRow}>
                      <MaterialCommunityIcons name="alert-circle" size={16} color="#EF4444" />
                      <Text style={[styles.activityText, { color: textSecondary }]}>{flag}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('criticalPeriods.logActivity')}
                  </Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[styles.activityInput, { backgroundColor: bg, color: textPrimary, borderColor: textSecondary }]}
                      placeholder={t('criticalPeriods.activityPlaceholder')}
                      placeholderTextColor={textSecondary}
                      value={newActivity}
                      onChangeText={setNewActivity}
                      accessibilityLabel={t('criticalPeriods.activityPlaceholder')}
                    />
                    <TouchableOpacity
                      style={styles.logButton}
                      onPress={logActivity}
                      accessibilityLabel={t('criticalPeriods.log')}
                      accessibilityRole="button"
                    >
                      <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  {(activities[selectedPeriod.id] || []).length > 0 && (
                    <View style={styles.loggedList}>
                      {(activities[selectedPeriod.id] || []).map((entry, i) => (
                        <View key={i} style={styles.loggedEntry}>
                          <Text style={[styles.loggedDate, { color: textSecondary }]}>{entry.date}</Text>
                          <Text style={[styles.loggedActivity, { color: textPrimary }]}>{entry.activity}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  timelineCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  timeline: { height: 60, position: 'relative', marginBottom: 8 },
  timelineTrack: { flexDirection: 'row', justifyContent: 'space-between', position: 'absolute', bottom: 0, left: 0, right: 0 },
  timelineMarker: { alignItems: 'center' },
  timelineLabel: { fontSize: 10 },
  periodBands: { position: 'absolute', top: 10, left: 0, right: 0, height: 24 },
  periodBand: { position: 'absolute', height: 24, borderRadius: 4 },
  babyMarker: { position: 'absolute', top: 0, alignItems: 'center' },
  babyMarkerIcon: { fontSize: 20 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  legendText: { fontSize: 10 },
  periodCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center' },
  periodCardHeader: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  periodColorBar: { width: 4, height: 40, borderRadius: 2, marginRight: 10 },
  periodCardInfo: { flex: 1 },
  periodName: { fontSize: 15, fontWeight: '600' },
  periodRange: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  activityCount: { fontSize: 11, marginTop: 4 },
  cardArrow: { marginLeft: 4 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalColorBar: { width: 6, height: 40, borderRadius: 3, marginRight: 12 },
  modalHeaderContent: { flex: 1 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalSubtitle: { fontSize: 13, marginTop: 2 },
  modalScroll: { flex: 1, padding: 16 },
  modalSection: { borderRadius: 12, padding: 16, marginBottom: 12 },
  modalSectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  modalText: { fontSize: 14, lineHeight: 20 },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  activityText: { fontSize: 13, marginLeft: 8, flex: 1, lineHeight: 18 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activityInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  logButton: { backgroundColor: '#22C55E', borderRadius: 8, padding: 10 },
  loggedList: { marginTop: 12 },
  loggedEntry: { flexDirection: 'row', marginBottom: 6 },
  loggedDate: { fontSize: 11, width: 70 },
  loggedActivity: { fontSize: 12, flex: 1 },
});
