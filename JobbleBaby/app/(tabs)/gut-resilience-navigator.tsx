import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { STORAGE_KEYS } from '../../store/storage-keys';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Storage keys
const STOOL_BIOME_KEY = STORAGE_KEYS.STOOL_BIOME_PROXY;
const BIFIDO_KEY = STORAGE_KEYS.BIFIDO_SUPPORT_SCORE;
const GUT_BARRIER_KEY = STORAGE_KEYS.GUT_BARRIER_INDEX;
const SIGA_KEY = STORAGE_KEYS.SIGA_ACTIVITY_LOG;
const ATOPIC_RISK_KEY = STORAGE_KEYS.ATOPIC_RISK_FLAG;

// Types
type StoolConsistency = 'watery' | 'soft' | 'normal' | 'formed' | 'hard';
type StoolColor = 'yellow' | 'green' | 'brown' | 'black' | 'white' | 'red';
type StoolSmell = 'normal' | 'sour' | 'foul' | 'other';
type FeedingType = 'breast' | 'formula' | 'mixed' | 'solid';
type DeliveryMode = 'vaginal' | 'cesarean';
type CheekCondition = 'smooth' | 'normal' | 'dry' | 'flaking';
type MucusQuality = 'thinClear' | 'thickWhite' | 'yellow' | 'green';

interface StoolEntry {
  id: string;
  date: string;
  frequency: number;
  consistency: StoolConsistency;
  color: StoolColor;
  smell: StoolSmell;
  antibiotic_exposure: boolean;
  feeding_type: FeedingType;
}

interface BifidoData {
  breastfed_direct: number;
  breastfed_pumped: number;
  formula_feeds: number;
  probiotic_drops: boolean;
  delivery_mode: DeliveryMode;
  antibiotics_last_14d: boolean;
}

interface GutBarrierData {
  cheek_skin_condition: CheekCondition;
  skin_sensitivity_rating: number;
}

interface SigaEntry {
  id: string;
  date: string;
  mucus_quality: MucusQuality;
  respiratory_infections_last_30d: number;
  diarrhea_episodes_last_30d: number;
  ear_infections_last_30d: number;
}

// Helper functions
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
const getDateStr = () => new Date().toISOString().split('T')[0];

// Stool quality score: watery=1, soft=2, normal=3, formed=4, hard=5
const getStoolQualityScore = (consistency: StoolConsistency): number => {
  const scores: Record<StoolConsistency, number> = {
    watery: 1, soft: 2, normal: 3, formed: 4, hard: 5
  };
  return scores[consistency];
};

// Calculate Bifido Support Score
const calcBifidoScore = (data: BifidoData): number => {
  let score = 0;

  // Exclusively breastfed: +30
  if (data.breastfed_direct >= 6 && data.formula_feeds === 0 && data.breastfed_pumped === 0) {
    score += 30;
  }

  // >=4 breastfeeds/day: +20
  if (data.breastfed_direct >= 4) {
    score += 20;
  }

  // Probiotic drops: +15
  if (data.probiotic_drops) {
    score += 15;
  }

  // Vaginal delivery: +15
  if (data.delivery_mode === 'vaginal') {
    score += 15;
  }

  // C-section: -25 (already penalized by not getting vaginal bonus)
  if (data.delivery_mode === 'cesarean') {
    score -= 25;
  }

  // Antibiotics in last 14 days: -20
  if (data.antibiotics_last_14d) {
    score -= 20;
  }

  // Formula feeds >2/day: -10 per feed over 2
  if (data.formula_feeds > 2) {
    score -= (data.formula_feeds - 2) * 10;
  }

  return Math.max(0, Math.min(100, score));
};

// Get risk level for gut barrier
const getGutBarrierRisk = (data: GutBarrierData): 'low' | 'medium' | 'high' => {
  if (data.cheek_skin_condition === 'flaking' && data.skin_sensitivity_rating >= 4) {
    return 'high';
  }
  if (data.cheek_skin_condition === 'dry' || data.skin_sensitivity_rating >= 3) {
    return 'medium';
  }
  return 'low';
};

// Get risk color
const getRiskColor = (risk: 'low' | 'medium' | 'high'): string => {
  switch (risk) {
    case 'low': return '#2ecc71';
    case 'medium': return '#f1c40f';
    case 'high': return '#e74c3c';
  }
};

// Get bifido score color
const getBifidoColor = (score: number): string => {
  if (score > 60) return '#2ecc71';
  if (score >= 30) return '#f1c40f';
  return '#e74c3c';
};

// Check if atopic march risk triggers
const checkAtopicRisk = (
  bifidoScore: number,
  recentStoolEntries: StoolEntry[],
  gutBarrierRisk: 'low' | 'medium' | 'high',
  rashFrequencyPerWeek: number
): boolean => {
  if (bifidoScore >= 40) return false;
  if (gutBarrierRisk !== 'high') return false;
  if (rashFrequencyPerWeek < 2) return false;

  // Check stool quality declining trend
  if (recentStoolEntries.length >= 3) {
    const last3 = recentStoolEntries.slice(-3);
    const scores = last3.map(e => getStoolQualityScore(e.consistency));
    // Declining if each is lower than the previous
    if (scores[2] >= scores[1] || scores[1] >= scores[0]) {
      return false;
    }
  } else {
    return false;
  }

  return true;
};

// Mucus quality score for chart
const getMucusQualityScore = (quality: MucusQuality): number => {
  const scores: Record<MucusQuality, number> = {
    thinClear: 4, thickWhite: 3, yellow: 2, green: 1
  };
  return scores[quality];
};

export default function GutResilienceNavigator() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  // State
  const [stoolEntries, setStoolEntries] = useState<StoolEntry[]>([]);
  const [bifidoData, setBifidoData] = useState<BifidoData>({
    breastfed_direct: 0,
    breastfed_pumped: 0,
    formula_feeds: 0,
    probiotic_drops: false,
    delivery_mode: 'vaginal',
    antibiotics_last_14d: false,
  });
  const [gutBarrierData, setGutBarrierData] = useState<GutBarrierData>({
    cheek_skin_condition: 'normal',
    skin_sensitivity_rating: 3,
  });
  const [sigaEntries, setSigaEntries] = useState<SigaEntry[]>([]);
  const [atopicRisk, setAtopicRisk] = useState(false);
  const [rashFrequency, setRashFrequency] = useState(0);

  // Modal states
  const [stoolModalVisible, setStoolModalVisible] = useState(false);
  const [bifidoModalVisible, setBifidoModalVisible] = useState(false);
  const [gutBarrierModalVisible, setGutBarrierModalVisible] = useState(false);
  const [sigaModalVisible, setSigaModalVisible] = useState(false);
  const [rashModalVisible, setRashModalVisible] = useState(false);

  // Stool form state
  const [stoolFrequency, setStoolFrequency] = useState(3);
  const [stoolConsistency, setStoolConsistency] = useState<StoolConsistency>('normal');
  const [stoolColor, setStoolColor] = useState<StoolColor>('brown');
  const [stoolSmell, setStoolSmell] = useState<StoolSmell>('normal');
  const [stoolAntibiotic, setStoolAntibiotic] = useState(false);
  const [stoolFeedingType, setStoolFeedingType] = useState<FeedingType>('breast');

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [stoolRaw, bifidoRaw, barrierRaw, sigaRaw, atopicRaw, rashRaw] = await Promise.all([
        safeGetItem(STOOL_BIOME_KEY),
        safeGetItem(BIFIDO_KEY),
        safeGetItem(GUT_BARRIER_KEY),
        safeGetItem(SIGA_KEY),
        safeGetItem(ATOPIC_RISK_KEY),
        safeGetItem('@jobble/rash_frequency'),
      ]);

      if (stoolRaw) setStoolEntries(JSON.parse(stoolRaw));
      if (bifidoRaw) setBifidoData(JSON.parse(bifidoRaw));
      if (barrierRaw) setGutBarrierData(JSON.parse(barrierRaw));
      if (sigaRaw) setSigaEntries(JSON.parse(sigaRaw));
      if (atopicRaw) setAtopicRisk(JSON.parse(atopicRaw));
      if (rashRaw) setRashFrequency(JSON.parse(rashRaw));
    } catch (e) {
      // silently fail
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Calculate derived values
  const bifidoScore = calcBifidoScore(bifidoData);
  const gutBarrierRisk = getGutBarrierRisk(gutBarrierData);
  const isAtopicRisk = checkAtopicRisk(bifidoScore, stoolEntries, gutBarrierRisk, rashFrequency);

  // Save functions
  const saveStoolEntry = async () => {
    const entry: StoolEntry = {
      id: generateId(),
      date: getDateStr(),
      frequency: stoolFrequency,
      consistency: stoolConsistency,
      color: stoolColor,
      smell: stoolSmell,
      antibiotic_exposure: stoolAntibiotic,
      feeding_type: stoolFeedingType,
    };
    const updated = [...stoolEntries.filter(e => e.date !== getDateStr()), entry];
    await safeSetItem(STOOL_BIOME_KEY, JSON.stringify(updated));
    setStoolEntries(updated);
    setStoolModalVisible(false);
  };

  const saveBifidoData = async () => {
    await safeSetItem(BIFIDO_KEY, JSON.stringify(bifidoData));
    setBifidoData({ ...bifidoData });
    setBifidoModalVisible(false);
  };

  const saveGutBarrierData = async () => {
    await safeSetItem(GUT_BARRIER_KEY, JSON.stringify(gutBarrierData));
    setGutBarrierData({ ...gutBarrierData });
    setGutBarrierModalVisible(false);
  };

  const saveSigaEntry = async () => {
    const entry: SigaEntry = {
      id: generateId(),
      date: getDateStr(),
      mucus_quality: 'thinClear',
      respiratory_infections_last_30d: 0,
      diarrhea_episodes_last_30d: 0,
      ear_infections_last_30d: 0,
    };
    const updated = [...sigaEntries.filter(e => e.date !== getDateStr()), entry];
    await safeSetItem(SIGA_KEY, JSON.stringify(updated));
    setSigaEntries(updated);
    setSigaModalVisible(false);
  };

  const saveRashFrequency = async () => {
    await safeSetItem('@jobble/rash_frequency', JSON.stringify(rashFrequency));
    setRashFrequency(rashFrequency);
    setRashModalVisible(false);
  };

  // Chart data
  const getChartData = () => {
    const last30Days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last30Days.push(d.toISOString().split('T')[0]);
    }

    return last30Days.map(date => {
      const stoolEntry = stoolEntries.find(e => e.date === date);
      return {
        date: date.slice(5), // MM-DD format
        stoolQuality: stoolEntry ? getStoolQualityScore(stoolEntry.consistency) : null,
        bifidoScore: bifidoScore,
        rashFreq: rashFrequency,
      };
    });
  };

  // Last 14 days stool entries
  const last14DaysStool = stoolEntries
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);

  // Render option button
  const renderOptionBtn = (
    label: string,
    selected: boolean,
    onPress: () => void,
    accessibilityLabel: string
  ) => (
    <TouchableOpacity
      key={label}
      style={[styles.optionBtn, selected && { backgroundColor: C.accent + '30', borderColor: C.accent }]}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Text style={[styles.optionBtnText, { color: selected ? C.accent : C.muted }]}>{label}</Text>
    </TouchableOpacity>
  );

  // Render stepper
  const renderStepper = (
    value: number,
    onChange: (v: number) => void,
    min: number,
    max: number,
    accessibilityPrefix: string
  ) => (
    <View style={styles.stepperRow}>
      {[...Array(max - min + 1)].map((_, i) => {
        const v = min + i;
        return (
          <TouchableOpacity
            key={v}
            style={[styles.stepperBtn, value === v && { backgroundColor: C.accent }]}
            onPress={() => onChange(v)}
            accessibilityLabel={`${accessibilityPrefix} ${v}`}
            accessibilityRole="button"
          >
            <Text style={[styles.stepperText, { color: value === v ? '#fff' : C.muted }]}>{v}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: C.text }]}>{t('gutResilience.title')}</Text>
          <Text style={[styles.headerSub, { color: C.muted }]}>{t('gutResilience.subtitle')}</Text>
        </View>

        {/* Atopic March Risk Alert */}
        {isAtopicRisk && (
          <View style={[styles.alertCard, { backgroundColor: '#e74c3c20', borderColor: '#e74c3c' }]}>
            <MaterialCommunityIcons name="alert-circle" size={24} color="#e74c3c" />
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: '#e74c3c' }]}>{t('gutResilience.alert.title')}</Text>
              <Text style={[styles.alertMessage, { color: '#e74c3c' }]}>{t('gutResilience.alert.description')}</Text>
            </View>
          </View>
        )}

        {/* Section 1: Stool Biome Proxy Logger */}
        <View style={[styles.sectionCard, { backgroundColor: C.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>{t('gutResilience.stoolLogger.title')}</Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: C.accent }]}
              onPress={() => setStoolModalVisible(true)}
              accessibilityLabel={t('gutResilience.stoolLogger.addEntry')}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {last14DaysStool.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.muted }]}>{t('gutResilience.stoolLogger.noEntries')}</Text>
          ) : (
            <FlatList
              data={last14DaysStool}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={[styles.stoolCard, { borderBottomColor: C.border }]}>
                  <View style={styles.stoolCardHeader}>
                    <Text style={[styles.stoolDate, { color: C.text }]}>{item.date}</Text>
                    <View style={[styles.stoolScoreBadge, { backgroundColor: getBifidoColor(getStoolQualityScore(item.consistency)) + '30' }]}>
                      <Text style={[styles.stoolScoreText, { color: getBifidoColor(getStoolQualityScore(item.consistency)) }]}>
                        {getStoolQualityScore(item.consistency)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.stoolCardDetails}>
                    <Text style={[styles.stoolDetail, { color: C.muted }]}>
                      {item.frequency}x/day | {t(`gutResilience.stoolLogger.consistencyOptions.${item.consistency}`)} | {item.color}
                    </Text>
                    <Text style={[styles.stoolDetail, { color: C.muted }]}>
                      {t(`gutResilience.stoolLogger.feedingTypeOptions.${item.feeding_type}`)}
                      {item.antibiotic_exposure ? ` | ${t('gutResilience.stoolLogger.antibioticExposure')}: ${t('gutResilience.stoolLogger.yes')}` : ''}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>

        {/* Section 2: Bifido Dominance Tracker */}
        <View style={[styles.sectionCard, { backgroundColor: C.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>{t('gutResilience.bifido.title')}</Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: C.accent }]}
              onPress={() => setBifidoModalVisible(true)}
              accessibilityLabel={t('gutResilience.bifido.calculateScore')}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.gaugeContainer}>
            <View style={[styles.gaugeCircle, { borderColor: getBifidoColor(bifidoScore) }]}>
              <Text style={[styles.gaugeScore, { color: getBifidoColor(bifidoScore) }]}>{bifidoScore}</Text>
              <Text style={[styles.gaugeLabel, { color: C.muted }]}>/100</Text>
            </View>
          </View>

          <View style={styles.bifidoDetails}>
            <View style={styles.bifidoRow}>
              <Text style={[styles.bifidoLabel, { color: C.muted }]}>{t('gutResilience.bifido.breastfedDirect')}:</Text>
              <Text style={[styles.bifidoValue, { color: C.text }]}>{bifidoData.breastfed_direct}x</Text>
            </View>
            <View style={styles.bifidoRow}>
              <Text style={[styles.bifidoLabel, { color: C.muted }]}>{t('gutResilience.bifido.deliveryMode')}:</Text>
              <Text style={[styles.bifidoValue, { color: C.text }]}>
                {t(`gutResilience.bifido.deliveryModeOptions.${bifidoData.delivery_mode}`)}
              </Text>
            </View>
            <View style={styles.bifidoRow}>
              <Text style={[styles.bifidoLabel, { color: C.muted }]}>{t('gutResilience.bifido.probioticDrops')}:</Text>
              <Text style={[styles.bifidoValue, { color: C.text }]}>
                {bifidoData.probiotic_drops ? t('gutResilience.stoolLogger.yes') : t('gutResilience.stoolLogger.no')}
              </Text>
            </View>
          </View>
        </View>

        {/* Section 3: Gut Barrier Integrity Index */}
        <View style={[styles.sectionCard, { backgroundColor: C.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>{t('gutResilience.gutBarrier.title')}</Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: C.accent }]}
              onPress={() => setGutBarrierModalVisible(true)}
              accessibilityLabel={t('gutResilience.gutBarrier.riskLevel')}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={[styles.riskCard, { backgroundColor: getRiskColor(gutBarrierRisk) + '20', borderColor: getRiskColor(gutBarrierRisk) }]}>
            <MaterialCommunityIcons
              name={gutBarrierRisk === 'low' ? 'check-circle' : gutBarrierRisk === 'medium' ? 'alert' : 'alert-circle'}
              size={32}
              color={getRiskColor(gutBarrierRisk)}
            />
            <View style={styles.riskContent}>
              <Text style={[styles.riskLevel, { color: getRiskColor(gutBarrierRisk) }]}>
                {t(`gutResilience.gutBarrier.riskLevels.${gutBarrierRisk}`)}
              </Text>
              <Text style={[styles.riskLabel, { color: C.muted }]}>{t('gutResilience.gutBarrier.riskLevel')}</Text>
            </View>
          </View>

          <View style={styles.gutBarrierDetails}>
            <View style={styles.bifidoRow}>
              <Text style={[styles.bifidoLabel, { color: C.muted }]}>{t('gutResilience.gutBarrier.cheekSkin')}:</Text>
              <Text style={[styles.bifidoValue, { color: C.text }]}>
                {t(`gutResilience.gutBarrier.conditionOptions.${gutBarrierData.cheek_skin_condition}`)}
              </Text>
            </View>
            <View style={styles.bifidoRow}>
              <Text style={[styles.bifidoLabel, { color: C.muted }]}>{t('gutResilience.gutBarrier.skinSensitivity')}:</Text>
              <Text style={[styles.bifidoValue, { color: C.text }]}>{gutBarrierData.skin_sensitivity_rating}/5</Text>
            </View>
          </View>
        </View>

        {/* Section 4: Secretory IgA Activity Log */}
        <View style={[styles.sectionCard, { backgroundColor: C.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>{t('gutResilience.siga.title')}</Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: C.accent }]}
              onPress={() => setSigaModalVisible(true)}
              accessibilityLabel={t('gutResilience.siga.latestEntry')}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {sigaEntries.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.muted }]}>{t('gutResilience.siga.noEntries')}</Text>
          ) : (
            <>
              <View style={styles.sigaLatest}>
                <Text style={[styles.sigaLabel, { color: C.muted }]}>{t('gutResilience.siga.latestEntry')}</Text>
                <Text style={[styles.sigaDate, { color: C.text }]}>{sigaEntries[sigaEntries.length - 1].date}</Text>
              </View>
              <View style={styles.sigaMetrics}>
                <View style={styles.sigaMetric}>
                  <Text style={[styles.sigaMetricValue, { color: C.text }]}>
                    {sigaEntries[sigaEntries.length - 1].respiratory_infections_last_30d}
                  </Text>
                  <Text style={[styles.sigaMetricLabel, { color: C.muted }]}>{t('gutResilience.siga.respiratoryInfections')}</Text>
                </View>
                <View style={styles.sigaMetric}>
                  <Text style={[styles.sigaMetricValue, { color: C.text }]}>
                    {sigaEntries[sigaEntries.length - 1].diarrhea_episodes_last_30d}
                  </Text>
                  <Text style={[styles.sigaMetricLabel, { color: C.muted }]}>{t('gutResilience.siga.diarrheaEpisodes')}</Text>
                </View>
                <View style={styles.sigaMetric}>
                  <Text style={[styles.sigaMetricValue, { color: C.text }]}>
                    {sigaEntries[sigaEntries.length - 1].ear_infections_last_30d}
                  </Text>
                  <Text style={[styles.sigaMetricLabel, { color: C.muted }]}>{t('gutResilience.siga.earInfections')}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Section 5: Gut-Skin Axis Correlation Dashboard */}
        <View style={[styles.sectionCard, { backgroundColor: C.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>{t('gutResilience.dashboard.title')}</Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: C.accent }]}
              onPress={() => setRashModalVisible(true)}
              accessibilityLabel={t('gutResilience.dashboard.rashFrequency')}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" stroke={C.muted} fontSize={10} />
              <YAxis stroke={C.muted} fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: C.card, borderColor: C.border }} />
              <Legend />
              <Line type="monotone" dataKey="stoolQuality" stroke="#3498db" name={t('gutResilience.dashboard.stoolQuality')} dot={false} />
              <Line type="monotone" dataKey="bifidoScore" stroke="#2ecc71" name={t('gutResilience.dashboard.bifidoScore')} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </View>
      </ScrollView>

      {/* Stool Entry Modal */}
      <Modal visible={stoolModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>{t('gutResilience.stoolLogger.title')}</Text>
              <TouchableOpacity onPress={() => setStoolModalVisible(false)}
                accessibilityLabel="Close stool entry modal"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="close" size={24} color={C.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutResilience.stoolLogger.frequency')} ({stoolFrequency}{t('gutResilience.stoolLogger.timesPerDay')})</Text>
              {renderStepper(stoolFrequency, setStoolFrequency, 1, 10, 'Stool frequency')}

              <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutResilience.stoolLogger.consistency')}</Text>
              <View style={styles.optionRow}>
                {(['watery', 'soft', 'normal', 'formed', 'hard'] as StoolConsistency[]).map(opt => (
                  renderOptionBtn(
                    t(`gutResilience.stoolLogger.consistencyOptions.${opt}`),
                    stoolConsistency === opt,
                    () => setStoolConsistency(opt),
                    `Consistency: ${opt}`
                  )
                ))}
              </View>

              <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutResilience.stoolLogger.color')}</Text>
              <View style={styles.optionRow}>
                {(['yellow', 'green', 'brown', 'black', 'white', 'red'] as StoolColor[]).map(opt => (
                  renderOptionBtn(
                    t(`gutResilience.stoolLogger.colorOptions.${opt}`),
                    stoolColor === opt,
                    () => setStoolColor(opt),
                    `Color: ${opt}`
                  )
                ))}
              </View>

              <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutResilience.stoolLogger.smell')}</Text>
              <View style={styles.optionRow}>
                {(['normal', 'sour', 'foul', 'other'] as StoolSmell[]).map(opt => (
                  renderOptionBtn(
                    t(`gutResilience.stoolLogger.smellOptions.${opt}`),
                    stoolSmell === opt,
                    () => setStoolSmell(opt),
                    `Smell: ${opt}`
                  )
                ))}
              </View>

              <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutResilience.stoolLogger.feedingType')}</Text>
              <View style={styles.optionRow}>
                {(['breast', 'formula', 'mixed', 'solid'] as FeedingType[]).map(opt => (
                  renderOptionBtn(
                    t(`gutResilience.stoolLogger.feedingTypeOptions.${opt}`),
                    stoolFeedingType === opt,
                    () => setStoolFeedingType(opt),
                    `Feeding type: ${opt}`
                  )
                ))}
              </View>

              <TouchableOpacity style={[styles.toggleRow, stoolAntibiotic && { backgroundColor: '#e74c3c20' }]} onPress={() => setStoolAntibiotic(!stoolAntibiotic)}
                accessibilityLabel={t('gutResilience.stoolLogger.antibioticExposure')}
                accessibilityRole="switch"
              >
                <Text style={[styles.toggleLabel, { color: C.text }]}>{t('gutResilience.stoolLogger.antibioticExposure')}</Text>
                <View style={[styles.toggle, stoolAntibiotic && { backgroundColor: '#e74c3c' }]}>
                  <View style={[styles.toggleKnob, stoolAntibiotic && { transform: [{ translateX: 16 }] }]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: C.accent }]} onPress={saveStoolEntry}
                accessibilityLabel={t('gutResilience.stoolLogger.addEntry')}
                accessibilityRole="button"
              >
                <Text style={styles.saveBtnText}>{t('gutResilience.stoolLogger.addEntry')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bifido Modal */}
      <Modal visible={bifidoModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>{t('gutResilience.bifido.title')}</Text>
              <TouchableOpacity onPress={() => setBifidoModalVisible(false)}
                accessibilityLabel="Close bifido modal"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="close" size={24} color={C.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutResilience.bifido.breastfedDirect')} ({bifidoData.breastfed_direct}x)</Text>
              {renderStepper(bifidoData.breastfed_direct, (v) => setBifidoData(d => ({ ...d, breastfed_direct: v })), 0, 12, 'Breastfed direct')}

              <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutResilience.bifido.breastfedPumped')} ({bifidoData.breastfed_pumped}ml)</Text>
              {renderStepper(bifidoData.breastfed_pumped, (v) => setBifidoData(d => ({ ...d, breastfed_pumped: v })), 0, 500, 'Breastfed pumped')}

              <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutResilience.bifido.formulaFeeds')} ({bifidoData.formula_feeds}x)</Text>
              {renderStepper(bifidoData.formula_feeds, (v) => setBifidoData(d => ({ ...d, formula_feeds: v })), 0, 8, 'Formula feeds')}

              <TouchableOpacity style={[styles.toggleRow, bifidoData.probiotic_drops && { backgroundColor: '#2ecc7120' }]} onPress={() => setBifidoData(d => ({ ...d, probiotic_drops: !d.probiotic_drops }))}
                accessibilityLabel={t('gutResilience.bifido.probioticDrops')}
                accessibilityRole="switch"
              >
                <Text style={[styles.toggleLabel, { color: C.text }]}>{t('gutResilience.bifido.probioticDrops')}</Text>
                <View style={[styles.toggle, bifidoData.probiotic_drops && { backgroundColor: '#2ecc71' }]}>
                  <View style={[styles.toggleKnob, bifidoData.probiotic_drops && { transform: [{ translateX: 16 }] }]} />
                </View>
              </TouchableOpacity>

              <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutResilience.bifido.deliveryMode')}</Text>
              <View style={styles.optionRow}>
                {(['vaginal', 'cesarean'] as DeliveryMode[]).map(opt => (
                  renderOptionBtn(
                    t(`gutResilience.bifido.deliveryModeOptions.${opt}`),
                    bifidoData.delivery_mode === opt,
                    () => setBifidoData(d => ({ ...d, delivery_mode: opt })),
                    `Delivery mode: ${opt}`
                  )
                ))}
              </View>

              <TouchableOpacity style={[styles.toggleRow, bifidoData.antibiotics_last_14d && { backgroundColor: '#e74c3c20' }]} onPress={() => setBifidoData(d => ({ ...d, antibiotics_last_14d: !d.antibiotics_last_14d }))}
                accessibilityLabel={t('gutResilience.bifido.antibiotics14d')}
                accessibilityRole="switch"
              >
                <Text style={[styles.toggleLabel, { color: C.text }]}>{t('gutResilience.bifido.antibiotics14d')}</Text>
                <View style={[styles.toggle, bifidoData.antibiotics_last_14d && { backgroundColor: '#e74c3c' }]}>
                  <View style={[styles.toggleKnob, bifidoData.antibiotics_last_14d && { transform: [{ translateX: 16 }] }]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: C.accent }]} onPress={saveBifidoData}
                accessibilityLabel={t('gutResilience.bifido.calculateScore')}
                accessibilityRole="button"
              >
                <Text style={styles.saveBtnText}>{t('gutResilience.bifido.calculateScore')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Gut Barrier Modal */}
      <Modal visible={gutBarrierModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>{t('gutResilience.gutBarrier.title')}</Text>
              <TouchableOpacity onPress={() => setGutBarrierModalVisible(false)}
                accessibilityLabel="Close gut barrier modal"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="close" size={24} color={C.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutResilience.gutBarrier.cheekSkin')}</Text>
              <View style={styles.optionRow}>
                {(['smooth', 'normal', 'dry', 'flaking'] as CheekCondition[]).map(opt => (
                  renderOptionBtn(
                    t(`gutResilience.gutBarrier.conditionOptions.${opt}`),
                    gutBarrierData.cheek_skin_condition === opt,
                    () => setGutBarrierData(d => ({ ...d, cheek_skin_condition: opt })),
                    `Cheek condition: ${opt}`
                  )
                ))}
              </View>

              <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutResilience.gutBarrier.skinSensitivity')} ({gutBarrierData.skin_sensitivity_rating}/5)</Text>
              {renderStepper(gutBarrierData.skin_sensitivity_rating, (v) => setGutBarrierData(d => ({ ...d, skin_sensitivity_rating: v })), 1, 5, 'Skin sensitivity')}

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: C.accent }]} onPress={saveGutBarrierData}
                accessibilityLabel="Save gut barrier data"
                accessibilityRole="button"
              >
                <Text style={styles.saveBtnText}>{t('gutResilience.gutBarrier.riskLevel')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SIgA Modal */}
      <Modal visible={sigaModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>{t('gutResilience.siga.title')}</Text>
              <TouchableOpacity onPress={() => setSigaModalVisible(false)}
                accessibilityLabel="Close SIgA modal"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="close" size={24} color={C.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutResilience.siga.respiratoryInfections')}</Text>
              {renderStepper(0, (v) => {}, 0, 10, 'Respiratory infections')}

              <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutResilience.siga.diarrheaEpisodes')}</Text>
              {renderStepper(0, (v) => {}, 0, 10, 'Diarrhea episodes')}

              <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutResilience.siga.earInfections')}</Text>
              {renderStepper(0, (v) => {}, 0, 10, 'Ear infections')}

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: C.accent }]} onPress={saveSigaEntry}
                accessibilityLabel="Save SIgA entry"
                accessibilityRole="button"
              >
                <Text style={styles.saveBtnText}>{t('gutResilience.siga.latestEntry')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Rash Frequency Modal */}
      <Modal visible={rashModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>{t('gutResilience.dashboard.rashFrequency')}</Text>
              <TouchableOpacity onPress={() => setRashModalVisible(false)}
                accessibilityLabel="Close rash frequency modal"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="close" size={24} color={C.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={[styles.formLabel, { color: C.muted }]}>{t('gutResilience.dashboard.rashFrequency')} ({rashFrequency}x/week)</Text>
              {renderStepper(rashFrequency, setRashFrequency, 0, 7, 'Rash frequency per week')}

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: C.accent }]} onPress={saveRashFrequency}
                accessibilityLabel="Save rash frequency"
                accessibilityRole="button"
              >
                <Text style={styles.saveBtnText}>{t('gutResilience.bifido.calculateScore')}</Text>
              </TouchableOpacity>
            </ScrollView>
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
  alertCard: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 16, fontWeight: '700' },
  alertMessage: { fontSize: 13, marginTop: 4 },
  sectionCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  addBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center', padding: 16 },
  stoolCard: { paddingVertical: 12, borderBottomWidth: 1 },
  stoolCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stoolDate: { fontSize: 14, fontWeight: '600' },
  stoolScoreBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  stoolScoreText: { fontSize: 14, fontWeight: '700' },
  stoolCardDetails: { marginTop: 4 },
  stoolDetail: { fontSize: 12 },
  gaugeContainer: { alignItems: 'center', marginVertical: 16 },
  gaugeCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 8, justifyContent: 'center', alignItems: 'center' },
  gaugeScore: { fontSize: 36, fontWeight: '700' },
  gaugeLabel: { fontSize: 14 },
  bifidoDetails: { marginTop: 8 },
  bifidoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  bifidoLabel: { fontSize: 13 },
  bifidoValue: { fontSize: 13, fontWeight: '600' },
  riskCard: { borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2 },
  riskContent: { flex: 1 },
  riskLevel: { fontSize: 24, fontWeight: '700' },
  riskLabel: { fontSize: 12 },
  gutBarrierDetails: { marginTop: 12 },
  sigaLatest: { marginBottom: 12 },
  sigaLabel: { fontSize: 12, marginBottom: 4 },
  sigaDate: { fontSize: 14, fontWeight: '600' },
  sigaMetrics: { flexDirection: 'row', justifyContent: 'space-around' },
  sigaMetric: { alignItems: 'center' },
  sigaMetricValue: { fontSize: 24, fontWeight: '700' },
  sigaMetricLabel: { fontSize: 10, marginTop: 4, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalForm: { padding: 20 },
  formLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#e0e0e0' },
  optionBtnText: { fontSize: 13 },
  stepperRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stepperBtn: { minWidth: 40, minHeight: 40, borderRadius: 8, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  stepperText: { fontSize: 13 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 16, backgroundColor: '#f0f0f0' },
  toggleLabel: { fontSize: 14 },
  toggle: { width: 36, height: 20, borderRadius: 10, padding: 2, backgroundColor: '#ccc' },
  toggleKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
