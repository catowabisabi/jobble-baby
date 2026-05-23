import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

export function StepIndicator({ currentStep, totalSteps = 4 }: StepIndicatorProps) {
  const progress = (currentStep - 1) / (totalSteps - 1);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(`${progress * 100}%`, {
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
    };
  }, [progress]);

  return (
    <View style={styles.container}>
      <View style={styles.stepRow}>
        <ThemedText style={styles.stepText}>
          {currentStep}/{totalSteps}
        </ThemedText>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View style={[styles.progressBarFill, animatedProgressStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  stepText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBarContainer: {
    paddingHorizontal: Spacing.three,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#E0E1E6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
});