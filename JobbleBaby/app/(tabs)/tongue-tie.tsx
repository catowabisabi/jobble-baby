import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

const RECORDS_KEY = '@jobble/tongue_tie_records';

type RecordType = 'diagnosis' | 'release' | 'followup';
type LatchScore = 1 | 2 | 3 | 4 | 5;
type PainScore = 1 | 2 | 3 | 4 | 5;

interface TongueTieRecord {
  id: string; date: string; type: RecordType;
  latch_score: LatchScore; pain_score: PainScore;
  feeding_improvement: 'worse' | 'same' | 'slight' | 'significant';
  notes: string; badge_earned?: boolean;
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

const TYPE_LABELS: Record<RecordType, string> = {
  diagnosis: 'Diagnosis',
  release:   'Release Procedure',
  followup:   'Follow-up',
};

const FEEDING_OPTIONS = ['worse', 'same', 'slight', 'significant'] as const;
const FEEDING_LABELS = { worse: 'Worse', same: 'Same', slight: 'Slight Improvement', significant: 'Significant' };
const STAGE_COLORS: Record<string, string> = {
  not_diagnosed: '#6B7280',
  diagnosed:     '#F59E0B',
  released:      '#10B981',
  followup:      '#3B82F6',
};

function getStage(records: TongueTieRecord[]): string {
  if (records.length === 0) return 'not_diagnosed';
  const types = records.map(r => r.type);
  if (types.includes('release')) return 'followup';
  if (types.includes('diagnosis')) return 'diagnosed';
  return 'not_diagnosed';
}

const STAGE_LABELS: Record<string, string> = {
  not_diagnosed: 'Not Diagnosed',
  diagnosed:     'Diagnosed',
  released:      'Released',
  followup:      'Post-Release Follow-up',
};

export default function TongueTieScreen() {
  const { t } = useLanguage();
  const [records, setRecords] = useState<TongueTieRecord[]>([]);
  const [modal, setModal]     = useState(false);
  const [recType, setRecType] = useState<RecordType>('diagnosis');
  const [latch, setLatch]     = useState<LatchScore>(3);
  const [pain, setPain]       = useState<PainScore>(1);
  const [improvement, setImprovement] = useState<'worse' | 'same' | 'slight' | 'significant'>('same');
  const [notes, setNotes]     = useState('');

  useEffect(() => {
    AsyncStorage.getItem(RECORDS_KEY).then(d => d && setRecords(JSON.parse(d)));
  }, []);

  const save = async () => {
    const record: TongueTieRecord = {
      id: uid(), date: new Date().toISOString(), type: recType,
      latch_score: latch, pain_score: pain,
      feeding_improvement: improvement, notes,
    };
    const next = [record, ...records];
    setRecords(next);
    await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(next));
    if (improvement === 'significant') await AsyncStorage.setItem('@jobble/badge_tongue_tie_improved', 'true');
    setModal(false); setRecType('diagnosis'); setLatch(3); setPain(1); setImprovement('same'); setNotes('');
  };

  const stage = getStage(records);
  const scoreLabels = ['', 'Poor', 'Fair', 'Adequate', 'Good', 'Excellent'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={styles.hdr}>{t('tongueTie.title')}</Text>
        <Text style={styles.sub}>{t('tongueTie.greeting')}</Text>

        {/* Stage Card */}
        <View style={[styles.stageCard, { borderLeftColor: STAGE_COLORS[stage] }]}>
          <View style={styles.stageRow}>
            <MaterialCommunityIcons name="link-variant" size={24} color={STAGE_COLORS[stage]} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.stageLabel}>{t('tongueTie.stage')}</Text>
              <Text style={styles.stageValue}>{t('tongueTie.' + stage) || STAGE_LABELS[stage]}</Text>
            </View>
          </View>
        </View>

        {/* Latest Latch Score */}
        {records.length > 0 && (
          <View style={styles.scoreCard}>
            <Text style={styles.scoreCardLabel}>{t('tongueTie.latchScore')}</Text>
            <Text style={styles.scoreNum}>{records[0].latch_score}/5</Text>
            <Text style={styles.scoreSub}>{scoreLabels[records[0].latch_score]}</Text>
          </View>
        )}

        {/* Add Record */}
        <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addBtnText}>{t('tongueTie.addRecord')}</Text>
        </TouchableOpacity>

        {/* History */}
        <Text style={styles.sectionHdr}>{t('tongueTie.history')}</Text>
        {records.length === 0 && <Text style={styles.empty}>{t('tongueTie.noRecords')}</Text>}
        <FlatList
          data={records}
          keyExtractor={r => r.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.typeBadge, { backgroundColor: item.type === 'release' ? '#F59E0B' : item.type === 'diagnosis' ? '#EF4444' : '#3B82F6' }]}>
                  <Text style={styles.typeBadgeText}>{TYPE_LABELS[item.type]}</Text>
                </View>
                <Text style={styles.dateText}>{new Date(item.date).toLocaleDateString()}</Text>
              </View>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>{t('tongueTie.latchScore')}: <Text style={styles.scoreValue}>{item.latch_score}/5</Text></Text>
                <Text style={styles.scoreLabel}>{t('tongueTie.painScore')}: <Text style={styles.scoreValue}>{item.pain_score}/5</Text></Text>
              </View>
              <Text style={styles.improvementText}>📈 {FEEDING_LABELS[item.feeding_improvement]}</Text>
              {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
            </View>
          )}
        />
      </ScrollView>

      {/* Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('tongueTie.addRecord')}</Text>

            <Text style={styles.fieldLabel}>{t('tongueTie.type')}</Text>
            <View style={styles.typeRow}>
              {(['diagnosis','release','followup'] as RecordType[]).map(rt => (
                <TouchableOpacity key={rt} style={[styles.typeBtn, recType === rt && styles.typeBtnActive]}
                  onPress={() => setRecType(rt)}>
                  <Text style={[styles.typeBtnText, recType === rt && styles.typeBtnTextActive]}>{TYPE_LABELS[rt]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('tongueTie.latchScore')} (1-5)</Text>
            <View style={styles.scorePickerRow}>
              {([1,2,3,4,5] as LatchScore[]).map(s => (
                <TouchableOpacity key={s} style={[styles.scoreBtn, latch === s && styles.scoreBtnActive]}
                  onPress={() => setLatch(s)}>
                  <Text style={[styles.scoreBtnText, latch === s && styles.scoreBtnTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.scoreHint}>{scoreLabels[latch]}</Text>

            <Text style={styles.fieldLabel}>{t('tongueTie.painScore')} (1-5)</Text>
            <View style={styles.scorePickerRow}>
              {([1,2,3,4,5] as PainScore[]).map(s => (
                <TouchableOpacity key={s} style={[styles.scoreBtn, pain === s && styles.scoreBtnActive]}
                  onPress={() => setPain(s)}>
                  <Text style={[styles.scoreBtnText, pain === s && styles.scoreBtnTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.scoreHint}>1=no pain, 5=severe</Text>

            <Text style={styles.fieldLabel}>{t('tongueTie.feedingImprovement')}</Text>
            <View style={styles.chipRow}>
              {FEEDING_OPTIONS.map(opt => (
                <TouchableOpacity key={opt} style={[styles.chip, improvement === opt && styles.chipActive]}
                  onPress={() => setImprovement(opt)}>
                  <Text style={[styles.chipText, improvement === opt && styles.chipTextActive]}>{FEEDING_LABELS[opt]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('tongueTie.notes')}</Text>
            <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes}
              multiline placeholder="optional notes" placeholderTextColor="#6B7280" />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={save}>
                <Text style={styles.saveBtnText}>{t('tongueTie.save')}</Text>
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
  stageCard: { backgroundColor: '#1F2937', borderRadius: 12, padding: 16, borderLeftWidth: 4, marginBottom: 16 },
  stageRow: { flexDirection: 'row', alignItems: 'center' },
  stageLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  stageValue: { fontSize: 16, fontWeight: '600', color: '#F9FAFB' },
  scoreCard: { backgroundColor: '#1E3A5F', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  scoreCardLabel: { fontSize: 12, color: '#9CA3AF' },
  scoreNum: { fontSize: 48, fontWeight: '700', color: '#3B82F6' },
  scoreSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', borderRadius: 10, padding: 14, marginBottom: 20, gap: 8 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sectionHdr: { fontSize: 16, fontWeight: '600', color: '#D1D5DB', marginBottom: 10 },
  empty: { color: '#6B7280', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  card: { backgroundColor: '#1F2937', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#374151' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  typeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  dateText: { fontSize: 12, color: '#9CA3AF' },
  scoreRow: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  scoreLabel: { fontSize: 12, color: '#9CA3AF' },
  scoreValue: { color: '#3B82F6', fontWeight: '600' },
  improvementText: { fontSize: 12, color: '#10B981', marginBottom: 2 },
  notes: { fontSize: 12, color: '#D1D5DB', fontStyle: 'italic', marginTop: 4 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#111827', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: '#9CA3AF', marginTop: 12, marginBottom: 6, fontWeight: '500' },
  input: { backgroundColor: '#1F2937', borderRadius: 8, padding: 12, color: '#F9FAFB', fontSize: 14, borderWidth: 1, borderColor: '#374151' },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#1F2937', alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  typeBtnActive: { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' },
  typeBtnText: { color: '#9CA3AF', fontSize: 11, fontWeight: '500' },
  typeBtnTextActive: { color: '#3B82F6' },
  scorePickerRow: { flexDirection: 'row', gap: 8 },
  scoreBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#1F2937', alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  scoreBtnActive: { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' },
  scoreBtnText: { color: '#9CA3AF', fontSize: 16, fontWeight: '600' },
  scoreBtnTextActive: { color: '#3B82F6' },
  scoreHint: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' },
  chipActive: { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' },
  chipText: { color: '#9CA3AF', fontSize: 11 },
  chipTextActive: { color: '#3B82F6' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#374151', alignItems: 'center' },
  cancelBtnText: { color: '#D1D5DB', fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
