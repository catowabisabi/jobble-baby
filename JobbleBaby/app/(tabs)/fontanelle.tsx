import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { awardBadge } from '../utils/badgeService';
import * as ImagePicker from 'expo-image-picker';
import { STORAGE_KEYS } from '../../store/storage-keys';

const FONTANELLE_KEY = STORAGE_KEYS.FONTANELLE_ENTRIES;
const PROFILE_KEY = '@jobble_baby_profile';

const FONTANELLE_BLUE = '#60A5FA';
const FONTANELLE_AMBER = '#F59E0B';

interface FontanelleEntry {
  id: string;
  date: string;
  week_number: number;
  fontanelle_size_mm: number;
  photo_uri?: string;
  head_circumference_cm: number;
  notes?: string;
  alert_triggered: 'none' | 'dehydration' | 'early_closure' | 'both';
}

function getBabyAge(birthDateStr: string): { days: number; weeks: number; months: number } {
  try {
    const birth = new Date(birthDateStr);
    const now = new Date();
    const diffMs = now.getTime() - birth.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    return { days, weeks, months };
  } catch {
    return { days: 0, weeks: 0, months: 0 };
  }
}

function getDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}

const checkAlerts = (entry: FontanelleEntry, babyAgeMonths: number): 'none' | 'dehydration' | 'early_closure' | 'both' => {
  const alerts: ('dehydration' | 'early_closure')[] = [];
  if (entry.fontanelle_size_mm > 40) {
    alerts.push('dehydration');
  }
  if (babyAgeMonths < 9 && entry.fontanelle_size_mm < 5) {
    alerts.push('early_closure');
  }
  return alerts.length === 0 ? 'none' : alerts.length === 2 ? 'both' : alerts[0];
};

export default function FontanelleScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [babyProfile, setBabyProfile] = useState<{ birthDate?: string; name?: string } | null>(null);
  const [entries, setEntries] = useState<FontanelleEntry[]>([]);
  const [currentScreen, setCurrentScreen] = useState<'chart' | 'log' | 'tips'>('chart');
  const [fontanelleSize, setFontanelleSize] = useState('');
  const [headCircumference, setHeadCircumference] = useState('');
  const [note, setNote] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRaw, entriesRaw] = await Promise.all([
          AsyncStorage.getItem(PROFILE_KEY),
          AsyncStorage.getItem(FONTANELLE_KEY),
        ]);
        if (profileRaw) setBabyProfile(JSON.parse(profileRaw));
        if (entriesRaw) setEntries(JSON.parse(entriesRaw));
      } catch { }
    };
    load();
  }, []);

  const babyAge = babyProfile?.birthDate ? getBabyAge(babyProfile.birthDate) : { days: 0, weeks: 0, months: 0 };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const saveEntry = async () => {
    const sizeNum = parseFloat(fontanelleSize);
    const headNum = parseFloat(headCircumference);

    if (isNaN(sizeNum) || sizeNum <= 0) {
      Alert.alert(t('fontanelle.invalidSize') || 'Invalid fontanelle size');
      return;
    }
    if (isNaN(headNum) || headNum <= 0) {
      Alert.alert(t('fontanelle.invalidHead') || 'Invalid head circumference');
      return;
    }

    const entry: FontanelleEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      week_number: babyAge.weeks,
      fontanelle_size_mm: sizeNum,
      photo_uri: photoUri || undefined,
      head_circumference_cm: headNum,
      notes: note.trim() || undefined,
      alert_triggered: 'none',
    };

    const alertResult = checkAlerts(entry, babyAge.months);
    entry.alert_triggered = alertResult;

    const updated = [entry, ...entries].slice(0, 100);
    setEntries(updated);
    await AsyncStorage.setItem(FONTANELLE_KEY, JSON.stringify(updated));

    const isFirstEntry = entries.length === 0;
    if (isFirstEntry) {
      await awardBadge('first_fontanelle_log');
    }

    if (alertResult === 'dehydration') {
      Alert.alert(
        t('fontanelle.alertDehydrationTitle') || '⚠️ Dehydration Warning',
        t('fontanelle.alertDehydrationBody') || 'Fontanelle size > 40mm may indicate dehydration. Please consult a healthcare provider.',
        [{ text: 'OK', style: 'default' }]
      );
    } else if (alertResult === 'early_closure') {
      Alert.alert(
        t('fontanelle.alertEarlyClosureTitle') || '⚠️ Early Closure Warning',
        t('fontanelle.alertEarlyClosureBody') || 'Fontanelle size < 5mm before 9 months may indicate early closure. Please consult a healthcare provider.',
        [{ text: 'OK', style: 'default' }]
      );
    } else if (alertResult === 'both') {
      Alert.alert(
        t('fontanelle.alertBothTitle') || '⚠️ Multiple Concerns',
        t('fontanelle.alertBothBody') || 'Both dehydration and early closure concerns detected. Please consult a healthcare provider immediately.',
        [{ text: 'OK', style: 'default' }]
      );
    }

    setFontanelleSize('');
    setHeadCircumference('');
    setNote('');
    setPhotoUri(null);
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
    sectionTitle: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8 },
    tabBar: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    tabButton: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    tabButtonActive: { backgroundColor: FONTANELLE_BLUE, borderColor: FONTANELLE_BLUE },
    tabButtonText: { fontSize: 11, fontWeight: '600', color: C.muted },
    tabButtonTextActive: { color: '#fff' },
    summaryCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    summaryIcon: { fontSize: 32, marginRight: 12 },
    summaryTextBlock: { flex: 1 },
    summaryTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    summarySubtitle: { fontSize: 13, color: C.muted },
    summaryValue: { fontSize: 20, fontWeight: '700', color: FONTANELLE_BLUE, marginRight: 8 },
    chartContainer: { marginTop: 8 },
    entryCard: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
    entryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    entryDate: { fontSize: 13, color: C.muted, flex: 1 },
    entryWeek: { fontSize: 11, color: FONTANELLE_BLUE, fontWeight: '600', backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    entryStats: { flexDirection: 'row', gap: 16, marginBottom: 8 },
    entryStat: { flex: 1 },
    entryStatLabel: { fontSize: 11, color: C.muted, marginBottom: 2 },
    entryStatValue: { fontSize: 16, fontWeight: '700', color: C.text },
    entryStatUnit: { fontSize: 11, color: C.muted },
    alertBadge: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    alertBadgeText: { fontSize: 10, fontWeight: '700', color: '#92400E' },
    noProfileCard: { backgroundColor: C.card, borderRadius: 16, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: FONTANELLE_AMBER, borderLeftWidth: 4, borderLeftColor: FONTANELLE_AMBER },
    noProfileTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 8 },
    noProfileText: { fontSize: 13, color: C.muted, lineHeight: 18 },
    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 8 },
    inputRow: { flexDirection: 'row', gap: 12 },
    inputHalf: { flex: 1 },
    textInput: { backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, fontSize: 16, color: C.text },
    textInputUnit: { position: 'absolute', right: 14, top: 14, fontSize: 14, color: C.muted },
    photoButton: { backgroundColor: C.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center', marginBottom: 16 },
    photoButtonText: { fontSize: 14, color: C.muted },
    photoPreview: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
    noteInput: { backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, minHeight: 80 },
    noteInputText: { fontSize: 14, color: C.text },
    logButton: { backgroundColor: FONTANELLE_BLUE, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
    logButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    historyTitle: { fontSize: 14, fontWeight: '600', color: C.text, marginTop: 20, marginBottom: 8 },
    historyItem: { backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center' },
    historyIcon: { fontSize: 18, marginRight: 10 },
    historyText: { fontSize: 13, color: C.text, flex: 1 },
    historyTime: { fontSize: 11, color: C.muted },
    tipCard: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: FONTANELLE_AMBER, borderLeftWidth: 4, borderLeftColor: FONTANELLE_AMBER },
    tipTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 6 },
    tipText: { fontSize: 13, color: C.muted, lineHeight: 18 },
    alertCard: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F59E0B' },
    alertCardTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 4 },
    alertCardText: { fontSize: 13, color: '#92400E', lineHeight: 18 },
    emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 40 },
  });

  const renderChart = () => (
    <View>
      {babyProfile ? (
        <>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryIcon}>🌀</Text>
              <View style={styles.summaryTextBlock}>
                <Text style={styles.summaryTitle}>
                  {babyProfile.name || 'Baby'} · {babyAge.weeks} weeks
                </Text>
                <Text style={styles.summarySubtitle}>
                  {babyAge.days} days · {babyAge.months} months old
                </Text>
              </View>
              {entries.length > 0 && (
                <Text style={styles.summaryValue}>{entries.length}</Text>
              )}
            </View>
            {entries.length > 0 ? (
              <View style={styles.chartContainer}>
                <Text style={styles.sectionTitle}>{t('fontanelle.sizeHistory')}</Text>
                {entries.slice(0, 10).map((entry) => (
                  <View key={entry.id} style={styles.entryCard}>
                    <View style={styles.entryHeader}>
                      <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
                      <Text style={styles.entryWeek}>Week {entry.week_number}</Text>
                    </View>
                    <View style={styles.entryStats}>
                      <View style={styles.entryStat}>
                        <Text style={styles.entryStatLabel}>{t('fontanelle.fontanelle')}</Text>
                        <Text style={styles.entryStatValue}>{entry.fontanelle_size_mm}</Text>
                        <Text style={styles.entryStatUnit}>mm</Text>
                      </View>
                      <View style={styles.entryStat}>
                        <Text style={styles.entryStatLabel}>{t('fontanelle.headCirc')}</Text>
                        <Text style={styles.entryStatValue}>{entry.head_circumference_cm}</Text>
                        <Text style={styles.entryStatUnit}>cm</Text>
                      </View>
                    </View>
                    {entry.alert_triggered !== 'none' && (
                      <View style={styles.alertBadge}>
                        <Text style={styles.alertBadgeText}>
                          ⚠️ {entry.alert_triggered === 'dehydration' ? 'Dehydration' : entry.alert_triggered === 'early_closure' ? 'Early Closure' : 'Both Concerns'}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No entries yet. Go to Log tab to record measurements.</Text>
            )}
          </View>
        </>
      ) : (
        <View style={styles.noProfileCard}>
          <Text style={styles.noProfileTitle}>👶 Add Baby Profile First</Text>
          <Text style={styles.noProfileText}>
            Please set up your baby profile in Settings to enable fontanelle tracking with age-based alerts.
          </Text>
        </View>
      )}
    </View>
  );

  const renderLog = () => {
    const today = getDateStr();
    const todayEntries = entries.filter((e) => e.date.startsWith(today));

    return (
      <View>
        {babyProfile ? (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryIcon}>📏</Text>
                <View style={styles.summaryTextBlock}>
                  <Text style={styles.summaryTitle}>
                    {babyProfile.name || 'Baby'} · Week {babyAge.weeks}
                  </Text>
                  <Text style={styles.summarySubtitle}>
                    {babyAge.months} months · {babyAge.days} days old
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>{t('fontanelle.newMeasurement')}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('fontanelle.sizeMm')}</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={styles.textInput}
                  value={fontanelleSize}
                  onChangeText={setFontanelleSize}
                  placeholder="e.g., 15"
                  placeholderTextColor={C.muted}
                  keyboardType="numeric"
                />
                <Text style={styles.textInputUnit}>mm</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('fontanelle.headCircCm')}</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={styles.textInput}
                  value={headCircumference}
                  onChangeText={setHeadCircumference}
                  placeholder="e.g., 42"
                  placeholderTextColor={C.muted}
                  keyboardType="numeric"
                />
                <Text style={styles.textInputUnit}>cm</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.photoButton} onPress={pickImage} activeOpacity={0.7}>
                            accessibilityLabel="TouchableOpacity in fontanelle"
              <Ionicons name="camera-outline" size={24} color={C.muted} style={{ marginBottom: 8 }} />
              <Text style={styles.photoButtonText}>
                {photoUri ? '📷 Photo added — tap to change' : 'Add Photo (optional)'}
              </Text>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('fontanelle.notesOptional')}</Text>
              <View style={styles.noteInput}>
                <TextInput
                  style={styles.noteInputText}
                  value={note}
                  onChangeText={setNote}
                  placeholder={t('fontanelle.notesPlaceholder')}
                  placeholderTextColor={C.muted}
                  multiline
                />
              </View>
            </View>

            <TouchableOpacity style={styles.logButton} onPress={saveEntry} activeOpacity={0.7}>
                            accessibilityLabel="Save fontanelle entry"
              <Text style={styles.logButtonText}>✓ {t('fontanelle.saveEntry') || 'Save Entry'}</Text>
            </TouchableOpacity>

            {todayEntries.length > 0 && (
              <>
                <Text style={styles.historyTitle}>{t('fontanelle.todaysEntries').replace('{count}', todayEntries.length.toString())}</Text>
                {todayEntries.map((entry) => (
                  <View key={entry.id} style={styles.historyItem}>
                    <Ionicons name="checkmark-circle" size={18} color={FONTANELLE_BLUE} style={styles.historyIcon} />
                    <Text style={styles.historyText}>
                      {entry.fontanelle_size_mm}mm · {entry.head_circumference_cm}cm
                      {entry.alert_triggered !== 'none' && ' ⚠️'}
                    </Text>
                    <Text style={styles.historyTime}>{formatTime(entry.date)}</Text>
                  </View>
                ))}
              </>
            )}
          </>
        ) : (
          <View style={styles.noProfileCard}>
            <Text style={styles.noProfileTitle}>👶 Add Baby Profile First</Text>
            <Text style={styles.noProfileText}>
              Please set up your baby profile in Settings to enable fontanelle tracking.
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderTips = () => {
    const tips = [
      {
        title: t('fontanelle.tipWhatTitle') || 'What is the Fontanelle?',
        body: t('fontanelle.tipWhatBody') || 'The fontanelle (soft spot) is the membrane-covered gaps between a baby\'s skull bones. These allow the skull to compress during birth and permit brain growth in the first year.',
      },
      {
        title: t('fontanelle.tipNormalTitle') || 'Normal Closure Time',
        body: t('fontanelle.tipNormalBody') || 'The posterior fontanelle typically closes by 2-3 months. The anterior (top) fontanelle usually closes between 12-18 months. Each child is different.',
      },
      {
        title: t('fontanelle.tipDehydrationTitle') || 'Signs of Dehydration',
        body: t('fontanelle.tipDehydrationBody') || 'A sunken or deeply recessed fontanelle can indicate dehydration. Other signs include: dry lips, fewer wet diapers, dark urine, and lethargy. Seek medical help if concerned.',
      },
      {
        title: t('fontanelle.tipBulgingTitle') || 'Bulging Fontanelle',
        body: t('fontanelle.tipBulgingBody') || 'A bulging fontanelle (> 40mm) may indicate increased intracranial pressure, fever, or infection. If accompanied by vomiting, lethargy, or seizures, seek emergency care.',
      },
      {
        title: t('fontanelle.tipEarlyClosureTitle') || 'Early Closure Concerns',
        body: t('fontanelle.tipEarlyClosureBody') || 'If the fontanelle appears to close before 9 months, it may affect brain development. Consult your pediatrician if you notice the soft spot becoming rigid.',
      },
      {
        title: t('fontanelle.tipWhenSeekTitle') || 'When to Seek Help',
        body: t('fontanelle.tipWhenSeekBody') || 'Contact your healthcare provider if: fontanelle is bulging or tense, sunken or deeply recessed, closes before 12 months, or you notice unusual changes in head shape.',
      },
      {
        title: t('fontanelle.tipMeasuringTitle') || 'How to Measure',
        body: t('fontanelle.tipMeasuringBody') || 'Use soft measuring tape. Measure the fontanelle from edge to edge in the longest direction. Do it when baby is calm and lying down. Record in millimeters.',
      },
    ];

    return (
      <View>
        <View style={styles.alertCard}>
          <Text style={styles.alertCardTitle}>⚠️ Medical Disclaimer</Text>
          <Text style={styles.alertCardText}>
            This app is for tracking purposes only. Always consult a healthcare professional for medical advice, diagnosis, or treatment.
          </Text>
        </View>

        {tips.map((tip, idx) => (
          <View key={idx} style={styles.tipCard}>
            <Text style={styles.tipTitle}>{tip.title}</Text>
            <Text style={styles.tipText}>{tip.body}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('fontanelle.greeting') || 'Baby Care'}</Text>
          <Text style={styles.title}>{t('fontanelle.title') || '🌀 Fontanelle'}</Text>
          <Text style={styles.subtitle}>{t('fontanelle.subtitle') || 'Track soft spot & head growth'}</Text>
        </View>

        <View style={styles.tabBar}>
          {(['chart', 'log', 'tips'] as const).map((tab) => (
            <TouchableOpacity
                            accessibilityLabel="TouchableOpacity in fontanelle"
              key={tab}
              style={[styles.tabButton, currentScreen === tab && styles.tabButtonActive]}
              activeOpacity={0.7}
              onPress={() => setCurrentScreen(tab)}
            >
              <Text style={[styles.tabButtonText, currentScreen === tab && styles.tabButtonTextActive]}>
                {tab === 'chart' ? '📊' : tab === 'log' ? '📋' : '💡'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {currentScreen === 'chart' && renderChart()}
        {currentScreen === 'log' && renderLog()}
        {currentScreen === 'tips' && renderTips()}
      </ScrollView>
    </SafeAreaView>
  );
}