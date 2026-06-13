cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby

# STEP 1: Create reflex-visual-motor.tsx
node -e "
const fs = require('fs');
const path = 'app/(tabs)/reflex-visual-motor.tsx';

const content = \`import { useState, useEffect } from 'react';
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

// ─── Primitive Reflexes ───────────────────────────────────────────────────────
const PRIMITIVE_REFLEXES = [
  { id: 'moro',          nameKey: 'reflex.moro',          minMo: 0,  maxMo: 4  },
  { id: 'tonicLabyrinthine', nameKey: 'reflex.tonicLabyrinthine', minMo: 0, maxMo: 6 },
  { id: 'atnr',          nameKey: 'reflex.atnr',           minMo: 0,  maxMo: 6  },
  { id: 'galant',        nameKey: 'reflex.galant',         minMo: 0,  maxMo: 6  },
  { id: 'landau',        nameKey: 'reflex.landau',         minMo: 2,  maxMo: 6  },
  { id: 'parachute',     nameKey: 'reflex.parachute',      minMo: 6,  maxMo: 12 },
];

const REFLEX_STATUS_OPTIONS = ['present', 'partially', 'integrated'];

// ─── Visual-Motor Milestones ──────────────────────────────────────────────────
const VISUAL_MILESTONES = [
  { id: 'horizontalSweep',  nameKey: 'visual.horizontalSweep',  minMo: 0, maxMo: 2 },
  { id: 'verticalSweep',    nameKey: 'visual.verticalSweep',    minMo: 1, maxMo: 3 },
  { id: 'circularPursuit',  nameKey: 'visual.circularPursuit',  minMo: 2, maxMo: 4 },
  { id: 'focusTracking',    nameKey: 'visual.focusTracking',    minMo: 1, maxMo: 2 },
];

// ─── Types ───────────────────────────────────────────────────────────────────
interface ReflexEntry {
  id: string; reflexId: string; status: string; date: string; notes: string;
}
interface VisualEntry {
  id: string; milestoneId: string; score: number; date: string; notes: string;
}
interface SkinfoldEntry {
  id: string; site: 'triceps' | 'subscapular'; mm: number; date: string; notes: string;
}

export default function ReflexVisualMotor() {
  const { bg, card, text } = COLORS;
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

  async function saveReflexes(data: ReflexEntry[]) {
    setReflexes(data);
    await AsyncStorage.setItem(REFLEX_KEY, JSON.stringify(data));
  }
  async function saveVisual(data: VisualEntry[]) {
    setVisual(data);
    await AsyncStorage.setItem(VISUAL_KEY, JSON.stringify(data));
  }
  async function saveSkinfolds(data: SkinfoldEntry[]) {
    setSkinfolds(data);
    await AsyncStorage.setItem(SKINFOLD_KEY, JSON.stringify(data));
  }

  function getReflexStatus(reflexId: string): string {
    return reflexes.find(r => r.reflexId === reflexId)?.status ?? '';
  }
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
    const avg = visual.reduce((s, v) => s + v.score, 0) / visual.length;
    return Math.round((avg / 5) * 100);
  }
  function bodyCompScore(): number {
    if (skinfolds.length < 2) return 50;
    return 70; // placeholder — healthy range check
  }
  function compositeScore(): number {
    return Math.round(reflexScore() * 0.4 + visualScore() * 0.3 + bodyCompScore() * 0.3);
  }
  function compositeColor(): string {
    const s = compositeScore();
    if (s >= 70) return '#22C55E';
    if (s >= 40) return '#EAB308';
    return '#EF4444';
  }

  function openAddReflex(reflexId?: string) {
    if (reflexId) {
      const existing = reflexes.find(r => r.reflexId === reflexId);
      setSelectedReflex(existing ?? { id: Date.now().toString(), reflexId, status: '', date: new Date().toISOString().slice(0, 10), notes: '' });
    } else {
      setSelectedReflex({ id: Date.now().toString(), reflexId: '', status: '', date: new Date().toISOString().slice(0, 10), notes: '' });
    }
    setModalReflex(true);
  }

  function openAddVisual(milestoneId?: string) {
    if (milestoneId) {
      const existing = visual.find(v => v.milestoneId === milestoneId);
      setSelectedVisual(existing ?? { id: Date.now().toString(), milestoneId, score: 3, date: new Date().toISOString().slice(0, 10), notes: '' });
    } else {
      setSelectedVisual({ id: Date.now().toString(), milestoneId: '', score: 3, date: new Date().toISOString().slice(0, 10), notes: '' });
    }
    setModalVisual(true);
  }

  function openAddSkinfold(site?: 'triceps' | 'subscapular') {
    if (site) {
      const existing = skinfolds.find(s => s.site === site);
      setSelectedSkinfold(existing ?? { id: Date.now().toString(), site, mm: 0, date: new Date().toISOString().slice(0, 10), notes: '' });
    } else {
      setSelectedSkinfold({ id: Date.now().toString(), site: 'triceps', mm: 0, date: new Date().toISOString().slice(0, 10), notes: '' });
    }
    setModalSkinfold(true);
  }

  async function saveReflexModal() {
    if (!selectedReflex) return;
    const existing = reflexes.filter(r => r.reflexId !== selectedReflex!.reflexId);
    await saveReflexes([...existing, selectedReflex]);
    setModalReflex(false);
  }

  async function saveVisualModal() {
    if (!selectedVisual) return;
    const existing = visual.filter(v => v.milestoneId !== selectedVisual!.milestoneId);
    await saveVisual([...existing, selectedVisual]);
    setModalVisual(false);
  }

  async function saveSkinfoldModal() {
    if (!selectedSkinfold) return;
    const existing = skinfolds.filter(s => s.site !== selectedSkinfold!.site);
    await saveSkinfolds([...existing, selectedSkinfold]);
    setModalSkinfold(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: text, marginBottom: 16 }}>
          {t('tabs.reflexVisualMotor')}
        </Text>

        {/* ── SECTION A: Reflex Integration Timeline ── */}
        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={styles.sectionTitle}>{t('reflex.integrationTimeline')}</Text>
          {PRIMITIVE_REFLEXES.map(r => {
            const status = getReflexStatus(r.id);
            const color = getReflexColor(r.id, r.minMo, r.maxMo);
            return (
              <TouchableOpacity key={r.id} style={styles.row} onPress={() => openAddReflex(r.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: text, fontWeight: '600' }}>{t(r.nameKey)}</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{t('reflex.expectedAge')}: {r.minMo}-{r.maxMo} mo</Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: color }]} />
                <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{status ? t('reflex.' + status) : t('reflex.present')}</Text>
                <MaterialCommunityIcons name=\"chevron-right\" size={20} color=\"#9CA3AF\" />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── SECTION B: Visual-Motor Assessment ── */}
        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={styles.sectionTitle}>{t('visual.title')}</Text>
          {VISUAL_MILESTONES.map(m => {
            const entry = visual.find(v => v.milestoneId === m.id);
            return (
              <TouchableOpacity key={m.id} style={styles.row} onPress={() => openAddVisual(m.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: text, fontWeight: '600' }}>{t(m.nameKey)}</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{t('visual.expectedAge')}: {m.minMo}-{m.maxMo} mo</Text>
                </View>
                {entry && <Text style={{ color: text }}>{entry.score}/5</Text>}
                <MaterialCommunityIcons name=\"chevron-right\" size={20} color=\"#9CA3AF\" />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── SECTION C: Skinfold Log ── */}
        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={styles.sectionTitle}>{t('skinfold.title')}</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.skinfoldBtn, { backgroundColor: bg }]} onPress={() => openAddSkinfold('triceps')}>
              <Text style={{ color: text }}>{t('skinfold.triceps')}</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                {skinfolds.find(s => s.site === 'triceps')?.mm ?? '—'} mm
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.skinfoldBtn, { backgroundColor: bg }]} onPress={() => openAddSkinfold('subscapular')}>
              <Text style={{ color: text }}>{t('skinfold.subscapular')}</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                {skinfolds.find(s => s.site === 'subscapular')?.mm ?? '—'} mm
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SECTION D: Composite Score ── */}
        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={styles.sectionTitle}>{t('score.integratedScore')}</Text>
          <View style={{ alignItems: 'center', padding: 16 }}>
            <Text style={{ fontSize: 48, fontWeight: 'bold', color: compositeColor() }}>
              {compositeScore()}
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 8, gap: 16 }}>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{t('score.reflexPct')}: {reflexScore()}%</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{t('score.visualMotorPct')}: {visualScore()}%</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{t('score.bodyComp')}: {bodyCompScore()}%</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Modal: Reflex Entry ── */}
      <Modal visible={modalReflex} transparent animationType=\"slide\">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: card }]}>
            <Text style={[styles.modalTitle, { color: text }]}>Reflex Status</Text>
            {selectedReflex && (
              <>
                <View style={styles.pickerRow}>
                  {REFLEX_STATUS_OPTIONS.map(opt => (
                    <TouchableOpacity key={opt} style={[styles.pickerBtn, selectedReflex.status === opt && { backgroundColor: COLORS.primary }]} onPress={() => setSelectedReflex({ ...selectedReflex, status: opt })}>
                      <Text style={{ color: selectedReflex.status === opt ? '#fff' : text, fontSize: 13 }}>{t('reflex.' + opt)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={[styles.input, { backgroundColor: bg, color: text }]} placeholder=\"Date (YYYY-MM-DD)\" placeholderTextColor=\"#9CA3AF\" value={selectedReflex.date} onChangeText={v => setSelectedReflex({ ...selectedReflex, date: v })} />
                <TextInput style={[styles.input, { backgroundColor: bg, color: text }]} placeholder=\"Notes\" placeholderTextColor=\"#9CA3AF\" value={selectedReflex.notes} onChangeText={v => setSelectedReflex({ ...selectedReflex, notes: v })} />
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalReflex(false)}><Text style={{ color: text }}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, { backgroundColor: COLORS.primary }]} onPress={saveReflexModal}><Text style={{ color: '#fff' }}>Save</Text></TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Modal: Visual Entry ── */}
      <Modal visible={modalVisual} transparent animationType=\"slide\">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: card }]}>
            <Text style={[styles.modalTitle, { color: text }]}>Visual-Motor Score</Text>
            {selectedVisual && (
              <>
                <Text style={{ color: text, marginBottom: 8 }}>Quality Score (1-5)</Text>
                <View style={styles.pickerRow}>
                  {[1,2,3,4,5].map(s => (
                    <TouchableOpacity key={s} style={[styles.pickerBtn, selectedVisual.score === s && { backgroundColor: COLORS.primary }]} onPress={() => setSelectedVisual({ ...selectedVisual, score: s })}>
                      <Text style={{ color: selectedVisual.score === s ? '#fff' : text }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={[styles.input, { backgroundColor: bg, color: text }]} placeholder=\"Date (YYYY-MM-DD)\" placeholderTextColor=\"#9CA3AF\" value={selectedVisual.date} onChangeText={v => setSelectedVisual({ ...selectedVisual, date: v })} />
                <TextInput style={[styles.input, { backgroundColor: bg, color: text }]} placeholder=\"Notes\" placeholderTextColor=\"#9CA3AF\" value={selectedVisual.notes} onChangeText={v => setSelectedVisual({ ...selectedVisual, notes: v })} />
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisual(false)}><Text style={{ color: text }}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, { backgroundColor: COLORS.primary }]} onPress={saveVisualModal}><Text style={{ color: '#fff' }}>Save</Text></TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Modal: Skinfold Entry ── */}
      <Modal visible={modalSkinfold} transparent animationType=\"slide\">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: card }]}>
            <Text style={[styles.modalTitle, { color: text }]}>Skinfold Measurement</Text>
            {selectedSkinfold && (
              <>
                <View style={styles.pickerRow}>
                  {(['triceps', 'subscapular'] as const).map(site => (
                    <TouchableOpacity key={site} style={[styles.pickerBtn, selectedSkinfold.site === site && { backgroundColor: COLORS.primary }]} onPress={() => setSelectedSkinfold({ ...selectedSkinfold, site })}>
                      <Text style={{ color: selectedSkinfold.site === site ? '#fff' : text, fontSize: 13 }}>{t('skinfold.' + site)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={[styles.input, { backgroundColor: bg, color: text }]} placeholder=\"mm\" placeholderTextColor=\"#9CA3AF\" keyboardType=\"numeric\" value={selectedSkinfold.mm > 0 ? String(selectedSkinfold.mm) : ''} onChangeText={v => setSelectedSkinfold({ ...selectedSkinfold, mm: parseInt(v) || 0 })} />
                <TextInput style={[styles.input, { backgroundColor: bg, color: text }]} placeholder=\"Date (YYYY-MM-DD)\" placeholderTextColor=\"#9CA3AF\" value={selectedSkinfold.date} onChangeText={v => setSelectedSkinfold({ ...selectedSkinfold, date: v })} />
                <TextInput style={[styles.input, { backgroundColor: bg, color: text }]} placeholder=\"Notes\" placeholderTextColor=\"#9CA3AF\" value={selectedSkinfold.notes} onChangeText={v => setSelectedSkinfold({ ...selectedSkinfold, notes: v })} />
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalSkinfold(false)}><Text style={{ color: text }}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, { backgroundColor: COLORS.primary }]} onPress={saveSkinfoldModal}><Text style={{ color: '#fff' }}>Save</Text></TouchableOpacity>
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
\`;

fs.writeFileSync(path, content);
console.log('reflex-visual-motor.tsx written');
"
