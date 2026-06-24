import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

// ─── Types ───────────────────────────────────────────────────────────────────
type CryType = 'hungry' | 'pain' | 'tired' | 'frustrated' | 'bored';

interface CryEvent {
  id: string;
  timestamp: string;
  cryType: CryType;
  duration_minutes: number;
  trigger: string;
  response: string;
}

interface CorrelationData {
  lastFeedHours: number;
  lastSleepMinutes: number;
  diaperHours: number;
  temperatureC: number;
}

// ─── Cry Type Config ─────────────────────────────────────────────────────────

// ─── Mock Data ───────────────────────────────────────────────────────────────
const MOCK_CRY_EVENTS: CryEvent[] = [
  { id: '1', timestamp: new Date(Date.now() - 3600000).toISOString(), cryType: 'hungry', duration_minutes: 8, trigger: 'Last feed 3h ago', response: 'Fed 120ml' },
  { id: '2', timestamp: new Date(Date.now() - 7200000).toISOString(), cryType: 'tired', duration_minutes: 12, trigger: 'Nap skipped', response: 'Rocked to sleep' },
  { id: '3', timestamp: new Date(Date.now() - 14400000).toISOString(), cryType: 'pain', duration_minutes: 5, trigger: 'Teething', response: 'Teething gel applied' },
  { id: '4', timestamp: new Date(Date.now() - 21600000).toISOString(), cryType: 'frustrated', duration_minutes: 7, trigger: 'Diaper rash', response: 'Changed and creamed' },
  { id: '5', timestamp: new Date(Date.now() - 28800000).toISOString(), cryType: 'bored', duration_minutes: 4, trigger: 'Understimulated', response: 'Playtime engaged' },
  { id: '6', timestamp: new Date(Date.now() - 86400000).toISOString(), cryType: 'hungry', duration_minutes: 10, trigger: 'Last feed 3.5h ago', response: 'Fed 150ml' },
  { id: '7', timestamp: new Date(Date.now() - 90000000).toISOString(), cryType: 'tired', duration_minutes: 15, trigger: 'Overtired', response: 'Sleep routine' },
  { id: '8', timestamp: new Date(Date.now() - 93600000).toISOString(), cryType: 'hungry', duration_minutes: 6, trigger: 'Growth spurt', response: 'Top-up feed' },
  { id: '9', timestamp: new Date(Date.now() - 172800000).toISOString(), cryType: 'pain', duration_minutes: 8, trigger: 'Gassy', response: 'Gripe water' },
  { id: '10', timestamp: new Date(Date.now() - 180000000).toISOString(), cryType: 'frustrated', duration_minutes: 9, trigger: 'Reflux', response: 'Held upright' },
];

const MOCK_CORRELATIONS: CorrelationData = {
  lastFeedHours: 2.5,
  lastSleepMinutes: 45,
  diaperHours: 1,
  temperatureC: 24,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const formatDate = (iso: string) => {
  return iso.split('T')[0];
};

// 14-day mock data for bar chart
const get14DayData = (): { day: string; count: number }[] => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data = [5, 3, 7, 2, 6, 4, 8, 3, 5, 6, 2, 7, 4, 3];
  return data.map((count, i) => ({
    day: days[i % 7],
    count,
  }));
};

// Animated waveform bars heights (0-1)
const WAVEFORM_BARS = 40;
const getWaveformValue = (idx: number, time: number): number => {
  return Math.abs(Math.sin(idx * 0.3 + time * 3)) * 0.6 + Math.abs(Math.sin(idx * 0.1 + time * 2)) * 0.4;
};

// ─── Main Component ─────────────────────────────────────────────────────────
export default function CryAcousticFingerprint() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  // Cry types with i18n labels
  const CRY_TYPES = [
    { key: 'hungry' as CryType, icon: 'bottle', label: t('cryAcoustic.sectionB.hungry'), desc: t('cryAcoustic.sectionB.hungryDesc'), color: '#F97316' },
    { key: 'pain' as CryType, icon: 'alert-circle', label: t('cryAcoustic.sectionB.pain'), desc: t('cryAcoustic.sectionB.painDesc'), color: '#EF4444' },
    { key: 'tired' as CryType, icon: 'moon', label: t('cryAcoustic.sectionB.tired'), desc: t('cryAcoustic.sectionB.tiredDesc'), color: '#8B5CF6' },
    { key: 'frustrated' as CryType, icon: 'emoticon-sad', label: t('cryAcoustic.sectionB.frustrated'), desc: t('cryAcoustic.sectionB.frustratedDesc'), color: '#F59E0B' },
    { key: 'bored' as CryType, icon: 'emoticon-neutral', label: t('cryAcoustic.sectionB.bored'), desc: t('cryAcoustic.sectionB.boredDesc'), color: '#6B7280' },
  ];

  // State
  const [cryEvents, setCryEvents] = useState<CryEvent[]>([]);
  const [correlations, setCorrelations] = useState<CorrelationData>(MOCK_CORRELATIONS);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [waveformTime, setWaveformTime] = useState(0);
  const [selectedCryType, setSelectedCryType] = useState<CryType | null>(null);
  const [confidence] = useState(78);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ cryType: 'hungry' as CryType, duration: '5', trigger: '', response: '' });

  // Refs for animation
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveformIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eventsRaw, corrRaw] = await Promise.all([
        safeGetItem(STORAGE_KEYS.CRY_EVENTS),
        safeGetItem(STORAGE_KEYS.CRY_CORRELATIONS),
      ]);
      if (eventsRaw) {
        setCryEvents(JSON.parse(eventsRaw));
      } else {
        // Initialize with mock data
        setCryEvents(MOCK_CRY_EVENTS);
        await safeSetItem(STORAGE_KEYS.CRY_EVENTS, JSON.stringify(MOCK_CRY_EVENTS));
      }
      if (corrRaw) setCorrelations(JSON.parse(corrRaw));
    } catch {}
  };

  const saveEvents = async (newEvents: CryEvent[]) => {
    setCryEvents(newEvents);
    try {
      await safeSetItem(STORAGE_KEYS.CRY_EVENTS, JSON.stringify(newEvents));
    } catch {}
  };

  // Recording simulation
  const startRecording = () => {
    setIsRecording(true);
    setRecordingProgress(0);

    // Waveform animation
    waveformIntervalRef.current = setInterval(() => {
      setWaveformTime(t => t + 0.05);
    }, 50);

    // Progress simulation (5 seconds)
    const startTime = Date.now();
    recordingIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 5000;
      if (elapsed >= 1) {
        stopRecording();
      } else {
        setRecordingProgress(elapsed);
      }
    }, 50);
  };

  const stopRecording = () => {
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
    setIsRecording(false);
    setRecordingProgress(1);
    setTimeout(() => setRecordingProgress(0), 2000);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
    };
  }, []);

  // Add entry
  const handleAddEntry = async () => {
    const entry: CryEvent = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      cryType: addForm.cryType,
      duration_minutes: Math.max(1, parseInt(addForm.duration, 10) || 5),
      trigger: addForm.trigger || 'Manual entry',
      response: addForm.response || 'Not recorded',
    };
    await saveEvents([entry, ...cryEvents]);
    setShowAddModal(false);
    setAddForm({ cryType: 'hungry', duration: '5', trigger: '', response: '' });
  };

  const dayData = get14DayData();
  const maxCount = Math.max(...dayData.map(d => d.count), 1);
  const avgCount = Math.round(dayData.reduce((s, d) => s + d.count, 0) / dayData.length);

  // Correlation cards
  const correlationCards = [
    { key: 'feed', icon: 'bottle', label: 'Last Feed', value: `${correlations.lastFeedHours}h ago`, risk: 72, riskLabel: 'hungry risk' },
    { key: 'sleep', icon: 'moon', label: 'Last Sleep', value: `${correlations.lastSleepMinutes}min ago`, risk: 85, riskLabel: 'tired risk' },
    { key: 'diaper', icon: 'diaper', label: 'Diaper', value: `${correlations.diaperHours}h ago`, risk: 20, riskLabel: 'discomfort' },
    { key: 'temp', icon: 'thermometer', label: 'Temperature', value: `${correlations.temperatureC}C`, risk: 10, riskLabel: 'heat distress' },
  ];

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 16, paddingBottom: 100 },
    header: { marginBottom: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: C.text },
    subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
    sectionTitle: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8 },
    card: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    cardTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 12 },
    // Section A - Waveform
    recordBtn: { backgroundColor: '#EF4444', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16 },
    recordBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    waveformContainer: { height: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, marginBottom: 12 },
    waveformBar: { width: 4, borderRadius: 2, backgroundColor: C.accent },
    pitchContourContainer: { height: 60, marginBottom: 8, overflow: 'hidden' },
    pitchLabel: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 4 },
    progressBar: { height: 4, borderRadius: 2, backgroundColor: C.border, marginTop: 8, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2, backgroundColor: '#EF4444' },
    // Section B - Cry Type
    cryTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    cryTypeCard: { width: '47%', backgroundColor: C.background, borderRadius: 12, padding: 12, borderWidth: 2, borderColor: C.border, alignItems: 'center' },
    cryTypeCardSelected: { borderColor: '#3B82F6', backgroundColor: '#3B82F610' },
    cryTypeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    cryTypeLabel: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
    cryTypeDesc: { fontSize: 11, color: C.muted, textAlign: 'center' },
    confidenceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#10B98120', borderRadius: 20 },
    confidenceText: { fontSize: 12, color: '#10B981', fontWeight: '600' },
    // Section C - Bar Chart
    chartContainer: { marginTop: 8 },
    chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 100 },
    chartBar: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
    chartBarFill: { width: '100%', borderRadius: 3, minHeight: 4 },
    chartLabel: { fontSize: 9, color: C.muted, marginTop: 4 },
    avgLine: { height: 1, backgroundColor: '#F59E0B', marginTop: 4, marginBottom: 2 },
    avgLabel: { fontSize: 9, color: '#F59E0B', textAlign: 'right', marginBottom: 8 },
    // Section D - Correlations
    corrCard: { backgroundColor: C.background, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
    corrHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    corrIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    corrInfo: { flex: 1 },
    corrLabel: { fontSize: 12, color: C.muted },
    corrValue: { fontSize: 14, fontWeight: '600', color: C.text },
    corrRisk: { fontSize: 11, color: C.muted, marginTop: 2 },
    corrBar: { height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' },
    corrBarFill: { height: '100%', borderRadius: 3 },
    // Section E - Journal
    eventCard: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
    eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    eventBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    eventBadgeText: { fontSize: 11, fontWeight: '600' },
    eventTime: { fontSize: 11, color: C.muted },
    eventRow: { flexDirection: 'row', gap: 16 },
    eventMeta: { flex: 1 },
    eventMetaLabel: { fontSize: 10, color: C.muted },
    eventMetaValue: { fontSize: 12, color: C.text, fontWeight: '500' },
    // FAB
    fabContainer: { position: 'absolute', bottom: 30, alignSelf: 'center' },
    fab: {
      width: 60, height: 60, borderRadius: 30, backgroundColor: C.accent,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3, shadowRadius: 4, elevation: 6,
    },
    fabText: { fontSize: 28, color: '#fff', fontWeight: '300' },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modalCard: { backgroundColor: C.card, borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 20, textAlign: 'center' },
    modalLabel: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 8 },
    modalInput: {
      backgroundColor: C.background, borderRadius: 12, padding: 12, fontSize: 16,
      color: C.text, borderWidth: 1, borderColor: C.border, marginBottom: 12,
    },
    cryTypePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    cryTypeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: C.background, borderWidth: 1, borderColor: C.border },
    cryTypeChipSelected: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
    cryTypeChipText: { fontSize: 12, color: C.text },
    cryTypeChipTextSelected: { color: '#fff' },
    saveBtn: { backgroundColor: '#3B82F6', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
    saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    cancelBtn: { padding: 14, alignItems: 'center' },
    cancelBtnText: { fontSize: 14, color: C.muted },
    emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 20 },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Cry Acoustic Fingerprint</Text>
          <Text style={styles.subtitle}>Record and analyze your baby's cry patterns</Text>
        </View>

        {/* ── Section A: Waveform Visualizer ── */}
        <Text style={styles.sectionTitle}>Section A — Waveform Visualizer</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Record Cry Sample</Text>

          <TouchableOpacity
            style={styles.recordBtn}
            onPress={isRecording ? stopRecording : startRecording}
            accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name={isRecording ? 'stop' : 'microphone'}
              size={24} color="#fff"
            />
            <Text style={styles.recordBtnText}>
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Text>
          </TouchableOpacity>

          {/* Waveform visualization */}
          <View style={styles.waveformContainer}>
            {Array.from({ length: WAVEFORM_BARS }).map((_, i) => {
              const height = isRecording
                ? getWaveformValue(i, waveformTime) * 60 + 10
                : 10;
              return (
                <View
                  key={i}
                  style={[
                    styles.waveformBar,
                    { height, backgroundColor: isRecording ? C.accent : C.border },
                  ]}
                />
              );
            })}
          </View>

          {/* Pitch contour (fake curved path) */}
          {isRecording && (
            <View style={styles.pitchContourContainer}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }}>
                {/* Simulated curved pitch path */}
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                  <View
                    key={i}
                    style={{
                      width: 6,
                      height: 20 + Math.sin(i * 0.5 + waveformTime * 2) * 15,
                      backgroundColor: '#EF4444',
                      borderRadius: 3,
                      opacity: 0.7,
                    }}
                  />
                ))}
              </View>
            </View>
          )}

          <Text style={styles.pitchLabel}>
            {isRecording
              ? 'Analyzing...'
              : recordingProgress > 0
              ? 'Pitch contour: ~350-500 Hz (typical hungry cry)'
              : 'Pitch contour: ~350-500 Hz (typical hungry cry)'}
          </Text>

          {/* Progress bar during recording */}
          {isRecording && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${recordingProgress * 100}%` }]} />
            </View>
          )}
        </View>

        {/* ── Section B: Cry Type Classifier ── */}
        <Text style={styles.sectionTitle}>Section B — Cry Type Classifier</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cry Type Classifier</Text>
          <View style={styles.cryTypeGrid}>
            {CRY_TYPES.map(ct => (
              <TouchableOpacity
                key={ct.key}
                style={[
                  styles.cryTypeCard,
                  selectedCryType === ct.key && styles.cryTypeCardSelected,
                ]}
                onPress={() => setSelectedCryType(ct.key)}
                accessibilityLabel={`Cry type: ${ct.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedCryType === ct.key }}
              >
                <View style={[styles.cryTypeIcon, { backgroundColor: ct.color + '20' }]}>
                  <MaterialCommunityIcons name={ct.icon as any} size={22} color={ct.color} />
                </View>
                <Text style={styles.cryTypeLabel}>{ct.label}</Text>
                <Text style={styles.cryTypeDesc}>{ct.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedCryType && (
            <View style={styles.confidenceBadge}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
              <Text style={styles.confidenceText}>{confidence}% match — {CRY_TYPES.find(c => c.key === selectedCryType)?.label}</Text>
            </View>
          )}
        </View>

        {/* ── Section C: Acoustic Time-Series ── */}
        <Text style={styles.sectionTitle}>Section C — Acoustic Time-Series</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cry Pattern Over Time</Text>
          <View style={styles.avgLabel}>
            <Text style={{ fontSize: 9, color: '#F59E0B' }}>Avg: {avgCount} events/day</Text>
          </View>
          <View style={styles.avgLine} />
          <View style={styles.chartContainer}>
            <View style={styles.chartRow}>
              {dayData.map((d, i) => (
                <View key={i} style={styles.chartBar}>
                  <View
                    style={[
                      styles.chartBarFill,
                      {
                        height: Math.max(4, (d.count / maxCount) * 80),
                        backgroundColor: d.count > avgCount ? '#EF4444' : '#3B82F6',
                      },
                    ]}
                  />
                  <Text style={styles.chartLabel}>{d.day}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: '#F59E0B', marginTop: 80 }} />
        </View>

        {/* ── Section D: Correlation Engine ── */}
        <Text style={styles.sectionTitle}>Section D — Correlation Engine</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What Triggers Crying?</Text>
          {correlationCards.map(card => (
            <View key={card.key} style={styles.corrCard}>
              <View style={styles.corrHeader}>
                <View style={[styles.corrIconWrap, { backgroundColor: C.accent + '20' }]}>
                  <MaterialCommunityIcons name={card.icon as any} size={18} color={C.accent} />
                </View>
                <View style={styles.corrInfo}>
                  <Text style={styles.corrLabel}>{card.label}</Text>
                  <Text style={styles.corrValue}>{card.value}</Text>
                  <Text style={styles.corrRisk}>{card.risk}% {card.riskLabel}</Text>
                </View>
              </View>
              <View style={styles.corrBar}>
                <View
                  style={[
                    styles.corrBarFill,
                    {
                      width: `${card.risk}%`,
                      backgroundColor: card.risk > 60 ? '#EF4444' : card.risk > 30 ? '#F59E0B' : '#10B981',
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* ── Section E: Cry Event Journal ── */}
        <Text style={styles.sectionTitle}>Section E — Cry Event Journal</Text>
        {cryEvents.length === 0 ? (
          <Text style={styles.emptyText}>No cry events recorded yet</Text>
        ) : (
          cryEvents.slice(0, 10).map(event => {
            const cryTypeInfo = CRY_TYPES.find(c => c.key === event.cryType);
            return (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <View style={[styles.eventBadge, { backgroundColor: (cryTypeInfo?.color || '#6B7280') + '20' }]}>
                    <MaterialCommunityIcons
                      name={(cryTypeInfo?.icon || 'emoticon-neutral') as any}
                      size={12}
                      color={cryTypeInfo?.color || '#6B7280'}
                    />
                    <Text style={[styles.eventBadgeText, { color: cryTypeInfo?.color || '#6B7280' }]}>
                      {cryTypeInfo?.label || event.cryType}
                    </Text>
                  </View>
                  <Text style={styles.eventTime}>
                    {formatDate(event.timestamp)} {formatTime(event.timestamp)}
                  </Text>
                </View>
                <View style={styles.eventRow}>
                  <View style={styles.eventMeta}>
                    <Text style={styles.eventMetaLabel}>Duration</Text>
                    <Text style={styles.eventMetaValue}>{event.duration_minutes} min</Text>
                  </View>
                  <View style={styles.eventMeta}>
                    <Text style={styles.eventMetaLabel}>Trigger</Text>
                    <Text style={styles.eventMetaValue}>{event.trigger}</Text>
                  </View>
                  <View style={styles.eventMeta}>
                    <Text style={styles.eventMetaLabel}>Response</Text>
                    <Text style={styles.eventMetaValue}>{event.response}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <View style={styles.fabContainer}>
        <Pressable
          style={styles.fab}
          onPress={() => setShowAddModal(true)}
          accessibilityLabel="Add cry event"
          accessibilityRole="button"
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      </View>

      {/* Add Entry Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Cry Event</Text>

            <Text style={styles.modalLabel}>Cry Type</Text>
            <View style={styles.cryTypePicker}>
              {CRY_TYPES.map(ct => (
                <TouchableOpacity
                  key={ct.key}
                  style={[
                    styles.cryTypeChip,
                    addForm.cryType === ct.key && styles.cryTypeChipSelected,
                  ]}
                  onPress={() => setAddForm(f => ({ ...f, cryType: ct.key }))}
                >
                  <Text style={[styles.cryTypeChipText, addForm.cryType === ct.key && styles.cryTypeChipTextSelected]}>
                    {ct.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Duration (minutes)</Text>
            <TextInput
              style={styles.modalInput}
              value={addForm.duration}
              onChangeText={v => setAddForm(f => ({ ...f, duration: v }))}
              keyboardType="number-pad"
              placeholder="5"
              placeholderTextColor={C.muted}
            />

            <Text style={styles.modalLabel}>Trigger</Text>
            <TextInput
              style={styles.modalInput}
              value={addForm.trigger}
              onChangeText={v => setAddForm(f => ({ ...f, trigger: v }))}
              placeholder="e.g., Last feed 3h ago"
              placeholderTextColor={C.muted}
            />

            <Text style={styles.modalLabel}>Response</Text>
            <TextInput
              style={styles.modalInput}
              value={addForm.response}
              onChangeText={v => setAddForm(f => ({ ...f, response: v }))}
              placeholder="e.g., Fed 120ml"
              placeholderTextColor={C.muted}
            />

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleAddEntry}
              accessibilityLabel="Save cry event"
              accessibilityRole="button"
            >
              <Text style={styles.saveBtnText}>Save Entry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowAddModal(false)}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
