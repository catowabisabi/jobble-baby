import React, { useState } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';

import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';

export interface AchievementBadgeProps {
  achievement_type: string;
  tier: 'bronze' | 'silver' | 'gold';
  description?: string;
  earned_at?: string;
  size?: 'small' | 'medium' | 'large';
}

const TIER_STYLES = {
  bronze: {
    border: '#CD7F32',
    background: 'rgba(205,127,50,0.15)',
    text: '#CD7F32',
  },
  silver: {
    border: '#C0C0C0',
    background: 'rgba(192,192,192,0.15)',
    text: '#C0C0C0',
  },
  gold: {
    border: '#FFD700',
    background: 'rgba(255,215,0,0.15)',
    text: '#FFD700',
  },
} as const;

const SIZE_STYLES = {
  small: {
    iconSize: 16,
    textSize: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  medium: {
    iconSize: 20,
    textSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  large: {
    iconSize: 24,
    textSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
} as const;

function getIconForAchievementType(achievementType: string): string {
  if (/^SCORE_MILESTONE_/.test(achievementType)) {
    return '🏆';
  }
  if (/^CATEGORY_MASTER_/.test(achievementType)) {
    return '⭐';
  }
  if (achievementType === 'FIRST_CV_UPLOAD') {
    return '📄';
  }
  if (achievementType === 'FIVE_CVS_UPLOAD') {
    return '📚';
  }
  return '🎖️';
}

function formatLabel(achievementType: string): string {
  return achievementType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

export function AchievementBadge({
  achievement_type,
  tier,
  description,
  earned_at,
  size = 'medium',
}: AchievementBadgeProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const tierStyle = TIER_STYLES[tier];
  const sizeStyle = SIZE_STYLES[size];
  const icon = getIconForAchievementType(achievement_type);
  const label = formatLabel(achievement_type);

  const handlePress = () => {
    if (isTooltipVisible) {
      setIsTooltipVisible(false);
      return;
    }

    const title = label;
    const message = description
      ? `${description}\n\nEarned: ${earned_at ? formatDate(earned_at) : 'Unknown'}`
      : `Earned: ${earned_at ? formatDate(earned_at) : 'Unknown'}`;

    Alert.alert(title, message, [
      { text: 'OK', onPress: () => setIsTooltipVisible(false) },
    ]);

    setIsTooltipVisible(true);
  };

  return (
    <Pressable onPress={handlePress}>
      <View
        style={[
          styles.chip,
          {
            borderColor: tierStyle.border,
            backgroundColor: tierStyle.background,
            paddingVertical: sizeStyle.paddingVertical,
            paddingHorizontal: sizeStyle.paddingHorizontal,
          },
        ]}
      >
        <ThemedText style={{ fontSize: sizeStyle.iconSize }}>{icon}</ThemedText>
        <ThemedText
          style={[{ fontSize: sizeStyle.textSize, color: tierStyle.text, marginLeft: Spacing.one }]}
        >
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.four,
    borderWidth: 1.5,
  },
});