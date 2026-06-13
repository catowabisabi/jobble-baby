import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { STORAGE_KEYS } from '../../store/storage-keys';

const ENTRIES_KEY = STORAGE_KEYS.WEANING_RASH_ENTRIES;
const FOODS_KEY   = STORAGE_KEYS.WEANING_FOODS_LIST;

const WINDOW_LABELS = ['Days 1-2','Days 3-4','Days 5-7','Week 2','Week 3','Week 4'];

const RASH_COLORS: Record<string, string> = {
  none: '#10B981', mild: '#F59E0B', moderate: '#F97316', severe: '#EF4444',
};

const RASH_LOCATIONS = ['face','torso','arms','legs','diaper area','other'] as const;
const GI_SYMPTOMS     = ['vomiting','diarrhea','constipation','bloating','blood in stool','gassy'] as const;
const STOOL_TYPES     = ['normal','soft','runny','hard','mucousy'] as const;

type RashType   = 'none' | 'mild' | 'moderate' | 'severe';
type RashLoc    = typeof RASH_LOCATIONS[number];
type GiSym      = typeof GI_SYMPTOMS[number];
type Stool      = typeof STOOL_TYPES[number];

interface Entry {
  id: string; date: string; food_name: string; window: number;
  rash_type: RashType; rash_location: RashLoc[];
  gi_symptoms: GiSym[]; stool_type: Stool; notes: string; badge_earned?: boolean;
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export default function WeaningRashScreen() {
  const { t } = useLanguage();
  const [entries, setEntries]     = useState<Entry[]>([]);
  const [foods, setFoods]          = useState<string[]>([]);
  const [modal, setModal]          = useState(false);
  const [food, setFood]            = useState('');
  const [win, setWin]              = useState(1);
  const [rash, setRash]            = useState<RashType>('none');
  const [locs, setLocs]            = useState<RashLoc[]>([]);
  const [gis, setGis]              = useState<GiSym[]>([]);
  const [stool, setStool]          = useState<Stool>('normal');
  const [notes, setNotes]          = useState('');

  useEffect(() => {
    AsyncStorage.getItem(ENTRIES_KEY).then(d => d && setEntries(JSON.parse(d)));
    AsyncStorage.getItem(FOODS_KEY).then(d => d && setFoods(JSON.parse(d)));
  }, []);

  const save = async () => {
    const entry: Entry = { id: uid(), date: new Date().toISOString(), food_name: food,
      window: win, rash_type: rash, rash_location: locs, gi_symptoms: gis, stool_type: stool, notes };
    const next = [entry, ...entries];
    setEntries(next);
    const newFoods = foods.includes(food) ? foods : [food, ...foods];
    setFoods(newFoods);
    await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(next));
    await AsyncStorage.setItem(FOODS_KEY, JSON.stringify(newFoods));
    if (newFoods.length >= 3) await AsyncStorage.setItem(STORAGE_KEYS.BADGE_FOOD_EXPLORER, 'true');
    setModal(false); setFood(''); setWin(1); setRash('none'); setLocs([]); setGis([]); setStool('normal'); setNotes('');
  };

  const toggleLoc = (l: RashLoc) => setLocs(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l]);
  const toggleGi  = (g: GiSym)   => setGis(p  => p.includes(g) ? p.filter(x => x !== g) : [...p, g]);

  const hasFpies  = (e: Entry) => e.rash_type !== 'none' && entries.filter(x => x.food_name === e.food_name).length === 1;

  const progress = (w: number) => entries.filter(e => e.window === w).length;
  const maxProg  = Math.max(...WINDOW_LABELS.map((_, i) => progress(i+1)), 1);

  

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Header */}
        <Text style={styles.hdr}>{t('weaningRash.title')}</Text>
        <Text style={styles.sub}>{t('weaningRash.greeting')}</Text>

        {/* 6-Window Timeline */}
        <View style={styles.timeline}>
          {WINDOW_LABELS.map((label, i) => {
            const w = i + 1;
            const done = entries.filter(e => e.window === w).length;
            const active = w === win;
            return (
              <TouchableOpacity key={w} style={[styles.winChip, active && styles.winChipActive]}
                              accessibilityLabel="TouchableOpacity in weaning-rash"
                onPress={() => setWin(w)}>
                <Text style={[styles.winLabel, active && styles.winLabelActive]}>{label}</Text>
                <Text style={styles.winCount}>{done} log{done !== 1 ? 's' : ''}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* FPIES Alert */}
        {entries.some(e => e.rash_type !== 'none') && (
          <View style={styles.fpiesBanner}>
            <MaterialCommunityIcons name="alert" size={18} color="#fff" />
            <Text style={styles.fpiesText}>{t('weaningRash.fpiesAlert')}</Text>
          </View>
        )}

        {/* Add Food */}
        <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
                        accessibilityLabel="Add weaning-rash entry"
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addBtnText}>{t('weaningRash.addFood')}</Text>
        </TouchableOpacity>

        {/* History */}
        <Text style={styles.sectionHdr}>{t('weaningRash.history')}</Text>
        {entries.length === 0 && <Text style={styles.empty}>No entries yet.</Text>}
        <FlatList
          data={entries}
          keyExtractor={e => e.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.foodName}>{item.food_name}</Text>
                <View style={[styles.rashBadge, { backgroundColor: RASH_COLORS[item.rash_type] }]}>
                  <Text style={styles.rashBadgeText}>{t('weaningRash.rash' + item.rash_type.charAt(0).toUpperCase() + item.rash_type.slice(1))}</Text>
                </View>
              </View>
              <Text style={styles.winMeta}>{WINDOW_LABELS[item.window - 1]}</Text>
              {item.rash_location.length > 0 && <Text style={styles.meta}>📍 {item.rash_location.join(', ')}</Text>}
              {item.gi_symptoms.length > 0  && <Text style={styles.meta}>💊 {item.gi_symptoms.join(', ')}</Text>}
              {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
            </View>
          )}
        />
      </ScrollView>

      {/* Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('weaningRash.addFood')}</Text>

            <Text style={styles.fieldLabel}>{t('weaningRash.foodName')}</Text>
            <TextInput style={styles.input} value={food} onChangeText={setFood} placeholder="e.g. banana" placeholderTextColor="#6B7280" />

            <Text style={styles.fieldLabel}>{t('weaningRash.window')}</Text>
            <View style={styles.winRow}>
              {WINDOW_LABELS.map((label, i) => (
                <TouchableOpacity key={i+1} style={[styles.winOpt, win === i+1 && styles.winOptActive]}
                                accessibilityLabel="TouchableOpacity in weaning-rash"
                  onPress={() => setWin(i+1)}>
                  <Text style={[styles.winOptText, win === i+1 && styles.winOptTextActive]}>{i+1}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('weaningRash.rash')}</Text>
            <View style={styles.rashRow}>
              {(['none','mild','moderate','severe'] as RashType[]).map(r => (
                <TouchableOpacity key={r} style={[styles.rashBtn, { backgroundColor: RASH_COLORS[r] }]}
                                accessibilityLabel="TouchableOpacity in weaning-rash"
                  onPress={() => setRash(r)}>
                  <Text style={styles.rashBtnText}>{t('weaningRash.rash' + r.charAt(0).toUpperCase() + r.slice(1))}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('weaningRash.rashLocation')}</Text>
            <View style={styles.chipRow}>
              {RASH_LOCATIONS.map(l => (
                <TouchableOpacity key={l} style={[styles.chip, locs.includes(l) && styles.chipActive]}
                                accessibilityLabel="TouchableOpacity in weaning-rash"
                  onPress={() => toggleLoc(l)}>
                  <Text style={[styles.chipText, locs.includes(l) && styles.chipTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('weaningRash.giSymptoms')}</Text>
            <View style={styles.chipRow}>
              {GI_SYMPTOMS.map(g => (
                <TouchableOpacity key={g} style={[styles.chip, gis.includes(g) && styles.chipActive]}
                                accessibilityLabel="TouchableOpacity in weaning-rash"
                  onPress={() => toggleGi(g)}>
                  <Text style={[styles.chipText, gis.includes(g) && styles.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('weaningRash.stoolType')}</Text>
            <View style={styles.chipRow}>
              {STOOL_TYPES.map(s => (
                <TouchableOpacity key={s} style={[styles.chip, stool === s && styles.chipActive]}
                                accessibilityLabel="TouchableOpacity in weaning-rash"
                  onPress={() => setStool(s)}>
                  <Text style={[styles.chipText, stool === s && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('weaningRash.notes')}</Text>
            <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes}
              multiline placeholder="optional notes" placeholderTextColor="#6B7280" />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                              accessibilityLabel="Cancel weaning-rash action"
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={save}>
                              accessibilityLabel="Save weaning-rash entry"
                <Text style={styles.saveBtnText}>{t('weaningRash.save')}</Text>
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
  timeline: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  winChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' },
  winChipActive: { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' },
  winLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  winLabelActive: { color: '#3B82F6' },
  winCount: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  fpiesBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DC2626', borderRadius: 8, padding: 12, marginBottom: 16, gap: 8 },
  fpiesText: { color: '#fff', fontSize: 13, flex: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', borderRadius: 10, padding: 14, marginBottom: 20, gap: 8 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sectionHdr: { fontSize: 16, fontWeight: '600', color: '#D1D5DB', marginBottom: 10 },
  empty: { color: '#6B7280', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  card: { backgroundColor: '#1F2937', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#374151' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  foodName: { fontSize: 15, fontWeight: '600', color: '#F9FAFB' },
  rashBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  rashBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  winMeta: { fontSize: 12, color: '#3B82F6', marginBottom: 2 },
  meta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  notes: { fontSize: 12, color: '#D1D5DB', marginTop: 6, fontStyle: 'italic' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#111827', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: '#9CA3AF', marginTop: 12, marginBottom: 6, fontWeight: '500' },
  input: { backgroundColor: '#1F2937', borderRadius: 8, padding: 12, color: '#F9FAFB', fontSize: 14, borderWidth: 1, borderColor: '#374151' },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  winRow: { flexDirection: 'row', gap: 8 },
  winOpt: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#1F2937', alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  winOptActive: { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' },
  winOptText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
  winOptTextActive: { color: '#3B82F6' },
  rashRow: { flexDirection: 'row', gap: 8 },
  rashBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  rashBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' },
  chipActive: { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' },
  chipText: { color: '#9CA3AF', fontSize: 12 },
  chipTextActive: { color: '#3B82F6' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#374151', alignItems: 'center' },
  cancelBtnText: { color: '#D1D5DB', fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
