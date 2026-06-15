import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const GALANT_KEY = STORAGE_KEYS.GALANT_REFLEX_LOG;
const LATCH_KEY = STORAGE_KEYS.LATCH_ASYMMETRY_LOG;
const TEMP_KEY = STORAGE_KEYS.TEMP_RHYTHM_LOG;

interface GalantReflexEntry {
  id: string;
  date: string;
  months_age: number;
  reflex_present: boolean;
  trunk_extension_score: number;
  notes?: string;
}

interface LatchAsymmetryEntry {
  id: string;
  date: string;
  latch_score: number;
  asymmetry_direction: 'left' | 'right' | 'none';
  side_preference: 'left' | 'right' | 'both';
}

interface TempRhythmEntry {
  id: string;
  date: string;
  ambient_temp: number;
  period_days: number;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function calculateAgeInMonths(birthDate: string): number {
  try {
    const birth = new Date(birthDate);
    const now = new Date();
    const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    return Math.round(days / 30.44 * 10) / 10;
  } catch {
    return 0;
  }
}

export default function GalantLatchNavigatorScreen() {
  const [galantEntries, setGalantEntries] = useState<GalantReflexEntry[]>([]);
  const [latchEntries, setLatchEntries] = useState<LatchAsymmetryEntry[]>([]);
  const [tempEntries, setTempEntries] = useState<TempRhythmEntry[]>([]);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addType, setAddType] = useState<'galant' | 'latch' | 'temp' | null>(null);
  const [reflexPresent, setReflexPresent] = useState(true);
  const [monthsAge, setMonthsAge] = useState(0);
  const [trunkScore, setTrunkScore] = useState(3);
  const [latchScore, setLatchScore] = useState(3);
  const [asymmetryDir, setAsymmetryDir] = useState<'left' | 'right' | 'none'>('none');
  const [sidePref, setSidePref] = useState<'left' | 'right' | 'both'>('both');
  const [ambientTemp, setAmbientTemp] = useState(24);
  const [periodDays, setPeriodDays] = useState(7);

  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [galant, latch, temp] = await Promise.all([
        safeGetItem(GALANT_KEY),
        safeGetItem(LATCH_KEY),
        safeGetItem(TEMP_KEY),
      ]);
      if (galant) setGalantEntries(JSON.parse(galant));
      if (latch) setLatchEntries(JSON.parse(latch));
      if (temp) setTempEntries(JSON.parse(temp));
    } catch {}
  };

  const saveGalant = async (entries: GalantReflexEntry[]) => {
    try {
      await safeSetItem(GALANT_KEY, JSON.stringify(entries));
    } catch {}
  };

  const saveLatch = async (entries: LatchAsymmetryEntry[]) => {
    try {
      await safeSetItem(LATCH_KEY, JSON.stringify(entries));
    } catch {}
  };

  const saveTemp = async (entries: TempRhythmEntry[]) => {
    try {
      await safeSetItem(TEMP_KEY, JSON.stringify(entries));
    } catch {}
  };

  const handleSaveGalant = async () => {
    const today = new Date().toISOString().split('T')[0];
    const entry: GalantReflexEntry = {
      id: generateId(),
      date: today,
      months_age: monthsAge,
      reflex_present: reflexPresent,
      trunk_extension_score: trunkScore,
    };
    const updated = [entry, ...galantEntries];
    setGalantEntries(updated);
    await saveGalant(updated);
    resetForm();
  };

  const handleSaveLatch = async () => {
    const today = new Date().toISOString().split('T')[0];
    const entry: LatchAsymmetryEntry = {
      id: generateId(),
      date: today,
      latch_score: latchScore,
      asymmetry_direction: asymmetryDir,
      side_preference: sidePref,
    };
    const updated = [entry, ...latchEntries];
    setLatchEntries(updated);
    await saveLatch(updated);
    resetForm();
  };

  const handleSaveTemp = async () => {
    const today = new Date().toISOString().split('T')[0];
    const entry: TempRhythmEntry = {
      id: generateId(),
      date: today,
      ambient_temp: ambientTemp,
      period_days: periodDays,
    };
    const updated = [entry, ...tempEntries];
    setTempEntries(updated);
    await saveTemp(updated);
    resetForm();
  };

  const resetForm = () => {
    setShowAddPanel(false);
    setAddType(null);
    setReflexPresent(true);
    setMonthsAge(0);
    setTrunkScore(3);
    setLatchScore(3);
    setAsymmetryDir('none');
    setSidePref('both');
    setAmbientTemp(24);
    setPeriodDays(7);
  };

  const getReflexStatus = (): string => {
    if (galantEntries.length === 0) return t('galantLatch.reflexIntegrating');
    const latest = galantEntries[0];
    if (!latest.reflex_present) return t('galantLatch.reflexIntegrated');
    if (latest.months_age >= 7) return t('galantLatch.reflexPresent');
    return t('galantLatch.reflexIntegrating');
  };

  const getReflexColor = (): string => {
    if (galantEntries.length === 0) return C.muted;
    const latest = galantEntries[0];
    if (!latest.reflex_present) return '#22C55E';
    if (latest.months_age >= 7) return '#EF4444';
    return '#EAB308';
  };

  const getLatchScoreDisplay = (): number => {
    if (latchEntries.length === 0) return 0;
    return latchEntries[0].latch_score;
  };

  const getCombinedScore = (): number => {
    const galantPct = galantEntries.length > 0
      ? galantEntries[0].reflex_present ? Math.max(0, 1 - galantEntries[0].months_age / 12) : 1
      : 0.5;
    const latchPct = latchEntries.length > 0 ? latchEntries[0].latch_score / 5 : 0.5;
    const tempStability = tempEntries.length > 0
      ? Math.max(0, 1 - Math.abs(tempEntries[0].ambient_temp - 24) / 10)
      : 0.5;
    return Math.round((galantPct * 0.4 + latchPct * 0.4 + tempStability * 0.2) * 100);
  };

  const shouldShowAlert = (): boolean => {
    if (galantEntries.length === 0 || latchEntries.length === 0) return false;
    const latestGalant = galantEntries[0];
    const latestLatch = latchEntries[0];
    return latestGalant.reflex_present && latestGalant.months_age >= 7 && latestLatch.latch_score < 3;
  };

  const getCorrelationCell = (row: number, col: number): { color: string; label: string } => {
    const labels = [
      [t('galantLatch.correlationGood'), t('galantLatch.correlationModerate'), t('galantLatch.correlationPoor')],
      [t('galantLatch.correlationModerate'), t('galantLatch.correlationGood'), t('galantLatch.correlationModerate')],
      [t('galantLatch.correlationPoor'), t('galantLatch.correlationModerate'), t('galantLatch.correlationGood')],
    ];
    const colors = [
      ['#22C55E', '#EAB308', '#EF4444'],
      ['#EAB308', '#22C55E', '#EAB308'],
      ['#EF4444', '#EAB308', '#22C55E'],
    ];
    return { color: colors[row][col], label: labels[row][col] };
  };

  const formatDateHeader = (dateStr: string): string => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return t('galantLatch.today');
    if (dateStr === yesterday) return t('galantLatch.yesterday');
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 20 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 28, fontWeight: 'bold', color: C.text, marginTop: 4 },
    subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
    alertBanner: {
      backgroundColor: '#EF4444' + '20',
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#EF4444',
    },
    alertIcon: { marginRight: 12 },
    alertText: { flex: 1 },
    alertTitle: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
    alertBody: { fontSize: 13, color: C.text, marginTop: 2 },
    summaryCards: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    summaryCard: {
      flex: 1,
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    summaryIcon: { marginBottom: 8 },
    summaryLabel: { fontSize: 12, color: C.muted, textAlign: 'center' },
    summaryValue: { fontSize: 24, fontWeight: '700', color: C.text, marginTop: 4 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 12 },
    inputCard: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    inputLabel: { fontSize: 14, color: C.muted, marginBottom: 8 },
    scoreRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    scoreBtn: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: C.background,
      alignItems: 'center',
    },
    scoreBtnActive: { backgroundColor: C.accent + '30', borderWidth: 2, borderColor: C.accent },
    scoreBtnText: { fontSize: 16, fontWeight: '600', color: C.text },
    boolRow: { flexDirection: 'row', gap: 12 },
    boolBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: C.background,
      alignItems: 'center',
    },
    boolBtnActive: { backgroundColor: C.accent + '30', borderWidth: 2, borderColor: C.accent },
    boolBtnText: { fontSize: 14, fontWeight: '600', color: C.text },
    numberRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    numberBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: C.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    numberValue: { fontSize: 18, fontWeight: '700', color: C.text, minWidth: 40, textAlign: 'center' },
    correlationGrid: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
    },
    correlationHeader: { flexDirection: 'row', marginBottom: 8 },
    correlationCorner: { width: 80 },
    correlationHeaderCell: { flex: 1, alignItems: 'center' },
    correlationHeaderText: { fontSize: 11, fontWeight: '600', color: C.muted },
    correlationRow: { flexDirection: 'row', marginBottom: 4 },
    correlationRowLabel: { width: 80, fontSize: 11, color: C.muted, textAlign: 'center' },
    correlationCell: {
      flex: 1,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 6,
      marginHorizontal: 2,
    },
    correlationCellText: { fontSize: 11, fontWeight: '600', color: '#fff' },
    addTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    addTypeBtn: {
      width: '47%',
      paddingVertical: 14,
      paddingHorizontal: 12,
      backgroundColor: C.background,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    addTypeBtnActive: { backgroundColor: C.accent + '20', borderWidth: 2, borderColor: C.accent },
    addTypeIcon: { fontSize: 20 },
    addTypeLabel: { fontSize: 13, color: C.text, flex: 1 },
    addBtn: {
      backgroundColor: C.accent,
      borderRadius: 25,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 20,
    },
    addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    historySection: {},
    dateGroup: { marginBottom: 20 },
    dateHeader: { fontSize: 14, fontWeight: '600', color: C.muted, marginBottom: 10, textTransform: 'uppercase' },
    entryCard: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    entryType: { fontSize: 15, fontWeight: '600', color: C.text },
    entryDetail: { fontSize: 13, color: C.muted, marginTop: 2 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: C.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
      maxHeight: '80%',
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 20, textAlign: 'center' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 25,
      backgroundColor: C.background,
      alignItems: 'center',
    },
    cancelBtnText: { fontSize: 16, fontWeight: '600', color: C.muted },
    saveBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 25,
      backgroundColor: C.accent,
      alignItems: 'center',
    },
    saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('galantLatch.greeting')}</Text>
          <Text style={styles.title}>🧠 {t('galantLatch.title')}</Text>
          <Text style={styles.subtitle}>{t('galantLatch.subtitle')}</Text>
        </View>

        {shouldShowAlert() && (
          <View style={styles.alertBanner}>
            <MaterialCommunityIcons style={styles.alertIcon} name="alert" size={24} color="#EF4444" />
            <View style={styles.alertText}>
              <Text style={styles.alertTitle}>{t('galantLatch.alertTitle')}</Text>
              <Text style={styles.alertBody}>{t('galantLatch.alertBody')}</Text>
            </View>
          </View>
        )}

        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <MaterialCommunityIcons style={styles.summaryIcon} name="brain" size={24} color={getReflexColor()} />
            <Text style={styles.summaryLabel}>{t('galantLatch.reflexStatus')}</Text>
            <Text style={[styles.summaryValue, { color: getReflexColor() }]}>{getReflexStatus()}</Text>
          </View>
          <View style={styles.summaryCard}>
            <MaterialCommunityIcons style={styles.summaryIcon} name="baby-bottle" size={24} color={C.accent} />
            <Text style={styles.summaryLabel}>{t('galantLatch.latchScore')}</Text>
            <Text style={styles.summaryValue}>{getLatchScoreDisplay() || '-'}/5</Text>
          </View>
          <View style={styles.summaryCard}>
            <MaterialCommunityIcons style={styles.summaryIcon} name="percent" size={24} color={C.accent} />
            <Text style={styles.summaryLabel}>{t('galantLatch.combinedScore')}</Text>
            <Text style={styles.summaryValue}>{getCombinedScore()}%</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('galantLatch.correlation')}</Text>
          <View style={styles.correlationGrid}>
            <View style={styles.correlationHeader}>
              <View style={styles.correlationCorner} />
              <View style={styles.correlationHeaderCell}>
                <Text style={styles.correlationHeaderText}>{t('galantLatch.galantReflex')}</Text>
              </View>
              <View style={styles.correlationHeaderCell}>
                <Text style={styles.correlationHeaderText}>{t('galantLatch.latchQuality')}</Text>
              </View>
              <View style={styles.correlationHeaderCell}>
                <Text style={styles.correlationHeaderText}>{t('galantLatch.tempStability')}</Text>
              </View>
            </View>
            {[['galantReflex', 'latchQuality', 'tempStability'], ['latchQuality', 'tempStability', 'galantReflex'], ['tempStability', 'galantReflex', 'latchQuality']].map((row, rowIdx) => (
              <View key={rowIdx} style={styles.correlationRow}>
                <Text style={styles.correlationRowLabel}>{t(`galantLatch.${row[0]}`)}</Text>
                {row.map((_, colIdx) => {
                  const cell = getCorrelationCell(rowIdx, colIdx);
                  return (
                    <View key={colIdx} style={[styles.correlationCell, { backgroundColor: cell.color }]}>
                      <Text style={styles.correlationCellText}>{cell.label}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAddPanel(true)}
          accessibilityLabel="Add galant-latch entry"
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.addBtnText}>{t('galantLatch.logEntry')}</Text>
        </TouchableOpacity>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>{t('galantLatch.history')}</Text>
          {galantEntries.length === 0 && latchEntries.length === 0 && tempEntries.length === 0 ? (
            <Text style={{ color: C.muted, textAlign: 'center', paddingVertical: 30 }}>
              {t('galantLatch.noEntries')}
            </Text>
          ) : (
            <>
              {galantEntries.slice(0, 5).map(entry => (
                <View key={entry.id} style={styles.entryCard}>
                  <Text style={styles.entryType}>{t('galantLatch.galantReflex')} - {formatDateHeader(entry.date)}</Text>
                  <Text style={styles.entryDetail}>
                    {entry.reflex_present ? t('galantLatch.reflexPresent') : t('galantLatch.reflexIntegrated')} | {entry.months_age}m | Score: {entry.trunk_extension_score}
                  </Text>
                </View>
              ))}
              {latchEntries.slice(0, 5).map(entry => (
                <View key={entry.id} style={styles.entryCard}>
                  <Text style={styles.entryType}>{t('galantLatch.latchAsymmetry')} - {formatDateHeader(entry.date)}</Text>
                  <Text style={styles.entryDetail}>
                    Score: {entry.latch_score}/5 | {entry.asymmetry_direction} | {entry.side_preference}
                  </Text>
                </View>
              ))}
              {tempEntries.slice(0, 5).map(entry => (
                <View key={entry.id} style={styles.entryCard}>
                  <Text style={styles.entryType}>{t('galantLatch.tempRhythm')} - {formatDateHeader(entry.date)}</Text>
                  <Text style={styles.entryDetail}>
                    {entry.ambient_temp}°C | {entry.period_days} days
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {showAddPanel && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={resetForm} accessibilityLabel="Close modal" />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('galantLatch.logEntry')}</Text>

            <View style={styles.addTypeGrid}>
              <TouchableOpacity
                style={[styles.addTypeBtn, addType === 'galant' && styles.addTypeBtnActive]}
                onPress={() => setAddType('galant')}
                accessibilityLabel="Add Galant reflex entry"
              >
                <Text style={styles.addTypeIcon}>🧠</Text>
                <Text style={styles.addTypeLabel}>{t('galantLatch.galantReflex')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addTypeBtn, addType === 'latch' && styles.addTypeBtnActive]}
                onPress={() => setAddType('latch')}
                accessibilityLabel="Add latch asymmetry entry"
              >
                <Text style={styles.addTypeIcon}>🍼</Text>
                <Text style={styles.addTypeLabel}>{t('galantLatch.latchAsymmetry')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addTypeBtn, addType === 'temp' && styles.addTypeBtnActive]}
                onPress={() => setAddType('temp')}
                accessibilityLabel="Add temperature rhythm entry"
              >
                <Text style={styles.addTypeIcon}>🌡️</Text>
                <Text style={styles.addTypeLabel}>{t('galantLatch.tempRhythm')}</Text>
              </TouchableOpacity>
            </View>

            {addType === 'galant' && (
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>{t('galantLatch.reflexStatus')}</Text>
                <View style={styles.boolRow}>
                  <TouchableOpacity
                    style={[styles.boolBtn, reflexPresent && styles.boolBtnActive]}
                    onPress={() => setReflexPresent(true)}
                    accessibilityLabel="Reflex present"
                  >
                    <Text style={styles.boolBtnText}>{t('galantLatch.reflexPresent')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.boolBtn, !reflexPresent && styles.boolBtnActive]}
                    onPress={() => setReflexPresent(false)}
                    accessibilityLabel="Reflex integrating"
                  >
                    <Text style={styles.boolBtnText}>{t('galantLatch.reflexIntegrating')}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>{t('galantLatch.monthsAge')}</Text>
                <View style={styles.numberRow}>
                  <TouchableOpacity
                    style={styles.numberBtn}
                    onPress={() => setMonthsAge(Math.max(0, monthsAge - 1))}
                    accessibilityLabel="Decrease months"
                  >
                    <MaterialCommunityIcons name="minus" size={20} color={C.text} />
                  </TouchableOpacity>
                  <Text style={styles.numberValue}>{monthsAge}</Text>
                  <TouchableOpacity
                    style={styles.numberBtn}
                    onPress={() => setMonthsAge(Math.min(24, monthsAge + 1))}
                    accessibilityLabel="Increase months"
                  >
                    <MaterialCommunityIcons name="plus" size={20} color={C.text} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>{t('galantLatch.trunkScore')}</Text>
                <View style={styles.scoreRow}>
                  {[1, 2, 3, 4, 5].map(score => (
                    <TouchableOpacity
                      key={score}
                      style={[styles.scoreBtn, trunkScore === score && styles.scoreBtnActive]}
                      onPress={() => setTrunkScore(score)}
                      accessibilityLabel={`Score ${score}`}
                    >
                      <Text style={styles.scoreBtnText}>{score}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {addType === 'latch' && (
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>{t('galantLatch.latchScore')}</Text>
                <View style={styles.scoreRow}>
                  {[1, 2, 3, 4, 5].map(score => (
                    <TouchableOpacity
                      key={score}
                      style={[styles.scoreBtn, latchScore === score && styles.scoreBtnActive]}
                      onPress={() => setLatchScore(score)}
                      accessibilityLabel={`Latch score ${score}`}
                    >
                      <Text style={styles.scoreBtnText}>{score}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>{t('galantLatch.asymmetryDirection')}</Text>
                <View style={styles.scoreRow}>
                  {(['left', 'right', 'none'] as const).map(dir => (
                    <TouchableOpacity
                      key={dir}
                      style={[styles.scoreBtn, asymmetryDir === dir && styles.scoreBtnActive]}
                      onPress={() => setAsymmetryDir(dir)}
                      accessibilityLabel={`Asymmetry ${dir}`}
                    >
                      <Text style={styles.scoreBtnText}>{t(`galantLatch.${dir}`)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>{t('galantLatch.sidePreference')}</Text>
                <View style={styles.scoreRow}>
                  {(['left', 'right', 'both'] as const).map(pref => (
                    <TouchableOpacity
                      key={pref}
                      style={[styles.scoreBtn, sidePref === pref && styles.scoreBtnActive]}
                      onPress={() => setSidePref(pref)}
                      accessibilityLabel={`Side preference ${pref}`}
                    >
                      <Text style={styles.scoreBtnText}>{t(`galantLatch.${pref}`)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {addType === 'temp' && (
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>{t('galantLatch.ambientTemp')}</Text>
                <View style={styles.numberRow}>
                  <TouchableOpacity
                    style={styles.numberBtn}
                    onPress={() => setAmbientTemp(Math.max(15, ambientTemp - 1))}
                    accessibilityLabel="Decrease temperature"
                  >
                    <MaterialCommunityIcons name="minus" size={20} color={C.text} />
                  </TouchableOpacity>
                  <Text style={styles.numberValue}>{ambientTemp}°C</Text>
                  <TouchableOpacity
                    style={styles.numberBtn}
                    onPress={() => setAmbientTemp(Math.min(35, ambientTemp + 1))}
                    accessibilityLabel="Increase temperature"
                  >
                    <MaterialCommunityIcons name="plus" size={20} color={C.text} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>{t('galantLatch.periodDays')}</Text>
                <View style={styles.numberRow}>
                  <TouchableOpacity
                    style={styles.numberBtn}
                    onPress={() => setPeriodDays(Math.max(1, periodDays - 1))}
                    accessibilityLabel="Decrease period"
                  >
                    <MaterialCommunityIcons name="minus" size={20} color={C.text} />
                  </TouchableOpacity>
                  <Text style={styles.numberValue}>{periodDays}</Text>
                  <TouchableOpacity
                    style={styles.numberBtn}
                    onPress={() => setPeriodDays(Math.min(30, periodDays + 1))}
                    accessibilityLabel="Increase period"
                  >
                    <MaterialCommunityIcons name="plus" size={20} color={C.text} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm} accessibilityLabel="Cancel">
                <Text style={styles.cancelBtnText}>{t('galantLatch.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => {
                  if (addType === 'galant') handleSaveGalant();
                  else if (addType === 'latch') handleSaveLatch();
                  else if (addType === 'temp') handleSaveTemp();
                }}
                accessibilityLabel="Save entry"
              >
                <Text style={styles.saveBtnText}>{t('galantLatch.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
