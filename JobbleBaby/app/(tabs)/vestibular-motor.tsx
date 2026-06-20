import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const VESTIBULAR_SESSIONS_KEY = STORAGE_KEYS.VESTIBULAR_SESSIONS;
const VESTIBULAR_MOTOR_KEY = '@jobble/vestibular_motor_correlation';
const GROWTH_VELOCITY_KEY = STORAGE_KEYS.GROWTH_VELOCITY_DATA;
const PROFILE_KEY = '@jobble_baby_profile';

const VEST_BLUE = '#3B82F6';
const VEST_GREEN = '#10B981';
const VEST_AMBER = '#F59E0B';
const VEST_RED = '#EF4444';
const VEST_PURPLE = '#8B5CF6';

type ActivityType = 'rocking_vertical' | 'rocking_horizontal' | 'side_to_side' | 'bouncing' | 'swinging' | 'tummy_time';
type Intensity = 'low' | 'medium' | 'high';
type FeedingOutcome = 'spitting_up' | 'constipation' | 'gas' | 'normal';
type MotorMilestone = 'head_control' | 'rolling' | 'sitting' | 'crawling' | 'none';

interface VestibularSession {
  id: string;
  date: string;
  duration_min: number;
  activity_type: ActivityType;
  intensity: Intensity;
  post_sleep_quality?: number;
  post_feeding_outcome?: FeedingOutcome;
  timestamp: string;
  babyAgeMonths: number;
}

interface MotorCorrelation {
  id: string;
  date: string;
  motor_milestone: MotorMilestone;
  vestibular_activity_min: number;
  timestamp: string;
}

interface GrowthVelocityEntry {
  date: string;
  velocity: number;
}

function calculateAgeInMonths(birthDate: string): number {
  try {
    const birth = new Date(birthDate);
    const now = new Date();
    const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    return days / 30.44;
  } catch {
    return 0;
  }
}

function getDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getIntensityScore(intensity: Intensity): number {
  switch (intensity) {
    case 'low': return 1;
    case 'medium': return 2;
    case 'high': return 3;
  }
}

function getActivityIcon(type: ActivityType): string {
  switch (type) {
    case 'rocking_vertical': return 'arrow-collapse-vertical';
    case 'rocking_horizontal': return 'arrow-collapse-horizontal';
    case 'side_to_side': return 'swap-horizontal';
    case 'bouncing': return 'human-handsup';
    case 'swinging': return 'play';
    case 'tummy_time': return 'human-handsup';
  }
}

function getActivityLabel(key: string, t: (k: string) => string): string {
  const map: Record<ActivityType, string> = {
    rocking_vertical: t('vestibularMotor.rockingVertical'),
    rocking_horizontal: t('vestibularMotor.rockingHorizontal'),
    side_to_side: t('vestibularMotor.sideToSide'),
    bouncing: t('vestibularMotor.bouncing'),
    swinging: t('vestibularMotor.swinging'),
    tummy_time: t('vestibularMotor.tummyTimeActive'),
  };
  return map[key as ActivityType] || key;
}

function getIntensityColor(intensity: Intensity): string {
  switch (intensity) {
    case 'low': return VEST_GREEN;
    case 'medium': return VEST_AMBER;
    case 'high': return VEST_RED;
  }
}

function getFeedingIcon(outcome: FeedingOutcome): string {
  switch (outcome) {
    case 'spitting_up': return 'water';
    case 'constipation': return 'alert-circle-outline';
    case 'gas': return 'weather-windy';
    case 'normal': return 'check-circle';
  }
}

function getFeedingColor(outcome: FeedingOutcome): string {
  switch (outcome) {
    case 'spitting_up': return VEST_AMBER;
    case 'constipation': return VEST_RED;
    case 'gas': return VEST_PURPLE;
    case 'normal': return VEST_GREEN;
  }
}

function getMotorMilestoneLabel(key: MotorMilestone, t: (k: string) => string): string {
  switch (key) {
    case 'head_control': return t('vestibularMotor.headControl');
    case 'rolling': return t('vestibularMotor.rolling');
    case 'sitting': return t('vestibularMotor.sitting');
    case 'crawling': return t('vestibularMotor.crawling');
    default: return t('vestibularMotor.noMilestone');
  }
}

function getMotorColor(milestone: MotorMilestone): string {
  switch (milestone) {
    case 'head_control': return VEST_BLUE;
    case 'rolling': return VEST_GREEN;
    case 'sitting': return VEST_AMBER;
    case 'crawling': return VEST_PURPLE;
    default: return '#8b9bb4';
  }
}

export default function VestibularMotorScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [sessions, setSessions] = useState<VestibularSession[]>([]);
  const [motorCorrelations, setMotorCorrelations] = useState<MotorCorrelation[]>([]);
  const [growthVelocity, setGrowthVelocity] = useState<GrowthVelocityEntry[]>([]);
  const [babyAgeMonths, setBabyAgeMonths] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [durationMin, setDurationMin] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('rocking_vertical');
  const [intensity, setIntensity] = useState<Intensity>('medium');
  const [postSleepQuality, setPostSleepQuality] = useState<number | null>(null);
  const [postFeedingOutcome, setPostFeedingOutcome] = useState<FeedingOutcome | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [selectedMotorMilestone, setSelectedMotorMilestone] = useState<MotorMilestone>('head_control');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [raw, motorRaw, velocityRaw, profileRaw] = await Promise.all([
        safeGetItem(VESTIBULAR_SESSIONS_KEY),
        safeGetItem(VESTIBULAR_MOTOR_KEY),
        safeGetItem(GROWTH_VELOCITY_KEY),
        safeGetItem(PROFILE_KEY),
      ]);
      if (raw) setSessions(JSON.parse(raw));
      if (motorRaw) setMotorCorrelations(JSON.parse(motorRaw));
      if (velocityRaw) setGrowthVelocity(JSON.parse(velocityRaw));
      if (profileRaw) {
        const profile = JSON.parse(profileRaw);
        if (profile.birthDate) {
          setBabyAgeMonths(calculateAgeInMonths(profile.birthDate));
        }
      }
    } catch {}
  };

  const latestSession = sessions.length > 0 ? sessions[0] : null;
  const isInOptimalWindow = babyAgeMonths >= 4 && babyAgeMonths <= 8;

  const last14Days = (() => {
    const days: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  })();

  const loadingCurveData = last14Days.map((day) => {
    const daySessions = sessions.filter((s) => s.date === day);
    const totalScore = daySessions.reduce((sum, s) => sum + getIntensityScore(s.intensity), 0);
    return { date: day, score: totalScore };
  });

  const avgLoadingScore = loadingCurveData.length > 0
    ? loadingCurveData.reduce((sum, d) => sum + d.score, 0) / loadingCurveData.length
    : 0;

  const sleepData = sessions.filter((s) => s.post_sleep_quality != null);

  const openForm = () => {
    setDurationMin('');
    setActivityType('rocking_vertical');
    setIntensity('medium');
    setPostSleepQuality(null);
    setPostFeedingOutcome(null);
    setShowForm(true);
  };

  const saveEntry = async () => {
    const dur = parseInt(durationMin || '0', 10);
    if (dur <= 0) return;

    const entry: VestibularSession = {
      id: Date.now().toString(),
      date: getDateStr(),
      duration_min: dur,
      activity_type: activityType,
      intensity,
      timestamp: new Date().toISOString(),
      babyAgeMonths,
    };

    const updated = [entry, ...sessions].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setSessions(updated);
    setPendingSessionId(entry.id);
    setShowForm(false);
    setShowPostForm(true);

    try {
      await safeSetItem(VESTIBULAR_SESSIONS_KEY, JSON.stringify(updated));
    } catch {}
  };

  const savePostData = async () => {
    if (!pendingSessionId) return;

    const updated = sessions.map((s) => {
      if (s.id === pendingSessionId) {
        return {
          ...s,
          post_sleep_quality: postSleepQuality ?? undefined,
          post_feeding_outcome: postFeedingOutcome ?? undefined,
        };
      }
      return s;
    });

    setSessions(updated);
    setShowPostForm(false);
    setPendingSessionId(null);

    try {
      await safeSetItem(VESTIBULAR_SESSIONS_KEY, JSON.stringify(updated));
    } catch {}
  };

  const activityTypes: ActivityType[] = ['rocking_vertical', 'rocking_horizontal', 'side_to_side', 'bouncing', 'swinging', 'tummy_time'];
  const intensities: Intensity[] = ['low', 'medium', 'high'];
  const sleepOptions = [1, 2, 3, 4, 5];
  const feedingOptions: FeedingOutcome[] = ['normal', 'spitting_up', 'constipation', 'gas'];
  const motorMilestones: MotorMilestone[] = ['head_control', 'rolling', 'sitting', 'crawling'];

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
    sectionTitle: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 16 },
    optimalBanner: {
      backgroundColor: '#ECFDF5',
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: VEST_GREEN,
      borderLeftWidth: 4,
    },
    optimalTitle: { fontSize: 14, fontWeight: '700', color: VEST_GREEN, marginBottom: 4 },
    optimalText: { fontSize: 13, color: '#065F46', lineHeight: 18 },
    windowBanner: {
      backgroundColor: '#FEF3C7',
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: VEST_AMBER,
      borderLeftWidth: 4,
    },
    windowTitle: { fontSize: 14, fontWeight: '700', color: VEST_AMBER, marginBottom: 4 },
    windowText: { fontSize: 13, color: '#92400E', lineHeight: 18 },
    integrationCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    integrationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    integrationIcon: { fontSize: 28, marginRight: 12 },
    integrationTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    integrationSubtitle: { fontSize: 13, color: C.muted },
    milestoneCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.border,
    },
    milestoneHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    milestoneIcon: { fontSize: 24, marginRight: 10 },
    milestoneName: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },
    milestoneAge: { fontSize: 12, color: VEST_AMBER, fontWeight: '600' },
    milestoneDesc: { fontSize: 13, color: C.muted, lineHeight: 18 },
    chartCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    chartTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
    chartContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 4 },
    chartBar: { flex: 1, borderRadius: 4, minHeight: 4 },
    baselineLine: { height: 1, backgroundColor: C.border, marginVertical: 8 },
    baselineLabel: { fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 4 },
    correlationCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.border,
    },
    correlationTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 8 },
    correlationRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    correlationLabel: { fontSize: 13, color: C.muted },
    correlationValue: { fontSize: 13, fontWeight: '600', color: C.text },
    feedingRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    feedingIcon: { alignItems: 'center', padding: 8 },
    feedingIconText: { fontSize: 20, marginBottom: 2 },
    feedingIconLabel: { fontSize: 10, color: C.muted },
    historyCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
    entryIcon: { fontSize: 22, marginRight: 10 },
    entryInfo: { flex: 1 },
    entryType: { fontSize: 14, fontWeight: '600', color: C.text },
    entryNote: { fontSize: 12, color: C.muted, marginTop: 2 },
    entryDuration: { fontSize: 14, fontWeight: '700', color: VEST_BLUE },
    entryTime: { fontSize: 12, color: C.muted },
    formCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: VEST_BLUE,
    },
    formTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 14 },
    formLabel: { fontSize: 13, fontWeight: '600', color: C.muted, marginBottom: 6 },
    formInput: {
      backgroundColor: C.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      padding: 12,
      fontSize: 14,
      color: C.text,
      marginBottom: 12,
    },
    activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    activityOption: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.background,
      gap: 6,
    },
    activityOptionSelected: { borderColor: VEST_BLUE, backgroundColor: VEST_BLUE },
    activityOptionText: { fontSize: 12, color: C.muted },
    activityOptionTextSelected: { color: '#fff' },
    intensityRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    intensityOption: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.background,
    },
    intensityOptionSelected: { borderColor: VEST_BLUE },
    intensityOptionText: { fontSize: 13, fontWeight: '600', color: C.muted },
    intensityOptionTextSelected: { color: '#fff' },
    sleepRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    sleepOption: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.background,
    },
    sleepOptionSelected: { borderColor: VEST_PURPLE, backgroundColor: VEST_PURPLE },
    sleepOptionText: { fontSize: 13, fontWeight: '600', color: C.muted },
    sleepOptionTextSelected: { color: '#fff' },
    feedingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    feedingOption: {
      flex: 1,
      minWidth: 70,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.background,
      gap: 4,
    },
    feedingOptionSelected: { borderColor: VEST_BLUE },
    feedingOptionText: { fontSize: 11, fontWeight: '600', color: C.muted },
    formBtnRow: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    cancelBtnText: { fontSize: 14, fontWeight: '600', color: C.muted },
    saveBtn: { flex: 1, backgroundColor: VEST_BLUE, borderRadius: 12, padding: 14, alignItems: 'center' },
    saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    emptyState: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 6 },
    emptyText: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 },
    infoCard: { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: VEST_BLUE },
    infoTitle: { fontSize: 13, fontWeight: '700', color: VEST_BLUE, marginBottom: 6 },
    infoText: { fontSize: 13, color: '#1E40AF', lineHeight: 18 },
    sleepChartCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    sleepChartTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
    sleepBars: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 6 },
    sleepBar: { flex: 1, borderRadius: 4, minHeight: 4 },
    sleepBarLabel: { fontSize: 9, color: C.muted, textAlign: 'center', marginTop: 4 },
  });

  const maxChartScore = Math.max(...loadingCurveData.map((d) => d.score), 1);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('vestibularMotor.greeting') || 'Movement-Dination'}</Text>
          <Text style={styles.title}>{t('vestibularMotor.title') || 'Vestibular-Motor'}</Text>
          <Text style={styles.subtitle}>
            {babyAgeMonths > 0
              ? `${Math.round(babyAgeMonths)} ${t('vestibularMotor.monthsOld') || 'months old'} · ${t('vestibularMotor.subtitle')}`
              : t('vestibularMotor.subtitle')}
          </Text>
        </View>

        {isInOptimalWindow && (
          <View style={styles.optimalBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
              <MaterialCommunityIcons name="information" size={16} color={VEST_GREEN} />
              <Text style={styles.optimalTitle}>{t('vestibularMotor.optimalWindowTitle') || 'Optimal Vestibular Window'}</Text>
            </View>
            <Text style={styles.optimalText}>
              {t('vestibularMotor.optimalWindowBody') || 'Baby is in the 4-8 month peak vestibular integration window. Regular vestibular activities support rolling and sitting milestone development.'}
            </Text>
          </View>
        )}

        {!isInOptimalWindow && babyAgeMonths > 0 && (
          <View style={styles.windowBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={VEST_AMBER} />
              <Text style={styles.windowTitle}>{t('vestibularMotor.windowTitle') || 'Vestibular Development Window'}</Text>
            </View>
            <Text style={styles.windowText}>
              {t('vestibularMotor.windowBody') || 'Peak vestibular integration for rolling/sitting is 4-8 months. Current age: ' + Math.round(babyAgeMonths) + ' months.'}
            </Text>
          </View>
        )}

        {sessions.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="human-handsup" size={48} color={C.muted} />
            <Text style={styles.emptyTitle}>{t('vestibularMotor.emptyTitle') || 'Track Vestibular Activity'}</Text>
            <Text style={styles.emptyText}>
              {t('vestibularMotor.emptyBody') || 'Log rocking, bouncing, swinging, and tummy time activities to track vestibular-motor development and correlations.'}
            </Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('vestibularMotor.aboutTitle') || 'About Vestibular-Motor Integration'}</Text>
          <Text style={styles.infoText}>
            {t('vestibularMotor.aboutText') || 'The vestibular system controls balance and spatial orientation. Integration with motor development supports head control, rolling, sitting, and crawling milestones.'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{t('vestibularMotor.loadingCurve') || '14-Day Loading Curve'}</Text>
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{t('vestibularMotor.intensityOverTime') || 'Vestibular Intensity (14 Days)'}</Text>
          <View style={styles.chartContainer}>
            {loadingCurveData.map((d, i) => {
              const height = Math.max((d.score / maxChartScore) * 80, 4);
              return (
                <View key={i} style={[styles.chartBar, { height, backgroundColor: d.score > 0 ? VEST_BLUE : C.border }]} />
              );
            })}
          </View>
          <View style={styles.baselineLine} />
          <Text style={styles.baselineLabel}>{t('vestibularMotor.baseline') || 'Baseline'}: {avgLoadingScore.toFixed(1)} {t('vestibularMotor.avgScore') || 'avg score'}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('vestibularMotor.sleepCorrelation') || 'Sleep-Vestibular Correlation'}</Text>
        <View style={styles.sleepChartCard}>
          <Text style={styles.sleepChartTitle}>{t('vestibularMotor.sleepQualityAfter') || 'Sleep Quality After Activity'}</Text>
          {sleepData.length === 0 ? (
            <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 16 }}>
              {t('vestibularMotor.noSleepData') || 'Log vestibular activities to see sleep correlations'}
            </Text>
          ) : (
            <View style={styles.sleepBars}>
              {sleepData.slice(0, 7).map((s, i) => {
                const quality = s.post_sleep_quality ?? 0;
                const height = (quality / 5) * 70;
                const color = quality >= 4 ? VEST_GREEN : quality >= 3 ? VEST_AMBER : VEST_RED;
                return (
                  <View key={i} style={{ alignItems: 'center' }}>
                    <View style={[styles.sleepBar, { height, backgroundColor: color }]} />
                    <Text style={styles.sleepBarLabel}>{new Date(s.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t('vestibularMotor.motorMilestones') || 'Motor Milestone Bridge'}</Text>
        <View style={styles.integrationCard}>
          <View style={styles.integrationHeader}>
            <MaterialCommunityIcons name="human-handsup" size={28} color={VEST_BLUE} style={styles.integrationIcon} />
            <View>
              <Text style={styles.integrationTitle}>{t('vestibularMotor.vestibularMotorBridge') || 'Vestibular-Motor Bridge'}</Text>
              <Text style={styles.integrationSubtitle}>{t('vestibularMotor.frequencyCorrelation') || 'Activity frequency → milestone achievement'}</Text>
            </View>
          </View>
          {motorMilestones.map((milestone) => {
            const milestoneData = motorCorrelations.filter((c) => c.motor_milestone === milestone);
            const totalVestibular = milestoneData.reduce((sum, c) => sum + c.vestibular_activity_min, 0);
            const daysSinceActivity = latestSession
              ? Math.floor((Date.now() - new Date(latestSession.timestamp).getTime()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <View key={milestone} style={styles.milestoneCard}>
                <View style={styles.milestoneHeader}>
                  <MaterialCommunityIcons
                    name={milestone === 'head_control' ? 'head' : milestone === 'rolling' ? 'rotate-3d-variant' : milestone === 'sitting' ? 'seat' : 'walk'}
                    size={24}
                    color={getMotorColor(milestone)}
                    style={styles.milestoneIcon}
                  />
                  <Text style={styles.milestoneName}>{getMotorMilestoneLabel(milestone, t)}</Text>
                  <Text style={styles.milestoneAge}>
                    {daysSinceActivity != null ? `${daysSinceActivity}d` : '-'}
                  </Text>
                </View>
                <Text style={styles.milestoneDesc}>
                  {t('vestibularMotor.vestibularMinutes') || 'Vestibular mins logged'}: {totalVestibular}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>{t('vestibularMotor.gutConnection') || 'Gut Motility Connection'}</Text>
        <View style={styles.correlationCard}>
          <Text style={styles.correlationTitle}>{t('vestibularMotor.feedingOutcomes') || 'Post-Activity Feeding Outcomes'}</Text>
          <View style={styles.feedingRow}>
            {(['normal', 'spitting_up', 'constipation', 'gas'] as FeedingOutcome[]).map((outcome) => {
              const count = sessions.filter((s) => s.post_feeding_outcome === outcome).length;
              return (
                <View key={outcome} style={styles.feedingIcon}>
                  <MaterialCommunityIcons name={getFeedingIcon(outcome) as any} size={24} color={getFeedingColor(outcome)} />
                  <Text style={styles.feedingIconLabel}>{count}</Text>
                  <Text style={styles.feedingIconLabel}>{t(`vestibularMotor.${outcome}`) || outcome}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {growthVelocity.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('vestibularMotor.growthOverlay') || 'Growth Velocity Overlay'}</Text>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{t('vestibularMotor.velocityCorrelation') || 'Growth Velocity vs Vestibular Activity'}</Text>
              <View style={styles.chartContainer}>
                {last14Days.map((day, i) => {
                  const vestScore = loadingCurveData[i]?.score ?? 0;
                  const velocity = growthVelocity.find((v) => v.date === day)?.velocity ?? 0;
                  const maxV = Math.max(...growthVelocity.map((v) => v.velocity), 1);
                  const vHeight = (vestScore / maxChartScore) * 80;
                  const gHeight = (velocity / maxV) * 80;
                  return (
                    <View key={i} style={{ flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                      <View style={{ height: gHeight, width: '60%', backgroundColor: VEST_GREEN, borderRadius: 2, opacity: 0.7 }} />
                      <View style={{ height: vHeight, width: '60%', backgroundColor: VEST_BLUE, borderRadius: 2 }} />
                    </View>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, backgroundColor: VEST_BLUE, borderRadius: 2 }} />
                  <Text style={{ fontSize: 11, color: C.muted }}>{t('vestibularMotor.vestibular') || 'Vestibular'}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, backgroundColor: VEST_GREEN, borderRadius: 2, opacity: 0.7 }} />
                  <Text style={{ fontSize: 11, color: C.muted }}>{t('vestibularMotor.growthVelocity') || 'Growth'}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>{t('vestibularMotor.activityLog') || 'Activity Log'}</Text>
        <TouchableOpacity
          accessibilityLabel={t('vestibularMotor.addActivityA11y') || 'Add vestibular activity'}
          style={{ backgroundColor: VEST_BLUE, borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 12 }}
          activeOpacity={0.7}
          onPress={openForm}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
            + {t('vestibularMotor.logActivity') || 'Log Vestibular Activity'}
          </Text>
        </TouchableOpacity>

        {sessions.length === 0 ? (
          <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 16 }}>
            {t('vestibularMotor.noActivities') || 'No activities logged yet'}
          </Text>
        ) : (
          <View style={styles.historyCard}>
            {sessions.slice(0, 10).map((entry, i) => (
              <View key={entry.id} style={[styles.entryRow, i === Math.min(sessions.length, 10) - 1 && { borderBottomWidth: 0 }]}>
                <MaterialCommunityIcons
                  name={getActivityIcon(entry.activity_type) as any}
                  size={22}
                  color={getIntensityColor(entry.intensity)}
                  style={styles.entryIcon}
                />
                <View style={styles.entryInfo}>
                  <Text style={styles.entryType}>
                    {getActivityLabel(entry.activity_type, t)} · {entry.duration_min}min · {t(`vestibularMotor.${entry.intensity}`) || entry.intensity}
                  </Text>
                  {entry.post_sleep_quality && (
                    <Text style={styles.entryNote}>
                      {t('vestibularMotor.sleepQuality') || 'Sleep'}: {entry.post_sleep_quality}/5
                    </Text>
                  )}
                </View>
                <Text style={styles.entryTime}>
                  {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {Math.round(entry.babyAgeMonths)}mo
                </Text>
              </View>
            ))}
          </View>
        )}

        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t('vestibularMotor.logActivity') || 'Log Vestibular Activity'}</Text>

            <Text style={styles.formLabel}>{t('vestibularMotor.durationMin') || 'Duration (minutes)'}</Text>
            <TextInput
              style={styles.formInput}
              value={durationMin}
              onChangeText={setDurationMin}
              keyboardType="number-pad"
              placeholder={t('vestibularMotor.durationPlaceholder') || 'e.g. 10'}
              placeholderTextColor={C.muted}
            />

            <Text style={styles.formLabel}>{t('vestibularMotor.activityType') || 'Activity Type'}</Text>
            <View style={styles.activityGrid}>
              {activityTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  accessibilityLabel={`Activity type ${type}`}
                  style={[styles.activityOption, activityType === type && styles.activityOptionSelected]}
                  activeOpacity={0.7}
                  onPress={() => setActivityType(type)}
                >
                  <MaterialCommunityIcons
                    name={getActivityIcon(type) as any}
                    size={16}
                    color={activityType === type ? '#fff' : C.muted}
                  />
                  <Text style={[styles.activityOptionText, activityType === type && styles.activityOptionTextSelected]}>
                    {getActivityLabel(type, t)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>{t('vestibularMotor.intensity') || 'Loading Intensity'}</Text>
            <View style={styles.intensityRow}>
              {intensities.map((int) => (
                <TouchableOpacity
                  key={int}
                  accessibilityLabel={`Intensity ${int}`}
                  style={[styles.intensityOption, intensity === int && styles.intensityOptionSelected]}
                  activeOpacity={0.7}
                  onPress={() => setIntensity(int)}
                >
                  <Text style={[styles.intensityOptionText, intensity === int && styles.intensityOptionTextSelected]}>
                    {t(`vestibularMotor.${int}`) || int}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEntry}>
                <Text style={styles.saveBtnText}>{t('common.next') || 'Next'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showPostForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t('vestibularMotor.postActivity') || 'Post-Activity Tracking'}</Text>

            <Text style={styles.formLabel}>{t('vestibularMotor.sleepQualityRating') || 'Sleep Quality After Activity (optional)'}</Text>
            <View style={styles.sleepRow}>
              {sleepOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  accessibilityLabel={`Sleep quality ${opt}`}
                  style={[styles.sleepOption, postSleepQuality === opt && styles.sleepOptionSelected]}
                  activeOpacity={0.7}
                  onPress={() => setPostSleepQuality(opt)}
                >
                  <Text style={[styles.sleepOptionText, postSleepQuality === opt && styles.sleepOptionTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>{t('vestibularMotor.feedingOutcome') || 'Feeding Outcome (optional)'}</Text>
            <View style={styles.feedingGrid}>
              {feedingOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  accessibilityLabel={`Feeding outcome ${opt}`}
                  style={[styles.feedingOption, postFeedingOutcome === opt && { borderColor: VEST_BLUE }]}
                  activeOpacity={0.7}
                  onPress={() => setPostFeedingOutcome(opt)}
                >
                  <MaterialCommunityIcons
                    name={getFeedingIcon(opt) as any}
                    size={20}
                    color={postFeedingOutcome === opt ? VEST_BLUE : C.muted}
                  />
                  <Text style={[styles.feedingOptionText, postFeedingOutcome === opt && { color: VEST_BLUE }]}>
                    {t(`vestibularMotor.${opt}`) || opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowPostForm(false); setPendingSessionId(null); }}>
                <Text style={styles.cancelBtnText}>{t('common.skip') || 'Skip'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={savePostData}>
                <Text style={styles.saveBtnText}>{t('common.save') || 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
