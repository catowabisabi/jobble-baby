import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const NIPPLE_KEY     = STORAGE_KEYS.NIPPLE_LEVEL;
const SESSION_KEY   = STORAGE_KEYS.BOTTLE_SESSION;
const PACE_KEY       = STORAGE_KEYS.PACE_PRACTICE;

const NIPPLE_LEVELS = [
  { level: 0, labelKey: 'nippleLevel0', age: 'Preemie' },
  { level: 1, labelKey: 'nippleLevel1', age: 'Newborn' },
  { level: 2, labelKey: 'nippleLevel2', age: '3 months' },
  { level: 3, labelKey: 'nippleLevel3', age: '6 months' },
  { level: 4, labelKey: 'nippleLevel4', age: 'Variable' },
  { level: 5, labelKey: 'nippleLevel5', age: 'Toddler' },
];

const PACE_STEPS = [
  { step: 1, labelKey: 'paceStep1', icon: 'human-handsup' },
  { step: 2, labelKey: 'paceStep2', icon: 'water-outline' },
  { step: 3, labelKey: 'paceStep3', icon: 'pause-circle-outline' },
  { step: 4, labelKey: 'paceStep4', icon: 'eye-outline' },
  { step: 5, labelKey: 'paceStep5', icon: 'emoticon-outline' },
];

const FLOW_SIGNALS = [
  { id: 'coughing',    labelKey: 'signalCoughing',    guidanceKey: 'considerSlowing',   icon: 'emoticon-sad-outline' },
  { id: 'gulping',     labelKey: 'signalGulping',     guidanceKey: 'considerSlowing',   icon: 'water' },
  { id: 'underfeeding',labelKey: 'signalUnderfeeding',guidanceKey: 'considerAdvancing', icon: 'alert-circle-outline' },
  { id: 'gas',         labelKey: 'signalGas',          guidanceKey: 'considerSlowing',   icon: 'weather-windy' },
  { id: 'refusal',     labelKey: 'signalRefusal',      guidanceKey: 'considerAdvancing', icon: 'close-circle-outline' },
  { id: 'choking',     labelKey: 'signalChoking',      guidanceKey: 'considerSlowing',   icon: 'alert-outline' },
];

interface NippleData {
  level: number;
  started_at: string;
  notes: string;
}

interface SessionEntry {
  id: string;
  date: string;
  duration_min: number;
  volume_ml: number;
  nipple_level: number;
  pace_score: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

interface PaceEntry {
  id: string;
  date: string;
  duration_min: number;
  notes: string;
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export default function BottleFeedingScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [activeSection, setActiveSection] = useState<string>('nipple');

  // Nipple state
  const [nippleData, setNippleData] = useState<NippleData | null>(null);
  const [nippleNotes, setNippleNotes] = useState('');
  const [showNippleModal, setShowNippleModal] = useState(false);

  // Session state
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionForm, setSessionForm] = useState({ duration_min: '', volume_ml: '', nipple_level: '1', pace_score: '3', notes: '' });

  // Pace state
  const [paceSessions, setPaceSessions] = useState<PaceEntry[]>([]);
  const [showPaceModal, setShowPaceModal] = useState(false);
  const [paceForm, setPaceForm] = useState({ duration_min: '', notes: '' });

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [nip, sess, pace] = await Promise.all([
        safeGetItem(NIPPLE_KEY),
        safeGetItem(SESSION_KEY),
        safeGetItem(PACE_KEY),
      ]);
      if (nip) { setNippleData(JSON.parse(nip)); setNippleNotes(JSON.parse(nip).notes || ''); }
      if (sess) setSessions(JSON.parse(sess));
      if (pace) setPaceSessions(JSON.parse(pace));
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Nipple Level ─────────────────────────────────────────────────────────────

  const saveNippleLevel = async (level: number) => {
    const data: NippleData = { level, started_at: new Date().toISOString(), notes: nippleNotes };
    setNippleData(data);
    await safeSetItem(NIPPLE_KEY, JSON.stringify(data));
    setShowNippleModal(false);
  };

  const saveNippleNotes = async () => {
    if (!nippleData) return;
    const data: NippleData = { ...nippleData, notes: nippleNotes };
    setNippleData(data);
    await safeSetItem(NIPPLE_KEY, JSON.stringify(data));
  };

  // ── Session Log ─────────────────────────────────────────────────────────────

  const saveSession = async () => {
    const vol = parseInt(sessionForm.volume_ml) || 0;
    const dur = parseInt(sessionForm.duration_min) || 0;
    const entry: SessionEntry = {
      id: uid(),
      date: new Date().toISOString(),
      duration_min: dur,
      volume_ml: vol,
      nipple_level: parseInt(sessionForm.nipple_level) || 1,
      pace_score: (parseInt(sessionForm.pace_score) || 3) as 1|2|3|4|5,
      notes: sessionForm.notes,
    };
    const updated = [entry, ...sessions];
    setSessions(updated);
    await safeSetItem(SESSION_KEY, JSON.stringify(updated));
    setShowSessionModal(false);
    setSessionForm({ duration_min: '', volume_ml: '', nipple_level: '1', pace_score: '3', notes: '' });
  };

  // ── Pace Practice ──────────────────────────────────────────────────────────

  const savePace = async () => {
    const entry: PaceEntry = {
      id: uid(),
      date: new Date().toISOString(),
      duration_min: parseInt(paceForm.duration_min) || 0,
      notes: paceForm.notes,
    };
    const updated = [entry, ...paceSessions];
    setPaceSessions(updated);
    await safeSetItem(PACE_KEY, JSON.stringify(updated));
    setShowPaceModal(false);
    setPaceForm({ duration_min: '', notes: '' });
  };

  // ── Derived Stats ──────────────────────────────────────────────────────────

  const recentSessions = sessions.slice(0, 7);
  const avgIntakeRate = recentSessions.length > 0
    ? (recentSessions.reduce((s, e) => s + (e.volume_ml / Math.max(e.duration_min, 1)), 0) / recentSessions.length).toFixed(1)
    : '—';

  const paceStreak = (() => {
    const dates = paceSessions.map(p => p.date.split('T')[0]);
    const unique = [...new Set(dates)].sort().reverse();
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < unique.length; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      if (unique.includes(ds)) streak++;
      else break;
    }
    return streak;
  })();

  const currentNipple = NIPPLE_LEVELS[nippleData?.level ?? 1];

  // ── Render ────────────────────────────────────────────────────────────────

  const SectionTab = ({ id, label, icon }: { id: string; label: string; icon: string }) => (
    <TouchableOpacity
      style={[styles.tab, activeSection === id && { backgroundColor: C.accent + '22', borderColor: C.accent }]}
      onPress={() => setActiveSection(id)}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name={icon as any} size={18} color={activeSection === id ? C.accent : C.muted} />
      <Text style={[styles.tabLabel, { color: activeSection === id ? C.accent : C.muted }]}>{label}</Text>
    </TouchableOpacity>
  );

  const Card = ({ children, style }: { children: React.ReactNode; style?: any }) => (
    <View style={[styles.card, { backgroundColor: C.card }, style]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: C.text }]}>{t('bottleFeeding.title')}</Text>
      </View>

      <View style={styles.tabBar}>
        <SectionTab id="nipple"   label={t('bottleFeeding.nippleLevel')}  icon="water-outline" />
        <SectionTab id="session"  label={t('bottleFeeding.feedingLog')}  icon="clipboard-list-outline" />
        <SectionTab id="paced"    label={t('bottleFeeding.pacedFeeding')} icon="walk" />
        <SectionTab id="signals"  label={t('bottleFeeding.flowMismatch')} icon="alert-circle-outline" />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        {/* ── Summary Dashboard ── */}
        <Card style={{ marginBottom: 16 }}>
          <View style={styles.dashboardRow}>
            <View style={styles.dashItem}>
              <MaterialCommunityIcons name="water" size={24} color={C.accent} />
              <Text style={[styles.dashValue, { color: C.text }]}>{currentNipple ? t(`bottleFeeding.${currentNipple.labelKey}`) : '—'}</Text>
              <Text style={[styles.dashLabel, { color: C.muted }]}>{t('bottleFeeding.nippleLevel')}</Text>
            </View>
            <View style={[styles.dashDivider, { backgroundColor: C.border }]} />
            <View style={styles.dashItem}>
              <MaterialCommunityIcons name="speedometer" size={24} color="#10B981" />
              <Text style={[styles.dashValue, { color: C.text }]}>{avgIntakeRate} ml/min</Text>
              <Text style={[styles.dashLabel, { color: C.muted }]}>{t('bottleFeeding.intakeRate')}</Text>
            </View>
            <View style={[styles.dashDivider, { backgroundColor: C.border }]} />
            <View style={styles.dashItem}>
              <MaterialCommunityIcons name="fire" size={24} color="#F59E0B" />
              <Text style={[styles.dashValue, { color: C.text }]}>{paceStreak}d</Text>
              <Text style={[styles.dashLabel, { color: C.muted }]}>{t('bottleFeeding.pacedFeeding')}</Text>
            </View>
          </View>
        </Card>

        {/* ── Nipple Level Tracker ── */}
        {activeSection === 'nipple' && (
          <Card>
            <Text style={[styles.sectionTitle, { color: C.text }]}>{t('bottleFeeding.nippleLevel')}</Text>
            <View style={styles.nippleGrid}>
              {NIPPLE_LEVELS.map(n => (
                <TouchableOpacity
                  key={n.level}
                  style={[
                    styles.nippleChip,
                    { backgroundColor: C.card, borderColor: C.border },
                    nippleData?.level === n.level && { backgroundColor: C.accent + '22', borderColor: C.accent },
                  ]}
                  onPress={() => { setNippleNotes(nippleData?.notes || ''); setShowNippleModal(true); saveNippleLevel(n.level); }}
                  accessibilityLabel={`${t(`bottleFeeding.${n.labelKey}`)} nipple level`}
                  accessibilityRole="button"
                >
                  <Text style={[styles.nippleChipText, { color: C.text }]}>{t(`bottleFeeding.${n.labelKey}`)}</Text>
                  <Text style={[styles.nippleChipAge, { color: C.muted }]}>{n.age}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {nippleData && (
              <View style={[styles.nippleInfo, { borderTopColor: C.border }]}>
                <Text style={[styles.nippleInfoText, { color: C.muted }]}>
                  {t('bottleFeeding.nippleLevel')} {nippleData.level} since {new Date(nippleData.started_at).toLocaleDateString()}
                </Text>
                {nippleData.notes ? (
                  <Text style={[styles.nippleInfoText, { color: C.muted }]}>📝 {nippleData.notes}</Text>
                ) : null}
              </View>
            )}
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: C.accent }]}
              onPress={() => { setNippleNotes(nippleData?.notes || ''); setShowNippleModal(true); }}
              accessibilityLabel={t('bottleFeeding.addSession')}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
              <Text style={styles.addBtnText}>{t('bottleFeeding.addSession')}</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* ── Feeding Efficiency Log ── */}
        {activeSection === 'session' && (
          <>
            <Card>
              <View style={styles.cardHeader}>
                <Text style={[styles.sectionTitle, { color: C.text }]}>{t('bottleFeeding.feedingLog')}</Text>
                <TouchableOpacity style={[styles.addBtnSmall, { backgroundColor: C.accent }]} onPress={() => setShowSessionModal(true)} accessibilityLabel={t('bottleFeeding.addSession')} accessibilityRole="button">
                  <MaterialCommunityIcons name="plus" size={14} color="#fff" />
                  <Text style={styles.addBtnSmallText}>{t('bottleFeeding.addSession')}</Text>
                </TouchableOpacity>
              </View>
              {sessions.length === 0 ? (
                <Text style={[styles.emptyText, { color: C.muted }]}>No sessions logged yet.</Text>
              ) : (
                <FlatList
                  data={sessions.slice(0, 20)}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => {
                    const rate = (item.volume_ml / Math.max(item.duration_min, 1)).toFixed(1);
                    return (
                      <View style={[styles.sessionRow, { borderBottomColor: C.border }]}>
                        <View style={styles.sessionLeft}>
                          <Text style={[styles.sessionDate, { color: C.text }]}>{new Date(item.date).toLocaleDateString()}</Text>
                          <Text style={[styles.sessionMeta, { color: C.muted }]}>
                            {item.duration_min}min · {item.volume_ml}ml · L{item.nipple_level}
                          </Text>
                        </View>
                        <View style={styles.sessionRight}>
                          <Text style={[styles.sessionRate, { color: C.accent }]}>{rate} ml/min</Text>
                          <View style={styles.paceDots}>
                            {[1,2,3,4,5].map(d => (
                              <View key={d} style={[styles.paceDot, { backgroundColor: d <= item.pace_score ? C.accent : C.border }]} />
                            ))}
                          </View>
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </Card>
          </>
        )}

        {/* ── Paced Bottle Feeding Guide ── */}
        {activeSection === 'paced' && (
          <Card>
            <Text style={[styles.sectionTitle, { color: C.text }]}>{t('bottleFeeding.pacedFeeding')}</Text>
            {PACE_STEPS.map((step, idx) => (
              <View key={step.step} style={styles.paceStep}>
                <View style={[styles.paceStepNum, { backgroundColor: C.accent + '22' }]}>
                  <Text style={[styles.paceStepNumText, { color: C.accent }]}>{step.step}</Text>
                </View>
                <MaterialCommunityIcons name={step.icon as any} size={20} color={C.muted} style={{ marginHorizontal: 8 }} />
                <Text style={[styles.paceStepText, { color: C.text }]}>{t(`bottleFeeding.${step.labelKey}`)}</Text>
              </View>
            ))}
            <View style={[styles.paceDivider, { backgroundColor: C.border }]} />
            <Text style={[styles.paceSubtitle, { color: C.muted }]}>{t('bottleFeeding.practiceSessions')} ({paceSessions.length})</Text>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#10B981' }]} onPress={() => setShowPaceModal(true)} accessibilityLabel="Log practice session" accessibilityRole="button">
              <MaterialCommunityIcons name="plus" size={16} color="#fff" />
              <Text style={styles.addBtnText}>{t('bottleFeeding.logPracticeSession')}</Text>
            </TouchableOpacity>
            {paceSessions.slice(0, 5).map(p => (
              <View key={p.id} style={[styles.paceSessionRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.paceSessionDate, { color: C.text }]}>{new Date(p.date).toLocaleDateString()}</Text>
                <Text style={[styles.paceSessionDur, { color: C.muted }]}>{p.duration_min} {t('bottleFeeding.minPractice')}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* ── Flow Mismatch Signals ── */}
        {activeSection === 'signals' && (
          <Card>
            <Text style={[styles.sectionTitle, { color: C.text }]}>{t('bottleFeeding.flowMismatch')}</Text>
            {FLOW_SIGNALS.map(sig => (
              <View key={sig.id} style={styles.signalRow}>
                <MaterialCommunityIcons name={sig.icon as any} size={22} color={C.muted} />
                <View style={styles.signalText}>
                  <Text style={[styles.signalLabel, { color: C.text }]}>{t(`bottleFeeding.${sig.labelKey}`)}</Text>
                  <Text style={[styles.signalGuidance, { color: C.accent }]}>
                    → {t(`bottleFeeding.${sig.guidanceKey}`)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      {/* ── Nipple Edit Modal ── */}
      <Modal visible={showNippleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: C.card }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>{t('bottleFeeding.nippleLevel')}</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: C.card, color: C.text, borderColor: C.border }]}
              placeholder="Notes (optional)"
              placeholderTextColor={C.muted}
              value={nippleNotes}
              onChangeText={setNippleNotes}
              onBlur={saveNippleNotes}
              multiline
            />
            <View style={styles.nippleGrid}>
              {NIPPLE_LEVELS.map(n => (
                <TouchableOpacity
                  key={n.level}
                  style={[styles.nippleChip, { backgroundColor: C.card, borderColor: C.border },
                    nippleData?.level === n.level && { backgroundColor: C.accent + '22', borderColor: C.accent }]}
                  onPress={() => saveNippleLevel(n.level)}
                  accessibilityLabel={`${t(`bottleFeeding.${n.labelKey}`)} nipple level`}
                  accessibilityRole="button"
                >
                  <Text style={[styles.nippleChipText, { color: C.text }]}>{t(`bottleFeeding.${n.labelKey}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.modalClose, { backgroundColor: C.accent }]} onPress={() => setShowNippleModal(false)} accessibilityLabel="Close nipple level editor" accessibilityRole="button">
              <Text style={styles.modalCloseText}>{t('bottleFeeding.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Session Log Modal ── */}
      <Modal visible={showSessionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: C.card }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>{t('bottleFeeding.addSession')}</Text>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: C.muted }]}>{t('bottleFeeding.durationMin')}</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: C.card, color: C.text, borderColor: C.border }]}
                  placeholder="15"
                  placeholderTextColor={C.muted}
                  keyboardType="numeric"
                  value={sessionForm.duration_min}
                  onChangeText={v => setSessionForm(f => ({ ...f, duration_min: v }))}
                />
              </View>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: C.muted }]}>{t('bottleFeeding.volumeMl')}</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: C.card, color: C.text, borderColor: C.border }]}
                  placeholder="120"
                  placeholderTextColor={C.muted}
                  keyboardType="numeric"
                  value={sessionForm.volume_ml}
                  onChangeText={v => setSessionForm(f => ({ ...f, volume_ml: v }))}
                />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: C.muted }]}>{t('bottleFeeding.nippleLevelLabel')}</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: C.card, color: C.text, borderColor: C.border }]}
                  placeholder="1"
                  placeholderTextColor={C.muted}
                  keyboardType="numeric"
                  value={sessionForm.nipple_level}
                  onChangeText={v => setSessionForm(f => ({ ...f, nipple_level: v }))}
                />
              </View>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: C.muted }]}>{t('bottleFeeding.paceScore')}</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: C.card, color: C.text, borderColor: C.border }]}
                  placeholder="3"
                  placeholderTextColor={C.muted}
                  keyboardType="numeric"
                  value={sessionForm.pace_score}
                  onChangeText={v => setSessionForm(f => ({ ...f, pace_score: v }))}
                />
              </View>
            </View>
            <TextInput
              style={[styles.textInput, { backgroundColor: C.card, color: C.text, borderColor: C.border }]}
              placeholder="Notes (optional)"
              placeholderTextColor={C.muted}
              value={sessionForm.notes}
              onChangeText={v => setSessionForm(f => ({ ...f, notes: v }))}
              multiline
            />
            <TouchableOpacity style={[styles.modalClose, { backgroundColor: C.accent }]} onPress={saveSession} accessibilityLabel={t('bottleFeeding.addSession')} accessibilityRole="button">
              <Text style={styles.modalCloseText}>{t('bottleFeeding.addSession')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Pace Practice Modal ── */}
      <Modal visible={showPaceModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: C.card }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>{t('bottleFeeding.logPacedFeedingPractice')}</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: C.card, color: C.text, borderColor: C.border }]}
              placeholder="Duration (minutes)"
              placeholderTextColor={C.muted}
              keyboardType="numeric"
              value={paceForm.duration_min}
              onChangeText={v => setPaceForm(f => ({ ...f, duration_min: v }))}
            />
            <TextInput
              style={[styles.textInput, { backgroundColor: C.card, color: C.text, borderColor: C.border }]}
              placeholder="Notes (optional)"
              placeholderTextColor={C.muted}
              value={paceForm.notes}
              onChangeText={v => setPaceForm(f => ({ ...f, notes: v }))}
              multiline
            />
            <TouchableOpacity style={[styles.modalClose, { backgroundColor: '#10B981' }]} onPress={savePace} accessibilityLabel="Save practice session" accessibilityRole="button">
              <Text style={styles.modalCloseText}>{t('bottleFeeding.savePractice')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8, gap: 6 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  tabLabel: { fontSize: 11, fontWeight: '600', marginLeft: 4 },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 16, paddingBottom: 32 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  dashboardRow: { flexDirection: 'row', alignItems: 'center' },
  dashItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  dashDivider: { width: 1, height: 40 },
  dashValue: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  dashLabel: { fontSize: 11, marginTop: 2 },
  nippleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nippleChip: { width: '30%', alignItems: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  nippleChipText: { fontSize: 12, fontWeight: '600' },
  nippleChipAge: { fontSize: 10, marginTop: 2 },
  nippleInfo: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  nippleInfoText: { fontSize: 12, marginBottom: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, marginTop: 12, gap: 6 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  addBtnSmall: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, gap: 4 },
  addBtnSmallText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  sessionLeft: { flex: 1 },
  sessionDate: { fontSize: 14, fontWeight: '600' },
  sessionMeta: { fontSize: 12, marginTop: 2 },
  sessionRight: { alignItems: 'flex-end' },
  sessionRate: { fontSize: 14, fontWeight: '700' },
  paceDots: { flexDirection: 'row', gap: 3, marginTop: 4 },
  paceDot: { width: 6, height: 6, borderRadius: 3 },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  paceStep: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  paceStepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  paceStepNumText: { fontSize: 12, fontWeight: '700' },
  paceStepText: { flex: 1, fontSize: 14 },
  paceDivider: { height: 1, marginVertical: 12 },
  paceSubtitle: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  paceSessionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  paceSessionDate: { fontSize: 13 },
  paceSessionDur: { fontSize: 13 },
  signalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  signalText: { flex: 1 },
  signalLabel: { fontSize: 14, fontWeight: '600' },
  signalGuidance: { fontSize: 12, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  textInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  formRow: { flexDirection: 'row', gap: 10 },
  formField: { flex: 1 },
  formLabel: { fontSize: 12, marginBottom: 4 },
  modalClose: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  modalCloseText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
