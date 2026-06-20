import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { COLORS } from '../theme';

// ─── Storage Keys ────────────────────────────────────────────────────────────
const BR_SESSIONS_KEY = '@jobble/rehearsal_sessions';
const BR_LADDERS_KEY  = '@jobble/exposure_ladders';
const BR_OUTCOMES_KEY = '@jobble/real_outcomes';

// ─── Types ────────────────────────────────────────────────────────────────────
type RehearsalType = 'visualization' | 'verbal_run-through' | 'role_play' | 'physical_practice';
type Outcome = 'success' | 'partial' | 'backed_out';
type ChildResponse = 'calm' | 'fussy' | 'meltdown' | 'na';

interface RehearsalSession {
  id: string;
  scenarioId: string;
  rehearsalType: RehearsalType;
  durationMin: number;
  anxietyBefore: number;
  anxietyAfter: number;
  notes: string;
  timestamp: string;
}

interface ExposureStep {
  description: string;
  targetDate: string;
  completed: boolean;
  anxietyRating?: number;
}

interface ExposureLadder {
  scenarioId: string;
  steps: ExposureStep[];
}

interface RealOutcome {
  id: string;
  scenarioId: string;
  stepIndex: number;
  outcome: Outcome;
  childResponse: ChildResponse;
  parentFeelingPost: number;
  notes: string;
  timestamp: string;
}

interface Scenario {
  id: string;
  titleKey: string;
  descriptionKey: string;
  anxietyElements: string[];
  prepSteps: string[];
}

// ─── Scenario Library ─────────────────────────────────────────────────────────
const SCENARIOS: Scenario[] = [
  {
    id: 'pediatrician_visit',
    titleKey: 'behavioralRehearsal.scenario.pediatrician.title',
    descriptionKey: 'behavioralRehearsal.scenario.pediatrician.desc',
    anxietyElements: ['陌生環境', '陌生人觸摸', '檢查疼痛', '疫苗注射'],
    prepSteps: ['預先參觀診所', '準備安撫物品', '角色扮演就診', '解釋流程給寶寶'],
  },
  {
    id: 'first_group_outing',
    titleKey: 'behavioralRehearsal.scenario.groupOuting.title',
    descriptionKey: 'behavioralRehearsal.scenario.groupOuting.desc',
    anxietyElements: ['人多嘈雜', '寶寶哭鬧', '餵奶不便', '意外情況'],
    prepSteps: ['選擇小型聚會', '帶齊必需品', '提前離場預案', '預先通知主辦'],
  },
  {
    id: 'vaccination',
    titleKey: 'behavioralRehearsal.scenario.vaccination.title',
    descriptionKey: 'behavioralRehearsal.scenario.vaccination.desc',
    anxietyElements: ['針頭恐懼', '注射疼痛', '發燒反應', '多次就診'],
    prepSteps: ['使用疼痛舒緩技巧', '提前服用退燒藥', '準備最愛玩具', '事後觀察記錄'],
  },
  {
    id: 'return_to_work',
    titleKey: 'behavioralRehearsal.scenario.returnToWork.title',
    descriptionKey: 'behavioralRehearsal.scenario.returnToWork.desc',
    anxietyElements: ['分離焦慮', '照顧者銜接', '泵奶時間', '寶寶健康'],
    prepSteps: ['逐步延長分離', '建立照顧者關係', '演練泵奶流程', '制定緊急聯繫方案'],
  },
  {
    id: 'first_airplane',
    titleKey: 'behavioralRehearsal.scenario.airplane.title',
    descriptionKey: 'behavioralRehearsal.scenario.airplane.desc',
    anxietyElements: ['耳壓不適', '密閉空間', '起飛降落', '時差適應'],
    prepSteps: ['起飛時餵奶/喝水', '攜帶安撫物品', '預訂適合航班', '準備應急包'],
  },
  {
    id: 'stranger_care',
    titleKey: 'behavioralRehearsal.scenario.strangerCare.title',
    descriptionKey: 'behavioralRehearsal.scenario.strangerCare.desc',
    anxietyElements: ['信任問題', '照顧質量', '緊急聯繫', '寶寶適應'],
    prepSteps: ['預先見面互動', '制定清晰指示', '建立緊急預案', '逐步增加時長'],
  },
  {
    id: 'sleep_training_night1',
    titleKey: 'behavioralRehearsal.scenario.sleepTraining.title',
    descriptionKey: 'behavioralRehearsal.scenario.sleepTraining.desc',
    anxietyElements: ['哭聲考驗', '堅持困難', '睡眠債', '伴侶分歧'],
    prepSteps: ['父母心理準備', '制定退出策略', '準備監控設備', '事後自我安撫'],
  },
  {
    id: 'solid_foods_intro',
    titleKey: 'behavioralRehearsal.scenario.solidFoods.title',
    descriptionKey: 'behavioralRehearsal.scenario.solidFoods.desc',
    anxietyElements: ['過敏反應', '嘔吐嗆咳', '抗拒食物', '營養不足'],
    prepSteps: ['一次只試一種', '觀察過敏跡象', '選擇安全時間', '備好急救資訊'],
  },
];

const REHEARSAL_TYPE_KEYS: Record<RehearsalType, string> = {
  visualization: 'behavioralRehearsal.rehearsalType.visualization',
  'verbal_run-through': 'behavioralRehearsal.rehearsalType.verbal',
  role_play: 'behavioralRehearsal.rehearsalType.rolePlay',
  physical_practice: 'behavioralRehearsal.rehearsalType.physical',
};

const OUTCOME_KEYS: Record<Outcome, string> = {
  success: 'behavioralRehearsal.outcome.success',
  partial: 'behavioralRehearsal.outcome.partial',
  backed_out: 'behavioralRehearsal.outcome.backedOut',
};

const CHILD_RESPONSE_KEYS: Record<ChildResponse, string> = {
  calm: 'behavioralRehearsal.childResponse.calm',
  fussy: 'behavioralRehearsal.childResponse.fussy',
  meltdown: 'behavioralRehearsal.childResponse.meltdown',
  na: 'behavioralRehearsal.childResponse.na',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function emotionFor(n: number): [string, string] {
  if (n <= 1) return ['emoticon-excited', '#4CAF50'];
  if (n <= 2) return ['emoticon-happy', '#4CAF50'];
  if (n <= 3) return ['emoticon-neutral', '#FF9800'];
  if (n <= 4) return ['emoticon-sad', '#FF9800'];
  return ['emoticon-cry', '#F44336'];
}

function emotionColor(n: number): string {
  if (n <= 2) return '#4CAF50';
  if (n <= 3) return '#FF9800';
  return '#F44336';
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10, marginTop: 16 },
  scenarioCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  scenarioIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  scenarioInfo: { flex: 1 },
  scenarioTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  scenarioDesc: { fontSize: 13, color: '#888' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  backBtnText: { fontSize: 14, fontWeight: '600' },
  scenarioDetail: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  scenarioDetailTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  scenarioDetailDesc: { fontSize: 14, color: '#666', lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statNumber: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, padding: 14 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1.5 },
  secondaryBtnText: { fontSize: 15, fontWeight: '600' },
  section: { marginBottom: 16 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFEBEE', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, marginBottom: 6 },
  tagText: { fontSize: 12, color: '#C62828' },
  prepStepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  prepStepText: { fontSize: 14 },
  subTabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  subTab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#f0f0f0' },
  subTabActive: { backgroundColor: '#3B82F6' },
  subTabText: { fontSize: 14, color: '#666', fontWeight: '600' },
  subTabTextActive: { color: '#fff' },
  emptyText: { textAlign: 'center', color: '#aaa', fontSize: 14, marginVertical: 24 },
  entryCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  entryType: { fontSize: 14, fontWeight: '600' },
  entryDate: { fontSize: 12, color: '#aaa' },
  entryStats: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  entryStatLabel: { fontSize: 12, color: '#888' },
  entryDuration: { fontSize: 12, fontWeight: '600', marginLeft: 'auto' },
  entryNotes: { fontSize: 13, color: '#666', marginTop: 6 },
  outcomeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  outcomeBadgeText: { fontSize: 12, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#FAFAFA' },
  anxietyRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f0f0f0', marginBottom: 4 },
  chipActive: { backgroundColor: '#3B82F6' },
  chipText: { fontSize: 13, color: '#666' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  stepText: { fontSize: 14, flex: 1 },
  stepTextDone: { textDecorationLine: 'line-through', color: '#aaa' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#f0f0f0' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#666' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});

// ─── Rehearsal Form Modal ────────────────────────────────────────────────────
function RehearsalFormModal({ scenarioId, visible, onClose, onSave, accent }: {
  scenarioId: string; visible: boolean; onClose: () => void; onSave: () => void; accent: string;
}) {
  const { t } = useLanguage();
  const [rehearsalType, setRehearsalType] = useState<RehearsalType>('visualization');
  const [duration, setDuration] = useState('10');
  const [anxietyBefore, setAnxietyBefore] = useState(3);
  const [anxietyAfter, setAnxietyAfter] = useState(3);
  const [notes, setNotes] = useState('');

  const types: RehearsalType[] = ['visualization', 'verbal_run-through', 'role_play', 'physical_practice'];

  const handleSave = async () => {
    const raw = await safeGetItem(BR_SESSIONS_KEY);
    const sessions: RehearsalSession[] = raw ? JSON.parse(raw) : [];
    sessions.push({
      id: genId(), scenarioId, rehearsalType,
      durationMin: parseInt(duration) || 10,
      anxietyBefore, anxietyAfter, notes,
      timestamp: new Date().toISOString(),
    });
    await safeSetItem(BR_SESSIONS_KEY, JSON.stringify(sessions));
    onSave();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('behavioralRehearsal.rehearsalLog.title')}</Text>
          <ScrollView style={{ maxHeight: '80%' }}>
            <Text style={styles.fieldLabel}>{t('behavioralRehearsal.rehearsalLog.type')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {types.map(rt => (
                <TouchableOpacity key={rt}
                  style={[styles.chip, rehearsalType === rt && { backgroundColor: accent }]}
                  onPress={() => setRehearsalType(rt)}>
                  <Text style={[styles.chipText, rehearsalType === rt && styles.chipTextActive]}>
                    {t(REHEARSAL_TYPE_KEYS[rt])}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>{t('behavioralRehearsal.rehearsalLog.duration')}</Text>
            <TextInput style={styles.input} value={duration} onChangeText={setDuration}
              keyboardType="numeric" placeholder="10" placeholderTextColor="#999" />
            <Text style={styles.fieldLabel}>{t('behavioralRehearsal.rehearsalLog.anxietyBefore')}</Text>
            <View style={styles.anxietyRow}>
              {[1,2,3,4,5].map(v => (
                <TouchableOpacity key={v} onPress={() => setAnxietyBefore(v)}>
                  <MaterialCommunityIcons name={anxietyBefore >= v ? 'circle' : 'circle-outline'}
                    size={28} color={emotionColor(anxietyBefore)} />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>{t('behavioralRehearsal.rehearsalLog.anxietyAfter')}</Text>
            <View style={styles.anxietyRow}>
              {[1,2,3,4,5].map(v => (
                <TouchableOpacity key={v} onPress={() => setAnxietyAfter(v)}>
                  <MaterialCommunityIcons name={anxietyAfter >= v ? 'circle' : 'circle-outline'}
                    size={28} color={emotionColor(anxietyAfter)} />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>{t('behavioralRehearsal.rehearsalLog.notes')}</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={notes} onChangeText={setNotes} multiline placeholder="..." placeholderTextColor="#999" />
          </ScrollView>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent }]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Outcome Form Modal ───────────────────────────────────────────────────────
function OutcomeFormModal({ scenarioId, visible, onClose, onSave, accent }: {
  scenarioId: string; visible: boolean; onClose: () => void; onSave: () => void; accent: string;
}) {
  const { t } = useLanguage();
  const [outcome, setOutcome] = useState<Outcome>('success');
  const [childResponse, setChildResponse] = useState<ChildResponse>('calm');
  const [parentFeeling, setParentFeeling] = useState(3);
  const [notes, setNotes] = useState('');

  const outcomes: Outcome[] = ['success', 'partial', 'backed_out'];
  const childResponses: ChildResponse[] = ['calm', 'fussy', 'meltdown', 'na'];

  const handleSave = async () => {
    const raw = await safeGetItem(BR_OUTCOMES_KEY);
    const data: RealOutcome[] = raw ? JSON.parse(raw) : [];
    data.push({
      id: genId(), scenarioId, stepIndex: 0,
      outcome, childResponse, parentFeelingPost: parentFeeling, notes,
      timestamp: new Date().toISOString(),
    });
    await safeSetItem(BR_OUTCOMES_KEY, JSON.stringify(data));
    onSave();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('behavioralRehearsal.outcomeLog.title')}</Text>
          <ScrollView style={{ maxHeight: '80%' }}>
            <Text style={styles.fieldLabel}>{t('behavioralRehearsal.outcomeLog.result')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {outcomes.map(o => (
                <TouchableOpacity key={o}
                  style={[styles.chip, outcome === o && { backgroundColor: accent }]}
                  onPress={() => setOutcome(o)}>
                  <Text style={[styles.chipText, outcome === o && styles.chipTextActive]}>
                    {t(OUTCOME_KEYS[o])}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>{t('behavioralRehearsal.outcomeLog.childResponse')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {childResponses.map(cr => (
                <TouchableOpacity key={cr}
                  style={[styles.chip, childResponse === cr && { backgroundColor: accent }]}
                  onPress={() => setChildResponse(cr)}>
                  <Text style={[styles.chipText, childResponse === cr && styles.chipTextActive]}>
                    {t(CHILD_RESPONSE_KEYS[cr])}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>{t('behavioralRehearsal.outcomeLog.parentFeeling')}</Text>
            <View style={styles.anxietyRow}>
              {[1,2,3,4,5].map(v => (
                <TouchableOpacity key={v} onPress={() => setParentFeeling(v)}>
                  <MaterialCommunityIcons name={parentFeeling >= v ? 'circle' : 'circle-outline'}
                    size={28} color={emotionColor(parentFeeling)} />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>{t('behavioralRehearsal.outcomeLog.notes')}</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={notes} onChangeText={setNotes} multiline placeholder="..." placeholderTextColor="#999" />
          </ScrollView>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent }]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Exposure Builder Modal ───────────────────────────────────────────────────
function ExposureBuilderModal({ scenarioId, visible, onClose, onSave, accent }: {
  scenarioId: string; visible: boolean; onClose: () => void; onSave: () => void; accent: string;
}) {
  const { t } = useLanguage();
  const [steps, setSteps] = useState<ExposureStep[]>([]);
  const [newStep, setNewStep] = useState('');
  const [targetDate, setTargetDate] = useState('');

  useEffect(() => {
    if (visible) loadLadder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, scenarioId]);

  const loadLadder = async () => {
    const raw = await safeGetItem(BR_LADDERS_KEY);
    const data: ExposureLadder[] = raw ? JSON.parse(raw) : [];
    const existing = data.find(l => l.scenarioId === scenarioId);
    setSteps(existing?.steps || []);
  };

  const addStep = () => {
    if (!newStep.trim()) return;
    setSteps(prev => [...prev, { description: newStep, targetDate, completed: false }]);
    setNewStep('');
    setTargetDate('');
  };

  const toggleStep = async (i: number) => {
    const updated = steps.map((s, idx) => idx === i ? { ...s, completed: !s.completed } : s);
    setSteps(updated);
    const raw = await safeGetItem(BR_LADDERS_KEY);
    const all: ExposureLadder[] = raw ? JSON.parse(raw) : [];
    const filtered = all.filter(l => l.scenarioId !== scenarioId);
    await safeSetItem(BR_LADDERS_KEY, JSON.stringify([...filtered, { scenarioId, steps: updated }]));
  };

  const saveLadder = async () => {
    const raw = await safeGetItem(BR_LADDERS_KEY);
    const all: ExposureLadder[] = raw ? JSON.parse(raw) : [];
    const filtered = all.filter(l => l.scenarioId !== scenarioId);
    await safeSetItem(BR_LADDERS_KEY, JSON.stringify([...filtered, { scenarioId, steps }]));
    onSave();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('behavioralRehearsal.exposureBuilder.title')}</Text>
          <Text style={styles.fieldLabel}>{t('behavioralRehearsal.exposureBuilder.progress')} {steps.filter(s => s.completed).length}/{steps.length}</Text>
          <ScrollView style={{ maxHeight: '50%', marginBottom: 12 }}>
            {steps.map((step, i) => (
              <TouchableOpacity key={i} style={styles.stepRow} onPress={() => toggleStep(i)}>
                <MaterialCommunityIcons
                  name={step.completed ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                  size={22} color={step.completed ? '#4CAF50' : '#999'} />
                <Text style={[styles.stepText, step.completed && styles.stepTextDone]}>{step.description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput style={styles.input} value={newStep} onChangeText={setNewStep}
            placeholder={t('behavioralRehearsal.exposureBuilder.newStepPlaceholder')} placeholderTextColor="#999" />
          <TextInput style={styles.input} value={targetDate} onChangeText={setTargetDate}
            placeholder="YYYY-MM-DD" placeholderTextColor="#999" />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent }]} onPress={addStep}>
              <Text style={styles.saveBtnText}>+ {t('behavioralRehearsal.exposureBuilder.addStep')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent }]} onPress={saveLadder}>
              <Text style={styles.saveBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function BehavioralRehearsalScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];

  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [sessions, setSessions] = useState<RehearsalSession[]>([]);
  const [outcomes, setOutcomes] = useState<RealOutcome[]>([]);
  const [ladders, setLadders] = useState<ExposureLadder[]>([]);
  const [showRehearsalForm, setShowRehearsalForm] = useState(false);
  const [showOutcomeForm, setShowOutcomeForm] = useState(false);
  const [showExposureBuilder, setShowExposureBuilder] = useState(false);
  const [activeTab, setActiveTab] = useState<'sessions' | 'outcomes'>('sessions');

  const loadData = async () => {
    const [sRaw, oRaw, lRaw] = await Promise.all([
      safeGetItem(BR_SESSIONS_KEY),
      safeGetItem(BR_OUTCOMES_KEY),
      safeGetItem(BR_LADDERS_KEY),
    ]);
    setSessions(sRaw ? JSON.parse(sRaw) : []);
    setOutcomes(oRaw ? JSON.parse(oRaw) : []);
    setLadders(lRaw ? JSON.parse(lRaw) : []);
  };

  useEffect(() => { loadData(); }, []);

  const scenario = SCENARIOS.find(s => s.id === selectedScenario);
  const mySessions = sessions.filter(s => s.scenarioId === selectedScenario);
  const myOutcomes = outcomes.filter(o => o.scenarioId === selectedScenario);
  const myLadder = ladders.find(l => l.scenarioId === selectedScenario);

  const avgAnxietyReduction = mySessions.length
    ? (mySessions.reduce((sum, s) => sum + (s.anxietyBefore - s.anxietyAfter), 0) / mySessions.length).toFixed(1)
    : null;

  const completedSteps = myLadder?.steps.filter(s => s.completed).length ?? 0;
  const totalSteps = myLadder?.steps.length ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="head-lightbulb" size={28} color={C.accent} />
          <Text style={[styles.headerTitle, { color: C.text }]}>{t('behavioralRehearsal.title')}</Text>
        </View>

        {!selectedScenario ? (
          <>
            <Text style={[styles.sectionTitle, { color: C.text }]}>{t('behavioralRehearsal.scenarioLibrary')}</Text>
            {SCENARIOS.map(s => (
              <TouchableOpacity key={s.id} style={styles.scenarioCard} onPress={() => setSelectedScenario(s.id)} activeOpacity={0.7}>
                <View style={[styles.scenarioIcon, { backgroundColor: C.accent + '20' }]}>
                  <MaterialCommunityIcons name="head-lightbulb" size={28} color={C.accent} />
                </View>
                <View style={styles.scenarioInfo}>
                  <Text style={[styles.scenarioTitle, { color: C.text }]}>{t(s.titleKey)}</Text>
                  <Text style={styles.scenarioDesc} numberOfLines={2}>{t(s.descriptionKey)}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            {/* Back */}
            <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedScenario(null)}>
              <MaterialCommunityIcons name="arrow-left" size={20} color={C.accent} />
              <Text style={[styles.backBtnText, { color: C.accent }]}>{t('behavioralRehearsal.backToLibrary')}</Text>
            </TouchableOpacity>

            {/* Scenario Info */}
            <View style={styles.scenarioDetail}>
              <Text style={[styles.scenarioDetailTitle, { color: C.text }]}>{scenario ? t(scenario.titleKey) : selectedScenario}</Text>
              <Text style={styles.scenarioDetailDesc}>{scenario ? t(scenario.descriptionKey) : ''}</Text>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: C.text }]}>{mySessions.length}</Text>
                <Text style={styles.statLabel}>{t('behavioralRehearsal.stats.rehearsals')}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: avgAnxietyReduction && parseFloat(avgAnxietyReduction) > 0 ? '#4CAF50' : C.text }]}>
                  {avgAnxietyReduction ?? '—'}
                </Text>
                <Text style={styles.statLabel}>{t('behavioralRehearsal.stats.anxietyReduction')}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: C.text }]}>{completedSteps}/{totalSteps}</Text>
                <Text style={styles.statLabel}>{t('behavioralRehearsal.stats.exposureProgress')}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={{ gap: 10, marginBottom: 16 }}>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: C.accent }]}
                onPress={() => setShowRehearsalForm(true)}>
                <MaterialCommunityIcons name="play-circle" size={22} color="#fff" />
                <Text style={styles.primaryBtnText}>{t('behavioralRehearsal.logRehearsal')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: C.accent }]}
                onPress={() => setShowExposureBuilder(true)}>
                <MaterialCommunityIcons name="ladder" size={22} color={C.accent} />
                <Text style={[styles.secondaryBtnText, { color: C.accent }]}>{t('behavioralRehearsal.buildExposure')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: C.accent }]}
                onPress={() => setShowOutcomeForm(true)}>
                <MaterialCommunityIcons name="clipboard-check" size={22} color={C.accent} />
                <Text style={[styles.secondaryBtnText, { color: C.accent }]}>{t('behavioralRehearsal.logOutcome')}</Text>
              </TouchableOpacity>
            </View>

            {/* Anxiety Elements */}
            {scenario && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: C.text }]}>{t('behavioralRehearsal.anxietyElements')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {scenario.anxietyElements.map((el, i) => (
                    <View key={i} style={styles.tag}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#F44336" />
                      <Text style={styles.tagText}>{el}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Prep Steps */}
            {scenario && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: C.text }]}>{t('behavioralRehearsal.prepSteps')}</Text>
                {scenario.prepSteps.map((step, i) => (
                  <View key={i} style={styles.prepStepRow}>
                    <MaterialCommunityIcons name="check-circle-outline" size={18} color="#4CAF50" />
                    <Text style={[styles.prepStepText, { color: C.text }]}>{step}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Sub Tabs */}
            <View style={styles.subTabRow}>
              {(['sessions', 'outcomes'] as const).map(tab => (
                <TouchableOpacity key={tab}
                  style={[styles.subTab, activeTab === tab && { backgroundColor: C.accent }]}
                  onPress={() => setActiveTab(tab)}>
                  <Text style={[styles.subTabText, activeTab === tab && styles.subTabTextActive]}>
                    {tab === 'sessions' ? t('behavioralRehearsal.tabs.sessions') : t('behavioralRehearsal.tabs.outcomes')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeTab === 'sessions' && (
              mySessions.length === 0
                ? <Text style={styles.emptyText}>{t('behavioralRehearsal.noRehearsals')}</Text>
                : mySessions.map(session => (
                  <View key={session.id} style={styles.entryCard}>
                    <View style={styles.entryHeader}>
                      <Text style={[styles.entryType, { color: C.text }]}>{t(REHEARSAL_TYPE_KEYS[session.rehearsalType])}</Text>
                      <Text style={styles.entryDate}>{new Date(session.timestamp).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.entryStats}>
                      <View style={styles.entryStat}>
                        <Text style={styles.entryStatLabel}>{t('behavioralRehearsal.before')}</Text>
                        <MaterialCommunityIcons name={emotionFor(session.anxietyBefore)[0] as any} size={20}
                          color={emotionFor(session.anxietyBefore)[1]} />
                      </View>
                      <MaterialCommunityIcons name="arrow-right" size={16} color="#999" />
                      <View style={styles.entryStat}>
                        <Text style={styles.entryStatLabel}>{t('behavioralRehearsal.after')}</Text>
                        <MaterialCommunityIcons name={emotionFor(session.anxietyAfter)[0] as any} size={20}
                          color={emotionFor(session.anxietyAfter)[1]} />
                      </View>
                      <Text style={[styles.entryDuration, { color: C.accent }]}>{session.durationMin} min</Text>
                    </View>
                    {session.notes ? <Text style={styles.entryNotes}>{session.notes}</Text> : null}
                  </View>
                ))
            )}

            {activeTab === 'outcomes' && (
              myOutcomes.length === 0
                ? <Text style={styles.emptyText}>{t('behavioralRehearsal.noOutcomes')}</Text>
                : myOutcomes.map(o => (
                  <View key={o.id} style={styles.entryCard}>
                    <View style={styles.entryHeader}>
                      <View style={[styles.outcomeBadge, {
                        backgroundColor: o.outcome === 'success' ? '#E8F5E9' : o.outcome === 'partial' ? '#FFF3E0' : '#FFEBEE'
                      }]}>
                        <Text style={{ color: o.outcome === 'success' ? '#2E7D32' : o.outcome === 'partial' ? '#E65100' : '#C62828', fontSize: 12, fontWeight: '700' }}>
                          {t(OUTCOME_KEYS[o.outcome])}
                        </Text>
                      </View>
                      <Text style={styles.entryDate}>{new Date(o.timestamp).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.entryNotes}>{o.notes || '—'}</Text>
                  </View>
                ))
            )}
          </>
        )}
      </ScrollView>

      <RehearsalFormModal
        scenarioId={selectedScenario || ''}
        visible={showRehearsalForm}
        onClose={() => { setShowRehearsalForm(false); loadData(); }}
        onSave={() => loadData()}
        accent={C.accent}
      />
      <OutcomeFormModal
        scenarioId={selectedScenario || ''}
        visible={showOutcomeForm}
        onClose={() => { setShowOutcomeForm(false); loadData(); }}
        onSave={() => loadData()}
        accent={C.accent}
      />
      <ExposureBuilderModal
        scenarioId={selectedScenario || ''}
        visible={showExposureBuilder}
        onClose={() => { setShowExposureBuilder(false); loadData(); }}
        onSave={() => loadData()}
        accent={C.accent}
      />
    </SafeAreaView>
  );
}
