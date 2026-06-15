import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { STORAGE_KEYS } from '../../store/storage-keys';

const EVENTS_KEY = STORAGE_KEYS.MORO_REFLEX_EVENTS;

type Trigger = 'loud_noise' | 'movement' | 'light' | 'temperature' | 'other';
type Severity = 'mild' | 'moderate' | 'severe';

interface StartleEvent {
  id: string; timestamp: string; trigger: Trigger;
  severity: Severity; sleep_disruption: boolean; notes: string;
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

const TRIGGERS: { key: Trigger; labelKey: string }[] = [
  { key: 'loud_noise',    labelKey: 'moroReflex.triggerLoud' },
  { key: 'movement',       labelKey: 'moroReflex.triggerMovement' },
  { key: 'light',         labelKey: 'moroReflex.triggerLight' },
  { key: 'temperature',   labelKey: 'moroReflex.triggerTemp' },
  { key: 'other',         labelKey: 'moroReflex.triggerOther' },
];

const SEVERITIES: Severity[] = ['mild', 'moderate', 'severe'];
const SEV_COLORS: Record<Severity, string> = { mild: '#10B981', moderate: '#F59E0B', severe: '#EF4444' };

function getTodayCount(events: StartleEvent[]): number {
  const today = new Date().toDateString();
  return events.filter(e => new Date(e.timestamp).toDateString() === today).length;
}

function getHourlyRate(events: StartleEvent[]): number {
  const today = new Date().toDateString();
  const todayEvents = events.filter(e => new Date(e.timestamp).toDateString() === today);
  if (todayEvents.length === 0) return 0;
  const now = new Date();
  const start = new Date(now);
  start.setHours(6, 0, 0, 0); // count from 6am
  if (start > now) return 0;
  const awakeHours = Math.max((now.getTime() - start.getTime()) / 3600000, 1);
  return todayEvents.length / awakeHours;
}

function alertLevel(rate: number): 'none' | 'yellow' | 'red' {
  if (rate > 15) return 'red';
  if (rate > 10) return 'yellow';
  return 'none';
}

export default function MoroReflexScreen() {
  const { t } = useLanguage();
  const [events, setEvents]       = useState<StartleEvent[]>([]);
  const [modal, setModal]         = useState(false);
  const [trigger, setTrigger]     = useState<Trigger>('loud_noise');
  const [severity, setSeverity]   = useState<Severity>('mild');
  const [disruption, setDisruption] = useState(false);
  const [notes, setNotes]         = useState('');

  useEffect(() => {
    safeGetItem(EVENTS_KEY).then(d => d && setEvents(JSON.parse(d)));
  }, []);

  const save = async () => {
    const event: StartleEvent = { id: uid(), timestamp: new Date().toISOString(), trigger, severity, sleep_disruption: disruption, notes };
    const next = [event, ...events];
    setEvents(next);
    await safeSetItem(EVENTS_KEY, JSON.stringify(next));
    // Badge: Calm Baby — 24h with 0 startles
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const yesterdayEvents = next.filter(e => new Date(e.timestamp).toDateString() === yesterday);
    const todayEvents = next.filter(e => new Date(e.timestamp).toDateString() === today);
    if (yesterdayEvents.length === 0 && todayEvents.length === 0) {
      await safeSetItem(STORAGE_KEYS.BADGE_CALM_BABY, 'true');
    }
    setModal(false); setTrigger('loud_noise'); setSeverity('mild'); setDisruption(false); setNotes('');
  };

  const count = getTodayCount(events);
  const rate  = getHourlyRate(events);
  const alert = alertLevel(rate);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={styles.hdr}>{t('moroReflex.title')}</Text>
        <Text style={styles.sub}>{t('moroReflex.greeting')}</Text>

        {/* Today's Count Card */}
        <View style={styles.countCard}>
          <Text style={styles.countNum}>{count}</Text>
          <Text style={styles.countLabel}>{t('moroReflex.todayCount')}</Text>
          <View style={{ marginTop: 8 }}>
            <Text style={styles.rateLabel}>{t('moroReflex.hourlyRate')}: <Text style={styles.rateNum}>{rate.toFixed(1)}</Text></Text>
          </View>
        </View>

        {/* Alert Banners */}
        {alert === 'yellow' && (
          <View style={[styles.alertBanner, { backgroundColor: '#F59E0B' }]}>
            <MaterialCommunityIcons name="alert" size={18} color="#fff" />
            <Text style={styles.alertText}>{t('moroReflex.alertYellow')}</Text>
          </View>
        )}
        {alert === 'red' && (
          <View style={[styles.alertBanner, { backgroundColor: '#EF4444' }]}>
            <MaterialCommunityIcons name="alert-octagon" size={18} color="#fff" />
            <Text style={styles.alertText}>{t('moroReflex.alertRed')}</Text>
          </View>
        )}

        {/* Add Event */}
        <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
                        accessibilityLabel="Add moro-reflex entry"
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addBtnText}>{t('moroReflex.addEvent')}</Text>
        </TouchableOpacity>

        {/* History */}
        <Text style={styles.sectionHdr}>{t('moroReflex.history')}</Text>
        {events.length === 0 && <Text style={styles.empty}>{t('moroReflex.noEvents')}</Text>}
        <FlatList
          data={events.slice(0, 50)}
          keyExtractor={e => e.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={[styles.sevDot, { backgroundColor: SEV_COLORS[item.severity] }]} />
                <View>
                  <Text style={styles.triggerText}>{t('moroReflex.trigger' + item.trigger.charAt(0).toUpperCase() + item.trigger.slice(1).replace('_', ''))}</Text>
                  <Text style={styles.timeText}>{new Date(item.timestamp).toLocaleString()}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {item.sleep_disruption && <Text style={styles.disruptBadge}>💤 Disrupted</Text>}
                {item.notes && <Text style={styles.notesText}>{item.notes}</Text>}
              </View>
            </View>
          )}
        />
      </ScrollView>

      {/* Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('moroReflex.addEvent')}</Text>

            <Text style={styles.fieldLabel}>{t('moroReflex.trigger')}</Text>
            <View style={styles.chipRow}>
              {TRIGGERS.map(tr => (
                <TouchableOpacity key={tr.key} style={[styles.chip, trigger === tr.key && styles.chipActive]}
                                accessibilityLabel="TouchableOpacity in moro-reflex"
                  onPress={() => setTrigger(tr.key)}>
                  <Text style={[styles.chipText, trigger === tr.key && styles.chipTextActive]}>
                    {t(tr.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('moroReflex.severity')}</Text>
            <View style={styles.sevRow}>
              {SEVERITIES.map(s => (
                <TouchableOpacity key={s} style={[styles.sevBtn, { backgroundColor: SEV_COLORS[s] }]}
                                accessibilityLabel="TouchableOpacity in moro-reflex"
                  onPress={() => setSeverity(s)}>
                  <Text style={styles.sevBtnText}>{t('moroReflex.' + s)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('moroReflex.sleepDisruption')}</Text>
            <View style={styles.disruptRow}>
              <TouchableOpacity style={[styles.disruptBtn, !disruption && styles.disruptBtnActive]}
                              accessibilityLabel="TouchableOpacity in moro-reflex"
                onPress={() => setDisruption(false)}>
                <Text style={[styles.disruptBtnText, !disruption && styles.disruptBtnTextActive]}>{t('moroReflex.no')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.disruptBtn, disruption && styles.disruptBtnActive]}
                              accessibilityLabel="TouchableOpacity in moro-reflex"
                onPress={() => setDisruption(true)}>
                <Text style={[styles.disruptBtnText, disruption && styles.disruptBtnTextActive]}>{t('moroReflex.yes')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>{t('moroReflex.notes')}</Text>
            <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes}
              multiline placeholder="optional" placeholderTextColor="#6B7280" />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                              accessibilityLabel="Cancel moro-reflex action"
                <Text style={styles.cancelBtnText}>{t('moroReflex.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={save}>
                              accessibilityLabel="Save moro-reflex entry"
                <Text style={styles.saveBtnText}>{t('moroReflex.save')}</Text>
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
  countCard: { backgroundColor: '#1E3A5F', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16 },
  countNum: { fontSize: 64, fontWeight: '700', color: '#3B82F6' },
  countLabel: { fontSize: 14, color: '#9CA3AF' },
  rateLabel: { fontSize: 13, color: '#9CA3AF' },
  rateNum: { fontSize: 16, color: '#3B82F6', fontWeight: '600' },
  alertBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, marginBottom: 16, gap: 8 },
  alertText: { color: '#fff', fontSize: 13, flex: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', borderRadius: 10, padding: 14, marginBottom: 20, gap: 8 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sectionHdr: { fontSize: 16, fontWeight: '600', color: '#D1D5DB', marginBottom: 10 },
  empty: { color: '#6B7280', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  card: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1F2937', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#374151' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sevDot: { width: 12, height: 12, borderRadius: 6 },
  triggerText: { fontSize: 14, fontWeight: '600', color: '#F9FAFB' },
  timeText: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  disruptBadge: { fontSize: 11, color: '#F59E0B' },
  notesText: { fontSize: 11, color: '#D1D5DB', marginTop: 2, fontStyle: 'italic', maxWidth: 140 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#111827', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: '#9CA3AF', marginTop: 12, marginBottom: 6, fontWeight: '500' },
  input: { backgroundColor: '#1F2937', borderRadius: 8, padding: 12, color: '#F9FAFB', fontSize: 14, borderWidth: 1, borderColor: '#374151' },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' },
  chipActive: { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' },
  chipText: { color: '#9CA3AF', fontSize: 12 },
  chipTextActive: { color: '#3B82F6' },
  sevRow: { flexDirection: 'row', gap: 8 },
  sevBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  sevBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  disruptRow: { flexDirection: 'row', gap: 8 },
  disruptBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#1F2937', alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  disruptBtnActive: { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' },
  disruptBtnText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
  disruptBtnTextActive: { color: '#3B82F6' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#374151', alignItems: 'center' },
  cancelBtnText: { color: '#D1D5DB', fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
