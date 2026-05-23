import { useEffect, useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedProps,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  useDerivedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { ConfettiBurst } from './confetti-burst';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Milestone thresholds (out of 10)
const MILESTONES = {
  BRONZE: 5,
  SILVER: 7,
  GOLD: 8.5,
} as const;

type MilestoneTier = 'bronze' | 'silver' | 'gold' | 'none';
type Size = 'sm' | 'md' | 'lg';

interface ScoreAnimationProps {
  score: number;
  previousScore?: number;
  size?: Size;
  onMilestoneCross?: (tier: MilestoneTier) => void;
}

const SIZE_CONFIG: Record<Size, { outer: number; ringWidth: number; fontSize: number }> = {
  sm: { outer: 80, ringWidth: 6, fontSize: 24 },
  md: { outer: 120, ringWidth: 8, fontSize: 36 },
  lg: { outer: 160, ringWidth: 10, fontSize: 48 },
};

function getMilestoneTier(score: number): MilestoneTier {
  if (score >= MILESTONES.GOLD) return 'gold';
  if (score >= MILESTONES.SILVER) return 'silver';
  if (score >= MILESTONES.BRONZE) return 'bronze';
  return 'none';
}

function getMilestoneColors(tier: MilestoneTier): [string, string] {
  switch (tier) {
    case 'gold':
      return ['#FFD700', '#FFA500'];
    case 'silver':
      return ['#C0C0C0', '#E8E8E8'];
    case 'bronze':
      return ['#CD7F32', '#DAa520'];
    default:
      return ['#8E8E93', '#AEAEB2'];
  }
}

function getTierLabel(tier: MilestoneTier): string {
  switch (tier) {
    case 'gold':
      return '金牌';
    case 'silver':
      return '銀牌';
    case 'bronze':
      return '銅牌';
    default:
      return '';
  }
}

export function ScoreAnimation({
  score,
  previousScore,
  size = 'md',
  onMilestoneCross,
}: ScoreAnimationProps) {
  const config = SIZE_CONFIG[size];
  const radius = (config.outer - config.ringWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animation values
  const animatedScore = useSharedValue(score);
  const ringProgress = useSharedValue(0);
  const deltaOpacity = useSharedValue(0);

  // Track if we've crossed a milestone
  const lastMilestoneRef = useSharedValue(getMilestoneTier(score));
  const showConfettiRef = useSharedValue(false);

  // Delta calculation
  const delta = useMemo(() => {
    if (previousScore === undefined) return null;
    return score - previousScore;
  }, [score, previousScore]);

  // Start animations when score changes
  useEffect(() => {
    const fromScore = previousScore ?? score;
    const currentMilestoneBefore = getMilestoneTier(fromScore);
    const currentMilestoneAfter = getMilestoneTier(score);

    // Animate the counter with spring
    animatedScore.value = withSpring(score, {
      damping: 15,
      stiffness: 100,
    });

    // Animate ring progress (shows progress toward next milestone)
    const progressToNextMilestone = getProgressToNextMilestone(score);
    ringProgress.value = withTiming(progressToNextMilestone, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    });

    // Check for milestone crossing
    if (currentMilestoneBefore !== currentMilestoneAfter && onMilestoneCross) {
      onMilestoneCross(currentMilestoneAfter);
      showConfettiRef.value = true;
    }

    // Show delta badge after counter settles (800ms spring)
    if (delta !== null) {
      setTimeout(() => {
        deltaOpacity.value = withTiming(1, { duration: 200 });
        setTimeout(() => {
          deltaOpacity.value = withTiming(0, { duration: 200 });
        }, 2000);
      }, 800);
    }

    lastMilestoneRef.value = currentMilestoneAfter;
  }, [score]);

  // Use animated derived values for the score display
  const displayScore = useDerivedValue(() => {
    return Math.round(animatedScore.value * 10) / 10;
  });

  const currentTier = getMilestoneTier(score);
  const [colorStart, colorEnd] = getMilestoneColors(currentTier);
  const tierLabel = getTierLabel(currentTier);

  const strokeDashoffset = useAnimatedProps(() => {
    return {
      strokeDashoffset: circumference * (1 - ringProgress.value),
    };
  });

  return (
    <View style={styles.container}>
      {/* Confetti overlay */}
      <ConfettiBurst
        trigger={showConfettiRef.value}
        onComplete={() => {
          showConfettiRef.value = false;
        }}
      />

      {/* Circular progress ring */}
      <Svg width={config.outer} height={config.outer} style={styles.ring}>
        {/* Background ring */}
        <Circle
          cx={config.outer / 2}
          cy={config.outer / 2}
          r={radius}
          stroke="#E5E5EA"
          strokeWidth={config.ringWidth}
          fill="none"
        />
        {/* Progress ring */}
        <AnimatedCircle
          cx={config.outer / 2}
          cy={config.outer / 2}
          r={radius}
          stroke={colorStart}
          strokeWidth={config.ringWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${config.outer / 2} ${config.outer / 2})`}
        />
      </Svg>

      {/* Score display */}
      <View style={[styles.scoreContainer, { width: config.outer, height: config.outer }]}>
        <Text style={[styles.scoreText, { fontSize: config.fontSize }]}>
          {score.toFixed(1)}
        </Text>
        <Text style={[styles.subtitleText, { fontSize: config.fontSize / 4 }]}>
          {tierLabel || '分'}
        </Text>
      </View>

      {/* Delta badge */}
      {delta !== null && delta !== 0 && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[
            styles.deltaBadge,
            { opacity: deltaOpacity },
            delta > 0 ? styles.deltaPositive : styles.deltaNegative,
          ]}
        >
          <Text style={styles.deltaText}>
            {delta > 0 ? '+' : ''}{delta.toFixed(1)}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

// Helper function to calculate progress toward next milestone
function getProgressToNextMilestone(score: number): number {
  if (score >= MILESTONES.GOLD) return 1;
  if (score >= MILESTONES.SILVER) {
    return (score - MILESTONES.SILVER) / (MILESTONES.GOLD - MILESTONES.SILVER);
  }
  if (score >= MILESTONES.BRONZE) {
    return (score - MILESTONES.BRONZE) / (MILESTONES.SILVER - MILESTONES.BRONZE);
  }
  return score / MILESTONES.BRONZE;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
  scoreContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitleText: {
    fontWeight: '500',
    color: '#ffffff',
    opacity: 0.9,
    marginTop: -4,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  deltaBadge: {
    position: 'absolute',
    bottom: -8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deltaPositive: {
    backgroundColor: '#34C759',
  },
  deltaNegative: {
    backgroundColor: '#FF3B30',
  },
  deltaText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});