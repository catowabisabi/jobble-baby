import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { awardBadge } from '../utils/badgeService';

const PROFILE_KEY = '@jobble_baby_profile';
const GROWTH_KEY = '@jobble/growth_entries';
const DOSE_HISTORY_KEY = '@jobble/medicine_dose_history';
const CALC_COUNT_KEY = '@jobble/medicine_calc_count';

const MEDICINE_BLUE = '#60A5FA';
const MEDICINE_GREEN = '#10B981';
const MEDICINE_RED = '#EF4444';
const MEDICINE_AMBER = '#F59E0B';

type Medication = 'acetaminophen' | 'ibuprofen' | 'diphenhydramine';

interface BabyProfile {
  name: string;
  birthDate: string;
  gender: 'boy' | 'girl' | 'prefer_not_to_say';
  photoUri?: string;
}

interface GrowthEntry {
  id: string;
  date: string;
  height: number;
  weight: number;
}

interface DoseHistoryEntry {
  id: string;
  medication: Medication;
  doseMl: number;
  doseMg: number;
  timestamp: string;
  weightKg: number;
}

// Standard pediatric dosing
const DOSING_INFO: Record<Medication, {
  nameKey: string;
  brandKey: string;
  concentrationMgPerMl: number;
  dosePerKg: { min: number; max: number };
  maxDailyPerKg: number;
  frequencyHours: { min: number; max: number };
  maxDosesPerDay: number;
  minAgeMonths: number;
}> = {
  acetaminophen: {
    nameKey: 'medicineDose.medication.acetaminophen',
    brandKey: 'medicineDose.medication.acetaminophenBrand',
    concentrationMgPerMl: 160,
    dosePerKg: { min: 10, max: 15 },
    maxDailyPerKg: 75,
    frequencyHours: { min: 4, max: 6 },
    maxDosesPerDay: 5,
    minAgeMonths: 0,
  },
  ibuprofen: {
    nameKey: 'medicineDose.medication.ibuprofen',
    brandKey: 'medicineDose.medication.ibuprofenBrand',
    concentrationMgPerMl: 100,
    dosePerKg: { min: 5, max: 10 },
    maxDailyPerKg: 40,
    frequencyHours: { min: 6, max: 8 },
    maxDosesPerDay: 4,
    minAgeMonths: 6,
  },
  diphenhydramine: {
    nameKey: 'medicineDose.medication.diphenhydramine',
    brandKey: 'medicineDose.medication.diphenhydramineBrand',
    concentrationMgPerMl: 12.5,
    dosePerKg: { min: 0.5, max: 1 },
    maxDailyPerKg: 5,
    frequencyHours: { min: 6, max: 8 },
    maxDosesPerDay: 4,
    minAgeMonths: 0,
  },
};

const MEDICATIONS: Medication[] = ['acetaminophen', 'ibuprofen', 'diphenhydramine'];

// Conversion constants
const ML_PER_TSP = 5;
const DROPS_PER_ML = 20;

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

function getLatestWeight(entries: GrowthEntry[]): number | null {
  if (entries.length === 0) return null;
  return entries[0].weight;
}

function formatTimeAgo(timestamp: string): string {
  try {
    const then = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return '';
  }
}

export default function MedicineDoseScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [growthEntries, setGrowthEntries] = useState<GrowthEntry[]>([]);
  const [selectedMed, setSelectedMed] = useState<Medication>('acetaminophen');
  const [weightInput, setWeightInput] = useState('');
  const [doseHistory, setDoseHistory] = useState<DoseHistoryEntry[]>([]);
  const [calcCount, setCalcCount] = useState(0);
  const [calculatedDose, setCalculatedDose] = useState<{
    ml: number;
    mg: number;
    tsp: number;
    drops: number;
    isMaxDailyExceeded: boolean;
    maxDaily: number;
  } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRaw, growthRaw, historyRaw, countRaw] = await Promise.all([
          AsyncStorage.getItem(PROFILE_KEY),
          AsyncStorage.getItem(GROWTH_KEY),
          AsyncStorage.getItem(DOSE_HISTORY_KEY),
          AsyncStorage.getItem(CALC_COUNT_KEY),
        ]);
        if (profileRaw) setBabyProfile(JSON.parse(profileRaw));
        if (growthRaw) {
          const entries: GrowthEntry[] = JSON.parse(growthRaw);
          setGrowthEntries(entries);
          const latestWeight = getLatestWeight(entries);
          if (latestWeight) setWeightInput(latestWeight.toFixed(1));
        }
        if (historyRaw) setDoseHistory(JSON.parse(historyRaw));
        if (countRaw) setCalcCount(parseInt(countRaw, 10) || 0);
      } catch { /* ignore */ }
    };
    load();
  }, []);

  const babyAge = babyProfile?.birthDate ? calculateAgeInMonths(babyProfile.birthDate) : 0;
  const latestWeight = getLatestWeight(growthEntries);
  const displayWeight = weightInput ? parseFloat(weightInput) : latestWeight;

  const handleCalculate = async () => {
    const weight = parseFloat(weightInput) || latestWeight;
    if (!weight || weight <= 0) {
      Alert.alert('Weight Required', 'Please enter baby weight in kg.');
      return;
    }

    const info = DOSING_INFO[selectedMed];
    const doseMg = weight * info.dosePerKg.max; // Use max recommended per dose
    const doseMl = doseMg / info.concentrationMgPerMl;
    const tsp = doseMl / ML_PER_TSP;
    const drops = Math.round(doseMl * DROPS_PER_ML);
    const maxDaily = info.maxDailyPerKg * weight;
    const isExceeded = doseMg > maxDaily;

    setCalculatedDose({
      ml: Math.round(doseMl * 100) / 100,
      mg: Math.round(doseMg * 10) / 10,
      tsp: Math.round(tsp * 100) / 100,
      drops,
      isMaxDailyExceeded: isExceeded,
      maxDaily: Math.round(maxDaily * 10) / 10,
    });

    // Track calculation count for badge
    const newCount = calcCount + 1;
    setCalcCount(newCount);
    await AsyncStorage.setItem(CALC_COUNT_KEY, newCount.toString());

    // Award badge if first 5 calculations
    if (newCount === 5) {
      await awardBadge('dose_guardian');
    }
  };

  const handleSaveDose = async () => {
    if (!calculatedDose) return;

    const entry: DoseHistoryEntry = {
      id: Date.now().toString(),
      medication: selectedMed,
      doseMl: calculatedDose.ml,
      doseMg: calculatedDose.mg,
      timestamp: new Date().toISOString(),
      weightKg: displayWeight || 0,
    };

    const updated = [entry, ...doseHistory].slice(0, 50);
    setDoseHistory(updated);
    await AsyncStorage.setItem(DOSE_HISTORY_KEY, JSON.stringify(updated));

    Alert.alert(t('common.success') || 'Saved', `Recorded ${calculatedDose.ml} ml ${selectedMed}.`);
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },

    // Baby Profile Card
    babyCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    babyCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    babyEmoji: { fontSize: 28, marginRight: 12 },
    babyCardTitle: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    babyName: { fontSize: 18, fontWeight: '700', color: C.text },
    babyMeta: { fontSize: 13, color: C.muted, marginTop: 2 },
    babyInfoRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
    babyInfoItem: { flex: 1, backgroundColor: C.background, borderRadius: 10, padding: 10 },
    babyInfoLabel: { fontSize: 11, color: C.muted, marginBottom: 4 },
    babyInfoValue: { fontSize: 16, fontWeight: '700', color: C.text },

    // Medication Dropdown
    dropdownSection: { marginBottom: 16 },
    sectionLabel: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    dropdownButton: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: C.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dropdownButtonActive: { borderColor: MEDICINE_BLUE },
    dropdownLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    dropdownIcon: { fontSize: 22, marginRight: 10 },
    dropdownText: { fontSize: 15, fontWeight: '600', color: C.text },
    dropdownBrand: { fontSize: 12, color: C.muted, marginLeft: 6 },
    dropdownChevron: { fontSize: 20, color: C.muted },
    dropdownList: {
      backgroundColor: C.card,
      borderRadius: 12,
      marginTop: 6,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    dropdownItemLast: { borderBottomWidth: 0 },
    dropdownItemSelected: { backgroundColor: '#EFF6FF' },
    dropdownItemIcon: { fontSize: 20, marginRight: 10 },
    dropdownItemText: { fontSize: 14, fontWeight: '600', color: C.text },
    dropdownItemBrand: { fontSize: 11, color: C.muted, marginLeft: 4 },

    // Age Warning
    ageWarning: {
      backgroundColor: '#FEF3C7',
      borderRadius: 8,
      padding: 10,
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    ageWarningText: { fontSize: 12, color: '#92400E', flex: 1, marginLeft: 8 },
    ageWarningIcon: { fontSize: 16 },

    // Weight Input
    weightSection: { marginBottom: 16 },
    weightCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    weightRow: { flexDirection: 'row', gap: 12 },
    weightInputWrap: { flex: 1 },
    weightUnit: {
      backgroundColor: C.accent,
      borderRadius: 10,
      paddingHorizontal: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    weightUnitText: { fontSize: 14, fontWeight: '700', color: C.text },
    weightInput: {
      flex: 1,
      backgroundColor: C.background,
      borderRadius: 10,
      padding: 14,
      fontSize: 18,
      fontWeight: '700',
      color: C.text,
      borderWidth: 1,
      borderColor: C.border,
      textAlign: 'center',
    },
    weightHint: { fontSize: 11, color: C.muted, marginTop: 6, textAlign: 'center' },

    // Calculate Button
    calcButton: {
      backgroundColor: MEDICINE_BLUE,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      marginBottom: 16,
    },
    calcButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },

    // Dose Result Card
    resultCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 2,
      borderColor: MEDICINE_GREEN,
    },
    resultCardAlert: { borderColor: MEDICINE_RED },
    resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    resultIcon: { fontSize: 24, marginRight: 10 },
    resultTitle: { fontSize: 14, fontWeight: '700', color: MEDICINE_GREEN },
    resultTitleAlert: { color: MEDICINE_RED },
    resultDose: { fontSize: 36, fontWeight: '800', color: C.text, textAlign: 'center', marginVertical: 8 },
    resultSubtext: { fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 12 },
    resultConversions: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
    conversionItem: { alignItems: 'center' },
    conversionValue: { fontSize: 18, fontWeight: '700', color: C.text },
    conversionLabel: { fontSize: 11, color: C.muted, marginTop: 2 },

    // Max Daily Alert
    maxDailyAlert: {
      backgroundColor: '#FEE2E2',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    maxDailyIcon: { fontSize: 22, marginRight: 10 },
    maxDailyText: { flex: 1 },
    maxDailyTitle: { fontSize: 14, fontWeight: '700', color: MEDICINE_RED },
    maxDailyBody: { fontSize: 12, color: '#991B1B', marginTop: 2 },

    // Save Button
    saveButton: {
      backgroundColor: MEDICINE_GREEN,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      marginBottom: 16,
    },
    saveButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },

    // Schedule Info
    scheduleCard: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    scheduleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    scheduleIcon: { fontSize: 16, marginRight: 8, color: MEDICINE_BLUE },
    scheduleText: { fontSize: 13, color: C.text },
    scheduleNote: { fontSize: 11, color: MEDICINE_AMBER, marginTop: 4 },

    // Disclaimer
    disclaimer: {
      backgroundColor: '#FEF9C3',
      borderRadius: 10,
      padding: 10,
      marginBottom: 16,
    },
    disclaimerText: { fontSize: 11, color: '#854D0E', textAlign: 'center' },

    // History Section
    historySection: { marginTop: 8 },
    historyTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 12 },
    historyEmpty: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
    },
    historyEmptyText: { fontSize: 13, color: C.muted, marginTop: 8 },
    historyItem: {
      backgroundColor: C.card,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: C.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    historyItemIcon: { fontSize: 20, marginRight: 10 },
    historyItemInfo: { flex: 1 },
    historyItemDose: { fontSize: 14, fontWeight: '600', color: C.text },
    historyItemMeta: { fontSize: 11, color: C.muted, marginTop: 2 },
    historyItemTime: { fontSize: 11, color: C.muted },
    historyClearBtn: { padding: 8 },

    // Badge Banner
    badgeBanner: {
      backgroundColor: '#FEF3C7',
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    badgeIcon: { fontSize: 24, marginRight: 10 },
    badgeText: { flex: 1 },
    badgeTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
    badgeDesc: { fontSize: 11, color: '#92400E' },
  });

  const selectedMedInfo = DOSING_INFO[selectedMed];
  const medLabel = t(selectedMedInfo.nameKey);
  const medBrand = t(selectedMedInfo.brandKey);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('medicineDose.greeting') || 'Dose Calculator'}</Text>
          <Text style={styles.title}>{t('medicineDose.title') || 'Medicine Dose'}</Text>
          <Text style={styles.subtitle}>{t('medicineDose.subtitle') || 'Safe dosing for your baby'}</Text>
        </View>

        {/* Baby Profile Card */}
        <View style={styles.babyCard}>
          <View style={styles.babyCardHeader}>
            <Text style={styles.babyEmoji}>👶</Text>
            <View>
              <Text style={styles.babyCardTitle}>{t('medicineDose.babyCard.title') || 'Baby Profile'}</Text>
              <Text style={styles.babyName}>{babyProfile?.name || t('profile.babyName')}</Text>
            </View>
          </View>
          <View style={styles.babyInfoRow}>
            <View style={styles.babyInfoItem}>
              <Text style={styles.babyInfoLabel}>{t('medicineDose.babyCard.age') || 'Age'}</Text>
              <Text style={styles.babyInfoValue}>
                {babyAge > 0 ? t('medicineDose.babyCard.monthsOld', { count: Math.round(babyAge) }) : '-'}
              </Text>
            </View>
            <View style={styles.babyInfoItem}>
              <Text style={styles.babyInfoLabel}>{t('medicineDose.babyCard.weight') || 'Weight'}</Text>
              <Text style={styles.babyInfoValue}>
                {latestWeight ? `${latestWeight} kg` : t('medicineDose.babyCard.enterWeight') || 'Enter weight'}
              </Text>
            </View>
          </View>
        </View>

        {/* Medication Dropdown */}
        <View style={styles.dropdownSection}>
          <Text style={styles.sectionLabel}>{t('medicineDose.medication.label') || 'Medication'}</Text>
          <TouchableOpacity
                          accessibilityLabel="TouchableOpacity in medicine-dose"
            style={[styles.dropdownButton, showDropdown && styles.dropdownButtonActive]}
            activeOpacity={0.7}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <View style={styles.dropdownLeft}>
              <Text style={styles.dropdownIcon}>💊</Text>
              <Text style={styles.dropdownText}>{medLabel}</Text>
              <Text style={styles.dropdownBrand}>{medBrand}</Text>
            </View>
            <Text style={styles.dropdownChevron}>{showDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showDropdown && (
            <View style={styles.dropdownList}>
              {MEDICATIONS.map((med) => {
                const info = DOSING_INFO[med];
                const isSelected = med === selectedMed;
                return (
                  <TouchableOpacity
                                  accessibilityLabel="TouchableOpacity in medicine-dose"
                    key={med}
                    style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected, med === 'diphenhydramine' && styles.dropdownItemLast]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedMed(med);
                      setShowDropdown(false);
                      setCalculatedDose(null);
                    }}
                  >
                    <Text style={styles.dropdownItemIcon}>💊</Text>
                    <Text style={styles.dropdownItemText}>{t(info.nameKey)}</Text>
                    <Text style={styles.dropdownItemBrand}>{t(info.brandKey)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Age warning for ibuprofen */}
          {selectedMed === 'ibuprofen' && babyAge < 6 && babyAge > 0 && (
            <View style={styles.ageWarning}>
              <Text style={styles.ageWarningIcon}>⚠️</Text>
              <Text style={styles.ageWarningText}>
                {t('emergency.feverWarning') || 'Ibuprofen not recommended for babies under 6 months. Consult your pediatrician.'}
              </Text>
            </View>
          )}
        </View>

        {/* Weight Input */}
        <View style={styles.weightSection}>
          <Text style={styles.sectionLabel}>{t('medicineDose.weightInput.label') || 'Baby Weight'}</Text>
          <View style={styles.weightCard}>
            <View style={styles.weightRow}>
              <TextInput
                style={styles.weightInput}
                placeholder="0.0"
                placeholderTextColor={C.muted}
                keyboardType="decimal-pad"
                value={weightInput}
                onChangeText={setWeightInput}
              />
              <View style={styles.weightUnit}>
                <Text style={styles.weightUnitText}>{t('medicineDose.weightInput.kg') || 'kg'}</Text>
              </View>
            </View>
            <Text style={styles.weightHint}>
              {latestWeight ? `Latest recorded: ${latestWeight} kg` : 'Enter weight or it will be pulled from growth records'}
            </Text>
          </View>
        </View>

        {/* Calculate Button */}
        <TouchableOpacity style={styles.calcButton} activeOpacity={0.7} onPress={handleCalculate}>
                        accessibilityLabel="TouchableOpacity in medicine-dose"
          <Text style={styles.calcButtonText}>{t('medicineDose.calculate') || 'Calculate Dose'}</Text>
        </TouchableOpacity>

        {/* Dose Result */}
        {calculatedDose && (
          <>
            {/* Max Daily Alert */}
            {calculatedDose.isMaxDailyExceeded && (
              <View style={styles.maxDailyAlert}>
                <Text style={styles.maxDailyIcon}>⚠️</Text>
                <View style={styles.maxDailyText}>
                  <Text style={styles.maxDailyTitle}>{t('medicineDose.maxDaily.alert') || 'MAX DAILY DOSE EXCEEDED'}</Text>
                  <Text style={styles.maxDailyBody}>
                    {t('medicineDose.maxDaily.alertBody', { max: calculatedDose.maxDaily, med: medLabel }) ||
                      `This dose exceeds max ${calculatedDose.maxDaily} mg/kg/day`}
                  </Text>
                </View>
              </View>
            )}

            {/* Result Card */}
            <View style={[styles.resultCard, calculatedDose.isMaxDailyExceeded && styles.resultCardAlert]}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultIcon}>💊</Text>
                <Text style={[styles.resultTitle, calculatedDose.isMaxDailyExceeded && styles.resultTitleAlert]}>
                  {t('medicineDose.doseResult.label') || 'Calculated Dose'}
                </Text>
              </View>
              <Text style={styles.resultDose}>{t('medicineDose.doseResult.ml', { count: calculatedDose.ml })}</Text>
              <Text style={styles.resultSubtext}>
                {t('medicineDose.doseResult.perDose') || 'Per Dose'} · {calculatedDose.mg} mg
              </Text>

              <View style={styles.resultConversions}>
                <View style={styles.conversionItem}>
                  <Text style={styles.conversionValue}>{calculatedDose.tsp}</Text>
                  <Text style={styles.conversionLabel}>{t('medicineDose.conversion.tsp') || 'tsp'}</Text>
                </View>
                <View style={styles.conversionItem}>
                  <Text style={styles.conversionValue}>{calculatedDose.drops}</Text>
                  <Text style={styles.conversionLabel}>{t('medicineDose.conversion.drops') || 'drops'}</Text>
                </View>
                <View style={styles.conversionItem}>
                  <Text style={styles.conversionValue}>{calculatedDose.mg}</Text>
                  <Text style={styles.conversionLabel}>{t('medicineDose.doseResult.mg') || 'mg'}</Text>
                </View>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity style={styles.saveButton} activeOpacity={0.7} onPress={handleSaveDose}>
                            accessibilityLabel="Save medicine-dose entry"
              <Text style={styles.saveButtonText}>{t('medicineDose.saveDose') || 'Save to History'}</Text>
            </TouchableOpacity>

            {/* Schedule Info */}
            <View style={styles.scheduleCard}>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleIcon}>⏰</Text>
                <Text style={styles.scheduleText}>
                  {t(`medicineDose.schedule.${selectedMed}`) || `${selectedMed}: every ${selectedMedInfo.frequencyHours.min}-${selectedMedInfo.frequencyHours.max}h`}
                </Text>
              </View>
              <Text style={styles.scheduleNote}>
                {t('medicineDose.maxDaily.maxPerDay', { max: selectedMedInfo.maxDailyPerKg }) || `Max: ${selectedMedInfo.maxDailyPerKg} mg/kg/day`} ·{' '}
                {t('medicineDose.maxDaily.maxPerDose', { max: selectedMedInfo.dosePerKg.max }) || `Max per dose: ${selectedMedInfo.dosePerKg.max} mg/kg`}
              </Text>
            </View>
          </>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            {t('medicineDose.disclaimer') || 'For reference only. Always consult your pediatrician.'}
          </Text>
        </View>

        {/* Dose Guardian Badge Banner */}
        {calcCount >= 5 && (
          <View style={styles.badgeBanner}>
            <Text style={styles.badgeIcon}>🏆</Text>
            <View style={styles.badgeText}>
              <Text style={styles.badgeTitle}>{t('medicineDose.guardian.badge') || 'Dose Guardian'}</Text>
              <Text style={styles.badgeDesc}>{t('medicineDose.guardian.badgeDesc') || '5+ calculations performed'}</Text>
            </View>
          </View>
        )}

        {/* History Section */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>{t('medicineDose.history.title') || 'Dose History'}</Text>

          {doseHistory.length === 0 ? (
            <View style={styles.historyEmpty}>
              <Ionicons name="medical-outline" size={32} color={C.muted} />
              <Text style={styles.historyEmptyText}>
                {t('medicineDose.history.empty') || 'No doses recorded yet'}
              </Text>
            </View>
          ) : (
            doseHistory.slice(0, 10).map((entry) => {
              const medInfo = DOSING_INFO[entry.medication];
              return (
                <View key={entry.id} style={styles.historyItem}>
                  <Text style={styles.historyItemIcon}>💊</Text>
                  <View style={styles.historyItemInfo}>
                    <Text style={styles.historyItemDose}>
                      {t('medicineDose.history.doseEntry', { amount: entry.doseMl, med: t(medInfo.nameKey) }) ||
                        `${entry.doseMl} ml ${entry.medication}`}
                    </Text>
                    <Text style={styles.historyItemMeta}>
                      {entry.doseMg} mg · {entry.weightKg} kg
                    </Text>
                  </View>
                  <Text style={styles.historyItemTime}>
                    {formatTimeAgo(entry.timestamp)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
