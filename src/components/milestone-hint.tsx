import React from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';

export interface MilestoneHintProps {
  milestone_type: string;
  title: string;
  progress_current: number;
  progress_target: number;
  hint: string;
}

function getIconForMilestoneType(milestoneType: string): string {
  if (/^SCORE_MILESTONE_/.test(milestoneType)) {
    return '🎯';
  }
  if (/^CATEGORY_MASTER_/.test(milestoneType)) {
    return '⭐';
  }
  if (milestoneType === 'FIVE_CVS_UPLOAD' || milestoneType === 'FIRST_CV_UPLOAD') {
    return '📚';
  }
  return '🎖️';
}

interface ProgressRingProps {
  progress: number;
  size: number;
  strokeWidth: number;
  filledColor: string;
  emptyColor: string;
}

function ProgressRing({ progress, size, strokeWidth, filledColor, emptyColor }: ProgressRingProps) {
  const center = size / 2;
  const radius = center - strokeWidth;

  const createArc = (startAngle: number, endAngle: number, color: string) => {
    const segments = 12;
    const angleStep = (endAngle - startAngle) / segments;

    return Array.from({ length: segments }, (_, i) => {
      const angle1 = startAngle + i * angleStep;
      const angle2 = startAngle + (i + 1) * angleStep;
      const x1 = center + radius * Math.cos(angle1);
      const y1 = center + radius * Math.sin(angle1);
      const x2 = center + radius * Math.cos(angle2);
      const y2 = center + radius * Math.sin(angle2);

      const length = 2 * radius * Math.sin(angleStep / 2);
      const thickness = strokeWidth;

      return (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: center - thickness / 2,
            top: center - thickness / 2,
            width: thickness,
            height: length,
            backgroundColor: color,
            transform: [
              { translateX: x1 - center },
              { translateY: y1 - center },
              { rotate: `${angle1 + angleStep / 2 + Math.PI / 2}rad` },
            ],
            transformOrigin: 'center',
          }}
        />
      );
    });
  };

  const filledAngle = (progress / 100) * 2 * Math.PI;

  return (
    <View style={[styles.ringContainer, { width: size, height: size }]}>
      <View
        style={[
          styles.ringBackground,
          {
            width: size,
            height: size,
            borderRadius: center,
            borderWidth: strokeWidth,
            borderColor: emptyColor,
          },
        ]}
      />
      {progress > 0 && (
        <View style={styles.ringFilledContainer}>
          {createArc(-Math.PI / 2, -Math.PI / 2 + filledAngle, filledColor)}
        </View>
      )}
      <View style={styles.ringCenter}>
        <ThemedText style={styles.ringCenterText}>{Math.round(progress)}</ThemedText>
      </View>
    </View>
  );
}

export function MilestoneHint({
  milestone_type,
  title,
  progress_current,
  progress_target,
  hint,
}: MilestoneHintProps) {
  if (progress_current >= progress_target && progress_target > 0) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.celebrationIcon}>🎉</ThemedText>
        <ThemedText style={styles.celebrationText}>All milestones achieved!</ThemedText>
      </View>
    );
  }

  const icon = getIconForMilestoneType(milestone_type);
  const progress = (progress_current / progress_target) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <ThemedText style={styles.icon}>{icon}</ThemedText>
      </View>

      <View style={styles.centerContent}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText style={styles.hint}>{hint}</ThemedText>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.ringWrapper}>
          <ProgressRing
            progress={progress}
            size={40}
            strokeWidth={3}
            filledColor="#007AFF"
            emptyColor="#E5E5EA"
          />
          <View style={styles.progressLabelContainer}>
            <ThemedText style={styles.progressLabel}>
              {progress_current}/{progress_target}
            </ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
  },
  iconContainer: {
    marginRight: Spacing.three,
  },
  icon: {
    fontSize: 28,
  },
  centerContent: {
    flex: 1,
    marginRight: Spacing.three,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  hint: {
    fontSize: 14,
    color: '#666666',
  },
  progressContainer: {
    alignItems: 'flex-end',
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringBackground: {
    position: 'absolute',
  },
  ringFilledContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressLabelContainer: {
    position: 'absolute',
    bottom: -18,
  },
  progressLabel: {
    fontSize: 11,
    color: '#666666',
  },
  celebrationIcon: {
    fontSize: 32,
    marginRight: Spacing.two,
  },
  celebrationText: {
    fontSize: 16,
    fontWeight: '600',
  },
});