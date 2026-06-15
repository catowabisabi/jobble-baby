import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { awardBadge } from '../utils/badgeService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { STORAGE_KEYS } from '../../store/storage-keys';

const MICROBIOME_KEY = STORAGE_KEYS.MICROBIOME_LOG;
const GUT_SYMPTOMS_KEY = STORAGE_KEYS.GUT_SYMPTOMS;
const TRACKING_KEY = STORAGE_KEYS.TRACKING_ENTRIES;
const CRY_KEY = STORAGE_KEYS.CRY_ENTRIES;
const PROFILE_KEY = '@jobble_baby_profile';

type BabyProfile = { name: string; birthDate: string; gender: 'boy' | 'girl' | 'prefer_not_to_say' };
type FeedingMethod = 'bf_direct' | 'bf_pumped' | 'formula' | 'mixed';
type FlowRate = 'slow' | 'medium' | 'fast';
type StoolConsistency = 'watery' | 'soft' | 'formed';

interface MicrobiomeEntry {
  id: string;
  date: string;
  feeding_method: FeedingMethod;
  skin_to_skin_minutes: number;
  probiotic_drops: boolean;
  prebiotic_grams: number;
  flow_rate?: FlowRate;
}

interface GutSymptom {
  id: string;
  date: string;
  stool_frequency: number;
  stool_consistency: StoolConsistency;
  gas_severity: 1 | 2 | 3 | 4 | 5;
  reflux_episodes: number;
}

const FEEDING_METHODS: { key: FeedingMethod; labelKey: string }[] = [
  { key: 'bf_direct', labelKey: 'gutBrainAxis.bfDirect' },
  { key: 'bf_pumped', labelKey: 'gutBrainAxis.bfPumped' },
  { key: 'formula', labelKey: 'gutBrainAxis.formula' },
  { key: 'mixed', labelKey: 'gutBrainAxis.mixed' },
];

const FLOW_RATES: { key: FlowRate; labelKey: string }[] = [
  { key: 'slow', labelKey: 'gutBrainAxis.slow' },
  { key: 'medium', labelKey: 'gutBrainAxis.medium' },
  { key: 'fast', labelKey: 'gutBrainAxis.fast' },
];

const STOOL_CONSISTENCIES: { key: StoolConsistency; labelKey: string }[] = [
  { key: 'watery', labelKey: 'gutBrainAxis.watery' },
  { key: 'soft', labelKey: 'gutBrainAxis.soft' },
  { key: 'formed', labelKey: 'gutBrainAxis.formed' },
];

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
const getDateStr = () => new Date().toISOString().split('T')[0];

const FEEDING_LABELS: Record<FeedingMethod, string> = {
  bf_direct: 'Direct BF',
  bf_pumped: 'Pumped BF',
  formula: 'Formula',
  mixed: 'Mixed',
};

const STOOL_LABELS: Record<StoolConsistency, string> = {
  watery: 'Watery',
  soft: 'Soft',
  formed: 'Formed',
};

function calcGutScore(entry: MicrobiomeEntry | null, symptom: GutSymptom | null, feedingDiversity: boolean): number {
  if (!entry && !symptom) return 0;
  let score = 0;

  // Stool frequency: 2-4/day = 25, else 15
  const sf = symptom?.stool_frequency ?? 0;
  score += (sf >= 2 && sf <= 4) ? 25 : 15;

  // Stool consistency: soft=25, formed=20, watery=5
  const sc = symptom?.stool_consistency ?? 'soft';
  score += sc === 'soft' ? 25 : sc === 'formed' ? 20 : 5;

  // Gas severity: 1=25, 2=20, 3=15, 4=10, 5=5
  const gas = symptom?.gas_severity ?? 3;
  const gasScores: Record<number, number> = { 1: 25, 2: 20, 3: 15, 4: 10, 5: 5 };
  score += gasScores[gas] ?? 15;

  // Reflux: 0=25, 1=20, 2=15, 3=10, 4+=5
  const reflux = symptom?.reflux_episodes ?? 0;
  const refluxScores: Record<number, number> = { 0: 25, 1: 20, 2: 15, 3: 10 };
  score += refluxScores[reflux] ?? 5;

  // Feeding diversity: yes=25, no=15
  score += feedingDiversity ? 25 : 15;

  return Math.min(100, score);
}

function getGutScoreColor(score: number): string {
  if (score <= 30) return '#e74c3c';
  if (score <= 70) return '#f1c40f';
  return '#2ecc71';
}

function getInsight(microbiome: MicrobiomeEntry[], symptoms: GutSymptom[], sleepData: { date: string; totalMinutes: number }[], cryData: { date: string; totalMinutes: number }[]): { text: string; type: 'positive' | 'neutral' | 'warning' } | null {
  if (microbiome.length < 3) return null;

  const recentMicro = microbiome.slice(-7);
  const recentSymptoms = symptoms.slice(-7);

  // Check skin-to-skin correlation
  const avgSTS = recentMicro.reduce((s, e) => s + e.skin_to_skin_minutes, 0) / recentMicro.length;
  if (avgSTS >= 30) {
    return { text: 'skin_to_skin_high', type: 'positive' };
  }

  // Check formula correlation with gas
  const formulaDays = recentMicro.filter(e => e.feeding_method === 'formula');
  if (formulaDays.length >= 3) {
    const avgGas = recentSymptoms.length > 0
      ? recentSymptoms.reduce((s, e) => s + e.gas_severity, 0) / recentSymptoms.length
      : 0;
    if (avgGas >= 3) {
      return { text: 'formula_gas_warning', type: 'warning' };
    }
  }

  return null;
}

export default function GutBrainAxis() {
  const [microbiome, setMicrobiome] = useState<MicrobiomeEntry[]>([]);
  const [symptoms, setSymptoms] = useState<GutSymptom[]>([]);
  const [tracking, setTracking] = useState<any[]>([]);
  const [cryEntries, setCryEntries] = useState<any[]>([]);
  const [profile, setProfile] = useState<BabyProfile | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [logTab, setLogTab] = useState<'feeding' | 'symptoms'>('feeding');
  const [newBadges, setNewBadges] = useState<any[]>([]);
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  // Form state
  const [feedingMethod, setFeedingMethod] = useState<FeedingMethod>('bf_direct');
  const [skinToSkin, setSkinToSkin] = useState(0);
  const [probiotic, setProbiotic] = useState(false);
  const [prebiotic, setPrebiotic] = useState(0);
  const [flowRate, setFlowRate] = useState<FlowRate>('medium');
  const [stoolFreq, setStoolFreq] = useState(3);
  const [stoolConsistency, setStoolConsistency] = useState<StoolConsistency>('soft');
  const [gasSeverity, setGasSeverity] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [refluxEpisodes, setRefluxEpisodes] = useState(0);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [mbRaw, symRaw, trackRaw, cryRaw, profRaw] = await Promise.all([
        safeGetItem(MICROBIOME_KEY),
        safeGetItem(GUT_SYMPTOMS_KEY),
        safeGetItem(TRACKING_KEY),
        safeGetItem(CRY_KEY),
        safeGetItem(PROFILE_KEY),
      ]);
      if (mbRaw) setMicrobiome(JSON.parse(mbRaw));
      if (symRaw) setSymptoms(JSON.parse(symRaw));
      if (trackRaw) setTracking(JSON.parse(trackRaw));
      if (cryRaw) setCryEntries(JSON.parse(cryRaw));
      if (profRaw) setProfile(JSON.parse(profRaw));
    } catch (e) { /* silently fail */ }
  };

  const saveFeedingLog = async () => {
    const entry: MicrobiomeEntry = {
      id: generateId(), date: getDateStr(), feeding_method: feedingMethod,
      skin_to_skin_minutes: skinToSkin, probiotic_drops: probiotic,
      prebiotic_grams: prebiotic, flow_rate: flowRate,
    };
    const updated = [...microbiome.filter(e => e.date !== getDateStr()), entry];
    await safeSetItem(MICROBIOME_KEY, JSON.stringify(updated));
    setMicrobiome(updated);
    checkBadge(updated);
    setModalVisible(false);
  };

  const saveGutSymptoms = async () => {
    const entry: GutSymptom = {
      id: generateId(), date: getDateStr(), stool_frequency: stoolFreq,
      stool_consistency: stoolConsistency, gas_severity: gasSeverity,
      reflux_episodes: refluxEpisodes,
    };
    const updated = [...symptoms.filter(e => e.date !== getDateStr()), entry];
    await safeSetItem(GUT_SYMPTOMS_KEY, JSON.stringify(updated));
    setSymptoms(updated);
    setModalVisible(false);
  };

  const checkBadge = async (mbData: MicrobiomeEntry[]) => {
    const dates = [...new Set(mbData.map(e => e.date))].sort();
    if (dates.length >= 14) {
      const badge = { id: 'gut_guardian', name: t('gutBrainAxis.badgeName'), description: t('gutBrainAxis.badgeDesc'), icon: '🌱' };
      await awardBadge('gut_guardian');
      setNewBadges(prev => [...prev, badge]);
    }
  };

  // Today's data
  const today = getDateStr();
  const todayMicro = microbiome.find(e => e.date === today);
  const todaySymptom = symptoms.find(e => e.date === today);

  // Feeding diversity (BF+pumping+formula in same week)
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekAgo); d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
  const weekMicro = microbiome.filter(e => weekDates.includes(e.date));
  const feedingMethodsThisWeek = new Set(weekMicro.map(e => e.feeding_method));
  const feedingDiversity = feedingMethodsThisWeek.size >= 3;

  const gutScore = calcGutScore(todayMicro ?? null, todaySymptom ?? null, feedingDiversity);

  // Sleep data for correlation
  const sleepByDate: Record<string, number> = {};
  tracking.forEach((e: any) => {
    if (e.type === 'sleep') {
      sleepByDate[e.date] = (sleepByDate[e.date] || 0) + (e.duration_minutes || 0);
    }
  });

  // Cry data for correlation
  const cryByDate: Record<string, number> = {};
  cryEntries.forEach((e: any) => {
    const d = e.timestamp?.split('T')[0] || e.date;
    cryByDate[d] = (cryByDate[d] || 0) + (e.duration_minutes || 0);
  });

  // Insight
  const insight = getInsight(microbiome, symptoms,
    Object.entries(sleepByDate).map(([date, totalMinutes]) => ({ date, totalMinutes })),
    Object.entries(cryByDate).map(([date, totalMinutes]) => ({ date, totalMinutes }))
  );

  // 7-day gut scores
  const sevenDayScores = weekDates.map(date => {
    const mb = microbiome.find(e => e.date === date);
    const sym = symptoms.find(e => e.date === date);
    const wm = microbiome.filter(e => weekDates.includes(e.date) && e.date <= date).map(e => e.feeding_method);
    const fd = new Set(wm).size >= 3;
    return { date, score: calcGutScore(mb ?? null, sym ?? null, fd) };
  });

  const scoreColor = getGutScoreColor(gutScore);

  // History
  const historyItems = [...microbiome, ...symptoms]
    .map(e => ({ ...e, _sortDate: e.date }))
    .filter((e, i, arr) => arr.findIndex(a => a.date === e.date) === i)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);

  const getInsightText = (key: string) => {
    const map: Record<string, { en: string; zh: string }> = {
      skin_to_skin_high: { en: 'High skin-to-skin contact correlates with better gut health scores this week', zh: '高頻肌膚接觸與本週腸道健康分數改善相關' },
      formula_gas_warning: { en: 'Formula feeding days show elevated gas — consider paced feeding technique', zh: '配方奶餵養日排氣較多 — 建議嘗試節奏式餵奶' },
    };
    return t(map[key]?.en ? `gutBrainAxis.${key}` : key) || map[key]?.[effectiveTheme === 'dark' ? 'en' : 'zh'] || key;
  };

  const renderInsightCard = () => {
    if (!insight) return null;
    const colors = { positive: '#2ecc71', neutral: '#f1c40f', warning: '#e74c3c' };
    return (
      <View style={[styles.insightCard, { backgroundColor: colors[insight.type] + '20', borderColor: colors[insight.type] }]}>
        <MaterialCommunityIcons name={insight.type === 'positive' ? 'leaf' : insight.type === 'warning' ? 'alert' : 'information'} size={18} color={colors[insight.type]} />
        <Text style={[styles.insightText, { color: colors[insight.type] }]}>{getInsightText(insight.text)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: C.text }]}>{t('gutBrainAxis.title')}</Text>
          <Text style={[styles.headerSub, { color: C.muted }]}>{t('gutBrainAxis.subtitle')}</Text>
        </View>

        {/* Gut Health Gauge */}
        <View style={[styles.gaugeCard, { backgroundColor: C.card }]}>
          <Text style={[styles.cardLabel, { color: C.muted }]}>{t('gutBrainAxis.gutHealthGauge')}</Text>
          <View style={styles.gaugeContainer}>
            <View style={[styles.gaugeCircle, { borderColor: scoreColor }]}>
              <Text style={[styles.gaugeScore, { color: scoreColor }]}>{gutScore}</Text>
              <Text style={[styles.gaugeLabel, { color: C.muted }]}>/100</Text>
            </View>
            <View style={styles.gaugeBar}>
              <View style={[styles.gaugeBarFill, { backgroundColor: '#e74c3c', width: '30%' }]} />
              <View style={[styles.gaugeBarFill, { backgroundColor: '#f1c40f', width: '40%' }]} />
              <View style={[styles.gaugeBarFill, { backgroundColor: '#2ecc71', width: '30%' }]} />
            </View>
            <View style={styles.gaugeLegend}>
              <Text style={[styles.legendText, { color: '#e74c3c' }]}>0-30</Text>
              <Text style={[styles.legendText, { color: '#f1c40f' }]}>31-70</Text>
              <Text style={[styles.legendText, { color: '#2ecc71' }]}>71-100</Text>
            </View>
          </View>
        </View>

        {/* Insight Card */}
        {renderInsightCard()}

        {/* Correlation Mini Charts */}
        <View style={[styles.correlationCard, { backgroundColor: C.card }]}>
          <Text style={[styles.cardLabel, { color: C.muted }]}>{t('gutBrainAxis.correlation')}</Text>
          <View style={styles.correlationGrid}>
            <View style={styles.correlationCell}>
              <Text style={[styles.correlationTitle, { color: C.text }]}>{t('gutBrainAxis.sleepVsGut')}</Text>
              <View style={styles.miniScatter}>
                {sevenDayScores.slice(-7).map((s, i) => (
                  <View key={i} style={[styles.scatterDot, { backgroundColor: getGutScoreColor(s.score), opacity: 0.7 }]} />
                ))}
              </View>
            </View>
            <View style={styles.correlationCell}>
              <Text style={[styles.correlationTitle, { color: C.text }]}>{t('gutBrainAxis.cryVsFeeding')}</Text>
              <View style={styles.miniBarRow}>
                {(['bf_direct', 'bf_pumped', 'formula', 'mixed'] as FeedingMethod[]).map(method => {
                  const days = microbiome.filter(e => e.feeding_method === method && weekDates.includes(e.date)).length;
                  return (
                    <View key={method} style={styles.miniBarCol}>
                      <View style={[styles.miniBar, { height: Math.max(4, days * 6), backgroundColor: C.accent }]} />
                      <Text style={[styles.miniBarLabel, { color: C.muted }]}>{FEEDING_LABELS[method].split(' ')[0]}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* Today's Summary */}
        {(todayMicro || todaySymptom) && (
          <View style={[styles.todayCard, { backgroundColor: C.card }]}>
            <Text style={[styles.cardLabel, { color: C.muted }]}>{t('gutBrainAxis.todaySummary')}</Text>
            <View style={styles.todayGrid}>
              {todayMicro && (
                <>
                  <View style={styles.todayItem}>
                    <MaterialCommunityIcons name="human-child" size={16} color={C.accent} />
                    <Text style={[styles.todayValue, { color: C.text }]}>{todayMicro.skin_to_skin_minutes}m</Text>
                    <Text style={[styles.todayLabel, { color: C.muted }]}>{t('gutBrainAxis.skinToSkin')}</Text>
                  </View>
                  <View style={styles.todayItem}>
                    <MaterialCommunityIcons name="food" size={16} color={C.accent} />
                    <Text style={[styles.todayValue, { color: C.text }]}>{FEEDING_LABELS[todayMicro.feeding_method]}</Text>
                    <Text style={[styles.todayLabel, { color: C.muted }]}>{t('gutBrainAxis.feedingMethod')}</Text>
                  </View>
                  {todayMicro.probiotic_drops && (
                    <View style={styles.todayItem}>
                      <MaterialCommunityIcons name="leaf" size={16} color="#2ecc71" />
                      <Text style={[styles.todayValue, { color: C.text }]}>✓</Text>
                      <Text style={[styles.todayLabel, { color: C.muted }]}>{t('gutBrainAxis.probiotic')}</Text>
                    </View>
                  )}
                </>
              )}
              {todaySymptom && (
                <>
                  <View style={styles.todayItem}>
                    <MaterialCommunityIcons name="emoticon-outline" size={16} color={C.accent} />
                    <Text style={[styles.todayValue, { color: C.text }]}>{todaySymptom.stool_frequency}x</Text>
                    <Text style={[styles.todayLabel, { color: C.muted }]}>{t('gutBrainAxis.stoolFreq')}</Text>
                  </View>
                  <View style={styles.todayItem}>
                    <MaterialCommunityIcons name="cloud-outline" size={16} color={C.accent} />
                    <Text style={[styles.todayValue, { color: C.text }]}>{STOOL_LABELS[todaySymptom.stool_consistency]}</Text>
                    <Text style={[styles.todayLabel, { color: C.muted }]}>{t('gutBrainAxis.stoolConsistency')}</Text>
                  </View>
                  <View style={styles.todayItem}>
                    <MaterialCommunityIcons name="weather-windy" size={16} color={C.accent} />
                    <Text style={[styles.todayValue, { color: C.text }]}>{todaySymptom.gas_severity}/5</Text>
                    <Text style={[styles.todayLabel, { color: C.muted }]}>{t('gutBrainAxis.gasSeverity')}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* 7-Day Gut Score Timeline */}
        <View style={[styles.timelineCard, { backgroundColor: C.card }]}>
          <Text style={[styles.cardLabel, { color: C.muted }]}>{t('gutBrainAxis.weeklyGutScore')}</Text>
          <View style={styles.timelineRow}>
            {sevenDayScores.map((s, i) => {
              const dayLabel = new Date(s.date).toLocaleDateString('en', { weekday: 'short' }).slice(0, 2);
              return (
                <View key={i} style={styles.timelineDay}>
                  <View style={[styles.timelineBar, { height: Math.max(8, s.score * 0.6), backgroundColor: getGutScoreColor(s.score) }]} />
                  <Text style={[styles.timelineLabel, { color: C.muted }]}>{dayLabel}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* History */}
        <View style={[styles.historyCard, { backgroundColor: C.card }]}>
          <Text style={[styles.cardLabel, { color: C.muted }]}>{t('gutBrainAxis.history')}</Text>
          {historyItems.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.muted }]}>{t('gutBrainAxis.noDataYet')}</Text>
          ) : (
            historyItems.slice(0, 14).map((item: any) => {
              const isMicrobiome = 'feeding_method' in item;
              const score = calcGutScore(
                isMicrobiome ? item as MicrobiomeEntry : null,
                !isMicrobiome ? item as GutSymptom : null,
                false
              );
              return (
                <View key={item.id} style={styles.historyRow}>
                  <Text style={[styles.historyDate, { color: C.muted }]}>{item.date}</Text>
                  {isMicrobiome && <Text style={[styles.historyValue, { color: C.text }]}>{FEEDING_LABELS[(item as MicrobiomeEntry).feeding_method]} +{(item as MicrobiomeEntry).skin_to_skin_minutes}m STS</Text>}
                  {!isMicrobiome && <Text style={[styles.historyValue, { color: C.text }]}>{STOOL_LABELS[(item as GutSymptom).stool_consistency]} stool ×{(item as GutSymptom).stool_frequency}</Text>}
                  <View style={[styles.historyScore, { backgroundColor: getGutScoreColor(score) + '30' }]}>
                    <Text style={[styles.historyScoreText, { color: getGutScoreColor(score) }]}>{score}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: C.accent }]} onPress={() => setModalVisible(true)}
        accessibilityLabel="Add daily gut log entry"
        accessibilityHint="Opens the daily logging form to record feeding or symptoms"
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Log Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>{t('gutBrainAxis.dailyLog')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}
                accessibilityLabel="Close daily log modal"
                accessibilityHint="Closes the daily logging form"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="close" size={24} color={C.muted} />
              </TouchableOpacity>
            </View>

            {/* Tab Switcher */}
            <View style={styles.modalTabs}>
              <TouchableOpacity style={[styles.modalTab, logTab === 'feeding' && { borderBottomColor: C.accent, borderBottomWidth: 2 }]} onPress={() => setLogTab('feeding')}
                accessibilityLabel="Feeding log tab"
                accessibilityHint="Switch to feeding log form"
                accessibilityRole="tab"
              >
                <Text style={[styles.modalTabText, { color: logTab === 'feeding' ? C.accent : C.muted }]}>{t('gutBrainAxis.feedingLog')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalTab, logTab === 'symptoms' && { borderBottomColor: C.accent, borderBottomWidth: 2 }]} onPress={() => setLogTab('symptoms')}
                accessibilityLabel="Gut symptoms tab"
                accessibilityHint="Switch to gut symptoms form"
                accessibilityRole="tab"
              >
                <Text style={[styles.modalTabText, { color: logTab === 'symptoms' ? C.accent : C.muted }]}>{t('gutBrainAxis.gutSymptoms')}</Text>
              </TouchableOpacity>
            </View>

            {logTab === 'feeding' ? (
              <ScrollView style={styles.modalForm}>
                <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutBrainAxis.feedingMethod')}</Text>
                <View style={styles.chipRow}>
                  {FEEDING_METHODS.map(m => (
                    <TouchableOpacity key={m.key} style={[styles.chip, feedingMethod === m.key && { backgroundColor: C.accent + '30', borderColor: C.accent }]} onPress={() => setFeedingMethod(m.key)}
                      accessibilityLabel={`Feeding method: ${t(m.labelKey)}`}
                      accessibilityHint={`Select ${t(m.labelKey)} as the feeding method`}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.chipText, { color: feedingMethod === m.key ? C.accent : C.muted }]}>{t(m.labelKey)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutBrainAxis.skinToSkin')} ({skinToSkin}m)</Text>
                <View style={styles.sliderRow}>
                  {[0, 15, 30, 45, 60, 90, 120].map(v => (
                    <TouchableOpacity key={v} style={[styles.sliderOption, skinToSkin === v && { backgroundColor: C.accent }]} onPress={() => setSkinToSkin(v)}
                      accessibilityLabel={`Skin-to-skin ${v} minutes`}
                      accessibilityHint={`Set skin-to-skin contact to ${v} minutes`}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.sliderOptText, { color: skinToSkin === v ? '#fff' : C.muted }]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={[styles.toggleRow, probiotic && { backgroundColor: '#2ecc7120' }]} onPress={() => setProbiotic(!probiotic)}
                  accessibilityLabel="Probiotic drops toggle"
                  accessibilityHint={probiotic ? 'Disable probiotic drops' : 'Enable probiotic drops'}
                  accessibilityRole="switch"
                >
                  <Text style={[styles.toggleLabel, { color: C.text }]}>{t('gutBrainAxis.probiotic')}</Text>
                  <View style={[styles.toggle, probiotic && { backgroundColor: '#2ecc71' }]}>
                    <View style={[styles.toggleKnob, probiotic && { transform: [{ translateX: 16 }] }]} />
                  </View>
                </TouchableOpacity>

                <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutBrainAxis.prebiotic')} ({prebiotic}g)</Text>
                <View style={styles.sliderRow}>
                  {[0, 2.5, 5, 7.5, 10, 15, 20].map(v => (
                    <TouchableOpacity key={v} style={[styles.sliderOption, prebiotic === v && { backgroundColor: C.accent }]} onPress={() => setPrebiotic(v)}
                      accessibilityLabel={`Prebiotic ${v} grams`}
                      accessibilityHint={`Set prebiotic supplement to ${v} grams`}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.sliderOptText, { color: prebiotic === v ? '#fff' : C.muted }]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {(feedingMethod === 'bf_pumped' || feedingMethod === 'formula' || feedingMethod === 'mixed') && (
                  <>
                    <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutBrainAxis.flowRate')}</Text>
                    <View style={styles.chipRow}>
                      {FLOW_RATES.map(f => (
                        <TouchableOpacity key={f.key} style={[styles.chip, flowRate === f.key && { backgroundColor: C.accent + '30', borderColor: C.accent }]} onPress={() => setFlowRate(f.key)}
                          accessibilityLabel={`Flow rate: ${t(f.labelKey)}`}
                          accessibilityHint={`Set flow rate to ${t(f.labelKey)}`}
                          accessibilityRole="button"
                        >
                          <Text style={[styles.chipText, { color: flowRate === f.key ? C.accent : C.muted }]}>{t(f.labelKey)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: C.accent }]} onPress={saveFeedingLog}
                  accessibilityLabel="Save feeding log entry"
                  accessibilityHint="Saves the current feeding log to your history"
                  accessibilityRole="button"
                >
                  <Text style={styles.saveBtnText}>{t('gutBrainAxis.saveFeeding')}</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <ScrollView style={styles.modalForm}>
                <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutBrainAxis.stoolFrequency')} ({stoolFreq}x/day)</Text>
                <View style={styles.stepperRow}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                    <TouchableOpacity key={v} style={[styles.stepperOpt, stoolFreq === v && { backgroundColor: C.accent }]} onPress={() => setStoolFreq(v)}
                      accessibilityLabel={`Stool frequency ${v} times per day`}
                      accessibilityHint={`Set stool frequency to ${v} times per day`}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.stepperText, { color: stoolFreq === v ? '#fff' : C.muted }]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutBrainAxis.stoolConsistency')}</Text>
                <View style={styles.chipRow}>
                  {STOOL_CONSISTENCIES.map(s => (
                    <TouchableOpacity key={s.key} style={[styles.chip, stoolConsistency === s.key && { backgroundColor: C.accent + '30', borderColor: C.accent }]} onPress={() => setStoolConsistency(s.key)}
                      accessibilityLabel={`Stool consistency: ${t(s.labelKey)}`}
                      accessibilityHint={`Set stool consistency to ${t(s.labelKey)}`}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.chipText, { color: stoolConsistency === s.key ? C.accent : C.muted }]}>{t(s.labelKey)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutBrainAxis.gasSeverity')} ({gasSeverity}/5)</Text>
                <View style={styles.gasSliderRow}>
                  {[1, 2, 3, 4, 5].map(v => (
                    <TouchableOpacity key={v} style={[styles.gasOpt, gasSeverity === v && { backgroundColor: C.accent }]} onPress={() => setGasSeverity(v as 1 | 2 | 3 | 4 | 5)}
                      accessibilityLabel={`Gas severity level ${v}`}
                      accessibilityHint={`Set gas severity to level ${v}`}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.gasOptText, { color: gasSeverity === v ? '#fff' : C.muted }]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.gasLabels}>
                  <Text style={[styles.gasLabelText, { color: C.muted }]}>{t('gutBrainAxis.none')}</Text>
                  <Text style={[styles.gasLabelText, { color: C.muted }]}>{t('gutBrainAxis.severe')}</Text>
                </View>

                <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutBrainAxis.refluxEpisodes')} ({refluxEpisodes})</Text>
                <View style={styles.stepperRow}>
                  {[0, 1, 2, 3, 4, 5, 6].map(v => (
                    <TouchableOpacity key={v} style={[styles.stepperOpt, refluxEpisodes === v && { backgroundColor: C.accent }]} onPress={() => setRefluxEpisodes(v)}
                      accessibilityLabel={`Reflux episodes ${v}`}
                      accessibilityHint={`Set reflux episodes to ${v}`}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.stepperText, { color: refluxEpisodes === v ? '#fff' : C.muted }]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: C.accent }]} onPress={saveGutSymptoms}
                  accessibilityLabel="Save gut symptoms entry"
                  accessibilityHint="Saves the current gut symptoms to your history"
                  accessibilityRole="button"
                >
                  <Text style={styles.saveBtnText}>{t('gutBrainAxis.saveSymptoms')}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  headerSub: { fontSize: 14, marginTop: 4 },
  gaugeCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  cardLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  gaugeContainer: { alignItems: 'center' },
  gaugeCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  gaugeScore: { fontSize: 36, fontWeight: '700' },
  gaugeLabel: { fontSize: 14 },
  gaugeBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', width: '100%' },
  gaugeBarFill: { height: '100%' },
  gaugeLegend: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 4 },
  legendText: { fontSize: 11 },
  insightCard: { borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  insightText: { fontSize: 13, flex: 1 },
  correlationCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  correlationGrid: { flexDirection: 'row', gap: 12 },
  correlationCell: { flex: 1 },
  correlationTitle: { fontSize: 11, fontWeight: '600', marginBottom: 8 },
  miniScatter: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 40 },
  scatterDot: { width: 10, height: 10, borderRadius: 5 },
  miniBarRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 40 },
  miniBarCol: { flex: 1, alignItems: 'center' },
  miniBar: { width: '80%', borderRadius: 2 },
  miniBarLabel: { fontSize: 8, marginTop: 2 },
  todayCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  todayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  todayItem: { alignItems: 'center', minWidth: 70 },
  todayValue: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  todayLabel: { fontSize: 10 },
  timelineCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 60 },
  timelineDay: { alignItems: 'center', flex: 1 },
  timelineBar: { width: 20, borderRadius: 4, marginBottom: 4 },
  timelineLabel: { fontSize: 10 },
  historyCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  historyDate: { fontSize: 12, width: 90 },
  historyValue: { flex: 1, fontSize: 13 },
  historyScore: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  historyScoreText: { fontSize: 12, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center', padding: 16 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 } },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalTabs: { flexDirection: 'row' },
  modalTab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  modalTabText: { fontSize: 14, fontWeight: '600' },
  modalForm: { padding: 20 },
  formLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#e0e0e0' },
  chipText: { fontSize: 13 },
  sliderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sliderOption: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f0f0f0' },
  sliderOptText: { fontSize: 12 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 12 },
  toggleLabel: { fontSize: 14 },
  toggle: { width: 36, height: 20, borderRadius: 10, padding: 2 },
  toggleKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  stepperRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stepperOpt: { minWidth: 44, minHeight: 44, borderRadius: 8, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  stepperText: { fontSize: 13 },
  gasSliderRow: { flexDirection: 'row', gap: 8 },
  gasOpt: { flex: 1, minHeight: 44, borderRadius: 8, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  gasOptText: { fontSize: 14 },
  gasLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  gasLabelText: { fontSize: 11 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
