import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { STORAGE_KEYS } from '../../store/storage-keys';

const PLAN_KEY = STORAGE_KEYS.JET_LAG_PLAN;
const HISTORY_KEY = STORAGE_KEYS.JET_LAG_HISTORY;

interface Plan {
  departure_zone: string; arrival_zone: string; shift_hours: number; baby_age_months: number;
  start_date: string; daily_shift_minutes: number; days: DayPlan[];
}

interface DayPlan { day: number; target_sleep_start: string; target_sleep_end: string; awake_window_minutes: number; completed: boolean; }

function calcShift(dep: string, arr: string): number {
  const getOffset = (z: string) => { const m = z.match(/([+-]?\d+):?(\d*)/); return m ? parseInt(m[1]) + (parseInt(m[2] || '0') / 60) : 0; };
  return Math.round((getOffset(arr) - getOffset(dep)) * 60);
}

function buildPlan(dep: string, arr: string, baby_age: number): Plan {
  const shift_min = Math.abs(calcShift(dep, arr));
  const dir = calcShift(arr, dep) > 0 ? 1 : -1;
  const daily = Math.min(30, Math.max(15, Math.round(shift_min / 7)));
  const days = Math.ceil(shift_min / daily);
  const now = new Date();
  const dayPlans: DayPlan[] = [];
  const defaultAwake = baby_age < 6 ? 150 : baby_age < 9 ? 180 : 210;
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    dayPlans.push({ day: i + 1, target_sleep_start: '19:30', target_sleep_end: '07:00', awake_window_minutes: defaultAwake, completed: false });
  }
  return { departure_zone: dep, arrival_zone: arr, shift_hours: Math.round(shift_min / 60 * 10) / 10, baby_age_months: baby_age, start_date: now.toISOString(), daily_shift_minutes: daily, days: dayPlans };
}

const COMMON_TIMEZONES = [
  { key: 'utc8', display: 'UTC+8' },
  { key: 'utc530', display: 'UTC+5:30' },
  { key: 'utc9', display: 'UTC+9' },
  { key: 'utc_5', display: 'UTC-5' },
  { key: 'utc_8', display: 'UTC-8' },
  { key: 'utc1', display: 'UTC+1' },
];

function getDefaultZones(): [string, string] {
  const now = new Date();
  const offset = -now.getTimezoneOffset() / 60;
  const localDisplay = `UTC${offset >= 0 ? '+' : ''}${offset}`;
  const nearest = COMMON_TIMEZONES.slice().sort((a, b) => Math.abs(parseFloat(a.display.slice(3)) - offset) - Math.abs(parseFloat(b.display.slice(3)) - offset))[0];
  return [localDisplay, nearest.display];
}

function zoneToKey(zone: string): string {
  const found = COMMON_TIMEZONES.find(z => z.display === zone);
  return found ? found.key : zone;
}

function zoneToDisplay(zone: string, t: (key: string) => string): string {
  const found = COMMON_TIMEZONES.find(z => z.display === zone || z.key === zone);
  if (found) {
    return t(`jetLag.timezone.${found.key}`);
  }
  return zone;
}

export default function JetLagScreen() {
  const { t } = useLanguage();
  const [plan, setPlan]     = useState<Plan | null>(null);
  const [modal, setModal]   = useState(false);
  const [dep, setDep]      = useState('UTC+8');
  const [arr, setArr]      = useState('UTC-8');
  const [age, setAge]      = useState('');

  useEffect(() => {
    AsyncStorage.getItem(PLAN_KEY).then(d => d && setPlan(JSON.parse(d)));
  }, []);

  const start = async () => {
    const baby_age = parseInt(age) || 6;
    const newPlan = buildPlan(dep, arr, baby_age);
    setPlan(newPlan);
    await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(newPlan));
    setModal(false);
  };

  const completeDay = async (day: number) => {
    if (!plan) return;
    const updated = { ...plan, days: plan.days.map(d => d.day === day ? { ...d, completed: true } : d) };
    setPlan(updated);
    await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(updated));
  };

  const shift = plan ? Math.abs(calcShift(plan.departure_zone, plan.arrival_zone)) : 0;
  const shift_hours = Math.round(shift / 60 * 10) / 10;
  const largeShiftAlert = shift_hours > 5;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={styles.hdr}>{t('jetLag.title')}</Text>
        <Text style={styles.sub}>{t('jetLag.greeting')}</Text>

        {largeShiftAlert && (
          <View style={styles.alertBanner}>
            <MaterialCommunityIcons name="alert" size={16} color="#fff" />
            <Text style={styles.alertText}>{t('jetLag.alertLargeShift')}</Text>
          </View>
        )}

        {plan ? (
          <>
            {/* Active Plan Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('jetLag.shiftHours')}</Text>
              <Text style={styles.shiftNum}>{shift_hours}h</Text>
              <Text style={styles.summarySub}>{zoneToDisplay(plan.departure_zone, t)} → {zoneToDisplay(plan.arrival_zone, t)}</Text>
              <Text style={styles.summarySub}>{t('jetLag.dailyShift')}: {plan.daily_shift_minutes}min/day</Text>
            </View>

            {/* Day Cards */}
            {plan.days.map((d, i) => (
              <TouchableOpacity key={d.day} style={[styles.dayCard, d.completed && styles.dayCardDone]}
                              accessibilityLabel="TouchableOpacity in jet-lag"
                onPress={() => !d.completed && completeDay(d.day)}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayNum}>{t('jetLag.currentDay')} {d.day}</Text>
                  {d.completed ? (
                    <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
                  ) : (
                    <Text style={styles.todayTarget}>{t('jetLag.todayTarget')}</Text>
                  )}
                </View>
                <Text style={styles.targetSleep}>{d.target_sleep_start} – {d.target_sleep_end}</Text>
                <Text style={styles.awakeWindow}>☀️ {t('jetLag.awakeWindow')}: {d.awake_window_minutes}min</Text>
                {!d.completed && <Text style={styles.tapHint}>Tap to mark complete</Text>}
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="airplane" size={48} color="#374151" />
            <Text style={styles.emptyText}>{t('jetLag.noPlan')}</Text>
          </View>
        )}

        {/* Start New Plan */}
        <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
                        accessibilityLabel="Add jet-lag entry"
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addBtnText}>{t('jetLag.startPlan')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Setup Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('jetLag.startPlan')}</Text>

            <Text style={styles.fieldLabel}>{t('jetLag.departureZone')}</Text>
            <TextInput style={styles.input} value={dep} onChangeText={setDep} placeholder={t('jetLag.timezone.utc8')} placeholderTextColor="#6B7280" />

            <Text style={styles.fieldLabel}>{t('jetLag.arrivalZone')}</Text>
            <TextInput style={styles.input} value={arr} onChangeText={setArr} placeholder={t('jetLag.timezone.utc_8')} placeholderTextColor="#6B7280" />

            <Text style={styles.fieldLabel}>{t('jetLag.babyAge')}</Text>
            <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" placeholder="e.g. 6" placeholderTextColor="#6B7280" />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                              accessibilityLabel="Cancel jet-lag action"
                <Text style={styles.cancelBtnText}>{t('jetLag.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={start}>
                              accessibilityLabel="Start jet-lag timer"
                <Text style={styles.saveBtnText}>{t('jetLag.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hdr: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  sub: { fontSize: 14, color: '#9CA3AF', marginBottom: 20 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B', borderRadius: 10, padding: 12, marginBottom: 16, gap: 8 },
  alertText: { color: '#fff', fontSize: 12, flex: 1 },
  summaryCard: { backgroundColor: '#1E3A5F', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16 },
  summaryLabel: { fontSize: 12, color: '#9CA3AF' },
  shiftNum: { fontSize: 48, fontWeight: '700', color: '#3B82F6' },
  summarySub: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  dayCard: { backgroundColor: '#1F2937', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#374151' },
  dayCardDone: { opacity: 0.6 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dayNum: { fontSize: 14, fontWeight: '600', color: '#F9FAFB' },
  todayTarget: { fontSize: 11, color: '#3B82F6' },
  targetSleep: { fontSize: 20, fontWeight: '700', color: '#3B82F6', marginBottom: 4 },
  awakeWindow: { fontSize: 12, color: '#9CA3AF' },
  tapHint: { fontSize: 11, color: '#6B7280', marginTop: 6 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#6B7280', fontSize: 14, marginTop: 12 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', borderRadius: 10, padding: 14, marginTop: 16, gap: 8 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#111827', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: '#9CA3AF', marginTop: 12, marginBottom: 6, fontWeight: '500' },
  input: { backgroundColor: '#1F2937', borderRadius: 8, padding: 12, color: '#F9FAFB', fontSize: 14, borderWidth: 1, borderColor: '#374151' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#374151', alignItems: 'center' },
  cancelBtnText: { color: '#D1D5DB', fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
