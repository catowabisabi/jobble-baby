import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onNewLogEntry } from '../utils/badgeService';
import { Badge } from '../data/badges';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme';

const STORAGE_KEY = '@jobble/tracking_entries';

interface Entry {
  id: string;
  type: 'diaper' | 'feed' | 'sleep';
  subtype: string;
  icon: string;
  time: string;
  date: string;
  note?: string;
}

const DIAPER_TYPES = [
  { label: 'Wet', color: '#3498db' },
  { label: 'Both', color: '#9b59b6' },
  { label: 'Dry', color: '#2ecc71' },
];

const FEED_TYPES = [
  { label: 'Breast', color: '#e74c3c' },
  { label: 'Bottle', color: '#f39c12' },
  { label: 'Solid', color: '#1abc9c' },
];

const SLEEP_TYPES = [
  { label: 'Nap', color: '#AED6F1' },
  { label: 'Night', color: '#5DADE2' },
];

const getTimestamp = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const getDateStr = () => {
  return new Date().toISOString().split('T')[0];
};

const EMOJI_MAP = { diaper: '🧷', feed: '🍼', sleep: '🌙', growth: '📈' };

export default function TrackingScreen() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setEntries(JSON.parse(stored));
        }
      } catch (e) {
        // Fall back to empty array on error
      }
    };
    loadEntries();
  }, []);

  const addEntry = async (type: 'diaper' | 'feed' | 'sleep', subtype: string) => {
    const icon = EMOJI_MAP[type];
    const newEntry: Entry = {
      id: Date.now().toString(),
      type,
      subtype,
      icon,
      time: getTimestamp(),
      date: getDateStr(),
    };
    const updated = [newEntry, ...entries].slice(0, 10);
    setEntries(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      // Check for badge awards
      const awarded = await onNewLogEntry(type);
      if (awarded.length > 0) {
        setNewBadges(awarded);
        setTimeout(() => setNewBadges([]), 4000);
      }
    } catch (e) {
      // Silent fail, UI already updated
    }
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    babyName: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    sectionTitle: {
      fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1,
      marginBottom: 12, marginTop: 8,
    },
    buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    button: {
      flex: 1, borderRadius: 16, padding: 16, alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
    },
    buttonIcon: { fontSize: 24, marginBottom: 6 },
    buttonText: { fontSize: 13, fontWeight: '600', color: C.text },
    historyCard: {
      backgroundColor: C.card, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: C.border,
    },
    entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    entryIcon: { fontSize: 24, marginRight: 12 },
    entryInfo: { flex: 1 },
    entryType: { fontSize: 16, fontWeight: '600', color: C.text },
    entryNote: { fontSize: 12, color: C.muted, marginTop: 2 },
    entryTime: { fontSize: 14, color: C.muted },
    emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 20 },
    badgeBanner: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.accent,
    },
    badgeBannerIcon: { fontSize: 20, marginRight: 10 },
    badgeBannerText: { fontSize: 13, fontWeight: '600', color: C.accent, flex: 1 },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Track</Text>
          <Text style={styles.babyName}>Baby Activity</Text>
        </View>

        {/* Badge notification banner */}
        {newBadges.length > 0 && (
          <View style={styles.badgeBanner}>
            <Text style={styles.badgeBannerIcon}>
              {newBadges.map((b) => b.icon).join(' ')}
            </Text>
            <Text style={styles.badgeBannerText}>
              Badge{newBadges.length > 1 ? 's' : ''} earned: {newBadges.map((b) => b.name).join(', ')}!
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>DIAPER</Text>
        <View style={styles.buttonRow}>
          {DIAPER_TYPES.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.button, { backgroundColor: item.color }]}
              activeOpacity={0.7}
              onPress={() => addEntry('diaper', item.label)}
            >
              <Text style={styles.buttonIcon}>🧷</Text>
              <Text style={styles.buttonText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>FEEDING</Text>
        <View style={styles.buttonRow}>
          {FEED_TYPES.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.button, { backgroundColor: item.color }]}
              activeOpacity={0.7}
              onPress={() => addEntry('feed', item.label)}
            >
              <Text style={styles.buttonIcon}>🍼</Text>
              <Text style={styles.buttonText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>SLEEP</Text>
        <View style={styles.buttonRow}>
          {SLEEP_TYPES.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.button, { backgroundColor: item.color }]}
              activeOpacity={0.7}
              onPress={() => addEntry('sleep', item.label)}
            >
              <Text style={styles.buttonIcon}>🌙</Text>
              <Text style={styles.buttonText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>HISTORY</Text>
        <View style={styles.historyCard}>
          {entries.length === 0 ? (
            <Text style={styles.emptyText}>No entries yet. Tap a button above to log.</Text>
          ) : (
            entries.map((entry) => (
              <View key={entry.id} style={styles.entryRow}>
                <Text style={styles.entryIcon}>{entry.icon}</Text>
                <View style={styles.entryInfo}>
                  <Text style={styles.entryType}>{entry.subtype}</Text>
                  <Text style={styles.entryNote}>{entry.note || ''}</Text>
                </View>
                <Text style={styles.entryTime}>{entry.time}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


