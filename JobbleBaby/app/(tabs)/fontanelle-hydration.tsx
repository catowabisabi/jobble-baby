import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const STORAGE_KEY_FONTANELLE = STORAGE_KEYS.FONTANELLE_LOG;
const STORAGE_KEY_URINE = STORAGE_KEYS.URINE_LOG;
const STORAGE_KEY_DIAPER = STORAGE_KEYS.HYDRATION_DAILY;

interface FontanelleEntry { date: string; score: number; notes: string; }
interface UrineEntry { date: string; color: number; }
interface DiaperEntry { date: string; count: number; }

const URINE_COLORS = [
  { value: 1, label: 'Pale yellow', hex: '#f0e68c' },
  { value: 2, label: 'Light yellow', hex: '#f5f5dc' },
  { value: 3, label: 'Yellow', hex: '#ffd700' },
  { value: 4, label: 'Dark yellow', hex: '#daa520' },
  { value: 5, label: 'Amber', hex: '#ff8c00' },
];

const FONTANELLE_SCORES = [
  { value: 1, label: 'Sunken (dehydrated)', emoji: '🔴' },
  { value: 2, label: 'Somewhat sunken', emoji: '🟡' },
  { value: 3, label: 'Normal', emoji: '🟢' },
  { value: 4, label: 'Slightly full', emoji: '🟡' },
  { value: 5, label: 'Bulging (concerning)', emoji: '🔴' },
];

export default function FontanelleHydrationScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme] || COLORS.light;

  const [fontanelleLog, setFontanelleLog] = useState<FontanelleEntry[]>([]);
  const [urineLog, setUrineLog] = useState<UrineEntry[]>([]);
  const [diaperLog, setDiaperLog] = useState<DiaperEntry[]>([]);
  const [todayFontanelle, setTodayFontanelle] = useState<number | null>(null);
  const [todayUrine, setTodayUrine] = useState<number | null>(null);
  const [todayDiapers, setTodayDiapers] = useState<string>('');
  const [notes, setNotes] = useState('');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [f, u, d] = await Promise.all([
        safeGetItem(STORAGE_KEY_FONTANELLE),
        safeGetItem(STORAGE_KEY_URINE),
        safeGetItem(STORAGE_KEY_DIAPER),
      ]);
      if (f) {
        const parsed: FontanelleEntry[] = JSON.parse(f);
        setFontanelleLog(parsed);
        const todayEntry = parsed.find(e => e.date === today);
        if (todayEntry) setTodayFontanelle(todayEntry.score);
      }
      if (u) {
        const parsed: UrineEntry[] = JSON.parse(u);
        setUrineLog(parsed);
        const todayEntry = parsed.find(e => e.date === today);
        if (todayEntry) setTodayUrine(todayEntry.color);
      }
      if (d) {
        const parsed: DiaperEntry[] = JSON.parse(d);
        setDiaperLog(parsed);
        const todayEntry = parsed.find(e => e.date === today);
        if (todayEntry) setTodayDiapers(String(todayEntry.count));
      }
    } catch (e) { /* silently fail */ }
  };

  const getDehydrationRisk = (): { level: 'green' | 'yellow' | 'red'; label: string } => {
    const fScore = todayFontanelle ?? 3;
    const uScore = todayUrine ?? 1;
    const dCount = parseInt(todayDiapers || '0', 10);
    const score = fScore + uScore + (dCount >= 6 ? 2 : dCount >= 4 ? 1 : 0);
    if (score >= 7) return { level: 'green', label: t('hydration.riskGreen') || 'Well hydrated' };
    if (score >= 4) return { level: 'yellow', label: t('hydration.riskYellow') || 'Monitor closely' };
    return { level: 'red', label: t('hydration.riskRed') || 'Possible dehydration' };
  };

  const saveFontanelle = async (score: number) => {
    setTodayFontanelle(score);
    const updated = fontanelleLog.filter(e => e.date !== today);
    updated.push({ date: today, score, notes });
    setFontanelleLog(updated);
    await safeSetItem(STORAGE_KEY_FONTANELLE, JSON.stringify(updated));
  };

  const saveUrine = async (color: number) => {
    setTodayUrine(color);
    const updated = urineLog.filter(e => e.date !== today);
    updated.push({ date: today, color });
    setUrineLog(updated);
    await safeSetItem(STORAGE_KEY_URINE, JSON.stringify(updated));
  };

  const saveDiapers = async () => {
    const count = parseInt(todayDiapers || '0', 10);
    const updated = diaperLog.filter(e => e.date !== today);
    updated.push({ date: today, count });
    setDiaperLog(updated);
    await safeSetItem(STORAGE_KEY_DIAPER, JSON.stringify(updated));
  };

  const risk = getDehydrationRisk();
  const riskColor = risk.level === 'green' ? '#22c55e' : risk.level === 'yellow' ? '#eab308' : '#ef4444';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={[styles.header, { backgroundColor: C.card }]}>
        <Text style={[styles.title, { color: C.text }]} accessibilityRole="header">
          {t('hydration.title') || 'Fontanelle and Hydration'}
        </Text>
        <View style={[styles.riskBadge, { backgroundColor: riskColor + '22', borderColor: riskColor }]}>
          <Text style={[styles.riskText, { color: riskColor }]}>{risk.label}</Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: C.card }]}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>
          {t('hydration.fontanelle') || 'Fontanelle Softness'}
        </Text>
        <Text style={[styles.sectionSub, { color: C.muted }]}>
          {t('hydration.fontanelleDesc') || 'How does the soft spot feel today?'}
        </Text>
        <View style={styles.buttonGrid}>
          {FONTANELLE_SCORES.map(s => (
            <TouchableOpacity
              key={s.value}
              accessibilityLabel={`${s.label} - fontanelle softness score ${s.value}`}
              style={[
                styles.scoreBtn,
                {
                  backgroundColor: todayFontanelle === s.value ? C.accent + '33' : C.card,
                  borderColor: todayFontanelle === s.value ? C.accent : C.border,
                },
              ]}
              onPress={() => saveFontanelle(s.value)}
            >
              <Text style={styles.scoreEmoji}>{s.emoji}</Text>
              <Text style={[styles.scoreLabel, { color: C.text }]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: C.card }]}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>
          {t('hydration.urine') || 'Urine Color'}
        </Text>
        <Text style={[styles.sectionSub, { color: C.muted }]}>
          {t('hydration.urineDesc') || 'Darker urine may indicate dehydration'}
        </Text>
        <View style={styles.urineRow}>
          {URINE_COLORS.map(u => (
            <TouchableOpacity
              key={u.value}
              accessibilityLabel={`Urine color ${u.label} - score ${u.value}`}
              style={[
                styles.urineBtn,
                {
                  backgroundColor: todayUrine === u.value ? u.hex + '88' : C.card,
                  borderColor: todayUrine === u.value ? u.hex : C.border,
                },
              ]}
              onPress={() => saveUrine(u.value)}
            >
              <View style={[styles.urineSwatch, { backgroundColor: u.hex }]} />
              <Text style={[styles.urineLabel, { color: C.text }]}>{u.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: C.card }]}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>
          {t('hydration.diapers') || 'Wet Diapers Today'}
        </Text>
        <Text style={[styles.sectionSub, { color: C.muted }]}>
          {t('hydration.diapersDesc') || 'Minimum 6 for newborns, 4+ for older infants'}
        </Text>
        <View style={styles.diaperRow}>
          <TextInput
            accessibilityLabel={t('hydration.diapersInputLabel') || 'Wet diaper count today'}
            style={[styles.diaperInput, { backgroundColor: C.card, color: C.text, borderColor: C.border }]}
            value={todayDiapers}
            onChangeText={setTodayDiapers}
            onBlur={saveDiapers}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={C.muted}
          />
          <Text style={[styles.diaperUnit, { color: C.muted }]}>
            {t('hydration.diapersUnit') || 'wet diapers'}
          </Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: C.card }]}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>
          {t('hydration.notes') || 'Notes'}
        </Text>
        <TextInput
          accessibilityLabel={t('hydration.notesLabel') || 'Hydration notes'}
          style={[styles.notesInput, { backgroundColor: C.card, color: C.text, borderColor: C.border }]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder={t('hydration.notesPlaceholder') || 'Additional observations...'}
          placeholderTextColor={C.muted}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  riskBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  riskText: { fontSize: 14, fontWeight: '600' },
  section: { margin: 12, padding: 16, borderRadius: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  sectionSub: { fontSize: 13, marginBottom: 12 },
  buttonGrid: { gap: 4 },
  scoreBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 6 },
  scoreEmoji: { fontSize: 20, marginRight: 10 },
  scoreLabel: { fontSize: 14, flex: 1 },
  urineRow: { flexDirection: 'row', justifyContent: 'space-between' },
  urineBtn: { flex: 1, alignItems: 'center', padding: 8, borderRadius: 8, borderWidth: 1, marginHorizontal: 2 },
  urineSwatch: { width: 24, height: 24, borderRadius: 12, marginBottom: 4 },
  urineLabel: { fontSize: 10, textAlign: 'center' },
  diaperRow: { flexDirection: 'row', alignItems: 'center' },
  diaperInput: { borderWidth: 1, borderRadius: 8, padding: 10, width: 60, fontSize: 18, textAlign: 'center' },
  diaperUnit: { marginLeft: 10, fontSize: 14 },
  notesInput: { borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: 'top', fontSize: 14 },
});