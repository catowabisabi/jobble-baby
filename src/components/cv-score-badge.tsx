import { StyleSheet, View, Text } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);

interface CVScoreBadgeProps {
  score: number;
  size?: number;
  animate?: boolean;
}

function getScoreColors(score: number): [string, string] {
  if (score >= 9) return ['#FFD700', '#FFA500'];
  if (score >= 7) return ['#34C759', '#30D158'];
  if (score >= 5) return ['#FF9500', '#FFCC00'];
  return ['#FF3B30', '#FF6B6B'];
}

export function CVScoreBadge({ score, size = 120, animate = true }: CVScoreBadgeProps) {
  const [colorStart, colorEnd] = getScoreColors(score);
  const percentage = score * 10;
  const scoreFontSize = size / 3;
  const subtitleFontSize = size / 6;
  const percentageFontSize = size / 8;

  const entranceKeyframe = new Keyframe({
    0: {
      transform: [{ scale: 0.8 }],
      opacity: 0,
    },
    100: {
      transform: [{ scale: 1 }],
      opacity: 1,
      easing: Easing.elastic(0.7),
    },
  });

  return (
    <AnimatedView
      entering={animate ? entranceKeyframe.duration(600) : undefined}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colorStart,
        },
      ]}>
      <View
        style={[
          styles.innerCircle,
          {
            width: size * 0.85,
            height: size * 0.85,
            borderRadius: (size * 0.85) / 2,
            backgroundColor: colorEnd,
            top: size * 0.075,
            left: size * 0.075,
          },
        ]}
      />
      <View style={styles.contentContainer}>
        <Text style={[styles.scoreText, { fontSize: scoreFontSize }]}>{score}</Text>
        <Text style={[styles.subtitleText, { fontSize: subtitleFontSize }]}>分</Text>
        <Text style={[styles.percentageText, { fontSize: percentageFontSize }]}>
          {percentage}%
        </Text>
      </View>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  innerCircle: {
    position: 'absolute',
  },
  contentContainer: {
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
  percentageText: {
    fontWeight: '600',
    color: '#ffffff',
    opacity: 0.8,
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});