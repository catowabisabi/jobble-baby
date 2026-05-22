import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface ParticleConfig {
  id: number;
  color: string;
  initialX: number;
  initialY: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  size: number;
  shape: 'rect' | 'circle';
}

interface ConfettiBurstProps {
  trigger: boolean;
  onComplete?: () => void;
}

const COLORS = ['#FF3B30', '#FF9500', '#34C759', '#007AFF', '#AF52DE', '#FFD700'];
const PARTICLE_COUNT = 25;
const DURATION = 1500;
const GRAVITY = 600;

function generateParticles(): ParticleConfig[] {
  const particles: ParticleConfig[] = [];
  const centerX = Dimensions.get('screen').width / 2;
  const centerY = Dimensions.get('screen').height / 2;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 150 + Math.random() * 200;
    const isRect = Math.random() > 0.5;

    particles.push({
      id: i,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      initialX: centerX,
      initialY: centerY,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed - 200,
      rotation: Math.random() * 720 - 360,
      size: isRect ? 8 : 4,
      shape: isRect ? 'rect' : 'circle',
    });
  }
  return particles;
}

interface ParticleProps {
  config: ParticleConfig;
  isAnimating: boolean;
}

function Particle({ config, isAnimating }: ParticleProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isAnimating) {
      opacity.value = withTiming(1, { duration: 50 });
      translateX.value = withTiming(config.velocityX * (DURATION / 1000), {
        duration: DURATION,
        easing: Easing.out(Easing.quad),
      });
      translateY.value = withTiming(
        config.velocityY * (DURATION / 1000) + 0.5 * GRAVITY * Math.pow(DURATION / 1000, 2),
        {
          duration: DURATION,
          easing: Easing.in(Easing.quad),
        }
      );
      rotation.value = withTiming(config.rotation, {
        duration: DURATION,
        easing: Easing.out(Easing.quad),
      });
      opacity.value = withTiming(0, {
        duration: DURATION,
        easing: Easing.in(Easing.quad),
      });
    } else {
      translateX.value = 0;
      translateY.value = 0;
      opacity.value = 0;
      rotation.value = 0;
    }
  }, [isAnimating, config, translateX, translateY, opacity, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        animatedStyle,
        config.shape === 'rect'
          ? { width: 8, height: 4, borderRadius: 1 }
          : { width: 8, height: 8, borderRadius: 4 },
        { backgroundColor: config.color },
      ]}
    />
  );
}

export function ConfettiBurst({ trigger, onComplete }: ConfettiBurstProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const particles = useRef<ParticleConfig[]>([]);
  const hasTriggeredRef = useRef(false);

  const particleList = useMemo(() => {
    return generateParticles();
  }, [showParticles]);

  useEffect(() => {
    if (trigger && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      particles.current = generateParticles();
      setShowParticles(true);
      setIsAnimating(true);
    }
  }, [trigger]);

  useEffect(() => {
    if (isAnimating) {
      const timeout = setTimeout(() => {
        setIsAnimating(false);
        setShowParticles(false);
        hasTriggeredRef.current = false;
        onComplete?.();
      }, DURATION);
      return () => clearTimeout(timeout);
    }
  }, [isAnimating, onComplete]);

  if (!showParticles) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {particleList.map((config) => (
        <Particle key={config.id} config={config} isAnimating={isAnimating} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  particle: {
    position: 'absolute',
  },
});