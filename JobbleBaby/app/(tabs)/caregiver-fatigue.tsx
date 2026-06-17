import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { awardBadge } from '../utils/badgeService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { STORAGE_KEYS } from '../../store/storage-keys';

const SURVEY_KEY = STORAGE_KEYS.CAREGIVER_SURVEY;
const DAILY_KEY = STORAGE_KEYS.RESILIENCE_DAILY;
const MENTAL_LOAD_KEY = STORAGE_KEYS.MENTAL_LOAD_TASKS;
const RESPITE_KEY = STORAGE_KEYS.RESPITE_GOAL;
const SCORE_KEY = STORAGE_KEYS.RESILIENCE_SCORE;

interface CaregiverSurvey {
  date: string;
  exhaustion: number;
  sleepQuality: number;
  supportNetwork: number;
  mentalLoad: number;
  guiltLevel: number;
}

interface DailyCheckIn {
  date: string;
  energy: number;
  mood: number;
  patience: number;
  connection: number;
}

interface MentalLoadTask {
  id: string;
  label: string;
  estimatedHours: number;
}

interface RespiteGoal {
  weeklyHoursGoal: number;
  totalWeeks: number;
}

interface ResilienceScore {
  currentScore: number;
  streakDays: number;
  lastCheckInDate: string;
  consecutiveLowDays: number;
}

const DEFAULT_MENTAL_LOAD_TASKS: MentalLoadTask[] = [
  { id: '1', label: 'Feeding', estimatedHours: 3 },
  { id: '2', label: 'Sleep', estimatedHours: 2 },
  { id: '3', label: 'Diaper', estimatedHours: 1 },
  { id: '4', label: 'Medicine', estimatedHours: 0.5 },
  { id: '5', label: 'Appointments', estimatedHours: 1 },
  { id: '6', label: 'Playtime', estimatedHours: 2 },
  { id: '7', label: 'Bathing', estimatedHours: 0.5 },
  { id: '8', label: 'Travel', estimatedHours: 1 },
];

const getDateStr = () => new Date().toISOString().split('T')[0];
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

function calcResilienceScore(
  survey: CaregiverSurvey | null,
  dailyAvg: number,
  restCreditPct: number
): number {
  if (!survey) return 50;
  // Survey contributes 40%, daily check-in 40%, rest credit 20%
  const surveyScore =
    (survey.exhaustion + survey.sleepQuality + survey.supportNetwork +
     (5 - survey.mentalLoad) + (5 - survey.guiltLevel)) / 5 * 40;
  const dailyScore = dailyAvg * 40;
  const restScore = restCreditPct * 20;
  return Math.round(Math.min(100, Math.max(0, surveyScore + dailyScore + restScore)));
}

function getScoreColor(score: number): string {
  if (score < 40) return '#EF4444';
  if (score < 70) return '#F59E0B';
  return '#10B981';
}

function getScoreLabel(score: number): string {
  if (score < 40) return 'Critical';
  if (score < 60) return 'Needs Support';
  if (score < 80) return 'Stable';
  return 'Thriving';
}

export default function CaregiverFatigueScreen() {
  const { t } = useLanguage();
  const [survey, setSurvey] = useState<CaregiverSurvey | null>(null);
  const [dailyLogs, setDailyLogs] = useState<DailyCheckIn[]>([]);
  const [mentalLoadTasks, setMentalLoadTasks] = useState<MentalLoadTask[]>([
    { id: '1', label: t('caregiverFatigue.activityEstimates.feeding'), estimatedHours: 3 },
    { id: '2', label: t('caregiverFatigue.activityEstimates.sleep'), estimatedHours: 2 },
    { id: '3', label: t('caregiverFatigue.activityEstimates.diaper'), estimatedHours: 1 },
    { id: '4', label: t('caregiverFatigue.activityEstimates.medicine'), estimatedHours: 0.5 },
    { id: '5', label: t('caregiverFatigue.activityEstimates.appointments'), estimatedHours: 1 },
    { id: '6', label: t('caregiverFatigue.activityEstimates.playtime'), estimatedHours: 2 },
    { id: '7', label: t('caregiverFatigue.activityEstimates.bathing'), estimatedHours: 0.5 },
    { id: '8', label: t('caregiverFatigue.activityEstimates.travel'), estimatedHours: 1 },
  ]);
  const [respiteGoal, setRespiteGoal] = useState<RespiteGoal>({ weeklyHoursGoal: 2, totalWeeks: 0 });
  const [resilienceScore, setResilienceScore] = useState<ResilienceScore>({
    currentScore: 50,
    streakDays: 0,
    lastCheckInDate: '',
    consecutiveLowDays: 0,
  });
  const [todayCheckIn, setTodayCheckIn] = useState({ energy: 3, mood: 3, patience: 3, connection: 3 });
  const [restWindows, setRestWindows] = useState<number[]>([]);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyForm, setSurveyForm] = useState({ exhaustion: 3, sleepQuality: 3, supportNetwork: 3, mentalLoad: 3, guiltLevel: 3 });
  const [showRespite, setShowRespite] = useState(false);
  const [respiteForm, setRespiteForm] = useState({ goalHours: 2, achievedHours: 0 });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [surveyData, dailyData, mentalLoadData, respiteData, scoreData] = await Promise.all([
        safeGetItem(SURVEY_KEY),
        safeGetItem(DAILY_KEY),
        safeGetItem(MENTAL_LOAD_KEY),
        safeGetItem(RESPITE_KEY),
        safeGetItem(SCORE_KEY),
      ]);

      if (surveyData) setSurvey(JSON.parse(surveyData));
      if (dailyData) setDailyLogs(JSON.parse(dailyData));
      if (mentalLoadData) setMentalLoadTasks(JSON.parse(mentalLoadData));
      if (respiteData) setRespiteGoal(JSON.parse(respiteData));
      if (scoreData) setResilienceScore(JSON.parse(scoreData));
      else setShowSurvey(true);
    } catch (e) { /* silently fail */ }
  }

  async function saveSurvey() {
    const data: CaregiverSurvey = { date: getDateStr(), ...surveyForm };
    await safeSetItem(SURVEY_KEY, JSON.stringify(data));
    setSurvey(data);
    setShowSurvey(false);
    await updateScore();
  }

  async function saveDailyCheckIn() {
    const entry: DailyCheckIn = { date: getDateStr(), ...todayCheckIn };
    const updated = dailyLogs.filter(l => l.date !== entry.date).concat(entry);
    await safeSetItem(DAILY_KEY, JSON.stringify(updated));
    setDailyLogs(updated);
    await updateScore();
  }

  async function updateScore() {
    const surveyData = survey || null;
    const recentLogs = dailyLogs.slice(-7);
    const dailyAvg = recentLogs.length > 0
      ? recentLogs.reduce((sum, l) => sum + (l.energy + l.mood + l.patience + l.connection) / 4, 0) / recentLogs.length
      : 3;

    // Rest credit: based on recommended minimum (28 hours/week for caregivers = 4 hrs/day)
    const totalMentalLoadHours = mentalLoadTasks.reduce((s, t) => s + t.estimatedHours, 0);
    const recommendedRest = Math.max(0, totalMentalLoadHours - 4);
    const actualRest = restWindows.reduce((s, w) => s + w, 0);
    const restCreditPct = recommendedRest > 0 ? Math.min(1, actualRest / recommendedRest) : 1;

    const newScore = calcResilienceScore(surveyData, dailyAvg, restCreditPct);
    const today = getDateStr();
    const lastDate = resilienceScore.lastCheckInDate;
    const consecutiveLow = (lastDate && newScore < 40)
      ? (lastDate === today ? resilienceScore.consecutiveLowDays : resilienceScore.consecutiveLowDays + 1)
      : (newScore < 40 ? 1 : 0);

    const newStreak = (newScore >= 80 && lastDate && consecutiveLow === 0)
      ? resilienceScore.streakDays + 1
      : (newScore >= 80 ? 1 : 0);

    const updated: ResilienceScore = {
      currentScore: newScore,
      streakDays: newStreak,
      lastCheckInDate: today,
      consecutiveLowDays: consecutiveLow,
    };

    await safeSetItem(SCORE_KEY, JSON.stringify(updated));
    setResilienceScore(updated);

    // Badge check
    if (newStreak >= 7) {
      awardBadge('Resilience Champion');
    }

    // Alert if critical for 5+ days
    if (consecutiveLow >= 5) {
      Alert.alert(
        t('caregiverFatigue.exhaustionAlertTitle'),
        t('caregiverFatigue.exhaustionAlertBody'),
        [{ text: t('caregiverFatigue.delegateBtn'), onPress: () => {} }]
      );
    }
  }

  async function updateMentalLoad(taskId: string, hours: number) {
    const updated = mentalLoadTasks.map(t => t.id === taskId ? { ...t, estimatedHours: hours } : t);
    setMentalLoadTasks(updated);
    await safeSetItem(MENTAL_LOAD_KEY, JSON.stringify(updated));
    await updateScore();
  }

  async function saveRespite() {
    const data = { weeklyHoursGoal: respiteForm.goalHours, totalWeeks: respiteGoal.totalWeeks + 1 };
    await safeSetItem(RESPITE_KEY, JSON.stringify(data));
    setRespiteGoal(data);
    setShowRespite(false);
  }

  async function addRestWindow(minutes: number) {
    const updated = [...restWindows, minutes];
    setRestWindows(updated);
    await updateScore();
  }

  const totalMentalLoad = mentalLoadTasks.reduce((s, t) => s + t.estimatedHours, 0);
  const scoreColor = getScoreColor(resilienceScore.currentScore);
  const scoreLabel = getScoreLabel(resilienceScore.currentScore);
  const todayStr = getDateStr();
  const hasCheckedInToday = dailyLogs.some(l => l.date === todayStr);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('caregiverFatigue.title')}</Text>
          <Text style={styles.subtitle}>{t('caregiverFatigue.subtitle')}</Text>
        </View>

        {/* Resilience Score Card */}
        <View style={[styles.scoreCard, { borderLeftColor: scoreColor }]}>
          <View style={styles.scoreHeader}>
            <MaterialCommunityIcons name="heart-pulse" size={32} color={scoreColor} />
            <View style={styles.scoreInfo}>
              <Text style={[styles.scoreValue, { color: scoreColor }]}>{resilienceScore.currentScore}</Text>
              <Text style={styles.scoreLabel}>{scoreLabel}</Text>
            </View>
          </View>
          <View style={styles.streakRow}>
            <MaterialCommunityIcons name="fire" size={20} color="#F59E0B" />
            <Text style={styles.streakText}>{resilienceScore.streakDays} day streak</Text>
          </View>
          {resilienceScore.consecutiveLowDays >= 5 && (
            <View style={styles.alertBanner}>
              <MaterialCommunityIcons name="alert" size={20} color="#EF4444" />
              <Text style={styles.alertText}>{t('caregiverFatigue.considerHelp')}</Text>
            </View>
          )}
        </View>

        {/* Burnout Trajectory Survey */}
        {!survey && (
          <TouchableOpacity style={styles.actionCard} onPress={() => setShowSurvey(true)}>
                          accessibilityLabel="Toggle caregiver-fatigue panel"
            <MaterialCommunityIcons name="clipboard-text" size={28} color="#3B82F6" />
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>{t('caregiverFatigue.takeSurvey')}</Text>
              <Text style={styles.actionDesc}>{t('caregiverFatigue.surveyDesc')}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Daily Check-In */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('caregiverFatigue.dailyCheckIn')}</Text>
          {hasCheckedInToday ? (
            <View style={styles.checkedInCard}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#10B981" />
              <Text style={styles.checkedInText}>{t('caregiverFatigue.checkedIn')}</Text>
            </View>
          ) : (
            <View style={styles.checkInGrid}>
              <Text style={styles.checkInLabel}>{t('caregiverFatigue.energy')}</Text>
              {[1, 2, 3, 4, 5].map(v => (
                <TouchableOpacity key={v} style={[styles.rateBtn, todayCheckIn.energy === v && styles.rateBtnActive]} onPress={() => setTodayCheckIn({ ...todayCheckIn, energy: v })}>
                                accessibilityLabel="TouchableOpacity in caregiver-fatigue"
                  <Text style={[styles.rateBtnText, todayCheckIn.energy === v && styles.rateBtnTextActive]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.checkInGrid}>
            <Text style={styles.checkInLabel}>{t('caregiverFatigue.mood')}</Text>
            {[1, 2, 3, 4, 5].map(v => (
              <TouchableOpacity key={v} style={[styles.rateBtn, todayCheckIn.mood === v && styles.rateBtnActive]} onPress={() => setTodayCheckIn({ ...todayCheckIn, mood: v })}>
                              accessibilityLabel="TouchableOpacity in caregiver-fatigue"
                <Text style={[styles.rateBtnText, todayCheckIn.mood === v && styles.rateBtnTextActive]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.checkInGrid}>
            <Text style={styles.checkInLabel}>{t('caregiverFatigue.patience')}</Text>
            {[1, 2, 3, 4, 5].map(v => (
              <TouchableOpacity key={v} style={[styles.rateBtn, todayCheckIn.patience === v && styles.rateBtnActive]} onPress={() => setTodayCheckIn({ ...todayCheckIn, patience: v })}>
                              accessibilityLabel="TouchableOpacity in caregiver-fatigue"
                <Text style={[styles.rateBtnText, todayCheckIn.patience === v && styles.rateBtnTextActive]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.checkInGrid}>
            <Text style={styles.checkInLabel}>{t('caregiverFatigue.connection')}</Text>
            {[1, 2, 3, 4, 5].map(v => (
              <TouchableOpacity key={v} style={[styles.rateBtn, todayCheckIn.connection === v && styles.rateBtnActive]} onPress={() => setTodayCheckIn({ ...todayCheckIn, connection: v })}>
                              accessibilityLabel="TouchableOpacity in caregiver-fatigue"
                <Text style={[styles.rateBtnText, todayCheckIn.connection === v && styles.rateBtnTextActive]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {!hasCheckedInToday && (
            <TouchableOpacity style={styles.saveBtn} onPress={saveDailyCheckIn}>
                            accessibilityLabel="Save caregiver-fatigue entry"
              <Text style={styles.saveBtnText}>{t('caregiverFatigue.saveCheckIn')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Mental Load Mapping */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('caregiverFatigue.mentalLoad')}</Text>
          <View style={styles.mentalLoadCard}>
            <Text style={styles.totalLoadText}>{totalMentalLoad.toFixed(1)} {t('caregiverFatigue.hoursPerDay')}</Text>
            {mentalLoadTasks.map(task => (
              <View key={task.id} style={styles.taskRow}>
                <Text style={styles.taskLabel}>{task.label}</Text>
                <View style={styles.taskControls}>
                  <TouchableOpacity style={styles.taskBtn} onPress={() => updateMentalLoad(task.id, Math.max(0, task.estimatedHours - 0.5))}>
                                  accessibilityLabel="TouchableOpacity in caregiver-fatigue"
                    <Text style={styles.taskBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.taskHours}>{task.estimatedHours.toFixed(1)}h</Text>
                  <TouchableOpacity style={styles.taskBtn} onPress={() => updateMentalLoad(task.id, task.estimatedHours + 0.5)}>
                                  accessibilityLabel="TouchableOpacity in caregiver-fatigue"
                    <Text style={styles.taskBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Rest Quantum Calculator */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('caregiverFatigue.restQuantum')}</Text>
          <View style={styles.restCard}>
            <Text style={styles.restHint}>{t('caregiverFatigue.restHint')}</Text>
            <View style={styles.restBtns}>
              {[15, 30, 60].map(m => (
                <TouchableOpacity key={m} style={styles.restBtn} onPress={() => addRestWindow(m)}>
                                accessibilityLabel="Add caregiver-fatigue entry"
                  <Text style={styles.restBtnText}>+{m}m</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.restSummary}>
              {restWindows.reduce((s, w) => s + w, 0)} / {Math.max(4, totalMentalLoad).toFixed(0)} {t('caregiverFatigue.minRecommended')}
            </Text>
          </View>
        </View>

        {/* Respite Scheduling */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('caregiverFatigue.respiteScheduling')}</Text>
          <TouchableOpacity style={styles.respiteCard} onPress={() => setShowRespite(true)}>
                          accessibilityLabel="Toggle caregiver-fatigue panel"
            <MaterialCommunityIcons name="calendar-check" size={24} color="#8B5CF6" />
            <View style={styles.respiteInfo}>
              <Text style={styles.respiteGoalText}>{t('caregiverFatigue.weeklyGoal')}: {respiteGoal.weeklyHoursGoal}h</Text>
              <Text style={styles.respiteWeeksText}>{t('caregiverFatigue.week')} {respiteGoal.totalWeeks}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Shift Handoff Link */}
        <TouchableOpacity style={styles.handoffLink}>
                        accessibilityLabel="TouchableOpacity in caregiver-fatigue"
          <MaterialCommunityIcons name="account-switch" size={24} color="#3B82F6" />
          <Text style={styles.handoffText}>{t('caregiverFatigue.delegateMore')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Survey Modal */}
      {showSurvey && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('caregiverFatigue.burnoutSurvey')}</Text>
            {[
              { key: 'exhaustion', label: t('caregiverFatigue.exhaustion') },
              { key: 'sleepQuality', label: t('caregiverFatigue.sleepQuality') },
              { key: 'supportNetwork', label: t('caregiverFatigue.supportNetwork') },
              { key: 'mentalLoad', label: t('caregiverFatigue.mentalLoadSurvey') },
              { key: 'guiltLevel', label: t('caregiverFatigue.guiltLevel') },
            ].map(item => (
              <View key={item.key} style={styles.surveyRow}>
                <Text style={styles.surveyLabel}>{item.label}</Text>
                <View style={styles.surveyBtns}>
                  {[1, 2, 3, 4, 5].map(v => (
                    <TouchableOpacity
                                    accessibilityLabel="TouchableOpacity in caregiver-fatigue"
                      key={v}
                      style={[styles.surveyBtn, (surveyForm as any)[item.key] === v && styles.surveyBtnActive]}
                      onPress={() => setSurveyForm({ ...surveyForm, [item.key]: v })}
                    >
                      <Text style={[styles.surveyBtnText, (surveyForm as any)[item.key] === v && styles.surveyBtnTextActive]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowSurvey(false)}>
                              accessibilityLabel="Toggle caregiver-fatigue panel"
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={saveSurvey}>
                              accessibilityLabel="Save caregiver-fatigue entry"
                <Text style={styles.submitBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Respite Modal */}
      {showRespite && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('caregiverFatigue.setRespiteGoal')}</Text>
            <View style={styles.surveyRow}>
              <Text style={styles.surveyLabel}>{t('caregiverFatigue.weeklyGoal')}</Text>
              <View style={styles.surveyBtns}>
                {[1, 2, 3, 4, 5].map(v => (
                  <TouchableOpacity
                                  accessibilityLabel="TouchableOpacity in caregiver-fatigue"
                    key={v}
                    style={[styles.surveyBtn, respiteForm.goalHours === v && styles.surveyBtnActive]}
                    onPress={() => setRespiteForm({ ...respiteForm, goalHours: v })}
                  >
                    <Text style={[styles.surveyBtnText, respiteForm.goalHours === v && styles.surveyBtnTextActive]}>{v}h</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRespite(false)}>
                              accessibilityLabel="Toggle caregiver-fatigue panel"
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={saveRespite}>
                              accessibilityLabel="Save caregiver-fatigue entry"
                <Text style={styles.submitBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  scoreHeader: { flexDirection: 'row', alignItems: 'center' },
  scoreInfo: { marginLeft: 12 },
  scoreValue: { fontSize: 36, fontWeight: '700' },
  scoreLabel: { fontSize: 14, color: '#6B7280' },
  streakRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  streakText: { marginLeft: 6, fontSize: 14, color: '#F59E0B' },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  alertText: { marginLeft: 8, color: '#EF4444', fontSize: 14 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  actionInfo: { marginLeft: 12 },
  actionTitle: { fontSize: 16, fontWeight: '600', color: '#1E40AF' },
  actionDesc: { fontSize: 13, color: '#3B82F6', marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 },
  checkedInCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', borderRadius: 8, padding: 12 },
  checkedInText: { marginLeft: 8, color: '#065F46', fontSize: 14 },
  checkInGrid: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  checkInLabel: { width: 90, fontSize: 14, color: '#374151' },
  rateBtn: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  rateBtnActive: { backgroundColor: '#3B82F6' },
  rateBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  rateBtnTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#3B82F6', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  mentalLoadCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  totalLoadText: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 12 },
  taskRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  taskLabel: { fontSize: 14, color: '#374151', flex: 1 },
  taskControls: { flexDirection: 'row', alignItems: 'center' },
  taskBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  taskBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  taskHours: { marginHorizontal: 10, fontSize: 14, fontWeight: '600', color: '#111827', width: 35, textAlign: 'center' },
  restCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  restHint: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  restBtns: { flexDirection: 'row', marginBottom: 12 },
  restBtn: { flex: 1, marginRight: 8, backgroundColor: '#8B5CF6', borderRadius: 8, padding: 12, alignItems: 'center' },
  restBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  restSummary: { fontSize: 16, fontWeight: '600', color: '#111827', textAlign: 'center' },
  respiteCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3E8FF', borderRadius: 12, padding: 16 },
  respiteInfo: { marginLeft: 12 },
  respiteGoalText: { fontSize: 16, fontWeight: '600', color: '#7C3AED' },
  respiteWeeksText: { fontSize: 13, color: '#8B5CF6', marginTop: 2 },
  handoffLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', borderRadius: 12, padding: 16, marginTop: 8 },
  handoffText: { marginLeft: 8, fontSize: 15, fontWeight: '600', color: '#3B82F6' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16, textAlign: 'center' },
  surveyRow: { marginBottom: 16 },
  surveyLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  surveyBtns: { flexDirection: 'row' },
  surveyBtn: { flex: 1, marginRight: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: '#E5E7EB', alignItems: 'center' },
  surveyBtnActive: { backgroundColor: '#3B82F6' },
  surveyBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  surveyBtnTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  cancelBtn: { flex: 1, marginRight: 8, paddingVertical: 12, borderRadius: 8, backgroundColor: '#E5E7EB', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  submitBtn: { flex: 1, marginLeft: 8, paddingVertical: 12, borderRadius: 8, backgroundColor: '#3B82F6', alignItems: 'center' },
  submitBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});