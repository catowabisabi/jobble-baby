import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Share, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import { getWeeklySummary, WeeklyTrend } from '../utils/weeklySummary';
import { awardWeeklyViewer } from '../utils/badgeService';
import { useNotifications } from '../hooks/useNotifications';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import MonitorWidget from '../components/MonitorWidget';

const STORAGE_KEY = '@jobble/schedule_entries';

interface SleepData {
  start: string;
  end: string;
  duration: string;
  quality: 'good' | 'ok' | 'poor';
}

interface ScheduleDay {
  day: string;
  sleep: SleepData | null;
}

const SCHEDULE_DATA: ScheduleDay[] = [
  { day: 'Monday', sleep: { start: '9:00 AM', end: '11:00 AM', duration: '2h', quality: 'good' } },
  { day: 'Tuesday', sleep: { start: '9:15 AM', end: '11:30 AM', duration: '2h 15m', quality: 'good' } },
  { day: 'Wednesday', sleep: { start: '8:45 AM', end: '10:30 AM', duration: '1h 45m', quality: 'ok' } },
  { day: 'Thursday', sleep: null },
  { day: 'Friday', sleep: { start: '10:00 AM', end: '12:00 PM', duration: '2h', quality: 'good' } },
  { day: 'Saturday', sleep: null },
  { day: 'Sunday', sleep: { start: '9:30 AM', end: '11:45 AM', duration: '2h 15m', quality: 'good' } },
];

const NEXT_NAP = { start: '1:00 PM', end: '3:00 PM', duration: '2h' };

const QUALITY_COLORS = {
  good: '#2ecc71',
  ok: '#f1c40f',
  poor: '#e74c3c',
};

const PERMISSION_COLORS = {
  granted: '#2ecc71',
  denied: '#e74c3c',
  undetermined: '#f1c40f',
};

// AAP-recommended wake windows by age
const WAKE_WINDOWS: { maxMonths: number; minMin: number; maxMin: number }[] = [
  { maxMonths: 0.25,   minMin: 35,  maxMin: 60  },  // 0-6 weeks
  { maxMonths: 0.75,   minMin: 60,  maxMin: 90  },  // 6-12 weeks
  { maxMonths: 4,      minMin: 75,  maxMin: 120 },  // 3-4 months
  { maxMonths: 6,      minMin: 120, maxMin: 180 },  // 4-6 months (2-3h)
  { maxMonths: 9,      minMin: 150, maxMin: 210 },  // 6-9 months (2.5-3.5h)
  { maxMonths: 12,     minMin: 180, maxMin: 240 },  // 9-12 months (3-4h)
  { maxMonths: 18,     minMin: 210, maxMin: 300 },  // 12-18 months (3.5-5h)
];

function calculateAgeInMonths(birthDate: string): number {
  try {
    const birth = new Date(birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    return days / 30.44; // average days per month
  } catch {
    return 0;
  }
}

function getWakeWindow(months: number): { min: number; max: number } {
  for (const w of WAKE_WINDOWS) {
    if (months <= w.maxMonths) return { min: w.minMin, max: w.maxMin };
  }
  return { min: 210, max: 300 }; // fallback for 18+ months
}

function getTimeSinceLastSleep(scheduleData: ScheduleDay[]): { minutes: number; label: string } | null {
  for (const day of scheduleData) {
    if (day.sleep) {
      const now = new Date();
      const [startTime, period] = day.sleep.start.split(' ');
      const [hour, minute] = startTime.split(':').map(Number);
      let h = hour;
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      const sleepStart = new Date();
      sleepStart.setHours(h, minute, 0, 0);
      const diffMs = now.getTime() - sleepStart.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin > 0) {
        const h_ = Math.floor(diffMin / 60);
        const m_ = diffMin % 60;
        const label = h_ > 0 ? `${h_}h ${m_}m` : `${m_}m`;
        return { minutes: diffMin, label };
      }
    }
  }
  return null;
}

export default function ScheduleScreen() {
  const [scheduleData, setScheduleData] = useState<ScheduleDay[]>(SCHEDULE_DATA);
  const [babyProfile, setBabyProfile] = useState<{ birthDate?: string } | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklyTrend | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [showQRModal, setShowQRModal] = useState(false);
  const { requestPermissions, scheduleSleepNotification, scheduleFeedingReminder, scheduleDailySummary, cancelAllNotifications } = useNotifications();
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setScheduleData(JSON.parse(stored));
        }
        const profileStored = await AsyncStorage.getItem('@jobble_baby_profile');
        if (profileStored) {
          setBabyProfile(JSON.parse(profileStored));
        }
      } catch (e) {
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadWeeklySummary = async () => {
      try {
        const summary = await getWeeklySummary();
        setWeeklySummary(summary);
        // Award weekly viewer badge (idempotent)
        await awardWeeklyViewer();
      } catch (e) {
        // Silent fail, UI already has fallback
      }
    };
    loadWeeklySummary();
  }, []);

  useEffect(() => {
    const requestNotifPermissions = async () => {
      const result = await requestPermissions();
      setNotificationPermission(result);
      if (result === 'granted') {
        // Schedule daily feeding reminder for 9:00 AM
        scheduleFeedingReminder('Feeding Time 🍼', 'Remember to log feeding', 9, 0);
        // Schedule daily summary push notification at 8:00 PM
        scheduleDailySummary(
          t('schedule.dailySummaryTitle') || 'Daily Summary Ready 📋',
          t('schedule.dailySummaryBody') || 'Tap to see yesterday\'s summary'
        );
      }
    };
    requestNotifPermissions();
  }, [requestPermissions, scheduleFeedingReminder]);

  // Share QR Modal Component
  const ShareQRModal = () => {
    const deepLink = encodeScheduleForShare();
    return (
      <Modal visible={showQRModal} transparent animationType="fade" onRequestClose={() => setShowQRModal(false)}>
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: '#0D0D0D',
            borderRadius: 20,
            padding: 24,
            alignItems: 'center',
            width: '100%',
            maxWidth: 340,
            borderWidth: 1,
            borderColor: '#3B82F6',
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 }}>
              {t('schedule.shareTitle') || 'Share Baby Schedule'}
            </Text>
            <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20, textAlign: 'center' }}>
              {t('schedule.shareQRLabel')}
            </Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <QRCode value={deepLink} size={200} backgroundColor="#ffffff" color="#000000" />
            </View>
            <TouchableOpacity
                            accessibilityLabel="Button in schedule"
              onPress={() => {
                setShowQRModal(false);
                handleShareSchedule();
              }}
              style={{ backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, width: '100%' }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
                {t('schedule.shareTitle') || 'Share'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
                            accessibilityLabel="Toggle schedule panel"
              onPress={() => setShowQRModal(false)}
              style={{ marginTop: 12 }}
            >
              <Text style={{ color: '#9CA3AF', fontSize: 14 }}>{t('common.cancel') || 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const handleAddEntry = async () => {
    const now = new Date();
    const startStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const endHour = (now.getHours() + 2) % 12 || 12;
    const endStr = endHour + ':00 ' + (now.getHours() + 2 >= 12 ? 'PM' : 'AM');
    const newEntry: SleepData = { start: startStr, end: endStr, duration: '2h', quality: 'good' };
    const updated = [...scheduleData];
    const todayIdx = updated.findIndex(d => d.day.toLowerCase() === now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase());
    if (todayIdx >= 0) {
      updated[todayIdx] = { ...updated[todayIdx], sleep: newEntry };
    }
    setScheduleData(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      // Schedule sleep notification for 1 hour ahead
      await cancelAllNotifications();
      await scheduleSleepNotification('Nap Reminder 🌙', 'Time for baby\'s nap!', 1, 14, 0);
    } catch (e) {
    }
  };

  // Encode schedule data to base64 for deep link sharing (React Native compatible)
  function encodeScheduleForShare(): string {
    try {
      const payload = { v: 1, schedule: scheduleData, baby: babyProfile, ts: Date.now() };
      const json = JSON.stringify(payload);
      // btoa for React Native / browser environments
      const base64 = btoa(unescape(encodeURIComponent(json)));
      return `jobblebaby://schedule?data=${encodeURIComponent(base64)}`;
    } catch {
      return '';
    }
  }

  // Share schedule as text summary + deep link
  async function handleShareSchedule() {
    try {
      const todayEntries = scheduleData.filter(d => d.sleep);
      if (todayEntries.length === 0) {
        Alert.alert(t('schedule.shareNoDataTitle') || 'No Schedule Yet', t('schedule.shareNoDataMsg') || 'Add some sleep entries first before sharing.');
        return;
      }
      const deepLink = encodeScheduleForShare();
      const summary = [
        `🍼 ${t('appName')} — ${t('tabs.schedule')}`,
        '',
        ...todayEntries.map(d => `• ${d.day}: ${d.sleep?.start}–${d.sleep?.end} (${d.sleep?.duration})`),
        '',
        deepLink,
      ].join('\n');

      await Share.share({
        message: summary,
        title: t('schedule.shareTitle') || 'Share Baby Schedule',
      });
    } catch (e) {
      // Silent fail - user cancelled
    }
  }

  const nextNap = scheduleData.find(d => d.sleep)?.sleep || NEXT_NAP;

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    nextNapCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: C.border,
    },
    nextNapHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    nextNapLabel: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    moonIcon: { fontSize: 24 },
    nextNapTime: { fontSize: 18, fontWeight: 'bold', color: C.text, marginBottom: 12 },
    nextNapFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    nextNapDuration: { fontSize: 14, color: C.muted },
    qualityDot: { width: 8, height: 8, borderRadius: 4 },
    qualityLabel: { fontSize: 12, color: C.muted },
    notificationStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    notificationStatusText: { fontSize: 12, color: C.muted },
    permissionDot: { width: 8, height: 8, borderRadius: 4 },
    weeklySection: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 16 },
    sectionTitleHidden: { alignItems: 'center', fontSize: 12, color: '#8b9bb4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, display: 'none' },
    dayRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.border,
    },
    dayName: { fontSize: 14, fontWeight: '600', color: C.text, flex: 1 },
    dayData: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sleepTime: { fontSize: 14, color: C.text },
    sleepDuration: { fontSize: 12, color: C.muted },
    noData: { fontSize: 14, color: C.muted, fontStyle: 'italic' },
    weeklySummaryCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: C.border,
    },
    weeklySummaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    weeklySummaryLabel: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    weeklySummaryIcon: { fontSize: 24 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    summaryItem: { alignItems: 'center', flex: 1 },
    summaryEmoji: { fontSize: 24, marginBottom: 8 },
    summaryCount: { fontSize: 24, fontWeight: 'bold', color: C.text, marginBottom: 4 },
    summaryLabel: { fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    summaryTrend: { fontSize: 16, fontWeight: 'bold' },
    fab: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      backgroundColor: C.accent,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    fabIcon: { fontSize: 24 },
    fabShare: {
      position: 'absolute',
      bottom: 20,
      right: 84,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
    },
    fabShareIcon: { fontSize: 20 },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('schedule.greeting')}</Text>
          <Text style={styles.title}>{t('schedule.title')}</Text>
        </View>

        <MonitorWidget />

        {/* Wake Window Card */}
        {babyProfile?.birthDate && (() => {
          const ageMonths = calculateAgeInMonths(babyProfile.birthDate);
          const { min: minAwake, max: maxAwake } = getWakeWindow(ageMonths);
          const timeSince = getTimeSinceLastSleep(scheduleData);
          const awakeMinutes = timeSince ? timeSince.minutes : 0;
          const awakePercent = Math.min((awakeMinutes / maxAwake) * 100, 100);
          const barColor = awakePercent < 60 ? '#2ecc71' : awakePercent < 80 ? '#f1c40f' : '#e74c3c';
          const isOvertired = awakePercent >= 80;
          return (
            <View style={[styles.nextNapCard, { marginBottom: 12 }]}>
              <View style={styles.nextNapHeader}>
                <Text style={styles.nextNapLabel}>{t('schedule.wakeWindow') || 'Wake Window'}</Text>
                <Text style={styles.moonIcon}>⏱️</Text>
              </View>
              <Text style={{ fontSize: 14, color: C.text, marginBottom: 6 }}>
                {babyProfile?.birthDate ? `${minAwake}-${maxAwake} min awake` : ''}
              </Text>
              {timeSince && (
                <Text style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>
                  {t('schedule.lastSleep') || 'Last sleep'}: {timeSince.label} {t('schedule.ago') || 'ago'}
                </Text>
              )}
              <View style={{ backgroundColor: C.border, borderRadius: 6, height: 10, marginBottom: 4 }}>
                <View style={{ width: `${awakePercent}%`, backgroundColor: barColor, borderRadius: 6, height: 10 }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11, color: C.muted }}>0</Text>
                <Text style={{ fontSize: 11, color: C.muted }}>{maxAwake}min</Text>
              </View>
              {isOvertired && (
                <View style={{ backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginTop: 8 }}>
                  <Text style={{ fontSize: 13, color: '#92400e' }}>⏰ {(t('schedule.overtiredWarning') || 'Overtired window approaching')}</Text>
                  {timeSince && (
                    <Text style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>
                      {t('schedule.suggestedNap') || 'Suggested nap'}: ~{Math.round(maxAwake - awakeMinutes)}min
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })()}

        {/* Next Nap Reminder Card */}
        <View style={styles.nextNapCard}>
          <View style={styles.nextNapHeader}>
            <Text style={styles.nextNapLabel}>{t('schedule.nextNap')}</Text>
            <Text style={styles.moonIcon}>🌙</Text>
          </View>
          <Text style={styles.nextNapTime}>
            {nextNap.start} - {nextNap.end}
          </Text>
          <View style={styles.nextNapFooter}>
            <Text style={styles.nextNapDuration}>{nextNap.duration}</Text>
            <View style={[styles.qualityDot, { backgroundColor: QUALITY_COLORS.good }]} />
            <Text style={styles.qualityLabel}>{t('schedule.expected')}</Text>
          </View>
          <View style={styles.notificationStatus}>
            <Text style={styles.notificationStatusText}>
              🔔 {t('schedule.notificationsStatus', { status: t('schedule.' + notificationPermission) })}
            </Text>
            <View style={[styles.permissionDot, { backgroundColor: PERMISSION_COLORS[notificationPermission] }]} />
          </View>
        </View>

        {/* Weekly Summary Card */}
        {weeklySummary && (
          <View style={styles.weeklySummaryCard}>
            <View style={styles.weeklySummaryHeader}>
              <Text style={styles.weeklySummaryLabel}>{t('schedule.weeklySummary')}</Text>
              <Text style={styles.weeklySummaryIcon}>📊</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryEmoji}>🧷</Text>
                <Text style={styles.summaryCount}>{weeklySummary.current.diaperCount}</Text>
                <Text style={styles.summaryLabel}>{t('schedule.diapers')}</Text>
                <Text style={[styles.summaryTrend, { color: weeklySummary.trends.diaper === '↑' ? '#3B82F6' : weeklySummary.trends.diaper === '↓' ? '#e74c3c' : '#8b9bb4' }]}>{weeklySummary.trends.diaper}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryEmoji}>🍼</Text>
                <Text style={styles.summaryCount}>{weeklySummary.current.feedCount}</Text>
                <Text style={styles.summaryLabel}>{t('schedule.feeds')}</Text>
                <Text style={[styles.summaryTrend, { color: weeklySummary.trends.feed === '↑' ? '#3B82F6' : weeklySummary.trends.feed === '↓' ? '#e74c3c' : '#8b9bb4' }]}>{weeklySummary.trends.feed}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryEmoji}>🌙</Text>
                <Text style={styles.summaryCount}>{weeklySummary.current.sleepCount}</Text>
                <Text style={styles.summaryLabel}>{t('schedule.sleepLabel')}</Text>
                <Text style={[styles.summaryTrend, { color: weeklySummary.trends.sleep === '↑' ? '#3B82F6' : weeklySummary.trends.sleep === '↓' ? '#e74c3c' : '#8b9bb4' }]}>{weeklySummary.trends.sleep}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryEmoji}>📈</Text>
                <Text style={styles.summaryCount}>{weeklySummary.current.growthCount}</Text>
                <Text style={styles.summaryLabel}>{t('schedule.growthLabel')}</Text>
                <Text style={[styles.summaryTrend, { color: weeklySummary.trends.growth === '↑' ? '#3B82F6' : weeklySummary.trends.growth === '↓' ? '#e74c3c' : '#8b9bb4' }]}>{weeklySummary.trends.growth}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Weekly Sleep Schedule */}
        <View style={styles.weeklySection}>
          <Text style={styles.sectionTitleHidden}>{t('schedule.weeklySleepSchedule')}</Text>
          {scheduleData.map((item) => (
            <View key={item.day} style={styles.dayRow}>
              <Text style={styles.dayName}>{item.day}</Text>
              <View style={styles.dayData}>
                {item.sleep ? (
                  <>
                    <Text style={styles.sleepTime}>
                      {item.sleep.start} - {item.sleep.end}
                    </Text>
                    <Text style={styles.sleepDuration}>{item.sleep.duration}</Text>
                    <View
                      style={[
                        styles.qualityDot,
                        { backgroundColor: QUALITY_COLORS[item.sleep.quality] },
                      ]}
                    />
                  </>
                ) : (
                  <Text style={styles.noData}>{t('schedule.noSleepRecorded')}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Share FAB */}
      <TouchableOpacity style={styles.fabShare} activeOpacity={0.8} accessibilityLabel="Button in schedule" onPress={() => {
        const todayEntries = scheduleData.filter(d => d.sleep);
        if (todayEntries.length === 0) {
          Alert.alert(t('schedule.shareNoDataTitle') || 'No Schedule Yet', t('schedule.shareNoDataMsg') || 'Add some sleep entries first before sharing.');
        } else {
          setShowQRModal(true);
        }
      }}>
        <Text style={styles.fabShareIcon}>📤</Text>
      </TouchableOpacity>

      {/* Share QR Modal */}
      <ShareQRModal />

      {/* Add Entry FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={handleAddEntry}>
                      accessibilityLabel="Add schedule entry"
        <Text style={styles.fabIcon}>🌙</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}


