import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS, STATUS_COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const STORAGE_KEY_REGRESSION = STORAGE_KEYS.REGRESSION_STATUS;
const STORAGE_KEY_BREATH = STORAGE_KEYS.BREATH_PATTERN_LOG;
const STORAGE_KEY_LIGHT = STORAGE_KEYS.LIGHT_EXPOSURE;
const STORAGE_KEY_CALM = STORAGE_KEYS.PARENT_CALM_SESSION;
const STORAGE_KEY_BADGE = STORAGE_KEYS.REGRESSION_NAVIGATOR_BADGE;

interface RegressionStatus {
  startedAt: string;
  currentWeek: number;
  expectedEndWeek: number;
  actualEndWeek?: number;
}

interface BreathEntry {
  date: string;
  session: 'nap' | 'night';
  pattern: 'deep_regular' | 'shallow_irregular' | 'pause' | 'sigh' | 'normal';
  notes?: string;
}

interface LightEntry {
  date: string;
  morningBrightMin: number;
  outdoorMin: number;
  screenOffTime?: string;
  eveningDimTime?: string;
  score: number;
}

interface CalmSession {
  date: string;
  technique: 'physiological_sigh' | '4-7-8' | 'box_breathing';
  durationSec: number;
}

const BREATH_PATTERNS = [
  { key: 'deep_regular', labelKey: 'regression.breath.deepRegular', emoji: '🌊' },
  { key: 'shallow_irregular', labelKey: 'regression.breath.shallowIrregular', emoji: '🌫️' },
  { key: 'pause', labelKey: 'regression.breath.pause', emoji: '⏸️' },
  { key: 'sigh', labelKey: 'regression.breath.sigh', emoji: '💨' },
  { key: 'normal', labelKey: 'regression.breath.normal', emoji: '✓' },
];

const BREATH_TECHNIQUES = [
  { key: 'physiological_sigh', labelKey: 'regression.calm.physiologicalSigh', descKey: 'regression.calm.physiologicalSighDesc', emoji: '🌬️' },
  { key: '4-7-8', labelKey: 'regression.calm.4-7-8', descKey: 'regression.calm.4-7-8Desc', emoji: '🔢' },
  { key: 'box_breathing', labelKey: 'regression.calm.boxBreathing', descKey: 'regression.calm.boxBreathingDesc', emoji: '📦' },
];

export default function RegressionNavigatorScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme] || COLORS.light;

  const [regression, setRegression] = useState<RegressionStatus | null>(null);
  const [breathLog, setBreathLog] = useState<BreathEntry[]>([]);
  const [lightLog, setLightLog] = useState<LightEntry[]>([]);
  const [calmSessions, setCalmSessions] = useState<CalmSession[]>([]);
  const [hasBadge, setHasBadge] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [regStr, breathStr, lightStr, calmStr, badgeStr] = await Promise.all([
        safeGetItem(STORAGE_KEY_REGRESSION),
        safeGetItem(STORAGE_KEY_BREATH),
        safeGetItem(STORAGE_KEY_LIGHT),
        safeGetItem(STORAGE_KEY_CALM),
        safeGetItem(STORAGE_KEY_BADGE),
      ]);

      if (regStr) setRegression(JSON.parse(regStr));
      if (breathStr) setBreathLog(JSON.parse(breathStr));
      if (lightStr) setLightLog(JSON.parse(lightStr));
      if (calmStr) setCalmSessions(JSON.parse(calmStr));
      if (badgeStr) setHasBadge(true);
    } catch (e) { /* silently fail */ }
  };

  const saveRegression = async (data: RegressionStatus) => {
    await safeSetItem(STORAGE_KEY_REGRESSION, JSON.stringify(data));
    setRegression(data);
  };

  const startRegression = (week: number) => {
    const now = new Date().toISOString();
    const data: RegressionStatus = {
      startedAt: now,
      currentWeek: week,
      expectedEndWeek: week + 4,
    };
    saveRegression(data);
  };

  const logBreath = (session: 'nap' | 'night', pattern: string) => {
    const entry: BreathEntry = {
      date: new Date().toISOString(),
      session,
      pattern: pattern as BreathEntry['pattern'],
    };
    const updated = [entry, ...breathLog].slice(0, 30);
    setBreathLog(updated);
    safeSetItem(STORAGE_KEY_BREATH, JSON.stringify(updated));
  };

  const logLight = (morningBrightMin: number, outdoorMin: number) => {
    const score = Math.min(100, Math.round((morningBrightMin / 30) * 40 + (outdoorMin / 60) * 60));
    const entry: LightEntry = {
      date: new Date().toISOString(),
      morningBrightMin,
      outdoorMin,
      score,
    };
    const updated = [entry, ...lightLog].slice(0, 14);
    setLightLog(updated);
    safeSetItem(STORAGE_KEY_LIGHT, JSON.stringify(updated));
  };

  const logCalm = (technique: CalmSession['technique']) => {
    const session: CalmSession = {
      date: new Date().toISOString(),
      technique,
      durationSec: 60,
    };
    const updated = [session, ...calmSessions].slice(0, 50);
    setCalmSessions(updated);
    safeSetItem(STORAGE_KEY_CALM, JSON.stringify(updated));

    const newCount = updated.filter(s => s.technique === technique).length;
    if (newCount >= 7 && !hasBadge) {
      setHasBadge(true);
      safeSetItem(STORAGE_KEY_BADGE, 'true');
    }
  };

  const completeRegression = () => {
    if (!regression) return;
    const updated: RegressionStatus = { ...regression, actualEndWeek: regression.currentWeek };
    saveRegression(updated);
    setHasBadge(true);
    safeSetItem(STORAGE_KEY_BADGE, 'true');
    Alert.alert(t('regression.completeTitle') || 'Regression Complete', t('regression.completeMessage') || 'Great job navigating the regression!');
  };

  const resetAll = () => {
    Alert.alert(
      t('common.resetConfirmTitle') || 'Reset All',
      t('common.resetConfirmMessage') || 'This will clear all regression tracking data.',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.confirm') || 'Confirm',
          onPress: async () => {
            await Promise.all([
              safeRemoveItem(STORAGE_KEY_REGRESSION),
              safeRemoveItem(STORAGE_KEY_BREATH),
              safeRemoveItem(STORAGE_KEY_LIGHT),
              safeRemoveItem(STORAGE_KEY_CALM),
              safeRemoveItem(STORAGE_KEY_BADGE),
            ]);
            setRegression(null);
            setBreathLog([]);
            setLightLog([]);
            setCalmSessions([]);
            setHasBadge(false);
          },
        },
      ]
    );
  };

  const todayLightScore = lightLog.length > 0 ? lightLog[0].score : 0;
  const latestBreath = breathLog.length > 0 ? breathLog[0] : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={[styles.header, { backgroundColor: C.card }]}>
          <Text style={[styles.title, { color: C.text }]}>{t('tabs.regressionNavigator') || '4-Month Regression Navigator'}</Text>
          <Text style={[styles.subtitle, { color: C.muted }]}>
            {t('regression.subtitle') || 'Track and navigate the 4-month sleep regression'}
          </Text>
        </View>

        {/* Badge */}
        {hasBadge && (
          <View style={[styles.badgeCard, { backgroundColor: C.accent + '20', borderColor: C.accent }]}>
            <Text style={styles.badgeEmoji}>🧭</Text>
            <Text style={[styles.badgeTitle, { color: C.accent }]}>{t('regression.badge') || 'Regression Navigator'}</Text>
            <Text style={[styles.badgeDesc, { color: C.muted }]}>{t('regression.badgeDesc') || 'Completed 4-week regression tracking'}</Text>
          </View>
        )}

        {/* Regression Status */}
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{t('regression.statusTitle') || 'Regression Status'}</Text>
          {regression ? (
            <View>
              <View style={styles.weekRow}>
                <Text style={[styles.weekLabel, { color: C.muted }]}>{t('regression.currentWeek') || 'Current Week'}</Text>
                <Text style={[styles.weekValue, { color: C.accent }]}>Week {regression.currentWeek}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { backgroundColor: C.accent, width: `${(regression.currentWeek / 4) * 100}%` }]} />
              </View>
              <Text style={[styles.weekDesc, { color: C.muted }]}>
                {t('regression.expectedEnd') || `Expected end: Week ${regression.expectedEndWeek}`}
              </Text>
              <TouchableOpacity
                style={[styles.completeButton, { backgroundColor: STATUS_COLORS.good }]}
                onPress={completeRegression}
                accessibilityLabel={t('regression.complete') || 'Mark regression complete'}
              >
                <Text style={styles.completeButtonText}>{t('regression.complete') || 'Mark as Complete'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={[styles.startDesc, { color: C.muted }]}>{t('regression.startDesc') || 'Start tracking your regression journey'}</Text>
              {[1, 2, 3, 4].map(week => (
                <TouchableOpacity
                  key={week}
                  style={[styles.weekButton, { borderColor: C.border }]}
                  onPress={() => startRegression(week)}
                  accessibilityLabel={`Start Week ${week}`}
                >
                  <Text style={[styles.weekButtonText, { color: C.text }]}>Start Week {week}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* What is 4-Month Regression */}
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{t('regression.eduTitle') || 'What is the 4-Month Regression?'}</Text>
          <Text style={[styles.eduText, { color: C.muted }]}>{t('regression.eduText') || 'At 4 months, baby\'s sleep architecture matures from neonatal to mature patterns. Sleep cycles become shorter (50-60 min), REM increases, and circadian building begins. This is a developmental milestone, not a problem.'}</Text>
          <View style={[styles.tipBox, { backgroundColor: C.accent + '15' }]}>
            <Text style={[styles.tipTitle, { color: C.accent }]}>💡 {t('regression.tipTitle') || 'Key Insight'}</Text>
            <Text style={[styles.tipText, { color: C.muted }]}>{t('regression.tipText') || 'Consistent light exposure helps shorten regression duration. Aim for bright morning light and dim evening light.'}</Text>
          </View>
        </View>

        {/* Breath Pattern Tracker */}
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{t('regression.breathTitle') || 'Breath Pattern Tracker'}</Text>
          {latestBreath && (
            <View style={[styles.latestEntry, { backgroundColor: C.border + '40' }]}>
              <Text style={[styles.latestLabel, { color: C.muted }]}>{t('regression.latestBreath') || 'Latest entry'}</Text>
              <Text style={[styles.latestValue, { color: C.text }]}>
                {BREATH_PATTERNS.find(p => p.key === latestBreath.pattern)?.emoji} {t(BREATH_PATTERNS.find(p => p.key === latestBreath.pattern)?.labelKey || '')} · {latestBreath.session}
              </Text>
            </View>
          )}
          <Text style={[styles.sectionLabel, { color: C.muted }]}>{t('regression.logBreath') || 'Log breath pattern'}</Text>
          <View style={styles.buttonGrid}>
            {(['nap', 'night'] as const).map(session => (
              <View key={session} style={styles.sessionGroup}>
                <Text style={[styles.sessionLabel, { color: C.text }]}>{session === 'nap' ? '☀️ Nap' : '🌙 Night'}</Text>
                <View style={styles.patternRow}>
                  {BREATH_PATTERNS.slice(0, 4).map(p => (
                    <TouchableOpacity
                      key={`${session}-${p.key}`}
                      style={[styles.patternButton, { backgroundColor: C.accent + '20', borderColor: C.accent }]}
                      onPress={() => logBreath(session, p.key)}
                      accessibilityLabel={`${t(p.labelKey || '')} during ${session}`}
                    >
                      <Text style={styles.patternEmoji}>{p.emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Light Dark Cue Tracker */}
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{t('regression.lightTitle') || 'Light Exposure Tracker'}</Text>
          <View style={[styles.scoreCard, { backgroundColor: todayLightScore >= 60 ? STATUS_COLORS.good + '20' : todayLightScore >= 30 ? '#F59E0B20' : STATUS_COLORS.error + '20' }]}>
            <Text style={[styles.scoreLabel, { color: C.muted }]}>{t('regression.todayScore') || 'Today\'s Light Score'}</Text>
            <Text style={[styles.scoreValue, { color: todayLightScore >= 60 ? STATUS_COLORS.good : todayLightScore >= 30 ? '#F59E0B' : STATUS_COLORS.error }]}>{todayLightScore}/100</Text>
          </View>
          <Text style={[styles.sectionLabel, { color: C.muted }]}>{t('regression.logLight') || 'Log today\'s light exposure'}</Text>
          <View style={styles.lightRow}>
            <TouchableOpacity
              style={[styles.lightButton, { backgroundColor: C.accent + '20' }]}
              onPress={() => logLight(30, 0)}
              accessibilityLabel={t('regression.logBright') || 'Log 30 min bright light'}
            >
              <Text style={styles.lightEmoji}>☀️</Text>
              <Text style={[styles.lightLabel, { color: C.text }]}>30min bright</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.lightButton, { backgroundColor: C.accent + '20' }]}
              onPress={() => logLight(0, 30)}
              accessibilityLabel={t('regression.logOutdoor') || 'Log 30 min outdoor'}
            >
              <Text style={styles.lightEmoji}>🌳</Text>
              <Text style={[styles.lightLabel, { color: C.text }]}>30min outdoor</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.lightButton, { backgroundColor: C.accent + '20' }]}
              onPress={() => logLight(30, 30)}
              accessibilityLabel={t('regression.logBoth') || 'Log 30 min bright + 30 min outdoor'}
            >
              <Text style={styles.lightEmoji}>🌞</Text>
              <Text style={[styles.lightLabel, { color: C.text }]}>30+30 min</Text>
            </TouchableOpacity>
          </View>
          {lightLog.length > 0 && (
            <View style={styles.lightHistory}>
              <Text style={[styles.historyLabel, { color: C.muted }]}>{t('regression.recentLog') || 'Recent entries'}</Text>
              {lightLog.slice(0, 3).map((entry, i) => (
                <Text key={i} style={[styles.historyEntry, { color: C.muted }]}>
                  {new Date(entry.date).toLocaleDateString()} — Score: {entry.score}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Parent Calm Exercises */}
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{t('regression.calmTitle') || 'Parent Calm Exercises'}</Text>
          <Text style={[styles.calmDesc, { color: C.muted }]}>{t('regression.calmDesc') || 'Take a breath — this regression is temporary and your baby is building important neural architecture.'}</Text>
          <View style={styles.calmGrid}>
            {BREATH_TECHNIQUES.map(tech => (
              <TouchableOpacity
                key={tech.key}
                style={[styles.calmButton, { backgroundColor: C.accent + '15', borderColor: C.accent }]}
                onPress={() => logCalm(tech.key as CalmSession['technique'])}
                accessibilityLabel={t(tech.labelKey || '')}
              >
                <Text style={styles.calmEmoji}>{tech.emoji}</Text>
                <Text style={[styles.calmLabel, { color: C.text }]}>{t(tech.labelKey || '')}</Text>
                <Text style={[styles.calmTechDesc, { color: C.muted }]}>{t(tech.descKey || '')}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.calmCount}>
            <Text style={[styles.calmCountText, { color: C.muted }]}>
              {calmSessions.filter(s => s.technique === 'physiological_sigh').length} / 7 {t('regression.calmTarget') || 'physiological sighs for badge'}
            </Text>
          </View>
        </View>

        {/* Wake Window Guide */}
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{t('regression.wakeWindowTitle') || 'Age-Appropriate Wake Windows'}</Text>
          <View style={styles.windowTable}>
            {[
              { week: '1-2', window: '60-90 min', total: '14-16h' },
              { week: '2-3', window: '75-105 min', total: '13-15h' },
              { week: '3-4', window: '90-120 min', total: '12-14h' },
            ].map(row => (
              <View key={row.week} style={[styles.windowRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.windowWeek, { color: C.text }]}>Week {row.week}</Text>
                <Text style={[styles.windowValue, { color: C.accent }]}>{row.window}</Text>
                <Text style={[styles.windowTotal, { color: C.muted }]}>Total: {row.total}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.doDonts, { backgroundColor: C.border + '30' }]}>
            <Text style={[styles.doDontsTitle, { color: C.text }]}>✅ {t('regression.do') || 'Do'}</Text>
            <Text style={[styles.doDontsText, { color: C.muted }]}>• Consistent wind-down routine</Text>
            <Text style={[styles.doDontsText, { color: C.muted }]}>• Day/night differentiation (bright days, dark nights)</Text>
            <Text style={[styles.doDontsText, { color: C.muted }]}>• Early bedtime if overtired</Text>
            <Text style={[styles.doTitle, { color: STATUS_COLORS.error }]}>❌ {t('regression.dont') || "Don't"}</Text>
            <Text style={[styles.doDontsText, { color: C.muted }]}>• New sleep props (rocking to sleep, feeding to sleep)</Text>
            <Text style={[styles.doDontsText, { color: C.muted }]}>• Screen time 90 min before bed</Text>
          </View>
        </View>

        {/* Reset */}
        <TouchableOpacity
          style={[styles.resetButton, { borderColor: STATUS_COLORS.error }]}
          onPress={resetAll}
          accessibilityLabel={t('regression.resetAll') || 'Reset all regression data'}
        >
          <Text style={[styles.resetButtonText, { color: STATUS_COLORS.error }]}>{t('regression.resetAll') || 'Reset All Data'}</Text>
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
  badgeCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, alignItems: 'center' },
  badgeEmoji: { fontSize: 32, marginBottom: 8 },
  badgeTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  badgeDesc: { fontSize: 14, textAlign: 'center' },
  card: { borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  weekLabel: { fontSize: 14 },
  weekValue: { fontSize: 20, fontWeight: '700' },
  progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: '#E5E7EB', marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  weekDesc: { fontSize: 12, marginBottom: 12 },
  completeButton: { borderRadius: 8, padding: 12, alignItems: 'center' },
  completeButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  startDesc: { fontSize: 14, marginBottom: 12 },
  weekButton: { borderWidth: 1.5, borderRadius: 8, padding: 12, marginBottom: 8, alignItems: 'center' },
  weekButtonText: { fontSize: 15, fontWeight: '600' },
  eduText: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  tipBox: { borderRadius: 8, padding: 12 },
  tipTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  tipText: { fontSize: 13, lineHeight: 18 },
  latestEntry: { borderRadius: 8, padding: 10, marginBottom: 12 },
  latestLabel: { fontSize: 12, marginBottom: 2 },
  latestValue: { fontSize: 15, fontWeight: '500' },
  sectionLabel: { fontSize: 13, marginBottom: 8 },
  buttonGrid: { gap: 12 },
  sessionGroup: { marginBottom: 12 },
  sessionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  patternRow: { flexDirection: 'row', gap: 8 },
  patternButton: { flex: 1, borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1 },
  patternEmoji: { fontSize: 20 },
  scoreCard: { borderRadius: 8, padding: 12, marginBottom: 12, alignItems: 'center' },
  scoreLabel: { fontSize: 13, marginBottom: 4 },
  scoreValue: { fontSize: 28, fontWeight: '700' },
  lightRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  lightButton: { flex: 1, borderRadius: 8, padding: 12, alignItems: 'center' },
  lightEmoji: { fontSize: 24, marginBottom: 4 },
  lightLabel: { fontSize: 12, fontWeight: '500' },
  lightHistory: { marginTop: 8 },
  historyLabel: { fontSize: 12, marginBottom: 4 },
  historyEntry: { fontSize: 12, marginBottom: 2 },
  calmDesc: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  calmGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  calmButton: { flex: 1, borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1 },
  calmEmoji: { fontSize: 24, marginBottom: 4 },
  calmLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2, textAlign: 'center' },
  calmTechDesc: { fontSize: 10, textAlign: 'center' },
  calmCount: { alignItems: 'center' },
  calmCountText: { fontSize: 12 },
  windowTable: { marginBottom: 12 },
  windowRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  windowWeek: { flex: 1, fontSize: 14, fontWeight: '600' },
  windowValue: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  windowTotal: { flex: 1, fontSize: 12, textAlign: 'right' },
  doDonts: { borderRadius: 8, padding: 12 },
  doDontsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  doTitle: { fontSize: 14, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  doDontsText: { fontSize: 13, lineHeight: 18 },
  resetButton: { borderWidth: 1.5, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  resetButtonText: { fontSize: 15, fontWeight: '600' },
});