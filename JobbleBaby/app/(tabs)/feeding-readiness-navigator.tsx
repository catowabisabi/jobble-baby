import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const NAVIGATOR_KEY = STORAGE_KEYS.FEEDING_READINESS_NAVIGATOR;

interface ChecklistState {
  oral: string[];
  handMouth: string[];
  sensory: { textureScore: number; newTastes: number; mouthing: 'low' | 'medium' | 'high' };
}

interface TextureState {
  currentStage: number;
  startedAt: string;
}

const ORAL_ITEMS = [
  { key: 'tongueLateralization', icon: ' TongueLateralization' },
  { key: 'munchingReflex', icon: 'MunchingReflex' },
  { key: 'acceptsSpoon', icon: 'AcceptsSpoon' },
  { key: 'gagReflexNormal', icon: 'GagReflexNormal' },
];

const HAND_MOUTH_ITEMS = [
  { key: 'pincerGraspEmerged', icon: 'PincerGraspEmerged' },
  { key: 'selfFeedingAttempts', icon: 'SelfFeedingAttempts' },
];

const TEXTURE_STAGES = [
  { stage: 1, labelKey: 'feedingReadinessMultisensor.sectionE.stage1', icon: 'baby', color: '#10B981' },
  { stage: 2, labelKey: 'feedingReadinessMultisensor.sectionE.stage2', icon: 'food-variant', color: '#10B981' },
  { stage: 3, labelKey: 'feedingReadinessMultisensor.sectionE.stage3', icon: 'cookie', color: '#F59E0B' },
  { stage: 4, labelKey: 'feedingReadinessMultisensor.sectionE.stage4', icon: 'bread-slice', color: '#F59E0B' },
  { stage: 5, labelKey: 'feedingReadinessMultisensor.sectionE.stage5', icon: 'silverware-fork-knife', color: '#EF4444' },
];

const MOCK_CROSSMODAL_DATA = [
  { day: 1, mouthing: 3, acceptance: 1 },
  { day: 2, mouthing: 4, acceptance: 1 },
  { day: 3, mouthing: 3, acceptance: 2 },
  { day: 4, mouthing: 5, acceptance: 2 },
  { day: 5, mouthing: 5, acceptance: 3 },
  { day: 6, mouthing: 6, acceptance: 3 },
  { day: 7, mouthing: 6, acceptance: 4 },
  { day: 8, mouthing: 7, acceptance: 4 },
  { day: 9, mouthing: 7, acceptance: 5 },
  { day: 10, mouthing: 8, acceptance: 5 },
  { day: 11, mouthing: 8, acceptance: 6 },
  { day: 12, mouthing: 9, acceptance: 6 },
  { day: 13, mouthing: 9, acceptance: 7 },
  { day: 14, mouthing: 10, acceptance: 7 },
];

const DEFAULT_CHECKLIST: ChecklistState = {
  oral: [],
  handMouth: [],
  sensory: { textureScore: 3, newTastes: 2, mouthing: 'medium' },
};

const DEFAULT_TEXTURE: TextureState = {
  currentStage: 1,
  startedAt: '2026-05-01',
};

export default function FeedingReadinessNavigatorScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];

  const [checklist, setChecklist] = useState<ChecklistState>(DEFAULT_CHECKLIST);
  const [textureState, setTextureState] = useState<TextureState>(DEFAULT_TEXTURE);

  useEffect(() => {
    safeGetItem(NAVIGATOR_KEY).then(s => {
      if (s) {
        try {
          const parsed = JSON.parse(s);
          if (parsed.checklist) setChecklist(parsed.checklist);
          if (parsed.texture) setTextureState(parsed.texture);
        } catch {}
      }
    });
  }, []);

  const saveState = useCallback(async (updated: Partial<{ checklist: ChecklistState; texture: TextureState }>) => {
    const next = {
      checklist: updated.checklist ?? checklist,
      texture: updated.texture ?? textureState,
    };
    await safeSetItem(NAVIGATOR_KEY, JSON.stringify(next));
    if (updated.checklist) setChecklist(updated.checklist);
    if (updated.texture) setTextureState(updated.texture);
  }, [checklist, textureState]);

  const toggleOral = useCallback((key: string) => {
    const next = checklist.oral.includes(key)
      ? checklist.oral.filter(k => k !== key)
      : [...checklist.oral, key];
    saveState({ checklist: { ...checklist, oral: next } });
  }, [checklist, saveState]);

  const toggleHandMouth = useCallback((key: string) => {
    const next = checklist.handMouth.includes(key)
      ? checklist.handMouth.filter(k => k !== key)
      : [...checklist.handMouth, key];
    saveState({ checklist: { ...checklist, handMouth: next } });
  }, [checklist, saveState]);

  const setSensoryField = useCallback((field: 'textureScore' | 'newTastes', val: number) => {
    saveState({ checklist: { ...checklist, sensory: { ...checklist.sensory, [field]: val } } });
  }, [checklist, saveState]);

  const setMouthing = useCallback((level: 'low' | 'medium' | 'high') => {
    saveState({ checklist: { ...checklist, sensory: { ...checklist.sensory, mouthing: level } } });
  }, [checklist, saveState]);

  const advanceTexture = useCallback(() => {
    if (textureState.currentStage < 5) {
      const next = { currentStage: textureState.currentStage + 1, startedAt: new Date().toISOString().split('T')[0] };
      saveState({ texture: next });
    }
  }, [textureState, saveState]);

  const oralScore = Math.round((checklist.oral.length / ORAL_ITEMS.length) * 100);
  const handMouthScore = Math.round((checklist.handMouth.length / HAND_MOUTH_ITEMS.length) * 100);
  const sensoryScore = Math.round(((checklist.sensory.textureScore / 5) * 40 + (checklist.sensory.newTastes / 5) * 30 + (checklist.sensory.mouthing === 'high' ? 30 : checklist.sensory.mouthing === 'medium' ? 15 : 0)) * 1);
  const compositeScore = Math.round((oralScore + handMouthScore + sensoryScore) / 3);

  const scoreColor = compositeScore < 40 ? '#EF4444' : compositeScore < 70 ? '#F59E0B' : '#10B981';
  const scoreLabel = compositeScore < 40
    ? t('feedingReadinessMultisensor.sectionC.red')
    : compositeScore < 70
      ? t('feedingReadinessMultisensor.sectionC.amber')
      : t('feedingReadinessMultisensor.sectionC.green');

  const CheckRow = ({ domain, items, selected }: { domain: string; items: { key: string; icon: string }[]; selected: string[] }) => (
    <View style={styles.checkGroup}>
      <Text style={[styles.domainLabel, { color: C.muted }]}>{t(`feedingReadinessMultisensor.sectionA.${domain}`)}</Text>
      {items.map(item => {
        const isChecked = selected.includes(item.key);
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.checkRow, { backgroundColor: isChecked ? `${C.accent}15` : 'transparent', borderColor: isChecked ? C.accent : C.border }]}
            onPress={() => domain === 'oralMotor' ? toggleOral(item.key) : toggleHandMouth(item.key)}
            accessibilityLabel={t(`feedingReadinessMultisensor.sectionA.${item.key}`)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isChecked }}
          >
            <MaterialCommunityIcons
              name={isChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={20}
              color={isChecked ? C.accent : C.muted}
            />
            <Text style={[styles.checkLabel, { color: C.text }]}>
              {t(`feedingReadinessMultisensor.sectionA.${item.key}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView style={[styles.container, { backgroundColor: C.background }]} contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={28} color={C.accent} />
          <Text style={[styles.title, { color: C.text }]}>{t('feedingReadinessMultisensor.title')}</Text>
          <Text style={[styles.subtitle, { color: C.muted }]}>{t('feedingReadinessMultisensor.subtitle')}</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('feedingReadinessMultisensor.sectionA.title')}</Text>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <CheckRow domain="oralMotor" items={ORAL_ITEMS} selected={checklist.oral} />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <CheckRow domain="handMouth" items={HAND_MOUTH_ITEMS} selected={checklist.handMouth} />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <Text style={[styles.domainLabel, { color: C.muted }]}>{t('feedingReadinessMultisensor.sectionA.sensory')}</Text>
          <View style={styles.sensoryRow}>
            <Text style={[styles.sensoryLabel, { color: C.text }]}>{t('feedingReadinessMultisensor.sectionA.textureToleranceScore')}</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setSensoryField('textureScore', n)} accessibilityLabel={`${t('feedingReadinessMultisensor.sectionA.textureToleranceScore')} ${n}`} accessibilityRole="button">
                  <MaterialCommunityIcons name={n <= checklist.sensory.textureScore ? 'star' : 'star-outline'} size={24} color={n <= checklist.sensory.textureScore ? '#F59E0B' : C.muted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.sensoryRow}>
            <Text style={[styles.sensoryLabel, { color: C.text }]}>{t('feedingReadinessMultisensor.sectionA.newTasteAcceptances')}</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity style={[styles.counterBtn, { backgroundColor: C.accent }]} onPress={() => setSensoryField('newTastes', Math.max(0, checklist.sensory.newTastes - 1))} accessibilityLabel={t('feedingReadinessMultisensor.sectionA.newTasteAcceptances') + ' decrease'} accessibilityRole="button">
                <MaterialCommunityIcons name="minus" size={18} color="#fff" />
              </TouchableOpacity>
              <Text style={[styles.counterNum, { color: C.text }]}>{checklist.sensory.newTastes}</Text>
              <TouchableOpacity style={[styles.counterBtn, { backgroundColor: C.accent }]} onPress={() => setSensoryField('newTastes', checklist.sensory.newTastes + 1)} accessibilityLabel={t('feedingReadinessMultisensor.sectionA.newTasteAcceptances') + ' increase'} accessibilityRole="button">
                <MaterialCommunityIcons name="plus" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.sensoryLabel, { color: C.text, marginTop: 8 }]}>{t('feedingReadinessMultisensor.sectionA.mouthingFrequency')}</Text>
          <View style={styles.toggleRow}>
            {(['low', 'medium', 'high'] as const).map(level => (
              <TouchableOpacity
                key={level}
                style={[styles.togglePill, { backgroundColor: checklist.sensory.mouthing === level ? C.accent : `${C.accent}20`, borderColor: C.accent }]}
                onPress={() => setMouthing(level)}
              >
                <Text style={[styles.toggleText, { color: checklist.sensory.mouthing === level ? '#fff' : C.accent }]}>
                  {t(`feedingReadinessMultisensor.sectionA.handToMouthFrequency${level.charAt(0).toUpperCase() + level.slice(1)}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('feedingReadinessMultisensor.sectionB.title')}</Text>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={[styles.legendText, { color: C.muted }]}>{t('feedingReadinessMultisensor.sectionB.axisX')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.legendText, { color: C.muted }]}>{t('feedingReadinessMultisensor.sectionB.axisY')}</Text>
            </View>
          </View>
          <View style={styles.barChart}>
            {MOCK_CROSSMODAL_DATA.map(d => (
              <View key={d.day} style={styles.barGroup}>
                <View style={styles.barSlot}>
                  <View style={[styles.bar, { height: d.mouthing * 6, backgroundColor: '#3B82F6' }]} />
                  <View style={[styles.bar, { height: d.acceptance * 6, backgroundColor: '#10B981' }]} />
                </View>
                <Text style={[styles.barLabel, { color: C.muted }]}>{d.day}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.mockNote, { color: C.muted }]}>{t('feedingReadinessMultisensor.sectionB.mockLabel')}</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('feedingReadinessMultisensor.sectionC.title')}</Text>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.gaugeContainer}>
            <View style={[styles.gaugeCircle, { borderColor: scoreColor }]}>
              <Text style={[styles.gaugeScore, { color: scoreColor }]}>{compositeScore}</Text>
              <Text style={[styles.gaugeLabel, { color: C.muted }]}>{scoreLabel}</Text>
            </View>
          </View>
          <View style={styles.subScores}>
            <View style={styles.subScoreRow}>
              <Text style={[styles.subScoreLabel, { color: C.text }]}>{t('feedingReadinessMultisensor.sectionC.oralMotorScore')}</Text>
              <View style={[styles.subScoreBar, { backgroundColor: C.border }]}>
                <View style={[styles.subScoreFill, { width: `${oralScore}%`, backgroundColor: '#3B82F6' }]} />
              </View>
              <Text style={[styles.subScoreNum, { color: C.muted }]}>{oralScore}%</Text>
            </View>
            <View style={styles.subScoreRow}>
              <Text style={[styles.subScoreLabel, { color: C.text }]}>{t('feedingReadinessMultisensor.sectionC.handMouthScore')}</Text>
              <View style={[styles.subScoreBar, { backgroundColor: C.border }]}>
                <View style={[styles.subScoreFill, { width: `${handMouthScore}%`, backgroundColor: '#10B981' }]} />
              </View>
              <Text style={[styles.subScoreNum, { color: C.muted }]}>{handMouthScore}%</Text>
            </View>
            <View style={styles.subScoreRow}>
              <Text style={[styles.subScoreLabel, { color: C.text }]}>{t('feedingReadinessMultisensor.sectionC.sensoryScore')}</Text>
              <View style={[styles.subScoreBar, { backgroundColor: C.border }]}>
                <View style={[styles.subScoreFill, { width: `${sensoryScore}%`, backgroundColor: '#F59E0B' }]} />
              </View>
              <Text style={[styles.subScoreNum, { color: C.muted }]}>{sensoryScore}%</Text>
            </View>
          </View>
          {compositeScore < 40 ? (
            <Text style={[styles.thresholdMsg, { color: '#EF4444' }]}>{t('feedingReadinessMultisensor.sectionC.thresholdMessage')}</Text>
          ) : null}
        </View>

        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('feedingReadinessMultisensor.sectionD.title')}</Text>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={[styles.windowCard, { backgroundColor: `${C.accent}15`, borderColor: C.accent }]}>
            <MaterialCommunityIcons name="calendar-check" size={24} color={C.accent} />
            <Text style={[styles.windowText, { color: C.text }]}>6.5 – 8 months</Text>
            <Text style={[styles.windowSubtext, { color: C.muted }]}>{t('feedingReadinessMultisensor.sectionD.basedOn')}</Text>
          </View>
          <View style={styles.timeline}>
            <View style={styles.timelineDot}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.dotLabel, { color: C.muted }]}>4 mo</Text>
            </View>
            <View style={[styles.timelineLine, { backgroundColor: '#10B981' }]} />
            <View style={styles.timelineDot}>
              <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
              <Text style={[styles.dotLabel, { color: C.muted }]}>6 mo</Text>
            </View>
            <View style={[styles.timelineLineActive, { backgroundColor: '#3B82F6' }]} />
            <View style={styles.timelineDot}>
              <View style={[styles.dotActive, { backgroundColor: C.accent }]} />
              <Text style={[styles.dotLabelActive, { color: C.accent }]}>Now</Text>
            </View>
            <View style={[styles.timelineLine, { backgroundColor: C.border }]} />
            <View style={styles.timelineDot}>
              <View style={[styles.dot, { backgroundColor: C.border }]} />
              <Text style={[styles.dotLabel, { color: C.muted }]}>8 mo</Text>
            </View>
          </View>
          <Text style={[styles.currentAge, { color: C.muted }]}>{t('feedingReadinessMultisensor.sectionE.currentAge', { months: '6' })}</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('feedingReadinessMultisensor.sectionE.title')}</Text>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {TEXTURE_STAGES.map((s, i) => {
            const isCurrent = s.stage === textureState.currentStage;
            const isPast = s.stage < textureState.currentStage;
            const isFuture = s.stage > textureState.currentStage;
            return (
              <View key={s.stage}>
                {i > 0 ? (
                  <View style={[styles.ladderConnector, { backgroundColor: isPast ? s.color : C.border }]} />
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.ladderRow,
                    {
                      backgroundColor: isCurrent ? `${s.color}15` : 'transparent',
                      borderColor: isCurrent ? s.color : C.border,
                    }
                  ]}
                  onPress={isCurrent ? advanceTexture : undefined}
                  accessibilityLabel={t(s.labelKey)}
                  accessibilityRole="button"
                  disabled={!isCurrent}
                >
                  <View style={[styles.ladderIcon, { backgroundColor: isPast || isCurrent ? s.color : C.border }]}>
                    <MaterialCommunityIcons
                      name={s.icon as any}
                      size={18}
                      color={isPast || isCurrent ? '#fff' : C.muted}
                    />
                  </View>
                  <View style={styles.ladderContent}>
                    <Text style={[styles.ladderStage, { color: isFuture ? C.muted : C.text }]}>
                      {t(s.labelKey)}
                    </Text>
                    {isCurrent ? (
                      <View style={[styles.currentBadge, { backgroundColor: s.color }]}>
                        <Text style={styles.currentBadgeText}>{t('feedingReadinessMultisensor.sectionE.currentStage')}</Text>
                      </View>
                    ) : isPast ? (
                      <View style={[styles.currentBadge, { backgroundColor: '#10B981' }]}>
                        <Text style={styles.currentBadgeText}>{t('feedingReadinessMultisensor.sectionE.completed')}</Text>
                      </View>
                    ) : null}
                    {isCurrent ? (
                      <Text style={[styles.tapHint, { color: C.muted }]}>{t('feedingReadinessMultisensor.sectionE.tapToLog')}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 24, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  subtitle: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, marginTop: 8 },
  card: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 16 },
  checkGroup: { marginBottom: 12 },
  domainLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  checkRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 6,
  },
  checkLabel: { fontSize: 14, marginLeft: 8, flex: 1 },
  divider: { height: 1, marginVertical: 12 },
  sensoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sensoryLabel: { fontSize: 14, flex: 1 },
  starRow: { flexDirection: 'row', gap: 2 },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  counterNum: { fontSize: 16, fontWeight: '600', minWidth: 20, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  togglePill: { flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center', borderWidth: 1 },
  toggleText: { fontSize: 12, fontWeight: '600' },
  chartLegend: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11 },
  barChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80, marginBottom: 8 },
  barGroup: { alignItems: 'center', flex: 1 },
  barSlot: { alignItems: 'center', gap: 2 },
  bar: { width: 8, borderRadius: 4 },
  barLabel: { fontSize: 9, marginTop: 2 },
  mockNote: { fontSize: 11, textAlign: 'center', fontStyle: 'italic' },
  gaugeContainer: { alignItems: 'center', marginBottom: 16 },
  gaugeCircle: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 8, alignItems: 'center', justifyContent: 'center',
  },
  gaugeScore: { fontSize: 36, fontWeight: '700' },
  gaugeLabel: { fontSize: 12 },
  subScores: { gap: 12 },
  subScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subScoreLabel: { fontSize: 13, width: 100 },
  subScoreBar: { flex: 1, height: 8, borderRadius: 4 },
  subScoreFill: { height: 8, borderRadius: 4 },
  subScoreNum: { fontSize: 12, width: 36, textAlign: 'right' },
  thresholdMsg: { fontSize: 12, marginTop: 12, textAlign: 'center', fontStyle: 'italic' },
  windowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  windowText: { fontSize: 18, fontWeight: '700' },
  windowSubtext: { fontSize: 12 },
  timeline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  timelineDot: { alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotActive: { width: 14, height: 14, borderRadius: 7 },
  dotLabel: { fontSize: 10, marginTop: 4 },
  dotLabelActive: { fontSize: 10, fontWeight: '600', marginTop: 4 },
  timelineLine: { width: 32, height: 2 },
  timelineLineActive: { width: 32, height: 2, backgroundColor: '#3B82F6' },
  currentAge: { fontSize: 12, textAlign: 'center' },
  ladderConnector: { width: 2, height: 8, alignSelf: 'center', marginBottom: -4 },
  ladderRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 4,
  },
  ladderIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ladderContent: { flex: 1, marginLeft: 12, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  ladderStage: { fontSize: 14, fontWeight: '500' },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  currentBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  tapHint: { fontSize: 11, fontStyle: 'italic' },
});
