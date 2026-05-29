import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onNewGrowthEntry } from '../utils/badgeService';
import { Badge } from '../data/badges';

const STORAGE_KEY = '@jobble/growth_entries';

interface GrowthEntry {
  id: string;
  date: string;
  height: number;
  weight: number;
}

const getDateStr = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const getTrendArrow = (current: number, previous: number): string => {
  const diff = current - previous;
  if (diff > 0.1) return '↑';
  if (diff < -0.1) return '↓';
  return '→';
};

const MOCK_ENTRIES: GrowthEntry[] = [
  { id: '1', date: 'May 20, 2026', height: 62, weight: 5.2 },
  { id: '2', date: 'May 15, 2026', height: 61, weight: 5.0 },
  { id: '3', date: 'May 10, 2026', height: 60, weight: 4.8 },
];

export default function GrowthScreen() {
  const [entries, setEntries] = useState<GrowthEntry[]>([]);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [newBadges, setNewBadges] = useState<Badge[]>([]);

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setEntries(JSON.parse(stored));
        } else {
          setEntries(MOCK_ENTRIES);
        }
      } catch (e) {
        setEntries(MOCK_ENTRIES);
      }
    };
    loadEntries();
  }, []);

  const saveEntry = async () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0) return;
    const newEntry: GrowthEntry = { id: Date.now().toString(), date: getDateStr(), height: h, weight: w };
    const updated = [newEntry, ...entries].slice(0, 10);
    setEntries(updated);
    setHeight('');
    setWeight('');
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      const awarded = await onNewGrowthEntry();
      if (awarded.length > 0) {
        setNewBadges(awarded);
        setTimeout(() => setNewBadges([]), 4000);
      }
    } catch (e) {
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Track</Text>
          <Text style={styles.title}>📈 Growth</Text>
        </View>

        {newBadges.length > 0 && (
          <View style={styles.badgeBanner}>
            <Text style={styles.badgeBannerIcon}>
              {newBadges.map((b) => b.icon).join(' ')}
            </Text>
            <Text style={styles.badgeBannerText}>
              Badge earned: {newBadges.map((b) => b.name).join(', ')}!
            </Text>
          </View>
        )}

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>HEIGHT (cm)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.0"
            placeholderTextColor="#8b9bb4"
            keyboardType="decimal-pad"
            value={height}
            onChangeText={setHeight}
          />
          <Text style={styles.inputLabel}>WEIGHT (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.0"
            placeholderTextColor="#8b9bb4"
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />
          <TouchableOpacity style={styles.saveButton} activeOpacity={0.7} onPress={saveEntry}>
            <Text style={styles.saveButtonText}>Save Measurement</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>HISTORY</Text>
        <View style={styles.historyCard}>
          {entries.length === 0 ? (
            <Text style={styles.emptyText}>No entries yet. Add height and weight above.</Text>
          ) : (
            entries.map((entry, idx) => {
              const prev = entries[idx + 1];
              const weightTrend = prev ? getTrendArrow(entry.weight, prev.weight) : '';
              const heightTrend = prev ? getTrendArrow(entry.height, prev.height) : '';
              return (
                <View key={entry.id} style={styles.entryRow}>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryDate}>{entry.date}</Text>
                    <Text style={styles.entryMeasurements}>
                      H: {entry.height} cm {heightTrend} | W: {entry.weight} kg {weightTrend}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
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
  badgeBanner: {
    backgroundColor: '#1a2a3a',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  badgeBannerIcon: { fontSize: 20, marginRight: 10 },
  badgeBannerText: { fontSize: 13, fontWeight: '600', color: '#3B82F6', flex: 1 },
  inputCard: {
    backgroundColor: '#1a2a3a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a3a4a',
  },
  inputLabel: { fontSize: 12, color: '#8b9bb4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: '#0a1628',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a3a4a',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  sectionTitle: {
    fontSize: 12, color: '#8b9bb4', textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 12, marginTop: 8,
  },
  historyCard: {
    backgroundColor: '#1a2a3a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a3a4a',
  },
  entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2a3a4a' },
  entryInfo: { flex: 1 },
  entryDate: { fontSize: 14, fontWeight: '600', color: '#fff' },
  entryMeasurements: { fontSize: 12, color: '#8b9bb4', marginTop: 4 },
  emptyText: { fontSize: 14, color: '#8b9bb4', textAlign: 'center', paddingVertical: 20 },
});