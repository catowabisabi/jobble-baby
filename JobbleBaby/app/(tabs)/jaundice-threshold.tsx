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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';

const STORAGE_KEY = '@jobble/jaundice_threshold_entries';
const PROFILE_KEY = '@jobble_baby_profile';

interface JaundiceEntry {
  id: string;
  date: string;
  bilirubin: number; // always stored in mg/dL
  unit: 'mg/dL' | 'μmol/L';
  method: 'blood' | 'transcutaneous';
  ageHours: number;
}

const CHART_W = 340;
const CHART_H = 180;
const CHART_LEFT = 40;
const CHART_RIGHT = 10;
const CHART_TOP = 10;
const CHART_BOTTOM = 30;

const MAX_HOURS = 336; // 14 days
const MAX_BILIRUBIN = 25; // mg/dL

function toMg(d: number, unit: 'mg/dL' | 'μmol/L'): number {
  return unit === 'μmol/L' ? d / 17.1 : d;
}
function toDisplay(v: number, unit: 'mg/dL' | 'μmol/L'): string {
  return unit === 'μmol/L' ? (v * 17.1).toFixed(1) : v.toFixed(1);
}

function getZone(b: number): { label: string; color: string; bg: string } {
  if (b < 8) return { label: 'Low Risk', color: '#16A34A', bg: '#DCFCE7' };
  if (b < 12) return { label: 'Monitor', color: '#CA8A04', bg: '#FEF9C3' };
  if (b < 15) return { label: 'High Risk', color: '#EA580C', bg: '#FFEDD5' };
  return { label: 'Exchange', color: '#DC2626', bg: '#FEE2E2' };
}

function xForHour(h: number): number {
  return CHART_LEFT + (h / MAX_HOURS) * (CHART_W - CHART_LEFT - CHART_RIGHT);
}
function yForBili(b: number): number {
  return CHART_TOP + (1 - b / MAX_BILIRUBIN) * (CHART_H - CHART_TOP - CHART_BOTTOM);
}

export default function JaundiceThresholdScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const colors = COLORS[effectiveTheme];

  const [entries, setEntries] = useState<JaundiceEntry[]>([]);
  const [unit, setUnit] = useState<'mg/dL' | 'μmol/L'>('mg/dL');
  const [biliInput, setBiliInput] = useState('');
  const [ageInput, setAgeInput] = useState('');
  const [method, setMethod] = useState<'blood' | 'transcutaneous'>('blood');
  const [showForm, setShowForm] = useState(false);
  const [birthDate, setBirthDate] = useState<string | null>(null);

  useEffect(() => {
    loadEntries();
    loadProfile();
  }, []);

  async function loadEntries() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch {}
  }

  async function loadProfile() {
    try {
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.birthDate) {
          setBirthDate(p.birthDate);
          const ageH = Math.floor((Date.now() - new Date(p.birthDate).getTime()) / 3600000);
          setAgeInput(String(Math.min(ageH, MAX_HOURS)));
        }
      }
    } catch {}
  }

  async function handleSave() {
    const raw = parseFloat(biliInput);
    if (isNaN(raw) || raw <= 0) {
      Alert.alert(t('jaundiceThreshold.invalidValues'), t('jaundiceThreshold.enterPositive'));
      return;
    }
    const ageH = parseInt(ageInput) || 0;
    const mgValue = toMg(raw, unit);
    const zone = getZone(mgValue);
    if (zone.label === 'High Risk' || zone.label === 'Exchange') {
      Alert.alert(t('jaundiceThreshold.alertHighTitle'), t('jaundiceThreshold.alertHighBody'));
    }
    const entry: JaundiceEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      bilirubin: mgValue,
      unit,
      method,
      ageHours: ageH,
    };
    const updated = [...entries, entry].sort((a, b) => a.date.localeCompare(b.date));
    setEntries(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setBiliInput('');
    setShowForm(false);
  }

  function trendFor(idx: number): string {
    if (idx === 0) return '';
    const prev = entries[idx - 1].bilirubin;
    const curr = entries[idx].bilirubin;
    if (curr - prev > 1) return '↑';
    if (prev - curr > 1) return '↓';
    return '→';
  }

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('jaundiceThreshold.title')}</Text>
          <Text style={styles.subtitle}>{t('jaundiceThreshold.subtitle')}</Text>
        </View>

        {/* Zone Legend */}
        <View style={styles.legendCard}>
          <Text style={styles.cardTitle}>{t('jaundiceThreshold.riskZones')}</Text>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
            <Text style={styles.legendText}>{t('jaundiceThreshold.lowRisk')}: &lt;8 mg/dL</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#CA8A04' }]} />
            <Text style={styles.legendText}>{t('jaundiceThreshold.monitor')}: 8–12 mg/dL</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#EA580C' }]} />
            <Text style={styles.legendText}>{t('jaundiceThreshold.highRisk')}: 12–15 mg/dL</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
            <Text style={styles.legendText}>{t('jaundiceThreshold.exchange')}: &gt;15 mg/dL</Text>
          </View>
          <Text style={styles.disclaimer}>{t('jaundiceThreshold.disclaimer')}</Text>
          <Text style={styles.refNote}>{t('jaundiceThreshold.refBhutani')}</Text>
        </View>

        {/* Simple SVG Chart using View positioning */}
        {entries.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.cardTitle}>{t('jaundiceThreshold.chart')}</Text>
            <View style={styles.chartWrapper}>
              {/* Zone bands */}
              <View style={[styles.zoneBand, { top: 0, height: '30%', backgroundColor: 'rgba(22,163,74,0.12)' }]} />
              <View style={[styles.zoneBand, { top: '30%', height: '22%', backgroundColor: 'rgba(202,138,4,0.12)' }]} />
              <View style={[styles.zoneBand, { top: '52%', height: '18%', backgroundColor: 'rgba(234,88,12,0.12)' }]} />
              <View style={[styles.zoneBand, { top: '70%', height: '30%', backgroundColor: 'rgba(220,38,38,0.12)' }]} />

              {/* Axes */}
              <View style={styles.yAxis}>
                {[0, 5, 10, 15, 20, 25].map(v => (
                  <Text key={v} style={styles.yLabel}>{v}</Text>
                ))}
              </View>
              <View style={styles.xAxis}>
                {[0, 72, 168, 240, 336].map(h => (
                  <Text key={h} style={styles.xLabel}>{h}h</Text>
                ))}
              </View>

              {/* Data points */}
              {entries.map((e, i) => {
                const x = xForHour(e.ageHours);
                const y = yForBili(e.bilirubin);
                const zone = getZone(e.bilirubin);
                return (
                  <View
                    key={e.id}
                    style={[
                      styles.dataPoint,
                      {
                        left: x - 5,
                        top: y - 5,
                        backgroundColor: zone.color,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* Add Reading Button */}
        {!showForm ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(true)}
            accessibilityLabel={t('jaundiceThreshold.addEntry')}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={styles.addButtonText}>{t('jaundiceThreshold.addEntry')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>{t('jaundiceThreshold.newReading')}</Text>

            {/* Unit Toggle */}
            <View style={styles.unitRow}>
              <TouchableOpacity
                style={[styles.unitBtn, unit === 'mg/dL' && styles.unitBtnActive]}
                onPress={() => setUnit('mg/dL')}
                accessibilityLabel="mg/dL"
              >
                <Text style={[styles.unitBtnText, unit === 'mg/dL' && styles.unitBtnTextActive]}>mg/dL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitBtn, unit === 'μmol/L' && styles.unitBtnActive]}
                onPress={() => setUnit('μmol/L')}
                accessibilityLabel="μmol/L"
              >
                <Text style={[styles.unitBtnText, unit === 'μmol/L' && styles.unitBtnTextActive]}>μmol/L</Text>
              </TouchableOpacity>
            </View>

            {/* Bilirubin Input */}
            <Text style={styles.inputLabel}>{t('jaundiceThreshold.bilirubinLevel')} ({unit})</Text>
            <TextInput
              style={styles.input}
              value={biliInput}
              onChangeText={setBiliInput}
              keyboardType="decimal-pad"
              placeholder={unit === 'mg/dL' ? 'e.g. 10.5' : 'e.g. 180'}
              accessibilityLabel={t('jaundiceThreshold.bilirubinLevel')}
            />

            {/* Age Hours */}
            <Text style={styles.inputLabel}>{t('jaundiceThreshold.ageHours')}</Text>
            <TextInput
              style={styles.input}
              value={ageInput}
              onChangeText={setAgeInput}
              keyboardType="number-pad"
              placeholder="e.g. 72"
              accessibilityLabel={t('jaundiceThreshold.ageHours')}
            />

            {/* Method */}
            <Text style={styles.inputLabel}>{t('jaundiceThreshold.method')}</Text>
            <View style={styles.methodRow}>
              <TouchableOpacity
                style={[styles.methodBtn, method === 'blood' && styles.methodBtnActive]}
                onPress={() => setMethod('blood')}
              >
                <Text style={[styles.methodBtnText, method === 'blood' && styles.methodBtnTextActive]}>
                  {t('jaundiceThreshold.blood')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.methodBtn, method === 'transcutaneous' && styles.methodBtnActive]}
                onPress={() => setMethod('transcutaneous')}
              >
                <Text style={[styles.methodBtnText, method === 'transcutaneous' && styles.methodBtnTextActive]}>
                  {t('jaundiceThreshold.transcutaneous')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setShowForm(false); setBiliInput(''); }}
              >
                <Text style={styles.cancelButtonText}>{t('jaundiceThreshold.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>{t('jaundiceThreshold.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* History */}
        {entries.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.cardTitle}>{t('jaundiceThreshold.history')}</Text>
            {[...entries].reverse().slice(0, 20).map((e, revIdx) => {
              const origIdx = entries.length - 1 - revIdx;
              const zone = getZone(e.bilirubin);
              const trend = trendFor(origIdx);
              const date = new Date(e.date);
              return (
                <View key={e.id} style={styles.historyRow}>
                  <View>
                    <Text style={styles.historyDate}>
                      {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={styles.historyMeta}>
                      {e.ageHours}h · {e.method === 'blood' ? t('jaundiceThreshold.blood') : t('jaundiceThreshold.transcutaneous')}
                    </Text>
                  </View>
                  <View style={styles.historyValues}>
                    <Text style={[styles.historyBili, { color: zone.color }]}>
                      {toDisplay(e.bilirubin, unit)} {unit} {trend}
                    </Text>
                    <View style={[styles.zoneBadge, { backgroundColor: zone.bg }]}>
                      <Text style={[styles.zoneBadgeText, { color: zone.color }]}>{zone.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {entries.length === 0 && !showForm && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('jaundiceThreshold.noData')}</Text>
          </View>
        )}
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
    legendCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 10 },
    legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    legendText: { fontSize: 13, color: colors.text },
    disclaimer: { fontSize: 11, color: '#DC2626', marginTop: 10, fontStyle: 'italic' },
    refNote: { fontSize: 11, color: colors.muted, marginTop: 4, fontStyle: 'italic' },
    chartCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    chartWrapper: { height: CHART_H, position: 'relative', marginTop: 8 },
    zoneBand: { position: 'absolute', left: CHART_LEFT, right: CHART_RIGHT, borderRadius: 4 },
    yAxis: { position: 'absolute', left: 0, top: CHART_TOP, bottom: CHART_BOTTOM, justifyContent: 'space-between' },
    yLabel: { fontSize: 9, color: colors.muted, textAlign: 'right', width: 32 },
    xAxis: { position: 'absolute', left: CHART_LEFT, right: CHART_RIGHT, bottom: 0, flexDirection: 'row', justifyContent: 'space-between' },
    xLabel: { fontSize: 9, color: colors.muted },
    dataPoint: { position: 'absolute', width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#fff' },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', borderRadius: 10, padding: 14, marginBottom: 12, gap: 6 },
    addButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    formCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    unitRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    unitBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    unitBtnActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
    unitBtnText: { fontSize: 14, color: colors.text },
    unitBtnTextActive: { color: '#fff', fontWeight: '600' },
    inputLabel: { fontSize: 12, color: colors.muted, marginBottom: 4 },
    input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 15, color: colors.text, marginBottom: 12 },
    methodRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    methodBtn: { flex: 1, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    methodBtnActive: { backgroundColor: colors.border, borderColor: colors.muted },
    methodBtnText: { fontSize: 12, color: colors.text },
    methodBtnTextActive: { fontWeight: '600' },
    formButtons: { flexDirection: 'row', gap: 10 },
    cancelButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    cancelButtonText: { color: colors.text, fontSize: 14 },
    saveButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#3B82F6', alignItems: 'center' },
    saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    historyCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    historyDate: { fontSize: 13, fontWeight: '600', color: colors.text },
    historyMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
    historyValues: { alignItems: 'flex-end' },
    historyBili: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    zoneBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    zoneBadgeText: { fontSize: 11, fontWeight: '600' },
    emptyCard: { backgroundColor: colors.card, borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    emptyText: { fontSize: 14, color: colors.muted, fontStyle: 'italic' },
  });