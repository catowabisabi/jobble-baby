import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { BADGES, Badge } from '../data/badges';
import { getEarnedBadges, BadgeState } from '../utils/badgeService';
import { useLanguage } from '../context/LanguageContext';

interface BadgeGalleryProps {
  compact?: boolean;
}

export default function BadgeGallery({ compact = false }: BadgeGalleryProps) {
  const { t } = useLanguage();
  const [badgeState, setBadgeState] = useState<BadgeState>({});
  const [recentAward, setRecentAward] = useState<Badge | null>(null);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    const state: BadgeState = {};
    for (const badge of BADGES) {
      state[badge.id] = { earned: false };
    }
    // Load from storage via getEarnedBadges
    const earned = await getEarnedBadges();
    for (const b of earned) {
      state[b.id] = { earned: true, earnedAt: (b as any).earnedAt };
    }
    setBadgeState(state);
  };

  const earnedCount = BADGES.filter((b) => badgeState[b.id]?.earned).length;
  const totalCount = BADGES.length;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <Text style={styles.compactTitle}>{t('badgeGallery.badges')}</Text>
          <Text style={styles.compactCount}>{t('badgeGallery.earnedOf', { earned: earnedCount, total: totalCount })}</Text>
        </View>
        <View style={styles.compactBadges}>
          {BADGES.slice(0, 5).map((badge) => {
            const earned = badgeState[badge.id]?.earned;
            return (
              <View key={badge.id} style={[styles.compactBadge, !earned && styles.badgeLocked]}>
                <Text style={[styles.compactBadgeIcon, !earned && styles.badgeLockedIcon]}>
                  {earned ? badge.icon : '🔒'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('badgeGallery.title')}</Text>
        <Text style={styles.subtitle}>{t('badgeGallery.earnedOf', { earned: earnedCount, total: totalCount })}</Text>
      </View>

      {/* Category sections */}
      {['streak', 'first', 'milestone', 'engagement'].map((cat) => {
        const catBadges = BADGES.filter((b) => b.category === cat);
        const catEarned = catBadges.filter((b) => badgeState[b.id]?.earned).length;
        return (
          <View key={cat} style={styles.categorySection}>
            <Text style={styles.categoryLabel}>
              {cat === 'streak' ? t('badgeGallery.streak') : cat === 'first' ? t('badgeGallery.firsts') : cat === 'milestone' ? t('badgeGallery.milestones') : t('badgeGallery.engagement')}
              {' '}<Text style={styles.categoryCount}>{catEarned}/{catBadges.length}</Text>
            </Text>
            <View style={styles.badgeGrid}>
              {catBadges.map((badge) => {
                const earned = badgeState[badge.id]?.earned;
                const earnedAt = badgeState[badge.id]?.earnedAt;
                return (
                  <View key={badge.id} style={[styles.badgeCard, !earned && styles.badgeLockedCard]}>
                    <Text style={[styles.badgeIcon, !earned && styles.badgeLockedIcon]}>
                      {earned ? badge.icon : '🔒'}
                    </Text>
                    <Text style={[styles.badgeName, !earned && styles.badgeLockedText]}>
                      {badge.name}
                    </Text>
                    <Text style={[styles.badgeDesc, !earned && styles.badgeLockedText]}>
                      {earned ? badge.description : t('badgeGallery.keepLogging')}
                    </Text>
                    {earned && earnedAt && (
                      <Text style={styles.earnedDate}>
                        {t('badgeGallery.earnedOn', { date: new Date(earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}

      {/* Recent award notification */}
      {recentAward && (
        <View style={styles.awardBanner}>
          <Text style={styles.awardIcon}>{recentAward.icon}</Text>
          <Text style={styles.awardText}>{t('badgeGallery.newBadge', { name: recentAward.name })}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#F8FAFC', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748B' },
  categorySection: { marginBottom: 20 },
  categoryLabel: { fontSize: 14, fontWeight: '600', color: '#94A3B8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  categoryCount: { color: '#3B82F6' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: {
    backgroundColor: '#1A1A1E',
    borderRadius: 12,
    padding: 14,
    width: '47%',
    borderWidth: 1,
    borderColor: '#2a3a4a',
  },
  badgeLockedCard: {
    borderColor: '#1e1e1e',
    opacity: 0.6,
  },
  badgeIcon: { fontSize: 32, marginBottom: 8 },
  badgeLockedIcon: { opacity: 0.5 },
  badgeName: { fontSize: 14, fontWeight: '700', color: '#F8FAFC', marginBottom: 4 },
  badgeLockedText: { color: '#475569' },
  badgeDesc: { fontSize: 11, color: '#64748B', lineHeight: 16 },
  earnedDate: { fontSize: 10, color: '#3B82F6', marginTop: 6 },
  awardBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a2a3a', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#3B82F6', marginTop: 12,
  },
  awardIcon: { fontSize: 24, marginRight: 10 },
  awardText: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },
  // Compact styles
  compactContainer: { marginBottom: 16 },
  compactHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  compactTitle: { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  compactCount: { fontSize: 14, color: '#3B82F6', fontWeight: '600' },
  compactBadges: { flexDirection: 'row', gap: 8 },
  compactBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1A1A1E', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#2a3a4a',
  },
  badgeLocked: { backgroundColor: '#0d0d0f', borderColor: '#1a1a1a' },
  compactBadgeIcon: { fontSize: 22 },
});
