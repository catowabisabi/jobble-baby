import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const MS_READINESS_KEY = '@jobble/ms_readiness_checklist';
const TEXTURE_LADDER_KEY = '@jobble/texture_ladder_state';

// ── Types ────────────────────────────────────────────────────────────────────

interface ChecklistState {
  oral_motor: Record<string, boolean>;
  hand_mouth: Record<string, string | boolean>;
  sensory: Record<string, number | boolean>;
}

interface TextureLadderState {
  current_stage: number;
  achieved_dates: string[];
}

// ── Domain Data ───────────────────────────────────────────────────────────────

const ORAL_MOTOR_ITEMS = [
  { id: 'tongue_lateralization', label: 'tongueLateralization' },
  { id: 'munching_reflex', label: 'munchingReflex' },
  { id: 'accepts_spoon', label: 'acceptsSpoon' },
  { id: 'gag_reflex_normal', label: 'gagReflexNormal' },
];

const HAND_MOUTH_ITEMS = [
  { id: 'hand_to_mouth_frequency', label: 'handToMouthFrequency' },
  { id: 'pincer_grasp_emerged', label: 'pincerGraspEmerged' },
  { id: 'self_feeding_attempts', label: 'selfFeedingAttempts' },
];

const SENSORY_ITEMS = [
  { id: 'texture_tolerance_score', label: 'textureToleranceScore' },
  { id: 'new_taste_acceptances', label: 'newTasteAcceptances' },
  { id: 'mouthing_frequency', label: 'mouthingFrequency' },
];

const TEXTURE_LADDER_STAGES = [
  { stage: 1, icon: 'food', label: 'stageSmoothPuree' },
  { stage: 2, icon: 'food-variant', label: 'stageChunkyPuree' },
  { stage: 3, icon: 'cookie', label: 'stageSoftMeltables' },
  { stage: 4, icon: 'food-fork-drink', label: 'stageSoftSolids' },
  { stage: 5, icon: 'silverware-fork-knife', label: 'stageFamilyFoods' },
];

// Mock data for crossmodal chart (day -> acceptance speed 1-7)
const CROSSMODAL_DATA = [
  { day: 1, speed: 5 }, { day: 2, speed: 4 }, { day: 3, speed: 6 },
  { day: 4, speed: 3 }, { day: 5, speed: 7 }, { day: 6, speed: 4 },
  { day: 7, speed: 5 }, { day: 8, speed: 2 }, { day: 9, speed: 6 },
  { day: 10, speed: 3 }, { day: 11, speed: 7 }, { day: 12, speed: 4 },
  { day: 13, speed: 5 }, { day: 14, speed: 6 },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function calcDomainScore(items: { id: string }[], state: Record<string, boolean | string | number>): number {
  const keys = items.map(i => i.id);
  const vals = keys.map(k => state[k]);
  const bools = vals.filter(v => typeof v === 'boolean');
  if (bools.length === 0) return 0;
  const trueCount = bools.filter(v => v === true).length;
  return Math.round((trueCount / bools.length) * 100);
}

function calcHandMouthScore(state: Record<string, string | boolean>): number {
  const freq = state.hand_to_mouth_frequency;
  const freqScore = freq === 'high' ? 100 : freq === 'medium' ? 60 : freq === 'low' ? 30 : 0;
  const pincer = state.pincer_grasp_emerged === true ? 100 : 0;
  const selfFeed = state.self_feeding_attempts === true ? 100 : 0;
  return Math.round((freqScore * 0.4 + pincer * 0.3 + selfFeed * 0.3));
}

function calcSensoryScore(state: Record<string, number | boolean>): number {
  const texture = (state.texture_tolerance_score as number) || 1;
  const textureScore = Math.round(((texture - 1) / 4) * 100);
  const tastes = (state.new_taste_acceptances as number) || 0;
  const tasteScore = Math.min(tastes * 20, 100);
  const mouthing = state.mouthing_frequency === true ? 100 : 50;
  return Math.round(textureScore * 0.5 + tasteScore * 0.3 + mouthing * 0.2);
}

function calcComposite(oral: number, hand: number, sensory: number): number {
  return Math.round(oral * 0.35 + hand * 0.35 + sensory * 0.3);
}

function compositeColor(score: number, C: typeof COLORS.dark): string {
  if (score < 40) return '#EF4444';
  if (score <= 70) return '#F59E0B';
  return '#10B981';
}

function getBabyAgeMonths(birthdateStr: string | null): number {
  if (!birthdateStr) return 6; // default assumption
  try {
    const birth = new Date(birthdateStr);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    return Math.max(0, months);
  } catch {
    return 6;
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function FeedingReadinessNavigatorScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [checklist, setChecklist] = useState<ChecklistState>({
    oral_motor: { tongue_lateralization: false, munching_reflex: false, accepts_spoon: false, gag_reflex_normal: false },
    hand_mouth: { hand_to_mouth_frequency: 'low', pincer_grasp_emerged: false, self_feeding_attempts: false },
    sensory: { texture_tolerance_score: 1, new_taste_acceptances: 0, mouthing_frequency: false },
  });
  const [textureLadder, setTextureLadder] = useState<TextureLadderState>({ current_stage: 1, achieved_dates: [] });
  const [babyBirthdate, setBabyBirthdate] = useState<string | null>(null);

  // Load persisted data
  const loadData = useCallback(async () => {
    try {
      const [msRaw, ladderRaw, bdayRaw] = await Promise.all([
        safeGetItem(MS_READINESS_KEY),
        safeGetItem(TEXTURE_LADDER_KEY),
        safeGetItem(STORAGE_KEYS.BABY_BIRTHDATE),
      ]);
      if (msRaw) {
        const parsed = JSON.parse(msRaw) as Partial<ChecklistState>;
        setChecklist(prev => ({
          oral_motor: { ...prev.oral_motor, ...parsed.oral_motor },
          hand_mouth: { ...prev.hand_mouth, ...parsed.hand_mouth },
          sensory: { ...prev.sensory, ...parsed.sensory },
        }));
      }
      if (ladderRaw) setTextureLadder(JSON.parse(ladderRaw));
      if (bdayRaw) setBabyBirthdate(bdayRaw);
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Persist checklist
  const persistChecklist = useCallback(async (next: ChecklistState) => {
    setChecklist(next);
    await safeSetItem(MS_READINESS_KEY, JSON.stringify(next));
  }, []);

  // Toggle oral motor item
  const toggleOral = async (itemId: string) => {
    const next = { ...checklist, oral_motor: { ...checklist.oral_motor, [itemId]: !checklist.oral_motor[itemId] } };
    await persistChecklist(next);
  };

  // Toggle hand-mouth boolean
  const toggleHandMouthBool = async (itemId: string) => {
    const next = { ...checklist, hand_mouth: { ...checklist.hand_mouth, [itemId]: !checklist.hand_mouth[itemId] } };
    await persistChecklist(next);
  };

  // Set hand-to-mouth frequency
  const setHandMouthFreq = async (freq: 'low' | 'medium' | 'high') => {
    const next = { ...checklist, hand_mouth: { ...checklist.hand_mouth, hand_to_mouth_frequency: freq } };
    await persistChecklist(next);
  };

  // Set texture tolerance slider (1-5)
  const setTextureTolerance = async (val: number) => {
    const next = { ...checklist, sensory: { ...checklist.sensory, texture_tolerance_score: val } };
    await persistChecklist(next);
  };

  // Set new taste acceptances (0-5)
  const setNewTastes = async (val: number) => {
    const next = { ...checklist, sensory: { ...checklist.sensory, new_taste_acceptances: val } };
    await persistChecklist(next);
  };

  // Toggle mouthing frequency
  const toggleMouthing = async () => {
    const next = { ...checklist, sensory: { ...checklist.sensory, mouthing_frequency: !checklist.sensory.mouthing_frequency } };
    await persistChecklist(next);
  };

  // Tap texture ladder stage to log achievement
  const tapTextureStage = async (stage: number) => {
    if (stage > textureLadder.current_stage) {
      // Advance to this stage
      const achieved_dates = [...textureLadder.achieved_dates];
      if (achieved_dates.length < stage) {
        achieved_dates.push(new Date().toISOString().split('T')[0]);
      }
      const next: TextureLadderState = { current_stage: stage, achieved_dates };
      setTextureLadder(next);
      await safeSetItem(TEXTURE_LADDER_KEY, JSON.stringify(next));
    }
  };

  // Domain scores
  const oralScore = calcDomainScore(ORAL_MOTOR_ITEMS, checklist.oral_motor);
  const handScore = calcHandMouthScore(checklist.hand_mouth);
  const sensoryScore = calcSensoryScore(checklist.sensory);
  const composite = calcComposite(oralScore, handScore, sensoryScore);

  // Baby age & optimal window
  const babyMonths = getBabyAgeMonths(babyBirthdate);
  const windowOpen = babyMonths >= 4 && babyMonths <= 6;
  const windowClosing = babyMonths >= 7 && babyMonths <= 10;

  // ── Styles ─────────────────────────────────────────────────────────────────

  const S = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 16, paddingBottom: 100 },
    header: { marginBottom: 20 },
    greeting: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 24, fontWeight: '700', color: C.text, marginTop: 4 },
    card: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: C.border },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
    domainCard: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
    domainHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    domainTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    domainIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.accent + '20', alignItems: 'center', justifyContent: 'center' },
    domainName: { fontSize: 13, fontWeight: '600', color: C.text },
    scoreBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    scoreText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    checklistRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
    checklistLabel: { flex: 1, fontSize: 13, color: C.text },
    checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.accent, alignItems: 'center', justifyContent: 'center' },
    checkBoxFilled: { backgroundColor: C.accent },
    // Hand-mouth frequency selector
    freqRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    freqBtn: { flex: 1, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
    freqBtnActive: { borderColor: C.accent, backgroundColor: C.accent + '20' },
    freqBtnText: { fontSize: 11, color: C.muted, fontWeight: '500' },
    freqBtnTextActive: { color: C.text },
    // Texture slider
    sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    sliderTrack: { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3 },
    sliderFill: { height: 6, borderRadius: 3, backgroundColor: C.accent },
    sliderThumb: { fontSize: 16, color: C.accent },
    sliderValue: { fontSize: 13, fontWeight: '600', color: C.text, width: 20, textAlign: 'right' },
    // Crossmodal chart
    chartTitle: { fontSize: 14, fontWeight: '600', color: C.text, textAlign: 'center', marginBottom: 4 },
    chartSubtitle: { fontSize: 11, color: C.muted, textAlign: 'center', marginBottom: 16 },
    chartContainer: { height: 160, flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingHorizontal: 4 },
    chartBar: { flex: 1, backgroundColor: C.accent, borderRadius: 3, minHeight: 4 },
    chartXLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 4 },
    chartXLabel: { fontSize: 8, color: C.muted },
    chartYLabels: { position: 'absolute', left: 0, top: 0, bottom: 20, justifyContent: 'space-between', flexDirection: 'column-reverse' },
    chartYLabel: { fontSize: 8, color: C.muted },
    // Composite score
    compositeCard: { alignItems: 'center', paddingVertical: 24 },
    circleOuter: { width: 120, height: 120, borderRadius: 60, borderWidth: 8, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    circleScore: { fontSize: 36, fontWeight: '700', color: compositeColor(composite, C) },
    circleLabel: { fontSize: 10, color: C.muted, marginTop: 2 },
    subScores: { flexDirection: 'row', gap: 16, marginTop: 16 },
    subScoreItem: { alignItems: 'center' },
    subScoreValue: { fontSize: 16, fontWeight: '700', color: C.text },
    subScoreLabel: { fontSize: 10, color: C.muted, marginTop: 2 },
    belowThresholdMsg: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#EF444420', borderRadius: 8, borderWidth: 1, borderColor: '#EF4444' },
    belowThresholdText: { fontSize: 12, color: '#EF4444', textAlign: 'center' },
    // Optimal window
    windowCard: { alignItems: 'center', paddingVertical: 16 },
    windowIcon: { fontSize: 32, marginBottom: 8 },
    windowTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    windowSubtitle: { fontSize: 13, color: C.muted, marginTop: 4 },
    windowAlert: { marginTop: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
    alertIcon: { fontSize: 16 },
    alertText: { fontSize: 12, color: '#92400E', flex: 1 },
    // Texture ladder
    ladderContainer: { gap: 0 },
    ladderStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    ladderConnector: { width: 20, alignItems: 'center' },
    ladderLine: { width: 2, height: 24, backgroundColor: C.border },
    ladderLineDone: { backgroundColor: C.accent },
    ladderNode: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
    ladderNodeDone: { borderColor: C.accent, backgroundColor: C.accent + '20' },
    ladderNodeActive: { borderColor: C.accent, borderWidth: 3 },
    ladderContent: { flex: 1, marginLeft: 12 },
    ladderLabel: { fontSize: 13, fontWeight: '600', color: C.text },
    ladderDate: { fontSize: 11, color: C.muted, marginTop: 2 },
    sectionBadge: { fontSize: 10, fontWeight: '700', color: '#fff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  });

  const scoreIndicatorColor = (score: number) => {
    if (score < 40) return '#EF4444';
    if (score <= 70) return '#F59E0B';
    return '#10B981';
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <ScrollView style={S.container} contentContainerStyle={S.content}>
        {/* Header */}
        <View style={S.header}>
          <Text style={S.greeting}>{t('feedingReadiness.greeting')}</Text>
          <Text style={S.title}>🍼 {t('feedingNavigator.title')}</Text>
        </View>

        {/* ── Section A: Multisensory Readiness Checklist ── */}
        <View style={S.card}>
          <Text style={S.sectionTitle}>{t('feedingNavigator.sectionA')}</Text>

          {/* Oral Motor Domain */}
          <View style={S.domainCard}>
            <View style={S.domainHeader}>
              <View style={S.domainTitleRow}>
                <View style={S.domainIcon}>
                  <MaterialCommunityIcons name="emoticon-outline" size={14} color={C.accent} />
                </View>
                <Text style={S.domainName}>{t('feedingNavigator.oralMotor')}</Text>
              </View>
              <View style={[S.scoreBadge, { backgroundColor: scoreIndicatorColor(oralScore) }]}>
                <Text style={S.scoreText}>{oralScore}%</Text>
              </View>
            </View>
            {ORAL_MOTOR_ITEMS.map(item => (
              <TouchableOpacity key={item.id} style={S.checklistRow} onPress={() => toggleOral(item.id)}>
                <Text style={S.checklistLabel}>{t('feedingNavigator.' + item.label)}</Text>
                <View style={[S.checkBox, checklist.oral_motor[item.id] && S.checkBoxFilled]}>
                  {checklist.oral_motor[item.id] && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Hand-Mouth Domain */}
          <View style={S.domainCard}>
            <View style={S.domainHeader}>
              <View style={S.domainTitleRow}>
                <View style={S.domainIcon}>
                  <MaterialCommunityIcons name="hand-pointing-up" size={14} color={C.accent} />
                </View>
                <Text style={S.domainName}>{t('feedingNavigator.handMouth')}</Text>
              </View>
              <View style={[S.scoreBadge, { backgroundColor: scoreIndicatorColor(handScore) }]}>
                <Text style={S.scoreText}>{handScore}%</Text>
              </View>
            </View>

            {/* Frequency selector */}
            <View style={S.checklistRow}>
              <Text style={S.checklistLabel}>{t('feedingNavigator.handToMouthFrequency')}</Text>
            </View>
            <View style={S.freqRow}>
              {(['low', 'medium', 'high'] as const).map(f => (
                <TouchableOpacity key={f} style={[S.freqBtn, checklist.hand_mouth.hand_to_mouth_frequency === f && S.freqBtnActive]}
                  onPress={() => setHandMouthFreq(f)}>
                  <Text style={[S.freqBtnText, checklist.hand_mouth.hand_to_mouth_frequency === f && S.freqBtnTextActive]}>
                    {t('feedingNavigator.' + f)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {HAND_MOUTH_ITEMS.filter(i => i.id !== 'hand_to_mouth_frequency').map(item => (
              <TouchableOpacity key={item.id} style={S.checklistRow} onPress={() => toggleHandMouthBool(item.id)}>
                <Text style={S.checklistLabel}>{t('feedingNavigator.' + item.label)}</Text>
                <View style={[S.checkBox, checklist.hand_mouth[item.id] && S.checkBoxFilled]}>
                  {checklist.hand_mouth[item.id] && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sensory Domain */}
          <View style={S.domainCard}>
            <View style={S.domainHeader}>
              <View style={S.domainTitleRow}>
                <View style={S.domainIcon}>
                  <MaterialCommunityIcons name="hand-wave" size={14} color={C.accent} />
                </View>
                <Text style={S.domainName}>{t('feedingNavigator.sensory')}</Text>
              </View>
              <View style={[S.scoreBadge, { backgroundColor: scoreIndicatorColor(sensoryScore) }]}>
                <Text style={S.scoreText}>{sensoryScore}%</Text>
              </View>
            </View>

            {/* Texture tolerance slider (1-5) */}
            <View style={S.checklistRow}>
              <Text style={S.checklistLabel}>{t('feedingNavigator.textureTolerance')}</Text>
            </View>
            <View style={S.sliderRow}>
              {[1, 2, 3, 4, 5].map(v => (
                <TouchableOpacity key={v} style={{ flex: 1, alignItems: 'center' }} onPress={() => setTextureTolerance(v)}>
                  <Text style={S.sliderThumb}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={S.sliderRow}>
              <View style={S.sliderTrack}>
                <View style={[S.sliderFill, { width: `${((Number(checklist.sensory.texture_tolerance_score) - 1) / 4) * 100}%` }]} />
              </View>
            </View>

            {/* New taste acceptances (0-5 stepper) */}
            <View style={[S.checklistRow, { justifyContent: 'space-between' }]}>
              <Text style={S.checklistLabel}>{t('feedingNavigator.newTasteAcceptances')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity onPress={() => setNewTastes(Math.max(0, (checklist.sensory.new_taste_acceptances as number) - 1))}>
                  <MaterialCommunityIcons name="minus-circle" size={20} color={C.accent} />
                </TouchableOpacity>
                <Text style={S.sliderValue}>{checklist.sensory.new_taste_acceptances}</Text>
                <TouchableOpacity onPress={() => setNewTastes(Math.min(5, (checklist.sensory.new_taste_acceptances as number) + 1))}>
                  <MaterialCommunityIcons name="plus-circle" size={20} color={C.accent} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Mouthing frequency toggle */}
            <TouchableOpacity style={S.checklistRow} onPress={toggleMouthing}>
              <Text style={S.checklistLabel}>{t('feedingNavigator.mouthingFrequency')}</Text>
              <View style={[S.checkBox, checklist.sensory.mouthing_frequency ? S.checkBoxFilled : null]}>
                {checklist.sensory.mouthing_frequency && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Section B: Crossmodal Correlation View ── */}
        <View style={S.card}>
          <Text style={S.sectionTitle}>{t('feedingNavigator.sectionB')}</Text>
          <Text style={S.chartTitle}>{t('feedingNavigator.crossmodalQuestion')}</Text>
          <Text style={S.chartSubtitle}>{t('feedingNavigator.crossmodalSubtitle')}</Text>

          <View style={{ height: 180 }}>
            {/* Y-axis labels */}
            <View style={S.chartYLabels}>
              {[1, 3, 5, 7].map(v => (
                <Text key={v} style={S.chartYLabel}>{v}d</Text>
              ))}
            </View>
            <View style={{ flex: 1, marginLeft: 24 }}>
              {/* Chart bars */}
              <View style={S.chartContainer}>
                {CROSSMODAL_DATA.map(d => (
                  <View key={d.day} style={{ flex: 1, justifyContent: 'flex-end' }}>
                    <View style={[S.chartBar, { height: `${(d.speed / 7) * 100}%` }]} />
                  </View>
                ))}
              </View>
              {/* X-axis labels */}
              <View style={S.chartXLabels}>
                {[1, 7, 14].map(d => (
                  <Text key={d} style={S.chartXLabel}>Day {d}</Text>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* ── Section C: Readiness Composite Score ── */}
        <View style={S.card}>
          <Text style={S.sectionTitle}>{t('feedingNavigator.sectionC')}</Text>
          <View style={S.compositeCard}>
            <View style={[S.circleOuter, { borderColor: compositeColor(composite, C) }]}>
              <Text style={S.circleScore}>{composite}</Text>
              <Text style={S.circleLabel}>{t('feedingNavigator.compositeLabel')}</Text>
            </View>

            <View style={S.subScores}>
              <View style={S.subScoreItem}>
                <Text style={S.subScoreValue}>{oralScore}%</Text>
                <Text style={S.subScoreLabel}>{t('feedingNavigator.oralMotor')}</Text>
              </View>
              <View style={S.subScoreItem}>
                <Text style={S.subScoreValue}>{handScore}%</Text>
                <Text style={S.subScoreLabel}>{t('feedingNavigator.handMouth')}</Text>
              </View>
              <View style={S.subScoreItem}>
                <Text style={S.subScoreValue}>{sensoryScore}%</Text>
                <Text style={S.subScoreLabel}>{t('feedingNavigator.sensory')}</Text>
              </View>
            </View>

            {composite < 40 && (
              <View style={S.belowThresholdMsg}>
                <Text style={S.belowThresholdText}>{t('feedingNavigator.belowThreshold')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Section D: Optimal Window Predictor ── */}
        <View style={S.card}>
          <Text style={S.sectionTitle}>{t('feedingNavigator.sectionD')}</Text>
          <View style={S.windowCard}>
            <Text style={S.windowIcon}>🪟</Text>
            {windowOpen && (
              <>
                <Text style={S.windowTitle}>{t('feedingNavigator.windowOpen')}</Text>
                <Text style={S.windowSubtitle}>{t('feedingNavigator.windowOpenMonths')}</Text>
              </>
            )}
            {windowClosing && (
              <>
                <Text style={S.windowTitle}>{t('feedingNavigator.windowClosing')}</Text>
                <Text style={S.windowSubtitle}>{t('feedingNavigator.windowClosingMonths')}</Text>
              </>
            )}
            {!windowOpen && !windowClosing && (
              <>
                <Text style={S.windowTitle}>{t('feedingNavigator.windowUnknown')}</Text>
                <Text style={S.windowSubtitle}>{t('feedingNavigator.windowBabyAge', { age: babyMonths })}</Text>
              </>
            )}

            {windowClosing && (
              <View style={S.windowAlert}>
                <Text style={S.alertIcon}>⚠️</Text>
                <Text style={S.alertText}>{t('feedingNavigator.allergenWindowClosingAlert')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Section E: Texture Ladder Progress ── */}
        <View style={S.card}>
          <Text style={S.sectionTitle}>{t('feedingNavigator.sectionE')}</Text>
          <View style={S.ladderContainer}>
            {TEXTURE_LADDER_STAGES.map((stage, idx) => {
              const isDone = stage.stage < textureLadder.current_stage;
              const isActive = stage.stage === textureLadder.current_stage;
              const achievedDate = textureLadder.achieved_dates[stage.stage - 1];
              return (
                <View key={stage.stage} style={S.ladderStep}>
                  <View style={S.ladderConnector}>
                    {idx > 0 && (
                      <View style={[S.ladderLine, isDone && S.ladderLineDone, !isDone && idx >= textureLadder.current_stage && { backgroundColor: C.border }]} />
                    )}
                    <TouchableOpacity
                      style={[
                        S.ladderNode,
                        isDone && S.ladderNodeDone,
                        isActive && S.ladderNodeActive,
                      ]}
                      onPress={() => tapTextureStage(stage.stage)}
                    >
                      {isDone && <MaterialCommunityIcons name="check" size={14} color="#10B981" />}
                      {isActive && <MaterialCommunityIcons name={stage.icon as any} size={14} color={C.accent} />}
                      {!isDone && !isActive && <MaterialCommunityIcons name={stage.icon as any} size={14} color={C.muted} />}
                    </TouchableOpacity>
                  </View>
                  <View style={S.ladderContent}>
                    <Text style={S.ladderLabel}>{t('feedingNavigator.' + stage.label)}</Text>
                    {achievedDate && (
                      <Text style={S.ladderDate}>{t('feedingNavigator.achieved')}: {achievedDate}</Text>
                    )}
                    {isActive && (
                      <View style={[S.sectionBadge, { backgroundColor: C.accent }]}>
                        <Text style={{ color: '#fff', fontSize: 10 }}>{t('feedingNavigator.currentStage')}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
