import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface JobMatchCardProps {
  job: {
    id: string;
    title: string;
    company: string;
    salary_range: string;
    match_score: number;
  };
  onPress?: (job: JobMatchCardProps['job']) => void;
}

const MATCH_COLORS = {
  high: '#34C759',
  medium: '#007AFF',
  low: '#8E8E93',
} as const;

const THRESHOLD_HIGH = 90;
const THRESHOLD_MEDIUM = 75;

function getMatchColor(score: number): string {
  const percentage = Math.round(score * 100);
  if (percentage >= THRESHOLD_HIGH) return MATCH_COLORS.high;
  if (percentage >= THRESHOLD_MEDIUM) return MATCH_COLORS.medium;
  return MATCH_COLORS.low;
}

export function JobMatchCard({ job, onPress }: JobMatchCardProps) {
  const theme = useTheme();
  const matchPercentage = Math.round(job.match_score * 100);
  const matchColor = getMatchColor(job.match_score);

  const handlePress = () => {
    onPress?.(job);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.cardPressed,
      ]}>
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <ThemedText type="subtitle" style={styles.jobTitle} numberOfLines={1}>
            {job.title}
          </ThemedText>
          <ThemedText style={styles.companyName} numberOfLines={1}>
            {job.company}
          </ThemedText>
        </View>
        <View style={[styles.matchBadge, { backgroundColor: matchColor }]}>
          <ThemedText type="small" style={styles.matchText}>
            {matchPercentage}%
          </ThemedText>
        </View>
      </View>

      <View style={styles.salaryRow}>
        <ThemedText style={styles.salaryLabel}>Salary</ThemedText>
        <ThemedText themeColor="textSecondary">{job.salary_range}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.two,
  },
  titleContainer: {
    flex: 1,
    marginRight: Spacing.two,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  companyName: {
    fontSize: 14,
    marginTop: Spacing.half,
  },
  matchBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  matchText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  salaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salaryLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});