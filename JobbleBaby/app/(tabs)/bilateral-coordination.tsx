import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme';

const STORAGE_KEY_BILATERAL = '@jobble/bilateral_log';
const STORAGE_KEY_SCORES = '@jobble/coordination_scores';

interface BilateralEntry {
  date: string;
  movementType: string;
  symmetryScore: number;
  handFootPref: string;
  notes: string;
}

interface CoordinationScore {
  date: string;
  avgSymmetry: number;
  dominantSide: string;
}

// Developmental milestones by age (months)
const HEMISPHERE_MILESTONES = [
  { activity: 'crawling', minAge: 6, maxAge: 10, icon: 'walk' },
  { activity: 'pointing', minAge: 9, maxAge: 14, icon: 'hand-pointing-right' },
  { activity: 'waving', minAge: 9, maxAge: 15, icon: 'hand-wave' },
  { activity: 'clapping', minAge: 10, maxAge: 18, icon: 'hand-clap' },
  { activity: 'self-feeding', minAge: 7, maxAge: 12, icon: 'food-fork-drink' },
];

const MOVEMENT_TYPES = [
  { key: 'grasping', label: 'Grasping', icon: 'hand-back-left' },
  { key: 'kicking', label: 'Kicking', icon: 'foot-print' },
  { key: 'reaching', label: 'Reaching', icon: 'arm-flex' },
  { key: 'crawling', label: 'Crawling', icon: 'walk' },
  { key: 'waving', label: 'Waving', icon: 'hand-wave' },
  { key: 'clapping', label: 'Clapping', icon: 'hand-clap' },
];

const HAND_FOOT_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'both', label: 'Both/Neither' },
];

export default function BilateralCoordinationScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme] || COLORS.light;

  const [bilateralLog, setBilateralLog] = useState<BilateralEntry[]>([]);
  const [scores, setScores] = useState<CoordinationScore[]>([]);
  const [selectedMovement, setSelectedMovement] = useState<string>('grasping');
  const [symmetryScore, setSymmetryScore] = useState<number | null>(null);
  const [handFootPref, setHandFootPref] = useState<string>('both');
  const [notes, setNotes] = useState<string>('');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [b, s] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_BILATERAL),
        AsyncStorage.getItem(STORAGE_KEY_SCORES),
      ]);
      if (b) {
        const parsed: BilateralEntry[] = JSON.parse(b);
        setBilateralLog(parsed);
      }
      if (s) {
        const parsed: CoordinationScore[] = JSON.parse(s);
        setScores(parsed);
      }
    } catch (e) { console.error('Failed to load bilateral data', e); }
  };

  const calculateAvgSymmetry = (): number => {
    if (bilateralLog.length === 0) return 3;
    const recent = bilateralLog.filter(e => e.date === today);
    if (recent.length === 0) return 3;
    return recent.reduce((sum, e) => sum + e.symmetryScore, 0) / recent.length;
  };

  const getDominantSide = (): string => {
    const todayEntries = bilateralLog.filter(e => e.date === today);
    const leftCount = todayEntries.filter(e => e.handFootPref === 'left').length;
    const rightCount = todayEntries.filter(e => e.handFootPref === 'right').length;
    if (leftCount > rightCount) return 'left';
    if (rightCount > leftCount) return 'right';
    return 'balanced';
  };

  const getCoordinationGrade = (): { grade: string; color: string; label: string } => {
    const avg = calculateAvgSymmetry();
    if (avg >= 4.5) return { grade: 'A', color: '#22c55e', label: t('bilateral.gradeA') || 'Excellent bilateral development' };
    if (avg >= 3.5) return { grade: 'B', color: '#3B82F6', label: t('bilateral.gradeB') || 'Good bilateral development' };
    if (avg >= 2.5) return { grade: 'C', color: '#eab308', label: t('bilateral.gradeC') || 'Moderate - keep tracking' };
    return { grade: 'D', color: '#ef4444', label: t('bilateral.gradeD') || 'Needs attention' };
  };

  const saveEntry = async () => {
    if (symmetryScore === null) {
      Alert.alert(t('bilateral.selectScore') || 'Please select a symmetry score');
      return;
    }
    const entry: BilateralEntry = {
      date: today,
      movementType: selectedMovement,
      symmetryScore,
      handFootPref,
      notes,
    };
    const updated = bilateralLog.filter(e => !(e.date === today && e.movementType === selectedMovement));
    updated.push(entry);
    setBilateralLog(updated);
    await AsyncStorage.setItem(STORAGE_KEY_BILATERAL, JSON.stringify(updated));

    // Update coordination scores
    const avgSym = calculateAvgSymmetry();
    const coordScore: CoordinationScore = {
      date: today,
      avgSymmetry: avgSym,
      dominantSide: getDominantSide(),
    };
    const updatedScores = scores.filter(s => s.date !== today);
    updatedScores.push(coordScore);
    setScores(updatedScores);
    await AsyncStorage.setItem(STORAGE_KEY_SCORES, JSON.stringify(updatedScores));

    setSymmetryScore(null);
    setNotes('');
  };

  const exportData = async () => {
    try {
      const [growthRaw, milestoneRaw, trackingRaw, sleepRaw] = await Promise.all([
        AsyncStorage.getItem('@jobble/growth_log'),
        AsyncStorage.getItem('@jobble/milestone_entries'),
        AsyncStorage.getItem('@jobble/tracking_entries'),
        AsyncStorage.getItem('@jobble/sleep_entries'),
      ]);
      const exportObj = {
        exportedAt: new Date().toISOString(),
        babyProfile: { /* placeholder */ },
        bilateralLog,
        coordinationScores: scores,
        growthLog: growthRaw ? JSON.parse(growthRaw) : null,
        milestoneEntries: milestoneRaw ? JSON.parse(milestoneRaw) : null,
        trackingEntries: trackingRaw ? JSON.parse(trackingRaw) : null,
        sleepEntries: sleepRaw ? JSON.parse(sleepRaw) : null,
      };
      const jsonStr = JSON.stringify(exportObj, null, 2);
      await Share.share({
        message: jsonStr,
        title: t('bilateral.exportTitle') || 'Jobble Baby Development Data',
      });
    } catch (e) {
      console.error('Export failed', e);
      Alert.alert(t('bilateral.exportFailed') || 'Export failed');
    }
  };

  const getMilestoneSummary = (): string => {
    const grade = getCoordinationGrade();
    const recent = bilateralLog.filter(e => e.date === today);
    const movementSummary = MOVEMENT_TYPES.map(m => {
      const entry = recent.find(r => r.movementType === m.key);
      return `${m.label}: ${entry ? `${entry.symmetryScore}/5` : 'not recorded'}`;
    }).join(', ');
    const summary = [
      t('bilateral.summaryTitle') || 'Bilateral Coordination Summary',
      `Date: ${today}`,
      `Overall Grade: ${grade.grade}`,
      `Today's Movements: ${movementSummary}`,
      `Dominant Side: ${getDominantSide()}`,
    ].join('\n');
    return summary;
  };

  const shareSummary = async () => {
    const summary = getMilestoneSummary();
    await Share.share({
      message: summary,
      title: t('bilateral.shareTitle') || 'Bilateral Milestone Summary',
    });
  };

  const getCorrelationWithSleep = (): { score: number; label: string; color: string } => {
    // Simple correlation: higher symmetry + good sleep = green
    const avgSym = calculateAvgSymmetry();
    // Placeholder: would read sleep_entries and correlate
    if (avgSym >= 4) return { score: 85, label: t('bilateral.corrHigh') || 'Strong positive correlation', color: '#22c55e' };
    if (avgSym >= 3) return { score: 60, label: t('bilateral.corrMedium') || 'Moderate correlation', color: '#eab308' };
    return { score: 35, label: t('bilateral.corrLow') || 'Weak correlation', color: '#ef4444' };
  };

  const grade = getCoordinationGrade();
  const correlation = getCorrelationWithSleep();
  const avgSym = calculateAvgSymmetry();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.card }]}>
        <Text style={[styles.title, { color: C.text }]} accessibilityRole="header">
          {t('bilateral.title') || 'Bilateral Coordination'}
        </Text>
        <View style={[styles.gradeBadge, { backgroundColor: grade.color + '22', borderColor: grade.color }]}>
          <Text style={[styles.gradeText, { color: grade.color }]}>{grade.label}</Text>
        </View>
      </View>

      {/* Hemisphere Readiness Indicators */}
      <View style={[styles.section, { backgroundColor: C.card }]}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="brain" size={20} color={C.accent} />
          <Text style={[styles.sectionTitle, { color: C.text }]}>
            {t('bilateral.hemisphereReadiness') || 'Hemisphere Readiness Indicators'}
          </Text>
        </View>
        <Text style={[styles.sectionSub, { color: C.muted }]}>
          {t('bilateral.hemisphereDesc') || 'Age-based developmental readiness'}
        </Text>
        <View style={styles.milestoneGrid}>
          {HEMISPHERE_MILESTONES.map(m => (
            <View key={m.activity} style={[styles.milestoneCard, { backgroundColor: C.background, borderColor: C.border }]}>
              <MaterialCommunityIcons name={m.icon as any} size={24} color={C.accent} accessibilityLabel={`${m.activity} icon`} />
              <Text style={[styles.milestoneLabel, { color: C.text }]}>{t(`bilateral.m${m.activity}`) || m.activity}</Text>
              <Text style={[styles.milestoneAge, { color: C.muted }]}>{m.minAge}-{m.maxAge} mo</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Bilateral Milestone Tracker */}
      <View style={[styles.section, { backgroundColor: C.card }]}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="scale-balance" size={20} color={C.accent} />
          <Text style={[styles.sectionTitle, { color: C.text }]}>
            {t('bilateral.milestoneTracker') || 'Bilateral Milestone Tracker'}
          </Text>
        </View>
        <Text style={[styles.sectionSub, { color: C.muted }]}>
          {t('bilateral.milestoneDesc') || 'Log symmetry of movement (1=asymmetric, 5=symmetric)'}
        </Text>

        {/* Movement Type Selector */}
        <View style={styles.movementSelector}>
          {MOVEMENT_TYPES.map(m => (
            <TouchableOpacity
              key={m.key}
              accessibilityLabel={`${m.label} movement type`}
              style={[
                styles.movementBtn,
                { backgroundColor: selectedMovement === m.key ? C.accent + '33' : C.background, borderColor: selectedMovement === m.key ? C.accent : C.border },
              ]}
              onPress={() => setSelectedMovement(m.key)}
            >
              <MaterialCommunityIcons name={m.icon as any} size={18} color={selectedMovement === m.key ? C.accent : C.muted} />
              <Text style={[styles.movementBtnText, { color: selectedMovement === m.key ? C.accent : C.muted }]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Symmetry Score */}
        <Text style={[styles.scoreLabel, { color: C.text }]}>
          {t('bilateral.symmetryScore') || 'Symmetry Score'}
        </Text>
        <View style={styles.scoreRow}>
          {[1, 2, 3, 4, 5].map(s => (
            <TouchableOpacity
              key={s}
              accessibilityLabel={`Symmetry score ${s} out of 5`}
              style={[
                styles.scoreBtn,
                {
                  backgroundColor: symmetryScore === s ? C.accent + '44' : C.background,
                  borderColor: symmetryScore === s ? C.accent : C.border,
                },
              ]}
              onPress={() => setSymmetryScore(s)}
            >
              <Text style={[styles.scoreNum, { color: symmetryScore === s ? C.accent : C.text }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hand/Foot Preference */}
        <Text style={[styles.scoreLabel, { color: C.text, marginTop: 16 }]}>
          {t('bilateral.handFootPref') || 'Hand/Foot Preference'}
        </Text>
        <View style={styles.prefRow}>
          {HAND_FOOT_OPTIONS.map(p => (
            <TouchableOpacity
              key={p.value}
              accessibilityLabel={`${p.label} hand or foot preference`}
              style={[
                styles.prefBtn,
                {
                  backgroundColor: handFootPref === p.value ? C.accent + '33' : C.background,
                  borderColor: handFootPref === p.value ? C.accent : C.border,
                },
              ]}
              onPress={() => setHandFootPref(p.value)}
            >
              <Text style={[styles.prefBtnText, { color: handFootPref === p.value ? C.accent : C.muted }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <TextInput
          accessibilityLabel={t('bilateral.notesLabel') || 'Bilateral coordination notes'}
          style={[styles.notesInput, { backgroundColor: C.background, color: C.text, borderColor: C.border }]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('bilateral.notesPlaceholder') || 'Additional observations...'}
          placeholderTextColor={C.muted}
        />

        <TouchableOpacity
          accessibilityLabel={t('bilateral.saveEntry') || 'Save bilateral entry'}
          style={[styles.saveBtn, { backgroundColor: C.accent }]}
          onPress={saveEntry}
        >
          <Text style={styles.saveBtnText}>{t('bilateral.saveEntry') || 'Save Entry'}</Text>
        </TouchableOpacity>
      </View>

      {/* Cross-Tab Correlation */}
      <View style={[styles.section, { backgroundColor: C.card }]}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="chart-line" size={20} color={C.accent} />
          <Text style={[styles.sectionTitle, { color: C.text }]}>
            {t('bilateral.sleepCorrelation') || 'Sleep Quality Correlation'}
          </Text>
        </View>
        <View style={[styles.corrCard, { backgroundColor: correlation.color + '15', borderColor: correlation.color }]}>
          <Text style={[styles.corrScore, { color: correlation.color }]}>{correlation.score}%</Text>
          <Text style={[styles.corrLabel, { color: correlation.color }]}>{correlation.label}</Text>
        </View>
        <Text style={[styles.sectionSub, { color: C.muted }]}>
          {t('bilateral.corrDesc') || 'Correlation between bilateral coordination and recent sleep quality'}
        </Text>
      </View>

      {/* Data Export Hub */}
      <View style={[styles.section, { backgroundColor: C.card }]}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="export" size={20} color={C.accent} />
          <Text style={[styles.sectionTitle, { color: C.text }]}>
            {t('bilateral.dataExport') || 'Data Export Hub'}
          </Text>
        </View>
        <Text style={[styles.sectionSub, { color: C.muted }]}>
          {t('bilateral.exportDesc') || 'Export development data for pediatrician visits'}
        </Text>
        <TouchableOpacity
          accessibilityLabel={t('bilateral.exportJSON') || 'Export all data as JSON'}
          style={[styles.exportBtn, { backgroundColor: C.accent + '22', borderColor: C.accent }]}
          onPress={exportData}
        >
          <MaterialCommunityIcons name="code-json" size={20} color={C.accent} />
          <Text style={[styles.exportBtnText, { color: C.accent }]}>
            {t('bilateral.exportJSON') || 'Export JSON Data'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Milestone Summary */}
      <View style={[styles.section, { backgroundColor: C.card }]}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="file-document" size={20} color={C.accent} />
          <Text style={[styles.sectionTitle, { color: C.text }]}>
            {t('bilateral.summary') || 'Milestone Summary'}
          </Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: C.background, borderColor: C.border }]}>
          <Text style={[styles.summaryText, { color: C.text }]}>
            {getMilestoneSummary()}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel={t('bilateral.shareSummary') || 'Share milestone summary'}
          style={[styles.exportBtn, { backgroundColor: C.accent + '22', borderColor: C.accent }]}
          onPress={shareSummary}
        >
          <MaterialCommunityIcons name="share-variant" size={20} color={C.accent} />
          <Text style={[styles.exportBtnText, { color: C.accent }]}>
            {t('bilateral.shareSummary') || 'Share with Pediatrician'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Today's Stats */}
      <View style={[styles.section, { backgroundColor: C.card }]}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>
          {t('bilateral.todayStats') || "Today's Stats"}
        </Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: C.background }]}>
            <Text style={[styles.statValue, { color: C.accent }]}>{avgSym.toFixed(1)}</Text>
            <Text style={[styles.statLabel, { color: C.muted }]}>
              {t('bilateral.avgSymmetry') || 'Avg Symmetry'}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: C.background }]}>
            <Text style={[styles.statValue, { color: C.accent }]}>{getDominantSide()}</Text>
            <Text style={[styles.statLabel, { color: C.muted }]}>
              {t('bilateral.dominantSide') || 'Dominant Side'}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: C.background }]}>
            <Text style={[styles.statValue, { color: C.accent }]}>{bilateralLog.filter(e => e.date === today).length}</Text>
            <Text style={[styles.statLabel, { color: C.muted }]}>
              {t('bilateral.entriesToday') || 'Entries Today'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  gradeBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  gradeText: { fontSize: 14, fontWeight: '600' },
  section: { margin: 12, padding: 16, borderRadius: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  sectionSub: { fontSize: 13, marginBottom: 12 },
  milestoneGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  milestoneCard: { width: '30%', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1 },
  milestoneLabel: { fontSize: 11, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  milestoneAge: { fontSize: 10, marginTop: 2 },
  movementSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  movementBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  movementBtnText: { fontSize: 12, marginLeft: 4 },
  scoreLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between' },
  scoreBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: 18, fontWeight: '700' },
  prefRow: { flexDirection: 'row', gap: 8 },
  prefBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  prefBtnText: { fontSize: 14, fontWeight: '600' },
  notesInput: { borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 60, textAlignVertical: 'top', fontSize: 14, marginTop: 12 },
  saveBtn: { marginTop: 12, padding: 14, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  corrCard: { padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginBottom: 8 },
  corrScore: { fontSize: 32, fontWeight: '800' },
  corrLabel: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  corrDesc: { fontSize: 12 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 8 },
  exportBtnText: { fontSize: 15, fontWeight: '600', marginLeft: 8 },
  summaryBox: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  summaryText: { fontSize: 13, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 4 },
});