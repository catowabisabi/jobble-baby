import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

interface FeedingLogEntry {
  id: string;
  date: string;
  inclineAngle: number;
  positionType: 'cradle' | 'football' | 'hybrid' | 'upright';
  outcome: 'comfortable' | 'spit_up' | 'gassiness' | 'arching';
  notes: string;
}

interface LeapEntry {
  leapId: number;
  name: string;
  startWeek: number;
  passed: boolean;
  startDate?: string;
}

const LEAP_CALENDAR = [
  { leapId: 1, name: 'Wonder Weeks Leap 1 — The World of Smells', startWeek: 5 },
  { leapId: 2, name: 'Wonder Weeks Leap 2 — The World of Patterns', startWeek: 8 },
  { leapId: 3, name: 'Wonder Weeks Leap 3 — The World of Smoothness', startWeek: 12 },
  { leapId: 4, name: 'Wonder Weeks Leap 4 — The World of Events', startWeek: 19 },
  { leapId: 5, name: 'Wonder Weeks Leap 5 — The World of Relationships', startWeek: 26 },
  { leapId: 6, name: 'Wonder Weeks Leap 6 — The World of Categories', startWeek: 37 },
  { leapId: 7, name: 'Wonder Weeks Leap 7 — The World of Sequences', startWeek: 46 },
  { leapId: 8, name: 'Wonder Weeks Leap 8 — The World of Programs', startWeek: 55 },
  { leapId: 9, name: 'Wonder Weeks Leap 9 — The World of Principles', startWeek: 64 },
  { leapId: 10, name: 'Wonder Weeks Leap 10 — The World of Systems', startWeek: 75 },
];

const TACTILE_SYMBOLS = [
  { id: 'hungry', label: 'Hungry', emoji: '🍽️', color: '#F97316' },
  { id: 'done', label: 'Done', emoji: '✅', color: '#22C55E' },
  { id: 'more', label: 'More', emoji: '➕', color: '#3B82F6' },
  { id: 'comfort', label: 'Comfort', emoji: '🤗', color: '#EC4899' },
  { id: 'change', label: 'Change', emoji: '👶', color: '#8B5CF6' },
];

export default function GravityFeedingScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const colors = COLORS[effectiveTheme];
  const [log, setLog] = useState<FeedingLogEntry[]>([]);
  const [leapTimeline, setLeapTimeline] = useState<LeapEntry[]>([]);
  const [tactileTaps, setTactileTaps] = useState<Record<string, number>>({});
  const [showLogForm, setShowLogForm] = useState(false);
  const [selectedAngle, setSelectedAngle] = useState(30);
  const [selectedPosition, setSelectedPosition] = useState<'cradle' | 'football' | 'hybrid' | 'upright'>('cradle');
  const [selectedOutcome, setSelectedOutcome] = useState<'comfortable' | 'spit_up' | 'gassiness' | 'arching'>('comfortable');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadLog();
    loadLeapTimeline();
    loadTactileTaps();
  }, []);

  async function loadLog() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.GRAVITY_FEEDING_LOG);
      if (raw) setLog(JSON.parse(raw));
    } catch (_e) { }
  }

  async function loadLeapTimeline() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.GRAVITY_LEAP_TIMELINE);
      if (raw) {
        setLeapTimeline(JSON.parse(raw));
      } else {
        const initial = LEAP_CALENDAR.map(l => ({ ...l, passed: false }));
        setLeapTimeline(initial);
        await AsyncStorage.setItem(STORAGE_KEYS.GRAVITY_LEAP_TIMELINE, JSON.stringify(initial));
      }
    } catch (_e) { }
  }

  async function loadTactileTaps() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.GRAVITY_TACTILE_COMMS);
      if (raw) setTactileTaps(JSON.parse(raw));
    } catch (_e) { }
  }

  async function saveLog() {
    const entry: FeedingLogEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      inclineAngle: selectedAngle,
      positionType: selectedPosition,
      outcome: selectedOutcome,
      notes,
    };
    const updated = [entry, ...log].slice(0, 100);
    setLog(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.GRAVITY_FEEDING_LOG, JSON.stringify(updated));
    setShowLogForm(false);
    setNotes('');
  }

  async function handleTactileTap(symbolId: string) {
    const updated = { ...tactileTaps, [symbolId]: (tactileTaps[symbolId] || 0) + 1 };
    setTactileTaps(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.GRAVITY_TACTILE_COMMS, JSON.stringify(updated));
  }

  function markLeapPassed(leapId: number) {
    const updated = leapTimeline.map(l => l.leapId === leapId ? { ...l, passed: true, startDate: new Date().toISOString() } : l);
    setLeapTimeline(updated);
    AsyncStorage.setItem(STORAGE_KEYS.GRAVITY_LEAP_TIMELINE, JSON.stringify(updated));
  }

  const comfortableCount = log.filter(e => e.outcome === 'comfortable').length;
  const comfortRate = log.length > 0 ? Math.round((comfortableCount / log.length) * 100) : 0;
  const avgAngle = log.length > 0 ? Math.round(log.reduce((sum, e) => sum + e.inclineAngle, 0) / log.length) : 0;

  const positionLabels: Record<string, string> = {
    cradle: t('gravityFeeding.positionCradle') || 'Cradle',
    football: t('gravityFeeding.positionFootball') || 'Football',
    hybrid: t('gravityFeeding.positionHybrid') || 'Hybrid',
    upright: t('gravityFeeding.positionUpright') || 'Upright',
  };

  const outcomeLabels: Record<string, string> = {
    comfortable: t('gravityFeeding.outcomeComfortable') || 'Comfortable',
    spit_up: t('gravityFeeding.outcomeSpitUp') || 'Spit-up',
    gassiness: t('gravityFeeding.outcomeGassiness') || 'Gassiness',
    arching: t('gravityFeeding.outcomeArching') || 'Arching',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('gravityFeeding.title') || 'Gravity-Assisted Feeding'}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {t('gravityFeeding.subtitle') || 'Optimize feeding position, track reflux correlation, visualize developmental leaps'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('gravityFeeding.inclineCalculator') || 'Feeding Incline Calculator'}</Text>
          <View style={styles.angleButtons}>
            {[0, 15, 30, 45].map(angle => (
              <TouchableOpacity
                key={angle}
                style={[styles.angleButton, selectedAngle === angle && { backgroundColor: colors.accent }]}
                onPress={() => setSelectedAngle(angle)}
              >
                <Text style={[styles.angleText, { color: selectedAngle === angle ? '#fff' : colors.text }]}>{angle}°</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.angleHint, { color: colors.muted }]}>
            {t('gravityFeeding.angleHint') || 'Recommended: 30-45 for babies with reflux. Consult your pediatrician.'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('gravityFeeding.positionLogger') || 'Position Logger'}</Text>
          {!showLogForm ? (
            <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.accent }]} onPress={() => setShowLogForm(true)} accessibilityLabel={t('gravityFeeding.logFeed') || 'Log feed'}>
              <Text style={styles.addButtonText}>{t('gravityFeeding.logFeed') || '+ Log Feed'}</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('gravityFeeding.position') || 'Position'}</Text>
              <View style={styles.optionRow}>
                {(['cradle', 'football', 'hybrid', 'upright'] as const).map(pos => (
                  <TouchableOpacity
                    key={pos}
                    style={[styles.optionChip, selectedPosition === pos && { backgroundColor: colors.accent }]}
                    onPress={() => setSelectedPosition(pos)}
                  >
                    <Text style={[styles.optionChipText, { color: selectedPosition === pos ? '#fff' : colors.text }]}>
                      {positionLabels[pos]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('gravityFeeding.outcome') || 'Outcome'}</Text>
              <View style={styles.optionRow}>
                {(['comfortable', 'spit_up', 'gassiness', 'arching'] as const).map(out => (
                  <TouchableOpacity
                    key={out}
                    style={[styles.optionChip, selectedOutcome === out && { backgroundColor: colors.accent }]}
                    onPress={() => setSelectedOutcome(out)}
                  >
                    <Text style={[styles.optionChipText, { color: selectedOutcome === out ? '#fff' : colors.text }]}>
                      {outcomeLabels[out]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.accent }]} onPress={saveLog}>
                <Text style={styles.saveButtonText}>{t('common.save') || 'Save'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {log.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('gravityFeeding.stats') || 'Feeding Stats'}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.accent }]}>{comfortRate}%</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>{t('gravityFeeding.comfortRate') || 'Comfort Rate'}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.accent }]}>{avgAngle}°</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>{t('gravityFeeding.avgAngle') || 'Avg Angle'}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.accent }]}>{log.length}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>{t('gravityFeeding.totalLogs') || 'Total Logs'}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('gravityFeeding.leapTimeline') || 'Developmental Leap Timeline'}</Text>
          <Text style={[styles.leapHint, { color: colors.muted }]}>
            {t('gravityFeeding.leapHint') || 'Leap weeks may cause temporary feeding regressions. Tap to mark as passed.'}
          </Text>
          {leapTimeline.map(leap => (
            <TouchableOpacity
              key={leap.leapId}
              style={[styles.leapRow, leap.passed && { opacity: 0.6 }]}
              onPress={() => !leap.passed && markLeapPassed(leap.leapId)}
              disabled={leap.passed}
            >
              <View style={[styles.leapDot, { backgroundColor: leap.passed ? '#22C55E' : colors.accent }]} />
              <View style={styles.leapInfo}>
                <Text style={[styles.leapName, { color: colors.text }]}>{leap.name}</Text>
                <Text style={[styles.leapWeek, { color: colors.muted }]}>Week {leap.startWeek}</Text>
              </View>
              {leap.passed && <Text style={styles.leapPassed}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('gravityFeeding.tactileBridge') || 'Tactile Communication Bridge'}</Text>
          <Text style={[styles.tactileHint, { color: colors.muted }]}>
            {t('gravityFeeding.tactileHint') || 'Tap a symbol to signal. Use as a pre-verbal communication bridge.'}
          </Text>
          <View style={styles.tactileGrid}>
            {TACTILE_SYMBOLS.map(symbol => (
              <TouchableOpacity
                key={symbol.id}
                style={[styles.tactileButton, { backgroundColor: symbol.color + '20', borderColor: symbol.color }]}
                onPress={() => handleTactileTap(symbol.id)}
              >
                <Text style={styles.tactileEmoji}>{symbol.emoji}</Text>
                <Text style={[styles.tactileLabel, { color: colors.text }]}>{symbol.label}</Text>
                <Text style={[styles.tactileTaps, { color: colors.muted }]}>
                  {tactileTaps[symbol.id] || 0} taps
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('gravityFeeding.antiRefluxGuide') || 'Anti-Reflux Protocol Guide'}</Text>
          <View style={styles.guideStep}>
            <Text style={[styles.stepNumber, { backgroundColor: colors.accent }]}>1</Text>
            <Text style={[styles.stepText, { color: colors.text }]}>
              {t('gravityFeeding.step1') || 'Keep baby semi-upright (30-45) during entire feed'}
            </Text>
          </View>
          <View style={styles.guideStep}>
            <Text style={[styles.stepNumber, { backgroundColor: colors.accent }]}>2</Text>
            <Text style={[styles.stepText, { color: colors.text }]}>
              {t('gravityFeeding.step2') || 'Use football hold or wedge pillow for consistent incline'}
            </Text>
          </View>
          <View style={styles.guideStep}>
            <Text style={[styles.stepNumber, { backgroundColor: colors.accent }]}>3</Text>
            <Text style={[styles.stepText, { color: colors.text }]}>
              {t('gravityFeeding.step3') || 'Keep baby upright 20-30 min after feeding before lying down'}
            </Text>
          </View>
          <View style={[styles.warningBox, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <Text style={[styles.warningText, { color: '#92400E' }]}>
              WARNING: Never use car seat as feeding position. Transfer to crib/bassinet after feed.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 100 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
  card: { borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  angleButtons: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  angleButton: { flex: 1, marginHorizontal: 4, paddingVertical: 12, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' },
  angleText: { fontSize: 18, fontWeight: '600' },
  angleHint: { fontSize: 12, textAlign: 'center' },
  addButton: { paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  saveButton: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  saveButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6' },
  optionChipText: { fontSize: 14 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 4 },
  leapHint: { fontSize: 13, marginBottom: 12 },
  leapRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  leapDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  leapInfo: { flex: 1 },
  leapName: { fontSize: 14, fontWeight: '500' },
  leapWeek: { fontSize: 12, marginTop: 2 },
  leapPassed: { color: '#22C55E', fontSize: 16 },
  tactileHint: { fontSize: 13, marginBottom: 12 },
  tactileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tactileButton: { width: '47%', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 2 },
  tactileEmoji: { fontSize: 32, marginBottom: 4 },
  tactileLabel: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  tactileTaps: { fontSize: 12, marginTop: 2 },
  guideStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, color: '#fff', textAlign: 'center', lineHeight: 24, fontSize: 14, fontWeight: '700', marginRight: 12 },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
  warningBox: { borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 8 },
  warningText: { fontSize: 13, lineHeight: 18 },
});
