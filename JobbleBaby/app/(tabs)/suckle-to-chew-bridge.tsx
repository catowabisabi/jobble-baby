import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const STAGE_LOGS_KEY = STORAGE_KEYS.SUCKLE_TO_CHEW_STAGE_LOGS;
const FOOD_ACCEPTANCE_KEY = STORAGE_KEYS.SUCKLE_TO_CHEW_FOOD_ACCEPTANCE_LOGS;
const TEXTURE_LADDER_KEY = STORAGE_KEYS.SUCKLE_TO_CHEW_TEXTURE_LADDER_LOGS;
const PROFILE_KEY = '@jobble_baby_profile';

const STAGES = [
  { id: 'suckle', labelKey: 'suckleToChewBridge.stages.suckle', months: '0-6mo', icon: 'baby-face-outline' },
  { id: 'transition', labelKey: 'suckleToChewBridge.stages.transition', months: '4-8mo', icon: 'progress-wrench' },
  { id: 'munch', labelKey: 'suckleToChewBridge.stages.munch', months: '6-8mo', icon: 'food-variant' },
  { id: 'chew', labelKey: 'suckleToChewBridge.stages.chew', months: '8mo+', icon: 'food-drumstick' },
] as const;

const TEXTURE_LEVELS = [
  { level: 1, labelKey: 'suckleToChewBridge.sectionC.textureLevels.level1', months: '4-6mo' },
  { level: 2, labelKey: 'suckleToChewBridge.sectionC.textureLevels.level2', months: '5-6mo' },
  { level: 3, labelKey: 'suckleToChewBridge.sectionC.textureLevels.level3', months: '6-7mo' },
  { level: 4, labelKey: 'suckleToChewBridge.sectionC.textureLevels.level4', months: '6-8mo' },
  { level: 5, labelKey: 'suckleToChewBridge.sectionC.textureLevels.level5', months: '7-9mo' },
  { level: 6, labelKey: 'suckleToChewBridge.sectionC.textureLevels.level6', months: '9-12mo' },
  { level: 7, labelKey: 'suckleToChewBridge.sectionC.textureLevels.level7', months: '12mo+' },
] as const;

const TONGUE_PATTERNS = {
  suckle: 'suckleToChewBridge.sectionA.tonguePatterns.suckle',
  transition: 'suckleToChewBridge.sectionA.tonguePatterns.transition',
  munch: 'suckleToChewBridge.sectionA.tonguePatterns.munch',
  chew: 'suckleToChewBridge.sectionA.tonguePatterns.chew',
} as const;

type StageType = typeof STAGES[number]['id'];
type TonguePattern = keyof typeof TONGUE_PATTERNS;
type InnerTab = 'stageTracker' | 'foodAcceptance' | 'textureLadder' | 'alerts';

interface StageLogEntry {
  id: string;
  stage: StageType;
  tonguePattern: TonguePattern;
  notes?: string;
  date: string;
  babyAgeMonths: number;
}

interface FoodAcceptanceEntry {
  id: string;
  foodItem: string;
  acceptanceScore: number;
  gagEvents: number;
  refusalEvents: number;
  date: string;
  babyAgeMonths: number;
}

interface TextureLadderEntry {
  id: string;
  textureLevel: number;
  accepted: boolean;
  date: string;
  babyAgeMonths: number;
}

const STAGE_GREEN = '#22C55E';
const STAGE_BLUE = '#3B82F6';
const STAGE_AMBER = '#F59E0B';
const STAGE_RED = '#EF4444';

function calculateAgeInMonths(birthDate: string): number {
  try {
    const birth = new Date(birthDate);
    const now = new Date();
    const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    return days / 30.44;
  } catch {
    return 0;
  }
}

function getDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getStageIndex(stage: StageType): number {
  return STAGES.findIndex(s => s.id === stage);
}

export default function SuckleToChewBridgeScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [innerTab, setInnerTab] = useState<InnerTab>('stageTracker');
  const [stageLogs, setStageLogs] = useState<StageLogEntry[]>([]);
  const [foodAcceptanceLogs, setFoodAcceptanceLogs] = useState<FoodAcceptanceEntry[]>([]);
  const [textureLadderLogs, setTextureLadderLogs] = useState<TextureLadderEntry[]>([]);
  const [babyAgeMonths, setBabyAgeMonths] = useState(0);

  // Stage form state
  const [showStageForm, setShowStageForm] = useState(false);
  const [selectedStage, setSelectedStage] = useState<StageType>('transition');
  const [selectedTonguePattern, setSelectedTonguePattern] = useState<TonguePattern>('transition');
  const [stageNotes, setStageNotes] = useState('');

  // Food acceptance form state
  const [showFoodForm, setShowFoodForm] = useState(false);
  const [foodItem, setFoodItem] = useState('');
  const [acceptanceScore, setAcceptanceScore] = useState(3);
  const [gagEvents, setGagEvents] = useState(0);
  const [refusalEvents, setRefusalEvents] = useState(0);

  // Texture ladder form state
  const [showTextureForm, setShowTextureForm] = useState(false);
  const [selectedTextureLevel, setSelectedTextureLevel] = useState(1);
  const [textureAccepted, setTextureAccepted] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stageRaw, foodRaw, textureRaw, profileRaw] = await Promise.all([
        safeGetItem(STAGE_LOGS_KEY),
        safeGetItem(FOOD_ACCEPTANCE_KEY),
        safeGetItem(TEXTURE_LADDER_KEY),
        safeGetItem(PROFILE_KEY),
      ]);
      if (stageRaw) setStageLogs(JSON.parse(stageRaw));
      if (foodRaw) setFoodAcceptanceLogs(JSON.parse(foodRaw));
      if (textureRaw) setTextureLadderLogs(JSON.parse(textureRaw));
      if (profileRaw) {
        const profile = JSON.parse(profileRaw);
        if (profile.birthDate) {
          setBabyAgeMonths(calculateAgeInMonths(profile.birthDate));
        }
      }
    } catch {}
  };

  // Get current stage based on logs or age
  const getCurrentStage = (): StageType => {
    if (stageLogs.length > 0) {
      const latestStageLog = stageLogs[0];
      return latestStageLog.stage;
    }
    if (babyAgeMonths < 4) return 'suckle';
    if (babyAgeMonths < 6) return 'transition';
    if (babyAgeMonths < 8) return 'munch';
    return 'chew';
  };

  const currentStage = getCurrentStage();
  const currentStageIndex = STAGES.findIndex(s => s.id === currentStage);

  // Get current texture level
  const getCurrentTextureLevel = (): number => {
    if (textureLadderLogs.length > 0) {
      const latestTexture = textureLadderLogs[0];
      return latestTexture.accepted ? latestTexture.textureLevel : latestTexture.textureLevel;
    }
    if (babyAgeMonths < 5) return 1;
    if (babyAgeMonths < 6) return 2;
    if (babyAgeMonths < 7) return 3;
    if (babyAgeMonths < 8) return 4;
    if (babyAgeMonths < 9) return 5;
    if (babyAgeMonths < 12) return 6;
    return 7;
  };

  const currentTextureLevel = getCurrentTextureLevel();

  // Alert calculations
  const getLowAcceptanceStreak = (): boolean => {
    const recentLogs = foodAcceptanceLogs.slice(0, 3);
    if (recentLogs.length < 3) return false;
    return recentLogs.every(log => log.acceptanceScore < 2);
  };

  const getHighGagSession = (): boolean => {
    if (foodAcceptanceLogs.length === 0) return false;
    return foodAcceptanceLogs[0].gagEvents > 2;
  };

  // Weekly trend for food acceptance
  const getWeeklyTrend = (): { day: string; avgScore: number }[] => {
    const days: { day: string; avgScore: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayLogs = foodAcceptanceLogs.filter(log => log.date === dateStr);
      const avgScore = dayLogs.length > 0
        ? dayLogs.reduce((sum, log) => sum + log.acceptanceScore, 0) / dayLogs.length
        : 0;
      days.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
        avgScore,
      });
    }
    return days;
  };

  const getAverageScore = (): number => {
    if (foodAcceptanceLogs.length === 0) return 0;
    return foodAcceptanceLogs.reduce((sum, log) => sum + log.acceptanceScore, 0) / foodAcceptanceLogs.length;
  };

  const handleSaveStage = async () => {
    const newEntry: StageLogEntry = {
      id: generateId(),
      stage: selectedStage,
      tonguePattern: selectedTonguePattern,
      notes: stageNotes.trim() || undefined,
      date: getDateStr(),
      babyAgeMonths,
    };
    const updated = [newEntry, ...stageLogs];
    setStageLogs(updated);
    setShowStageForm(false);
    setStageNotes('');
    try {
      await safeSetItem(STAGE_LOGS_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleSaveFoodAcceptance = async () => {
    if (!foodItem.trim()) {
      Alert.alert(t('suckleToChewBridge.sectionB.foodItem') || 'Food Item', 'Please enter food name');
      return;
    }
    const newEntry: FoodAcceptanceEntry = {
      id: generateId(),
      foodItem: foodItem.trim(),
      acceptanceScore,
      gagEvents,
      refusalEvents,
      date: getDateStr(),
      babyAgeMonths,
    };
    const updated = [newEntry, ...foodAcceptanceLogs];
    setFoodAcceptanceLogs(updated);
    setShowFoodForm(false);
    setFoodItem('');
    setAcceptanceScore(3);
    setGagEvents(0);
    setRefusalEvents(0);
    try {
      await safeSetItem(FOOD_ACCEPTANCE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleSaveTextureLadder = async () => {
    const newEntry: TextureLadderEntry = {
      id: generateId(),
      textureLevel: selectedTextureLevel,
      accepted: textureAccepted,
      date: getDateStr(),
      babyAgeMonths,
    };
    const updated = [newEntry, ...textureLadderLogs];
    setTextureLadderLogs(updated);
    setShowTextureForm(false);
    try {
      await safeSetItem(TEXTURE_LADDER_KEY, JSON.stringify(updated));
    } catch {}
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 20 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    subtitle: { fontSize: 14, color: C.text, marginTop: 4 },
    innerTabs: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, padding: 4, marginBottom: 20 },
    innerTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    innerTabActive: { backgroundColor: STAGE_BLUE },
    innerTabText: { fontSize: 12, fontWeight: '600', color: C.muted },
    innerTabTextActive: { color: '#fff' },
    sectionTitle: { fontSize: 12, fontWeight: '600', color: C.text, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 16 },
    stageProgressContainer: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    stageProgressTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 16 },
    stageProgressBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    stageStep: { flex: 1, alignItems: 'center' },
    stageStepCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    stageStepCircleActive: { backgroundColor: STAGE_BLUE },
    stageStepCircleComplete: { backgroundColor: STAGE_GREEN },
    stageStepLabel: { fontSize: 10, color: C.muted, textAlign: 'center' },
    stageStepLabelActive: { color: STAGE_BLUE, fontWeight: '600' },
    stageStepLabelComplete: { color: STAGE_GREEN, fontWeight: '600' },
    progressLine: { flex: 1, height: 3, backgroundColor: C.border, marginHorizontal: 4 },
    progressLineActive: { backgroundColor: STAGE_BLUE },
    progressLineComplete: { backgroundColor: STAGE_GREEN },
    stageInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    stageInfoLabel: { fontSize: 12, color: C.muted },
    stageInfoValue: { fontSize: 12, fontWeight: '600', color: C.text },
    currentBadge: { backgroundColor: STAGE_BLUE, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 12 },
    currentBadgeText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    addBtn: { backgroundColor: STAGE_BLUE, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16 },
    addBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    formCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: STAGE_BLUE },
    formTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
    input: { backgroundColor: C.background, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, fontSize: 15, color: C.text, minHeight: 44, marginBottom: 12 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.background, minHeight: 44, justifyContent: 'center' },
    chipSelected: { backgroundColor: STAGE_BLUE, borderColor: STAGE_BLUE },
    chipText: { fontSize: 13, fontWeight: '600', color: C.muted },
    chipTextSelected: { color: '#fff' },
    scoreRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    scoreBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.background, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
    scoreBtnSelected: { backgroundColor: STAGE_AMBER, borderColor: STAGE_AMBER },
    scoreBtnText: { fontSize: 14, fontWeight: '600', color: C.muted },
    scoreBtnTextSelected: { color: '#fff' },
    counterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    counterLabel: { fontSize: 14, color: C.muted, flex: 1 },
    counterValue: { fontSize: 18, fontWeight: '700', color: C.text, minWidth: 40, textAlign: 'center' },
    counterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' },
    formButtonRow: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border, minHeight: 44, justifyContent: 'center' },
    cancelBtnText: { fontSize: 14, fontWeight: '600', color: C.muted },
    saveBtn: { flex: 1, backgroundColor: STAGE_GREEN, borderRadius: 12, padding: 14, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
    saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    entryCard: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
    entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
    entryRowLast: { borderBottomWidth: 0 },
    entryIcon: { fontSize: 20, marginRight: 10 },
    entryInfo: { flex: 1 },
    entryTitle: { fontSize: 14, fontWeight: '600', color: C.text },
    entryMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
    emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 30 },
    textureLadderContainer: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    textureLadderTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 12 },
    textureLevelRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    textureLevelNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    textureLevelNumberActive: { backgroundColor: STAGE_GREEN },
    textureLevelNumberText: { fontSize: 12, fontWeight: '700', color: C.muted },
    textureLevelNumberTextActive: { color: '#fff' },
    textureLevelInfo: { flex: 1 },
    textureLevelLabel: { fontSize: 13, fontWeight: '600', color: C.text },
    textureLevelMonths: { fontSize: 11, color: C.muted },
    textureCurrentBadge: { backgroundColor: STAGE_GREEN + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    textureCurrentBadgeText: { fontSize: 10, fontWeight: '600', color: STAGE_GREEN },
    alertCard: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: STAGE_RED },
    alertCardAmber: { backgroundColor: '#FEF3C7', borderColor: STAGE_AMBER },
    alertTitle: { fontSize: 13, fontWeight: '700', color: STAGE_RED, marginBottom: 4 },
    alertTitleAmber: { color: '#92400E' },
    alertText: { fontSize: 13, color: '#991B1B' },
    alertTextAmber: { color: '#78350F' },
    chartCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    chartTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 12 },
    chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 100 },
    chartBar: { width: 30, backgroundColor: STAGE_BLUE, borderRadius: 4, minHeight: 4 },
    chartBarEmpty: { backgroundColor: C.border },
    chartLabel: { fontSize: 10, color: C.muted, marginTop: 4, textAlign: 'center' },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    statCard: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    statValue: { fontSize: 24, fontWeight: '700', color: STAGE_BLUE },
    statLabel: { fontSize: 11, color: C.muted, marginTop: 4 },
  });

  const weeklyTrend = getWeeklyTrend();
  const avgScore = getAverageScore();
  const showReferralAlert = getLowAcceptanceStreak();
  const showTherapistAlert = getHighGagSession();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('suckleToChewBridge.greeting')}</Text>
          <Text style={styles.title}>🍼 {t('suckleToChewBridge.title')}</Text>
          <Text style={styles.subtitle}>
            {babyAgeMonths > 0
              ? `${Math.round(babyAgeMonths)} months old`
              : t('suckleToChewBridge.subtitle') || ''}
          </Text>
        </View>

        <View style={styles.innerTabs}>
          {(['stageTracker', 'foodAcceptance', 'textureLadder', 'alerts'] as InnerTab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.innerTab, innerTab === tab && styles.innerTabActive]}
              onPress={() => setInnerTab(tab)}
              accessibilityLabel={t(`suckleToChewBridge.tabs.${tab}`)}
              accessibilityRole="tab"
              accessibilityState={{ selected: innerTab === tab }}
            >
              <Text style={[styles.innerTabText, innerTab === tab && styles.innerTabTextActive]}>
                {t(`suckleToChewBridge.tabs.${tab}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stage Tracker Tab */}
        {innerTab === 'stageTracker' && (
          <>
            <View style={styles.stageProgressContainer}>
              <Text style={styles.stageProgressTitle}>{t('suckleToChewBridge.sectionA.title')}</Text>
              <View style={styles.stageProgressBar}>
                {STAGES.map((stage, idx) => {
                  const stageLogIndex = getStageIndex(currentStage);
                  const isComplete = stageLogIndex > idx;
                  const isActive = stageLogIndex === idx;
                  return (
                    <View key={stage.id} style={styles.stageStep}>
                      <View style={[
                        styles.stageStepCircle,
                        isActive && styles.stageStepCircleActive,
                        isComplete && styles.stageStepCircleComplete,
                      ]}>
                        {isComplete ? (
                          <MaterialCommunityIcons name="check" size={20} color="#fff" />
                        ) : (
                          <MaterialCommunityIcons name={stage.icon as any} size={18} color={isActive ? '#fff' : C.muted} />
                        )}
                      </View>
                      <Text style={[
                        styles.stageStepLabel,
                        isActive && styles.stageStepLabelActive,
                        isComplete && styles.stageStepLabelComplete,
                      ]}>
                        {t(stage.labelKey)}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.stageInfo}>
                <Text style={styles.stageInfoLabel}>{t(STAGES[currentStageIndex]?.labelKey ?? '')}</Text>
                <Text style={styles.stageInfoValue}>{STAGES[currentStageIndex]?.months}</Text>
              </View>
            </View>

            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>
                {t('suckleToChewBridge.sectionC.currentLevel')}: {currentTextureLevel}/7
              </Text>
            </View>

            {!showStageForm ? (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowStageForm(true)} accessibilityLabel={t('suckleToChewBridge.sectionA.logStage')}>
                <Text style={styles.addBtnText}>+ {t('suckleToChewBridge.sectionA.logStage')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>{t('suckleToChewBridge.sectionA.logStage')}</Text>

                <Text style={styles.sectionTitle}>{t('suckleToChewBridge.stages.suckle')}</Text>
                <View style={styles.chipRow}>
                  {STAGES.map(stage => (
                    <TouchableOpacity
                      key={stage.id}
                      style={[styles.chip, selectedStage === stage.id && styles.chipSelected]}
                      onPress={() => setSelectedStage(stage.id)}
                      accessibilityLabel={t(stage.labelKey)}
                    >
                      <Text style={[styles.chipText, selectedStage === stage.id && styles.chipTextSelected]}>
                        {t(stage.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>{t('suckleToChewBridge.sectionA.tonguePattern')}</Text>
                <View style={styles.chipRow}>
                  {Object.entries(TONGUE_PATTERNS).map(([pattern, labelKey]) => (
                    <TouchableOpacity
                      key={pattern}
                      style={[styles.chip, selectedTonguePattern === pattern && styles.chipSelected]}
                      onPress={() => setSelectedTonguePattern(pattern as TonguePattern)}
                      accessibilityLabel={t(labelKey)}
                    >
                      <Text style={[styles.chipText, selectedTonguePattern === pattern && styles.chipTextSelected]}>
                        {t(labelKey)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.input}
                  placeholder={t('suckleToChewBridge.sectionA.notesPlaceholder')}
                  placeholderTextColor={C.muted}
                  value={stageNotes}
                  onChangeText={setStageNotes}
                  multiline
                />

                <View style={styles.formButtonRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowStageForm(false)} accessibilityLabel={t('suckleToChewBridge.common.cancel')}>
                    <Text style={styles.cancelBtnText}>{t('suckleToChewBridge.common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveStage} accessibilityLabel={t('suckleToChewBridge.common.save')}>
                    <Text style={styles.saveBtnText}>{t('suckleToChewBridge.common.save')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>{t('suckleToChewBridge.sectionA.title')}</Text>
            {stageLogs.length === 0 ? (
              <Text style={styles.emptyText}>{t('suckleToChewBridge.sectionA.noLogs')}</Text>
            ) : (
              stageLogs.slice(0, 10).map((log, idx) => (
                <View key={log.id} style={[styles.entryCard, idx === stageLogs.slice(0, 10).length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.entryRow}>
                    <MaterialCommunityIcons name={STAGES.find(s => s.id === log.stage)?.icon as any || 'check'} size={20} color={STAGE_BLUE} style={styles.entryIcon} />
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryTitle}>{t(STAGES.find(s => s.id === log.stage)?.labelKey ?? '')}</Text>
                      <Text style={styles.entryMeta}>
                        {t(TONGUE_PATTERNS[log.tonguePattern])} · {log.date}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* Food Acceptance Tab */}
        {innerTab === 'foodAcceptance' && (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{avgScore.toFixed(1)}</Text>
                <Text style={styles.statLabel}>{t('suckleToChewBridge.sectionB.averageScore')}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{foodAcceptanceLogs.length}</Text>
                <Text style={styles.statLabel}>{t('suckleToChewBridge.sectionB.title')}</Text>
              </View>
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{t('suckleToChewBridge.sectionB.weeklyTrend')}</Text>
              <View style={styles.chartRow}>
                {weeklyTrend.map((day, idx) => (
                  <View key={idx} style={{ alignItems: 'center' }}>
                    <View style={[
                      styles.chartBar,
                      day.avgScore === 0 ? styles.chartBarEmpty : {},
                      { height: Math.max(4, day.avgScore * 18) }
                    ]} />
                    <Text style={styles.chartLabel}>{day.day}</Text>
                  </View>
                ))}
              </View>
            </View>

            {!showFoodForm ? (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowFoodForm(true)} accessibilityLabel={t('suckleToChewBridge.sectionB.title')}>
                <Text style={styles.addBtnText}>+ {t('suckleToChewBridge.sectionB.title')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>{t('suckleToChewBridge.sectionB.title')}</Text>

                <TextInput
                  style={styles.input}
                  placeholder={t('suckleToChewBridge.sectionB.foodItemPlaceholder')}
                  placeholderTextColor={C.muted}
                  value={foodItem}
                  onChangeText={setFoodItem}
                />

                <Text style={styles.sectionTitle}>{t('suckleToChewBridge.sectionB.acceptanceScore')}</Text>
                <View style={styles.scoreRow}>
                  {[1, 2, 3, 4, 5].map(score => (
                    <TouchableOpacity
                      key={score}
                      style={[styles.scoreBtn, acceptanceScore === score && styles.scoreBtnSelected]}
                      onPress={() => setAcceptanceScore(score)}
                      accessibilityLabel={t(`suckleToChewBridge.sectionB.scores.${score}`)}
                    >
                      <Text style={[styles.scoreBtnText, acceptanceScore === score && styles.scoreBtnTextSelected]}>
                        {score}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>{t('suckleToChewBridge.sectionB.gagEvents')}</Text>
                <View style={styles.counterRow}>
                  <Text style={styles.counterLabel}>{t('suckleToChewBridge.sectionB.gagEvents')}</Text>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => setGagEvents(Math.max(0, gagEvents - 1))} accessibilityLabel={t('suckleToChewBridge.sectionB.gagMinus')}>
                    <MaterialCommunityIcons name="minus" size={16} color={C.text} />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{gagEvents}</Text>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => setGagEvents(gagEvents + 1)} accessibilityLabel={t('suckleToChewBridge.sectionB.gagPlus')}>
                    <MaterialCommunityIcons name="plus" size={16} color={C.text} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>{t('suckleToChewBridge.sectionB.refusalEvents')}</Text>
                <View style={styles.counterRow}>
                  <Text style={styles.counterLabel}>{t('suckleToChewBridge.sectionB.refusalEvents')}</Text>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => setRefusalEvents(Math.max(0, refusalEvents - 1))} accessibilityLabel={t('suckleToChewBridge.sectionB.refusalMinus')}>
                    <MaterialCommunityIcons name="minus" size={16} color={C.text} />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{refusalEvents}</Text>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => setRefusalEvents(refusalEvents + 1)} accessibilityLabel={t('suckleToChewBridge.sectionB.refusalPlus')}>
                    <MaterialCommunityIcons name="plus" size={16} color={C.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.formButtonRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowFoodForm(false)} accessibilityLabel={t('suckleToChewBridge.common.cancel')}>
                    <Text style={styles.cancelBtnText}>{t('suckleToChewBridge.common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveFoodAcceptance} accessibilityLabel={t('suckleToChewBridge.common.save')}>
                    <Text style={styles.saveBtnText}>{t('suckleToChewBridge.common.save')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>{t('suckleToChewBridge.sectionB.title')}</Text>
            {foodAcceptanceLogs.length === 0 ? (
              <Text style={styles.emptyText}>{t('suckleToChewBridge.sectionB.noLogs')}</Text>
            ) : (
              foodAcceptanceLogs.slice(0, 20).map((log, idx) => (
                <View key={log.id} style={[styles.entryCard, idx === Math.min(19, foodAcceptanceLogs.length - 1) && { borderBottomWidth: 0 }]}>
                  <View style={styles.entryRow}>
                    <Text style={styles.entryIcon}>🍽️</Text>
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryTitle}>{log.foodItem}</Text>
                      <Text style={styles.entryMeta}>
                        Score: {log.acceptanceScore} · Gags: {log.gagEvents} · Refusals: {log.refusalEvents}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* Texture Ladder Tab */}
        {innerTab === 'textureLadder' && (
          <>
            <View style={styles.textureLadderContainer}>
              <Text style={styles.textureLadderTitle}>{t('suckleToChewBridge.sectionC.title')}</Text>
              {TEXTURE_LEVELS.map((level, idx) => (
                <View key={level.level} style={[styles.textureLevelRow, idx === TEXTURE_LEVELS.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[
                    styles.textureLevelNumber,
                    currentTextureLevel >= level.level && styles.textureLevelNumberActive
                  ]}>
                    <Text style={[
                      styles.textureLevelNumberText,
                      currentTextureLevel >= level.level && styles.textureLevelNumberTextActive
                    ]}>
                      {level.level}
                    </Text>
                  </View>
                  <View style={styles.textureLevelInfo}>
                    <Text style={styles.textureLevelLabel}>{t(level.labelKey)}</Text>
                    <Text style={styles.textureLevelMonths}>{level.months}</Text>
                  </View>
                  {currentTextureLevel === level.level && (
                    <View style={styles.textureCurrentBadge}>
                      <Text style={styles.textureCurrentBadgeText}>{t('suckleToChewBridge.sectionC.currentLevel')}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {!showTextureForm ? (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowTextureForm(true)} accessibilityLabel={t('suckleToChewBridge.sectionC.logTexture')}>
                <Text style={styles.addBtnText}>+ {t('suckleToChewBridge.sectionC.logTexture')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>{t('suckleToChewBridge.sectionC.logTexture')}</Text>

                <Text style={styles.sectionTitle}>{t('suckleToChewBridge.sectionC.textureLevels.level1').split(' ')[0]}</Text>
                <View style={styles.chipRow}>
                  {TEXTURE_LEVELS.map(level => (
                    <TouchableOpacity
                      key={level.level}
                      style={[styles.chip, selectedTextureLevel === level.level && styles.chipSelected]}
                      onPress={() => setSelectedTextureLevel(level.level)}
                      accessibilityLabel={`${t('suckleToChewBridge.sectionC.textureLevel')} ${level.level}`}
                    >
                      <Text style={[styles.chipText, selectedTextureLevel === level.level && styles.chipTextSelected]}>
                        {level.level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>{t('suckleToChewBridge.sectionC.accepted')}</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, textureAccepted && styles.chipSelected]}
                    onPress={() => setTextureAccepted(true)}
                    accessibilityLabel={t('suckleToChewBridge.sectionC.accepted')}
                  >
                    <Text style={[styles.chipText, textureAccepted && styles.chipTextSelected]}>
                      ✓ {t('suckleToChewBridge.sectionC.accepted')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chip, !textureAccepted && styles.chipSelected]}
                    onPress={() => setTextureAccepted(false)}
                    accessibilityLabel={t('suckleToChewBridge.sectionC.rejected')}
                  >
                    <Text style={[styles.chipText, !textureAccepted && styles.chipTextSelected]}>
                      ✗ {t('suckleToChewBridge.sectionC.rejected')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formButtonRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowTextureForm(false)} accessibilityLabel={t('suckleToChewBridge.common.cancel')}>
                    <Text style={styles.cancelBtnText}>{t('suckleToChewBridge.common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTextureLadder} accessibilityLabel={t('suckleToChewBridge.common.save')}>
                    <Text style={styles.saveBtnText}>{t('suckleToChewBridge.common.save')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>{t('suckleToChewBridge.sectionC.title')}</Text>
            {textureLadderLogs.length === 0 ? (
              <Text style={styles.emptyText}>{t('suckleToChewBridge.sectionC.noLogs')}</Text>
            ) : (
              textureLadderLogs.slice(0, 15).map((log, idx) => (
                <View key={log.id} style={[styles.entryCard, idx === Math.min(14, textureLadderLogs.length - 1) && { borderBottomWidth: 0 }]}>
                  <View style={styles.entryRow}>
                    <MaterialCommunityIcons name={log.accepted ? 'check-circle' : 'close-circle'} size={20} color={log.accepted ? STAGE_GREEN : STAGE_RED} style={styles.entryIcon} />
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryTitle}>
                        {t('suckleToChewBridge.sectionC.textureLevels.level1').split(' ')[0]} {log.textureLevel}
                      </Text>
                      <Text style={styles.entryMeta}>
                        {log.date} · {log.accepted ? t('suckleToChewBridge.sectionC.accepted') : t('suckleToChewBridge.sectionC.rejected')}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* Alerts Tab */}
        {innerTab === 'alerts' && (
          <>
            <Text style={styles.sectionTitle}>{t('suckleToChewBridge.sectionD.title')}</Text>
            {showReferralAlert && (
              <View style={styles.alertCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color={STAGE_RED} />
                  <Text style={styles.alertTitle}>{t('suckleToChewBridge.sectionD.title')}</Text>
                </View>
                <Text style={styles.alertText}>{t('suckleToChewBridge.sectionD.referralAlert')}</Text>
              </View>
            )}
            {showTherapistAlert && (
              <View style={[styles.alertCard, styles.alertCardAmber]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <MaterialCommunityIcons name="doctor" size={20} color={STAGE_AMBER} />
                  <Text style={[styles.alertTitle, styles.alertTitleAmber]}>{t('suckleToChewBridge.sectionD.therapistAlert')}</Text>
                </View>
                <Text style={[styles.alertText, styles.alertTextAmber]}>{t('suckleToChewBridge.sectionD.therapistAlert')}</Text>
              </View>
            )}
            {!showReferralAlert && !showTherapistAlert && (
              <Text style={styles.emptyText}>{t('suckleToChewBridge.sectionD.noAlerts')}</Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
