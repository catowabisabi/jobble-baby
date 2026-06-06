import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

const ENTRIES_KEY = '@jobble/oral_motor_entries';

const NIPPLE_LEVELS = [
  { level: 1, label: 'Newborn',   flow: 'Slow (0-1 mL/min)',    desc: 'For preemies & newborns' },
  { level: 2, label: 'Slow Flow', flow: '1-3 mL/min',            desc: '0-3 months' },
  { level: 3, label: 'Variable',  flow: 'Variable',              desc: '3-6 months, variable' },
  { level: 4, label: 'Fast Flow', flow: '3-6 mL/min',           desc: '6+ months' },
  { level: 5, label: 'Y-Cut',     flow: 'Fastest (Formula/6m+)', desc: 'Thick liquids, 6+ months' },
];

type Acceptance = 'accepted' | 'refused' | 'partial';

interface Entry {
  id: string; date: string; level: number;
  acceptance: Acceptance; notes: string; badge_earned?: boolean;
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export default function OralMotorScreen() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [modal, setModal]      = useState(false);
  const [selLevel, setSelLevel] = useState(1);
  const [accept, setAccept]    = useState<Acceptance>('accepted');
  const [notes, setNotes]       = useState('');

  useEffect(() => {
    AsyncStorage.getItem(ENTRIES_KEY).then(d => d && setEntries(JSON.parse(d)));
  }, []);

  const save = async () => {
    const entry: Entry = { id: uid(), date: new Date().toISOString(), level: selLevel, acceptance: accept, notes };
    const next = [entry, ...entries];
    setEntries(next);
    await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(next));
    const uniqueLevels = new Set(next.map(e => e.level));
    if (uniqueLevels.size >= 4) await AsyncStorage.setItem('@jobble/badge_nipple_navigator', 'true');
    setModal(false); setSelLevel(1); setAccept('accepted'); setNotes('');
  };

  const acceptColor = (a: Acceptance) => ({ accepted: '#10B981', refused: '#EF4444', partial: '#F59E0B' }[a]);

  const tried = new Set(entries.map(e => e.level));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={styles.hdr}>{t('oralMotor.title')}</Text>
        <Text style={styles.sub}>{t('oralMotor.greeting')}</Text>

        {/* Nipple Level Grid */}
        <Text style={styles.gridHdr}>{t('oralMotor.nippleLevels')}</Text>
        <View style={styles.grid}>
          {NIPPLE_LEVELS.map(n => {
            const status = entries.find(e => e.level === n.level);
            const tried_this = tried.has(n.level);
            return (
              <TouchableOpacity key={n.level} style={[styles.nippleCard, tried_this && styles.nippleCardTried]}
                              accessibilityLabel="TouchableOpacity in oral-motor"
                onPress={() => { setSelLevel(n.level); setModal(true); }}>
                <Text style={styles.nippleLevel}>#{n.level}</Text>
                <Text style={styles.nippleLabel}>{t('oralMotor.level' + n.level)}</Text>
                <Text style={styles.nippleFlow}>{n.flow}</Text>
                {tried_this && status && (
                  <View style={[styles.statusDot, { backgroundColor: acceptColor(status.acceptance) }]} />
                )}
                {!tried_this && <Text style={styles.notTried}>Not tried</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Badge hint */}
        <View style={styles.badgeHint}>
          <MaterialCommunityIcons name="trophy-variant" size={16} color="#F59E0B" />
          <Text style={styles.badgeHintText}>{t('oralMotor.nippleNavigator')} — try 4+ levels</Text>
        </View>

        {/* History */}
        <Text style={styles.sectionHdr}>{t('oralMotor.history')}</Text>
        {entries.length === 0 && <Text style={styles.empty}>No entries yet.</Text>}
        <FlatList
          data={entries}
          keyExtractor={e => e.id}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const lvl = NIPPLE_LEVELS.find(n => n.level === item.level)!;
            return (
              <View style={styles.card}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardLevel}>#{item.level}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardLabel}>{lvl.label}</Text>
                    <Text style={styles.cardFlow}>{lvl.flow}</Text>
                    {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
                  </View>
                </View>
                <View style={[styles.acceptBadge, { backgroundColor: acceptColor(item.acceptance) }]}>
                  <Text style={styles.acceptText}>{t('oralMotor.' + item.acceptance)}</Text>
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
            <Text style={styles.modalTitle}>{t('oralMotor.addEntry')}</Text>

            <Text style={styles.fieldLabel}>{t('oralMotor.nippleLevel')} — #{selLevel}</Text>
            <Text style={styles.selectedInfo}>{NIPPLE_LEVELS.find(n => n.level === selLevel)?.label} / {NIPPLE_LEVELS.find(n => n.level === selLevel)?.flow}</Text>

            <View style={styles.winRow}>
              {NIPPLE_LEVELS.map(n => (
                <TouchableOpacity key={n.level} style={[styles.winOpt, selLevel === n.level && styles.winOptActive]}
                                accessibilityLabel="TouchableOpacity in oral-motor"
                  onPress={() => setSelLevel(n.level)}>
                  <Text style={[styles.winOptText, selLevel === n.level && styles.winOptTextActive]}>{n.level}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('oralMotor.acceptance')}</Text>
            <View style={styles.acceptRow}>
              {(['accepted','refused','partial'] as Acceptance[]).map(a => (
                <TouchableOpacity key={a} style={[styles.acceptBtn, { backgroundColor: acceptColor(a) }]}
                                accessibilityLabel="TouchableOpacity in oral-motor"
                  onPress={() => setAccept(a)}>
                  <Text style={styles.acceptBtnText}>{t('oralMotor.' + a)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('oralMotor.notes')}</Text>
            <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes}
              multiline placeholder="optional notes" placeholderTextColor="#6B7280" />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                              accessibilityLabel="Cancel oral-motor action"
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={save}>
                              accessibilityLabel="Save oral-motor entry"
                <Text style={styles.saveBtnText}>{t('oralMotor.save')}</Text>
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
  gridHdr: { fontSize: 14, fontWeight: '600', color: '#D1D5DB', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  nippleCard: { width: '47%', backgroundColor: '#1F2937', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#374151', alignItems: 'center' },
  nippleCardTried: { borderColor: '#3B82F6' },
  nippleLevel: { fontSize: 24, fontWeight: '700', color: '#3B82F6', marginBottom: 4 },
  nippleLabel: { fontSize: 12, fontWeight: '600', color: '#F9FAFB', marginBottom: 2 },
  nippleFlow: { fontSize: 10, color: '#9CA3AF', textAlign: 'center' },
  notTried: { fontSize: 10, color: '#6B7280', marginTop: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  badgeHint: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F2937', borderRadius: 8, padding: 10, marginBottom: 20, gap: 8 },
  badgeHintText: { color: '#F59E0B', fontSize: 12 },
  sectionHdr: { fontSize: 16, fontWeight: '600', color: '#D1D5DB', marginBottom: 10 },
  empty: { color: '#6B7280', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1F2937', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#374151' },
  cardLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  cardLevel: { fontSize: 20, fontWeight: '700', color: '#3B82F6' },
  cardLabel: { fontSize: 14, fontWeight: '600', color: '#F9FAFB' },
  cardFlow: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  notes: { fontSize: 11, color: '#D1D5DB', marginTop: 4, fontStyle: 'italic' },
  acceptBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  acceptText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#111827', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: '#9CA3AF', marginTop: 12, marginBottom: 6, fontWeight: '500' },
  selectedInfo: { fontSize: 12, color: '#3B82F6', marginBottom: 6 },
  input: { backgroundColor: '#1F2937', borderRadius: 8, padding: 12, color: '#F9FAFB', fontSize: 14, borderWidth: 1, borderColor: '#374151' },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  winRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  winOpt: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#1F2937', alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  winOptActive: { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' },
  winOptText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
  winOptTextActive: { color: '#3B82F6' },
  acceptRow: { flexDirection: 'row', gap: 8 },
  acceptBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#374151', alignItems: 'center' },
  cancelBtnText: { color: '#D1D5DB', fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
