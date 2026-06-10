import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';

const PROFILE_KEY = '@jobble_baby_profile';
const GROWTH_KEY = '@jobble/growth_entries';
const TEETHING_KEY = '@jobble/teething_entries';
const TRACKING_KEY = '@jobble/tracking_entries';
const SLEEP_KEY = '@jobble/sleep_training_entries';
const MILESTONE_KEY = '@jobble/milestone_entries';

type BabyProfile = { name: string; birthDate: string; gender: 'boy' | 'girl' | 'prefer_not_to_say' };
type GrowthEntry = { date: string; weight?: number; height?: number; headCirc?: number };
type TeethingEntry = { toothId: string; eruptionDate?: string; painLevel?: number };
type TrackingEntry = { date: string; type: string; [key: string]: unknown };
type SleepEntry = { date: string; nightSleep?: number; naps?: number; disruptions?: number };
type MilestoneEntry = { id: string; date: string; type: string };

// Wolke/Paul sleep regression peaks (months from birth)
const REGRESSION_PEAKS = [4, 8, 12];

// WHO primary tooth eruption order (average months)
const TOOTH_ORDER = [
  { id: 'central_lower', name: 'Lower Central Incisor', avgMonth: 6 },
  { id: 'central_upper', name: 'Upper Central Incisor', avgMonth: 8 },
  { id: 'lateral_lower', name: 'Lower Lateral Incisor', avgMonth: 10 },
  { id: 'lateral_upper', name: 'Upper Lateral Incisor', avgMonth: 11 },
  { id: 'first_molar_lower', name: 'Lower First Molar', avgMonth: 14 },
  { id: 'first_molar_upper', name: 'Upper First Molar', avgMonth: 14 },
  { id: 'canine_lower', name: 'Lower Canine', avgMonth: 17 },
  { id: 'canine_upper', name: 'Upper Canine', avgMonth: 17 },
  { id: 'second_molar_lower', name: 'Lower Second Molar', avgMonth: 23 },
  { id: 'second_molar_upper', name: 'Upper Second Molar', avgMonth: 23 },
];

// Age-appropriate wake windows (hours)
const WAKE_WINDOWS: Record<string, { min: number; max: number; label: string }> = {
  '0-2': { min: 0.75, max: 1.25, label: '45–75 min' },
  '2-4': { min: 1, max: 2, label: '1–2 hrs' },
  '4-6': { min: 1.5, max: 2.5, label: '1.5–2.5 hrs' },
  '6-9': { min: 2, max: 3, label: '2–3 hrs' },
  '9-12': { min: 2.5, max: 4, label: '2.5–4 hrs' },
  '12-18': { min: 3, max: 5, label: '3–5 hrs' },
  '18-24': { min: 4, max: 6, label: '4–6 hrs' },
};

const getWakeWindowKey = (months: number): string => {
  if (months < 2) return '0-2';
  if (months < 4) return '2-4';
  if (months < 6) return '4-6';
  if (months < 9) return '6-9';
  if (months < 12) return '9-12';
  if (months < 18) return '12-18';
  return '18-24';
};

const calcAgeMonths = (birthDate: string): number => {
  const birth = new Date(birthDate);
  const now = new Date();
  return (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
};

const daysUntil = (birthDate: string, targetMonth: number): number => {
  const birth = new Date(birthDate);
  const target = new Date(birth);
  target.setMonth(target.getMonth() + targetMonth);
  const now = new Date();
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

type Confidence = 'high' | 'medium' | 'low';

const confidenceLabel = (c: Confidence, t: (k: string) => string): string => {
  const map: Record<Confidence, string> = {
    high: t('projection.confidenceHigh'),
    medium: t('projection.confidenceMedium'),
    low: t('projection.confidenceLow'),
  };
  return map[c];
};

const ConfidenceBadge = ({ confidence }: { confidence: Confidence }) => {
  const colors: Record<Confidence, string> = {
    high: '#2ecc71',
    medium: '#f1c40f',
    low: '#e74c3c',
  };
  return (
    <View style={[styles.confidenceBadge, { backgroundColor: colors[confidence] + '22' }]}>
      <View style={[styles.confidenceDot, { backgroundColor: colors[confidence] }]} />
    </View>
  );
};

const ProjectionCard = ({
  title,
  icon,
  confidence,
  children,
}: {
  title: string;
  icon: string;
  confidence: Confidence;
  children: React.ReactNode;
}) => {
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];
  return (
    <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <Text style={[styles.cardTitle, { color: C.text }]}>{title}</Text>
        <ConfidenceBadge confidence={confidence} />
      </View>
      {children}
    </View>
  );
};

export default function ProjectionScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [profile, setProfile] = useState<BabyProfile | null>(null);
  const [growthEntries, setGrowthEntries] = useState<GrowthEntry[]>([]);
  const [teethingEntries, setTeethingEntries] = useState<TeethingEntry[]>([]);
  const [trackingEntries, setTrackingEntries] = useState<TrackingEntry[]>([]);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [milestoneEntries, setMilestoneEntries] = useState<MilestoneEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, g, th, tr, sl, ml] = await Promise.all([
          AsyncStorage.getItem(PROFILE_KEY).then(r => (r ? JSON.parse(r) : null)),
          AsyncStorage.getItem(GROWTH_KEY).then(r => (r ? JSON.parse(r) : [])),
          AsyncStorage.getItem(TEETHING_KEY).then(r => (r ? JSON.parse(r) : [])),
          AsyncStorage.getItem(TRACKING_KEY).then(r => (r ? JSON.parse(r) : [])),
          AsyncStorage.getItem(SLEEP_KEY).then(r => (r ? JSON.parse(r) : [])),
          AsyncStorage.getItem(MILESTONE_KEY).then(r => (r ? JSON.parse(r) : [])),
        ]);
        setProfile(p);
        setGrowthEntries(g);
        setTeethingEntries(th);
        setTrackingEntries(tr);
        setSleepEntries(sl);
        setMilestoneEntries(ml);
      } catch {}
      setLoaded(true);
    };
    load();
  }, []);

  if (!loaded || !profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']} accessibilityLabel={t('projection.tab_title')}>
        <View style={styles.loading}>
          <Text style={[styles.loadingText, { color: C.muted }]}>
            {profile ? t('projection.noData') : t('common.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const ageMonths = calcAgeMonths(profile.birthDate);
  const ageLabel = `${Math.floor(ageMonths)}m ${Math.round((ageMonths % 1) * 30)}d`;

  // ── SLEEP REGRESSION ──────────────────────────────────────────────
  const nextRegression = REGRESSION_PEAKS.find(m => daysUntil(profile.birthDate, m) > 0);
  const regressionConfidence: Confidence = sleepEntries.length >= 7 ? 'high' : sleepEntries.length >= 3 ? 'medium' : 'low';
  const regressionDays = nextRegression ? daysUntil(profile.birthDate, nextRegression) : null;

  // ── GROWTH PROJECTION ─────────────────────────────────────────────
  const growthConfidence: Confidence = growthEntries.length >= 4 ? 'high' : growthEntries.length >= 2 ? 'medium' : 'low';
  let growthVelocity = '';
  let growthTrend: 'up' | 'down' | 'stable' = 'stable';
  if (growthEntries.length >= 2) {
    const sorted = [...growthEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const recent = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    if (recent.weight && prev.weight && recent.date !== prev.date) {
      const days = (new Date(recent.date).getTime() - new Date(prev.date).getTime()) / (1000 * 60 * 60 * 24);
      const velocity = ((recent.weight - prev.weight) / days) * 30;
      growthVelocity = `${velocity > 0 ? '+' : ''}${velocity.toFixed(1)} kg/mo`;
      growthTrend = velocity > 0.1 ? 'up' : velocity < -0.1 ? 'down' : 'stable';
    }
  }

  // ── FEEDING EVOLUTION ─────────────────────────────────────────────
  const feedingConfidence: Confidence = trackingEntries.filter(e => e.type === 'feed').length >= 10 ? 'high' : trackingEntries.filter(e => e.type === 'feed').length >= 3 ? 'medium' : 'low';
  const solidFoodEntry = trackingEntries.find(e => e.type === 'solid');
  const feedingStage = ageMonths < 4 ? 'Milk only' : ageMonths < 6 ? 'Milk + possible weaning' : solidFoodEntry ? 'Milk + solids' : 'Milk → solids transition';

  // ── WAKE WINDOWS ─────────────────────────────────────────────────
  const wakeKey = getWakeWindowKey(ageMonths);
  const currentWake = WAKE_WINDOWS[wakeKey];
  const nextWakeKey = getWakeWindowKey(Math.min(ageMonths + 1, 24));
  const nextWake = WAKE_WINDOWS[nextWakeKey];

  // ── TEETHING FORECAST ─────────────────────────────────────────────
  const eruptedIds = new Set(teethingEntries.map(e => e.toothId));
  const upcomingTeeth = TOOTH_ORDER.filter(tooth => !eruptedIds.has(tooth.id) && tooth.avgMonth > ageMonths)
    .slice(0, 3);
  const teethingConfidence: Confidence = teethingEntries.length >= 2 ? 'high' : teethingEntries.length >= 1 ? 'medium' : 'low';

  // ── DEVELOPMENTAL MILESTONES ──────────────────────────────────────
  const milestoneAgeMap: Record<string, number> = {
    first_smile: 2,
    first_roll: 4,
    first_sit: 6,
    first_crawl: 8,
    first_stand: 9,
    first_steps: 12,
    first_word: 11,
    first_food: 6,
  };
  const nextMilestones = Object.entries(milestoneAgeMap)
    .filter(([, month]) => ageMonths < month)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 2);

  const trendArrow = (t: 'up' | 'down' | 'stable') => {
    if (t === 'up') return '↗';
    if (t === 'down') return '↘';
    return '→';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']} accessibilityLabel={t('projection.tab_title')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: C.text }]}>{t('projection.title')}</Text>
          <Text style={[styles.subtitle, { color: C.muted }]}>{profile.name} · {ageLabel}</Text>
        </View>

        {/* Sleep Regression */}
        <ProjectionCard
          title={t('projection.sleepRegression')}
          icon="🌙"
          confidence={regressionConfidence}
        >
          {regressionDays !== null ? (
            <View>
              <Text style={[styles.projectionValue, { color: C.text }]}>
                {regressionDays} {t('projection.daysAway')}
              </Text>
              <Text style={[styles.projectionLabel, { color: C.muted }]}>
                {nextRegression}-month regression window (±2 wks)
              </Text>
              <View style={[styles.progressBar, { backgroundColor: C.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: regressionDays < 28 ? '#e74c3c' : regressionDays < 56 ? '#f1c40f' : '#2ecc71' },
                    { width: `${Math.max(5, 100 - (regressionDays / 84) * 100)}%` },
                  ]}
                />
              </View>
            </View>
          ) : (
            <Text style={[styles.noData, { color: C.muted }]}>{t('projection.noData')}</Text>
          )}
        </ProjectionCard>

        {/* Growth Trajectory */}
        <ProjectionCard
          title={t('projection.growthTrajectory')}
          icon="📈"
          confidence={growthConfidence}
        >
          {growthEntries.length >= 2 ? (
            <View>
              <View style={styles.row}>
                <Text style={[styles.projectionValue, { color: C.text }]}>{growthVelocity}</Text>
                <Text style={[styles.trendArrow, { color: growthTrend === 'up' ? '#2ecc71' : growthTrend === 'down' ? '#e74c3c' : C.muted }]}>
                  {trendArrow(growthTrend)}
                </Text>
              </View>
              <Text style={[styles.projectionLabel, { color: C.muted }]}>
                {t('growth.weightKg')} velocity · {growthEntries.length} data points
              </Text>
            </View>
          ) : (
            <Text style={[styles.noData, { color: C.muted }]}>{t('projection.noData')}</Text>
          )}
        </ProjectionCard>

        {/* Teething Forecast */}
        <ProjectionCard
          title={t('projection.teethingForecast')}
          icon="🦷"
          confidence={teethingConfidence}
        >
          {upcomingTeeth.length > 0 ? (
            <View style={styles.teethList}>
              {upcomingTeeth.map(tooth => (
                <View key={tooth.id} style={[styles.teethItem, { backgroundColor: C.border }]}>
                  <Text style={styles.teethIcon}>🔵</Text>
                  <View>
                    <Text style={[styles.teethName, { color: C.text }]}>{tooth.name}</Text>
                    <Text style={[styles.teethMonth, { color: C.muted }]}>~{tooth.avgMonth} months</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.noData, { color: C.muted }]}>
              {eruptedIds.size > 0 ? 'All primary teeth erupted ✓' : t('projection.noData')}
            </Text>
          )}
        </ProjectionCard>

        {/* Feeding Evolution */}
        <ProjectionCard
          title={t('projection.feedingEvolution')}
          icon="🍼"
          confidence={feedingConfidence}
        >
          <Text style={[styles.projectionValue, { color: C.text }]}>{feedingStage}</Text>
          <Text style={[styles.projectionLabel, { color: C.muted }]}>
            {ageMonths < 6 ? 'Solid food introduction window approaching' : 'Monitor for solids readiness cues'}
          </Text>
        </ProjectionCard>

        {/* Wake Windows */}
        <ProjectionCard
          title={t('projection.wakeWindow') || 'Wake Window'}
          icon="⏱️"
          confidence="high"
        >
          <View>
            <View style={styles.row}>
              <Text style={[styles.projectionValue, { color: C.text }]}>{currentWake.label}</Text>
              <Text style={[styles.currentTag, { backgroundColor: C.accent + '33', color: C.accent }]}>current</Text>
            </View>
            <Text style={[styles.projectionLabel, { color: C.muted }]}>
              Next age window ({nextWakeKey}): {nextWake.label}
            </Text>
          </View>
        </ProjectionCard>

        {/* Upcoming Milestones */}
        <ProjectionCard
          title={t('projection.upcomingMilestones') || 'Upcoming Milestones'}
          icon="🎯"
          confidence="medium"
        >
          {nextMilestones.length > 0 ? (
            <View style={styles.milestoneList}>
              {nextMilestones.map(([key, month]) => (
                <View key={key} style={[styles.milestoneItem, { backgroundColor: C.border }]}>
                  <Text style={styles.milestoneIcon}>⭐</Text>
                  <Text style={[styles.milestoneName, { color: C.text }]}>
                    {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                  <Text style={[styles.milestoneMonth, { color: C.muted }]}>~{month}mo</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.noData, { color: C.muted }]}>All tracked milestones achieved!</Text>
          )}
        </ProjectionCard>

        {/* Confidence Legend */}
        <View style={[styles.legend, { borderColor: C.border }]}>
          <Text style={[styles.legendTitle, { color: C.muted }]}>{t('projection.confidenceHigh').split(' ')[0]} Confidence Legend</Text>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#2ecc71' }]} />
            <Text style={[styles.legendText, { color: C.muted }]}>High (4+ consistent data points)</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#f1c40f' }]} />
            <Text style={[styles.legendText, { color: C.muted }]}>Medium (2-3 data points)</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#e74c3c' }]} />
            <Text style={[styles.legendText, { color: C.muted }]}>Low (extrapolation — log more to improve)</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardIcon: { fontSize: 20, marginRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', flex: 1 },
  confidenceBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confidenceDot: { width: 8, height: 8, borderRadius: 4 },
  projectionValue: { fontSize: 24, fontWeight: '700' },
  projectionLabel: { fontSize: 12, marginTop: 4 },
  noData: { fontSize: 14, fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trendArrow: { fontSize: 20 },
  progressBar: { height: 6, borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  teethList: { gap: 8 },
  teethItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, gap: 10 },
  teethIcon: { fontSize: 16 },
  teethName: { fontSize: 14, fontWeight: '500' },
  teethMonth: { fontSize: 12 },
  currentTag: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden', fontWeight: '600' },
  milestoneList: { gap: 8 },
  milestoneItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, gap: 10 },
  milestoneIcon: { fontSize: 14 },
  milestoneName: { flex: 1, fontSize: 14, fontWeight: '500' },
  milestoneMonth: { fontSize: 12 },
  legend: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 8 },
  legendTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
});