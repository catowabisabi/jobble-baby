import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

const RECORDS_KEY = '@jobble/reflex_integration_records';
const PROFILE_KEY = '@jobble_baby_profile';

const REFLEXES = [
  { id: 'moro',      name: 'Moro Reflex',          window: '0-6 months',    icon: 'alert-circle-outline',   color: '#EF4444' },
  { id: 'atnr',      name: 'ATNR',                  window: '0-6 months',    icon: 'hand-pointing-right',      color: '#F97316' },
  { id: 'stnr',      name: 'STNR',                 window: '0-6 months',    icon: 'arrow-up-bold',            color: '#F59E0B' },
  { id: 'landau',   name: 'Landau Reaction',       window: '3-8 months',    icon: 'human-handsup',            color: '#10B981' },
  { id: 'galant',   name: 'Galant Reflex',         window: '0-6 months',    icon: 'wave',                     color: '#3B82F6' },
  { id: 'perez',    name: 'Perez Reflex',          window: '0-6 months',    icon: 'arrow-down-bold',          color: '#8B5CF6' },
  { id: 'rooting',  name: 'Rooting Reflex',        window: '0-4 months',    icon: 'face-man-shimmer',        color: '#EC4899' },
  { id: 'grasp',    name: 'Palmar Grasp',          window: '0-5 months',    icon: 'hand-grab',                color: '#06B6D4' },
];

type ReflexId = typeof REFLEXES[number]['id'];

interface ReflexRecord {
  id: string; date: string; reflex_id: ReflexId;
  status: 'integrated' | 'present' | 'hyper-responsive' | 'persistent';
  notes: string;
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export default function ReflexIntegrationScreen() {
  const { t } = useLanguage();
  const [records, setRecords]   = useState<ReflexRecord[]>([]);
  const [babyAge, setBabyAge]   = useState<number>(0);
  const [modal, setModal]       = useState(false);
  const [selected, setSelected] = useState<ReflexId>('moro');
  const [status, setStatus]     = useState<ReflexRecord['status']>('present');
  const [notes, setNotes]       = useState('');

  useEffect(() => {
    AsyncStorage.getItem(RECORDS_KEY).then(d => d && setRecords(JSON.parse(d)));
    AsyncStorage.getItem(PROFILE_KEY).then(d => {
      if (d) { const p = JSON.parse(d); if (p.birthDate) setBabyAge(Math.floor((Date.now() - new Date(p.birthDate).getTime()) / 2592000000)); }
    });
  }, []);

  const save = async () => {
    const record: ReflexRecord = { id: uid(), date: new Date().toISOString(), reflex_id: selected, status, notes };
    const next = [record, ...records];
    setRecords(next);
    await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(next));
    setModal(false); setStatus('present'); setNotes('');
  };

  const getReflexStatus = (reflexId: ReflexId): ReflexRecord['status'] | null => {
    const latest = records.find(r => r.reflex_id === reflexId);
    return latest?.status || null;
  };

  const isOverdue = (reflexId: ReflexId): boolean => {
    const reflex = REFLEXES.find(r => r.id === reflexId);
    if (!reflex) return false;
    const match = reflex.window.match(/(\d+)-(\d+) months/);
    if (!match) return false;
    const maxMonths = parseInt(match[2]);
    return babyAge > maxMonths && getReflexStatus(reflexId) !== 'integrated';
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={styles.hdr}>{t('reflexIntegration.title')}</Text>
        <Text style={styles.sub}>{t('reflexIntegration.greeting')}</Text>

        {babyAge > 0 && <Text style={styles.ageText}>Baby age: {babyAge} months</Text>}

        {/* Reflex Grid */}
        <View style={styles.grid}>
          {REFLEXES.map(reflex => {
            const s = getReflexStatus(reflex.id);
            const overdue = isOverdue(reflex.id);
            return (
              <TouchableOpacity key={reflex.id} style={[styles.reflexCard, overdue && styles.reflexCardOverdue]}
                              accessibilityLabel="TouchableOpacity in reflex-integration"
                onPress={() => { setSelected(reflex.id); setModal(true); }}>
                <View style={[styles.reflexDot, { backgroundColor: reflex.color }]} />
                <Text style={styles.reflexName}>{reflex.name}</Text>
                <Text style={styles.reflexWindow}>{reflex.window}</Text>
                {s && (
                  <View style={[styles.statusBadge, { backgroundColor: s === 'integrated' ? '#10B981' : s === 'persistent' ? '#EF4444' : '#F59E0B' }]}>
                    <Text style={styles.statusText}>{s}</Text>
                  </View>
                )}
                {overdue && <Text style={styles.overdueText}>⚠️ Overdue</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Integration Timeline */}
        <Text style={styles.sectionHdr}>{t('reflexIntegration.timeline')}</Text>
        {records.length === 0 && <Text style={styles.empty}>{t('reflexIntegration.noRecords')}</Text>}
        <FlatList
          data={records.slice(0, 30)}
          keyExtractor={r => r.id}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const reflex = REFLEXES.find(r => r.id === item.reflex_id);
            return (
              <View style={styles.card}>
                <View style={styles.cardLeft}>
                  <View style={[styles.reflexDotSm, { backgroundColor: reflex?.color || '#3B82F6' }]} />
                  <View>
                    <Text style={styles.cardReflexName}>{reflex?.name}</Text>
                    <Text style={styles.cardDate}>{new Date(item.date).toLocaleDateString()}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'integrated' ? '#10B981' : item.status === 'persistent' ? '#EF4444' : '#F59E0B' }]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
            );
          }}
        />
      </ScrollView>

      {/* Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {REFLEXES.find(r => r.id === selected)?.name}
            </Text>

            <Text style={styles.fieldLabel}>{t('reflexIntegration.status')}</Text>
            <View style={styles.statusRow}>
              {(['present','integrated','hyper-responsive','persistent'] as ReflexRecord['status'][]).map(s => (
                <TouchableOpacity key={s} style={[styles.statusBtn, status === s && styles.statusBtnActive]}
                                accessibilityLabel="TouchableOpacity in reflex-integration"
                  onPress={() => setStatus(s)}>
                  <Text style={[styles.statusBtnText, status === s && styles.statusBtnTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('reflexIntegration.notes')}</Text>
            <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes}
              multiline placeholder="optional" placeholderTextColor="#6B7280" />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                              accessibilityLabel="Cancel reflex-integration action"
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={save}>
                              accessibilityLabel="Save reflex-integration entry"
                <Text style={styles.saveBtnText}>{t('reflexIntegration.save')}</Text>
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
  sub: { fontSize: 14, color: '#9CA3AF', marginBottom: 8 },
  ageText: { fontSize: 12, color: '#3B82F6', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  reflexCard: { width: '47%', backgroundColor: '#1F2937', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#374151' },
  reflexCardOverdue: { borderColor: '#EF4444', backgroundColor: '#1F1515' },
  reflexDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 6 },
  reflexName: { fontSize: 13, fontWeight: '600', color: '#F9FAFB', marginBottom: 2 },
  reflexWindow: { fontSize: 10, color: '#6B7280' },
  overdueText: { fontSize: 10, color: '#EF4444', marginTop: 4 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  sectionHdr: { fontSize: 16, fontWeight: '600', color: '#D1D5DB', marginBottom: 10 },
  empty: { color: '#6B7280', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1F2937', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#374151' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reflexDotSm: { width: 8, height: 8, borderRadius: 4 },
  cardReflexName: { fontSize: 13, fontWeight: '600', color: '#F9FAFB' },
  cardDate: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#111827', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: '#9CA3AF', marginTop: 12, marginBottom: 6, fontWeight: '500' },
  input: { backgroundColor: '#1F2937', borderRadius: 8, padding: 12, color: '#F9FAFB', fontSize: 14, borderWidth: 1, borderColor: '#374151' },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' },
  statusBtnActive: { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' },
  statusBtnText: { color: '#9CA3AF', fontSize: 11 },
  statusBtnTextActive: { color: '#3B82F6' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#374151', alignItems: 'center' },
  cancelBtnText: { color: '#D1D5DB', fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
