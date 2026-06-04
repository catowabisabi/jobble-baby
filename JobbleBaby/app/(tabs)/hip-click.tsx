import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

const RECORDS_KEY = '@jobble/hip_click_records';
const PROFILE_KEY = '@jobble_baby_profile';

type HipSide = 'left' | 'right' | 'both';
type CheckResult = 'clean' | 'clunk' | 'needsScan';

interface HipRecord {
  id: string;
  date: string;
  babyAgeWeeks: number;
  side: HipSide;
  result: CheckResult;
  notes: string;
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export default function HipClickScreen() {
  const { t } = useLanguage();
  const [records, setRecords] = useState<HipRecord[]>([]);
  const [babyAgeWeeks, setBabyAgeWeeks] = useState<number>(0);
  const [modal, setModal] = useState(false);
  const [side, setSide] = useState<HipSide>('both');
  const [result, setResult] = useState<CheckResult>('clean');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(RECORDS_KEY).then(d => d && setRecords(JSON.parse(d)));
    AsyncStorage.getItem(PROFILE_KEY).then(d => {
      if (d) {
        const p = JSON.parse(d);
        if (p.birthDate) {
          const ageMs = Date.now() - new Date(p.birthDate).getTime();
          setBabyAgeWeeks(Math.floor(ageMs / 604800000));
        }
      }
    });
  }, []);

  // Alert if persistent clunk past 8 weeks with no ultrasound referral
  useEffect(() => {
    if (babyAgeWeeks >= 8) {
      const hasClean = records.some(r => r.result === 'clean');
      const hasNeedsScan = records.some(r => r.result === 'needsScan');
      if (!hasClean && !hasNeedsScan && records.length > 0) {
        const latestResult = records[0]?.result;
        if (latestResult === 'clunk') {
          Alert.alert(
            t('hipClick.alertTitle'),
            t('hipClick.alertText'),
            [{ text: 'OK' }]
          );
        }
      }
    }
  }, [babyAgeWeeks, records, t]);

  const save = async () => {
    const record: HipRecord = {
      id: uid(),
      date: new Date().toISOString(),
      babyAgeWeeks,
      side,
      result,
      notes,
    };
    const next = [record, ...records];
    setRecords(next);
    await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(next));
    setModal(false);
    setResult('clean');
    setNotes('');
    setSide('both');
  };

  const getLastResult = (): CheckResult | null => records[0]?.result || null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={styles.hdr}>{t('hipClick.title')}</Text>
        <Text style={styles.sub}>{t('hipClick.greeting')}</Text>

        {/* Info card */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information" size={18} color="#3B82F6" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>{t('hipClick.infoTitle')}</Text>
            <Text style={styles.infoText}>{t('hipClick.infoText')}</Text>
          </View>
        </View>

        {/* Baby age */}
        {babyAgeWeeks > 0 && (
          <Text style={styles.ageText}>
            {t('hipClick.babyAgeWeeks')}: {babyAgeWeeks} weeks
          </Text>
        )}

        {/* Last result badge */}
        {records.length > 0 && (
          <View style={styles.lastResultRow}>
            <Text style={styles.lastLabel}>{t('hipClick.result')}:</Text>
            {getLastResult() === 'clean' && (
              <View style={[styles.badge, { backgroundColor: '#10B981' }]}>
                <Text style={styles.badgeText}>{t('hipClick.clean')}</Text>
              </View>
            )}
            {getLastResult() === 'clunk' && (
              <View style={[styles.badge, { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.badgeText}>{t('hipClick.clunk')}</Text>
              </View>
            )}
            {getLastResult() === 'needsScan' && (
              <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.badgeText}>{t('hipClick.needsScan')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Add check button */}
        <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addBtnText}>{t('hipClick.addCheck')}</Text>
        </TouchableOpacity>

        {/* History */}
        <Text style={styles.sectionHdr}>{t('hipClick.history')}</Text>
        {records.length === 0 && (
          <Text style={styles.empty}>{t('hipClick.noRecords')}</Text>
        )}
        <FlatList
          data={records.slice(0, 50)}
          keyExtractor={r => r.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={[styles.dot, {
                  backgroundColor: item.result === 'clean' ? '#10B981' : item.result === 'needsScan' ? '#EF4444' : '#F59E0B'
                }]} />
                <View>
                  <Text style={styles.cardSide}>
                    {item.side === 'left' ? t('hipClick.left') : item.side === 'right' ? t('hipClick.right') : t('hipClick.both')}
                  </Text>
                  <Text style={styles.cardDate}>
                    {new Date(item.date).toLocaleDateString()} · {item.babyAgeWeeks}w
                  </Text>
                </View>
              </View>
              <View style={[styles.badge, {
                backgroundColor: item.result === 'clean' ? '#10B981' : item.result === 'needsScan' ? '#EF4444' : '#F59E0B'
              }]}>
                <Text style={styles.badgeText}>
                  {item.result === 'clean' ? t('hipClick.clean') : item.result === 'needsScan' ? t('hipClick.needsScan') : t('hipClick.clunk')}
                </Text>
              </View>
            </View>
          )}
        />
      </ScrollView>

      {/* Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('hipClick.addCheck')}</Text>

            <Text style={styles.fieldLabel}>{t('hipClick.hipSide')}</Text>
            <View style={styles.sideRow}>
              {(['left', 'right', 'both'] as HipSide[]).map(s => (
                <TouchableOpacity key={s} style={[styles.sideBtn, side === s && styles.sideBtnActive]}
                  onPress={() => setSide(s)}>
                  <Text style={[styles.sideBtnText, side === s && styles.sideBtnTextActive]}>
                    {s === 'left' ? t('hipClick.left') : s === 'right' ? t('hipClick.right') : t('hipClick.both')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('hipClick.result')}</Text>
            <View style={styles.resultRow}>
              {(['clean', 'clunk', 'needsScan'] as CheckResult[]).map(r => (
                <TouchableOpacity key={r} style={[styles.resultBtn, result === r && styles.resultBtnActive]}
                  onPress={() => setResult(r)}>
                  <Text style={[styles.resultBtnText, result === r && styles.resultBtnTextActive]}>
                    {r === 'clean' ? t('hipClick.clean') : r === 'clunk' ? t('hipClick.clunk') : t('hipClick.needsScan')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('hipClick.notes')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="optional"
              placeholderTextColor="#6B7280"
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={save}>
                <Text style={styles.saveBtnText}>{t('hipClick.save')}</Text>
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
  sub: { fontSize: 14, color: '#9CA3AF', marginBottom: 16 },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  infoTitle: { fontSize: 13, fontWeight: '600', color: '#93C5FD', marginBottom: 4 },
  infoText: { fontSize: 12, color: '#BFDBFE', lineHeight: 18 },
  ageText: { fontSize: 12, color: '#3B82F6', marginBottom: 12 },
  lastResultRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  lastLabel: { fontSize: 13, color: '#9CA3AF' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sectionHdr: { fontSize: 16, fontWeight: '600', color: '#D1D5DB', marginBottom: 10 },
  empty: { color: '#6B7280', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardSide: { fontSize: 13, fontWeight: '600', color: '#F9FAFB' },
  cardDate: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: '#9CA3AF', marginTop: 12, marginBottom: 6, fontWeight: '500' },
  sideRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  sideBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  sideBtnActive: { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' },
  sideBtnText: { color: '#9CA3AF', fontSize: 13 },
  sideBtnTextActive: { color: '#3B82F6' },
  resultRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  resultBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  resultBtnActive: { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' },
  resultBtnText: { color: '#9CA3AF', fontSize: 13 },
  resultBtnTextActive: { color: '#3B82F6' },
  input: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    color: '#F9FAFB',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#374151', alignItems: 'center' },
  cancelBtnText: { color: '#D1D5DB', fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});