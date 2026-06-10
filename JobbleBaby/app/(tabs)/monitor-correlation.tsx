import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMonitorLink, MonitorEvent } from '../hooks/useMonitorLink';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';

const TRACKING_KEY = '@jobble/tracking_entries';
const DISRUPTION_KEY = '@jobble/sleep_disruptions';

interface TrackingEntry {
  id: string;
  type: string;
  timestamp: string;
  note?: string;
}

interface SleepDisruption {
  id: string;
  cause: string;
  timestamp: string;
  severity: 1 | 2 | 3;
}

const EVENT_ICONS: Record<string, string> = {
  sound: 'microphone',
  motion: 'vibrate',
  cry: 'baby-face-outline',
};

const EVENT_COLORS: Record<string, string> = {
  sound: '#60A5FA',
  motion: '#F59E0B',
  cry: '#EF4444',
};

export default function MonitorCorrelationScreen() {
  const { getMonitorEvents } = useMonitorLink();
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [monitorEvents, setMonitorEvents] = useState<MonitorEvent[]>([]);
  const [disruptions, setDisruptions] = useState<SleepDisruption[]>([]);
  const [trackingEntries, setTrackingEntries] = useState<TrackingEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      const [events, disruptionsRaw, trackingRaw] = await Promise.all([
        getMonitorEvents(),
        AsyncStorage.getItem(DISRUPTION_KEY),
        AsyncStorage.getItem(TRACKING_KEY),
      ]);
      setMonitorEvents(events);
      setDisruptions(disruptionsRaw ? JSON.parse(disruptionsRaw) : []);
      const allEntries = trackingRaw ? JSON.parse(trackingRaw) : [];
      // Filter to sleep-related entries
      const sleepEntries = allEntries.filter((e: TrackingEntry) => e.type === 'sleep' || e.type === 'nap');
      setTrackingEntries(sleepEntries);
    };
    load();
  }, []);

  const isCorrelated = (event: MonitorEvent, disruption: SleepDisruption): boolean => {
    if (event.type !== 'cry') return false;
    const eventTime = new Date(event.timestamp).getTime();
    const disruptionTime = new Date(disruption.timestamp).getTime();
    const diffMinutes = Math.abs(eventTime - disruptionTime) / (1000 * 60);
    return diffMinutes <= 30;
  };

  const formatTime = (iso: string): string => {
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Build correlation pairs
  const correlations: Array<{ event: MonitorEvent; disruption: SleepDisruption }> = [];
  monitorEvents.forEach((event) => {
    disruptions.forEach((disruption) => {
      if (isCorrelated(event, disruption)) {
        correlations.push({ event, disruption });
      }
    });
  });

  const renderLegend = () => (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <MaterialCommunityIcons name="microphone" size={16} color={EVENT_COLORS.sound} />
        <Text style={[styles.legendText, { color: C.muted }]}>Sound</Text>
      </View>
      <View style={styles.legendItem}>
        <MaterialCommunityIcons name="vibrate" size={16} color={EVENT_COLORS.motion} />
        <Text style={[styles.legendText, { color: C.muted }]}>Motion</Text>
      </View>
      <View style={styles.legendItem}>
        <MaterialCommunityIcons name="baby-face-outline" size={16} color={EVENT_COLORS.cry} />
        <Text style={[styles.legendText, { color: C.muted }]}>Cry</Text>
      </View>
    </View>
  );

  const renderTimeline = () => {
    if (monitorEvents.length === 0 && disruptions.length === 0) {
      return (
        <View style={[styles.emptyCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.emptyText, { color: C.muted }]}>
            No monitor events or sleep disruptions recorded yet.
          </Text>
          <Text style={[styles.emptySubtext, { color: C.muted }]}>
            Events will appear here when your monitor detects activity.
          </Text>
        </View>
      );
    }

    return (
      <View>
        {/* Monitor Events Column */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>Monitor Events</Text>
        <View style={styles.eventList}>
          {monitorEvents.slice(0, 20).map((event) => (
            <View key={event.id} style={[styles.eventCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={[styles.eventIconBadge, { backgroundColor: EVENT_COLORS[event.type] + '20' }]}>
                <MaterialCommunityIcons name={EVENT_ICONS[event.type] as any} size={18} color={EVENT_COLORS[event.type]} />
              </View>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventType, { color: C.text }]}>{event.type.charAt(0).toUpperCase() + event.type.slice(1)}</Text>
                <Text style={[styles.eventTime, { color: C.muted }]}>{formatDate(event.timestamp)} {formatTime(event.timestamp)}</Text>
              </View>
              {correlations.some((c) => c.event.id === event.id) && (
                <View style={styles.correlatedBadge}>
                  <Text style={styles.correlatedBadgeText}>🔗</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Sleep Disruptions Column */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>Sleep Disruptions</Text>
        <View style={styles.eventList}>
          {disruptions.slice(0, 20).map((disruption) => (
            <View key={disruption.id} style={[styles.eventCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={[styles.eventIconBadge, { backgroundColor: '#EF444420' }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#EF4444" />
              </View>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventType, { color: C.text }]}>{disruption.cause}</Text>
                <Text style={[styles.eventTime, { color: C.muted }]}>{formatDate(disruption.timestamp)} {formatTime(disruption.timestamp)}</Text>
              </View>
              {correlations.some((c) => c.disruption.id === disruption.id) && (
                <View style={styles.correlatedBadge}>
                  <Text style={styles.correlatedBadgeText}>🔗</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Correlations */}
        {correlations.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Correlations (Cry within 30 min of disruption)</Text>
            {correlations.map((corr) => (
              <View key={`${corr.event.id}-${corr.disruption.id}`} style={[styles.correlationCard, { backgroundColor: C.card, borderColor: '#3B82F6' }]}>
                <View style={styles.correlationRow}>
                  <View style={styles.correlationLeft}>
                    <MaterialCommunityIcons name="baby-face-outline" size={20} color={EVENT_COLORS.cry} />
                    <Text style={[styles.correlationText, { color: C.text }]}>Cry detected</Text>
                  </View>
                  <Text style={[styles.correlationTime, { color: C.muted }]}>{formatTime(corr.event.timestamp)}</Text>
                </View>
                <View style={styles.correlationConnector}>
                  <Text style={styles.connectorText}>↓ 30 min ↓</Text>
                </View>
                <View style={styles.correlationRow}>
                  <View style={styles.correlationLeft}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#EF4444" />
                    <Text style={[styles.correlationText, { color: C.text }]}>{corr.disruption.cause}</Text>
                  </View>
                  <Text style={[styles.correlationTime, { color: C.muted }]}>{formatTime(corr.disruption.timestamp)}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]} edges={['top']} accessibilityLabel={t('monitorCorrelation.tab_title')}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('monitor.greeting') || 'Monitor'}</Text>
          <Text style={styles.title}>{t('monitor.correlationTitle') || '🔗 Correlation'}</Text>
        </View>
        {renderLegend()}
        {renderTimeline()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },
  header: { marginBottom: 20 },
  greeting: { fontSize: 14, color: '#8b9bb4', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#F8FAFC', marginTop: 4 },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 20, padding: 12, backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8 },
  eventList: { gap: 8, marginBottom: 20 },
  eventCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12 },
  eventIconBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  eventInfo: { flex: 1 },
  eventType: { fontSize: 14, fontWeight: '600' },
  eventTime: { fontSize: 12, marginTop: 2 },
  correlatedBadge: { marginLeft: 8 },
  correlatedBadgeText: { fontSize: 14 },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  emptySubtext: { fontSize: 13, textAlign: 'center' },
  correlationCard: { borderRadius: 12, borderWidth: 2, padding: 14, marginBottom: 12 },
  correlationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  correlationLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  correlationText: { fontSize: 14, fontWeight: '600' },
  correlationTime: { fontSize: 12 },
  correlationConnector: { alignItems: 'center', paddingVertical: 6 },
  connectorText: { fontSize: 11, color: '#3B82F6', fontWeight: '700' },
});
