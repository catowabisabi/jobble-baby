import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const JOURNAL_KEY = STORAGE_KEYS.SOLID_FOOD_JOURNAL;
const ALLERGENS_KEY = STORAGE_KEYS.SOLID_FOOD_ALLERGENS;
const PROFILE_KEY = '@jobble_baby_profile';

const STAGES = [
  { id: 'stage1', labelKey: 'solidFood.stages.stage1', months: '6-7mo', icon: 'food-apple' },
  { id: 'stage2', labelKey: 'solidFood.stages.stage2', months: '7-9mo', icon: 'food-variant' },
  { id: 'stage3', labelKey: 'solidFood.stages.stage3', months: '9-12mo', icon: 'food-fork-drink' },
  { id: 'stage4', labelKey: 'solidFood.stages.stage4', months: '12mo+', icon: 'silverware-fork-knife' },
];

const TEXTURE_LEVELS = [
  { level: 1, labelKey: 'solidFood.texture.level1', description: 'Smooth puree', months: '6mo' },
  { level: 2, labelKey: 'solidFood.texture.level2', description: 'Mashed/ground', months: '7mo' },
  { level: 3, labelKey: 'solidFood.texture.level3', description: 'Chopped soft', months: '9mo' },
  { level: 4, labelKey: 'solidFood.texture.level4', description: 'Family texture', months: '12mo' },
];

const PRIORITY_ALLERGENS = [
  { id: 'peanut', labelKey: 'solidFood.allergens.peanut', emoji: '🥜' },
  { id: 'egg', labelKey: 'solidFood.allergens.egg', emoji: '🥚' },
  { id: 'milk', labelKey: 'solidFood.allergens.milk', emoji: '🥛' },
  { id: 'soy', labelKey: 'solidFood.allergens.soy', emoji: '🫘' },
  { id: 'wheat', labelKey: 'solidFood.allergens.wheat', emoji: '🌾' },
  { id: 'tree_nuts', labelKey: 'solidFood.allergens.treeNuts', emoji: '🌰' },
  { id: 'fish', labelKey: 'solidFood.allergens.fish', emoji: '🐟' },
  { id: 'shellfish', labelKey: 'solidFood.allergens.shellfish', emoji: '🦐' },
];

const IRON_SOURCES = [
  { id: 'fortified_cereal', label: 'Fortified Cereal', emoji: '🥣' },
  { id: 'meat', label: 'Meat/Poultry', emoji: '🥩' },
  { id: 'beans', label: 'Beans/Lentils', emoji: '🫘' },
  { id: 'leafy_greens', label: 'Leafy Greens', emoji: '🥬' },
];

type AllergenStatus = 'not_introduced' | 'introduced' | 'reaction_observed' | 'tolerated';

interface FoodEntry {
  id: string;
  foodName: string;
  dateIntroduced: string;
  amount: string;
  reaction: 'none' | 'mild' | 'moderate' | 'severe';
  textureLevel: 1 | 2 | 3 | 4;
  notes?: string;
  babyAgeMonths: number;
}

interface SolidAllergenEntry {
  id: string;
  status: AllergenStatus;
  date_introduced?: string;
  reactions: Array<{
    id: string;
    type: string;
    symptoms: string[];
    severity: number;
    date: string;
    notes?: string;
  }>;
}

interface BabyProfile {
  birthDate: string;
}

const STATUS_COLORS: Record<AllergenStatus, string> = {
  not_introduced: '#9CA3AF',
  introduced: '#3B82F6',
  reaction_observed: '#F97316',
  tolerated: '#22C55E',
};

const STAGE_GREEN = '#22C55E';
const STAGE_BLUE = '#3B82F6';
const STAGE_AMBER = '#F59E0B';

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

type InnerTab = 'journal' | 'allergens' | 'progress' | 'nutrients';

export default function SolidFoodScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [innerTab, setInnerTab] = useState<InnerTab>('journal');
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [allergenEntries, setAllergenEntries] = useState<Record<string, SolidAllergenEntry>>({});
  const [babyAgeMonths, setBabyAgeMonths] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [amount, setAmount] = useState('');
  const [reaction, setReaction] = useState<'none' | 'mild' | 'moderate' | 'severe'>('none');
  const [textureLevel, setTextureLevel] = useState<1 | 2 | 3 | 4>(1);
  const [notes, setNotes] = useState('');
  const [ironLog, setIronLog] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [raw, allergenRaw, profileRaw] = await Promise.all([
        AsyncStorage.getItem(JOURNAL_KEY),
        AsyncStorage.getItem(ALLERGENS_KEY),
        AsyncStorage.getItem(PROFILE_KEY),
      ]);
      if (raw) setEntries(JSON.parse(raw));
      if (allergenRaw) setAllergenEntries(JSON.parse(allergenRaw));
      if (profileRaw) {
        const profile: BabyProfile = JSON.parse(profileRaw);
        if (profile.birthDate) {
          setBabyAgeMonths(calculateAgeInMonths(profile.birthDate));
        }
      }
    } catch {}
  };

  const getStageForAge = (age: number): number => {
    if (age < 6) return -1;
    if (age < 7) return 0;
    if (age < 9) return 1;
    if (age < 12) return 2;
    return 3;
  };

  const currentStageIndex = getStageForAge(babyAgeMonths);

  const handleAddFood = async () => {
    if (!foodName.trim()) {
      Alert.alert(t('solidFood.journal.foodName') || 'Food Name', 'Please enter food name');
      return;
    }
    const newEntry: FoodEntry = {
      id: generateId(),
      foodName: foodName.trim(),
      dateIntroduced: getDateStr(),
      amount: amount.trim() || 'tsp',
      reaction,
      textureLevel,
      notes: notes.trim() || undefined,
      babyAgeMonths,
    };
    const updated = [newEntry, ...entries];
    setEntries(updated);
    setFoodName('');
    setAmount('');
    setReaction('none');
    setTextureLevel(1);
    setNotes('');
    setShowAddForm(false);
    try {
      await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleAllergenPress = (allergenId: string) => {
    const current = allergenEntries[allergenId]?.status ?? 'not_introduced';
    const next: AllergenStatus =
      current === 'not_introduced' ? 'introduced' :
      current === 'introduced' ? 'tolerated' :
      current === 'tolerated' ? 'tolerated' :
      'reaction_observed';

    const updated: Record<string, SolidAllergenEntry> = {
      ...allergenEntries,
      [allergenId]: {
        id: allergenId,
        status: next,
        date_introduced: (next === 'introduced' || next === 'tolerated') ? new Date().toISOString() : undefined,
        reactions: allergenEntries[allergenId]?.reactions ?? [],
      },
    };
    setAllergenEntries(updated);
    AsyncStorage.setItem(ALLERGENS_KEY, JSON.stringify(updated)).catch(() => {});
  };

  const toggleIronSource = (sourceId: string) => {
    const today = getDateStr();
    const key = `${sourceId}_${today}`;
    if (ironLog.includes(key)) {
      setIronLog(ironLog.filter(k => k !== key));
    } else {
      setIronLog([...ironLog, key]);
    }
  };

  const getIronSourcesToday = (): string[] => {
    const today = getDateStr();
    return ironLog.filter(k => k.endsWith(today)).map(k => k.split('_')[0]);
  };

  const getLastIronDate = (): string | null => {
    if (ironLog.length === 0) return null;
    const sorted = [...ironLog].sort().reverse();
    const lastKey = sorted[0];
    return lastKey.split('_').slice(1).join('_');
  };

  const daysSinceIron = (): number => {
    const last = getLastIronDate();
    if (!last) return 999;
    const diff = Date.now() - new Date(last).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const groupedEntries = entries.reduce((acc, entry) => {
    if (!acc[entry.dateIntroduced]) acc[entry.dateIntroduced] = [];
    acc[entry.dateIntroduced].push(entry);
    return acc;
  }, {} as Record<string, FoodEntry[]>);

  const formatDateHeader = (dateStr: string): string => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return t('bondingJournal.today') || 'Today';
    if (dateStr === yesterday) return t('bondingJournal.yesterday') || 'Yesterday';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTextureAlert = (): boolean => {
    const expectedLevel = babyAgeMonths < 7 ? 1 : babyAgeMonths < 9 ? 2 : babyAgeMonths < 12 ? 3 : 4;
    return expectedLevel - textureLevel >= 2;
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
    innerTabText: { fontSize: 13, fontWeight: '600', color: C.muted },
    innerTabTextActive: { color: '#fff' },
    sectionTitle: { fontSize: 12, fontWeight: '600', color: C.text, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 16 },
    stageProgressContainer: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    stageProgressTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 16 },
    stageProgressBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    stageStep: { flex: 1, alignItems: 'center' },
    stageStepCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
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
    addBtn: { backgroundColor: STAGE_BLUE, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16 },
    addBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    formCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: STAGE_BLUE },
    formTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
    input: { backgroundColor: C.background, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, fontSize: 15, color: C.text, minHeight: 44, marginBottom: 12 },
    amountRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    amountChip: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.background, alignItems: 'center' },
    amountChipSelected: { backgroundColor: STAGE_BLUE, borderColor: STAGE_BLUE },
    amountChipText: { fontSize: 13, fontWeight: '600', color: C.muted },
    amountChipTextSelected: { color: '#fff' },
    reactionRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    reactionChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.background, alignItems: 'center' },
    reactionChipSelected: { borderColor: STAGE_AMBER, backgroundColor: STAGE_AMBER + '20' },
    reactionChipText: { fontSize: 12, fontWeight: '600', color: C.muted },
    reactionChipTextSelected: { color: STAGE_AMBER },
    textureRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    textureChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.background, alignItems: 'center' },
    textureChipSelected: { backgroundColor: STAGE_GREEN, borderColor: STAGE_GREEN },
    textureChipText: { fontSize: 12, fontWeight: '600', color: C.muted },
    textureChipTextSelected: { color: '#fff' },
    formButtonRow: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border, minHeight: 44, justifyContent: 'center' },
    cancelBtnText: { fontSize: 14, fontWeight: '600', color: C.muted },
    saveBtn: { flex: 1, backgroundColor: STAGE_GREEN, borderRadius: 12, padding: 14, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
    saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    dateGroup: { marginBottom: 20 },
    dateHeader: { fontSize: 14, fontWeight: '600', color: C.muted, marginBottom: 10, textTransform: 'uppercase' },
    entryCard: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
    entryFoodName: { fontSize: 16, fontWeight: '600', color: C.text },
    entryMeta: { flexDirection: 'row', gap: 8, marginTop: 6 },
    entryBadge: { backgroundColor: STAGE_BLUE + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    entryBadgeText: { fontSize: 11, fontWeight: '600', color: STAGE_BLUE },
    entryReactionBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    entryReactionText: { fontSize: 11, fontWeight: '600' },
    entryNotes: { fontSize: 13, color: C.muted, marginTop: 6 },
    emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 30 },
    allergenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    allergenItem: { width: '47%' },
    allergenCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    allergenContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    allergenEmoji: { fontSize: 28 },
    allergenName: { fontSize: 15, fontWeight: '600', color: C.text },
    allergenBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
    allergenBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
    textureCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
    textureHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    textureLevel: { fontSize: 20, fontWeight: '700', color: STAGE_BLUE },
    textureLabel: { fontSize: 15, fontWeight: '600', color: C.text },
    textureMonths: { fontSize: 12, color: C.muted },
    textureDesc: { fontSize: 13, color: C.muted },
    textureCurrent: { backgroundColor: STAGE_GREEN + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    textureCurrentText: { fontSize: 11, fontWeight: '600', color: STAGE_GREEN },
    textureAlert: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#EF4444' },
    textureAlertText: { fontSize: 13, color: '#DC2626', fontWeight: '500' },
    ironCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    ironTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
    ironDesc: { fontSize: 12, color: C.muted, marginBottom: 12 },
    ironGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    ironChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.background },
    ironChipSelected: { backgroundColor: STAGE_AMBER + '20', borderColor: STAGE_AMBER },
    ironEmoji: { fontSize: 18 },
    ironLabel: { fontSize: 13, color: C.text },
    ironAlert: { backgroundColor: '#FEF3C7', borderRadius: 8, padding: 12, marginTop: 12, borderWidth: 1, borderColor: STAGE_AMBER, borderLeftWidth: 4, borderLeftColor: STAGE_AMBER },
    ironAlertText: { fontSize: 13, fontWeight: '600', color: '#92400E' },
    tipCard: { backgroundColor: '#FEF3C7', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: STAGE_AMBER, borderLeftWidth: 4, borderLeftColor: STAGE_AMBER },
    tipTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 4 },
    tipText: { fontSize: 13, color: '#78350F', lineHeight: 18 },
    navLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
    navLinkText: { fontSize: 13, color: STAGE_BLUE, flex: 1 },
  });

  const reactionColors: Record<string, string> = {
    none: STAGE_GREEN,
    mild: '#F59E0B',
    moderate: '#F97316',
    severe: '#EF4444',
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
            <Text style={styles.greeting}>{t('solidFood.feedingJourney')}</Text>
          <Text style={styles.title}>🥗 {t('solidFood.title')}</Text>
          <Text style={styles.subtitle}>
            {babyAgeMonths > 0
              ? `${Math.round(babyAgeMonths)} months old · ${t('solidFood.subtitle')}`
              : t('solidFood.subtitle')}
          </Text>
        </View>

        <View style={styles.innerTabs}>
          {(['journal', 'allergens', 'progress', 'nutrients'] as InnerTab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.innerTab, innerTab === tab && styles.innerTabActive]}
              onPress={() => setInnerTab(tab)}
              accessibilityLabel={`${tab} tab`}
              accessibilityRole="tab"
              accessibilityState={{ selected: innerTab === tab }}
            >
              <Text style={[styles.innerTabText, innerTab === tab && styles.innerTabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {innerTab === 'journal' && (
          <>
            {!showAddForm ? (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddForm(true)} accessibilityLabel="Add food entry" accessibilityRole="button">
                <Text style={styles.addBtnText}>+ {t('solidFood.journal.addFood')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>{t('solidFood.journal.addFood')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('solidFood.journal.foodName')}
                  placeholderTextColor={C.muted}
                  value={foodName}
                  onChangeText={setFoodName}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('solidFood.journal.amount')}
                  placeholderTextColor={C.muted}
                  value={amount}
                  onChangeText={setAmount}
                />
                <Text style={styles.sectionTitle}>{t('solidFood.journal.reaction')}</Text>
                <View style={styles.reactionRow}>
                  {(['none', 'mild', 'moderate', 'severe'] as const).map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.reactionChip, reaction === r && styles.reactionChipSelected]}
                      onPress={() => setReaction(r)}
                      accessibilityLabel={`${r} reaction`}
                    >
                      <Text style={[styles.reactionChipText, reaction === r && styles.reactionChipTextSelected]}>
                        {t(`solidFood.journal.${r}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.sectionTitle}>{t('solidFood.journal.texture')}</Text>
                <View style={styles.textureRow}>
                  {([1, 2, 3, 4] as const).map(l => (
                    <TouchableOpacity
                      key={l}
                      style={[styles.textureChip, textureLevel === l && styles.textureChipSelected]}
                      onPress={() => setTextureLevel(l)}
                      accessibilityLabel={`Texture level ${l}`}
                    >
                      <Text style={[styles.textureChipText, textureLevel === l && styles.textureChipTextSelected]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[styles.input, { minHeight: 60 }]}
                  placeholder={t('solidFood.journal.notes')}
                  placeholderTextColor={C.muted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
                <View style={styles.formButtonRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddForm(false)} accessibilityLabel="Cancel">
                    <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleAddFood} accessibilityLabel="Save food entry">
                    <Text style={styles.saveBtnText}>{t('common.save')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>{t('solidFood.journal.title')}</Text>
            {Object.keys(groupedEntries).length === 0 ? (
              <Text style={styles.emptyText}>{t('solidFood.journal.noEntries')}</Text>
            ) : (
              Object.entries(groupedEntries).map(([date, dateEntries]) => (
                <View key={date} style={styles.dateGroup}>
                  <Text style={styles.dateHeader}>{formatDateHeader(date)}</Text>
                  {dateEntries.map(entry => (
                    <View key={entry.id} style={styles.entryCard}>
                      <Text style={styles.entryFoodName}>{entry.foodName}</Text>
                      <View style={styles.entryMeta}>
                        <View style={styles.entryBadge}>
                          <Text style={styles.entryBadgeText}>{entry.amount}</Text>
                        </View>
                        <View style={[styles.entryReactionBadge, { backgroundColor: reactionColors[entry.reaction] + '20' }]}>
                          <Text style={[styles.entryReactionText, { color: reactionColors[entry.reaction] }]}>
                            {t(`solidFood.journal.${entry.reaction}`)}
                          </Text>
                        </View>
                        <View style={styles.entryBadge}>
                          <Text style={styles.entryBadgeText}>T{entry.textureLevel}</Text>
                        </View>
                      </View>
                      {entry.notes && <Text style={styles.entryNotes}>{entry.notes}</Text>}
                    </View>
                  ))}
                </View>
              ))
            )}
          </>
        )}

        {innerTab === 'allergens' && (
          <>
            <View style={styles.tipCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <MaterialCommunityIcons name="lightbulb" size={16} color="#F59E0B" />
                <Text style={styles.tipTitle}>{t('solidFood.tips.allergenTip')}</Text>
              </View>
            </View>
            <View style={styles.allergenGrid}>
              {PRIORITY_ALLERGENS.map(allergen => {
                const entry = allergenEntries[allergen.id];
                const status = entry?.status ?? 'not_introduced';
                const statusColor = STATUS_COLORS[status];
                return (
                  <TouchableOpacity
                    key={allergen.id}
                    style={styles.allergenItem}
                    onPress={() => handleAllergenPress(allergen.id)}
                    accessibilityLabel={`${allergen.emoji} ${allergen.id} - ${status}`}
                  >
                    <View style={[styles.allergenCard, { borderColor: status === 'reaction_observed' ? '#EF4444' : C.border }]}>
                      <View style={styles.allergenContent}>
                        <Text style={styles.allergenEmoji}>{allergen.emoji}</Text>
                        <Text style={styles.allergenName}>{t(allergen.labelKey)}</Text>
                      </View>
                      <View style={[styles.allergenBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.allergenBadgeText}>
                          {status === 'not_introduced' ? t('solidFood.allergens.notIntroduced') :
                           status === 'introduced' ? t('solidFood.allergens.introduced') :
                           status === 'reaction_observed' ? t('solidFood.allergens.reaction') :
                           t('solidFood.allergens.tolerated')}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Link href="/allergens" style={styles.navLink} asChild>
              <TouchableOpacity accessibilityLabel="View shared allergen log" accessibilityRole="link">
                <MaterialCommunityIcons name="open-in-new" size={18} color={STAGE_BLUE} />
                <Text style={styles.navLinkText}>{t('solidFood.allergens.viewShared') || 'View shared allergen log →'}</Text>
              </TouchableOpacity>
            </Link>
          </>
        )}

        {innerTab === 'progress' && (
          <>
            <View style={styles.stageProgressContainer}>
              <Text style={styles.stageProgressTitle}>{t('solidFood.title')}</Text>
              <View style={styles.stageProgressBar}>
                {STAGES.map((stage, idx) => {
                  const isComplete = currentStageIndex > idx;
                  const isActive = currentStageIndex === idx;
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
                <Text style={styles.stageInfoLabel}>
                  {currentStageIndex >= 0 ? t(STAGES[currentStageIndex]?.labelKey ?? '') : '-'}
                </Text>
                <Text style={styles.stageInfoValue}>
                  {currentStageIndex >= 0 ? STAGES[currentStageIndex].months : '-'}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>{t('solidFood.texture.title')}</Text>
            {TEXTURE_LEVELS.map(tl => (
              <View key={tl.level} style={styles.textureCard}>
                <View style={styles.textureHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={styles.textureLevel}>{tl.level}</Text>
                    <View>
                      <Text style={styles.textureLabel}>{t(tl.labelKey)}</Text>
                      <Text style={styles.textureMonths}>{tl.months}</Text>
                    </View>
                  </View>
                  {textureLevel === tl.level && (
                    <View style={styles.textureCurrent}>
                      <Text style={styles.textureCurrentText}>{t('solidFood.current')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.textureDesc}>{tl.description}</Text>
                {getTextureAlert() && textureLevel === tl.level && (
                  <View style={styles.textureAlert}>
                    <Text style={styles.textureAlertText}>
                      {t('solidFood.texture.behindSchedule') || 'Baby may be 2+ months behind schedule'}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {innerTab === 'nutrients' && (
          <>
            <View style={styles.ironCard}>
              <Text style={styles.ironTitle}>{t('solidFood.nutrients.ironTitle')}</Text>
              <Text style={styles.ironDesc}>{t('solidFood.nutrients.ironDesc')}</Text>
              <View style={styles.ironGrid}>
                {IRON_SOURCES.map(source => {
                  const today = getDateStr();
                  const key = `${source.id}_${today}`;
                  const isSelected = ironLog.includes(key);
                  return (
                    <TouchableOpacity
                      key={source.id}
                      style={[styles.ironChip, isSelected && styles.ironChipSelected]}
                      onPress={() => toggleIronSource(source.id)}
                      accessibilityLabel={`${source.label} iron source`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={styles.ironEmoji}>{source.emoji}</Text>
                      <Text style={styles.ironLabel}>{source.label}</Text>
                      {isSelected && <MaterialCommunityIcons name="check-circle" size={16} color={STAGE_AMBER} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {daysSinceIron() >= 2 && (
                <View style={styles.ironAlert}>
                  <Text style={styles.ironAlertText}>{t('solidFood.nutrients.noIronAlert')}</Text>
                </View>
              )}
            </View>

            <View style={styles.tipCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <MaterialCommunityIcons name="lightbulb" size={16} color="#F59E0B" />
                <Text style={styles.tipTitle}>{t('solidFood.tips.ironTip')}</Text>
              </View>
            </View>

            <Link href="/growth" style={styles.navLink} asChild>
              <TouchableOpacity accessibilityLabel="View growth impact" accessibilityRole="link">
                <MaterialCommunityIcons name="chart-line" size={18} color={STAGE_BLUE} />
                <Text style={styles.navLinkText}>{t('solidFood.growthImpact')} →</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/gut-brain-axis" style={styles.navLink} asChild>
              <TouchableOpacity accessibilityLabel="View gut-brain axis" accessibilityRole="link">
                <MaterialCommunityIcons name="brain" size={18} color={STAGE_BLUE} />
                <Text style={styles.navLinkText}>Gut-Brain Axis →</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/teething" style={styles.navLink} asChild>
              <TouchableOpacity accessibilityLabel="View teething" accessibilityRole="link">
                <MaterialCommunityIcons name="tooth" size={18} color={STAGE_BLUE} />
                <Text style={styles.navLinkText}>{t('solidFood.teethingFoodRefusal')} →</Text>
              </TouchableOpacity>
            </Link>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
