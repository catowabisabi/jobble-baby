import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { STATUS_LABELS, AllergenEntry, Allergen, AllergenStatus } from '../data/allergens';
import { COLORS } from '../theme';
import { useTheme } from '../context/ThemeContext';

const STATUS_COLORS: Record<AllergenStatus, string> = {
  not_introduced: '#9CA3AF',
  introduced: '#3B82F6',
  reaction_observed: '#F97316',
  tolerated: '#22C55E',
};

interface AllergenCardProps {
  allergen: Allergen;
  entry?: AllergenEntry;
  onPress: () => void;
}

export default function AllergenCard({ allergen, entry, onPress }: AllergenCardProps) {
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];

  const status = entry?.status ?? 'not_introduced';
  const statusColor = STATUS_COLORS[status];

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: C.card,
          borderColor: C.border,
        },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.content}>
        <Text style={styles.emoji}>{allergen.emoji}</Text>
        <Text style={[styles.name, { color: C.text }]}>{allergen.name}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: statusColor }]}>
        <Text style={styles.badgeText}>{STATUS_LABELS[status]}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 28,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
