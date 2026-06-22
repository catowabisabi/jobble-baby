import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, STATUS_COLORS } from '../theme';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';

const STORAGE_ENTRIES = '@jobble/lactation_entries';
const STORAGE_STORAGE = '@jobble/lactation_storage';
const STORAGE_SETTINGS = '@jobble/lactation_settings';

type PumpType = 'hands_free' | 'electric' | 'manual';
type LetdownQuality = 'fast' | 'medium' | 'slow';
type BreastSide = 'left' | 'right' | 'both';
type StorageLocation = 'freezer' | 'fridge' | 'donor';

interface PumpingSession {
  id: string;
  timestamp: string;
  durationMin: number;
  volumeOz: number;
  pumpType: PumpType;
  letdownQuality: LetdownQuality;
  side: BreastSide;
  notes: string;
}

interface MilkStorageItem {
  id: string;
  amountOz: number;
  dateExpressed: string;
  expirationDate: string;
  location: StorageLocation;
  used: boolean;
}

interface LactationSettings {
  volumeUnit: 'oz' | 'ml';
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const getDaysUntil = (dateStr: string): number => {
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

const getExpiryColor = (days: number): string => {
  if (days < 0) return '#9e9e9e';
  if (days < 7) return STATUS_COLORS.error;
  if (days <= 30) return STATUS_COLORS.warning;
  return STATUS_COLORS.good;
};

const getWeeklyTotals = (sessions: PumpingSession[]): { day: string; total: number }[] => {
  const result: { day: string; total: number }[] = [];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const daySessions = sessions.filter((s) => s.timestamp.startsWith(dateStr));
    const total = daySessions.reduce((sum, s) => sum + s.volumeOz, 0);
    result.push({ day: dayLabels[d.getDay()], total });
  }
  return result;
};

const maxBarHeight = 120;

export default function LactationScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [sessions, setSessions] = useState<PumpingSession[]>([]);
  const [storage, setStorage] = useState<MilkStorageItem[]>([]);
  const [settings, setSettings] = useState<LactationSettings>({ volumeUnit: 'oz' });
  const [activeTab, setActiveTab] = useState<'log' | 'chart' | 'storage' | 'weaning'>('log');

  const [showLogModal, setShowLogModal] = useState(false);
  const [logDuration, setLogDuration] = useState('');
  const [logVolume, setLogVolume] = useState('');
  const [logPumpType, setLogPumpType] = useState<PumpType>('electric');
  const [logLetdown, setLogLetdown] = useState<LetdownQuality>('medium');
  const [logSide, setLogSide] = useState<BreastSide>('both');
  const [logNotes, setLogNotes] = useState('');

  const [showStorageModal, setShowStorageModal] = useState(false);
  const [storageAmount, setStorageAmount] = useState('');
  const [storageDateExpressed, setStorageDateExpressed] = useState(new Date().toISOString().split('T')[0]);
  const [storageExpiration, setStorageExpiration] = useState('');
  const [storageLocation, setStorageLocation] = useState<StorageLocation>('freezer');

  
  useEffect(() => {
    const loadData = async () => {
      const [entryData, storageData, settingsData] = await Promise.all([
        safeGetItem(STORAGE_ENTRIES),
        safeGetItem(STORAGE_STORAGE),
        safeGetItem(STORAGE_SETTINGS),
      ]);
      if (entryData) setSessions(JSON.parse(entryData));
      if (storageData) setStorage(JSON.parse(storageData));
      if (settingsData) setSettings(JSON.parse(settingsData));
    };
    loadData();
  }, []);

  
  const saveSessions = useCallback(async (updated: PumpingSession[]) => {
    setSessions(updated);
    await safeSetItem(STORAGE_ENTRIES, JSON.stringify(updated));
  }, []);

  
  const saveStorage = useCallback(async (updated: MilkStorageItem[]) => {
    setStorage(updated);
    await safeSetItem(STORAGE_STORAGE, JSON.stringify(updated));
  }, []);

  const saveSettings = useCallback(async (updated: LactationSettings) => {
    setSettings(updated);
    await safeSetItem(STORAGE_SETTINGS, JSON.stringify(updated));
  }, []);

  // Add pumping session
  const handleAddSession = async () => {
    const duration = parseInt(logDuration, 10);
    const volume = parseFloat(logVolume);
    if (isNaN(duration) || duration <= 0) {
      Alert.alert(t('common.error'), t('lactation.sessionErrorDuration'));
      return;
    }
    if (isNaN(volume) || volume <= 0) {
      Alert.alert(t('common.error'), t('lactation.sessionErrorVolume'));
      return;
    }
    const newSession: PumpingSession = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      durationMin: duration,
      volumeOz: volume,
      pumpType: logPumpType,
      letdownQuality: logLetdown,
      side: logSide,
      notes: logNotes,
    };
    await saveSessions([newSession, ...sessions]);
    setShowLogModal(false);
    setLogDuration('');
    setLogVolume('');
    setLogPumpType('electric');
    setLogLetdown('medium');
    setLogSide('both');
    setLogNotes('');
  };

  // Delete session
  const handleDeleteSession = async (id: string) => {
    await saveSessions(sessions.filter((s) => s.id !== id));
  };

  // Add storage item
  const handleAddStorage = async () => {
    const amount = parseFloat(storageAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(t('common.error'), t('lactation.storageErrorAmount'));
      return;
    }
    const expDate = storageExpiration || (() => {
      const d = new Date(storageDateExpressed);
      d.setDate(d.getDate() + (storageLocation === 'freezer' ? 180 : storageLocation === 'fridge' ? 48 : 0));
      return d.toISOString().split('T')[0];
    })();
    const newItem: MilkStorageItem = {
      id: Date.now().toString(),
      amountOz: amount,
      dateExpressed: storageDateExpressed,
      expirationDate: expDate,
      location: storageLocation,
      used: false,
    };
    await saveStorage([newItem, ...storage]);
    setShowStorageModal(false);
    setStorageAmount('');
    setStorageDateExpressed(new Date().toISOString().split('T')[0]);
    setStorageExpiration('');
    setStorageLocation('freezer');
  };

  // Mark storage as used/defrosted
  const handleMarkUsed = async (id: string) => {
    const updated = storage.map((item) =>
      item.id === id ? { ...item, used: true } : item
    );
    await saveStorage(updated);
  };

  // Delete storage item
  const handleDeleteStorage = async (id: string) => {
    await saveStorage(storage.filter((item) => item.id !== id));
  };

  // Alert logic: weekly totals
  const weeklyTotals = getWeeklyTotals(sessions);
  const weeklyAverage = weeklyTotals.reduce((sum, d) => sum + d.total, 0) / 7;
  const todayTotal = weeklyTotals[6]?.total || 0;
  const dropAlert = weeklyAverage > 0 && todayTotal < weeklyAverage * 0.7;
  const rampingUp = weeklyTotals.slice(-3).every((d, i, arr) => i === 0 || d.total >= arr[i - 1].total) && weeklyTotals.slice(-3).every((d) => d.total > 0);

  // Weaning predictor
  const last14Days = sessions.filter((s) => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return new Date(s.timestamp) >= d;
  });
  const pumpingDays14 = new Set(last14Days.map((s) => s.timestamp.split('T')[0])).size;
  const pumpingFrequency = pumpingDays14 / 14;

  const last7Days = sessions.filter((s) => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return new Date(s.timestamp) >= d;
  });
  const pumpingDays7 = new Set(last7Days.map((s) => s.timestamp.split('T')[0])).size;
  const freq7 = pumpingDays7 / 7;
  const freq14 = pumpingDays14 / 14;
  const trendingDown = freq7 < freq14 * 0.8;
  const weeksToWeaning = pumpingFrequency > 0 ? Math.round((pumpingFrequency * 14) / 7) : 0;

  // Feeding tab correlation (direct BF vs pumping ratio)
  const totalPumpedVolume = sessions.reduce((sum, s) => sum + s.volumeOz, 0);
  const pumpingRatio = totalPumpedVolume > 0 ? Math.round((totalPumpedVolume / (totalPumpedVolume + 1)) * 100) : 0;

  // Night pumping disruption (sessions between 10pm and 6am)
  const nightSessions = sessions.filter((s) => {
    const h = new Date(s.timestamp).getHours();
    return h >= 22 || h < 6;
  });
  const nightPumpingCount = nightSessions.length;
  const nightDisruptionScore = sessions.length > 0 ? Math.round((nightPumpingCount / sessions.length) * 100) : 0;

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    tabRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    tabButton: {
      flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center',
      borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
    },
    tabButtonActive: { backgroundColor: C.accent, borderColor: C.accent },
    tabButtonText: { fontSize: 12, fontWeight: '600', color: C.text },
    tabButtonTextActive: { color: '#fff' },
    sectionTitle: {
      fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1,
      marginBottom: 12, marginTop: 24,
    },
    card: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 16,
    },
    alertCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 2,
      marginBottom: 16,
    },
    alertYellow: { borderColor: STATUS_COLORS.warning },
    alertGreen: { borderColor: STATUS_COLORS.good },
    alertRed: { borderColor: STATUS_COLORS.error },
    alertTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
    alertBody: { fontSize: 13, color: C.muted },
    // Bar chart
    chartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: maxBarHeight + 40, marginBottom: 8 },
    barWrapper: { alignItems: 'center', flex: 1 },
    bar: { width: 28, borderRadius: 6, minHeight: 4 },
    barLabel: { fontSize: 11, color: C.muted, marginTop: 6 },
    barValue: { fontSize: 10, color: C.muted, marginBottom: 4 },
    // Stat row
    statRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    statCard: {
      flex: 1, backgroundColor: C.background, borderRadius: 12, padding: 12,
      borderWidth: 1, borderColor: C.border, alignItems: 'center',
    },
    statValue: { fontSize: 20, fontWeight: '700', color: C.text },
    statLabel: { fontSize: 11, color: C.muted, marginTop: 4, textAlign: 'center' },
    // Log button
    addButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderRadius: 12, paddingVertical: 14, gap: 8,
    },
    addButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    // Session list
    sessionCard: {
      backgroundColor: C.background, borderRadius: 12, padding: 12,
      marginBottom: 8, borderWidth: 1, borderColor: C.border,
    },
    sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sessionTime: { fontSize: 12, color: C.muted },
    sessionVolume: { fontSize: 16, fontWeight: '600', color: C.text },
    sessionDetails: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
    sessionBadge: { backgroundColor: C.card, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
    sessionBadgeText: { fontSize: 11, color: C.text },
    deleteButton: { padding: 4 },
    emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 20 },
    // Storage list
    storageCard: {
      backgroundColor: C.background, borderRadius: 12, padding: 12,
      marginBottom: 8, borderWidth: 1, borderColor: C.border,
    },
    storageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    storageAmount: { fontSize: 16, fontWeight: '600', color: C.text },
    storageBadge: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
    storageBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
    storageDates: { flexDirection: 'row', gap: 16, marginTop: 8 },
    storageDateText: { fontSize: 12, color: C.muted },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: {
      backgroundColor: C.card, borderRadius: 16, padding: 20,
      borderWidth: 1, borderColor: C.border,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 16 },
    modalLabel: { fontSize: 14, color: C.muted, marginBottom: 8 },
    modalInput: {
      backgroundColor: C.background, borderRadius: 12, padding: 12,
      borderWidth: 1, borderColor: C.border, color: C.text, fontSize: 16, marginBottom: 16,
    },
    modalSelectRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    modalSelectButton: {
      flex: 1, borderRadius: 10, padding: 10, alignItems: 'center',
      borderWidth: 1, borderColor: C.border, backgroundColor: C.background,
    },
    modalSelectButtonActive: { backgroundColor: C.accent, borderColor: C.accent },
    modalSelectText: { fontSize: 12, fontWeight: '600', color: C.text },
    modalSelectTextActive: { color: '#fff' },
    modalButtons: { flexDirection: 'row', gap: 12 },
    modalButton: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
    modalButtonCancel: { backgroundColor: C.background, borderWidth: 1, borderColor: C.border },
    modalButtonSave: { backgroundColor: C.accent },
    modalButtonText: { fontSize: 14, fontWeight: '600', color: C.text },
    modalButtonTextSave: { color: '#fff' },
    // weaning
    weaningCard: {
      backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16,
      borderWidth: 1, borderColor: C.border,
    },
    weaningBigNum: { fontSize: 48, fontWeight: '700', color: C.text, textAlign: 'center' },
    weaningSubtext: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8 },
    weaningSchedule: {
      backgroundColor: C.background, borderRadius: 12, padding: 12, marginTop: 12,
      borderWidth: 1, borderColor: C.border,
    },
    weaningScheduleText: { fontSize: 13, color: C.muted, lineHeight: 20 },
    // correlation
    correlationRow: { flexDirection: 'row', gap: 12 },
    correlationCard: {
      flex: 1, backgroundColor: C.background, borderRadius: 12, padding: 12,
      borderWidth: 1, borderColor: C.border, alignItems: 'center',
    },
    correlationValue: { fontSize: 22, fontWeight: '700', color: C.text },
    correlationLabel: { fontSize: 11, color: C.muted, marginTop: 4, textAlign: 'center' },
  });

  const renderLogTab = () => (
    <>
      {dropAlert && (
        <View style={[styles.alertCard, styles.alertRed]}>
          <Text style={styles.alertTitle}>{t('lactation.alertSupplyDropTitle')}</Text>
          <Text style={styles.alertBody}>{t('lactation.alertSupplyDropBody')}</Text>
        </View>
      )}
      {rampingUp && weeklyTotals.slice(-3).every((d) => d.total > 0) && (
        <View style={[styles.alertCard, styles.alertGreen]}>
          <Text style={styles.alertTitle}>{t('lactation.alertSupplyRampingTitle')}</Text>
          <Text style={styles.alertBody}>{t('lactation.alertSupplyRampingBody')}</Text>
        </View>
      )}

      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{sessions.length}</Text>
          <Text style={styles.statLabel}>{t('lactation.totalSessions')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalPumpedVolume.toFixed(1)}</Text>
          <Text style={styles.statLabel}>{t('lactation.totalOz')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{pumpingDays14}</Text>
          <Text style={styles.statLabel}>{t('lactation.pumpingDays14')}</Text>
        </View>
      </View>

      <TouchableOpacity
        accessibilityLabel={t('lactation.addSession')}
        accessibilityHint={t('lactation.addSessionHint')}
        style={[styles.addButton, { backgroundColor: C.accent }]}
        onPress={() => setShowLogModal(true)}
      >
        <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        <Text style={styles.addButtonText}>{t('lactation.addSession')}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{t('lactation.history')}</Text>
      {sessions.length === 0 ? (
        <Text style={styles.emptyText}>{t('lactation.noSessions')}</Text>
      ) : (
        sessions.slice(0, 20).map((session) => (
          <View key={session.id} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionTime}>{formatDateTime(session.timestamp)}</Text>
              <Text style={styles.sessionVolume}>{session.volumeOz} oz</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteSession(session.id)}
                accessibilityLabel={t('lactation.deleteSession')}
                accessibilityHint={`Delete ${session.volumeOz} oz session`}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={STATUS_COLORS.error} />
              </TouchableOpacity>
            </View>
            <View style={styles.sessionDetails}>
              <View style={styles.sessionBadge}>
                <Text style={styles.sessionBadgeText}>{session.durationMin} min</Text>
              </View>
              <View style={styles.sessionBadge}>
                <Text style={styles.sessionBadgeText}>{t(`lactation.pumpType.${session.pumpType}`)}</Text>
              </View>
              <View style={styles.sessionBadge}>
                <Text style={styles.sessionBadgeText}>{t(`lactation.side.${session.side}`)}</Text>
              </View>
              <View style={styles.sessionBadge}>
                <Text style={styles.sessionBadgeText}>{t(`lactation.letdown.${session.letdownQuality}`)}</Text>
              </View>
            </View>
            {session.notes ? (
              <Text style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{session.notes}</Text>
            ) : null}
          </View>
        ))
      )}
    </>
  );

  const renderChartTab = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('lactation.weeklySupply')}</Text>
        <View style={styles.chartContainer}>
          {weeklyTotals.map((d, i) => {
            const height = d.total > 0 ? Math.max(4, (d.total / Math.max(...weeklyTotals.map((x) => x.total), 1)) * maxBarHeight) : 4;
            return (
              <View key={i} style={styles.barWrapper}>
                <Text style={styles.barValue}>{d.total > 0 ? d.total.toFixed(1) : ''}</Text>
                <View
                  style={[
                    styles.bar,
                    { height, backgroundColor: d.total > 0 ? C.accent : C.border },
                  ]}
                />
                <Text style={styles.barLabel}>{d.day}</Text>
              </View>
            );
          })}
        </View>
        <Text style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 8 }}>
          {t('lactation.weeklyAvg')}: {weeklyAverage.toFixed(1)} oz
        </Text>
      </View>

      {dropAlert && (
        <View style={[styles.alertCard, styles.alertRed]}>
          <Text style={styles.alertTitle}>{t('lactation.alertSupplyDropTitle')}</Text>
          <Text style={styles.alertBody}>{t('lactation.alertSupplyDropBody')}</Text>
        </View>
      )}
      {rampingUp && weeklyTotals.slice(-3).every((d) => d.total > 0) && (
        <View style={[styles.alertCard, styles.alertGreen]}>
          <Text style={styles.alertTitle}>{t('lactation.alertSupplyRampingTitle')}</Text>
          <Text style={styles.alertBody}>{t('lactation.alertSupplyRampingBody')}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>{t('lactation.correlationTitle')}</Text>
      <View style={styles.correlationRow}>
        <View style={styles.correlationCard}>
          <Text style={styles.correlationValue}>{pumpingRatio}%</Text>
          <Text style={styles.correlationLabel}>{t('lactation.pumpingRatio')}</Text>
        </View>
        <View style={styles.correlationCard}>
          <Text style={styles.correlationValue}>{nightDisruptionScore}%</Text>
          <Text style={styles.correlationLabel}>{t('lactation.nightDisruptionScore')}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 12, color: C.muted, marginTop: 8, textAlign: 'center' }}>
        {t('lactation.correlationNote')}
      </Text>
    </>
  );

  const renderStorageTab = () => (
    <>
      <TouchableOpacity
        accessibilityLabel={t('lactation.addStorage')}
        accessibilityHint={t('lactation.addStorageHint')}
        style={[styles.addButton, { backgroundColor: C.accent }]}
        onPress={() => setShowStorageModal(true)}
      >
        <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        <Text style={styles.addButtonText}>{t('lactation.addStorage')}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{t('lactation.storageList')}</Text>
      {storage.filter((s) => !s.used).length === 0 ? (
        <Text style={styles.emptyText}>{t('lactation.noStorage')}</Text>
      ) : (
        storage
          .filter((s) => !s.used)
          .sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime())
          .map((item) => {
            const daysLeft = getDaysUntil(item.expirationDate);
            const badgeColor = getExpiryColor(daysLeft);
            return (
              <View key={item.id} style={styles.storageCard}>
                <View style={styles.storageHeader}>
                  <Text style={styles.storageAmount}>{item.amountOz} oz</Text>
                  <View style={[styles.storageBadge, { backgroundColor: badgeColor }]}>
                    <Text style={styles.storageBadgeText}>
                      {daysLeft < 0 ? t('lactation.expired') : t('lactation.expiresIn', { days: daysLeft })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteStorage(item.id)}
                    accessibilityLabel={t('lactation.deleteStorage')}
                    accessibilityHint={`Delete ${item.amountOz} oz storage`}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={STATUS_COLORS.error} />
                  </TouchableOpacity>
                </View>
                <View style={styles.storageDates}>
                  <Text style={styles.storageDateText}>
                    {t('lactation.expressed')}: {formatDate(item.dateExpressed)}
                  </Text>
                  <Text style={styles.storageDateText}>
                    {t(`lactation.location.${item.location}`)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={{ marginTop: 8, paddingVertical: 8, alignItems: 'center', backgroundColor: C.card, borderRadius: 8 }}
                  onPress={() => handleMarkUsed(item.id)}
                  accessibilityLabel={t('lactation.markUsed')}
                  accessibilityHint={`Mark ${item.amountOz} oz as used`}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: C.accent }}>{t('lactation.markUsed')}</Text>
                </TouchableOpacity>
              </View>
            );
          })
      )}
    </>
  );

  const renderWeaningTab = () => (
    <>
      <View style={styles.weaningCard}>
        <Text style={styles.greeting}>{t('lactation.weaningGreeting')}</Text>
        <Text style={styles.title}>{t('lactation.weaningTitle')}</Text>
        {pumpingDays14 > 0 ? (
          <>
            <Text style={styles.weaningBigNum}>{weeksToWeaning}</Text>
            <Text style={styles.weaningSubtext}>{t('lactation.weeksToWeaning')}</Text>
            <View style={styles.weaningSchedule}>
              <Text style={styles.weaningScheduleText}>
                {t('lactation.weaningScheduleNote', { freq: Math.round(pumpingFrequency * 7) })}
              </Text>
            </View>
          </>
        ) : (
          <Text style={{ fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 16 }}>
            {t('lactation.weaningNoData')}
          </Text>
        )}
      </View>

      {trendingDown && (
        <View style={[styles.alertCard, styles.alertYellow]}>
          <Text style={styles.alertTitle}>{t('lactation.alertWeaningActiveTitle')}</Text>
          <Text style={styles.alertBody}>{t('lactation.alertWeaningActiveBody')}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('lactation.weaningFrequency')}</Text>
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pumpingDays7}</Text>
            <Text style={styles.statLabel}>{t('lactation.pumpingDays7')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pumpingDays14}</Text>
            <Text style={styles.statLabel}>{t('lactation.pumpingDays14')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{Math.round(pumpingFrequency * 7)}</Text>
            <Text style={styles.statLabel}>{t('lactation.avgPerWeek')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('lactation.weaningTips')}</Text>
        <Text style={styles.weaningScheduleText}>{t('lactation.weaningTip1')}</Text>
        <Text style={[styles.weaningScheduleText, { marginTop: 8 }]}>{t('lactation.weaningTip2')}</Text>
        <Text style={[styles.weaningScheduleText, { marginTop: 8 }]}>{t('lactation.weaningTip3')}</Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('lactation.greeting')}</Text>
          <Text style={styles.title}>{t('lactation.title')}</Text>
        </View>

        <View style={styles.tabRow}>
          {(['log', 'chart', 'storage', 'weaning'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              accessibilityLabel={t(`lactation.tab.${tab}`)}
              accessibilityHint={t(`lactation.tab.${tab}Hint`)}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
                {t(`lactation.tab.${tab}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'log' && renderLogTab()}
        {activeTab === 'chart' && renderChartTab()}
        {activeTab === 'storage' && renderStorageTab()}
        {activeTab === 'weaning' && renderWeaningTab()}
      </ScrollView>

      {}
      <Modal visible={showLogModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('lactation.addSession')}</Text>

            <Text style={styles.modalLabel}>{t('lactation.durationMin')}</Text>
            <TextInput
              style={styles.modalInput}
              value={logDuration}
              onChangeText={setLogDuration}
              keyboardType="numeric"
              placeholder="20"
              placeholderTextColor={C.muted}
              accessibilityLabel={t('lactation.durationMin')}
            />

            <Text style={styles.modalLabel}>{t('lactation.volumeOz')}</Text>
            <TextInput
              style={styles.modalInput}
              value={logVolume}
              onChangeText={setLogVolume}
              keyboardType="decimal-pad"
              placeholder="4"
              placeholderTextColor={C.muted}
              accessibilityLabel={t('lactation.volumeOz')}
            />

            <Text style={styles.modalLabel}>{t('lactation.pumpType.label')}</Text>
            <View style={styles.modalSelectRow}>
              {(['hands_free', 'electric', 'manual'] as PumpType[]).map((pt) => (
                <TouchableOpacity
                  key={pt}
                  accessibilityLabel={t(`lactation.pumpType.${pt}`)}
                  style={[styles.modalSelectButton, logPumpType === pt && styles.modalSelectButtonActive]}
                  onPress={() => setLogPumpType(pt)}
                >
                  <Text style={[styles.modalSelectText, logPumpType === pt && styles.modalSelectTextActive]}>
                    {t(`lactation.pumpType.${pt}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>{t('lactation.letdown.label')}</Text>
            <View style={styles.modalSelectRow}>
              {(['fast', 'medium', 'slow'] as LetdownQuality[]).map((ld) => (
                <TouchableOpacity
                  key={ld}
                  accessibilityLabel={t(`lactation.letdown.${ld}`)}
                  style={[styles.modalSelectButton, logLetdown === ld && styles.modalSelectButtonActive]}
                  onPress={() => setLogLetdown(ld)}
                >
                  <Text style={[styles.modalSelectText, logLetdown === ld && styles.modalSelectTextActive]}>
                    {t(`lactation.letdown.${ld}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>{t('lactation.side.label')}</Text>
            <View style={styles.modalSelectRow}>
              {(['left', 'right', 'both'] as BreastSide[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  accessibilityLabel={t(`lactation.side.${s}`)}
                  style={[styles.modalSelectButton, logSide === s && styles.modalSelectButtonActive]}
                  onPress={() => setLogSide(s)}
                >
                  <Text style={[styles.modalSelectText, logSide === s && styles.modalSelectTextActive]}>
                    {t(`lactation.side.${s}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>{t('lactation.notes')}</Text>
            <TextInput
              style={styles.modalInput}
              value={logNotes}
              onChangeText={setLogNotes}
              placeholder={t('lactation.notesPlaceholder')}
              placeholderTextColor={C.muted}
              multiline
              accessibilityLabel={t('lactation.notes')}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                accessibilityLabel={t('common.cancel')}
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowLogModal(false)}
              >
                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel={t('common.save')}
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleAddSession}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSave]}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {}
      <Modal visible={showStorageModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('lactation.addStorage')}</Text>

            <Text style={styles.modalLabel}>{t('lactation.amountOz')}</Text>
            <TextInput
              style={styles.modalInput}
              value={storageAmount}
              onChangeText={setStorageAmount}
              keyboardType="decimal-pad"
              placeholder="4"
              placeholderTextColor={C.muted}
              accessibilityLabel={t('lactation.amountOz')}
            />

            <Text style={styles.modalLabel}>{t('lactation.dateExpressed')}</Text>
            <TextInput
              style={styles.modalInput}
              value={storageDateExpressed}
              onChangeText={setStorageDateExpressed}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.muted}
              accessibilityLabel={t('lactation.dateExpressed')}
            />

            <Text style={styles.modalLabel}>{t('lactation.expirationDate')} ({t('lactation.optional')})</Text>
            <TextInput
              style={styles.modalInput}
              value={storageExpiration}
              onChangeText={setStorageExpiration}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.muted}
              accessibilityLabel={t('lactation.expirationDate')}
            />

            <Text style={styles.modalLabel}>{t('lactation.storageLocation')}</Text>
            <View style={styles.modalSelectRow}>
              {(['freezer', 'fridge', 'donor'] as StorageLocation[]).map((loc) => (
                <TouchableOpacity
                  key={loc}
                  accessibilityLabel={t(`lactation.location.${loc}`)}
                  style={[styles.modalSelectButton, storageLocation === loc && styles.modalSelectButtonActive]}
                  onPress={() => setStorageLocation(loc)}
                >
                  <Text style={[styles.modalSelectText, storageLocation === loc && styles.modalSelectTextActive]}>
                    {t(`lactation.location.${loc}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                accessibilityLabel={t('common.cancel')}
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowStorageModal(false)}
              >
                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel={t('common.save')}
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleAddStorage}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSave]}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}