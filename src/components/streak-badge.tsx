import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StreakBadgeProps {
  streakCount: number;
  size?: 'sm' | 'md' | 'lg';
  freezeTokens?: number;
}

const SIZE_CONFIG = {
  sm: { fontSize: 14, padding: 8, emojiScale: 0.8 },
  md: { fontSize: 18, padding: 12, emojiScale: 1.0 },
  lg: { fontSize: 24, padding: 16, emojiScale: 1.2 },
};

function getTierInfo(streak: number): { color: string; emoji: string; label: string } {
  if (streak >= 30) {
    return { color: '#f59e0b', emoji: '🔥🔥🔥', label: 'Gold' };
  } else if (streak >= 7) {
    return { color: '#94a3b8', emoji: '🔥🔥', label: 'Silver' };
  } else if (streak >= 3) {
    return { color: '#cd7f32', emoji: '🔥', label: 'Bronze' };
  } else {
    return { color: '#6b7280', emoji: '○', label: 'None' };
  }
}

export function StreakBadge({ streakCount, size = 'md', freezeTokens = 0 }: StreakBadgeProps) {
  const config = SIZE_CONFIG[size];
  const tier = getTierInfo(streakCount);

  return (
    <View style={[styles.container, { padding: config.padding }]}>
      <View style={styles.row}>
        <Text style={[styles.emoji, { fontSize: config.fontSize * config.emojiScale }]}>
          {tier.emoji}
        </Text>
        <View style={styles.textContainer}>
          <Text style={[styles.streakNumber, { fontSize: config.fontSize, color: tier.color }]}>
            {streakCount}
          </Text>
          <Text style={[styles.streakLabel, { fontSize: config.fontSize * 0.7 }]}>
            day streak
          </Text>
        </View>
      </View>
      
      {freezeTokens > 0 && (
        <View style={styles.freezeContainer}>
          <Text style={[styles.freezeEmoji, { fontSize: config.fontSize * 0.7 }]}>❄️</Text>
          <Text style={[styles.freezeCount, { fontSize: config.fontSize * 0.6 }]}>
            {freezeTokens}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    marginRight: 4,
  },
  textContainer: {
    alignItems: 'center',
  },
  streakNumber: {
    fontWeight: 'bold',
    lineHeight: 28,
  },
  streakLabel: {
    color: '#6b7280',
    marginTop: -4,
  },
  freezeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 2,
  },
  freezeEmoji: {
    marginRight: 2,
  },
  freezeCount: {
    color: '#60a5fa',
    fontWeight: '600',
  },
});