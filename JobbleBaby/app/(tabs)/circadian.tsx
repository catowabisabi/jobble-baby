import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

type CaregiverShift = 'day' | 'night';

interface BabyProfile {
  name: string;
  birthDate: string;
  caregiverShift?: CaregiverShift;
}

interface TummyTimeEntry {
  id: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  date: string;
}

interface ScheduleEntry {
  id: string;
  type: 'feed' | 'diaper' | 'sleep' | 'temperature';
  time: string;
  date: string;
  note?: string;
}

interface PhaseInfo {
  label: string;
  color: string;
  minutesRemaining: number;
  nextPhase: string;
}

function getBabyAge(birthDateStr: string): { days: number; weeks: number; months: number } {
  try {
    const birth = new Date(birthDateStr);
    const now = new Date();
    const diffMs = now.getTime() - birth.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    return { days, weeks, months };
  } catch {
    return { days: 0, weeks: 0, months: 0 };
  }
}

function getOptimalWakeWindow(days: number): number {
  // Age-based wake window in minutes
  if (days < 56) return 60; // 0-8 weeks: ~60 min
  if (days < 84) return 75; // 8-12 weeks: ~75 min
  if (days < 140) return 90; // 12-20 weeks: ~90 min
  if (days < 210) return 120; // 20-30 weeks: ~2hr
  return 150; // 30+ weeks: ~2.5hr
}

function getCurrentPhase(hour: number): PhaseInfo {
  // Simple phase model: sleep (10pm-6am), feeding (6am-10am, 2pm-4pm), wake (rest)
  if (hour >= 22 || hour < 6) {
    return { label: 'Sleep', color: '#3B82F6', minutesRemaining: 0, nextPhase: 'Feeding' };
  }
  if ((hour >= 6 && hour < 10) || (hour >= 14 && hour < 16)) {
    return { label: 'Feeding', color: '#F59E0B', minutesRemaining: 0, nextPhase: 'Wake' };
  }
  return { label: 'Wake', color: '#EF4444', minutesRemaining: 0, nextPhase: 'Sleep' };
}

function getShiftColor(shift: CaregiverShift): string {
  return shift === 'day' ? '#F59E0B' : '#3B82F6';
}

function getShiftLabel(shift: CaregiverShift): string {
  return shift === 'day' ? 'Day Parent' : 'Night Parent';
}

export default function CircadianScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [tummyTimeEntries, setTummyTimeEntries] = useState<TummyTimeEntry[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [phaseInfo, setPhaseInfo] = useState<PhaseInfo>({ label: 'Wake', color: '#EF4444', minutesRemaining: 0, nextPhase: 'Sleep' });
  const [isTummyTimerRunning, setIsTummyTimerRunning] = useState(false);
  const [tummyStartTime, setTummyStartTime] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    try {
      // Load profile
      const profileStr = await safeGetItem('@jobble_baby_profile');
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        setBabyProfile(profile);
      }

      // Load tummy time entries
      const tummyStr = await safeGetItem(STORAGE_KEYS.TUMMY_TIME_ENTRIES);
      if (tummyStr) {
        setTummyTimeEntries(JSON.parse(tummyStr));
      }

      // Load schedule entries
      const scheduleStr = await safeGetItem(STORAGE_KEYS.SCHEDULE_ENTRIES);
      if (scheduleStr) {
        setScheduleEntries(JSON.parse(scheduleStr));
      }
    } catch (e) {
      // silent fail
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update phase every minute
  useEffect(() => {
    const updatePhase = () => {
      const now = new Date();
      const hour = now.getHours();
      const phase = getCurrentPhase(hour);
      setPhaseInfo(phase);
    };
    updatePhase();
    const interval = setInterval(updatePhase, 60000);
    return () => clearInterval(interval);
  }, []);

  const babyAge = babyProfile?.birthDate ? getBabyAge(babyProfile.birthDate) : { days: 0, weeks: 0, months: 0 };
  const caregiverShift: CaregiverShift = (babyProfile as any)?.caregiverShift || 'day';
  const shiftColor = getShiftColor(caregiverShift);

  // Get last events from schedule
  const lastFeed = scheduleEntries.filter(e => e.type === 'feed').sort((a, b) => `${a.date}T${a.time}` > `${b.date}T${b.time}` ? -1 : 1)[0];
  const lastDiaper = scheduleEntries.filter(e => e.type === 'diaper').sort((a, b) => `${a.date}T${a.time}` > `${b.date}T${b.time}` ? -1 : 1)[0];
  const lastSleep = scheduleEntries.filter(e => e.type === 'sleep').sort((a, b) => `${a.date}T${a.time}` > `${b.date}T${b.time}` ? -1 : 1)[0];

  // Today's tummy time total
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTummyTotal = tummyTimeEntries
    .filter(e => e.date === todayStr)
    .reduce((sum, e) => sum + e.duration, 0);

  // Weekly tummy time total
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekTummyTotal = tummyTimeEntries
    .filter(e => new Date(e.date) >= weekAgo)
    .reduce((sum, e) => sum + e.duration, 0);

  // Handoff countdown (simplified: next nap end + wake window)
  const optimalWakeWindow = getOptimalWakeWindow(babyAge.days);
  const nextNapEnd = lastSleep ? `${lastSleep.time}` : '--:--';
  const handoffTime = nextNapEnd !== '--:--' ? `${nextNapEnd} + ${optimalWakeWindow}min` : '--';

  const handleStartTummy = () => {
    setIsTummyTimerRunning(true);
    setTummyStartTime(new Date());
  };

  const handleEndTummy = async () => {
    if (!tummyStartTime) return;
    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - tummyStartTime.getTime()) / 60000);
    const entry: TummyTimeEntry = {
      id: `tt_${Date.now()}`,
      startTime: tummyStartTime.toTimeString().slice(0, 5),
      endTime: endTime.toTimeString().slice(0, 5),
      duration,
      date: todayStr,
    };
    const updated = [entry, ...tummyTimeEntries];
    setTummyTimeEntries(updated);
    await safeSetItem(STORAGE_KEYS.TUMMY_TIME_ENTRIES, JSON.stringify(updated));
    setIsTummyTimerRunning(false);
    setTummyStartTime(null);
    Alert.alert('Tummy Time Logged', `${duration} minutes recorded!`);
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    shiftBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    },
    shiftDot: { width: 8, height: 8, borderRadius: 4 },
    shiftText: { fontSize: 12, fontWeight: '600' },
    title: { fontSize: 28, fontWeight: 'bold', color: C.text },
    babyAgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    agePill: { backgroundColor: C.card, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    ageText: { fontSize: 13, color: C.text },
    phaseRingContainer: { alignItems: 'center', marginBottom: 24 },
    phaseRing: { width: 160, height: 160, borderRadius: 80, borderWidth: 12, alignItems: 'center', justifyContent: 'center' },
    phaseLabel: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    phaseSubtext: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 12 },
    card: {
      backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16,
      borderWidth: 1, borderColor: C.border,
    },
    handoffRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    handoffLabel: { fontSize: 13, color: C.muted },
    handoffValue: { fontSize: 32, fontWeight: 'bold', color: C.text },
    handoffUnit: { fontSize: 14, color: C.muted },
    handoffNext: { fontSize: 13, color: C.muted, marginTop: 4 },
    summaryGrid: { flexDirection: 'row', gap: 12 },
    summaryItem: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12, alignItems: 'center' },
    summaryIcon: { fontSize: 20, marginBottom: 4 },
    summaryLabel: { fontSize: 11, color: C.muted },
    summaryValue: { fontSize: 14, fontWeight: '600', color: C.text },
    tummySection: { marginBottom: 16 },
    tummyRow: { flexDirection: 'row', gap: 12 },
    tummyStat: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12, alignItems: 'center' },
    tummyStatValue: { fontSize: 24, fontWeight: 'bold', color: C.text },
    tummyStatLabel: { fontSize: 12, color: C.muted, marginTop: 2 },
    tummyButtonRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
    tummyBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
    tummyBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
    runningBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
    runningText: { fontSize: 12, fontWeight: '600', color: '#fff' },
    wakeWindowCard: {
      backgroundColor: C.card, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: C.border, marginBottom: 16,
    },
    wakeWindowRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    wakeWindowIcon: { fontSize: 28 },
    wakeWindowInfo: { flex: 1 },
    wakeWindowTitle: { fontSize: 15, fontWeight: '600', color: C.text },
    wakeWindowSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>{t('tabs.circadian') || 'Circadian'}</Text>
            <View style={[styles.shiftBadge, { backgroundColor: shiftColor + '22' }]}>
              <View style={[styles.shiftDot, { backgroundColor: shiftColor }]} />
              <Text style={[styles.shiftText, { color: shiftColor }]}>
                {getShiftLabel(caregiverShift)}
              </Text>
            </View>
          </View>
          <View style={styles.babyAgeRow}>
            <View style={styles.agePill}><Text style={styles.ageText}>{babyAge.days} days</Text></View>
            <View style={styles.agePill}><Text style={styles.ageText}>{babyAge.weeks} weeks</Text></View>
            <View style={styles.agePill}><Text style={styles.ageText}>{babyAge.months} months</Text></View>
          </View>
        </View>

        {/* Phase Ring */}
        <View style={styles.phaseRingContainer}>
          <View style={[styles.phaseRing, { borderColor: phaseInfo.color, backgroundColor: phaseInfo.color + '33' }]}>
            <Text style={styles.phaseLabel}>{phaseInfo.label}</Text>
            <Text style={styles.phaseSubtext}>{phaseInfo.nextPhase} next</Text>
          </View>
        </View>

        {/* Wake Window */}
        <View style={styles.wakeWindowCard}>
          <View style={styles.wakeWindowRow}>
            <Text style={styles.wakeWindowIcon}>☀</Text>
            <View style={styles.wakeWindowInfo}>
              <Text style={styles.wakeWindowTitle}>{t('circadian.optimalWakeWindow')}: {optimalWakeWindow} min</Text>
              <Text style={styles.wakeWindowSub}>{t('circadian.forBabyAge').replace('{days}', String(babyAge.days))}</Text>
            </View>
          </View>
        </View>

        {/* Handoff Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('circadian.optimalHandoff')}</Text>
          <View style={styles.handoffRow}>
            <View>
              <Text style={styles.handoffLabel}>{t('circadian.lastSleepEnded')}</Text>
              <Text style={styles.handoffValue}>{nextNapEnd}</Text>
              <Text style={styles.handoffNext}>+ {optimalWakeWindow}min {t('circadian.wakeWindow')}</Text>
            </View>
            <MaterialCommunityIcons name="arrow-right-circle" size={32} color={C.muted} />
          </View>
        </View>

        {/* Last Events Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('circadian.handoffSummary')}</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryIcon}>🍼</Text>
              <Text style={styles.summaryLabel}>{t('circadian.lastFeed')}</Text>
              <Text style={styles.summaryValue}>{lastFeed?.time || '--:--'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryIcon}>🧷</Text>
              <Text style={styles.summaryLabel}>{t('circadian.lastDiaper')}</Text>
              <Text style={styles.summaryValue}>{lastDiaper?.time || '--:--'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryIcon}>🌙</Text>
              <Text style={styles.summaryLabel}>{t('circadian.lastSleep')}</Text>
              <Text style={styles.summaryValue}>{lastSleep?.time || '--:--'}</Text>
            </View>
          </View>
        </View>

        {/* Tummy Time Tracker */}
        <View style={styles.tummySection}>
          <Text style={styles.sectionTitle}>{t('circadian.tummyTime')}</Text>
          <View style={styles.tummyRow}>
            <View style={styles.tummyStat}>
              <Text style={styles.tummyStatValue}>{todayTummyTotal}</Text>
              <Text style={styles.tummyStatLabel}>{t('circadian.minToday')}</Text>
            </View>
            <View style={styles.tummyStat}>
              <Text style={styles.tummyStatValue}>{weekTummyTotal}</Text>
              <Text style={styles.tummyStatLabel}>{t('circadian.minThisWeek')}</Text>
            </View>
          </View>
          {isTummyTimerRunning ? (
            <View>
              <View style={styles.runningBadge}>
                <Text style={styles.runningText}>{t('circadian.timerRunning')}</Text>
              </View>
              <View style={styles.tummyButtonRow}>
                <TouchableOpacity
                  accessibilityLabel="End tummy time session"
                  accessibilityHint="Stops the tummy time timer and saves the session"
                  style={[styles.tummyBtn, { backgroundColor: '#EF4444' }]}
                  onPress={handleEndTummy}
                >
                  <Text style={styles.tummyBtnText}>{t('circadian.endSession')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.tummyButtonRow}>
              <TouchableOpacity
                  accessibilityLabel="Start tummy time"
                  accessibilityHint="Starts the tummy time tracking timer"
                  style={[styles.tummyBtn, { backgroundColor: '#3B82F6' }]}
                  onPress={handleStartTummy}
                >
                  <Text style={styles.tummyBtnText}>{t('circadian.startTummyTime')}</Text>
                </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Dusk Light Navigator */}
        <DuskLightNavigator C={C} t={t} />
      </ScrollView>
    </SafeAreaView>
  );
}

// === Dusk Light Navigator Sub-Component ===
interface LightExposureEntry {
  id: string;
  date: string;
  outdoorSun: number; // minutes
  outdoorShade: number;
  indoorBright: number;
  indoorDim: number;
  screenTime: number;
  time: string;
}

interface DuskAlarmSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

interface MelatoninSettings {
  screenCutoffHours: number;
  minLuxDistance: string;
}

interface PhaseShiftPlan {
  currentSleepTime: string;
  targetSleepTime: string;
  daysToShift: number;
  brightLightMorningStart: string;
  brightLightMorningEnd: string;
  dimLightEveningStart: string;
  dimLightEveningEnd: string;
  active: boolean;
}

function DuskLightNavigator({ C, t }: { C: any; t: (key: string) => string }) {
  const [lightLog, setLightLog] = useState<LightExposureEntry[]>([]);
  const [duskAlarm, setDuskAlarm] = useState<DuskAlarmSettings>({ enabled: false, hour: 19, minute: 0 });
  const [melatoninSettings, setMelatoninSettings] = useState<MelatoninSettings>({ screenCutoffHours: 1, minLuxDistance: '>1m, <50 lux' });
  const [phaseShiftPlan, setPhaseShiftPlan] = useState<PhaseShiftPlan | null>(null);
  const [showLightLogger, setShowLightLogger] = useState(false);
  const [showPhaseShift, setShowPhaseShift] = useState(false);
  const [logForm, setLogForm] = useState({ outdoorSun: '', outdoorShade: '', indoorBright: '', indoorDim: '', screenTime: '' });
  const [shiftForm, setShiftForm] = useState({ currentSleep: '22:00', targetSleep: '20:00', daysToShift: '3' });

  useEffect(() => {
    loadDuskData();
  }, []);

  const loadDuskData = async () => {
    try {
      const lightStr = await safeGetItem(STORAGE_KEYS.LIGHT_EXPOSURE_LOG);
      if (lightStr) setLightLog(JSON.parse(lightStr));
      const alarmStr = await safeGetItem(STORAGE_KEYS.DUSK_ALARM_TIME);
      if (alarmStr) setDuskAlarm(JSON.parse(alarmStr));
      const melStr = await safeGetItem(STORAGE_KEYS.MELATONIN_SETTINGS);
      if (melStr) setMelatoninSettings(JSON.parse(melStr));
      const phaseStr = await safeGetItem(STORAGE_KEYS.PHASE_SHIFT_PLAN);
      if (phaseStr) setPhaseShiftPlan(JSON.parse(phaseStr));
    } catch (e) { /* silent */ }
  };

  const handleLogLight = async () => {
    const entry: LightExposureEntry = {
      id: `le_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      outdoorSun: parseInt(logForm.outdoorSun) || 0,
      outdoorShade: parseInt(logForm.outdoorShade) || 0,
      indoorBright: parseInt(logForm.indoorBright) || 0,
      indoorDim: parseInt(logForm.indoorDim) || 0,
      screenTime: parseInt(logForm.screenTime) || 0,
    };
    const updated = [entry, ...lightLog].slice(0, 30);
    setLightLog(updated);
    await safeSetItem(STORAGE_KEYS.LIGHT_EXPOSURE_LOG, JSON.stringify(updated));
    setLogForm({ outdoorSun: '', outdoorShade: '', indoorBright: '', indoorDim: '', screenTime: '' });
    setShowLightLogger(false);
    Alert.alert(t('duskLight.logSaved') || 'Light Log Saved', `${entry.outdoorSun + entry.outdoorShade + entry.indoorBright + entry.indoorDim + entry.screenTime} min total logged`);
  };

  const handleSaveAlarm = async (hour: number, minute: number, enabled: boolean) => {
    const settings = { enabled, hour, minute };
    setDuskAlarm(settings);
    await safeSetItem(STORAGE_KEYS.DUSK_ALARM_TIME, JSON.stringify(settings));
    Alert.alert(t('duskLight.alarmSaved') || 'Alarm Saved', enabled ? `${hour}:${minute.toString().padStart(2, '0')} ${t('duskLight.dailyReminder') || 'daily reminder'}` : t('duskLight.alarmDisabled') || 'Alarm disabled');
  };

  const handleCalculatePhaseShift = async () => {
    const current = shiftForm.currentSleep;
    const target = shiftForm.targetSleep;
    const days = parseInt(shiftForm.daysToShift) || 3;
    const shiftHours = (parseInt(target.split(':')[0]) - parseInt(current.split(':')[0]) + 24) % 24;
    const brightStart = `${Math.max(6, 7 - Math.floor(shiftHours / 2))}:00`;
    const brightEnd = `${Math.min(10, 9 - Math.floor(shiftHours / 2))}:00`;
    const dimStart = `${Math.max(17, 20 - Math.floor(shiftHours / 2))}:00`;
    const dimEnd = `${Math.min(21, 21 - Math.floor(shiftHours / 2))}:00`;
    const plan: PhaseShiftPlan = {
      currentSleepTime: current,
      targetSleepTime: target,
      daysToShift: days,
      brightLightMorningStart: brightStart,
      brightLightMorningEnd: brightEnd,
      dimLightEveningStart: dimStart,
      dimLightEveningEnd: dimEnd,
      active: true,
    };
    setPhaseShiftPlan(plan);
    await safeSetItem(STORAGE_KEYS.PHASE_SHIFT_PLAN, JSON.stringify(plan));
    setShowPhaseShift(false);
    Alert.alert(t('duskLight.phaseShiftCalculated') || 'Phase Shift Calculated', `${t('duskLight.brightLightMorning') || 'Bright light'}: ${brightStart}-${brightEnd}\n${t('duskLight.dimLightEvening') || 'Dim light'}: ${dimStart}-${dimEnd}`);
  };

  const todayLight = lightLog.find(e => e.date === new Date().toISOString().split('T')[0]);
  const todayTotal = todayLight ? todayLight.outdoorSun + todayLight.outdoorShade + todayLight.indoorBright + todayLight.indoorDim + todayLight.screenTime : 0;

  const styles = StyleSheet.create({
    duskSection: { marginTop: 8 },
    duskCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    duskTitle: { fontSize: 18, fontWeight: 'bold', color: C.text, marginBottom: 12 },
    lightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    lightItem: { backgroundColor: C.background, borderRadius: 12, padding: 12, alignItems: 'center', minWidth: '45%' },
    lightIcon: { fontSize: 24, marginBottom: 4 },
    lightLabel: { fontSize: 11, color: C.muted },
    lightValue: { fontSize: 16, fontWeight: '600', color: C.text },
    lightInput: { backgroundColor: C.background, borderRadius: 8, padding: 10, color: C.text, fontSize: 14, minWidth: 80 },
    lightInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    lightInputLabel: { fontSize: 13, color: C.muted, minWidth: 100 },
    alarmRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    alarmTime: { fontSize: 24, fontWeight: 'bold', color: C.text },
    alarmToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    alarmBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: C.background },
    alarmBtnText: { fontSize: 14, color: C.text },
    melCard: { backgroundColor: '#2D1F4E', borderRadius: 12, padding: 14, marginBottom: 12 },
    melTitle: { fontSize: 14, fontWeight: '600', color: '#E8D5FF', marginBottom: 8 },
    melText: { fontSize: 12, color: '#D4C4E8', lineHeight: 18 },
    melHighlight: { fontWeight: 'bold', color: '#FFD700' },
    phaseCard: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 12 },
    phaseTitle: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 8 },
    phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    phaseIcon: { fontSize: 16 },
    phaseLabel: { fontSize: 12, color: C.muted, flex: 1 },
    phaseTime: { fontSize: 14, fontWeight: '600', color: '#10B981' },
    phaseDimTime: { fontSize: 14, fontWeight: '600', color: '#6366F1' },
    physioTip: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginTop: 8 },
    physioTipText: { fontSize: 12, color: '#92400E', lineHeight: 18 },
    physioLink: { color: '#D97706', fontWeight: '600', textDecorationLine: 'underline' },
    logBtn: { backgroundColor: '#8B5CF6', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
    logBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    expandBtn: { backgroundColor: C.background, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
    expandBtnText: { color: C.text, fontSize: 13 },
    calcBtn: { backgroundColor: '#10B981', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
    calcBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    inputLabel: { fontSize: 13, color: C.muted, minWidth: 110 },
    textInput: { backgroundColor: C.background, borderRadius: 8, padding: 10, color: C.text, fontSize: 14, flex: 1 },
  });

  return (
    <View style={styles.duskSection}>
      <Text style={[styles.duskTitle, { color: C.text }]}>{t('duskLight.title') || '🌙 Dusk Light Navigator'}</Text>

      {/* Light Exposure Summary */}
      <View style={styles.duskCard}>
        <Text style={styles.duskTitle}>{t('duskLight.lightExposure') || 'Light Exposure Today'}</Text>
        <View style={styles.lightGrid}>
          <View style={styles.lightItem}>
            <Text style={styles.lightIcon}>☀️</Text>
            <Text style={styles.lightLabel}>{t('duskLight.outdoorSun') || 'Outdoor Sun'}</Text>
            <Text style={styles.lightValue}>{todayLight?.outdoorSun || 0} min</Text>
          </View>
          <View style={styles.lightItem}>
            <Text style={styles.lightIcon}>🌳</Text>
            <Text style={styles.lightLabel}>{t('duskLight.shade') || 'Shade'}</Text>
            <Text style={styles.lightValue}>{todayLight?.outdoorShade || 0} min</Text>
          </View>
          <View style={styles.lightItem}>
            <Text style={styles.lightIcon}>💡</Text>
            <Text style={styles.lightLabel}>{t('duskLight.indoorBright') || 'Indoor Bright'}</Text>
            <Text style={styles.lightValue}>{todayLight?.indoorBright || 0} min</Text>
          </View>
          <View style={styles.lightItem}>
            <Text style={styles.lightIcon}>🌙</Text>
            <Text style={styles.lightLabel}>{t('duskLight.indoorDim') || 'Indoor Dim'}</Text>
            <Text style={styles.lightValue}>{todayLight?.indoorDim || 0} min</Text>
          </View>
          <View style={styles.lightItem}>
            <Text style={styles.lightIcon}>📱</Text>
            <Text style={styles.lightLabel}>{t('duskLight.screenTime') || 'Screen Time'}</Text>
            <Text style={styles.lightValue}>{todayLight?.screenTime || 0} min</Text>
          </View>
          <View style={styles.lightItem}>
            <Text style={styles.lightIcon}>📊</Text>
            <Text style={styles.lightLabel}>{t('duskLight.total') || 'Total'}</Text>
            <Text style={styles.lightValue}>{todayTotal} min</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.expandBtn} onPress={() => setShowLightLogger(!showLightLogger)} accessibilityLabel={showLightLogger ? t('duskLight.hideLogger') : t('duskLight.logLight')}>
          <Text style={styles.expandBtnText}>{showLightLogger ? (t('duskLight.hideLogger') || 'Hide Logger') : (t('duskLight.logLight') || '+ Log Light Exposure')}</Text>
        </TouchableOpacity>
        {showLightLogger && (
          <View style={{ marginTop: 12 }}>
            <View style={styles.lightInputRow}>
              <Text style={styles.lightInputLabel}>{t('duskLight.outdoorSun') || 'Outdoor Sun (min)'}</Text>
              <TextInput style={styles.lightInput} keyboardType="numeric" value={logForm.outdoorSun} onChangeText={(v) => setLogForm({ ...logForm, outdoorSun: v })} placeholder="0" placeholderTextColor={C.muted} />
            </View>
            <View style={styles.lightInputRow}>
              <Text style={styles.lightInputLabel}>{t('duskLight.shade') || 'Shade (min)'}</Text>
              <TextInput style={styles.lightInput} keyboardType="numeric" value={logForm.outdoorShade} onChangeText={(v) => setLogForm({ ...logForm, outdoorShade: v })} placeholder="0" placeholderTextColor={C.muted} />
            </View>
            <View style={styles.lightInputRow}>
              <Text style={styles.lightInputLabel}>{t('duskLight.indoorBright') || 'Indoor Bright (min)'}</Text>
              <TextInput style={styles.lightInput} keyboardType="numeric" value={logForm.indoorBright} onChangeText={(v) => setLogForm({ ...logForm, indoorBright: v })} placeholder="0" placeholderTextColor={C.muted} />
            </View>
            <View style={styles.lightInputRow}>
              <Text style={styles.lightInputLabel}>{t('duskLight.indoorDim') || 'Indoor Dim (min)'}</Text>
              <TextInput style={styles.lightInput} keyboardType="numeric" value={logForm.indoorDim} onChangeText={(v) => setLogForm({ ...logForm, indoorDim: v })} placeholder="0" placeholderTextColor={C.muted} />
            </View>
            <View style={styles.lightInputRow}>
              <Text style={styles.lightInputLabel}>{t('duskLight.screenTime') || 'Screen Time (min)'}</Text>
              <TextInput style={styles.lightInput} keyboardType="numeric" value={logForm.screenTime} onChangeText={(v) => setLogForm({ ...logForm, screenTime: v })} placeholder="0" placeholderTextColor={C.muted} />
            </View>
            <TouchableOpacity style={styles.logBtn} onPress={handleLogLight} accessibilityLabel={t('duskLight.saveLog')}>
              <Text style={styles.logBtnText}>{t('duskLight.saveLog') || 'Save Log'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Dusk Light Alarm */}
      <View style={styles.duskCard}>
        <Text style={styles.duskTitle}>{t('duskLight.duskAlarm') || '🌆 Dusk Light Alarm'}</Text>
        <View style={styles.alarmRow}>
          <Text style={styles.alarmTime}>{duskAlarm.hour.toString().padStart(2, '0')}:{duskAlarm.minute.toString().padStart(2, '0')}</Text>
          <View style={styles.alarmToggle}>
            <TouchableOpacity style={[styles.alarmBtn, { backgroundColor: duskAlarm.enabled ? '#10B981' : C.background }]} onPress={() => handleSaveAlarm(duskAlarm.hour, duskAlarm.minute, !duskAlarm.enabled)} accessibilityLabel={duskAlarm.enabled ? t('duskLight.enabled') : t('duskLight.disabled')}>
              <Text style={[styles.alarmBtnText, { color: duskAlarm.enabled ? '#fff' : C.text }]}>{duskAlarm.enabled ? (t('duskLight.enabled') || 'ON') : (t('duskLight.disabled') || 'OFF')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[styles.alarmBtn, { flex: 1 }]} onPress={() => handleSaveAlarm(Math.max(0, duskAlarm.hour - 1), duskAlarm.minute, duskAlarm.enabled)} accessibilityLabel="Decrease alarm hour by 1">
            <Text style={styles.alarmBtnText}>-1h</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.alarmBtn, { flex: 1 }]} onPress={() => handleSaveAlarm(Math.min(23, duskAlarm.hour + 1), duskAlarm.minute, duskAlarm.enabled)} accessibilityLabel="Increase alarm hour by 1">
            <Text style={styles.alarmBtnText}>+1h</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>{t('duskLight.alarmHint') || 'Sets daily reminder for dusk light exposure'}</Text>
      </View>

      {/* Melatonin Optimization Guide */}
      <View style={styles.duskCard}>
        <Text style={styles.duskTitle}>{t('duskLight.melatoninGuide') || '😴 Melatonin Optimization'}</Text>
        <View style={styles.melCard}>
          <Text style={styles.melTitle}>{t('duskLight.melatoninTitle') || 'Light → Baby Sleep Quality'}</Text>
          <Text style={styles.melText}>
            {t('duskLight.melatoninTip1') || 'Evening light exposure directly affects melatonin production. Keep room dim (<50 lux) and >1m from crib.'}{'\n'}
            <Text style={styles.melHighlight}>{t('duskLight.screenCutoff') || 'Screen cutoff: 1hr before bedtime'}</Text>
          </Text>
        </View>
        <View style={styles.melCard}>
          <Text style={styles.melTitle}>{t('duskLight.bedtimeRoutine') || 'Bedtime Light Routine'}</Text>
          <Text style={styles.melText}>
            • {t('duskLight.dimLights') || 'Dim lights 2hr before sleep'}{'\n'}
            • {t('duskLight.noBlueLight') || 'Avoid blue light 1hr before'}{'\n'}
            • {t('duskLight.nightLightRed') || 'If night light needed, use red/orange'}{'\n'}
            • {t('duskLight.cribDistance') || 'Light source >1m from crib, <50 lux'}
          </Text>
        </View>
      </View>

      {/* Light Therapy Prescriber */}
      <View style={styles.duskCard}>
        <Text style={styles.duskTitle}>{t('duskLight.lightTherapy') || '🕐 Light Therapy Prescriber'}</Text>
        <Text style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>{t('duskLight.jetLagHint') || 'For jet lag or day-night confusion: input times to generate schedule'}</Text>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>{t('duskLight.currentSleep') || 'Current sleep'}</Text>
          <TextInput style={styles.textInput} value={shiftForm.currentSleep} onChangeText={(v) => setShiftForm({ ...shiftForm, currentSleep: v })} placeholder="22:00" placeholderTextColor={C.muted} />
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>{t('duskLight.targetSleep') || 'Target sleep'}</Text>
          <TextInput style={styles.textInput} value={shiftForm.targetSleep} onChangeText={(v) => setShiftForm({ ...shiftForm, targetSleep: v })} placeholder="20:00" placeholderTextColor={C.muted} />
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>{t('duskLight.daysToShift') || 'Days to shift'}</Text>
          <TextInput style={styles.textInput} keyboardType="numeric" value={shiftForm.daysToShift} onChangeText={(v) => setShiftForm({ ...shiftForm, daysToShift: v })} placeholder="3" placeholderTextColor={C.muted} />
        </View>
        <TouchableOpacity style={styles.calcBtn} onPress={handleCalculatePhaseShift} accessibilityLabel={t('duskLight.calculate')}>
          <Text style={styles.calcBtnText}>{t('duskLight.calculate') || 'Calculate Schedule'}</Text>
        </TouchableOpacity>
        {phaseShiftPlan?.active && (
          <View style={{ marginTop: 12 }}>
            <View style={styles.phaseCard}>
              <Text style={styles.phaseTitle}>{t('duskLight.prescribedSchedule') || 'Prescribed Schedule'}</Text>
              <View style={styles.phaseRow}>
                <Text style={styles.phaseIcon}>☀️</Text>
                <Text style={styles.phaseLabel}>{t('duskLight.brightLightMorning') || 'Bright light morning'}</Text>
                <Text style={styles.phaseTime}>{phaseShiftPlan.brightLightMorningStart}-{phaseShiftPlan.brightLightMorningEnd}</Text>
              </View>
              <View style={styles.phaseRow}>
                <Text style={styles.phaseIcon}>🌙</Text>
                <Text style={styles.phaseLabel}>{t('duskLight.dimLightEvening') || 'Dim light evening'}</Text>
                <Text style={styles.phaseDimTime}>{phaseShiftPlan.dimLightEveningStart}-{phaseShiftPlan.dimLightEveningEnd}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Physiological Sigh Integration */}
      <View style={styles.duskCard}>
        <Text style={styles.duskTitle}>{t('duskLight.physioSigh') || '🫁 Physiological Sigh'}</Text>
        <View style={styles.physioTip}>
          <Text style={styles.physioTipText}>
            {t('duskLight.physioSighTip') || 'Double inhale through nose + long exhale activates parasympathetic system, calming baby fast.'}{'\n\n'}
            <Text style={styles.physioLink}>{t('duskLight.stressCascadeLink') || 'See Stress Support tab for full cascade mapping'}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}