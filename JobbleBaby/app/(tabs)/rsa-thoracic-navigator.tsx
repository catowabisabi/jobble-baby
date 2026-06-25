import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { STORAGE_KEYS } from '../../store/storage-keys';

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const RSA_LOG_KEY = STORAGE_KEYS.RESPIRATORY_EVENTS || "@jobble/rsa_thoracic_log";
const THORACIC_KEY = "@jobble/thoracic_observation_log";

// ─── Types ───────────────────────────────────────────────────────────────────
interface RSAEntry {
  id: string;
  date: string;
  timestamp: string;
  phase: 'in' | 'out';
  notes: string;
}

interface ThoracicEntry {
  id: string;
  date: string;
  timestamp: string;
  xiphoidStatus: 'retracted' | 'neutral' | 'bulging';
  retractionGrade: 0 | 1 | 2 | 3;
  breathingPattern: 'normal' | 'labored' | 'shallow' | 'wheezing' | 'periodic';
  notes: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function d(): string {
  return new Date().toISOString().split('T')[0];
}

function t(): string {
  return new Date().toISOString();
}

function getCompositeScore(rsaEntries: RSAEntry[], thoracicEntries: ThoracicEntry[]): number {
  let score = 50; // baseline

  // RSA bonus: more entries in last 7 days = better respiratory regulation
  const last7 = rsaEntries.filter(e => {
    const entryDate = new Date(e.date);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return entryDate >= cutoff;
  });
  score += Math.min(last7.length * 3, 20);

  // Thoracic penalty: higher retraction grade
  if (thoracicEntries.length > 0) {
    const latest = thoracicEntries[0];
    score -= latest.retractionGrade * 8;
  }

  // Pattern penalty
  if (thoracicEntries.length > 0) {
    const latest = thoracicEntries[0];
    if (latest.breathingPattern === 'wheezing' || latest.breathingPattern === 'periodic') {
      score -= 15;
    } else if (latest.breathingPattern === 'labored') {
      score -= 8;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#10B981';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
}

function getScoreLabel(score: number): 'optimal' | 'monitor' | 'concerning' {
  if (score >= 70) return 'optimal';
  if (score >= 40) return 'monitor';
  return 'concerning';
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RSAThoracicNavigatorScreen() {
  const { effectiveTheme } = useTheme();
  const { t: tl } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [rsaLog, setRsaLog] = useState<RSAEntry[]>([]);
  const [thoracicLog, setThoracicLog] = useState<ThoracicEntry[]>([]);

  // RSA state
  const [rsaModal, setRsaModal] = useState(false);
  const [rsaPhase, setRsaPhase] = useState<'in' | 'out'>('in');
  const [rsaNotes, setRsaNotes] = useState('');

  // Thoracic state
  const [thoracicModal, setThoracicModal] = useState(false);
  const [xiphoidStatus, setXiphoidStatus] = useState<ThoracicEntry['xiphoidStatus']>('neutral');
  const [retractionGrade, setRetractionGrade] = useState<ThoracicEntry['retractionGrade']>(0);
  const [breathingPattern, setBreathingPattern] = useState<ThoracicEntry['breathingPattern']>('normal');
  const [thoracicNotes, setThoracicNotes] = useState('');

  // ─── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    loadRSAData();
    loadThoracicData();
  }, []);

  const loadRSAData = async () => {
    try {
      const raw = await safeGetItem(RSA_LOG_KEY);
      if (raw) setRsaLog(JSON.parse(raw));
    } catch {}
  };

  const loadThoracicData = async () => {
    try {
      const raw = await safeGetItem(THORACIC_KEY);
      if (raw) setThoracicLog(JSON.parse(raw));
    } catch {}
  };

  // ─── RSA handlers ──────────────────────────────────────────────────────────
  async function saveRSAEntry() {
    const entry: RSAEntry = {
      id: uid(),
      date: d(),
      timestamp: t(),
      phase: rsaPhase,
      notes: rsaNotes,
    };
    const next = [entry, ...rsaLog].slice(0, 100);
    setRsaLog(next);
    await safeSetItem(RSA_LOG_KEY, JSON.stringify(next));
    setRsaModal(false);
    setRsaNotes('');
    Alert.alert(tl('rsaThoracic.title'), tl('common.saved'));
  }

  // ─── Thoracic handlers ─────────────────────────────────────────────────────
  async function saveThoracicEntry() {
    const entry: ThoracicEntry = {
      id: uid(),
      date: d(),
      timestamp: t(),
      xiphoidStatus,
      retractionGrade,
      breathingPattern,
      notes: thoracicNotes,
    };
    const next = [entry, ...thoracicLog].slice(0, 100);
    setThoracicLog(next);
    await safeSetItem(THORACIC_KEY, JSON.stringify(next));
    setThoracicModal(false);
    setThoracicNotes('');
    Alert.alert(tl('rsaThoracic.title'), tl('common.saved'));
  }

  // ─── Computed values ────────────────────────────────────────────────────────
  const compositeScore = getCompositeScore(rsaLog, thoracicLog);

  const last7Days = rsaLog.filter(e => {
    const entryDate = new Date(e.date);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return entryDate >= cutoff;
  });

  const hasFlatRSA = last7Days.length >= 7 && 
    last7Days.every(e => e.phase === 'in' || e.phase === 'out');

  const hasSevereRetraction = thoracicLog.length > 0 && thoracicLog[0].retractionGrade === 3;

  // ─── Render grade picker ──────────────────────────────────────────────────
  function renderGradePicker(value: number, onChange: (v: ThoracicEntry['retractionGrade']) => void, label: string) {
    return (
      <View style={styles.gradePickerContainer}>
        <Text style={styles.pickerLabel}>{label}</Text>
        <View style={styles.gradePickerRow}>
          {([0, 1, 2, 3] as const).map(g => (
            <TouchableOpacity
              key={g}
              style={[
                styles.gradeBtn,
                value === g && styles.gradeBtnActive,
                g === 3 && value !== 3 && styles.gradeBtnWarning,
              ]}
              onPress={() => onChange(g)}
              accessibilityLabel={`${label} grade ${g}`}
              accessibilityRole="button"
              accessibilityState={{ selected: value === g }}
            >
              <Text style={[
                styles.gradeBtnText,
                value === g && styles.gradeBtnTextActive,
                g === 3 && styles.gradeBtnTextWarning,
              ]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.gradeHint}>
          {value === 0 ? tl('rsaThoracic.section2.grade0') :
           value === 1 ? tl('rsaThoracic.section2.grade1') :
           value === 2 ? tl('rsaThoracic.section2.grade2') :
           tl('rsaThoracic.section2.grade3')}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text style={[styles.hdr, { color: C.text }]}>{tl('rsaThoracic.title')}</Text>
        <Text style={[styles.sub, { color: C.muted }]}>{tl('rsaThoracic.subtitle')}</Text>

        {/* ── Section 4: Composite Score Gauge ── */}
        <View style={styles.scoreCircleContainer}>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(compositeScore) }]}>
            <Text style={[styles.scoreValue, { color: getScoreColor(compositeScore) }]}>
              {compositeScore}
            </Text>
            <Text style={styles.scoreLabel}>{tl('rsaThoracic.composite')}</Text>
          </View>
          <Text style={[styles.scoreStatus, { color: getScoreColor(compositeScore) }]}>
            {tl(`rsaThoracic.status.${getScoreLabel(compositeScore)}`)}
          </Text>
        </View>

        {/* ── Section 1: RSA Tap-to-Log ── */}
        <Text style={[styles.sectionHdr, { color: C.text }]}>{tl('rsaThoracic.section1.title')}</Text>
        <Text style={[styles.sectionSub, { color: C.muted }]}>{tl('rsaThoracic.section1.subtitle')}</Text>

        <View style={styles.phaseButtonsRow}>
          <TouchableOpacity
            style={[styles.phaseBtn, { backgroundColor: '#10B981' }]}
            onPress={() => { setRsaPhase('in'); setRsaModal(true); }}
            accessibilityLabel={tl('rsaThoracic.section1.breathingIn')}
          >
            <Text style={styles.phaseBtnText}>{tl('rsaThoracic.section1.breathingIn')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.phaseBtn, { backgroundColor: '#3B82F6' }]}
            onPress={() => { setRsaPhase('out'); setRsaModal(true); }}
            accessibilityLabel={tl('rsaThoracic.section1.breathingOut')}
          >
            <Text style={styles.phaseBtnText}>{tl('rsaThoracic.section1.breathingOut')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.statsRow, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: C.text }]}>{rsaLog.length}</Text>
            <Text style={[styles.statLabel, { color: C.muted }]}>{tl('rsaThoracic.section1.totalEntries')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: C.text }]}>{last7Days.length}</Text>
            <Text style={[styles.statLabel, { color: C.muted }]}>{tl('rsaThoracic.section1.last7Days')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: C.text }]}>
              {last7Days.filter(e => e.phase === 'in').length}
            </Text>
            <Text style={[styles.statLabel, { color: C.muted }]}>{tl('rsaThoracic.section1.inCount')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: C.text }]}>
              {last7Days.filter(e => e.phase === 'out').length}
            </Text>
            <Text style={[styles.statLabel, { color: C.muted }]}>{tl('rsaThoracic.section1.outCount')}</Text>
          </View>
        </View>

        {/* ── Section 3: RSA Bar Chart (last 7 days) ── */}
        {rsaLog.length > 0 && (
          <>
            <Text style={[styles.sectionHdr, { color: C.text }]}>{tl('rsaThoracic.section3.title')}</Text>
            <View style={styles.barChartContainer}>
              {[...Array(7)].map((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                const dateStr = date.toISOString().split('T')[0];
                const dayEntries = rsaLog.filter(e => e.date === dateStr);
                const inCount = dayEntries.filter(e => e.phase === 'in').length;
                const outCount = dayEntries.filter(e => e.phase === 'out').length;
                const maxCount = Math.max(inCount, outCount, 1);
                return (
                  <View key={i} style={styles.barColumn}>
                    <View style={styles.barStack}>
                      <View style={[styles.barIn, { height: (inCount / maxCount) * 60 }]} />
                      <View style={[styles.barOut, { height: (outCount / maxCount) * 60 }]} />
                    </View>
                    <Text style={styles.barDate}>{date.getDate()}</Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.barLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.legendText, { color: C.muted }]}>{tl('rsaThoracic.section1.breathingIn')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.legendText, { color: C.muted }]}>{tl('rsaThoracic.section1.breathingOut')}</Text>
              </View>
            </View>
          </>
        )}

        {/* ── Section 2: Thoracic Observation Form ── */}
        <Text style={[styles.sectionHdr, { color: C.text }]}>{tl('rsaThoracic.section2.title')}</Text>
        <Text style={[styles.sectionSub, { color: C.muted }]}>{tl('rsaThoracic.section2.subtitle')}</Text>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: C.accent }]}
          onPress={() => setThoracicModal(true)}
          accessibilityLabel={tl('rsaThoracic.section2.addEntry')}
        >
          <Text style={styles.addBtnText}>{tl('rsaThoracic.section2.addEntry')}</Text>
        </TouchableOpacity>

        {/* Latest thoracic observation */}
        {thoracicLog.length > 0 && (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.cardTop}>
              <Text style={[styles.dateText, { color: C.muted }]}>{thoracicLog[0].date}</Text>
              <View style={[
                styles.typeBadge,
                { backgroundColor: thoracicLog[0].retractionGrade >= 2 ? '#EF4444' : '#10B981' }
              ]}>
                <Text style={styles.typeBadgeText}>
                  G{thoracicLog[0].retractionGrade}
                </Text>
              </View>
            </View>
            <View style={styles.observationRow}>
              <Text style={[styles.obsLabel, { color: C.muted }]}>
                {tl('rsaThoracic.section2.xiphoid')}:
              </Text>
              <Text style={[styles.obsValue, { color: C.text }]}>
                {tl(`rsaThoracic.section2.xiphoidOptions.${thoracicLog[0].xiphoidStatus}`)}
              </Text>
            </View>
            <View style={styles.observationRow}>
              <Text style={[styles.obsLabel, { color: C.muted }]}>
                {tl('rsaThoracic.section2.pattern')}:
              </Text>
              <Text style={[styles.obsValue, { color: C.text }]}>
                {tl(`rsaThoracic.section2.patternOptions.${thoracicLog[0].breathingPattern}`)}
              </Text>
            </View>
            {thoracicLog[0].notes ? (
              <Text style={[styles.notes, { color: C.muted }]}>{thoracicLog[0].notes}</Text>
            ) : null}
          </View>
        )}

        {/* ── Section 5: Alert Cards ── */}
        <Text style={[styles.sectionHdr, { color: C.text }]}>{tl('rsaThoracic.section5.title')}</Text>

        {hasFlatRSA && (
          <View style={[styles.alertCard, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <Text style={[styles.alertTitle, { color: '#92400E' }]}>{tl('rsaThoracic.section5.flatRsa.title')}</Text>
            <Text style={[styles.alertBody, { color: '#92400E' }]}>{tl('rsaThoracic.section5.flatRsa.body')}</Text>
          </View>
        )}

        {hasSevereRetraction && (
          <View style={[styles.alertCard, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
            <Text style={styles.alertIcon}>🚨</Text>
            <Text style={[styles.alertTitle, { color: '#991B1B' }]}>{tl('rsaThoracic.section5.severeRetraction.title')}</Text>
            <Text style={[styles.alertBody, { color: '#991B1B' }]}>{tl('rsaThoracic.section5.severeRetraction.body')}</Text>
          </View>
        )}

        {thoracicLog.length > 0 && (
          (thoracicLog[0].breathingPattern === 'wheezing' || thoracicLog[0].breathingPattern === 'periodic') && (
            <View style={[styles.alertCard, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
              <Text style={styles.alertIcon}>🫁</Text>
              <Text style={[styles.alertTitle, { color: '#991B1B' }]}>{tl('rsaThoracic.section5.breathingAlert.title')}</Text>
              <Text style={[styles.alertBody, { color: '#991B1B' }]}>{tl('rsaThoracic.section5.breathingAlert.body')}</Text>
            </View>
          )
        )}

        {!hasFlatRSA && !hasSevereRetraction && thoracicLog.length === 0 && (
          <Text style={[styles.noData, { color: C.muted }]}>{tl('rsaThoracic.section5.noAlerts')}</Text>
        )}

        {/* ── RSA History ── */}
        {rsaLog.length > 0 && (
          <>
            <Text style={[styles.sectionHdr, { color: C.text }]}>{tl('rsaThoracic.section1.history')}</Text>
            {rsaLog.slice(0, 10).map(entry => (
              <View key={entry.id} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={styles.cardTop}>
                  <Text style={[styles.dateText, { color: C.muted }]}>{entry.date}</Text>
                  <View style={[styles.typeBadge, { backgroundColor: entry.phase === 'in' ? '#10B981' : '#3B82F6' }]}>
                    <Text style={styles.typeBadgeText}>
                      {entry.phase === 'in' ? tl('rsaThoracic.section1.breathingIn') : tl('rsaThoracic.section1.breathingOut')}
                    </Text>
                  </View>
                </View>
                {entry.notes ? <Text style={[styles.notes, { color: C.muted }]}>{entry.notes}</Text> : null}
              </View>
            ))}
          </>
        )}

        {/* ── Thoracic History ── */}
        {thoracicLog.length > 0 && (
          <>
            <Text style={[styles.sectionHdr, { color: C.text }]}>{tl('rsaThoracic.section2.history')}</Text>
            {thoracicLog.slice(0, 10).map(entry => (
              <View key={entry.id} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={styles.cardTop}>
                  <Text style={[styles.dateText, { color: C.muted }]}>{entry.date}</Text>
                  <View style={[styles.typeBadge, { backgroundColor: entry.retractionGrade >= 2 ? '#EF4444' : '#10B981' }]}>
                    <Text style={styles.typeBadgeText}>G{entry.retractionGrade}</Text>
                  </View>
                </View>
                <View style={styles.observationRow}>
                  <Text style={[styles.obsLabel, { color: C.muted }]}>{tl('rsaThoracic.section2.xiphoid')}:</Text>
                  <Text style={[styles.obsValue, { color: C.text }]}>{tl(`rsaThoracic.section2.xiphoidOptions.${entry.xiphoidStatus}`)}</Text>
                </View>
                <View style={styles.observationRow}>
                  <Text style={[styles.obsLabel, { color: C.muted }]}>{tl('rsaThoracic.section2.pattern')}:</Text>
                  <Text style={[styles.obsValue, { color: C.text }]}>{tl(`rsaThoracic.section2.patternOptions.${entry.breathingPattern}`)}</Text>
                </View>
                {entry.notes ? <Text style={[styles.notes, { color: C.muted }]}>{entry.notes}</Text> : null}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* ── RSA Modal ── */}
      <Modal visible={rsaModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modal, { backgroundColor: C.card }]}>
            <ScrollView>
              <Text style={[styles.modalTitle, { color: C.text }]}>{tl('rsaThoracic.section1.logEntry')}</Text>

              <View style={styles.phaseSelector}>
                <TouchableOpacity
                  style={[
                    styles.phaseOption,
                    { backgroundColor: '#10B98120', borderColor: '#10B981' },
                    rsaPhase === 'out' && { borderColor: C.border, backgroundColor: C.background }
                  ]}
                  onPress={() => setRsaPhase('in')}
                >
                  <Text style={[styles.phaseOptionText, { color: '#10B981' }]}>
                    {tl('rsaThoracic.section1.breathingIn')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.phaseOption,
                    { backgroundColor: '#3B82F620', borderColor: '#3B82F6' },
                    rsaPhase === 'in' && { borderColor: C.border, backgroundColor: C.background }
                  ]}
                  onPress={() => setRsaPhase('out')}
                >
                  <Text style={[styles.phaseOptionText, { color: '#3B82F6' }]}>
                    {tl('rsaThoracic.section1.breathingOut')}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: C.muted }]}>{tl('rsaThoracic.section1.notes')}</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                value={rsaNotes}
                onChangeText={setRsaNotes}
                multiline
                placeholder={tl('rsaThoracic.section1.notesPlaceholder')}
                placeholderTextColor={C.muted}
              />

              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: C.border }]}
                  onPress={() => { setRsaModal(false); setRsaNotes(''); }}
                  accessibilityLabel={tl('common.cancel')}
                >
                  <Text style={[styles.cancelBtnText, { color: C.text }]}>{tl('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: C.accent }]}
                  onPress={saveRSAEntry}
                  accessibilityLabel={tl('common.save')}
                >
                  <Text style={styles.saveBtnText}>{tl('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Thoracic Modal ── */}
      <Modal visible={thoracicModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modal, { backgroundColor: C.card }]}>
            <ScrollView>
              <Text style={[styles.modalTitle, { color: C.text }]}>{tl('rsaThoracic.section2.logEntry')}</Text>

              {/* Xiphoid Status Picker */}
              <Text style={[styles.fieldLabel, { color: C.muted }]}>{tl('rsaThoracic.section2.xiphoid')}</Text>
              <View style={styles.chipRow}>
                {(['retracted', 'neutral', 'bulging'] as const).map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.chip,
                      { backgroundColor: C.background, borderColor: C.border },
                      xiphoidStatus === status && { borderColor: C.accent, backgroundColor: C.accent + '20' }
                    ]}
                    onPress={() => setXiphoidStatus(status)}
                    accessibilityLabel={tl(`rsaThoracic.section2.xiphoidOptions.${status}`)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: xiphoidStatus === status }}
                  >
                    <Text style={[styles.chipText, { color: xiphoidStatus === status ? C.accent : C.text }]}>
                      {tl(`rsaThoracic.section2.xiphoidOptions.${status}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Retraction Grade Picker */}
              {renderGradePicker(retractionGrade, setRetractionGrade, tl('rsaThoracic.section2.retractionGrade'))}

              {/* Breathing Pattern Picker */}
              <Text style={[styles.fieldLabel, { color: C.muted }]}>{tl('rsaThoracic.section2.pattern')}</Text>
              <View style={styles.chipRow}>
                {(['normal', 'labored', 'shallow', 'wheezing', 'periodic'] as const).map(pattern => (
                  <TouchableOpacity
                    key={pattern}
                    style={[
                      styles.chip,
                      { backgroundColor: C.background, borderColor: C.border },
                      breathingPattern === pattern && { borderColor: C.accent, backgroundColor: C.accent + '20' }
                    ]}
                    onPress={() => setBreathingPattern(pattern)}
                    accessibilityLabel={tl(`rsaThoracic.section2.patternOptions.${pattern}`)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: breathingPattern === pattern }}
                  >
                    <Text style={[styles.chipText, { color: breathingPattern === pattern ? C.accent : C.text }]}>
                      {tl(`rsaThoracic.section2.patternOptions.${pattern}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: C.muted }]}>{tl('rsaThoracic.section2.notes')}</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                value={thoracicNotes}
                onChangeText={setThoracicNotes}
                multiline
                placeholder={tl('rsaThoracic.section2.notesPlaceholder')}
                placeholderTextColor={C.muted}
              />

              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: C.border }]}
                  onPress={() => { setThoracicModal(false); setThoracicNotes(''); }}
                  accessibilityLabel={tl('common.cancel')}
                >
                  <Text style={[styles.cancelBtnText, { color: C.text }]}>{tl('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: C.accent }]}
                  onPress={saveThoracicEntry}
                  accessibilityLabel={tl('common.save')}
                >
                  <Text style={styles.saveBtnText}>{tl('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  hdr: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  sub: { fontSize: 14, marginBottom: 16 },
  sectionHdr: { fontSize: 18, fontWeight: '600', marginBottom: 4, marginTop: 16 },
  sectionSub: { fontSize: 13, marginBottom: 12 },
  scoreCircleContainer: { alignItems: 'center', marginBottom: 20 },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: { fontSize: 36, fontWeight: '700' },
  scoreLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  scoreStatus: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  phaseButtonsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  phaseBtn: { flex: 1, padding: 20, borderRadius: 16, alignItems: 'center' },
  phaseBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  barChartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 100, marginBottom: 8 },
  barColumn: { alignItems: 'center' },
  barStack: { justifyContent: 'flex-end', height: 60, gap: 2 },
  barIn: { width: 16, backgroundColor: '#10B981', borderRadius: 4 },
  barOut: { width: 16, backgroundColor: '#3B82F6', borderRadius: 4 },
  barDate: { fontSize: 10, color: '#666', marginTop: 4 },
  barLegend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 16, marginBottom: 16, gap: 8 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dateText: { fontSize: 12 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  typeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  observationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  obsLabel: { fontSize: 12, marginRight: 6 },
  obsValue: { fontSize: 12, fontWeight: '500' },
  notes: { fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  noData: { fontSize: 14, textAlign: 'center', marginTop: 16 },
  alertCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  alertIcon: { fontSize: 24, marginBottom: 8 },
  alertTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  alertBody: { fontSize: 13 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  fieldLabel: { fontSize: 13, marginTop: 12, marginBottom: 6, fontWeight: '500' },
  input: { borderRadius: 8, padding: 12, fontSize: 14, borderWidth: 1 },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  phaseSelector: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  phaseOption: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 2, alignItems: 'center' },
  phaseOptionText: { fontSize: 16, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 13 },
  gradePickerContainer: { marginBottom: 12 },
  pickerLabel: { fontSize: 13, color: '#9CA3AF', marginBottom: 6 },
  gradePickerRow: { flexDirection: 'row', gap: 8 },
  gradeBtn: { flex: 1, height: 48, borderRadius: 8, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#374151' },
  gradeBtnActive: { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' },
  gradeBtnWarning: { borderColor: '#EF4444' },
  gradeBtnText: { fontSize: 18, fontWeight: '700', color: '#6B7280' },
  gradeBtnTextActive: { color: '#3B82F6' },
  gradeBtnTextWarning: { color: '#EF4444' },
  gradeHint: { fontSize: 12, color: '#666', marginTop: 4 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
