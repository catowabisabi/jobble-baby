import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useGlobalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { decodeDaycareToken, isTokenExpiredPayload, DaycareTokenPayload } from '../utils/daycareToken';
import { COLORS } from '../theme';

const TRACKING_KEY = '@jobble/tracking_entries';

type TrackingEntry = {
  type: 'feed' | 'diaper' | 'sleep';
  timestamp: string;
  amount?: string;
  diaperType?: string;
  duration?: string;
  note?: string;
};

type LinkState =
  | { status: 'loading' }
  | { status: 'invalid' }
  | { status: 'expired' }
  | { status: 'valid'; payload: DaycareTokenPayload; entries: TrackingEntry[] };

function calculateAge(birthDateStr: string): string {
  const birth = new Date(birthDateStr);
  const now = new Date();
  const diffMs = now.getTime() - birth.getTime();
  const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (totalMonths < 24) {
    return `${totalMonths} months`;
  }
  if (years > 0 && months > 0) {
    return `${years} years ${months} months`;
  }
  if (years > 0) {
    return `${years} years`;
  }
  return `${totalMonths} months`;
}

function getTodayEntries(entries: TrackingEntry[]): TrackingEntry[] {
  const today = new Date().toISOString().split('T')[0];
  return entries.filter((e) => e.timestamp.startsWith(today));
}

function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function DaycareViewScreen() {
  const { token } = useGlobalSearchParams<{ token?: string }>();
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [linkState, setLinkState] = useState<LinkState>({ status: 'loading' });

  useEffect(() => {
    const validateAndLoad = async () => {
      if (!token || token.trim() === '') {
        setLinkState({ status: 'invalid' });
        return;
      }

      const decoded = decodeDaycareToken(token);
      if (!decoded) {
        setLinkState({ status: 'invalid' });
        return;
      }

      if (isTokenExpiredPayload(decoded)) {
        setLinkState({ status: 'expired' });
        return;
      }

      try {
        const raw = await safeGetItem(TRACKING_KEY);
        const allEntries: TrackingEntry[] = raw ? JSON.parse(raw) : [];
        const todayEntries = getTodayEntries(allEntries);
        setLinkState({ status: 'valid', payload: decoded, entries: todayEntries });
      } catch {
        setLinkState({ status: 'valid', payload: decoded, entries: [] });
      }
    };

    validateAndLoad();
  }, [token]);

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, padding: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontSize: 16, color: C.muted },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
    errorIcon: { marginBottom: 16 },
    errorTitle: { fontSize: 20, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 8 },
    errorMessage: { fontSize: 15, color: C.muted, textAlign: 'center', marginBottom: 32 },
    goBackBtn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center' },
    goBackBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    header: { marginBottom: 24 },
    babyName: { fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 4 },
    babyAge: { fontSize: 16, color: C.muted },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 12, marginTop: 20 },
    card: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
    entryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    entryTime: { fontSize: 14, fontWeight: '600', color: C.text },
    entryDetail: { fontSize: 14, color: C.muted },
    emptyText: { fontSize: 14, color: C.muted, fontStyle: 'italic' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionIcon: { fontSize: 18 },
    sectionLabel: { fontSize: 15, fontWeight: '600', color: C.text },
  });

  if (linkState.status === 'loading') {
    return (
      <View style={[styles.safe, styles.loadingContainer]}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (linkState.status === 'invalid') {
    return (
      <View style={[styles.safe, styles.container, styles.errorContainer]}>
        <MaterialCommunityIcons name="link-variant-off" size={56} color={C.muted} style={styles.errorIcon} />
        <Text style={styles.errorTitle}>{t('daycare.invalidLink')}</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={() => router.back()}>
          <Text style={styles.goBackBtnText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (linkState.status === 'expired') {
    return (
      <View style={[styles.safe, styles.container, styles.errorContainer]}>
        <MaterialCommunityIcons name="clock-alert-outline" size={56} color={C.muted} style={styles.errorIcon} />
        <Text style={styles.errorTitle}>{t('daycare.linkExpired')}</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={() => router.back()}>
          <Text style={styles.goBackBtnText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { payload, entries } = linkState;
  const age = calculateAge(payload.birthDate);

  const feeds = entries.filter((e) => e.type === 'feed');
  const diapers = entries.filter((e) => e.type === 'diaper');
  const sleeps = entries.filter((e) => e.type === 'sleep');

  const renderEntry = (entry: TrackingEntry) => {
    let detail = '';
    if (entry.type === 'feed' && entry.amount) {
      detail = entry.amount;
    } else if (entry.type === 'diaper' && entry.diaperType) {
      detail = entry.diaperType;
    } else if (entry.type === 'sleep' && entry.duration) {
      detail = entry.duration;
    }
    return (
      <View key={entry.timestamp} style={styles.entryRow}>
        <Text style={styles.entryTime}>{formatTime(entry.timestamp)}</Text>
        <Text style={styles.entryDetail}>{detail || '-'}</Text>
      </View>
    );
  };

  const renderSection = (
    icon: string,
    labelKey: string,
    sectionEntries: TrackingEntry[]
  ) => (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <Text style={styles.sectionLabel}>{t(labelKey)}</Text>
      </View>
      {sectionEntries.length === 0 ? (
        <Text style={styles.emptyText}>{t('daycare.noEntries')}</Text>
      ) : (
        sectionEntries.map(renderEntry)
      )}
    </View>
  );

  return (
    <View style={styles.safe}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.babyName}>{payload.babyName}</Text>
          <Text style={styles.babyAge}>{age}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('daycare.scheduleTitle').toUpperCase()}</Text>

        {renderSection('🍽️', 'daycare.feeds', feeds)}
        {renderSection('🧷', 'daycare.diapers', diapers)}
        {renderSection('😴', 'daycare.sleep', sleeps)}
      </ScrollView>
    </View>
  );
}
