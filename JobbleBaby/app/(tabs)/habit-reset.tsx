import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, TextInput, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const PROFILE_KEY = '@jobble_baby_profile';
const DOMAIN_LABELS: Record<string, string> = {
  sleep: '😴 Sleep',
  exercise: '🏃 Exercise',
  nutrition: '🥗 Nutrition',
  selfCare: '🛁 Self-care',
  social: '👥 Social',
};
const DOMAIN_KEYS: Record<string, string> = {
  sleep: 'habitReset.domainSleep',
  exercise: 'habitReset.domainExercise',
  nutrition: 'habitReset.domainNutrition',
  selfCare: 'habitReset.domainSelfCare',
  social: 'habitReset.domainSocial',
};

// i18n-derived (no longer hardcoded)
const HABIT_DOMAINS = (() => {
  const hr = require('../i18n/en.json').habitReset as Record<string, string>;
  return Object.keys(hr).filter(k => k.startsWith('domain') && k !== 'domain')
    .map(k => k.replace('domain', '')).map(s => s.charAt(0).toLowerCase() + s.slice(1));
})();

interface BabyProfile {
  name: string;
  birthDate: string;
  gender: string;
}

interface DailyEntry {
  date: string;
  habits: { id: string; domain: string; label: string; done: boolean }[];
}

interface MicroHabit {
  id: string;
  domain: string;
  label: string;
}

interface Streaks {
  [habitId: string]: number;
}

interface SurveyData {
  date: string;
  sleepScore: number;
  exerciseScore: number;
  nutritionScore: number;
  mentalScore: number;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export default function HabitResetScreen() {
  const { t } = useLanguage();
  const router = useRouter();

  const [surveyModal, setSurveyModal] = useState(false);
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [microHabits, setMicroHabits] = useState<MicroHabit[]>([]);
  const [streaks, setStreaks] = useState<Streaks>({});
  const [addHabitModal, setAddHabitModal] = useState(false);
  const [newHabitDomain, setNewHabitDomain] = useState('sleep');
  const [newHabitLabel, setNewHabitLabel] = useState('');
  const [burnoutAlert, setBurnoutAlert] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [surveyRaw, dailyRaw, microRaw, streakRaw, profileRaw] = await Promise.all([
        safeGetItem(STORAGE_KEYS.HABIT_RESET_SURVEY),
        safeGetItem(STORAGE_KEYS.HABIT_RESET_DAILY),
        safeGetItem(STORAGE_KEYS.HABIT_RESET_MICRO),
        safeGetItem(STORAGE_KEYS.HABIT_RESET_STREAKS),
        safeGetItem(PROFILE_KEY),
      ]);
      if (surveyRaw) setSurvey(JSON.parse(surveyRaw));
      if (dailyRaw) setDailyEntries(JSON.parse(dailyRaw));
      else {
        const today = getToday();
        const initial: DailyEntry = {
          date: today,
          habits: [],
        };
        setDailyEntries([initial]);
      }
      if (microRaw) setMicroHabits(JSON.parse(microRaw));
      if (streakRaw) setStreaks(JSON.parse(streakRaw));
      if (profileRaw) setBabyProfile(JSON.parse(profileRaw));
    } catch (e) { /* silently fail */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Check burnout: 3+ domains ≤ 2 for 7 consecutive days
  useEffect(() => {
    if (!survey) return;
    const scores = [survey.sleepScore, survey.exerciseScore, survey.nutritionScore, survey.mentalScore];
    const lowCount = scores.filter(s => s <= 2).length;
    setBurnoutAlert(lowCount >= 3);
  }, [survey]);

  const saveSurvey = async (data: SurveyData) => {
    await safeSetItem(STORAGE_KEYS.HABIT_RESET_SURVEY, JSON.stringify(data));
    setSurvey(data);
    setSurveyModal(false);
  };

  const saveDaily = async (entries: DailyEntry[]) => {
    await safeSetItem(STORAGE_KEYS.HABIT_RESET_DAILY, JSON.stringify(entries));
    setDailyEntries(entries);
  };

  const toggleHabit = async (habitId: string) => {
    const today = getToday();
    let entries = [...dailyEntries];
    let todayEntry = entries.find(e => e.date === today);
    if (!todayEntry) {
      todayEntry = { date: today, habits: [] };
      entries.push(todayEntry);
    }
    const habit = todayEntry.habits.find(h => h.id === habitId);
    if (habit) {
      habit.done = !habit.done;
    } else {
      const mh = microHabits.find(m => m.id === habitId);
      if (mh) todayEntry.habits.push({ id: habitId, domain: mh.domain, label: mh.label, done: true });
    }
    await saveDaily(entries);
    await updateStreaks(habitId);
  };

  const updateStreaks = async (habitId: string) => {
    const today = getToday();
    const entries = [...dailyEntries].sort((a, b) => a.date.localeCompare(b.date));
    const habitEntries = entries.map(e => ({
      date: e.date,
      done: e.habits.find(h => h.id === habitId)?.done ?? false,
    })).reverse();

    let streak = 0;
    for (const e of habitEntries) {
      if (e.done) streak++;
      else break;
    }
    const newStreaks = { ...streaks, [habitId]: streak };
    setStreaks(newStreaks);
    await safeSetItem(STORAGE_KEYS.HABIT_RESET_STREAKS, JSON.stringify(newStreaks));
  };

  const addMicroHabit = async () => {
    if (!newHabitLabel.trim()) return;
    const id = `mh_${Date.now()}`;
    const habit: MicroHabit = { id, domain: newHabitDomain, label: newHabitLabel.trim() };
    const updated = [...microHabits, habit];
    setMicroHabits(updated);
    await safeSetItem(STORAGE_KEYS.HABIT_RESET_MICRO, JSON.stringify(updated));
    setNewHabitLabel('');
    setAddHabitModal(false);
  };

  const getTodayEntry = (): DailyEntry | null => {
    return dailyEntries.find(e => e.date === getToday()) ?? null;
  };

  const getCalendarDays = (): string[] => {
    const days: string[] = [];
    const now = new Date(selectedDate);
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  };

  const calendarDays = getCalendarDays();
  const monthLabel = new Date(selectedDate + '-01').toLocaleString('en', { month: 'long', year: 'numeric' });

  return (
    <ScrollView style={styles.container}>
      {/* Baby Info Header */}
      {babyProfile && (
        <View style={styles.babyHeader}>
          <Text style={styles.babyName}>{babyProfile.name}</Text>
          <Text style={styles.babyAge}>{babyProfile.birthDate ? t('profile.age', { age: Math.floor((Date.now() - new Date(babyProfile.birthDate).getTime()) / 86400000 / 30.44) }) : ''}</Text>
        </View>
      )}

      {/* Burnout Alert */}
      {burnoutAlert && (
        <View style={styles.burnoutBanner}>
          <MaterialCommunityIcons name="alert" size={20} color="#fff" />
          <Text style={styles.burnoutText}>
            {t('habitReset.burnoutAlert') || 'Multiple areas struggling — consider asking for help or redistributing shifts'}
          </Text>
        </View>
      )}

      {/* Regression Impact Survey */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('habitReset.regressionSurvey') || 'Post-Regression Impact Survey'}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setSurveyModal(true)}>
                        accessibilityLabel="Button in habit-reset"
          <MaterialCommunityIcons name="clipboard-check" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>{t('habitReset.takeSurvey') || 'Take Survey'}</Text>
        </TouchableOpacity>
        {survey && (
          <View style={styles.surveyPreview}>
            <Text style={styles.surveyDate}>{t('habitReset.lastSurvey') || 'Last survey'}: {survey.date}</Text>
            <View style={styles.scoreRow}>
              <Text>😴 {survey.sleepScore}/5  </Text>
              <Text>🏃 {survey.exerciseScore}/5  </Text>
              <Text>🥗 {survey.nutritionScore}/5  </Text>
              <Text>🧠 {survey.mentalScore}/5</Text>
            </View>
          </View>
        )}
      </View>

      {/* Daily Check-In */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('habitReset.dailyCheckin') || 'Daily Check-In'}</Text>
        <Text style={styles.dateLabel}>{getToday()}</Text>
        {microHabits.length === 0 && (
          <Text style={styles.emptyText}>{t('habitReset.noHabits') || 'No micro-habits yet. Add one below.'}</Text>
        )}
        {microHabits.map(mh => {
          const todayEntry = getTodayEntry();
          const done = todayEntry?.habits.find(h => h.id === mh.id)?.done ?? false;
          const streak = streaks[mh.id] ?? 0;
          return (
            <View key={mh.id} style={styles.habitRow}>
              <TouchableOpacity
                              accessibilityLabel="Button in habit-reset"
                style={[styles.habitCheck, done && styles.habitCheckDone]}
                onPress={() => toggleHabit(mh.id)}
              >
                {done && <MaterialCommunityIcons name="check" size={16} color="#fff" />}
              </TouchableOpacity>
              <View style={styles.habitInfo}>
                <Text style={[styles.habitLabel, done && styles.habitLabelDone]}>{mh.label}</Text>
                <Text style={styles.habitDomain}>{t(DOMAIN_KEYS[mh.domain])}</Text>
              </View>
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>🔥 {streak}</Text>
              </View>
            </View>
          );
        })}
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddHabitModal(true)}>
                        accessibilityLabel="Add habit-reset entry"
          <MaterialCommunityIcons name="plus" size={18} color="#007AFF" />
          <Text style={styles.addBtnText}>{t('habitReset.addHabit') || 'Add Micro-Habit'}</Text>
        </TouchableOpacity>
      </View>

      {/* History Calendar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('habitReset.historyCalendar') || 'History Calendar'}</Text>
        <View style={styles.calendarNav}>
          <TouchableOpacity accessibilityLabel="Navigate to previous month" onPress={() => {
            const d = new Date(selectedDate);
            d.setMonth(d.getMonth() - 1);
            setSelectedDate(d.toISOString().substring(0, 7) + '-01');
          }}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity accessibilityLabel="Navigate to previous month" onPress={() => {
            const d = new Date(selectedDate);
            d.setMonth(d.getMonth() + 1);
            setSelectedDate(d.toISOString().substring(0, 7) + '-01');
          }}>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.calendarGrid}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <Text key={i} style={styles.calendarDayLabel}>{d}</Text>
          ))}
          {(() => {
            const firstDay = new Date(calendarDays[0]).getDay();
            const blanks = Array(firstDay).fill(null);
            return [...blanks, ...calendarDays].map((day, idx) => {
              if (!day) return <View key={`b${idx}`} style={styles.calendarCell} />;
              const entry = dailyEntries.find(e => e.date === day);
              const doneCount = entry?.habits.filter(h => h.done).length ?? 0;
              const isToday = day === getToday();
              return (
                <View key={day} style={[styles.calendarCell, isToday && styles.calendarCellToday]}>
                  <Text style={[styles.calendarDate, isToday && styles.calendarDateToday]}>
                    {new Date(day).getDate()}
                  </Text>
                  {doneCount > 0 && (
                    <View style={[styles.calendarDot, doneCount >= 3 ? styles.calendarDotGood : styles.calendarDotPartial]} />
                  )}
                </View>
              );
            });
          })()}
        </View>
      </View>

      {/* Survey Modal */}
      <Modal visible={surveyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('habitReset.regressionSurvey') || 'Post-Regression Impact Survey'}</Text>
            {[
              { key: 'sleepScore', label: '😴 Sleep Quality', emoji: '😴' },
              { key: 'exerciseScore', label: '🏃 Exercise', emoji: '🏃' },
              { key: 'nutritionScore', label: '🥗 Nutrition', emoji: '🥗' },
              { key: 'mentalScore', label: '🧠 Mental Health', emoji: '🧠' },
            ].map(({ key, label }) => {
              const current = survey ? (survey as any)[key] : 3;
              return (
                <View key={key} style={styles.scoreField}>
                  <Text style={styles.scoreLabel}>{label}</Text>
                  <View style={styles.scoreButtons}>
                    {[1,2,3,4,5].map(s => (
                      <TouchableOpacity
                                      accessibilityLabel="Button in habit-reset"
                        key={s}
                        style={[styles.scoreBtn, current === s && styles.scoreBtnActive]}
                        onPress={() => survey && setSurvey({ ...survey, [key]: s })}
                      >
                        <Text style={[styles.scoreBtnText, current === s && styles.scoreBtnTextActive]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSurveyModal(false)}>
                              accessibilityLabel="Cancel habit-reset action"
                <Text style={styles.cancelBtnText}>{t('common.cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                              accessibilityLabel="Button in habit-reset"
                style={styles.saveBtn}
                onPress={() => {
                  const s = survey ?? { date: getToday(), sleepScore: 3, exerciseScore: 3, nutritionScore: 3, mentalScore: 3 };
                  saveSurvey({ ...s, date: getToday() });
                }}
              >
                <Text style={styles.saveBtnText}>{t('common.save') || 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Habit Modal */}
      <Modal visible={addHabitModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('habitReset.addHabit') || 'Add Micro-Habit'}</Text>
            <Text style={styles.scoreLabel}>{t('habitReset.domain') || 'Domain'}</Text>
            <View style={styles.domainPicker}>
              {HABIT_DOMAINS.map(d => (
                <TouchableOpacity
                                accessibilityLabel="Button in habit-reset"
                  key={d}
                  style={[styles.domainChip, newHabitDomain === d && styles.domainChipActive]}
                  onPress={() => setNewHabitDomain(d)}
                >
                  <Text style={[styles.domainChipText, newHabitDomain === d && styles.domainChipTextActive]}>
                    {t(DOMAIN_KEYS[d])}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.textInput}
              placeholder={t('habitReset.habitPlaceholder') || 'e.g. Walk 10 minutes'}
              placeholderTextColor="#999"
              value={newHabitLabel}
              onChangeText={setNewHabitLabel}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setAddHabitModal(false); setNewHabitLabel(''); }}>
                              accessibilityLabel="Add habit-reset entry"
                <Text style={styles.cancelBtnText}>{t('common.cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addMicroHabit}>
                              accessibilityLabel="Add habit-reset entry"
                <Text style={styles.saveBtnText}>{t('common.add') || 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  babyHeader: { backgroundColor: '#4A90D9', padding: 16, flexDirection: 'row', alignItems: 'center' },
  babyName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  babyAge: { fontSize: 14, color: '#DDE', marginLeft: 12 },
  burnoutBanner: { backgroundColor: '#E74C3C', flexDirection: 'row', alignItems: 'center', padding: 12, margin: 12, borderRadius: 8 },
  burnoutText: { color: '#fff', fontSize: 13, marginLeft: 8, flex: 1 },
  section: { backgroundColor: '#fff', margin: 12, padding: 16, borderRadius: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 12 },
  primaryBtn: { backgroundColor: '#4A90D9', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, gap: 8 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  surveyPreview: { marginTop: 12, padding: 12, backgroundColor: '#F0F4FF', borderRadius: 8 },
  surveyDate: { fontSize: 12, color: '#666', marginBottom: 4 },
  scoreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateLabel: { fontSize: 13, color: '#666', marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#999', fontStyle: 'italic', marginBottom: 12 },
  habitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  habitCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#4A90D9', alignItems: 'center', justifyContent: 'center' },
  habitCheckDone: { backgroundColor: '#4A90D9' },
  habitInfo: { flex: 1, marginLeft: 12 },
  habitLabel: { fontSize: 14, color: '#222' },
  habitLabelDone: { textDecorationLine: 'line-through', color: '#999' },
  habitDomain: { fontSize: 11, color: '#999' },
  streakBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  streakText: { fontSize: 12, color: '#E65100' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#007AFF', marginTop: 8, gap: 6 },
  addBtnText: { color: '#007AFF', fontSize: 14 },
  calendarNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDayLabel: { width: '14.28%', textAlign: 'center', fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 4 },
  calendarCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calendarCellToday: { backgroundColor: '#E3F2FD', borderRadius: 8 },
  calendarDate: { fontSize: 12, color: '#333' },
  calendarDateToday: { fontWeight: '700', color: '#1976D2' },
  calendarDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  calendarDotGood: { backgroundColor: '#4CAF50' },
  calendarDotPartial: { backgroundColor: '#FFC107' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#222', marginBottom: 16 },
  scoreField: { marginBottom: 16 },
  scoreLabel: { fontSize: 14, color: '#555', marginBottom: 8 },
  scoreButtons: { flexDirection: 'row', gap: 8 },
  scoreBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#DDD', alignItems: 'center' },
  scoreBtnActive: { backgroundColor: '#4A90D9', borderColor: '#4A90D9' },
  scoreBtnText: { fontSize: 14, color: '#555' },
  scoreBtnTextActive: { color: '#fff', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#DDD', alignItems: 'center' },
  cancelBtnText: { color: '#666', fontSize: 15 },
  saveBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#4A90D9', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  domainPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  domainChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#DDD' },
  domainChipActive: { backgroundColor: '#E3F2FD', borderColor: '#4A90D9' },
  domainChipText: { fontSize: 12, color: '#555' },
  domainChipTextActive: { color: '#1976D2', fontWeight: '600' },
  textInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 12 },
});
