import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, withDelay, withTiming } from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';

const CATEGORY_META = {
  role_relevance: { label: '職位相關性', color: '#007AFF' },
  experience_years: { label: '工作年資', color: '#34C759' },
  education_quality: { label: '學歷質量', color: '#5856D6' },
  skills_clarity: { label: '技能清晰度', color: '#FF9500' },
  quantified_achievements: { label: '量化成就', color: '#FF3B30' },
  overall_professionalism: { label: '專業度', color: '#AF52DE' },
} as const;

type CategoryKey = keyof typeof CATEGORY_META;

export interface CVCategoryBarsProps {
  categories: {
    role_relevance: number;
    experience_years: number;
    education_quality: number;
    skills_clarity: number;
    quantified_achievements: number;
    overall_professionalism: number;
  };
  animate?: boolean;
}

const BAR_HEIGHT = 8;
const BAR_RADIUS = 4;
const BAR_BG = '#E5E5EA';
const STAGGER_DELAY = 300;

interface CategoryBarProps {
  keyName: CategoryKey;
  score: number;
  index: number;
  animate: boolean;
}

function CategoryBar({ keyName, score, index, animate }: CategoryBarProps) {
  const meta = CATEGORY_META[keyName];
  const percentage = Math.round((score / 10) * 100);
  const fillWidth = (score / 10) * 100;

  const entering = animate
    ? FadeIn.delay(index * STAGGER_DELAY).duration(400)
    : undefined;

  return (
    <Animated.View entering={entering} style={styles.barContainer}>
      <View style={styles.labelRow}>
        <View style={[styles.colorIndicator, { backgroundColor: meta.color }]} />
        <ThemedText type="small" style={styles.label}>
          {meta.label}
        </ThemedText>
        <ThemedText type="small" style={styles.percentage}>
          {percentage}%
        </ThemedText>
      </View>
      <View style={styles.barBackground}>
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: meta.color,
              width: animate ? `${fillWidth}%` : `${fillWidth}%`,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

export function CVCategoryBars({ categories, animate = true }: CVCategoryBarsProps) {
  const categoryKeys = Object.keys(CATEGORY_META) as CategoryKey[];

  return (
    <View style={styles.container}>
      {categoryKeys.map((key, index) => (
        <CategoryBar
          key={key}
          keyName={key}
          score={categories[key]}
          index={index}
          animate={animate}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two + Spacing.one,
  },
  barContainer: {
    gap: Spacing.half + Spacing.half,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  colorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  label: {
    flex: 1,
  },
  percentage: {
    minWidth: 40,
    textAlign: 'right',
  },
  barBackground: {
    height: BAR_HEIGHT,
    backgroundColor: BAR_BG,
    borderRadius: BAR_RADIUS,
    overflow: 'hidden',
  },
  barFill: {
    height: BAR_HEIGHT,
    borderRadius: BAR_RADIUS,
  },
});