import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, COLORS } from '../context/ThemeContext';

interface QuickEntry {
  id: string;
  label: string;
  icon: string;
  color: string;
  lastTime?: string;
}

const QUICK_ENTRIES: QuickEntry[] = [
  { id: 'diaper', label: 'Diaper', icon: '🧷', color: '#A8D5BA' },
  { id: 'feed', label: 'Feed', icon: '🍼', color: '#F5B7B1' },
  { id: 'sleep', label: 'Sleep', icon: '🌙', color: '#AED6F1' },
];

interface TimelineEvent {
  id: string;
  type: string;
  icon: string;
  time: string;
  note?: string;
}

const MOCK_EVENTS: TimelineEvent[] = [
  { id: '1', type: 'diaper', icon: '🧷', time: '08:30', note: 'Wet' },
  { id: '2', type: 'feed', icon: '🍼', time: '09:00', note: 'Breast, 12min' },
  { id: '3', type: 'sleep', icon: '🌙', time: '09:45', note: 'Nap' },
  { id: '4', type: 'diaper', icon: '🧷', time: '11:15', note: 'Both' },
  { id: '5', type: 'feed', icon: '🍼', time: '12:00', note: 'Bottle, 120ml' },
];

export default function HomeScreen() {
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];

  const [lastEvents] = useState({
    diaper: '08:30',
    feed: '09:00',
    sleep: '09:45',
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Good morning</Text>
          <Text style={styles.babyName}>Baby's Day</Text>
          <Text style={styles.date}>Friday, May 29, 2026</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          {QUICK_ENTRIES.map((entry) => (
            <View key={entry.id} style={[styles.summaryCard, { backgroundColor: entry.color }]}>
              <Text style={styles.cardIcon}>{entry.icon}</Text>
              <Text style={styles.cardLabel}>{entry.label}</Text>
              <Text style={styles.cardTime}>{lastEvents[entry.id as keyof typeof lastEvents] || '--:--'}</Text>
            </View>
          ))}
        </View>

        {/* Next Reminder */}
        <View style={styles.reminderCard}>
          <Text style={styles.reminderLabel}>Next Reminder</Text>
          <View style={styles.reminderContent}>
            <Text style={styles.reminderIcon}>🍼</Text>
            <View>
              <Text style={styles.reminderTitle}>Feeding</Text>
              <Text style={styles.reminderTime}>Next feed in ~2h</Text>
            </View>
          </View>
        </View>

        {/* Daily Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>Today's Timeline</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineScroll}>
            {MOCK_EVENTS.map((event) => (
              <View key={event.id} style={styles.timelineItem}>
                <View style={styles.timelineIconBg}>
                  <Text style={styles.timelineIcon}>{event.icon}</Text>
                </View>
                <Text style={styles.timelineTime}>{event.time}</Text>
                {event.note && (
                  <Text style={styles.timelineNote} numberOfLines={1}>{event.note}</Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Quick Add FAB area */}
        <View style={styles.fabArea}>
          <Text style={styles.fabLabel}>Quick Add</Text>
          <View style={styles.fabRow}>
            {QUICK_ENTRIES.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={[styles.fab, { backgroundColor: entry.color }]}
                activeOpacity={0.7}
              >
                <Text style={styles.fabIcon}>{entry.icon}</Text>
                <Text style={styles.fabText}>{entry.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { flex: 1, backgroundColor: C.background },
  content: { padding: 20, paddingBottom: 100 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
  babyName: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
  date: { fontSize: 14, color: C.muted, marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: {
    flex: 1, borderRadius: 16, padding: 16, alignItems: 'center',
  },
  cardIcon: { fontSize: 28, marginBottom: 8 },
  cardLabel: { fontSize: 13, fontWeight: '600', color: '#1a1a2e', marginBottom: 4 },
  cardTime: { fontSize: 12, color: '#555' },
  reminderCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: C.border,
  },
  reminderLabel: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  reminderContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reminderIcon: { fontSize: 32 },
  reminderTitle: { fontSize: 18, fontWeight: '600', color: C.text },
  reminderTime: { fontSize: 14, color: C.muted },
  timelineSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 12 },
  timelineScroll: { flexDirection: 'row' },
  timelineItem: { alignItems: 'center', marginRight: 16, width: 64 },
  timelineIconBg: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: C.card,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  timelineIcon: { fontSize: 20 },
  timelineTime: { fontSize: 12, color: C.muted },
  timelineNote: { fontSize: 10, color: C.muted, marginTop: 2, maxWidth: 60, textAlign: 'center' },
  fabArea: { marginTop: 8 },
  fabLabel: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  fabRow: { flexDirection: 'row', gap: 12 },
  fab: {
    flex: 1, borderRadius: 16, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  fabIcon: { fontSize: 24, marginBottom: 6 },
  fabText: { fontSize: 13, fontWeight: '600', color: '#1a1a2e' },
});