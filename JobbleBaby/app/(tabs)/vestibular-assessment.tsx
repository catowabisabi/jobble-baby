import { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  Dimensions, Modal, TextInput, Alert,
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
const VESTIBULAR_KEY = STORAGE_KEYS.VESTIBULAR_ENTRIES;

interface Milestone {
  id: string;
  labelKey: string;
  color: string;
  minMonth: number;
  maxMonth: number;
  descriptionKey: string;
  activities: string[];
  signs: string[];
  redFlags: string[];
}

const MILESTONES: Milestone[] = [
  {
    id: 'tilt_sensitivity',
    labelKey: 'vestibularAssessment.tiltSensitivity',
    color: '#8B5CF6',
    minMonth: 0,
    maxMonth: 2,
    descriptionKey: 'vestibularAssessment.tiltSensitivityDesc',
    activities: [
      'Gentle rocking in arms',
      'Carry baby in different positions',
      'Slow, deliberate position changes',
    ],
    signs: [
      'Calms with gentle movement',
      'Responds to tilting motions',
      'Head lag decreases by 2 months',
    ],
    redFlags: [
      'Severe head lag past 4 months',
      'No response to movement by 3 months',
      'Excessive startle reflex',
    ],
  },
  {
    id: 'head_righting',
    labelKey: 'vestibularAssessment.headRighting',
    color: '#3B82F6',
    minMonth: 1,
    maxMonth: 3,
    descriptionKey: 'vestibularAssessment.headRightingDesc',
    activities: [
      'Supported sitting with head control practice',
      'Gentle traction pull to sit',
      'Vertical bouncing with support',
    ],
    signs: [
      'Holds head steady when upright',
      'Lifts head during tummy time',
      'Head lags less when pulled to sit',
    ],
    redFlags: [
      'No head control by 4 months',
      'Persistent head lag when pulled to sit',
      'Asymmetric head position',
    ],
  },
  {
    id: 'labyrinthine_righting',
    labelKey: 'vestibularAssessment.labyrinthineRighting',
    color: '#14B8A6',
    minMonth: 2,
    maxMonth: 4,
    descriptionKey: 'vestibularAssessment.labyrinthineRightingDesc',
    activities: [
      'Rolling practice both directions',
      'Supported standing with weight shifting',
      'Gentle swing toys',
    ],
    signs: [
      'Initiates rolling movements',
      'Reacts to changes in position',
      'Adjusts posture when tilted',
    ],
    redFlags: [
      'No rolling by 5 months',
      'Unable to hold head steady when seated',
      'No reaction to position changes',
    ],
  },
  {
    id: 'roll_reflex_integration',
    labelKey: 'vestibularAssessment.rollReflex',
    color: '#22C55E',
    minMonth: 3,
    maxMonth: 5,
    descriptionKey: 'vestibularAssessment.rollReflexDesc',
    activities: [
      'Tummy time with玩具引导',
      'Side-lying play',
      'Encourage reaching across midline',
    ],
    signs: [
      'Smooth rolling from tummy to back',
      'Rotates trunk during movement',
      'Symmetrical movement patterns',
    ],
    redFlags: [
      'Asymmetric rolling only',
      'No trunk rotation by 6 months',
      'Persistent scissoring of legs',
    ],
  },
  {
    id: 'postural_security',
    labelKey: 'vestibularAssessment.posturalSecurity',
    color: '#F59E0B',
    minMonth: 4,
    maxMonth: 8,
    descriptionKey: 'vestibularAssessment.posturalSecurityDesc',
    activities: [
      'Independent sitting practice',
      'Cruising along furniture',
      'Gentle push-pull toys',
    ],
    signs: [
      'Sits independently without support',
      'Uses arms to catch self when losing balance',
      'Transitions between positions',
    ],
    redFlags: [
      'Cannot sit with support by 6 months',
      'No crawling or scooting by 9 months',
      'Persistent use of one side only',
    ],
  },
  {
    id: 'vestibular_proprioceptive',
    labelKey: 'vestibularAssessment.vestibularProprioceptive',
    color: '#EC4899',
    minMonth: 6,
    maxMonth: 12,
    descriptionKey: 'vestibularAssessment.vestibularProprioceptiveDesc',
    activities: [
      'Climbing on soft surfaces',
      'Balance activities on stability ball',
      'Dance and rhythm activities',
    ],
    signs: [
      'Shows interest in movement challenges',
      'Adapts posture to uneven surfaces',
      'Enjoys swinging and climbing',
    ],
    redFlags: [
      'Fear of movement past 9 months',
      'Cannot stand with support by 10 months',
      'Significant balance issues beyond peers',
    ],
  },
];

type ObservedBehavior = 'observed' | 'partial' | 'not_yet';

interface VestibularEntry {
  id: string;
  date: string;
  observedBehavior: ObservedBehavior;
  notes: string;
  babyAgeMonths: number;
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

function getMilestoneStatus(milestone: Milestone, babyAgeMonths: number): 'active' | 'imminent' | 'passed' {
  if (babyAgeMonths >= milestone.maxMonth) return 'passed';
  if (babyAgeMonths >= milestone.minMonth) return 'active';
  if (milestone.minMonth - babyAgeMonths <= 0.5) return 'imminent';
  return 'passed';
}

function getStatusColor(status: 'active' | 'imminent' | 'passed'): string {
  if (status === 'active') return '#22C55E';
  if (status === 'imminent') return '#F59E0B';
  return '#9CA3AF';
}

export default function VestibularAssessmentScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];
  const bg = C.background;
  const cardBg = C.card;
  const textPrimary = C.text;
  const textSecondary = C.muted;

  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [babyAgeMonths, setBabyAgeMonths] = useState<number>(0);
  const [entries, setEntries] = useState<Record<string, VestibularEntry[]>>({});
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBehavior, setSelectedBehavior] = useState<ObservedBehavior>('observed');
  const [entryNotes, setEntryNotes] = useState('');

  useEffect(() => {
    loadBirthDate();
    loadEntries();
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

  const loadEntries = async () => {
    try {
      const raw = await safeGetItem(VESTIBULAR_KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch {}
  };

  const saveEntries = async (updated: Record<string, VestibularEntry[]>) => {
    setEntries(updated);
    try {
      await safeSetItem(VESTIBULAR_KEY, JSON.stringify(updated));
    } catch {}
  };

  const openMilestoneDetail = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setSelectedBehavior('observed');
    setEntryNotes('');
    setModalVisible(true);
  };

  const logCheckIn = async () => {
    if (!selectedMilestone) return;
    const entry: VestibularEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      observedBehavior: selectedBehavior,
      notes: entryNotes.trim(),
      babyAgeMonths,
    };
    const updated = { ...entries };
    if (!updated[selectedMilestone.id]) updated[selectedMilestone.id] = [];
    updated[selectedMilestone.id].push(entry);
    await saveEntries(updated);
    setModalVisible(false);
  };

  const getRedFlagAlerts = (): Milestone[] => {
    return MILESTONES.filter((m) => {
      const status = getMilestoneStatus(m, babyAgeMonths);
      if (status !== 'passed') return false;
      const milestoneEntries = entries[m.id] || [];
      if (milestoneEntries.length === 0) return true;
      const lastEntry = milestoneEntries[milestoneEntries.length - 1];
      return lastEntry.observedBehavior !== 'observed' && (babyAgeMonths - m.maxMonth) > 2;
    });
  };

  const getProgressCoverage = (): number => {
    const milestonesWithEntries = MILESTONES.filter((m) => (entries[m.id] || []).length > 0).length;
    return Math.round((milestonesWithEntries / MILESTONES.length) * 100);
  };

  const getMilestoneCoverage = (milestoneId: string): number => {
    const milestoneEntries = entries[milestoneId] || [];
    return milestoneEntries.length;
  };

  const alerts = getRedFlagAlerts();
  const progressCoverage = getProgressCoverage();

  const behaviorOptions: { value: ObservedBehavior; labelKey: string; color: string }[] = [
    { value: 'observed', labelKey: 'vestibularAssessment.observed', color: '#22C55E' },
    { value: 'partial', labelKey: 'vestibularAssessment.partial', color: '#F59E0B' },
    { value: 'not_yet', labelKey: 'vestibularAssessment.notYet', color: '#EF4444' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          {t('vestibularAssessment.title')}
        </Text>
        <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
          {t('vestibularAssessment.subtitle')}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Progress Dashboard */}
        <View style={[styles.dashboardCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            {t('vestibularAssessment.progressDashboard')}
          </Text>
          <View style={styles.progressRow}>
            <View style={[styles.progressCircle, { borderColor: '#3B82F6' }]}>
              <Text style={[styles.progressPercent, { color: '#3B82F6' }]}>{progressCoverage}%</Text>
            </View>
            <View style={styles.progressInfo}>
              <Text style={[styles.progressLabel, { color: textSecondary }]}>
                {t('vestibularAssessment.windowsCovered')}
              </Text>
              <Text style={[styles.progressSubtext, { color: textSecondary }]}>
                {MILESTONES.filter((m) => (entries[m.id] || []).length > 0).length}/{MILESTONES.length} {t('vestibularAssessment.milestonesLogged')}
              </Text>
            </View>
          </View>
        </View>

        {/* Red Flag Alerts */}
        {alerts.length > 0 && (
          <View style={[styles.alertCard, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
            <View style={styles.alertHeader}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.alertTitle}>{t('vestibularAssessment.redFlagAlert')}</Text>
            </View>
            <Text style={styles.alertText}>
              {t('vestibularAssessment.delayedMilestones')}: {alerts.map((a) => t(a.labelKey)).join(', ')}
            </Text>
          </View>
        )}

        {/* Timeline */}
        <View style={[styles.timelineCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            {t('vestibularAssessment.timeline')}
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
              {MILESTONES.map((milestone) => {
                const left = (milestone.minMonth / 12) * (SCREEN_W - 72);
                const width = ((milestone.maxMonth - milestone.minMonth) / 12) * (SCREEN_W - 72);
                const status = getMilestoneStatus(milestone, babyAgeMonths);
                return (
                  <View
                    key={milestone.id}
                    style={[
                      styles.periodBand,
                      {
                        backgroundColor: milestone.color,
                        left,
                        width: Math.max(width, 8),
                        opacity: status === 'passed' ? 0.4 : 0.8,
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
            {MILESTONES.map((milestone) => (
              <View key={milestone.id} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: milestone.color }]} />
                <Text style={[styles.legendText, { color: textSecondary }]} numberOfLines={1}>
                  {t(milestone.labelKey)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Milestone Cards */}
        <Text style={[styles.sectionTitle, { color: textPrimary, marginHorizontal: 16 }]}>
          {t('vestibularAssessment.milestones')}
        </Text>
        {MILESTONES.map((milestone) => {
          const status = getMilestoneStatus(milestone, babyAgeMonths);
          const coverage = getMilestoneCoverage(milestone.id);
          const isAlert = alerts.includes(milestone);
          return (
            <TouchableOpacity
              key={milestone.id}
              style={[
                styles.milestoneCard,
                { backgroundColor: cardBg },
                isAlert && { borderColor: '#EF4444', borderWidth: 1 },
              ]}
              onPress={() => openMilestoneDetail(milestone)}
              accessibilityLabel={t(milestone.labelKey)}
              accessibilityRole="button"
            >
              <View style={styles.milestoneCardHeader}>
                <View style={[styles.milestoneColorBar, { backgroundColor: milestone.color }]} />
                <View style={styles.milestoneCardInfo}>
                  <Text style={[styles.milestoneName, { color: textPrimary }]}>
                    {t(milestone.labelKey)}
                  </Text>
                  <Text style={[styles.milestoneRange, { color: textSecondary }]}>
                    {milestone.minMonth}-{milestone.maxMonth} {t('vestibularAssessment.months')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(status) + '30' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
                    {status === 'active' ? t('vestibularAssessment.active') :
                     status === 'imminent' ? t('vestibularAssessment.imminent') :
                     t('vestibularAssessment.passed')}
                  </Text>
                </View>
              </View>
              {coverage > 0 && (
                <Text style={[styles.coverageCount, { color: textSecondary }]}>
                  {coverage} {t('vestibularAssessment.checkIns')}
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

      {/* Milestone Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: bg }]}>
          {selectedMilestone && (
            <>
              <View style={styles.modalHeader}>
                <View style={[styles.modalColorBar, { backgroundColor: selectedMilestone.color }]} />
                <View style={styles.modalHeaderContent}>
                  <Text style={[styles.modalTitle, { color: textPrimary }]}>
                    {t(selectedMilestone.labelKey)}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                    {selectedMilestone.minMonth}-{selectedMilestone.maxMonth} {t('vestibularAssessment.months')}
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
                    {t('vestibularAssessment.whatIsIt')}
                  </Text>
                  <Text style={[styles.modalText, { color: textSecondary }]}>
                    {t(selectedMilestone.descriptionKey)}
                  </Text>
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('vestibularAssessment.activitySuggestions')}
                  </Text>
                  {selectedMilestone.activities.map((act, i) => (
                    <View key={i} style={styles.activityRow}>
                      <MaterialCommunityIcons name="check-circle" size={16} color="#22C55E" />
                      <Text style={[styles.activityText, { color: textSecondary }]}>{act}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('vestibularAssessment.signs')}
                  </Text>
                  {selectedMilestone.signs.map((sign, i) => (
                    <View key={i} style={styles.activityRow}>
                      <MaterialCommunityIcons name="eye" size={16} color="#3B82F6" />
                      <Text style={[styles.activityText, { color: textSecondary }]}>{sign}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('vestibularAssessment.redFlags')}
                  </Text>
                  {selectedMilestone.redFlags.map((flag, i) => (
                    <View key={i} style={styles.activityRow}>
                      <MaterialCommunityIcons name="alert-circle" size={16} color="#EF4444" />
                      <Text style={[styles.activityText, { color: textSecondary }]}>{flag}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.modalSection, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>
                    {t('vestibularAssessment.logCheckIn')}
                  </Text>
                  <Text style={[styles.modalLabel, { color: textSecondary }]}>
                    {t('vestibularAssessment.observedBehavior')}
                  </Text>
                  <View style={styles.behaviorRow}>
                    {behaviorOptions.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.behaviorOption,
                          { borderColor: textSecondary },
                          selectedBehavior === opt.value && { backgroundColor: opt.color, borderColor: opt.color },
                        ]}
                        onPress={() => setSelectedBehavior(opt.value)}
                        accessibilityLabel={t(opt.labelKey)}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            styles.behaviorText,
                            { color: textSecondary },
                            selectedBehavior === opt.value && { color: '#fff' },
                          ]}
                        >
                          {t(opt.labelKey)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={[
                      styles.notesInput,
                      { backgroundColor: bg, color: textPrimary, borderColor: textSecondary },
                    ]}
                    placeholder={t('vestibularAssessment.notesPlaceholder')}
                    placeholderTextColor={textSecondary}
                    value={entryNotes}
                    onChangeText={setEntryNotes}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.logButton}
                    onPress={logCheckIn}
                    accessibilityLabel={t('vestibularAssessment.log')}
                    accessibilityRole="button"
                  >
                    <Text style={styles.logButtonText}>{t('vestibularAssessment.log')}</Text>
                  </TouchableOpacity>

                  {(entries[selectedMilestone.id] || []).length > 0 && (
                    <View style={styles.historyList}>
                      <Text style={[styles.historyTitle, { color: textPrimary }]}>
                        {t('vestibularAssessment.history')}
                      </Text>
                      {(entries[selectedMilestone.id] || []).map((entry, i) => (
                        <View key={entry.id} style={styles.historyEntry}>
                          <View style={[styles.historyDot, { backgroundColor: behaviorOptions.find((o) => o.value === entry.observedBehavior)?.color || '#9CA3AF' }]} />
                          <View style={styles.historyContent}>
                            <Text style={[styles.historyDate, { color: textSecondary }]}>
                              {entry.date} · {Math.round(entry.babyAgeMonths)}mo
                            </Text>
                            <Text style={[styles.historyBehavior, { color: textPrimary }]}>
                              {t(behaviorOptions.find((o) => o.value === entry.observedBehavior)?.labelKey || '')}
                            </Text>
                            {entry.notes && (
                              <Text style={[styles.historyNotes, { color: textSecondary }]}>
                                {entry.notes}
                              </Text>
                            )}
                          </View>
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
  dashboardCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  progressPercent: { fontSize: 18, fontWeight: '700' },
  progressInfo: { flex: 1 },
  progressLabel: { fontSize: 14, fontWeight: '600' },
  progressSubtext: { fontSize: 12, marginTop: 2 },
  alertCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 14, borderWidth: 1, borderLeftWidth: 4 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  alertText: { fontSize: 13, color: '#7F1D1D', lineHeight: 18 },
  timelineCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 16 },
  timeline: { height: 60, position: 'relative', marginBottom: 8 },
  timelineTrack: { flexDirection: 'row', justifyContent: 'space-between', position: 'absolute', bottom: 0, left: 0, right: 0 },
  timelineMarker: { alignItems: 'center' },
  timelineLabel: { fontSize: 10 },
  periodBands: { position: 'absolute', top: 10, left: 0, right: 0, height: 24 },
  periodBand: { position: 'absolute', height: 24, borderRadius: 4 },
  babyMarker: { position: 'absolute', top: 0, alignItems: 'center' },
  babyMarkerIcon: { fontSize: 20 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  legendText: { fontSize: 9 },
  milestoneCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center' },
  milestoneCardHeader: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  milestoneColorBar: { width: 4, height: 40, borderRadius: 2, marginRight: 10 },
  milestoneCardInfo: { flex: 1 },
  milestoneName: { fontSize: 15, fontWeight: '600' },
  milestoneRange: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  coverageCount: { fontSize: 11, marginTop: 4 },
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
  modalLabel: { fontSize: 13, marginBottom: 8 },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  activityText: { fontSize: 13, marginLeft: 8, flex: 1, lineHeight: 18 },
  behaviorRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  behaviorOption: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  behaviorText: { fontSize: 12, fontWeight: '600' },
  notesInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, minHeight: 60, marginBottom: 12, textAlignVertical: 'top' },
  logButton: { backgroundColor: '#22C55E', borderRadius: 8, padding: 14, alignItems: 'center' },
  logButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  historyList: { marginTop: 16 },
  historyTitle: { fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase' },
  historyEntry: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  historyDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10, marginTop: 4 },
  historyContent: { flex: 1 },
  historyDate: { fontSize: 11 },
  historyBehavior: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  historyNotes: { fontSize: 12, marginTop: 2, fontStyle: 'italic' },
});