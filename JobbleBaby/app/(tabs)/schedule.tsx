import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function ScheduleScreen() {
  const handleAddEntry = () => {
    console.log('Add sleep entry pressed');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Sleep Schedule</Text>
          <Text style={styles.title}>Rest & Naps</Text>
        </View>

        {/* Next Nap Reminder Card */}
        <View style={styles.nextNapCard}>
          <View style={styles.nextNapHeader}>
            <Text style={styles.nextNapLabel}>Next Nap</Text>
            <Text style={styles.moonIcon}>🌙</Text>
          </View>
          <Text style={styles.nextNapTime}>
            {NEXT_NAP.start} - {NEXT_NAP.end}
          </Text>
          <View style={styles.nextNapFooter}>
            <Text style={styles.nextNapDuration}>{NEXT_NAP.duration}</Text>
            <View style={[styles.qualityDot, { backgroundColor: QUALITY_COLORS.good }]} />
            <Text style={styles.qualityLabel}>Expected</Text>
          </View>
        </View>

        {/* Weekly Sleep Schedule */}
        <View style={styles.weeklySection}>
          <Text style={styles.sectionTitle}>Weekly Sleep Schedule</Text>
          {SCHEDULE_DATA.map((item) => (
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
                  <Text style={styles.noData}>No sleep recorded</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={handleAddEntry}>
        <Text style={styles.fabIcon}>🌙</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a1628' },
  container: { flex: 1, backgroundColor: '#0a1628' },
  content: { padding: 20, paddingBottom: 100 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 14, color: '#8b9bb4', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 4 },
  nextNapCard: {
    backgroundColor: '#1a2a3a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2a3a4a',
  },
  nextNapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextNapLabel: { fontSize: 12, color: '#8b9bb4', textTransform: 'uppercase', letterSpacing: 1 },
  moonIcon: { fontSize: 24 },
  nextNapTime: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  nextNapFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextNapDuration: { fontSize: 14, color: '#8b9bb4' },
  qualityDot: { width: 8, height: 8, borderRadius: 4 },
  qualityLabel: { fontSize: 12, color: '#8b9bb4' },
  weeklySection: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 16 },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a2a3a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a3a4a',
  },
  dayName: { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1 },
  dayData: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sleepTime: { fontSize: 14, color: '#fff' },
  sleepDuration: { fontSize: 12, color: '#8b9bb4' },
  noData: { fontSize: 14, color: '#8b9bb4', fontStyle: 'italic' },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#3B82F6',
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
});
