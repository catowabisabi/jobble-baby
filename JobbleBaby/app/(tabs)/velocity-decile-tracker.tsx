import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';

const STORAGE_KEY = '@jobble/weight_velocity_entries';

// WHO weight velocity decile thresholds (g/day) for 0-6 months
const DECILE_THRESHOLDS = {
  p10: 20,
  p25: 25,
  p50: 30,
  p75: 35,
  p90: 40,
};

type VelocityEntry = {
  date: string;
  weightKg: number;
  velocityGDay: number;
};

type DecileBand = 'below' | 'lower' | 'typical' | 'higher' | 'accelerated';

const getDecileBand = (velocity: number): DecileBand => {
  if (velocity < DECILE_THRESHOLDS.p10) return 'below';
  if (velocity < DECILE_THRESHOLDS.p25) return 'lower';
  if (velocity < DECILE_THRESHOLDS.p75) return 'typical';
  if (velocity < DECILE_THRESHOLDS.p90) return 'higher';
  return 'accelerated';
};

const getDecilePercentile = (velocity: number): number => {
  if (velocity < DECILE_THRESHOLDS.p10) return 5;
  if (velocity < DECILE_THRESHOLDS.p25) return 17;
  if (velocity < DECILE_THRESHOLDS.p50) return 37;
  if (velocity < DECILE_THRESHOLDS.p75) return 62;
  if (velocity < DECILE_THRESHOLDS.p90) return 82;
  return 95;
};

const getBandColor = (band: DecileBand): string => {
  switch (band) {
    case 'below': return '#ef4444';
    case 'lower': return '#f59e0b';
    case 'typical': return '#22c55e';
    case 'higher': return '#f59e0b';
    case 'accelerated': return '#3b82f6';
  }
};

// Mock data: 6 entries over 6 months
const MOCK_ENTRIES: VelocityEntry[] = [
  { date: '2026-01-01', weightKg: 5.4, velocityGDay: 28.5 },
  { date: '2026-02-01', weightKg: 6.1, velocityGDay: 26.2 },
  { date: '2026-03-01', weightKg: 6.7, velocityGDay: 24.8 },
  { date: '2026-04-01', weightKg: 7.2, velocityGDay: 22.1 },
  { date: '2026-05-01', weightKg: 7.6, velocityGDay: 18.4 },
  { date: '2026-06-01', weightKg: 7.9, velocityGDay: 15.2 },
];

const getTrendDirection = (entries: VelocityEntry[]): 'increasing' | 'decreasing' | 'stable' => {
  if (entries.length < 3) return 'stable';
  const recent = entries.slice(-3);
  const first = recent[0].velocityGDay;
  const last = recent[2].velocityGDay;
  const change = (last - first) / first;
  if (change > 0.2) return 'increasing';
  if (change < -0.2) return 'decreasing';
  return 'stable';
};

const checkFaltering = (entries: VelocityEntry[]): { hasFaltering: boolean; message: string | null } => {
  if (entries.length < 2) return { hasFaltering: false, message: null };

  const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);

  const recentEntries = sorted.filter(e => new Date(e.date) >= cutoff);
  if (recentEntries.length < 2) return { hasFaltering: false, message: null };

  const bands = recentEntries.map(e => getDecileBand(e.velocityGDay));
  const bandOrder: DecileBand[] = ['below', 'lower', 'typical', 'higher', 'accelerated'];
  const firstBandIdx = bandOrder.indexOf(bands[0]);
  const lastBandIdx = bandOrder.indexOf(bands[bands.length - 1]);

  // Faltering: dropped 2+ bands
  if (firstBandIdx - lastBandIdx >= 2) {
    return {
      hasFaltering: true,
      message: `Warning — Velocity dropped from ${getDecilePercentile(recentEntries[0].velocityGDay)}th to ${getDecilePercentile(recentEntries[recentEntries.length - 1].velocityGDay)}th decile in 6 weeks`,
    };
  }

  return { hasFaltering: false, message: null };
};

// Simple bar chart component using View
const VelocityBarChart = ({ entries, C }: { entries: VelocityEntry[]; C: typeof COLORS.light }) => {
  const maxVelocity = DECILE_THRESHOLDS.p90 * 1.2;
  const chartHeight = 180;
  const barWidth = 36;
  const gap = 12;
  const chartWidth = entries.length * (barWidth + gap) + 40;

  return (
    <View style={chartStyles.chartContainer}>
      {/* Y-axis labels */}
      <View style={chartStyles.yAxis}>
        {[0, 10, 20, 30, 40, 50].map(v => (
          <Text key={v} style={[chartStyles.yLabel, { color: C.muted }]}>{v}</Text>
        ))}
      </View>

      <View style={chartStyles.chartArea}>
        {/* Reference lines */}
        {[DECILE_THRESHOLDS.p10, DECILE_THRESHOLDS.p25, DECILE_THRESHOLDS.p50, DECILE_THRESHOLDS.p75, DECILE_THRESHOLDS.p90].map((threshold, idx) => {
          const is50 = idx === 2;
          return (
            <View
              key={idx}
              style={[
                chartStyles.refLine,
                {
                  top: chartHeight - (threshold / maxVelocity) * chartHeight,
                  borderStyle: is50 ? 'solid' : 'dashed',
                  borderColor: is50 ? '#22c55e' : idx < 2 || idx === 3 ? '#f59e0b' : '#ef4444',
                  borderWidth: is50 ? 1.5 : 1,
                }
              ]}
            >
              <Text style={[chartStyles.refLabel, { color: is50 ? '#22c55e' : '#f59e0b' }]}>
                {idx === 0 ? '10th' : idx === 1 ? '25th' : idx === 2 ? '50th' : idx === 3 ? '75th' : '90th'}
              </Text>
            </View>
          );
        })}

        {/* Bars */}
        <View style={[chartStyles.barsContainer, { height: chartHeight }]}>
          {entries.map((entry, idx) => {
            const band = getDecileBand(entry.velocityGDay);
            const barH = Math.max(4, (entry.velocityGDay / maxVelocity) * chartHeight);
            return (
              <View key={idx} style={[chartStyles.barWrapper, { width: barWidth, marginHorizontal: gap / 2 }]}>
                <View
                  style={[
                    chartStyles.bar,
                    {
                      height: barH,
                      backgroundColor: getBandColor(band),
                      borderRadius: 4,
                    }
                  ]}
                />
                <Text style={[chartStyles.barValue, { color: C.text }]}>
                  {entry.velocityGDay.toFixed(1)}
                </Text>
                <Text style={[chartStyles.barDate, { color: C.muted }]}>
                  {new Date(entry.date).toLocaleDateString('en', { month: 'short' })}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

// Decile band gauge component
const DecileGauge = ({ velocity }: { velocity: number }) => {
  const band = getDecileBand(velocity);
  const percentile = getDecilePercentile(velocity);
  const colors = ['#ef4444', '#f59e0b', '#22c55e', '#f59e0b', '#3b82f6'];
  const segments = [20, 5, 50, 15, 10]; // percentage widths

  // Calculate pointer position (0-100)
  const pointerPosition = Math.min(100, Math.max(0, (velocity / (DECILE_THRESHOLDS.p90 * 1.1)) * 100));

  return (
    <View style={gaugeStyles.container}>
      {/* Band bar */}
      <View style={gaugeStyles.bandBar}>
        {colors.map((color, idx) => (
          <View
            key={idx}
            style={[
              gaugeStyles.bandSegment,
              { backgroundColor: color, width: `${segments[idx]}%` }
            ]}
          />
        ))}
      </View>

      {/* Pointer */}
      <View style={[gaugeStyles.pointerContainer, { left: `${pointerPosition}%` }]}>
        <View style={gaugeStyles.pointer} />
      </View>

      {/* Labels */}
      <View style={gaugeStyles.labels}>
        <Text style={[gaugeStyles.label, { color: '#ef4444' }]}>{"<10th"}</Text>
        <Text style={[gaugeStyles.label, { color: '#f59e0b' }]}>{"10-25th"}</Text>
        <Text style={[gaugeStyles.label, { color: '#22c55e' }]}>{"25-75th"}</Text>
        <Text style={[gaugeStyles.label, { color: '#f59e0b' }]}>{"75-90th"}</Text>
        <Text style={[gaugeStyles.label, { color: '#3b82f6' }]}>&gt;90th</Text>
      </View>

      {/* Current decile text */}
      <Text style={gaugeStyles.decileText}>
        {percentile}th decile — {band === 'below' ? 'Below typical — consult pediatrician' :
          band === 'lower' ? 'Lower end of typical' :
            band === 'typical' ? 'Typical range' :
              band === 'higher' ? 'Higher end of typical' : 'Accelerated growth'}
      </Text>
    </View>
  );
};

// Trend arrow component
const TrendArrow = ({ entries }: { entries: VelocityEntry[] }) => {
  const trend = getTrendDirection(entries);
  const color = trend === 'increasing' ? '#22c55e' : trend === 'decreasing' ? '#ef4444' : '#f59e0b';
  const arrow = trend === 'increasing' ? '↑' : trend === 'decreasing' ? '↓' : '→';
  const label = trend === 'increasing' ? 'Increasing' : trend === 'decreasing' ? 'Decreasing' : 'Stable';

  const recent = entries.slice(-3);
  const displayValues = recent.length >= 3
    ? recent.map(e => `${e.velocityGDay.toFixed(1)}`)
    : ['—', '—', '—'];

  return (
    <View style={trendStyles.container}>
      <View style={trendStyles.dotsRow}>
        {displayValues.map((val, idx) => (
          <View key={idx} style={trendStyles.dotItem}>
            <View style={[trendStyles.dot, { backgroundColor: idx === displayValues.length - 1 ? color : '#9ca3af' }]} />
            <Text style={[trendStyles.dotValue, { color: idx === displayValues.length - 1 ? color : '#9ca3af' }]}>
              {val}
            </Text>
          </View>
        ))}
        <View style={trendStyles.arrowContainer}>
          <Text style={[trendStyles.arrow, { color }]}>{arrow}</Text>
          <Text style={[trendStyles.arrowLabel, { color }]}>{label}</Text>
        </View>
      </View>
      <Text style={trendStyles.subtext}>g/day over last 3 measurements</Text>
    </View>
  );
};

export default function VelocityDecileTrackerScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [entries, setEntries] = useState<VelocityEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [date, setDate] = useState(new Date());
  const [weightInput, setWeightInput] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calculatedVelocity, setCalculatedVelocity] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await safeGetItem(STORAGE_KEY);
        if (stored) {
          setEntries(JSON.parse(stored));
        } else {
          // Pre-populate with mock data
          await safeSetItem(STORAGE_KEY, JSON.stringify(MOCK_ENTRIES));
          setEntries(MOCK_ENTRIES);
        }
      } catch { }
      setLoaded(true);
    };
    loadData();
  }, []);

  const handleWeightChange = async (weightStr: string) => {
    setWeightInput(weightStr);
    if (!weightStr || isNaN(parseFloat(weightStr))) {
      setCalculatedVelocity(null);
      return;
    }

    const weight = parseFloat(weightStr);
    if (entries.length > 0) {
      const last = entries[entries.length - 1];
      const lastDate = new Date(last.date);
      const days = (date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      if (days > 0) {
        const vel = ((weight - last.weightKg) / days) * 1000;
        setCalculatedVelocity(Math.abs(vel));
      }
    }
  };

  const handleSave = async () => {
    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight <= 0) return;

    let velocity = 0;
    if (entries.length > 0) {
      const last = entries[entries.length - 1];
      const lastDate = new Date(last.date);
      const days = (date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      if (days > 0) {
        velocity = ((weight - last.weightKg) / days) * 1000;
      }
    }

    const newEntry: VelocityEntry = {
      date: date.toISOString().split('T')[0],
      weightKg: weight,
      velocityGDay: Math.abs(velocity),
    };

    const updated = [...entries, newEntry];
    await safeSetItem(STORAGE_KEY, JSON.stringify(updated));
    setEntries(updated);
    setWeightInput('');
    setCalculatedVelocity(null);
  };

  const falteringCheck = checkFaltering(entries);
  const currentVelocity = entries.length > 0 ? entries[entries.length - 1].velocityGDay : 0;

  if (!loaded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
        <View style={styles.loading}>
          <Text style={[styles.loadingText, { color: C.muted }]}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: C.text }]}>{t('velocityDecileTracker.title')}</Text>
          <Text style={[styles.subtitle, { color: C.muted }]}>{t('velocityDecileTracker.subtitle')}</Text>
        </View>

        {/* Section A: Velocity Chart */}
        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('velocityDecileTracker.sectionA.title')}</Text>
          <VelocityBarChart entries={entries} C={C} />
          <Text style={[styles.yAxisLabel, { color: C.muted }]}>{t('velocityDecileTracker.sectionA.yAxisLabel')}</Text>
        </View>

        {/* Section B: Decile Band Gauge */}
        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('velocityDecileTracker.sectionB.title')}</Text>
          <DecileGauge velocity={currentVelocity} />
        </View>

        {/* Section C: Trend Arrow */}
        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('velocityDecileTracker.sectionC.title')}</Text>
          <TrendArrow entries={entries} />
        </View>

        {/* Section D: Faltering Alert */}
        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('velocityDecileTracker.sectionD.title')}</Text>
          {falteringCheck.hasFaltering ? (
            <View style={alertStyles.alertCard}>
              <MaterialCommunityIcons name="alert" size={24} color="#ef4444" />
              <Text style={alertStyles.alertText}>{falteringCheck.message}</Text>
            </View>
          ) : (
            <View style={alertStyles.noAlertCard}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#22c55e" />
              <Text style={[alertStyles.noAlertText, { color: '#22c55e' }]}>{t('velocityDecileTracker.sectionD.noAlert')}</Text>
            </View>
          )}
        </View>

        {/* Section E: Velocity Entry Journal */}
        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('velocityDecileTracker.sectionE.title')}</Text>

          {/* Date picker */}
          <Text style={[styles.inputLabel, { color: C.muted }]}>{t('velocityDecileTracker.sectionE.dateLabel')}</Text>
          <TouchableOpacity
            style={[styles.dateButton, { borderColor: C.border }]}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialCommunityIcons name="calendar" size={20} color={C.text} />
            <Text style={[styles.dateText, { color: C.text }]}>
              {date.toLocaleDateString()}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          {/* Weight input */}
          <Text style={[styles.inputLabel, { color: C.muted }]}>{t('velocityDecileTracker.sectionE.weightLabel')}</Text>
          <TextInput
            style={[styles.input, { borderColor: C.border, color: C.text, backgroundColor: C.background }]}
            value={weightInput}
            onChangeText={handleWeightChange}
            placeholder="0.0"
            placeholderTextColor={C.muted}
            keyboardType="decimal-pad"
          />

          {/* Calculated velocity */}
          {calculatedVelocity !== null ? (
            <Text style={[styles.calculatedVelocity, { color: C.accent }]}>
              {t('velocityDecileTracker.sectionE.velocityCalculated')}: {calculatedVelocity.toFixed(1)} g/day
            </Text>
          ) : null}

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: C.accent }]}
            onPress={handleSave}
          >
            <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>{t('velocityDecileTracker.sectionE.saveButton')}</Text>
          </TouchableOpacity>
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
  section: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  yAxisLabel: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  inputLabel: { fontSize: 14, marginBottom: 6, marginTop: 8 },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  dateText: { fontSize: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  calculatedVelocity: {
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 14,
    marginTop: 16,
    gap: 8,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

const chartStyles = StyleSheet.create({
  chartContainer: {
    flexDirection: 'row',
    paddingLeft: 32,
  },
  yAxis: {
    width: 28,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 4,
    paddingBottom: 24,
  },
  yLabel: { fontSize: 10 },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  refLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    zIndex: 1,
  },
  refLabel: {
    position: 'absolute',
    right: 0,
    top: -10,
    fontSize: 8,
    fontWeight: '500',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 8,
    zIndex: 2,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    minHeight: 4,
  },
  barValue: {
    fontSize: 9,
    marginTop: 2,
    fontWeight: '500',
  },
  barDate: {
    fontSize: 8,
    marginTop: 1,
  },
});

const gaugeStyles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  bandBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bandSegment: {
    height: '100%',
  },
  pointerContainer: {
    position: 'absolute',
    top: -4,
    width: 2,
    marginLeft: -1,
  },
  pointer: {
    width: 2,
    height: 32,
    backgroundColor: '#1f2937',
    borderRadius: 1,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
  decileText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
});

const trendStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dotItem: {
    alignItems: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  dotValue: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  arrowContainer: {
    alignItems: 'center',
    marginLeft: 8,
  },
  arrow: {
    fontSize: 28,
    fontWeight: '700',
  },
  arrowLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  subtext: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 8,
  },
});

const alertStyles = StyleSheet.create({
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: '#ef4444',
  },
  noAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  noAlertText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
