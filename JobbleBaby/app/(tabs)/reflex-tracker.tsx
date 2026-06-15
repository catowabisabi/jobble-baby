import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { awardBadge } from '../utils/badgeService';
import { STORAGE_KEYS } from '../../store/storage-keys';

const REFLEX_KEY = STORAGE_KEYS.REFLEX_ENTRIES;
const PROFILE_KEY = '@jobble_baby_profile';

const REFLEXES = [
  { id: 'moro', labelKey: 'reflexTracker.moro', icon: 'alert-circle-outline', minMonths: 4, maxMonths: 6, descKey: 'reflexTracker.moroDesc' },
  { id: 'palmar', labelKey: 'reflexTracker.palmar', icon: 'hand-pointing-right', minMonths: 3, maxMonths: 6, descKey: 'reflexTracker.palmarDesc' },
  { id: 'plantar', labelKey: 'reflexTracker.plantar', icon: 'foot-print', minMonths: 9, maxMonths: 12, descKey: 'reflexTracker.plantarDesc' },
  { id: 'babinski', labelKey: 'reflexTracker.babinski', icon: 'medical-bag', minMonths: 18, maxMonths: 24, descKey: 'reflexTracker.babinskiDesc' },
  { id: 'galant', labelKey: 'reflexTracker.galant', icon: 'water', minMonths: 2, maxMonths: 4, descKey: 'reflexTracker.galantDesc' },
  { id: 'stepping', labelKey: 'reflexTracker.stepping', icon: 'walk', minMonths: 0, maxMonths: 2, descKey: 'reflexTracker.steppingDesc' },
] as const;

type ReflexId = typeof REFLEXES[number]['id'];

type Status = 'present' | 'integrating' | 'absent';

interface ReflexEntry {
  id: string;
  reflexId: ReflexId;
  status: Status;
  date: string;
  timestamp: string;
  babyAgeMonths: number;
  note?: string;
}

const REFLEX_BLUE = '#3B82F6';
const REFLEX_GREEN = '#10B981';
const REFLEX_AMBER = '#F59E0B';
const REFLEX_RED = '#EF4444';
const REFLEX_PURPLE = '#8B5CF6';

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

function getStatusColor(status: Status): string {
  switch (status) {
    case 'present': return REFLEX_RED;
    case 'integrating': return REFLEX_AMBER;
    case 'absent': return REFLEX_GREEN;
  }
}

function getStatusLabel(status: Status, t: (key: string) => string): string {
  switch (status) {
    case 'present': return t('reflexTracker.present');
    case 'integrating': return t('reflexTracker.integrating');
    case 'absent': return t('reflexTracker.integrated');
  }
}

function getAlertStatus(reflex: typeof REFLEXES[number], lastEntry: ReflexEntry | null, babyAgeMonths: number): boolean {
  if (!lastEntry || lastEntry.status === 'absent') return false;
  return babyAgeMonths > reflex.maxMonths;
}

function getCurrentStatus(reflexId: ReflexId, entries: ReflexEntry[]): ReflexEntry | null {
  const reflexEntries = entries.filter((e) => e.reflexId === reflexId);
  if (reflexEntries.length === 0) return null;
  return reflexEntries[0];
}

export default function ReflexTrackerScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [entries, setEntries] = useState<ReflexEntry[]>([]);
  const [babyAgeMonths, setBabyAgeMonths] = useState(0);
  const [expandedReflex, setExpandedReflex] = useState<ReflexId | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedReflex, setSelectedReflex] = useState<ReflexId | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<Status>('present');
  const [note, setNote] = useState('');
  const [newBadge, setNewBadge] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [raw, profileRaw] = await Promise.all([
        safeGetItem(REFLEX_KEY),
        safeGetItem(PROFILE_KEY),
      ]);
      if (raw) setEntries(JSON.parse(raw));
      if (profileRaw) {
        const profile = JSON.parse(profileRaw);
        if (profile.birthDate) {
          setBabyAgeMonths(calculateAgeInMonths(profile.birthDate));
        }
      }
    } catch {}
  };

  const openForm = (reflexId: ReflexId) => {
    setSelectedReflex(reflexId);
    setSelectedStatus('present');
    setNote('');
    setShowForm(true);
  };

  const saveEntry = async () => {
    if (!selectedReflex) return;

    const entry: ReflexEntry = {
      id: Date.now().toString(),
      reflexId: selectedReflex,
      status: selectedStatus,
      date: getDateStr(),
      timestamp: new Date().toISOString(),
      babyAgeMonths,
      note: note.trim() || undefined,
    };

    const existingEntries = entries.filter((e) => !(e.reflexId === selectedReflex && e.reflexId === selectedReflex));
    const filteredPrev = entries.filter((e) => e.reflexId !== selectedReflex);
    const updated = [entry, ...filteredPrev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setEntries(updated);
    setShowForm(false);

    try {
      await safeSetItem(REFLEX_KEY, JSON.stringify(updated));
      if (updated.length >= 3 && !newBadge) {
        await awardBadge('reflex_tracker');
        setNewBadge(true);
        setTimeout(() => setNewBadge(false), 4000);
      }
    } catch {}
  };

  const statusOptions: Status[] = ['present', 'integrating', 'absent'];

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
    sectionTitle: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 16 },
    alertBanner: {
      backgroundColor: '#FEE2E2',
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: REFLEX_RED,
      borderLeftWidth: 4,
    },
    alertTitle: { fontSize: 14, fontWeight: '700', color: REFLEX_RED, marginBottom: 4 },
    alertText: { fontSize: 13, color: '#7F1D1D', lineHeight: 18 },
    reflexCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      marginBottom: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: C.border,
    },
    reflexCardAlert: { borderColor: REFLEX_RED, borderWidth: 1 },
    reflexCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    reflexIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: C.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: C.border,
    },
    reflexInfo: { flex: 1 },
    reflexName: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 2 },
    reflexMeta: { fontSize: 12, color: C.muted },
    statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    alertBadge: { backgroundColor: REFLEX_RED },
    integratedBadge: { backgroundColor: REFLEX_GREEN },
    inProgressBadge: { backgroundColor: REFLEX_AMBER },
    expandIcon: { fontSize: 18, color: C.muted },
    historySection: {
      backgroundColor: C.background,
      borderTopWidth: 1,
      borderTopColor: C.border,
      padding: 12,
    },
    historyTitle: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
    historyEntry: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
    historyDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
    historyText: { fontSize: 13, color: C.text, flex: 1 },
    historyDate: { fontSize: 11, color: C.muted },
    formCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: REFLEX_BLUE,
    },
    formTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 14 },
    statusRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    statusOption: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.background,
    },
    statusOptionSelected: { borderColor: REFLEX_BLUE, backgroundColor: REFLEX_BLUE },
    statusOptionText: { fontSize: 13, fontWeight: '600', color: C.muted },
    statusOptionTextSelected: { color: '#fff' },
    noteInput: {
      backgroundColor: C.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      padding: 12,
      fontSize: 14,
      color: C.text,
      minHeight: 56,
      marginBottom: 14,
    },
    formBtnRow: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    cancelBtnText: { fontSize: 14, fontWeight: '600', color: C.muted },
    saveBtn: { flex: 1, backgroundColor: REFLEX_BLUE, borderRadius: 12, padding: 14, alignItems: 'center' },
    saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    emptyState: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 6 },
    emptyText: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 },
    badgeBanner: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: REFLEX_AMBER, gap: 8 },
    badgeBannerText: { fontSize: 13, fontWeight: '600', color: '#92400E', flex: 1 },
    infoCard: { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: REFLEX_BLUE },
    infoTitle: { fontSize: 13, fontWeight: '700', color: REFLEX_BLUE, marginBottom: 6 },
    infoText: { fontSize: 13, color: '#1E40AF', lineHeight: 18 },
  });

  const alerts = REFLEXES.filter((reflex) => {
    const lastEntry = getCurrentStatus(reflex.id, entries);
    return getAlertStatus(reflex, lastEntry, babyAgeMonths);
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('reflexTracker.greeting') || 'Neurological Development'}</Text>
          <Text style={styles.title}>🧠 {t('reflexTracker.title') || 'Reflex Tracker'}</Text>
          <Text style={styles.subtitle}>
            {babyAgeMonths > 0
              ? `${Math.round(babyAgeMonths)} months old · ${t('reflexTracker.monitorReflexes')}`
              : t('reflexTracker.subtitle')}
          </Text>
        </View>

        {newBadge && (
          <View style={styles.badgeBanner}>
            <Text style={{ fontSize: 18 }}>🏆</Text>
            <Text style={styles.badgeBannerText}>{t('reflexTracker.badgeEarned') || 'Badge earned!'}</Text>
          </View>
        )}

        {alerts.length > 0 && (
          <View style={styles.alertBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
              <MaterialCommunityIcons name="alert" size={16} color={REFLEX_RED} />
              <Text style={styles.alertTitle}>{t('reflexTracker.alertTitle') || 'Reflex Persistence Alert'}</Text>
            </View>
            <Text style={styles.alertText}>
              {t('reflexTracker.alertBody') || `${alerts.map((r) => t(r.labelKey)).join(', ')} ${alerts.length === 1 ? 'has' : 'have'} persisted beyond expected window. Consult your pediatrician.`}
            </Text>
          </View>
        )}

        {entries.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🧠</Text>
            <Text style={styles.emptyTitle}>{t('reflexTracker.emptyTitle') || 'Track Reflex Integration'}</Text>
            <Text style={styles.emptyText}>
              {t('reflexTracker.emptyBody') || 'Record your baby\'s primitive reflexes and monitor when they naturally integrate as the nervous system matures.'}
            </Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('reflexTracker.aboutTitle') || 'About Primitive Reflexes'}</Text>
          <Text style={styles.infoText}>
            {t('reflexTracker.aboutText') || 'Primitive reflexes are automatic movements present at birth that typically disappear (integrate) as the baby matures. Tracking them helps identify developmental progress and flag when reflexes persist beyond typical windows.'}
          </Text>
        </View>

        {REFLEXES.map((reflex) => {
          const lastEntry = getCurrentStatus(reflex.id, entries);
          const isExpanded = expandedReflex === reflex.id;
          const isAlert = getAlertStatus(reflex, lastEntry, babyAgeMonths);
          const currentStatus = lastEntry?.status ?? null;
          const reflexHistory = entries.filter((e) => e.reflexId === reflex.id);

          return (
            <View key={reflex.id} style={[styles.reflexCard, isAlert && styles.reflexCardAlert]}>
              <TouchableOpacity
                              accessibilityLabel="TouchableOpacity in reflex-tracker"
                activeOpacity={0.7}
                onPress={() => setExpandedReflex(isExpanded ? null : reflex.id)}
                style={styles.reflexCardHeader}
              >
                <View style={styles.reflexIconWrap}>
                  <MaterialCommunityIcons name={reflex.icon as any} size={22} color={isAlert ? REFLEX_RED : REFLEX_BLUE} />
                </View>
                <View style={styles.reflexInfo}>
                  <Text style={styles.reflexName}>{t(reflex.labelKey)}</Text>
                  <Text style={styles.reflexMeta}>
                    {t('reflexTracker.windowLabel') || 'Expected window'}: {reflex.minMonths}-{reflex.maxMonths} mo
                  </Text>
                </View>
                {currentStatus && (
                  <View
                    style={[
                      styles.statusBadge,
                      currentStatus === 'absent' ? styles.integratedBadge : currentStatus === 'integrating' ? styles.inProgressBadge : isAlert ? styles.alertBadge : styles.inProgressBadge,
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>{getStatusLabel(currentStatus, t)}</Text>
                  </View>
                )}
                <Text style={styles.expandIcon}>{isExpanded ? '↑' : '↓'}</Text>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.historySection}>
                  <TouchableOpacity
                                  accessibilityLabel="TouchableOpacity in reflex-tracker"
                    style={{ backgroundColor: REFLEX_BLUE, borderRadius: 10, padding: 10, alignItems: 'center', marginBottom: 12 }}
                    activeOpacity={0.7}
                    onPress={() => openForm(reflex.id)}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>
                      + {t('reflexTracker.addEntry') || 'Log Status'}
                    </Text>
                  </TouchableOpacity>

                  {reflexHistory.length === 0 ? (
                    <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 12 }}>
                      {t('reflexTracker.noEntries') || 'No entries yet'}
                    </Text>
                  ) : (
                    reflexHistory.map((entry, i) => (
                      <View key={entry.id} style={[styles.historyEntry, i === reflexHistory.length - 1 && { borderBottomWidth: 0 }]}>
                        <View style={[styles.historyDot, { backgroundColor: getStatusColor(entry.status) }]} />
                        <Text style={styles.historyText}>
                          {getStatusLabel(entry.status, t)}
                          {entry.note ? ` · ${entry.note}` : ''}
                        </Text>
                        <Text style={styles.historyDate}>
                          {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {Math.round(entry.babyAgeMonths)}mo
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          );
        })}

        {showForm && selectedReflex && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {t('reflexTracker.logStatus') || 'Log Status'} — {t(REFLEXES.find((r) => r.id === selectedReflex)?.labelKey ?? '')}
            </Text>

            <Text style={styles.sectionTitle}>{t('reflexTracker.currentStatus') || 'Current Status'}</Text>
            <View style={styles.statusRow}>
              {statusOptions.map((opt) => (
                <TouchableOpacity
                                accessibilityLabel="TouchableOpacity in reflex-tracker"
                  key={opt}
                  style={[styles.statusOption, selectedStatus === opt && styles.statusOptionSelected]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedStatus(opt)}
                >
                  <Text style={[styles.statusOptionText, selectedStatus === opt && styles.statusOptionTextSelected]}>
                    {getStatusLabel(opt, t)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
                            accessibilityLabel="TouchableOpacity in reflex-tracker"
              style={styles.noteInput}
              onPress={() => {
                Alert.prompt
                  ? Alert.prompt(
                      t('reflexTracker.addNote') || 'Add Note',
                      '',
                      [
                        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
                        { text: t('common.save') || 'Save', onPress: (_v?: string) => setNote(_v || '') },
                      ],
                      'plain-text',
                      note
                    )
                  : null;
              }}
            >
              <Text style={{ fontSize: 14, color: note ? C.text : C.muted }}>
                {note || t('reflexTracker.notePlaceholder') || 'Tap to add note (optional)...'}
              </Text>
            </TouchableOpacity>

            <View style={styles.formBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                              accessibilityLabel="Toggle reflex-tracker panel"
                <Text style={styles.cancelBtnText}>{t('common.cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEntry}>
                              accessibilityLabel="Save reflex-tracker entry"
                <Text style={styles.saveBtnText}>{t('common.save') || 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}