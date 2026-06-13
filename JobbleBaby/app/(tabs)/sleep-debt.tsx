import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const SLEEP_TARGET_HOURS = 8;
const WEEKLY_TARGET = SLEEP_TARGET_HOURS * 7;
const DEBT_WARNING_THRESHOLD = 3; // nights of debt
const REGRESSION_DROP_MINUTES = 30;

interface ParentSleepEntry {
  id: string;
  date: string; // YYYY-MM-DD
  hours: number;
  timestamp: string;
}

interface ShiftState {
  activeCaregiver: 'PA' | 'PB';
  lastSwitchTimestamp: string;
}

interface SleepEntry {
  id: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

const PARENT_SLEEP_KEY = STORAGE_KEYS.PARENT_SLEEP_ENTRIES;
const SHIFT_STATE_KEY = STORAGE_KEYS.SHIFT_STATE;
const SCHEDULE_KEY = STORAGE_KEYS.SCHEDULE_ENTRIES;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function subtractDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function getDebtLevel(debtHours: number): { label: string; color: string; bg: string } {
  const debtNights = debtHours / SLEEP_TARGET_HOURS;
  if (debtNights <= 0) return { label: 'Good', color: '#2ecc71', bg: 'rgba(46,204,113,0.15)' };
  if (debtNights < 1) return { label: 'Mild', color: '#f39c12', bg: 'rgba(243,156,18,0.15)' };
  if (debtNights < 3) return { label: 'Moderate', color: '#e67e22', bg: 'rgba(230,126,34,0.15)' };
  return { label: 'Severe', color: '#e74c3c', bg: 'rgba(231,76,60,0.15)' };
}

function detectRegressions(scheduleEntries: SleepEntry[]): { startDate: string; endDate: string; dropMinutes: number }[] {
  // Sort by start time
  const sorted = [...scheduleEntries]
    .filter(e => e.duration !== undefined && e.duration > 0)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (sorted.length < 4) return [];

  const regressions: { startDate: string; endDate: string; dropMinutes: number }[] = [];
  let i = 0;

  while (i < sorted.length - 2) {
    const window = sorted.slice(i, i + 3);
    // Check for regression: consecutive nights with >30min drop in longest sleep
    let regressionFound = false;
    for (let j = 1; j < window.length; j++) {
      const prev = window[j - 1].duration!;
      const curr = window[j].duration!;
      if (prev - curr >= REGRESSION_DROP_MINUTES && curr < prev * 0.7) {
        // Detected regression
        const startDate = new Date(window[j - 1].startTime);
        const endDate = new Date(window[j].startTime);
        regressions.push({
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dropMinutes: prev - curr,
        });
        regressionFound = true;
        i = j + 1;
        break;
      }
    }
    if (!regressionFound) i++;
  }

  return regressions;
}

function isInRegressionWindow(regressions: { startDate: string; endDate: string }[], weekStart: Date, weekEnd: Date): boolean {
  for (const reg of regressions) {
    const regStart = new Date(reg.startDate);
    const regEnd = new Date(reg.endDate);
    if (regStart <= weekEnd && regEnd >= weekStart) return true;
  }
  return false;
}

export default function SleepDebt() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [parentSleep, setParentSleep] = useState<ParentSleepEntry[]>([]);
  const [shiftState, setShiftState] = useState<ShiftState>({ activeCaregiver: 'PA', lastSwitchTimestamp: new Date().toISOString() });
  const [scheduleEntries, setScheduleEntries] = useState<SleepEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addHours, setAddHours] = useState('');
  const [addDate, setAddDate] = useState(formatDate(new Date()));
  const [regressions, setRegressions] = useState<{ startDate: string; endDate: string; dropMinutes: number }[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [sleepRaw, shiftRaw, scheduleRaw] = await Promise.all([
        AsyncStorage.getItem(PARENT_SLEEP_KEY),
        AsyncStorage.getItem(SHIFT_STATE_KEY),
        AsyncStorage.getItem(SCHEDULE_KEY),
      ]);
      if (sleepRaw) setParentSleep(JSON.parse(sleepRaw));
      if (shiftRaw) setShiftState(JSON.parse(shiftRaw));
      if (scheduleRaw) {
        const entries = JSON.parse(scheduleRaw);
        setScheduleEntries(entries);
        setRegressions(detectRegressions(entries));
      }
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveParentSleep = async (entries: ParentSleepEntry[]) => {
    setParentSleep(entries);
    try {
      await AsyncStorage.setItem(PARENT_SLEEP_KEY, JSON.stringify(entries));
    } catch { /* silently fail */ }
  };

  // Calculate weekly debt for current week and last 4 weeks
  const getWeeklyDebt = (weekStart: Date): number => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEntries = parentSleep.filter(e => {
      const d = new Date(e.date);
      return d >= weekStart && d <= weekEnd;
    });
    const totalHours = weekEntries.reduce((sum, e) => sum + e.hours, 0);
    return Math.max(0, WEEKLY_TARGET - totalHours);
  };

  const today = new Date();
  const currentWeekStart = getWeekStart(today);
  const weeks: { label: string; debt: number; isCurrent: boolean }[] = [];
  for (let i = 0; i < 5; i++) {
    const ws = subtractDays(currentWeekStart, i * 7);
    const label = i === 0 ? 'This Week' : i === 1 ? 'Last Week' : `${i} Weeks Ago`;
    weeks.push({ label, debt: getWeeklyDebt(ws), isCurrent: i === 0 });
  }

  const currentDebt = weeks[0].debt;
  const debtLevel = getDebtLevel(currentDebt);
  const prevDebt = weeks[1]?.debt ?? 0;
  const debtTrend = currentDebt < prevDebt ? 'down' : currentDebt > prevDebt ? 'up' : 'flat';
  const currentWeekInRegression = isInRegressionWindow(regressions, currentWeekStart, new Date(currentWeekStart.getTime() + 6 * 86400000));
  const highBurnoutRisk = currentDebt >= DEBT_WARNING_THRESHOLD * SLEEP_TARGET_HOURS && currentWeekInRegression;

  // Get this week's daily breakdown
  const getDailyBreakdown = () => {
    const days: { date: string; hours: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      const dateStr = formatDate(d);
      const entry = parentSleep.find(e => e.date === dateStr);
      days.push({ date: dateStr, hours: entry?.hours ?? 0 });
    }
    return days;
  };

  const dailyBreakdown = getDailyBreakdown();

  const handleAddEntry = () => {
    const hours = parseFloat(addHours);
    if (isNaN(hours) || hours < 0 || hours > 24) {
      Alert.alert('Invalid', 'Please enter hours between 0 and 24');
      return;
    }
    const newEntry: ParentSleepEntry = {
      id: generateId(),
      date: addDate,
      hours,
      timestamp: new Date().toISOString(),
    };
    const existing = parentSleep.findIndex(e => e.date === addDate);
    let updated: ParentSleepEntry[];
    if (existing >= 0) {
      updated = [...parentSleep];
      updated[existing] = newEntry;
    } else {
      updated = [...parentSleep, newEntry];
    }
    saveParentSleep(updated);
    setShowAddModal(false);
    setAddHours('');
    setAddDate(formatDate(new Date()));
  };

  const handleSwapShift = () => {
    Alert.alert(
      'Swap Tonight?',
      'This will switch the active caregiver shift.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Swap',
          onPress: async () => {
            const newCaregiver = shiftState.activeCaregiver === 'PA' ? 'PB' : 'PA';
            const newState: ShiftState = {
              activeCaregiver: newCaregiver,
              lastSwitchTimestamp: new Date().toISOString(),
            };
            setShiftState(newState);
            try {
              await AsyncStorage.setItem(SHIFT_STATE_KEY, JSON.stringify(newState));
            } catch { /* fail */ }
          },
        },
      ]
    );
  };

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    title: { fontSize: 28, fontWeight: 'bold', color: C.text, marginBottom: 4 },
    subtitle: { fontSize: 14, color: C.muted },
    debtCard: {
      borderRadius: 20,
      padding: 24,
      marginBottom: 20,
      alignItems: 'center',
    },
    debtAmount: { fontSize: 48, fontWeight: 'bold', color: debtLevel.color, marginBottom: 4 },
    debtLabel: { fontSize: 14, fontWeight: '600', color: debtLevel.color, textTransform: 'uppercase', letterSpacing: 1 },
    debtSubtext: { fontSize: 13, color: C.muted, marginTop: 8, textAlign: 'center' },
    trendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
    trendArrow: { fontSize: 18 },
    trendText: { fontSize: 13, color: C.muted },
    burnoutBanner: {
      backgroundColor: 'rgba(231,76,60,0.15)',
      borderColor: '#e74c3c',
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    burnoutIcon: { fontSize: 24 },
    burnoutText: { flex: 1, fontSize: 13, color: '#e74c3c', fontWeight: '600', lineHeight: 20 },
    regressionCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: C.border,
    },
    regressionTitle: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 12 },
    regressionList: { gap: 8 },
    regressionItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    regressionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e67e22' },
    regressionText: { fontSize: 13, color: C.muted },
    dailySection: { marginBottom: 20 },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    dailyBarRow: { flexDirection: 'row', gap: 6, height: 80, alignItems: 'flex-end' },
    dailyBarCol: { flex: 1, alignItems: 'center' },
    dailyBar: { width: '100%', borderRadius: 6, minHeight: 8 },
    dailyLabel: { fontSize: 10, color: C.muted, marginTop: 4 },
    weeklySection: { marginBottom: 20 },
    weekRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    weekLabel: { flex: 1, fontSize: 14, color: C.text },
    weekDebt: { fontSize: 14, fontWeight: '600', color: C.text, marginRight: 12 },
    weekTrend: { fontSize: 14 },
    addButton: {
      backgroundColor: C.accent,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      marginBottom: 20,
    },
    addButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
    shiftAlert: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 20,
    },
    shiftAlertTitle: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 12 },
    shiftAlertText: { fontSize: 13, color: C.muted, lineHeight: 20, marginBottom: 16 },
    shiftButtons: { flexDirection: 'row', gap: 12 },
    shiftButton: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
    swapButton: { backgroundColor: C.accent },
    askButton: { backgroundColor: C.background, borderWidth: 1, borderColor: C.border },
    shiftButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
    shiftButtonTextAlt: { fontSize: 14, fontWeight: '600', color: C.muted },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 18, fontWeight: '600', color: C.text, marginBottom: 16, textAlign: 'center' },
    modalInput: {
      backgroundColor: C.background, borderRadius: 12, padding: 16, fontSize: 16, color: C.text,
      borderWidth: 1, borderColor: C.border, marginBottom: 12,
    },
    modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
    modalButton: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
    cancelBtn: { backgroundColor: C.background },
    confirmBtn: { backgroundColor: C.accent },
    btnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
    btnTextCancel: { fontSize: 14, fontWeight: '600', color: C.muted },
    dateInput: {
      backgroundColor: C.background, borderRadius: 12, padding: 14, fontSize: 14, color: C.text,
      borderWidth: 1, borderColor: C.border, marginBottom: 12,
    },
    inputLabel: { fontSize: 12, color: C.muted, marginBottom: 4 },
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 14, color: C.muted, marginTop: 12, textAlign: 'center' },
    activeTag: {
      backgroundColor: C.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
      marginLeft: 8, alignSelf: 'center',
    },
    activeTagText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  });

  const maxDailyHours = Math.max(...dailyBreakdown.map(d => d.hours), SLEEP_TARGET_HOURS);
  const regressionHistory = regressions.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('sleepDebt.title')}</Text>
          <Text style={styles.subtitle}>
            {t('sleepDebt.subtitle')} ({t('sleepDebt.target', { hours: SLEEP_TARGET_HOURS })})
          </Text>
        </View>

        {highBurnoutRisk && (
          <View style={styles.burnoutBanner}>
            <Text style={styles.burnoutIcon}>⚠️</Text>
            <Text style={styles.burnoutText}>
              {t('sleepDebt.burnoutRisk')}
            </Text>
          </View>
        )}

        <View style={[styles.debtCard, { backgroundColor: debtLevel.bg }]}>
          <Text style={styles.debtAmount}>{currentDebt.toFixed(1)}h</Text>
          <Text style={styles.debtLabel}>{debtLevel.label} {t('sleepDebt.debt')}</Text>
          <Text style={styles.debtSubtext}>{t('sleepDebt.weeklyTarget', { target: WEEKLY_TARGET, actual: (WEEKLY_TARGET - currentDebt).toFixed(1) })}</Text>
          <View style={styles.trendRow}>
            <Text style={styles.trendArrow}>{debtTrend === 'down' ? '↓' : debtTrend === 'up' ? '↑' : '→'}</Text>
            <Text style={styles.trendText}>
              {debtTrend === 'down' ? t('sleepDebt.improving') : debtTrend === 'up' ? t('sleepDebt.worsening') : t('sleepDebt.same')} vs {t('sleepDebt.lastWeek')}
            </Text>
          </View>
        </View>

        {regressionHistory.length > 0 && (
          <View style={styles.regressionCard}>
            <Text style={styles.regressionTitle}>{t('sleepDebt.regressions')}</Text>
            <View style={styles.regressionList}>
              {regressionHistory.map((reg, i) => (
                <View key={i} style={styles.regressionItem}>
                  <View style={styles.regressionDot} />
                  <Text style={styles.regressionText}>
                    {reg.startDate} → {reg.endDate} (-{reg.dropMinutes}min sleep)
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.dailySection}>
          <Text style={styles.sectionTitle}>{t('sleepDebt.thisWeek')}</Text>
          <View style={styles.dailyBarRow}>
            {dailyBreakdown.map((day, i) => {
              const heightPct = maxDailyHours > 0 ? (day.hours / maxDailyHours) * 60 : 0;
              const isDeficit = day.hours < SLEEP_TARGET_HOURS;
              return (
                <View key={i} style={styles.dailyBarCol}>
                  <View
                    style={[
                      styles.dailyBar,
                      { height: Math.max(heightPct, 4), backgroundColor: isDeficit ? '#e74c3c' : '#2ecc71', opacity: day.hours > 0 ? 1 : 0.3 },
                    ]}
                  />
                  <Text style={styles.dailyLabel}>{dayLabels[i]}</Text>
                  <Text style={[styles.dailyLabel, { fontSize: 9, color: day.hours > 0 ? C.text : C.muted }]}>
                    {day.hours > 0 ? `${day.hours}h` : '--'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {currentDebt >= DEBT_WARNING_THRESHOLD * SLEEP_TARGET_HOURS && (
          <View style={styles.shiftAlert}>
            <Text style={styles.shiftAlertTitle}>{t('sleepDebt.shiftRedistribution')}</Text>
            <Text style={styles.shiftAlertText}>{t('sleepDebt.shiftSuggestion')}</Text>
            <View style={styles.shiftButtons}>
              <TouchableOpacity style={[styles.shiftButton, styles.swapButton]} onPress={handleSwapShift}>
                              accessibilityLabel="TouchableOpacity in sleep-debt"
                <Text style={styles.shiftButtonText}>{t('sleepDebt.swapTonight')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shiftButton, styles.askButton]}>
                              accessibilityLabel="TouchableOpacity in sleep-debt"
                <Text style={styles.shiftButtonTextAlt}>{t('sleepDebt.askPartner')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.weeklySection}>
          <Text style={styles.sectionTitle}>{t('sleepDebt.history')}</Text>
          {weeks.map((week, i) => (
            <View key={i} style={styles.weekRow}>
              <Text style={styles.weekLabel}>
                {week.label}
                {week.isCurrent && (
                  <Text style={styles.activeTagText}> {t('sleepDebt.current')}</Text>
                )}
              </Text>
              <Text style={[styles.weekDebt, { color: getDebtLevel(week.debt).color }]}>
                {week.debt.toFixed(1)}h
              </Text>
              <Text style={styles.weekTrend}>
                {week.debt < prevDebt && i > 0 ? '↓' : week.debt > prevDebt && i > 0 ? '↑' : ''}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
                        accessibilityLabel="Toggle sleep-debt panel"
          <Text style={styles.addButtonText}>{t('sleepDebt.addEntry')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('sleepDebt.addSleep')}</Text>
            <Text style={styles.inputLabel}>{t('sleepDebt.date')}</Text>
            <TextInput
              style={styles.dateInput}
              value={addDate}
              onChangeText={setAddDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.muted}
            />
            <Text style={styles.inputLabel}>{t('sleepDebt.hoursSlept')}</Text>
            <TextInput
              style={styles.modalInput}
              value={addHours}
              onChangeText={setAddHours}
              placeholder="e.g. 6.5"
              placeholderTextColor={C.muted}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={() => setShowAddModal(false)}>
                              accessibilityLabel="Toggle sleep-debt panel"
                <Text style={styles.btnTextCancel}>{t('sleepDebt.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmBtn]} onPress={handleAddEntry}>
                              accessibilityLabel="Add sleep-debt entry"
                <Text style={styles.btnText}>{t('sleepDebt.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
