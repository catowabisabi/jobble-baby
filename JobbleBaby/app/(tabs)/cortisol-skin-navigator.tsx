import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const CORTISOL_KEY = STORAGE_KEYS.CORTISOL_LOG;
const SKIN_KEY = STORAGE_KEYS.SKIN_CHANGE_LOG;
const TONGUE_KEY = STORAGE_KEYS.TONGUE_TIE_ASSESSMENT;

// ─── Types ───────────────────────────────────────────────────────────────────
interface CortisolEntry {
  id: string;
  date: string;
  timestamp: string;
  fussiness: number;
  skinRedness: number;
  sleepDisruption: number;
  feedingStrikes: number;
  notes: string;
}

interface SkinEntry {
  id: string;
  date: string;
  timestamp: string;
  areas: string[];
  severity: 'mild' | 'moderate' | 'severe';
  type: 'rash' | 'flushing' | 'temperature' | 'dryness' | 'irritation' | 'other';
  photoUri?: string;
  notes: string;
}

interface TongueAssessment {
  id: string;
  date: string;
  score: number;
  answers: number[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function uid(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
const d = (): string => new Date().toISOString().split('T')[0];
const t = (): string => new Date().toISOString();

function getCortisolScore(e: CortisolEntry): number {
  return e.fussiness + e.skinRedness + e.sleepDisruption + (e.feedingStrikes > 0 ? 2 : 0);
}

function getCortisolColor(score: number): string {
  if (score <= 4) return '#10B981';
  if (score <= 8) return '#F59E0B';
  return '#EF4444';
}

function getSeverityColor(severity: string): string {
  if (severity === 'mild') return '#10B981';
  if (severity === 'moderate') return '#F59E0B';
  return '#EF4444';
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CortisolSkinNavigatorScreen() {
  const { effectiveTheme } = useTheme();
  const { t: tl } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [tab, setTab] = useState<'cortisol' | 'skin' | 'tongueTie'>('cortisol');
  const [cortisolLog, setCortisolLog] = useState<CortisolEntry[]>([]);
  const [skinLog, setSkinLog] = useState<SkinEntry[]>([]);
  const [tongueAssessments, setTongueAssessments] = useState<TongueAssessment[]>([]);

  // Cortisol state
  const [fussiness, setFussiness] = useState(1);
  const [skinRedness, setSkinRedness] = useState(1);
  const [sleepDisruption, setSleepDisruption] = useState(1);
  const [feedingStrikes, setFeedingStrikes] = useState('');
  const [cortisolNotes, setCortisolNotes] = useState('');
  const [cortisolModal, setCortisolModal] = useState(false);

  // Skin state
  const [skinModal, setSkinModal] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [skinSeverity, setSkinSeverity] = useState<'mild' | 'moderate' | 'severe'>('mild');
  const [skinType, setSkinType] = useState<SkinEntry['type']>('rash');
  const [skinNotes, setSkinNotes] = useState('');

  // Tongue-Tie state
  const [tongueModal, setTongueModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [tongueAnswers, setTongueAnswers] = useState<number[]>([0, 0, 0, 0, 0]);
  const [tongueResult, setTongueResult] = useState<number | null>(null);

  const TONGUE_QUESTIONS = [
    'tongueTie.questions.latchQuality',
    'tongueTie.questions.feedingDuration',
    'tongueTie.questions.clickingSounds',
    'tongueTie.questions.maternalPain',
    'tongueTie.questions.weightGain',
  ] as const;

  // ─── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    loadCortisolData();
    loadSkinData();
    loadTongueData();
  }, []);

  const loadCortisolData = async () => {
    try {
      const raw = await safeGetItem(CORTISOL_KEY);
      if (raw) setCortisolLog(JSON.parse(raw));
    } catch {}
  };

  const loadSkinData = async () => {
    try {
      const raw = await safeGetItem(SKIN_KEY);
      if (raw) setSkinLog(JSON.parse(raw));
    } catch {}
  };

  const loadTongueData = async () => {
    try {
      const raw = await safeGetItem(TONGUE_KEY);
      if (raw) setTongueAssessments(JSON.parse(raw));
    } catch {}
  };

  // ─── Cortisol handlers ──────────────────────────────────────────────────────
  async function saveCortisolEntry() {
    const entry: CortisolEntry = {
      id: uid(),
      date: d(),
      timestamp: t(),
      fussiness,
      skinRedness,
      sleepDisruption,
      feedingStrikes: parseInt(feedingStrikes) || 0,
      notes: cortisolNotes,
    };
    const next = [entry, ...cortisolLog];
    setCortisolLog(next);
    await safeSetItem(CORTISOL_KEY, JSON.stringify(next));
    setCortisolModal(false);
    resetCortisolForm();
    Alert.alert(tl('cortisolSkin.title'), tl('common.saved') || 'Entry saved');
  }

  function resetCortisolForm() {
    setFussiness(1);
    setSkinRedness(1);
    setSleepDisruption(1);
    setFeedingStrikes('');
    setCortisolNotes('');
  }

  // ─── Skin handlers ──────────────────────────────────────────────────────────
  async function saveSkinEntry() {
    if (selectedAreas.length === 0) {
      Alert.alert(tl('cortisolSkin.title'), 'Please select at least one affected area');
      return;
    }
    const entry: SkinEntry = {
      id: uid(),
      date: d(),
      timestamp: t(),
      areas: selectedAreas,
      severity: skinSeverity,
      type: skinType,
      notes: skinNotes,
    };
    const next = [entry, ...skinLog];
    setSkinLog(next);
    await safeSetItem(SKIN_KEY, JSON.stringify(next));
    setSkinModal(false);
    resetSkinForm();
    Alert.alert(tl('cortisolSkin.title'), tl('common.saved') || 'Entry saved');
  }

  function resetSkinForm() {
    setSelectedAreas([]);
    setSkinSeverity('mild');
    setSkinType('rash');
    setSkinNotes('');
  }

  function toggleArea(area: string) {
    setSelectedAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  }

  function getAreaAlertCount(area: string): number {
    return skinLog.filter(e => e.areas.includes(area)).length;
  }

  // ─── Tongue-Tie handlers ───────────────────────────────────────────────────
  async function saveTongueAssessment() {
    const score = tongueAnswers.reduce((a, b) => a + b, 0);
    const entry: TongueAssessment = {
      id: uid(),
      date: d(),
      score,
      answers: [...tongueAnswers],
    };
    const next = [entry, ...tongueAssessments];
    setTongueAssessments(next);
    await safeSetItem(TONGUE_KEY, JSON.stringify(next));
    setTongueResult(score);
    setTongueModal(false);
    setCurrentQuestion(0);
    setTongueAnswers([0, 0, 0, 0, 0]);
  }

  function handleAnswer(score: number) {
    const updated = [...tongueAnswers];
    updated[currentQuestion] = score;
    setTongueAnswers(updated);
    if (currentQuestion < 4) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      const total = updated.reduce((a, b) => a + b, 0);
      setTongueResult(total);
      setTongueModal(false);
      setCurrentQuestion(0);
      setTongueAnswers([0, 0, 0, 0, 0]);
      saveTongueResult(total);
    }
  }

  async function saveTongueResult(score: number) {
    const entry: TongueAssessment = {
      id: uid(),
      date: d(),
      score,
      answers: [...tongueAnswers],
    };
    const next = [entry, ...tongueAssessments];
    setTongueAssessments(next);
    await safeSetItem(TONGUE_KEY, JSON.stringify(next));
  }

  function getTongueRecommendation(score: number): string {
    if (score <= 2) return tl('cortisolSkin.tongueTie.scoring.lowConcern');
    if (score <= 5) return tl('cortisolSkin.tongueTie.scoring.monitor');
    return tl('cortisolSkin.tongueTie.scoring.refer');
  }

  // ─── Tabs config ───────────────────────────────────────────────────────────
  const TABS = [
    { key: 'cortisol' as const, label: tl('cortisolSkin.tabs.cortisol'), icon: 'heart-pulse' },
    { key: 'skin' as const, label: tl('cortisolSkin.tabs.skin'), icon: 'hand' },
    { key: 'tongueTie' as const, label: tl('cortisolSkin.tabs.tongueTie'), icon: 'link-variant' },
  ];

  // ─── Render score picker ──────────────────────────────────────────────────
  function renderScorePicker(value: number, onChange: (v: number) => void, label: string) {
    return (
      <View style={styles.scorePickerContainer}>
        <Text style={styles.pickerLabel}>{label}</Text>
        <View style={styles.scorePickerRow}>
          {[1, 2, 3, 4, 5].map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.scoreBtn, value === s && styles.scoreBtnActive]}
              onPress={() => onChange(s)}
              accessibilityLabel={`${label} ${s}`}
              accessibilityRole="button"
              accessibilityState={{ selected: value === s }}
            >
              <Text style={[styles.scoreBtnText, value === s && styles.scoreBtnTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  const BODY_AREAS = [
    ['face', 'scalp', 'neck'],
    ['chest', 'abdomen', 'back'],
    ['arms', 'hands', 'legs', 'feet'],
    ['diaperArea'],
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text style={[styles.hdr, { color: C.text }]}>{tl('cortisolSkin.title')}</Text>
        <Text style={[styles.sub, { color: C.muted }]}>{tl('cortisolSkin.subtitle')}</Text>

        {/* Tab selector */}
        <View style={styles.tabRow}>
          {TABS.map(tb => (
            <TouchableOpacity
              key={tb.key}
              style={[styles.tabBtn, tab === tb.key && { backgroundColor: C.accent + '20' }]}
              onPress={() => setTab(tb.key)}
              accessibilityLabel={tb.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === tb.key }}
            >
              <Text style={[styles.tabBtnTxt, { color: tab === tb.key ? C.accent : C.muted }]}>
                {tb.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── CORTISOL SHADOW ── */}
        {tab === 'cortisol' && (
          <>
            <Text style={[styles.sectionHdr, { color: C.text }]}>{tl('cortisolSkin.cortisol.title')}</Text>
            <Text style={[styles.sectionSub, { color: C.muted }]}>{tl('cortisolSkin.cortisol.subtitle')}</Text>

            {/* Latest score card */}
            {cortisolLog[0] && (
              <View style={[styles.scoreCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={[styles.scoreCardLabel, { color: C.muted }]}>{tl('cortisolSkin.cortisol.score')}</Text>
                <Text style={[styles.scoreNum, { color: getCortisolColor(getCortisolScore(cortisolLog[0])) }]}>
                  {getCortisolScore(cortisolLog[0])}
                </Text>
                <Text style={[styles.scoreDate, { color: C.muted }]}>{cortisolLog[0].date}</Text>
              </View>
            )}

            {/* Quick stats */}
            {cortisolLog.length > 0 && (
              <View style={[styles.statsRow, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: C.text }]}>{cortisolLog.length}</Text>
                  <Text style={[styles.statLabel, { color: C.muted }]}>{tl('cortisolSkin.cortisol.stats.episodes')}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: C.text }]}>
                    {cortisolLog.filter(e => e.feedingStrikes > 0).length}
                  </Text>
                  <Text style={[styles.statLabel, { color: C.muted }]}>{tl('cortisolSkin.cortisol.stats.feedingStrikes')}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: C.text }]}>
                    {(cortisolLog.reduce((a, e) => a + getCortisolScore(e), 0) / Math.max(1, cortisolLog.length)).toFixed(1)}
                  </Text>
                  <Text style={[styles.statLabel, { color: C.muted }]}>Avg Score</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: C.accent }]}
              onPress={() => setCortisolModal(true)}
              accessibilityLabel={tl('cortisolSkin.cortisol.logEntry')}
              accessibilityRole="button"
            >
              <Text style={styles.addBtnText}>{tl('cortisolSkin.cortisol.logEntry')}</Text>
            </TouchableOpacity>

            {/* History */}
            {cortisolLog.length > 0 ? (
              <>
                <Text style={[styles.sectionHdr, { color: C.text }]}>{tl('cortisolSkin.cortisol.history')}</Text>
                {cortisolLog.slice(0, 10).map(entry => (
                  <View key={entry.id} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                    <View style={styles.cardTop}>
                      <Text style={[styles.dateText, { color: C.muted }]}>{entry.date}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: getCortisolColor(getCortisolScore(entry)) }]}>
                        <Text style={styles.typeBadgeText}>{getCortisolScore(entry)}</Text>
                      </View>
                    </View>
                    <View style={styles.scoreRow}>
                      <Text style={[styles.scoreLabel, { color: C.muted }]}>
                        Fuss: {entry.fussiness} | Red: {entry.skinRedness} | Sleep: {entry.sleepDisruption}
                      </Text>
                    </View>
                    {entry.feedingStrikes > 0 && (
                      <Text style={[styles.alertText, { color: '#F59E0B' }]}>
                        ⚠️ {entry.feedingStrikes} feeding strike(s)
                      </Text>
                    )}
                    {entry.notes ? <Text style={[styles.notes, { color: C.muted }]}>{entry.notes}</Text> : null}
                  </View>
                ))}
              </>
            ) : (
              <Text style={[styles.noData, { color: C.muted }]}>{tl('cortisolSkin.cortisol.noData')}</Text>
            )}
          </>
        )}

        {/* ── SKIN NAVIGATOR ── */}
        {tab === 'skin' && (
          <>
            <Text style={[styles.sectionHdr, { color: C.text }]}>{tl('cortisolSkin.skin.title')}</Text>
            <Text style={[styles.sectionSub, { color: C.muted }]}>{tl('cortisolSkin.skin.subtitle')}</Text>

            {/* Alert for repeated areas */}
            {BODY_AREAS.flat().some(area => getAreaAlertCount(area) >= 3) && (
              <View style={[styles.alertBanner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                <Text style={[styles.alertBannerText, { color: '#92400E' }]}>
                  ⚠️ {tl('cortisolSkin.skin.alertSameArea')}
                </Text>
              </View>
            )}

            {/* Body map */}
            <Text style={[styles.subsectionHdr, { color: C.text }]}>{tl('cortisolSkin.skin.bodyMap')}</Text>
            <Text style={[styles.bodyMapHint, { color: C.muted }]}>{tl('cortisolSkin.skin.tapToSelect')}</Text>
            {BODY_AREAS.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.bodyMapRow}>
                {row.map(area => {
                  const count = getAreaAlertCount(area);
                  const isSelected = selectedAreas.includes(area);
                  return (
                    <TouchableOpacity
                      key={area}
                      style={[
                        styles.bodyMapArea,
                        { backgroundColor: C.card, borderColor: C.border },
                        isSelected && { borderColor: C.accent, backgroundColor: C.accent + '20' },
                        count >= 3 && { borderColor: '#EF4444' },
                      ]}
                      onPress={() => toggleArea(area)}
                      accessibilityLabel={`${tl(`cortisolSkin.skin.areas.${area}`)} (${count} entries)`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={[styles.bodyMapAreaText, { color: count >= 3 ? '#EF4444' : C.text }]}>
                        {tl(`cortisolSkin.skin.areas.${area}`)}
                      </Text>
                      {count > 0 && (
                        <Text style={[styles.bodyMapCount, { color: C.muted }]}>{count}x</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: C.accent }]}
              onPress={() => setSkinModal(true)}
              accessibilityLabel={tl('cortisolSkin.skin.addEntry')}
              accessibilityRole="button"
            >
              <Text style={styles.addBtnText}>{tl('cortisolSkin.skin.addEntry')}</Text>
            </TouchableOpacity>

            {/* Timeline */}
            {skinLog.length > 0 && (
              <>
                <Text style={[styles.sectionHdr, { color: C.text }]}>{tl('cortisolSkin.skin.timeline')}</Text>
                {skinLog.slice(0, 10).map(entry => (
                  <View key={entry.id} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                    <View style={styles.cardTop}>
                      <Text style={[styles.dateText, { color: C.muted }]}>{entry.date}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: getSeverityColor(entry.severity) }]}>
                        <Text style={styles.typeBadgeText}>{tl(`cortisolSkin.skin.severityLevels.${entry.severity}`)}</Text>
                      </View>
                    </View>
                    <Text style={[styles.scoreValue, { color: C.text }]}>
                      {tl(`cortisolSkin.skin.types.${entry.type}`)}
                    </Text>
                    <View style={styles.areaChips}>
                      {entry.areas.map(area => (
                        <View key={area} style={[styles.areaChip, { backgroundColor: C.border }]}>
                          <Text style={[styles.areaChipText, { color: C.text }]}>
                            {tl(`cortisolSkin.skin.areas.${area}`)}
                          </Text>
                        </View>
                      ))}
                    </View>
                    {entry.notes ? <Text style={[styles.notes, { color: C.muted }]}>{entry.notes}</Text> : null}
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {/* ── TONGUE-TIE REASSESSMENT ── */}
        {tab === 'tongueTie' && (
          <>
            <Text style={[styles.sectionHdr, { color: C.text }]}>{tl('cortisolSkin.tongueTie.title')}</Text>
            <Text style={[styles.sectionSub, { color: C.muted }]}>{tl('cortisolSkin.tongueTie.subtitle')}</Text>

            {/* Latest result */}
            {tongueAssessments[0] && tongueResult === null && (
              <View style={[styles.scoreCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={[styles.scoreCardLabel, { color: C.muted }]}>{tl('cortisolSkin.tongueTie.scoring.title')}</Text>
                <Text style={[styles.scoreNum, { color: tongueAssessments[0].score <= 2 ? '#10B981' : tongueAssessments[0].score <= 5 ? '#F59E0B' : '#EF4444' }]}>
                  {tongueAssessments[0].score}/10
                </Text>
                <Text style={[styles.scoreSub, { color: C.muted }]}>
                  {getTongueRecommendation(tongueAssessments[0].score)}
                </Text>
              </View>
            )}

            {/* Current result from screening */}
            {tongueResult !== null && (
              <View style={[styles.scoreCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={[styles.scoreCardLabel, { color: C.muted }]}>{tl('cortisolSkin.tongueTie.result', { score: tongueResult })}</Text>
                <Text style={[styles.scoreNum, { color: tongueResult <= 2 ? '#10B981' : tongueResult <= 5 ? '#F59E0B' : '#EF4444' }]}>
                  {tongueResult <= 2 ? '✓' : tongueResult <= 5 ? '⚠️' : '✕'}
                </Text>
                <Text style={[styles.scoreSub, { color: C.muted }]}>
                  {getTongueRecommendation(tongueResult)}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: C.accent }]}
              onPress={() => setTongueModal(true)}
              accessibilityLabel={tl('cortisolSkin.tongueTie.startScreening')}
              accessibilityRole="button"
            >
              <Text style={styles.addBtnText}>{tl('cortisolSkin.tongueTie.startScreening')}</Text>
            </TouchableOpacity>

            {/* Education */}
            <View style={[styles.guideCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[styles.guideTitle, { color: C.text }]}>{tl('cortisolSkin.tongueTie.education.title')}</Text>
              <Text style={[styles.guideBody, { color: C.muted }]}>{tl('cortisolSkin.tongueTie.education.signs')}</Text>
              {['sign1', 'sign2', 'sign3', 'sign4', 'sign5', 'sign6'].map(sign => (
                <Text key={sign} style={[styles.guideItem, { color: C.text }]}>
                  • {tl(`cortisolSkin.tongueTie.education.${sign}`)}
                </Text>
              ))}
            </View>

            {/* Related links */}
            <Text style={[styles.sectionHdr, { color: C.text }]}>{tl('cortisolSkin.tongueTie.links.title')}</Text>
            <View style={styles.linkRow}>
              <TouchableOpacity style={[styles.linkCard, { backgroundColor: C.card, borderColor: C.border }]}
                accessibilityLabel={tl('cortisolSkin.tongueTie.links.feeding')}
              >
                <Text style={[styles.linkCardText, { color: C.accent }]}>
                  → {tl('cortisolSkin.tongueTie.links.feeding')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.linkCard, { backgroundColor: C.card, borderColor: C.border }]}
                accessibilityLabel={tl('cortisolSkin.tongueTie.links.growth')}
              >
                <Text style={[styles.linkCardText, { color: C.accent }]}>
                  → {tl('cortisolSkin.tongueTie.links.growth')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* History */}
            {tongueAssessments.length > 0 && (
              <>
                <Text style={[styles.sectionHdr, { color: C.text }]}>{tl('cortisolSkin.tongueTie.history')}</Text>
                {tongueAssessments.slice(0, 5).map(a => (
                  <View key={a.id} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                    <View style={styles.cardTop}>
                      <Text style={[styles.dateText, { color: C.muted }]}>{a.date}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: a.score <= 2 ? '#10B981' : a.score <= 5 ? '#F59E0B' : '#EF4444' }]}>
                        <Text style={styles.typeBadgeText}>{a.score}/10</Text>
                      </View>
                    </View>
                    <Text style={[styles.scoreValue, { color: C.text }]}>
                      {getTongueRecommendation(a.score)}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Cortisol Modal ── */}
      <Modal visible={cortisolModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modal, { backgroundColor: C.card }]}>
            <ScrollView>
              <Text style={[styles.modalTitle, { color: C.text }]}>{tl('cortisolSkin.cortisol.logEntry')}</Text>

              {renderScorePicker(fussiness, setFussiness, tl('cortisolSkin.cortisol.fussiness'))}

              {renderScorePicker(skinRedness, setSkinRedness, tl('cortisolSkin.cortisol.skinRedness'))}

              {renderScorePicker(sleepDisruption, setSleepDisruption, tl('cortisolSkin.cortisol.sleepDisruption'))}

              <Text style={[styles.fieldLabel, { color: C.muted }]}>{tl('cortisolSkin.cortisol.feedingStrikes')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                value={feedingStrikes}
                onChangeText={setFeedingStrikes}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={C.muted}
              />

              <Text style={[styles.fieldLabel, { color: C.muted }]}>{tl('cortisolSkin.skin.notes')}</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                value={cortisolNotes}
                onChangeText={setCortisolNotes}
                multiline
                placeholder={tl('cortisolSkin.skin.notesPlaceholder')}
                placeholderTextColor={C.muted}
              />

              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: C.border }]}
                  onPress={() => { setCortisolModal(false); resetCortisolForm(); }}
                  accessibilityLabel={tl('common.cancel')}
                >
                  <Text style={[styles.cancelBtnText, { color: C.text }]}>{tl('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: C.accent }]}
                  onPress={saveCortisolEntry}
                  accessibilityLabel={tl('common.save')}
                >
                  <Text style={styles.saveBtnText}>{tl('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Skin Modal ── */}
      <Modal visible={skinModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modal, { backgroundColor: C.card }]}>
            <ScrollView>
              <Text style={[styles.modalTitle, { color: C.text }]}>{tl('cortisolSkin.skin.addEntry')}</Text>

              <Text style={[styles.fieldLabel, { color: C.muted }]}>{tl('cortisolSkin.skin.area')}</Text>
              <View style={styles.areaGrid}>
                {(['face', 'scalp', 'neck', 'chest', 'abdomen', 'back', 'arms', 'hands', 'legs', 'feet', 'diaperArea'] as const).map(area => (
                  <TouchableOpacity
                    key={area}
                    style={[styles.areaToggle, { backgroundColor: C.background, borderColor: C.border }, selectedAreas.includes(area) && { borderColor: C.accent, backgroundColor: C.accent + '20' }]}
                    onPress={() => toggleArea(area)}
                    accessibilityLabel={tl(`cortisolSkin.skin.areas.${area}`)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedAreas.includes(area) }}
                  >
                    <Text style={[styles.areaToggleText, { color: selectedAreas.includes(area) ? C.accent : C.text }]}>
                      {tl(`cortisolSkin.skin.areas.${area}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: C.muted }]}>{tl('cortisolSkin.skin.severity')}</Text>
              <View style={styles.chipRow}>
                {(['mild', 'moderate', 'severe'] as const).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, { backgroundColor: C.background, borderColor: C.border }, skinSeverity === s && { borderColor: C.accent, backgroundColor: C.accent + '20' }]}
                    onPress={() => setSkinSeverity(s)}
                    accessibilityLabel={tl(`cortisolSkin.skin.severityLevels.${s}`)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: skinSeverity === s }}
                  >
                    <Text style={[styles.chipText, { color: skinSeverity === s ? C.accent : C.text }]}>
                      {tl(`cortisolSkin.skin.severityLevels.${s}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: C.muted }]}>{tl('cortisolSkin.skin.type')}</Text>
              <View style={styles.chipRow}>
                {(['rash', 'flushing', 'temperature', 'dryness', 'irritation', 'other'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.chip, { backgroundColor: C.background, borderColor: C.border }, skinType === type && { borderColor: C.accent, backgroundColor: C.accent + '20' }]}
                    onPress={() => setSkinType(type)}
                    accessibilityLabel={tl(`cortisolSkin.skin.types.${type}`)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: skinType === type }}
                  >
                    <Text style={[styles.chipText, { color: skinType === type ? C.accent : C.text }]}>
                      {tl(`cortisolSkin.skin.types.${type}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: C.muted }]}>{tl('cortisolSkin.skin.notes')}</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                value={skinNotes}
                onChangeText={setSkinNotes}
                multiline
                placeholder={tl('cortisolSkin.skin.notesPlaceholder')}
                placeholderTextColor={C.muted}
              />

              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: C.border }]}
                  onPress={() => { setSkinModal(false); resetSkinForm(); }}
                  accessibilityLabel={tl('common.cancel')}
                >
                  <Text style={[styles.cancelBtnText, { color: C.text }]}>{tl('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: C.accent }]}
                  onPress={saveSkinEntry}
                  accessibilityLabel={tl('common.save')}
                >
                  <Text style={styles.saveBtnText}>{tl('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Tongue-Tie Screening Modal ── */}
      <Modal visible={tongueModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modal, { backgroundColor: C.card }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={[styles.modalTitle, { color: C.text }]}>
                {tl('cortisolSkin.tongueTie.question', { current: currentQuestion + 1, total: 5 })}
              </Text>

              <Text style={[styles.questionText, { color: C.text }]}>
                {tl(`cortisolSkin.tongueTie.questions.${['latchQuality', 'feedingDuration', 'clickingSounds', 'maternalPain', 'weightGain'][currentQuestion]}`)}
              </Text>

              <View style={styles.answerRow}>
                {[
                  { score: 0, label: tl('cortisolSkin.tongueTie.options.no'), color: '#10B981' },
                  { score: 1, label: tl('cortisolSkin.tongueTie.options.sometimes'), color: '#F59E0B' },
                  { score: 2, label: tl('cortisolSkin.tongueTie.options.yes'), color: '#EF4444' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.score}
                    style={[styles.answerBtn, { backgroundColor: opt.color + '20', borderColor: opt.color }]}
                    onPress={() => handleAnswer(opt.score)}
                    accessibilityLabel={opt.label}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.answerBtnText, { color: opt.color }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.progressDots}>
                {[0, 1, 2, 3, 4].map(i => (
                  <View
                    key={i}
                    style={[
                      styles.progressDot,
                      { backgroundColor: i === currentQuestion ? C.accent : C.border },
                    ]}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: C.border, marginTop: 20 }]}
                onPress={() => { setTongueModal(false); setCurrentQuestion(0); setTongueAnswers([0, 0, 0, 0, 0]); }}
                accessibilityLabel={tl('common.cancel')}
              >
                <Text style={[styles.cancelBtnText, { color: C.text }]}>{tl('common.cancel')}</Text>
              </TouchableOpacity>
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
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#1F2937' },
  tabBtnTxt: { fontSize: 12, fontWeight: '600' },
  sectionHdr: { fontSize: 18, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  sectionSub: { fontSize: 13, marginBottom: 16 },
  subsectionHdr: { fontSize: 16, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  scoreCard: { borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16, borderWidth: 1 },
  scoreCardLabel: { fontSize: 12 },
  scoreNum: { fontSize: 48, fontWeight: '700' },
  scoreSub: { fontSize: 12, marginTop: 2 },
  scoreDate: { fontSize: 11, marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 16, marginBottom: 20, gap: 8 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dateText: { fontSize: 12 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  typeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  scoreRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  scoreLabel: { fontSize: 12 },
  scoreValue: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  notes: { fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  alertText: { fontSize: 12, marginTop: 4 },
  noData: { fontSize: 14, textAlign: 'center', marginTop: 20 },
  alertBanner: { borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1 },
  alertBannerText: { fontSize: 13, fontWeight: '500' },
  bodyMapHint: { fontSize: 12, marginBottom: 12 },
  bodyMapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  bodyMapArea: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, minWidth: 70, alignItems: 'center' },
  bodyMapAreaText: { fontSize: 11, fontWeight: '500' },
  bodyMapCount: { fontSize: 10 },
  areaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  areaChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  areaChipText: { fontSize: 11 },
  guideCard: { borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1 },
  guideTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  guideBody: { fontSize: 13, marginBottom: 8 },
  guideItem: { fontSize: 13, marginBottom: 4 },
  linkRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  linkCard: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  linkCardText: { fontSize: 13, fontWeight: '500' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  fieldLabel: { fontSize: 13, marginTop: 12, marginBottom: 6, fontWeight: '500' },
  input: { borderRadius: 8, padding: 12, fontSize: 14, borderWidth: 1 },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  scorePickerContainer: { marginBottom: 12 },
  pickerLabel: { fontSize: 13, color: '#9CA3AF', marginBottom: 6 },
  scorePickerRow: { flexDirection: 'row', gap: 8 },
  scoreBtn: { flex: 1, height: 44, borderRadius: 8, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#374151' },
  scoreBtnActive: { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' },
  scoreBtnText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  scoreBtnTextActive: { color: '#3B82F6' },
  areaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  areaToggle: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  areaToggleText: { fontSize: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 13 },
  questionText: { fontSize: 18, fontWeight: '500', marginBottom: 24, textAlign: 'center', lineHeight: 26 },
  answerRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  answerBtn: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 2, alignItems: 'center' },
  answerBtnText: { fontSize: 15, fontWeight: '600' },
  progressDots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  progressDot: { width: 8, height: 8, borderRadius: 4 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
