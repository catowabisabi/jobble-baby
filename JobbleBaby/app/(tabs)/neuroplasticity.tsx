import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  Dimensions, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const { width: SCREEN_W } = Dimensions.get('window');

const PLASTICITY_KEY = STORAGE_KEYS.NEUROPLASTICITY_TRACKING;
const ACTIVITIES_KEY = STORAGE_KEYS.PLASTICITY_ACTIVITIES;

interface PlasticityWindow {
  id: string;
  labelKey: string;
  color: string;
  minMonth: number;
  maxMonth: number;
  descriptionKey: string;
  whyKey: string;
  myelinationKey: string;
  pruningKey: string;
  activities: string[];
  signs: string[];
  redFlags: string[];
}

const PLASTICITY_WINDOWS: PlasticityWindow[] = [
  {
    id: 'language',
    labelKey: 'language',
    color: '#3B82F6',
    minMonth: 0,
    maxMonth: 12,
    descriptionKey: 'languageDesc',
    whyKey: 'languageWhy',
    myelinationKey: 'languageMyelination',
    pruningKey: 'languagePruning',
    activities: [
      'Narrate daily activities in full sentences',
      'Read board books daily with expression',
      'Respond to baby coos with matching words',
      'Sing nursery rhymes and lullabies',
    ],
    signs: [
      'Cooing and babbling by 4 months',
      'Turns to voice and name by 6 months',
      'First words emerge around 10-12 months',
      'Understands simple commands by 12 months',
    ],
    redFlags: [
      'No babbling by 6 months',
      'No response to sounds or voice',
      'No words by 12 months',
      'No back-and-forth interaction',
    ],
  },
  {
    id: 'vision',
    labelKey: 'visual',
    color: '#8B5CF6',
    minMonth: 0,
    maxMonth: 4,
    descriptionKey: 'visualDesc',
    whyKey: 'visualWhy',
    myelinationKey: 'visualMyelination',
    pruningKey: 'visualPruning',
    activities: [
      'High-contrast black and white cards at 20-30cm',
      'Face-to-face play at close distance',
      'Tracking moving objects slowly',
      'Introducing bold primary colors after 3 months',
    ],
    signs: [
      'Focuses on faces at birth',
      'Tracks moving objects by 2 months',
      'Reaches for bright objects by 3 months',
      'Depth perception developing by 4 months',
    ],
    redFlags: [
      'Eyes not tracking together by 2 months',
      'Persistent eye turning in or out',
      'No reaction to light or dark',
      'Excessive tearing or discharge',
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
    myelinationKey: 'motorMyelination',
    pruningKey: 'motorPruning',
    activities: [
      'Tummy time 30min/day in short bursts',
      'Reaching and grasping toys',
      'Supported sitting practice',
      'Weight-bearing on legs when held standing',
    ],
    signs: [
      'Head control by 2 months',
      'Rolling over both directions by 4-5 months',
      'Sitting without support by 6 months',
      'Crawling or bottom-shuffling by 9 months',
    ],
    redFlags: [
      'No head control by 4 months',
      'Cannot sit with support by 6 months',
      'Asymmetric movements or posture',
      'No reaching or grasping by 5 months',
    ],
  },
  {
    id: 'sensory_integration',
    labelKey: 'sensoryIntegration',
    color: '#14B8A6',
    minMonth: 0,
    maxMonth: 36,
    descriptionKey: 'sensoryIntegrationDesc',
    whyKey: 'sensoryIntegrationWhy',
    myelinationKey: 'sensoryMyelination',
    pruningKey: 'sensoryPruning',
    activities: [
      'Multi-sensory play with different textures',
      'Responsive caregiving that matches baby cues',
      'Gradual exposure to varied environments',
      'Music and rhythm activities daily',
    ],
    signs: [
      'Calms to familiar voices and sounds',
      'Explores objects with mouth and hands',
      'Shows preference for caregivers',
      'Responds to different textures and temperatures',
    ],
    redFlags: [
      'Extreme aversion to textures',
      'No response to sounds or sights',
      'Persistent distress without identifiable cause',
      'Developmental regression in any domain',
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
    myelinationKey: 'gutMyelination',
    pruningKey: 'gutPruning',
    activities: [
      'Exclusive breastfeeding when possible',
      'Probiotic supplementation if formula-fed',
      'Gradual allergen introduction at 4-6 months',
      'Gut-friendly foods post-weaning',
    ],
    signs: [
      'Regular digestion and bowel movements',
      'Normal sleep patterns for age',
      'Good feeding tolerance',
      'Normal weight gain and growth',
    ],
    redFlags: [
      'Persistent blood in stool',
      'Severe reflux affecting growth',
      'Failure to thrive or poor weight gain',
      'Unexplained irritability or distress',
    ],
  },
];

interface WindowActivity {
  date: string;
  windowId: string;
  activity: string;
  notes: string;
}

interface PlasticityEntry {
  date: string;
  windowId: string;
  intensity: number; // 1-5 scale
  notes: string;
}

function getMonthsFromBirth(birthDateStr: string): number {
  try {
    const birth = new Date(birthDateStr);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 +
      (now.getMonth() - birth.getMonth()) +
      (now.getDate() - birth.getDate()) / 30;
    return Math.max(0, Math.min(months, 36));
  } catch {
    return 0;
  }
}

function getWindowStatus(window: PlasticityWindow, babyAgeMonths: number): 'active' | 'closing' | 'imminent' | 'passed' {
  if (babyAgeMonths >= window.maxMonth) return 'passed';
  const monthsLeft = window.maxMonth - babyAgeMonths;
  if (monthsLeft <= 2 && babyAgeMonths >= window.minMonth) return 'closing';
  if (babyAgeMonths >= window.minMonth) return 'active';
  if (window.minMonth - babyAgeMonths <= 1) return 'imminent';
  return 'passed';
}

function getMyelinationProgress(window: PlasticityWindow, babyAgeMonths: number): number {
  if (babyAgeMonths < window.minMonth) return 0;
  if (babyAgeMonths >= window.maxMonth) return 100;
  const range = window.maxMonth - window.minMonth;
  const elapsed = babyAgeMonths - window.minMonth;
  return Math.round((elapsed / range) * 100);
}

function getPruningProgress(window: PlasticityWindow, babyAgeMonths: number): number {
  // Pruning typically begins after peak plasticity and accelerates
  if (babyAgeMonths < window.minMonth) return 0;
  const windowSpan = window.maxMonth - window.minMonth;
  if (windowSpan <= 0) return 0;
  // Peak pruning happens after window closes
  if (babyAgeMonths > window.maxMonth + 6) return 80;
  if (babyAgeMonths > window.maxMonth) {
    const afterPeak = babyAgeMonths - window.maxMonth;
    return Math.min(70, Math.round((afterPeak / 6) * 70));
  }
  // During window: minimal pruning (only weak connections)
  return Math.round((babyAgeMonths - window.minMonth) / windowSpan * 20);
}

export default function NeuroplasticityScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];
  const bg = C.background;
  const cardBg = C.card;
  const textPrimary = C.text;
  const textSecondary = C.muted;

  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [babyAgeMonths, setBabyAgeMonths] = useState<number>(0);
  const [activities, setActivities] = useState<Record<string, WindowActivity[]>>({});
  const [plasticityLog, setPlasticityLog] = useState<Record<string, PlasticityEntry[]>>({});
  const [selectedWindow, setSelectedWindow] = useState<PlasticityWindow | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newActivity, setNewActivity] = useState('');
  const [intensity, setIntensity] = useState<number>(3);

  useEffect(() => {
    loadBirthDate();
    loadActivities();
    loadPlasticityLog();
  }, []);

  const loadBirthDate = async () => {
    try {
      const bd = await safeGetItem(STORAGE_KEYS.BABY_BIRTHDATE);
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

  const loadPlasticityLog = async () => {
    try {
      const raw = await safeGetItem(PLASTICITY_KEY);
      if (raw) setPlasticityLog(JSON.parse(raw));
    } catch {}
  };

  const saveActivities = async (updated: Record<string, WindowActivity[]>) => {
    setActivities(updated);
    await safeSetItem(ACTIVITIES_KEY, JSON.stringify(updated));
  };

  const savePlasticityLog = async (updated: Record<string, PlasticityEntry[]>) => {
    setPlasticityLog(updated);
    await safeSetItem(PLASTICITY_KEY, JSON.stringify(updated));
  };

  const openWindowDetail = (window: PlasticityWindow) => {
    setSelectedWindow(window);
    setModalVisible(true);
  };

  const logActivity = async () => {
    if (!selectedWindow || !newActivity.trim()) return;
    const updated = { ...activities };
    if (!updated[selectedWindow.id]) updated[selectedWindow.id] = [];
    updated[selectedWindow.id].push({
      date: new Date().toISOString().split('T')[0],
      windowId: selectedWindow.id,
      activity: newActivity.trim(),
      notes: '',
    });
    await saveActivities(updated);
    setNewActivity('');
  };

  const logPlasticity = async () => {
    if (!selectedWindow) return;
    const updated = { ...plasticityLog };
    if (!updated[selectedWindow.id]) updated[selectedWindow.id] = [];
    updated[selectedWindow.id].push({
      date: new Date().toISOString().split('T')[0],
      windowId: selectedWindow.id,
      intensity,
      notes: '',
    });
    await savePlasticityLog(updated);
    setIntensity(3);
  };

  const getStatusColor = (status: 'active' | 'closing' | 'imminent' | 'passed') => {
    if (status === 'active') return '#22C55E';
    if (status === 'closing') return '#EF4444';
    if (status === 'imminent') return '#F59E0B';
    return '#9CA3AF';
  };

  const getStatusLabel = (status: 'active' | 'closing' | 'imminent' | 'passed') => {
    if (status === 'active') return t('neuroplasticity.active');
    if (status === 'closing') return t('neuroplasticity.closing');
    if (status === 'imminent') return t('neuroplasticity.imminent');
    return t('neuroplasticity.passed');
  };

  const getClosingWindows = useCallback(() => {
    return PLASTICITY_WINDOWS.filter(w => {
      const status = getWindowStatus(w, babyAgeMonths);
      return status === 'closing';
    });
  }, [babyAgeMonths]);

  const closingWindows = getClosingWindows();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          {t('neuroplasticity.title')}
        </Text>
        <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
          {t('neuroplasticity.subtitle')}
        </Text>
      </View>

      {/* 2-Week Closing Alert */}
      {closingWindows.length > 0 && (
        <TouchableOpacity
          style={[styles.alertCard, { backgroundColor: '#FEE2E2' }]}
          onPress={() => openWindowDetail(closingWindows[0])}
          accessibilityLabel={t('neuroplasticity.closingAlert')}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="alert-circle" size={24} color="#EF4444" />
          <View style={styles.alertContent}>
            <Text style={[styles.alertTitle, { color: '#991B1B' }]}>
              {t('neuroplasticity.closingAlert')}
            </Text>
            <Text style={[styles.alertText, { color: '#991B1B' }]}>
              {closingWindows.map(w => t(`neuroplasticity.${w.labelKey}`)).join(', ')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#991B1B" />
        </TouchableOpacity>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Plasticity Timeline */}
        <View style={[styles.timelineCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            {t('neuroplasticity.timeline')}
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
              {PLASTICITY_WINDOWS.map((window) => {
                const left = (window.minMonth / 12) * (SCREEN_W - 72);
                const width = ((window.maxMonth - window.minMonth) / 12) * (SCREEN_W - 72);
                return (
                  <View
                    key={window.id}
                    style={[
                      styles.periodBand,
                      {
                        backgroundColor: window.color,
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
            {PLASTICITY_WINDOWS.map((window) => (
              <View key={window.id} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: window.color }]} />
                <Text style={[styles.legendText, { color: textSecondary }]}>
                  {t(`neuroplasticity.${window.labelKey}`)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Myelination Wave Tracker */}
        <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            {t('neuroplasticity.myelinationWave')}
          </Text>
          <Text style={[styles.sectionDesc, { color: textSecondary }]}>
            {t('neuroplasticity.myelinationDesc')}
          </Text>
          {PLASTICITY_WINDOWS.map((window) => {
            const progress = getMyelinationProgress(window, babyAgeMonths);
            return (
              <View key={window.id} style={styles.waveRow}>
                <View style={styles.waveLabelRow}>
                  <MaterialCommunityIcons
                    name={progress >= 100 ? 'check-circle' : 'progress-clock'}
                    size={16}
                    color={progress >= 100 ? '#22C55E' : window.color}
                  />
                  <Text style={[styles.waveLabel, { color: textPrimary }]}>
                    {t(`neuroplasticity.${window.labelKey}`)}
                  </Text>
                  <Text style={[styles.wavePercent, { color: textSecondary }]}>
                    {progress}%
                  </Text>
                </View>
                <View style={styles.waveTrack}>
                  <View
                    style={[
                      styles.waveFill,
                      { width: `${progress}%`, backgroundColor: window.color },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Synaptic Pruning Correlation */}
        <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            {t('neuroplasticity.synapticPruning')}
          </Text>
          <Text style={[styles.sectionDesc, { color: textSecondary }]}>
            {t('neuroplasticity.pruningDesc')}
          </Text>
          {PLASTICITY_WINDOWS.filter(w => w.id !== 'sensory_integration').map((window) => {
            const progress = getPruningProgress(window, babyAgeMonths);
            return (
              <View key={window.id} style={styles.waveRow}>
                <View style={styles.waveLabelRow}>
                  <MaterialCommunityIcons
                    name={progress >= 50 ? 'scissors-cutting' : 'connection'}
                    size={16}
                    color={progress >= 50 ? '#F59E0B' : '#3B82F6'}
                  />
                  <Text style={[styles.waveLabel, { color: textPrimary }]}>
                    {t(`neuroplasticity.${window.labelKey}`)}
                  </Text>
                  <Text style={[styles.wavePercent, { color: textSecondary }]}>
                    {progress}%
                  </Text>
                </View>
                <View style={styles.waveTrack}>
                  <View
                    style={[
                      styles.waveFill,
                      { width: `${progress}%`, backgroundColor: progress >= 50 ? '#F59E0B' : '#3B82F6' },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Window Status Cards */}
        <Text style={[styles.sectionTitle, { color: textPrimary, marginHorizontal: 16 }]}>
          {t('neuroplasticity.windows')}
        </Text>
        {PLASTICITY_WINDOWS.map((window) => {
          const status = getWindowStatus(window, babyAgeMonths);
          const windowActivities = activities[window.id] || [];
          return (
            <TouchableOpacity
              key={window.id}
              style={[styles.periodCard, { backgroundColor: cardBg }]}
              onPress={() => openWindowDetail(window)}
              accessibilityLabel={t(`neuroplasticity.${window.labelKey}`)}
              accessibilityRole="button"
            >
              <View style={styles.periodCardHeader}>
                <View style={[styles.periodColorBar, { backgroundColor: window.color }]} />
                <View style={styles.periodCardInfo}>
                  <Text style={[styles.periodName, { color: textPrimary }]}>
                    {t(`neuroplasticity.${window.labelKey}`)}
                  </Text>
                  <Text style={[styles.periodRange, { color: textSecondary }]}>
                    {window.minMonth}-{window.maxMonth} months
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
              {windowActivities.length > 0 && (
                <Text style={[styles.activityCount, { color: textSecondary }]}>
                  {windowActivities.length} {t('neuroplasticity.activitiesLogged')}
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

        {/* Integration Links */}
        <View style={[styles.linksCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            {t('neuroplasticity.relatedTabs')}
          </Text>
          <View style={styles.linksRow}>
            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: bg }]}
              onPress={() => {}}
              accessibilityLabel={t('neuroplasticity.criticalPeriods')}
              accessibilityRole="link"
            >
              <MaterialCommunityIcons name="brain" size={20} color="#3B82F6" />
              <Text style={[styles.linkText, { color: textPrimary }]}>
                {t('neuroplasticity.criticalPeriods')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: bg }]}
              onPress={() => {}}
              accessibilityLabel={t('neuroplasticity.sensoryIntegration')}
              accessibilityRole="link"
            >
              <MaterialCommunityIcons name="head-dots-horizontal" size={20} color="#14B8A6" />
              <Text style={[styles.linkText, { color: textPrimary }]}>
                {t('neuroplasticity.sensoryIntegration')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Window Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: bg }]}>
          {selectedWindow && (
            <>
              <View style={styles.modalHeader}>
                <View style={[styles.modalColorBar, { backgroundColor: selectedWindow.color }]} />
                <View style={styles.modalHeaderContent}>
                  <Text style={[styles.modalTitle, { color: textPrimary }]}>
                    {t(`neuroplasticity.${selectedWindow.labelKey}`)}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                    {selectedWindow.minMonth}-{selectedWindow.maxMonth} months
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
                    {t('neuroplasticity.whatIsIt')}
                  </Text>
                  <Text style={[styles.modalText, { color: textSecondary }]}>
                    {t(`neuroplasticity.${selectedWindow.descriptionKey}`)}
                  </Text>
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('neuroplasticity.whyMatters')}
                  </Text>
                  <Text style={[styles.modalText, { color: textSecondary }]}>
                    {t(`neuroplasticity.${selectedWindow.whyKey}`)}
                  </Text>
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('neuroplasticity.myelinationWave')}
                  </Text>
                  <Text style={[styles.modalText, { color: textSecondary }]}>
                    {t(`neuroplasticity.${selectedWindow.myelinationKey}`)}
                  </Text>
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('neuroplasticity.synapticPruning')}
                  </Text>
                  <Text style={[styles.modalText, { color: textSecondary }]}>
                    {t(`neuroplasticity.${selectedWindow.pruningKey}`)}
                  </Text>
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('neuroplasticity.topActivities')}
                  </Text>
                  {selectedWindow.activities.map((act, i) => (
                    <View key={i} style={styles.activityRow}>
                      <MaterialCommunityIcons name="check-circle" size={16} color="#22C55E" />
                      <Text style={[styles.activityText, { color: textSecondary }]}>{act}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('neuroplasticity.signs')}
                  </Text>
                  {selectedWindow.signs.map((sign, i) => (
                    <View key={i} style={styles.activityRow}>
                      <MaterialCommunityIcons name="eye" size={16} color="#3B82F6" />
                      <Text style={[styles.activityText, { color: textSecondary }]}>{sign}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('neuroplasticity.redFlags')}
                  </Text>
                  {selectedWindow.redFlags.map((flag, i) => (
                    <View key={i} style={styles.activityRow}>
                      <MaterialCommunityIcons name="alert-circle" size={16} color="#EF4444" />
                      <Text style={[styles.activityText, { color: textSecondary }]}>{flag}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('neuroplasticity.logActivity')}
                  </Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[styles.activityInput, { backgroundColor: bg, color: textPrimary, borderColor: textSecondary }]}
                      placeholder={t('neuroplasticity.activityPlaceholder')}
                      placeholderTextColor={textSecondary}
                      value={newActivity}
                      onChangeText={setNewActivity}
                      accessibilityLabel={t('neuroplasticity.activityPlaceholder')}
                    />
                    <TouchableOpacity
                      style={styles.logButton}
                      onPress={logActivity}
                      accessibilityLabel={t('neuroplasticity.log')}
                      accessibilityRole="button"
                    >
                      <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  {(activities[selectedWindow.id] || []).length > 0 && (
                    <View style={styles.loggedList}>
                      {(activities[selectedWindow.id] || []).map((entry, i) => (
                        <View key={i} style={styles.loggedEntry}>
                          <Text style={[styles.loggedDate, { color: textSecondary }]}>{entry.date}</Text>
                          <Text style={[styles.loggedActivity, { color: textPrimary }]}>{entry.activity}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('neuroplasticity.plasticityIntensity')}
                  </Text>
                  <View style={styles.intensityRow}>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.intensityButton,
                          {
                            backgroundColor: intensity === level ? selectedWindow.color : bg,
                            borderColor: selectedWindow.color,
                          },
                        ]}
                        onPress={() => setIntensity(level)}
                        accessibilityLabel={`${level} ${t('neuroplasticity.intensityLevel')}`}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            styles.intensityText,
                            { color: intensity === level ? '#fff' : selectedWindow.color },
                          ]}
                        >
                          {level}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[styles.logButton, { marginTop: 12, alignSelf: 'flex-start' }]}
                    onPress={logPlasticity}
                    accessibilityLabel={t('neuroplasticity.logIntensity')}
                    accessibilityRole="button"
                  >
                    <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                    <Text style={styles.logButtonText}>{t('neuroplasticity.logIntensity')}</Text>
                  </TouchableOpacity>
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
  alertCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertContent: { flex: 1, marginLeft: 12 },
  alertTitle: { fontSize: 14, fontWeight: '600' },
  alertText: { fontSize: 12, marginTop: 2 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  timelineCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 16 },
  sectionCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  sectionDesc: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
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
  waveRow: { marginBottom: 12 },
  waveLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  waveLabel: { fontSize: 13, marginLeft: 8, flex: 1 },
  wavePercent: { fontSize: 12, fontWeight: '600' },
  waveTrack: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  waveFill: { height: '100%', borderRadius: 4 },
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
  linksCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 16 },
  linksRow: { flexDirection: 'row', gap: 12 },
  linkButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, gap: 8 },
  linkText: { fontSize: 13, fontWeight: '500' },
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
  logButton: { backgroundColor: '#22C55E', borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  logButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  loggedList: { marginTop: 12 },
  loggedEntry: { flexDirection: 'row', marginBottom: 8 },
  loggedDate: { fontSize: 12, width: 80 },
  loggedActivity: { fontSize: 13, flex: 1 },
  intensityRow: { flexDirection: 'row', gap: 8 },
  intensityButton: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  intensityText: { fontSize: 14, fontWeight: '600' },
  intensityLevel: { fontSize: 12 },
});
