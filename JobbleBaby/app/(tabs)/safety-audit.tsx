import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const STORAGE_KEY = STORAGE_KEYS.SAFETY_AUDIT_ENTRIES;

const ZONES = [
  {
    id: 'sleep',
    titleKey: 'safetyAudit.zones.sleep',
    items: [
      { id: 'slat', labelKey: 'safetyAudit.items.cribSlatSpacing' },
      { id: 'noBumper', labelKey: 'safetyAudit.items.noCribBumpers' },
      { id: 'firmMattress', labelKey: 'safetyAudit.items.firmMattress' },
      { id: 'aloneBack', labelKey: 'safetyAudit.items.aloneOnBack' },
    ],
  },
  {
    id: 'carSeat',
    titleKey: 'safetyAudit.zones.carSeat',
    items: [
      { id: 'rearFacing', labelKey: 'safetyAudit.items.rearFacing' },
      { id: 'harnessSlot', labelKey: 'safetyAudit.items.harnessSlot' },
      { id: 'chestClip', labelKey: 'safetyAudit.items.chestClip' },
      { id: 'expiration', labelKey: 'safetyAudit.items.carSeatExpiration' },
    ],
  },
  {
    id: 'babywearing',
    titleKey: 'safetyAudit.zones.babywearing',
    items: [
      { id: 'mPosition', labelKey: 'safetyAudit.items.mPositionHips' },
      { id: 'airway', labelKey: 'safetyAudit.items.airwayVisible' },
      { id: 'noForward', labelKey: 'safetyAudit.items.noForwardFacing' },
      { id: 'supervised', labelKey: 'safetyAudit.items.noUnsupervisedCarrier' },
    ],
  },
  {
    id: 'bath',
    titleKey: 'safetyAudit.zones.bath',
    items: [
      { id: 'waterDepth', labelKey: 'safetyAudit.items.maxWaterDepth' },
      { id: 'elbowTest', labelKey: 'safetyAudit.items.elbowTest' },
      { id: 'noRingToys', labelKey: 'safetyAudit.items.noRingToys' },
      { id: 'neverUnattended', labelKey: 'safetyAudit.items.neverUnattended' },
    ],
  },
  {
    id: 'feeding',
    titleKey: 'safetyAudit.zones.feeding',
    items: [
      { id: 'noHoney', labelKey: 'safetyAudit.items.noHoney' },
      { id: 'uprightFeeds', labelKey: 'safetyAudit.items.uprightFeeds' },
      { id: 'pacedBottle', labelKey: 'safetyAudit.items.pacedBottle' },
      { id: 'headElevation', labelKey: 'safetyAudit.items.headElevation' },
    ],
  },
  {
    id: 'supervision',
    titleKey: 'safetyAudit.zones.supervision',
    items: [
      { id: 'fallPrevention', labelKey: 'safetyAudit.items.fallPrevention' },
      { id: 'stairGates', labelKey: 'safetyAudit.items.stairGates' },
      { id: 'changingTable', labelKey: 'safetyAudit.items.noUnattendedChangingTable' },
      { id: 'hotSurface', labelKey: 'safetyAudit.items.hotSurfaceCheck' },
    ],
  },
];

interface SafetyEntry {
  zone: string;
  items: { label: string; passed: boolean }[];
  date: string;
  notes: string;
}

export default function SafetyAuditScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];
  const [entries, setEntries] = useState<SafetyEntry[]>([]);
  const [currentZone, setCurrentZone] = useState(0);
  const [answers, setAnswers] = useState<{ [zone: string]: { [item: string]: boolean } }>({});

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    try {
      const stored = await safeGetItem(STORAGE_KEY);
      if (stored) setEntries(JSON.parse(stored));
    } catch (e) { /* ignore */ }
  }

  async function saveEntry() {
    const zone = ZONES[currentZone];
    const entry: SafetyEntry = {
      zone: zone.id,
      items: zone.items.map(item => ({ label: item.id, passed: answers[zone.id]?.[item.id] ?? false })),
      date: new Date().toISOString(),
      notes: '',
    };
    const newEntries = [entry, ...entries].slice(0, 50);
    setEntries(newEntries);
    await safeSetItem(STORAGE_KEY, JSON.stringify(newEntries));
    if (currentZone < ZONES.length - 1) {
      setCurrentZone(currentZone + 1);
    } else {
      Alert.alert(
        t('safetyAudit.completeTitle') || 'Audit Complete',
        t('safetyAudit.completeMessage') || 'Safety audit saved.'
      );
      setCurrentZone(0);
      setAnswers({});
    }
  }

  function toggleAnswer(zoneId: string, itemId: string, passed: boolean) {
    setAnswers((prev: { [zone: string]: { [item: string]: boolean } }) => ({
      ...prev,
      [zoneId]: { ...prev[zoneId], [itemId]: passed },
    }));
  }

  const zone = ZONES[currentZone];
  const zoneAnswers = answers[zone.id] || {};

  return (
    <ScrollView style={[styles.container, { backgroundColor: C.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: C.text }]}>{t('safetyAudit.title')}</Text>
        <Text style={[styles.zoneProgress, { color: C.muted }]}>
          {currentZone + 1} / {ZONES.length} — {t(zone.titleKey)}
        </Text>
      </View>

      <View style={[styles.zoneCard, { backgroundColor: C.card, borderColor: C.border }]}>
        {zone.items.map(item => (
          <View key={item.id} style={[styles.itemRow, { borderBottomColor: C.border }]}>
            <Text style={[styles.itemLabel, { color: C.text }]}>{t(item.labelKey)}</Text>
            <View style={styles.toggleGroup}>
              <TouchableOpacity
                accessibilityLabel={t('safetyAudit.passLabel')}
                style={[styles.toggleBtn, zoneAnswers[item.id] === true && { backgroundColor: '#22c55e' }]}
                onPress={() => toggleAnswer(zone.id, item.id, true)}
              >
                <Text style={styles.toggleText}>{t('safetyAudit.passLabel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel={t('safetyAudit.failLabel')}
                style={[styles.toggleBtn, zoneAnswers[item.id] === false && { backgroundColor: '#ef4444' }]}
                onPress={() => toggleAnswer(zone.id, item.id, false)}
              >
                <Text style={styles.toggleText}>{t('safetyAudit.failLabel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        accessibilityLabel={currentZone < ZONES.length - 1 ? t('safetyAudit.nextZone') : t('safetyAudit.finishAudit')}
        style={[styles.nextBtn, { backgroundColor: C.accent }]}
        onPress={saveEntry}
      >
        <Text style={styles.nextBtnText}>
          {currentZone < ZONES.length - 1 ? (t('safetyAudit.nextZone') || 'Next') : (t('safetyAudit.finishAudit') || 'Finish')}
        </Text>
      </TouchableOpacity>

      {entries.length > 0 && (
        <View style={styles.historySection}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('safetyAudit.history')}</Text>
          {entries.slice(0, 5).map((e, i) => (
            <View key={i} style={[styles.historyCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[styles.historyZone, { color: C.accent }]}>{t(`safetyAudit.zones.${e.zone}`)}</Text>
              <Text style={[styles.historyDate, { color: C.muted }]}>{new Date(e.date).toLocaleDateString()}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold' },
  zoneProgress: { fontSize: 14, marginTop: 4 },
  zoneCard: { margin: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  itemLabel: { fontSize: 15, flex: 1, marginRight: 8 },
  toggleGroup: { flexDirection: 'row', gap: 8 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#555' },
  toggleText: { color: '#fff', fontSize: 13 },
  nextBtn: { margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  historySection: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  historyCard: { padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1 },
  historyZone: { fontSize: 15, fontWeight: '500' },
  historyDate: { fontSize: 12, marginTop: 2 },
});
