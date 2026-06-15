import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const STORAGE_KEY_ARCHITECTURE = STORAGE_KEYS.SLEEP_ARCHITECTURE;
const STORAGE_KEY_CIRCADIAN = STORAGE_KEYS.CIRCADIAN_INPUTS;
const STORAGE_KEY_WAKE_WINDOWS = STORAGE_KEYS.WAKE_WINDOWS;
const STORAGE_KEY_WHITE_NOISE = STORAGE_KEYS.WHITE_NOISE_LOGS;
const STORAGE_KEY_ENVIRONMENT = STORAGE_KEYS.SLEEP_ENVIRONMENT;
const STORAGE_KEY_SLEEP_DEBT = STORAGE_KEYS.SLEEP_DEBT;

interface ArchitectureEntry {
  date: string;
  totalMinutes: number;
  nightWakings: number;
  timeToSleep: number;
  wasoMinutes: number;
  lightPct: number;
  remPct: number;
  deepPct: number;
}
interface CircadianEntry {
  date: string;
  morningLight: number;
  outdoorMin: number;
  dimTransition: string;
  duskSignal: string;
  phaseScore: number;
}
interface WakeWindowEntry {
  date: string;
  suggested: number;
  actual: number;
}
interface WhiteNoiseEntry {
  date: string;
  soundType: string;
  settlingMin: number;
}
interface EnvironmentEntry {
  date: string;
  tempC: number;
  humidityPct: number;
  noiseLevel: number;
  lightLevel: number;
}
interface SleepDebtEntry {
  date: string;
  debtMin: number;
}

const SOUND_TYPES = ['White Noise', 'Pink Noise', 'Brown Noise', 'Rain', 'Ocean', 'Heartbeat', 'Fan', 'Lullaby'];
const LIGHT_LEVELS = ['Fully dark', 'Dim', 'Night light', 'Low glow'];
const NOISE_LEVELS = ['Silent', 'Very quiet', 'Quiet', 'Moderate', 'Noisy'];

function getRecommendedSleep(babyAgeMonths: number): number {
  if (babyAgeMonths < 2) return 540;
  if (babyAgeMonths < 4) return 480;
  if (babyAgeMonths < 6) return 420;
  if (babyAgeMonths < 9) return 360;
  if (babyAgeMonths < 12) return 330;
  if (babyAgeMonths < 18) return 300;
  return 270;
}

function getAgeBasedSleepPhases(babyAgeMonths: number): { light: number; rem: number; deep: number } {
  if (babyAgeMonths < 6) return { light: 50, rem: 25, deep: 25 };
  if (babyAgeMonths < 12) return { light: 40, rem: 25, deep: 35 };
  return { light: 35, rem: 25, deep: 40 };
}

function getWakeWindowMin(babyAgeMonths: number): number {
  if (babyAgeMonths < 2) return 45;
  if (babyAgeMonths < 4) return 75;
  if (babyAgeMonths < 6) return 120;
  if (babyAgeMonths < 9) return 150;
  if (babyAgeMonths < 12) return 180;
  if (babyAgeMonths < 18) return 210;
  return 240;
}

function calculateRestfulnessScore(entry: ArchitectureEntry, recommended: number): number {
  const durationScore = Math.min(100, (entry.totalMinutes / recommended) * 100);
  const wakingScore = Math.max(0, 100 - entry.nightWakings * 8);
  const settleScore = Math.max(0, 100 - entry.timeToSleep * 5);
  const wasoScore = Math.max(0, 100 - entry.wasoMinutes * 3);
  return Math.round((durationScore * 0.35 + wakingScore * 0.25 + settleScore * 0.2 + wasoScore * 0.2));
}

function getDebtLevel(debtMin: number): { label: string; color: string } {
  if (debtMin < 60) return { label: 'Minimal', color: '#4CAF50' };
  if (debtMin < 120) return { label: 'Moderate', color: '#FFC107' };
  if (debtMin < 180) return { label: 'High', color: '#FF9800' };
  return { label: 'Severe', color: '#F44336' };
}

export default function SleepArchitectureScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme] || COLORS.light;
  const inputBg = effectiveTheme === 'dark' ? '#1a2a3a' : '#ffffff';

  const [architectureLog, setArchitectureLog] = useState<ArchitectureEntry[]>([]);
  const [circadianLog, setCircadianLog] = useState<CircadianEntry[]>([]);
  const [wakeWindows, setWakeWindows] = useState<WakeWindowEntry[]>([]);
  const [whiteNoiseLog, setWhiteNoiseLog] = useState<WhiteNoiseEntry[]>([]);
  const [environmentLog, setEnvironmentLog] = useState<EnvironmentEntry[]>([]);
  const [sleepDebtLog, setSleepDebtLog] = useState<SleepDebtEntry[]>([]);

  const [totalMin, setTotalMin] = useState('');
  const [nightWakings, setNightWakings] = useState('');
  const [timeToSleep, setTimeToSleep] = useState('');
  const [wasoMin, setWasoMin] = useState('');
  const [morningLight, setMorningLight] = useState('');
  const [outdoorMin, setOutdoorMin] = useState('');
  const [dimTime, setDimTime] = useState('');
  const [duskTime, setDuskTime] = useState('');
  const [suggestedWW, setSuggestedWW] = useState('');
  const [actualWW, setActualWW] = useState('');
  const [selectedSound, setSelectedSound] = useState('');
  const [settlingMin, setSettlingMin] = useState('');
  const [tempC, setTempC] = useState('');
  const [humidity, setHumidity] = useState('');
  const [noiseLvl, setNoiseLvl] = useState(2);
  const [lightLvl, setLightLvl] = useState(0);
  const [babyAge, setBabyAge] = useState<number>(6);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    try {
      const [arch, circ, ww, wn, env, debt] = await Promise.all([
        safeGetItem(STORAGE_KEY_ARCHITECTURE),
        safeGetItem(STORAGE_KEY_CIRCADIAN),
        safeGetItem(STORAGE_KEY_WAKE_WINDOWS),
        safeGetItem(STORAGE_KEY_WHITE_NOISE),
        safeGetItem(STORAGE_KEY_ENVIRONMENT),
        safeGetItem(STORAGE_KEY_SLEEP_DEBT),
      ]);
      if (arch) setArchitectureLog(JSON.parse(arch));
      if (circ) setCircadianLog(JSON.parse(circ));
      if (ww) setWakeWindows(JSON.parse(ww));
      if (wn) setWhiteNoiseLog(JSON.parse(wn));
      if (env) setEnvironmentLog(JSON.parse(env));
      if (debt) setSleepDebtLog(JSON.parse(debt));
    } catch (e) { /* silently fail */ }
  };

  const saveArchitecture = async () => {
    const entry: ArchitectureEntry = {
      date: today,
      totalMinutes: parseInt(totalMin) || 0,
      nightWakings: parseInt(nightWakings) || 0,
      timeToSleep: parseInt(timeToSleep) || 0,
      wasoMinutes: parseInt(wasoMin) || 0,
      lightPct: 40,
      remPct: 25,
      deepPct: 35,
    };
    const updated = architectureLog.filter(e => e.date !== today);
    updated.push(entry);
    setArchitectureLog(updated);
    await safeSetItem(STORAGE_KEY_ARCHITECTURE, JSON.stringify(updated));

    const recommended = getRecommendedSleep(babyAge);
    const debtDelta = recommended - entry.totalMinutes;
    const debtEntry: SleepDebtEntry = { date: today, debtMin: Math.max(0, debtDelta) };
    const updatedDebt = sleepDebtLog.filter(e => e.date !== today);
    let cumulative = updatedDebt.reduce((sum, e) => sum + e.debtMin, 0);
    cumulative = Math.max(0, cumulative + debtEntry.debtMin - 30);
    debtEntry.debtMin = cumulative;
    updatedDebt.push(debtEntry);
    setSleepDebtLog(updatedDebt);
    await safeSetItem(STORAGE_KEY_SLEEP_DEBT, JSON.stringify(updatedDebt));

    setTotalMin(''); setNightWakings(''); setTimeToSleep(''); setWasoMin('');
  };

  const saveCircadian = async () => {
    const entry: CircadianEntry = {
      date: today,
      morningLight: parseInt(morningLight) || 0,
      outdoorMin: parseInt(outdoorMin) || 0,
      dimTransition: dimTime,
      duskSignal: duskTime,
      phaseScore: 50,
    };
    const updated = circadianLog.filter(e => e.date !== today);
    updated.push(entry);
    setCircadianLog(updated);
    await safeSetItem(STORAGE_KEY_CIRCADIAN, JSON.stringify(updated));
    setMorningLight(''); setOutdoorMin(''); setDimTime(''); setDuskTime('');
  };

  const saveWakeWindow = async () => {
    const entry: WakeWindowEntry = {
      date: today,
      suggested: parseInt(suggestedWW) || getWakeWindowMin(babyAge),
      actual: parseInt(actualWW) || 0,
    };
    const updated = wakeWindows.filter(e => e.date !== today);
    updated.push(entry);
    setWakeWindows(updated);
    await safeSetItem(STORAGE_KEY_WAKE_WINDOWS, JSON.stringify(updated));
    setSuggestedWW(''); setActualWW('');
  };

  const saveWhiteNoise = async () => {
    if (!selectedSound) return;
    const entry: WhiteNoiseEntry = {
      date: today,
      soundType: selectedSound,
      settlingMin: parseInt(settlingMin) || 0,
    };
    const updated = whiteNoiseLog.filter(e => e.date !== today);
    updated.push(entry);
    setWhiteNoiseLog(updated);
    await safeSetItem(STORAGE_KEY_WHITE_NOISE, JSON.stringify(updated));
    setSettlingMin('');
  };

  const saveEnvironment = async () => {
    const entry: EnvironmentEntry = {
      date: today,
      tempC: parseFloat(tempC) || 22,
      humidityPct: parseInt(humidity) || 50,
      noiseLevel: noiseLvl,
      lightLevel: lightLvl,
    };
    const updated = environmentLog.filter(e => e.date !== today);
    updated.push(entry);
    setEnvironmentLog(updated);
    await safeSetItem(STORAGE_KEY_ENVIRONMENT, JSON.stringify(updated));
  };

  const latestEntry = architectureLog.find(e => e.date === today);
  const recommended = getRecommendedSleep(babyAge);
  const restfulnessScore = latestEntry ? calculateRestfulnessScore(latestEntry, recommended) : null;
  const phases = getAgeBasedSleepPhases(babyAge);
  const latestDebt = sleepDebtLog.length > 0 ? sleepDebtLog[sleepDebtLog.length - 1] : { debtMin: 0, date: today };
  const debtInfo = getDebtLevel(latestDebt.debtMin);
  const suggestedWakeWindow = getWakeWindowMin(babyAge);
  const latestCircadian = circadianLog.find(e => e.date === today);
  const latestEnv = environmentLog.find(e => e.date === today);

  const scoreColor = restfulnessScore !== null
    ? restfulnessScore >= 75 ? '#4CAF50' : restfulnessScore >= 50 ? '#FFC107' : '#F44336'
    : '#9E9E9E';

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    scroll: { flex: 1 },
    header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    headerTitle: { fontSize: 22, fontWeight: '700', color: C.text },
    headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
    section: { marginHorizontal: 16, marginTop: 16, backgroundColor: C.card, borderRadius: 12, padding: 14 },
    sectionTitle: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 10 },
    scoreCircle: { alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
    scoreNumber: { fontSize: 48, fontWeight: '700', color: scoreColor },
    scoreLabel: { fontSize: 13, color: C.muted, marginTop: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border },
    rowLabel: { fontSize: 14, color: C.text },
    rowValue: { fontSize: 14, fontWeight: '600', color: C.accent },
    inputRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
    inputLabel: { fontSize: 13, color: C.muted, width: 100 },
    input: { flex: 1, backgroundColor: inputBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border },
    inputHalf: { flex: 1, backgroundColor: inputBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: inputBg, borderWidth: 1, borderColor: C.border },
    chipActive: { backgroundColor: C.accent, borderColor: C.accent },
    chipText: { fontSize: 13, color: C.text },
    chipTextActive: { color: '#fff', fontWeight: '600' },
    btn: { backgroundColor: C.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
    btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    phaseRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
    phaseBar: { height: 20, borderRadius: 4, marginRight: 8 },
    phaseLabel: { fontSize: 13, color: C.text, width: 60 },
    phasePct: { fontSize: 13, fontWeight: '600', color: C.text },
    debtBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, marginTop: 8 },
    debtText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    infoCard: { backgroundColor: inputBg, borderRadius: 8, padding: 10, marginTop: 8 },
    infoText: { fontSize: 13, color: C.muted, lineHeight: 18 },
  });

  const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} accessibilityLabel={label} accessibilityRole="button"
      style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.headerTitle} accessibilityLabel="Sleep Architecture">{t('sleepArchitecture.title') || 'Sleep Architecture'}</Text>
          <Text style={s.headerSub}>{t('sleepArchitecture.subtitle') || 'Understand and optimize baby sleep quality'}</Text>
        </View>

        {/* Restfulness Score */}
        <View style={s.section}>
          <Text style={s.sectionTitle} accessibilityLabel="Restfulness Index">{t('sleepArchitecture.restfulnessIndex') || 'Restfulness Index'}</Text>
          <View style={s.scoreCircle}>
            <Text style={s.scoreNumber} accessibilityLabel={`Restfulness score ${restfulnessScore ?? 'unknown'} out of 100`}>
              {restfulnessScore !== null ? restfulnessScore : '--'}
            </Text>
            <Text style={s.scoreLabel}>{t('sleepArchitecture.outOf100') || 'out of 100'}</Text>
          </View>
          {latestEntry && (
            <View>
              <View style={s.row}>
                <Text style={s.rowLabel}>{t('sleepArchitecture.totalSleep') || 'Total sleep'}</Text>
                <Text style={s.rowValue}>{Math.floor(latestEntry.totalMinutes / 60)}h {latestEntry.totalMinutes % 60}m</Text>
              </View>
              <View style={s.row}>
                <Text style={s.rowLabel}>{t('sleepArchitecture.recommended') || 'Recommended'}</Text>
                <Text style={s.rowValue}>{Math.floor(recommended / 60)}h {recommended % 60}m</Text>
              </View>
              <View style={s.row}>
                <Text style={s.rowLabel}>{t('sleepArchitecture.nightWakings') || 'Night wakings'}</Text>
                <Text style={s.rowValue}>{latestEntry.nightWakings}</Text>
              </View>
              <View style={s.row}>
                <Text style={s.rowLabel}>{t('sleepArchitecture.timeToSleep') || 'Time to fall asleep'}</Text>
                <Text style={s.rowValue}>{latestEntry.timeToSleep} min</Text>
              </View>
              <View style={s.row}>
                <Text style={s.rowLabel}>{t('sleepArchitecture.waso') || 'Wake after sleep onset'}</Text>
                <Text style={s.rowValue}>{latestEntry.wasoMinutes} min</Text>
              </View>
            </View>
          )}
        </View>

        {/* Sleep Phases */}
        <View style={s.section}>
          <Text style={s.sectionTitle} accessibilityLabel="Sleep Architecture Phases">{t('sleepArchitecture.phases') || 'Sleep Phases'}</Text>
          <Text style={s.infoText}>{t('sleepArchitecture.phasesInfo') || `Age-based typical distribution for ${babyAge}-month-old`}</Text>
          <View style={{ marginTop: 10 }}>
            <View style={s.phaseRow}>
              <Text style={s.phaseLabel}>{t('sleepArchitecture.light')}</Text>
              <View style={{ flex: 1, flexDirection: 'row', borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ flex: phases.light, height: 20, backgroundColor: '#90CAF9' }} />
                <View style={{ flex: phases.rem, height: 20, backgroundColor: '#CE93D8' }} />
                <View style={{ flex: phases.deep, height: 20, backgroundColor: '#1A237E' }} />
              </View>
              <Text style={[s.phasePct, { marginLeft: 8 }]}>{phases.light}%</Text>
            </View>
            <View style={s.phaseRow}>
              <Text style={s.phaseLabel}>REM</Text>
              <View style={{ flex: 1 }} />
              <Text style={[s.phasePct, { marginLeft: 8 }]}>{phases.rem}%</Text>
            </View>
            <View style={s.phaseRow}>
              <Text style={s.phaseLabel}>{t('sleepArchitecture.deep')}</Text>
              <View style={{ flex: 1 }} />
              <Text style={[s.phasePct, { marginLeft: 8 }]}>{phases.deep}%</Text>
            </View>
          </View>
        </View>

        {/* Sleep Debt */}
        <View style={s.section}>
          <Text style={s.sectionTitle} accessibilityLabel="Sleep Debt Accumulator">{t('sleepArchitecture.sleepDebt') || 'Sleep Debt'}</Text>
          <View style={[s.debtBadge, { backgroundColor: debtInfo.color }]}>
            <Text style={s.debtText}>{debtInfo.label} — {latestDebt.debtMin} min accumulated</Text>
          </View>
          {latestDebt.debtMin >= 120 && (
            <View style={s.infoCard}>
              <Text style={s.infoText}>{t('sleepArchitecture.debtWarning') || 'Sleep debt is building up. Consider earlier bedtime to help baby recover.'}</Text>
            </View>
          )}
        </View>

        {/* Circadian Entrainment */}
        <View style={s.section}>
          <Text style={s.sectionTitle} accessibilityLabel="Circadian Entrainment">{t('sleepArchitecture.circadian') || 'Circadian Entrainment'}</Text>
          {latestCircadian && (
            <View style={s.infoCard}>
              <Text style={s.infoText}>☀️ {t('sleepArchitecture.morningLight') || 'Morning light'}: {latestCircadian.morningLight} min{'\n'}🌳 {t('sleepArchitecture.outdoor') || 'Outdoor'}: {latestCircadian.outdoorMin} min{'\n'}🌅 {t('sleepArchitecture.dimTransition') || 'Dim transition'}: {latestCircadian.dimTransition || '--'}{'\n'}🌙 {t('sleepArchitecture.duskSignal') || 'Dusk signal'}: {latestCircadian.duskSignal || '--'}</Text>
            </View>
          )}
          <Text style={[s.infoText, { marginTop: 8 }]}>{t('sleepArchitecture.circadianHint') || 'Track light exposure to optimize circadian rhythm'}</Text>
          <View style={s.inputRow}>
            <Text style={s.inputLabel}>{t('sleepArchitecture.morningLight') || 'Morning light (min)'}</Text>
            <TextInput style={s.input} value={morningLight} onChangeText={setMorningLight} keyboardType="numeric" placeholder="e.g. 15" placeholderTextColor={C.muted} accessibilityLabel="Morning light minutes input" />
          </View>
          <View style={s.inputRow}>
            <Text style={s.inputLabel}>{t('sleepArchitecture.outdoor') || 'Outdoor (min)'}</Text>
            <TextInput style={s.input} value={outdoorMin} onChangeText={setOutdoorMin} keyboardType="numeric" placeholder="e.g. 60" placeholderTextColor={C.muted} accessibilityLabel="Outdoor minutes input" />
          </View>
          <View style={s.inputRow}>
            <Text style={s.inputLabel}>{t('sleepArchitecture.dimTime') || 'Dim transition'}</Text>
            <TextInput style={s.input} value={dimTime} onChangeText={setDimTime} placeholder="e.g. 18:30" placeholderTextColor={C.muted} accessibilityLabel="Dim transition time input" />
          </View>
          <View style={s.inputRow}>
            <Text style={s.inputLabel}>{t('sleepArchitecture.duskTime') || 'Dusk signal'}</Text>
            <TextInput style={s.input} value={duskTime} onChangeText={setDuskTime} placeholder="e.g. 19:00" placeholderTextColor={C.muted} accessibilityLabel="Dusk signal time input" />
          </View>
          <TouchableOpacity style={s.btn} onPress={saveCircadian} accessibilityLabel="Save circadian entry" accessibilityRole="button">
            <Text style={s.btnText}>{t('sleepArchitecture.saveCircadian') || 'Save Circadian'}</Text>
          </TouchableOpacity>
        </View>

        {/* Wake Window Optimizer */}
        <View style={s.section}>
          <Text style={s.sectionTitle} accessibilityLabel="Wake Window Optimizer">{t('sleepArchitecture.wakeWindow') || 'Wake Window Optimizer'}</Text>
          <View style={s.infoCard}>
            <Text style={s.infoText}>📅 {t('sleepArchitecture.suggestedWakeWindow') || 'Suggested wake window'} for {babyAge}-month-old: <Text style={{ fontWeight: '700' }}>{suggestedWakeWindow} min</Text></Text>
          </View>
          <View style={[s.inputRow, { marginTop: 10 }]}>
            <Text style={s.inputLabel}>{t('sleepArchitecture.suggested') || 'Suggested (min)'}</Text>
            <TextInput style={s.inputHalf} value={suggestedWW || String(suggestedWakeWindow)} onChangeText={setSuggestedWW} keyboardType="numeric" placeholder={String(suggestedWakeWindow)} placeholderTextColor={C.muted} accessibilityLabel="Suggested wake window input" />
          </View>
          <View style={s.inputRow}>
            <Text style={s.inputLabel}>{t('sleepArchitecture.actual') || 'Actual (min)'}</Text>
            <TextInput style={s.inputHalf} value={actualWW} onChangeText={setActualWW} keyboardType="numeric" placeholder="e.g. 130" placeholderTextColor={C.muted} accessibilityLabel="Actual wake window input" />
          </View>
          <TouchableOpacity style={s.btn} onPress={saveWakeWindow} accessibilityLabel="Save wake window entry" accessibilityRole="button">
            <Text style={s.btnText}>{t('sleepArchitecture.saveWakeWindow') || 'Save Wake Window'}</Text>
          </TouchableOpacity>
        </View>

        {/* White Noise Calibration */}
        <View style={s.section}>
          <Text style={s.sectionTitle} accessibilityLabel="White Noise Calibration">{t('sleepArchitecture.whiteNoise') || 'White Noise Calibration'}</Text>
          <Text style={s.infoText}>{t('sleepArchitecture.whiteNoiseHint') || 'Log different sounds to find what settles baby fastest'}</Text>
          <View style={s.chipRow}>
            {SOUND_TYPES.map(sound => (
              <Chip key={sound} label={sound} active={selectedSound === sound}
                onPress={() => setSelectedSound(selectedSound === sound ? '' : sound)} />
            ))}
          </View>
          <View style={s.inputRow}>
            <Text style={s.inputLabel}>{t('sleepArchitecture.settlingTime') || 'Settling time (min)'}</Text>
            <TextInput style={s.input} value={settlingMin} onChangeText={setSettlingMin} keyboardType="numeric" placeholder="e.g. 5" placeholderTextColor={C.muted} accessibilityLabel="Settling time minutes input" />
          </View>
          <TouchableOpacity style={s.btn} onPress={saveWhiteNoise} accessibilityLabel="Save white noise entry" accessibilityRole="button">
            <Text style={s.btnText}>{t('sleepArchitecture.saveSound') || 'Save Sound Log'}</Text>
          </TouchableOpacity>
          {whiteNoiseLog.filter(e => e.date === today).length > 0 && (
            <View style={s.infoCard}>
              <Text style={s.infoText}>
                {t('sleepArchitecture.todaySound') || "Today's best sound"}: {whiteNoiseLog[whiteNoiseLog.length - 1].soundType} ({whiteNoiseLog[whiteNoiseLog.length - 1].settlingMin} min)
              </Text>
            </View>
          )}
        </View>

        {/* Sleep Environment Score */}
        <View style={s.section}>
          <Text style={s.sectionTitle} accessibilityLabel="Sleep Environment">{t('sleepArchitecture.environment') || 'Sleep Environment'}</Text>
          {latestEnv && (
            <View style={s.infoCard}>
              <Text style={s.infoText}>🌡 {t('sleepArchitecture.temp') || 'Temperature'}: {latestEnv.tempC}°C{'\n'}💧 {t('sleepArchitecture.humidity') || 'Humidity'}: {latestEnv.humidityPct}%{'\n'}🔊 {t('sleepArchitecture.noise') || 'Noise'}: {NOISE_LEVELS[latestEnv.noiseLevel]}{'\n'}💡 {t('sleepArchitecture.light') || 'Light'}: {LIGHT_LEVELS[latestEnv.lightLevel]}</Text>
            </View>
          )}
          <View style={s.inputRow}>
            <Text style={s.inputLabel}>{t('sleepArchitecture.tempC') || 'Temp (°C)'}</Text>
            <TextInput style={s.input} value={tempC} onChangeText={setTempC} keyboardType="numeric" placeholder="e.g. 22" placeholderTextColor={C.muted} accessibilityLabel="Temperature input" />
          </View>
          <View style={s.inputRow}>
            <Text style={s.inputLabel}>{t('sleepArchitecture.humidityPct') || 'Humidity (%)'}</Text>
            <TextInput style={s.input} value={humidity} onChangeText={setHumidity} keyboardType="numeric" placeholder="e.g. 50" placeholderTextColor={C.muted} accessibilityLabel="Humidity input" />
          </View>
          <Text style={[s.infoText, { marginTop: 8 }]}>{t('sleepArchitecture.noiseLevel') || 'Noise Level'}</Text>
          <View style={s.chipRow}>
            {NOISE_LEVELS.map((lvl, i) => (
              <Chip key={lvl} label={lvl} active={noiseLvl === i}
                onPress={() => setNoiseLvl(i)} />
            ))}
          </View>
          <Text style={[s.infoText, { marginTop: 8 }]}>{t('sleepArchitecture.lightLevel') || 'Light Level'}</Text>
          <View style={s.chipRow}>
            {LIGHT_LEVELS.map((lvl, i) => (
              <Chip key={lvl} label={lvl} active={lightLvl === i}
                onPress={() => setLightLvl(i)} />
            ))}
          </View>
          <TouchableOpacity style={s.btn} onPress={saveEnvironment} accessibilityLabel="Save environment entry" accessibilityRole="button">
            <Text style={s.btnText}>{t('sleepArchitecture.saveEnvironment') || 'Save Environment'}</Text>
          </TouchableOpacity>
        </View>

        {/* Log Today's Sleep */}
        <View style={s.section}>
          <Text style={s.sectionTitle} accessibilityLabel="Log today's sleep">{t('sleepArchitecture.logToday') || "Log Today's Sleep"}</Text>
          <View style={s.inputRow}>
            <Text style={s.inputLabel}>{t('sleepArchitecture.totalMin') || 'Total sleep (min)'}</Text>
            <TextInput style={s.input} value={totalMin} onChangeText={setTotalMin} keyboardType="numeric" placeholder="e.g. 720" placeholderTextColor={C.muted} accessibilityLabel="Total sleep minutes input" />
          </View>
          <View style={s.inputRow}>
            <Text style={s.inputLabel}>{t('sleepArchitecture.wakings') || 'Night wakings'}</Text>
            <TextInput style={s.input} value={nightWakings} onChangeText={setNightWakings} keyboardType="numeric" placeholder="e.g. 2" placeholderTextColor={C.muted} accessibilityLabel="Night wakings input" />
          </View>
          <View style={s.inputRow}>
            <Text style={s.inputLabel}>{t('sleepArchitecture.settleMin') || 'Time to sleep (min)'}</Text>
            <TextInput style={s.input} value={timeToSleep} onChangeText={setTimeToSleep} keyboardType="numeric" placeholder="e.g. 10" placeholderTextColor={C.muted} accessibilityLabel="Time to sleep minutes input" />
          </View>
          <View style={s.inputRow}>
            <Text style={s.inputLabel}>{t('sleepArchitecture.wasoMin') || 'WASO (min)'}</Text>
            <TextInput style={s.input} value={wasoMin} onChangeText={setWasoMin} keyboardType="numeric" placeholder="e.g. 15" placeholderTextColor={C.muted} accessibilityLabel="Wake after sleep onset minutes input" />
          </View>
          <TouchableOpacity style={s.btn} onPress={saveArchitecture} accessibilityLabel="Save sleep log entry" accessibilityRole="button">
            <Text style={s.btnText}>{t('sleepArchitecture.saveSleep') || 'Save Sleep Log'}</Text>
          </TouchableOpacity>
        </View>

        {/* Regression Prediction */}
        <View style={s.section}>
          <Text style={s.sectionTitle} accessibilityLabel="Regression Prediction">{t('sleepArchitecture.regression') || 'Regression Prediction'}</Text>
          <View style={s.infoCard}>
            <Text style={s.infoText}>
              📆 {t('sleepArchitecture.regressionInfo') || 'Developmental regressions to watch for:'}{'\n\n'}
              🔵 <Text style={{ fontWeight: '600' }}>4-Month Regression</Text>: ~4 months — sleep architecture permanently changes{'\n'}
              🟡 <Text style={{ fontWeight: '600' }}>8-Month Storm</Text>: ~8 months — motor + social + sleep convergence{'\n'}
              🟠 <Text style={{ fontWeight: '600' }}>12-Month Sleep Shift</Text>: walking milestone disrupts sleep{'\n'}
              🔴 <Text style={{ fontWeight: '600' }}>18-Month Toddler Regression</Text>: language explosion, separation anxiety{'\n'}
              {'\n'}{t('sleepArchitecture.regressionHint') || 'Track baby age to receive advance alerts before each regression window.'}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}