import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';

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
      const profileStr = await AsyncStorage.getItem('@jobble_baby_profile');
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        setBabyProfile(profile);
      }

      // Load tummy time entries
      const tummyStr = await AsyncStorage.getItem('@jobble/tummy_time_entries');
      if (tummyStr) {
        setTummyTimeEntries(JSON.parse(tummyStr));
      }

      // Load schedule entries
      const scheduleStr = await AsyncStorage.getItem('@jobble/schedule_entries');
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
    await AsyncStorage.setItem('@jobble/tummy_time_entries', JSON.stringify(updated));
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
              <Text style={styles.wakeWindowTitle}>Optimal Wake Window: {optimalWakeWindow} min</Text>
              <Text style={styles.wakeWindowSub}>For {babyAge.days}-day-old baby</Text>
            </View>
          </View>
        </View>

        {/* Handoff Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Optimal Handoff</Text>
          <View style={styles.handoffRow}>
            <View>
              <Text style={styles.handoffLabel}>Last sleep ended</Text>
              <Text style={styles.handoffValue}>{nextNapEnd}</Text>
              <Text style={styles.handoffNext}>+ {optimalWakeWindow}min wake window</Text>
            </View>
            <MaterialCommunityIcons name="arrow-right-circle" size={32} color={C.muted} />
          </View>
        </View>

        {/* Last Events Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Handoff Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryIcon}>🍼</Text>
              <Text style={styles.summaryLabel}>Last feed</Text>
              <Text style={styles.summaryValue}>{lastFeed?.time || '--:--'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryIcon}>🧷</Text>
              <Text style={styles.summaryLabel}>Last diaper</Text>
              <Text style={styles.summaryValue}>{lastDiaper?.time || '--:--'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryIcon}>🌙</Text>
              <Text style={styles.summaryLabel}>Last sleep</Text>
              <Text style={styles.summaryValue}>{lastSleep?.time || '--:--'}</Text>
            </View>
          </View>
        </View>

        {/* Tummy Time Tracker */}
        <View style={styles.tummySection}>
          <Text style={styles.sectionTitle}>Tummy Time</Text>
          <View style={styles.tummyRow}>
            <View style={styles.tummyStat}>
              <Text style={styles.tummyStatValue}>{todayTummyTotal}</Text>
              <Text style={styles.tummyStatLabel}>min today</Text>
            </View>
            <View style={styles.tummyStat}>
              <Text style={styles.tummyStatValue}>{weekTummyTotal}</Text>
              <Text style={styles.tummyStatLabel}>min this week</Text>
            </View>
          </View>
          {isTummyTimerRunning ? (
            <View>
              <View style={styles.runningBadge}>
                <Text style={styles.runningText}>● Timer running</Text>
              </View>
              <View style={styles.tummyButtonRow}>
                <TouchableOpacity
                                accessibilityLabel="TouchableOpacity in circadian"
                  style={[styles.tummyBtn, { backgroundColor: '#EF4444' }]}
                  onPress={handleEndTummy}
                >
                  <Text style={styles.tummyBtnText}>End Session</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.tummyButtonRow}>
              <TouchableOpacity
                              accessibilityLabel="TouchableOpacity in circadian"
                style={[styles.tummyBtn, { backgroundColor: '#3B82F6' }]}
                onPress={handleStartTummy}
              >
                <Text style={styles.tummyBtnText}>Start Tummy Time</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}