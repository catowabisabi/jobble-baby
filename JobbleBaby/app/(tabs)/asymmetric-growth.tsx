import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const STORAGE_KEY = STORAGE_KEYS.ASYMMETRIC_ENTRIES;
// i18n-derived (no longer hardcoded)
const BODY_PARTS: string[] = (() => {
  const body = require('../i18n/en.json').asymmetric.body as Record<string, string>;
  return body ? Object.keys(body) : [];
})();
type BodyPart = typeof BODY_PARTS[number];

interface AsymmetryEntry {
  id: string;
  date: string;
  bodyPart: BodyPart;
  leftValue: number;
  rightValue: number;
  notes: string;
}

function calcAsymmetry(left: number, right: number): number {
  if (left + right === 0) return 0;
  return Math.abs(left - right) / ((left + right) / 2) * 100;
}

function asymmetryLabel(pct: number): { label: string; color: string; bgColor: string } {
  if (pct < 5) return { label: 'Normal', color: '#16A34A', bgColor: '#DCFCE7' };
  if (pct < 10) return { label: 'Mild', color: '#CA8A04', bgColor: '#FEF9C3' };
  if (pct < 15) return { label: 'Moderate', color: '#EA580C', bgColor: '#FFEDD5' };
  return { label: 'Significant', color: '#DC2626', bgColor: '#FEE2E2' };
}

function getBodyPartLabel(t: (key: string) => string, part: BodyPart): string {
  return t(`asymmetric.body.${part}`);
}

export default function AsymmetricGrowthScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const colors = COLORS[effectiveTheme];

  const [entries, setEntries] = useState<AsymmetryEntry[]>([]);
  const [selectedPart, setSelectedPart] = useState<BodyPart>('arm');
  const [leftVal, setLeftVal] = useState('');
  const [rightVal, setRightVal] = useState('');
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(10);

  useEffect(() => {
    loadEntries();
    loadThreshold();
  }, []);

  async function loadEntries() {
    try {
      const raw = await safeGetItem(STORAGE_KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch {}
  }

  async function loadThreshold() {
    try {
      const raw = await safeGetItem(STORAGE_KEYS.ASYMMETRY_ALERT_THRESHOLD);
      if (raw) setAlertThreshold(JSON.parse(raw));
    } catch {}
  }

  async function saveEntries(data: AsymmetryEntry[]) {
    setEntries(data);
    await safeSetItem(STORAGE_KEY, JSON.stringify(data));
  }

  async function handleAdd() {
    const l = parseFloat(leftVal);
    const r = parseFloat(rightVal);
    if (isNaN(l) || isNaN(r) || l <= 0 || r <= 0) {
      Alert.alert(t('asymmetric.invalidValues'), t('asymmetric.enterPositive'));
      return;
    }
    const entry: AsymmetryEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      bodyPart: selectedPart,
      leftValue: l,
      rightValue: r,
      notes,
    };
    const pct = calcAsymmetry(l, r);
    if (pct > alertThreshold) {
      Alert.alert(
        t('asymmetric.alertTitle'),
        t('asymmetric.alertBody').replace('{pct}', pct.toFixed(1)).replace('{part}', getBodyPartLabel(t, selectedPart))
      );
    }
    await saveEntries([...entries, entry]);
    setLeftVal('');
    setRightVal('');
    setNotes('');
    setShowForm(false);
  }

  function latestForPart(part: BodyPart): AsymmetryEntry | undefined {
    return entries.filter(e => e.bodyPart === part).sort((a, b) => b.date.localeCompare(a.date))[0];
  }

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('asymmetric.title')}</Text>
          <Text style={styles.subtitle}>{t('asymmetric.subtitle')}</Text>
        </View>

        {/* Asymmetry Overview */}
        <View style={styles.overviewCard}>
          <Text style={styles.cardTitle}>{t('asymmetric.currentStatus')}</Text>
          <View style={styles.partGrid}>
            {BODY_PARTS.map(part => {
              const latest = latestForPart(part);
              const pct = latest ? calcAsymmetry(latest.leftValue, latest.rightValue) : null;
              const level = pct !== null ? asymmetryLabel(pct) : null;
              return (
                <TouchableOpacity
                  key={part}
                  style={[styles.partCell, selectedPart === part && styles.partCellActive]}
                  onPress={() => setSelectedPart(part)}
                  accessibilityLabel={getBodyPartLabel(t, part)}
                >
                  <Text style={styles.partLabel}>{getBodyPartLabel(t, part)}</Text>
                  {latest ? (
                    <View style={styles.partResult}>
                      <Text style={[styles.partPct, level && { color: level.color }]}>
                        {pct!.toFixed(1)}%
                      </Text>
                      <View style={[styles.levelBadge, level && { backgroundColor: level.bgColor }]}>
                        <Text style={[styles.levelText, level && { color: level.color }]}>
                          {level!.label}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.noData}>{t('asymmetric.noData')}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Reference Guide */}
        <View style={styles.refCard}>
          <Text style={styles.cardTitle}>{t('asymmetric.referenceGuide')}</Text>
          <View style={styles.refRow}>
            <View style={[styles.refDot, { backgroundColor: '#16A34A' }]} />
            <Text style={styles.refText}>{t('asymmetric.refNormal')}</Text>
          </View>
          <View style={styles.refRow}>
            <View style={[styles.refDot, { backgroundColor: '#CA8A04' }]} />
            <Text style={styles.refText}>{t('asymmetric.refMild')}</Text>
          </View>
          <View style={styles.refRow}>
            <View style={[styles.refDot, { backgroundColor: '#EA580C' }]} />
            <Text style={styles.refText}>{t('asymmetric.refModerate')}</Text>
          </View>
          <View style={styles.refRow}>
            <View style={[styles.refDot, { backgroundColor: '#DC2626' }]} />
            <Text style={styles.refText}>{t('asymmetric.refSignificant')}</Text>
          </View>
          <Text style={styles.refNote}>{t('asymmetric.refFormula')}</Text>
          <Text style={styles.refNote}>{t('asymmetric.refAAP')}</Text>
        </View>

        {/* Add Entry Button */}
        {!showForm ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(true)}
            accessibilityLabel={t('asymmetric.addEntry')}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={styles.addButtonText}>{t('asymmetric.addEntry')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>{t('asymmetric.newEntry')}</Text>
            <Text style={styles.formPartLabel}>{getBodyPartLabel(t, selectedPart)}</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('asymmetric.leftSide')} (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={leftVal}
                  onChangeText={setLeftVal}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                  accessibilityLabel={t('asymmetric.leftValue')}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('asymmetric.rightSide')} (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={rightVal}
                  onChangeText={setRightVal}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                  accessibilityLabel={t('asymmetric.rightValue')}
                />
              </View>
            </View>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('asymmetric.notesPlaceholder')}
              multiline
              accessibilityLabel={t('asymmetric.notes')}
            />
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setShowForm(false); setLeftVal(''); setRightVal(''); setNotes(''); }}
              >
                <Text style={styles.cancelButtonText}>{t('asymmetric.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAdd} accessibilityLabel={t('asymmetric.save')}>
                <Text style={styles.saveButtonText}>{t('asymmetric.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* History */}
        {entries.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.cardTitle}>{t('asymmetric.history')}</Text>
            {entries
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 20)
              .map(entry => {
                const pct = calcAsymmetry(entry.leftValue, entry.rightValue);
                const level = asymmetryLabel(pct);
                return (
                  <View key={entry.id} style={styles.historyRow}>
                    <View>
                      <Text style={styles.historyDate}>{entry.date}</Text>
                      <Text style={styles.historyPart}>{getBodyPartLabel(t, entry.bodyPart)}</Text>
                    </View>
                    <View style={styles.historyValues}>
                      <Text style={styles.historyVal}>L: {entry.leftValue}cm  R: {entry.rightValue}cm</Text>
                      <View style={[styles.levelBadge, { backgroundColor: level.bgColor }]}>
                        <Text style={[styles.levelText, { color: level.color }]}>
                          {pct.toFixed(1)}% — {level.label}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
          </View>
        )}

        {/* Alert Threshold Setting */}
        <View style={styles.thresholdCard}>
          <Text style={styles.cardTitle}>{t('asymmetric.alertThreshold')}</Text>
          <Text style={styles.thresholdDesc}>{t('asymmetric.thresholdDesc')}</Text>
          <View style={styles.thresholdRow}>
            {[5, 10, 15].map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.thresholdBtn, alertThreshold === v && styles.thresholdBtnActive]}
                onPress={async () => {
                  setAlertThreshold(v);
                  await safeSetItem(STORAGE_KEYS.ASYMMETRY_ALERT_THRESHOLD, JSON.stringify(v));
                }}
                accessibilityLabel={`${v}%`}
              >
                <Text style={[styles.thresholdBtnText, alertThreshold === v && styles.thresholdBtnTextActive]}>
                  {v}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {alertThreshold >= 10 && (
            <Text style={styles.referralNote}>{t('asymmetric.referralNote')}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: { background: string; card: string; text: string; muted: string; border: string }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    header: { marginBottom: 16 },
    title: { fontSize: 22, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 14, color: colors.muted, marginTop: 4 },
    overviewCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
    partGrid: { gap: 8 },
    partCell: { backgroundColor: colors.background, borderRadius: 8, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
    partCellActive: { borderColor: '#3B82F6', borderWidth: 2 },
    partLabel: { fontSize: 13, color: colors.muted, marginBottom: 4 },
    partResult: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    partPct: { fontSize: 18, fontWeight: '700' },
    levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    levelText: { fontSize: 12, fontWeight: '600' },
    noData: { fontSize: 13, color: colors.muted, fontStyle: 'italic' },
    refCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    refRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    refDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    refText: { fontSize: 13, color: colors.text },
    refNote: { fontSize: 11, color: colors.muted, marginTop: 8, fontStyle: 'italic' },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', borderRadius: 10, padding: 14, marginBottom: 12, gap: 6 },
    addButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    formCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    formPartLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12 },
    inputRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    inputGroup: { flex: 1 },
    inputLabel: { fontSize: 12, color: colors.muted, marginBottom: 4 },
    input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 15, color: colors.text },
    notesInput: { marginBottom: 12, minHeight: 60 },
    formButtons: { flexDirection: 'row', gap: 10 },
    cancelButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    cancelButtonText: { color: colors.text, fontSize: 14 },
    saveButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#3B82F6', alignItems: 'center' },
    saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    historyCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    historyDate: { fontSize: 13, fontWeight: '600', color: colors.text },
    historyPart: { fontSize: 12, color: colors.muted },
    historyValues: { alignItems: 'flex-end' },
    historyVal: { fontSize: 12, color: colors.muted, marginBottom: 2 },
    thresholdCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    thresholdDesc: { fontSize: 13, color: colors.muted, marginBottom: 12 },
    thresholdRow: { flexDirection: 'row', gap: 10 },
    thresholdBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    thresholdBtnActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
    thresholdBtnText: { fontSize: 14, color: colors.text },
    thresholdBtnTextActive: { color: '#fff', fontWeight: '600' },
    referralNote: { fontSize: 12, color: '#DC2626', marginTop: 10, fontStyle: 'italic' },
  });