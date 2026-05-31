import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Share, Clipboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { awardBadge } from '../utils/badgeService';

const TRACKING_KEY = '@jobble/tracking_entries';
const GROWTH_KEY = '@jobble/growth_entries';
const SCHEDULE_KEY = '@jobble/schedule_entries';
const MILESTONE_KEY = '@jobble/milestone_photos';
const PROFILE_KEY = '@jobble_baby_profile';

interface TrackingEntry {
  id: string;
  type: 'diaper' | 'feed' | 'sleep';
  subtype: string;
  icon: string;
  time: string;
  date: string;
  note?: string;
}

interface GrowthEntry {
  id: string;
  date: string;
  height?: number;
  weight?: number;
  percentileHeight?: number;
  percentileWeight?: number;
}

interface ScheduleEntry {
  id: string;
  date: string;
  type: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

interface MilestonePhoto {
  id: string;
  type: string;
  photo_uri: string;
  date: string;
}

interface BabyProfile {
  name: string;
  birthDate: string;
  gender?: string;
}

const MILESTONE_LABELS: Record<string, string> = {
  first_smile: 'First Smile',
  first_steps: 'First Steps',
  first_word: 'First Word',
  first_food: 'First Food',
};

export default function DoctorVisitScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [trackingEntries, setTrackingEntries] = useState<TrackingEntry[]>([]);
  const [growthEntries, setGrowthEntries] = useState<GrowthEntry[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [milestones, setMilestones] = useState<MilestonePhoto[]>([]);
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [trackingRaw, growthRaw, scheduleRaw, milestoneRaw, profileRaw] = await Promise.all([
          AsyncStorage.getItem(TRACKING_KEY),
          AsyncStorage.getItem(GROWTH_KEY),
          AsyncStorage.getItem(SCHEDULE_KEY),
          AsyncStorage.getItem(MILESTONE_KEY),
          AsyncStorage.getItem(PROFILE_KEY),
        ]);

        if (trackingRaw) setTrackingEntries(JSON.parse(trackingRaw));
        if (growthRaw) setGrowthEntries(JSON.parse(growthRaw));
        if (scheduleRaw) setScheduleEntries(JSON.parse(scheduleRaw));
        if (milestoneRaw) setMilestones(JSON.parse(milestoneRaw));
        if (profileRaw) setBabyProfile(JSON.parse(profileRaw));
      } catch {
      }
    };
    loadData();
  }, []);

  const calculateSleepAverage = (): number => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const scheduleSleepEntries = scheduleEntries.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= thirtyDaysAgo && entry.duration;
    });

    if (scheduleSleepEntries.length === 0) {
      const trackingSleepEntries = trackingEntries.filter(
        (entry) => entry.type === 'sleep' && new Date(entry.date) >= thirtyDaysAgo
      );
      if (trackingSleepEntries.length === 0) return 0;
      const totalMinutes = trackingSleepEntries.reduce((acc, entry) => {
        const durationMatch = entry.note?.match(/(\d+)\s*h/i);
        if (durationMatch) {
          return acc + parseInt(durationMatch[1], 10) * 60;
        }
        return acc + 90;
      }, 0);
      return Math.round((totalMinutes / trackingSleepEntries.length) * 10) / 10 / 60;
    }

    const totalMinutes = scheduleSleepEntries.reduce((acc, entry) => acc + (entry.duration || 0), 0);
    return Math.round((totalMinutes / scheduleSleepEntries.length / 60) * 10) / 10;
  };

  const calculateFeedingAverage = (): number => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const feedEntries = trackingEntries.filter(
      (entry) => entry.type === 'feed' && new Date(entry.date) >= thirtyDaysAgo
    );
    if (feedEntries.length === 0) return 0;
    const uniqueDays = new Set(feedEntries.map((e) => e.date)).size;
    return Math.round((feedEntries.length / Math.max(uniqueDays, 1)) * 10) / 10;
  };

  const getRecentFeedEntries = (): TrackingEntry[] => {
    return trackingEntries
      .filter((entry) => entry.type === 'feed')
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
      .slice(0, 3);
  };

  const getRecentSleepEntries = (): TrackingEntry[] => {
    return trackingEntries
      .filter((entry) => entry.type === 'sleep')
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
      .slice(0, 3);
  };

  const getLatestGrowth = (): { height?: number; weight?: number; percentileHeight?: number; percentileWeight?: number } | null => {
    if (growthEntries.length === 0) return null;
    const latest = growthEntries[0];
    return {
      height: latest.height,
      weight: latest.weight,
      percentileHeight: latest.percentileHeight,
      percentileWeight: latest.percentileWeight,
    };
  };

  const getMilestoneTypes = (): string[] => {
    const types = new Set(milestones.map((m) => m.type));
    return Array.from(types);
  };

  const generateSummaryText = (): string => {
    const babyName = babyProfile?.name || 'Baby';
    const sleepAvg = calculateSleepAverage();
    const feedingAvg = calculateFeedingAverage();
    const recentFeeds = getRecentFeedEntries();
    const recentSleep = getRecentSleepEntries();
    const latestGrowth = getLatestGrowth();
    const milestoneTypes = getMilestoneTypes();

    const lines: string[] = [
      '=== Doctor Visit Summary ===',
      `Baby Name: ${babyName}`,
      '',
      'SLEEP',
      `- Average: ${sleepAvg > 0 ? sleepAvg.toFixed(1) : '0'} hours/day (last 30 days)`,
      `- Recent: ${recentSleep.length > 0 ? recentSleep.map(e => `${e.subtype} (${e.date})`).join(', ') : 'No recent entries'}`,
      '',
      'FEEDING',
      `- Average: ${feedingAvg > 0 ? feedingAvg.toFixed(1) : '0'} feeds/day (last 30 days)`,
      `- Recent: ${recentFeeds.length > 0 ? recentFeeds.map(e => `${e.subtype} (${e.date})`).join(', ') : 'No recent entries'}`,
      '',
      'GROWTH (Latest)',
    ];

    if (latestGrowth?.height) {
      lines.push(`- Height: ${latestGrowth.height} cm${latestGrowth.percentileHeight ? ` (${latestGrowth.percentileHeight}th percentile)` : ''}`);
    } else {
      lines.push('- Height: No data');
    }

    if (latestGrowth?.weight) {
      lines.push(`- Weight: ${latestGrowth.weight} kg${latestGrowth.percentileWeight ? ` (${latestGrowth.percentileWeight}th percentile)` : ''}`);
    } else {
      lines.push('- Weight: No data');
    }

    lines.push('');
    lines.push('MILESTONES');
    if (milestoneTypes.length > 0) {
      milestoneTypes.forEach((type) => {
        lines.push(`- ${MILESTONE_LABELS[type] || type}`);
      });
    } else {
      lines.push('- No milestones recorded');
    }

    lines.push('');
    lines.push('Generated by Jobble Baby');

    return lines.join('\n');
  };

  const handleShare = async () => {
    const summary = generateSummaryText();
    try {
      await Share.share({
        message: summary,
        title: t('doctorVisit.title') || 'Doctor Visit Summary',
      });
      await awardBadge('medical_prep');
    } catch {
    }
  };

  const handleCopyToClipboard = async () => {
    const summary = generateSummaryText();
    try {
      Clipboard.setString(summary);
      await awardBadge('medical_prep');
    } catch {
    }
  };

  const sleepAvg = calculateSleepAverage();
  const feedingAvg = calculateFeedingAverage();
  const latestGrowth = getLatestGrowth();
  const milestoneTypes = getMilestoneTypes();
  const recentFeeds = getRecentFeedEntries();
  const recentSleep = getRecentSleepEntries();

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 28, fontWeight: 'bold', color: C.text, marginTop: 4 },
    sectionTitle: { fontSize: 12, fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    card: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    cardLabel: { fontSize: 14, color: C.text, fontWeight: '500' },
    cardValue: { fontSize: 20, fontWeight: 'bold', color: C.accent },
    cardSubtitle: { fontSize: 12, color: C.muted, marginTop: 4 },
    cardSection: { marginTop: 12 },
    cardSectionLabel: { fontSize: 12, color: C.muted, marginBottom: 8 },
    cardSectionContent: { fontSize: 13, color: C.text, lineHeight: 20 },
    statCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
      flex: 1,
    },
    statIcon: { fontSize: 24, marginBottom: 8 },
    statValue: { fontSize: 24, fontWeight: 'bold', color: C.text },
    statLabel: { fontSize: 11, color: C.muted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
    statRow: { flexDirection: 'row', gap: 12 },
    milestoneChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.background,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: C.border,
    },
    milestoneChipText: { fontSize: 12, color: C.text },
    noDataChip: {
      backgroundColor: C.background,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: C.border,
    },
    noDataChipText: { fontSize: 12, color: C.muted },
    button: {
      backgroundColor: C.accent,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginTop: 8,
    },
    buttonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
    buttonSecondary: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginTop: 12,
      borderWidth: 1,
      borderColor: C.border,
    },
    buttonSecondaryText: { fontSize: 16, fontWeight: '600', color: C.text },
    recentSection: { marginTop: 12 },
    recentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
    recentIcon: { fontSize: 16, marginRight: 10 },
    recentText: { fontSize: 13, color: C.text, flex: 1 },
    recentDate: { fontSize: 11, color: C.muted },
    emptyText: { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 16 },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('doctorVisit.greeting') || 'Export'}</Text>
          <Text style={styles.title}>📋 {t('doctorVisit.title')}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('doctorVisit.sleepHours')}</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View>
              <Text style={styles.cardLabel}>{t('doctorVisit.sleepAvg')}</Text>
              <Text style={styles.cardSubtitle}>{t('doctorVisit.last30Days')}</Text>
            </View>
            <Text style={styles.cardValue}>{sleepAvg > 0 ? sleepAvg.toFixed(1) : '—'}h</Text>
          </View>
          {recentSleep.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.cardSectionLabel}>{t('doctorVisit.recentEntries')}</Text>
              {recentSleep.map((entry) => (
                <View key={entry.id} style={styles.recentItem}>
                  <Text style={styles.recentIcon}>🌙</Text>
                  <Text style={styles.recentText}>{entry.subtype}</Text>
                  <Text style={styles.recentDate}>{entry.date}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t('doctorVisit.feedingFreq')}</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View>
              <Text style={styles.cardLabel}>{t('doctorVisit.feedsPerDay')}</Text>
              <Text style={styles.cardSubtitle}>{t('doctorVisit.last30Days')}</Text>
            </View>
            <Text style={styles.cardValue}>{feedingAvg > 0 ? feedingAvg.toFixed(1) : '—'}</Text>
          </View>
          {recentFeeds.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.cardSectionLabel}>{t('doctorVisit.recentEntries')}</Text>
              {recentFeeds.map((entry) => (
                <View key={entry.id} style={styles.recentItem}>
                  <Text style={styles.recentIcon}>🍼</Text>
                  <Text style={styles.recentText}>{entry.subtype}</Text>
                  <Text style={styles.recentDate}>{entry.date}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t('doctorVisit.growthStats')}</Text>
        <View style={styles.card}>
          {latestGrowth ? (
            <>
              <View style={styles.statRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}>📏</Text>
                  <Text style={styles.statValue}>{latestGrowth.height ? `${latestGrowth.height}` : '—'}</Text>
                  <Text style={styles.statLabel}>{t('doctorVisit.height')}</Text>
                  {latestGrowth.percentileHeight && (
                    <Text style={styles.cardSubtitle}>{latestGrowth.percentileHeight}th percentile</Text>
                  )}
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}>⚖️</Text>
                  <Text style={styles.statValue}>{latestGrowth.weight ? `${latestGrowth.weight}` : '—'}</Text>
                  <Text style={styles.statLabel}>{t('doctorVisit.weight')}</Text>
                  {latestGrowth.percentileWeight && (
                    <Text style={styles.cardSubtitle}>{latestGrowth.percentileWeight}th percentile</Text>
                  )}
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>{t('doctorVisit.noData')}</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t('doctorVisit.milestones')}</Text>
        <View style={styles.card}>
          {milestoneTypes.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {milestoneTypes.map((type) => (
                <View key={type} style={styles.milestoneChip}>
                  <Text style={styles.milestoneChipText}>🏆 {MILESTONE_LABELS[type] || type}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>{t('doctorVisit.noData')}</Text>
          )}
        </View>

        <TouchableOpacity style={styles.button} activeOpacity={0.7} onPress={handleShare}>
          <Text style={styles.buttonText}>📤 {t('doctorVisit.exportBtn')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonSecondary} activeOpacity={0.7} onPress={handleCopyToClipboard}>
          <Text style={styles.buttonSecondaryText}>📋 {t('doctorVisit.copyToClipboard')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}