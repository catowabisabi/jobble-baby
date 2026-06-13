import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALLERGENS, AllergenEntry, Allergen } from '../data/allergens';
import AllergenCard from '../components/AllergenCard';
import { AllergenDetailModal } from '../components/AllergenDetailModal';
import { ReactionLogModal } from '../components/ReactionLogModal';
import { Badge } from '../data/badges';
import { checkFirstAllergenBadge } from '../utils/badgeService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const STORAGE_KEY = STORAGE_KEYS.ALLERGEN_ENTRIES;

export default function AllergensScreen() {
  const [entries, setEntries] = useState<Record<string, AllergenEntry>>({});
  const [showDetail, setShowDetail] = useState(false);
  const [selectedAllergen, setSelectedAllergen] = useState<Allergen | null>(null);
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setEntries(JSON.parse(stored));
        }
      } catch (e) {}
    };
    loadEntries();
  }, []);

  const handleAllergenPress = (allergen: Allergen) => {
    setSelectedAllergen(allergen);
    setShowDetail(true);
  };

  const handleSave = async (entry: AllergenEntry) => {
    if (!selectedAllergen) return;

    const prevEntry = entries[selectedAllergen.id];
    const updated = { ...entries, [selectedAllergen.id]: entry };
    setEntries(updated);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      if (prevEntry?.status === 'not_introduced' && entry.status !== 'not_introduced') {
        const awarded = await checkFirstAllergenBadge();
        if (awarded.length > 0) {
          const awardedBadges = awarded.map((id) => ({ id } as Badge));
          setNewBadges(awardedBadges);
          setTimeout(() => setNewBadges([]), 4000);
        }
      }
    } catch (e) {}
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedAllergen(null);
  };

  const handleLogReaction = () => {
    setShowDetail(false);
    setShowReactionModal(true);
  };

  const handleReactionSave = async (reactions: React.ComponentProps<typeof ReactionLogModal>['existingReactions']) => {
    if (!selectedAllergen) return;

    const existingEntry = entries[selectedAllergen.id] || {
      id: selectedAllergen.id,
      status: 'reaction_observed' as const,
      reactions: [],
    };

    const updatedEntry: AllergenEntry = {
      ...existingEntry,
      status: 'reaction_observed',
      reactions,
    };

    await handleSave(updatedEntry);
    setShowReactionModal(false);
    setSelectedAllergen(null);
  };

  const handleCloseReactionModal = () => {
    setShowReactionModal(false);
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.text, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
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
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    gridItem: { width: '47%' },
  });

  return (
    <SafeAreaView style={styles.safe} accessibilityLabel={t('allergens.tab_title')}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('allergens.greeting')}</Text>
          <Text style={styles.title}>🥜 {t('allergens.title')}</Text>
        </View>

        {newBadges.length > 0 && (
          <View style={styles.badgeBanner}>
            <Text style={styles.badgeBannerIcon}>
              {newBadges.map((b) => b.icon).join(' ')}
            </Text>
            <Text style={styles.badgeBannerText}>
              {t('allergens.badgesEarned', { plural: newBadges.length > 1 ? 's' : '', names: newBadges.map((b) => b.name).join(', ') })}
            </Text>
          </View>
        )}

        <View style={styles.grid}>
          {ALLERGENS.map((allergen) => (
            <View key={allergen.id} style={styles.gridItem}>
              <AllergenCard
                allergen={allergen}
                entry={entries[allergen.id]}
                onPress={() => handleAllergenPress(allergen)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      {showDetail && selectedAllergen && (
        <AllergenDetailModal
          visible={showDetail}
          allergen={selectedAllergen}
          entry={entries[selectedAllergen.id]}
          onClose={handleCloseDetail}
          onSave={handleSave}
          onLogReaction={handleLogReaction}
        />
      )}

      {showReactionModal && selectedAllergen && (
        <ReactionLogModal
          visible={showReactionModal}
          allergen={selectedAllergen}
          existingReactions={entries[selectedAllergen.id]?.reactions || []}
          onClose={handleCloseReactionModal}
          onSave={handleReactionSave}
        />
      )}
    </SafeAreaView>
  );
}
