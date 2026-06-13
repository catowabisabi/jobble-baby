import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const REFLEX_KEY = STORAGE_KEYS.REFLEX_ASSESSMENT;
const VISUAL_KEY = STORAGE_KEYS.VISUAL_MOTOR_LOG;
const SKINFOLD_KEY = STORAGE_KEYS.SKINFOLD_LOG;

// Primitive Reflexes
const PRIMITIVE_REFLEXES = [
  { id: 'moro',              nameKey: 'reflex.moro',              minMo: 0,  maxMo: 4  },
  { id: 'tonicLabyrinthine', nameKey: 'reflex.tonicLabyrinthine', minMo: 0,  maxMo: 6  },
  { id: 'atnr',              nameKey: 'reflex.atnr',              minMo: 0,  maxMo: 6  },
  { id: 'galant',            nameKey: 'reflex.galant',            minMo: 0,  maxMo: 6  },
  { id: 'landau',            nameKey: 'reflex.landau',            minMo: 2,  maxMo: 6  },
  { id: 'parachute',         nameKey: 'reflex.parachute',         minMo: 6,  maxMo: 12 },
];

const REFLEX_STATUS_OPTIONS = ['present', 'partially', 'integrated'];

// Visual-Motor Milestones
const VISUAL_MILESTONES = [
  { id: 'horizontalSweep', nameKey: 'visual.horizontalSweep', minMo: 0, maxMo: 2 },
  { id: 'verticalSweep',   nameKey: 'visual.verticalSweep',   minMo: 1, maxMo: 3 },
  { id: 'circularPursuit', nameKey: 'visual.circularPursuit', minMo: 2, maxMo: 4 },
  { id: 'focusTracking',   nameKey: 'visual.focusTracking',   minMo: 1, maxMo: 2 },
];

interface ReflexEntry { id: string; reflexId: string; status: string; date: string; notes: string; }
interface VisualEntry { id: string; milestoneId: string; score: number; date: string; notes: string; }
interface SkinfoldEntry { id: string; site: 'triceps' | 'subscapular'; mm: number; date: string; notes: string; }

export default function ReflexVisualMotor() {
  const { effectiveTheme } = useTheme();
  const { background: bg, card, text, accent } = COLORS[effectiveTheme];
  const { t } = useLanguage();
  const [reflexes, setReflexes] = useState<ReflexEntry[]>([]);
  const [visual, setVisual] = useState<VisualEntry[]>([]);
  const [skinfolds, setSkinfolds] = useState<SkinfoldEntry[]>([]);
  const [modalReflex, setModalReflex] = useState(false);
  const [modalVisual, setModalVisual] = useState(false);
  const [modalSkinfold, setModalSkinfold] = useState(false);
  const [selectedReflex, setSelectedReflex] = useState<ReflexEntry | null>(null);
  const [selectedVisual, setSelectedVisual] = useState<VisualEntry | null>(null);
  const [selectedSkinfold, setSelectedSkinfold] = useState<SkinfoldEntry | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [r, v, s] = await Promise.all([
      AsyncStorage.getItem(REFLEX_KEY),
      AsyncStorage.getItem(VISUAL_KEY),
      AsyncStorage.getItem(SKINFOLD_KEY),
    ]);
    if (r) setReflexes(JSON.parse(r));
    if (v) setVisual(JSON.parse(v));
    if (s) setSkinfolds(JSON.parse(s));
  }

  async function saveReflexes(data: ReflexEntry[]) { setReflexes(data); await AsyncStorage.setItem(REFLEX_KEY, JSON.stringify(data)); }
  async function saveVisual(data: VisualEntry[]) { setVisual(data); await AsyncStorage.setItem(VISUAL_KEY, JSON.stringify(data)); }
  async function saveSkinfolds(data: SkinfoldEntry[]) { setSkinfolds(data); await AsyncStorage.setItem(SKINFOLD_KEY, JSON.stringify(data)); }

  function getReflexColor(reflexId: string, minMo: number, maxMo: number): string {
    const entry = reflexes.find(r => r.reflexId === reflexId);
    if (!entry) return '#9CA3AF';
    if (entry.status === 'integrated') return '#22C55E';
    if (entry.status === 'partially') return '#EAB308';
    return '#EF4444';
  }

  function reflexScore(): number {
    if (reflexes.length === 0) return 0;
    const integrated = reflexes.filter(r => r.status === 'integrated').length;
    return Math.round((integrated / reflexes.length) * 100);
  }
  function visualScore(): number {
    if (visual.length === 0) return 0;
    return Math.round((visual.reduce((s, v) => s + v.score, 0) / visual.length / 5) * 100);
  }
  function bodyCompScore(): number { return skinfolds.length >= 2 ? 70 : 50; }
  function compositeScore(): number { return Math.round(reflexScore() * 0.4 + visualScore() * 0.3 + bodyCompScore() * 0.3); }
  function compositeColor(): string { const s = compositeScore(); return s >= 70 ? '#22C55E' : s >= 40 ? '#EAB308' : '#EF4444'; }

  function openAddReflex(reflexId: string) {
    const existing = reflexes.find(r => r.reflexId === reflexId);
    setSelectedReflex(existing ?? { id: Date.now().toString(), reflexId, status: 'present', date: new Date().toISOString().slice(0, 10), notes: '' });
    setModalReflex(true);
  }
  function openAddVisual(milestoneId: string) {
    const existing = visual.find(v => v.milestoneId === milestoneId);
    setSelectedVisual(existing ?? { id: Date.now().toString(), milestoneId, score: 3, date: new Date().toISOString().slice(0, 10), notes: '' });
    setModalVisual(true);
  }
  function openAddSkinfold(site: 'triceps' | 'subscapular') {
    const existing = skinfolds.find(s => s.site === site);
    setSelectedSkinfold(existing ?? { id: Date.now().toString(), site, mm: 0, date: new Date().toISOString().slice(0, 10), notes: '' });
    setModalSkinfold(true);
  }

  async function saveReflexModal() {
    if (!selectedReflex) return;
    const others = reflexes.filter(r => r.reflexId !== selectedReflex!.reflexId);
    await saveReflexes([...others, selectedReflex]);
    setModalReflex(false);
  }
  async function saveVisualModal() {
    if (!selectedVisual) return;
    const others = visual.filter(v => v.milestoneId !== selectedVisual!.milestoneId);
    await saveVisual([...others, selectedVisual]);
    setModalVisual(false);
  }
  async function saveSkinfoldModal() {
    if (!selectedSkinfold) return;
    const others = skinfolds.filter(s => s.site !== selectedSkinfold!.site);
    await saveSkinfolds([...others, selectedSkinfold]);
    setModalSkinfold(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: text, marginBottom: 16 }}>{t('tabs.reflexVisualMotor')}</Text>

        {/* SECTION A: Reflex Integration Timeline */}
        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={styles.sectionTitle}>{t('reflex.integrationTimeline')}</Text>
          {PRIMITIVE_REFLEXES.map(r => {
            const entry = reflexes.find(x => x.reflexId === r.id);
            const color = getReflexColor(r.id, r.minMo, r.maxMo);
            return (
              <TouchableOpacity key={r.id} style={styles.row} onPress={() => openAddReflex(r.id)} accessibilityLabel={t(r.nameKey) + ' reflex row'}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: text, fontWeight: '600' }}>{t(r.nameKey)}</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{t('reflex.expectedAge')}: {r.minMo}-{r.maxMo} mo</Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: color }]} />
                <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{entry ? t('reflex.' + entry.status) : t('reflex.present')}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SECTION B: Visual-Motor Assessment */}
        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={styles.sectionTitle}>{t('visual.title')}</Text>
          {VISUAL_MILESTONES.map(m => {
            const entry = visual.find(v => v.milestoneId === m.id);
            return (
              <TouchableOpacity key={m.id} style={styles.row} onPress={() => openAddVisual(m.id)} accessibilityLabel={t(m.nameKey) + ' milestone row'}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: text, fontWeight: '600' }}>{t(m.nameKey)}</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{t('visual.expectedAge')}: {m.minMo}-{m.maxMo} mo</Text>
                </View>
                {entry && <Text style={{ color: text }}>{entry.score}/5</Text>}
                <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SECTION C: Skinfold Log */}
        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={styles.sectionTitle}>{t('skinfold.title')}</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.skinfoldBtn, { backgroundColor: bg }]} onPress={() => openAddSkinfold('triceps')} accessibilityLabel={t('skinfold.triceps') + ' measurement'}>
              <Text style={{ color: text }}>{t('skinfold.triceps')}</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{skinfolds.find(s => s.site === 'triceps')?.mm ?? '—'} mm</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.skinfoldBtn, { backgroundColor: bg }]} onPress={() => openAddSkinfold('subscapular')} accessibilityLabel={t('skinfold.subscapular') + ' measurement'}>
              <Text style={{ color: text }}>{t('skinfold.subscapular')}</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{skinfolds.find(s => s.site === 'subscapular')?.mm ?? '—'} mm</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION D: Composite Score */}
        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={styles.sectionTitle}>{t('score.integratedScore')}</Text>
          <View style={{ alignItems: 'center', padding: 16 }}>
            <Text style={{ fontSize: 48, fontWeight: 'bold', color: compositeColor() }}>{compositeScore()}</Text>
            <View style={{ flexDirection: 'row', marginTop: 8, gap: 16 }}>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{t('score.reflexPct')}: {reflexScore()}%</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{t('score.visualMotorPct')}: {visualScore()}%</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{t('score.bodyComp')}: {bodyCompScore()}%</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal: Reflex Entry */}
      <Modal visible={modalReflex} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: card }]}>
            <Text style={[styles.modalTitle, { color: text }]}>{t('reflex.reflexStatus')}</Text>
            {selectedReflex && (
              <>
                <View style={styles.pickerRow}>
                  {REFLEX_STATUS_OPTIONS.map(opt => (
                    <TouchableOpacity key={opt} style={[styles.pickerBtn, selectedReflex.status === opt && { backgroundColor: accent }]} onPress={() => setSelectedReflex({ ...selectedReflex, status: opt })} accessibilityLabel={`Reflex status: ${t('reflex.' + opt)}`}>
                      <Text style={{ color: selectedReflex.status === opt ? '#fff' : text, fontSize: 13 }}>{t('reflex.' + opt)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={[styles.input, { backgroundColor: bg, color: text }]} placeholder="Date (YYYY-MM-DD)" placeholderTextColor="#9CA3AF" value={selectedReflex.date} onChangeText={v => setSelectedReflex({ ...selectedReflex, date: v })} />
                <TextInput style={[styles.input, { backgroundColor: bg, color: text }]} placeholder="Notes" placeholderTextColor="#9CA3AF" value={selectedReflex.notes} onChangeText={v => setSelectedReflex({ ...selectedReflex, notes: v })} />
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalReflex(false)}><Text style={{ color: text }}>{t('reflex.cancel')}</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent }]} onPress={saveReflexModal} accessibilityLabel={t('reflex.save') || 'Save'}><Text style={{ color: '#fff' }}>{t('reflex.save')}</Text></TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal: Visual Entry */}
      <Modal visible={modalVisual} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: card }]}>
            <Text style={[styles.modalTitle, { color: text }]}>{t('visual.visualMotorScore')}</Text>
            {selectedVisual && (
              <>
                <Text style={{ color: text, marginBottom: 8 }}>{t('visual.qualityScore')}</Text>
                <View style={styles.pickerRow}>
                  {[1,2,3,4,5].map(s => (
                    <TouchableOpacity key={s} style={[styles.pickerBtn, selectedVisual.score === s && { backgroundColor: accent }]} onPress={() => setSelectedVisual({ ...selectedVisual, score: s })} accessibilityLabel={`Score ${s} out of 5`}>
                      <Text style={{ color: selectedVisual.score === s ? '#fff' : text }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={[styles.input, { backgroundColor: bg, color: text }]} placeholder="Date (YYYY-MM-DD)" placeholderTextColor="#9CA3AF" value={selectedVisual.date} onChangeText={v => setSelectedVisual({ ...selectedVisual, date: v })} />
                <TextInput style={[styles.input, { backgroundColor: bg, color: text }]} placeholder="Notes" placeholderTextColor="#9CA3AF" value={selectedVisual.notes} onChangeText={v => setSelectedVisual({ ...selectedVisual, notes: v })} />
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisual(false)}><Text style={{ color: text }}>{t('reflex.cancel')}</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent }]} onPress={saveVisualModal} accessibilityLabel={t('reflex.save') || 'Save'}><Text style={{ color: '#fff' }}>{t('reflex.save')}</Text></TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal: Skinfold Entry */}
      <Modal visible={modalSkinfold} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: card }]}>
            <Text style={[styles.modalTitle, { color: text }]}>{t('skinfold.measurement')}</Text>
            {selectedSkinfold && (
              <>
                <View style={styles.pickerRow}>
                  {(['triceps', 'subscapular'] as const).map(site => (
                    <TouchableOpacity key={site} style={[styles.pickerBtn, selectedSkinfold.site === site && { backgroundColor: accent }]} onPress={() => setSelectedSkinfold({ ...selectedSkinfold, site })} accessibilityLabel={`Site: ${t('skinfold.' + site)}`}>
                      <Text style={{ color: selectedSkinfold.site === site ? '#fff' : text, fontSize: 13 }}>{t('skinfold.' + site)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={[styles.input, { backgroundColor: bg, color: text }]} placeholder="mm" placeholderTextColor="#9CA3AF" keyboardType="numeric" value={selectedSkinfold.mm > 0 ? String(selectedSkinfold.mm) : ''} onChangeText={v => setSelectedSkinfold({ ...selectedSkinfold, mm: parseInt(v) || 0 })} />
                <TextInput style={[styles.input, { backgroundColor: bg, color: text }]} placeholder="Date (YYYY-MM-DD)" placeholderTextColor="#9CA3AF" value={selectedSkinfold.date} onChangeText={v => setSelectedSkinfold({ ...selectedSkinfold, date: v })} />
                <TextInput style={[styles.input, { backgroundColor: bg, color: text }]} placeholder="Notes" placeholderTextColor="#9CA3AF" value={selectedSkinfold.notes} onChangeText={v => setSelectedSkinfold({ ...selectedSkinfold, notes: v })} />
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalSkinfold(false)}><Text style={{ color: text }}>{t('reflex.cancel')}</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent }]} onPress={saveSkinfoldModal} accessibilityLabel={t('reflex.save') || 'Save'}><Text style={{ color: '#fff' }}>{t('reflex.save')}</Text></TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#1F2937' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  skinfoldBtn: { flex: 1, padding: 12, borderRadius: 8, marginHorizontal: 4, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  pickerRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  pickerBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', backgroundColor: '#E5E7EB' },
  input: { borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 15 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#E5E7EB' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
});
